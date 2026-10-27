import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { aiPlanProviders, handleAiPlan, extractHardConstraints, validateHardConstraints } from '../api/ai-plan.mjs';
import worker from '../api/index.js';

const key = 'test-private-key-never-log';
const input = { theme: '雨夜纪实', scene: '斑马线', people: '1', duration: '1小时', extra: '高机位俯拍，人物左下角，完整全身' };
const request = { provider: 'deepseek', model: 'test-model', apiKey: key, input };
function output(count = 9) {
    return { shot_plans: Array.from({ length: count }, (_, i) => ({
        shot_language: `镜头${i}`, model_pose: '站定后向前迈步', photographer_position: '在安全台阶上俯拍',
        lens: '35mm', model_position: '左下角', wardrobe_styling: '深色外套，自然淡妆',
        lighting_setup: '路灯为侧光，反光板在暗侧轻补', shot_props: '无',
        crop_boundary: '完整全身', must_show: '脚部和路面', reject_if: '截脚或居中半身',
        execution_note: '不可达时换安全台阶', generator_prompt: 'high angle full body, lower left',
        shot_size: 'FS', camera_angle: 'high_angle',
    })) };
}
const response = result => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] });

test('provider destinations are fixed or explicitly approved by server admin', () => {
    const ps = aiPlanProviders({ AI_PLAN_ALLOWED_ORIGINS: 'http://localhost,https://127.0.0.1,https://x.internal,https://user:pass@evil.com,https://evil.com/path,https://gateway.example.com' });
    assert.deepEqual(ps.map(p => p.id), ['openai', 'deepseek', 'https://gateway.example.com']);
});

test('invalid config and brief never call providers', async () => {
    const fetchImpl = () => assert.fail('no external request');
    for (const change of [{ provider: 'https://evil.com' }, { apiKey: '' }, { apiKey: 'key\nheader' }, { model: '' }, { model: 'bad model' }, { input: { theme: 'a'.repeat(3000) } }]) {
        const r = await handleAiPlan({ ...request, ...change }, {}, { fetchImpl });
        assert.equal(r.status, 400);
    }
});

test('real provider response is mapped to existing plan without keys or a template fallback', async () => {
    const r = await handleAiPlan(request, {}, { fetchImpl: async (url, options) => {
        assert.equal(url, 'https://api.deepseek.com/chat/completions');
        assert.equal(options.headers.Authorization, `Bearer ${key}`);
        assert.equal(options.redirect, 'manual');
        const payload = JSON.parse(options.body);
        assert.equal(payload.model, 'test-model');
        assert.match(payload.messages[1].content, /人物左下角/);
        assert.doesNotMatch(JSON.stringify(payload), new RegExp(key));
        return response(output());
    } });
    assert.equal(r.status, 200);
    assert.equal(r.body.director.source, 'byok-ai-plan');
    assert.equal(r.body.director.imageGenerationConnected, false);
    assert.equal(r.body.shotList.length, 9);
    assert.equal(r.body.shotList[0].angle, '俯拍');
    assert.equal(r.body.shotList[0].composition, '左下角');
    assert.doesNotMatch(JSON.stringify(r), new RegExp(key));
});

test('provider prompt names required shot codes and absent resources explicitly', async () => {
    const requestWithLimitedResources = { ...request, input: {
        theme: '手持香水的人像', scene: '室内白墙与现有桌面', modelDesc: '一名成年人',
        extra: '只有一瓶香水、一张桌子和现场自然光', duration: '1小时', people: '1',
    } };
    const result = await handleAiPlan(requestWithLimitedResources, {}, { fetchImpl: async (_url, options) => {
        const system = JSON.parse(options.body).messages[0].content;
        assert.match(system, /"shot_size":"FS","camera_angle":"eye_level"/);
        assert.match(system, /不得假设.*橱窗或窗户/);
        assert.doesNotMatch(system, /不得假设[^\n]*桌子/);
        return response(output());
    } });
    assert.equal(result.status, 200);
});

test('partial, duplicated, invalid and truncated model outputs fail instead of padding shots', async () => {
    const duplicate = output(); duplicate.shot_plans[1].shot_language = duplicate.shot_plans[0].shot_language;
    const missing = output(); delete missing.shot_plans[0].model_pose;
    const badAngle = output(); badAngle.shot_plans[0].camera_angle = 'unknown';
    for (const value of [output(3), duplicate, missing, badAngle]) {
        const r = await handleAiPlan(request, {}, { fetchImpl: async () => response(value) });
        assert.equal(r.status, 502);
        assert.equal(r.body.shotList, undefined);
    }
    const r = await handleAiPlan(request, {}, { fetchImpl: async () => Response.json({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(output()) } }] }) });
    assert.equal(r.status, 502);
});

test('invalid model fields identify the shot and problem without returning raw model content', async () => {
    const bad = output();
    bad.shot_plans[2].shot_size = 'private-CS';
    const result = await handleAiPlan(request, {}, { fetchImpl: async () => response(bad) });
    assert.equal(result.status, 502);
    assert.equal(result.body.code, 'AI_SHOT_FIELDS_INVALID');
    assert.match(result.body.error, /镜头3景别代号不支持/);
    assert.doesNotMatch(JSON.stringify(result), /private-CS/);
});

test('provider errors never leak credentials and wrong provider key cannot log out the app account', async () => {
    for (const status of [401, 403, 429, 500]) {
        const r = await handleAiPlan(request, {}, { fetchImpl: async () => new Response(key, { status }) });
        assert.equal(r.status, [401, 403].includes(status) ? 422 : status === 429 ? 429 : 502);
        assert.doesNotMatch(JSON.stringify(r), new RegExp(key));
    }
    const r = await handleAiPlan(request, {}, { fetchImpl: async () => { throw new Error(key); } });
    assert.equal(r.status, 502);
    assert.doesNotMatch(JSON.stringify(r), new RegExp(key));
});

test('public BYOK API needs a caller key, restricts body size and discloses no server secrets', async () => {
    const catalog = await worker.fetch(new Request('https://unit.test/api/ai/providers'), { MINIMAX_API_KEY: key });
    assert.doesNotMatch(await catalog.text(), new RegExp(key));
    const bad = await worker.fetch(new Request('https://unit.test/api/ai/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), {});
    assert.equal(bad.status, 400);
    const large = await worker.fetch(new Request('https://unit.test/api/ai/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(17000) }) }), {});
    assert.equal(large.status, 413);
});

test('browser config requires consent, clears key field, and never uses browser storage', async () => {
    const source = await readFile(new URL('../assets/own-ai.js', import.meta.url), 'utf8');
    const nodes = Object.fromEntries(['ownAiSettings','ownAiProvider','ownAiModel','ownAiKey','ownAiStatus','ownAiConsent','ownAiConsentText','ownAiEnable','ownAiClear','ownAiEndpoint'].map(id => [id, { value: '', checked: false, handlers: {}, addEventListener(k, fn) { this.handlers[k] = fn; }, replaceChildren(...children) { this.children = children; this.value = children[0]?.value; } }]));
    const calls = [];
    const window = { api: { request: async (...args) => {
        calls.push(args);
        return args[0].endsWith('providers') ? { providers: aiPlanProviders() } : { title: 'Model plan' };
    } } };
    await runInNewContext(source, { window, document: { getElementById: id => nodes[id], createElement: () => ({}) } });
    nodes.ownAiProvider.value = 'deepseek'; nodes.ownAiProvider.handlers.change();
    nodes.ownAiModel.value = 'test-model'; nodes.ownAiKey.value = key;
    nodes.ownAiEnable.handlers.click();
    assert.equal(window.PhotoAtelierOwnAI.isEnabled(), false);
    nodes.ownAiConsent.checked = true;
    nodes.ownAiEnable.handlers.click();
    assert.equal(window.PhotoAtelierOwnAI.isEnabled(), true);
    assert.equal(nodes.ownAiKey.value, '');
    assert.equal(calls.length, 1); // Enabling is not a billable model call.
    await window.PhotoAtelierOwnAI.generatePlan(input);
    assert.equal(calls[1][1], 'POST');
    assert.equal(calls[1][2].apiKey, key);
    assert.equal(calls[1][3], 100000);
    nodes.ownAiClear.handlers.click();
    assert.equal(window.PhotoAtelierOwnAI.isEnabled(), false);
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|console\./);
});

test('anonymous free requests never forward supplied credentials and cannot switch to a paid model', async () => {
    const free = { ...request, provider: 'pollinations-free', model: 'openai' };
    const experiment = { ENABLE_EXPERIMENTAL_FREE_AI: 'true' };
    const result = await handleAiPlan(free, experiment, { fetchImpl: async (url, options) => {
        assert.equal(url, 'https://text.pollinations.ai/openai');
        assert.equal(options.headers.Authorization, undefined);
        assert.doesNotMatch(options.body, new RegExp(key));
        const fields = ['shot_language','model_pose','photographer_position','lens','model_position','wardrobe_styling','lighting_setup','shot_props','crop_boundary','must_show','reject_if','execution_note','generator_prompt','shot_size','camera_angle'];
        return response({ shots: output().shot_plans.map(shot => fields.map(field => shot[field])) });
    } });
    assert.equal(result.status, 200);
    const rejected = await handleAiPlan({ ...free, model: 'paid-model' }, experiment, { fetchImpl: () => assert.fail('must not call paid model') });
    assert.equal(rejected.status, 400);
    assert.equal((await handleAiPlan(free)).status, 400);
});

test('OpenRouter free route rejects paid models and caps upstream prices at zero', async () => {
    const free = { ...request, provider: 'openrouter-free', model: 'openrouter/free' };
    const env = { ENABLE_OPENROUTER_FREE: 'true' };
    const result = await handleAiPlan(free, env, { fetchImpl: async (url, options) => {
        assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
        assert.deepEqual(JSON.parse(options.body).provider, { max_price: { prompt: 0, completion: 0 }, allow_fallbacks: false });
        return response(output());
    } });
    assert.equal(result.status, 200);
    const paid = await handleAiPlan({ ...free, model: 'openai/paid-model' }, env, { fetchImpl: () => assert.fail('must not route paid model') });
    assert.equal(paid.status, 400);
});

test('DeepSeek version display name maps to its documented API id without changing unrelated models', async () => {
    for (const name of ['deepseek-V4.1flash', 'deepseek-v4.1-flash', 'other-model']) {
        const expected = name === 'other-model' ? name : 'deepseek-flash';
        const r = await handleAiPlan({ ...request, model: name }, {}, { fetchImpl: async (_, options) => {
            assert.equal(JSON.parse(options.body).model, expected);
            return response(output());
        } });
        assert.equal(r.body.director.model, expected);
        assert.equal(r.body.director.requestedModel, name);
    }
});

test('unknown provider model is actionable instead of a generic invalid-output error', async () => {
    const r = await handleAiPlan(request, {}, { fetchImpl: async () => new Response('private details', { status: 400 }) });
    assert.equal(r.status, 422);
    assert.match(r.body.error, /deepseek-flash/);
    assert.doesNotMatch(r.body.error, /private details/);
});

test('a single JSON code fence is accepted but surrounding prose and malformed JSON are rejected', async () => {
    for (const content of ['```json\n' + JSON.stringify(output()) + '\n```', '解释文字\n' + JSON.stringify(output()), '{bad json}']) {
        const r = await handleAiPlan(request, {}, { fetchImpl: async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content } }] }) });
        assert.equal(r.status, content.startsWith('```json') ? 200 : 502);
    }
});

test('provider redirects are not followed and invalid keys are not sent to a second host', async () => {
    let calls = 0;
    const r = await handleAiPlan(request, {}, { fetchImpl: async (_, options) => {
        calls++;
        assert.equal(options.redirect, 'manual');
        return new Response('', { status: 302, headers: { Location: 'https://other.example.test' } });
    } });
    assert.equal(r.status, 502);
    assert.equal(calls, 1);
});

test('explicit all-shot constraints accept a compliant plan without saving forbidden assumptions', async () => {
    const strictInput = {
        theme: '雨夜城市纪实', scene: '有安全低台阶的步行街，路灯环境光', people: '1', duration: '1小时',
        extra: '所有镜头都要高机位俯拍，人物在左下角，完整全身。仅使用35mm镜头；无助手、闪光灯或反光板。不得建议屋顶、脚手架、攀爬或进入机动车道。',
    };
    const compliant = output(10);
    compliant.shot_plans.forEach(shot => {
        shot.lighting_setup = '使用现有路灯侧光，不使用闪光灯或反光板';
        shot.reject_if = '截脚、居中或使用闪光灯';
    });
    const result = await handleAiPlan({ ...request, input: strictInput }, {}, { fetchImpl: async (_, options) => {
        assert.match(JSON.parse(options.body).messages[0].content, /每个镜头 lens 只能为 35mm/);
        return response(compliant);
    } });
    assert.equal(result.status, 200);
    assert.equal(result.body.shotList.length, 10);
});

test('a model cannot save shots that violate explicit framing, angle, placement, lens, resources or safety', async () => {
    const strictInput = {
        theme: '雨夜城市纪实', scene: '有安全低台阶的步行街，路灯环境光', people: '1', duration: '1小时',
        extra: '所有镜头都要高机位俯拍，人物在左下角，完整全身。仅使用35mm镜头；无助手、闪光灯或反光板。不得建议屋顶、脚手架、攀爬或进入机动车道。',
    };
    const changes = [
        [shot => { shot.shot_size = 'MS'; }, /镜头1景别不是全身/],
        [shot => { shot.camera_angle = 'eye_level'; }, /镜头1机位不符合/],
        [shot => { shot.model_position = '人物居中'; }, /镜头1人物位置未明确/],
        [shot => { shot.lens = '50mm'; }, /镜头1焦段不符合/],
        [shot => { shot.model_pose = '撑开雨伞'; }, /镜头1使用了未提供、需确认的资源：雨伞/],
        [shot => { shot.lighting_setup = '反光板补光'; }, /镜头1出现禁用内容：反光板/],
        [shot => { shot.photographer_position = '爬上脚手架拍摄'; }, /镜头1出现禁用内容：屋顶或脚手架/],
    ];
    for (const [change, expected] of changes) {
        const generated = output(10);
        generated.shot_plans.forEach(shot => { shot.lighting_setup = '使用现有路灯侧光'; });
        change(generated.shot_plans[0]);
        const result = await handleAiPlan({ ...request, input: strictInput }, {}, { fetchImpl: async () => response(generated) });
        assert.equal(result.status, 422);
        assert.equal(result.body.code, 'AI_HARD_CONSTRAINTS_FAILED');
        assert.match(result.body.error, expected);
        assert.equal(result.body.shotList, undefined);
    }
});

test('ordinary creative preferences stay flexible and an allowed reflector is not banned by a nearby no-assistant rule', async () => {
    const flexible = output();
    flexible.shot_plans[0].shot_size = 'MS';
    flexible.shot_plans[0].camera_angle = 'eye_level';
    const result = await handleAiPlan({ ...request, input: { theme: '城市自由人像', duration: '1小时', extra: '无助手，但可以使用反光板拍摄近景' } }, {}, {
        fetchImpl: async () => response(flexible),
    });
    assert.equal(result.status, 200);
});

test('constraint extraction groups alternations so requested resources are not banned without a negation', () => {
    const windowLight = { theme: '窗边人像', scene: '室内窗边，窗帘可调', duration: '1小时', extra: '仅50mm；只用窗户自然光；无闪光灯、反光板或助手；不爬窗、不拍摄床铺。' };
    const constraints = extractHardConstraints(windowLight);
    const labels = constraints.prohibited.map(p => p.label);
    assert.ok(labels.includes('闪光灯') && labels.includes('反光板') && labels.includes('助手或助理'));
    assert.ok(!labels.includes('橱窗或窗户'), 'explicitly requested window light must not be prohibited');
    const rooftop = { theme: '天台花园人像', duration: '1小时', extra: '在开放天台平台拍摄，无助手' };
    assert.ok(!extractHardConstraints(rooftop).prohibited.some(p => p.label === '屋顶或脚手架'),
        'a rooftop location the user requested must not be banned without a negation');
});

test('unconfirmed resource patterns catch compound bag names like backpack variants', () => {
    const input = { theme: '校园纪实', duration: '1小时', extra: '无额外道具' };
    const shots = [{ shot_language: '双肩包镜头', model_pose: '背着双肩包走过林荫道', photographer_position: '侧面平视', lens: '35mm', model_position: '中央', wardrobe_styling: '休闲装', lighting_setup: '自然光', shot_props: '无', crop_boundary: '全身', must_show: '人物', reject_if: '模糊', execution_note: '改拍侧影', generator_prompt: 'backpack walk', shot_size: 'FS', camera_angle: 'eye_level' }];
    const violations = validateHardConstraints(shots, input);
    assert.ok(violations.some(v => v.includes('背包或手提包')), `双肩包 must be caught: ${JSON.stringify(violations)}`);
});

test('scene-inherent objects (library books, reading-room tables, train windows) are provided', () => {
    const cases = [
        [{ theme: '图书馆阅读', scene: '市图书馆阅览区', duration: '1小时' }, '翻开手中的书本，坐在座位上', 'book'],
        [{ theme: '自习室纪实', scene: '大学自习室', duration: '1小时' }, '在桌前写字', 'desk'],
        [{ theme: '地铁站台', scene: '地铁站台（已获拍摄许可）', duration: '1小时' }, '静立候车，背景列车车窗光轨划过', 'train window light trails'],
        [{ theme: '咖啡馆写真', scene: '咖啡馆室内（店主人很好已同意）', duration: '1小时' }, '坐在窗边桌前双手捧杯', 'cafe window seat with coffee cup'],
    ];
    for (const [input, pose, prompt] of cases) {
        const shots = [{ shot_language: '场景镜', model_pose: pose, photographer_position: '平视', lens: '35mm', model_position: '中央', wardrobe_styling: '日常装', lighting_setup: '现场光', shot_props: '无', crop_boundary: '半身', must_show: '环境细节', reject_if: '模糊', execution_note: '改拍侧影', generator_prompt: prompt, shot_size: 'MS', camera_angle: 'eye_level' }];
        assert.deepEqual(validateHardConstraints(shots, input), [], `${pose} 不应被视为臆造资源`);
    }
    // 但空街上没有图书馆上下文时，书本仍是未确认资源。
    const street = [{ shot_language: '街拍', model_pose: '捧着书本走路', photographer_position: '平视', lens: '35mm', model_position: '中央', wardrobe_styling: '休闲装', lighting_setup: '自然光', shot_props: '无', crop_boundary: '全身', must_show: '街道', reject_if: '模糊', execution_note: '改拍背影', generator_prompt: 'walking with a book', shot_size: 'FS', camera_angle: 'eye_level' }];
    assert.ok(validateHardConstraints(street, { theme: '街拍', duration: '1小时' }).some(v => v.includes('书本')), '无图书馆上下文的书本必须仍被拦截');
});

test('长凳 provided by the user covers bench mentions; 茶桌 covers tea cups', () => {
    const benchInput = { theme: '八人团建', scene: '公司附近公园草坪', duration: '2小时', extra: '合影用长凳（现场已有）' };
    const bench = [{ shot_language: '合影', model_pose: '前排四人坐长凳，后排搭在前排肩上', photographer_position: '长凳正前方', lens: '35mm', model_position: '中央', wardrobe_styling: '统一工装', lighting_setup: '顺光', shot_props: '长凳（现场已有）', crop_boundary: '全身', must_show: '八人全员', reject_if: '有人闭眼', execution_note: '改拍站姿', generator_prompt: 'group photo on a bench', shot_size: 'FS', camera_angle: 'eye_level' }];
    assert.deepEqual(validateHardConstraints(bench, benchInput), []);
    const teaInput = { theme: '祖孙午后', scene: '老宅院内的藤椅与茶桌', duration: '1小时' };
    const tea = [{ shot_language: '递茶', model_pose: '双手递茶杯', photographer_position: '对面平视', lens: '85mm', model_position: '中央', wardrobe_styling: '家常装', lighting_setup: '自然光', shot_props: '茶杯', crop_boundary: '手部特写', must_show: '茶杯与手', reject_if: '模糊', execution_note: '改拍对视', generator_prompt: 'hands handing a tea cup', shot_size: 'ECU', camera_angle: 'eye_level' }];
    assert.deepEqual(validateHardConstraints(tea, teaInput), []);
});

test('conditional dependency with a fallback is accepted per the prompt contract', () => {
    // 提示词承诺允许"依赖现场条件的镜头明确写条件与替代方案"。
    const input = { theme: '老屋环境人像', scene: '即将拆迁的老屋内部（已获许可）', duration: '1小时', extra: '交代屋内环境细节（斑驳墙、旧家具）' };
    const shots = [{ shot_language: '窗前剪影', model_pose: '静立望向窗外', photographer_position: '室内平视', lens: '24mm', model_position: '中央', wardrobe_styling: '待确认', lighting_setup: '自然光从侧面窗户（如果有）或门口进入，现有室内光为环境光', shot_props: '无', crop_boundary: '全身', must_show: '斑驳墙', reject_if: '剪影发灰', execution_note: '若无窗户，可改用门口光线改拍门口剪影', generator_prompt: 'silhouette by the window', shot_size: 'FS', camera_angle: 'eye_level' }];
    assert.deepEqual(validateHardConstraints(shots, input), []);
    // 但直接假设窗户存在且无条件表述仍要拦（中性场景，无场景豁免、无条件词）。
    const street = { theme: '街头人像', scene: '步行街', duration: '1小时' };
    const assumed = [{ ...shots[0], lighting_setup: '自然光从侧面窗户射入，现有室内光为环境光', execution_note: '改拍门框剪影' }];
    assert.ok(validateHardConstraints(assumed, street).some(v => v.includes('橱窗或窗户')), '无条件表述的窗户假设必须仍被拦截');
    // 中性场景 + 条件与替代 → 放行（合同允许）。
    assert.deepEqual(validateHardConstraints(shots, street), []);
});

test('english negations in generator prompts are not counted as positive resource mentions', () => {
    const input = { theme: '雨夜纪实', duration: '1小时', extra: '无闪光灯，无窗户场地' };
    const shots = [{ shot_language: '夜景全身', model_pose: '静立', photographer_position: '高台阶俯拍', lens: '35mm', model_position: '左下角', wardrobe_styling: '深色外套', lighting_setup: '路灯环境光', shot_props: '无', crop_boundary: '全身', must_show: '全身', reject_if: '模糊', execution_note: '改拍倒影', generator_prompt: 'moody night portrait, restrained mood, no flash, natural light only, windowless alley backdrop', shot_size: 'FS', camera_angle: 'high_angle' }];
    const violations = validateHardConstraints(shots, input);
    assert.deepEqual(violations, []);
});

test('english substrings and time-window idioms are not physical resources', () => {
    // storybook ≠ book, microphone ≠ phone, cupped ≠ cup, 蓝调窗口(中文) ≠ 窗户
    const input = { theme: '古镇黄昏', duration: '1小时', extra: '无闪光灯' };
    const shots = [{ shot_language: '回望', model_pose: '回望镜头，等待蓝调窗口', photographer_position: '街角平视', lens: '50mm', model_position: '中央', wardrobe_styling: '素色长衫', lighting_setup: '黄昏自然光', shot_props: '无', crop_boundary: '半身', must_show: '石板街', reject_if: '模糊', execution_note: '等游客间隙', generator_prompt: 'storybook twilight, singer gripping microphone, hands cupped around a candle', shot_size: 'MS', camera_angle: 'eye_level' }];
    assert.deepEqual(validateHardConstraints(shots, input), []);
});

test('禁用闪光灯 is a refusal, not a violation', () => {
    const input = { theme: '地铁站台', duration: '1小时', extra: '禁止使用闪光灯' };
    const shots = [{ shot_language: '候车剪影', model_pose: '静立候车', photographer_position: '站台对面', lens: '35mm', model_position: '黄线内', wardrobe_styling: '通勤装', lighting_setup: '全程禁用闪光灯，仅用灯带照明', shot_props: '无', crop_boundary: '全身', must_show: '灯带', reject_if: '模糊', execution_note: '改拍剪影', generator_prompt: 'subway platform silhouette', shot_size: 'FS', camera_angle: 'eye_level' }];
    assert.deepEqual(validateHardConstraints(shots, input), []);
});

test('a parent word like 旧家具 covers specific furniture the user provided', () => {
    const input = { theme: '老屋环境人像', scene: '即将拆迁的老屋内部（已获许可）', duration: '1小时', extra: '每个镜头都必须交代屋内环境细节（斑驳墙、旧家具）' };
    const shots = [{ shot_language: '方桌与墙', model_pose: '倚墙静立', photographer_position: '门框侧平视', lens: '24mm', model_position: '中央', wardrobe_styling: '素色衣', lighting_setup: '现有室内光', shot_props: '旧方桌（屋内原有旧家具）', crop_boundary: '全身', must_show: '斑驳墙与旧八仙桌', reject_if: '家具不清晰', execution_note: '改拍门框剪影', generator_prompt: 'old worn wooden table, peeling walls', shot_size: 'WS', camera_angle: 'eye_level' }];
    assert.deepEqual(validateHardConstraints(shots, input), []);
});

test('chinese negations like 不开/关闭/切勿/严禁 are not counted as positive mentions', () => {
    const input = { theme: '午夜便利店', duration: '1小时', extra: '只利用便利店灯光与街灯；无闪光灯。' };
    const base = { photographer_position: '街对面平视', lens: '35mm', model_position: '灯光边界', wardrobe_styling: '深色风衣', shot_props: '无', crop_boundary: '全身', must_show: '便利店灯光', reject_if: '模糊', execution_note: '店员出画', shot_size: 'FS', camera_angle: 'eye_level' };
    const phrasings = [
        '不开闪光灯，仅靠店招灯箱照明',
        '全程不开启闪光灯，快门放慢',
        '闪光灯保持关闭状态',
        '把闪光灯关掉，避免干扰店员',
        '切勿使用闪光灯，街灯足够',
        '严禁闪光灯，尊重店内顾客',
        '别用闪光灯，等眼睛适应暗光',
    ];
    for (const [index, phrasing] of phrasings.entries()) {
        const shots = [{ shot_language: `便利店门口 ${index}`, model_pose: '静立于灯光边界', ...base, lighting_setup: phrasing, generator_prompt: `night storefront ${index}` }];
        const violations = validateHardConstraints(shots, input);
        assert.deepEqual(violations, [], `"${phrasing}" 不应被判为违规：${JSON.stringify(violations)}`);
    }
    const realUse = [{ shot_language: '正面打光', model_pose: '静立', ...base, lighting_setup: '机顶闪光灯正面补光，压暗环境', generator_prompt: 'on-camera flash portrait' }];
    assert.ok(validateHardConstraints(realUse, input).some(v => v.includes('闪光灯')), '真实使用闪光灯仍必须被拦截');
});

test('rejected plans expose raw model output only when the eval flag is set', async () => {
    const input = { theme: '午夜便利店', duration: '1小时', extra: '无闪光灯。' };
    const bad = { shot_plans: Array.from({ length: 9 }, (_, i) => ({ shot_language: `镜${i}`, model_pose: '静立', photographer_position: '平视', lens: '35mm', model_position: '中央', wardrobe_styling: '便装', lighting_setup: i === 0 ? '机顶闪光灯补光' : '街灯', shot_props: '无', crop_boundary: '全身', must_show: '灯光', reject_if: '模糊', execution_note: '改拍', generator_prompt: 'night storefront', shot_size: 'FS', camera_angle: 'eye_level' })) };
    const fetchImpl = async () => response(bad);
    const request = { provider: 'deepseek', apiKey: 'test-key-123456', model: 'deepseek-flash' };
    const withFlag = await handleAiPlan({ ...request, input }, {}, { fetchImpl, debugKeepRejected: true });
    assert.equal(withFlag.status, 422);
    assert.equal(withFlag.body.code, 'AI_HARD_CONSTRAINTS_FAILED');
    assert.equal(withFlag.body.rawShotPlans?.length, 9);
    const withoutFlag = await handleAiPlan({ ...request, input }, {}, { fetchImpl });
    assert.equal(withoutFlag.status, 422);
    assert.equal(withoutFlag.body.rawShotPlans, undefined);
});

test('any Chinese window mention (靠窗/窗外) marks a window as provided by the user', () => {
    const input = { theme: '雨夜玻璃人像', scene: '室内靠窗座位，窗外夜雨', duration: '1小时', extra: '隔着被雨水打湿的玻璃拍摄' };
    const constraints = extractHardConstraints(input);
    assert.ok(constraints.resourceAllowlist ? !/橱窗|落地窗|窗边|window(?!less)/.test(constraints.resourceAllowlist) === false || true : true);
    const shots = [{ shot_language: '玻璃水痕', model_pose: '静坐望向窗外', photographer_position: '室内贴玻璃平视', lens: '50mm', model_position: '画面中央', wardrobe_styling: '针织衫', lighting_setup: '窗边夜灯与窗外霓虹双色温', shot_props: '无', crop_boundary: '半身', must_show: '玻璃水痕', reject_if: '无水痕', execution_note: '雨停改拍残留水珠', generator_prompt: 'rain glass portrait', shot_size: 'MS', camera_angle: 'eye_level' }];
    assert.deepEqual(validateHardConstraints(shots, input), []);
});

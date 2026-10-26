import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { aiPlanProviders, handleAiPlan, extractHardConstraints } from '../api/ai-plan.mjs';
import worker from '../api/index.js';

const key = 'test-private-key-never-log';
const input = { theme: '雨夜纪实', scene: '斑马线', people: '1', duration: '1小时', extra: '高机位俯拍，人物左下角，完整全身' };
const request = { provider: 'deepseek', model: 'test-model', apiKey: key, input };
function output(count = 9) {
    return { shot_plans: Array.from({ length: count }, (_, i) => ({
        shot_language: `镜头${i}`, model_pose: '站定后向前迈步', photographer_position: '在安全台阶上俯拍',
        lens: '35mm', model_position: '左下角', lighting_setup: '路灯为侧光，反光板在暗侧轻补',
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
        const fields = ['shot_language','model_pose','photographer_position','lens','model_position','lighting_setup','crop_boundary','must_show','reject_if','execution_note','generator_prompt','shot_size','camera_angle'];
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

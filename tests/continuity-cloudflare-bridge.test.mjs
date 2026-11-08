import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ROLE_SLOTS, UNMAPPED_ROLES, planCloudFrames, contractShotToCloudInput,
    generateContractShot, CLOUDFLARE_MODEL,
} from '../api/continuity-cloudflare-bridge.mjs';
import { createGroup, setReference, confirmMaster } from '../api/continuity.mjs';
import { recommendProvider, resolveProvider, listProviders } from '../api/continuity-providers.mjs';

const PNG_BYTES = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));

function readyGroup() {
    let group = createGroup({
        input: { theme: '雨夜旧车站', style: '纪实', scene: '海边旧车站月台', wardrobeNote: '炭灰羊毛大衣' },
        lockedHints: { location: '海边旧车站月台', weather: '雨停后阴天', timeOfDay: '傍晚' },
        shots: [{
            shotId: 'shot-01', size: 'WS', lens: '35mm', camera_angle: 'eye_level',
            model_pose: '沿月台缓慢行走', model_position: '画面右侧',
            generator_prompt: 'wide shot of a figure walking along a wet platform',
            file: 'station__01.png',
        }],
    });
    for (const role of ['identity', 'scene', 'style']) {
        group = setReference(group, { role, assetId: `asset-${role}`, status: 'confirmed', path: `/api/continuity/asset/asset-${role}` });
    }
    return confirmMaster(group, { assetId: 'asset-identity', actor: 'human' });
}

function fakeAi() {
    const calls = [];
    return {
        calls,
        async run(model, payload) {
            calls.push({ model, payload });
            return { image: Buffer.from(PNG_BYTES).toString('base64') };
        },
    };
}

test('provider catalog registers Cloudflare as live-without-key and cheapest', () => {
    const entry = resolveProvider('cloudflare-flux-klein');
    assert.ok(entry, 'Cloudflare 画笔必须登记');
    assert.equal(entry.priceTier, 'low');
    assert.deepEqual(entry.env, [], '不应要求额外环境变量');
    assert.equal(entry.requiresBinding, 'AI');
    assert.equal(entry.supportsReferences, true);
    assert.equal(entry.supportsSeed, true, '契约的确定性 seed 需要模型支持');

    // Without the binding it cannot be claimed as ready - that is the honest state.
    const unbound = recommendProvider({ bindings: {} });
    assert.ok(!unbound.apiReadyIds.includes('cloudflare-flux-klein'), '没绑 [ai] 时不能算可用');

    const bound = recommendProvider({ bindings: { AI: {} } });
    assert.equal(bound.recommended, 'cloudflare-flux-klein', '绑了 [ai] 就应立刻推荐它');
    assert.equal(bound.manualOnly, false, '有真实画笔后 manualOnly 必须为 false');
});

test('planCloudFrames names the scene gap instead of hiding it', () => {
    const plan = planCloudFrames(readyGroup());
    assert.equal(plan.canGenerate, true, 'identity/style 都有资产时即可生成');
    assert.equal(plan.frames[0].shotId, 'shot-01');
    assert.equal(plan.frames[0].file, 'station__01.png');
    const warning = plan.gaps.find(gap => gap.role === 'scene');
    assert.ok(warning, '缺少场景图像槽位必须作为 gap 报出来');
    assert.equal(warning.severity, 'warning');
    assert.match(warning.reason, /场景|场地/);
    assert.equal(ROLE_SLOTS.length, 2, '只映射 identity 与 style 两个图像槽');
    assert.equal(UNMAPPED_ROLES[0].role, 'scene');
});

test('contractShotToCloudInput maps locked fields and keeps one candidate', () => {
    const input = contractShotToCloudInput(readyGroup(), 'shot-01', { aspectRatio: 'portrait', seed: 428901 });
    assert.equal(input.provider, 'cloudflare');
    assert.equal(input.model, CLOUDFLARE_MODEL);
    assert.equal(input.candidate_count, 1, '绝不一次抽多张');
    assert.equal(input.billing_mode, 'free-credit-first');
    assert.equal(input.seed, 428901, '契约的确定性 seed 必须透传');
    assert.match(input.scene_brief, /旧车站|月台/);
    assert.equal(input.shot_contract.wardrobe_styling.includes('炭灰'), true);
    assert.match(input.shot_contract.generator_prompt, /35mm/);
    assert.equal(input.shot_contract.shot_size, 'WS');
});

test('generation is refused without an AI binding and without a reference reader', async () => {
    const group = readyGroup();
    await assert.rejects(
        () => generateContractShot({ group, shotId: 'shot-01', ai: null }),
        /IMAGE_PROVIDER_NOT_CONFIGURED/,
    );
    await assert.rejects(
        () => generateContractShot({ group, shotId: 'shot-01', ai: fakeAi() }),
        /缺少资产读取函数/,
    );
});

test('generation is refused while references are still pending', async () => {
    const group = createGroup({
        input: { theme: '未确认', scene: '某地' },
        shots: [{ shotId: 'shot-01', size: 'MS', generator_prompt: 'waist-up portrait' }],
    });
    const ai = fakeAi();
    await assert.rejects(
        () => generateContractShot({ group, shotId: 'shot-01', ai, readAsset: async () => ({ bytes: PNG_BYTES }) }),
        error => error.code === 'CONTINUITY_REFERENCE_UNCONFIRMED' && error.status === 409,
    );
    assert.equal(ai.calls.length, 0, '门禁不过就不能发起任何生成调用');
});

test('one shot means one provider call carrying exactly two reference images', async () => {
    const ai = fakeAi();
    const stored = [];
    const result = await generateContractShot({
        group: readyGroup(), shotId: 'shot-01', ai, seed: 428901,
        readAsset: async assetId => ({ bytes: PNG_BYTES, mime: 'image/png' }),
        store: async ({ bytes, mime, shotId }) => { stored.push({ size: bytes.length, mime, shotId }); return { assetId: 'result-1', path: '/api/continuity/asset/result-1' }; },
    });
    assert.equal(ai.calls.length, 1, '一个镜头只能调一次');
    assert.equal(ai.calls[0].model, CLOUDFLARE_MODEL);
    assert.equal(result.shotId, 'shot-01');
    assert.equal(result.seed, 428901);
    assert.equal(result.qc, 'pending', '生成层不许自己判通过');
    assert.equal(result.mime, 'image/png');
    assert.match(result.prompt, /35mm/);
    assert.match(result.prompt, /visible skin pores/);
    assert.doesNotMatch(result.prompt, /worn location details|mixed colour temperature/);
    assert.equal(result.references.length, 2);
    assert.deepEqual(result.references.map(r => r.role), ['identity', 'style']);
    assert.equal(stored.length, 1, '结果必须落成资产才能进契约');
    assert.equal(stored[0].shotId, 'shot-01');
    // The scene gap travels with the result so the caller can warn.
    assert.ok(result.gaps.some(gap => gap.role === 'scene'));
});

test('missing reference bytes fail before any network call', async () => {
    const ai = fakeAi();
    await assert.rejects(
        () => generateContractShot({
            group: readyGroup(), shotId: 'shot-01', ai,
            readAsset: async () => null,
        }),
        error => error.code === 'GENERATION_REFERENCE_MISSING' && error.status === 409,
    );
    assert.equal(ai.calls.length, 0);
});

test('generateShot routes cloudflare through the Workers AI adapter, two images only', async () => {
    const { generateShot } = await import('../api/continuity-generation.mjs');
    const calls = [];
    const env = {
        AI: { async run(model, payload) { calls.push(model); return { image: Buffer.from(PNG_BYTES).toString('base64') }; } },
        CONTINUITY_ASSETS: null,
    };
    const store = {
        async put() {},
        async get() { return { buffer: PNG_BYTES, meta: { mime: 'image/png' } }; },
    };
    const result = await generateShot({
        group: readyGroup(), shotId: 'shot-01', providerId: 'cloudflare-flux-klein',
        env, store,
    });
    // Two AI calls now: one translation pass for the Chinese pose/camera fields,
    // then exactly one image generation. Never more than one image call.
    const imageCalls = calls.filter(model => model.includes('flux'));
    assert.equal(imageCalls.length, 1, '一个镜头只能调一次图像模型');
    assert.equal(imageCalls[0], '@cf/black-forest-labs/flux-2-klein-9b');
    assert.ok(calls.length <= 2, `最多一次翻译 + 一次出图，实际 ${calls.length} 次`);
    assert.equal(result.provider, 'cloudflare-flux-klein');
    assert.equal(result.adapter, 'cloudflare-workers-ai');
    assert.equal(result.qc.verdict, 'pending');
});

test('generateShot reports a missing AI binding as 503, not a crash', async () => {
    const { generateShot } = await import('../api/continuity-generation.mjs');
    const store = { async put() {}, async get() { return { buffer: PNG_BYTES, meta: { mime: 'image/png' } }; } };
    await assert.rejects(
        () => generateShot({ group: readyGroup(), shotId: 'shot-01', providerId: 'cloudflare-flux-klein', env: {}, store }),
        error => error.status === 503 && /AI/.test(error.message),
    );
});

test('the selected pose reaches the model as text, never as a line drawing', async () => {
    const { generateShot } = await import('../api/continuity-generation.mjs');
    // A group whose shot carries a pose template from the library.
    let group = createGroup({
        input: { theme: '楼梯', scene: '美术馆旋转楼梯' },
        shots: [{
            shotId: 'shot-01', size: 'EWS', lens: '16mm', camera_angle: 'overhead',
            model_pose: '沿内侧扶手慢步下行', model_position: '画面右下三分之一',
            generator_prompt: 'wide overhead shot of a spiral staircase',
            poseRef: { id: 'full_sexy_P003', title: '顶胯回眸', imageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/full_sexy_P003_front.jpg', angle: 'front' },
        }],
    });
    for (const role of ['identity', 'scene', 'style']) {
        group = setReference(group, { role, assetId: `asset-${role}`, status: 'confirmed', path: `/api/continuity/asset/asset-${role}` });
    }
    group = confirmMaster(group, { assetId: 'asset-identity', actor: 'human' });

    const aiCalls = [];
    let translatedDirection = '';
    const envAI = { async run(model, payload) {
        aiCalls.push(model);
        if (model.includes('llama')) {
            translatedDirection = payload.messages[1].content;
            return { response: 'PoseAtlas instruction: a relaxed hip-shift pose looking back over one shoulder.' };
        }
        return { image: Buffer.from(PNG_BYTES).toString('base64') };
    } };
    const store = { async put() {}, async get() { return { buffer: PNG_BYTES, meta: { mime: 'image/png' } }; } };

    // The library fetch must be the only outbound request, and it must be the
    // approved origin - a crafted poseRef cannot make the Worker fetch elsewhere.
    const fetched = [];
    const fakeFetch = async url => {
        fetched.push(String(url));
        return new Response(PNG_BYTES, { status: 200, headers: { 'content-type': 'image/jpeg' } });
    };

    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein',
        env: { AI: envAI }, store, fetchImpl: fakeFetch,
    });

    // The library's pose images are black-and-white anatomical drawings. Sending
    // one alongside two photographs mixes visual registers, which Black Forest
    // Labs documents as confusing the editor, so the pose must travel as text.
    assert.equal(fetched.length, 0, '黑白线稿不该作为参考图上传');
    assert.equal(result.referencesSent, 2, '只有身份 + 风格两张写实参考图');
    // The selected pose reaches translation in Chinese and the image model in
    // translated direction text, without appending its untranslated title.
    assert.match(translatedDirection, /指定姿势顶胯回眸/);
    assert.match(result.sentPrompt, /PoseAtlas instruction: a relaxed hip-shift pose looking back over one shoulder/);
    assert.doesNotMatch(result.sentPrompt, /Required pose: 顶胯回眸|顶胯回眸/);
    assert.equal(aiCalls.filter(m => m.includes('flux')).length, 1);
});

test('a pose reference pointing outside the library is ignored, not fetched', async () => {
    const { generateShot } = await import('../api/continuity-generation.mjs');
    let group = createGroup({
        input: { theme: 'x', scene: 'y' },
        shots: [{ shotId: 'shot-01', size: 'MS', generator_prompt: 'portrait', poseRef: { id: 'evil', imageUrl: 'https://example.com/track.jpg' } }],
    });
    for (const role of ['identity', 'scene', 'style']) {
        group = setReference(group, { role, assetId: `asset-${role}`, status: 'confirmed', path: `/api/continuity/asset/asset-${role}` });
    }
    group = confirmMaster(group, { assetId: 'asset-identity', actor: 'human' });

    const fetched = [];
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein',
        env: { AI: { async run() { return { image: Buffer.from(PNG_BYTES).toString('base64') }; } } },
        store: { async put() {}, async get() { return { buffer: PNG_BYTES, meta: { mime: 'image/png' } }; } },
        fetchImpl: async url => { fetched.push(String(url)); return new Response(PNG_BYTES, { status: 200, headers: { 'content-type': 'image/jpeg' } }); },
    });
    assert.equal(fetched.length, 0, '非白名单地址一律不取');
    assert.equal(result.referencesSent, 2, '没有姿势图时退回两张');
});

test('lighting, must-show, reject-if and camera settings reach the prompt', async () => {
    const { generateShot } = await import('../api/continuity-generation.mjs');
    let group = createGroup({
        input: { theme: '楼梯', scene: '美术馆旋转楼梯' },
        shots: [{
            shotId: 'shot-01', size: 'EWS', lens: '16mm', camera_angle: 'overhead',
            model_pose: '沿内侧扶手慢步下行',
            model_position: '画面右下三分之一',
            generator_prompt: 'wide overhead shot of a spiral staircase',
            lighting_setup: '美术馆顶光与侧窗自然光，禁用闪光灯',
            wardrobe_styling: '深色针织上衣与长裤',
            shot_props: '无',
            crop_boundary: '保留完整螺旋内圈，不裁掉头顶与足部',
            must_show: '螺旋楼梯的几何弧线、扶手连续曲线',
            reject_if: '闪光灯硬阴影、画面裁掉足部',
            aperture: '8',
            shutter: '1/1000s',
        }],
    });
    for (const role of ['identity', 'scene', 'style']) {
        group = setReference(group, { role, assetId: `asset-${role}`, status: 'confirmed', path: `/api/continuity/asset/asset-${role}` });
    }
    group = confirmMaster(group, { assetId: 'asset-identity', actor: 'human' });

    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein',
        env: { AI: { async run(model) {
            if (String(model).includes('llama')) return { response: 'translated direction' };
            return { image: Buffer.from(PNG_BYTES).toString('base64') };
        } } },
        store: { async put() {}, async get() { return { buffer: PNG_BYTES, meta: { mime: 'image/png' } }; } },
    });

    // These six items existed in the plan but never reached the model.
    assert.match(result.sentPrompt, /Must contain: 螺旋楼梯的几何弧线/, '必须出现项要进提示词');
    assert.match(result.sentPrompt, /Redo if: .*闪光灯硬阴影/, '禁止项要进提示词');
    assert.match(result.sentPrompt, /美术馆顶光与侧窗自然光/, '光线要进提示词');
    assert.match(result.sentPrompt, /Deeper depth of field: keep the subject and intended environmental details legible\./, 'f/8 只提示环境细节保持可辨，不保证全场都锐利');
    assert.match(result.sentPrompt, /画面不额外添加道具/, '道具为“无”时要明说，否则模型会自己加');
    // Placeholder text must not be forwarded: it only invites invention.
    assert.ok(!/待确认/.test(result.sentPrompt), '“待确认”这类占位不该发给模型');
});

test('an accepted frame becomes the anchor: later shots are edits of it, not fresh samples', async () => {
    const { generateShot } = await import('../api/continuity-generation.mjs');
    const { setAnchor } = await import('../api/continuity.mjs');

    let group = createGroup({
        input: { theme: '楼梯', scene: '美术馆' },
        shots: [
            { shotId: 'shot-01', size: 'CU', generator_prompt: 'close portrait' },
            { shotId: 'shot-02', size: 'FS', generator_prompt: 'full body' },
        ],
    });
    for (const role of ['identity', 'scene', 'style']) {
        group = setReference(group, { role, assetId: `asset-${role}`, status: 'confirmed', path: `/api/continuity/asset/asset-${role}` });
    }
    group = confirmMaster(group, { assetId: 'asset-identity', actor: 'human' });

    // A distinct byte pattern for the anchor so we can tell it apart from the
    // passport reference in the multipart body.
    const ANCHOR_BYTES = Buffer.concat([PNG_BYTES, Buffer.from('ANCHORFRAME')]);
    const store = {
        async put() {},
        async get(key) {
            if (String(key).includes('anchor01')) return { buffer: ANCHOR_BYTES, meta: { mime: 'image/png' } };
            return { buffer: PNG_BYTES, meta: { mime: 'image/png' } };
        },
    };

    // Frame one: no anchor yet.
    const first = await generateShot({
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein',
        env: { AI: { async run() { return { image: Buffer.from(PNG_BYTES).toString('base64') }; } } }, store,
    });
    assert.equal(first.anchored, false, '第一张还不是编辑');
    assert.match(first.sentPrompt, /Image 1 supplies the identity reference/, '第一张明确使用身份参考');

    // Pin it, then shoot the second frame.
    group = setAnchor(group, { assetId: 'anchor01', path: '/api/continuity/asset/anchor01', shotId: 'shot-01' });
    const second = await generateShot({
        group, shotId: 'shot-02', providerId: 'cloudflare-flux-klein',
        env: { AI: { async run() { return { image: Buffer.from(PNG_BYTES).toString('base64') }; } } }, store,
    });

    assert.equal(second.anchored, true, '第二张必须从锚点编辑');
    assert.match(second.sentPrompt, /Image 1 is the accepted frame from this shoot/, '提示词说明从已确认的本组母图继续拍摄');
    assert.match(second.sentPrompt, /Preserve established identity and group-wide wardrobe continuity/, '保持人物身份和全组服装连续');
    assert.match(second.sentPrompt, /Follow that contract for pose, action, scene, lighting, camera and framing/, '母图编辑仍按当前镜头合同变化');
    assert.doesNotMatch(second.sentPrompt, /only the camera position and framing/i, '当前镜头合同不被限制为只改机位和裁切');
});

test('seedream adapter: no key is 503, and the request carries references as base64', async () => {
    const { generateShot } = await import('../api/continuity-generation.mjs');
    let group = createGroup({
        input: { theme: '楼梯', scene: '美术馆' },
        shots: [{ shotId: 'shot-01', size: 'MCU', generator_prompt: '近景人像' }],
    });
    for (const role of ['identity', 'scene', 'style']) {
        group = setReference(group, { role, assetId: `asset-${role}`, status: 'confirmed', path: `/api/continuity/asset/asset-${role}` });
    }
    group = confirmMaster(group, { assetId: 'asset-identity', actor: 'human' });
    const store = { async put() {}, async get() { return { buffer: PNG_BYTES, meta: { mime: 'image/png' } }; } };

    // Missing key must fail closed with the variable name, never fall back.
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', providerId: 'volcengine-seedream', env: {}, store }),
        error => error.status === 503 && /ARK_API_KEY/.test(JSON.stringify(error.details || error.message)),
    );

    // With a key, capture the outgoing request.
    let sent = null;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'volcengine-seedream',
        env: { ARK_API_KEY: 'test-key' }, store,
        fetchImpl: async (url, init) => {
            sent = { url: String(url), body: JSON.parse(init.body), auth: init.headers.Authorization };
            return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from(PNG_BYTES).toString('base64') }] }), {
                status: 200, headers: { 'content-type': 'application/json' },
            });
        },
    });

    assert.match(sent.url, /ark\.cn-beijing\.volces\.com\/api\/v3\/images\/generations/);
    assert.equal(sent.auth, 'Bearer test-key');
    assert.equal(sent.body.model, 'doubao-seedream-4-0-250828');
    assert.ok(Array.isArray(sent.body.image) && sent.body.image.length >= 2, '两张参考图以 base64 传过去');
    assert.ok(sent.body.image[0].startsWith('data:image/'), '参考图必须是 data URL');
    assert.equal(sent.body.watermark, false, '不要平台水印');
    // Native Chinese prompt: no translation pass should run for this provider.
    assert.match(sent.body.prompt, /[\u4e00-\u9fa5]/, '方案是中文，Seedream 原生支持中文提示词');
    assert.equal(result.provider, 'volcengine-seedream');
});

test('framing follows the size code, not the machine label', async () => {
    const { generateShot } = await import('../api/continuity-generation.mjs');
    // shotType is normalised to "medium-close-up" etc. The framing regexes only
    // understand MCU/ECU/WS codes, so before this fix every frame silently fell
    // through to the generic fallback and came back as a full standing figure.
    const cases = [
        ['MCU', 'Head-and-shoulders framing'],
        ['ECU', 'Tight close-up'],
        ['FS', 'Head-to-toe framing'],
        ['EWS', 'Wide environmental framing'],
    ];
    for (const [size, expected] of cases) {
        let group = createGroup({
            input: { theme: 't', scene: 's' },
            shots: [{ shotId: 'shot-01', size, generator_prompt: 'studio portrait' }],
        });
        for (const role of ['identity', 'scene', 'style']) {
            group = setReference(group, { role, assetId: `asset-${role}`, status: 'confirmed', path: `/api/continuity/asset/asset-${role}` });
        }
        group = confirmMaster(group, { assetId: 'asset-identity', actor: 'human' });
        const result = await generateShot({
            group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein',
            env: { AI: { async run(model) {
                if (String(model).includes('llama')) return { response: 'direction' };
                return { image: Buffer.from(PNG_BYTES).toString('base64') };
            } } },
            store: { async put() {}, async get() { return { buffer: PNG_BYTES, meta: { mime: 'image/png' } }; } },
        });
        assert.match(result.sentPrompt, new RegExp(expected), `${size} 必须落到正确的取景描述`);
    }
});

test('modelscope adapter: submits, polls the task, and carries references', async () => {
    const { generateShot } = await import('../api/continuity-generation.mjs');
    let group = createGroup({
        input: { theme: '楼梯', scene: '美术馆' },
        shots: [{ shotId: 'shot-01', size: 'MCU', camera_angle: 'low_angle', generator_prompt: '低机位近景' }],
    });
    for (const role of ['identity', 'scene', 'style']) {
        group = setReference(group, { role, assetId: `asset-${role}`, status: 'confirmed', path: `/api/continuity/asset/asset-${role}` });
    }
    group = confirmMaster(group, { assetId: 'asset-identity', actor: 'human' });
    const store = { async put() {}, async get() { return { buffer: PNG_BYTES, meta: { mime: 'image/png' } }; } };

    // Missing token must fail closed and name the variable.
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', env: {}, store }),
        error => error.status === 503 && /MODELSCOPE_TOKEN/.test(JSON.stringify(error.details || error.message)),
    );

    const calls = [];
    let submitted = null;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'ms-test' }, store,
        fetchImpl: async (url, init) => {
            calls.push(String(url));
            if (String(url).includes('/images/generations')) {
                submitted = JSON.parse(init.body);
                return new Response(JSON.stringify({ task_id: 'task-1' }), { status: 200, headers: { 'content-type': 'application/json' } });
            }
            if (String(url).includes('/v1/tasks/')) {
                return new Response(JSON.stringify({ task_status: 'SUCCEEDED', output_images: ['https://cdn.example/out.png'] }), { status: 200, headers: { 'content-type': 'application/json' } });
            }
            return new Response(PNG_BYTES, { status: 200, headers: { 'content-type': 'image/png' } });
        },
    });

    assert.equal(submitted.model, 'Qwen/Qwen-Image-Edit-2511');
    assert.ok(Array.isArray(submitted.image_url) && submitted.image_url.length >= 2, '参考图必须以数组传入');
    assert.ok(submitted.image_url[0].startsWith('data:image/'), '参考图是 data URL');
    // Chinese native: the direction should not have been translated.
    assert.match(submitted.prompt, /[\u4e00-\u9fa5]/);
    assert.match(submitted.prompt, /取景：/, '景别指令必须进提示词');
    // Submit then poll.
    assert.ok(calls.some(url => url.includes('/v1/tasks/')), '必须轮询任务');
    assert.equal(result.provider, 'modelscope-qwen-edit');
    assert.equal(result.referencesSent, 2);
});

test('modelscope poll accepts the SUCCEED spelling and reads output_images', async () => {
    const { pollModelScope } = await import('../api/continuity-generation.mjs');
    // ModelScope returns task_status "SUCCEED", not "SUCCEEDED". Matching only the
    // longer spelling left a finished task reading as pending forever, so callers
    // timed out on an image that had already been generated and paid for.
    const result = await pollModelScope({
        env: { MODELSCOPE_TOKEN: 'ms-test' },
        taskId: 'task-abc',
        fetchImpl: async url => {
            if (String(url).includes('/v1/tasks/')) {
                return new Response(JSON.stringify({
                    task_status: 'SUCCEED',
                    output_images: ['https://cdn.example/out.png'],
                }), { status: 200, headers: { 'content-type': 'application/json' } });
            }
            return new Response(PNG_BYTES, { status: 200, headers: { 'content-type': 'image/png' } });
        },
    });
    assert.equal(result.status, 'succeeded');
    assert.ok(result.base64.length > 0);
});

test('modelscope poll still reports a running task as pending', async () => {
    const { pollModelScope } = await import('../api/continuity-generation.mjs');
    const result = await pollModelScope({
        env: { MODELSCOPE_TOKEN: 'ms-test' },
        taskId: 'task-abc',
        fetchImpl: async () => new Response(JSON.stringify({ task_status: 'RUNNING' }), {
            status: 200, headers: { 'content-type': 'application/json' },
        }),
    });
    assert.equal(result.status, 'pending');
    assert.equal(result.upstream, 'RUNNING');
});

test('framing states where the frame cuts, and the pose is trimmed to what fits', async () => {
    const { directionText } = await import('../api/continuity-generation.mjs');
    // Two failures measured against the live model, both fixed here:
    //   - "半身近景，不拍到手" produced full-body frames; stating the cut works
    //   - the plan's pose often describes feet/stairs that a tight frame cannot
    //     contain, and the model resolves that by widening the frame
    const text = directionText({
        prompt: '美术馆螺旋楼梯',
        locked: { location: '美术馆螺旋楼梯', styleProfile: '纪实' },
        variant: {
            size: 'MCU',
            action: '单脚踩在下一级踏步边缘，另一脚在后，右手扶内侧扶手，身体微侧',
            crop: '人物从头顶到膝盖入画，前景保留内侧扶手',
            lighting: '天窗顶光，禁用闪光灯',
        },
        size: 'MCU',
    });

    // The cut is stated, and it appears before the body description.
    assert.match(text, /画框下沿切在胸部/);
    assert.match(text, /胸部以下完全不在画面内/);
    assert.ok(text.indexOf('取景：') < text.indexOf('画面：'), '取景要先于画面描述，避免身体动作把画框撑大');
    assert.ok(text.indexOf('取景：') < text.indexOf('动作：'), '取景要排在动作前面，否则姿势会把画框撑大');
    // Clauses naming off-frame body parts are dropped rather than sent.
    assert.ok(!/踏步/.test(text), 'MCU 不该出现踏步');
    assert.ok(!/膝盖入画/.test(text), '与景别矛盾的裁切描述要丢掉');
    assert.ok(!/另一脚在后/.test(text), '脚不入画时不该描述脚的站位');
    // What does fit is kept.
    assert.match(text, /右手扶内侧扶手/);
});

test('a wide frame keeps the whole pose', async () => {
    const { directionText } = await import('../api/continuity-generation.mjs');
    const text = directionText({
        prompt: '远景街景',
        locked: {},
        variant: { size: 'FS', action: '站立，单脚踩在台阶上，双手插兜' },
        size: 'FS',
    });
    assert.match(text, /单脚踩在台阶上/, '全身景别不该裁掉姿势');
    assert.match(text, /从头到脚完整入画/);
});

test('the assembled direction always requires exactly one person', async () => {
    const { directionText } = await import('../api/continuity-generation.mjs');
    const text = directionText({
        prompt: '美术馆螺旋楼梯',
        locked: { location: '美术馆螺旋楼梯' },
        variant: { size: 'FS' },
        size: 'FS',
    });
    // Written as "only one person is allowed", the model returned an empty
    // staircase; written as "there must be one person, and only one", it returned
    // the subject. Both halves have to be present.
    assert.match(text, /必须有一个人/, '必须先要求有人，否则约束会被读成可以没有人');
    assert.match(text, /只有一个人/);
    assert.match(text, /不要出现第二个人/);
});

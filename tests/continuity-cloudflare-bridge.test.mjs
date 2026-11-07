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

test('the pose template selected for a frame becomes a third reference image', async () => {
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
    const envAI = { async run(model, payload) { aiCalls.push(model); return { image: Buffer.from(PNG_BYTES).toString('base64') }; } };
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

    assert.equal(fetched.length, 1, '必须去取那一张姿势模板图');
    assert.match(fetched[0], /RuiC-PoseAtlas\/thumbs\/full_sexy_P003_front\.jpg/);
    assert.equal(result.referencesSent, 3, '脸 + 服装 + 姿势 = 三张参考图');
    // The prompt must explain what the third image is for, and carry the pose the
    // operator selected.
    assert.match(result.sentPrompt, /Reference image 3 is a body-pose reference/);
    assert.match(result.sentPrompt, /顶胯回眸|body geometry/);
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

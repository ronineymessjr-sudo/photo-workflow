import test from 'node:test';
import assert from 'node:assert/strict';
import { generateShot, GenerationError } from '../api/continuity-generation.mjs';
import { prescreen, mergeScores, summariseVision, PRE_SCREEN_ITEMS } from '../api/continuity-vision.mjs';
import { createGroup, setReference, confirmMaster } from '../api/continuity.mjs';
import { storeAsset, createMemoryStore } from '../api/continuity-assets.mjs';

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function readyGroup(store) {
    let group = createGroup({
        input: { theme: '雨夜旧车站', scene: '旧车站月台', style: '纪实', modelDesc: '一名成年人', wardrobeNote: '炭灰大衣' },
        shots: [{ shotId: 'shot-01', size: 'WS', camera_angle: 'eye_level', lens: '35mm', model_pose: '沿月台行走', model_position: '画面右侧', generator_prompt: 'wide shot of a figure walking along a wet platform' }],
    });
    for (const role of ['identity', 'scene', 'style']) {
        const asset = await storeAsset({ dataUrl: PNG_1PX, role, store });
        group = setReference(group, { role, assetId: asset.assetId, status: 'confirmed', path: asset.path });
    }
    return confirmMaster(group, { assetId: group.references[0].assetId });
}

test('generation without credentials fails closed and names the missing env vars', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', providerId: 'gpt-image-2', env: {}, store, fetchImpl: async () => assert.fail('不应发起网络请求') }),
        error => error instanceof GenerationError && error.code === 'GENERATION_NOT_CONFIGURED' && error.details.missing.includes('OPENAI_API_KEY'),
    );
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', providerId: 'flux-kontext', env: {}, store, fetchImpl: async () => assert.fail('不应发起网络请求') }),
        error => error.code === 'GENERATION_NOT_CONFIGURED' && error.details.missing.length === 2,
    );
});

test('the gate runs before the adapter, so missing references never reach a provider', async () => {
    const store = createMemoryStore();
    const group = createGroup({ input: { theme: '雨夜', scene: '月台' }, shots: [{ shotId: 'shot-01', generator_prompt: 'x' }] });
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', providerId: 'gpt-image-2', env: { OPENAI_API_KEY: 'k' }, store, fetchImpl: async () => assert.fail('不应发起网络请求') }),
        error => error.code === 'CONTINUITY_REFERENCE_UNCONFIRMED',
    );
});

test('one shot produces exactly one upstream call carrying three reference images', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    const calls = [];
    const fetchImpl = async (url, init) => {
        calls.push({ url, init });
        return Response.json({ data: [{ b64_json: PNG_1PX.split(',')[1] }] });
    };
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'gpt-image-2',
        env: { OPENAI_API_KEY: 'test-key' }, store, fetchImpl,
    });

    assert.equal(calls.length, 1, '一个镜头只能有一次上游调用');
    assert.equal(calls[0].url, 'https://api.openai.com/v1/images/edits');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer test-key');
    const form = calls[0].init.body;
    assert.equal(form.get('size'), '1024x1536');
    assert.match(String(form.get('prompt')), /walking along a wet platform/);
    assert.equal(form.getAll('image[]').length, 3, 'identity/scene/style 三张参考都要带上');

    assert.equal(result.shotId, 'shot-01');
    assert.equal(result.references.length, 3);
    assert.ok(result.image.path.startsWith('/api/continuity/asset/'));
    assert.equal(result.qc.verdict, 'pending', '生成层不自评');
});

test('a reference-aware JSON service receives role-tagged data URLs and the seed', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    let payload;
    const fetchImpl = async (url, init) => {
        payload = { url, body: JSON.parse(init.body) };
        return Response.json({ data: [{ b64_json: PNG_1PX.split(',')[1] }] });
    };
    await generateShot({
        group, shotId: 'shot-01', providerId: 'flux-kontext',
        env: { CONTINUITY_IMAGE_ENDPOINT: 'https://image.example/run', CONTINUITY_IMAGE_KEY: 'k' },
        store, fetchImpl,
    });
    assert.equal(payload.url, 'https://image.example/run');
    assert.equal(payload.body.references.length, 3);
    assert.deepEqual(payload.body.references.map(reference => reference.role), ['identity', 'scene', 'style']);
    assert.ok(payload.body.references.every(reference => reference.dataUrl.startsWith('data:image/png;base64,')));
    assert.equal(typeof payload.body.seed, 'number');
});

test('an unreadable reference is a configuration error, never a text-only fallback', async () => {
    const store = createMemoryStore();
    let group = await readyGroup(store);
    // Point identity at an asset id that was never stored.
    group = setReference(group, { role: 'identity', assetId: 'deadbeefdeadbeef', status: 'confirmed', path: '/api/continuity/asset/deadbeefdeadbeef' });
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', providerId: 'gpt-image-2', env: { OPENAI_API_KEY: 'k' }, store, fetchImpl: async () => assert.fail('不应发起网络请求') }),
        error => error.code === 'GENERATION_REFERENCE_MISSING',
    );
});

test('an upstream error is surfaced with its status, not swallowed', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    await assert.rejects(
        () => generateShot({
            group, shotId: 'shot-01', providerId: 'gpt-image-2',
            env: { OPENAI_API_KEY: 'k' }, store,
            fetchImpl: async () => Response.json({ error: { message: 'quota exceeded' } }, { status: 429 }),
        }),
        error => error.code === 'GENERATION_UPSTREAM_ERROR' && /429/.test(error.message),
    );
});

test('vision pre-screen cannot upgrade a score: pass becomes unknown, fail stays fail', async () => {
    const merged = mergeScores(
        { wardrobe: 'unknown', 'place-weather': 'unknown', 'shot-spec': 'unknown', identity: 'pass' },
        { wardrobe: 'pass', 'place-weather': 'fail', 'shot-spec': 'unknown' },
    );
    assert.equal(merged.wardrobe, 'unknown', '视觉的 pass 不能变成最终通过');
    assert.equal(merged['place-weather'], 'fail', '视觉的 fail 可以升级为需要重做');
    assert.equal(merged.identity, 'pass', '不在预筛范围内的项不受影响');
    assert.deepEqual(PRE_SCREEN_ITEMS, ['wardrobe', 'place-weather', 'shot-spec']);
});

test('vision unavailable returns no scores instead of silently passing', async () => {
    const shot = { size: 'WS', camera: 'eye_level，35mm', lens: '35mm' };
    const locked = { subject: '成年人', wardrobe: '大衣', location: '月台', weather: '雨', timeOfDay: '夜间' };

    const missingKey = await prescreen({ imageDataUrl: PNG_1PX, shot, locked, env: {} });
    assert.equal(missingKey.available, false);
    assert.deepEqual(missingKey.scores, {});
    assert.match(missingKey.reason, /DEEPSEEK_API_KEY/);
    assert.match(summariseVision(missingKey), /未启用|未配置/);

    const prose = await prescreen({
        imageDataUrl: PNG_1PX, shot, locked, env: { DEEPSEEK_API_KEY: 'k' },
        fetchImpl: async () => Response.json({ choices: [{ message: { content: '这张图看起来不错，服装基本一致。' } }] }),
    });
    assert.equal(prose.available, true);
    assert.deepEqual(prose.scores, {}, '散文式回答不能变成判定');
    assert.match(prose.reason, /没有返回可解析/);
});

test('vision JSON verdicts are parsed and summarised', async () => {
    const shot = { size: 'WS', camera: 'eye_level，35mm', lens: '35mm' };
    const locked = { subject: '成年人', wardrobe: '大衣', location: '月台', weather: '雨', timeOfDay: '夜间' };
    const result = await prescreen({
        imageDataUrl: PNG_1PX, shot, locked, env: { DEEPSEEK_API_KEY: 'k' },
        fetchImpl: async (url, init) => {
            const body = JSON.parse(init.body);
            assert.match(body.messages[0].content[0].text, /服装：大衣/);
            assert.equal(body.messages[0].content[1].type, 'image_url');
            return Response.json({ choices: [{ message: { content: '```json\n{"wardrobe":"fail","place-weather":"pass","shot-spec":"pass","notes":"外套颜色偏黑"}\n```' } }] });
        },
    });
    assert.equal(result.available, true);
    assert.equal(result.scores.wardrobe, 'fail');
    assert.equal(result.scores['place-weather'], 'unknown');
    assert.match(summariseVision(result), /wardrobe/);
});

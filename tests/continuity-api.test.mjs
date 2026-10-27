import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../api/index.js';

const BASE = 'https://photoatelier.test';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function call(path, body, method = 'POST') {
    const response = await worker.fetch(new Request(`${BASE}${path}`, {
        method,
        headers: JSON_HEADERS,
        body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    }), {}, {});
    return { status: response.status, body: await response.json() };
}

function sampleInput() {
    return {
        input: {
            theme: '雨夜旧车站', style: '纪实', modelDesc: '一名成年人',
            scene: '雨后的海边旧火车站月台', duration: '1小时', people: '1',
            extra: '禁用闪光灯；不要改变服装',
        },
        shots: [
            { shotId: 'shot-01', size: 'WS', camera_angle: 'eye_level', lens: '35mm', model_pose: '沿月台缓慢行走', model_position: '画面右侧', generator_prompt: 'wide shot of a figure walking along a wet platform', aspect: '2:3' },
            { shotId: 'shot-02', size: 'CU', camera_angle: 'low_angle', lens: '85mm', model_pose: '低头看表', model_position: '画面中央', generator_prompt: 'close-up of the same person checking a watch', aspect: '2:3' },
        ],
    };
}

test('continuity schema advertises providers, roles and qc items', async () => {
    const { status, body } = await call('/api/continuity/schema', null, 'GET');
    assert.equal(status, 200);
    assert.deepEqual(body.roles, ['identity', 'scene', 'style']);
    assert.equal(body.providers['deepseek-vision'].canGenerate, false);
    assert.equal(body.providers['gpt-image-2'].supportsReferences, true);
    assert.equal(body.qcItems.length, 7);
});

test('an initialised group starts blocked with three pending references', async () => {
    const { status, body } = await call('/api/continuity/init', sampleInput());
    assert.equal(status, 200);
    const group = body.group;
    assert.equal(group.references.length, 3);
    assert.ok(group.references.every(reference => reference.status === 'pending'));
    assert.equal(group.master.confirmedBy, 'none');
    assert.equal(group.shots.length, 2);
    assert.ok(group.lockedHash);

    const summary = await call('/api/continuity/summary', { group });
    assert.equal(summary.body.readyToGenerate, false);
    assert.match(summary.body.blockedReason, /参考图未确认/);
});

test('generation is refused while references are pending, with a contract code', async () => {
    const { body } = await call('/api/continuity/init', sampleInput());
    const result = await call('/api/continuity/requests', { group: body.group, providerId: 'gpt-image-2' });
    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'CONTINUITY_REFERENCE_UNCONFIRMED');
});

test('a vision-only service cannot be used for generation', async () => {
    const { body } = await call('/api/continuity/init', sampleInput());
    let group = body.group;
    for (const role of ['identity', 'scene', 'style']) {
        group = (await call('/api/continuity/reference', { group, reference: { role, assetId: `asset-${role}`, status: 'confirmed' } })).body.group;
    }
    group = (await call('/api/continuity/master', { group, assetId: 'asset-identity' })).body.group;
    const result = await call('/api/continuity/requests', { group, providerId: 'deepseek-vision' });
    assert.equal(result.status, 422);
    assert.equal(result.body.code, 'CONTINUITY_PROVIDER_TEXT_ONLY');
    assert.match(result.body.error, /不支持参考图一致性/);
});

test('master confirmation requires a human actor and a confirmed identity reference', async () => {
    const { body } = await call('/api/continuity/init', sampleInput());
    const early = await call('/api/continuity/master', { group: body.group, assetId: 'x' });
    assert.equal(early.status, 409);
    assert.equal(early.body.code, 'CONTINUITY_IDENTITY_REQUIRED');

    let group = (await call('/api/continuity/reference', { group: body.group, reference: { role: 'identity', assetId: 'asset-identity', status: 'confirmed' } })).body.group;
    const machine = await call('/api/continuity/master', { group, assetId: 'asset-identity', actor: 'model' });
    assert.equal(machine.status, 403);
    assert.equal(machine.body.code, 'CONTINUITY_MASTER_HUMAN_ONLY');
});

test('a ready group produces one request per shot with identical references', async () => {
    const { body } = await call('/api/continuity/init', sampleInput());
    let group = body.group;
    for (const role of ['identity', 'scene', 'style']) {
        group = (await call('/api/continuity/reference', { group, reference: { role, assetId: `asset-${role}`, status: 'confirmed' } })).body.group;
    }
    group = (await call('/api/continuity/master', { group, assetId: 'asset-identity' })).body.group;
    const { status, body: payload } = await call('/api/continuity/requests', { group, providerId: 'gpt-image-2', seedBase: 1000 });
    assert.equal(status, 200);
    assert.equal(payload.count, 2);
    const [first, second] = payload.requests;
    assert.notEqual(first.shotId, second.shotId);
    assert.notEqual(first.seed, second.seed);
    assert.deepEqual(first.references.map(r => r.role), ['identity', 'scene', 'style']);
    assert.deepEqual(first.references, second.references);
    assert.equal(first.locked.wardrobe, second.locked.wardrobe);
    assert.equal(first.locked.location, '雨后的海边旧火车站月台');

    const subset = await call('/api/continuity/requests', { group, providerId: 'gpt-image-2', shotIds: ['shot-02'] });
    assert.equal(subset.body.count, 1);
    assert.equal(subset.body.requests[0].shotId, 'shot-02');
});

test('tampering with the locked block is rejected before any request', async () => {
    const { body } = await call('/api/continuity/init', sampleInput());
    let group = body.group;
    for (const role of ['identity', 'scene', 'style']) {
        group = (await call('/api/continuity/reference', { group, reference: { role, assetId: `asset-${role}`, status: 'confirmed' } })).body.group;
    }
    group = (await call('/api/continuity/master', { group, assetId: 'asset-identity' })).body.group;
    const tampered = { ...group, locked: { ...group.locked, location: '另一个城市的地下停车场' } };
    const result = await call('/api/continuity/requests', { group: tampered, providerId: 'gpt-image-2' });
    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'CONTINUITY_LOCKED_TAMPERED');
});

test('qc verdicts keep retry scoped to a single shot and force human confirmation', async () => {
    const { body } = await call('/api/continuity/init', sampleInput());
    const allPass = Object.fromEntries(['identity', 'wardrobe', 'place-weather', 'shot-spec', 'anatomy', 'face-sharp', 'style-match'].map(id => [id, 'pass']));

    const wrongWardrobe = await call('/api/continuity/qc', {
        group: body.group, shotId: 'shot-01', scores: { ...allPass, wardrobe: 'fail' }, humanConfirmed: true,
    });
    assert.equal(wrongWardrobe.status, 200);
    assert.equal(wrongWardrobe.body.result.verdict, 'retry');
    assert.equal(wrongWardrobe.body.result.retryScope, 'single-shot');

    const noHuman = await call('/api/continuity/qc', {
        group: body.group, shotId: 'shot-02', scores: allPass, humanConfirmed: false,
    });
    assert.equal(noHuman.body.result.verdict, 'needs-human');

    const unknownShot = await call('/api/continuity/qc', { group: body.group, shotId: 'shot-99', scores: allPass, humanConfirmed: true });
    assert.equal(unknownShot.status, 404);
});

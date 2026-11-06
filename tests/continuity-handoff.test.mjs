import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroup, setReference, confirmMaster, attachResult, handoffFor, judgeQc, ContinuityError } from '../api/continuity.mjs';
import { storeAsset, createMemoryStore } from '../api/continuity-assets.mjs';

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function readyGroup(store) {
    let group = createGroup({
        input: { theme: '雨夜旧车站', scene: '旧车站月台', style: '纪实', modelDesc: '一名成年人', wardrobeNote: '炭灰大衣' },
        shots: [
            { shotId: 'shot-01', size: 'WS', lens: '35mm', camera_angle: 'eye_level', model_pose: '沿月台行走', subjectPlacement: '画面右侧', generator_prompt: 'wide shot of a figure walking along a wet platform', file: 'station__01.png' },
            { shotId: 'shot-02', size: 'CU', lens: '85mm', camera_angle: 'low_angle', model_pose: '低头看表', generator_prompt: 'close-up of the same person checking a watch', file: 'station__02.png' },
        ],
    });
    for (const role of ['identity', 'scene', 'style']) {
        const asset = await storeAsset({ dataUrl: PNG_1PX, role, store });
        group = setReference(group, { role, assetId: asset.assetId, status: 'confirmed', path: asset.path });
    }
    return confirmMaster(group, { assetId: group.references[0].assetId });
}

test('handoff card carries prompt, reference paths and the target filename', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    const handoff = handoffFor(group, { shotId: 'shot-01' });
    assert.equal(handoff.ready, true);
    assert.equal(handoff.cards.length, 1);
    const card = handoff.cards[0];
    assert.equal(card.shotId, 'shot-01');
    assert.equal(card.file, 'station__01.png');
    assert.match(card.prompt, /walking along a wet platform/);
    assert.equal(card.referencePaths.length, 3, '三张参考图路径都要给到');
    assert.ok(card.referencePaths.every(path => path.startsWith('/api/continuity/asset/')));
    assert.match(card.instruction, /回传/);
});

test('handoff reports why it is blocked instead of handing over a half contract', async () => {
    let group = createGroup({ input: { theme: '雨夜', scene: '月台' }, shots: [{ shotId: 'shot-01', generator_prompt: 'x' }] });
    const blocked = handoffFor(group);
    assert.equal(blocked.ready, false);
    assert.match(blocked.blockedReason, /参考图未就绪/);

    const asset = await storeAsset({ dataUrl: PNG_1PX, role: 'identity', store: createMemoryStore() });
    group = setReference(group, { role: 'identity', assetId: asset.assetId, status: 'confirmed', path: asset.path });
    for (const role of ['scene', 'style']) {
        const extra = await storeAsset({ dataUrl: PNG_1PX, role, store: createMemoryStore() });
        group = setReference(group, { role, assetId: extra.assetId, status: 'confirmed', path: extra.path });
    }
    const noMaster = handoffFor(group);
    assert.equal(noMaster.ready, false);
    assert.match(noMaster.blockedReason, /主参考图/);
});

test('a returned image attaches to its shot without touching the locked bible', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    const hashBefore = group.lockedHash;
    const asset = await storeAsset({ dataUrl: PNG_1PX, role: 'misc', store });
    const updated = attachResult(group, { shotId: 'shot-01', assetId: asset.assetId, path: asset.path, provider: 'chatgpt-web' });

    assert.equal(updated.lockedHash, hashBefore, '回传不应该改动锁定字段版本');
    assert.equal(updated.results['shot-01'].assetId, asset.assetId);
    assert.equal(updated.results['shot-01'].provider, 'chatgpt-web');
    assert.equal(updated.results['shot-01'].lockedHash, hashBefore, '结果要记录它是在哪个锁定版本下产出的');
    assert.equal(updated.results['shot-01'].qc, 'pending', '回传后仍未质检');
});

test('attaching to an unknown shot is rejected, and empty assets are rejected', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    assert.throws(() => attachResult(group, { shotId: 'shot-99', assetId: 'x' }), error => error instanceof ContinuityError && error.code === 'CONTINUITY_SHOT_UNKNOWN');
    assert.throws(() => attachResult(group, { shotId: 'shot-01', assetId: '' }), error => error.code === 'CONTINUITY_ASSET_REQUIRED');
});

test('a hand-attached image still has to pass the human qc gate', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    const asset = await storeAsset({ dataUrl: PNG_1PX, role: 'misc', store });
    attachResult(group, { shotId: 'shot-01', assetId: asset.assetId, path: asset.path });

    const allPass = Object.fromEntries(['identity', 'wardrobe', 'place-weather', 'shot-spec', 'anatomy', 'face-sharp', 'style-match'].map(id => [id, 'pass']));
    assert.equal(judgeQc(allPass, { humanConfirmed: false }).verdict, 'needs-human');
    assert.equal(judgeQc({ ...allPass, anatomy: 'fail' }, { humanConfirmed: true }).verdict, 'retry');
    assert.equal(judgeQc(allPass, { humanConfirmed: true }).verdict, 'pass');
});

test('tampering with the locked block is still caught after attachment', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    const asset = await storeAsset({ dataUrl: PNG_1PX, role: 'misc', store });
    const updated = attachResult(group, { shotId: 'shot-01', assetId: asset.assetId, path: asset.path });
    const tampered = { ...updated, locked: { ...updated.locked, wardrobe: '红色羽绒服' } };
    assert.throws(() => handoffFor(tampered), error => error.code === 'CONTINUITY_LOCKED_TAMPERED');
});

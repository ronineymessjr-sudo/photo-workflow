import test from 'node:test';
import assert from 'node:assert/strict';
import { groupFromStudio } from '../api/continuity-studio-bridge.mjs';
import { handoffFor, attachResult } from '../api/continuity.mjs';

const portrait = {
    id: 'atlas-portrait-f009267e478', kind: 'portrait', upstreamId: 'f009267e478',
    title: '短发 · 妆发参考', rightsStatus: 'external_reference', angles: [],
    sourceUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/face.html?lang=zh#portrait=f009267e478',
};
const costume = {
    id: 'atlas-costume-c001', kind: 'costume', upstreamId: 'c001',
    title: '衣装 c001', rightsStatus: 'external_reference', tags: ['白色', '针织'],
    sourceUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/costume.html?lang=zh#costume=c001',
};
const pose = {
    id: 'atlas-pose-p001', kind: 'pose', upstreamId: 'p001',
    title: '坐姿 001', rightsStatus: 'external_reference', angles: ['front', 'diagonal'],
    sourceUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/?lang=zh#pose=p001',
};

test('portrait becomes identity, costume becomes style, pose becomes a constraint', () => {
    const result = groupFromStudio({
        templates: [portrait, costume, pose],
        input: { theme: '白底换脸测试', scene: '白底影棚', modelDesc: '一名成年人' },
        planId: 'plan-1',
        selectedIds: [portrait.id, costume.id, pose.id],
    });

    assert.equal(result.mapping.length, 2);
    assert.deepEqual(result.mapping.map(item => item.role), ['identity', 'style']);

    const identity = result.group.references.find(reference => reference.role === 'identity');
    assert.equal(identity.assetId, 'studio-portrait-f009267e478');
    assert.equal(identity.upstreamId, 'f009267e478');
    assert.equal(identity.status, 'pending', '图库条目没有字节，必须保持待确认');
    assert.equal(identity.path, '', '不允许伪造资产路径');

    const style = result.group.references.find(reference => reference.role === 'style');
    assert.equal(style.assetId, 'studio-costume-c001');

    assert.equal(result.poses.length, 1, 'pose 应变成构图约束而不是参考图');
    assert.deepEqual(result.poses[0].angles, ['front', 'diagonal']);
    assert.equal(result.group.poseConstraints.length, 1);
    assert.equal(result.group.references.some(reference => reference.role === 'pose'), false);
});

test('the converter never claims the group is ready, and says what is missing', () => {
    const result = groupFromStudio({
        templates: [portrait, costume],
        input: { theme: '白底换脸', scene: '白底影棚' },
    });
    assert.equal(result.ready, false);
    assert.match(result.missing.join('／'), /人物参考仍是待确认/);
    assert.match(result.missing.join('／'), /场景参考需单独上传/);

    // And the downstream gate agrees: no hand-off card while references are pending.
    const blocked = handoffFor(result.group);
    assert.equal(blocked.ready, false);
    assert.match(blocked.blockedReason, /参考图未就绪/);
});

test('a library entry alone can serve as style when no costume exists', () => {
    const second = { ...portrait, id: 'atlas-portrait-second', upstreamId: 'second' };
    const result = groupFromStudio({ templates: [portrait, second], input: { theme: '只有人像' } });
    assert.deepEqual(result.mapping.map(item => item.role), ['identity', 'style']);
    assert.equal(result.group.references.find(reference => reference.role === 'style').assetId, 'studio-portrait-second');
});

test('an empty library is rejected instead of producing an unusable contract', () => {
    assert.throws(() => groupFromStudio({ templates: [] }), error => error.code === 'STUDIO_TEMPLATES_REQUIRED');
    assert.throws(() => groupFromStudio({ templates: [{ id: 'x' }] }), error => error.code === 'STUDIO_TEMPLATES_REQUIRED');
});

test('studio selection is recorded on the contract for traceability', () => {
    const result = groupFromStudio({
        templates: [portrait, costume], input: { theme: '可追溯' },
        planId: 'plan-9', selectedIds: [portrait.id, costume.id],
    });
    assert.equal(result.group.studio.planId, 'plan-9');
    assert.deepEqual(result.group.studio.selectedIds, [portrait.id, costume.id]);
    assert.ok(result.group.lockedHash, '转换后仍要有锁定版本号');
});

test('a converted group has no shots yet, so attaching an image is refused', () => {
    const result = groupFromStudio({ templates: [portrait, costume], input: { theme: '回传前' } });
    assert.equal(result.group.shots.length, 0, '转换层只产出骨架，镜头要另外加');
    assert.throws(
        () => attachResult(result.group, { shotId: 'shot-01', assetId: 'abc123', path: '/api/continuity/asset/abc123' }),
        error => error.code === 'CONTINUITY_SHOT_UNKNOWN',
    );
});

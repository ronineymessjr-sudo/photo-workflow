import test from 'node:test';
import assert from 'node:assert/strict';
import { groupFromStudio } from '../api/continuity-studio-bridge.mjs';
import { handoffFor, attachResult, buildShotRequests, confirmMaster } from '../api/continuity.mjs';

const portrait = {
    id: 'atlas-portrait-f009267e478', kind: 'portrait', upstreamId: 'f009267e478',
    title: '短发 · 人像参考', rightsStatus: 'external_reference', section: 'face', angles: [],
    referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/portrait/thumbs/f009267e478.webp',
    sourceUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/face.html?lang=zh#portrait=f009267e478',
};
const costume = {
    id: 'atlas-costume-c001', kind: 'costume', upstreamId: 'c001',
    title: '衣装 c001', rightsStatus: 'external_reference', tags: ['白色', '针织'],
    referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/costume/thumbs/c001.webp',
    sourceUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/costume.html?lang=zh#costume=c001',
};
const pose = {
    id: 'atlas-pose-p001', kind: 'pose', upstreamId: 'p001',
    title: '坐姿 001', rightsStatus: 'external_reference', angles: ['front', 'diagonal'],
    referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/p001.jpg',
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
    assert.equal(identity.status, 'confirmed', '方案已选用白名单图库图，生成时会临时读取原站图片');
    assert.equal(identity.path, '', '不允许伪造资产路径');
    assert.equal(identity.referenceImageUrl, portrait.referenceImageUrl);

    const style = result.group.references.find(reference => reference.role === 'style');
    assert.equal(style.assetId, 'studio-costume-c001');
    assert.equal(style.status, 'confirmed');

    const scene = result.group.references.find(reference => reference.role === 'scene');
    assert.equal(scene.status, 'confirmed');
    assert.equal(scene.textOnly, true);

    assert.equal(result.poses.length, 1, 'pose 应变成构图约束而不是参考图');
    assert.deepEqual(result.poses[0].angles, ['front', 'diagonal']);
    assert.equal(result.group.poseConstraints.length, 1);
    assert.equal(result.group.poseConstraints[0].referenceImageUrl, pose.referenceImageUrl);
    assert.equal(result.group.references.some(reference => reference.role === 'pose'), false);
});

test('real Studio referencePlanFields shape maps sourceItemId into identity, style and pose', () => {
    const planCostume = { ...costume, tags: ['棕色', '针织', '包袋', '金饰', '缎带', 'choker'] };
    const planReferences = [portrait, planCostume, pose].map(({ id, sourceUrl, ...template }) => ({
        ...template, sourceItemId: id, externalUrl: sourceUrl,
    }));
    const wardrobe = '人物与服装硬性要求：棕色针织上衣、深色半身裙、靴子。未指定配饰不添加。';
    const result = groupFromStudio({
        templates: planReferences,
        input: { theme: '来源字段映射测试', modelDesc: '棕色针织上衣' },
        shots: [{ id: 'plan-shot-1', directorContract: {
            referenceIds: [pose.id], model_pose: '自然站姿', scene: '公园', wardrobe_styling: wardrobe,
        } }],
    });

    assert.deepEqual(result.mapping.map(item => item.role), ['identity', 'style']);
    assert.equal(result.group.references.find(reference => reference.role === 'identity').sourceItemId, portrait.id);
    assert.equal(result.group.references.find(reference => reference.role === 'style').sourceItemId, costume.id);
    assert.equal(result.group.references.find(reference => reference.role === 'style').status, 'confirmed');
    assert.equal(result.group.references.find(reference => reference.role === 'style').sourceUrl, costume.sourceUrl);
    assert.equal(result.group.locked.wardrobe, wardrobe);
    assert.doesNotMatch(result.group.locked.wardrobe, /包袋|金饰|缎带|choker/);
    assert.deepEqual(result.poses.map(item => item.templateId), [pose.id]);
    assert.equal(result.group.poseConstraints[0].templateId, pose.id);
    assert.equal(result.group.poseConstraints[0].sourceUrl, pose.sourceUrl);
    assert.equal(result.group.shots[0].poseRef.id, pose.id);
    assert.match(result.group.locked.wardrobe, /针织/);
});

test('an explicit empty pose selection stays empty for detail shots', () => {
    const result = groupFromStudio({
        templates: [portrait, costume, pose],
        shots: [{ id: 'detail-shot', directorContract: {
            shot_size: '特写', referenceIds: [], model_pose: '服装细节特写，不安排手部动作。',
        } }],
    });

    assert.equal(result.group.shots[0].poseRef, null);
    assert.equal(result.group.poseConstraints.length, 1, 'the selected library item remains traceable even when this shot does not use it');
});

test('legacy Studio shots without pose selection metadata retain their positional fallback', () => {
    const result = groupFromStudio({
        templates: [portrait, costume, pose],
        shots: [{ id: 'legacy-shot', directorContract: { shot_size: '全身', model_pose: '自然站姿' } }],
    });

    assert.equal(result.group.shots[0].poseRef.id, pose.id);
});

test('waist-up P017 plans use the bundled licensed pose-only photograph', () => {
    const result = groupFromStudio({
        templates: [portrait, costume, { ...pose, id: 'atlas-pose-full_single_p017', upstreamId: 'full_single_p017', title: '站立・回眸顾盼' }],
        shots: [{ id: 'plan-shot-waist', directorContract: { shot_size: '中景', referenceIds: ['atlas-pose-full_single_p017'] } }],
    });
    assert.equal(result.group.shots[0].poseRef.imageUrl, 'https://photo-workflow.pages.dev/assets/pose-references/pose-02.jpg');
});

test('the converter reports import blockers when a shot list is missing', () => {
    const result = groupFromStudio({
        templates: [portrait, costume],
        input: { theme: '白底换脸', scene: '白底影棚' },
    });
    assert.equal(result.ready, false);
    assert.match(result.missing.join('／'), /方案中没有镜头列表/);
    assert.match(result.missing.join('／'), /人工确认/);

    // The downstream gate keeps the absent shot list as an explicit blocker.
    const blocked = handoffFor(result.group);
    assert.equal(blocked.ready, false);
    assert.match(blocked.blockedReason, /还没有镜头/);
});

test('a real Studio plan keeps per-shot scenes and pose selections in the continuity group', () => {
    const result = groupFromStudio({
        templates: [portrait, costume, pose],
        input: { theme: '多场景秋日人像', modelDesc: '一名成年人', style: '自然纪实', mood: '静谧而有张力' },
        guidance: { style: '柔和自然光', suggestions: [{ sourceItemId: pose.id, kind: 'pose', direction: '双脚稳定站立，肩颈放松。' }] },
        planId: 'plan-2', planRevision: 7,
        selectedIds: [portrait.id, costume.id, pose.id],
        shots: [
            { id: 'plan-shot-1', title: '公园全景', shotSize: '环境全景', scene: '枫树公园', focalLength: '35mm', description: '自然行走', method: '摄影师平视', composition: '人物位于右侧', lighting: '阴天柔光', directorContract: { referenceIds: [pose.id], scene: '枫树公园', camera_angle: '平视', model_pose: '自然行走', mood: '安静克制', color_grade: '低饱和青灰', generator_prompt: '秋日公园全景，人物自然行走。' } },
            { id: 'plan-shot-2', title: '咖啡馆近景', shotSize: '近景', scene: '窗边咖啡馆', focalLength: '85mm', description: '双手自然交叠', method: '摄影师侧前方', composition: '肩部以上', lighting: '窗光侧照', directorContract: { referenceIds: [pose.id], scene: '窗边咖啡馆', camera_angle: '侧前方', model_pose: '双手自然交叠', generator_prompt: '窗边咖啡馆近景，面部清晰。' } },
        ],
    });

    assert.equal(result.ready, false, '导入后必须先由摄影师确认人物参考');
    assert.equal(result.group.studio.planId, 'plan-2');
    assert.equal(result.group.studio.planRevision, 7);
    assert.deepEqual(result.group.locked.mustKeep, ['同一人物', '同一服装', '同一调色', '每镜头按方案指定场景']);
    assert.equal(result.group.locked.location, '多场景方案；每镜头按方案标注场景执行');
    assert.equal(result.group.shots.length, 2);
    assert.equal(result.group.shots[0].shotId, 'plan-shot-1');
    assert.equal(result.group.shots[0].scene, '枫树公园');
    assert.equal(result.group.locked.mood, '静谧而有张力');
    assert.equal(result.group.shots[0].mood, '安静克制');
    assert.equal(result.group.shots[0].colorGrade, '低饱和青灰');
    assert.equal(result.group.shots[0].lighting, '阴天柔光');
    assert.equal(result.group.shots[1].scene, '窗边咖啡馆');
    assert.equal(result.group.shots[0].poseRef.id, pose.id);
    assert.equal(result.group.shots[0].poseRef.direction, '双脚稳定站立，肩颈放松。');

    const ready = confirmMaster(result.group, { assetId: result.group.references.find(reference => reference.role === 'identity').assetId });
    assert.equal(ready.master.confirmedBy, 'human');
    const requests = buildShotRequests(ready, { providerId: 'cloudflare-flux-klein' });
    assert.deepEqual(requests.map(request => request.variant.scene), ['枫树公园', '窗边咖啡馆']);

    const handoff = handoffFor(ready, { shotId: 'plan-shot-1' });
    assert.equal(handoff.ready, true, '图库人脸/衣装引用加方案文字场景应能用于人工出图');
    assert.deepEqual(handoff.cards[0].referenceImages, [
        { role: 'identity', url: portrait.referenceImageUrl },
        { role: 'style', url: costume.referenceImageUrl },
    ]);
    assert.match(handoff.cards[0].instruction, /2 张图片参考图/);
    assert.match(handoff.cards[0].instruction, /姿势按 PoseAtlas 条目文字指导/);
    assert.doesNotMatch(handoff.cards[0].instruction, /所选摆姿参考图/);
    assert.match(handoff.cards[0].instruction, /场景按方案文字/);
});

test('handoff does not treat an untrusted external URL as a ready library reference', () => {
    const result = groupFromStudio({
        templates: [portrait, costume],
        input: { theme: '拒绝不可信引用' },
        shots: [{ shotId: 'shot-01', generator_prompt: 'portrait' }],
    });
    const group = result.group;
    group.references = group.references.map(reference => reference.role === 'identity'
        ? { ...reference, referenceImageUrl: 'https://evil.example/image.webp' }
        : reference);
    const handoff = handoffFor(group, { shotId: 'shot-01' });
    assert.equal(handoff.ready, false);
    assert.equal(handoff.cards[0].referenceImages.some(reference => reference.role === 'identity'), false);
});

test('a portrait is never reused as a costume reference', () => {
    const second = { ...portrait, id: 'atlas-portrait-second', upstreamId: 'second' };
    const result = groupFromStudio({ templates: [portrait, second], input: { theme: '只有人像' } });
    assert.deepEqual(result.mapping.map(item => item.role), ['identity']);
    assert.equal(result.group.references.find(reference => reference.role === 'style').status, 'pending');
    assert.match(result.missing.join('／'), /缺少衣装参考/);
});

test('an empty library is rejected instead of producing an unusable contract', () => {
    assert.throws(() => groupFromStudio({ templates: [] }), error => error.code === 'STUDIO_TEMPLATES_REQUIRED');
    assert.throws(() => groupFromStudio({ templates: [{ id: 'x' }] }), error => error.code === 'STUDIO_TEMPLATES_REQUIRED');
});

test('the bridge rejects non-PoseAtlas image URLs without proxying them', () => {
    const result = groupFromStudio({
        templates: [{ ...portrait, referenceImageUrl: 'https://evil.example/private.jpg' }, costume, pose],
        input: { theme: '拒绝外部代理' },
        shots: [{ shotId: 'shot-01', generator_prompt: 'portrait' }],
    });
    const identity = result.group.references.find(reference => reference.role === 'identity');
    assert.equal(identity.status, 'pending');
    assert.equal(identity.referenceImageUrl, '');
    assert.match(result.missing.join('／'), /人脸参考图片暂不可读取/);
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

test('a pose with a 45-degree turn selects a diagonal PoseAtlas angle instead of front', () => {
    const result = groupFromStudio({
        templates: [portrait, costume, pose],
        input: { theme: '回眸角度映射' },
        shots: [{
            id: 'shot-over-shoulder',
            directorContract: {
                referenceIds: [pose.id],
                model_pose: '上身转离镜头约四十五度，再回头看向镜头附近。',
            },
        }, {
            id: 'shot-neutral',
            directorContract: { referenceIds: [pose.id], model_pose: '肩颈放松的自然站姿。' },
        }],
    });

    assert.equal(result.group.shots[0].poseRef.angle, 'diagonal');
    assert.match(result.group.shots[0].poseRef.direction, /身体斜侧转离镜头约45度/);
    assert.match(result.group.shots[0].poseRef.direction, /肩线不正对镜头/);
    assert.equal(result.group.shots[1].poseRef.angle, 'front', 'shots without a directional cue preserve the library default');
    assert.equal(result.group.shots[1].poseRef.direction, '', 'neutral shots keep the selected library suggestion');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createDirectorPlan, createTemplatePlan } from '../api/director-plan.mjs';
import { prepareReferenceContext } from '../api/ai-studio/reference-brief.mjs';
import { prepareCloudCandidateReferences, compileCloudCandidateRequest } from '../api/director-cloud-generation.mjs';
import { searchStudio, createStudioProposal, confirmStudioProposal } from '../api/ai-studio/service.mjs';
import { classifyPose } from '../api/ai-studio/pose-suitability.mjs';

function sourceFixture() {
    const calls = [];
    const fetchImpl = async url => {
        calls.push(String(url));
        if (String(url).endsWith('poses.json')) return Response.json({ poses: [
            { id: 'full_single_P019', no: 'P019', category: '站姿', names: { zh: '站立・双臂上举伸展', en: 'Standing, arms reaching overhead' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P019_front.jpg' }, { angle: 'side' }] },
            { id: 'full_single_P015', no: 'P015', category: '站姿', names: { zh: '站立・对立式平衡・手扶腰', en: 'Standing contrapposto, hand on hip' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P015_front.jpg' }] },
            { id: 'full_single_P016', no: 'P016', category: '站姿', names: { zh: '站立・双手撩发' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P016_front.jpg' }] },
            { id: 'full_single_P017', no: 'P017', category: '站姿', names: { zh: '站立・回眸顾盼' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P017_front.jpg' }] },
            { id: 'full_single_P018', no: 'P018', category: '站姿', names: { zh: '站立・双手扶腰' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P018_front.jpg' }] },
            { id: 'full_single_P021', no: 'P021', category: '站姿', names: { zh: '站立・一手抚颈一手扶腿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P021_front.jpg' }] },
            { id: 'full_single_P022', no: 'P022', category: '站姿', names: { zh: '站立・双臂后展挺胸' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P022_front.jpg' }] },
            { id: 'full_single_P024', no: 'P024', category: '站姿', names: { zh: '站立・单腿后抬' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P024_front.jpg' }] },
            { id: 'full_single_P025', no: 'P025', category: '站姿', names: { zh: '站立・分腿双手扶腰' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P025_front.jpg' }] },
            { id: 'full_single_P026', no: 'P026', category: '站姿', names: { zh: '站立・单臂上举顶胯' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P026_front.jpg' }] },
            { id: 'full_single_P005', no: 'P005', category: '坐姿', names: { zh: '单膝立起・手抚发', en: 'One knee up, hand in hair' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P005_front.jpg' }] },
            { id: 'full_single_P009', no: 'P009', category: '坐姿', names: { zh: '向右倾・肘部支撑', en: 'Tilted right, elbow support' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P009_front.jpg' }] },
            { id: 'full_single_P010', no: 'P010', category: '坐姿', names: { zh: '手抚脚踝', en: 'Hand to ankle' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P010_front.jpg' }] },
            { id: 'full_single_P041', no: 'P041', category: '坐姿', names: { zh: '女孩坐・双手扶腿', en: 'W-sit, hands on thighs' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P041_front.jpg' }] },
            { id: 'full_single_P061', no: 'P061', category: '蹲姿', names: { zh: '蹲姿・手扶膝' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P061_front.jpg' }] },
            { id: 'pair60_P003', no: 'P003', series: 'pair60', category: '正常位（传教士）', names: { zh: '抬起脚踝・V字打开' }, variants: [{ angle: 'front', thumb: 'thumbs/pair60_P003_front.jpg' }] },
        ] });
        if (String(url).endsWith('costumes.json')) return Response.json({ costumes: [
            { id: 'AUT-0001', thumb: 'costume/thumbs/AUT-0001.webp', cat: 'autumn', group: 'accessory', color: 'brown', main: 'ribbon', tags: ['brown', 'knit', 'dress'] },
            { id: 'AUT-0006', thumb: 'costume/thumbs/AUT-0006.webp', cat: 'autumn', group: 'top', color: 'brown', main: 'knit', tags: ['brown', 'knit', 'black', 'pants'] },
            { id: 'AUT-0162', thumb: 'costume/thumbs/AUT-0162.webp', cat: 'autumn', group: 'inner', color: 'white', main: 'bra', tags: ['white', 'bra', 'black', 'bag'] },
            { id: 'AUT-0118', thumb: 'costume/thumbs/AUT-0118.webp', cat: 'autumn', group: 'top', color: 'ivory', main: 'knit', tags: ['ivory', 'knit', 'khaki', 'skirt', 'brown', 'boots', 'bag', 'gold', 'necklace'] },
        ] });
        if (String(url).endsWith('faces.json')) return Response.json({ images: [
            { id: 'teststyle', thumb: 'portrait/thumbs/teststyle.webp', sec: 'face', hair: 'semilong', style: '测试造型' },
            { id: 'shortface', thumb: 'portrait/thumbs/shortface.webp', sec: 'face', hair: 'short', style: '短发人脸参考' },
            { id: 'shortstyle', thumb: 'portrait/thumbs/shortstyle.webp', sec: 'styling', hair: 'short', style: '短发妆发造型' },
        ] });
        throw new Error('UNEXPECTED_FETCH');
    };
    return { calls, fetchImpl };
}

function ordinaryReferenceInput(overrides = {}) {
    return {
        theme: '秋日公园人像', style: '电影感',
        modelDesc: '成年模特，短发妆发',
        scene: '公园小径；湖边木栈道；木亭长椅', mood: '安静克制', people: '1',
        extra: '全组固定35mm焦段', useReferenceLibrary: true,
        ...overrides,
    };
}

test('automatic references choose varied natural poses and match the requested outfit', async () => {
    const source = sourceFixture();
    const input = {
        theme: '秋日公园人像', style: '自然、克制、电影感',
        modelDesc: '成年女性模特，米白色针织上衣、卡其色半身裙、棕色短靴；自然妆发',
        scene: '公园竹林小径；湖边木栈道；木亭长椅', mood: '安静松弛', duration: '2小时', people: '1',
        extra: '自然轻松，双脚着地；禁止跪姿、躺姿、趴姿、双手举过头；不出现额外道具、同行人物，不拍无人物环境镜头；全组固定35mm',
        useReferenceLibrary: true,
    };
    const context = await prepareReferenceContext({ ...input, requireImageReferences: true }, { fetchImpl: source.fetchImpl });
    const poses = context.templates.filter(template => template.kind === 'pose');
    assert.ok(poses.length >= 3);
    assert.ok(new Set(poses.map(template => template.id)).size >= 3);
    assert.equal(poses.some(template => /跪|后仰|躺|趴|举过头|上举|抱头/.test(template.title)), false);
    assert.equal(poses.some(template => template.upstreamId === 'full_single_P016'), false);
    assert.ok(poses.some(template => template.upstreamId === 'full_single_P021'));
    assert.equal(new Set(poses.map(template => classifyPose(template).poseFamily)).size, poses.length);
    assert.equal(context.templates.find(template => template.kind === 'costume')?.upstreamId, 'AUT-0118');
    assert.equal(context.templates.find(template => template.kind === 'portrait')?.section, 'face');

    const plan = createTemplatePlan(input, context);
    assert.deepEqual([...new Set(plan.shotList.map(shot => shot.scene))], ['公园竹林小径', '湖边木栈道', '木亭长椅']);
    const clothingDetail = plan.shotList.find(shot => shot.title === '人物与服装细节');
    assert.deepEqual(clothingDetail.directorContract.referenceIds, []);
    assert.equal(clothingDetail.directorContract.shot_language, '人物与服装细节');
    assert.match(clothingDetail.directorContract.model_pose, /模特自然穿着服装库 AUT-0118 的象牙白针织上衣/);
    assert.match(clothingDetail.directorContract.crop_boundary, /肩部与上躯干/);
    assert.match(clothingDetail.directorContract.crop_boundary, /面部可在画外/);
    assert.match(clothingDetail.directorContract.generator_prompt, /ivory knit top worn naturally by the model/i);
    assert.match(clothingDetail.directorContract.wardrobe_styling, /AUT-0118.*象牙白针织上衣/);
    assert.doesNotMatch(clothingDetail.directorContract.wardrobe_styling, /卡其色半身裙|棕色短靴/);
    assert.equal(plan.input.modelDesc, input.modelDesc);
    assert.ok(plan.shotList.filter(shot => shot !== clothingDetail).every(shot => /米白色针织上衣、卡其色半身裙、棕色短靴/.test(shot.wardrobe)));
    assert.ok(plan.shotList.filter(shot => shot !== clothingDetail).every(shot => /用户文字是单品、颜色、裙长、鞋型和层次的唯一硬约束/.test(shot.wardrobe)));
    assert.ok(plan.shotList.filter(shot => shot !== clothingDetail).every(shot => /不复制未指定的包袋、首饰、帽子/.test(shot.wardrobe)));
    assert.ok(plan.shotList.every(shot => /不额外添加道具/.test(shot.directorContract.shot_props)));
    assert.ok(plan.shotList.every(shot => shot.angle !== '肩后' && !/肩后情境/.test(shot.title)));
    assert.doesNotMatch(plan.shotList.map(shot => `${shot.title} ${shot.description} ${shot.props}`).join('\n'), /同行人物|橱窗|推门|拿取饮品|无人物环境/);

    const foreground = plan.shotList[3];
    assert.equal(foreground.title, '前景层次人像');
    assert.match(foreground.directorContract.model_position, /画面边缘.*柔焦竹叶/);
    assert.match(foreground.directorContract.model_position, /不遮挡面部或眼睛/);
    assert.match(foreground.directorContract.must_show, /画面边缘.*柔焦竹叶.*不遮挡面部或眼睛/);
    assert.match(foreground.directorContract.must_show, /不增加任何道具/);
    assert.match(foreground.directorContract.reject_if, /foreground covering the face or eyes/);
    assert.match(foreground.directorContract.shot_props, /不额外添加道具/);

    const compositionChange = plan.shotList[6];
    assert.equal(compositionChange.title, '侧向构图人像');
    assert.equal(compositionChange.angle, '平视');
    assert.equal(compositionChange.directorContract.camera_angle, '平视');
    assert.match(compositionChange.directorContract.generator_prompt, /35mm, 平视/);
});

test('template plan aligns selected poses, close crops, and backlight instructions with each shot', async () => {
    const source = sourceFixture();
    const input = {
        theme: '秋日公园人像', style: '自然、克制、电影感',
        modelDesc: '成年女性模特，米白色针织上衣、卡其色半身裙、棕色短靴；自然妆发',
        scene: '公园竹林小径；湖边木栈道；木亭长椅', mood: '安静松弛', duration: '2小时', people: '1',
        extra: '自然轻松，双脚着地；禁止跪姿、躺姿、趴姿、双手举过头；不出现额外道具、同行人物，不拍无人物环境镜头；全组固定35mm',
        useReferenceLibrary: true,
        referenceIds: ['atlas-pose-full_single_p017'],
    };
    const context = await prepareReferenceContext({ ...input, requireImageReferences: true }, { fetchImpl: source.fetchImpl });
    assert.ok(context.templates.some(template => template.id === 'atlas-pose-full_single_p017'), JSON.stringify(context.templates.filter(template => template.kind === 'pose').map(template => template.id)));
    const plan = createTemplatePlan(input, context);
    assert.equal(plan.shotList.length, 12);
    assert.equal(plan.shotList.filter(shot => shot.directorContract.referenceIds.length).length, 11);
    for (const scene of [...new Set(plan.shotList.map(shot => shot.scene))]) {
        const sceneShots = plan.shotList.filter(shot => shot.scene === scene);
        const poseBearingShots = sceneShots.filter(shot => shot.directorContract.referenceIds.length);
        const scenePoseIds = [...new Set(poseBearingShots.map(shot => shot.directorContract.referenceIds[0]))];
        assert.equal(sceneShots.length, 4, `${scene}: expected four shots to preserve the scene coverage`);
        assert.equal(poseBearingShots.length, sceneShots.some(shot => shot.title === '人物与服装细节') ? 3 : 4);
        assert.equal(scenePoseIds.length, poseBearingShots.length, `${scene}: ${sceneShots.map(shot => `${shot.title}=${shot.directorContract.referenceIds.join(',') || 'no pose'}`).join('; ')}`);
    }

    const clothingDetail = plan.shotList.find(shot => shot.title === '人物与服装细节');
    assert.equal(clothingDetail.shotSize, '特写');
    assert.match(clothingDetail.directorContract.generator_prompt, /ivory knit top worn naturally by the model/i);
    assert.match(clothingDetail.directorContract.crop_boundary, /模特穿着的象牙白针织上衣肩部与上躯干/);
    assert.match(clothingDetail.directorContract.model_pose, /保留真人穿着轮廓/);
    assert.deepEqual(clothingDetail.directorContract.referenceIds, []);
    assert.equal(clothingDetail.directorContract.shot_language, '人物与服装细节');
    assert.doesNotMatch(clothingDetail.description, /双脚|站稳|前后错开|腿/);

    const lookBack = plan.shotList.find(shot => shot.title === '单人回眸构图');
    assert.equal(lookBack.directorContract.referenceIds[0], 'atlas-pose-full_single_p017');
    assert.match(lookBack.description, /回头/);
    assert.doesNotMatch(lookBack.description, /双手轻放腰侧/);

    const croppedNeckPose = plan.shotList.find(shot => shot.directorContract.referenceIds[0] === 'atlas-pose-full_single_p021'
        && ['中景', '近景', '特写', '局部特写'].includes(shot.shotSize));
    assert.ok(croppedNeckPose);
    assert.match(croppedNeckPose.description, /单手轻触颈侧（上半身裁切适配）/);
    assert.doesNotMatch(croppedNeckPose.description, /扶腿|腿部动作/);

    const rimLight = plan.shotList.find(shot => shot.title === '轮廓光人像');
    assert.match(rimLight.angle, /逆光/);
    assert.match(rimLight.lighting, /人物背后.*勾勒.*轮廓/);
    assert.doesNotMatch(rimLight.lighting, /开阔阴影/);
    assert.ok(plan.shotList.every(shot => !/机位机位/.test(shot.method)));
});

test('reference selection rejects a pose that directly violates a user ban', async () => {
    const source = sourceFixture();
    const naturalLighting = await prepareReferenceContext({
        theme: '秋日公园人像', scene: '自然光下的公园长椅', useReferenceLibrary: true,
        referenceIds: ['atlas-pose-full_single_p019'],
    }, { fetchImpl: source.fetchImpl });
    assert.ok(naturalLighting.templates.some(template => template.upstreamId === 'full_single_P019'));
    await assert.rejects(prepareReferenceContext({
        theme: '人像拍摄', extra: '禁止双手举过头', useReferenceLibrary: true,
        referenceIds: ['atlas-pose-full_single_p019'],
    }, { fetchImpl: source.fetchImpl }), /POSE_REFERENCE_CONFLICTS_WITH_USER_CONSTRAINTS/);
    await assert.rejects(prepareReferenceContext({
        theme: '人像拍摄', extra: '自然轻松；禁止双手举过头', useReferenceLibrary: true,
        referenceIds: ['atlas-pose-full_single_p016'],
    }, { fetchImpl: source.fetchImpl }), /POSE_REFERENCE_CONFLICTS_WITH_USER_CONSTRAINTS/);
    await assert.rejects(prepareReferenceContext({
        theme: '人像拍摄', extra: '双脚着地', useReferenceLibrary: true,
        referenceIds: ['atlas-pose-full_single_p024'],
    }, { fetchImpl: source.fetchImpl }), /POSE_REFERENCE_CONFLICTS_WITH_USER_CONSTRAINTS/);
});

test('ordinary portrait reference selection rejects excluded poses and labels explicit review and duo poses', async () => {
    const source = sourceFixture();
    await assert.rejects(prepareReferenceContext({
        theme: '城市街头人像', people: '1', useReferenceLibrary: true,
        referenceIds: ['atlas-pose-full_single_p024'],
    }, { fetchImpl: source.fetchImpl }), /POSE_REFERENCE_CONFLICTS_WITH_USER_CONSTRAINTS/);
    await assert.rejects(prepareReferenceContext({
        theme: '单人街头人像', people: '1', useReferenceLibrary: true,
        referenceIds: ['atlas-pose-pair60_p003'],
    }, { fetchImpl: source.fetchImpl }), /POSE_REFERENCE_CONFLICTS_WITH_USER_CONSTRAINTS/);

    const reviewed = await prepareReferenceContext(ordinaryReferenceInput({ referenceIds: ['atlas-pose-full_single_p016'] }), { fetchImpl: source.fetchImpl });
    const reviewedPose = reviewed.templates.find(template => template.upstreamId === 'full_single_P016');
    assert.equal(reviewedPose.poseSuitability, 'review');
    assert.match(reviewed.guidance.brief, /需人工复核/);
    assert.match(reviewed.guidance.brief, /摄影师/);

    const separatePoseFamilies = await prepareReferenceContext(ordinaryReferenceInput({
        referenceIds: ['atlas-pose-full_single_p018', 'atlas-pose-full_single_p025'],
    }), { fetchImpl: source.fetchImpl });
    const selectedPoseFamilies = separatePoseFamilies.templates.filter(template => template.kind === 'pose');
    assert.ok(selectedPoseFamilies.some(template => template.upstreamId === 'full_single_P018'));
    assert.ok(selectedPoseFamilies.some(template => template.upstreamId === 'full_single_P025'));
    assert.equal(new Set(selectedPoseFamilies.map(template => classifyPose(template).poseFamily)).size, selectedPoseFamilies.length);

    const selectedPairOnly = async url => {
        const response = await source.fetchImpl(url);
        if (!String(url).endsWith('poses.json')) return response;
        const { poses } = await response.json();
        return Response.json({ poses: poses.filter(pose => ['full_single_P022', 'full_single_P025'].includes(pose.id)) });
    };
    const automaticNewPoses = await prepareReferenceContext(ordinaryReferenceInput(), { fetchImpl: selectedPairOnly });
    const automaticNewPoseRows = automaticNewPoses.templates.filter(template => template.kind === 'pose');
    assert.deepEqual(automaticNewPoseRows.map(template => template.upstreamId).sort(), ['full_single_P022', 'full_single_P025']);
    assert.ok(automaticNewPoseRows.every(template => template.poseSuitability === 'safe'));
    assert.equal(new Set(automaticNewPoseRows.map(template => classifyPose(template).poseFamily)).size, automaticNewPoseRows.length);

    await assert.rejects(prepareReferenceContext(ordinaryReferenceInput({
        theme: '人像写真', people: '双人', referenceIds: ['atlas-pose-pair60_p003', 'atlas-costume-aut-0118', 'atlas-portrait-shortface'],
    }), { fetchImpl: source.fetchImpl }), /POSE_REFERENCE_CONFLICTS_WITH_USER_CONSTRAINTS/);
});

test('ordinary portrait automatic references always filter excluded poses, even without natural wording', async () => {
    const source = sourceFixture();
    const context = await prepareReferenceContext(ordinaryReferenceInput(), { fetchImpl: source.fetchImpl });
    assert.equal(context.templates.some(template => template.upstreamId === 'full_single_P024'), false);
    assert.equal(context.templates.some(template => template.upstreamId === 'pair60_P003'), false);
    assert.ok(context.templates.filter(template => template.kind === 'pose').every(template => template.poseSuitability === 'safe'));
});

test('template plan and candidate compilation retain retrieved pose, processing and user clothing', async () => {
    const source = sourceFixture();
    const input = { theme: '秋日人像', scene: '公园长椅；咖啡馆窗边', modelDesc: '棕色针织上衣、黑色长裤', extra: '35mm固定焦段。双脚着地，不交叉双腿', useReferenceLibrary: true, referenceIds: ['atlas-pose-full_single_p018', 'atlas-pose-full_single_p015', 'atlas-pose-full_single_p017', 'atlas-pose-full_single_p021'] };
    const context = await prepareReferenceContext({ ...input, requireImageReferences: true }, { fetchImpl: source.fetchImpl });
    const plan = createTemplatePlan(input, context);
    const planPoses = plan.aiStudio.references.filter(reference => reference.kind === 'pose');
    assert.equal(new Set(planPoses.map(reference => reference.poseFamily)).size, planPoses.length);
    const request = { provider: 'cloudflare', model: '@cf/black-forest-labs/flux-1-schnell', candidate_count: 1,
        billing_mode: 'free-credit-first', brief: plan.shotList[0].description, reference_brief: input,
        reference_ids: plan.aiStudio.references.map(reference => reference.sourceItemId), shot_contract: plan.shotList[0].directorContract };
    const resolved = await prepareCloudCandidateReferences(request, { fetchImpl: source.fetchImpl });
    assert.deepEqual(resolved.templates.map(template => template.kind), ['pose', 'costume', 'portrait']);
    assert.equal(resolved.templates[0].upstreamId, 'full_single_P018');
    assert.equal(resolved.templates[2].section, 'face');
    const compiled = compileCloudCandidateRequest(request, resolved);
    assert.equal(plan.director.source, 'template-library-plan');
    assert.match(compiled.prompt, /atlas-pose-full_single_p018/);
    assert.doesNotMatch(compiled.prompt, /atlas-pose-full_single_p015|atlas-pose-full_single_p017|atlas-pose-full_single_p021/);
    assert.match(compiled.prompt, /双手轻放腰侧/);
    assert.match(compiled.prompt, /双脚稳定着地/);
    assert.match(compiled.prompt, /黑色长裤/);
    assert.match(compiled.prompt, /不交叉双腿/);
    assert.match(compiled.prompt, /feet parallel and hip-width apart/);
    assert.match(compiled.prompt, /head-to-toe/);
    assert.equal(plan.shotList[0].scene, '公园长椅');
    assert.doesNotMatch(plan.shotList[0].description, /人物停留三秒后自然移动/);
    assert.doesNotMatch(plan.shotList[0].directorContract.generator_prompt, /人物停留三秒后自然移动/);
    assert.match(plan.shotList[0].directorContract.generator_prompt, /双脚与髋同宽站稳/);
    assert.ok(plan.sections[0].c.includes('拍摄场景：公园长椅'));
    assert.ok(plan.sections[0].c.some(line => line.startsWith('摄影师机位：')));
    assert.ok(plan.sections[0].c.some(line => line.startsWith('光线安排：')));
    assert.match(plan.shotList[1].directorContract.model_pose, /手轻搭髋部/);
    assert.equal(plan.shotList[2].scene, '公园长椅');
    assert.equal(plan.shotList[5].scene, '公园长椅');
    assert.equal(plan.shotList[6].scene, '咖啡馆窗边');
    assert.equal(plan.shotList[4].scene, '公园长椅');
    assert.match(plan.shotList[2].directorContract.generator_prompt, /Medium-full portrait\. Crop above the knees/);
    assert.doesNotMatch(plan.shotList[2].directorContract.generator_prompt, /head-to-toe|both shoes/);
    assert.match(plan.shotList[3].directorContract.generator_prompt, /Waist-up portrait from the top of the head to the natural waistline/);
    assert.match(plan.shotList[3].directorContract.generator_prompt, /Crop: 画面从头顶至自然腰线，下缘切在腰线/);
    assert.doesNotMatch(plan.shotList[3].directorContract.generator_prompt, /Crop below the waist/);
    assert.match(plan.shotList[4].directorContract.generator_prompt, /Head-and-shoulders portrait/);
    assert.equal(plan.shotList[2].directorContract.model_position, plan.shotList[2].composition);
    assert.equal(plan.shotList[2].directorContract.photographer_position, plan.shotList[2].method);
    assert.equal(plan.shotList[2].directorContract.lighting_setup, plan.shotList[2].lighting);
    assert.match(plan.shotList[2].directorContract.wardrobe_styling, /服装库图片/);
    assert.equal(plan.shotList[4].directorContract.referenceIds[0], plan.shotList[0].directorContract.referenceIds[0]);
    assert.equal(plan.shotList.every(shot => shot.focalLength === '35mm' && shot.directorContract.lens === '35mm'), true);
    assert.equal(plan.shotList[0].directorContract.referenceIds[0], 'atlas-pose-full_single_p018');
    assert.equal(plan.shotList[1].directorContract.referenceIds[0], 'atlas-pose-full_single_p015');
    assert.equal(plan.shotList[2].directorContract.referenceIds[0], 'atlas-pose-full_single_p017');
    assert.equal(plan.shotList[3].directorContract.referenceIds[0], 'atlas-pose-full_single_p021');
    assert.equal(plan.aiStudio.references.filter(reference => reference.kind === 'costume').length, 1);
    assert.equal(plan.aiStudio.references.filter(reference => reference.kind === 'portrait').length, 1);
    assert.ok(['brown', 'knit'].every(tag => plan.aiStudio.references.find(reference => reference.kind === 'costume').tags.includes(tag)));
    const secondShotRequest = { ...request, brief: plan.shotList[1].description, shot_contract: plan.shotList[1].directorContract };
    const secondShotReferences = await prepareCloudCandidateReferences(secondShotRequest, { fetchImpl: source.fetchImpl });
    assert.equal(secondShotReferences.templates.find(template => template.kind === 'pose').id, 'atlas-pose-full_single_p015');
    assert.equal(resolved.templates.find(template => template.kind === 'costume').id, secondShotReferences.templates.find(template => template.kind === 'costume').id);
    assert.equal(resolved.templates.find(template => template.kind === 'portrait').id, secondShotReferences.templates.find(template => template.kind === 'portrait').id);
    assert.ok(compiled.prompt.length <= 2048);
    await assert.rejects(prepareCloudCandidateReferences({ ...request, shot_contract: { ...request.shot_contract, referenceIds: ['atlas-pose-forged'] } }, { fetchImpl: source.fetchImpl }), /INVALID_REFERENCE_SELECTION|UNAVAILABLE_REFERENCE/);
    await assert.rejects(prepareCloudCandidateReferences(request, { fetchImpl: async () => { throw new Error('offline'); } }), /UNAVAILABLE_REFERENCE|REFERENCE_LIBRARY_UNAVAILABLE/);
});

test('waist-up plan uses at most one hands-at-waist variant while retaining P025 for full-body shots', async () => {
    const source = sourceFixture();
    const input = ordinaryReferenceInput({
        scene: '公园小径；湖边木栈道',
        referenceIds: ['atlas-pose-full_single_p018', 'atlas-pose-full_single_p025', 'atlas-pose-full_single_p015', 'atlas-pose-full_single_p017'],
    });
    const context = await prepareReferenceContext(input, { fetchImpl: source.fetchImpl });
    const selected = context.templates.filter(template => template.kind === 'pose');
    assert.ok(selected.some(template => template.upstreamId === 'full_single_P018'));
    assert.ok(selected.some(template => template.upstreamId === 'full_single_P025'));
    assert.equal(new Set(selected.map(template => classifyPose(template).poseFamily)).size, selected.length);

    const plan = createTemplatePlan(input, context);
    const waistUpHandsAtWaist = plan.shotList.filter(shot =>
        ['中景', '近景', '特写', '局部特写'].includes(shot.shotSize)
        && ['atlas-pose-full_single_p018', 'atlas-pose-full_single_p025'].includes(shot.directorContract.referenceIds[0]));
    assert.equal(waistUpHandsAtWaist.length, 1);
    assert.equal(waistUpHandsAtWaist[0].directorContract.referenceIds[0], 'atlas-pose-full_single_p018');
    assert.ok(plan.shotList.some(shot => shot.shotSize === '全身'
        && shot.directorContract.referenceIds[0] === 'atlas-pose-full_single_p025'));
});

test('normal Director entry compiles selected live references into style and executable shot guidance', async () => {
    const source = sourceFixture();
    let submitted;
    const plan = await createDirectorPlan({
        theme: '秋日人像', style: '电影感', scene: '公园', duration: '1小时', people: '1',
        useReferenceLibrary: true, referenceIds: ['atlas-pose-full_single_p019', 'atlas-costume-aut-0006'],
    }, { baseUrl: 'https://director.test', referenceFetchImpl: source.fetchImpl, fetchImpl: async (_url, init) => {
        submitted = JSON.parse(init.body);
        return Response.json({ shot_plans: [{ shot_language: '坐姿呼吸', model_pose: '坐稳后放松肩膀', lens: '50mm', shot_size: 'FS', camera_angle: 'eye_level' }] });
    } });
    assert.equal(source.calls.length, 3);
    assert.match(submitted.brief, /atlas-pose-full_single_p019/);
    assert.match(submitted.brief, /双脚站稳/);
    assert.match(submitted.brief, /电影感/);
    assert.doesNotMatch(submitted.brief, /never-download/);
    assert.equal(plan.aiStudio.references[0].poseNumber, 'P019');
    assert.equal(plan.aiStudio.references[0].rightsStatus, 'external_reference');
    assert.match(plan.aiStudio.references[0].externalUrl, /#pose=full_single_P019/);
    assert.equal(plan.shotList[0].description, '坐稳后放松肩膀');
});

test('normal entry rejects fabricated reference IDs before invoking the model', async () => {
    const source = sourceFixture();
    let modelCalls = 0;
    await assert.rejects(createDirectorPlan({ theme: '人像', referenceIds: ['atlas-pose-forged'] }, {
        baseUrl: 'https://director.test', referenceFetchImpl: source.fetchImpl,
        fetchImpl: async () => { modelCalls++; throw new Error('unexpected'); },
    }), /UNAVAILABLE_REFERENCE/);
    assert.equal(modelCalls, 0);
});

test('existing callers without the reference option keep their single Director request', async () => {
    let calls = 0;
    const plan = await createDirectorPlan({ theme: '自然人像' }, { baseUrl: 'https://director.test',
        referenceFetchImpl: async () => { throw new Error('unexpected source call'); },
        fetchImpl: async () => { calls++; return Response.json({ shot_plans: [{ shot_language: '环境镜头' }] }); },
    });
    assert.equal(calls, 1);
    assert.equal(plan.aiStudio, undefined);
});

test('real source IDs survive signed search, explicit proposal, and confirmation without claiming ownership', async () => {
    const source = sourceFixture();
    const env = { JWT_SECRET: 'test-signing-secret-at-least-32-characters' };
    const search = await searchStudio({ prompt: '自然站姿、秋日棕色针织、中长发', planId: 'plan-1', expectedRevision: 1, uid: 'user-1', env, fetchImpl: source.fetchImpl });
    assert.equal(search.modelCalls, 0);
    assert.equal(search.library.count, 23);
    const id = 'atlas-pose-full_single_p021';
    assert.ok(search.selectedIds.includes(id));
    const proposal = await createStudioProposal({ searchReceipt: search.searchReceipt, selectedIds: [id], uid: 'user-1', env, fetchImpl: source.fetchImpl });
    const commit = await confirmStudioProposal({ proposalToken: proposal.proposalToken, idempotencyKey: 'test-confirm-0001', uid: 'user-1', env });
    assert.equal(commit.references[0].licenseStatus, 'external-reference');
    assert.equal(commit.references[0].poseNumber, 'P021');
    assert.match(commit.guidance.brief, /双脚稳定着地/);
    assert.equal(commit.conversation.length, 2);
    assert.equal(source.calls.length, 3);
});

test('natural multi-pose search balances four distinct pose families with one clothing and one face reference', async () => {
    const source = sourceFixture();
    const result = await searchStudio({ prompt: '自然普通站姿、缓步行走、轻松坐姿、轻靠栏杆；短发妆发参考；棕色针织裙、黑色连裤袜、棕色短靴；避免后仰、跪姿、趴地', uid: 'user-1', env: { JWT_SECRET: 'test-signing-secret-at-least-32-characters' }, fetchImpl: source.fetchImpl });
    const poses = result.selectedTemplates.filter(template => template.kind === 'pose');
    assert.deepEqual(poses.map(template => template.upstreamId).sort(), ['full_single_P015', 'full_single_P017', 'full_single_P018', 'full_single_P021']);
    assert.equal(new Set(poses.map(template => classifyPose(template).poseFamily)).size, poses.length);
    assert.equal(result.selectedTemplates.filter(template => template.kind === 'costume').length, 1);
    assert.equal(result.selectedTemplates.find(template => template.kind === 'costume').upstreamId, 'AUT-0006');
    assert.equal(result.selectedTemplates.filter(template => template.kind === 'portrait' && template.section === 'face').length, 1);
    assert.equal(result.selectedTemplates.some(template => template.upstreamId === 'full_single_P005'), false);
    assert.equal(result.selectedTemplates.some(template => template.upstreamId === 'full_single_P009'), false);
    assert.equal(result.selectedTemplates.length, 6);
});

test('live reference search only offers image-backed whitelist poses and face-section portraits', async () => {
    const source = sourceFixture();
    const result = await searchStudio({ prompt: '站立回眸动作、秋日棕色针织、短发人脸参考；避免后仰和跪姿', uid: 'user-1', env: { JWT_SECRET: 'test-signing-secret-at-least-32-characters' }, fetchImpl: source.fetchImpl });
    const lookBack = result.selectedTemplates.find(template => template.kind === 'pose' && template.upstreamId === 'full_single_P017');
    assert.equal(lookBack.poseSuitability, 'safe');
    assert.equal(classifyPose(lookBack).poseFamily, 'standing_look_back');
    assert.ok(result.selectedTemplates.some(template => template.kind === 'costume'));
    assert.ok(result.selectedTemplates.some(template => template.kind === 'portrait' && template.section === 'face' && template.hair === 'short'));
    assert.equal(result.selectedTemplates.some(template => template.id === 'pa-pose-walk'), false);
    assert.equal(result.selectedTemplates.some(template => template.upstreamId === 'full_single_P016'), false);
    assert.equal(result.selectedTemplates.some(template => template.upstreamId === 'shortstyle'), false);
    assert.equal(result.modelCalls, 0);
});

test('the integrated planning page passes reference selection through its normal submit path', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const app = await readFile(new URL('../assets/ai-studio.js', import.meta.url), 'utf8');
    assert.match(html, /id="studioReferenceAuto" checked/);
    assert.match(html, /PhotoAtelierStudio\?\.augmentInput\(input\)/);
    assert.match(html, /PhotoAtelierStudio\?\.renderPlanReferences\(plan\)/);
    assert.match(app, /checkbox\.type = 'checkbox'/);
    assert.match(app, /外部来源参考/);
    assert.match(app, /需摄影师人工复核/);
    assert.match(app, /poseSuitability/);
    assert.doesNotMatch(app, /checkbox\.checked = true/);
    assert.match(app, /PhotoAtelierWorkspaceSync\?\.sync/);
    assert.match(app, /sourceUpdatedAt|sync\.updatedAt/);
});

test('an unavailable saved intent provider asks for clarification and keeps deterministic search usable', async () => {
    const env = { POSEATLAS_ENABLED: 'false', AI_STUDIO_QUOTA: {
        idFromName: value => value, get: () => ({ fetch: async () => Response.json({ allowed: true }) }),
    } };
    const result = await searchStudio({ prompt: '帮我找参考', uid: 'user-1', env,
        intentProviderFactory: async () => { throw new Error('private provider configuration unavailable'); },
    });
    assert.equal(result.modelCalls, 0);
    assert.equal(result.status, 'needs-clarification');
    assert.doesNotMatch(JSON.stringify(result), /private provider configuration/);
});

test('the existing save entry stamps new plan revisions and refuses stale plan replacement', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const source = html.slice(html.indexOf('async function savePlan(plan){'), html.indexOf('function delPlan(id)'));
    let plans = [{ id: 'existing', title: '保留版本', revision: 2 }];
    const context = vm.createContext({
        getPlans: () => structuredClone(plans), savePlans: value => { plans = structuredClone(value); return true; },
        window: { __PHOTOATELIER_GUEST_MODE__: true }, Date,
    });
    vm.runInContext(source, context);
    await assert.rejects(context.savePlan({ id: 'existing', title: '过期修改', revision: 1 }), /方案已有更新/);
    assert.equal(plans[0].title, '保留版本');
    await context.savePlan({ id: 'existing', title: '有效修改', revision: 2 });
    assert.equal(plans[0].revision, 3);
    await context.savePlan({ id: 'new-plan', title: '新方案' });
    assert.equal(plans[0].revision, 1);
});

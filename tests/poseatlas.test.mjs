import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPoseAtlasCatalog, normalizePoseAtlasDataset, searchPoseAtlasTemplates, POSEATLAS_DATASETS } from '../api/ai-studio/poseatlas.mjs';
import { createRegistry, validateTemplate } from '../api/ai-studio/core.mjs';
import { classifyPose, isPoseAllowed } from '../api/ai-studio/pose-suitability.mjs';

function fixtures() {
    return {
        pose: { poses: [{ id: 'full_single_P019', series: 'full_std', category: '站姿', no: 'P019', names: { zh: '站立・双臂上举伸展', en: 'Standing, arms reaching overhead' }, variants: [{ angle: 'front', full: 'img/source.png' }, { angle: 'side' }] }] },
        costume: { costumes: [{ id: 'AUT-0001', cat: 'autumn', group: 'top', color: 'brown', main: 'knit', tags: ['brown', 'knit', 'coat'], image: 'costume/img/source.webp' }] },
        portrait: { images: [{ id: 'portrait0001', sec: 'styling', hair: 'semilong', style: 'Soft layered hair', full_remote: 'https://example.test/private-image.png' }] },
    };
}

function fixtureFetcher(data = fixtures(), calls = []) {
    return async (url, options) => {
        calls.push({ url, options });
        const spec = POSEATLAS_DATASETS.find(item => item.url === url);
        assert.ok(spec, 'all fetches must use fixed official metadata URLs');
        return Response.json(data[spec.kind]);
    };
}

test('normalization preserves source identity and precise entry links without image URLs or ownership claims', () => {
    const data = fixtures();
    const templates = POSEATLAS_DATASETS.flatMap(spec => normalizePoseAtlasDataset(spec.kind, data[spec.kind]));
    assert.equal(templates.length, 3);
    assert.equal(templates[0].id, 'atlas-pose-full_single_p019');
    assert.equal(templates[0].upstreamId, 'full_single_P019');
    assert.equal(templates[0].poseNumber, 'P019');
    assert.deepEqual(templates[0].angles, ['front', 'side']);
    assert.equal(templates[0].source.url, 'https://hruiccc.github.io/RuiC-PoseAtlas/?lang=zh#pose=full_single_P019&angle=front');
    assert.match(templates[1].source.url, /costume\.html\?lang=zh#costume=AUT-0001$/);
    assert.match(templates[2].source.url, /face\.html\?lang=zh#portrait=portrait0001$/);
    assert.equal(templates[1].title, '秋季 · 上装 · 棕色 · 针织');
    assert.equal(templates[1].description, '外套');
    assert.equal(templates[2].title, '中长发 · 妆发参考');
    for (const template of templates) {
        assert.doesNotThrow(() => validateTemplate(template));
        assert.equal(template.rightsStatus, 'external_reference');
        assert.equal(template.rights.status, 'external_reference');
        assert.deepEqual(template.rights.allowedUses, ['agent-reference']);
        assert.equal(template.synthetic, true);
        assert.equal(template.assetUrl, null);
        assert.doesNotMatch(JSON.stringify(template), /img\/source|example\.test/);
    }
});

test('normalization preserves source categories while excluding malformed IDs and duplicate records', () => {
    const pose = fixtures().pose.poses[0];
    const items = normalizePoseAtlasDataset('pose', { poses: [pose, pose, { ...pose, id: '../unsafe' }, { ...pose, id: 123 }, { ...pose, id: 'adult1', series: 'full_sexy' }] });
    assert.equal(items.length, 2);
    assert.equal(items.some(item => item.series === 'full_sexy'), true);
    const costume = fixtures().costume.costumes[0];
    assert.deepEqual(normalizePoseAtlasDataset('costume', { costumes: [{ ...costume, cat: 'swim' }, { ...costume, id: 'adult2', cat: 'lingerie' }] }).map(item => item.season), ['swim', 'lingerie']);
    assert.throws(() => normalizePoseAtlasDataset('portrait', { faces: [] }), /INVALID_DATASET/);
});

test('Chinese aliases search real costume tags, hair and pose metadata', () => {
    const data = fixtures();
    const templates = POSEATLAS_DATASETS.flatMap(spec => normalizePoseAtlasDataset(spec.kind, data[spec.kind]));
    assert.equal(searchPoseAtlasTemplates(templates, { kind: 'costume', query: '秋季棕色针织' }).results[0].upstreamId, 'AUT-0001');
    assert.equal(searchPoseAtlasTemplates(templates, { kind: 'portrait', query: '中长发' }).results[0].upstreamId, 'portrait0001');
    assert.equal(searchPoseAtlasTemplates(templates, { kind: 'pose', query: '双臂上举伸展', angle: 'side' }).results[0].upstreamId, 'full_single_P019');
    assert.equal(searchPoseAtlasTemplates(templates, { kind: 'pose', query: '站姿', angle: 'high' }).total, 0);
    assert.equal(searchPoseAtlasTemplates(templates, { query: 'unknown-999999' }).total, 0);
});

test('pose suitability labels risky, review-only, sexualized and duo references without changing source rows', () => {
    const p005 = { kind: 'pose', upstreamId: 'full_single_P005', title: '单膝立起・手抚发', category: '坐姿', series: 'full_std' };
    const p009 = { kind: 'pose', upstreamId: 'full_single_P009', title: '向右倾・肘部支撑', category: '坐姿', series: 'full_std' };
    const p010 = { kind: 'pose', upstreamId: 'full_single_P010', title: '手抚脚踝', category: '坐姿', series: 'full_std' };
    const p016 = { kind: 'pose', upstreamId: 'full_single_P016', title: '站立・双手撩发', category: '站姿', series: 'full_std' };
    const p017 = { kind: 'pose', upstreamId: 'full_single_P017', title: '站立・回眸顾盼', category: '站姿', series: 'full_std' };
    const p019 = { kind: 'pose', upstreamId: 'full_single_P019', title: '站立・双臂上举伸展', category: '站姿', series: 'full_std' };
    const p024 = { kind: 'pose', upstreamId: 'full_single_P024', title: '站立・单腿后抬', category: '站姿', series: 'full_std' };
    const p026 = { kind: 'pose', upstreamId: 'full_single_P026', title: '站立・单臂上举顶胯', category: '站姿', series: 'full_std' };
    const p041 = { kind: 'pose', upstreamId: 'full_single_P041', title: '女孩坐・双手扶腿', category: '坐姿', series: 'full_std' };
    const p061 = { kind: 'pose', upstreamId: 'full_single_P061', title: '蹲姿・手扶膝', category: '蹲姿', series: 'full_std' };
    const p015 = { kind: 'pose', upstreamId: 'full_single_P015', title: '站立・对立式平衡・手扶腰', category: '站姿', series: 'full_std' };
    const p018 = { kind: 'pose', upstreamId: 'full_single_P018', title: '站立・双手扶腰', category: '站姿', series: 'full_std' };
    const p021 = { kind: 'pose', upstreamId: 'full_single_P021', title: '站立・一手抚颈一手扶腿', category: '站姿', series: 'full_std' };
    const p022 = { kind: 'pose', upstreamId: 'full_single_P022', title: '站立・双臂后展挺胸', category: '站姿', series: 'full_std' };
    const p025 = { kind: 'pose', upstreamId: 'full_single_P025', title: '站立・分腿双手扶腰', category: '站姿', series: 'full_std' };
    const sexy = { kind: 'pose', upstreamId: 'full_sexy_P001', title: 'S形站姿・胯部侧顶', category: '站姿', series: 'full_sexy' };
    const intimatePair = { kind: 'pose', upstreamId: 'pair60_P003', title: '抬起脚踝・V字打开', category: '正常位（传教士）', series: 'pair60' };
    const unannotated = [p005, p009, p010, p019, p026, p041, p061];
    for (const template of unannotated) {
        assert.equal(classifyPose(template).suitability, 'review', template.upstreamId);
        assert.equal(isPoseAllowed(template), false, template.upstreamId);
    }
    assert.deepEqual([p005, p009, p010, p026, p041, p061].map(template => classifyPose(template).poseFamily), [
        'knee_up', 'supported_lean', 'ankle_reach', 'raised_arms', 'seated', 'squat',
    ]);
    assert.equal(classifyPose(p024).suitability, 'exclude');
    assert.ok(classifyPose(p024).reasonTags.includes('balance_risk'));
    assert.equal(classifyPose(p016).suitability, 'review');
    assert.ok(classifyPose(p016).reasonTags.includes('overhead_action'));
    assert.equal(classifyPose(p017).suitability, 'safe');
    assert.equal(classifyPose(p017).poseFamily, 'standing_look_back');
    assert.deepEqual([p015, p017, p018, p021, p022, p025].map(template => classifyPose(template).poseFamily), [
        'standing_weight_shift', 'standing_look_back', 'hands_at_waist', 'standing_neck_touch', 'standing_open_chest', 'wide_stance_hands_at_waist',
    ]);
    assert.equal(classifyPose(p022).suitability, 'review');
    assert.ok(classifyPose(p022).reasonTags.includes('pose_exaggeration_review'));
    assert.equal(classifyPose(p025).suitability, 'review');
    assert.ok(classifyPose(p025).reasonTags.includes('generation_compliance_review'));
    assert.equal(isPoseAllowed(p022, { naturalPoseOnly: true }), false);
    assert.equal(isPoseAllowed(p025, { naturalPoseOnly: true }), false);
    assert.equal(isPoseAllowed(p025, { allowReview: true }), true);
    assert.notEqual(classifyPose(p025).poseFamily, classifyPose(p018).poseFamily);
    assert.equal(classifyPose(sexy).suitability, 'exclude');
    assert.ok(classifyPose(sexy).reasonTags.includes('sexualized'));
    assert.equal(classifyPose(intimatePair).suitability, 'exclude');
    assert.ok(classifyPose(intimatePair).reasonTags.includes('multi_person_context'));
    assert.ok(classifyPose(intimatePair).reasonTags.includes('intimate_pair'));
    assert.equal(isPoseAllowed(intimatePair), false);
    assert.equal(isPoseAllowed(intimatePair, { poseContext: 'multi', allowReview: true }), false);
    assert.equal(isPoseAllowed(p016, { naturalPoseOnly: true }), false);
    assert.equal(isPoseAllowed(p017, { naturalPoseOnly: true }), true);
    assert.equal(p024.title, '站立・单腿后抬', 'classification is local and does not mutate upstream rows');
});

test('owned PhotoAtelier pose examples use their authored metadata while unknown external poses remain review-only', () => {
    const original = { kind: 'pose', id: 'pa-pose-natural-seat', title: '自然放松坐姿', description: '单腿自然弯曲、肩膀放松，适合半身与环境人像。', category: '坐姿', source: { type: 'original' } };
    const unknown = { kind: 'pose', upstreamId: 'unreviewed_pose_001', title: '安静坐姿', category: '坐姿' };
    assert.equal(classifyPose(original).suitability, 'safe');
    assert.equal(classifyPose(original).poseFamily, 'seated');
    assert.equal(isPoseAllowed(original, { naturalPoseOnly: true }), true);
    assert.equal(classifyPose(unknown).suitability, 'review');
    assert.equal(isPoseAllowed(unknown, { naturalPoseOnly: true }), false);
});

test('registry search only returns whitelisted natural solo poses and preserves distinct pose families', () => {
    const templates = normalizePoseAtlasDataset('pose', { poses: [
        { id: 'full_single_P015', series: 'full_std', category: '站姿', names: { zh: '站立・对立式平衡・手扶腰' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P015_front.jpg' }] },
        { id: 'full_single_P016', series: 'full_std', category: '站姿', names: { zh: '站立・双手撩发' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P016_front.jpg' }] },
        { id: 'full_single_P017', series: 'full_std', category: '站姿', names: { zh: '站立・回眸顾盼' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P017_front.jpg' }] },
        { id: 'full_single_P018', series: 'full_std', category: '站姿', names: { zh: '站立・双手扶腰' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P018_front.jpg' }] },
        { id: 'full_single_P021', series: 'full_std', category: '站姿', names: { zh: '站立・一手抚颈一手扶腿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P021_front.jpg' }] },
        { id: 'full_single_P022', series: 'full_std', category: '站姿', names: { zh: '站立・双臂后展挺胸' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P022_front.jpg' }] },
        { id: 'full_single_P024', series: 'full_std', category: '站姿', names: { zh: '站立・单腿后抬' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P024_front.jpg' }] },
        { id: 'full_single_P025', series: 'full_std', category: '站姿', names: { zh: '站立・分腿双手扶腰' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P025_front.jpg' }] },
        { id: 'full_sexy_P001', series: 'full_sexy', category: '站姿', names: { zh: 'S形站姿・胯部侧顶' }, variants: [{ angle: 'front', thumb: 'thumbs/full_sexy_P001_front.jpg' }] },
        { id: 'pair60_P003', series: 'pair60', category: '正常位（传教士）', names: { zh: '抬起脚踝・V字打开' }, variants: [{ angle: 'front', thumb: 'thumbs/pair60_P003_front.jpg' }] },
    ] });
    const registry = createRegistry({ schemaVersion: 1, templates });
    const ordinary = registry.search({ kind: 'pose', limit: 20 }).results;
    assert.deepEqual(ordinary.map(item => item.upstreamId).sort(), ['full_single_P015', 'full_single_P017', 'full_single_P018', 'full_single_P021']);
    assert.equal(ordinary.find(item => item.upstreamId === 'full_single_P016'), undefined);
    const natural = registry.search({ kind: 'pose', naturalPoseOnly: true, limit: 20 }).results;
    assert.deepEqual(natural.map(item => item.upstreamId).sort(), ['full_single_P015', 'full_single_P017', 'full_single_P018', 'full_single_P021']);
    assert.equal(new Set(natural.map(item => classifyPose(item).poseFamily)).size, natural.length);
    const duo = registry.search({ kind: 'pose', poseContext: 'multi', limit: 20 }).results;
    assert.equal(duo.some(item => item.upstreamId === 'pair60_P003'), false);
});

test('search returns at most six summaries and omits the server search corpus', () => {
    const row = fixtures().costume.costumes[0];
    const templates = normalizePoseAtlasDataset('costume', { costumes: Array.from({ length: 12 }, (_, i) => ({ ...row, id: `AUT-${i}` })) });
    const result = searchPoseAtlasTemplates(templates, { limit: 999 });
    assert.equal(result.total, 12);
    assert.equal(result.results.length, 6);
    assert.equal(Object.hasOwn(result.results[0], 'searchText'), false);
    assert.throws(() => searchPoseAtlasTemplates(templates, { kind: 'image' }), /INVALID_KIND/);
    assert.throws(() => searchPoseAtlasTemplates(templates, { query: 'a'.repeat(161) }), /INVALID_QUERY/);
});

test('loader calls only the three fixed datasets and shares its five-minute memory cache', async () => {
    const calls = [];
    const fetchImpl = fixtureFetcher(fixtures(), calls);
    const first = await loadPoseAtlasCatalog({ fetchImpl, now: 1000 });
    assert.equal(first.status, 'ready');
    assert.equal(first.templates.length, 3);
    assert.equal(first.externalRequests, 3);
    assert.equal(calls.length, 3);
    assert.equal(calls.every(call => call.options.redirect === 'manual' && call.options.signal instanceof AbortSignal), true);
    const cached = await loadPoseAtlasCatalog({ fetchImpl, now: 1001 });
    assert.equal(cached.externalRequests, 0);
    assert.equal(cached.cacheStatus, 'hit');
    assert.equal(calls.length, 3);
    await loadPoseAtlasCatalog({ fetchImpl, now: 301001 });
    assert.equal(calls.length, 6);
});

test('concurrent catalog requests share one upstream refresh', async () => {
    const calls = [];
    const fetchImpl = fixtureFetcher(fixtures(), calls);
    const results = await Promise.all(Array.from({ length: 10 }, () => loadPoseAtlasCatalog({ fetchImpl, now: 1000 })));
    assert.equal(calls.length, 3);
    assert.equal(results.filter(result => result.externalRequests === 3).length, 1);
    assert.equal(results.every(result => result.status === 'ready'), true);
});

test('a failed dataset produces an honest partial result and a short retry cache', async () => {
    const base = fixtureFetcher();
    let calls = 0;
    const fetchImpl = async (url, options) => {
        calls += 1;
        return url.endsWith('/faces.json') ? new Response('', { status: 503 }) : base(url, options);
    };
    const result = await loadPoseAtlasCatalog({ fetchImpl, now: 1000 });
    assert.equal(result.status, 'partial');
    assert.equal(result.templates.length, 2);
    assert.equal(result.datasetStatus.portrait, 'unavailable');
    await loadPoseAtlasCatalog({ fetchImpl, now: 1001 });
    assert.equal(calls, 3);
    await loadPoseAtlasCatalog({ fetchImpl, now: 31001 });
    assert.equal(calls, 6);
});

test('oversized and malformed responses never become a fabricated catalog', async () => {
    const fetchLarge = async () => new Response('{}', { headers: { 'content-length': String(3 * 1024 * 1024) } });
    const large = await loadPoseAtlasCatalog({ fetchImpl: fetchLarge, now: 1000 });
    assert.equal(large.status, 'unavailable');
    assert.deepEqual(large.templates, []);
    const fetchStreamLarge = async () => new Response(' '.repeat(2 * 1024 * 1024 + 1));
    assert.equal((await loadPoseAtlasCatalog({ fetchImpl: fetchStreamLarge, now: 1000 })).status, 'unavailable');
    const fetchMalformed = async () => Response.json({ arbitrary: [{ id: 'invented' }] });
    assert.equal((await loadPoseAtlasCatalog({ fetchImpl: fetchMalformed, now: 1000 })).status, 'unavailable');
});

test('the loader times out even when an upstream implementation ignores its abort signal', { timeout: 8000 }, async () => {
    const fetchImpl = () => new Promise(() => {});
    const result = await loadPoseAtlasCatalog({ fetchImpl, now: 1000 });
    assert.equal(result.status, 'unavailable');
    assert.deepEqual(result.templates, []);
});

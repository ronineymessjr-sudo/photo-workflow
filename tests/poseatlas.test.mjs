import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPoseAtlasCatalog, normalizePoseAtlasDataset, searchPoseAtlasTemplates, POSEATLAS_DATASETS } from '../api/ai-studio/poseatlas.mjs';
import { createRegistry, validateTemplate } from '../api/ai-studio/core.mjs';
import { classifyPose, isPoseAllowed } from '../api/ai-studio/pose-suitability.mjs';

function fixtures() {
    return {
        pose: { poses: [{ id: 'full_single_P019', series: 'full_std', category: '坐姿', no: 'P019', names: { zh: '自然坐姿', en: 'Relaxed sitting' }, variants: [{ angle: 'front', full: 'img/source.png' }, { angle: 'side' }] }] },
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
    assert.equal(searchPoseAtlasTemplates(templates, { kind: 'pose', query: '自然坐姿', angle: 'side' }).results[0].upstreamId, 'full_single_P019');
    assert.equal(searchPoseAtlasTemplates(templates, { kind: 'pose', query: '坐姿', angle: 'high' }).total, 0);
    assert.equal(searchPoseAtlasTemplates(templates, { query: 'unknown-999999' }).total, 0);
});

test('pose suitability labels risky, review-only, sexualized and duo references without changing source rows', () => {
    const p024 = { kind: 'pose', upstreamId: 'full_single_P024', title: '单腿后抬', category: '站姿', series: 'full_std' };
    const p016 = { kind: 'pose', upstreamId: 'full_single_P016', title: '双手撩发的放松站姿', category: '站姿', series: 'full_std' };
    const p017 = { kind: 'pose', upstreamId: 'full_single_P017', title: '站立回眸', category: '站姿', series: 'full_std' };
    const sexy = { kind: 'pose', upstreamId: 'full_single_S001', title: '性感姿势', category: '站姿', series: 'full_sexy' };
    const duo = { kind: 'pose', upstreamId: 'full_duo_P001', title: '双人自然站姿', category: '站姿', series: 'duo' };
    assert.equal(classifyPose(p024).suitability, 'exclude');
    assert.ok(classifyPose(p024).reasonTags.includes('balance_risk'));
    assert.equal(classifyPose(p016).suitability, 'review');
    assert.ok(classifyPose(p016).reasonTags.includes('overhead_action'));
    assert.equal(classifyPose(p017).suitability, 'review');
    assert.ok(classifyPose(p017).reasonTags.includes('source_metadata_review'));
    assert.equal(classifyPose(sexy).suitability, 'exclude');
    assert.ok(classifyPose(sexy).reasonTags.includes('sexualized'));
    assert.equal(classifyPose(duo).suitability, 'review');
    assert.equal(isPoseAllowed(duo), false);
    assert.equal(isPoseAllowed(duo, { poseContext: 'multi' }), true);
    assert.equal(isPoseAllowed(p016, { naturalPoseOnly: true }), false);
    assert.equal(p024.title, '单腿后抬', 'classification is local and does not mutate upstream rows');
});

test('registry search filters excluded poses, scopes duo poses and labels review candidates', () => {
    const templates = normalizePoseAtlasDataset('pose', { poses: [
        { id: 'full_single_P015', series: 'full_std', category: '站姿', names: { zh: '自然站姿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P015_front.jpg' }] },
        { id: 'full_single_P016', series: 'full_std', category: '站姿', names: { zh: '双手撩发的放松站姿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P016_front.jpg' }] },
        { id: 'full_single_P017', series: 'full_std', category: '站姿', names: { zh: '站立回眸' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P017_front.jpg' }] },
        { id: 'full_single_P024', series: 'full_std', category: '站姿', names: { zh: '单腿后抬' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P024_front.jpg' }] },
        { id: 'full_single_S001', series: 'full_sexy', category: '站姿', names: { zh: '性感姿势' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_S001_front.jpg' }] },
        { id: 'full_duo_P001', series: 'duo', category: '双人', names: { zh: '双人自然站姿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_duo_P001_front.jpg' }] },
    ] });
    const registry = createRegistry({ schemaVersion: 1, templates });
    const ordinary = registry.search({ kind: 'pose', limit: 20 }).results;
    assert.deepEqual(ordinary.map(item => item.upstreamId).sort(), ['full_single_P015', 'full_single_P016', 'full_single_P017']);
    assert.equal(ordinary.find(item => item.upstreamId === 'full_single_P016').poseSuitability, 'review');
    assert.ok(ordinary.find(item => item.upstreamId === 'full_single_P016').poseReasonTags.includes('overhead_action'));
    assert.equal(ordinary.find(item => item.upstreamId === 'full_single_P017').poseSuitability, 'review');
    const natural = registry.search({ kind: 'pose', naturalPoseOnly: true, limit: 20 }).results;
    assert.deepEqual(natural.map(item => item.upstreamId), ['full_single_P015']);
    const duo = registry.search({ kind: 'pose', poseContext: 'multi', limit: 20 }).results;
    assert.ok(duo.some(item => item.upstreamId === 'full_duo_P001' && item.poseSuitability === 'review'));
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

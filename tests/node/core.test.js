const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Domain = require('../../src/domain');

test('normalizes a Chinese overseas photography brief', () => {
  const brief = Domain.normalizeBrief({
    theme: '通用单人人像测试', style: '时尚', scene: '室内主场景', mood: '自然',
    extra: '需要海外发布和 SEO，预算 1200-1800', duration: '2小时'
  });
  assert.equal(brief.theme, '通用单人人像测试');
  assert.ok(brief.englishQueries.includes('portrait'));
  assert.ok(brief.englishQueries.includes('seo'));
  assert.ok(brief.platforms.includes('instagram'));
  assert.deepEqual(brief.budget, { min: 1200, max: 1800, currency: 'CNY' });
});

test('deduplicates by platform id, canonical URL and content hash', () => {
  const result = Domain.deduplicateAssets([
    { id: 'a', platform: 'xhs', platformItemId: '123', sourceUrl: 'https://x/1' },
    { id: 'b', platform: 'xhs', platformItemId: '123', sourceUrl: 'https://x/2' },
    { id: 'c', sourceUrl: 'https://example.com/photo?utm_source=test' },
    { id: 'd', sourceUrl: 'https://example.com/photo' },
    { id: 'e', contentHash: 'same' },
    { id: 'f', contentHash: 'same' }
  ]);
  assert.equal(result.items.length, 3);
  assert.equal(result.duplicates.length, 3);
});

test('parses and samples an identity .cube LUT', () => {
  const cube = [
    'TITLE "Identity"', 'LUT_3D_SIZE 2',
    '0 0 0', '1 0 0', '0 1 0', '1 1 0',
    '0 0 1', '1 0 1', '0 1 1', '1 1 1'
  ].join('\n');
  const lut = Domain.parseCubeLut(cube);
  assert.equal(lut.title, 'Identity');
  assert.equal(lut.data.length, 8);
  const sampled = Domain.sampleCube(lut, .25, .5, .75, 1);
  assert.ok(Math.abs(sampled[0] - .25) < .001);
  assert.ok(Math.abs(sampled[1] - .5) < .001);
  assert.ok(Math.abs(sampled[2] - .75) < .001);
});

test('resamples a CUBE LUT to Blackmagic 17 point and universal 33 point files', () => {
  const cube = [
    'TITLE "Identity"', 'LUT_3D_SIZE 2',
    '0 0 0', '1 0 0', '0 1 0', '1 1 0',
    '0 0 1', '1 0 1', '0 1 1', '1 1 1'
  ].join('\n');
  const source = Domain.parseCubeLut(cube);
  for (const size of [17, 33]) {
    const converted = Domain.parseCubeLut(Domain.serializeCubeLut(source, size));
    assert.equal(converted.size, size);
    const sampled = Domain.sampleCube(converted, .2, .4, .8, 1);
    assert.ok(Math.abs(sampled[0] - .2) < .001);
    assert.ok(Math.abs(sampled[1] - .4) < .001);
    assert.ok(Math.abs(sampled[2] - .8) < .001);
  }
});

test('rejects malformed LUTs without the declared number of points', () => {
  assert.throws(() => Domain.parseCubeLut('LUT_3D_SIZE 2\n0 0 0'), /无效的 3D LUT/);
});

test('open LUT catalog is license-audited, input-gated and parser-valid', () => {
  const root = path.resolve(__dirname, '../..');
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets/lut-library.json'), 'utf8'));
  assert.equal(catalog.items.length, 12);
  assert.ok(catalog.items.some(item => item.inputColorSpace === 'sRGB display-referred'));
  assert.ok(catalog.items.some(item => item.inputColorSpace === 'Panasonic V-Log / V-Gamut'));
  assert.equal(catalog.version, 2);
  assert.equal(catalog.softwareProfiles.length, 4);
  assert.ok(catalog.softwareProfiles.find(item => item.id === 'blackmagic-camera').supportedCubeSizes.includes(33));
  assert.equal(catalog.softwareProfiles.find(item => item.id === 'pixelcake').directCubeImport, false);
  assert.equal(catalog.inputTransforms.find(item => item.id === 'dji-dlogm').modelRequired, true);
  for (const transformId of ['sony-slog3-sgamut3cine', 'dji-dlogm', 'apple-log', 'panasonic-vlog', 'blackmagic-film-gen5']) {
    assert.ok(catalog.inputTransforms.some(item => item.id === transformId));
  }
  for (const item of catalog.items) {
    assert.ok(['MIT', 'Apache-2.0'].includes(item.sourceLicense));
    assert.equal(item.commercialUse, true);
    assert.ok(item.sourceUrl.startsWith('https://github.com/'));
    const lut = Domain.parseCubeLut(fs.readFileSync(path.join(root, item.fileUrl), 'utf8'));
    assert.equal(lut.size, item.size);
    assert.equal(item.size, 33);
    assert.equal(item.compatibility['blackmagic-camera'].includes('cube-33'), true);
  }
});

test('merges legacy schedule keys without deleting data', () => {
  const result = Domain.migrateLegacySnapshot({
    pw_schedule: [{ id: '1', title: 'A' }],
    pw_schedules: [{ id: '1', title: 'A' }, { id: '2', title: 'B' }],
    pw_plans: [{ id: 'p1' }]
  });
  assert.equal(result.schedules.length, 2);
  assert.equal(result.plans.length, 1);
});

test('builds channel-specific domestic and overseas publishing packages', () => {
  const pack = Domain.buildPublishingPackage({ theme: '通用单人人像测试', extra: '小红书和海外发布' });
  assert.ok(pack.platforms.some(item => item.platform === 'xiaohongshu'));
  assert.ok(pack.platforms.some(item => item.platform === 'instagram'));
  assert.ok(pack.platforms.every(item => item.spec.ratio));
  assert.ok(pack.platforms.find(item => item.platform === 'instagram').altText.includes('通用单人人像测试'));
});

test('orchestrator degrades one failed source without aborting the workflow', async () => {
  const result = await Domain.runWorkflow({ constraints: [] }, {
    brief: () => ({ theme: 'test' }),
    retrieve: () => { throw new Error('external source unavailable'); },
    compose: () => ({ input: { theme: 'test' }, shots: [{ id: 's1' }] }),
    lut: () => ({ id: 'lut-1' }),
    publish: () => ({ platforms: [] })
  });
  assert.equal(result.events.length, 5);
  assert.equal(result.events.find(item => item.stepId === 'retrieve').status, 'degraded');
  assert.ok(result.completedAt);
});

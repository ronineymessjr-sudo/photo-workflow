const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const testVault = fs.mkdtempSync(path.join(os.tmpdir(), 'photoatelier-obsidian-test-'));
const sync = spawnSync(process.execPath, ['tools/sync-ronin-knowledge-to-obsidian.mjs'], {
  cwd: projectRoot,
  env: { ...process.env, RONIN_OBSIDIAN_VAULT: testVault },
  encoding: 'utf8',
});
if (sync.status !== 0) throw new Error(sync.stderr || 'Failed to create the isolated Obsidian test vault.');
process.env.PHOTOATELIER_OBSIDIAN_VAULT = testVault;
const { createServer, buildIndex, searchIndex, recommendKnowledgeContext, safeLibraryRoot } = require('../../tools/local-obsidian-proxy');

test('rejects library paths outside the configured vault', () => {
  assert.throws(() => safeLibraryRoot('..\\..\\Windows'), /超出 Obsidian 库范围/);
});

test('indexes Obsidian documents and attachments with stable metadata', () => {
  const index = buildIndex('摄影姿势库');
  assert.ok(index.indexVersion);
  assert.ok(Array.isArray(index.documents));
  assert.ok(Array.isArray(index.assets));
  assert.ok(Array.isArray(index.knowledgeSources));
  assert.equal(index.knowledgeSources.length, 315);
  if (index.assets[0]) {
    assert.ok(index.assets[0].id.startsWith('asset-'));
    assert.ok(index.assets[0].contentHash);
    assert.equal(index.assets[0].licenseClass, 'local-private-reference');
  }
});

test('search supports type and workflow filters', () => {
  const results = searchIndex({ libraryFolder: '摄影姿势库', query: '姿势', type: 'all', limit: 10 });
  assert.ok(Array.isArray(results));
  assert.ok(results.length <= 10);
  results.forEach(item => assert.ok(item.score > 0));
});

test('search exposes Ronin knowledge separately from real image assets', () => {
  const results = searchIndex({ libraryFolder: '.', query: '构图', type: 'knowledge', limit: 20 });
  assert.ok(results.length > 0);
  assert.ok(results.every(item => item.type === 'knowledge'));
  assert.ok(results.every(item => !item.previewUrl));
  assert.ok(results.some(item => item.sourceType === 'ronin-rag'));
});

test('knowledge recommendation covers a real brief with diverse, traceable sources', () => {
  const result = recommendKnowledgeContext({
    libraryFolder: '.',
    brief: {
      shootingType: '人像与短视频',
      goal: '完成海边单人人像作品',
      theme: '海边电影感',
      style: '电影感、氛围感',
      mood: '安静',
      locationIntent: '海边',
      deliverableTarget: '12 张精修照片和 15 秒短视频',
    },
  });
  assert.ok(result.items.length > 0 && result.items.length <= 12);
  assert.ok(result.items.some(item => item.selectionRole === 'scene'));
  assert.ok(result.items.some(item => item.selectionRole === 'action'));
  assert.ok(result.items.some(item => item.selectionRole === 'movement'));
  assert.ok(result.items.some(item => item.kind === 'rag_chunk' || item.kind === 'scene' || item.kind === 'action'));
  assert.ok(result.items.some(item => item.id === 'SCN-003'));
  assert.ok(result.items.filter(item => item.groundingStatus === 'metadata-only').every(item => item.requiresVerification));
  assert.equal(result.policy.forbidInventedParameters, true);
  assert.ok(result.items.every(item => !String(item.id || '').startsWith('doc-') || !String(item.path || '').startsWith('摄影知识库/')));
});

test('generated Obsidian knowledge mirrors enrich the catalog without duplicating recommendations', () => {
  const index = buildIndex('.');
  const mirrors = index.documents.filter(item => item.knowledgeMirror);
  assert.equal(mirrors.length, 315);
  assert.ok(mirrors.every(item => item.canonicalKnowledgeId));
  const sea = index.knowledgeSources.find(item => item.id === 'SCN-003');
  assert.equal(sea.obsidianPath, '摄影知识库/03_场景库/SCN-003_海边.md');
  assert.equal(sea.requiresVerification, true);
});

test('v1 health works and disallowed browser origins are rejected', async (t) => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${base}/v1/health`);
  assert.equal(health.status, 200);
  const healthPayload = await health.json();
  assert.equal(healthPayload.ok, true);
  assert.equal(healthPayload.knowledgeSources, 315);
  assert.equal(healthPayload.knowledgeMirrors, 315);
  assert.ok(healthPayload.searchableDocuments < healthPayload.documents);
  assert.equal(healthPayload.count, healthPayload.searchableDocuments + healthPayload.knowledgeSources);
  const blocked = await fetch(`${base}/v1/health`, { headers: { Origin: 'https://example.com' } });
  assert.equal(blocked.status, 403);
  const recommendation = await fetch(`${base}/v1/context/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief: { shootingType: '人像', theme: '夜景街区', deliverableTarget: '精修 8 张' } }),
  });
  assert.equal(recommendation.status, 200);
  const recommendationPayload = await recommendation.json();
  assert.ok(recommendationPayload.items.length > 0);
  assert.ok(recommendationPayload.items.length <= 12);
});

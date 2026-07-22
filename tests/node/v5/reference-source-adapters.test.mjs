import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture } from './test-helpers.mjs';
import { createReferenceSourceGateway } from '../../../src/v5/references/reference-source-adapters.js';

class FakeApi {
  async searchReferenceImages() { return { items: [{ id: 123, provider: 'Pexels', title: '街道人像', photographer: 'Photographer', previewUrl: 'https://images.test/123.jpg', sourceUrl: 'https://pexels.test/photo/123' }] }; }
  async searchObsidian() { return { items: [
    { id: 'asset-1', type: 'asset', path: '摄影姿势库/pose.jpg', title: '站姿参考', contentHash: 'hash-pose' },
    { id: 'note-1', type: 'document', path: '摄影姿势库/索引.md', title: '姿势索引' },
  ] }; }
  async readObsidianNote(path) { return { item: { id: path, type: 'document', path, title: '笔记' } }; }
  async listEntity() { return { records: [{ id: 'feishu-ref-1', projectId: 'project-1', title: '飞书侧光参考', previewUrl: 'https://images.test/light.jpg', sourceUrl: 'https://source.test/light', tags: ['侧光'] }] }; }
}

test('reference source adapters normalize three providers to one DTO and enforce importability', async () => {
  const fixture = createFixture();
  const gateway = createReferenceSourceGateway({ apiClient: new FakeApi(), referenceService: fixture.app.references });
  const pexels = await gateway.search('pexels', 'street');
  assert.equal(pexels[0].sourceType, 'pexels');
  assert.equal(pexels[0].importable, true);
  const imported = gateway.ingest('pexels', pexels[0]);
  assert.equal(imported.asset.synthetic, false);

  const obsidian = await gateway.search('obsidian', '姿势');
  assert.equal(obsidian[0].importable, true);
  assert.equal(obsidian[1].importable, false);
  assert.throws(() => gateway.ingest('obsidian', obsidian[1]), error => error.code === 'REFERENCE_SOURCE_NOT_IMPORTABLE');

  const feishu = await gateway.search('feishu', '侧光', { projectId: 'project-1' });
  assert.equal(feishu.length, 1);
  assert.equal(feishu[0].sourceType, 'feishu');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture, MemoryStorage } from './test-helpers.mjs';

test('schema v5 migration converts reusable resources, references, revisions, events, finance and post data idempotently', () => {
  const fixture = createFixture();
  const project = fixture.data.create('projects', { id: 'legacy-project', title: '旧版商业人像', status: 'active', shootingType: '商业人像', brief: '品牌宣传图', defaultCurrency: 'CNY', timezone: 'Asia/Shanghai' });
  fixture.data.create('equipment', { id: 'legacy-camera', projectId: project.id, name: 'Sony A7M4', status: 'ready', quantity: 1 });
  fixture.data.create('venues', { id: 'legacy-venue', projectId: project.id, name: '白墙摄影棚', address: '上海' });
  fixture.data.create('people', { id: 'legacy-model', projectId: project.id, name: '模特 A', consentStatus: 'confirmed', boundaries: '不拍花絮' });
  fixture.data.create('references', { id: 'legacy-ref', projectId: project.id, title: '真实棚拍参考', sourceType: 'feishu', sourceId: 'record-ref', verificationStatus: 'verified' });
  fixture.data.create('plans', { id: 'legacy-plan', projectId: project.id, concept: '白墙极简人像', planStatus: 'confirmed', deliveryStatus: 'editing', selectedCount: 20 });
  fixture.data.create('shots', { id: 'legacy-shot', projectId: project.id, planId: 'legacy-plan', sequence: 1, scene: '半身肖像' });
  fixture.data.create('tasks', { id: 'legacy-call', projectId: project.id, planId: 'legacy-plan', taskType: 'shoot-call', title: '棚拍', startAt: '2026-08-08T09:00:00+08:00', endAt: '2026-08-08T12:00:00+08:00', amount: 2600, currency: 'CNY' });
  fixture.data.create('luts', { id: 'legacy-lut', projectId: project.id, name: 'Clean Neutral', inputColorSpace: 'sRGB' });

  const dryRun = fixture.app.migration.migrate({ commit: false });
  assert.equal(dryRun.dryRun, true);
  assert.ok(dryRun.counts.equipmentItems.new >= 1);
  const first = fixture.app.migration.migrate({ commit: true, force: true });
  assert.equal(first.completed, true);
  assert.equal(fixture.repos.equipmentModels.get('camera-sony-a7-iv').model, 'Alpha 7 IV');
  const migratedItem = fixture.repos.equipmentItems.list(item => item.legacyId === 'legacy-camera')[0];
  assert.equal(migratedItem.equipmentModelId, 'camera-sony-a7-iv');
  assert.equal(fixture.repos.resourceAssignments.list(item => item.projectId === project.id).length, 3);
  assert.equal(fixture.repos.referenceAssets.list(item => item.legacyId === 'legacy-ref').length, 1);
  assert.equal(fixture.repos.planRevisions.list(item => item.planId === 'legacy-plan').length, 1);
  assert.equal(fixture.repos.calendarEvents.list(item => item.legacyId === 'legacy-call').length, 1);
  assert.equal(fixture.repos.financialEntries.list(item => item.type === 'expected_revenue')[0].amount, 2600);
  assert.equal(fixture.repos.postProductionJobs.list(item => item.planId === 'legacy-plan')[0].status, 'editing');
  assert.equal(fixture.repos.lutPresets.list(item => item.legacyId === 'legacy-lut').length, 1);

  const second = fixture.app.migration.migrate({ commit: true, force: true });
  assert.equal(Object.values(second.inserted).reduce((sum, value) => sum + value, 0), 0);
});

test('schema v5 migration rolls back all writes when one entity fails', () => {
  const storage = new MemoryStorage();
  const fixture = createFixture({ storage });
  const project = fixture.data.create('projects', { id: 'rollback-project', title: '回滚项目', status: 'active' });
  fixture.data.create('equipment', { id: 'rollback-equipment', projectId: project.id, name: 'Sony A7M4' });
  const originalCreate = fixture.data.create.bind(fixture.data);
  fixture.data.create = (entity, record) => {
    if (entity === 'resourceAssignments') throw new Error('simulated failure');
    return originalCreate(entity, record);
  };
  assert.throws(() => fixture.app.migration.migrate({ commit: true, force: true }), /simulated failure/);
  fixture.data.create = originalCreate;
  assert.equal(fixture.data.list('equipmentModels').length, 0);
  assert.equal(fixture.data.list('equipmentItems').length, 0);
  assert.equal(fixture.data.list('projectBriefs').length, 0);
  assert.equal(storage.get('schemaV5MigrationReport').completed, false);
});

test('schema v5 migration deduplicates shared references and preserves all legacy IDs and project links', () => {
  const fixture = createFixture();
  fixture.data.create('projects', { id: 'project-ref-1', title: '项目 1' });
  fixture.data.create('projects', { id: 'project-ref-2', title: '项目 2' });
  fixture.data.create('references', { id: 'legacy-ref-a', projectId: 'project-ref-1', title: '共享参考 A', sourceType: 'pexels', sourceId: 'photo-123', sourceUrl: 'https://example.test/photo/123?utm_source=a' });
  fixture.data.create('references', { id: 'legacy-ref-b', projectId: 'project-ref-2', title: '共享参考 B', sourceType: 'pexels', sourceId: 'photo-123', sourceUrl: 'https://example.test/photo/123?utm_source=b' });
  fixture.app.migration.migrate({ commit: true, force: true });
  const assets = fixture.repos.referenceAssets.list(item => (item.legacyIds || []).includes('legacy-ref-a'));
  assert.equal(assets.length, 1);
  assert.deepEqual(new Set(assets[0].legacyIds), new Set(['legacy-ref-a', 'legacy-ref-b']));
  const links = fixture.repos.projectReferenceLinks.list(item => item.referenceAssetId === assets[0].id);
  assert.deepEqual(new Set(links.map(item => item.projectId)), new Set(['project-ref-1', 'project-ref-2']));
});

test('schema v5 migration preserves legacy agent metadata as an auditable GenerationRun', () => {
  const fixture = createFixture();
  fixture.data.create('projects', { id: 'project-agent', title: 'Agent 项目' });
  fixture.data.create('plans', {
    id: 'legacy-agent-plan', projectId: 'project-agent', title: 'Agent 方案', planStatus: 'confirmed',
    agentProvider: 'minimax', agentModel: 'model-x', agentPromptVersion: 'legacy-prompt-3',
    agentInstruction: '生成城市人像方案', agentOutput: { concept: '城市人像' }, generatedAt: '2026-07-01T10:00:00.000Z',
  });
  fixture.app.migration.migrate({ commit: true, force: true });
  const run = fixture.repos.generationRuns.list(item => item.approvedPlanId === 'legacy-agent-plan')[0];
  assert.equal(run.provider, 'minimax');
  assert.equal(run.model, 'model-x');
  assert.equal(run.status, 'approved');
  const revision = fixture.repos.planRevisions.list(item => item.planId === 'legacy-agent-plan')[0];
  assert.equal(revision.generationRunId, run.id);
});

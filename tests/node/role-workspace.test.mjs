import test from 'node:test';
import assert from 'node:assert/strict';
import { StorageRepository } from '../../src/core/storage.js';
import { DataService } from '../../src/services/data-service.js';
import {
  buildCallSheetMarkdown,
  buildRoleBrief,
  buildSharePacketMarkdown,
  computeProjectReadiness,
  detectScheduleConflicts,
  ensureAssistantChecklist,
  analyzeShotSequence,
} from '../../src/services/role-workspace.js';

class FakeLocalStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
}

function fixture() {
  const local = new FakeLocalStorage();
  globalThis.localStorage = local;
  const storage = new StorageRepository('pa_v2_', local);
  const data = new DataService(storage);
  const project = data.create('projects', {
    id: 'project-role', title: '品牌人像', status: 'active', location: '上海影棚', date: '2026-09-10',
    style: '清冷商业', weatherBackup: '室内 B 棚', usageScope: '品牌社交媒体', deliverables: '20 张精修',
  });
  const plan = data.create('plans', {
    id: 'plan-role', projectId: project.id, concept: '冷调品牌肖像', planStatus: 'confirmed',
    executionStatus: 'scheduled', deliveryStatus: 'not_started', backupPrimary: 'RAID/A', backupSecondary: 'SSD/B',
  });
  data.create('shots', { id: 'shot-role-1', projectId: project.id, planId: plan.id, sequence: 1, scene: '环境建立', priority: 'must' });
  data.create('shots', { id: 'shot-role-2', projectId: project.id, planId: plan.id, sequence: 2, scene: '半身肖像' });
  data.create('tasks', { id: 'call-role', projectId: project.id, planId: plan.id, taskType: 'shoot-call', title: '品牌拍摄', startAt: '2026-09-10T09:00', endAt: '2026-09-10T12:00', location: '上海影棚' });
  data.create('references', { id: 'ref-role', projectId: project.id, title: '侧光参考', verificationStatus: 'verified' });
  data.create('people', { id: 'model-role', projectId: project.id, name: '模特 A', role: 'model', consentStatus: 'signed', wardrobe: '黑色西装', boundaries: '不拍过度暴露造型' });
  data.create('people', { id: 'assistant-role', projectId: project.id, name: '助理 B', role: 'assistant', consentStatus: 'not-required' });
  data.create('equipment', { id: 'camera-role', projectId: project.id, name: 'Sony A7M4', category: '相机', status: 'ready' });
  return { data, storage, project, plan };
}

test('schedule conflict detector rejects overlapping shoot calls but accepts adjacent calls', () => {
  const tasks = [{ id: 'a', taskType: 'shoot-call', startAt: '2026-09-10T09:00', endAt: '2026-09-10T12:00' }];
  assert.equal(detectScheduleConflicts(tasks, '2026-09-10T11:30', '2026-09-10T13:00').length, 1);
  assert.equal(detectScheduleConflicts(tasks, '2026-09-10T12:00', '2026-09-10T14:00').length, 0);
  assert.equal(detectScheduleConflicts(tasks, 'invalid', '2026-09-10T14:00').length, 0);
});

test('readiness separates hard blockers from actionable warnings', () => {
  const { data, project, plan } = fixture();
  const ready = computeProjectReadiness(data, project.id, plan.id);
  assert.equal(ready.hardBlockers.length, 0);
  assert.ok(ready.score >= 80);
  assert.equal(ready.status, 'ready');

  data.remove('shots', 'shot-role-1');
  data.remove('shots', 'shot-role-2');
  const blocked = computeProjectReadiness(data, project.id, plan.id);
  assert.ok(blocked.hardBlockers.includes('正式方案没有镜头'));
  assert.equal(blocked.status, 'blocked');
});

test('role briefs expose different information priorities without changing source records', () => {
  const { data, project, plan } = fixture();
  const model = buildRoleBrief(data, project.id, 'model', plan.id);
  const assistant = buildRoleBrief(data, project.id, 'assistant', plan.id);
  const client = buildRoleBrief(data, project.id, 'client', plan.id);
  assert.match(model.title, /模特通告/);
  assert.ok(model.priorities.some(item => item.includes('授权状态')));
  assert.match(assistant.title, /助理执行单/);
  assert.ok(assistant.priorities.some(item => item.includes('设备登记')));
  assert.ok(client.priorities.some(item => item.includes('使用范围')));
  assert.equal(data.get('plans', plan.id).concept, '冷调品牌肖像');
});

test('assistant checklist generation is idempotent', () => {
  const { data, project, plan } = fixture();
  const first = ensureAssistantChecklist(data, project.id, plan.id);
  const second = ensureAssistantChecklist(data, project.id, plan.id);
  assert.equal(first.length, 8);
  assert.equal(second.length, 0);
  assert.equal(data.list('tasks', item => item.role === 'assistant').length, 8);
});

test('call sheet export preserves team, equipment, risks and shot priority', () => {
  const { data, project, plan } = fixture();
  const markdown = buildCallSheetMarkdown(data, project.id, plan.id);
  assert.match(markdown, /photoatelier-call-sheet/);
  assert.match(markdown, /模特 A/);
  assert.match(markdown, /Sony A7M4/);
  assert.match(markdown, /室内 B 棚/);
  assert.match(markdown, /\*\*必拍\*\*/);
});


test('shot sequence analysis flags expensive repeated setup changes', () => {
  const result = analyzeShotSequence([
    { id: 's1', sequence: 1, focalLength: '35mm', lighting: '柔光', location: 'A区' },
    { id: 's2', sequence: 2, focalLength: '85mm', lighting: '硬光', location: 'B区' },
    { id: 's3', sequence: 3, focalLength: '35mm', lighting: '柔光', location: 'A区' },
    { id: 's4', sequence: 4, focalLength: '85mm', lighting: '硬光', location: 'B区' },
  ]);
  assert.equal(result.shotCount, 4);
  assert.equal(result.setupChanges, 3);
  assert.equal(result.highChange, true);
  assert.match(result.recommendation, /分组/);
});

test('pending model consent is a hard shooting blocker scoped to the selected plan', () => {
  const { data, project, plan } = fixture();
  data.update('people', 'model-role', { planId: plan.id, consentStatus: 'pending' });
  const blocked = computeProjectReadiness(data, project.id, plan.id);
  assert.ok(blocked.hardBlockers.some(item => item.includes('授权未确认')));
  assert.equal(blocked.status, 'blocked');

  data.create('plans', { id: 'plan-other', projectId: project.id, concept: '另一个方案', planStatus: 'confirmed' });
  data.create('people', { id: 'model-other', projectId: project.id, planId: 'plan-other', name: '其他方案模特', role: 'model', consentStatus: 'pending' });
  data.update('people', 'model-role', { consentStatus: 'signed' });
  const selectedPlan = computeProjectReadiness(data, project.id, plan.id);
  assert.equal(selectedPlan.hardBlockers.some(item => item.includes('授权')), false);
});


test('share-safe role packets expose useful execution details without leaking other contacts or internal privacy notes', () => {
  const { data, project, plan } = fixture();
  data.update('people', 'assistant-role', { contact: 'assistant@example.com', compensation: '内部费用 1000' });
  data.update('projects', project.id, { privacyConstraints: '内部私密备注：不可外传' });
  const modelPacket = buildSharePacketMarkdown(data, project.id, 'model', plan.id);
  const clientPacket = buildSharePacketMarkdown(data, project.id, 'client', plan.id);
  assert.match(modelPacket, /privacy: share-safe/);
  assert.match(modelPacket, /模特确认/);
  assert.doesNotMatch(modelPacket, /assistant@example\.com/);
  assert.doesNotMatch(modelPacket, /内部费用 1000/);
  assert.doesNotMatch(modelPacket, /内部私密备注/);
  assert.match(clientPacket, /交付与使用/);
  assert.doesNotMatch(clientPacket, /模特 A/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { StorageRepository } from '../../src/core/storage.js';
import { DataService } from '../../src/services/data-service.js';
import { seedProjectTemplate } from '../../src/services/project-templates.js';
import {
  buildRoleBrief,
  buildSharePacketMarkdown,
  computeProjectReadiness,
  ensureAssistantChecklist,
} from '../../src/services/role-workspace.js';
import { summarizeReviewFeedback } from '../../src/services/feedback-analytics.js';

class FakeLocalStorage {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
}

function setup() {
  const local = new FakeLocalStorage();
  globalThis.localStorage = local;
  const data = new DataService(new StorageRepository('pa_v2_', local));
  const project = data.create('projects', {
    id: 'persona-project', title: '模特品牌人像', shootingType: '商业人像', location: '上海 A 棚', date: '2026-10-02',
    style: '清冷高级', deliverables: '20 张精修', usageScope: '品牌官网与社交媒体', clientApprovalStatus: 'approved', weatherBackup: '同栋 B 棚',
  });
  seedProjectTemplate(data, project, 'commercial');
  const plan = data.create('plans', {
    id: 'persona-plan', projectId: project.id, concept: '冷调城市肖像', planStatus: 'confirmed', executionStatus: 'scheduled', deliveryStatus: 'not_started',
    backupPrimary: 'RAID/A', backupSecondary: 'SSD/B',
  });
  for (const shot of [
    { id: 'p-shot-1', sequence: 1, scene: '环境建立', focalLength: '35mm', lighting: '柔光', location: 'A区', priority: 'must' },
    { id: 'p-shot-2', sequence: 2, scene: '半身主视觉', focalLength: '85mm', lighting: '柔光', location: 'A区', priority: 'must' },
    { id: 'p-shot-3', sequence: 3, scene: '产品互动', focalLength: '50mm', lighting: '硬光', location: 'B区' },
  ]) data.create('shots', { ...shot, projectId: project.id, planId: plan.id, captureStatus: 'planned' });
  data.create('tasks', { id: 'persona-call', projectId: project.id, planId: plan.id, taskType: 'shoot-call', title: '品牌人像拍摄', startAt: '2026-10-02T09:00', endAt: '2026-10-02T12:00', location: '上海 A 棚', status: 'scheduled' });
  data.create('references', { id: 'persona-ref', projectId: project.id, title: '主视觉参考', verificationStatus: 'verified' });
  data.create('people', { id: 'persona-model', projectId: project.id, planId: plan.id, role: 'model', name: '模特 A', consentStatus: 'pending', wardrobe: '黑色西装', boundaries: '不接受危险动作' });
  data.create('people', { id: 'persona-assistant', projectId: project.id, planId: plan.id, role: 'assistant', name: '助理 B', contact: 'private@example.com', consentStatus: 'not-required' });
  data.create('people', { id: 'persona-client', projectId: project.id, planId: plan.id, role: 'client', name: '客户 C', consentStatus: 'not-required' });
  data.create('equipment', { id: 'persona-camera', projectId: project.id, planId: plan.id, name: 'A7M4', category: '相机', status: 'ready' });
  return { data, project, plan };
}

test('four-role scenario preserves consent, execution and privacy boundaries end to end', () => {
  const { data, project, plan } = setup();

  const blocked = computeProjectReadiness(data, project.id, plan.id);
  assert.equal(blocked.status, 'blocked');
  assert.ok(blocked.hardBlockers.some(item => item.includes('授权')));

  const modelBrief = buildRoleBrief(data, project.id, 'model', plan.id);
  assert.match(modelBrief.title, /模特通告/);
  assert.ok(modelBrief.priorities.some(item => item.includes('黑色西装')));
  data.update('people', 'persona-model', { consentStatus: 'signed' });

  const assistantTasks = ensureAssistantChecklist(data, project.id, plan.id);
  assert.equal(assistantTasks.length, 8);
  const assistantBrief = buildRoleBrief(data, project.id, 'assistant', plan.id);
  assert.match(assistantBrief.title, /助理执行单/);
  assert.ok(assistantBrief.sequenceAnalysis.setupChanges >= 1);

  const ready = computeProjectReadiness(data, project.id, plan.id);
  assert.equal(ready.hardBlockers.length, 0);
  assert.ok(ready.score >= 80);

  const clientPacket = buildSharePacketMarkdown(data, project.id, 'client', plan.id);
  assert.match(clientPacket, /20 张精修/);
  assert.doesNotMatch(clientPacket, /private@example\.com/);
  assert.doesNotMatch(clientPacket, /不接受危险动作/);

  for (const shot of data.list('shots', item => item.planId === plan.id)) {
    data.update('shots', shot.id, { captureStatus: 'captured' });
    data.create('shootRecords', { id: `${shot.id}-record`, projectId: project.id, planId: plan.id, shotId: shot.id, captureStatus: 'captured' });
  }
  data.update('plans', plan.id, { executionStatus: 'completed', deliveryStatus: 'delivered', selectedCount: 20 });
  data.create('reviews', {
    id: 'persona-review', projectId: project.id, planId: plan.id, planScore: 5, executionScore: 4, keepRate: 75,
    photographerFriction: '现场切页略多', modelFeedback: '通告和边界清楚', assistantFeedback: '设备清单有效', clientFeedback: '交付范围明确',
    improvementArea: 'onsite', workflowReuse: 'with-changes',
  });

  const feedback = summarizeReviewFeedback(data.listByProject('reviews', project.id));
  assert.equal(feedback.topArea.key, 'onsite');
  assert.equal(feedback.roleCoverageRate, 100);
  assert.equal(data.auditIntegrity().ok, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { StorageRepository } from '../../src/core/storage.js';
import { parseCubeLut, sampleCube } from '../../src/core/lut.js';
import { DataService } from '../../src/services/data-service.js';
import { buildReviewMarkdown } from '../../src/pages/review.js';
import { inferWorkflowStage } from '../../src/core/schema.js';

class FakeLocalStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
  clear() { this.values.clear(); }
}

function json(value) { return JSON.stringify(value); }

test('full legacy migration covers plans, dynamic shots, schedule, equipment, LUT and review idempotently', () => {
  const local = new FakeLocalStorage({
    pw_plans: json([{ id: 'plan-legacy', title: '旧版城市人像', lifecycleStatus: 'scheduled', shots: [{ id: 'shot-embedded', scene: '环境建立' }] }]),
    'pa_shots_plan-legacy': json([{ id: 'shot-dynamic', scene: '主体肖像', status: 'captured' }]),
    pw_schedule: json([{ id: 'call-1', planId: 'plan-legacy', title: '城市人像拍摄', date: '2026-08-01', time: '09:00', location: '上海' }]),
    pw_eq: json([{ id: 'eq-1', n: 'Sony A7M4', c: 'camera' }]),
    pa_lut_profiles: json([{ id: 'lut-1', name: 'Clean Neutral' }]),
    pa_reviews: json([{ id: 'review-1', planId: 'plan-legacy', planScore: 5, executionScore: 4 }]),
  });
  globalThis.localStorage = local;
  const storage = new StorageRepository('pa_v2_', local);
  const data = new DataService(storage);
  const first = data.migrateLegacy({ commit: true, returnReport: true, force: true });
  assert.equal(first.completed, true);
  assert.equal(data.get('plans', 'plan-legacy').planStatus, 'confirmed');
  assert.equal(data.get('plans', 'plan-legacy').executionStatus, 'scheduled');
  assert.equal(data.list('shots').length, 2);
  assert.equal(data.get('tasks', 'call-1').taskType, 'shoot-call');
  assert.equal(data.get('equipment', 'eq-1').name, '历史设备');
  assert.equal(data.get('luts', 'lut-1').name, 'Clean Neutral');
  assert.equal(data.get('reviews', 'review-1').planId, 'plan-legacy');

  const second = data.migrateLegacy({ commit: true, returnReport: true, force: true });
  assert.equal(Object.values(second.inserted).reduce((sum, value) => sum + value, 0), 0);
  assert.equal(data.list('shots').length, 2);
});

test('versioned backup exports V2 and recognized legacy keys and can replace restore', () => {
  const local = new FakeLocalStorage({ pw_plans: json([{ id: 'old' }]), unrelated: 'keep-me' });
  const storage = new StorageRepository('pa_v2_', local);
  storage.set('projects', [{ id: 'project-1', title: 'Original' }]);
  const snapshot = storage.snapshot({ includeLegacy: true });
  assert.equal(snapshot.schemaVersion, 5);
  assert.ok(snapshot.namespaces.v2.pa_v2_projects);
  assert.ok(snapshot.namespaces.legacy.pw_plans);
  storage.set('projects', [{ id: 'project-2', title: 'Mutated' }]);
  storage.importAll(snapshot, { mode: 'replace' });
  assert.equal(storage.get('projects')[0].id, 'project-1');
  assert.equal(local.getItem('unrelated'), 'keep-me');
});

test('integrity audit reports orphan project and orphan plan references', () => {
  const local = new FakeLocalStorage();
  globalThis.localStorage = local;
  const storage = new StorageRepository('pa_v2_', local);
  const data = new DataService(storage);
  data.create('shots', { id: 'shot-orphan', projectId: 'missing-project', planId: 'missing-plan', scene: '测试' });
  const audit = data.auditIntegrity();
  assert.equal(audit.ok, false);
  assert.ok(audit.issues.some(item => item.code === 'ORPHAN_PROJECT'));
  assert.ok(audit.issues.some(item => item.code === 'ORPHAN_PLAN'));
});

test('ES module LUT parser validates and samples identity cube', () => {
  const cube = [
    'TITLE "Identity"', 'LUT_3D_SIZE 2',
    '0 0 0', '1 0 0', '0 1 0', '1 1 0',
    '0 0 1', '1 0 1', '0 1 1', '1 1 1',
  ].join('\n');
  const lut = parseCubeLut(cube);
  const sampled = sampleCube(lut, 0.25, 0.5, 0.75, 1);
  assert.equal(lut.size, 2);
  assert.ok(Math.abs(sampled[0] - 0.25) < 1e-9);
  assert.ok(Math.abs(sampled[1] - 0.5) < 1e-9);
  assert.ok(Math.abs(sampled[2] - 0.75) < 1e-9);
});

test('review markdown preserves project and plan identity for Obsidian back-links', () => {
  const markdown = buildReviewMarkdown(
    { id: 'project-1', title: '上海街拍', location: '上海', style: '电影感' },
    { id: 'plan-1', concept: '夜景人像', deliveryStatus: 'delivered' },
    { planId: 'plan-1', planScore: 5, executionScore: 4, keepRate: 70, reusableInsights: '保留侧逆光', photographerFriction: '切换页面过多', modelFeedback: '通告清晰', assistantFeedback: '器材表有效', clientFeedback: '交付范围明确', improvementArea: 'onsite', workflowReuse: 'with-changes', knowledgeSourceIds: ['CHUNK-001'], knowledgeValidationStatus: 'needs-shoot-review', knowledgeGuidanceSnapshot: [{ sourceId: 'CHUNK-001', title: '前景构图', role: 'composition', verificationRequired: true }] },
  );
  assert.match(markdown, /projectId: "project-1"/);
  assert.match(markdown, /planId: "plan-1"/);
  assert.match(markdown, /保留侧逆光/);
  assert.match(markdown, /切换页面过多/);
  assert.match(markdown, /模特体验/);
  assert.match(markdown, /现场执行/);
  assert.match(markdown, /修改后复用/);
  assert.match(markdown, /knowledgeSourceIds: \["CHUNK-001"\]/);
  assert.match(markdown, /前景构图/);
  assert.match(markdown, /拍摄后需核验有效性/);
});


test('canonical workflow keeps project, plan, schedule, onsite, delivery and review relations intact', () => {
  const local = new FakeLocalStorage();
  globalThis.localStorage = local;
  const storage = new StorageRepository('pa_v2_', local);
  const data = new DataService(storage);
  const project = data.create('projects', { id: 'project-flow', title: '完整流程测试', status: 'active' });
  const plan = data.create('plans', {
    id: 'plan-flow', projectId: project.id, concept: '城市夜景', planStatus: 'confirmed',
    executionStatus: 'unscheduled', deliveryStatus: 'not_started', userApproved: true,
  });
  const shots = [1, 2, 3].map(sequence => data.create('shots', {
    id: `shot-flow-${sequence}`, projectId: project.id, planId: plan.id, sequence,
    scene: `镜头 ${sequence}`, captureStatus: 'planned',
  }));
  data.create('tasks', {
    id: 'call-flow', projectId: project.id, planId: plan.id, taskType: 'shoot-call',
    title: '完整流程测试拍摄', startAt: '2026-08-01T09:00', endAt: '2026-08-01T12:00', status: 'scheduled',
  });
  data.update('plans', plan.id, { executionStatus: 'scheduled', scheduledAt: '2026-08-01T09:00' });
  shots.forEach(shot => {
    data.update('shots', shot.id, { captureStatus: 'captured' });
    data.create('shootRecords', {
      id: `${shot.id}-execution`, projectId: project.id, planId: plan.id, shotId: shot.id,
      captureStatus: 'captured',
    });
  });
  data.update('plans', plan.id, {
    executionStatus: 'completed', deliveryStatus: 'delivered', backupPrimary: 'RAID/A',
    backupSecondary: 'SSD/B', selectedCount: 36,
  });
  data.create('reviews', {
    id: 'review-flow', projectId: project.id, planId: plan.id, planScore: 5, executionScore: 4,
    reusableInsights: '保留侧逆光',
  });

  const finalPlan = data.get('plans', plan.id);
  assert.equal(inferWorkflowStage(finalPlan), '已交付');
  assert.equal(data.list('shootRecords', item => item.planId === plan.id).length, 3);
  assert.equal(data.list('reviews', item => item.planId === plan.id).length, 1);
  assert.equal(data.auditIntegrity().ok, true);
});

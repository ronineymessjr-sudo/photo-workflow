import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture, seedProject } from './test-helpers.mjs';

function workflowFixture() {
  const fixture = createFixture();
  const { project } = seedProject(fixture);
  fixture.app.catalog.importEquipmentModels();
  const plan = fixture.data.create('plans', { id: 'plan-1', projectId: project.id, title: '确认方案', planStatus: 'confirmed', confirmedRevisionId: 'revision-1' });
  const revision = fixture.data.create('planRevisions', {
    id: 'revision-1', projectId: project.id, planId: plan.id, revisionNumber: 1, status: 'confirmed', concept: '确认方案',
    preparationGuide: ['提前清洁鞋底', '准备保暖外套'], expectedDeliverableCount: 12, mustHaveShotCount: 2,
  });
  fixture.data.create('shots', { id: 'shot-1', projectId: project.id, planId: plan.id, planRevisionId: revision.id, sequence: 1, scene: '环境建立', shotSize: '全景', poseGuidance: '自然行走', subjectAction: '行走', priority: 'must', estimatedMinutes: 10, captureStatus: 'planned', lighting: '环境光', focalLength: '35mm' });
  fixture.data.create('shots', { id: 'shot-2', projectId: project.id, planId: plan.id, planRevisionId: revision.id, sequence: 2, scene: '半身肖像', shotSize: '半身', poseGuidance: '肩部放松', subjectAction: '静态', priority: 'must', estimatedMinutes: 15, captureStatus: 'planned', lighting: '侧逆光', focalLength: '85mm' });
  fixture.data.create('expectedLooks', { id: 'look-1', projectId: project.id, planId: plan.id, planRevisionId: revision.id, enabled: true, colorIntent: '低饱和蓝橙', lightingIntent: '保留霓虹', retouchIntent: '自然肤质', lutIntent: '创意 LUT', realReferenceAssetIds: [], generatedAssetIds: [] });
  const equipment = fixture.app.catalog.addEquipmentItem({ equipmentModelId: 'camera-sony-a7-iv', ownership: 'owned', availabilityStatus: 'available' });
  fixture.app.catalog.assignResourceToProject({ projectId: project.id, resourceType: 'equipment', resourceId: equipment.id, role: 'primary-camera', required: true });
  const talent = fixture.app.catalog.saveTalentProfile({ displayName: '模特 A', contact: 'model@example.test', consentStatus: 'granted', boundaries: '不公开后台花絮', privateNotes: '身份证信息仅内部留存' });
  const photographer = fixture.app.sharing.assignParticipant({ projectId: project.id, role: 'photographer', displayName: '摄影师', contact: 'photographer@example.test' });
  const model = fixture.app.sharing.assignParticipant({ projectId: project.id, role: 'model', talentProfileId: talent.id, callTimeOffsetMinutes: 30, responsibilities: ['按镜头顺序完成拍摄'], preparation: ['自备黑色鞋'] });
  const assistant = fixture.app.sharing.assignParticipant({ projectId: project.id, role: 'assistant', displayName: '助理', contact: 'assistant@example.test', callTimeOffsetMinutes: 45, responsibilities: ['管理电池和存储卡'], preparation: ['提前检查引闪器'] });
  return { fixture, project, plan, revision, photographer, model, assistant };
}

test('calendar separates expected, received and expenses and rejects overlapping shoot events', () => {
  const f = workflowFixture();
  const created = f.fixture.app.schedule.createShootEvent({
    projectId: f.project.id, planRevisionId: f.revision.id,
    startAt: '2026-08-02T14:00:00+08:00', endAt: '2026-08-02T18:00:00+08:00', timezone: 'Asia/Shanghai', location: '武康路',
    participantAssignmentIds: [f.model.id, f.assistant.id], expectedRevenue: 1800, currency: 'CNY',
  });
  assert.equal(created.expectedRevenue.type, 'expected_revenue');
  assert.throws(() => f.fixture.app.schedule.createShootEvent({
    projectId: f.project.id, planRevisionId: f.revision.id,
    startAt: '2026-08-02T16:00:00+08:00', endAt: '2026-08-02T19:00:00+08:00',
    participantAssignmentIds: [f.model.id],
  }), error => error.code === 'CALENDAR_CONFLICT');
  f.fixture.app.schedule.recordReceivedRevenue({ projectId: f.project.id, calendarEventId: created.event.id, amount: 1200, currency: 'CNY', occurredAt: '2026-08-02T18:30:00+08:00' });
  f.fixture.app.schedule.recordExpense({ projectId: f.project.id, calendarEventId: created.event.id, amount: 200, currency: 'CNY', occurredAt: '2026-08-02T18:30:00+08:00' });
  const summary = f.fixture.app.schedule.getRevenueSummary({ projectId: f.project.id, startAt: '2026-08-01T00:00:00+08:00', endAt: '2026-08-31T23:59:59+08:00', currency: 'CNY' });
  assert.deepEqual({ expected: summary.expected, received: summary.received, expense: summary.expense, netReceived: summary.netReceived }, { expected: 1800, received: 1200, expense: 200, netReceived: 1000 });
});

test('onsite workflow requires confirmed consent, records shots and creates post-production job', () => {
  const f = workflowFixture();
  const { event } = f.fixture.app.schedule.createShootEvent({
    projectId: f.project.id, planRevisionId: f.revision.id,
    startAt: '2026-08-02T14:00:00+08:00', endAt: '2026-08-02T18:00:00+08:00', location: '武康路',
    participantAssignmentIds: [f.model.id, f.assistant.id],
  });
  const started = f.fixture.app.onset.startShoot({ calendarEventId: event.id });
  assert.equal(started.event.status, 'in_progress');
  f.fixture.app.onset.updateShotCaptureStatus({ calendarEventId: event.id, shotId: 'shot-1', captureStatus: 'captured', actualSettings: { aperture: 'f/2', shutter: '1/200', iso: 1600 } });
  assert.throws(() => f.fixture.app.onset.completeShoot({ calendarEventId: event.id }), error => error.code === 'MUST_HAVE_SHOTS_INCOMPLETE');
  f.fixture.app.onset.updateShotCaptureStatus({ calendarEventId: event.id, shotId: 'shot-2', captureStatus: 'captured' });
  const completed = f.fixture.app.onset.completeShoot({ calendarEventId: event.id });
  assert.equal(completed.event.status, 'completed');
  assert.equal(completed.postProductionJob.status, 'not_started');
  assert.equal(completed.postProductionJob.expectedLookSnapshot.colorIntent, '低饱和蓝橙');
  assert.equal(f.fixture.repos.shootRecords.list().length, 2);
});

test('post workflow enforces double backup and delivery reference', () => {
  const f = workflowFixture();
  const started = f.fixture.app.post.start({ planRevisionId: f.revision.id });
  const backing = f.fixture.app.post.advance({ postProductionJobId: started.job.id, nextStatus: 'backing_up' }).job;
  assert.throws(() => f.fixture.app.post.advance({ postProductionJobId: backing.id, nextStatus: 'backed_up', patch: { primaryBackupPath: '/RAID/A' } }), error => error.code === 'DOUBLE_BACKUP_REQUIRED');
  let job = f.fixture.app.post.advance({ postProductionJobId: backing.id, nextStatus: 'backed_up', patch: { primaryBackupPath: '/RAID/A', secondaryBackupPath: '/SSD/B' } }).job;
  job = f.fixture.app.post.advance({ postProductionJobId: job.id, nextStatus: 'selecting' }).job;
  job = f.fixture.app.post.advance({ postProductionJobId: job.id, nextStatus: 'editing', patch: { selectedCount: 36, editVersion: 'v1' } }).job;
  assert.throws(() => f.fixture.app.post.advance({ postProductionJobId: job.id, nextStatus: 'delivered' }), error => error.code === 'DELIVERY_REFERENCE_REQUIRED');
  job = f.fixture.app.post.advance({ postProductionJobId: job.id, nextStatus: 'delivered', patch: { deliveryUrl: 'https://delivery.example.test/project-1' } }).job;
  assert.equal(job.status, 'delivered');
  assert.ok(job.deliveredAt);
});

test('model and assistant share packets are immutable, versioned and privacy-minimized', () => {
  const f = workflowFixture();
  const { event } = f.fixture.app.schedule.createShootEvent({
    projectId: f.project.id, planRevisionId: f.revision.id,
    startAt: '2026-08-02T14:00:00+08:00', endAt: '2026-08-02T18:00:00+08:00', location: '武康路',
    participantAssignmentIds: [f.model.id, f.assistant.id], expectedRevenue: 1800,
  });
  const modelPacket = f.fixture.app.sharing.buildModelPacket({ calendarEventId: event.id, participantAssignmentId: f.model.id });
  const assistantPacket = f.fixture.app.sharing.buildAssistantPacket({ calendarEventId: event.id, participantAssignmentId: f.assistant.id });
  const modelJson = JSON.stringify(modelPacket);
  assert.match(modelJson, /自然行走/);
  assert.doesNotMatch(modelJson, /assistant@example\.test/);
  assert.doesNotMatch(modelJson, /1800/);
  assert.doesNotMatch(modelJson, /身份证信息/);
  const published = f.fixture.app.sharing.publish(modelPacket.id).packet;
  assert.equal(published.status, 'published');
  const nextDraft = f.fixture.app.sharing.buildModelPacket({ calendarEventId: event.id, participantAssignmentId: f.model.id });
  assert.equal(nextDraft.version, 2);
  assert.equal(modelPacket.payloadSnapshot.schedule.location, '武康路');
  assert.ok(assistantPacket.payloadSnapshot.tasks.some(item => /Sony Alpha 7 IV/.test(item.title)));
});

test('model packet includes shared or assigned shots only, and revoked packets cannot be read', () => {
  const f = workflowFixture();
  const otherTalent = f.fixture.app.catalog.saveTalentProfile({ displayName: '模特 B', consentStatus: 'granted' });
  const otherModel = f.fixture.app.sharing.assignParticipant({ projectId: f.project.id, role: 'model', talentProfileId: otherTalent.id });
  f.fixture.data.create('shots', {
    id: 'shot-other-model', projectId: f.project.id, planId: f.plan.id, planRevisionId: f.revision.id,
    sequence: 3, scene: '只属于模特 B 的单人特写', shotSize: '特写', poseGuidance: '正面', subjectAction: '静态',
    priority: 'optional', estimatedMinutes: 5, captureStatus: 'planned', participantAssignmentIds: [otherModel.id],
  });
  const { event } = f.fixture.app.schedule.createShootEvent({
    projectId: f.project.id, planRevisionId: f.revision.id,
    startAt: '2026-08-03T14:00:00+08:00', endAt: '2026-08-03T18:00:00+08:00', location: '摄影棚',
    participantAssignmentIds: [f.model.id, otherModel.id],
  });
  const packet = f.fixture.app.sharing.buildModelPacket({ calendarEventId: event.id, participantAssignmentId: f.model.id });
  assert.equal(packet.payloadSnapshot.shotGoals.some(item => item.id === 'shot-other-model'), false);
  const published = f.fixture.app.sharing.publish(packet.id).packet;
  assert.equal(f.fixture.app.queries.sharePackets.read(published.id).id, published.id);
  f.fixture.app.sharing.revoke(published.id, '方案调整');
  assert.throws(() => f.fixture.app.queries.sharePackets.read(published.id), error => error.code === 'SHARE_PACKET_NOT_AVAILABLE');
});

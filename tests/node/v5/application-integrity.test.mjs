import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture, seedProject, validPlanOutput, FakePlanningGateway } from './test-helpers.mjs';

function planningFixture() {
  const gateway = new FakePlanningGateway(validPlanOutput({ referenceAssetId: 'ref-1', equipmentItemId: 'equipment-1' }));
  const fixture = createFixture({ planningGateway: gateway });
  const { project } = seedProject(fixture);
  fixture.app.catalog.importEquipmentModels();
  const equipment = fixture.data.create('equipmentItems', { id: 'equipment-1', equipmentModelId: 'camera-sony-a7-iv', ownership: 'owned', quantity: 1, availabilityStatus: 'available' });
  const assignment = fixture.app.catalog.assignResourceToProject({ projectId: project.id, resourceType: 'equipment', resourceId: equipment.id, role: 'primary-camera', required: true });
  const reference = fixture.app.references.ingestAsset({ id: 'ref-1', assetKind: 'real_photo', sourceType: 'local', localPath: '/ref-1.jpg', title: '真实参考', contentHash: 'hash-ref-1' }).asset;
  const link = fixture.app.references.selectForProject({ projectId: project.id, referenceAssetId: reference.id, role: 'mood' });
  return { fixture, project, assignment, link };
}

test('planning context rejects incomplete brief and unavailable explicitly selected equipment', () => {
  const fixture = createFixture();
  const project = fixture.data.create('projects', { id: 'project-incomplete', title: '未完成项目' });
  fixture.data.create('projectBriefs', { id: 'brief-incomplete', projectId: project.id, shootingType: '', goal: '', theme: '', deliverableTarget: '' });
  assert.throws(() => fixture.app.planningContext.build({ projectId: project.id }), error => error.code === 'BRIEF_INCOMPLETE' && error.details.missing.length === 3);

  const complete = seedProject(fixture, { id: 'project-unavailable' }).project;
  fixture.app.catalog.importEquipmentModels();
  const item = fixture.data.create('equipmentItems', { id: 'equipment-maintenance', equipmentModelId: 'camera-sony-a7-iv', ownership: 'owned', availabilityStatus: 'maintenance' });
  const assignment = fixture.app.catalog.assignResourceToProject({ projectId: complete.id, resourceType: 'equipment', resourceId: item.id, required: true });
  assert.throws(() => fixture.app.planningContext.build({ projectId: complete.id, equipmentAssignmentIds: [assignment.id] }), error => error.code === 'EQUIPMENT_UNAVAILABLE');
  const snapshot = fixture.app.planningContext.build({ projectId: complete.id });
  assert.equal(snapshot.equipment.length, 0);
});

test('AI output cannot cite unselected references or equipment unless external requirement is explicit', async () => {
  const f = planningFixture();
  const snapshot = f.fixture.app.planningContext.build({ projectId: f.project.id, equipmentAssignmentIds: [f.assignment.id], projectReferenceLinkIds: [f.link.id] });
  const invalid = validPlanOutput({ referenceAssetId: 'ref-not-selected', equipmentItemId: 'equipment-not-selected' });
  f.fixture.app.planning.planningGateway.output = invalid;
  await assert.rejects(() => f.fixture.app.planning.createGenerationRun({ projectId: f.project.id, contextSnapshotId: snapshot.id }), error => error.code === 'PLAN_OUTPUT_CONTEXT_MISMATCH');

  const allowed = validPlanOutput({ referenceAssetId: 'ref-1', equipmentItemId: 'external-lens' });
  allowed.equipmentRecommendations = [{ equipmentItemId: 'external-lens', name: '租赁 85mm 镜头', externalRequirement: true, reason: '需要更强背景压缩' }];
  f.fixture.app.planning.planningGateway.output = allowed;
  const result = await f.fixture.app.planning.createGenerationRun({ projectId: f.project.id, contextSnapshotId: snapshot.id });
  assert.equal(result.run.status, 'awaiting_approval');
});

test('approval transaction rolls back all cross-entity writes when shot creation fails', async () => {
  const f = planningFixture();
  const snapshot = f.fixture.app.planningContext.build({ projectId: f.project.id, equipmentAssignmentIds: [f.assignment.id], projectReferenceLinkIds: [f.link.id] });
  const generated = await f.fixture.app.planning.createGenerationRun({ projectId: f.project.id, contextSnapshotId: snapshot.id });
  const originalCreate = f.fixture.repos.shots.create.bind(f.fixture.repos.shots);
  let calls = 0;
  f.fixture.repos.shots.create = record => {
    calls += 1;
    if (calls === 2) throw new Error('simulated storage failure');
    return originalCreate(record);
  };
  assert.throws(() => f.fixture.app.planning.approveGenerationRun({ generationRunId: generated.run.id }), /simulated storage failure/);
  assert.equal(f.fixture.repos.plans.list().length, 0);
  assert.equal(f.fixture.repos.planRevisions.list().length, 0);
  assert.equal(f.fixture.repos.shots.list().length, 0);
  assert.equal(f.fixture.repos.generationRuns.get(generated.run.id).status, 'awaiting_approval');
});

test('successful commands persist auditable domain events', async () => {
  const f = planningFixture();
  const snapshot = f.fixture.app.planningContext.build({ projectId: f.project.id, equipmentAssignmentIds: [f.assignment.id], projectReferenceLinkIds: [f.link.id] });
  const generated = await f.fixture.app.planning.createGenerationRun({ projectId: f.project.id, contextSnapshotId: snapshot.id });
  const approved = f.fixture.app.planning.approveGenerationRun({ generationRunId: generated.run.id });
  f.fixture.app.planning.confirmPlanRevision({ planRevisionId: approved.revision.id, expectedVersion: approved.revision.recordVersion });
  const eventTypes = f.fixture.repos.domainEvents.list().map(item => item.eventType);
  assert.ok(eventTypes.includes('GenerationRunApproved'));
  assert.ok(eventTypes.includes('PlanRevisionConfirmed'));
});

test('calendar and finance queries expose participant scope and day/week/month summaries', () => {
  const fixture = createFixture();
  const { project } = seedProject(fixture);
  const participant = fixture.app.sharing.assignParticipant({ projectId: project.id, role: 'assistant', displayName: '助理 A' });
  fixture.data.create('calendarEvents', { id: 'event-a', projectId: project.id, startAt: '2026-07-15T09:00:00+08:00', endAt: '2026-07-15T12:00:00+08:00', participantAssignmentIds: [participant.id], status: 'scheduled' });
  fixture.data.create('calendarEvents', { id: 'event-b', projectId: project.id, startAt: '2026-07-16T09:00:00+08:00', endAt: '2026-07-16T12:00:00+08:00', participantAssignmentIds: [], status: 'scheduled' });
  fixture.app.schedule.recordExpectedRevenue({ projectId: project.id, amount: 1000, occurredAt: '2026-07-15T10:00:00+08:00' });
  fixture.app.schedule.recordReceivedRevenue({ projectId: project.id, amount: 600, occurredAt: '2026-07-15T11:00:00+08:00' });
  fixture.app.schedule.recordExpense({ projectId: project.id, amount: 100, occurredAt: '2026-07-14T11:00:00+08:00' });
  const participantEvents = fixture.app.queries.calendar.getForParticipant(participant.id, { startAt: '2026-07-15T00:00:00+08:00', endAt: '2026-07-17T00:00:00+08:00' });
  assert.deepEqual(participantEvents.map(item => item.id), ['event-a']);
  const periods = fixture.app.queries.revenue.getPeriods({ projectId: project.id, now: '2026-07-15T08:00:00+08:00', timezone: 'Asia/Shanghai' });
  assert.equal(periods.today.expected, 1000);
  assert.equal(periods.today.received, 600);
  assert.equal(periods.today.expense, 0);
  assert.equal(periods.week.expense, 100);
  assert.equal(periods.month.netReceived, 500);
});

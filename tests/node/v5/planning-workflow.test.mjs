import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture, seedProject, validPlanOutput, FakePlanningGateway, FakeImageGateway } from './test-helpers.mjs';

function planningFixture({ imageFail = false } = {}) {
  const output = validPlanOutput({ referenceAssetId: 'ref-real-1', equipmentItemId: 'equipment-main' });
  const planningGateway = new FakePlanningGateway(output);
  const imageGateway = new FakeImageGateway({ fail: imageFail });
  const fixture = createFixture({ planningGateway, imageGateway });
  const { project } = seedProject(fixture);
  fixture.app.catalog.importEquipmentModels();
  const equipment = fixture.data.create('equipmentItems', { id: 'equipment-main', equipmentModelId: 'camera-sony-a7-iv', ownership: 'owned', quantity: 1, condition: 'good', availabilityStatus: 'available' });
  const equipmentAssignment = fixture.app.catalog.assignResourceToProject({ projectId: project.id, resourceType: 'equipment', resourceId: equipment.id, role: 'primary-camera', required: true });
  const unselected = fixture.app.catalog.addEquipmentItem({ equipmentModelId: 'camera-nikon-z8', ownership: 'rented' });
  fixture.app.catalog.assignResourceToProject({ projectId: project.id, resourceType: 'equipment', resourceId: unselected.id, role: 'backup-camera' });
  const venue = fixture.app.catalog.saveVenue({ name: '武康路街区', indoorOutdoor: 'outdoor', lightingNotes: '蓝调时刻后混合光源' });
  const venueAssignment = fixture.app.catalog.assignResourceToProject({ projectId: project.id, resourceType: 'venue', resourceId: venue.id, role: 'primary-location' });
  const talent = fixture.app.catalog.saveTalentProfile({ displayName: '模特 A', styleTags: ['时装'], consentStatus: 'granted', boundaries: '不拍摄后台更衣区域' });
  const talentAssignment = fixture.app.catalog.assignResourceToProject({ projectId: project.id, resourceType: 'talent', resourceId: talent.id, role: 'subject' });
  const reference = fixture.app.references.ingestAsset({ id: 'ref-real-1', assetKind: 'real_photo', sourceType: 'feishu', sourceId: 'feishu-ref-1', title: '蓝调霓虹参考', previewUrl: 'https://example.test/ref.jpg', contentHash: 'sha256-ref-1', verificationStatus: 'verified' }).asset;
  const referenceLink = fixture.app.references.selectForProject({ projectId: project.id, referenceAssetId: reference.id, role: 'mood', locked: true });
  return { fixture, project, planningGateway, imageGateway, equipmentAssignment, venueAssignment, talentAssignment, referenceLink };
}

test('planning context freezes only selected real resources and remains hash-stable', () => {
  const f = planningFixture();
  const command = {
    projectId: f.project.id,
    equipmentAssignmentIds: [f.equipmentAssignment.id],
    venueAssignmentId: f.venueAssignment.id,
    talentAssignmentIds: [f.talentAssignment.id],
    projectReferenceLinkIds: [f.referenceLink.id],
    knowledgeSources: [{ id: 'CHUNK-001', type: 'knowledge', kind: 'rag_chunk', title: '前景构图', sourceType: 'ronin-rag', excerpt: '使用前景建立空间层次', workflowStage: ['拍摄策划'], groundingStatus: 'metadata-only' }],
    knowledgeRetrieval: { mode: 'brief-auto-plus-manual', query: '城市人像 | 电影感', requestedRoles: ['composition'], coverage: { composition: 1 }, autoCount: 1, generatedAt: new Date().toISOString(), indexVersion: 'index-1' },
    lookRequest: { enabled: true, generateConceptImages: true, count: 4, colorIntent: '低饱和暖肤色', retouchIntent: '保留纹理' },
  };
  const first = f.fixture.app.planningContext.build(command);
  const second = f.fixture.app.planningContext.build(command);
  assert.equal(first.contextHash, second.contextHash);
  assert.deepEqual(first.equipment.map(item => item.equipmentItemId), ['equipment-main']);
  assert.equal(first.references[0].synthetic, false);
  assert.equal(first.knowledgeSources.length, 1);
  assert.equal(first.knowledgeSources[0].id, 'CHUNK-001');
  assert.equal(first.knowledgeSources[0].groundingStatus, 'metadata-only');
  assert.equal(first.knowledgeSources[0].requiresVerification, true);
  assert.equal(first.knowledgePolicy.forbidInventedParameters, true);
  assert.equal(first.knowledgeRetrieval.indexVersion, 'index-1');
  assert.equal('generatedAt' in first.knowledgeRetrieval, false);
  f.fixture.data.update('equipmentItems', 'equipment-main', { availabilityStatus: 'maintenance' });
  assert.equal(first.equipment[0].availabilityStatus, 'available');
});

test('generation run approval creates revision and shots once, then confirmation locks the revision', async () => {
  const f = planningFixture();
  const knowledgeSource = { id: 'CHUNK-001', type: 'knowledge', kind: 'rag_chunk', title: '前景构图', sourceType: 'ronin-rag', groundingStatus: 'metadata-only', selectionRole: 'composition', requiresVerification: true };
  f.planningGateway.output.knowledgeGuidance = [{ sourceId: 'CHUNK-001', title: '前景构图', role: 'composition', groundingStatus: 'metadata-only', verificationRequired: true }];
  f.planningGateway.output.verificationChecklist = ['打开原始来源核验前景构图的具体步骤'];
  f.planningGateway.output.postProductionGuidance = ['先统一曝光和白平衡'];
  f.planningGateway.output.expectedLook.knowledgeSourceIds = ['CHUNK-001'];
  f.planningGateway.output.expectedLook.styleKeywords = ['电影感'];
  f.planningGateway.output.expectedLook.knowledgeVerificationRequired = true;
  const snapshot = f.fixture.app.planningContext.build({
    projectId: f.project.id,
    equipmentAssignmentIds: [f.equipmentAssignment.id], venueAssignmentId: f.venueAssignment.id,
    talentAssignmentIds: [f.talentAssignment.id], projectReferenceLinkIds: [f.referenceLink.id],
    knowledgeSources: [knowledgeSource],
    lookRequest: { enabled: true, generateConceptImages: true, count: 2, colorIntent: '蓝橙', retouchIntent: '自然' },
  });
  const generated = await f.fixture.app.planning.createGenerationRun({ projectId: f.project.id, contextSnapshotId: snapshot.id, instruction: '保持真实街拍质感' });
  assert.equal(generated.run.status, 'awaiting_approval');
  assert.equal(f.planningGateway.calls.length, 1);
  const approved = f.fixture.app.planning.approveGenerationRun({ generationRunId: generated.run.id });
  assert.equal(approved.revision.status, 'candidate');
  assert.equal(approved.shots.length, 2);
  assert.equal(approved.revision.knowledgeGuidance[0].sourceId, 'CHUNK-001');
  assert.equal(approved.revision.verificationChecklist.length, 1);
  assert.deepEqual(approved.expectedLook.knowledgeSourceIds, ['CHUNK-001']);
  assert.equal(approved.expectedLook.knowledgeVerificationRequired, true);
  assert.equal(f.fixture.repos.shotReferenceLinks.list().length, 2);
  const repeated = f.fixture.app.planning.approveGenerationRun({ generationRunId: generated.run.id });
  assert.equal(repeated.idempotent, true);
  assert.equal(f.fixture.repos.planRevisions.list().length, 1);
  assert.equal(f.fixture.repos.shots.list().length, 2);
  const confirmed = f.fixture.app.planning.confirmPlanRevision({ planRevisionId: approved.revision.id, expectedVersion: approved.revision.recordVersion });
  assert.equal(confirmed.revision.status, 'confirmed');
  assert.equal(confirmed.plan.confirmedRevisionId, approved.revision.id);
});

test('expected look generation is optional, synthetic, and provider failure is non-blocking', async () => {
  const success = planningFixture();
  const snapshot = success.fixture.app.planningContext.build({ projectId: success.project.id, equipmentAssignmentIds: [success.equipmentAssignment.id], projectReferenceLinkIds: [success.referenceLink.id], lookRequest: { enabled: true, generateConceptImages: true, count: 2 } });
  const run = await success.fixture.app.planning.createGenerationRun({ projectId: success.project.id, contextSnapshotId: snapshot.id });
  const approved = success.fixture.app.planning.approveGenerationRun({ generationRunId: run.run.id });
  const images = await success.fixture.app.planning.requestExpectedLookImages({ planRevisionId: approved.revision.id, count: 2 });
  assert.equal(images.assets.length, 2);
  assert.ok(images.assets.every(item => item.synthetic === true));
  assert.equal(success.imageGateway.calls.length, 1);

  const failure = planningFixture({ imageFail: true });
  const failedSnapshot = failure.fixture.app.planningContext.build({ projectId: failure.project.id, equipmentAssignmentIds: [failure.equipmentAssignment.id], projectReferenceLinkIds: [failure.referenceLink.id], lookRequest: { enabled: true, generateConceptImages: true, count: 1 } });
  const failedRun = await failure.fixture.app.planning.createGenerationRun({ projectId: failure.project.id, contextSnapshotId: failedSnapshot.id });
  const failedApproved = failure.fixture.app.planning.approveGenerationRun({ generationRunId: failedRun.run.id });
  const failedImages = await failure.fixture.app.planning.requestExpectedLookImages({ planRevisionId: failedApproved.revision.id, count: 1 });
  assert.equal(failedImages.nonBlocking, true);
  assert.equal(failure.fixture.repos.planRevisions.get(failedApproved.revision.id).status, 'candidate');
});

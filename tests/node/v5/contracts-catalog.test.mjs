import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlanningContext, validatePlanGenerationOutput } from '../../../src/v5/contracts/validators.js';
import { AppError } from '../../../src/v5/common/errors.js';
import { createFixture, seedProject, validPlanOutput } from './test-helpers.mjs';

test('contracts reject synthetic references and malformed plan output', () => {
  assert.throws(() => validatePlanningContext({
    id: 'snapshot-1', projectId: 'project-1', brief: {}, equipment: [], references: [{ referenceAssetId: 'generated-1', synthetic: true }], constraints: [], createdAt: new Date().toISOString(), contextHash: 'fnv1a-12345678',
  }), error => error instanceof AppError && error.code === 'INVALID_PLANNING_CONTEXT');
  assert.throws(() => validatePlanGenerationOutput({ concept: 'x', rationale: 'y', preparationGuide: [], expectedDeliverableCount: 0, shots: [], risks: [] }), error => error.code === 'INVALID_PLAN_GENERATION_OUTPUT');
  assert.equal(validatePlanGenerationOutput(validPlanOutput()), true);
});

test('real equipment seed imports idempotently and supports aliases and custom gear', () => {
  const fixture = createFixture();
  const first = fixture.app.catalog.importEquipmentModels();
  assert.ok(first.total >= 50);
  assert.equal(first.inserted.length, first.total);
  const second = fixture.app.catalog.importEquipmentModels();
  assert.equal(second.inserted.length, 0);
  assert.equal(second.updated.length, 0);
  assert.equal(second.unchanged.length, first.total);
  const a7m4 = fixture.app.catalog.searchEquipmentModels('A7M4');
  assert.equal(a7m4[0].id, 'camera-sony-a7-iv');
  const owned = fixture.app.catalog.addEquipmentItem({ equipmentModelId: a7m4[0].id, ownership: 'owned', quantity: 1 });
  const custom = fixture.app.catalog.addEquipmentItem({ customName: '自制黑旗 60×90cm', ownership: 'owned', quantity: 2 });
  assert.equal(owned.equipmentModelId, 'camera-sony-a7-iv');
  assert.equal(custom.customName, '自制黑旗 60×90cm');
});

test('equipment, venue and talent are reusable global resources; project removal only removes relation', () => {
  const fixture = createFixture();
  fixture.app.catalog.importEquipmentModels();
  const p1 = seedProject(fixture, { id: 'project-a' }).project;
  const p2 = seedProject(fixture, { id: 'project-b' }).project;
  const equipment = fixture.app.catalog.addEquipmentItem({ equipmentModelId: 'camera-sony-a7-iv', ownership: 'owned' });
  const venue = fixture.app.catalog.saveVenue({ name: '自然光摄影棚', address: '上海', indoorOutdoor: 'indoor', features: ['白墙', '南向窗'] });
  const talent = fixture.app.catalog.saveTalentProfile({ displayName: '模特 A', styleTags: ['清冷', '平面'], consentStatus: 'granted' });
  const a1 = fixture.app.catalog.assignResourceToProject({ projectId: p1.id, resourceType: 'equipment', resourceId: equipment.id, role: 'primary-camera', required: true });
  fixture.app.catalog.assignResourceToProject({ projectId: p2.id, resourceType: 'equipment', resourceId: equipment.id, role: 'primary-camera' });
  fixture.app.catalog.assignResourceToProject({ projectId: p1.id, resourceType: 'venue', resourceId: venue.id, role: 'primary-location' });
  fixture.app.catalog.assignResourceToProject({ projectId: p1.id, resourceType: 'talent', resourceId: talent.id, role: 'subject' });
  fixture.app.catalog.removeResourceAssignment(a1.id);
  assert.ok(fixture.repos.equipmentItems.get(equipment.id));
  assert.equal(fixture.repos.resourceAssignments.list(item => item.resourceId === equipment.id).length, 1);
});

test('reference assets deduplicate globally and can link to multiple projects and a shot', () => {
  const fixture = createFixture();
  const p1 = seedProject(fixture, { id: 'project-ref-a' }).project;
  const p2 = seedProject(fixture, { id: 'project-ref-b' }).project;
  const first = fixture.app.references.ingestAsset({ assetKind: 'real_photo', sourceType: 'local', localPath: '/photos/ref.jpg', title: '窗边侧光', contentHash: 'sha256-abc', tags: ['侧光'] });
  const second = fixture.app.references.ingestAsset({ assetKind: 'real_photo', sourceType: 'feishu', sourceId: 'record-2', title: '同一张图更新标题', contentHash: 'sha256-abc', tags: ['人像'] });
  assert.equal(first.asset.id, second.asset.id);
  assert.equal(second.deduplicated, true);
  fixture.app.references.selectForProject({ projectId: p1.id, referenceAssetId: first.asset.id, role: 'lighting' });
  fixture.app.references.selectForProject({ projectId: p2.id, referenceAssetId: first.asset.id, role: 'mood' });
  const shot = fixture.data.create('shots', { id: 'shot-ref-1', projectId: p1.id, planId: 'plan-x', planRevisionId: 'revision-x', sequence: 1, scene: '测试镜头' });
  fixture.app.references.bindToShot({ shotId: shot.id, referenceAssetId: first.asset.id, role: 'lighting', locked: true });
  assert.equal(fixture.repos.referenceAssets.list().length, 1);
  assert.equal(fixture.repos.projectReferenceLinks.list().length, 2);
  assert.equal(fixture.repos.shotReferenceLinks.list().length, 1);
});

test('curated plan templates import idempotently and are searchable by shooting type', () => {
  const fixture = createFixture();
  const first = fixture.app.catalog.importPlanTemplates();
  assert.equal(first.total, 4);
  assert.equal(first.inserted.length, 4);
  const second = fixture.app.catalog.importPlanTemplates();
  assert.equal(second.inserted.length, 0);
  assert.equal(second.unchanged.length, 4);
  const portrait = fixture.app.catalog.searchPlanTemplates('人像', { shootingType: '模特拍摄' });
  assert.equal(portrait[0].id, 'plan-template-portrait-editorial');
  assert.ok(portrait[0].shotSkeletons.some(item => item.priority === 'must'));
});

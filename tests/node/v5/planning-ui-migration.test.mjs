import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFixture, FakePlanningGateway, seedProject, validPlanOutput } from './test-helpers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function setup() {
  const gateway = new FakePlanningGateway(validPlanOutput({ referenceAssetId: 'ref-ui', equipmentItemId: 'equipment-ui' }));
  const fixture = createFixture({ planningGateway: gateway });
  const { project } = seedProject(fixture);
  fixture.app.catalog.importEquipmentModels();
  const equipment = fixture.data.create('equipmentItems', { id: 'equipment-ui', equipmentModelId: 'camera-sony-a7-iv', ownership: 'owned', quantity: 1, availabilityStatus: 'available' });
  fixture.app.catalog.assignResourceToProject({ projectId: project.id, resourceType: 'equipment', resourceId: equipment.id, role: 'primary-camera' });
  const reference = fixture.app.references.ingestAsset({ id: 'ref-ui', title: 'UI real reference', sourceType: 'local', localPath: 'C:\\Photos\\ui.jpg', synthetic: false }).asset;
  fixture.app.references.selectForProject({ projectId: project.id, referenceAssetId: reference.id });
  return { fixture, project };
}

test('planning workspace query exposes draft first and formal records only after approval', async () => {
  const { fixture, project } = setup();
  const snapshot = fixture.app.planningContext.build({ projectId: project.id, lookRequest: { enabled: true, generateConceptImages: false } });
  const generated = await fixture.app.planning.createGenerationRun({ projectId: project.id, contextSnapshotId: snapshot.id });
  let workspace = fixture.app.queries.planningWorkspace.get(project.id);

  assert.equal(generated.run.status, 'awaiting_approval');
  assert.equal(workspace.generationRuns.length, 1);
  assert.equal(workspace.plans.length, 0);
  assert.equal(workspace.revisions.length, 0);
  assert.equal(workspace.shots.length, 0);

  const approved = fixture.app.planning.approveGenerationRun({ generationRunId: generated.run.id });
  workspace = fixture.app.queries.planningWorkspace.get(project.id);
  assert.equal(workspace.plans.length, 1);
  assert.equal(workspace.revisions.length, 1);
  assert.equal(workspace.shots.length, 2);
  assert.equal(workspace.getPlan(approved.plan.id).currentRevision.id, approved.revision.id);

  fixture.app.planning.confirmPlanRevision({ planRevisionId: approved.revision.id, expectedVersion: approved.revision.recordVersion });
  workspace = fixture.app.queries.planningWorkspace.get(project.id);
  assert.equal(workspace.revisions[0].status, 'confirmed');
  assert.equal(workspace.plans[0].confirmedRevisionId, approved.revision.id);
});

test('compatibility planning page orchestrates only V5 planning use cases', () => {
  const source = fs.readFileSync(path.join(root, 'src/pages/plan.js'), 'utf8');
  assert.match(source, /planningContext\.build/);
  assert.match(source, /planning\.createGenerationRun/);
  assert.match(source, /planning\.approveGenerationRun/);
  assert.match(source, /planning\.confirmPlanRevision/);
  assert.match(source, /planning\.requestExpectedLookImages/);
  assert.match(source, /queries\.planningWorkspace\.get/);
  assert.doesNotMatch(source, /ctx\.agent\./);
  assert.doesNotMatch(source, /ctx\.data\.(create|update|upsert|remove)\(['"](plans|shots|tasks|luts)['"]/);
  assert.doesNotMatch(source, /listByProject\(['"]references['"]/);
});

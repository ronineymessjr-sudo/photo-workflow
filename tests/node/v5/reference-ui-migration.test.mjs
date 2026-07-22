import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from '../../../src/v5/common/errors.js';
import { createFixture, seedProject } from './test-helpers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function setup() {
  const fixture = createFixture();
  const { project } = seedProject(fixture);
  const secondProject = fixture.data.create('projects', { id: 'project-2', title: 'Second', status: 'active' });
  const shot = fixture.data.create('shots', { id: 'shot-1', projectId: project.id, planId: 'plan-1', sequence: 1, scene: 'Street' });
  return { fixture, project, secondProject, shot };
}

test('reference ingest deduplicates normalized URLs and identical local files', () => {
  const { fixture } = setup();
  const urlFirst = fixture.app.references.ingestAsset({ title: 'URL A', sourceType: 'pexels', sourceUrl: 'https://example.test/photo?id=1&utm_source=test', synthetic: false });
  const urlAgain = fixture.app.references.ingestAsset({ title: 'URL B', sourceType: 'pexels', sourceUrl: 'https://example.test/photo?id=1', synthetic: false });
  const fileFirst = fixture.app.references.ingestAsset({ title: 'File A', sourceType: 'local', localPath: 'C:\\Photos\\same.jpg', synthetic: false });
  const fileAgain = fixture.app.references.ingestAsset({ title: 'File B', sourceType: 'local', localPath: 'C:\\Photos\\same.jpg', synthetic: false });

  assert.equal(urlAgain.deduplicated, true);
  assert.equal(urlAgain.asset.id, urlFirst.asset.id);
  assert.equal(fileAgain.deduplicated, true);
  assert.equal(fileAgain.asset.id, fileFirst.asset.id);
  assert.equal(fixture.repos.referenceAssets.list().length, 2);
});

test('project and shot reference links are independent and persist through reload', () => {
  const { fixture, project, secondProject, shot } = setup();
  const asset = fixture.app.references.ingestAsset({ title: 'Shared real photo', sourceType: 'local', localPath: 'C:\\Photos\\shared.jpg', synthetic: false }).asset;
  const projectOneLink = fixture.app.references.selectForProject({ projectId: project.id, referenceAssetId: asset.id });
  fixture.app.references.selectForProject({ projectId: secondProject.id, referenceAssetId: asset.id });
  const shotLink = fixture.app.references.bindToShot({ shotId: shot.id, referenceAssetId: asset.id, role: 'shotGuide' });

  fixture.app.references.removeShotLink(shotLink.id);
  assert.equal(fixture.repos.projectReferenceLinks.list(item => item.projectId === project.id).length, 1);
  fixture.app.references.removeProjectLink(projectOneLink.id);
  assert.ok(fixture.repos.referenceAssets.get(asset.id));
  assert.equal(fixture.repos.projectReferenceLinks.list(item => item.projectId === secondProject.id).length, 1);

  const reloaded = createFixture({ storage: fixture.storage });
  const model = reloaded.app.queries.referenceLibrary.getProject(secondProject.id);
  assert.equal(model.selectedReferences.length, 1);
  assert.equal(model.selectedReferences[0].asset.id, asset.id);
  assert.equal(model.shotBindings.length, 0);
});

test('shot binding rejects assets not selected for the shot project', () => {
  const { fixture, shot } = setup();
  const asset = fixture.app.references.ingestAsset({ title: 'Unselected', sourceType: 'local', localPath: 'C:\\Photos\\unselected.jpg', synthetic: false }).asset;
  assert.throws(
    () => fixture.app.references.bindToShot({ shotId: shot.id, referenceAssetId: asset.id }),
    error => error instanceof AppError && error.code === 'REFERENCE_NOT_SELECTED_FOR_PROJECT',
  );
});

test('synthetic concepts cannot be ingested or rendered as real reference assets', () => {
  const { fixture, project } = setup();
  assert.throws(
    () => fixture.app.references.ingestAsset({ title: 'AI concept', sourceType: 'generator', sourceUrl: 'https://example.test/ai.jpg', synthetic: true }),
    error => error instanceof AppError && error.code === 'SYNTHETIC_REFERENCE_REJECTED',
  );
  assert.equal(fixture.app.queries.referenceLibrary.getProject(project.id).assets.length, 0);
});

test('compatibility pages contain no legacy reference collection writes or shot reference field writes', () => {
  const referencesPage = fs.readFileSync(path.join(root, 'src/pages/references.js'), 'utf8');
  const planPage = fs.readFileSync(path.join(root, 'src/pages/plan.js'), 'utf8');
  assert.doesNotMatch(referencesPage, /ctx\.data\.(create|update|upsert|remove)\(['"]references['"]/);
  assert.doesNotMatch(planPage, /ctx\.data\.listByProject\(['"]references['"]/);
  assert.doesNotMatch(planPage, /referenceIds\s*:/);
  assert.doesNotMatch(planPage, /referenceBindings\s*:/);
  assert.match(referencesPage, /queries\.referenceLibrary\.getProject/);
  assert.match(referencesPage, /references\.ingestAsset/);
  assert.match(referencesPage, /references\.selectForProject/);
  assert.match(referencesPage, /projectKnowledgeSources/);
  assert.match(referencesPage, /data-import-obsidian-asset/);
  assert.doesNotMatch(referencesPage, /data-import-obsidian="/);
  assert.match(planPage, /references\.bindToShot/);
  assert.match(planPage, /references\.removeShotLink/);
});

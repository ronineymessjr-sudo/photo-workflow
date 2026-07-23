import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../../../src/v5/common/errors.js';
import { createFixture, seedProject } from './test-helpers.mjs';
import { checkPersonalLibraryHealth, searchPersonalLibrary } from '../../../src/legacy-knowledge-bridge.js';

function withWindow(overrides, fn) {
  const originalWindow = globalThis.window;
  globalThis.window = overrides;
  try { return fn(); }
  finally { globalThis.window = originalWindow; }
}

function withFetch(mock, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try { return fn(); }
  finally { globalThis.fetch = originalFetch; }
}

test('health check reports unavailable when Obsidian helper is not configured', async () => {
  await withWindow(undefined, async () => {
    const health = await checkPersonalLibraryHealth();
    assert.equal(health.available, false);
    assert.ok(health.reason);
  });
});

test('health check reports available when helper responds ok', async () => {
  const mockFetch = async (url) => {
    assert.match(url, /\/v1\/health/);
    return { ok: true, json: async () => ({ ok: true, count: 5 }) };
  };
  await withWindow({ getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124', libraryFolder: '.' }) }, async () => {
    await withFetch(mockFetch, async () => {
      const health = await checkPersonalLibraryHealth();
      assert.equal(health.available, true);
      assert.equal(health.count, 5);
      assert.equal(health.helper, 'http://localhost:8124');
    });
  });
});

test('health check silently degrades when helper is unreachable', async () => {
  const mockFetch = async () => { throw new Error('ECONNREFUSED'); };
  await withWindow({ getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124' }) }, async () => {
    await withFetch(mockFetch, async () => {
      const health = await checkPersonalLibraryHealth();
      assert.equal(health.available, false);
      assert.ok(health.reason);
    });
  });
});

test('searchPersonalLibrary silently degrades to empty array on failure', async () => {
  await withWindow({
    getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124' }),
    searchObsidianProxy: () => { throw new Error('proxy down'); },
  }, async () => {
    const results = await searchPersonalLibrary('portrait');
    assert.deepEqual(results, []);
  });
});

test('same real reference is reused across projects and shots without duplicate assets', () => {
  const fixture = createFixture();
  const { project } = seedProject(fixture);
  const secondProject = fixture.data.create('projects', { id: 'project-2', title: 'Second', status: 'active' });
  const shot1 = fixture.data.create('shots', { id: 'shot-1', projectId: project.id, planId: 'plan-1', sequence: 1, scene: 'Street' });
  const shot2 = fixture.data.create('shots', { id: 'shot-2', projectId: project.id, planId: 'plan-1', sequence: 2, scene: 'Portrait' });

  const asset = fixture.app.references.ingestAsset({
    title: 'Shared real photo',
    sourceType: 'local',
    localPath: 'C:\\Photos\\shared.jpg',
    synthetic: false,
  }).asset;

  fixture.app.references.selectForProject({ projectId: project.id, referenceAssetId: asset.id });
  fixture.app.references.selectForProject({ projectId: secondProject.id, referenceAssetId: asset.id });
  const link1 = fixture.app.references.bindToShot({ shotId: shot1.id, referenceAssetId: asset.id, role: 'shotGuide' });
  fixture.app.references.bindToShot({ shotId: shot2.id, referenceAssetId: asset.id, role: 'shotGuide' });

  assert.equal(fixture.repos.referenceAssets.list().length, 1, 'asset should be deduplicated');
  assert.equal(fixture.repos.projectReferenceLinks.list().length, 2, 'one link per project');
  assert.equal(fixture.repos.shotReferenceLinks.list().length, 2, 'one link per shot');

  fixture.app.references.removeShotLink(link1.id);
  assert.equal(fixture.repos.shotReferenceLinks.list().length, 1);
  assert.equal(fixture.repos.projectReferenceLinks.list(item => item.projectId === project.id).length, 1);

  const model = fixture.app.queries.referenceLibrary.getProject(project.id);
  assert.equal(model.selectedReferences.length, 1);
  assert.equal(model.shotBindings.length, 1);
  assert.equal(model.shotBindings[0].asset.id, asset.id);
});

test('synthetic concepts cannot be ingested as real reference assets', () => {
  const fixture = createFixture();
  seedProject(fixture);
  assert.throws(
    () => fixture.app.references.ingestAsset({ title: 'AI concept', sourceType: 'generator', sourceUrl: 'https://example.test/ai.jpg', synthetic: true }),
    error => error instanceof AppError && error.code === 'SYNTHETIC_REFERENCE_REJECTED',
  );
});

test('shot binding rejects assets not selected for the shot project', () => {
  const fixture = createFixture();
  const { project } = seedProject(fixture);
  const shot = fixture.data.create('shots', { id: 'shot-1', projectId: project.id, planId: 'plan-1', sequence: 1, scene: 'Street' });
  const asset = fixture.app.references.ingestAsset({ title: 'Unselected', sourceType: 'local', localPath: 'C:\\Photos\\unselected.jpg', synthetic: false }).asset;
  assert.throws(
    () => fixture.app.references.bindToShot({ shotId: shot.id, referenceAssetId: asset.id }),
    error => error instanceof AppError && error.code === 'REFERENCE_NOT_SELECTED_FOR_PROJECT',
  );
});

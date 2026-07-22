import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildReferenceDatabaseImportPlan } from '../../../src/v5/references/reference-database-importer.js';
import { createFixture } from './test-helpers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const database = JSON.parse(fs.readFileSync(path.join(root, 'assets/reference-database.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/demo/reference-manifest.json'), 'utf8'));

function createPlan() {
  return buildReferenceDatabaseImportPlan(database, {
    bundledAssets: manifest.items,
    availablePaths: manifest.items.map(item => item.localPath),
    generatedAt: '2026-07-15T00:00:00.000Z',
  });
}

test('reference database classifier imports only files that actually exist and keeps knowledge records separate', () => {
  const plan = createPlan();
  assert.equal(plan.databaseItemCount, 262);
  assert.equal(plan.stats.importableAssets, 12);
  assert.equal(plan.stats.unavailableLocalAssets, 25);
  assert.equal(plan.stats.sourceDescriptors, 237);
  assert.equal(plan.stats.ignored, 0);
  assert.ok(plan.assetInputs.every(item => item.synthetic === false));
  assert.ok(plan.assetInputs.every(item => item.localPath.startsWith('assets/demo/references/')));
  assert.ok(plan.sourceDescriptors.every(item => item.createsReferenceAsset === false));
  assert.ok(plan.unavailableAssets.every(item => item.relinkRequired === true));
});

test('bundled reference manifest matches the real files byte-for-byte', () => {
  assert.equal(manifest.assetCount, 12);
  for (const item of manifest.items) {
    const absolute = path.join(root, item.localPath);
    assert.equal(fs.existsSync(absolute), true, `${item.localPath} should exist`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(bytes.length, item.byteSize);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256);
    assert.equal(item.synthetic, undefined);
  }
});

test('reference import is idempotent and never promotes missing metadata records to photos', () => {
  const fixture = createFixture();
  const plan = createPlan();
  const first = fixture.app.referenceDatabaseImport.importPlan(plan);
  assert.equal(first.stats.imported, 12);
  assert.equal(first.stats.failed, 0);
  assert.equal(first.stats.unavailable, 25);
  assert.equal(fixture.repos.referenceAssets.list().length, 12);
  const second = fixture.app.referenceDatabaseImport.importPlan(plan);
  assert.equal(second.stats.imported, 0);
  assert.equal(second.stats.deduplicated, 12);
  assert.equal(fixture.repos.referenceAssets.list().length, 12);
  assert.ok(fixture.repos.referenceAssets.list().every(asset => asset.synthetic === false));
});

test('real data bootstrap imports catalogs without inventing ownership or personal project data', () => {
  const fixture = createFixture();
  const result = fixture.app.realDataBootstrap.bootstrap({ referenceImportPlan: createPlan() });
  assert.ok(result.summary.equipmentModels >= 50);
  assert.equal(result.summary.realReferenceAssets, 12);
  assert.equal(result.summary.referenceSources, 237);
  assert.equal(result.summary.relinkRequired, 25);
  assert.equal(result.createdUserData, false);
  assert.equal(fixture.repos.equipmentItems.list().length, 0);
  assert.equal(fixture.repos.talentProfiles.list().length, 0);
  assert.equal(fixture.repos.venues.list().length, 0);
  assert.equal(fixture.repos.projects.list().length, 0);
});

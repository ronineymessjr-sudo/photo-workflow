import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFixture, seedProject } from './test-helpers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('post workspace exposes global LUT presets and project jobs', () => {
  const fixture = createFixture(); const { project } = seedProject(fixture);
  const lut = fixture.app.post.importLutPreset({ name: 'Open look', sourceType: 'open-source', localPath: 'looks/open.cube' });
  const model = fixture.app.queries.postWorkspace.get(project.id);
  assert.equal(model.jobs.length, 0);
  assert.equal(model.lutPresets[0].id, lut.id);
});

test('post compatibility page uses the V5 post state machine without legacy plan or LUT writes', () => {
  const source = fs.readFileSync(path.join(root, 'src/pages/post.js'), 'utf8');
  assert.match(source, /queries\.postWorkspace\.get/);
  assert.match(source, /post\.start/);
  assert.match(source, /post\.advance/);
  assert.match(source, /post\.importLutPreset/);
  assert.match(source, /post\.selectLutPreset/);
  assert.doesNotMatch(source, /ctx\.data\.(create|update|upsert|remove)\(/);
  assert.doesNotMatch(source, /listByProject\(['"]luts['"]/);
});

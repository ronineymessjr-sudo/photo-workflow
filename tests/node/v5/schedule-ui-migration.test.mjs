import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFixture, seedProject } from './test-helpers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('schedule task commands persist and query through the V5 workspace', () => {
  const fixture = createFixture(); const { project } = seedProject(fixture);
  const task = fixture.app.schedule.createTask({ projectId: project.id, title: 'Charge batteries', phase: 'preproduction' });
  let model = fixture.app.queries.scheduleWorkspace.get(project.id);
  assert.equal(model.tasks.length, 1);
  fixture.app.schedule.updateTask({ taskId: task.id, expectedVersion: task.recordVersion, patch: { status: 'done' } });
  assert.equal(fixture.app.queries.scheduleWorkspace.get(project.id).tasks[0].status, 'done');
  fixture.app.schedule.removeTask(task.id);
  model = fixture.app.queries.scheduleWorkspace.get(project.id);
  assert.equal(model.tasks.length, 0);
});

test('schedule compatibility page uses V5 schedule, onset and query services only', () => {
  const source = fs.readFileSync(path.join(root, 'src/pages/schedule.js'), 'utf8');
  assert.match(source, /queries\.scheduleWorkspace\.get/);
  assert.match(source, /schedule\.createShootEvent/);
  assert.match(source, /schedule\.createTask/);
  assert.match(source, /onset\.startShoot/);
  assert.match(source, /onset\.updateShotCaptureStatus/);
  assert.match(source, /onset\.completeShoot/);
  assert.doesNotMatch(source, /ctx\.data\.(create|update|upsert|remove)\(/);
});

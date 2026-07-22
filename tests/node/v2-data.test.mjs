import test from 'node:test';
import assert from 'node:assert/strict';
import { DataService } from '../../src/services/data-service.js';

class MemoryRepository {
  constructor() { this.values = new Map(); }
  get(key, fallback = null) { return this.values.has(key) ? structuredClone(this.values.get(key)) : fallback; }
  set(key, value) { this.values.set(key, structuredClone(value)); return value; }
}

function installLegacyStorage(values) {
  globalThis.localStorage = {
    getItem(key) { return Object.hasOwn(values, key) ? values[key] : null; },
  };
}

test('v2 migration imports pw_schedule even when there are no legacy plans', () => {
  installLegacyStorage({
    pw_plans: '[]',
    pw_schedule: JSON.stringify([{ id: 'schedule-1', title: '夜景拍摄', date: '2026-07-11' }]),
  });
  const data = new DataService(new MemoryRepository());
  const project = data.migrateLegacy();
  assert.equal(project.id, 'legacy-default-project');
  assert.equal(data.listByProject('tasks', project.id).length, 1);
  assert.equal(data.listByProject('tasks', project.id)[0].title, '夜景拍摄');
});

test('v2 delete creates a sync tombstone and remote newer records win on merge', () => {
  installLegacyStorage({});
  const data = new DataService(new MemoryRepository());
  data.create('references', {
    id: 'ref-1', projectId: 'project-1', title: '旧标题',
    createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z',
  });
  data.mergeRemote('references', [{
    id: 'ref-1', projectId: 'project-1', title: '远端标题',
    createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2099-07-11T00:00:00.000Z',
  }]);
  assert.equal(data.get('references', 'ref-1').title, '远端标题');
  data.remove('references', 'ref-1');
  assert.deepEqual(data.listTombstones('project-1').map(item => item.id), ['ref-1']);
});

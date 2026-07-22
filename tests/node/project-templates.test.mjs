import test from 'node:test';
import assert from 'node:assert/strict';
import { StorageRepository } from '../../src/core/storage.js';
import { DataService } from '../../src/services/data-service.js';
import { getProjectTemplate, seedProjectTemplate } from '../../src/services/project-templates.js';

class FakeLocalStorage {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
}

test('project templates provide practical defaults without mutating source definitions', () => {
  const template = getProjectTemplate('commercial');
  assert.equal(template.defaults.shootingType, '商业');
  assert.ok(template.tasks.length >= 5);
  assert.equal(getProjectTemplate('unknown').label, '空白项目');
});

test('project starter tasks are deterministic and idempotent', () => {
  const local = new FakeLocalStorage();
  globalThis.localStorage = local;
  const storage = new StorageRepository('pa_v2_', local);
  const data = new DataService(storage);
  const project = data.create('projects', { id: 'project-template', title: '商业拍摄', templateId: 'commercial' });
  const first = seedProjectTemplate(data, project, 'commercial');
  const second = seedProjectTemplate(data, project, 'commercial');
  assert.equal(first.length, 5);
  assert.equal(second.length, 0);
  assert.ok(data.listByProject('tasks', project.id).every(item => item.templateId === 'commercial'));
});

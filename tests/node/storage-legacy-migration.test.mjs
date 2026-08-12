import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function loadStore(localStorage) {
  const sourcePath = path.resolve('C:\\Users\\user\\Documents\\trae-soio\\PhotoAtelier-V2.5-ToolDesk-Ready-2026-07-15\\src\\storage.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const context = {
    console,
    module: { exports: {} },
    exports: {},
  };
  context.globalThis = context;
  context.PhotoWorkflowDomain = {
    ENTITY_TYPES: ['plans', 'schedules', 'messages', 'reviews', 'shootRecords', 'meta'],
    nowIso: () => '2026-08-03T00:00:00.000Z',
    stableHash: () => 'hash',
    migrateLegacySnapshot(snapshot) {
      return {
        plans: snapshot.pw_plans || [],
        schedules: snapshot.pw_schedule || [],
        messages: snapshot.pw_messages || [],
        reviews: snapshot.pa_reviews || [],
        shootRecords: snapshot.pa_shoot_records || [],
        migratedAt: '2026-08-03T00:00:00.000Z',
        schemaVersion: 1,
      };
    },
  };
  vm.runInNewContext(source, context, { filename: sourcePath });
  return { store: context.module.exports, localStorage };
}

const probeMessage = {
  id: 'feedback-deploy-check-20260718',
  projectId: 'public-beta',
  type: 'beta-feedback',
  traceId: 'feedback-deploy-check-20260718',
  relatedId: 'system-check',
  metadataJson: { build: 'deploy-check', sessionId: 'system-check', source: 'public-beta' },
  createdAt: '2026-07-18T04:08:30.123Z',
  updatedAt: '2026-07-18T04:08:30.123Z',
};

const realMessage = {
  id: 'feedback-real-user-20260803',
  projectId: 'public-beta',
  type: 'beta-feedback',
  traceId: 'feedback-real-user-20260803',
  relatedId: 'session-42',
  metadataJson: { build: 'public-beta-2026.08', sessionId: 'session-42', source: 'public-beta' },
  createdAt: '2026-08-03T01:20:00.000Z',
  updatedAt: '2026-08-03T01:20:00.000Z',
};

test('migrateLegacy prunes historical public-beta probes even after migration already completed', async () => {
  const localStorage = createStorage({
    pa_indexeddb_migration_v1: JSON.stringify({
      completed: true,
      schemaVersion: 1,
      completedAt: '2026-07-20T00:00:00.000Z',
      counts: { plans: 0, schedules: 0, messages: 2 },
    }),
    pw_messages: JSON.stringify([probeMessage, realMessage]),
  });
  const { store } = loadStore(localStorage);

  const result = await store.migrateLegacy(localStorage);

  assert.equal(result.completed, true);
  assert.deepEqual(JSON.parse(localStorage.getItem('pw_messages')), [realMessage]);
});

test('migrateLegacy carries the pruned message set into first-run migration counts', async () => {
  const localStorage = createStorage({
    pw_messages: JSON.stringify([probeMessage, realMessage]),
  });
  const { store } = loadStore(localStorage);

  const result = await store.migrateLegacy(localStorage);

  assert.equal(result.counts.messages, 1);
  assert.deepEqual(JSON.parse(localStorage.getItem('pw_messages')), [realMessage]);
});

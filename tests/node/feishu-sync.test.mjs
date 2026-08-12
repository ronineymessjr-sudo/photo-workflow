import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
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

function loadFeishuSyncContext(overrides = {}) {
  const localStorage = createStorage({
    pa_feishu_enabled: 'true',
    pa_feishu_sync_token: 'sync-token',
    pw_messages: JSON.stringify([{
      id: 'feedback-deploy-check-20260718',
      projectId: 'public-beta',
      type: 'beta-feedback',
      traceId: 'feedback-deploy-check-20260718',
      relatedId: 'system-check',
      metadataJson: { build: 'deploy-check', sessionId: 'system-check', source: 'public-beta' },
      createdAt: '2026-07-18T04:08:30.123Z',
      updatedAt: '2026-07-18T04:08:30.123Z',
    }]),
    ...(overrides.localStorage || {}),
  });
  const removed = [];
  const bulkPutCalls = [];
  const window = {
    PhotoWorkflowDomain: {
      ENTITY_TYPES: ['projects', 'references', 'plans', 'shots', 'tasks', 'luts', 'reviews', 'messages'],
      nowIso: () => '2026-08-01T00:00:00.000Z',
      stableHash: () => 'hash',
    },
    PhotoWorkflowStore: {
      getAll: async () => [],
      bulkPut: async (storeName, items) => {
        bulkPutCalls.push({ storeName, items: structuredClone(items) });
        return items;
      },
      remove: async (storeName, id) => {
        removed.push({ storeName, id });
      },
    },
    localStorage,
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    clearTimeout: () => {},
    setTimeout: () => 1,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    console,
  };
  window.window = window;
  window.globalThis = window;
  window.fetch = overrides.fetch || (async (url) => {
    const match = String(url).match(/\/api\/feishu\/([a-z-]+)\/records$/);
    const entity = match?.[1] || '';
    if (entity === 'messages') {
      return {
        ok: true,
        async json() {
          return {
            records: [
              {
                id: 'feedback-deploy-check-20260718',
                projectId: 'public-beta',
                type: 'beta-feedback',
                traceId: 'feedback-deploy-check-20260718',
                relatedId: 'system-check',
                metadataJson: { build: 'deploy-check', sessionId: 'system-check', source: 'public-beta' },
                createdAt: '2026-07-18T04:08:30.123Z',
                updatedAt: '2026-07-18T04:08:30.123Z',
              },
              {
                id: 'feedback-real-user-20260801',
                projectId: 'public-beta',
                type: 'beta-feedback',
                traceId: 'feedback-real-user-20260801',
                relatedId: 'session-42',
                metadataJson: { build: 'public-beta-2026.08', sessionId: 'session-42', source: 'public-beta' },
                createdAt: '2026-08-01T01:20:00.000Z',
                updatedAt: '2026-08-01T01:20:00.000Z',
              },
            ],
          };
        },
      };
    }
    return {
      ok: true,
      async json() {
        return { records: [] };
      },
    };
  });

  const sourcePath = path.resolve('C:\\Users\\user\\Documents\\trae-soio\\PhotoAtelier-V2.5-ToolDesk-Ready-2026-07-15\\src\\feishu-sync.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  vm.runInNewContext(source, window, { filename: sourcePath });
  return { window, localStorage, removed, bulkPutCalls };
}

test('pullAll prunes historical public-beta probes from local message cache', async () => {
  const { window, localStorage, removed, bulkPutCalls } = loadFeishuSyncContext();

  const summary = await window.PhotoAtelierFeishu.pullAll();

  assert.equal(summary.messages, 2);
  assert.deepEqual(JSON.parse(localStorage.getItem('pw_messages')), [{
    id: 'feedback-real-user-20260801',
    projectId: 'public-beta',
    type: 'beta-feedback',
    traceId: 'feedback-real-user-20260801',
    relatedId: 'session-42',
    metadataJson: { build: 'public-beta-2026.08', sessionId: 'session-42', source: 'public-beta' },
    createdAt: '2026-08-01T01:20:00.000Z',
    updatedAt: '2026-08-01T01:20:00.000Z',
  }]);
  assert.deepEqual(removed, [{ storeName: 'messages', id: 'feedback-deploy-check-20260718' }]);
  assert.deepEqual(bulkPutCalls.find(call => call.storeName === 'messages')?.items, [{
    id: 'feedback-real-user-20260801',
    projectId: 'public-beta',
    type: 'beta-feedback',
    traceId: 'feedback-real-user-20260801',
    relatedId: 'session-42',
    metadataJson: { build: 'public-beta-2026.08', sessionId: 'session-42', source: 'public-beta' },
    createdAt: '2026-08-01T01:20:00.000Z',
    updatedAt: '2026-08-01T01:20:00.000Z',
  }]);
});

test('collectLocal excludes historical public-beta probes from push payloads', async () => {
  const { window } = loadFeishuSyncContext();

  const local = await window.PhotoAtelierFeishu.collectLocal();

  assert.equal(local.messages.length, 0);
});

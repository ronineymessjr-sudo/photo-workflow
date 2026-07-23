import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getObsidianSettings,
  saveObsidianSettings,
  getLibraryStructure,
  preparePersonalLibrary,
  testPersonalLibraryConnection,
  getPersonalLibraryHealth,
  initializeController,
  runHealthCheck,
  runPrepareLibrary,
  updateSettings,
  getControllerState,
} from '../../../src/obsidian-library-onboarding.js';
import { getPersonalLibraryHealth as bridgeGetHealth } from '../../../src/legacy-knowledge-bridge.js';

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

test('library structure is explained in photographer language', () => {
  const structure = getLibraryStructure();
  assert.equal(structure.length, 1);
  assert.equal(structure[0].name, 'PhotoAtelier');
  const names = structure[0].children.map(child => child.name);
  assert.deepEqual(names, ['Reference Inbox', 'Shoot Notes', 'Reviews']);
});

test('default state is not_configured when no settings', () => {
  withWindow({}, () => {
    const state = initializeController();
    assert.equal(state.status, 'not_configured');
    assert.equal(state.settings.helperBaseUrl, '');
  });
});

test('loading settings transitions to ready_to_test', () => {
  withWindow({
    getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124', libraryFolder: 'PhotoAtelier' }),
  }, () => {
    const state = initializeController();
    assert.equal(state.status, 'ready_to_test');
    assert.equal(state.settings.helperBaseUrl, 'http://localhost:8124');
  });
});

test('testConnection returns connected when health is reachable', async () => {
  await withWindow({
    getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124', libraryFolder: 'PhotoAtelier' }),
    PhotoAtelierKnowledge: {
      checkPersonalLibraryHealth: async () => ({ available: true, count: 5, healthResult: 'reachable' }),
    },
  }, async () => {
    const result = await testPersonalLibraryConnection();
    assert.equal(result.status, 'connected');
    assert.equal(result.available, true);
    assert.equal(result.healthResult, 'reachable');
    assert.equal(result.count, 5);
  });
});

test('testConnection returns unavailable on service error', async () => {
  await withWindow({
    getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124' }),
    PhotoAtelierKnowledge: {
      checkPersonalLibraryHealth: async () => ({ available: false, reason: '服务无响应', healthResult: 'service_unavailable' }),
    },
  }, async () => {
    const result = await testPersonalLibraryConnection();
    assert.equal(result.status, 'unavailable');
    assert.equal(result.healthResult, 'service_unavailable');
  });
});

test('testConnection returns needs_repair on unauthorized', async () => {
  await withWindow({
    getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124' }),
    PhotoAtelierKnowledge: {
      checkPersonalLibraryHealth: async () => ({ available: false, reason: '未授权', healthResult: 'unauthorized' }),
    },
  }, async () => {
    const result = await testPersonalLibraryConnection();
    assert.equal(result.status, 'needs_repair');
    assert.equal(result.healthResult, 'unauthorized');
  });
});

test('prepareLibrary does not fake creation when no writable endpoint exists', async () => {
  await withWindow({
    getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124' }),
    PhotoAtelierKnowledge: { checkPersonalLibraryHealth: async () => ({ available: false }) },
  }, async () => {
    const result = await preparePersonalLibrary();
    assert.equal(result.prepared, false);
    assert.ok(result.manualStructure);
    assert.ok(result.architectureDecision);
    assert.ok(result.architectureDecision.includes('POST /v1/library/prepare'));
    assert.equal(result.testAgain, true);
  });
});

test('controller runHealthCheck transitions state to connected', async () => {
  await withWindow({
    getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124' }),
    PhotoAtelierKnowledge: {
      checkPersonalLibraryHealth: async () => ({ available: true, count: 3, healthResult: 'reachable' }),
    },
  }, async () => {
    initializeController();
    const result = await runHealthCheck();
    assert.equal(result.status, 'connected');
    const state = getControllerState();
    assert.equal(state.status, 'connected');
  });
});

test('controller updateSettings persists values and transitions state', () => {
  withWindow({ localStorage: { getItem: () => null, setItem: () => {} } }, () => {
    initializeController();
    const state = updateSettings({ helperBaseUrl: 'http://localhost:8124', libraryFolder: 'PhotoAtelier' });
    assert.equal(state.status, 'ready_to_test');
    assert.equal(state.settings.helperBaseUrl, 'http://localhost:8124');
  });
});

test('bridge exposes stable getPersonalLibraryHealth usable by other packages', async () => {
  const mockFetch = async () => ({ ok: true, json: async () => ({ ok: true, count: 7 }) });
  await withWindow({
    getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124' }),
  }, async () => {
    await withFetch(mockFetch, async () => {
      const health = await bridgeGetHealth();
      assert.equal(health.available, true);
      assert.equal(health.healthResult, 'reachable');
      assert.equal(health.count, 7);
    });
  });
});

test('bridge health reports specific results for unauthorized, path missing, service unavailable', async () => {
  const cases = [
    { status: 401, expected: 'unauthorized' },
    { status: 404, expected: 'path_missing' },
    { status: 503, expected: 'service_unavailable' },
  ];
  for (const { status, expected } of cases) {
    const mockFetch = async () => ({ ok: false, status, json: async () => ({ ok: false }) });
    await withWindow({
      getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124' }),
    }, async () => {
      await withFetch(mockFetch, async () => {
        const health = await bridgeGetHealth();
        assert.equal(health.healthResult, expected, `expected ${expected} for status ${status}`);
      });
    });
  }
});

test('onboarding getPersonalLibraryHealth delegates to bridge and keeps status stable', async () => {
  await withWindow({
    getObsidianSettings: () => ({ helperBaseUrl: 'http://localhost:8124' }),
    PhotoAtelierKnowledge: {
      getPersonalLibraryHealth: async () => ({ available: true, count: 4, healthResult: 'reachable' }),
    },
  }, async () => {
    const health = await getPersonalLibraryHealth();
    assert.equal(health.status, 'connected');
    assert.equal(health.available, true);
    assert.equal(health.count, 4);
  });
});

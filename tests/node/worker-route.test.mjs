import test from 'node:test';
import assert from 'node:assert/strict';

const LEGACY_API_BASE = 'https://photoatelier-v2-api.photomagic.workers.dev';

test('ApiClient selects same-origin API in production and keeps local development compatible', async () => {
  const previousLocation = globalThis.location;
  globalThis.location = { hostname: 'photoatelier.pages.dev' };
  const { ApiClient } = await import(`../../src/core/api-client.js?test=${Date.now()}`);

  const production = new ApiClient({
    get(_key, defaults) { return defaults; },
  });
  assert.equal(production.settings.apiBase, '/api/worker');

  const migrated = new ApiClient({
    get() { return { remoteEnabled: true, apiBase: LEGACY_API_BASE, syncToken: '' }; },
  });
  assert.equal(migrated.settings.apiBase, '/api/worker');

  globalThis.location = { hostname: '127.0.0.1' };
  const { ApiClient: LocalApiClient } = await import(`../../src/core/api-client.js?test=${Date.now() + 1}`);
  const local = new LocalApiClient({
    get(_key, defaults) { return defaults; },
  });
  assert.equal(local.settings.apiBase, LEGACY_API_BASE);

  if (previousLocation === undefined) delete globalThis.location;
  else globalThis.location = previousLocation;
});

test('same-origin Worker route forwards method, query and authorization headers', async () => {
  const previousFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (target, options) => {
    forwarded = { target: String(target), options };
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const { onRequest } = await import(`../../functions/api/worker/[[path]].js?test=${Date.now()}`);
    const request = new Request('https://photoatelier.pages.dev/api/worker/api/v1/agent/plans/draft?source=test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PhotoAtelier-Token': 'test-token',
      },
      body: JSON.stringify({ project_id: 'project-1' }),
    });
    const response = await onRequest({
      request,
      env: {},
      params: { path: ['api', 'v1', 'agent', 'plans', 'draft'] },
    });

    assert.equal(response.status, 200);
    assert.equal(forwarded.target, `${LEGACY_API_BASE}/api/v1/agent/plans/draft?source=test`);
    assert.equal(forwarded.options.method, 'POST');
    assert.equal(forwarded.options.headers.get('X-PhotoAtelier-Token'), 'test-token');
    assert.equal(forwarded.options.headers.has('host'), false);
    assert.equal(forwarded.options.headers.get('X-Forwarded-Host'), 'photoatelier.pages.dev');
    assert.deepEqual(await forwarded.options.body.getReader().read().then(({ value }) => JSON.parse(new TextDecoder().decode(value))), { project_id: 'project-1' });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('same-origin health route forwards without a request body', async () => {
  const previousFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (target, options) => {
    forwarded = { target: String(target), options };
    return Response.json({ ok: true });
  };

  try {
    const { onRequest } = await import(`../../functions/api/worker/[[path]].js?test=${Date.now() + 2}`);
    const response = await onRequest({
      request: new Request('https://photoatelier.pages.dev/api/worker/api/health'),
      env: {},
      params: { path: ['api', 'health'] },
    });
    assert.equal(response.status, 200);
    assert.equal(forwarded.target, `${LEGACY_API_BASE}/api/health`);
    assert.equal(forwarded.options.body, undefined);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

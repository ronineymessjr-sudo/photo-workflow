import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequest } from '../functions/api/[[path]].js';

const realFetch = globalThis.fetch;

function contextFor(path, init = {}) {
    return {
        request: new Request(`https://photo.ronineymessjrstudio.cn${path}`, init),
    };
}

function withUpstream(handler, run) {
    globalThis.fetch = async (url, init) => {
        const calls = handler(url, init);
        return calls;
    };
    return run().finally(() => { globalThis.fetch = realFetch; });
}

test('proxies the path and query to the Workers API host', async () => {
    let seen;
    await withUpstream(
        (url, init) => { seen = { url: String(url), host: init.headers.get('host'), method: init.method }; return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }); },
        async () => {
            const response = await onRequest(contextFor('/api/ai/studio/feishu/status?x=1'));
            assert.equal(seen.url, 'https://photoatelier-api.photomagic.workers.dev/api/ai/studio/feishu/status?x=1');
            assert.equal(seen.method, 'GET');
            assert.equal(seen.host, 'photoatelier-api.photomagic.workers.dev', '上游必须看到自己的 host');
            assert.equal(response.status, 200);
            assert.equal(await response.text(), '{"ok":true}');
        },
    );
});

test('forwards POST bodies and does not leak hop-by-hop headers', async () => {
    let seen;
    await withUpstream(
        (url, init) => { seen = { method: init.method, connection: init.headers.get('connection'), length: init.headers.get('content-length') }; return new Response('{}', { status: 201, headers: { 'content-type': 'application/json' } }); },
        async () => {
            const response = await onRequest(contextFor('/api/continuity/init', {
                method: 'POST',
                headers: { 'content-type': 'application/json', connection: 'keep-alive' },
                body: JSON.stringify({ a: 1 }),
            }));
            assert.equal(seen.method, 'POST');
            assert.equal(seen.connection, null, 'hop-by-hop 头不能透传');
            assert.equal(response.status, 201);
        },
    );
});

test('keeps upstream error statuses instead of turning everything into 200', async () => {
    await withUpstream(
        () => new Response('{"error":"bad"}', { status: 409, headers: { 'content-type': 'application/json' } }),
        async () => {
            const response = await onRequest(contextFor('/api/continuity/reference', { method: 'POST', body: '{}' }));
            assert.equal(response.status, 409);
        },
    );
});

test('strips content-encoding because the body is re-streamed', async () => {
    await withUpstream(
        () => new Response('{"ok":1}', { status: 200, headers: { 'content-type': 'application/json', 'content-encoding': 'gzip', 'content-length': '999' } }),
        async () => {
            const response = await onRequest(contextFor('/api/continuity/schema'));
            assert.equal(response.headers.get('content-encoding'), null);
            assert.equal(response.headers.get('content-length'), null);
        },
    );
});

test('reports an unreachable upstream as 502 with the target host', async () => {
    globalThis.fetch = async () => { throw new Error('connect timeout'); };
    try {
        const response = await onRequest(contextFor('/api/continuity/schema'));
        assert.equal(response.status, 502);
        const body = await response.json();
        assert.equal(body.code, 'API_PROXY_UNREACHABLE');
        assert.match(body.target, /workers\.dev/);
    } finally {
        globalThis.fetch = realFetch;
    }
});

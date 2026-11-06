import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import worker from '../api/index.js';

const env = { JWT_SECRET: 'unit-only-secret', SUPABASE_URL: 'db.example.test', SUPABASE_ANON_KEY: 'unit-only-key', SUPABASE_SERVICE_KEY: 'unit-only-server-key' };
const email = 'private-person@example.test';
const password = 'private-password-test';
const id = '9cbecc49-9cde-4c60-9769-3c9767a94522';
const hash = createHash('sha256').update(password + 'photoatelier_salt_2025').digest('hex');

async function loginWith(fetchImpl, input = { email, password }, config = env) {
    const oldFetch = globalThis.fetch;
    const oldLog = console.log;
    const logs = [];
    globalThis.fetch = fetchImpl;
    console.log = line => logs.push(JSON.parse(line));
    try {
        const response = await worker.fetch(new Request('https://api.example.test/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://photo-workflow.pages.dev' }, body: JSON.stringify(input),
        }), config);
        return { response, logs, body: await response.json() };
    } finally { globalThis.fetch = oldFetch; console.log = oldLog; }
}

test('successful real login produces a timestamped, pseudonymous server event', async () => {
    const result = await loginWith(async () => Response.json([{ id, email, password_hash: hash }]));
    assert.equal(result.response.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.logs.length, 1);
    const event = result.logs[0];
    assert.equal(event.event, 'web_auth_success');
    assert.equal(event.action, 'login');
    assert.equal(event.origin_host, 'photo-workflow.pages.dev');
    assert.equal(event.traffic_class, 'user_or_bot');
    assert.match(event.actor_hash, /^[a-f0-9]{24}$/);
    assert.ok(Number.isFinite(Date.parse(event.occurred_at)));
    assert.equal(event.request_id, result.response.headers.get('X-Request-Id'));
    const output = JSON.stringify(result.logs);
    for (const secret of [email, password, id, result.body.token, env.JWT_SECRET, env.SUPABASE_ANON_KEY, env.SUPABASE_SERVICE_KEY]) assert.ok(!output.includes(secret));
});

test('legacy login uses a server-only key and supports URL or hostname configuration', async () => {
    for (const base of ['db.example.test', 'https://db.example.test/']) {
        const result = await loginWith(async (url, options) => {
            assert.equal(new URL(url).origin, 'https://db.example.test');
            assert.equal(new URL(url).pathname, '/rest/v1/users');
            assert.equal(new URL(url).searchParams.get('select'), 'id,email,password_hash');
            assert.equal(options.headers.apikey, env.SUPABASE_SERVICE_KEY);
            assert.equal(options.headers.Authorization, `Bearer ${env.SUPABASE_SERVICE_KEY}`);
            return Response.json([{ id, email, password_hash: hash }]);
        }, { email, password }, { ...env, SUPABASE_URL: base });
        assert.equal(result.response.status, 200);
        assert.ok(!JSON.stringify(result.body).includes(hash));
    }
});

test('modern server secret stays in apikey, not an invalid JWT Authorization header', async () => {
    const result = await loginWith(async (_url, options) => {
        assert.equal(options.headers.apikey, 'sb_secret_unit_only');
        assert.equal(options.headers.Authorization, undefined);
        return Response.json([{ id, email, password_hash: hash }]);
    }, { email, password }, { ...env, SUPABASE_SERVICE_KEY: 'sb_secret_unit_only' });
    assert.equal(result.response.status, 200);
});

test('missing server key cannot fall back to anonymous user-table access', async () => {
    const result = await loginWith(async () => assert.fail('must not call database'), { email, password }, { ...env, SUPABASE_SERVICE_KEY: undefined });
    assert.equal(result.response.status, 503);
});

test('private data routes do not reach the database without a valid application session', async () => {
    const oldFetch = globalThis.fetch;
    const oldLog = console.log;
    globalThis.fetch = async () => assert.fail('unauthenticated request must not access private data');
    console.log = () => {};
    try {
        for (const route of ['/api/schedules', '/api/plans', '/api/messages', '/api/dashboard/stats']) {
            const response = await worker.fetch(new Request(`https://api.example.test${route}`), env);
            assert.equal(response.status, 401);
        }
    } finally { globalThis.fetch = oldFetch; console.log = oldLog; }
});

test('authenticated schedule and message reads and deletes retain owner filters', async () => {
    const login = await loginWith(async () => Response.json([{ id, email, password_hash: hash }]));
    const oldFetch = globalThis.fetch;
    const oldLog = console.log;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        const parsed = new URL(url);
        calls.push({ parsed, options });
        return Response.json(options.method === 'DELETE' ? null : [{ id: 'owned-item' }]);
    };
    console.log = () => {};
    try {
        for (const resource of ['schedules', 'messages']) {
            for (const method of ['GET', 'DELETE']) {
                const path = `/api/${resource}${method === 'DELETE' ? '/owned-item' : ''}`;
                const response = await worker.fetch(new Request(`https://api.example.test${path}`, {
                    method, headers: { Authorization: `Bearer ${login.body.token}` },
                }), env);
                assert.equal(response.status, 200);
            }
        }
        assert.equal(calls.length, 6);
        for (const { parsed, options } of calls) {
            assert.equal(parsed.searchParams.get('user_id'), `eq.${id}`);
            assert.equal(options.headers.apikey, env.SUPABASE_SERVICE_KEY);
        }
    } finally { globalThis.fetch = oldFetch; console.log = oldLog; }
});

test('wrong password cannot produce a success event', async () => {
    const result = await loginWith(async () => Response.json([{ id, email, password_hash: 'wrong' }]));
    assert.equal(result.response.status, 401);
    assert.equal(result.logs[0].event, 'web_auth_failure');
    assert.equal(result.logs[0].actor_hash, undefined);
});

test('database outage fails closed and cannot fall through into signup', async () => {
    let calls = 0;
    const result = await loginWith(async () => { calls++; return Response.json({ message: 'private backend detail' }, { status: 503 }); });
    assert.equal(calls, 1);
    assert.equal(result.response.status, 503);
    assert.equal(result.logs[0].event, 'web_auth_failure');
    assert.ok(!JSON.stringify(result).includes('private backend detail'));
});

test('explicit synthetic registration is kept separate from genuine users', async () => {
    let calls = 0;
    const result = await loginWith(async () => Response.json(++calls === 1 ? [] : [{ id, email: 'qa@example.invalid' }]), { email: 'qa@example.invalid', password });
    assert.equal(result.response.status, 201);
    assert.equal(result.logs[0].event, 'web_auth_success');
    assert.equal(result.logs[0].action, 'signup');
    assert.equal(result.logs[0].traffic_class, 'synthetic');
});

test('health probes and arbitrary request queries cannot pollute user or sensitive logs', async () => {
    const oldLog = console.log;
    const logs = [];
    console.log = line => logs.push(JSON.parse(line));
    try {
        const response = await worker.fetch(new Request('https://api.example.test/api/health?token=private-query'), {});
        assert.equal(response.status, 200);
        assert.equal(logs[0].traffic_class, 'maintenance');
        assert.equal(logs[0].event, 'web_request');
        assert.ok(!JSON.stringify(logs).includes('private-query'));
    } finally { console.log = oldLog; }
});

test('production metadata and sitemap consistently identify the current official domain', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const robots = await readFile(new URL('../robots.txt', import.meta.url), 'utf8');
    const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
    assert.match(html, /rel="canonical" href="https:\/\/photo\.ronineymessjrstudio\.cn\/"/);
    assert.match(html, /property="og:url" content="https:\/\/photo\.ronineymessjrstudio\.cn\/"/);
    assert.match(robots, /Sitemap: https:\/\/photo\.ronineymessjrstudio\.cn\/sitemap\.xml/);
    assert.match(sitemap, /<loc>https:\/\/photo\.ronineymessjrstudio\.cn\/<\/loc>/);
    assert.ok(!(robots + sitemap + html.slice(0, 1500)).includes('ronineymessjr-sudo.github.io'));
    const verification = await readFile(new URL('../google67c093daaeda8997.html', import.meta.url), 'utf8');
    assert.equal(verification.trim(), 'google-site-verification: google67c093daaeda8997.html');
});

test('analytics only loads on production, with a maintenance opt-out', async () => {
    const script = await readFile(new URL('../assets/web-analytics.js', import.meta.url), 'utf8');
    function load(hostname, search = '') {
        const inserted = [];
        runInNewContext(script, { location: { hostname, search }, URLSearchParams, document: { createElement: () => ({ dataset: {} }), head: { appendChild: e => inserted.push(e) } } });
        return inserted;
    }
    const [beacon] = load('photo-workflow.pages.dev');
    assert.equal(beacon.src, 'https://static.cloudflareinsights.com/beacon.min.js');
    assert.equal(JSON.parse(beacon.dataset.cfBeacon).token, '89a1868d30784e858ece00474ede41fc');
    const [officialBeacon] = load('photo.ronineymessjrstudio.cn');
    assert.equal(officialBeacon.src, beacon.src);
    assert.equal(JSON.parse(officialBeacon.dataset.cfBeacon).token, '89a1868d30784e858ece00474ede41fc');
    assert.equal(load('localhost').length, 0);
    assert.equal(load('preview.photo-workflow.pages.dev').length, 0);
    assert.equal(load('photo-workflow.pages.dev', '?maintenance=1').length, 0);
    const config = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
    assert.match(config, /\[observability\]\s+enabled = true/);
    assert.match(config, /invocation_logs = false/);
});

async function browserLogin(login) {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const handler = html.match(/window\.handleLogin = async function\(\) \{[\s\S]*?\n    \};/)[0];
    const values = new Map();
    const notices = [];
    const nodes = Object.fromEntries(['loginEmail', 'loginPassword', 'loginForm', 'loginLoading', 'welcomeEmail'].map(id => [id, { style: {}, value: '' }]));
    nodes.loginEmail.value = email;
    nodes.loginPassword.value = password;
    const result = await runInNewContext(`
        const TOKEN_KEY = 'pw_token', USER_KEY = 'pw_user', USE_LOCAL_MODE = false;
        let USE_GUEST_MODE = true, USE_BROWSER_STORAGE = true;
        ${handler}
        (async () => {
            await window.handleLogin();
            return { guest: USE_GUEST_MODE, browserStorage: USE_BROWSER_STORAGE };
        })();
    `, {
        window: { api: { login }, PhotoAtelierAccountStorage: { activate: async () => {} } },
        location: { reload: () => {} },
        document: { getElementById: id => nodes[id] },
        localStorage: { setItem: (k, v) => values.set(k, v) },
        localApi: { login: () => assert.fail('cloud login must not become local') },
        toast: (text, kind) => notices.push({ text, kind }),
        showRoleSelector: () => {},
    });
    return { result, values, notices, nodes, html };
}

test('cloud login failure stays on the login form without writing a fake session', async () => {
    for (const message of ['密码错误', '登录服务暂时不可用，请稍后重试']) {
        const r = await browserLogin(async () => { throw new Error(message); });
        assert.equal(r.values.has('pw_token'), false);
        assert.equal(r.values.has('pa_use_local'), false);
        assert.equal(r.notices.some(x => x.kind === 'ok'), false);
        assert.equal(r.nodes.loginForm.style.display, 'block');
        assert.equal(r.nodes.loginLoading.style.display, 'none');
    }
});

test('successful cloud login switches guest storage to authenticated server storage', async () => {
    const r = await browserLogin(async () => ({ success: true, token: 'test-session', user: { id, email } }));
    assert.equal(r.values.get('pw_token'), 'test-session');
    assert.equal(r.values.get('pa_guest_mode'), 'false');
    assert.equal(r.result.guest, false);
    assert.equal(r.result.browserStorage, false);
    assert.match(r.html, /const USE_LOCAL_MODE = IS_LOCAL_HOST && new URLSearchParams/);
    assert.match(r.html, /onclick="continueAsGuest\(\)"/);
    assert.match(r.html, /!IS_LOCAL_HOST && localStorage\.getItem\(TOKEN_KEY\) === 'local-token'/);
});

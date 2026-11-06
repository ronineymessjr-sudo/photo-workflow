import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { handleEmailAuth } from '../api/email-auth.mjs';

const env = { RESEND_AUTH_ENABLED: 'true', SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'test-anon', SUPABASE_SERVICE_KEY: 'test-service', JWT_SECRET: 'test-signing' };
const email = 'person@example.test';
const body = { email, code: '123456' };
const verified = { access_token: 'upstream-session', user: { email, email_confirmed_at: '2026-10-25' } };
const sign = id => `signed:${id}`;

test('email login is disabled unless explicitly configured', async () => {
    const r = await handleEmailAuth({}, body, 'send', {});
    assert.equal(r.status, 503);
});

test('invalid email and code fail before any provider call', async () => {
    assert.equal((await handleEmailAuth(env, { email: 'bad' }, 'send', {})).status, 400);
    assert.equal((await handleEmailAuth(env, { email, code: 'wrong' }, 'verify', {})).status, 400);
});

test('sending a code never creates an application session', async t => {
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(url, 'https://auth.example.test/auth/v1/otp');
        assert.deepEqual(JSON.parse(options.body), { email, create_user: true });
        return new Response('{}');
    });
    const r = await handleEmailAuth(env, body, 'send', { query: () => assert.fail('no account write before verification'), sign });
    assert.deepEqual(r.body, { success: true, retryAfter: 60 });
});

test('rate limits and provider failures return safe errors', async t => {
    for (const status of [429, 500, 400]) {
        t.mock.method(globalThis, 'fetch', async () => new Response('private provider details', { status }));
        const r = await handleEmailAuth(env, body, 'send', {});
        assert.equal(r.status, status === 500 ? 503 : status);
        assert.doesNotMatch(JSON.stringify(r.body), /private provider/);
        t.mock.restoreAll();
    }
});

test('unconfirmed and mismatched accounts cannot log in', async t => {
    for (const user of [{ email }, { email: 'other@example.test', email_confirmed_at: 'today' }]) {
        t.mock.method(globalThis, 'fetch', async () => Response.json({ ...verified, user }));
        const r = await handleEmailAuth(env, body, 'verify', { query: () => assert.fail('must not map unverified account'), sign });
        assert.equal(r.status, 401);
        t.mock.restoreAll();
    }
});

test('verified email retains existing legacy account id', async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(verified));
    const r = await handleEmailAuth(env, body, 'verify', { query: async () => [{ id: 'legacy-id', email: email.toUpperCase() }], sign });
    assert.equal(r.body.token, 'signed:legacy-id');
    assert.equal(r.body.user.id, 'legacy-id');
    assert.equal(r.body.access_token, undefined);
});

test('new verified user gets no usable password and a normal app session', async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(verified));
    const r = await handleEmailAuth(env, body, 'verify', { query: async (_, path, method, row) => {
        if (method !== 'POST') return [];
        assert.equal(path, 'users');
        assert.match(row.password_hash, /^email-otp:/);
        return [{ id: 'new-id', ...row }];
    }, sign });
    assert.equal(r.status, 201);
    assert.deepEqual(r.body.user, { id: 'new-id', email });
});

test('ambiguous accounts and wildcard mismatches fail closed', async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(verified));
    for (const rows of [[{ id: '1', email }, { id: '2', email }], [{ id: '3', email: 'other@example.test' }]]) {
        const r = await handleEmailAuth(env, body, 'verify', { query: async () => rows, sign: () => assert.fail('must not issue token') });
        assert.equal(r.status, 503);
    }
});

test('concurrent account creation recovers by exact email lookup', async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(verified));
    let calls = 0;
    const r = await handleEmailAuth(env, body, 'verify', { query: async () => ++calls < 3 ? [] : [{ id: 'race-id', email }], sign });
    assert.equal(r.body.token, 'signed:race-id');
});

async function loginUI(request) {
    const source = await readFile(new URL('../assets/email-login.js', import.meta.url), 'utf8');
    const nodes = Object.fromEntries(['loginForm', 'loginMethodToggle', 'sendLoginCode', 'loginCodeStatus', 'loginPasswordGroup', 'loginCodeGroup', 'loginCode', 'loginEmail', 'label'].map(id => [id, {
        hidden: true, style: {}, dataset: {}, value: '', handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; },
    }]));
    const timers = [];
    await runInNewContext(source, {
        window: { api: { request } },
        document: { documentElement: { lang: 'en' }, getElementById: id => nodes[id], querySelector: () => nodes.label },
        Date, setInterval: fn => { timers.push(fn); return 1; }, clearInterval() {},
    });
    return { nodes, timers };
}

test('unconfigured email UI leaves the password flow unchanged', async () => {
    const { nodes } = await loginUI(async () => ({ emailOtp: false }));
    assert.equal(nodes.loginMethodToggle.hidden, true);
    assert.equal(nodes.loginForm.dataset.method, undefined);
});

test('email UI switches modes and prevents duplicate sends without creating a session', async () => {
    let sends = 0;
    const { nodes, timers } = await loginUI(async path => {
        if (path.endsWith('/methods')) return { emailOtp: true };
        sends++; return { success: true };
    });
    assert.equal(nodes.loginForm.dataset.method, 'email');
    assert.equal(nodes.loginPasswordGroup.hidden, true);
    nodes.loginEmail.value = email;
    await nodes.sendLoginCode.handlers.click();
    await nodes.sendLoginCode.handlers.click();
    assert.equal(sends, 1);
    assert.equal(timers.length, 1);
    assert.equal(nodes.sendLoginCode.disabled, true);
    nodes.loginMethodToggle.handlers.click();
    assert.equal(nodes.loginForm.dataset.method, 'password');
    assert.equal(nodes.loginPasswordGroup.hidden, false);
});

test('failed email delivery permits retry and never claims the code was sent', async () => {
    const { nodes } = await loginUI(async path => {
        if (path.endsWith('/methods')) return { emailOtp: true };
        throw new Error('Delivery unavailable');
    });
    nodes.loginEmail.value = email;
    await nodes.sendLoginCode.handlers.click();
    assert.equal(nodes.sendLoginCode.disabled, false);
    assert.equal(nodes.loginCodeStatus.textContent, 'Delivery unavailable');
});

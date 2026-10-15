import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import worker from '../api/index.js';

const env = { JWT_SECRET: 'unit-only-secret', SUPABASE_URL: 'db.example.test', SUPABASE_ANON_KEY: 'unit-only-key' };
const email = 'private-person@example.test';
const password = 'private-password-test';
const id = '9cbecc49-9cde-4c60-9769-3c9767a94522';
const hash = createHash('sha256').update(password + 'photoatelier_salt_2025').digest('hex');

async function loginWith(fetchImpl, input = { email, password }) {
    const oldFetch = globalThis.fetch;
    const oldLog = console.log;
    const logs = [];
    globalThis.fetch = fetchImpl;
    console.log = line => logs.push(JSON.parse(line));
    try {
        const response = await worker.fetch(new Request('https://api.example.test/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://photo-workflow.pages.dev' }, body: JSON.stringify(input),
        }), env);
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
    for (const secret of [email, password, id, result.body.token, env.JWT_SECRET, env.SUPABASE_ANON_KEY]) assert.ok(!output.includes(secret));
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

test('production metadata and sitemap consistently identify the current Pages hostname', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const robots = await readFile(new URL('../robots.txt', import.meta.url), 'utf8');
    const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
    assert.match(html, /rel="canonical" href="https:\/\/photo-workflow\.pages\.dev\/"/);
    assert.match(html, /property="og:url" content="https:\/\/photo-workflow\.pages\.dev\/"/);
    assert.match(robots, /Sitemap: https:\/\/photo-workflow\.pages\.dev\/sitemap\.xml/);
    assert.match(sitemap, /<loc>https:\/\/photo-workflow\.pages\.dev\/<\/loc>/);
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
    assert.equal(load('localhost').length, 0);
    assert.equal(load('preview.photo-workflow.pages.dev').length, 0);
    assert.equal(load('photo-workflow.pages.dev', '?maintenance=1').length, 0);
    const config = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
    assert.match(config, /\[observability\]\s+enabled = true/);
    assert.match(config, /invocation_logs = false/);
});

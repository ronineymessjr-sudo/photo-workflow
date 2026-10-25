import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const entry = html.match(/window\.continueAsGuest = async function\(\) \{[\s\S]*?\n    \};/)[0];

async function startGuest(initial = {}, fail = false) {
    const data = new Map(Object.entries(initial)), owners = [], notices = [];
    let reloads = 0;
    await runInNewContext(`${entry}; window.continueAsGuest()`, {
        TOKEN_KEY: 'pw_token', USER_KEY: 'pw_user',
        window: { PhotoAtelierAccountStorage: { activate: async owner => {
            if (fail) throw new Error('Storage unavailable');
            owners.push(owner);
        } } },
        localStorage: { getItem: key => data.get(key), setItem: (k, v) => data.set(k, v), removeItem: key => data.delete(key) },
        location: { reload: () => reloads++ }, toast: message => notices.push(message),
    });
    return { data, owners, notices, reloads };
}

test('guest entry selects an isolated browser archive without creating a session or account', async () => {
    const result = await startGuest();
    assert.deepEqual(result.owners, ['__guest__']);
    assert.equal(result.data.get('pa_guest_mode'), 'true');
    assert.equal(result.data.has('pw_token'), false);
    assert.equal(result.data.has('pw_user'), false);
    assert.equal(result.reloads, 1);
});

test('guest entry cannot replace a signed-in account or continue after cache failure', async () => {
    const signed = await startGuest({ pw_token: 'existing-session', pw_user: 'private-user' });
    assert.deepEqual(signed.owners, []);
    assert.equal(signed.data.get('pw_token'), 'existing-session');
    assert.equal(signed.reloads, 0);
    const failed = await startGuest({}, true);
    assert.equal(failed.data.has('pa_guest_mode'), false);
    assert.equal(failed.reloads, 0);
});

test('guest remote requests only allow public plan generation and explicit account login', async () => {
    const request = html.match(/request: async function\(path, method, body, timeout = 10000\) \{[\s\S]*?\n        \},/)[0].replace(/,$/, '');
    const calls = [];
    const api = runInNewContext(`({${request}})`, {
        USE_GUEST_MODE: true, API_BASE: 'https://api.example', TOKEN_KEY: 'pw_token',
        localStorage: { getItem: () => null }, AbortController,
        setTimeout: () => 1, clearTimeout: () => {},
        fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200, text: async () => '{}' }; },
        lockSession: () => assert.fail('guest must not become a verified session'),
    });
    for (const path of ['/api/workspace/state', '/api/plans', '/api/messages', '/api/feishu/sync-calendar']) {
        await assert.rejects(api.request(path), /请登录/);
    }
    assert.equal(calls.length, 0);
    await api.request('/api/director/plan', 'POST', { theme: 'portrait' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.headers.Authorization, undefined);
    assert.match(html, /if \(!SESSION_VERIFIED && !USE_GUEST_MODE\) return/);
    assert.match(html, /let SESSION_VERIFIED = USE_LOCAL_MODE/);
    assert.match(html, /await window\.PhotoAtelierAccountStorage\.activate\(res\.user\.id\)/);
});

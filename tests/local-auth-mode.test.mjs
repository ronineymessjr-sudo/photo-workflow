import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const crewClient = await readFile(new URL('../assets/crew-hall.js', import.meta.url), 'utf8');

test('localhost clears only synthetic demo auth and remains on the real login path', () => {
    const authStart = html.indexOf('// ===== Auth System & App Entry =====');
    const bootstrapStart = html.indexOf('(function() {', authStart);
    const bootstrapEnd = html.indexOf('    // Local mode API mock', bootstrapStart);
    assert.ok(authStart >= 0 && bootstrapStart >= 0 && bootstrapEnd > bootstrapStart);

    const stored = new Map([
        ['pw_token', 'local-token'],
        ['pw_user', JSON.stringify({ id: 'local', email: 'local@photoatelier.local' })],
        ['pw_role', 'photographer'],
        ['pa_user', JSON.stringify({ id: 'local', email: 'test@example.com' })],
        ['pa_use_local', 'true'],
        ['pa_guest_mode', 'true'],
        ['pw_plans', JSON.stringify([{ id: 'saved-plan' }])],
    ]);
    const guestButton = { hidden: false, style: {} };
    const context = {
        window: {},
        location: { hostname: 'localhost' },
        document: { getElementById: () => guestButton },
        localStorage: {
            getItem: key => stored.get(key) ?? null,
            setItem: (key, value) => stored.set(key, String(value)),
            removeItem: key => stored.delete(key),
        },
    };
    vm.runInNewContext(`${html.slice(bootstrapStart, bootstrapEnd)}\n})();`, context);

    assert.equal(context.window.__PHOTOATELIER_LOCAL_MODE__, false);
    assert.equal(context.window.__PHOTOATELIER_GUEST_MODE__, false);
    assert.equal(guestButton.style.display, 'none');
    assert.equal(stored.has('pw_token'), false);
    assert.equal(stored.has('pw_user'), false);
    assert.equal(stored.has('pw_role'), false);
    assert.equal(stored.has('pa_use_local'), false);
    assert.equal(stored.has('pa_guest_mode'), false);
    assert.equal(JSON.parse(stored.get('pw_plans'))[0].id, 'saved-plan');
});

test('login errors do not fall back to a fabricated local account', () => {
    const loginStart = html.indexOf('window.handleLogin = async function()');
    const loginEnd = html.indexOf('// Logout', loginStart);
    const loginHandler = html.slice(loginStart, loginEnd);
    assert.match(loginHandler, /await window\.api\.login\(email, password\)/);
    assert.match(loginHandler, /res\.success && res\.token && res\.user/);
    assert.doesNotMatch(loginHandler, /localApi\.login|pa_use_local|local-token/);
    assert.doesNotMatch(html, /async login\(credentials\)/);
});

test('collaboration never treats the synthetic token as a signed-in account', () => {
    assert.match(crewClient, /token !== 'local-token'/);
    assert.doesNotMatch(crewClient, /本机演示登录/);
    assert.match(crewClient, /请先在摄影工作台使用真实账号登录/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import worker from '../api/index.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('the login screen does not offer or reactivate guest mode', async () => {
    assert.doesNotMatch(html, /onclick="continueAsGuest\(\)"/);
    assert.match(html, /let USE_GUEST_MODE = false/);
    assert.match(html, /pa_guest_mode'\) === 'true'\) localStorage\.setItem\('pa_guest_mode', 'false'\)/);

    const entry = html.match(/window\.continueAsGuest = function\(\) \{[\s\S]*?\n    \};/)[0];
    let activations = 0;
    const notices = [];
    const window = { PhotoAtelierAccountStorage: { activate: async () => { activations++; } } };
    await runInNewContext(`${entry}; window.continueAsGuest()`, {
        window, toast: message => notices.push(message),
    });
    assert.equal(activations, 0);
    assert.deepEqual(notices, ['请先登录后使用摄影系统']);
});

test('anonymous requests cannot create plans, search references, or enter continuity', async () => {
    const origin = 'https://photo.ronineymessjrstudio.cn';
    const env = { JWT_SECRET: 'guest-disabled-test-secret', AI_STUDIO_ALLOWED_ORIGINS: origin };
    const methods = await worker.fetch(new Request(`${origin}/api/auth/methods`), env);
    assert.deepEqual(await methods.json(), { emailOtp: false, password: true, guest: false });

    const paths = [
        '/api/director/plan', '/api/ai/plan-lite', '/api/ai/plan', '/api/ai/brief',
        '/api/continuity/from-studio', '/api/continuity/generate',
    ];
    for (const path of paths) {
        const response = await worker.fetch(new Request(`${origin}${path}`, {
            method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}',
        }), env);
        assert.equal(response.status, 401, `${path} should require a signed-in user`);
        assert.equal((await response.json()).error, 'SIGN_IN_REQUIRED');
    }
});

test('unknown password login cannot create an unverified account', async t => {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        calls.push({ url: String(url), method: options?.method || 'GET' });
        return Response.json([]);
    });
    const origin = 'https://photo.ronineymessjrstudio.cn';
    const response = await worker.fetch(new Request(`${origin}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new-user@example.test', password: 'test-password-123' }),
    }), {
        JWT_SECRET: 'guest-disabled-test-secret',
        SUPABASE_URL: 'https://auth.example.test',
        SUPABASE_ANON_KEY: 'test-anon',
        SUPABASE_SERVICE_KEY: 'test-service',
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: '邮箱或密码错误' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'GET');
});

test('legacy nine-grid generation cannot bypass plan and reference contracts', () => {
    assert.doesNotMatch(html, /image\.pollinations\.ai\/prompt/);
    assert.doesNotMatch(html, /批量生成9张/);
    assert.doesNotMatch(html, /id="img-prompt-/);
    assert.match(html, /function generateDirectorCandidateForPlan\(planId\)/);
    assert.match(html, /旧版方案没有逐镜拍摄合同/);
});

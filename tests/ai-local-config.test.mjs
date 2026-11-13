import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createLocalAiCredentials } from '../tools/local-ai-credentials.mjs';
import { createServer } from '../tools/serve-director.mjs';

test('Windows local configuration survives reload without plaintext on disk', { skip: process.platform !== 'win32' }, async t => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'photo-ai-test-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const config = { provider: 'deepseek', model: 'deepseek-chat', apiKey: 'sk-example-for-test-only' };
    await createLocalAiCredentials({ directory }).save(config);
    const onDisk = await readFile(path.join(directory, 'local-ai.json'), 'utf8');
    assert.equal(onDisk.includes(config.apiKey), false);
    const fresh = createLocalAiCredentials({ directory });
    assert.deepEqual(await fresh.status(), { configured: true, provider: config.provider, model: config.model });
    assert.deepEqual(await fresh.load(), config);
    const replacement = { ...config, apiKey: 'sk-replacement-test-only', model: 'deepseek-reasoner' };
    await fresh.save(replacement);
    assert.deepEqual(await fresh.load(), replacement);
    await fresh.clear();
    assert.equal((await fresh.status()).configured, false);
});

test('saved-credential routes require same origin and never return the key', async t => {
    let saved;
    const credentials = {
        async save(value) { saved = value; },
        async load() { return saved || null; },
        async status() { return saved ? { configured: true, provider: saved.provider, model: saved.model } : { configured: false, supported: true }; },
        async clear() { saved = null; },
    };
    let upstream;
    const server = createServer({ aiCredentials: credentials, fetchImpl: async (_, init) => {
        upstream = init;
        return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ brief: { modelDesc: '一人', scene: '公园' }, questions: [], confidence: 0.8 }) } }] });
    } });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    const key = 'sk-test-local-only-123456';
    const config = JSON.stringify({ provider: 'deepseek', model: 'deepseek-chat', apiKey: key });
    const headers = { 'Content-Type': 'application/json', Origin: 'https://example.test' };
    assert.equal((await fetch(base + '/api/ai/local-config', { method: 'POST', headers, body: config })).status, 403);
    headers.Origin = base;
    const response = await fetch(base + '/api/ai/local-config', { method: 'POST', headers, body: config });
    assert.equal(response.status, 200);
    assert.equal((await response.text()).includes(key), false);
    assert.equal((await (await fetch(base + '/api/ai/local-config')).text()).includes(key), false);
    const result = await fetch(base + '/api/ai/brief', { method: 'POST', headers, body: JSON.stringify({ useSaved: true, conversation: '在公园拍一个人' }) });
    assert.equal(result.status, 200);
    assert.equal(upstream.headers.Authorization, 'Bearer ' + key);
    assert.equal((await result.text()).includes(key), false);
    assert.equal((await fetch(base + '/api/ai/local-config', { method: 'DELETE', headers })).status, 200);
    assert.equal((await (await fetch(base + '/api/ai/local-config')).json()).configured, false);
});

test('the browser restores the saved configuration without receiving its key', async () => {
    const ids = ['ownAiSettings','ownAiProvider','ownAiModel','ownAiKey','ownAiStatus','ownAiConsent','ownAiConsentText','ownAiEnable','ownAiClear','ownAiEndpoint','ownAiRemember','ownAiRememberLabel'];
    const nodes = Object.fromEntries(ids.map(id => [id, { value: '', checked: false, hidden: true, handlers: {}, addEventListener(k, fn) { this.handlers[k] = fn; }, replaceChildren(...children) { this.children = children; this.value = children[0]?.value; } }]));
    const requests = [];
    const fetch = async (url, options) => {
        requests.push({ url, options });
        if (url.endsWith('/providers')) return Response.json({ providers: [{ id: 'deepseek', name: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions' }] });
        if (url.endsWith('/local-config')) return Response.json({ configured: true, provider: 'deepseek', model: 'deepseek-chat' });
        return Response.json({ brief: {} });
    };
    const window = { location: { hostname: '127.0.0.1' }, api: {} };
    const source = await readFile(new URL('../assets/own-ai.js', import.meta.url), 'utf8');
    await vm.runInNewContext(source, { window, fetch, AbortSignal, document: { getElementById: id => nodes[id], createElement: () => ({}) } });
    assert.equal(window.PhotoAtelierOwnAI.isEnabled(), true);
    assert.equal(nodes.ownAiRememberLabel.hidden, false);
    assert.equal(nodes.ownAiEndpoint.textContent, 'https://api.deepseek.com/chat/completions');
    await window.PhotoAtelierOwnAI.extractBrief('一位朋友在公园');
    const sent = JSON.parse(requests.at(-1).options.body);
    assert.equal(sent.useSaved, true);
    assert.equal(Object.hasOwn(sent, 'apiKey'), false);
});

test('settings cannot be changed while encrypted configuration is being saved', async () => {
    const ids = ['ownAiSettings','ownAiProvider','ownAiModel','ownAiKey','ownAiStatus','ownAiConsent','ownAiConsentText','ownAiEnable','ownAiClear','ownAiEndpoint','ownAiRemember','ownAiRememberLabel'];
    const nodes = Object.fromEntries(ids.map(id => [id, { value: '', checked: false, hidden: true, disabled: false, handlers: {}, addEventListener(k, fn) { this.handlers[k] = fn; }, replaceChildren(...children) { this.value = children[0]?.value; } }]));
    let finishSave;
    const fetch = async (url, options) => {
        if (url.endsWith('/providers')) return Response.json({ providers: [{ id: 'deepseek', name: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions' }] });
        if (options.method === 'GET') return Response.json({ configured: false, supported: true });
        return new Promise(resolve => { finishSave = resolve; });
    };
    const window = { location: { hostname: '127.0.0.1' }, api: {} };
    const source = await readFile(new URL('../assets/own-ai.js', import.meta.url), 'utf8');
    await vm.runInNewContext(source, { window, fetch, AbortSignal, document: { getElementById: id => nodes[id], createElement: () => ({}) } });
    nodes.ownAiProvider.value = 'deepseek'; nodes.ownAiModel.value = 'deepseek-chat'; nodes.ownAiKey.value = 'sk-example-for-test-only';
    nodes.ownAiConsent.checked = true; nodes.ownAiRemember.checked = true;
    nodes.ownAiEnable.handlers.click();
    assert.equal(nodes.ownAiConsent.disabled, true);
    assert.equal(nodes.ownAiClear.disabled, true);
    assert.equal(window.PhotoAtelierOwnAI.isEnabled(), false);
    finishSave(Response.json({ configured: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(nodes.ownAiConsent.disabled, false);
    assert.equal(window.PhotoAtelierOwnAI.isEnabled(), true);
    assert.equal(nodes.ownAiKey.value, '');
});

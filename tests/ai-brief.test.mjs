import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { handleAiBrief } from '../api/ai-brief.mjs';
import { createServer } from '../tools/serve-director.mjs';
import worker from '../api/index.js';

const config = { provider: 'deepseek', model: 'deepseek-chat', apiKey: 'sk-test-not-a-real-key' };
const output = { brief: { theme: '人像', scene: '公园', modelDesc: '一位朋友' }, questions: [], confidence: 0.8 };
const completion = value => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] });

test('brief extraction sends the original text to the approved provider and normalizes fields', async () => {
    const conversation = '公园拍朋友；仅35mm；无助手';
    let request;
    const result = await handleAiBrief({ ...config, conversation }, {}, { fetchImpl: async (url, init) => {
        request = { url, init, body: JSON.parse(init.body) }; return completion(output);
    } });
    assert.equal(result.status, 200);
    assert.equal(request.url, 'https://api.deepseek.com/chat/completions');
    assert.equal(request.init.redirect, 'manual');
    assert.equal(request.body.messages[1].content, conversation);
    assert.equal(result.body.brief.scene, '公园');
    assert.deepEqual(result.body.missing, []);
    assert.equal(JSON.stringify(result.body).includes(config.apiKey), false);
});

test('natural language people counts are converted to editable numeric values', async () => {
    const result = await handleAiBrief({ ...config, conversation: '拍一位朋友' }, {}, { fetchImpl: async () => completion({ ...output, brief: { ...output.brief, people: '一位成年朋友' } }) });
    assert.equal(result.body.brief.people, '1');
    const unknown = await handleAiBrief({ ...config, conversation: '拍朋友' }, {}, { fetchImpl: async () => completion({ ...output, brief: { ...output.brief, people: '几位朋友' } }) });
    assert.equal(unknown.body.brief.people, '');
});

test('rejects credentials in conversation and invalid provider before network', async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; throw Error('should not call'); };
    assert.equal((await handleAiBrief({ ...config, conversation: 'API key: sk-abcdefghijklmnop' }, {}, { fetchImpl })).status, 400);
    assert.equal((await handleAiBrief({ ...config, provider: 'https://evil.test', conversation: '拍摄人像' }, {}, { fetchImpl })).status, 400);
    assert.equal((await handleAiBrief({ ...config, conversation: 'a'.repeat(1001) }, {}, { fetchImpl })).status, 400);
    assert.equal(calls, 0);
});

test('missing fields and low confidence remain visible; malformed model output fails closed', async () => {
    const incomplete = { brief: { theme: '人像' }, questions: ['在哪里拍？', '拍谁？', '多余问题'], confidence: 0.4 };
    const result = await handleAiBrief({ ...config, conversation: '想拍人像' }, {}, { fetchImpl: async () => completion(incomplete) });
    assert.deepEqual(result.body.missing, ['modelDesc', 'scene']);
    assert.equal(result.body.questions.length, 2);
    assert.equal(result.body.confidence, 0.4);
    const bad = await handleAiBrief({ ...config, conversation: '人像' }, {}, { fetchImpl: async () => completion({ ...output, confidence: 4 }) });
    assert.equal(bad.status, 502);
    assert.equal(JSON.stringify(bad).includes(config.apiKey), false);
});

test('cloud route enforces JSON and request-size limits before provider access', async () => {
    const url = 'https://example.test/api/ai/brief';
    const wrongType = await worker.fetch(new Request(url, { method: 'POST', body: '{}' }), {});
    assert.equal(wrongType.status, 415);
    const oversized = await worker.fetch(new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation: 'a'.repeat(17000) }) }), {});
    assert.equal(oversized.status, 413);
});

test('local brief route rejects cross-origin calls and reaches the mock provider', async t => {
    const server = createServer({ fetchImpl: async () => completion(output) });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.test' }, body: JSON.stringify({ ...config, conversation: '公园拍朋友' }) };
    assert.equal((await fetch(base + '/api/ai/brief', request)).status, 403);
    request.headers.Origin = base;
    const response = await fetch(base + '/api/ai/brief', request);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).brief.scene, '公园');
});

test('conversation UI confirms original restrictions through the existing form, and blocks unreviewed text', async () => {
    class Element {
        constructor() { this.value = ''; this.dataset = {}; this.children = []; this.listeners = {}; this.hidden = false; this.disabled = false; this.options = []; }
        addEventListener(name, handler) { this.listeners[name] = handler; }
        append(child) { this.children.push(child); }
        replaceChildren() { this.children = []; }
        querySelectorAll() { return this.children.map(label => label.children[0]); }
    }
    const ids = ['briefChatMessage','briefChatSend','briefChatHistory','briefChatStatus','briefChatReview','briefChatFields','briefChatConfirm','briefChatSettings','briefChatAvailability','briefChatEntry','f-theme','f-style','f-model','f-scene','f-mood','f-dur','f-people','f-extra','briefForm'];
    const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
    elements['f-dur'].options = [{ value: '2小时' }]; elements['f-dur'].value = '2小时';
    let submissions = 0; elements.briefForm.requestSubmit = () => { submissions++; };
    const source = await readFile(new URL('../assets/brief-chat.js', import.meta.url), 'utf8');
    const window = { PhotoAtelierOwnAI: { isEnabled: () => true, extractBrief: async () => ({ ...output, missing: [] }) } };
    vm.runInNewContext(source, { document: { getElementById: id => elements[id], createElement: () => new Element() }, window });
    elements.briefChatMessage.value = '公园拍朋友；仅35mm；无助手';
    await elements.briefChatSend.listeners.click();
    elements.briefChatMessage.value = '新要求';
    elements.briefChatConfirm.listeners.click();
    assert.equal(submissions, 0);
    elements.briefChatMessage.value = '';
    const duration = elements.briefChatFields.children.map(label => label.children[0]).find(input => input.dataset.briefField === 'duration');
    duration.value = '两小时';
    elements.briefChatConfirm.listeners.click();
    assert.equal(submissions, 1);
    assert.ok(elements['f-extra'].value.includes('公园拍朋友；仅35mm；无助手'));
    assert.equal(elements['f-scene'].value, '公园');
    assert.equal(elements['f-dur'].value, '2小时');
});

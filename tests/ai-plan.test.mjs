import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { aiPlanProviders, handleAiPlan } from '../api/ai-plan.mjs';
import worker from '../api/index.js';

const key = 'test-private-key-never-log';
const input = { theme: '雨夜纪实', scene: '斑马线', people: '1', duration: '1小时', extra: '高机位俯拍，人物左下角，完整全身' };
const request = { provider: 'deepseek', model: 'test-model', apiKey: key, input };
function output(count = 9) {
    return { shot_plans: Array.from({ length: count }, (_, i) => ({
        shot_language: `镜头${i}`, model_pose: '站定后向前迈步', photographer_position: '在安全台阶上俯拍',
        lens: '35mm', model_position: '左下角', lighting_setup: '路灯为侧光，反光板在暗侧轻补',
        crop_boundary: '完整全身', must_show: '脚部和路面', reject_if: '截脚或居中半身',
        execution_note: '不可达时换安全台阶', generator_prompt: 'high angle full body, lower left',
        shot_size: 'FS', camera_angle: 'high_angle',
    })) };
}
const response = result => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] });

test('provider destinations are fixed or explicitly approved by server admin', () => {
    const ps = aiPlanProviders({ AI_PLAN_ALLOWED_ORIGINS: 'http://localhost,https://127.0.0.1,https://x.internal,https://user:pass@evil.com,https://evil.com/path,https://gateway.example.com' });
    assert.deepEqual(ps.map(p => p.id), ['openai', 'deepseek', 'https://gateway.example.com']);
});

test('invalid config and brief never call providers', async () => {
    const fetchImpl = () => assert.fail('no external request');
    for (const change of [{ provider: 'https://evil.com' }, { apiKey: '' }, { apiKey: 'key\nheader' }, { model: '' }, { model: 'bad model' }, { input: { theme: 'a'.repeat(3000) } }]) {
        const r = await handleAiPlan({ ...request, ...change }, {}, { fetchImpl });
        assert.equal(r.status, 400);
    }
});

test('real provider response is mapped to existing plan without keys or a template fallback', async () => {
    const r = await handleAiPlan(request, {}, { fetchImpl: async (url, options) => {
        assert.equal(url, 'https://api.deepseek.com/chat/completions');
        assert.equal(options.headers.Authorization, `Bearer ${key}`);
        assert.equal(options.redirect, 'error');
        const payload = JSON.parse(options.body);
        assert.equal(payload.model, 'test-model');
        assert.match(payload.messages[1].content, /人物左下角/);
        assert.doesNotMatch(JSON.stringify(payload), new RegExp(key));
        return response(output());
    } });
    assert.equal(r.status, 200);
    assert.equal(r.body.director.source, 'byok-ai-plan');
    assert.equal(r.body.director.imageGenerationConnected, false);
    assert.equal(r.body.shotList.length, 9);
    assert.equal(r.body.shotList[0].angle, '俯拍');
    assert.equal(r.body.shotList[0].composition, '左下角');
    assert.doesNotMatch(JSON.stringify(r), new RegExp(key));
});

test('partial, duplicated, invalid and truncated model outputs fail instead of padding shots', async () => {
    const duplicate = output(); duplicate.shot_plans[1].shot_language = duplicate.shot_plans[0].shot_language;
    const missing = output(); delete missing.shot_plans[0].model_pose;
    const badAngle = output(); badAngle.shot_plans[0].camera_angle = 'unknown';
    for (const value of [output(3), duplicate, missing, badAngle]) {
        const r = await handleAiPlan(request, {}, { fetchImpl: async () => response(value) });
        assert.equal(r.status, 502);
        assert.equal(r.body.shotList, undefined);
    }
    const r = await handleAiPlan(request, {}, { fetchImpl: async () => Response.json({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(output()) } }] }) });
    assert.equal(r.status, 502);
});

test('provider errors never leak credentials and wrong provider key cannot log out the app account', async () => {
    for (const status of [401, 403, 429, 500]) {
        const r = await handleAiPlan(request, {}, { fetchImpl: async () => new Response(key, { status }) });
        assert.equal(r.status, [401, 403].includes(status) ? 422 : status === 429 ? 429 : 502);
        assert.doesNotMatch(JSON.stringify(r), new RegExp(key));
    }
    const r = await handleAiPlan(request, {}, { fetchImpl: async () => { throw new Error(key); } });
    assert.equal(r.status, 502);
    assert.doesNotMatch(JSON.stringify(r), new RegExp(key));
});

test('public BYOK API needs a caller key, restricts body size and discloses no server secrets', async () => {
    const catalog = await worker.fetch(new Request('https://unit.test/api/ai/providers'), { MINIMAX_API_KEY: key });
    assert.doesNotMatch(await catalog.text(), new RegExp(key));
    const bad = await worker.fetch(new Request('https://unit.test/api/ai/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), {});
    assert.equal(bad.status, 400);
    const large = await worker.fetch(new Request('https://unit.test/api/ai/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(17000) }) }), {});
    assert.equal(large.status, 413);
});

test('browser config requires consent, clears key field, and never uses browser storage', async () => {
    const source = await readFile(new URL('../assets/own-ai.js', import.meta.url), 'utf8');
    const nodes = Object.fromEntries(['ownAiSettings','ownAiProvider','ownAiModel','ownAiKey','ownAiStatus','ownAiConsent','ownAiEnable','ownAiClear','ownAiEndpoint'].map(id => [id, { value: '', checked: false, handlers: {}, addEventListener(k, fn) { this.handlers[k] = fn; }, replaceChildren(...children) { this.children = children; this.value = children[0]?.value; } }]));
    const calls = [];
    const window = { api: { request: async (...args) => {
        calls.push(args);
        return args[0].endsWith('providers') ? { providers: aiPlanProviders() } : { title: 'Model plan' };
    } } };
    await runInNewContext(source, { window, document: { getElementById: id => nodes[id], createElement: () => ({}) } });
    nodes.ownAiModel.value = 'test-model'; nodes.ownAiKey.value = key;
    nodes.ownAiEnable.handlers.click();
    assert.equal(window.PhotoAtelierOwnAI.isEnabled(), false);
    nodes.ownAiConsent.checked = true;
    nodes.ownAiEnable.handlers.click();
    assert.equal(window.PhotoAtelierOwnAI.isEnabled(), true);
    assert.equal(nodes.ownAiKey.value, '');
    assert.equal(calls.length, 1); // Enabling is not a billable model call.
    await window.PhotoAtelierOwnAI.generatePlan(input);
    assert.equal(calls[1][1], 'POST');
    assert.equal(calls[1][2].apiKey, key);
    assert.equal(calls[1][3], 100000);
    nodes.ownAiClear.handlers.click();
    assert.equal(window.PhotoAtelierOwnAI.isEnabled(), false);
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|console\./);
});

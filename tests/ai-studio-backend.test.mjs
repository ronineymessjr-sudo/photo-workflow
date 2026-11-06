import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker from '../api/index.js';
import { WorkspaceSync } from '../api/workspace-state.mjs';
import { AiStudioQuota } from '../api/ai-studio/quota.mjs';
import { consumeStudioImageQuota } from '../api/ai-studio/service.mjs';
import { applyStudioCommit, applyStudioSyncResult } from '../api/ai-studio/plan-commit.mjs';
import { createServer } from '../tools/serve-director.mjs';

const origin = 'https://photo-workflow.pages.dev';
const planKey = id => JSON.stringify(['local', 'pw_plans', `record:${id}`]);
const samplePlan = { id: 'plan-1', input: { theme: '秋日人像' }, shotList: [], revision: 0 };
const sampleCommit = {
    confirmed: true, proposalId: 'proposal-1', planId: 'plan-1', expectedRevision: 0,
    references: [{ id: 'reference-1', sourceItemId: 'pa-pose-natural-seat', title: '自然放松坐姿' }],
    guidance: { style: '松弛的电影感' }, conversation: [{ role: 'user', content: '自然坐姿' }],
};

function storage() {
    const values = new Map();
    const store = {
        get: async key => structuredClone(values.get(key)),
        put: async (key, value) => values.set(key, structuredClone(value)),
        delete: async key => values.delete(key),
        list: async ({ prefix = '' } = {}) => new Map([...values].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key, structuredClone(value)])),
    };
    let queue = Promise.resolve();
    store.transaction = callback => {
        const result = queue.then(() => callback(store));
        queue = result.catch(() => {});
        return result;
    };
    return store;
}

function namespace(Class) {
    const objects = new Map();
    return {
        idFromName: name => name,
        get(name) {
            if (!objects.has(name)) objects.set(name, new Class({ storage: storage() }));
            const object = objects.get(name);
            return { fetch: (input, init) => object.fetch(input instanceof Request ? input : new Request(input, init)) };
        },
    };
}

function environment() {
    return {
        JWT_SECRET: 'ai-studio-test-secret-only', ENVIRONMENT: 'production', POSEATLAS_ENABLED: 'false',
        AI_STUDIO_ALLOWED_ORIGINS: origin,
        WORKSPACE_SYNC: namespace(WorkspaceSync), AI_STUDIO_QUOTA: namespace(AiStudioQuota),
    };
}

function token(uid, env) {
    const p = JSON.stringify({ uid, t: Date.now() });
    return Buffer.from(JSON.stringify({ p, s: createHmac('sha256', env.JWT_SECRET).update(p).digest('hex') })).toString('base64url');
}

function call(env, path, body, uid = 'user-1', extra = {}) {
    return worker.fetch(new Request(`https://worker.example${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json',
            ...(uid ? { Authorization: `Bearer ${token(uid, env)}` } : {}), ...extra },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env);
}

test('signed commits preserve legacy plans, reject stale revisions, and deduplicate a replay', () => {
    const legacy = { ...samplePlan }; delete legacy.revision;
    const applied = applyStudioCommit(legacy, sampleCommit, 1800000000000);
    assert.equal(applied.plan.revision, 1);
    assert.equal(legacy.revision, undefined);
    assert.equal(applied.plan.aiStudio.sync.status, 'pending');
    assert.deepEqual(applied.plan.aiStudio.guidance, sampleCommit.guidance);
    assert.equal(applyStudioCommit(applied.plan, sampleCommit).duplicate, true);
    assert.throws(() => applyStudioCommit(applied.plan, { ...sampleCommit, proposalId: 'new-proposal' }), error => error.status === 409);
    assert.throws(() => applyStudioCommit(null, sampleCommit), error => error.status === 404);
    assert.throws(() => applyStudioSyncResult(applied.plan, { planId: 'plan-1', revision: 0, status: 'pending', sourceUpdatedAt: applied.plan.aiStudio.sync.updatedAt }), error => error.status === 409);
});

test('workspace commits are atomic and preserve unrelated entries and workspace CAS', async () => {
    const object = new WorkspaceSync({ storage: storage() });
    const entries = { [planKey('plan-1')]: samplePlan, [planKey('other')]: { id: 'other', revision: 7 },
        [JSON.stringify(['local', 'pw_eq', 'record:camera'])]: { id: 'camera', name: '已有相机' } };
    const post = (path, body) => object.fetch(new Request(`https://internal${path}`, { method: 'POST', body: JSON.stringify(body) }));
    assert.equal((await post('/state', { revision: 0, entries })).status, 200);
    const competing = await Promise.all([
        post('/studio/commit', sampleCommit),
        post('/studio/commit', { ...sampleCommit, proposalId: 'competing' }),
    ]);
    assert.deepEqual(competing.map(response => response.status), [200, 409]);
    const saved = await (await object.fetch(new Request('https://internal/state'))).json();
    assert.equal(saved.revision, 2);
    assert.equal(saved.entries[planKey('plan-1')].revision, 1);
    assert.deepEqual(saved.entries[planKey('other')], entries[planKey('other')]);
    assert.deepEqual(saved.entries[JSON.stringify(['local', 'pw_eq', 'record:camera'])], entries[JSON.stringify(['local', 'pw_eq', 'record:camera'])]);
    assert.equal((await post('/studio/commit', sampleCommit)).status, 200);
    assert.equal((await (await object.fetch(new Request('https://internal/state'))).json()).revision, 2);
    assert.equal((await post('/state', { revision: 1, entries })).status, 409);
    assert.equal((await post('/studio/commit', { ...sampleCommit, planId: 'missing' })).status, 404);
});

test('workspace sync receipts cannot mark a newer plan as synced', async () => {
    const object = new WorkspaceSync({ storage: storage() });
    const plan = applyStudioCommit(samplePlan, sampleCommit, 1800000000000).plan;
    await object.fetch(new Request('https://internal/state', { method: 'POST', body: JSON.stringify({ revision: 0, entries: { [planKey(plan.id)]: plan } }) }));
    const outcome = { planId: plan.id, revision: plan.revision, sourceUpdatedAt: plan.aiStudio.sync.updatedAt,
        status: 'synced', syncedAt: '2027-01-15T08:00:00.000Z' };
    const update = body => object.fetch(new Request('https://internal/studio/sync-result', { method: 'POST', body: JSON.stringify(body) }));
    assert.equal((await update({ ...outcome, revision: 0 })).status, 409);
    assert.equal((await update(outcome)).status, 200);
    const saved = await (await object.fetch(new Request('https://internal/state'))).json();
    assert.equal(saved.revision, 2);
    assert.equal(saved.entries[planKey(plan.id)].revision, 1);
    assert.equal(saved.entries[planKey(plan.id)].aiStudio.sync.status, 'synced');
});

test('Worker Studio routes enforce exact origins, bounded JSON, authentication and quotas', async () => {
    const env = environment();
    assert.equal((await call(env, '/api/ai/plan-lite', { prompt: '自然坐姿' }, null, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await call(env, '/api/ai/plan-lite', { prompt: '自然坐姿' }, null, { Origin: '' })).status, 403);
    const preflight = await worker.fetch(new Request('https://worker.example/api/ai/plan-lite', { method: 'OPTIONS', headers: { Origin: origin } }), env);
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal((await call(env, '/api/ai/plan-lite', { prompt: 'x'.repeat(9000) }, null)).status, 413);
    assert.equal((await call(env, '/api/ai/plan-lite', { prompt: '坐姿' + '人'.repeat(1798) }, null)).status, 200);
    assert.equal((await call(env, '/api/ai/plan-lite', { prompt: '自然坐姿' }, null, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await call(env, '/api/ai/studio/proposals', {}, null)).status, 401);
    assert.equal((await call({ ...env, AI_STUDIO_QUOTA: undefined }, '/api/ai/plan-lite', { prompt: '自然坐姿' }, null)).status, 503);
    const guest = await (await call(env, '/api/ai/plan-lite', { prompt: '自然坐姿', uid: 'spoofed' }, null)).json();
    assert.equal(guest.searchReceipt, undefined);
    assert.equal(guest.modelCalls, 0);
});

test('candidate quota is five per user plus a shared daily free-tier safety cap', async () => {
    const quota = new AiStudioQuota({ storage: storage() });
    const consume = (action, limit) => quota.fetch(new Request('https://quota.internal/consume', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, limit }),
    }));
    for (let index = 0; index < 5; index++) assert.equal((await (await consume('image', 5)).json()).allowed, true);
    assert.equal((await (await consume('image', 5)).json()).allowed, false);
    for (let index = 0; index < 50; index++) assert.equal((await (await consume('image-global', 50)).json()).allowed, true);
    assert.equal((await (await consume('image-global', 50)).json()).allowed, false);
});

test('image allowance is isolated per signed-in user and refuses guests', async () => {
    const env = environment();
    assert.equal(await consumeStudioImageQuota({ uid: null, env }), false);
    for (let index = 0; index < 5; index++) assert.equal(await consumeStudioImageQuota({ uid: 'user-a', env }), true);
    assert.equal(await consumeStudioImageQuota({ uid: 'user-a', env }), false);
    for (let index = 0; index < 5; index++) assert.equal(await consumeStudioImageQuota({ uid: 'user-b', env }), true);
});

test('Worker confirmation writes only the verified account workspace and replays once', async () => {
    const env = environment();
    assert.equal((await call(env, '/api/workspace/state', { revision: 0, entries: { [planKey('plan-1')]: samplePlan } })).status, 200);
    const search = await (await call(env, '/api/ai/plan-lite', { prompt: '自然坐姿', planId: 'plan-1', expectedRevision: 0 })).json();
    const proposal = await (await call(env, '/api/ai/studio/proposals', { searchReceipt: search.searchReceipt, selectedIds: [search.selectedIds[0]] })).json();
    const confirmation = { proposalToken: proposal.proposalToken, idempotencyKey: 'studio-confirm-test-1' };
    assert.equal((await call(env, '/api/ai/studio/confirm', confirmation, 'user-2')).status, 400);
    const response = await call(env, '/api/ai/studio/confirm', confirmation);
    assert.equal(response.status, 200);
    const saved = await response.json();
    assert.equal(saved.storage, 'workspace');
    assert.equal(saved.plan.revision, 1);
    assert.equal(saved.workspaceRevision, 2);
    assert.equal(saved.plan.aiStudio.references.length, 1);
    const replay = await (await call(env, '/api/ai/studio/confirm', confirmation)).json();
    assert.equal(replay.duplicate, true);
    assert.equal(replay.workspaceRevision, 2);
    assert.deepEqual((await (await call(env, '/api/workspace/state', undefined, 'user-2')).json()).entries, {});
    const pending = await (await call(env, '/api/ai/studio/feishu/sync', { planId: 'plan-1', plan: { id: 'untrusted-browser-plan' } })).json();
    assert.equal(pending.status, 'pending');
    assert.equal(pending.plan.id, 'plan-1');
    assert.equal((await call(env, '/api/ai/studio/feishu/sync', { planId: 'plan-1' }, 'user-2')).status, 404);
    assert.equal((await call(env, '/api/ai/studio/feishu/status', undefined, null)).status, 401);
    assert.equal((await (await call(env, '/api/ai/studio/feishu/status')).json()).credential_configured, false);
});

test('authenticated production candidates retrieve templates before Cloudflare AI and private signed storage', async t => {
    const sourceCalls = [];
    t.mock.method(globalThis, 'fetch', async url => {
        sourceCalls.push(String(url));
        if (String(url).endsWith('poses.json')) return Response.json({ poses: [{ id: 'full_single_P019', names: { zh: '安静坐姿' }, category: '坐姿', variants: [{ angle: 'front' }] }] });
        if (String(url).endsWith('costumes.json')) return Response.json({ costumes: [] });
        if (String(url).endsWith('faces.json')) return Response.json({ images: [] });
        throw new Error('Unexpected template source');
    });
    const jpeg = new Uint8Array([255, 216, 255, 0]);
    const aiCalls = [];
    const env = { ...environment(), AI: { run: async (model, input) => {
        aiCalls.push({ model, input });
        if (model.includes('llama')) return { response: 'One adult in brown knitwear seated steadily on a park bench, muted autumn park colors, natural light, full hands and feet.' };
        return { image: Buffer.from(jpeg).toString('base64') };
    } } };
    const response = await call(env, '/api/director/generate-candidate', {
        request_id: 'cloud-smoke-test', provider: 'cloudflare', model: '@cf/black-forest-labs/flux-1-schnell',
        candidate_count: 1, billing_mode: 'free-credit-first', aspect_ratio: 'portrait',
        brief: '秋日公园坐姿人像，棕色针织衫。', scene_brief: '自然光，不使用闪光灯。', style_direction: '低饱和电影感',
        reference_asset_ids: [],
        reference_ids: ['atlas-pose-full_single_p019'],
        shot_contract: { shot_language: 'park seated portrait', generator_prompt: '35mm eye-level seated portrait, full hands and feet', must_show: 'existing park bench', reject_if: 'flash or cropped feet' },
    });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(aiCalls.length, 2);
    assert.equal(sourceCalls.length, 3);
    assert.match(aiCalls[0].input.messages[1].content, /atlas-pose-full_single_p019/);
    assert.match(aiCalls[0].input.messages[1].content, /坐稳/);
    assert.deepEqual(result.candidateAsset.referenceIds, ['atlas-pose-full_single_p019']);
    assert.equal(aiCalls[1].model, '@cf/black-forest-labs/flux-1-schnell');
    assert.match(aiCalls[1].input.prompt, /seated steadily on a park bench/);
    assert.equal(result.candidateAsset.status, 'candidate-awaiting-human-review');
    assert.equal(result.candidateAsset.source, 'cloudflare-workers-ai');
    assert.equal(result.candidateAsset.poseStatus, 'not-run');
    assert.equal(result.candidateAsset.productionRelease, false);
    assert.match(result.candidateAsset.url, /[?&]sig=[a-f0-9]{64}/);

    const imageUrl = new URL(result.candidateAsset.url, 'https://worker.example');
    const image = await worker.fetch(new Request(imageUrl), env);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('Content-Type'), 'image/jpeg');
    assert.deepEqual(new Uint8Array(await image.arrayBuffer()), jpeg);
    imageUrl.searchParams.set('owner', 'user-2');
    assert.equal((await worker.fetch(new Request(imageUrl), env)).status, 404);
});

async function bridge(t, options = {}) {
    const server = createServer({ studioEnvironment: { POSEATLAS_ENABLED: 'false' }, ...options });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    return { base, post: (path, body, authorization) => fetch(base + path, {
        method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(body),
    }) };
}

test('loopback confirmation uses verified identity and returns a local commit without a cloud write', async t => {
    let credentialLoads = 0;
    const localFeishuConfig = { check: async () => ({ credential_configured: true, connected: true }), sync: async ({ uid, plan }) => ({ status: 'pending', planId: plan.id, owner: uid }) };
    const { base, post } = await bridge(t, { resolveStudioUser: async authorization => authorization === 'Bearer test-account' ? 'local-user' : null,
        aiCredentials: { load: async () => { credentialLoads++; return null; } }, localFeishuConfig });
    assert.equal((await fetch(base + '/api/ai/plan-lite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    const guest = await (await post('/api/ai/plan-lite', { prompt: '自然坐姿', uid: 'spoofed', planId: 'plan-1', expectedRevision: 0 })).json();
    assert.equal(guest.searchReceipt, undefined);
    assert.equal((await post('/api/ai/studio/proposals', {})).status, 401);
    const search = await (await post('/api/ai/plan-lite', { prompt: '自然坐姿', planId: 'plan-1', expectedRevision: 0 }, 'Bearer test-account')).json();
    const proposal = await (await post('/api/ai/studio/proposals', { searchReceipt: search.searchReceipt, selectedIds: [search.selectedIds[0]] }, 'Bearer test-account')).json();
    const commit = await (await post('/api/ai/studio/confirm', { proposalToken: proposal.proposalToken, idempotencyKey: 'local-confirm-test-1' }, 'Bearer test-account')).json();
    assert.equal(commit.storage, 'local');
    assert.equal(commit.expectedRevision, 0);
    assert.equal(commit.plan, undefined);
    assert.equal(credentialLoads, 0);
    assert.equal((await fetch(base + '/api/ai/studio/feishu/status')).status, 401);
    const status = await fetch(base + '/api/ai/studio/feishu/status', { headers: { Authorization: 'Bearer test-account' } });
    assert.equal((await status.json()).credential_configured, true);
    const sync = await (await post('/api/ai/studio/feishu/sync', { planId: 'plan-1', plan: samplePlan }, 'Bearer test-account')).json();
    assert.equal(sync.owner, 'local-user');
    assert.equal(sync.storage, 'local');
});

test('loopback default session resolver uses the fixed existing account service', async t => {
    const urls = [];
    const { post } = await bridge(t, { fetchImpl: async url => {
        urls.push(String(url));
        return Response.json({ success: true, user: { id: 'verified-account' } });
    } });
    const search = await (await post('/api/ai/plan-lite', { prompt: '自然坐姿', planId: 'plan-1', expectedRevision: 0 }, `Bearer ${'a'.repeat(40)}`)).json();
    assert.ok(search.searchReceipt);
    assert.deepEqual(urls, ['https://photoatelier-api.photomagic.workers.dev/api/auth/session']);
});

test('ambiguous loopback intent reuses the encrypted model configuration through one private call', async t => {
    let loads = 0;
    const requests = [];
    const { post } = await bridge(t, {
        resolveStudioUser: async () => 'verified-account',
        aiCredentials: { load: async () => { loads++; return { provider: 'deepseek', model: 'deepseek-v4.1-flash', apiKey: 'test-private-model-key' }; } },
        fetchImpl: async (url, options) => {
            requests.push({ url: String(url), body: JSON.parse(options.body) });
            return Response.json({ choices: [{ message: { content: '{"searches":[{"kind":"pose","query":"自然"}]}' } }] });
        },
    });
    const response = await post('/api/ai/plan-lite', { prompt: '帮我想一些参考' }, 'Bearer test-account');
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(loads, 1);
    assert.equal(result.modelCalls, 1);
    assert.ok(result.selectedTemplates.length > 0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://api.deepseek.com/chat/completions');
    assert.equal(requests[0].body.model, 'deepseek-flash');
    assert.equal(requests[0].body.max_tokens, 512);
    assert.deepEqual(requests[0].body.thinking, { type: 'disabled' });
    assert.doesNotMatch(JSON.stringify(result), /test-private-model-key/);
});

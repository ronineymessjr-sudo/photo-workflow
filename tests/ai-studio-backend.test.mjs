import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker from '../api/index.js';
import { WorkspaceSync } from '../api/workspace-state.mjs';
import { DirectorCandidateSubmissions } from '../api/director-candidate-submissions.mjs';
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

test('durable ModelScope submission keeps a safe provider error code for polling', async t => {
    t.mock.method(globalThis, 'fetch', async input => {
        assert.match(String(input), /api-inference\.modelscope\.cn\/v1\/images\/generations/);
        return Response.json({ message: 'email verification required' }, { status: 403 });
    });
    const records = new Map();
    const actor = new DirectorCandidateSubmissions({ storage: {
        get: async key => records.get(key),
        put: async (key, value) => records.set(key, value),
        list: async ({ prefix = '' } = {}) => new Map([...records].filter(([key]) => key.startsWith(prefix))),
        setAlarm: async () => {},
    } }, { MODELSCOPE_TOKEN: 'test-token' });
    const taskId = 'a'.repeat(32);
    const queued = await actor.fetch(new Request(`https://candidate.internal/candidate-submissions/${taskId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: { prompt: 'editorial portrait', size: '768x1024', modelId: 'Qwen/Qwen-Image-Edit-2511', references: [], variant: {}, locked: {} } }),
    }));
    assert.equal(queued.status, 202);
    await actor.alarm();
    const status = await actor.fetch(new Request(`https://candidate.internal/candidate-submissions/${taskId}/status`));
    const record = await status.json();
    assert.equal(record.status, 'failed');
    assert.equal(record.taskId, taskId);
    assert.equal(record.error, 'GENERATION_ACCOUNT_UNVERIFIED');
    assert.equal(record.upstreamStatus, 403);
    assert.equal(Object.hasOwn(record, 'payload'), false);
});

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

function call(env, path, body, uid = 'user-1', extra = {}, ctx) {
    return worker.fetch(new Request(`https://worker.example${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json',
            ...(uid ? { Authorization: `Bearer ${token(uid, env)}` } : {}), ...extra },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env, ctx);
}

test('ModelScope balance endpoint is authenticated and returns only sanitized balance data', async t => {
    let upstreamMode = 'success';
    t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
        assert.equal(String(input), 'https://modelscope.cn/openapi/v1/magicubes/balance');
        assert.equal(options.headers.Authorization, 'Bearer test-modelscope-token');
        if (upstreamMode === 'unauthorized') return Response.json({ error: 'token must never be forwarded' }, { status: 401 });
        return Response.json({ success: true, data: { available_balance: 180, total_balance: 250, frozen_amount: 70 }, request_id: 'provider-request' });
    });
    const env = { ...environment(), MODELSCOPE_TOKEN: 'test-modelscope-token' };

    const guest = await call(env, '/api/director/modelscope-balance', undefined, null);
    assert.equal(guest.status, 401);

    const response = await call(env, '/api/director/modelscope-balance');
    assert.equal(response.status, 200);
    const balance = await response.json();
    assert.deepEqual(Object.keys(balance).sort(), ['availableBalance', 'checkedAt', 'frozenAmount', 'provider', 'totalBalance', 'unit'].sort());
    assert.deepEqual({ ...balance, checkedAt: undefined }, {
        provider: 'modelscope', unit: 'magicube', availableBalance: 180, totalBalance: 250, frozenAmount: 70, checkedAt: undefined,
    });
    assert.doesNotMatch(JSON.stringify(balance), /test-modelscope-token|provider-request/);

    upstreamMode = 'unauthorized';
    const rejected = await call(env, '/api/director/modelscope-balance');
    assert.equal(rejected.status, 502);
    assert.deepEqual(await rejected.json(), { error: 'MODELSCOPE_CREDENTIAL_REJECTED' });
});

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
    assert.equal((await call(env, '/api/ai/plan-lite', { prompt: '坐姿' + '人'.repeat(1798) }, null)).status, 401);
    assert.equal((await call(env, '/api/ai/plan-lite', { prompt: '自然坐姿' })).status, 200);
    assert.equal((await call(env, '/api/ai/plan-lite', { prompt: '自然坐姿' }, null, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await call(env, '/api/ai/studio/proposals', {}, null)).status, 401);
    assert.equal((await call({ ...env, AI_STUDIO_QUOTA: undefined }, '/api/ai/plan-lite', { prompt: '自然坐姿' })).status, 503);
    const guest = await call(env, '/api/ai/plan-lite', { prompt: '自然坐姿', uid: 'spoofed' }, null);
    assert.equal(guest.status, 401);
    assert.equal((await guest.json()).error, 'SIGN_IN_REQUIRED');
});

test('candidate quota is five per user plus a shared daily free-tier safety cap', async () => {
    const quota = new AiStudioQuota({ storage: storage() });
    const consume = (action, limit) => quota.fetch(new Request('https://quota.internal/consume', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, limit }),
    }));
    for (let index = 0; index < 5; index++) assert.equal((await (await consume('image', 5)).json()).allowed, true);
    assert.equal((await (await consume('image', 5)).json()).allowed, false);
    for (let index = 0; index < 6; index++) assert.equal((await (await consume('image-global', 6)).json()).allowed, true);
    assert.equal((await (await consume('image-global', 6)).json()).allowed, false);
});

test('image allowance is isolated per signed-in user and refuses guests', async () => {
    const env = environment();
    assert.equal(await consumeStudioImageQuota({ uid: null, env }), false);
    for (let index = 0; index < 5; index++) assert.equal(await consumeStudioImageQuota({ uid: 'user-a', env }), true);
    assert.equal(await consumeStudioImageQuota({ uid: 'user-a', env }), false);
    assert.equal(await consumeStudioImageQuota({ uid: 'user-b', env }), true);
    assert.equal(await consumeStudioImageQuota({ uid: 'user-b', env }), 'global-limit');
});

test('a global image-limit denial compensates the user reservation', async () => {
    const env = { ...environment(), STUDIO_IMAGE_USER_LIMIT: '1', STUDIO_IMAGE_GLOBAL_LIMIT: '1' };
    assert.equal(await consumeStudioImageQuota({ uid: 'already-used-user', env }), true);
    assert.equal(await consumeStudioImageQuota({ uid: 'blocked-user', env }), 'global-limit');
    assert.equal(await consumeStudioImageQuota({ uid: 'blocked-user', env: { ...env, STUDIO_IMAGE_GLOBAL_LIMIT: '2' } }), true);
});

test('temporary unlimited image allowance applies only to its exact configured QA user', async () => {
    const env = { ...environment(), STUDIO_IMAGE_TEST_UNLIMITED_USER_ID: 'qa-user\r\n', STUDIO_IMAGE_USER_LIMIT: '1', STUDIO_IMAGE_GLOBAL_LIMIT: '1' };
    for (let index = 0; index < 5; index++) assert.equal(await consumeStudioImageQuota({ uid: 'qa-user', env }), true);

    const nearMatchEnv = { ...environment(), STUDIO_IMAGE_TEST_UNLIMITED_USER_ID: 'qa-user', STUDIO_IMAGE_USER_LIMIT: '1', STUDIO_IMAGE_GLOBAL_LIMIT: '1' };
    assert.equal(await consumeStudioImageQuota({ uid: 'qa-user ', env: nearMatchEnv }), true);
    assert.equal(await consumeStudioImageQuota({ uid: 'qa-user ', env: nearMatchEnv }), false);

    assert.equal(await consumeStudioImageQuota({ uid: 'ordinary-user', env }), true);
    assert.equal(await consumeStudioImageQuota({ uid: 'ordinary-user', env }), false);
    assert.equal(await consumeStudioImageQuota({ uid: 'other-user', env }), 'global-limit');
    const unconfigured = { ...environment(), STUDIO_IMAGE_USER_LIMIT: '1', STUDIO_IMAGE_GLOBAL_LIMIT: '1' };
    assert.equal(await consumeStudioImageQuota({ uid: 'qa-user', env: unconfigured }), true);
    assert.equal(await consumeStudioImageQuota({ uid: 'qa-user', env: unconfigured }), false);
});

test('authenticated session reports active QA image override only to its exact account', async () => {
    const env = { ...environment(), STUDIO_IMAGE_TEST_UNLIMITED_USER_ID: 'qa-user' };
    const qaSession = await (await call(env, '/api/auth/session', undefined, 'qa-user')).json();
    const normalSession = await (await call(env, '/api/auth/session', undefined, 'ordinary-user')).json();
    assert.equal(qaSession.imageQuotaTestOverrideActive, true);
    assert.equal(Object.hasOwn(normalSession, 'imageQuotaTestOverrideActive'), false);
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
        if (String(url).endsWith('poses.json')) return Response.json({ poses: [{ id: 'full_single_P019', names: { zh: '安静坐姿' }, category: '坐姿', variants: [{ angle: 'front', thumb: 'thumbs/full_single_P019_front.jpg' }] }] });
        if (String(url).endsWith('costumes.json')) return Response.json({ costumes: [{ id: 'AUT-0001', cat: 'autumn', main: 'knit', color: 'brown', thumb: 'costume/thumbs/AUT-0001.webp' }] });
        if (String(url).endsWith('faces.json')) return Response.json({ images: [{ id: 'face001', sec: 'face', thumb: 'portrait/thumbs/face001.webp' }] });
        if (/\/thumbs\//.test(String(url))) return new Response(new Uint8Array([255, 216, 255, 0]), { headers: { 'Content-Type': 'image/jpeg' } });
        throw new Error('Unexpected template source');
    });
    const jpeg = new Uint8Array([255, 216, 255, 0]);
    const aiCalls = [];
    const env = { ...environment(), POSEATLAS_ENABLED: 'true', AI: { run: async (model, input) => {
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
        shot_contract: { shot_language: 'park seated portrait', generator_prompt: '35mm eye-level seated portrait, full hands and feet', referenceIds: ['atlas-pose-full_single_p019'], must_show: 'existing park bench', reject_if: 'flash or cropped feet' },
    });
    assert.equal(response.status, 201, await response.clone().text());
    const result = await response.json();
    assert.equal(aiCalls.length, 2);
    assert.equal(sourceCalls.length, 4);
    assert.match(aiCalls[0].input.messages[1].content, /自然光/);
    assert.deepEqual(result.candidateAsset.referenceImages.map(image => image.kind), ['pose']);
    assert.equal(aiCalls[1].model, '@cf/black-forest-labs/flux-1-schnell');
    const form = await new Response(aiCalls[1].input.multipart.body, { headers: { 'Content-Type': aiCalls[1].input.multipart.contentType } }).formData();
    assert.match(form.get('prompt'), /seated steadily on a park bench/);
    assert.ok(form.get('input_image_0'));
    assert.equal(form.has('input_image_1'), false);
    assert.match(form.get('prompt'), /Follow the selected PoseAtlas action described in the shot contract as text/);
    assert.doesNotMatch(form.get('prompt'), /black-and-white artist drawing/);
    assert.equal(result.selected_shot_contract.generator_prompt, form.get('prompt'));
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

test('ModelScope candidate submits asynchronously, collects once, persists privately, and never calls Workers AI', async t => {
    const sourceCalls = [];
    const modelScopeCalls = [];
    let releaseModelScope;
    const modelScopeGate = new Promise(resolve => { releaseModelScope = resolve; });
    const taskCache = new Map();
    const jpeg = new Uint8Array([255, 216, 255, 0]);
    t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
        const url = String(input);
        if (url.includes('api-inference.modelscope.cn/v1/images/generations')) {
            modelScopeCalls.push(JSON.parse(options.body));
            await modelScopeGate;
            return Response.json({ task_id: 'candidate-task-1' });
        }
        if (url.includes('api-inference.modelscope.cn/v1/tasks/candidate-task-1')) {
            return Response.json({ task_status: 'SUCCEED', output_images: ['https://images.test/candidate.jpg'] });
        }
        if (url === 'https://images.test/candidate.jpg') return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
        sourceCalls.push(url);
        if (url.endsWith('poses.json')) return Response.json({ poses: [{ id: 'full_single_P019', names: { zh: '安静坐姿' }, category: '坐姿', variants: [{ angle: 'front', thumb: 'thumbs/full_single_P019_front.jpg' }] }] });
        if (url.endsWith('costumes.json')) return Response.json({ costumes: [{ id: 'AUT-0001', cat: 'autumn', main: 'knit', color: 'brown', thumb: 'costume/thumbs/AUT-0001.webp' }] });
        if (url.endsWith('faces.json')) return Response.json({ images: [{ id: 'face001', sec: 'face', thumb: 'portrait/thumbs/face001.webp' }] });
        if (/\/thumbs\//.test(url)) return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
        throw new Error(`Unexpected template source ${url}`);
    });
    const env = {
        ...environment(), POSEATLAS_ENABLED: 'true', MODELSCOPE_TOKEN: 'test-token',
        CONTINUITY_KV: {
            get: async key => taskCache.has(key) ? taskCache.get(key) : null,
            put: async (key, value) => taskCache.set(key, JSON.parse(value)),
        },
        AI: { run: async () => assert.fail('ModelScope route must not call Cloudflare Workers AI') },
    };
    const requestBody = {
        request_id: 'modelscope-smoke-test', provider: 'modelscope', model: 'Qwen/Qwen-Image-2.1-Turbo',
        candidate_count: 1, billing_mode: 'free-credit-first', aspect_ratio: 'portrait',
        brief: '秋日公园坐姿人像，成年女性穿棕色针织衫。', scene_brief: '公园长椅，自然光。', style_direction: '真实纪实摄影',
        reference_ids: ['atlas-pose-full_single_p019'],
        shot_contract: { shot_language: '公园坐姿人像', generator_prompt: '平视中全身人像，双手自然放在膝上，双脚完整入镜',
            shot_size: '全身', model_pose: '安静坐在长椅上，双脚着地', wardrobe_styling: '棕色针织衫、卡其色半身裙、棕色短靴',
            referenceIds: ['atlas-pose-full_single_p019'], must_show: '长椅和完整双脚', reject_if: '闪光灯或裁切脚部' },
    };
    const submissionStorage = new Map();
    const submissionActor = new DirectorCandidateSubmissions({ storage: {
        get: async key => structuredClone(submissionStorage.get(key)),
        put: async (key, value) => submissionStorage.set(key, structuredClone(value)),
        list: async ({ prefix = '' } = {}) => new Map([...submissionStorage].filter(([key]) => key.startsWith(prefix))),
        setAlarm: async () => {},
    } }, env);
    env.CANDIDATE_SUBMISSIONS = { idFromName: name => name, get: () => ({ fetch: input => submissionActor.fetch(input) }) };
    const response = await call(env, '/api/director/generate-candidate', requestBody);
    assert.equal(response.status, 202, await response.clone().text());
    const submitted = await response.json();
    assert.match(submitted.taskId, /^[a-f0-9]{32}$/);
    assert.equal(submitted.request_id, 'modelscope-smoke-test');
    assert.equal(submitted.status, 'pending');
    assert.equal(modelScopeCalls.length, 0, 'the request returns before provider submission starts');
    assert.ok([...taskCache.values()].some(value => value.status === 'submitting'), 'the local task must be pollable before upstream submission finishes');
    releaseModelScope();
    await submissionActor.alarm();
    assert.equal(modelScopeCalls.length, 1);
    assert.match(modelScopeCalls[0].prompt, /卡其色半身裙/);
    assert.match(modelScopeCalls[0].prompt, /Image 1（pose）/);
    assert.match(modelScopeCalls[0].prompt, /公园长椅/);
    assert.equal(modelScopeCalls[0].model, 'Qwen/Qwen-Image-2.1-Turbo');
    assert.equal(modelScopeCalls[0].image_url.length, 1);
    assert.equal(sourceCalls.length, 4);

    const replaySubmission = await call(env, '/api/director/generate-candidate', requestBody);
    assert.equal(replaySubmission.status, 202);
    assert.equal((await replaySubmission.json()).taskId, submitted.taskId);
    assert.equal(modelScopeCalls.length, 1, 'replaying a request id must not submit or bill twice');

    const collected = await call(env, '/api/director/collect-candidate', { taskId: submitted.taskId });
    assert.equal(collected.status, 201, await collected.clone().text());
    const candidate = await collected.json();
    assert.equal(candidate.candidateAsset.source, 'modelscope');
    assert.equal(candidate.candidateAsset.status, 'candidate-awaiting-human-review');
    assert.deepEqual(candidate.candidateAsset.referenceRolesSent, ['pose']);
    assert.match(candidate.candidateAsset.url, /[?&]sig=[a-f0-9]{64}/);
    const replay = await call(env, '/api/director/collect-candidate', { taskId: submitted.taskId });
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).candidateAsset.id, candidate.candidateAsset.id);
    const image = await worker.fetch(new Request(candidate.candidateAsset.url, { headers: { Origin: origin } }), env);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('Content-Type'), 'image/jpeg');
    assert.deepEqual(new Uint8Array(await image.arrayBuffer()), jpeg);
});

test('ModelScope waist-up P017 candidates crop the diagonal PoseAtlas guide and preserve the contract crop', async t => {
    const taskCache = new Map();
    const storedPhotographyAssets = new Map();
    const jpeg = new Uint8Array([255, 216, 255, 0]);
    const photographyJpeg = new Uint8Array([255, 216, 255, 42, 43, 44]);
    const croppedPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...new Array(16).fill(0)]);
    new DataView(croppedPng.buffer).setUint32(16, 700);
    new DataView(croppedPng.buffer).setUint32(20, 900);
    const crops = [];
    const poseFetches = [];
    const env = {
        ...environment(), POSEATLAS_ENABLED: 'true', MODELSCOPE_TOKEN: 'test-token',
        CONTINUITY_KV: { get: async key => taskCache.get(key) || null, put: async (key, value) => taskCache.set(key, JSON.parse(value)) },
        CONTINUITY_ASSETS: {
            async get(key) {
                const entry = storedPhotographyAssets.get(key);
                if (!entry) return null;
                return { arrayBuffer: async () => entry.bytes.slice().buffer, customMetadata: entry.metadata };
            },
            async put(key, bytes, options = {}) { storedPhotographyAssets.set(key, { bytes: new Uint8Array(bytes), metadata: options.customMetadata || {} }); },
        },
        IMAGES: { input: () => ({ transform: options => ({ output: () => ({ response: () => {
            crops.push(options.trim);
            return new Response(croppedPng, { headers: { 'Content-Type': 'image/png' } });
        } }) }) }) },
        AI: { run: async () => assert.fail('ModelScope route must not call Cloudflare Workers AI') },
    };
    const submissionStorage = new Map();
    const submissionActor = new DirectorCandidateSubmissions({ storage: {
        get: async key => structuredClone(submissionStorage.get(key)),
        put: async (key, value) => submissionStorage.set(key, structuredClone(value)),
        list: async ({ prefix = '' } = {}) => new Map([...submissionStorage].filter(([key]) => key.startsWith(prefix))),
        setAlarm: async () => {},
    } }, env);
    env.CANDIDATE_SUBMISSIONS = { idFromName: name => name, get: () => ({ fetch: input => submissionActor.fetch(input) }) };
    let submittedBody;
    t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
        const url = String(input);
        if (url.includes('api-inference.modelscope.cn/v1/images/generations')) {
            submittedBody = JSON.parse(options.body);
            return Response.json({ task_id: 'near-candidate-task' });
        }
        if (url.includes('api-inference.modelscope.cn/v1/tasks/near-candidate-task')) return Response.json({ task_status: 'SUCCEED', output_images: ['https://images.test/near.jpg'] });
        if (url === 'https://images.test/near.jpg') return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
        if (url === 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/full_single_P017_diag.jpg') {
            poseFetches.push(url);
            return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
        }
        if (url.endsWith('poses.json')) return Response.json({ poses: [{ id: 'full_single_P017', no: 'P017', names: { zh: '站立回眸' }, category: '站姿', variants: [{ angle: 'front', thumb: 'thumbs/full_single_P017_front.jpg' }] }] });
        if (url.endsWith('costumes.json')) return Response.json({ costumes: [] });
        if (url.endsWith('faces.json')) return Response.json({ images: [{ id: 'face001', sec: 'face', thumb: 'portrait/thumbs/face001.webp' }] });
        if (/\/thumbs\//.test(url)) return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
        throw new Error(`Unexpected template source ${url}`);
    });
    const photographyUpload = await call(env, '/api/continuity/asset', {
        dataUrl: `data:image/jpeg;base64,${Buffer.from(photographyJpeg).toString('base64')}`, role: 'misc',
    });
    assert.equal(photographyUpload.status, 201);
    const photographyAsset = await photographyUpload.json();
    const submitResponse = await call(env, '/api/director/generate-candidate', {
        request_id: 'near-candidate-test', provider: 'modelscope', model: 'Qwen/Qwen-Image-2.1-Turbo',
        candidate_count: 1, billing_mode: 'free-credit-first', aspect_ratio: 'portrait',
        photography_reference_asset_id: photographyAsset.assetId,
        brief: '秋日开放湖边的真实人物摄影，成年东亚女性，自然纪实质感。',
        scene_brief: '无遮挡的湖边木栈道，水面清晰可见，不出现亭子、屋檐、长椅或建筑。',
        style_direction: '自然纪实，低饱和胶片色，克制，不做电影剧照式摆拍。',
        reference_ids: ['atlas-pose-full_single_p017', 'atlas-portrait-face001'],
        reference_brief: { modelDesc: '成年东亚女性模特，浅棕色齐肩短发、自然妆容。' },
        shot_contract: { shot_language: '湖边木栈道腰上人像', shot_size: '中景',
            generator_prompt: 'Photograph the same adult East Asian woman on the open lakeside wooden pier. Compose a waist-up portrait from crown to the natural waistline; keep the woman slightly right of center. Turn her torso three-quarter away from camera, the near shoulder closer and larger, the far shoulder receding; she turns her head back toward frame-left and looks just past the camera, not into the lens. Keep the lake and diagonal pier boards readable.',
            model_pose: '上半身转离镜头约四十五度，再回头看向画面左侧，肩颈放松。',
            wardrobe_styling: '米白色长袖针织裹身上衣，标准合肩剪裁，覆盖双肩、上胸至自然腰线；不加首饰、包或肩带。',
            referenceIds: ['atlas-pose-full_single_p017'],
            must_show: '面部与眼睛清晰；肩线明显斜向画面；人物占画面约70%；下缘贴自然腰线；湖面与木栈道斜线可辨。',
            reject_if: '正面证件照式站姿、双肩平行正对镜头、直视镜头、全身、露腹或肩部裸露、塑料皮肤、过度磨皮、额外人物、亭子或建筑' },
    });
    const submitted = await submitResponse.json();
    assert.equal(submitResponse.status, 202, JSON.stringify(submitted));
    assert.equal(submitted.status, 'pending');
    await submissionActor.alarm();
    assert.equal(submittedBody.image_url.length, 3, 'waist-up submits identity, photography aesthetic and pose-only references');
    assert.match(submittedBody.prompt, /Image 2（photography）/);
    assert.match(submittedBody.prompt, /Image 3（pose）/);
    assert.match(submittedBody.prompt, /仅用于摄影审美/);
    assert.match(submittedBody.prompt, /发生冲突时以文字方案为准/);
    assert.match(submittedBody.prompt, /仅用于身体动作、肢体关系、肩线、头部朝向和重心/);
    assert.match(submittedBody.prompt, /上半身转离镜头约四十五度/);
    assert.match(submittedBody.prompt, /无遮挡的湖边木栈道/);
    assert.doesNotMatch(submittedBody.prompt, /竹叶|树叶与草地/);
    assert.deepEqual(poseFetches, ['https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/full_single_P017_diag.jpg']);
    assert.match(submittedBody.image_url[1], /data:image\/jpeg;base64,/);
    assert.ok(submittedBody.image_url[1].endsWith(Buffer.from(photographyJpeg).toString('base64')));
    assert.match(submittedBody.image_url[2], /data:image\/png;base64,/);
    assert.ok(submittedBody.image_url[2].endsWith(Buffer.from(croppedPng).toString('base64')));
    const response = await call(env, '/api/director/collect-candidate', { taskId: submitted.taskId });
    assert.equal(response.status, 201);
    const candidate = await response.json();
    assert.deepEqual(crops, [
        { top: 0, left: 0.12, width: 0.76, height: 0.60 },
        { top: 0, left: 0.04, width: 0.92, height: 0.92 },
    ]);
    assert.equal(candidate.candidateAsset.frameCrop, 'waist-up-contract');
    assert.equal(candidate.candidateAsset.referenceRolesSent.includes('identity'), true);
    assert.equal(candidate.candidateAsset.referenceRolesSent.includes('photography'), true);
    assert.equal(candidate.candidateAsset.referenceRolesSent.includes('pose'), true);
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

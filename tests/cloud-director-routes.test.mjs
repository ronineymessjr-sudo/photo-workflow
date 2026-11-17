import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createGuestPlanDraft } from '../api/director-plan.mjs';
import worker from '../api/index.js';

test('production image generation has per-account and site-wide daily limits', async () => {
    const config = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(config, /STUDIO_IMAGE_USER_LIMIT\s*=\s*"50"/);
    assert.match(config, /STUDIO_IMAGE_GLOBAL_LIMIT\s*=\s*"50"/);
    assert.match(html, /每个账号每天最多 50 张，全站每天最多 50 张/);
    assert.match(html, /候选生图上限（每个账号 50 张）/);
    assert.match(html, /候选图额度（全站 50 张）/);
});

test('template fallback is visibly distinct from a real Director result', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /source === 'guest-rule-draft'/);
    assert.match(html, /以下不是模型生成结果/);
    assert.match(html, /模板草稿已保存（未连接 Director）/);
});

test('cloud Director rejects zero-person portrait briefs before calling the model', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('portrait model must not run for a zero-person brief'); };
    try {
        const secret = 'unit-test-secret';
        const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', secret)}` },
            body: JSON.stringify({ theme: '陶瓷杯静物产品图', people: '0' }),
        }), { JWT_SECRET: secret, DIRECTOR_API_BASE: 'https://director.example.test' });
        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.code, 'PERSON_REQUIRED');
        assert.match(body.error, /纯静物方案暂未支持/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('guest multi-person plan uses interaction-led shots without assuming romance', () => {
    const plan = createGuestPlanDraft({
        theme: '雨夜双人纪实',
        modelDesc: '两位成年朋友',
        scene: '地铁口与雨巷',
        mood: '克制、亲密',
        duration: '2小时',
        people: '2',
        extra: '以交流与共同观察为主',
    });

    assert.equal(plan.shotList.length, 12);
    assert.equal(new Set(plan.shotList.map(shot => shot.title)).size, 12);
    assert.ok(plan.shotList.some(shot => shot.title === '边走边交谈'));
    assert.ok(plan.shotList.some(shot => shot.title === '共同看向同一处'));
    assert.ok(plan.shotList.every(shot => shot.description.includes('两位人物')));
    assert.ok(plan.shotList.every(shot => !/必须牵手|拥吻|情侣/.test(shot.description)));
    assert.ok(new Set(plan.shotList.map(shot => shot.method)).size > 1);
});

test('cloud image generation blocks guests before any AI binding call', async () => {
    let aiCalls = 0;
    const request = () => new Request('https://unit.test/api/director/generate-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_count: 1 }),
    });
    const env = { JWT_SECRET: 'unit-test-secret', AI: { run: async () => { aiCalls++; return {}; } } };
    const anonymous = await worker.fetch(request(), env);
    assert.equal(anonymous.status, 401);
    assert.equal((await anonymous.json()).error, 'SIGN_IN_REQUIRED');
    const authenticated = await worker.fetch(new Request('https://unit.test/api/director/generate-candidate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', 'unit-test-secret')}` },
        body: JSON.stringify({ candidate_count: 1 }),
    }), env);
    assert.equal(authenticated.status, 503);
    assert.equal((await authenticated.json()).error, 'CANDIDATE_STORAGE_NOT_CONFIGURED');
    assert.equal(aiCalls, 0);
});

test('continuity generation validates reference contracts before charging image quotas', async () => {
    const secret = 'unit-test-secret';
    const actions = [];
    let aiCalls = 0;
    const env = {
        JWT_SECRET: secret,
        AI: { run: async () => { aiCalls += 1; return {}; } },
        AI_STUDIO_QUOTA: {
            idFromName: name => name,
            get(id) {
                return {
                    async fetch(input, init) {
                        const request = input instanceof Request ? input : new Request(input, init);
                        const { action } = await request.json();
                        actions.push({ id, action });
                        return Response.json({ allowed: true });
                    },
                };
            },
        },
    };
    const makeRequest = authorization => new Request('https://unit.test/api/continuity/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
        body: JSON.stringify({}),
    });

    const guest = await worker.fetch(makeRequest(), env);
    assert.equal(guest.status, 401);
    assert.equal((await guest.json()).error, 'SIGN_IN_REQUIRED');
    assert.deepEqual(actions, []);

    const authorization = `Bearer ${token('user-1', secret)}`;
    const invalid = await worker.fetch(makeRequest(authorization), env);
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, 'CONTINUITY_SHOT_REQUIRED');
    assert.deepEqual(actions, []);
    assert.equal(aiCalls, 0);
});

test('continuity collect keeps an upstream task pending when polling has a transient network error', async () => {
    const secret = 'unit-test-secret';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/continuity/collect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token('user-1', secret)}`,
            },
            body: JSON.stringify({ taskId: 'still-running-task', shotId: 'shot-01' }),
        }), { JWT_SECRET: secret, MODELSCOPE_TOKEN: 'test-only' });

        assert.equal(response.status, 503);
        assert.match(response.headers.get('content-type') || '', /application\/json/);
        assert.deepEqual(await response.json(), {
            status: 'pending', terminal: false, retryable: true, shotId: 'shot-01', taskId: 'still-running-task',
            code: 'GENERATION_POLL_RETRYABLE',
            error: '暂时无法查询魔搭任务，请稍后继续查询同一任务',
        });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('continuity collect stops retrying a terminal task-not-found response', async () => {
    const secret = 'unit-test-secret';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ task_status: 'FAILED', errors: { message: 'task not found' } });
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/continuity/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', secret)}` },
            body: JSON.stringify({ taskId: 'missing-task', shotId: 'shot-01' }),
        }), { JWT_SECRET: secret, MODELSCOPE_TOKEN: 'test-only' });
        assert.equal(response.status, 502);
        assert.deepEqual(await response.json(), {
            status: 'failed', terminal: true, retryable: false, shotId: 'shot-01',
            code: 'GENERATION_UPSTREAM_FAILED', error: '魔搭任务失败：task not found', httpStatus: 502,
        });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('continuity collect keeps a provider HTTP 503 pending and retryable', async () => {
    const secret = 'unit-test-secret';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('upstream unavailable', { status: 503 });
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/continuity/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', secret)}` },
            body: JSON.stringify({ taskId: 'still-running-task', shotId: 'shot-01' }),
        }), { JWT_SECRET: secret, MODELSCOPE_TOKEN: 'test-only' });
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), {
            status: 'pending', terminal: false, retryable: true, shotId: 'shot-01', taskId: 'still-running-task',
            code: 'GENERATION_POLL_RETRYABLE', error: '魔搭暂时无法查询任务（HTTP 503），请稍后继续查询同一任务',
        });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('cloud plans stay text-only when the Cloudflare AI binding is unavailable', async () => {
    const originalFetch = globalThis.fetch;
    const secret = 'unit-test-secret';
    globalThis.fetch = async () => Response.json({ shot_plans: [{ shot_language: 'wide', model_pose: 'Walk together', framing: 'Environment wide' }] });
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', secret)}` },
            body: JSON.stringify({ theme: 'walk', modelDesc: 'two adults', people: '2' }),
        }), { JWT_SECRET: secret, DIRECTOR_API_BASE: 'https://director.example.test' });
        const plan = await response.json();
        assert.equal(response.status, 200);
        assert.equal(plan.director.imageGenerationConnected, false);
        assert.equal(plan.director.imageGenerationMode, 'cloud-image-provider-not-configured');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('authenticated plan requests use Workers AI and never return an unlabelled rule draft', async () => {
    const secret = 'unit-test-secret';
    const quotaActions = [];
    let planCalls = 0;
    const fields = ['镜头名称', '人物动作口令', '摄影师站位', '35mm', '人物位置', '服装与妆发', '现场光用法', '道具', '裁切范围', '必须看见', '废片判据', '替代做法', 'english 35mm portrait prompt', 'FS', 'eye_level'];
    const rows = Array.from({ length: 9 }, (_, index) => {
        const row = [...fields];
        row[0] = `场景交代${index}`;
        row[1] = `双脚站稳后轻转肩线${index}`;
        row[2] = '距主体约3米，平视拍摄';
        row[4] = '画面中心偏左';
        row[5] = '按用户提供的服装';
        row[6] = '利用现场柔和侧光';
        row[7] = '无';
        row[8] = '从头顶至脚下完整入画';
        row[9] = '完整人物与自然表情';
        row[10] = '动作僵硬或裁切脚部';
        row[11] = '站立不适时改为自然坐姿';
        row[12] = `full body portrait, natural standing pose ${index}, 35mm`;
        return row;
    });
    const env = {
        JWT_SECRET: secret,
        AI_STUDIO_QUOTA: { idFromName: value => value, get: id => ({ fetch: async (input, init) => {
            const request = input instanceof Request ? input : new Request(input, init);
            const { action, limit } = await request.json();
            quotaActions.push({ id, action, limit });
            return Response.json({ allowed: true });
        } }) },
        AI: { run: async (_model, options) => {
            if (options.response_format?.type === 'json_object') {
                planCalls += 1;
                return { response: JSON.stringify({ shots: rows }) };
            }
            return { response: JSON.stringify({ answers: {
                brief_sufficient: { noul: 0.05 }, shot_sequence_quality: { score: 2, confidence: 0.9 },
                execution_feasibility: { score: 2, confidence: 0.9 }, duplicate_risk: { noul: 0.05 },
            } }) };
        } },
    };
    const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', secret)}` },
        body: JSON.stringify({ theme: '自然人像', scene: '公园', modelDesc: '一位成年人', people: '1', duration: '1小时' }),
    }), env);
    const plan = await response.json();
    assert.equal(response.status, 200, JSON.stringify(plan));
    assert.equal(plan.director.source, 'cloudflare-workers-ai-plan');
    assert.equal(plan.director.provider, 'cloudflare-workers-ai');
    assert.equal(plan.shotList.length, 9);
    assert.equal(planCalls, 1);
    assert.deepEqual(quotaActions.map(item => item.action), ['plan', 'plan']);
    assert.deepEqual(quotaActions.map(item => item.limit), [5, 50]);
});

test('Cloudflare Workers AI accepts parsed JSON object responses and performs quality repair retry', async () => {
    const secret = 'unit-test-secret';
    let planCalls = 0;
    const validRows = Array.from({ length: 9 }, (_, index) => [
        `自然林间镜头 ${index + 1}`, '模特自然站立看向左侧林荫', '距主体约3米，胸口高度平视', '50mm', '人物位于画面偏左',
        '日常简约服装，自然妆发待确认', '树荫漫反射自然光', '无', '从头顶至脚下完整入画', '完整人物与自然表情',
        '动作僵硬或裁切脚部', '站立不适时改为自然坐姿', `full body portrait, natural standing pose ${index}, 50mm`,
        'FS', 'eye_level',
    ]);
    const brokenRows = validRows.map((row, idx) => idx === 0 ? row.map((v, i) => i === 7 ? '带一把透明雨伞' : v) : row);
    const env = {
        JWT_SECRET: secret,
        AI_STUDIO_QUOTA: { idFromName: value => value, get: () => ({ fetch: async () => Response.json({ allowed: true }) }) },
        AI: {
            run: async (_model, options) => {
                if (options.response_format?.type === 'json_object') {
                    planCalls += 1;
                    if (planCalls === 1) return { response: { shots: brokenRows } };
                    const prior = JSON.parse(options.messages.find(m => m.role === 'assistant')?.content || '{}');
                    assert.ok(Array.isArray(prior.shots), 'repair turn preserves compact shots array format');
                    return { response: { shots: validRows } };
                }
                return { response: JSON.stringify({ answers: {
                    brief_sufficient: { noul: 0.05 }, shot_sequence_quality: { score: 2, confidence: 0.9 },
                    execution_feasibility: { score: 2, confidence: 0.9 }, duplicate_risk: { noul: 0.05 },
                } }) };
            },
        },
    };
    const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', secret)}` },
        body: JSON.stringify({ theme: '自然人像', scene: '公园', modelDesc: '一位成年人', people: '1', duration: '1小时', extra: '不新增道具' }),
    }), env);
    const plan = await response.json();
    assert.equal(response.status, 200, JSON.stringify(plan));
    assert.equal(planCalls, 2);
    assert.equal(plan.director.qualityRepairAttempted, true);
    assert.equal(plan.shotList[0].camera.aperture, 'f/2.8–f/4.0（保证人物轮廓与服装质感锐利）');
});

test('authenticated plan request fails clearly instead of returning a rule draft when no model binding exists', async () => {
    const secret = 'unit-test-secret';
    const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', secret)}` },
        body: JSON.stringify({ theme: '自然人像', modelDesc: '一位成年人' }),
    }), { JWT_SECRET: secret });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
        error: '摄影方案 AI 当前未连接，请稍后重试或在设置中接入自己的 AI。', code: 'PLAN_PROVIDER_NOT_CONFIGURED',
    });
});

test('director plan falls back to configured MiniMax after Cloudflare free neurons are exhausted', async () => {
    const secret = 'unit-test-secret';
    const previousFetch = globalThis.fetch;
    const rows = Array.from({ length: 9 }, (_, index) => [
        `公园自然人像 ${index + 1}`, '模特自然站立观察树影', '距主体约3米，胸口高度平视', '50mm', '人物位于画面偏左',
        '素色日常服装，发型自然', '树荫漫反射自然光', '无', '从头顶至脚下完整入画', '人物全身与自然表情',
        '姿势僵硬或裁掉脚部', '站立不适时暂停休息后再拍', `full body portrait natural standing pose ${index + 1}, 50mm`, 'FS', 'eye_level',
    ]);
    globalThis.fetch = async url => {
        assert.equal(String(url), 'https://api.minimax.cn/v1/chat/completions');
        return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ shots: rows }) } }] });
    };
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', secret)}` },
            body: JSON.stringify({ theme: '公园自然人像', scene: '公园小径', modelDesc: '一位成年人', people: '1', duration: '1小时' }),
        }), {
            JWT_SECRET: secret, MINIMAX_API_KEY: 'server-minimax-key',
            AI: { run: async () => { throw new Error('4006: you have used up your daily free allocation of 10,000 neurons'); } },
            AI_STUDIO_QUOTA: { idFromName: value => value, get: () => ({ fetch: async () => Response.json({ allowed: true }) }) },
        });
        const plan = await response.json();
        assert.equal(response.status, 200, JSON.stringify(plan));
        assert.equal(plan.director.source, 'minimax-plan');
        assert.equal(plan.director.provider, 'minimax');
        assert.equal(plan.shotList.length, 9);
    } finally { globalThis.fetch = previousFetch; }
});

test('server model plan generation fails closed when its per-user or global quota is unavailable', async () => {
    const secret = 'unit-test-secret';
    let aiCalls = 0;
    const request = () => new Request('https://unit.test/api/director/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', secret)}` },
        body: JSON.stringify({ theme: '自然人像', modelDesc: '一位成年人' }),
    });
    const ai = { run: async () => { aiCalls += 1; return {}; } };
    const noQuota = await worker.fetch(request(), { JWT_SECRET: secret, AI: ai });
    assert.equal(noQuota.status, 503);
    assert.equal((await noQuota.json()).code, 'AI_PLAN_QUOTA_NOT_CONFIGURED');
    const limited = await worker.fetch(request(), { JWT_SECRET: secret, AI: ai, AI_STUDIO_QUOTA: {
        idFromName: value => value, get: () => ({ fetch: async (input, init) => {
            const quotaRequest = input instanceof Request ? input : new Request(input, init);
            const { action } = await quotaRequest.json();
            return Response.json({ allowed: action !== 'plan' });
        } }),
    } });
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).code, 'AI_PLAN_DAILY_LIMIT_REACHED');
    assert.equal(aiCalls, 0);
});

test('unauthenticated plan request returns 401 SIGN_IN_REQUIRED instead of claiming quota is exhausted', async () => {
    const secret = 'unit-test-secret';
    let aiCalls = 0;
    const anonymousDirector = await worker.fetch(new Request('https://unit.test/api/director/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: '自然人像', modelDesc: '一位成年人' }),
    }), { JWT_SECRET: secret, AI: { run: async () => { aiCalls++; return {}; } } });
    assert.equal(anonymousDirector.status, 401);
    assert.equal((await anonymousDirector.json()).error, 'SIGN_IN_REQUIRED');

    const anonymousAi = await worker.fetch(new Request('https://unit.test/api/ai/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'cloudflare-workers-ai', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', input: { theme: '自然人像' } }),
    }), { JWT_SECRET: secret, AI: { run: async () => { aiCalls++; return {}; } } });
    assert.equal(anonymousAi.status, 401);
    assert.equal((await anonymousAi.json()).error, 'SIGN_IN_REQUIRED');
    assert.equal(aiCalls, 0);
});

test('the deployed site honors reference-library planning even when Director is configured', async () => {
    const originalFetch = globalThis.fetch;
    const fetched = [];
    let directorCalls = 0;
    globalThis.fetch = async (url, init = {}) => {
        const target = String(url);
        fetched.push(target);
        if (target.endsWith('/v1/photoatelier/shoot-plan')) {
            directorCalls++;
            const request = JSON.parse(init.body || '{}');
            assert.match(request.brief, /atlas-pose-full_single_p015/);
            return Response.json({ shot_plans: [{ shot_language: 'Director构思的环境人像', model_pose: '模特自然站立并观察街景', photographer_position: '距人物约4米平视' }] });
        }
        if (target.endsWith('/data/poses.json')) return Response.json({ poses: [
            { id: 'full_single_P015', no: 'P015', category: '站姿', names: { zh: '手扶腰自然站姿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P015_front.jpg' }] },
            { id: 'full_single_P016', no: 'P016', category: '站姿', names: { zh: '自然整理发丝' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P016_front.jpg' }] },
            { id: 'full_single_P017', no: 'P017', category: '站姿', names: { zh: '站立回眸' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P017_front.jpg' }] },
            { id: 'full_single_P018', no: 'P018', category: '站姿', names: { zh: '双手轻扶腰侧' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P018_front.jpg' }] },
        ] });
        if (target.endsWith('/data/costumes.json')) return Response.json({ costumes: [
            { id: 'AUT-0006', thumb: 'costume/thumbs/AUT-0006.webp', cat: 'autumn', group: 'top', color: 'brown', main: 'knit', tags: ['brown', 'knit', 'skirt', 'boots'] },
        ] });
        if (target.endsWith('/data/faces.json')) return Response.json({ images: [
            { id: 'test-face', thumb: 'portrait/thumbs/test-face.webp', sec: 'face', hair: 'medium', style: '自然人像参考' },
        ] });
        throw new Error(`Unexpected request: ${target}`);
    };
    try {
        const secret = 'unit-test-secret';
        const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', secret)}` }, body: JSON.stringify({
                theme: '秋日人像', scene: '公园小径；木亭长椅', modelDesc: '棕色针织上衣',
                duration: '1小时', people: '1', useReferenceLibrary: true,
                referenceIds: ['atlas-pose-full_single_p015', 'atlas-pose-full_single_p016', 'atlas-pose-full_single_p017', 'atlas-pose-full_single_p018', 'atlas-costume-aut-0006', 'atlas-portrait-test-face'],
            }),
        }), { JWT_SECRET: secret, DIRECTOR_API_BASE: 'https://director.example.test' });
        const plan = await response.json();
        assert.equal(response.status, 200);
        assert.equal(plan.director.source, 'director-shoot-plan');
        assert.equal(directorCalls, 1);
        assert.equal(fetched.filter(url => url.includes('/data/')).length, 3);
        assert.equal(plan.shotList[0].title, '人像拍摄镜头 1');
        assert.equal(plan.aiStudio.references.some(reference => reference.kind === 'pose'), true);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('site plan and multi-scene candidate generation keep selected outfit and per-shot pose references aligned without injecting face references', async () => {
    const originalFetch = globalThis.fetch;
    const requestPrompts = [];
    const imagePrompts = [];
    const stored = new Map();
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const webp = Buffer.from([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]);
    globalThis.fetch = async url => {
        const target = String(url);
        if (target.endsWith('/data/poses.json')) return Response.json({ poses: [
            { id: 'full_single_P015', no: 'P015', category: '站姿', names: { zh: '自然错步站姿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P015_front.jpg' }] },
            { id: 'full_single_P016', no: 'P016', category: '站姿', names: { zh: '轻触发丝站姿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P016_front.jpg' }] },
            { id: 'full_single_P017', no: 'P017', category: '站姿', names: { zh: '自然回眸站姿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P017_front.jpg' }] },
            { id: 'full_single_P018', no: 'P018', category: '站姿', names: { zh: '双手轻扶腰侧' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P018_front.jpg' }] },
            { id: 'full_single_P021', no: 'P021', category: '站姿', names: { zh: '一手抚颈一手扶腿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P021_front.jpg' }] },
            { id: 'full_single_P023', no: 'P023', category: '站姿', names: { zh: '自然侧身回望' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P023_front.jpg' }] },
        ] });
        if (target.endsWith('/data/costumes.json')) return Response.json({ costumes: [
            { id: 'AUT-0118', thumb: 'costume/thumbs/AUT-0118.webp', cat: 'autumn', group: 'top', color: 'ivory', main: 'knit', tags: ['knit', 'ivory', 'khaki', 'skirt', 'brown', 'boots'] },
        ] });
        if (target.endsWith('/data/faces.json')) return Response.json({ images: [
            { id: 'test-face', thumb: 'portrait/thumbs/test-face.webp', sec: 'face', hair: 'medium', style: '自然人像参考' },
        ] });
        if (target.endsWith('.webp')) return new Response(webp, { headers: { 'Content-Type': 'image/webp' } });
        if (target.endsWith('.jpg')) return new Response(Buffer.from([255, 216, 255, 0]), { headers: { 'Content-Type': 'image/jpeg' } });
        throw new Error('UNEXPECTED_REFERENCE_FETCH');
    };
    const workspace = {
        idFromName: name => name,
        get: id => ({ fetch: async request => {
            const req = request instanceof Request ? request : new Request(request);
            const key = new URL(req.url).pathname;
            if (req.method === 'PUT') {
                stored.set(`${id}:${key}`, { bytes: new Uint8Array(await req.arrayBuffer()), type: req.headers.get('Content-Type') });
                return new Response(null, { status: 201 });
            }
            const asset = stored.get(`${id}:${key}`);
            return asset ? new Response(asset.bytes, { headers: { 'Content-Type': asset.type } }) : Response.json({ error: 'missing' }, { status: 404 });
        } }),
    };
    const env = {
        JWT_SECRET: 'unit-test-secret', WORKSPACE_SYNC: workspace,
        AI_STUDIO_QUOTA: { idFromName: value => value, get: () => ({ fetch: async () => Response.json({ allowed: true }) }) },
        AI: { async run(model, input) {
            if (model.includes('llama') || model.includes('qwen')) {
                if (input.response_format?.type === 'json_object') {
                    const fields = ['镜头名', '双脚站稳，手臂自然下垂，视线轻转。', '距主体约3米，平视拍摄', '35mm', '画面中心偏左',
                        '成年女性模特，米白色针织上衣、卡其色半身裙、棕色短靴；自然妆发', '利用现场柔和侧光', '无', '按景别完整裁切', '人物与指定场景',
                        '动作僵硬或裁切错误', '不适用时改为自然站姿', 'full body natural portrait, 35mm', 'FS', 'eye_level'];
                    const rows = Array.from({ length: 12 }, (_, index) => {
                        const row = [...fields];
                        row[0] = index === 11 ? '服装细节' : `自然人像镜头${index + 1}`;
                        row[12] = index === 11 ? 'Close-up wardrobe detail, worn on model, knit fabric texture, 35mm' : `Full body natural standing portrait ${index + 1}, 35mm`;
                        row[13] = index === 11 ? 'CU' : index < 4 ? 'WS' : 'FS';
                        return row;
                    });
                    return { response: JSON.stringify({ shots: rows }) };
                }
                if (input.response_format?.json_schema) return { response: JSON.stringify({ answers: {
                    brief_sufficient: { noul: 0.05 }, shot_sequence_quality: { score: 2, confidence: 0.9 },
                    execution_feasibility: { score: 2, confidence: 0.9 }, duplicate_risk: { noul: 0.05 },
                    reference_alignment: { score: 2, confidence: 0.9 },
                } }) };
                requestPrompts.push(input.messages[1].content);
                if (/服装细节|衣料细节/.test(input.messages[1].content)) {
                    return { response: 'Close-up of the specified ivory knit top worn on the model; visible shoulder and upper torso for context; crop out the face and rest of the outfit; no floating garment.' };
                }
                return { response: 'Photorealistic portrait of one adult woman. Preserve the exact outfit and selected natural pose. Keep the requested location and framing.' };
            }
            const form = await new Response(input.multipart.body, { headers: { 'Content-Type': input.multipart.contentType } }).formData();
            imagePrompts.push({ prompt: String(form.get('prompt')), slots: [0, 1, 2].map(index => form.has(`input_image_${index}`)) });
            return { image: png.toString('base64') };
        } },
    };
    const authorization = `Bearer ${token('user-1', env.JWT_SECRET)}`;
    try {
        const planResponse = await worker.fetch(new Request('https://unit.test/api/director/plan', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization }, body: JSON.stringify({
                theme: '秋日公园人像', style: '自然、克制、电影感',
                modelDesc: '成年女性模特，米白色针织上衣、卡其色半身裙、棕色短靴；自然妆发',
                scene: '公园竹林小径；湖边木栈道；木亭长椅', mood: '安静松弛', duration: '2小时', people: '1',
                extra: '自然轻松，双脚着地；禁止跪姿、躺姿、趴姿、双手举过头；不出现额外道具、同行人物，不拍无人物环境镜头；全组固定35mm',
                useReferenceLibrary: true,
            }),
        }), env);
        assert.equal(planResponse.status, 200);
        const plan = await planResponse.json();
        assert.equal(plan.director.source, 'cloudflare-workers-ai-plan');
        assert.equal(plan.director.imageGenerationConnected, true);
        const fixedRefs = plan.aiStudio.references.filter(reference => reference.kind !== 'pose').map(reference => reference.sourceItemId).sort();
        const shots = plan.shotList;
        const scenes = [...new Set(shots.map(shot => shot.scene))];
        assert.equal(shots.length, 12);
        assert.equal(scenes.length, 3);
        for (const scene of scenes) {
            const poseBearingShots = shots.filter(shot => shot.scene === scene && shot.directorContract.referenceIds.length);
            assert.equal(new Set(poseBearingShots.map(shot => shot.directorContract.referenceIds[0])).size, poseBearingShots.length);
        }
        for (const shot of shots) {
            const candidateResponse = await worker.fetch(new Request('https://unit.test/api/director/generate-candidate', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization }, body: JSON.stringify({
                    request_id: `test-${shot.id}`, brief: shot.description, scene_brief: shot.scene,
                    style_direction: plan.input.style, provider: 'cloudflare', model: '@cf/black-forest-labs/flux-2-klein-9b',
                    candidate_count: 1, billing_mode: 'free-credit-first', aspect_ratio: 'portrait',
                    reference_ids: plan.aiStudio.references.map(reference => reference.sourceItemId),
                    reference_brief: plan.input, shot_contract: shot.directorContract,
                }),
            }), env);
            assert.equal(candidateResponse.status, 201);
            const candidate = await candidateResponse.json();
            const upperBodyCrop = /^(?:中景|近景|特写|局部特写|MS|MCU|CU|ECU)$/.test(shot.directorContract.shot_size || '');
            const clothingDetail = /服装细节|衣料细节/.test(shot.directorContract.shot_language || '');
            const selectedPose = shot.directorContract.referenceIds[0];
            const expectedRefs = clothingDetail ? fixedRefs.filter(id => id.includes('costume'))
                : [...(upperBodyCrop ? [] : fixedRefs), selectedPose].sort();
            assert.deepEqual(candidate.candidateAsset.referenceImages.map(reference => reference.sourceItemId).sort(), expectedRefs);
            assert.deepEqual(candidate.candidateAsset.referenceImages.map(reference => reference.kind), clothingDetail
                ? ['costume'] : upperBodyCrop ? ['pose'] : ['pose', 'costume']);
            if (shot.directorContract.referenceIds.length) {
                assert.ok(candidate.candidateAsset.referenceIds.includes(shot.directorContract.referenceIds[0]));
            }
            if (clothingDetail) assert.equal(candidate.candidateAsset.referenceIds.some(id => id.startsWith('atlas-pose-')), false);
            const imageResponse = await worker.fetch(new Request(new URL(candidate.candidateAsset.url, 'https://unit.test')), env);
            assert.equal(imageResponse.status, 200);
            assert.equal(imageResponse.headers.get('Content-Type'), 'image/png');
            assert.deepEqual([...new Uint8Array(await imageResponse.arrayBuffer())], [...png]);
        }
        assert.equal(requestPrompts.length, shots.length);
        assert.equal(imagePrompts.length, shots.length);
        assert.ok(requestPrompts.every(prompt => /米白色针织上衣、卡其色半身裙、棕色短靴/.test(prompt)));
        assert.ok(shots.every((shot, index) => requestPrompts[index].includes(shot.scene)));
        assert.ok(imagePrompts.every((prompt, index) => {
            const shot = shots[index];
            const upperBodyCrop = /^(?:中景|近景|特写|局部特写|MS|MCU|CU|ECU)$/.test(shot.directorContract.shot_size || '');
            const clothingDetail = /服装细节|衣料细节/.test(shot.directorContract.shot_language || '');
            return JSON.stringify(prompt.slots) === JSON.stringify(clothingDetail ? [true, false, false] : upperBodyCrop ? [true, false, false] : [true, true, false]);
        }));
        assert.ok(shots.every((shot, index) => !/服装细节|衣料细节/.test(shot.directorContract.shot_language || '')
            || (/input_image_0 is the selected clothing-detail reference/.test(imagePrompts[index].prompt)
                && /worn on the model/i.test(imagePrompts[index].prompt)
                && /visible shoulder or upper-torso segment/i.test(imagePrompts[index].prompt)
                && /crop out the face and rest of the outfit/i.test(imagePrompts[index].prompt)
                && /do not show a floating garment/i.test(imagePrompts[index].prompt)
                && !/face photograph|face reference|portrait reference|identity reference|PoseAtlas action reference/i.test(imagePrompts[index].prompt))));
        assert.ok(shots.every((shot, index) => /服装细节|衣料细节/.test(shot.directorContract.shot_language || '')
            || (/input_image_0 is the selected PoseAtlas action reference/.test(imagePrompts[index].prompt)
                && /Use only its torso and limb positions\/body orientation as pose geometry/.test(imagePrompts[index].prompt)
                && /do not render its line drawing, white background, joint marks, mannequin, or nudity/i.test(imagePrompts[index].prompt))));
        assert.ok(imagePrompts.every((prompt, index) => /服装细节|衣料细节/.test(shots[index].directorContract.shot_language || '')
            ? !/Required pose:/.test(prompt.prompt)
            : /Required pose:/.test(prompt.prompt)));
        assert.ok(imagePrompts.every((prompt, index) => /服装细节|衣料细节/.test(shots[index].directorContract.shot_language || '')
            ? /shot-specific wardrobe contract is authoritative/i.test(prompt.prompt)
            : /written wardrobe contract (?:is authoritative for exact garments|identifies the outfit)/.test(prompt.prompt)));
        assert.ok(imagePrompts.every((prompt, index) => /服装细节|衣料细节/.test(shots[index].directorContract.shot_language || '')
            || /Do not copy unrequested bags, jewelry, hats/.test(prompt.prompt)));
    } finally {
        globalThis.fetch = originalFetch;
    }
});

function token(uid, secret) {
    const p = JSON.stringify({ uid, t: Date.now() });
    const s = createHmac('sha256', secret).update(p).digest('hex');
    return Buffer.from(JSON.stringify({ p, s })).toString('base64url');
}

test('continuity assets require an HMAC URL for img tags and prescreen reads uploaded bytes', async () => {
    const secret = 'unit-test-secret';
    const entries = new Map();
    const env = {
        JWT_SECRET: secret,
        DEEPSEEK_API_KEY: 'test-only-vision-key',
        CONTINUITY_KV: {
            async put(key, value) { entries.set(key, value); },
            async get(key) { return entries.get(key) || null; },
        },
    };
    const authorization = `Bearer ${token('user-1', secret)}`;
    const upload = await worker.fetch(new Request('https://unit.test/api/continuity/asset', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization },
        body: JSON.stringify({ dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', role: 'misc' }),
    }), env);
    assert.equal(upload.status, 201);
    const stored = await upload.json();
    assert.match(stored.path, /\?owner=user-1&exp=\d{13}&sig=[a-f0-9]{64}/);
    const unsigned = stored.path.split('?')[0];
    const denied = await worker.fetch(new Request(`https://unit.test${unsigned}`), env);
    assert.equal(denied.status, 401);
    const tampered = await worker.fetch(new Request(`https://unit.test${stored.path.replace(/sig=[a-f0-9]+/, `sig=${'0'.repeat(64)}`)}`), env);
    assert.equal(tampered.status, 401);
    const image = await worker.fetch(new Request(`https://unit.test${stored.path}`), env);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/png');

    const originalFetch = globalThis.fetch;
    let imageDataUrl = '';
    globalThis.fetch = async (_url, init) => {
        const payload = JSON.parse(init.body);
        imageDataUrl = payload.messages[0].content[1].image_url.url;
        return Response.json({ choices: [{ message: { content: '{"wardrobe":"pass","place-weather":"pass","shot-spec":"pass","notes":"可读"}' } }] });
    };
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/continuity/prescreen', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization },
            body: JSON.stringify({ shotId: 'shot-01', imagePath: stored.path,
                group: { shots: [{ shotId: 'shot-01', size: 'FS', camera: '平视', lens: '35mm' }],
                    locked: { subject: '成年人', wardrobe: '外套', location: '公园', weather: '阴天', timeOfDay: '白天' } } }),
        }), env);
        assert.equal(response.status, 200);
        assert.match(imageDataUrl, /^data:image\/png;base64,/);
        assert.equal((await response.json()).available, true);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('continuity summary does not mark fabricated confirmed asset ids ready', async () => {
    const secret = 'unit-test-secret';
    const authorization = `Bearer ${token('user-1', secret)}`;
    const init = await worker.fetch(new Request('https://unit.test/api/continuity/init', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization },
        body: JSON.stringify({ input: { theme: '测试', scene: '公园', people: '1', wardrobeNote: '日常服装' } }),
    }), { JWT_SECRET: secret });
    const group = (await init.json()).group;
    group.references = group.references.map(reference => ({ ...reference, status: 'confirmed', assetId: 'badassetid000001' }));
    group.master = { confirmedBy: 'human' };
    const response = await worker.fetch(new Request('https://unit.test/api/continuity/summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization }, body: JSON.stringify({ group }),
    }), { JWT_SECRET: secret });
    assert.equal(response.status, 200);
    const summary = await response.json();
    assert.equal(summary.readyToGenerate, false);
    assert.match(summary.blockedReason, /参考图读不到/);
});

test('an unavailable reference library returns a recoverable planning error', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('offline'); };
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', 'unit-test-secret')}` },
            body: JSON.stringify({ theme: '自然人像', useReferenceLibrary: true }),
        }), { JWT_SECRET: 'unit-test-secret', AI: { run: async () => { assert.fail('reference failure must happen before model call'); } },
            AI_STUDIO_QUOTA: { idFromName: value => value, get: () => ({ fetch: async () => Response.json({ allowed: true }) }) } });
        assert.equal(response.status, 503);
        assert.equal((await response.json()).code, 'REFERENCE_IMAGES_REQUIRED');
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('schedule UI describes assigned roles without claiming that notifications were sent', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /参与角色：\$\{formatScheduleAudience\(s\.audience\)\}/);
    assert.doesNotMatch(html, /已同步给摄影师、模特、摄影助理|已同步：摄影师/);
    assert.match(html, /toast\('已加入方案日程'/);
});

test('history list tolerates the absent optional sidebar badge', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /const historyBadge = \$\('t-hist'\);\s*if \(historyBadge\) historyBadge\.textContent/);
});

test('new plan form does not prefill unrelated sensitive demo content', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const theme = html.match(/<input id="f-theme"[^>]*>/)?.[0] || '';
    const style = html.match(/<input id="f-style"[^>]*>/)?.[0] || '';
    const mood = html.match(/<input id="f-mood"[^>]*>/)?.[0] || '';
    const model = html.match(/<textarea id="f-model"[^>]*>([\s\S]*?)<\/textarea>/)?.[1];
    const scene = html.match(/<textarea id="f-scene"[^>]*>([\s\S]*?)<\/textarea>/)?.[1];
    const extra = html.match(/<textarea id="f-extra"[^>]*>([\s\S]*?)<\/textarea>/)?.[1];
    assert.match(theme, /placeholder="留空时按场景和人物自然构思"/);
    assert.doesNotMatch(theme, /\bvalue=/);
    assert.match(style, /placeholder="如：自然纪实、电影感；也可留空"/);
    assert.doesNotMatch(html, /<select id="f-style">/);
    assert.doesNotMatch(html, /if\(!input\.theme&&!input\.modelDesc\)/);
    assert.match(mood, /placeholder="如：轻松、克制、热烈"/);
    assert.doesNotMatch(mood, /\bvalue=/);
    assert.equal(model, '');
    assert.equal(scene, '');
    assert.equal(extra, '');
});

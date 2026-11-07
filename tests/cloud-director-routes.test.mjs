import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createGuestPlanDraft } from '../api/director-plan.mjs';
import worker from '../api/index.js';

test('template fallback is visibly distinct from a real Director result', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /source === 'guest-rule-draft'/);
    assert.match(html, /以下不是模型生成结果/);
    assert.match(html, /模板草稿已保存（未连接 Director）/);
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

test('continuity image generation blocks guests and applies the user and shared daily limits', async () => {
    const secret = 'unit-test-secret';
    const actions = [];
    let userAllowed = false;
    let globalAllowed = false;
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
                        return Response.json({ allowed: action === 'image' ? userAllowed : globalAllowed });
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
    const userLimited = await worker.fetch(makeRequest(authorization), env);
    assert.equal(userLimited.status, 429);
    assert.equal((await userLimited.json()).error, 'IMAGE_DAILY_LIMIT_REACHED');
    assert.deepEqual(actions.map(item => item.action), ['image']);

    userAllowed = true;
    const globallyLimited = await worker.fetch(makeRequest(authorization), env);
    assert.equal(globallyLimited.status, 429);
    assert.equal((await globallyLimited.json()).error, 'GLOBAL_IMAGE_DAILY_LIMIT_REACHED');
    assert.deepEqual(actions.map(item => item.action), ['image', 'image', 'image-global']);
    assert.equal(aiCalls, 0);
});

test('cloud plans stay text-only when the Cloudflare AI binding is unavailable', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ shot_plans: [{ shot_language: 'wide', model_pose: 'Walk together', framing: 'Environment wide' }] });
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: 'walk', modelDesc: 'two adults', people: '2' }),
        }), { DIRECTOR_API_BASE: 'https://director.example.test' });
        const plan = await response.json();
        assert.equal(response.status, 200);
        assert.equal(plan.director.imageGenerationConnected, false);
        assert.equal(plan.director.imageGenerationMode, 'cloud-image-provider-not-configured');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('the deployed site honors reference-library planning even when Director is configured', async () => {
    const originalFetch = globalThis.fetch;
    const fetched = [];
    globalThis.fetch = async url => {
        const target = String(url);
        fetched.push(target);
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
        throw new Error('Director must not replace a requested reference plan');
    };
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                theme: '秋日人像', scene: '公园小径；木亭长椅', modelDesc: '棕色针织上衣',
                duration: '1小时', people: '1', useReferenceLibrary: true,
                referenceIds: ['atlas-pose-full_single_p015', 'atlas-pose-full_single_p016', 'atlas-pose-full_single_p017', 'atlas-pose-full_single_p018', 'atlas-costume-aut-0006', 'atlas-portrait-test-face'],
            }),
        }), { DIRECTOR_API_BASE: 'https://director.example.test' });
        const plan = await response.json();
        assert.equal(response.status, 200);
        assert.equal(plan.director.source, 'template-library-plan');
        assert.equal(fetched.length, 3);
        assert.deepEqual([...new Set(plan.shotList.map(shot => shot.scene))], ['公园小径', '木亭长椅']);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('site plan and multi-scene candidate generation keep face, outfit, and per-shot pose references aligned', async () => {
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
        ] });
        if (target.endsWith('/data/costumes.json')) return Response.json({ costumes: [
            { id: 'AUT-0118', thumb: 'costume/thumbs/AUT-0118.webp', cat: 'autumn', group: 'top', color: 'ivory', main: 'knit', tags: ['knit', 'ivory', 'khaki', 'skirt', 'brown', 'boots'] },
        ] });
        if (target.endsWith('/data/faces.json')) return Response.json({ images: [
            { id: 'test-face', thumb: 'portrait/thumbs/test-face.webp', sec: 'face', hair: 'medium', style: '自然人像参考' },
        ] });
        if (target.endsWith('.webp')) return new Response(webp, { headers: { 'Content-Type': 'image/webp' } });
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
        JWT_SECRET: 'unit-test-secret', DIRECTOR_API_BASE: 'https://director.example.test', WORKSPACE_SYNC: workspace,
        AI_STUDIO_QUOTA: { idFromName: value => value, get: () => ({ fetch: async () => Response.json({ allowed: true }) }) },
        AI: { async run(model, input) {
            if (model.includes('llama')) {
                if (input.response_format?.json_schema) return { response: JSON.stringify({ answers: {
                    brief_sufficient: { noul: 0.05 }, shot_sequence_quality: { score: 2, confidence: 0.9 },
                    execution_feasibility: { score: 2, confidence: 0.9 }, duplicate_risk: { noul: 0.05 },
                    reference_alignment: { score: 2, confidence: 0.9 },
                } }) };
                requestPrompts.push(input.messages[1].content);
                return { response: 'Photorealistic portrait of one adult woman. Preserve the exact outfit and selected natural pose. Keep the requested location and framing.' };
            }
            const form = await new Response(input.multipart.body, { headers: { 'Content-Type': input.multipart.contentType } }).formData();
            imagePrompts.push({ prompt: String(form.get('prompt')), hasFace: form.has('input_image_0'), hasOutfit: form.has('input_image_1') });
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
        assert.equal(plan.director.source, 'template-library-plan');
        assert.equal(plan.director.imageGenerationConnected, true);
        const fixedRefs = plan.aiStudio.references.filter(reference => reference.kind !== 'pose').map(reference => reference.sourceItemId).sort();
        const shots = plan.shotList;
        const scenes = [...new Set(shots.map(shot => shot.scene))];
        assert.equal(shots.length, 12);
        assert.equal(scenes.length, 3);
        for (const scene of scenes) {
            assert.equal(new Set(shots.filter(shot => shot.scene === scene).map(shot => shot.directorContract.referenceIds[0])).size, 4);
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
            assert.deepEqual(candidate.candidateAsset.referenceImages.map(reference => reference.sourceItemId).sort(), fixedRefs);
            assert.ok(candidate.candidateAsset.referenceIds.includes(shot.directorContract.referenceIds[0]));
            const imageResponse = await worker.fetch(new Request(new URL(candidate.candidateAsset.url, 'https://unit.test')), env);
            assert.equal(imageResponse.status, 200);
            assert.equal(imageResponse.headers.get('Content-Type'), 'image/png');
            assert.deepEqual([...new Uint8Array(await imageResponse.arrayBuffer())], [...png]);
        }
        assert.equal(requestPrompts.length, shots.length);
        assert.equal(imagePrompts.length, shots.length);
        assert.ok(requestPrompts.every(prompt => /米白色针织上衣、卡其色半身裙、棕色短靴/.test(prompt)));
        assert.ok(shots.every((shot, index) => requestPrompts[index].includes(shot.scene)));
        assert.ok(imagePrompts.every(prompt => prompt.hasFace && prompt.hasOutfit));
        assert.ok(imagePrompts.every(prompt => /Required pose:/.test(prompt.prompt)));
        assert.ok(imagePrompts.every(prompt => /written wardrobe contract is authoritative/.test(prompt.prompt)));
        assert.ok(imagePrompts.every(prompt => /Do not copy unrequested bags, jewelry, hats/.test(prompt.prompt)));
    } finally {
        globalThis.fetch = originalFetch;
    }
});

function token(uid, secret) {
    const p = JSON.stringify({ uid, t: Date.now() });
    const s = createHmac('sha256', secret).update(p).digest('hex');
    return Buffer.from(JSON.stringify({ p, s })).toString('base64url');
}

test('an unavailable reference library returns a recoverable planning error', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('offline'); };
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token('user-1', 'unit-test-secret')}` },
            body: JSON.stringify({ theme: '自然人像', useReferenceLibrary: true }),
        }), { JWT_SECRET: 'unit-test-secret' });
        assert.equal(response.status, 503);
        assert.equal((await response.json()).error, 'REFERENCE_IMAGES_REQUIRED');
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

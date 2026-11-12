import test from 'node:test';
import assert from 'node:assert/strict';
import { generateShot, GenerationError, directionText } from '../api/continuity-generation.mjs';
import { prescreen, mergeScores, summariseVision, PRE_SCREEN_ITEMS } from '../api/continuity-vision.mjs';
import { buildLocked, createGroup, setReference, confirmMaster, setAnchor } from '../api/continuity.mjs';
import { storeAsset, createMemoryStore } from '../api/continuity-assets.mjs';
import { groupFromStudio } from '../api/continuity-studio-bridge.mjs';

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('Chinese people counts keep the locked subject description consistent', () => {
    const locked = buildLocked({ people: '两位', scene: '公园' });
    assert.equal(locked.people, '两位');
    assert.match(locked.subject, /2位成年人/);
});

async function readyGroup(store, { modelDesc = '一名成年人', lockedSubject = '', wardrobeNote = '炭灰大衣' } = {}) {
    let group = createGroup({
        input: { theme: '雨夜旧车站', scene: '旧车站月台', style: '纪实', modelDesc, wardrobeNote },
        lockedHints: lockedSubject ? { subject: lockedSubject } : {},
        shots: [{ shotId: 'shot-01', size: 'WS', camera_angle: 'eye_level', lens: '35mm', model_pose: '沿月台行走', model_position: '画面右侧', generator_prompt: 'wide shot of a figure walking along a wet platform' }],
    });
    for (const role of ['identity', 'scene', 'style']) {
        const asset = await storeAsset({ dataUrl: PNG_1PX, role, store });
        group = setReference(group, { role, assetId: asset.assetId, status: 'confirmed', path: asset.path });
    }
    return confirmMaster(group, { assetId: group.references[0].assetId });
}

test('Seedream sends identity, scene and style, with the accepted anchor first', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    setAnchor(group, { assetId: group.references[0].assetId });
    let sent;
    await generateShot({ group, shotId: 'shot-01', providerId: 'volcengine-seedream', env: { ARK_API_KEY: 'test-only' }, store,
        fetchImpl: async (_url, options) => {
            sent = JSON.parse(options.body);
            return Response.json({ data: [{ b64_json: PNG_1PX.split(',')[1] }] });
        },
    });
    assert.equal(sent.image.length, 4, 'anchor plus all three role references must reach the provider');
    assert.equal(sent.image.every(image => image.startsWith('data:image/png;base64,')), true);
});

test('Cloudflare prompt translation carries the selected PoseAtlas pose and direction', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    group.shots[0].poseRef = {
        id: 'pose-test', title: '自然错步站姿', angle: 'diagonal',
        direction: '双脚错开站稳，肩颈放松，右手轻扶衣襟。',
    };
    let translated;
    await generateShot({
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein',
        env: { AI: { run: async (model, input) => {
            if (model === '@cf/meta/llama-3.1-8b-instruct-fp8-fast') {
                translated = input.messages[1].content;
                return { response: 'A natural full-body portrait at a station, subject walking.' };
            }
            assert.equal(model, '@cf/black-forest-labs/flux-2-klein-9b');
            return { image: PNG_1PX.split(',')[1] };
        } } },
        store,
        fetchImpl: async () => assert.fail('library refs are not used in this fixture'),
    });
    assert.match(translated, /自然错步站姿/);
    assert.match(translated, /diagonal/);
    assert.match(translated, /35mm/);
    assert.match(translated, /双脚错开站稳，肩颈放松/);
});

test('Cloudflare anchor prompt preserves identity while following the current shot contract', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store, { modelDesc: '两位成年伴侣', lockedSubject: '两位成年伴侣' });
    Object.assign(group.shots[0], {
        size: 'EWS', prompt: '两位成年人并排坐在河边长椅上', action: '两人并排坐在长椅上交谈',
        scene: '河边公园', lighting: '树荫下柔和的自然散射光', wardrobe: '棕色针织和深色长裤', cameraSettings: '50mm f/2',
    });
    group.shots[0].poseRef = { id: 'pose-seated', title: '自然并坐交谈', direction: '坐姿放松，身体微微转向彼此。' };
    setAnchor(group, { assetId: group.references.find(reference => reference.role === 'identity').assetId });

    let translated;
    let composed;
    await generateShot({
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein', store,
        env: { AI: { run: async (model, input) => {
            if (model === '@cf/meta/llama-3.1-8b-instruct-fp8-fast') {
                translated = input.messages[1].content;
                return { response: 'Two adults seated together on a bench in a riverside park, wearing brown knit clothing.' };
            }
            const form = await new Response(input.multipart.body, {
                headers: { 'content-type': input.multipart.contentType },
            }).formData();
            composed = String(form.get('prompt'));
            return { image: PNG_1PX.split(',')[1] };
        } } },
        fetchImpl: async () => assert.fail('fixture refs must come from the in-memory asset store'),
    });

    assert.match(translated, /人物范围：两位成年伴侣/);
    assert.match(translated, /两人并排坐在长椅上交谈/);
    assert.match(translated, /本镜场景：河边公园/);
    assert.match(translated, /树荫下柔和的自然散射光/);
    assert.match(translated, /本镜服装：棕色针织和深色长裤/);
    assert.match(composed, /Preserve established identity and group-wide wardrobe continuity/);
    assert.match(composed, /Follow that contract for pose, action, scene, lighting, camera and framing/);
    assert.match(composed, /Two adults seated together on a bench in a riverside park/);
    assert.match(composed, /preserve the shot's specified pose and action/i);
    assert.doesNotMatch(composed, /exactly one person|change only the camera position|only the camera position and framing/i);
    assert.doesNotMatch(composed, /visible pores|fine facial hair|exposure variation/i);
    assert.match(composed, /shot's specified focus detail/i);
    assert.doesNotMatch(composed, /only the face is sharp|whole scene is sharp from foreground to background/i);
});

test('detail close-ups honor the named target and remove incompatible wide-shot clauses', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    Object.assign(group.shots[0], {
        size: 'ECU',
        prompt: '棕色针织面料细节特写, full body portrait, shoes visible, walking down stairs',
        action: '镜头靠近针织衣料纹理', wardrobe: '棕色针织衫', mustShow: '针织面料纹理',
    });

    let translated;
    let composed;
    await generateShot({
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein', store,
        env: { AI: { run: async (model, input) => {
            if (model === '@cf/meta/llama-3.1-8b-instruct-fp8-fast') {
                translated = input.messages[1].content;
                return { response: 'Close detail photograph of brown knit fabric.' };
            }
            const form = await new Response(input.multipart.body, {
                headers: { 'content-type': input.multipart.contentType },
            }).formData();
            composed = String(form.get('prompt'));
            return { image: PNG_1PX.split(',')[1] };
        } } },
        fetchImpl: async () => assert.fail('fixture refs must come from the in-memory asset store'),
    });

    assert.match(translated, /棕色针织面料细节特写/);
    assert.doesNotMatch(translated, /full body|shoes visible|walking down stairs/i);
    assert.match(directionText({
        prompt: 'full body portrait, shoes visible, seated on a bench', locked: { subject: '成年人' },
        variant: { size: 'MCU', action: '坐在长椅上' }, size: 'MCU',
    }), /坐在长椅上/);
    assert.doesNotMatch(directionText({
        prompt: 'full body portrait, shoes visible, seated on a bench', locked: { subject: '成年人' },
        variant: { size: 'MCU', action: '坐在长椅上' }, size: 'MCU',
    }), /full body|shoes visible/i);
    assert.match(composed, /Tight detail framing on the specified garment or fabric detail/);
    assert.doesNotMatch(composed, /face fills most of the frame|exactly one person/i);
});

test('a Studio plan fetches only selected PoseAtlas face and costume refs and compiles its per-shot direction', async () => {
    const store = createMemoryStore();
    const portrait = {
        id: 'atlas-portrait-test', kind: 'portrait', section: 'face', upstreamId: 'portrait-test', title: '中长发人像',
        referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/portrait/thumbs/face-test.webp',
    };
    const costume = {
        id: 'atlas-costume-test', kind: 'costume', upstreamId: 'costume-test', title: '秋季棕色针织', tags: ['棕色', '针织'],
        referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/costume/thumbs/coat-test.webp',
    };
    const pose = {
        id: 'atlas-pose-test', kind: 'pose', upstreamId: 'pose-test', title: '自然错步站姿', angles: ['diagonal'],
        referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/pose-test.jpg',
    };
    let group = groupFromStudio({
        templates: [portrait, costume, pose], input: { theme: '秋日双场景', modelDesc: '一名成年人', style: '自然纪实' },
        planId: 'plan-test', planRevision: 4,
        guidance: { style: '柔和自然光', suggestions: [{ sourceItemId: pose.id, direction: '双脚自然错开，肩颈放松。' }] },
        shots: [{
            id: 'shot-01', scene: '河边公园', shotSize: '全身', focalLength: '50mm',
            directorContract: {
                scene: '河边公园', referenceIds: [pose.id], shot_size: '全身', camera_angle: '侧前方平视',
                model_pose: '双脚自然错开，右手轻扶衣襟', model_position: '人物位于画面左侧',
                wardrobe_styling: '秋季棕色针织按用户文字执行，不增加未指定配饰。',
                generator_prompt: '秋日河边公园全身人像，人物轻扶衣襟。',
            },
        }],
    }).group;
    group = confirmMaster(group, { assetId: group.references.find(reference => reference.role === 'identity').assetId });

    const libraryUrls = [];
    let sent;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'volcengine-seedream', env: { ARK_API_KEY: 'test-only' }, store,
        fetchImpl: async (url, options = {}) => {
            if (String(url).startsWith('https://hruiccc.github.io/')) {
                libraryUrls.push(String(url));
                return new Response(Uint8Array.from([1, 2, 3]), { headers: { 'Content-Type': 'image/webp' } });
            }
            sent = JSON.parse(options.body);
            return Response.json({ data: [{ b64_json: PNG_1PX.split(',')[1] }] });
        },
    });

    assert.deepEqual(libraryUrls, [portrait.referenceImageUrl, costume.referenceImageUrl]);
    assert.equal(sent.image.length, 2, 'PoseAtlas 姿势通过方案动作文字，不作为第三张素描图发送');
    assert.match(sent.prompt, /河边公园/);
    assert.match(sent.prompt, /自然错步站姿/);
    assert.match(sent.prompt, /双脚自然错开，肩颈放松/);
    assert.match(sent.prompt, /侧前方平视/);
    assert.match(sent.prompt, /秋季棕色针织/);
    assert.equal(result.referencesSent, 2);
});

test('Seedream cannot silently ignore an unreadable accepted anchor', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    setAnchor(group, { assetId: 'deadbeefdeadbeef' });
    await assert.rejects(generateShot({ group, shotId: 'shot-01', providerId: 'volcengine-seedream', env: { ARK_API_KEY: 'test-only' }, store,
        fetchImpl: async () => assert.fail('missing anchor must stop before any provider request'),
    }), error => error.code === 'GENERATION_ANCHOR_MISSING');
});

test('same-shot retry changes only its deterministic seed', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    const seeds = [];
    const fetchImpl = async (_url, options) => {
        seeds.push(JSON.parse(options.body).seed);
        return Response.json({ task_id: `task-${seeds.length}` });
    };
    await generateShot({ group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', env: { MODELSCOPE_TOKEN: 'test-only' }, store, fetchImpl, submitOnly: true, attempt: 0 });
    await generateShot({ group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', env: { MODELSCOPE_TOKEN: 'test-only' }, store, fetchImpl, submitOnly: true, attempt: 1 });
    assert.equal(seeds.length, 2);
    assert.notEqual(seeds[0], seeds[1]);
});

test('ModelScope receives the selected PoseAtlas image as a pose-only reference', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    group.shots[0].poseRef = {
        id: 'atlas-pose-p001', title: '站立・回眸顾盼', angle: '侧后方',
        direction: '上身转开再回头，肩颈放松。',
        imageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/p001.jpg',
    };
    let payload;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
        fetchImpl: async (url, options = {}) => {
            if (String(url).startsWith('https://hruiccc.github.io/')) {
                return new Response(Uint8Array.from([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } });
            }
            payload = JSON.parse(options.body);
            return Response.json({ task_id: 'task-pose-reference' });
        },
    });

    assert.equal(payload.image_url.length, 3, 'identity, outfit and selected pose are sent in that order');
    assert.match(payload.prompt, /最后一张参考图来自摆姿库/);
    assert.match(payload.prompt, /不要复制线稿/);
    assert.equal(result.referencesSent, 3);
    assert.equal(result.status, 'pending');
});

test('ModelScope waist-up frames keep pose text but omit conflicting full-body and accessory references', async () => {
    const store = createMemoryStore();
    const wardrobe = '米白色针织裹身上衣（宽袖、腰前交叠系结），卡其色层叠长半身裙至脚踝，棕色及膝长靴；不添加包袋、项链、首饰或帽子。';
    const group = await readyGroup(store, { wardrobeNote: wardrobe, lockedSubject: `成年东亚女性模特；${wardrobe}` });
    const styleAsset = await storeAsset({ dataUrl: 'data:image/png;base64,AAECAw==', role: 'style', store });
    Object.assign(group.references.find(reference => reference.role === 'style'), { assetId: styleAsset.assetId, path: styleAsset.path });
    const originalGet = store.get.bind(store);
    const assetReads = [];
    store.get = async key => { assetReads.push(key); return originalGet(key); };
    group.shots[0].size = '中景';
    group.shots[0].shotType = '中景';
    group.shots[0].prompt = `Editorial photograph. Waist-up portrait. Subject and clothing: ${wardrobe}. User constraints: one person.`;
    group.shots[0].poseRef = {
        id: 'atlas-pose-full_single_p017', title: '站立・回眸顾盼',
        direction: '上身转开再回头，肩颈放松。',
        imageUrl: 'https://photo-workflow.pages.dev/assets/pose-references/pose-02.jpg',
    };
    let payload;
    let poseReferenceFetched = false;
    const fetchedUrls = [];
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
        fetchImpl: async (url, options = {}) => {
            fetchedUrls.push(String(url));
            assert.doesNotMatch(String(url), /^https:\/\/hruiccc\.github\.io\//, 'waist-up must not fetch the full-body pose image');
            if (String(url) === 'https://photo-workflow.pages.dev/assets/pose-references/pose-02.jpg') {
                poseReferenceFetched = true;
                return new Response(Uint8Array.from([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } });
            }
            payload = JSON.parse(options.body);
            return Response.json({ task_id: 'task-waist-up' });
        },
    });

    assert.match(payload.prompt, /最后一张是已授权的实拍姿势参考/);
    assert.equal(poseReferenceFetched, true, `fetches: ${fetchedUrls.join(', ')}; pose: ${payload.prompt.match(/姿势[^\n]*/)?.[0] || ''}`);
    assert.equal(payload.image_url.length, 2, 'identity and an approved waist-up pose photo are sent; the costume and full-body line-art images are omitted');
    assert.ok(assetReads.length > 0);
    const styleAssetId = group.references.find(reference => reference.role === 'style')?.assetId;
    assert.ok(styleAssetId);
    assert.ok(assetReads.every(key => !key.includes(styleAssetId)), 'the rejected outfit image must not be loaded from asset storage');
    assert.equal(payload.size, '1140x1472', 'ModelScope uses a portrait 3:4 canvas for waist-up frames');
    assert.match(payload.prompt, /头部、肩膀、胸部和上腹/);
    assert.match(payload.prompt, /禁止全身照、七分身照/);
    assert.match(payload.prompt, /针织宽袖上衣完整覆盖双肩，领口保持在肩线以上/);
    assert.match(payload.prompt, /耳朵和颈部不得添加耳饰、项链或首饰/);
    assert.match(payload.prompt, /像摄影师现场抓拍，不像广告硬照/);
    assert.match(payload.prompt, /站立・回眸顾盼/);
    const clothingClause = payload.prompt.match(/Subject and clothing:\s*(.*?)\. User constraints:/is)?.[1] || '';
    assert.match(clothingClause, /米白色针织裹身上衣/);
    assert.doesNotMatch(clothingClause, /半身裙|长靴|boots|skirt/i);
    const wardrobeLines = payload.prompt.split('\n').filter(line => /^(?:人物|全组服装|服装)：/.test(line));
    assert.ok(wardrobeLines.length > 0);
    assert.ok(wardrobeLines.every(line => !/半身裙|长靴|boots|skirt/i.test(line)), 'all waist-up wardrobe fields must exclude garments below the crop');
    assert.equal(result.referencesSent, 2);
});

test('ModelScope stops before submission when an accepted pose image is unavailable', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    group.shots[0].poseRef = { id: 'pose-invalid', title: '已选姿势', imageUrl: 'https://example.com/pose.jpg' };
    await assert.rejects(
        () => generateShot({
            group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
            env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
            fetchImpl: async () => assert.fail('unapproved pose URL must not be fetched or submitted'),
        }),
        error => error.code === 'GENERATION_REFERENCE_MISSING',
    );
});

test('generation without credentials fails closed and names the missing env vars', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', providerId: 'gpt-image-2', env: {}, store, fetchImpl: async () => assert.fail('不应发起网络请求') }),
        error => error instanceof GenerationError && error.code === 'GENERATION_NOT_CONFIGURED' && error.details.missing.includes('OPENAI_API_KEY'),
    );
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', providerId: 'flux-kontext', env: {}, store, fetchImpl: async () => assert.fail('不应发起网络请求') }),
        error => error.code === 'GENERATION_NOT_CONFIGURED' && error.details.missing.length === 2,
    );
});

test('the gate runs before the adapter, so missing references never reach a provider', async () => {
    const store = createMemoryStore();
    const group = createGroup({ input: { theme: '雨夜', scene: '月台' }, shots: [{ shotId: 'shot-01', generator_prompt: 'x' }] });
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', providerId: 'gpt-image-2', env: { OPENAI_API_KEY: 'k' }, store, fetchImpl: async () => assert.fail('不应发起网络请求') }),
        error => error.code === 'CONTINUITY_REFERENCE_UNCONFIRMED',
    );
});

test('one shot produces exactly one upstream call carrying three reference images', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    const calls = [];
    const fetchImpl = async (url, init) => {
        calls.push({ url, init });
        return Response.json({ data: [{ b64_json: PNG_1PX.split(',')[1] }] });
    };
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'gpt-image-2',
        env: { OPENAI_API_KEY: 'test-key' }, store, fetchImpl,
    });

    assert.equal(calls.length, 1, '一个镜头只能有一次上游调用');
    assert.equal(calls[0].url, 'https://api.openai.com/v1/images/edits');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer test-key');
    const form = calls[0].init.body;
    assert.equal(form.get('size'), '1024x1536');
    assert.match(String(form.get('prompt')), /walking along a wet platform/);
    assert.equal(form.getAll('image[]').length, 3, 'identity/scene/style 三张参考都要带上');

    assert.equal(result.shotId, 'shot-01');
    assert.equal(result.references.length, 3);
    assert.ok(result.image.path.startsWith('/api/continuity/asset/'));
    assert.equal(result.qc.verdict, 'pending', '生成层不自评');
});

test('a reference-aware JSON service receives role-tagged data URLs and the seed', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    let payload;
    const fetchImpl = async (url, init) => {
        payload = { url, body: JSON.parse(init.body) };
        return Response.json({ data: [{ b64_json: PNG_1PX.split(',')[1] }] });
    };
    await generateShot({
        group, shotId: 'shot-01', providerId: 'flux-kontext',
        env: { CONTINUITY_IMAGE_ENDPOINT: 'https://image.example/run', CONTINUITY_IMAGE_KEY: 'k' },
        store, fetchImpl,
    });
    assert.equal(payload.url, 'https://image.example/run');
    assert.equal(payload.body.references.length, 3);
    assert.deepEqual(payload.body.references.map(reference => reference.role), ['identity', 'scene', 'style']);
    assert.ok(payload.body.references.every(reference => reference.dataUrl.startsWith('data:image/png;base64,')));
    assert.equal(typeof payload.body.seed, 'number');
});

test('an unreadable reference is a configuration error, never a text-only fallback', async () => {
    const store = createMemoryStore();
    let group = await readyGroup(store);
    // Point identity at an asset id that was never stored.
    group = setReference(group, { role: 'identity', assetId: 'deadbeefdeadbeef', status: 'confirmed', path: '/api/continuity/asset/deadbeefdeadbeef' });
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', providerId: 'gpt-image-2', env: { OPENAI_API_KEY: 'k' }, store, fetchImpl: async () => assert.fail('不应发起网络请求') }),
        error => error.code === 'GENERATION_REFERENCE_MISSING',
    );
});

test('an upstream error is surfaced with its status, not swallowed', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    await assert.rejects(
        () => generateShot({
            group, shotId: 'shot-01', providerId: 'gpt-image-2',
            env: { OPENAI_API_KEY: 'k' }, store,
            fetchImpl: async () => Response.json({ error: { message: 'quota exceeded' } }, { status: 429 }),
        }),
        error => error.code === 'GENERATION_UPSTREAM_ERROR' && /429/.test(error.message),
    );
});

test('vision pre-screen cannot upgrade a score: pass becomes unknown, fail stays fail', async () => {
    const merged = mergeScores(
        { wardrobe: 'unknown', 'place-weather': 'unknown', 'shot-spec': 'unknown', identity: 'pass' },
        { wardrobe: 'pass', 'place-weather': 'fail', 'shot-spec': 'unknown' },
    );
    assert.equal(merged.wardrobe, 'unknown', '视觉的 pass 不能变成最终通过');
    assert.equal(merged['place-weather'], 'fail', '视觉的 fail 可以升级为需要重做');
    assert.equal(merged.identity, 'pass', '不在预筛范围内的项不受影响');
    assert.deepEqual(PRE_SCREEN_ITEMS, ['wardrobe', 'place-weather', 'shot-spec']);
});

test('vision unavailable returns no scores instead of silently passing', async () => {
    const shot = { size: 'WS', camera: 'eye_level，35mm', lens: '35mm' };
    const locked = { subject: '成年人', wardrobe: '大衣', location: '月台', weather: '雨', timeOfDay: '夜间' };

    const missingKey = await prescreen({ imageDataUrl: PNG_1PX, shot, locked, env: {} });
    assert.equal(missingKey.available, false);
    assert.deepEqual(missingKey.scores, {});
    assert.match(missingKey.reason, /DEEPSEEK_API_KEY/);
    assert.match(summariseVision(missingKey), /未启用|未配置/);

    const prose = await prescreen({
        imageDataUrl: PNG_1PX, shot, locked, env: { DEEPSEEK_API_KEY: 'k' },
        fetchImpl: async () => Response.json({ choices: [{ message: { content: '这张图看起来不错，服装基本一致。' } }] }),
    });
    assert.equal(prose.available, true);
    assert.deepEqual(prose.scores, {}, '散文式回答不能变成判定');
    assert.match(prose.reason, /没有返回可解析/);
});

test('vision JSON verdicts are parsed and summarised', async () => {
    const shot = { size: 'WS', camera: 'eye_level，35mm', lens: '35mm' };
    const locked = { subject: '成年人', wardrobe: '大衣', location: '月台', weather: '雨', timeOfDay: '夜间' };
    const result = await prescreen({
        imageDataUrl: PNG_1PX, shot, locked, env: { DEEPSEEK_API_KEY: 'k' },
        fetchImpl: async (url, init) => {
            const body = JSON.parse(init.body);
            assert.match(body.messages[0].content[0].text, /服装：大衣/);
            assert.equal(body.messages[0].content[1].type, 'image_url');
            return Response.json({ choices: [{ message: { content: '```json\n{"wardrobe":"fail","place-weather":"pass","shot-spec":"pass","notes":"外套颜色偏黑"}\n```' } }] });
        },
    });
    assert.equal(result.available, true);
    assert.equal(result.scores.wardrobe, 'fail');
    assert.equal(result.scores['place-weather'], 'unknown');
    assert.match(summariseVision(result), /wardrobe/);
});

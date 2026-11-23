import test from 'node:test';
import assert from 'node:assert/strict';
import { generateShot, pollModelScope, GenerationError, directionText, cropWaistUpImage } from '../api/continuity-generation.mjs';
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

test('photography direction layers camera and mood over immutable plan facts', () => {
    const direction = directionText({
        prompt: '两位朋友并肩交谈，不改变彼此关系',
        locked: {
            people: '2', subject: '两位成年朋友', wardrobe: '原方案中的米色风衣',
            location: '海边旧车站', weather: '阴天', timeOfDay: '傍晚', mood: '克制、安静',
            colorGrade: '低饱和青灰', mustKeep: ['两位朋友关系不变', '服装不变'], mustAvoid: ['增加第三人'],
        },
        variant: {
            size: 'MS', scene: '海边旧车站月台', action: '自然侧身交谈，视线相接',
            camera: '略高机位，从斜前方拍摄', lens: '50mm', subjectPlacement: '落在画面右侧三分线',
            lighting: '侧逆光勾出发丝，脸部保持柔和层次', mood: '安静而有张力', colorGrade: '青灰底色与暖肤色分离',
            mustKeep: ['两人都清晰可见'],
        },
    });
    assert.match(direction, /内容与摄影分层规则：人物身份、人数与关系/);
    assert.match(direction, /全组必须保持：两位朋友关系不变、服装不变/);
    assert.match(direction, /全组不得出现：增加第三人/);
    assert.match(direction, /场景：海边旧车站月台/);
    assert.match(direction, /动作：自然侧身交谈，视线相接/);
    assert.match(direction, /光线：侧逆光勾出发丝，脸部保持柔和层次/);
    assert.match(direction, /人物曝光：人物面部与眼睛细节清楚/);
    assert.match(direction, /氛围：安静而有张力/);
    assert.match(direction, /色彩倾向：青灰底色与暖肤色分离/);
});

test('waist-up framing locks the full outfit without naming lower-body garments', () => {
    const direction = directionText({
        prompt: '腰上人像，米白色针织上衣覆盖肩部与腰线',
        size: '中景',
        variant: { size: '中景', crop: '头顶至自然腰线，腰线以下完全不入画', wardrobe: '米白色针织上衣覆盖双肩与上胸' },
        locked: { subject: '成年东亚女性模特，浅棕色齐肩短发、自然妆容；米白针织上衣、卡其长裙、棕色长靴。全组固定同一套服装。', wardrobe: '米白针织上衣、卡其长裙、棕色长靴', mustKeep: ['同一套服装'] },
    });
    assert.match(direction, /全组服装：米白针织上衣/);
    assert.match(direction, /腰线以下完全不入画/);
    assert.doesNotMatch(direction, /长裙|长靴/);
    assert.match(direction, /米白色针织上衣覆盖肩部与腰线/);
    assert.match(direction, /浅棕色齐肩短发/);
});

test('long-sleeved knit and low-saturation outdoor plans keep garment coverage and natural foliage', () => {
    const direction = directionText({
        prompt: '竹林全身人像，成年东亚女性穿米白色针织裹身上衣（宽袖、腰前交叠系结）和卡其长半身裙。',
        locked: {
            subject: '成年东亚女性，米白色针织裹身上衣（宽袖、腰前交叠系结），卡其色长半身裙；全组固定服装。',
            wardrobe: '米白色针织裹身上衣（宽袖、腰前交叠系结），卡其色长半身裙',
            styleProfile: '自然纪实，低饱和胶片色', location: '公园竹林小径',
        },
        variant: { size: 'FS', scene: '公园竹林小径' },
    });
    assert.match(direction, /上衣下摆覆盖至腰线，腹部皮肤完全遮挡/);
    assert.match(direction, /不做露肩、挖肩或滑肩造型/);
    assert.match(direction, /全图保持低饱和、自然的胶片色彩/);
    assert.match(direction, /竹叶、树叶与草地尤其不得呈荧光绿/);
});

test('low-saturation lake-pier shots do not inject bamboo or grass absent from the scene', () => {
    const direction = directionText({
        prompt: 'Waist-up portrait on an open lakeside wooden pier with clear water.',
        locked: { subject: '成年女性模特', styleProfile: '自然纪实，低饱和胶片色', location: '湖边木栈道' },
        variant: { size: 'MS', scene: '无遮挡的湖边木栈道，水面清晰可见' },
    });
    assert.match(direction, /全图保持低饱和、自然的胶片色彩/);
    assert.doesNotMatch(direction, /竹叶|树叶与草地|荧光绿/);
});

test('a shot-specific scene wins over the group scene without leaking other shot locations', () => {
    const direction = directionText({
        prompt: '单人回眸人像',
        locked: { subject: '成年女性', location: '公园竹林小径', wardrobe: '原方案服装' },
        variant: { size: '中景', scene: '木亭长椅', crop: '腰线上方' },
    });
    assert.match(direction, /场景：木亭长椅/);
    assert.doesNotMatch(direction, /公园竹林小径/);
});

async function readyGroup(store, { modelDesc = '一名成年人', lockedSubject = '', mood = '', wardrobeNote = '炭灰大衣', styleProfile = '纪实' } = {}) {
    let group = createGroup({
        input: { theme: '雨夜旧车站', scene: '旧车站月台', style: styleProfile, modelDesc, wardrobeNote, mood },
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
    const result = await generateShot({
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
    assert.deepEqual(result.referenceRolesSent, ['identity', 'style']);
});

test('Cloudflare Workers AI free allocation errors map to a non-retryable 429', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    await assert.rejects(() => generateShot({
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein', env: { AI: { run: async model => {
            if (model === '@cf/meta/llama-3.1-8b-instruct-fp8-fast') return { response: 'A natural portrait at a station.' };
            throw new Error('4006: you have used up your daily free allocation of 10,000 neurons');
        } } }, store,
    }), error => error.code === 'IMAGE_PROVIDER_FREE_QUOTA_EXHAUSTED' && error.status === 429);
});

test('Cloudflare retries one transient 3043 failure and returns the actual output dimensions', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    let imageCalls = 0;
    const generated = await generateShot({
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein', store,
        env: { AI: { run: async (model, input) => {
            if (model === '@cf/meta/llama-3.1-8b-instruct-fp8-fast') return { response: 'A full-body portrait at a station.' };
            imageCalls += 1;
            const form = await new Response(input.multipart.body, { headers: { 'content-type': input.multipart.contentType } }).formData();
            assert.equal(form.has('steps'), false);
            assert.match(form.get('seed'), /^\d+$/);
            if (imageCalls === 1) throw new Error('3043 Internal server error');
            return { image: PNG_1PX.split(',')[1] };
        } } },
    });
    assert.equal(imageCalls, 2);
    assert.equal(generated.size, '1x1');
    assert.equal(Number.isSafeInteger(generated.seed), true);
});

test('large accepted anchors are resized through the Workers Images binding before FLUX', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    const large = new Uint8Array(500 * 1024);
    const anchor = await storeAsset({ dataUrl: `data:image/png;base64,${Buffer.from(large).toString('base64')}`, role: 'misc', store });
    setAnchor(group, { assetId: anchor.assetId, path: anchor.path, shotId: 'shot-01' });
    const resizedInputBytes = [];
    const env = {
        IMAGES: {
            info: async () => ({ width: 1024, height: 1536 }),
            input(bytes) {
                resizedInputBytes.push(bytes.byteLength);
                return { transform: () => ({ output: async () => ({ response: () => new Response(Buffer.from(PNG_1PX.split(',')[1], 'base64')) }) }) };
            },
        },
        AI: { run: async (model, input) => {
            if (model === '@cf/meta/llama-3.1-8b-instruct-fp8-fast') return { response: 'A full-body portrait at a station.' };
            const form = await new Response(input.multipart.body, { headers: { 'content-type': input.multipart.contentType } }).formData();
            assert.equal(form.get('input_image_0').size, Buffer.from(PNG_1PX.split(',')[1], 'base64').length);
            return { image: PNG_1PX.split(',')[1] };
        } },
    };
    const generated = await generateShot({ group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein', store, env });
    assert.ok(resizedInputBytes.includes(large.length));
    assert.equal(generated.anchored, true);
});

test('Cloudflare anchor prompt preserves identity while following the current shot contract', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store, { modelDesc: '两位成年朋友', lockedSubject: '两位成年朋友', mood: '安静而有张力' });
    Object.assign(group.shots[0], {
        size: 'EWS', prompt: '两位成年人并排坐在河边长椅上', action: '两人并排坐在长椅上交谈',
        scene: '河边公园', lighting: '树荫下柔和的自然散射光', wardrobe: '棕色针织和深色长裤', cameraSettings: '50mm f/2',
        mood: '安静克制', colorGrade: '青灰底色与暖肤色分离',
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

    assert.match(translated, /人物范围：两位成年朋友/);
    assert.match(translated, /两人并排坐在长椅上交谈/);
    assert.match(translated, /本镜场景：河边公园/);
    assert.match(translated, /树荫下柔和的自然散射光/);
    assert.match(translated, /本镜服装：棕色针织和深色长裤/);
    assert.match(translated, /内容事实和摄影表达分层/);
    assert.match(translated, /情绪氛围：安静克制/);
    assert.match(translated, /色彩倾向：青灰底色与暖肤色分离/);
    assert.match(composed, /Preserve established identity and group-wide wardrobe continuity/);
    assert.match(composed, /Follow that contract for pose, action, scene, lighting, camera and framing/);
    assert.match(composed, /Two adults seated together on a bench in a riverside park/);
    assert.match(composed, /preserve the shot's specified pose and action/i);
    assert.doesNotMatch(composed, /exactly one person|change only the camera position|only the camera position and framing/i);
    assert.doesNotMatch(composed, /visible pores|fine facial hair|exposure variation|venue shows wear|the unlit side genuinely dark/i);
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
        const body = JSON.parse(options.body);
        seeds.push(body.seed);
        assert.equal(body.size, '1056x1584', '全身镜头保留既有 2:3 画幅');
        return Response.json({ task_id: `task-${seeds.length}` });
    };
    await generateShot({ group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', env: { MODELSCOPE_TOKEN: 'test-only' }, store, fetchImpl, submitOnly: true, attempt: 0 });
    await generateShot({ group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', env: { MODELSCOPE_TOKEN: 'test-only' }, store, fetchImpl, submitOnly: true, attempt: 1 });
    assert.equal(seeds.length, 2);
    assert.notEqual(seeds[0], seeds[1]);
});

test('ModelScope uses 3:4 only for waist-up medium shots', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    group.shots[0].size = 'MS';
    let body;
    await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async (_url, options) => {
            body = JSON.parse(options.body);
            return Response.json({ task_id: 'medium-task' });
        },
        submitOnly: true,
    });
    assert.equal(body.size, '1140x1472', '中景使用当前 3:4 竖幅尺寸');
});

test('ModelScope uses the identity photo and keeps clothing constraints in text', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    group.shots[0].size = 'MS';
    group.shots[0].shotType = '中景';
    group.shots[0].prompt = 'A candid waist-up portrait on a lakeside boardwalk.';
    let body;
    await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async (_url, options) => {
            body = JSON.parse(options.body);
            return Response.json({ task_id: 'identity-only-task' });
        },
        submitOnly: true,
    });
    assert.equal(body.image_url.length, 1, '只传人像身份参考，不把平铺服装图误当成风格照片');
    assert.equal(body.model, 'Qwen/Qwen-Image-Edit-2511', '默认生产模型保持不变');
    assert.match(body.prompt, /炭灰大衣/);
    assert.match(body.prompt, /lakeside boardwalk/);
});

test('ModelScope sends the selected wardrobe reference for full-body frames', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store, { wardrobeNote: '象牙白针织上衣与卡其长裙' });
    let body;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async (_url, options) => {
            body = JSON.parse(options.body);
            return Response.json({ task_id: 'wardrobe-reference-task' });
        },
        submitOnly: true,
    });
    assert.deepEqual(result.referenceRolesSent, ['identity', 'style']);
    assert.equal(body.image_url.length, 2);
    assert.match(body.prompt, /Image 2（style）/);
});

test('ModelScope can select only the allowlisted 2.1 Turbo model for a controlled comparison', async () => {
    const store = createMemoryStore();
    const wardrobe = '米白色针织裹身上衣（宽袖、腰前交叠系结），卡其色长半身裙；不添加包袋、项链、首饰或帽子。';
    const group = await readyGroup(store, { wardrobeNote: wardrobe, lockedSubject: wardrobe, styleProfile: '自然纪实，低饱和胶片色' });
    group.shots[0].scene = '公园竹林小径';
    let body;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'Qwen/Qwen-Image-2.1-Turbo',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async (_url, options) => {
            body = JSON.parse(options.body);
            return Response.json({ task_id: 'turbo-task' });
        },
        submitOnly: true,
    });
    assert.equal(body.model, 'Qwen/Qwen-Image-2.1-Turbo');
    assert.match(body.prompt, /景别最高优先级：/);
    assert.match(body.prompt, /场景：/);
    assert.match(body.prompt, /场景可辨识度：/);
    assert.match(body.prompt, /竹竿与竹叶/);
    assert.match(body.prompt, /忽略人像身份参考图中的背景/);
    assert.match(body.prompt, /腹部皮肤完全遮挡/);
    assert.match(body.prompt, /真实摄影质感：真实摄影成像/);
    assert.match(body.prompt, /肤质自然，保留真实纹理，不重磨皮、不塑料/);
    assert.match(body.prompt, /竹叶、树叶与草地尤其不得呈荧光绿/);
    assert.doesNotMatch(body.prompt, /内容与摄影分层规则|成像质感：真实摄影成像/);

    group.shots[0].scene = '无遮挡的湖边木栈道，水面清晰可见，不出现亭子、屋檐、长椅或建筑。';
    group.shots[0].rejectIf = '亭子、屋檐、长椅或建筑';
    let conflictingScenePrompt;
    await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'Qwen/Qwen-Image-2.1-Turbo',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async (_url, options) => {
            conflictingScenePrompt = JSON.parse(options.body).prompt;
            return Response.json({ task_id: 'turbo-scene-conflict-task' });
        },
        submitOnly: true,
    });
    assert.match(conflictingScenePrompt, /可见的湖水/);
    assert.match(conflictingScenePrompt, /木栈道木板/);
    assert.doesNotMatch(conflictingScenePrompt, /木亭立柱|长椅结构/);

    await assert.rejects(generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'unlisted/model',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async () => assert.fail('unlisted model must be rejected before any provider request'),
        submitOnly: true,
    }), error => error.code === 'GENERATION_MODEL_NOT_ALLOWED');
});

test('ModelScope full Qwen-Image-2.1 is an opt-in model with the same structured photo constraints', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store, { styleProfile: '自然纪实，低饱和胶片色' });
    Object.assign(group.shots[0], {
        size: '中景', shotType: '中景', scene: '无遮挡的湖边木栈道，水面清晰可见，不出现亭子、长椅或建筑。',
        crop: '严格头顶至自然腰线的腰上像，腰线以下不入画。',
        action: '躯干四分之三侧转，头部回望画面左侧，不直视镜头。',
        mustShow: '面部清楚，肩线斜向画面，湖面与木栈道可辨。',
        rejectIf: '正面证件照、亭子、长椅或建筑、塑料皮肤。',
    });
    let body;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'Qwen/Qwen-Image-2.1',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async (_url, options) => {
            body = JSON.parse(options.body);
            return Response.json({ task_id: 'qwen-image-21-full-task' });
        },
        submitOnly: true,
    });
    assert.equal(body.model, 'Qwen/Qwen-Image-2.1');
    assert.equal(result.taskId, 'qwen-image-21-full-task');
    assert.match(body.prompt, /景别最高优先级：/);
    assert.match(body.prompt, /动作与构图：/);
    assert.match(body.prompt, /躯干四分之三侧转/);
    assert.match(body.prompt, /肤质自然，保留真实纹理，不重磨皮、不塑料/);
    assert.match(body.prompt, /场景可辨识度：.*可见的湖水.*木栈道木板/s);
    assert.doesNotMatch(body.prompt, /木亭立柱|长椅结构/);
});

test('ModelScope Qwen-Image base is an opt-in larger-model comparison with identity references', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store, { styleProfile: '自然纪实，低饱和胶片色' });
    Object.assign(group.shots[0], {
        size: '中景', shotType: '中景', scene: '无遮挡湖边木栈道，湖水与斜向木板清楚可辨。',
        action: '躯干三分之四侧转，头部回望画面左侧。',
        crop: '头顶至腰间系结下方，保留少量衣料余量。',
        mustShow: '面部清楚、肩线明显斜向、完整腰结、自然肤质。',
    });
    group.shots[0].poseRef = {
        id: 'atlas-pose-full_single_p017', title: '站立・回眸顾盼',
        direction: '身体斜侧转离镜头，头部回望画面左侧。',
        imageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/full_single_P017_diag.jpg',
    };
    const referenceCrop = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    let body;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'Qwen/Qwen-Image',
        env: {
            MODELSCOPE_TOKEN: 'test-only',
            IMAGES: { input: bytes => ({ transform: () => ({ output: async () => ({ response: () => new Response(referenceCrop) }) }) }) },
        }, store,
        fetchImpl: async (url, options = {}) => {
            if (String(url).includes('full_single_P017_diag.jpg')) return new Response(Uint8Array.from([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } });
            body = JSON.parse(options.body);
            return Response.json({ task_id: 'qwen-image-base-task' });
        },
        submitOnly: true,
    });
    assert.equal(body.model, 'Qwen/Qwen-Image');
    assert.equal(result.taskId, 'qwen-image-base-task');
    assert.deepEqual(result.referenceRolesSent, ['identity', 'pose']);
    assert.equal(body.image_url.length, 2);
    assert.match(body.prompt, /湖边木栈道/);
    assert.match(body.prompt, /完整腰结/);
    assert.match(body.prompt, /自然肤质/);
});

test('ModelScope FLUX.2 Klein variants are opt-in and receive the shot contract plus identity reference', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store, { styleProfile: '自然纪实，低饱和胶片色' });
    Object.assign(group.shots[0], {
        size: '中景', shotType: '中景', scene: '湖边木栈道，水面清晰可见。',
        crop: '腰上构图，腰部系结完整入画。',
        action: '躯干四分之三侧转，头部回望画面左侧。',
        mustShow: '面部清楚，肩线斜向画面，湖面与木栈道可辨。',
        rejectIf: '正面证件照、塑料皮肤、腰部系结被裁切。',
    });
    let body;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'black-forest-labs/FLUX.2-klein-base-4B',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async (_url, options) => {
            body = JSON.parse(options.body);
            return Response.json({ task_id: 'flux-klein-contract-task' });
        },
        submitOnly: true,
    });
    assert.equal(body.model, 'black-forest-labs/FLUX.2-klein-base-4B');
    assert.equal(body.size, '1140x1472');
    assert.equal(result.taskId, 'flux-klein-contract-task');
    assert.ok(body.image_url?.length, 'FLUX submission should retain the selected reference images');
    assert.match(body.prompt, /腰上构图/);
    assert.match(body.prompt, /四分之三侧转/);
    assert.match(body.prompt, /面部清楚/);
    assert.match(body.prompt, /湖边木栈道/);
    assert.match(body.prompt, /塑料皮肤/);
});

test('ModelScope FLUX.2 Klein community API model is allowlisted as opt-in', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    let body;
    let submittedUrl;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'flux-community/FLUX.2-klein-4B',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async (url, options) => {
            submittedUrl = String(url);
            body = JSON.parse(options.body);
            return Response.json({ task_id: 'flux-klein-community-task' });
        },
        submitOnly: true,
    });
    assert.equal(submittedUrl, 'https://api-inference.modelscope.ai/v1/images/generations');
    assert.equal(body.model, 'flux-community/FLUX.2-klein-4B');
    assert.equal(result.taskId, 'flux-klein-community-task');
});

test('ModelScope FLUX.2 Klein community tasks poll through the matching API host', async () => {
    let polledUrl;
    const result = await pollModelScope({
        env: { MODELSCOPE_TOKEN: 'test-only' },
        modelId: 'flux-community/FLUX.2-klein-4B',
        taskId: 'flux-klein-community-task',
        fetchImpl: async url => {
            polledUrl = String(url);
            return Response.json({ task_status: 'RUNNING' });
        },
    });
    assert.equal(polledUrl, 'https://api-inference.modelscope.ai/v1/tasks/flux-klein-community-task');
    assert.deepEqual(result, { status: 'pending', upstream: 'RUNNING' });
});

test('waist-up Turbo shots omit the full-body anchor and keep the shot scene and crop', async () => {
    const store = createMemoryStore();
    const wardrobe = '米白色针织裹身上衣（宽袖、腰前交叠系结），卡其色长半身裙；不添加包袋、项链、首饰或帽子。';
    const group = await readyGroup(store, { wardrobeNote: wardrobe, lockedSubject: wardrobe, styleProfile: '自然纪实，低饱和胶片色' });
    Object.assign(group.shots[0], {
        size: '中景', shotType: '中景', scene: '湖边木栈道',
        crop: '画面从头顶至自然腰线，下缘切在腰线；髋部以下、腿和鞋不入画。',
        action: '上身转离镜头约四十五度，再回头看向镜头附近，肩颈放松。',
        poseRef: { id: 'atlas-pose-full_single_p017', title: '站立・回眸顾盼', direction: '上身转离镜头约四十五度，再回头看向镜头附近。' },
    });
    const identity = group.references.find(reference => reference.role === 'identity');
    setAnchor(group, { assetId: identity.assetId, path: identity.path, shotId: 'shot-00' });
    let body;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'Qwen/Qwen-Image-2.1-Turbo',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
        fetchImpl: async (_url, options = {}) => { body = JSON.parse(options.body); return Response.json({ task_id: 'turbo-anchor-crop-task' }); },
    });
    assert.deepEqual(result.referenceRolesSent, ['identity']);
    assert.equal(body.image_url.length, 1);
    assert.doesNotMatch(body.prompt, /母图|Image 1（anchor）/);
    assert.match(body.prompt, /场景：湖边木栈道/);
    assert.match(body.prompt, /景别最高优先级：画面从头顶至自然腰线，下缘切在腰线/);
    assert.match(body.prompt, /腰线以下不在画面内/);
    assert.match(body.prompt, /湖水/);
    assert.match(body.prompt, /木栈道木板/);
    assert.match(body.prompt, /忽略人像身份参考图中的背景/);
    assert.match(body.prompt, /全图保持低饱和、自然的胶片色彩/);
});

test('near-portrait Turbo shots force shoulders-up framing and remove out-of-frame pose clauses', async () => {
    const store = createMemoryStore();
    const wardrobe = '米白色针织裹身上衣（宽袖、腰前交叠系结），卡其色长半身裙；不添加包袋、项链、首饰或帽子。';
    const group = await readyGroup(store, { wardrobeNote: wardrobe, lockedSubject: wardrobe, styleProfile: '自然纪实，低饱和胶片色' });
    Object.assign(group.shots[0], {
        size: '近景', shotType: '近景', scene: '木亭长椅',
        crop: '肩部以上近景，完整保留面部与发顶。',
        action: '肩颈放松，头部微微侧转看向镜头；双脚稳定着地，膝盖自然放松，双手垂在身体两侧。',
        mustShow: '肩部姿态自然；双脚稳定着地，腿部与脚步完整入画。',
    });
    let body;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'Qwen/Qwen-Image-2.1-Turbo',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
        fetchImpl: async (_url, options = {}) => { body = JSON.parse(options.body); return Response.json({ task_id: 'turbo-near-crop-task' }); },
    });
    assert.deepEqual(result.referenceRolesSent, ['identity'], '肩部近景不发送会拉宽画幅的全身摆姿或穿搭图');
    assert.match(body.prompt, /场景：木亭长椅/);
    assert.equal(body.size, '1328x1328', '近景头肩肖像使用方形画幅约束取景');
    assert.match(body.prompt, /紧凑头肩肖像（tight head-and-shoulders portrait）/);
    assert.ok(body.prompt.indexOf('景别最高优先级') < body.prompt.indexOf('场景：木亭长椅'));
    assert.match(body.prompt, /肩部姿态自然/);
    assert.doesNotMatch(body.prompt, /双脚稳定着地|膝盖自然放松|腿部与脚步完整入画/);
});

test('ModelScope sends the allowlisted PoseAtlas sketch as pose-only guidance', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    group.shots[0].poseRef = {
        id: 'pose-diagonal', title: '回眸顾盼', angle: 'diagonal',
        imageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/P017.jpg',
        direction: '身体侧转，头部回眸。',
    };
    let body;
    const fetchImpl = async (url, options) => {
        if (String(url).startsWith('https://hruiccc.github.io/')) {
            return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { headers: { 'Content-Type': 'image/jpeg' } });
        }
        body = JSON.parse(options.body);
        return Response.json({ task_id: 'pose-reference-task' });
    };
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, fetchImpl, submitOnly: true,
    });
    assert.equal(body.image_url.length, 3, '发送身份图、服装参考与姿势线稿');
    assert.match(body.image_url[0], /^data:image\/png;base64,/);
    assert.match(body.image_url[1], /^data:image\/png;base64,/);
    assert.match(body.image_url[2], /^data:image\/jpeg;base64,/);
    assert.match(body.prompt, /use only its body angle and pose, never its face, clothing or background/);
    assert.equal(result.poseReferenceSent, true);
    assert.deepEqual(result.referenceRolesSent, ['identity', 'style', 'pose']);
});

test('ModelScope fails clearly when the selected pose image cannot be loaded', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    group.shots[0].poseRef = {
        id: 'pose-missing', title: '回眸顾盼', angle: 'diagonal',
        imageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/missing.jpg',
        direction: '身体侧转，头部回眸。',
    };
    await assert.rejects(generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async url => {
            if (String(url).startsWith('https://hruiccc.github.io/')) return new Response('missing', { status: 404 });
            assert.fail('姿势参考缺失时不得提交无参考请求');
        },
        submitOnly: true,
}), error => error.code === 'GENERATION_REFERENCE_MISSING' && error.status === 409);
});

test('ModelScope receives the selected PoseAtlas image as a pose-only reference', async () => {
    const store = createMemoryStore();
    const wardrobe = '米白色针织裹身上衣（宽袖、腰前交叠系结），卡其色半身裙；不添加包袋、项链、首饰或帽子。';
    const group = await readyGroup(store, { wardrobeNote: wardrobe, lockedSubject: wardrobe });
    group.shots[0].prompt = `Reference roles: Image 1 is the identity reference; Image 2 is a PoseAtlas pose sketch.\n${group.shots[0].prompt}`;
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

    assert.equal(payload.image_url.length, 2, 'identity and selected pose are sent; conflicting wardrobe reference is omitted');
    assert.deepEqual(result.referenceRolesSent, ['identity', 'pose']);
    assert.match(payload.prompt, /Image 1（identity）.*Image 2（pose）/);
    assert.doesNotMatch(payload.prompt, /Reference roles:/);
    assert.match(payload.prompt, /最后一张参考图来自摆姿库/);
    assert.match(payload.prompt, /不要复制线稿/);
    assert.match(payload.prompt, /针织宽袖上衣肩缝保持在双肩自然位置，领口覆盖双肩/);
    assert.match(payload.prompt, /上衣下摆覆盖至腰线，腹部皮肤完全遮挡/);
    assert.match(payload.prompt, /人物全组不佩戴首饰/);
    assert.equal(result.referencesSent, 2);
    assert.equal(result.status, 'pending');
});

test('anchored ModelScope shots follow PoseAtlas text without mixing the pose photo into the master edit', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    group.shots[0].size = '全身';
    group.shots[0].shotType = '全身';
    group.shots[0].action = '站立，一只手轻扶髋部，另一只手自然下垂，双脚稳定着地。';
    group.shots[0].poseRef = {
        id: 'atlas-pose-p015', title: '站立・对立式平衡・手扶腰',
        direction: '靠镜头一侧的手轻搭髋部，另一只手自然下垂。',
        imageUrl: 'https://example.com/pose.jpg',
    };
    setAnchor(group, { assetId: group.references.find(reference => reference.role === 'identity').assetId });
    let payload;
    const fetchedUrls = [];
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
        fetchImpl: async (url, options = {}) => {
            fetchedUrls.push(String(url));
            payload = JSON.parse(options.body);
            return Response.json({ task_id: 'task-anchored-text-pose' });
        },
    });

    assert.equal(payload.image_url.length, 3, 'accepted anchor, identity and selected wardrobe references are sent');
    assert.deepEqual(result.referenceRolesSent, ['anchor', 'identity', 'style']);
    assert.ok(!fetchedUrls.includes('https://example.com/pose.jpg'), 'anchored edits do not mix in another person or pose photo');
    assert.match(payload.prompt, /站立・对立式平衡・手扶腰/);
    assert.match(payload.prompt, /一只手轻扶髋部，另一只手自然下垂/);
    assert.doesNotMatch(payload.prompt, /最后一张参考图来自摆姿库/);
});

test('ModelScope waist-up frames crop an angle-specific PoseAtlas sketch and exclude wardrobe refs', async () => {
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
        imageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/full_single_P017_diag.jpg',
    };
    let payload;
    let submissionHeaders;
    let poseReferenceFetched = false;
    let cropOptions;
    const fetchedUrls = [];
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'Qwen/Qwen-Image-2.1-Turbo',
        env: {
            MODELSCOPE_TOKEN: 'test-only',
            IMAGES: { input: bytes => ({
                transform: options => { cropOptions = options; return { output: async () => ({ response: () => new Response(bytes, { headers: { 'Content-Type': 'image/png' } }) }) }; },
            }) },
        }, store, submitOnly: true,
        fetchImpl: async (url, options = {}) => {
            fetchedUrls.push(String(url));
            if (String(url) === 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/full_single_P017_diag.jpg') {
                poseReferenceFetched = true;
                return new Response(Uint8Array.from([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } });
            }
            payload = JSON.parse(options.body);
            submissionHeaders = options.headers;
            return Response.json({ task_id: 'task-waist-up' });
        },
    });

    assert.equal(submissionHeaders['X-ModelScope-Task-Type'], 'image_generation');
    assert.equal(poseReferenceFetched, true, `fetches: ${fetchedUrls.join(', ')}; pose: ${payload.prompt.match(/姿势[^\n]*/)?.[0] || ''}`);
    assert.deepEqual(cropOptions, { trim: { top: 0, left: 0.12, width: 0.76, height: 0.60 } }, 'the full-body sketch is cropped to its upper-body geometry before submission');
    assert.equal(payload.image_url.length, 2, 'identity and cropped pose geometry are sent; costume refs are excluded');
    assert.ok(assetReads.length > 0);
    const styleAssetId = group.references.find(reference => reference.role === 'style')?.assetId;
    assert.ok(styleAssetId);
    assert.ok(assetReads.every(key => !key.includes(styleAssetId)), 'the rejected outfit image must not be loaded from asset storage');
    assert.equal(payload.size, '1140x1472', 'ModelScope uses a portrait 3:4 canvas for waist-up frames');
    assert.match(payload.prompt, /头部、肩膀、胸部和上腹/);
    assert.match(payload.prompt, /禁止全身照、七分身照/);
    assert.match(payload.prompt, /针织宽袖上衣肩缝保持在双肩自然位置，领口覆盖双肩/);
    assert.match(payload.prompt, /人物全组不佩戴首饰：耳朵、颈部、手腕和手指均无耳饰、项链、手链或戒指/);
    assert.match(payload.prompt, /像摄影师现场抓拍，不像广告硬照/);
    assert.match(payload.prompt, /站立・回眸顾盼/);
    const wardrobeLines = payload.prompt.split('\n').filter(line => /^(?:人物|全组服装|服装)：/.test(line));
    assert.ok(wardrobeLines.length > 0);
    assert.ok(wardrobeLines.some(line => /米白色针织裹身上衣/.test(line)));
    assert.ok(wardrobeLines.every(line => !/半身裙|长靴|boots|skirt/i.test(line)), 'all waist-up wardrobe fields must exclude garments below the crop');
    assert.equal(result.referencesSent, 2);
    assert.equal(result.poseReferenceSent, true);
    assert.deepEqual(result.referenceRolesSent, ['identity', 'pose']);
    assert.match(payload.prompt, /参考图角色按发送顺序对应：Image 1（identity）.*Image 2（pose）/);
    assert.match(payload.prompt, /Image 2（pose）：仅用于身体动作、肢体关系、肩线、头部朝向和重心；不复制参考图中的脸、服装、配饰、光线、背景/);
    assert.match(payload.prompt, /中景腰上人像/);
    assert.match(payload.prompt, /选定摆姿“站立・回眸顾盼”：与本镜动作兼容的方向为上身转开再回头，肩颈放松/);
    assert.match(payload.prompt, /冲突时以本镜动作优先/);
});

test('anchored full-body frames omit outfit references when the wardrobe contract bans their accessories', async () => {
    const store = createMemoryStore();
    const wardrobe = '米白色针织裹身上衣，卡其色长裙和棕色长靴；不添加包袋、项链、首饰或帽子。';
    const group = await readyGroup(store, { lockedSubject: `成年女性模特；${wardrobe}`, wardrobeNote: wardrobe });
    group.shots[0].size = '全身';
    group.shots[0].shotType = '全身';
    group.shots[0].prompt = 'Full-body portrait following the pose contract.';
    Object.assign(group.references.find(reference => reference.role === 'style'), { assetId: 'studio-costume-AUT-0118' });
    setAnchor(group, { assetId: group.references.find(reference => reference.role === 'identity').assetId });
    let payload;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
        fetchImpl: async (_url, options = {}) => {
            payload = JSON.parse(options.body);
            return Response.json({ task_id: 'task-anchored-full-body-without-accessories' });
        },
    });
    assert.equal(payload.image_url.length, 2, 'accepted anchor and identity remain; conflicting outfit reference is omitted');
    assert.equal(result.referencesSent, 2);
    assert.match(payload.prompt, /不添加包袋、项链、首饰或帽子/);
});

test('anchored full-body frames omit an outfit reference that conflicts with banned accessories', async () => {
    const store = createMemoryStore();
    const wardrobe = '米白色针织裹身上衣，卡其色长裙和棕色长靴；不添加包袋、项链、首饰或帽子。';
    const group = await readyGroup(store, { lockedSubject: `成年女性模特；${wardrobe}`, wardrobeNote: wardrobe });
    group.shots[0].size = '全身';
    group.shots[0].shotType = '全身';
    group.shots[0].prompt = 'Full-body portrait following the pose contract.';
    setAnchor(group, { assetId: group.references.find(reference => reference.role === 'identity').assetId });
    Object.assign(group.references.find(reference => reference.role === 'style'), { assetId: 'qa-sanitized-costume-reference' });
    let payload;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
        fetchImpl: async (_url, options = {}) => {
            payload = JSON.parse(options.body);
            return Response.json({ task_id: 'task-anchored-full-body-with-sanitized-outfit' });
        },
    });
    assert.equal(payload.image_url.length, 2, 'accepted anchor and identity remain; outfit reference is omitted');
    assert.equal(result.referencesSent, 2);
    assert.deepEqual(result.referenceRolesSent, ['anchor', 'identity']);
    assert.match(payload.prompt, /不添加包袋、项链、首饰或帽子/);
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

test('ModelScope submission timeout is reported as ambiguous instead of leaking a runtime error', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    await assert.rejects(
        () => generateShot({
            group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
            env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
            fetchImpl: async () => { throw new DOMException('aborted', 'TimeoutError'); },
        }),
        error => error.code === 'GENERATION_SUBMIT_AMBIGUOUS'
            && error.status === 503
            && /不要立即重复提交/.test(error.message)
            && !/code 23|operation was aborted/i.test(error.message),
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

test('ModelScope removes render-look adjectives but keeps physical photo constraints', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    group.shots[0].prompt = 'Photorealistic portrait, cinematic lighting, masterpiece, visible natural skin texture and soft side light.';
    let body;
    await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store,
        fetchImpl: async (_url, options) => {
            body = JSON.parse(options.body);
            return Response.json({ task_id: 'texture-direction-task' });
        },
        submitOnly: true,
    });
    assert.doesNotMatch(body.prompt, /photorealistic|cinematic lighting|masterpiece/i);
    assert.match(body.prompt, /visible natural skin texture and soft side light/i);
});

test('ModelScope compresses large accepted anchors via IMAGES and catches 不携带/rejectIf accessory bans', async () => {
    const store = createMemoryStore();
    const wardrobe = '橄榄绿裹身长袖针织上衣、焦糖色皮短裙；不携带额外包袋、帽饰或首饰';
    const group = await readyGroup(store, { wardrobeNote: wardrobe, lockedSubject: `成年女性模特，${wardrobe}` });
    group.shots[0].size = 'FS';
    group.shots[0].shotType = '全身';
    group.shots[0].action = '右手轻搭右侧髋部自然平视';
    group.shots[0].rejectIf = '截脚或出现额外道具与包袋';
    group.shots[0].poseRef = {
        id: 'atlas-pose-p015', title: '站立・对立式平衡・手扶腰',
        direction: '右手轻搭右侧髋部，左手自然垂落。',
        imageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/p015.jpg',
    };
    const large = new Uint8Array(500 * 1024);
    const anchor = await storeAsset({ dataUrl: `data:image/png;base64,${Buffer.from(large).toString('base64')}`, role: 'misc', store });
    setAnchor(group, { assetId: anchor.assetId, path: anchor.path, shotId: 'shot-01' });

    const resizedBytes = [];
    const env = {
        MODELSCOPE_TOKEN: 'test-only',
        IMAGES: {
            async info() { return { width: 1056, height: 1584 }; },
            input(bytes) {
                resizedBytes.push(bytes.byteLength);
                return {
                    transform() {
                        return {
                            output() {
                                return { response: () => new Response(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])) };
                            },
                        };
                    },
                };
            },
        },
    };
    let payload;
    const result = await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit',
        env, store, submitOnly: true,
        fetchImpl: async (_url, options = {}) => {
            payload = JSON.parse(options.body);
            return Response.json({ task_id: 'compressed-anchor-task' });
        },
    });
    assert.ok(resizedBytes.some(size => size >= 500 * 1024));
    assert.match(payload.image_url[0], /^data:image\/jpeg;base64,/);
    assert.deepEqual(result.referenceRolesSent, ['anchor', 'identity']);
    assert.match(payload.prompt, /不要擅自添加蓝色、白色或未指定的内搭/);
    assert.match(payload.prompt, /不得左右镜像翻转/);
    assert.match(payload.prompt, /阴天散射光影调/);
});

test('Cloudflare Workers AI maps structured 4006 quota error objects to 429', async () => {
    const store = createMemoryStore();
    const group = await readyGroup(store);
    await assert.rejects(() => generateShot({
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein',
        env: { AI: { run: async model => {
            if (model === '@cf/meta/llama-3.1-8b-instruct-fp8-fast') return { response: 'A natural portrait at a station.' };
            const err = new Error('Inference upstream failed');
            err.code = 4006;
            throw err;
        } } },
        store,
    }), error => error.code === 'IMAGE_PROVIDER_FREE_QUOTA_EXHAUSTED' && error.status === 429);
});

test('ModelScope CU drops a full-body anchor while WS keeps its zoom override', async () => {
    const store = createMemoryStore();
    const wardrobe = '橄榄绿裹身长袖针织上衣、焦糖色皮短裙、棕色短靴';
    const group = await readyGroup(store, { wardrobeNote: wardrobe, lockedSubject: wardrobe });
    const anchor = await storeAsset({ dataUrl: PNG_1PX, role: 'misc', store });
    setAnchor(group, { assetId: anchor.assetId, path: anchor.path, shotId: 'shot-01' });

    group.shots = [
        {
            shotId: 'shot-cu', size: 'CU', shotType: '特写', aspect: '2:3',
            camera: 'eye_level，85mm', lens: '85mm', action: '微笑看镜头',
            crop: '胸口以下完全不在画面内，不出现手臂',
            prompt: `Close-up portrait. Subject and clothing: ${wardrobe}. User constraints: one person.`,
            poseRef: { id: 'atlas-pose-p015', title: '站立・对立式平衡・手扶腰', direction: '双脚站稳，右手扶腰。' },
        },
        {
            shotId: 'shot-ws', size: 'WS', shotType: '全景', aspect: '2:3',
            camera: 'eye_level，24mm', lens: '24mm', action: '沿竹林小径行走',
            crop: '人物占画面约三分之一，周围竹林小径完整展开',
            prompt: `Wide environmental portrait in a bamboo grove. Subject and clothing: ${wardrobe}.`,
        },
    ];

    let cuPayload;
    const cuRes = await generateShot({
        group, shotId: 'shot-cu', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
        fetchImpl: async (_url, options = {}) => {
            cuPayload = JSON.parse(options.body);
            return Response.json({ task_id: 'cu-anchored-task' });
        },
    });
    assert.deepEqual(cuRes.referenceRolesSent, ['identity'], 'CU skips the full-body anchor and style photo');
    assert.equal(cuPayload.size, '1140x1472', 'CU uses tighter 3:4 portrait ratio');
    assert.doesNotMatch(cuPayload.prompt, /【景别硬性切换】/);
    assert.match(cuPayload.prompt, /胸口以下完全不在画面内/);
    assert.doesNotMatch(cuPayload.prompt, /焦糖色皮短裙|棕色短靴|右手扶腰/);

    let wsPayload;
    const wsRes = await generateShot({
        group, shotId: 'shot-ws', providerId: 'modelscope-qwen-edit',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
        fetchImpl: async (_url, options = {}) => {
            wsPayload = JSON.parse(options.body);
            return Response.json({ task_id: 'ws-anchored-task' });
        },
    });
    assert.deepEqual(wsRes.referenceRolesSent, ['anchor', 'identity', 'style']);
    assert.match(wsPayload.prompt, /【景别硬性切换】.*大幅拉远/);
    assert.match(wsPayload.prompt, /周围环境与空间纵深是主体/);
});

test('an explicitly required waist knot overrides the generic waistline crop and keeps the lower edge', async () => {
    const store = createMemoryStore();
    const wardrobe = '米白色长袖针织裹身上衣，前襟在自然腰间系结；不添加首饰。';
    const group = await readyGroup(store, { wardrobeNote: wardrobe, lockedSubject: `成年东亚女性模特；${wardrobe}` });
    group.shots[0].size = '中景';
    group.shots[0].shotType = '中景';
    group.shots[0].mustShow = '自然腰间系结必须完整入画；画框下缘落在系结下方一小段衣料处。';
    group.shots[0].prompt = `Waist-up editorial portrait. Subject and clothing: ${wardrobe}. User constraints: one person.`;
    group.shots[0].poseRef = {
        id: 'atlas-pose-full_single_p017', title: '站立・回眸顾盼',
        direction: '上身三分之四侧转，头部回望画面左侧。',
        imageUrl: 'https://photo-workflow.pages.dev/assets/pose-references/pose-02.jpg',
    };
    let payload;
    await generateShot({
        group, shotId: 'shot-01', providerId: 'modelscope-qwen-edit', modelId: 'Qwen/Qwen-Image-2.1',
        env: { MODELSCOPE_TOKEN: 'test-only' }, store, submitOnly: true,
        fetchImpl: async (url, options = {}) => {
            if (String(url).endsWith('/pose-02.jpg')) return new Response(Uint8Array.from([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } });
            payload = JSON.parse(options.body);
            return Response.json({ task_id: 'task-waist-knot' });
        },
    });
    assert.match(payload.prompt, /自然腰间系结完整入画/);
    assert.match(payload.prompt, /系结中心置于画面高度约80%–84%/);
    assert.match(payload.prompt, /保留约8%–12%可见上衣余量/);
    assert.match(payload.prompt, /系结和垂带都不得触底或贴边/);
    assert.doesNotMatch(payload.prompt, /画框必须在自然腰线结束|腰线以下不在画面内/);

    let trim;
    const croppedPng = new Uint8Array(24);
    croppedPng.set([137, 80, 78, 71, 13, 10, 26, 10]);
    new DataView(croppedPng.buffer).setUint32(16, 707);
    new DataView(croppedPng.buffer).setUint32(20, 1014);
    const crop = await cropWaistUpImage({ base64: 'AQID', contentType: 'image/png' }, {
        IMAGES: { input: () => ({ transform: value => { trim = value.trim; return { output: async () => ({ response: () => new Response(croppedPng) }) }; } }) },
    }, { preserveBottom: true });
    assert.deepEqual(trim, { top: 0, left: 0.04, width: 0.92 });
    assert.equal(crop.frameCrop, 'waist-up-preserve-required-knot');

    const invalidPng = croppedPng.slice();
    new DataView(invalidPng.buffer).setUint32(20, 1);
    await assert.rejects(cropWaistUpImage({ base64: 'AQID', contentType: 'image/png' }, {
        IMAGES: { input: () => ({ transform: () => ({ output: async () => ({ response: () => new Response(invalidPng) }) }) }) },
    }, { preserveBottom: true }), error => error.code === 'GENERATION_FRAME_CROP_FAILED');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCloudCandidateRequest, generateCloudCandidate } from '../api/director-cloud-generation.mjs';

const contract = {
    shot_language: 'Autumn park seated portrait',
    generator_prompt: '35mm eye-level environmental portrait, subject seated naturally on an existing park bench.',
    referenceIds: ['pose-1'],
    must_show: ['full hands and feet', 'muted cinematic autumn colors'],
    reject_if: ['extra people', 'flash lighting', 'cropped feet'],
};
const request = {
    provider: 'cloudflare', model: '@cf/black-forest-labs/flux-1-schnell', candidate_count: 1,
    billing_mode: 'free-credit-first', aspect_ratio: 'portrait',
    reference_ids: ['costume-1'],
    brief: '当前分镜：自然坐在公园长椅上；仅用现有棕色针织衫。',
    style_direction: '低饱和电影感', scene_brief: '秋日公园，自然光，无助手、无闪光灯。',
    shot_contract: contract,
};
const jpeg = new Uint8Array([255, 216, 255, 0]);
const referenceContext = { guidance: { suggestions: [] }, templates: [
    { id: 'pose-1', kind: 'pose', englishTitle: 'Standing contrapposto, hand on hip', referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/pose.jpg' },
    { id: 'costume-1', kind: 'costume', tags: ['black', 'tights'], referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/costume/thumbs/outfit.webp' },
    { id: 'face-1', kind: 'portrait', referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/portrait/thumbs/face.webp' },
] };
const referenceFetchOptions = [];
const fetchImpl = async (_url, options) => {
    referenceFetchOptions.push(options);
    return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
};

test('cloud candidate compiler preserves shot contract, constraints, and framing guidance', () => {
    const compiled = compileCloudCandidateRequest({ ...request, shot_contract: { ...contract, wardrobe_styling: '成年模特穿棕色针织衫。' } });
    assert.match(compiled.prompt, /Autumn park seated portrait/);
    assert.match(compiled.prompt, /35mm eye-level environmental portrait/);
    assert.match(compiled.prompt, /低饱和电影感/);
    assert.match(compiled.prompt, /棕色针织衫/);
    assert.match(compiled.prompt, /Do not include: extra people; flash lighting/);
    assert.match(compiled.prompt, /portrait 3:4 composition/);
    assert.ok(compiled.prompt.length <= 2048);
    assert.deepEqual([compiled.width, compiled.height, compiled.steps], [768, 1024, 24]);
});

test('ModelScope allowlist accepts approved Qwen and FLUX.2 Klein API models', () => {
    for (const model of ['Qwen/Qwen-Image-2.1', 'Qwen/Qwen-Image-2.1-Turbo', 'Qwen/Qwen-Image-Edit-2511', 'Qwen/Qwen-Image', 'black-forest-labs/FLUX.2-klein-base-4B', 'flux-community/FLUX.2-klein-4B']) {
        assert.doesNotThrow(() => compileCloudCandidateRequest({ ...request, provider: 'modelscope', model }));
    }
    assert.throws(() => compileCloudCandidateRequest({ ...request, provider: 'modelscope', model: 'Qwen/unknown' }), /GENERATION_PROVIDER_NOT_ALLOWED/);
});

test('Cloudflare allowlist keeps FLUX.2 dev opt-in for high-fidelity comparison tests', () => {
    const compiled = compileCloudCandidateRequest({ ...request, model: '@cf/black-forest-labs/flux-2-dev' });
    assert.equal(compiled.model, '@cf/black-forest-labs/flux-2-dev');
    assert.throws(() => compileCloudCandidateRequest({ ...request, model: '@cf/black-forest-labs/flux-2-max' }), /GENERATION_PROVIDER_NOT_ALLOWED/);
});

test('cloud candidate defaults to a portrait frame when no aspect ratio is supplied', () => {
    const compiled = compileCloudCandidateRequest({ ...request, aspect_ratio: undefined });
    assert.deepEqual([compiled.width, compiled.height], [768, 1024]);
    assert.match(compiled.prompt, /portrait 3:4 composition/);
});

test('a shot-level scene takes priority over unrelated group locations in the free-form brief', () => {
    const compiled = compileCloudCandidateRequest({
        ...request,
        brief: '整组计划包括竹林、湖边栈道和木亭；本镜头只在木亭长椅拍摄。',
        scene_brief: '唯一拍摄地点：木亭长椅，秋日湖畔。',
        reference_brief: { scene: '公园竹林小径；湖边木栈道；木亭长椅' },
    });
    assert.match(compiled.prompt, /唯一拍摄地点：木亭长椅/);
    assert.doesNotMatch(compiled.prompt, /整组计划|公园竹林小径|湖边木栈道/);
});

test('the final image-model prompt keeps only the active shot scene and camera contract', async () => {
    let translationInput = '';
    let imagePrompt = '';
    const input = {
        ...request,
        brief: '整组在公园竹林、湖边木栈道和木亭拍摄；本镜头在木亭长椅，模特自然站立回眸。',
        scene_brief: '唯一地点：木亭长椅，秋日湖畔，柔和侧逆光。',
        reference_brief: { scene: '公园竹林小径；湖边木栈道；木亭长椅' },
        shot_contract: { ...contract, shot_size: '全身', generator_prompt: '35mm head-to-toe portrait; relaxed standing turn and gentle over-shoulder glance.' },
    };
    await generateCloudCandidate(input, { referenceContext, fetchImpl, ai: { run: async (model, payload) => {
        if (model.includes('llama')) {
            translationInput = payload.messages[1].content;
            return { response: '35mm photorealistic full-body portrait at a wooden lakeside pavilion, relaxed standing turn and gentle over-shoulder glance, soft rim light. Required visible shot details: full hands and feet. Do not include: extra people; flash lighting; cropped feet.' };
        }
        const form = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
        imagePrompt = String(form.get('prompt'));
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.match(translationInput, /木亭长椅/);
    assert.match(translationInput, /35mm head-to-toe portrait/);
    assert.doesNotMatch(translationInput, /公园竹林小径|湖边木栈道|整组在公园/);
    assert.match(imagePrompt, /wooden lakeside pavilion/);
    assert.match(imagePrompt, /35mm photorealistic full-body portrait/);
    assert.match(imagePrompt, /Fit the complete figure within 80% of the image height/);
    assert.match(imagePrompt, /Required visible shot details: full hands and feet/);
    assert.match(imagePrompt, /Do not include: extra people; flash lighting; cropped feet/);
    assert.equal((imagePrompt.match(/Required camera framing:/g) || []).length, 1);
    assert.doesNotMatch(imagePrompt, /公园竹林小径|湖边木栈道/);
});

test('a mismatched costume reference cannot add accessories or replace the written wardrobe', () => {
    const wardrobe = '成年女性模特，米白针织上衣、卡其半身裙、棕色短靴；不要包袋或首饰';
    const input = { ...request, reference_brief: { modelDesc: wardrobe }, shot_contract: {
        ...contract, wardrobe_styling: `用户指定穿搭：${wardrobe}。用户文字是单品、颜色、裙长、鞋型和层次的唯一硬约束。`,
    } };
    const context = { ...referenceContext, templates: referenceContext.templates.map(template => template.kind === 'costume'
        ? { ...template, tags: ['ivory', 'knit', 'khaki', 'skirt', 'boots', 'bag', 'gold', 'necklace'] }
        : template) };
    const compiled = compileCloudCandidateRequest(input, context);
    assert.match(compiled.prompt, /用户文字是单品、颜色、裙长、鞋型和层次的唯一硬约束/);
    assert.match(compiled.prompt, /secondary material and color reference only/);
    assert.doesNotMatch(compiled.prompt, /bag, gold, necklace/);
});

test('image prompt follows explicit wardrobe text over extras in the outfit image', async () => {
    const wardrobe = '成年女性模特，米白针织上衣、卡其半身裙、棕色短靴；不要包袋或首饰';
    const input = { ...request, reference_brief: { modelDesc: wardrobe }, shot_contract: {
        ...contract, wardrobe_styling: `用户指定穿搭：${wardrobe}。用户文字是单品、颜色、裙长、鞋型和层次的唯一硬约束。`,
    } };
    const context = { ...referenceContext, templates: referenceContext.templates.map(template => template.kind === 'costume'
        ? { ...template, tags: ['ivory', 'knit', 'khaki', 'skirt', 'boots', 'bag', 'gold', 'necklace'] }
        : template) };
    let imagePrompt;
    let translationPrompt;
    await generateCloudCandidate(input, { referenceContext: context, fetchImpl, ai: { run: async (_model, payload) => {
        if (_model.includes('llama')) {
            translationPrompt = payload.messages[1].content;
            return { response: 'Photorealistic portrait, preserve the specified ivory knit top, khaki skirt, brown ankle boots, pose and park location.' };
        }
        const form = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
        imagePrompt = String(form.get('prompt'));
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.match(translationPrompt, /Written wardrobe contract: 用户指定穿搭/);
    assert.match(translationPrompt, /棕色短靴/);
    assert.match(imagePrompt, /written wardrobe contract is authoritative/);
    assert.match(imagePrompt, /米白针织上衣、卡其半身裙、棕色短靴/);
    assert.match(imagePrompt, /Do not copy unrequested bags, jewelry, hats or other accessories\/props/);
    assert.doesNotMatch(imagePrompt, /bag, gold, necklace/);
});

test('candidate uses the existing Cloudflare AI binding, sends production params and validates its JPEG output', async () => {
    referenceFetchOptions.length = 0;
    const calls = [];
    const result = await generateCloudCandidate({ ...request, seed: 12345 }, { referenceContext, fetchImpl, ai: { run: async (model, input) => {
        calls.push({ model, input });
        if (model.includes('llama')) return { response: '35mm eye-level environmental portrait in an autumn park.' };
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.equal(calls.length, 2);
    assert.doesNotMatch(calls[0].input.messages[1].content, /Retrieved template direction|pose-1|costume-1|black, tights/);
    assert.equal(calls[1].model, request.model);
    const form = await new Response(calls[1].input.multipart.body, { headers: { 'Content-Type': calls[1].input.multipart.contentType } }).formData();
    assert.match(form.get('prompt'), /35mm eye-level environmental portrait/);
    assert.match(form.get('prompt'), /Exactly one hand rests on the hip/);
    assert.doesNotMatch(form.get('prompt'), /facial identity|apparent age/);
    assert.match(form.get('prompt'), /input_image_0 is the selected PoseAtlas action reference \(pose-1; Standing contrapposto, hand on hip\)/);
    assert.match(form.get('prompt'), /Use only its torso and limb positions\/body orientation as pose geometry/);
    assert.match(form.get('prompt'), /ignore its line art, white background, joint marks, mannequin appearance and nudity/);
    assert.match(form.get('prompt'), /input_image_1 is secondary guidance for outfit material and palette only/);
    assert.match(form.get('prompt'), /Follow the selected PoseAtlas action described in the shot contract as text/);
    assert.match(form.get('prompt'), /written shot contract and user restrictions override any pose-image conflict/);
    assert.match(form.get('prompt'), /Do not replace or add garments/);
    assert.equal(result.prompt, form.get('prompt'));
    for (let index = 0; index < 2; index++) assert.equal(form.get(`input_image_${index}`).size, jpeg.length);
    assert.equal(form.has('input_image_2'), false);
    assert.equal(form.get('width'), '768');
    assert.equal(form.get('height'), '1024');
    assert.equal(form.has('steps'), false);
    assert.equal(result.steps, 4);
    assert.equal(form.get('seed'), '12345');
    assert.deepEqual(result.referenceImages.map(reference => reference.kind), ['pose', 'costume']);
    assert.deepEqual(referenceFetchOptions.map(options => options.cf?.image || null), [null, {
        width: 511, height: 511, fit: 'scale-down', format: 'jpeg',
    }]);
    assert.equal(result.model, request.model);
    assert.equal(result.mime, 'image/jpeg');
    assert.deepEqual(result.bytes, jpeg);
    assert.deepEqual(result.referenceWarnings, ['未选择人物人脸参考图；本镜需要人工检查跨镜身份一致性。']);
});

test('FLUX.2 Klein 9B omits the unsupported steps field because inference is fixed at four steps', async () => {
    let submittedForm;
    const generated = await generateCloudCandidate({ ...request, model: '@cf/black-forest-labs/flux-2-klein-9b' }, {
        referenceContext, fetchImpl, ai: { run: async (model, payload) => {
            if (model.includes('llama')) return { response: 'A natural portrait in an autumn park.' };
            submittedForm = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
            return { image: Buffer.from(jpeg).toString('base64') };
        } },
    });
    assert.equal(submittedForm.has('steps'), false);
    assert.equal(generated.steps, 4);
});

test('director image generation retries one transient Workers AI 3043 failure', async () => {
    const calls = [];
    const result = await generateCloudCandidate(request, { referenceContext, fetchImpl, ai: { run: async (model, input) => {
        calls.push(model);
        if (model.includes('llama')) return { response: '35mm eye-level environmental portrait in an autumn park.' };
        if (calls.filter(value => value.includes('flux-1-schnell')).length === 1) throw new Error('3043 Internal server error');
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.equal(calls.filter(value => value.includes('flux-1-schnell')).length, 2);
    assert.deepEqual(result.bytes, jpeg);
});

test('image generation does not inject face or outfit images when only a pose was selected', async () => {
    const input = { ...request, reference_ids: [], reference_brief: { modelDesc: '成年模特' }, shot_contract: {
        ...contract, referenceIds: ['pose-1'], wardrobe_styling: '服装待确认，不指定款式或颜色。',
    } };
    let submittedForm;
    const result = await generateCloudCandidate(input, { referenceContext: {
        guidance: { suggestions: [] }, templates: referenceContext.templates,
    }, fetchImpl, ai: { run: async (model, payload) => {
        if (model.includes('llama')) return { response: 'Adult portrait in an autumn park, clothing to be confirmed.' };
        submittedForm = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.equal(submittedForm.has('input_image_0'), true);
    assert.equal(submittedForm.has('input_image_1'), false);
    assert.doesNotMatch(submittedForm.get('prompt'), /portrait\/thumbs|costume\/thumbs|facial identity|input_image_1/);
    assert.deepEqual(result.referenceImages.map(reference => reference.kind), ['pose']);
});

test('only the selected PoseAtlas drawing is supplied as pose geometry', async () => {
    let imagePrompt;
    const doubleHandContext = {
        ...referenceContext,
        guidance: { suggestions: [{ kind: 'pose', sourceItemId: 'pose-1', direction: '双手轻放腰侧，肘部自然向外不过度撑开。' }] },
        templates: referenceContext.templates.map(template => template.kind === 'pose'
            ? { ...template, title: '站立・双手扶腰', englishTitle: 'Standing, both hands on waist' }
            : template),
    };
    const input = { ...request, shot_contract: { ...contract, referenceIds: ['pose-1'], model_pose: '双手轻放腰侧，肘部自然向外不过度撑开。' } };
    const calls = [];
    await generateCloudCandidate(input, { referenceContext: doubleHandContext, fetchImpl, ai: { run: async (model, payload) => {
        calls.push({ model, payload });
        if (model.includes('llama')) return { response: 'A natural waist-up pose with both hands resting at the waist.' };
        const form = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
        imagePrompt = form.get('prompt');
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.match(calls[0].payload.messages[1].content, /站立・双手扶腰/);
    assert.match(calls[0].payload.messages[1].content, /双手轻放腰侧/);
    assert.match(imagePrompt, /Required pose: Standing, both hands on waist/);
    assert.match(imagePrompt, /Both hands rest lightly at the waist or hips/);
    assert.match(imagePrompt, /input_image_0 is the selected PoseAtlas action reference/);
    assert.match(imagePrompt, /input_image_1 is secondary guidance for outfit material and palette only/);
});

test('cloud candidate sends the angle-specific PoseAtlas thumbnail required by the shot', async () => {
    const requestedUrls = [];
    const poseUrl = 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/pose-diagonal.jpg';
    const angleContext = { ...referenceContext, templates: referenceContext.templates.map(template => template.kind === 'pose'
        ? { ...template, referenceImagesByAngle: { diagonal: poseUrl } }
        : template) };
    const input = { ...request, shot_contract: { ...contract, pose_angle: 'diagonal',
        generator_prompt: 'Waist-up portrait, distinct three-quarter diagonal torso turn.', referenceIds: ['pose-1'] } };
    const generated = await generateCloudCandidate(input, { referenceContext: angleContext, fetchImpl: async url => {
        requestedUrls.push(String(url));
        return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
    }, ai: { run: async model => {
        if (model.includes('llama')) return { response: 'Waist-up portrait with a distinct three-quarter diagonal torso turn.' };
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.ok(requestedUrls.includes(poseUrl));
    assert.ok(!requestedUrls.includes('https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/pose.jpg'));
    assert.equal(generated.referenceImages.find(reference => reference.kind === 'pose')?.referenceImageUrl, poseUrl);
});

test('opt-in upper-body reference trim changes only the pose image', async () => {
    const input = { ...request, seed: 42617, model: '@cf/black-forest-labs/flux-2-klein-9b',
        reference_ids: ['face-1'], shot_contract: { ...contract,
        shot_size: 'MS', pose_reference_mode: 'upper-body-crop' } };
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    let transforms = 0;
    const imageRequests = [];
    const ai = { run: async (model, payload) => {
        if (model.includes('llama')) return { response: 'Waist-up portrait from the head to the natural waistline.' };
        const form = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
        imageRequests.push({
            model, params: [...form.entries()].filter(([, value]) => typeof value === 'string'),
            identity: new Uint8Array(await form.get('input_image_0').arrayBuffer()),
            pose: new Uint8Array(await form.get('input_image_1').arrayBuffer()),
        });
        return { image: Buffer.from(jpeg).toString('base64') };
    } };
    const result = await generateCloudCandidate(input, { referenceContext, fetchImpl,
        imageBinding: { input: stream => {
            assert.ok(stream instanceof ReadableStream);
            return { transform: options => {
                transforms++;
                assert.deepEqual(options.trim, { left: '12p', top: '0p', width: '76p', height: '45p' });
                return { output: () => ({ response: () => new Response(png) }) };
            } };
        } },
        ai });
    const { pose_reference_mode, ...originalContract } = input.shot_contract;
    await generateCloudCandidate({ ...input, shot_contract: originalContract }, { referenceContext, fetchImpl, ai });
    const [cropped, original] = imageRequests;
    assert.deepEqual(cropped, { ...original, pose: png });
    assert.deepEqual(original.identity, jpeg);
    assert.deepEqual(original.pose, jpeg);
    assert.equal(Object.fromEntries(original.params).seed, '42617');
    assert.equal(transforms, 1);
    assert.equal(result.referenceImages[0].transform, undefined);
    assert.equal(result.referenceImages[1].transform, 'upper-body-crop');
    await assert.rejects(generateCloudCandidate(input, { referenceContext, fetchImpl,
        ai: { run: () => assert.fail('must not generate without the requested crop') } }), /POSE_REFERENCE_CROP_UNAVAILABLE/);
});

test('photographic waist-up pose mode sends only the approved Pexels pose photo and ignores its identity', async () => {
    const poseUrl = 'https://photo-workflow.pages.dev/assets/pose-references/pose-02.jpg';
    const sourceUrl = 'https://www.pexels.com/photo/close-up-photo-of-a-beautiful-woman-standing-near-street-13631460/';
    const requested = [];
    const photoContext = { ...referenceContext, templates: referenceContext.templates.map(template => template.kind === 'pose'
        ? { ...template, upstreamId: 'full_single_P017' }
        : template) };
    const input = { ...request, reference_ids: ['face-1'], shot_contract: { ...contract,
        shot_size: '中景', pose_angle: 'diagonal', pose_reference_mode: 'photographic',
        generator_prompt: 'Waist-up photo on a lakeside pier with a distinct three-quarter torso turn.',
        must_show: '脸部清晰，视线朝画面右侧。', reject_if: '身体正对镜头。',
        guidance_scale: 7, model_pose: '躯干明显三分之四侧转，脸部回望画面右侧。', referenceIds: ['pose-1'] } };
    let imagePrompt = '';
    let translationPrompt = '';
    let submittedGuidance = '';
    const generated = await generateCloudCandidate(input, { referenceContext: photoContext, fetchImpl: async (url, options) => {
        requested.push({ url: String(url), image: options?.cf?.image });
        return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
    }, ai: { run: async (model, payload) => {
        if (model.includes('llama')) {
            translationPrompt = payload.messages.map(message => message.content).join('\n');
            return { response: 'Waist-up portrait, three-quarter torso turn, looking toward frame-right.' };
        }
        const form = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
        imagePrompt = String(form.get('prompt'));
        submittedGuidance = String(form.get('guidance'));
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });

    const poseFetch = requested.find(item => item.url === poseUrl);
    assert.deepEqual(poseFetch?.image, { width: 511, height: 511, fit: 'cover', format: 'jpeg' });
    assert.match(imagePrompt, /licensed photographic pose reference/);
    assert.match(imagePrompt, /Transfer its body pose to the person in input_image_0/);
    assert.match(translationPrompt, /回望画面右侧/);
    assert.match(imagePrompt, /toward frame-right/);
    assert.doesNotMatch(translationPrompt, /frame-left/);
    assert.doesNotMatch(imagePrompt, /frame-left/);
    assert.match(imagePrompt, /Do not copy the pictured person's identity, face, hair, clothing/);
    assert.equal(submittedGuidance, '7');
    assert.equal(generated.referenceImages.find(reference => reference.kind === 'pose')?.referenceImageUrl, poseUrl);
    assert.equal(generated.referenceImages.find(reference => reference.kind === 'pose')?.sourceUrl, sourceUrl);
    assert.ok(requested.some(item => item.url === 'https://hruiccc.github.io/RuiC-PoseAtlas/portrait/thumbs/face.webp'));
});

test('free neuron exhaustion returns a distinct non-paid retry code', async () => {
    await assert.rejects(generateCloudCandidate(request, { referenceContext, fetchImpl, ai: { run: async model => {
        if (model.includes('llama')) return { response: 'A natural portrait in an autumn park.' };
        throw new Error('4006: you have used up your daily free allocation of 10,000 neurons');
    } } }), error => error.message === 'IMAGE_PROVIDER_FREE_QUOTA_EXHAUSTED');
});

test('cloud generation rejects missing bindings, unapproved providers, references, and bad output', async () => {
    let calls = 0;
    const ai = { run: async () => { calls++; return { image: Buffer.from(jpeg).toString('base64') }; } };
    await assert.rejects(generateCloudCandidate(request), /IMAGE_PROVIDER_NOT_CONFIGURED/);
    await assert.rejects(generateCloudCandidate({ ...request, provider: 'fal' }, { ai }), /PROVIDER_NOT_ALLOWED/);
    await assert.rejects(generateCloudCandidate({ ...request, billing_mode: 'paid-approved' }, { ai }), /BILLING_MODE_NOT_ALLOWED/);
    await assert.rejects(generateCloudCandidate({ ...request, reference_image_path: 'C:\\private\\ref.png' }, { ai }), /CLOUD_REFERENCE_IMAGE_NOT_CONFIGURED/);
    await assert.rejects(generateCloudCandidate(request, { ai }), /REFERENCE_IMAGES_REQUIRED/);
    await assert.rejects(generateCloudCandidate(request, { referenceContext, fetchImpl, ai: { run: async model => model.includes('llama') ? { response: 'One environmental portrait in an autumn park.' } : { image: 'not-base64' } } }), /IMAGE_PROVIDER_INVALID_RESPONSE|IMAGE_PROVIDER_GENERATION_FAILED/);
    await assert.rejects(generateCloudCandidate({ ...request, shot_contract: { ...contract, referenceIds: ['face-1'] } }, { referenceContext: { ...referenceContext, templates: referenceContext.templates.map(template => template.kind === 'portrait' ? { ...template, referenceImageUrl: 'https://evil.example/a.jpg' } : template) }, fetchImpl, ai }), /UNTRUSTED_REFERENCE_IMAGE/);
    assert.equal(calls, 0);
});

test('actual image payload preserves a close-up contract without forcing full-body framing', async () => {
    let imagePrompt;
    const input = { ...request, brief: 'Quiet expression by a cafe window', scene_brief: 'Cafe window, soft side light', style_direction: 'Editorial',
        shot_contract: { shot_language: 'Window expression', shot_size: 'MCU', generator_prompt: 'Close-up portrait, crop at shoulders, soft window side light', referenceIds: ['pose-1'] } };
    await generateCloudCandidate(input, { referenceContext, fetchImpl, ai: { run: async (_model, payload) => {
        const form = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
        imagePrompt = form.get('prompt');
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.match(imagePrompt, /Close-up portrait, crop at shoulders/);
    assert.match(imagePrompt, /soft window side light/);
    assert.match(imagePrompt, /Head-and-shoulders portrait/);
    assert.doesNotMatch(imagePrompt, /facial identity|apparent age/);
    assert.match(imagePrompt, /Upper-body pose adapted from the selected PoseAtlas reference/);
    assert.match(imagePrompt, /Do not force unseen hands, hips, legs or feet into the crop/);
    assert.doesNotMatch(imagePrompt, /Exactly one hand rests on the hip/);
    assert.doesNotMatch(imagePrompt, /single full-body|Keep the figure asymmetrical|same bent and lowered arms/);
});

test('MS waist-up framing stays at the waist when the wardrobe lists a full skirt and shoes', async () => {
    const wardrobe = '象牙白宽袖衬衫、藏青色及踝长裙、黑色皮鞋';
    const input = { ...request, brief: '自然公园肖像，人物坐在长椅上',
        scene_brief: `SUBJECT AND CLOTHING: ${wardrobe}\nLOCATION WEATHER AND TIME: 秋日公园，自然光\nUSER CONSTRAINTS: 不加道具`,
        reference_brief: { modelDesc: wardrobe },
        shot_contract: {
            shot_language: '公园中景人像', shot_size: '中景', referenceIds: ['pose-1'],
            generator_prompt: `Waist-up portrait. Crop below the waist and keep the face visible. Subject and clothing: ${wardrobe}. User constraints: 不加道具. Style: 自然纪实.`,
            model_pose: '自然坐姿，肩颈放松', wardrobe_styling: wardrobe,
        } };
    let translationSystem;
    let translationInput;
    let imagePrompt;
    const fetchedReferenceUrls = [];
    let sentImageSlots;
    const result = await generateCloudCandidate(input, { referenceContext, fetchImpl: async url => {
        fetchedReferenceUrls.push(String(url));
        return fetchImpl(url);
    }, ai: { run: async (model, payload) => {
        if (model.includes('llama')) {
            translationSystem = payload.messages[0].content;
            translationInput = payload.messages[1].content;
            return { response: 'Waist-up portrait from the top of the head through the natural waistline; natural seated pose, ivory blouse, soft park light.' };
        }
        const form = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
        imagePrompt = String(form.get('prompt'));
        sentImageSlots = [form.has('input_image_0'), form.has('input_image_1'), form.has('input_image_2')];
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });

    assert.match(translationSystem, /For this MS\/中景 shot, frame from the top of the head through the natural waistline/);
    assert.match(translationSystem, /wardrobe contract applies only to clothing visible inside this crop/);
    assert.match(translationSystem, /never widen or lower the framing to display the complete outfit/);
    assert.match(translationInput, /Required waist-up crop: frame from the top of the head through the natural waistline/);
    assert.match(translationInput, /Keep the long or wide sleeves fully covering both shoulders/);
    assert.match(translationInput, /Shot contract: Waist-up portrait\. Crop at the natural waistline/);
    assert.doesNotMatch(translationInput, /Crop below the waist/);
    assert.match(translationInput, /Exclude the hips and everything below, including skirt below the waist, legs and shoes/);
    assert.match(translationInput, /Written wardrobe contract: 象牙白宽袖衬衫/);
    assert.doesNotMatch(translationInput, /藏青色及踝长裙|黑色皮鞋/);
    assert.match(translationInput, /秋日公园，自然光/);
    assert.match(translationInput, /不加道具/);
    assert.match(imagePrompt, /Required camera framing: Waist-up portrait from the top of the head through the natural waistline/);
    assert.match(imagePrompt, /The written wardrobe contract identifies the outfit, but only clothing visible inside this waist-up crop should appear/);
    assert.match(imagePrompt, /Keep the long or wide sleeves fully covering both shoulders/);
    assert.match(imagePrompt, /do not widen or lower framing to show the full skirt, legs or shoes/);
    assert.match(imagePrompt, /象牙白宽袖衬衫/);
    assert.doesNotMatch(imagePrompt, /(?:Written wardrobe contract|wardrobe contract identifies the outfit)[^\n]*(?:长裙|皮鞋)/);
    assert.match(imagePrompt, /input_image_0 is the selected PoseAtlas action reference/);
    assert.match(imagePrompt, /Use only its torso and limb positions\/body orientation as pose geometry/);
    assert.match(imagePrompt, /No full-body costume image is supplied, so it cannot pull this waist-up frame wider/);
    assert.doesNotMatch(imagePrompt, /Reference image 2 is secondary guidance for material and palette only/);
    assert.doesNotMatch(imagePrompt, /Head-to-toe portrait|show both shoes and ground beneath them/i);
    assert.deepEqual(sentImageSlots, [true, false, false]);
    assert.deepEqual(result.referenceImages.map(reference => reference.kind), ['pose']);
    assert.equal(fetchedReferenceUrls.length, 1);
    assert.match(fetchedReferenceUrls[0], /thumbs\/pose\.jpg$/);
});

test('clothing detail image prompt keeps the specified garment in a tight crop', async () => {
    let imagePrompt;
    let translationSystem;
    let translationInput;
    let imageSlots;
    const fetchedReferenceUrls = [];
    const wardrobe = '米白色针织上衣、卡其色半身裙、棕色短靴';
    const shotWardrobe = '米白色针织上衣，本镜只拍该上衣的面料细节。';
    const input = { ...request, brief: `全套服装：${wardrobe}。本镜只拍针织上衣面料细节。`,
        scene_brief: `湖边木栈道（原方案穿搭：${wardrobe}）`, reference_brief: { modelDesc: wardrobe }, shot_contract: {
        shot_language: '人物与服装细节', shot_size: '特写', referenceIds: [],
        generator_prompt: 'Tight garment-detail close-up of the user specified knit fabric and texture; exclude the face and full-body pose.',
        model_pose: '上半身摆姿参考，只保留衣料纹理需要的肩部姿态，不要求腿部动作。',
        wardrobe_styling: shotWardrobe,
    } };
    const result = await generateCloudCandidate(input, { referenceContext, fetchImpl: async url => {
        fetchedReferenceUrls.push(String(url));
        return fetchImpl(url);
    }, ai: { run: async (_model, payload) => {
        if (_model.includes('llama')) {
            translationSystem = payload.messages[0].content;
            translationInput = payload.messages[1].content;
            return { response: 'Close-up of the ivory knit top worn by the model, with a visible shoulder and upper-torso segment for context; crop out the face and rest of the outfit, with no floating garment.' };
        }
        const form = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
        imagePrompt = String(form.get('prompt'));
        imageSlots = [form.has('input_image_0'), form.has('input_image_1')];
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.match(translationSystem, /shot-specific wardrobe contract is authoritative and overrides any conflicting full-outfit wording in the global brief, scene context or reference description/i);
    assert.match(imagePrompt, /Create a photorealistic close-up of the named garment worn on the model/);
    assert.match(imagePrompt, /visible shoulder or upper-torso segment as natural context/);
    assert.match(imagePrompt, /crop out the face and rest of the outfit, and do not show a floating garment/i);
    assert.match(imagePrompt, /input_image_0 is the selected clothing-detail reference\. It controls only the specified garment's material, color and texture/);
    assert.match(imagePrompt, /shot-specific wardrobe contract is authoritative and overrides any global full-outfit text/i);
    assert.match(imagePrompt, /米白色针织上衣，本镜只拍该上衣的面料细节/);
    assert.match(translationInput, /Shot-specific wardrobe contract: 米白色针织上衣，本镜只拍该上衣的面料细节/);
    assert.doesNotMatch(imagePrompt, /Required pose:|Garment-detail crop; no pose reference/);
    assert.doesNotMatch(imagePrompt, /Selected pose library entry|Upper-body pose adapted from the selected PoseAtlas reference/);
    assert.doesNotMatch(imagePrompt, /face photograph|face reference|identity reference|portrait reference|卡其色半身裙|棕色短靴|head-to-toe|both shoes|Exactly one hand rests on the hip/i);
    assert.deepEqual(imageSlots, [true, false]);
    assert.deepEqual(result.referenceImages.map(reference => reference.kind), ['costume']);
    assert.match(result.referenceImages[0].referenceImageUrl, /costume\/thumbs\/outfit\.webp$/);
    assert.equal(fetchedReferenceUrls.length, 1);
    assert.match(fetchedReferenceUrls[0], /costume\/thumbs\/outfit\.webp$/);
    assert.doesNotMatch(imagePrompt, /PoseAtlas action reference|Required pose:|input_image_1/);
});

test('compiled shot includes only its selected pose from a multi-pose plan', () => {
    const context = { ...referenceContext, templates: [...referenceContext.templates,
        { id: 'pose-2', kind: 'pose', title: 'Other seated pose' }] };
    const compiled = compileCloudCandidateRequest({ ...request, shot_contract: { ...contract, referenceIds: ['pose-1'] } }, context);
    assert.match(compiled.prompt, /pose-1/);
    assert.doesNotMatch(compiled.prompt, /Other seated pose|pose-2/);
});

test('an explicit waist-knot must-show boundary overrides the generic waistline crop', async () => {
    const mustShow = 'Show the complete natural-waist wrap knot; the lower frame edge sits just below the knot with a narrow blouse strip visible.';
    const input = {
        ...request,
        scene_brief: 'Open lakeside wooden pier with readable water and diagonal boards.',
        shot_contract: {
            ...contract,
            shot_size: '中景',
            generator_prompt: 'Waist-up portrait on the pier; show the complete wrap knot at the natural waist.',
            wardrobe_styling: 'Ivory long-sleeved wrap blouse with a front tie at the natural waist.',
            must_show: mustShow,
        },
    };
    let translationSystem = '';
    let imagePrompt = '';
    await generateCloudCandidate(input, { referenceContext, fetchImpl, ai: { run: async (model, payload) => {
        if (model.includes('llama')) {
            translationSystem = payload.messages[0].content;
            return { response: 'Waist-up portrait through the full waist knot, with a narrow blouse strip below.' };
        }
        const form = await new Response(payload.multipart.body, { headers: { 'Content-Type': payload.multipart.contentType } }).formData();
        imagePrompt = String(form.get('prompt'));
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });

    assert.match(translationSystem, /complete natural-waist knot/);
    assert.match(translationSystem, /place its center at about 80–84% of image height/);
    assert.match(translationSystem, /preserve an 8–12% blouse margin beneath it/);
    assert.match(translationSystem, /knot and tie ends must not touch the lower edge/);
    assert.doesNotMatch(translationSystem, /lower edge at the waistline|cuts at the waistline/);
    assert.match(imagePrompt, /complete natural-waist wrap knot/);
    assert.match(imagePrompt, /knot center at about 80–84% of image height/);
    assert.match(imagePrompt, /leave a clearly visible 8–12% blouse margin below it/);
    assert.match(imagePrompt, /neither knot nor tie ends may touch the bottom edge/);
    assert.doesNotMatch(imagePrompt, /lower edge cuts at the waistline|cuts at the waistline/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCloudCandidateRequest, generateCloudCandidate } from '../api/director-cloud-generation.mjs';

const contract = {
    shot_language: 'Autumn park seated portrait',
    generator_prompt: '35mm eye-level environmental portrait, subject seated naturally on an existing park bench.',
    must_show: ['full hands and feet', 'muted cinematic autumn colors'],
    reject_if: ['extra people', 'flash lighting', 'cropped feet'],
};
const request = {
    provider: 'cloudflare', model: '@cf/black-forest-labs/flux-1-schnell', candidate_count: 1,
    billing_mode: 'free-credit-first', aspect_ratio: 'portrait',
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
const fetchImpl = async () => new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });

test('cloud candidate compiler preserves shot contract, constraints, and framing guidance', () => {
    const compiled = compileCloudCandidateRequest(request);
    assert.match(compiled.prompt, /Autumn park seated portrait/);
    assert.match(compiled.prompt, /35mm eye-level environmental portrait/);
    assert.match(compiled.prompt, /低饱和电影感/);
    assert.match(compiled.prompt, /棕色针织衫/);
    assert.match(compiled.prompt, /Do not include: extra people; flash lighting/);
    assert.match(compiled.prompt, /portrait 3:4 composition/);
    assert.ok(compiled.prompt.length <= 2048);
    assert.deepEqual([compiled.width, compiled.height, compiled.steps], [768, 1024, 4]);
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

test('candidate uses the existing Cloudflare AI binding and validates its JPEG output', async () => {
    const calls = [];
    const result = await generateCloudCandidate(request, { referenceContext, fetchImpl, ai: { run: async (model, input) => {
        calls.push({ model, input });
        if (model.includes('llama')) return { response: '35mm eye-level environmental portrait in an autumn park.' };
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.equal(calls.length, 2);
    assert.doesNotMatch(calls[0].input.messages[1].content, /Retrieved template direction|pose-1|costume-1|black, tights/);
    assert.equal(calls[1].model, '@cf/black-forest-labs/flux-2-klein-9b');
    const form = await new Response(calls[1].input.multipart.body, { headers: { 'Content-Type': calls[1].input.multipart.contentType } }).formData();
    assert.match(form.get('prompt'), /35mm eye-level environmental portrait/);
    assert.match(form.get('prompt'), /Exactly one hand rests on the hip/);
    assert.match(form.get('prompt'), /Follow the selected PoseAtlas action described in the shot contract as text/);
    assert.doesNotMatch(form.get('prompt'), /black-and-white artist drawing/);
    assert.match(form.get('prompt'), /Do not replace or add garments/);
    assert.equal(result.prompt, form.get('prompt'));
    for (let index = 0; index < 2; index++) assert.equal(form.get(`input_image_${index}`).size, jpeg.length);
    assert.equal(form.has('input_image_2'), false);
    assert.equal(form.get('width'), '768');
    assert.equal(form.get('height'), '1024');
    assert.deepEqual(result.referenceImages.map(reference => reference.kind), ['portrait', 'costume']);
    assert.equal(result.model, '@cf/black-forest-labs/flux-2-klein-9b');
    assert.equal(result.mime, 'image/jpeg');
    assert.deepEqual(result.bytes, jpeg);
});

test('double-hand pose is explicit while the pose drawing stays out of the image payload', async () => {
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
    await assert.rejects(generateCloudCandidate(request, { referenceContext: { ...referenceContext, templates: referenceContext.templates.map(template => template.kind === 'portrait' ? { ...template, referenceImageUrl: 'https://evil.example/a.jpg' } : template) }, fetchImpl, ai }), /UNTRUSTED_REFERENCE_IMAGE/);
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
    assert.match(imagePrompt, /face photograph/);
    assert.doesNotMatch(imagePrompt, /single full-body|Keep the figure asymmetrical|same bent and lowered arms/);
});

test('compiled shot includes only its selected pose from a multi-pose plan', () => {
    const context = { ...referenceContext, templates: [...referenceContext.templates,
        { id: 'pose-2', kind: 'pose', title: 'Other seated pose' }] };
    const compiled = compileCloudCandidateRequest({ ...request, shot_contract: { ...contract, referenceIds: ['pose-1'] } }, context);
    assert.match(compiled.prompt, /pose-1/);
    assert.doesNotMatch(compiled.prompt, /Other seated pose|pose-2/);
});

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

test('candidate uses the existing Cloudflare AI binding and validates its JPEG output', async () => {
    const calls = [];
    const result = await generateCloudCandidate(request, { referenceContext, fetchImpl, ai: { run: async (model, input) => {
        calls.push({ model, input });
        if (model.includes('llama')) return { response: '35mm eye-level environmental portrait in an autumn park.' };
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].model, '@cf/black-forest-labs/flux-2-klein-4b');
    const form = await new Response(calls[1].input.multipart.body, { headers: { 'Content-Type': calls[1].input.multipart.contentType } }).formData();
    assert.match(form.get('prompt'), /35mm eye-level environmental portrait/);
    assert.match(form.get('prompt'), /Exactly one hand rests on the hip/);
    assert.match(form.get('prompt'), /without adding or replacing layers/);
    assert.equal(result.prompt, form.get('prompt'));
    for (let index = 0; index < 3; index++) assert.equal(form.get(`input_image_${index}`).size, jpeg.length);
    assert.equal(form.get('width'), '768');
    assert.equal(form.get('height'), '1024');
    assert.equal(result.referenceImages.length, 3);
    assert.equal(result.model, '@cf/black-forest-labs/flux-2-klein-4b');
    assert.equal(result.mime, 'image/jpeg');
    assert.deepEqual(result.bytes, jpeg);
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
    await assert.rejects(generateCloudCandidate(request, { referenceContext: { ...referenceContext, templates: [{ ...referenceContext.templates[0], referenceImageUrl: 'https://evil.example/a.jpg' }, ...referenceContext.templates.slice(1)] }, fetchImpl, ai }), /UNTRUSTED_REFERENCE_IMAGE/);
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

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
    const result = await generateCloudCandidate(request, { ai: { run: async (model, input) => {
        calls.push({ model, input });
        return { image: Buffer.from(jpeg).toString('base64') };
    } } });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].model, '@cf/black-forest-labs/flux-1-schnell');
    assert.match(calls[0].input.prompt, /35mm eye-level environmental portrait/);
    assert.equal(calls[0].input.steps, 4);
    assert.equal(Object.hasOwn(calls[0].input, 'seed'), false);
    assert.equal(result.model, '@cf/black-forest-labs/flux-1-schnell');
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
    await assert.rejects(generateCloudCandidate(request, { ai: { run: async () => ({ image: 'not-base64' }) } }), /IMAGE_PROVIDER_INVALID_RESPONSE/);
    assert.equal(calls, 0);
});

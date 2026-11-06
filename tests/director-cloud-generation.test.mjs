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
    provider: 'fal', model: 'fal-ai/flux/schnell', candidate_count: 1,
    billing_mode: 'free-credit-first', aspect_ratio: 'portrait',
    brief: '当前分镜：自然坐在公园长椅上；仅用现有棕色针织衫。',
    style_direction: '低饱和电影感', scene_brief: '秋日公园，自然光，无助手、无闪光灯。',
    shot_contract: contract,
};
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);

test('cloud candidate compiler preserves the selected shot contract and constraints', () => {
    const compiled = compileCloudCandidateRequest(request);
    assert.match(compiled.prompt, /Autumn park seated portrait/);
    assert.match(compiled.prompt, /35mm eye-level environmental portrait/);
    assert.match(compiled.prompt, /低饱和电影感/);
    assert.match(compiled.prompt, /棕色针织衫/);
    assert.match(compiled.prompt, /Do not include: extra people; flash lighting/);
    assert.match(compiled.prompt, /Avoid: text, watermark/);
    assert.deepEqual([compiled.width, compiled.height, compiled.steps], [768, 1024, 4]);
});

test('cloud candidate submits one fixed fal model request through its queue and downloads the result', async () => {
    const requests = [];
    const result = await generateCloudCandidate(request, { token: 'fal-test-key', fetchImpl: async (url, options) => {
        requests.push({ url: String(url), options });
        if (requests.length === 1) {
            assert.equal(String(url), 'https://queue.fal.run/fal-ai/flux/schnell');
            assert.equal(options.headers.Authorization, 'Key fal-test-key');
            const body = JSON.parse(options.body);
            assert.match(body.prompt, /35mm eye-level environmental portrait/);
            assert.match(body.prompt, /Do not include: extra people; flash lighting; cropped feet/);
            assert.equal(body.num_inference_steps, 4);
            assert.equal(body.num_images, 1);
            assert.equal(body.enable_safety_checker, true);
            return Response.json({
                status: 'IN_QUEUE', request_id: '6ab846b4-c0dc-44e1-b2b3-d937fa678555',
                status_url: 'https://queue.fal.run/fal-ai/flux/requests/6ab846b4-c0dc-44e1-b2b3-d937fa678555/status',
                response_url: 'https://queue.fal.run/fal-ai/flux/requests/6ab846b4-c0dc-44e1-b2b3-d937fa678555',
            });
        }
        if (String(url).endsWith('/status')) return Response.json({ status: 'COMPLETED' });
        if (String(url).includes('/requests/')) return Response.json({ images: [{ url: 'https://v3.fal.media/candidate.png' }] });
        assert.equal(String(url), 'https://v3.fal.media/candidate.png');
        assert.equal(options.redirect, 'manual');
        return new Response(png, { headers: { 'Content-Type': 'image/png' } });
    } });
    assert.equal(requests.length, 4);
    assert.equal(result.model, 'fal-ai/flux/schnell');
    assert.equal(result.mime, 'image/png');
    assert.deepEqual(result.bytes, png);
});

test('cloud generation rejects uncontrolled billing, provider, reference-image, and output URLs', async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return Response.json({}); };
    await assert.rejects(generateCloudCandidate(request, { fetchImpl }), /IMAGE_PROVIDER_NOT_CONFIGURED/);
    await assert.rejects(generateCloudCandidate({ ...request, billing_mode: 'paid-approved' }, { token: 'fal-test-key', fetchImpl }), /BILLING_MODE_NOT_ALLOWED/);
    await assert.rejects(generateCloudCandidate({ ...request, reference_image_path: 'C:\\private\\ref.png' }, { token: 'fal-test-key', fetchImpl }), /CLOUD_REFERENCE_IMAGE_NOT_CONFIGURED/);
    await assert.rejects(generateCloudCandidate(request, { token: 'fal-test-key', fetchImpl: async () => {
        calls++;
        return Response.json({ images: [{ url: 'https://example.com/steal' }] });
    } }), /IMAGE_PROVIDER_INVALID_RESPONSE/);
    assert.equal(calls, 1);
});

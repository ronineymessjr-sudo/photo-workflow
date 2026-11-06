const HF_MODEL = 'black-forest-labs/FLUX.1-schnell';
const HF_PROVIDER_MODEL = 'fal-ai/flux/schnell';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function compileCloudCandidateRequest(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_GENERATION_REQUEST');
    if (input.provider !== 'huggingface' || input.model !== HF_MODEL) throw new Error('GENERATION_PROVIDER_NOT_ALLOWED');
    if (input.candidate_count !== 1 || input.billing_mode !== 'free-credit-first') throw new Error('GENERATION_BILLING_MODE_NOT_ALLOWED');
    if (input.reference_image_path || input.reference_image_url || input.reference_asset_ids?.length) throw new Error('CLOUD_REFERENCE_IMAGE_NOT_CONFIGURED');

    const brief = typeof input.brief === 'string' ? input.brief.trim() : '';
    const contract = input.shot_contract;
    if (!brief || brief.length > 4000 || !contract || typeof contract !== 'object' || Array.isArray(contract)) {
        throw new Error('INVALID_GENERATION_REQUEST');
    }
    const shotLanguage = clean(contract.shot_language, 160);
    const generatorPrompt = clean(contract.generator_prompt, 2000);
    if (!shotLanguage || generatorPrompt.length < 10) throw new Error('SHOT_CONTRACT_REQUIRED');
    const mustShow = list(contract.master_must_show || contract.must_show);
    const rejectIf = list(contract.master_reject_if || contract.reject_if);
    const context = [clean(input.scene_brief, 2000), clean(input.style_direction, 300), brief].filter(Boolean);
    const prompt = [
        'Create one photorealistic editorial photography candidate. Follow the selected shot contract exactly.',
        `Shot language: ${shotLanguage}.`,
        `Camera and composition: ${generatorPrompt}.`,
        mustShow.length ? `Must show: ${mustShow.join('; ')}.` : '',
        `Scene and constraints: ${context.join('\n')}`,
    ].filter(Boolean).join('\n');
    const negativePrompt = [
        ...rejectIf,
        'text, watermark, collage, extra people, extra props, cropped hands or feet, malformed anatomy',
    ].join(', ');
    const dimensions = {
        landscape: [1024, 768], 'landscape-wide': [1024, 576], square: [768, 768],
        portrait: [768, 1024], 'portrait-tall': [576, 1024],
    }[input.aspect_ratio] || [1024, 768];
    return {
        prompt, negativePrompt, width: dimensions[0], height: dimensions[1],
        steps: 4, seed: Number.isSafeInteger(input.seed) ? input.seed : Math.floor(Math.random() * 2147483647),
        shotLanguage, model: HF_MODEL,
    };
}

export async function generateCloudCandidate(input, { token, fetchImpl = fetch } = {}) {
    if (!token) throw new Error('IMAGE_PROVIDER_NOT_CONFIGURED');
    const compiled = compileCloudCandidateRequest(input);
    const response = await fetchImpl(`https://router.huggingface.co/fal-ai/${HF_PROVIDER_MODEL}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: compiled.prompt, negative_prompt: compiled.negativePrompt,
            image_size: { width: compiled.width, height: compiled.height },
            num_inference_steps: compiled.steps, seed: compiled.seed,
        }),
        signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) {
        if (response.status === 402) throw new Error('IMAGE_PROVIDER_CREDITS_EXHAUSTED');
        if (response.status === 429) throw new Error('IMAGE_PROVIDER_RATE_LIMITED');
        throw new Error(`IMAGE_PROVIDER_UPSTREAM_${response.status}`);
    }
    let result;
    try { result = await response.json(); } catch { throw new Error('IMAGE_PROVIDER_INVALID_RESPONSE'); }
    const imageUrl = result?.images?.[0]?.url;
    if (typeof imageUrl !== 'string') throw new Error('IMAGE_PROVIDER_INVALID_RESPONSE');
    let parsedUrl;
    try { parsedUrl = new URL(imageUrl); } catch { throw new Error('IMAGE_PROVIDER_INVALID_RESPONSE'); }
    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password
        || !(/(^|\.)fal\.media$/i.test(parsedUrl.hostname) || /(^|\.)fal\.ai$/i.test(parsedUrl.hostname))) {
        throw new Error('IMAGE_PROVIDER_INVALID_RESPONSE');
    }
    const image = await fetchImpl(parsedUrl, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    if (!image.ok) throw new Error(`IMAGE_PROVIDER_ASSET_${image.status}`);
    const mime = (image.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw new Error('IMAGE_PROVIDER_INVALID_IMAGE_TYPE');
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || !hasValidImageSignature(bytes, mime)) throw new Error('IMAGE_PROVIDER_IMAGE_SIZE_INVALID');
    return { ...compiled, bytes, mime };
}

function clean(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function list(value) {
    const items = Array.isArray(value) ? value : value == null ? [] : [value];
    return items.map(item => clean(item, 300)).filter(Boolean).slice(0, 16);
}

function hasValidImageSignature(bytes, mime) {
    if (mime === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    return mime === 'image/webp' && bytes.length >= 12
        && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
        && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}

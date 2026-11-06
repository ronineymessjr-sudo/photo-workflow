const CLOUDFLARE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PROMPT_CHARS = 2048;

export function compileCloudCandidateRequest(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_GENERATION_REQUEST');
    if (input.provider !== 'cloudflare' || input.model !== CLOUDFLARE_MODEL) throw new Error('GENERATION_PROVIDER_NOT_ALLOWED');
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
        rejectIf.length ? `Do not include: ${rejectIf.join('; ')}.` : '',
    ].filter(Boolean).join('\n');
    const avoid = 'text, watermark, collage, extra people, extra props, cropped hands or feet, malformed anatomy';
    const dimensions = {
        landscape: [1024, 768], 'landscape-wide': [1024, 576], square: [768, 768],
        portrait: [768, 1024], 'portrait-tall': [576, 1024],
    }[input.aspect_ratio] || [1024, 768];
    const aspectDescription = {
        landscape: 'landscape 4:3 composition', 'landscape-wide': 'wide landscape 16:9 composition',
        square: 'square composition', portrait: 'portrait 3:4 composition', 'portrait-tall': 'vertical portrait 9:16 composition',
    }[input.aspect_ratio] || 'landscape 4:3 composition';
    const compiledPrompt = `${prompt}\nFrame the scene as a ${aspectDescription}. Avoid: ${avoid}.`;
    return {
        prompt: compiledPrompt.slice(0, MAX_PROMPT_CHARS), width: dimensions[0], height: dimensions[1],
        steps: 4, seed: Number.isSafeInteger(input.seed) ? input.seed : Math.floor(Math.random() * 2147483647),
        shotLanguage, model: CLOUDFLARE_MODEL,
    };
}

export async function generateCloudCandidate(input, { ai } = {}) {
    if (!ai || typeof ai.run !== 'function') throw new Error('IMAGE_PROVIDER_NOT_CONFIGURED');
    const compiled = compileCloudCandidateRequest(input);
    let result;
    try {
        result = await ai.run(CLOUDFLARE_MODEL, { prompt: compiled.prompt, steps: compiled.steps });
    } catch {
        throw new Error('IMAGE_PROVIDER_GENERATION_FAILED');
    }
    if (typeof result?.image !== 'string' || result.image.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) {
        throw new Error('IMAGE_PROVIDER_INVALID_RESPONSE');
    }
    let binary;
    try { binary = atob(result.image); } catch { throw new Error('IMAGE_PROVIDER_INVALID_RESPONSE'); }
    if (!binary.length || binary.length > MAX_IMAGE_BYTES) throw new Error('IMAGE_PROVIDER_IMAGE_SIZE_INVALID');
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const mime = 'image/jpeg';
    if (!hasValidImageSignature(bytes, mime)) throw new Error('IMAGE_PROVIDER_INVALID_IMAGE_TYPE');
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

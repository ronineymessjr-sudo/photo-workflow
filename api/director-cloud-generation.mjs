import { prepareReferenceContext } from './ai-studio/reference-brief.mjs';

const CLOUDFLARE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PROMPT_CHARS = 2048;

export async function prepareCloudCandidateReferences(input, options = {}) {
    compileCloudCandidateRequest(input);
    const context = await prepareReferenceContext({
        ...input.reference_brief,
        scene: input.reference_brief?.scene || input.scene_brief || input.brief,
        style: input.reference_brief?.style || input.style_direction,
        useReferenceLibrary: true,
        referenceIds: input.shot_contract?.referenceIds?.length ? input.shot_contract.referenceIds : input.reference_ids,
    }, options);
    if (!context?.templates.length || !context.templates.some(template => template.sourceUrl)) {
        throw new Error('REFERENCE_LIBRARY_UNAVAILABLE');
    }
    return context;
}

export function compileCloudCandidateRequest(input, referenceContext) {
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
    const generatorPrompt = clean(contract.generator_prompt, 500);
    if (!shotLanguage || generatorPrompt.length < 10) throw new Error('SHOT_CONTRACT_REQUIRED');
    const mustShow = list(contract.master_must_show || contract.must_show);
    const rejectIf = list(contract.master_reject_if || contract.reject_if);
    const context = [clean(input.scene_brief, 200), clean(input.style_direction, 100), clean(brief, 200)].filter(Boolean);
    const templateBrief = referenceContext?.templates.map(template =>
        `${template.id}: ${template.title}. ${template.description || ''}. ${(template.tags || []).join(', ')}`
    ).join('\n');
    const prompt = [
        'Create one photorealistic editorial photography candidate. Follow the selected shot contract exactly.',
        `Shot language: ${shotLanguage}.`,
        `Camera and composition: ${generatorPrompt}.`,
        `Wardrobe: ${clean(contract.wardrobe_styling, 140) || 'Preserve the user specified garments exactly'}.`,
        `Scene and constraints: ${context.join('\n')}`,
        mustShow.length ? `Must show: ${clean(mustShow.join('; '), 200)}.` : '',
        rejectIf.length ? `Do not include: ${clean(rejectIf.join('; '), 160)}.` : '',
        templateBrief ? `Retrieved template direction (user constraints take priority): ${clean(templateBrief, 350)}` : '',
        referenceContext ? `Processed template guidance: ${clean(referenceContext.guidance?.suggestions.map(item => item.direction).join(' '), 160)}` : '',
    ].filter(Boolean).join('\n');
    const avoid = 'text, watermark, collage, extra limbs, duplicate feet, malformed anatomy';
    const dimensions = {
        landscape: [1024, 768], 'landscape-wide': [1024, 576], square: [768, 768],
        portrait: [768, 1024], 'portrait-tall': [576, 1024],
    }[input.aspect_ratio] || [1024, 768];
    const aspectDescription = {
        landscape: 'landscape 4:3 composition', 'landscape-wide': 'wide landscape 16:9 composition',
        square: 'square composition', portrait: 'portrait 3:4 composition', 'portrait-tall': 'vertical portrait 9:16 composition',
    }[input.aspect_ratio] || 'landscape 4:3 composition';
    const suffix = `\nFrame the scene as a ${aspectDescription}. Avoid: ${avoid}.`;
    const compiledPrompt = prompt.slice(0, MAX_PROMPT_CHARS - suffix.length) + suffix;
    return {
        prompt: compiledPrompt.slice(0, MAX_PROMPT_CHARS), width: dimensions[0], height: dimensions[1],
        steps: 4, seed: Number.isSafeInteger(input.seed) ? input.seed : Math.floor(Math.random() * 2147483647),
        shotLanguage, model: CLOUDFLARE_MODEL,
    };
}

export async function generateCloudCandidate(input, { ai, referenceContext } = {}) {
    if (!ai || typeof ai.run !== 'function') throw new Error('IMAGE_PROVIDER_NOT_CONFIGURED');
    const compiled = compileCloudCandidateRequest(input, referenceContext);
    let prompt = compiled.prompt;
    let result;
    try {
        if (referenceContext && /[\u3400-\u9fff]/u.test(prompt)) {
            const translated = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast', {
                messages: [
                    { role: 'system', content: 'Translate this processed photography contract into one concise English image prompt. Preserve exact subject count, location, pose, framing and clothing. User constraints override template pose and outfit suggestions. Express prohibitions as positive placement: uncrossed legs means feet parallel hip-width apart, straight separated legs; full body means head-to-toe with both shoes and ground beneath visible; trousers means a separate sweater and two trouser legs. Describe a single photograph. Never invent garments or change standing to sitting. Return only the English prompt under 1800 characters, no commentary or text to render.' },
                    { role: 'user', content: prompt },
                ], max_tokens: 600, temperature: 0,
            });
            if (typeof translated?.response !== 'string' || translated.response.trim().length < 20) throw new Error('PROMPT_TRANSLATION_FAILED');
            prompt = translated.response.trim().slice(0, MAX_PROMPT_CHARS);
        }
        result = await ai.run(CLOUDFLARE_MODEL, { prompt, steps: compiled.steps });
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

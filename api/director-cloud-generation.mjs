import { prepareReferenceContext } from './ai-studio/reference-brief.mjs';

const CLOUDFLARE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PROMPT_CHARS = 2048;

export async function prepareCloudCandidateReferences(input, options = {}) {
    compileCloudCandidateRequest(input);
    for (const ids of [input.reference_ids, input.shot_contract?.referenceIds]) {
        if (ids !== undefined && (!Array.isArray(ids) || ids.length > 6 || ids.some(id => typeof id !== 'string'))) throw new Error('INVALID_REFERENCE_SELECTION');
    }
    const context = await prepareReferenceContext({
        ...input.reference_brief,
        scene: [input.reference_brief?.scene, input.scene_brief, input.brief].filter(Boolean).join('\n'),
        modelDesc: input.reference_brief?.modelDesc || input.brief,
        style: input.reference_brief?.style || input.style_direction,
        useReferenceLibrary: true,
        referenceIds: [...new Set([...(input.shot_contract?.referenceIds || []), ...(input.reference_ids || [])])],
        requireImageReferences: true,
    }, options);
    if (!context?.templates.length || !context.templates.some(template => template.sourceUrl)) {
        throw new Error('REFERENCE_LIBRARY_UNAVAILABLE');
    }
    return context;
}

export function compileCloudCandidateRequest(input, referenceContext) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_GENERATION_REQUEST');
    if (input.provider !== 'cloudflare' || ![CLOUDFLARE_MODEL, '@cf/black-forest-labs/flux-1-schnell'].includes(input.model)) throw new Error('GENERATION_PROVIDER_NOT_ALLOWED');
    if (input.candidate_count !== 1 || input.billing_mode !== 'free-credit-first') throw new Error('GENERATION_BILLING_MODE_NOT_ALLOWED');
    if (input.reference_image_path || input.reference_image_url || input.reference_asset_ids?.length) throw new Error('CLOUD_REFERENCE_IMAGE_NOT_CONFIGURED');

    const brief = typeof input.brief === 'string' ? input.brief.trim() : '';
    const contract = input.shot_contract;
    if (!brief || brief.length > 4000 || !contract || typeof contract !== 'object' || Array.isArray(contract)) {
        throw new Error('INVALID_GENERATION_REQUEST');
    }
    const shotLanguage = clean(contract.shot_language, 160);
    const generatorPrompt = clean(contract.generator_prompt, 900);
    if (!shotLanguage || generatorPrompt.length < 10) throw new Error('SHOT_CONTRACT_REQUIRED');
    const mustShow = list(contract.master_must_show || contract.must_show);
    const rejectIf = list(contract.master_reject_if || contract.reject_if);
    const context = [clean(input.scene_brief, 200), clean(input.style_direction, 100), clean(brief, 200)].filter(Boolean);
    const selectedPose = referenceContext?.templates.find(template => template.kind === 'pose' && contract.referenceIds?.includes(template.id))
        || referenceContext?.templates.find(template => template.kind === 'pose');
    const shotTemplates = referenceContext?.templates.filter(template => template.kind !== 'pose' || template.id === selectedPose?.id);
    const templateBrief = shotTemplates?.map(template =>
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
        referenceContext ? `Processed template guidance: ${clean(referenceContext.guidance?.suggestions.filter(item => item.kind !== 'pose' || item.sourceItemId === selectedPose?.id).map(item => item.direction).join(' '), 160)}` : '',
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

export async function generateCloudCandidate(input, { ai, referenceContext, fetchImpl = fetch } = {}) {
    if (!ai || typeof ai.run !== 'function') throw new Error('IMAGE_PROVIDER_NOT_CONFIGURED');
    const compiled = compileCloudCandidateRequest(input, referenceContext);
    const references = ['pose', 'costume', 'portrait'].map(kind => referenceContext?.templates.find(template => template.kind === kind));
    if (references.some(reference => !reference?.referenceImageUrl)) throw new Error('REFERENCE_IMAGES_REQUIRED');
    const images = await Promise.all(references.map(reference => fetchReferenceImage(reference.referenceImageUrl, fetchImpl)));
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
        const form = new FormData();
        const outfitDetails = (references[1].tags || []).filter(tag => /^[a-z][a-z -]+$/i.test(tag)).join(', ');
        const poseTitle = clean(references[0].englishTitle, 120);
        const poseDetail = /\bhand on (?:hip|waist)\b/i.test(poseTitle) ? 'Exactly one hand rests on the hip; the opposite arm hangs down by the side.' : '';
        form.append('prompt', `Create a single photograph of exactly ONE person, using the framing specified in the shot contract. The face close-up reference determines the person's face, apparent age and hair. The headless outfit reference determines the COMPLETE outfit, every clothing layer, hosiery, footwear and accessories: ${outfitDetails}. The black-and-white artist drawing determines the body silhouette and limb positions, independently from the outfit's pose. Required pose: ${poseTitle}. ${poseDetail} ${prompt}`);
        form.append('width', String(compiled.width));
        form.append('height', String(compiled.height));
        images.forEach((image, index) => form.append(`input_image_${index}`, image, `reference-${index}`));
        const serialized = new Response(form);
        result = await ai.run(CLOUDFLARE_MODEL, { multipart: { body: serialized.body, contentType: serialized.headers.get('content-type') } });
    } catch (error) {
        console.error('reference_image_generation_failed', String(error?.message || error).slice(0, 400));
        throw new Error('IMAGE_PROVIDER_GENERATION_FAILED');
    }
    if (typeof result?.image !== 'string' || result.image.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) {
        throw new Error('IMAGE_PROVIDER_INVALID_RESPONSE');
    }
    let binary;
    try { binary = atob(result.image); } catch { throw new Error('IMAGE_PROVIDER_INVALID_RESPONSE'); }
    if (!binary.length || binary.length > MAX_IMAGE_BYTES) throw new Error('IMAGE_PROVIDER_IMAGE_SIZE_INVALID');
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const mime = bytes[0] === 137 ? 'image/png' : bytes[0] === 82 ? 'image/webp' : 'image/jpeg';
    if (!hasValidImageSignature(bytes, mime)) throw new Error('IMAGE_PROVIDER_INVALID_IMAGE_TYPE');
    return { ...compiled, bytes, mime, referenceImages: references.map((reference, index) => ({
        kind: reference.kind, sourceItemId: reference.id, imageIndex: index,
        sourceUrl: reference.sourceUrl, referenceImageUrl: reference.referenceImageUrl,
    })) };
}

async function fetchReferenceImage(rawUrl, fetchImpl) {
    const url = new URL(rawUrl);
    if (url.origin !== 'https://hruiccc.github.io' || !/^\/RuiC-PoseAtlas\/(?:thumbs\/[A-Za-z0-9_-]+\.jpg|(?:costume|portrait)\/thumbs\/[A-Za-z0-9_-]+\.webp)$/.test(url.pathname) || url.search || url.hash) throw new Error('UNTRUSTED_REFERENCE_IMAGE');
    const response = await fetchImpl(url.href, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (!response.ok || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get('content-type') || '')) throw new Error('REFERENCE_IMAGE_UNAVAILABLE');
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 3 * 1024 * 1024) { await reader.cancel(); throw new Error('REFERENCE_IMAGE_TOO_LARGE'); }
        chunks.push(value);
    }
    if (!size) throw new Error('REFERENCE_IMAGE_UNAVAILABLE');
    return new Blob(chunks, { type: response.headers.get('content-type') });
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

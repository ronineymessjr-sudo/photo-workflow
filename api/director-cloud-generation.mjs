import { prepareReferenceContext } from './ai-studio/reference-brief.mjs';
import { loadStudioRegistry } from './ai-studio/registry.mjs';

const CLOUDFLARE_MODEL = '@cf/black-forest-labs/flux-2-klein-9b';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PROMPT_CHARS = 2048;

export async function prepareCloudCandidateReferences(input, options = {}) {
    compileCloudCandidateRequest(input);
    for (const ids of [input.reference_ids, input.shot_contract?.referenceIds]) {
        if (ids !== undefined && (!Array.isArray(ids) || ids.length > 6 || ids.some(id => typeof id !== 'string'))) throw new Error('INVALID_REFERENCE_SELECTION');
    }
    const { registry, library } = await loadStudioRegistry(options);
    const requestedIds = [...new Set([...(input.shot_contract?.referenceIds || []), ...(input.reference_ids || [])])];
    const selectedPoseIds = new Set((input.shot_contract?.referenceIds || []).filter(id => registry.find(id)?.kind === 'pose'));
    if (!selectedPoseIds.size) {
        const fallbackPose = requestedIds.find(id => registry.find(id)?.kind === 'pose');
        if (fallbackPose) selectedPoseIds.add(fallbackPose);
    }
    const referenceIds = requestedIds.filter(id => {
        const template = registry.find(id);
        return !template || template.kind !== 'pose' || selectedPoseIds.has(id);
    });
    const context = await prepareReferenceContext({
        ...input.reference_brief,
        scene: [input.reference_brief?.scene, input.scene_brief, input.brief].filter(Boolean).join('\n'),
        modelDesc: input.reference_brief?.modelDesc || input.brief,
        style: input.reference_brief?.style || input.style_direction,
        useReferenceLibrary: true,
        referenceIds,
        requireImageReferences: true,
    }, { ...options, registry, library });
    if (selectedPoseIds.size) {
        context.templates = context.templates.filter(template => template.kind !== 'pose' || selectedPoseIds.has(template.id));
        context.guidance.suggestions = context.guidance.suggestions.filter(item => item.kind !== 'pose' || selectedPoseIds.has(item.sourceItemId));
    }
    if (!context?.templates.length || !context.templates.some(template => template.sourceUrl)) {
        throw new Error('REFERENCE_LIBRARY_UNAVAILABLE');
    }
    return context;
}

export function compileCloudCandidateRequest(input, referenceContext) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_GENERATION_REQUEST');
    if (input.provider !== 'cloudflare' || ![CLOUDFLARE_MODEL, '@cf/black-forest-labs/flux-2-klein-4b', '@cf/black-forest-labs/flux-1-schnell'].includes(input.model)) throw new Error('GENERATION_PROVIDER_NOT_ALLOWED');
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
    const templateBrief = shotTemplates?.map(template => template.kind === 'costume'
        ? `${template.id}: secondary material and color reference only; the written wardrobe contract controls all requested garments and footwear.`
        : `${template.id}: ${template.title}. ${template.description || ''}. ${(template.tags || []).join(', ')}`
    ).join('\n');
    const wardrobeContract = clean(contract.wardrobe_styling, 420) || 'Preserve the user specified garments exactly.';
    const prompt = [
        'Create one photorealistic editorial photography candidate. Follow the selected shot contract exactly.',
        `Shot language: ${shotLanguage}.`,
        `Camera and composition: ${generatorPrompt}.`,
        `Wardrobe contract: ${wardrobeContract}. This text controls exact garments, colors, skirt length, layers and shoes.`,
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
    // The pose reference must be the one the operator actually selected for THIS
    // shot. Taking "the first pose in the list" here made the image disagree with
    // the prose, because compileCloudCandidateRequest picks the pose by
    // referenceIds while this picked by position.
    const selectedPoseId = (input.shot_contract?.referenceIds || input.reference_ids || []);
    const selectedPose = referenceContext?.templates.find(template => template.kind === 'pose' && selectedPoseId.includes(template.id))
        || referenceContext?.templates.find(template => template.kind === 'pose');
    const shotSize = input.shot_contract.shot_size || '';
    const upperBodyCrop = /^(?:中景|近景|特写|局部特写|MS|MCU|CU|ECU)$/.test(shotSize);
    const waistUpCrop = /^(?:中景|MS)$/.test(shotSize);
    const sourceShotPrompt = clean(input.shot_contract.generator_prompt, 1200);
    const shotPrompt = waistUpCrop
        ? sourceShotPrompt.replace(/\bcrop below the waist\b/gi, 'Crop at the natural waistline')
        : sourceShotPrompt;
    const clothingDetail = /服装细节|衣料细节/.test(input.shot_contract.shot_language || '');
    const poseDirection = clothingDetail
        ? input.shot_contract.model_pose
        : upperBodyCrop
        ? input.shot_contract.model_pose
        : referenceContext?.guidance?.suggestions.find(item => item.kind === 'pose' && item.sourceItemId === selectedPose?.id)?.direction
        || selectedPose?.description || '';
    const references = [
        referenceContext?.templates.find(template => template.kind === 'portrait'),
        ...(!waistUpCrop ? [referenceContext?.templates.find(template => template.kind === 'costume')] : []),
    ];
    if (references.some(reference => !reference?.referenceImageUrl)) throw new Error('REFERENCE_IMAGES_REQUIRED');
    const images = await Promise.all(references.map(reference => fetchReferenceImage(reference.referenceImageUrl, fetchImpl)));
    let prompt = [
        `Shot contract: ${shotPrompt}`,
        waistUpCrop ? 'Required waist-up crop: frame from the top of the head through the natural waistline; the lower edge cuts at the waistline. Exclude the hips and everything below, including skirt below the waist, legs and shoes.' : '',
        selectedPose && !clothingDetail ? `Selected pose library entry: ${clean(selectedPose.title, 120)}. Pose direction: ${clean(poseDirection, 260)}` : '',
        `Written wardrobe contract: ${clean(input.shot_contract.wardrobe_styling || input.reference_brief?.modelDesc, 420) || 'Preserve the user specified garments exactly.'}`,
        `Scene: ${clean(input.scene_brief || input.reference_brief?.scene, 250)}`,
        `Style: ${clean(input.style_direction || input.reference_brief?.style, 150)}`,
        `User requirements: ${clean(input.brief, 250)}`,
    ].join('\n');
    let generationPrompt;
    let result;
    try {
        if (referenceContext && /[\u3400-\u9fff]/u.test(prompt)) {
            const cropTranslationRule = waistUpCrop
                ? 'For this MS/中景 shot, frame from the top of the head through the natural waistline, with the lower edge at the waistline. Exclude hips and everything below, including the skirt below the waist, legs and shoes. The wardrobe contract applies only to clothing visible inside this crop; never widen or lower the framing to display the complete outfit.'
                : 'Preserve cropping instructions exactly; omit body parts outside the requested crop.';
            const wardrobeTranslationRule = waistUpCrop
                ? 'The written wardrobe contract identifies the outfit, but it must not change the requested waist-up crop or pull the camera back to show the skirt, legs or shoes.'
                : 'The written wardrobe contract controls garment types, colors, layers, skirt length and shoes.';
            const translated = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast', {
                messages: [
                    { role: 'system', content: `Translate this photography contract into concise English camera, pose, wardrobe, lighting and environment instructions. Preserve exact subject count, location, action and framing. ${wardrobeTranslationRule} The outfit reference image is secondary material and palette guidance only; omit any unrequested accessories or props visible in it. The face reference controls identity, apparent age and hair. Do not change standing to sitting. ${cropTranslationRule} Return only the English prompt under 1400 characters, no commentary or text to render.` },
                    { role: 'user', content: prompt },
                ], max_tokens: 600, temperature: 0,
            });
            if (typeof translated?.response !== 'string' || translated.response.trim().length < 20) throw new Error('PROMPT_TRANSLATION_FAILED');
            prompt = translated.response.trim().slice(0, MAX_PROMPT_CHARS);
        }
        const form = new FormData();
        const poseTitle = clothingDetail ? 'Garment-detail crop; no pose reference' : upperBodyCrop ? 'Upper-body pose adapted from the selected PoseAtlas reference' : clean(selectedPose?.englishTitle || selectedPose?.title, 120);
        const poseDetail = clothingDetail
            ? 'Keep the named garment unobstructed and in sharp focus; do not add hands, face, or a full-body pose.'
            : upperBodyCrop
            ? 'Follow only the visible head, shoulder and arm action from the shot contract. Do not force unseen hands, hips, legs or feet into the crop.'
            : /\b(?:both|two)\s+hands?\b/i.test(poseTitle)
            ? 'Both hands rest lightly at the waist or hips, elbows relaxed outward; do not join the hands in front of the abdomen.'
            : /\bhand on (?:hip|waist)\b/i.test(poseTitle)
                ? 'Exactly one hand rests on the hip; the opposite arm hangs relaxed by the side.' : '';
        const framing = clothingDetail
            ? 'Tight close-up of the user specified garment fabric and texture only; preserve its exact color, exclude the face and full-body pose.'
            : waistUpCrop
            ? 'Waist-up portrait from the top of the head through the natural waistline. The lower edge cuts at the waistline; exclude hips and everything below, including skirt below the waist, legs and shoes.'
            : [
            [/环境全景|环境远景|^(?:E?WS)$/i, 'Environmental long shot. Person occupies at most 40 percent of the image height. Show the surrounding location clearly. Keep the camera far enough away.'],
            [/中全景|^MFS$/i, 'Knee-up portrait. Crop above the knees, showing head, torso and hands.'],
            [/全身|^FS$/i, 'Head-to-toe portrait. Show both shoes and ground beneath them, with margins above the head and below the feet.'],
            [/近景|^MCU$/i, 'Head-and-shoulders portrait. Crop below the shoulders.'],
            [/特写|^E?CU$/i, 'Tight close-up of the face or the detail specified by the shot contract.'],
            [/中景|^MS$/i, 'Waist-up portrait from the top of the head through the natural waistline. The lower edge cuts at the waistline; exclude hips, legs and shoes.'],
        ].find(([pattern]) => pattern.test(input.shot_contract.shot_size || ''))?.[1] || '';
        const wardrobeContract = clean(input.shot_contract.wardrobe_styling || input.reference_brief?.modelDesc, 420) || 'Preserve the user specified garments exactly.';
        const wardrobeInstruction = waistUpCrop
            ? `The written wardrobe contract identifies the outfit, but only clothing visible inside this waist-up crop should appear; do not widen or lower framing to show the full skirt, legs or shoes: ${wardrobeContract}.`
            : `The written wardrobe contract is authoritative for exact garments, colors, layers, skirt length and shoes: ${wardrobeContract}.`;
        const referenceInstruction = waistUpCrop
            ? 'Only the face identity reference is supplied; the full-body costume reference is omitted so it cannot set the framing. Use the written wardrobe contract for clothing visible in this crop.'
            : 'Reference image 2 is secondary guidance for material and palette only.';
        generationPrompt = `Create one photorealistic DSLR photograph of ONE person, with realistic skin texture and a fully rendered real location. ${waistUpCrop ? `Required camera framing: ${framing} ` : ''}Reference image 1, the face photograph, controls facial identity, apparent age, hair and photographic realism. ${wardrobeInstruction} ${referenceInstruction} Do not copy unrequested bags, jewelry, hats or other accessories/props from the outfit reference. Do not replace or add garments. Follow the selected PoseAtlas action described in the shot contract as text; do not copy a drawing style. Required pose: ${poseTitle}. ${poseDetail} ${prompt} Required camera framing: ${framing || 'Follow the shot contract.'} Render the requested scene as a real photographic environment with natural light and material detail.`;
        form.append('prompt', generationPrompt);
        form.append('width', String(compiled.width));
        form.append('height', String(compiled.height));
        images.forEach((image, index) => form.append(`input_image_${index}`, image, `reference-${index}`));
        const serialized = new Response(form);
        result = await ai.run(CLOUDFLARE_MODEL, { multipart: { body: serialized.body, contentType: serialized.headers.get('content-type') } });
    } catch (error) {
        const message = String(error?.message || error);
        console.error('reference_image_generation_failed', message.slice(0, 400));
        if (/4006\s*:?\s*you have used up your daily free allocation/i.test(message)) {
            throw new Error('IMAGE_PROVIDER_FREE_QUOTA_EXHAUSTED');
        }
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
    return { ...compiled, prompt: generationPrompt, bytes, mime, referenceImages: references.map((reference, index) => ({
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

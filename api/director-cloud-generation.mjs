import { prepareReferenceContext } from './ai-studio/reference-brief.mjs';
import { poseMatchesShotAction } from './ai-studio/pose-suitability.mjs';
import { loadStudioRegistry } from './ai-studio/registry.mjs';
import { BUNDLED_PEXELS_WAIST_POSE } from './continuity-studio-bridge.mjs';
import { requiresWaistKnotInFrame } from './continuity-prompt-rules.mjs';

const CLOUDFLARE_MODEL = '@cf/black-forest-labs/flux-2-klein-9b';
const PEXELS_POSE_SOURCE = 'https://www.pexels.com/photo/close-up-photo-of-a-beautiful-woman-standing-near-street-13631460/';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PROMPT_CHARS = 2048;

function poseAngleFor(contract = {}) {
    const allowed = ['front', 'diagonal', 'side', 'high', 'low'];
    if (allowed.includes(contract.pose_angle)) return contract.pose_angle;
    const text = `${contract.generator_prompt || ''} ${contract.model_pose || contract.pose || ''}`;
    if (/三分之四|斜侧|四十五度|three[- ]quarter|45\s*(?:°|degree)/i.test(text)) return 'diagonal';
    if (/侧面|侧身|profile|side view/i.test(text)) return 'side';
    if (/俯视|高机位|high[- ]angle/i.test(text)) return 'high';
    if (/仰视|低机位|low[- ]angle/i.test(text)) return 'low';
    return 'front';
}

export async function prepareCloudCandidateReferences(input, options = {}) {
    compileCloudCandidateRequest(input);
    for (const ids of [input.reference_ids, input.shot_contract?.referenceIds]) {
        if (ids !== undefined && (!Array.isArray(ids) || ids.length > 6 || ids.some(id => typeof id !== 'string'))) throw new Error('INVALID_REFERENCE_SELECTION');
    }
    const { registry, library } = await loadStudioRegistry(options);
    const requestedIds = [...new Set([...(input.shot_contract?.referenceIds || []), ...(input.reference_ids || [])])];
    const clothingDetail = /服装细节|衣料细节/.test(input.shot_contract?.shot_language || '');
    const selectedPoseIds = new Set(clothingDetail ? [] : (input.shot_contract?.referenceIds || []).filter(id => {
        const template = registry.find(id);
        return template?.kind === 'pose' && poseMatchesShotAction(template, input.shot_contract.model_pose);
    }));
    const referenceIds = requestedIds.filter(id => {
        const template = registry.find(id);
        return !template || template.kind !== 'pose' || selectedPoseIds.has(id);
    });
    const context = await prepareReferenceContext({
        ...input.reference_brief,
        scene: input.scene_brief || input.reference_brief?.scene || '',
        modelDesc: input.reference_brief?.modelDesc || input.brief,
        style: input.reference_brief?.style || input.style_direction,
        useReferenceLibrary: true,
        referenceIds,
        requireImageReferences: true,
    }, { ...options, registry, library });
    context.templates = context.templates.filter(template => template.kind !== 'pose' || selectedPoseIds.has(template.id));
    context.guidance.suggestions = context.guidance.suggestions.filter(item => item.kind !== 'pose' || selectedPoseIds.has(item.sourceItemId));
    if (!context?.templates.length || !context.templates.some(template => template.sourceUrl)) {
        throw new Error('REFERENCE_LIBRARY_UNAVAILABLE');
    }
    return context;
}

export function compileCloudCandidateRequest(input, referenceContext) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_GENERATION_REQUEST');
    const cloudflareModel = input.provider === 'cloudflare'
        && [CLOUDFLARE_MODEL, '@cf/black-forest-labs/flux-2-klein-4b', '@cf/black-forest-labs/flux-1-schnell', '@cf/black-forest-labs/flux-2-dev'].includes(input.model);
    const modelScopeModel = input.provider === 'modelscope' && ['Qwen/Qwen-Image-Edit-2511', 'Qwen/Qwen-Image-2.1', 'Qwen/Qwen-Image-2.1-Turbo', 'Qwen/Qwen-Image', 'black-forest-labs/FLUX.2-klein-base-4B', 'flux-community/FLUX.2-klein-4B'].includes(input.model);
    if (!cloudflareModel && !modelScopeModel) throw new Error('GENERATION_PROVIDER_NOT_ALLOWED');
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
    if (contract.pose_reference_mode === 'upper-body-crop'
        && (!cloudflareModel || !/^(?:中景|MS)$/.test(contract.shot_size || ''))) {
        throw new Error('POSE_REFERENCE_CROP_INVALID');
    }
    const mustShow = list(contract.master_must_show || contract.must_show);
    const rejectIf = list(contract.master_reject_if || contract.reject_if);
    const context = [clean(input.scene_brief, 250), clean(input.style_direction, 100)].filter(Boolean);
    const clothingDetail = /服装细节|衣料细节/.test(shotLanguage);
    const selectedPose = !clothingDetail
        ? referenceContext?.templates.find(template => template.kind === 'pose' && contract.referenceIds?.includes(template.id))
        : undefined;
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
    }[input.aspect_ratio] || [768, 1024];
    const aspectDescription = {
        landscape: 'landscape 4:3 composition', 'landscape-wide': 'wide landscape 16:9 composition',
        square: 'square composition', portrait: 'portrait 3:4 composition', 'portrait-tall': 'vertical portrait 9:16 composition',
    }[input.aspect_ratio] || 'portrait 3:4 composition';
    const suffix = `\nFrame the scene as a ${aspectDescription}. Avoid: ${avoid}.`;
    const compiledPrompt = prompt.slice(0, MAX_PROMPT_CHARS - suffix.length) + suffix;
    return {
        prompt: compiledPrompt.slice(0, MAX_PROMPT_CHARS), width: dimensions[0], height: dimensions[1],
        steps: 24, seed: Number.isSafeInteger(input.seed) ? input.seed : Math.floor(Math.random() * 2147483647),
        shotLanguage, model: input.model,
    };
}

export async function generateCloudCandidate(input, { ai, imageBinding, referenceContext, fetchImpl = fetch } = {}) {
    if (!ai || typeof ai.run !== 'function') throw new Error('IMAGE_PROVIDER_NOT_CONFIGURED');
    const compiled = compileCloudCandidateRequest(input, referenceContext);
    const effectiveSteps = compiled.model === '@cf/black-forest-labs/flux-2-klein-9b'
        || compiled.model === '@cf/black-forest-labs/flux-2-klein-4b'
        || compiled.model === '@cf/black-forest-labs/flux-1-schnell' ? 4 : compiled.steps;
    // The pose reference must be the one the operator actually selected for THIS
    // shot. Taking "the first pose in the list" here made the image disagree with
    // the prose, because compileCloudCandidateRequest picks the pose by
    // referenceIds while this picked by position.
    const clothingDetail = /服装细节|衣料细节/.test(input.shot_contract.shot_language || '');
    const selectedPose = !clothingDetail
        ? referenceContext?.templates.find(template => template.kind === 'pose'
            && input.shot_contract.referenceIds?.includes(template.id))
        : undefined;
    const shotSize = input.shot_contract.shot_size || '';
    const upperBodyCrop = /^(?:中景|近景|特写|局部特写|MS|MCU|CU|ECU)$/.test(shotSize);
    const waistUpCrop = /^(?:中景|MS)$/.test(shotSize);
    const sourceShotPrompt = input.shot_contract.generator_prompt;
    const shotPrompt = clean(waistUpCrop
        ? sourceShotPrompt
            .replace(/\bSubject and clothing:.*?(?=\b(?:User constraints|Style):|$)/gis, '')
            .replace(/\bcrop below the waist\b/gi, 'Crop at the natural waistline')
        : sourceShotPrompt, 1200);
    const sceneBrief = input.scene_brief || input.reference_brief?.scene;
    const scenePrompt = clean(waistUpCrop && typeof sceneBrief === 'string'
        ? sceneBrief.replace(/^SUBJECT AND CLOTHING:[\s\S]*?(?=^(?:LOCATION WEATHER AND TIME|PERSISTENT MOOD|VISUAL STYLE|USER CONSTRAINTS):|(?![\s\S]))/gim, '')
        : sceneBrief, 250);
    const poseDirection = clothingDetail
        ? input.shot_contract.model_pose
        : upperBodyCrop
        ? input.shot_contract.model_pose
        : referenceContext?.guidance?.suggestions.find(item => item.kind === 'pose' && item.sourceItemId === selectedPose?.id)?.direction
        || selectedPose?.description || '';
    const requestedReferenceIds = new Set([...(input.shot_contract.referenceIds || []), ...(input.reference_ids || [])]);
    const portraitReference = referenceContext?.templates.find(template => template.kind === 'portrait' && requestedReferenceIds.has(template.id));
    const costumeReference = referenceContext?.templates.find(template => template.kind === 'costume' && requestedReferenceIds.has(template.id));
    const poseAngle = poseAngleFor(input.shot_contract);
    const poseUpstreamId = String(selectedPose?.upstreamId || selectedPose?.sourceItemId || selectedPose?.id || '');
    const photographicPoseRequested = input.shot_contract.pose_reference_mode === 'photographic';
    const usePhotographicPose = photographicPoseRequested && waistUpCrop
        && /(?:^|[_-])p017$/i.test(poseUpstreamId) && ['diagonal', 'side'].includes(poseAngle);
    if (photographicPoseRequested && !usePhotographicPose) throw new Error('POSE_PHOTO_REFERENCE_UNAVAILABLE');
    const poseReference = !clothingDetail && selectedPose ? {
        ...selectedPose,
        referenceImageUrl: usePhotographicPose ? BUNDLED_PEXELS_WAIST_POSE
            : selectedPose.referenceImagesByAngle?.[poseAngle] || selectedPose.referenceImageUrl,
        ...(usePhotographicPose ? { sourceUrl: PEXELS_POSE_SOURCE } : {}),
    } : undefined;
    const cropPoseReference = input.shot_contract.pose_reference_mode === 'upper-body-crop';
    if (cropPoseReference && (!waistUpCrop || !poseReference)) {
        throw new Error('POSE_REFERENCE_CROP_INVALID');
    }
    if (cropPoseReference && !imageBinding?.input) {
        throw new Error('POSE_REFERENCE_CROP_UNAVAILABLE');
    }
    const references = (clothingDetail
        ? [costumeReference]
        : [portraitReference, ...(poseReference ? [poseReference] : []), ...(!upperBodyCrop ? [costumeReference] : [])])
        .filter(Boolean);
    if (requestedReferenceIds.size && !references.length) throw new Error('REFERENCE_IMAGES_REQUIRED');
    if (references.some(reference => !reference.referenceImageUrl)) throw new Error('REFERENCE_IMAGES_REQUIRED');
    const images = await Promise.all(references.map(async reference => {
        const image = await fetchReferenceImage(reference.referenceImageUrl, fetchImpl);
        if (reference !== poseReference || !cropPoseReference) return image;
        try {
            const response = (await imageBinding.input(image.stream())
                .transform({ trim: { left: '12p', top: '0p', width: '76p', height: '45p' } })
                .output({ format: 'image/png' })).response();
            if (!response.ok) throw new Error();
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.length > MAX_IMAGE_BYTES || !hasValidImageSignature(bytes, 'image/png')) throw new Error();
            return new Blob([bytes], { type: 'image/png' });
        } catch {
            throw new Error('POSE_REFERENCE_CROP_FAILED');
        }
    }));
    const imageIndex = new Map(references.map((reference, index) => [reference.kind, index]));
    const indexFor = kind => imageIndex.has(kind) ? `input_image_${imageIndex.get(kind)}` : '';
    const portraitImage = indexFor('portrait');
    const poseImage = indexFor('pose');
    const costumeImage = indexFor('costume');
    const poseImageInstruction = usePhotographicPose
        ? `${poseImage} is a licensed photographic pose reference. Transfer its body pose to ${portraitImage ? `the person in ${portraitImage}` : 'the subject specified by the shot contract'}: match the torso and shoulder geometry only where it agrees with the written shot contract. Follow the written shot contract for head turn and gaze, not the pose photograph. Do not copy the pictured person's identity, face, hair, clothing, accessories, lighting, color grade or background.`
        : `${poseImage} is the selected PoseAtlas action reference (${clean(selectedPose?.id, 80)}; ${clean(selectedPose?.englishTitle || selectedPose?.title, 120)}). Use only its torso and limb positions/body orientation as pose geometry; ignore its line art, white background, joint marks, mannequin appearance and nudity. The subject must be the clothed adult specified by the written wardrobe contract.`;
    const imageRoleInstruction = clothingDetail
        ? `${costumeImage} is the selected clothing-detail reference. It controls only the specified garment's material, color and texture.`
        : [
            portraitImage ? `${portraitImage} controls facial identity, apparent age and hair only.` : '',
            poseImage ? poseImageInstruction : '',
            costumeImage ? `${costumeImage} is secondary guidance for outfit material and palette only; do not copy unrequested accessories or props.` : '',
        ].filter(Boolean).join(' ');
    const wardrobeText = clean(input.shot_contract.wardrobe_styling || input.reference_brief?.modelDesc, 420);
    const shoulderCoverageRule = waistUpCrop && /宽袖|长袖|long[- ]sleeve|wide[- ]sleeve/i.test(wardrobeText)
        ? 'Keep the long or wide sleeves fully covering both shoulders; the neckline stays above the shoulder line. Do not let the top slip off either shoulder; add no earrings, necklace or other jewelry.'
        : '';
    const wardrobeContract = (waistUpCrop
        ? wardrobeText.split(/(?<=[，、,；;。])/)
            .filter(part => !/(裙|裤|靴|鞋|袜|下装|skirt|trousers|pants|boots|shoes|socks|lower[- ]body)/i.test(part))
            .join('')
            .replace(/[，、,；;。]+$/, '')
        : wardrobeText) || 'Preserve the user specified garments exactly.';
    const mustShow = list(input.shot_contract.master_must_show || input.shot_contract.must_show).join('; ');
    const rejectIf = list(input.shot_contract.master_reject_if || input.shot_contract.reject_if).join('; ');
    const waistKnotRequired = waistUpCrop && requiresWaistKnotInFrame(mustShow);
    const waistUpBoundary = waistKnotRequired
        ? 'Waist-up portrait from the top of the head through the complete natural-waist wrap knot. Measured from the top of the image, place the knot center at about 80–84% of image height and leave a clearly visible 8–12% blouse margin below it; neither knot nor tie ends may touch the bottom edge. Exclude hips, skirt, legs and shoes.'
        : 'Waist-up portrait from the top of the head through the natural waistline. The lower edge cuts at the waistline; exclude hips and everything below, including skirt below the waist, legs and shoes.';
    const waistUpCropInstruction = waistKnotRequired
        ? 'frame from the top of the head through the complete natural-waist wrap knot; place the knot center at about 80–84% of image height and preserve an 8–12% blouse margin below it. The knot and tie ends must not touch the lower edge. Exclude hips, skirt, legs and shoes.'
        : 'frame from the top of the head through the natural waistline; the lower edge cuts at the waistline. Exclude the hips and everything below, including skirt below the waist, legs and shoes.';
    let prompt = [
        `Shot contract: ${shotPrompt}`,
        waistUpCrop ? `Required waist-up crop: ${waistUpCropInstruction}` : '',
        shoulderCoverageRule,
        selectedPose && !clothingDetail ? `Selected pose library entry: ${clean(selectedPose.title, 120)}. Pose direction: ${clean(poseDirection, 260)}` : '',
        clothingDetail ? `Shot-specific wardrobe contract: ${wardrobeContract}` : `Written wardrobe contract: ${wardrobeContract}`,
        mustShow ? `The image must visibly include: ${mustShow}.` : '',
        rejectIf ? `Reject the image if it contains: ${rejectIf}.` : '',
        `Scene: ${scenePrompt}`,
        `Style: ${clean(input.style_direction || input.reference_brief?.style, 150)}`,
    ].join('\n');
    let generationPrompt;
    let result;
    try {
        if (referenceContext && /[\u3400-\u9fff]/u.test(prompt)) {
            const cropTranslationRule = waistUpCrop
                ? (waistKnotRequired
                    ? 'For this MS/中景 shot, frame from the top of the head through the complete natural-waist knot; place its center at about 80–84% of image height and preserve an 8–12% blouse margin beneath it. The knot and tie ends must not touch the lower edge. Exclude hips, skirt, legs and shoes. The wardrobe contract applies only to clothing visible inside this crop; never widen to display the complete outfit.'
                    : 'For this MS/中景 shot, frame from the top of the head through the natural waistline, with the lower edge at the waistline. Exclude hips and everything below, including the skirt below the waist, legs and shoes. The wardrobe contract applies only to clothing visible inside this crop; never widen or lower the framing to display the complete outfit.')
                : 'Preserve cropping instructions exactly; omit body parts outside the requested crop.';
            const wardrobeTranslationRule = clothingDetail
                ? 'The shot-specific wardrobe contract is authoritative and overrides any conflicting full-outfit wording in the global brief, scene context or reference description. Show only the requested garment detail, worn naturally on the model.'
                : waistUpCrop
                ? `Translate only the visible upper garment from the written wardrobe contract. Do not list any off-frame garments as wardrobe to render. The written wardrobe contract identifies the outfit, but it must not change the requested waist-up crop; ${waistKnotRequired ? 'place the complete specified waist knot at about 80–84% of image height and preserve an 8–12% blouse margin beneath it' : 'do not pull the camera back to show the skirt, legs or shoes'}.`
                : 'The written wardrobe contract controls garment types, colors, layers, skirt length and shoes.';
            const imageTranslationRule = clothingDetail
                ? (costumeImage ? `${costumeImage} is the selected clothing-detail reference. Show the named garment worn on the model, with a visible shoulder or upper-torso segment for context; crop out the face and rest of the outfit, and do not show a floating garment.` : 'No clothing reference image is selected; follow only the written garment contract.')
                : [portraitImage ? `${portraitImage} controls only the selected face reference.` : '', poseImage ? (usePhotographicPose
                    ? poseImageInstruction
                    : `${poseImage} controls pose geometry only; ignore its line-art/mannequin rendering.`) : ''].filter(Boolean).join(' ');
            const outfitTranslationRule = clothingDetail
                ? `Use ${costumeImage} only for garment appearance, not for body pose or framing.`
                : costumeImage
                    ? `Use ${costumeImage} as secondary material and palette guidance only; omit any unrequested accessories or props visible in it.`
                    : 'No full-body outfit reference image is supplied; use the written wardrobe contract.';
            const translated = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast', {
                messages: [
                { role: 'system', content: `Translate this photography contract into concise English camera, pose, wardrobe, lighting and environment instructions. Preserve exact subject count, location, action and framing. Preserve every must-show and reject-if condition; do not omit or weaken them. ${wardrobeTranslationRule} ${outfitTranslationRule} ${imageTranslationRule} Do not change standing to sitting. ${cropTranslationRule} Return only the English prompt under 1400 characters, no commentary or text to render.` },
                    { role: 'user', content: prompt },
                ], max_tokens: 600, temperature: 0,
            });
            if (typeof translated?.response !== 'string' || translated.response.trim().length < 20) throw new Error('PROMPT_TRANSLATION_FAILED');
            prompt = translated.response.trim().slice(0, MAX_PROMPT_CHARS);
        }
        const poseTitle = clothingDetail ? 'Garment-detail crop; no pose reference'
            : upperBodyCrop ? (usePhotographicPose ? 'Upper-body pose adapted from a licensed photographic reference' : 'Upper-body pose adapted from the selected PoseAtlas reference')
                : clean(selectedPose?.englishTitle || selectedPose?.title, 120) || clean(input.shot_contract.model_pose, 260);
        const poseDetail = clothingDetail
            ? 'Show the specified garment worn on the model with a visible shoulder or upper-torso segment; keep the named fabric detail dominant, crop out the face and rest of the outfit, and do not show a floating garment.'
            : upperBodyCrop
            ? 'Follow only the visible head, shoulder and arm action from the shot contract. Do not force unseen hands, hips, legs or feet into the crop.'
            : /\b(?:both|two)\s+hands?\b/i.test(poseTitle)
            ? 'Both hands rest lightly at the waist or hips, elbows relaxed outward; do not join the hands in front of the abdomen.'
            : /\bhand on (?:hip|waist)\b/i.test(poseTitle)
                ? 'Exactly one hand rests on the hip; the opposite arm hangs relaxed by the side.' : '';
        const framing = clothingDetail
            ? 'Tight close-up of the specified garment worn on the model. Include a visible shoulder or upper-torso segment as natural context; keep its fabric detail dominant, crop out the face and rest of the outfit, and do not show a floating garment.'
            : waistUpCrop
            ? waistUpBoundary
            : [
            [/环境全景|环境远景|^(?:E?WS)$/i, 'Environmental long shot. Person occupies at most 40 percent of the image height. Show the surrounding location clearly. Keep the camera far enough away.'],
            [/中全景|^MFS$/i, 'Knee-up portrait. Crop above the knees, showing head, torso and hands.'],
            [/全身|^FS$/i, 'Head-to-toe portrait. Fit the complete figure within 80% of the image height, with clear headroom above and visible ground margin below both shoe soles. Do not crop the shoes or let them touch the frame edge.'],
            [/近景|^MCU$/i, 'Head-and-shoulders portrait. Crop below the shoulders.'],
            [/特写|^E?CU$/i, 'Tight close-up of the face or the detail specified by the shot contract.'],
            [/中景|^MS$/i, 'Waist-up portrait from the top of the head through the natural waistline. The lower edge cuts at the waistline; exclude hips, legs and shoes.'],
        ].find(([pattern]) => pattern.test(input.shot_contract.shot_size || ''))?.[1] || '';
        const wardrobeInstruction = clothingDetail
            ? `The shot-specific wardrobe contract is authoritative and overrides any global full-outfit text. Show only the requested garment detail worn on the model, with a visible shoulder or upper-torso segment; keep the face and rest of the outfit outside the crop: ${wardrobeContract}.`
            : waistUpCrop
            ? `${shoulderCoverageRule ? `${shoulderCoverageRule} ` : ''}The written wardrobe contract identifies the outfit, but only clothing visible inside this waist-up crop should appear; do not widen or lower framing to show the full skirt, legs or shoes: ${wardrobeContract}.`
            : `The written wardrobe contract is authoritative for exact garments, colors, layers, skirt length and shoes: ${wardrobeContract}.`;
        const subjectInstruction = clothingDetail
            ? 'Create a photorealistic close-up of the named garment worn on the model, with a visible shoulder or upper-torso segment for context.'
            : 'Create one photorealistic DSLR photograph of ONE person, with realistic skin texture and a fully rendered real location.';
        const referenceInstruction = clothingDetail
            ? imageRoleInstruction
            : [imageRoleInstruction, waistUpCrop ? 'No full-body costume image is supplied, so it cannot pull this waist-up frame wider; use the written wardrobe contract for visible clothing.' : ''].filter(Boolean).join(' ');
        const poseInstruction = clothingDetail
            ? poseDetail
            : `Do not copy unrequested bags, jewelry, hats or other accessories/props from the outfit reference. Do not replace or add garments. Follow the selected ${usePhotographicPose ? 'pose action' : 'PoseAtlas action'} described in the shot contract as text; the written shot contract and user restrictions override any pose-image conflict. ${poseImage ? (usePhotographicPose
                ? 'Use the selected photograph only for torso/limb geometry; do not copy its face, identity, hair, clothing, accessories, lighting, color grade or background.'
                : 'Use the selected pose image only for torso/limb geometry; do not render its line drawing, white background, joint marks, mannequin, or nudity.') : ''} Required pose: ${poseTitle}. ${poseDetail}`;
        generationPrompt = `${subjectInstruction} ${wardrobeInstruction} ${referenceInstruction} ${poseInstruction} ${prompt} Required camera framing: ${framing || 'Follow the shot contract.'} ${clothingDetail ? '' : 'Render the requested scene as a real photographic environment with natural light and material detail.'}`;
        for (let attempt = 0; attempt < 2; attempt++) {
            const form = new FormData();
            form.append('prompt', generationPrompt);
            form.append('width', String(compiled.width));
            form.append('height', String(compiled.height));
            if (compiled.model === '@cf/black-forest-labs/flux-2-dev') form.append('steps', String(compiled.steps));
            form.append('seed', String(compiled.seed));
            const guidanceScale = Number(input.shot_contract.guidance_scale);
            if (Number.isFinite(guidanceScale) && guidanceScale >= 1 && guidanceScale <= 10) form.append('guidance', String(guidanceScale));
            images.forEach((image, index) => form.append(`input_image_${index}`, image, `reference-${index}`));
            try {
                const serialized = new Response(form);
                result = await ai.run(compiled.model, { multipart: { body: serialized.body, contentType: serialized.headers.get('content-type') } });
                break;
            } catch (error) {
                const message = String(error?.message || error);
                console.error('director_flux_upstream_failure', JSON.stringify({ attempt: attempt + 1, code: error?.code || '', message: message.slice(0, 300) }));
                if (/4006\s*:?\s*you have used up your daily free allocation/i.test(message)) throw new Error('IMAGE_PROVIDER_FREE_QUOTA_EXHAUSTED');
                if (attempt === 0 && /\b3043\b|\b502\b|\b503\b|internal server error|temporarily unavailable/i.test(message)) {
                    await new Promise(resolve => setTimeout(resolve, 150));
                    continue;
                }
                if (/4006\s*:?\s*you have used up your daily free allocation/i.test(message)) throw new Error('IMAGE_PROVIDER_FREE_QUOTA_EXHAUSTED');
                throw new Error('IMAGE_PROVIDER_GENERATION_FAILED');
            }
        }
    } catch (error) {
        const message = String(error?.message || error);
        console.error('reference_image_generation_failed', message.slice(0, 400));
        if (message === 'IMAGE_PROVIDER_FREE_QUOTA_EXHAUSTED' || /4006\s*:?\s*you have used up your daily free allocation/i.test(message)) {
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
    return { ...compiled, steps: effectiveSteps, prompt: generationPrompt, bytes, mime,
        referenceWarnings: !references.some(reference => reference.kind === 'portrait')
            ? ['未选择人物人脸参考图；本镜需要人工检查跨镜身份一致性。'] : [],
        referenceImages: references.map((reference, index) => ({
        kind: reference.kind, sourceItemId: reference.id, imageIndex: index,
        sourceUrl: reference.sourceUrl, referenceImageUrl: reference.referenceImageUrl,
        ...(reference === poseReference && cropPoseReference ? { transform: 'upper-body-crop' } : {}),
    })) };
}

export async function fetchReferenceImage(rawUrl, fetchImpl = fetch) {
    const url = new URL(rawUrl);
    const isPoseAtlasImage = url.origin === 'https://hruiccc.github.io'
        && /^\/RuiC-PoseAtlas\/(?:thumbs\/[A-Za-z0-9_-]+\.jpg|(?:costume|portrait)\/thumbs\/[A-Za-z0-9_-]+\.webp)$/.test(url.pathname)
        && !url.search && !url.hash;
    const isBundledPexelsPose = url.href === BUNDLED_PEXELS_WAIST_POSE;
    if (!isPoseAtlasImage && !isBundledPexelsPose) throw new Error('UNTRUSTED_REFERENCE_IMAGE');
    const options = { redirect: 'manual', signal: AbortSignal.timeout(15000) };
    if (url.pathname.startsWith('/RuiC-PoseAtlas/costume/')) {
        options.cf = { image: { width: 511, height: 511, fit: 'scale-down', format: 'jpeg' } };
    }
    if (isBundledPexelsPose) options.cf = { image: { width: 511, height: 511, fit: 'cover', format: 'jpeg' } };
    const response = await fetchImpl(url.href, options);
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

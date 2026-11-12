// Bridge: continuity contract -> Cloudflare Workers AI (FLUX.2 Klein).
//
// Why this file exists
// --------------------
// Two halves grew independently:
//   continuity/*   owns the locked bible, the reference gate, seeds and QC
//   director-cloud-* owns a working Cloudflare brush (multipart, three images,
//                  four steps, free-credit-first)
// They described references in different vocabularies, so nothing could flow
// between them. This adapter translates one into the other instead of asking
// either side to change.
//
// Role mapping (and the honest gap)
// ---------------------------------
//   identity -> reference image 1 : face, age, hair (from the contract asset)
//   style    -> reference image 2 : garment, layers, colour, material
//   scene    -> NO reference image on this provider; carried by prompt text only
//   pose     -> geometry only; when a shot has no pose asset it is described
//
// The scene gap is reported in `gaps`, never hidden. A shoot whose location has
// to be pixel-identical needs a provider with a scene slot, or a ControlNet.

import { assertReadyToGenerate } from './continuity.mjs';
import { compileCloudCandidateRequest } from './director-cloud-generation.mjs';
import { wardrobeCoverageRules } from './continuity-prompt-rules.mjs';

export const CLOUDFLARE_MODEL = '@cf/black-forest-labs/flux-2-klein-9b';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Which contract role lands in which reference-image slot of the model.
export const ROLE_SLOTS = [
    { slot: 0, role: 'identity', label: 'Reference image 1 (face photograph): controls facial identity, apparent age, hair and photographic realism' },
    { slot: 1, role: 'style', label: 'Reference image 2 (outfit): controls every visible garment, layer, colour, material and accessory' },
];

export const UNMAPPED_ROLES = [
    { role: 'scene', reason: 'Cloudflare FLUX.2 Klein 没有场景图像槽位；场地只能写在提示词里' },
];

// Contract -> what compileCloudCandidateRequest / generateCloudCandidate expect.
export function contractShotToCloudInput(group, shotId, { aspectRatio = 'portrait', seed } = {}) {
    const shot = group?.shots?.find(item => item.shotId === shotId);
    if (!shot) throw new Error('CONTINUITY_SHOT_UNKNOWN');
    const locked = group?.locked || {};
    const scene = [shot.scene || locked.location, locked.weather, locked.timeOfDay].filter(Boolean).join('・');
    return {
        provider: 'cloudflare',
        model: CLOUDFLARE_MODEL,
        candidate_count: 1,
        billing_mode: 'free-credit-first',
        brief: [group?.theme || group?.id || '', shot.action].filter(Boolean).join('・').slice(0, 400),
        scene_brief: scene,
        style_direction: locked.styleProfile || '',
        aspect_ratio: aspectRatio,
        seed,
        reference_brief: {
            scene,
            modelDesc: locked.subject || '',
            style: locked.styleProfile || '',
        },
        shot_contract: {
            shot_language: shot.shotType || shot.size || '',
            generator_prompt: [shot.camera, shot.lens, shot.distance, shot.subjectPlacement].filter(Boolean).join('・'),
            wardrobe_styling: locked.wardrobe || '',
            shot_size: shot.size || '',
            must_show: Array.isArray(shot.mustKeep) ? shot.mustKeep.join('；') : '',
            reject_if: 'text, watermark, collage, extra limbs, duplicate feet, malformed anatomy',
        },
    };
}

// Everything the caller must know before spending a generation: which reference
// the contract can actually supply, and which slot will be empty.
export function planCloudFrames(group, shotIds = []) {
    const selected = shotIds.length ? group.shots.filter(shot => shotIds.includes(shot.shotId)) : group.shots;
    const byRole = new Map((group.references || []).map(reference => [reference.role, reference]));
    const filled = ROLE_SLOTS.map(slotEntry => {
        const reference = byRole.get(slotEntry.role);
        return {
            ...slotEntry,
            assetId: reference?.assetId || '',
            path: reference?.path || '',
            status: reference?.status || 'missing',
            ready: reference?.status === 'confirmed' && Boolean(reference?.assetId),
        };
    });
    return {
        frames: selected.map(shot => ({
            shotId: shot.shotId,
            file: shot.file,
            aspect: shot.aspect,
            slots: filled.map(slotEntry => ({ slot: slotEntry.slot, role: slotEntry.role, assetId: slotEntry.assetId })),
        })),
        gaps: [
            ...filled.filter(slotEntry => !slotEntry.ready).map(slotEntry => ({
                role: slotEntry.role,
                reason: `参考图未确认：${slotEntry.role}`,
            })),
            ...UNMAPPED_ROLES.map(item => ({ ...item, severity: 'warning' })),
        ],
        canGenerate: filled.every(slotEntry => slotEntry.ready),
    };
}

// One shot, one call. Gate first (references confirmed, master human, provider
// capable), then a single provider request - never a batch.
export async function generateContractShot({
    group, shotId, ai, aspectRatio = 'portrait', seed,
    readAsset, fetchImpl = fetch, store = null,
} = {}) {
    if (!ai || typeof ai.run !== 'function') throw new Error('IMAGE_PROVIDER_NOT_CONFIGURED');
    if (!shotId) throw new Error('CONTINUITY_SHOT_REQUIRED');

    // Same gate as every other adapter: it throws ContinuityError with a status.
    const ready = assertReadyToGenerate(group, 'cloudflare-flux-klein');
    const shot = ready.group.shots.find(item => item.shotId === shotId);
    if (!shot) throw new Error('CONTINUITY_SHOT_UNKNOWN');

    const plan = planCloudFrames(ready.group, [shotId]);
    if (!plan.canGenerate) {
        const missing = plan.gaps.filter(gap => !gap.severity).map(gap => gap.role).join('、');
        const error = new Error(`参考图未就绪：${missing}`);
        error.code = 'CONTINUITY_REFERENCE_UNCONFIRMED';
        error.status = 409;
        throw error;
    }
    if (typeof readAsset !== 'function') {
        const error = new Error('缺少资产读取函数，无法把契约参考图变成字节');
        error.code = 'CONTINUITY_ASSET_READER_REQUIRED';
        error.status = 500;
        throw error;
    }

    const input = contractShotToCloudInput(ready.group, shotId, { aspectRatio, seed });
    const compiled = compileCloudCandidateRequest(input);
    const images = [];
    for (const slotEntry of ROLE_SLOTS) {
        const reference = ready.group.references.find(item => item.role === slotEntry.role);
        const asset = await readAsset(reference.assetId);
        if (!asset?.bytes?.length) {
            const error = new Error(`参考图读不到：${slotEntry.role}`);
            error.code = 'GENERATION_REFERENCE_MISSING';
            error.status = 409;
            throw error;
        }
        if (asset.bytes.length > MAX_IMAGE_BYTES) throw new Error('REFERENCE_IMAGE_TOO_LARGE');
        images.push(new Blob([asset.bytes], { type: asset.mime || 'image/png' }));
    }

    const prompt = buildPrompt(ready.group, shot, compiled, input);
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('width', String(compiled.width));
    form.append('height', String(compiled.height));
    images.forEach((image, index) => form.append(`input_image_${index}`, image, `reference-${index}`));
    const serialized = new Response(form);

    let result;
    try {
        result = await ai.run(CLOUDFLARE_MODEL, {
            multipart: { body: serialized.body, contentType: serialized.headers.get('content-type') },
        });
    } catch (error) {
        const wrapped = new Error(`生成失败：${String(error?.message || error).slice(0, 200)}`);
        wrapped.code = 'IMAGE_PROVIDER_GENERATION_FAILED';
        wrapped.status = 502;
        throw wrapped;
    }
    const bytes = decodeImage(result);
    const mime = sniffMime(bytes);
    const record = {
        shotId,
        provider: 'cloudflare-flux-klein',
        model: CLOUDFLARE_MODEL,
        seed: compiled.seed,
        prompt,
        width: compiled.width,
        height: compiled.height,
        references: ROLE_SLOTS.map(slotEntry => ({ role: slotEntry.role, assetId: ready.group.references.find(r => r.role === slotEntry.role)?.assetId || '' })),
        gaps: plan.gaps.filter(gap => gap.severity),
        qc: 'pending',
    };
    if (typeof store === 'function') record.image = await store({ bytes, mime, shotId });
    return { ...record, bytes, mime };
}

function buildPrompt(group, shot, compiled, input) {
    const locked = group.locked || {};
    const scene = shot.scene || locked.location || 'unspecified';
    const framing = framingFor(shot);
    return [
        'Create one photorealistic DSLR photograph of ONE person, with realistic skin texture and a fully rendered real location.',
        'Reference image 1, the face photograph, controls facial identity, apparent age, hair and photographic realism.',
        'Reference image 2, the outfit, controls every visible garment, layer, colour, material and accessory. Copy those garments faithfully without adding or replacing layers.',
        `Required pose and action: ${shot.action || shot.prompt || 'follow the shot contract'}.`,
        `Location (text only, no reference image available): ${scene}${locked.weather ? `, ${locked.weather}` : ''}${locked.timeOfDay ? `, ${locked.timeOfDay}` : ''}.`,
        `Camera: ${[shot.camera, shot.lens, shot.distance, shot.subjectPlacement].filter(Boolean).join(', ') || 'per shot contract'}.`,
        `Style: ${locked.styleProfile || 'documentary, low saturation'}.`,
        ...wardrobeCoverageRules({ subject: locked.subject, wardrobe: locked.wardrobe, shotWardrobe: shot.wardrobe }),
        framing,
        'Natural light with realistic falloff and subtle exposure variation; preserve visible skin pores and fine facial hair. Avoid plastic skin, heavy smoothing, HDR glow, text, watermark, collage, extra limbs, duplicate feet and malformed anatomy.',
    ].filter(Boolean).join(' ');
}

function framingFor(shot) {
    const text = String(shot.size || shot.shotType || '');
    return [
        [/环境全景|环境远景|^(?:E?WS)$/i, 'Environmental long shot. Person occupies at most 40 percent of the image height; show the surrounding location clearly.'],
        [/中全景|^MFS$/i, 'Knee-up portrait. Crop above the knees, showing head, torso and hands.'],
        [/全身|^FS$/i, 'Head-to-toe portrait. Show both shoes and the ground beneath them, with margin above the head.'],
        [/近景|^MCU$/i, 'Head-and-shoulders portrait. Crop below the shoulders.'],
        [/特写|^E?CU$/i, 'Tight close-up of the face or the detail specified by the shot contract.'],
        [/中景|^MS$/i, 'Waist-up portrait. Crop below the waist and preserve the hands when visible.'],
    ].find(([pattern]) => pattern.test(text))?.[1] || 'Follow the shot contract framing.';
}

function decodeImage(result) {
    if (typeof result?.image !== 'string') throw new Error('IMAGE_PROVIDER_INVALID_RESPONSE');
    if (result.image.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) throw new Error('IMAGE_PROVIDER_IMAGE_SIZE_INVALID');
    let binary;
    try { binary = atob(result.image); } catch { throw new Error('IMAGE_PROVIDER_INVALID_RESPONSE'); }
    if (!binary.length || binary.length > MAX_IMAGE_BYTES) throw new Error('IMAGE_PROVIDER_IMAGE_SIZE_INVALID');
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function sniffMime(bytes) {
    if (bytes[0] === 137 && bytes[1] === 80) return 'image/png';
    if (bytes[0] === 255 && bytes[1] === 216) return 'image/jpeg';
    if (bytes[0] === 82 && bytes[1] === 73) return 'image/webp';
    throw new Error('IMAGE_PROVIDER_INVALID_IMAGE_TYPE');
}

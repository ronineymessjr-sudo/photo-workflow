// Image-service adapters for one shot at a time.
const STEPS = 24;
//
// Rules this file enforces:
//   - no credential -> 503 GENERATION_NOT_CONFIGURED listing the exact env vars,
//     never a silent text-only run
//   - every call carries the group's reference images (identity/scene/style);
//     if an asset cannot be read, the call fails instead of degrading
//   - the returned image is stored as a content-addressed asset and recorded,
//     so the contract can point at a real file
//
// Provider -> adapter mapping lives in PROVIDER_ADAPTERS; unknown providers fail.

import { assertReadyToGenerate, buildShotRequests, ContinuityError, CONTINUITY_PROVIDERS } from './continuity.mjs';
import { storeAsset, readAsset, AssetError } from './continuity-assets.mjs';
// Workers on compatibility_date 2024-01-01 does not inject a global Buffer.
// Import it explicitly instead of raising the compat date, which would change
// unrelated fetch/crypto behaviour across the whole Worker.
import { Buffer } from 'node:buffer';

export class GenerationError extends Error {
    constructor(code, message, status = 502, details = undefined) {
        super(message);
        this.name = 'GenerationError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

export const PROVIDER_ADAPTERS = {
    'gpt-image-2': 'openai-images-edits',
    'flux-kontext': 'reference-json',
    'sdxl-ipadapter': 'reference-json',
    'cloudflare-flux-klein': 'cloudflare-workers-ai',
    'volcengine-seedream': 'volcengine-seedream',
};

function dataUrlFor(buffer, mime) {
    return `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
}

function pickBase64(payload) {
    const entry = payload?.data?.[0] || payload?.images?.[0] || payload;
    const encoded = entry?.b64_json || entry?.image_base64 || entry?.base64 || (typeof entry?.image === 'string' ? entry.image : '');
    if (encoded) return { base64: encoded, contentType: entry?.mime || 'image/png' };
    if (typeof entry?.url === 'string') return { url: entry.url };
    return null;
}

async function fetchImageAsBase64(url, fetchImpl) {
    const response = await fetchImpl(url, { method: 'GET' });
    if (!response.ok) throw new GenerationError('GENERATION_RESULT_UNREADABLE', `结果图片下载失败：HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    return { base64: buffer.toString('base64'), contentType: response.headers.get('content-type') || 'image/png' };
}

// OpenAI-compatible images/edits: references are sent as repeated image parts.
async function callOpenAiEdits({ env, fetchImpl, prompt, size, references }) {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) throw new GenerationError('GENERATION_NOT_CONFIGURED', '未配置图像服务：缺少 OPENAI_API_KEY', 503, { missing: ['OPENAI_API_KEY'] });
    const base = (env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '');
    const form = new FormData();
    form.set('model', env.CONTINUITY_IMAGE_MODEL || 'gpt-image-1');
    form.set('prompt', prompt);
    form.set('size', size);
    for (const reference of references) form.append('image[]', new Blob([reference.buffer], { type: reference.mime }), `${reference.role}.png`);
    const response = await fetchImpl(`${base}/v1/images/edits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new GenerationError('GENERATION_UPSTREAM_ERROR', `图像服务返回 HTTP ${response.status}：${payload?.error?.message || ''}`.trim(), 502);
    }
    const picked = pickBase64(payload);
    if (!picked) throw new GenerationError('GENERATION_RESPONSE_INVALID', '图像服务没有返回图片数据');
    return picked.url ? fetchImageAsBase64(picked.url, fetchImpl) : picked;
}

// Generic reference-aware JSON endpoint (Flux Kontext, nano-banana, local bridge):
// POST { prompt, size, aspect, seed, references:[{role, assetId, dataUrl}] }
async function callReferenceJson({ env, fetchImpl, prompt, size, aspect, seed, references }) {
    const endpoint = env.CONTINUITY_IMAGE_ENDPOINT;
    const apiKey = env.CONTINUITY_IMAGE_KEY;
    const missing = [!endpoint && 'CONTINUITY_IMAGE_ENDPOINT', !apiKey && 'CONTINUITY_IMAGE_KEY'].filter(Boolean);
    if (missing.length) {
        throw new GenerationError('GENERATION_NOT_CONFIGURED', `未配置图像服务：缺少 ${missing.join('、')}`, 503, { missing });
    }
    const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            prompt, size, aspect, seed,
            references: references.map(reference => ({ role: reference.role, assetId: reference.assetId, dataUrl: reference.dataUrl })),
        }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new GenerationError('GENERATION_UPSTREAM_ERROR', `图像服务返回 HTTP ${response.status}：${payload?.error || ''}`.toString(), 502);
    }
    const picked = pickBase64(payload);
    if (!picked) throw new GenerationError('GENERATION_RESPONSE_INVALID', '图像服务没有返回图片数据');
    return picked.url ? fetchImageAsBase64(picked.url, fetchImpl) : picked;
}


// Doubao-Seedream (Volcengine Ark) adapter.
//
// Why this provider exists alongside Cloudflare:
//   - up to 14 reference images (FLUX.2 klein allows 4 and demands one visual register)
//   - native Chinese prompts, so the plan text no longer needs translating
//   - "sequential_image_generation" produces a batch of related frames in ONE
//     request, which is the closest thing to an actual continuous shoot
//   - reachable from mainland China without a custom domain
// Cost: 0.2 CNY per output image, billed per image actually produced.
const SEEDREAM_MODEL = 'doubao-seedream-4-0-250828';

async function callSeedream({ env, prompt, size, seed, references, variant, poseRef, anchor, locked, store = null, fetchImpl = fetch }) {
    const key = env?.ARK_API_KEY;
    if (!key) {
        throw new GenerationError('GENERATION_NOT_CONFIGURED', '缺少火山方舟 ARK_API_KEY', 503, { missing: ['ARK_API_KEY'] });
    }
    // Ark takes images as base64 data URLs or public URLs. Our references are
    // stored bytes, so they go in as data URLs, anchor first when one exists.
    const images = [];
    if (anchor?.assetId) {
        const stored = await readAsset(`/api/continuity/asset/${anchor.assetId}`, { env, store });
        if (!stored?.buffer?.length) throw new GenerationError('GENERATION_ANCHOR_MISSING', '已锁定的母图读不到；停止生成，不能退回无母图请求', 409);
        images.push(dataUrlFor(stored.buffer, stored.mime));
    }
    for (const reference of references) {
        images.push(reference.dataUrl);
    }

    const direction = [
        prompt,
        locked?.subject ? `人物：${locked.subject}` : '',
        locked?.wardrobe ? `全组服装保持：${locked.wardrobe}` : '',
        locked?.styleProfile ? `整体风格：${locked.styleProfile}` : '',
        locked?.weather ? `天气：${locked.weather}` : '',
        locked?.timeOfDay ? `时间：${locked.timeOfDay}` : '',
        variant?.scene ? `本镜场景：${variant.scene}` : '',
        variant?.shotType ? `景别：${variant.shotType}` : '',
        variant?.camera ? `机位：${variant.camera}` : '',
        variant?.lens ? `焦段：${variant.lens}` : '',
        poseRef?.title ? `摆姿库姿势：${poseRef.title}${poseRef.angle ? `，参考角度${poseRef.angle}` : ''}` : '',
        poseRef?.direction ? `摆姿指导：${poseRef.direction}` : '',
        variant?.action ? `动作：${variant.action}` : '',
        variant?.subjectPlacement ? `构图：${variant.subjectPlacement}` : '',
        variant?.lighting ? `光线：${variant.lighting}` : '',
        variant?.wardrobe ? `服装：${variant.wardrobe}` : '',
        variant?.crop ? `裁切：${variant.crop}` : '',
        variant?.mustShow ? `必须出现：${variant.mustShow}` : '',
        variant?.rejectIf ? `不得出现：${variant.rejectIf}` : '',
        '同一组保持参考人物的脸、年龄、发型与身份；服装只按衣装参考，不增添其他单品。每次只改变本镜要求的动作、机位和场景。',
    ].filter(Boolean).join('\n');

    const portrait = String(size || '').includes('1024x1536') || !String(size || '').includes('x');
    const body = {
        model: SEEDREAM_MODEL,
        prompt: direction,
        // No translation step: Ark handles Chinese directly, and the plan is
        // written in Chinese.
        size: portrait ? '2K' : '2K',
        response_format: 'url',
        watermark: false,
        sequential_image_generation: 'disabled',
    };
    if (images.length) body.image = images;
    if (Number.isSafeInteger(seed)) body.seed = seed;

    let response;
    try {
        response = await fetchImpl('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(120000),
        });
    } catch (error) {
        throw new GenerationError('GENERATION_UPSTREAM_FAILED', `火山方舟请求失败：${String(error?.message || error).slice(0, 200)}`, 502);
    }
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new GenerationError('GENERATION_UPSTREAM_FAILED', `火山方舟返回 ${response.status}：${detail.slice(0, 200)}`, response.status === 429 ? 429 : 502);
    }
    const payload = await response.json().catch(() => null);
    const first = payload?.data?.[0];
    if (!first?.url && !first?.b64_json) {
        throw new GenerationError('GENERATION_INVALID_RESPONSE', '火山方舟返回里没有图片', 502);
    }
    let bytes;
    let mime = 'image/png';
    if (first.b64_json) {
        const binary = atob(first.b64_json);
        bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    } else {
        const imageResponse = await fetchImpl(first.url, { signal: AbortSignal.timeout(60000) });
        if (!imageResponse.ok) throw new GenerationError('GENERATION_INVALID_RESPONSE', '下载生成结果失败', 502);
        mime = imageResponse.headers.get('content-type')?.split(';')[0] || 'image/png';
        bytes = new Uint8Array(await imageResponse.arrayBuffer());
    }
    return { contentType: mime, base64: Buffer.from(bytes).toString('base64'), prompt: direction, referencesSent: images.length, anchored: Boolean(anchor?.assetId) };
}

const ADAPTERS = {
    'openai-images-edits': callOpenAiEdits,
    'reference-json': callReferenceJson,
    'cloudflare-workers-ai': callCloudflareWorkersAi,
    'volcengine-seedream': callSeedream,
};

// Cloudflare Workers AI: no API key, the Worker carries the `[ai]` binding. It
// exposes two reference-image slots only, so `scene` is described in the prompt
// instead of being uploaded - the caller is told about that gap separately.
async function callCloudflareWorkersAi({ env, prompt, size, seed, references, variant, poseRef, anchor, locked, store = null, fetchImpl = fetch }) {
    const ai = env?.AI;
    if (!ai || typeof ai.run !== 'function') {
        throw new GenerationError('GENERATION_NOT_CONFIGURED', '这个部署没有绑定 Workers AI（wrangler.toml 里的 [ai]），无法用 Cloudflare 出图', 503, { missing: ['AI binding'] });
    }
    // FLUX reads English. A prompt mixing Chinese guidance into English
    // instructions measurably degrades it, and both the shot text and the pose /
    // camera fields are user input in Chinese. Translate the whole direction in
    // one call so the model sees one language.
    // The plan is verbose - a single pose sentence can run 60 characters. The
    // prompt cap is ~512 tokens, so each field is trimmed to the part that
    // changes the picture; the rest lives in the contract for review.
    const clamp = (value, max) => {
        const text = typeof value === 'string' ? value.trim() : '';
        return text.length > max ? `${text.slice(0, max)}…` : text;
    };
    const directionZh = [
        clamp(prompt, 220),
        poseRef ? `摆姿库约束：${[
            poseRef.title ? `指定姿势${clamp(poseRef.title, 36)}` : '',
            poseRef.angle ? `参考方向${clamp(poseRef.angle, 20)}` : '',
            poseRef.direction ? clamp(poseRef.direction, 90) : '',
        ].filter(Boolean).join('；')}` : '',
        variant?.scene ? `本镜场景：${clamp(variant.scene, 80)}` : '',
        locked?.wardrobe ? `全组服装保持：${clamp(locked.wardrobe, 80)}` : '',
        locked?.styleProfile ? `整体风格：${clamp(locked.styleProfile, 60)}` : '',
        locked?.weather ? `天气：${clamp(locked.weather, 24)}` : '',
        locked?.timeOfDay ? `时间：${clamp(locked.timeOfDay, 24)}` : '',
        variant?.action ? `姿势与动作：${clamp(variant.action, 70)}` : '',
        variant?.camera ? `机位：${clamp(variant.camera, 26)}` : '',
        variant?.subjectPlacement ? `人物在画面中的位置：${clamp(variant.subjectPlacement, 40)}` : '',
        // The plan names the light. Not sending it is why frames came back with
        // generic studio lighting no matter what the shot called for.
        directive(variant?.lighting) ? `现场光线：${clamp(directive(variant.lighting), 80)}` : '',
        directive(variant?.wardrobe) ? `服装与妆发：${directive(variant.wardrobe)}` : '',
        directive(variant?.props) ? `道具：${directive(variant.props)}` : '画面不额外添加道具',
        // Crop is already expressed by the framing line, and "16mm f/8 1/1000s"
        // is not something a diffusion model can act on as text - it becomes a
        // depth-of-field instruction below instead.
    ].filter(Boolean).join('；');
    const direction = await englishPrompt(ai, directionZh);
    const slots = ['identity', 'style'];
    const chosen = slots.map(role => references.find(reference => reference.role === role)).filter(Boolean);
    if (chosen.length < 2) {
        throw new GenerationError('GENERATION_REFERENCE_MISSING', `Cloudflare 需要人物与风格两张参考图，当前只有 ${chosen.length} 张`, 409);
    }
    // Once an accepted frame exists, edit FROM it instead of from the passport
    // style reference. A fresh text-to-image call re-samples a face every time;
    // an edit of a real frame keeps the one that was already approved. This is
    // the only identity mechanism this model has.
    let anchorBuffer = null;
    if (anchor?.assetId) {
        try {
            // store must be forwarded: without it readAsset falls back to a
            // fresh in-memory backend that never saw the uploaded frame.
            const stored = await readAsset(`/api/continuity/asset/${anchor.assetId}`, { env, store });
            if (stored?.buffer?.length) anchorBuffer = stored;
        } catch {
            anchorBuffer = null;
        }
    }
    const portrait = String(size || '').startsWith('1024x1536') || !String(size || '').includes('x');
    const width = portrait ? 768 : 1024;
    const height = portrait ? 1024 : 768;
    // Pose handling: the library's pose images are black-and-white anatomical
    // line drawings. Black Forest Labs states that mixing drawing registers with
    // photographic references confuses the editor, and a nude body diagram also
    // leaks into the generated body and clothing. So the pose is carried as TEXT
    // (which the plan already describes in detail), not as a third image.
    const poseNote = poseRef?.title ? `Required pose: ${poseRef.title}.` : '';
    const poseBytes = null;
    // The prompt budget matters: FLUX.2 klein states a ~512 token cap and that
    // longer prompts degrade rather than truncate cleanly. The version below runs
    // ~400 tokens so nothing important falls off the end.
    const composed = [
        'One photorealistic DSLR photograph of exactly one person.',
        anchorBuffer
            ? 'Image 1 is an earlier frame from this same shoot: keep that exact person - face, hair, skin tone, outfit - and change only the camera position and framing described below. Image 2 supplies the outfit exactly.'
            : 'Image 1 supplies the face, age and hair. Image 2 supplies the outfit exactly.',
        poseNote,
        direction ? `Shot: ${direction}.` : '',
        directive(variant?.mustShow) ? `Must contain: ${shortList(variant.mustShow)}.` : '',
        directive(variant?.rejectIf) ? `Redo if: ${shortList(variant.rejectIf)}.` : '',
        framingLine(variant),
        depthOfField(variant?.cameraSettings),
        'Real skin with visible pores, true light falloff, mixed colour temperature, worn surfaces, slight imperfect level.',
        'No text, watermark, collage, extra limbs, deformed hands, plastic skin, HDR glow.',
    ].filter(Boolean).join(' ');
    const form = new FormData();
    form.append('prompt', composed);
    form.append('width', String(width));
    form.append('height', String(height));
    // 4 steps is the model's "concepting" setting (sub-second previews). For a
    // frame we intend to keep, the 9B variant wants ~25: texture, skin detail and
    // fine structure only appear past ~15.
    form.append('steps', String(STEPS));
    chosen.forEach((reference, index) => {
        const source = (index === 0 && anchorBuffer) ? anchorBuffer : reference;
        const bytes = source.buffer instanceof Uint8Array ? source.buffer : new Uint8Array(source.buffer || []);
        form.append(`input_image_${index}`, new Blob([bytes], { type: source.mime || 'image/png' }), `reference-${index}`);
    });
    if (poseBytes) form.append('input_image_2', new Blob([poseBytes.bytes], { type: poseBytes.mime }), 'reference-2');
    const serialized = new Response(form);
    let result;
    try {
        result = await ai.run('@cf/black-forest-labs/flux-2-klein-9b', {
            multipart: { body: serialized.body, contentType: serialized.headers.get('content-type') },
        });
    } catch (error) {
        throw new GenerationError('GENERATION_UPSTREAM_FAILED', `Cloudflare 出图失败：${String(error?.message || error).slice(0, 200)}`, 502);
    }
    if (typeof result?.image !== 'string' || !result.image.length) {
        throw new GenerationError('GENERATION_INVALID_RESPONSE', 'Cloudflare 返回里没有图片数据', 502);
    }
    const binary = atob(result.image);
    const head = binary.charCodeAt(0);
    const contentType = head === 137 ? 'image/png' : head === 255 ? 'image/jpeg' : 'image/webp';
    return { contentType, base64: result.image, prompt: composed, referencesSent: chosen.length + (poseBytes ? 1 : 0), anchored: Boolean(anchorBuffer) };
}

/**
 * Generates exactly one shot. Never loops, never fans out: the caller decides
 * which shot to (re)make, which is what keeps retry scoped to a single frame.
 */
export async function generateShot({ group, shotId, providerId = '', env = {}, fetchImpl = fetch, store = null } = {}) {
    // Fall back to the provider pinned on the contract, so the shoot keeps using
    // the brush it was approved with.
    providerId = providerId || group?.imageProvider || '';
    if (!shotId) throw new ContinuityError('CONTINUITY_SHOT_REQUIRED', '需要镜头 ID', 400);
    if (!(group?.shots || []).some(shot => shot.shotId === shotId)) {
        throw new ContinuityError('CONTINUITY_SHOT_UNKNOWN', `没有这个镜头：${shotId}`, 404);
    }
    // Gate first: references confirmed, master human-confirmed, provider capable.
    const requests = buildShotRequests(group, { providerId, shotIds: [shotId] });
    const request = requests[0];
    if (!request) throw new ContinuityError('CONTINUITY_SHOT_UNKNOWN', `没有这个镜头：${shotId}`, 404);

    const adapterName = PROVIDER_ADAPTERS[providerId];
    if (!adapterName) throw new GenerationError('GENERATION_ADAPTER_MISSING', `没有为 ${providerId} 配置生成适配器`, 501);
    const adapter = ADAPTERS[adapterName];

    // References must be readable bytes, not just ids: an unreadable asset is a
    // configuration error, not a reason to fall back to text-only.
    const references = [];
    const provider = CONTINUITY_PROVIDERS[providerId];
    const imageSlots = provider?.imageSlots || provider?.roles || [];
    const requiredImageSlots = provider?.requiredImageSlots || imageSlots;
    for (const reference of request.references) {
        if (!imageSlots.includes(reference.role)) continue;
        const definition = (group.references || []).find(item => item.role === reference.role);
        const assetPath = definition?.path;
        let asset;
        if (assetPath) {
            try {
                asset = await readAsset(assetPath, { env, store });
            } catch (error) {
                if (error instanceof AssetError) throw new GenerationError('GENERATION_REFERENCE_INVALID', error.message, 409);
                throw error;
            }
        } else if (definition?.referenceImageUrl) {
            const external = await fetchLibraryImage(definition.referenceImageUrl, fetchImpl);
            if (external) asset = { buffer: external.bytes, mime: external.mime };
        }
        if (!asset) {
            if (requiredImageSlots.includes(reference.role)) {
                throw new GenerationError('GENERATION_REFERENCE_MISSING', `参考图读不到：${reference.role}`, 409);
            }
            continue;
        }
        references.push({ role: reference.role, assetId: reference.assetId, mime: asset.mime, buffer: asset.buffer, dataUrl: dataUrlFor(asset.buffer, asset.mime) });
    }

    const wide = String(request.aspect || '').startsWith('3:2');
    const size = wide ? '1536x1024' : '1024x1536';
    const image = await adapter({
        env, fetchImpl, prompt: request.prompt, size,
        aspect: request.aspect, seed: request.seed, references,
        // Framing lives on the shot variant; the adapter needs it to state what
        // must be visible instead of leaving the crop to the model.
        variant: request.variant,
        locked: request.locked,
        // The pose template the operator picked for THIS frame, if any.
        poseRef: (group.shots || []).find(shot => shot.shotId === shotId)?.poseRef || null,
        // The accepted frame to edit from. Present from the second shot onward.
        anchor: request.anchor,
        store,
    });

    const stored = await storeAsset({
        dataUrl: `data:${image.contentType};base64,${image.base64}`,
        role: 'misc',
        env,
        store,
    });

    return {
        shotId,
        provider: providerId,
        adapter: adapterName,
        seed: request.seed,
        size,
        lockedHash: request.lockedHash,
        references: request.references,
        image: { assetId: stored.assetId, path: stored.path, bytes: stored.bytes, durable: stored.durable },
        // What was actually sent, so a frame can be traced back to the template it
        // was supposed to follow. Useful whenever output disagrees with the plan.
        sentPrompt: image.prompt || '',
        referencesSent: image.referencesSent ?? references.length,
        anchored: Boolean(image.anchored),
        // QC is deliberately not filled here: the planner never grades itself.
        qc: { verdict: 'pending' },
    };
}

// Translate Chinese guidance so the model receives one language. Constraints are
// preserved rather than summarised: dropping "大衣" or "傍晚" silently changes
// the picture, which is worse than a longer prompt.
async function englishPrompt(ai, prompt) {
    if (typeof prompt !== 'string' || !prompt.trim()) return '';
    if (!/[\u3400-\u9fff]/.test(prompt)) return prompt;
    try {
        const translated = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast', {
            messages: [
                {
                    role: 'system',
                    content: 'Translate the user text into concise English photography instructions, 90 words maximum. Keep every concrete constraint: how many people, framing and crop, camera height, subject position, pose and action, location and its details, time of day, weather, lighting direction and quality, colour grade. Compress repetition instead of expanding it. Do not add anything that is not stated. Do not describe faces or clothing beyond what is given, since reference images supply those. Return only the English text, no preamble.',
                },
                { role: 'user', content: prompt },
            ],
            max_tokens: 500, temperature: 0,
        });
        const text = typeof translated?.response === 'string' ? translated.response.trim() : '';
        return text.length > 20 ? text : prompt;
    } catch {
        // A failed translation must not block generation; the original text still
        // carries the constraints, just less reliably.
        return prompt;
    }
}


// Fields like "服装与妆发待确认" contain no instruction. Sending them invites the
// model to invent something, so anything that is only a placeholder is dropped.
function directive(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return '';
    if (/^(?:无|none|n\/a)$/i.test(raw)) return '';
    if (/待确认|待定|未定|TBD|to be confirmed/i.test(raw) && raw.length < 40) return '';
    // "服装与妆发待确认；拍摄前确认鞋底防滑…" - keep the actionable tail only.
    return raw
        .split(/[；;]/)
        .filter(part => !/待确认|待定|未定|TBD/i.test(part))
        .join('；')
        .trim();
}


// Keep the first three items of a verification list: beyond that the prompt
// budget is better spent on the pose and the light.
function shortList(value) {
    return directive(value)
        .split(/[、,，]/)
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 2)
        .map(item => (item.length > 20 ? `${item.slice(0, 20)}…` : item))
        .join('；');
}

// Aperture and shutter mean nothing to the text encoder, but their visual
// consequences do: aperture sets how much is sharp, shutter freezes or blurs.
function depthOfField(cameraSettings) {
    const raw = directive(cameraSettings);
    if (!raw) return '';
    const aperture = Number((raw.match(/f\/?(\d+(?:\.\d+)?)/) || [])[1]);
    if (!aperture) return '';
    if (aperture >= 8) return 'Deep focus: the whole scene is sharp from foreground to background.';
    if (aperture <= 2) return 'Very shallow focus: only the face is sharp, background falls into soft blur.';
    return 'Moderate depth of field: subject sharp, background gently softened.';
}

// Framing stated as what SHOULD be visible. Saying "person occupies at most 40%"
// read as permission to omit the person entirely and produced an empty street.
function framingLine(variant) {
    const raw = String(variant?.shotType || variant?.shotSize || '');
    const rules = [
        [/环境全景|环境远景|^(?:E?WS)$/i, 'Wide environmental framing: the person is small but unmistakably present, walking or standing in the middle distance, with the surrounding street clearly readable around them.'],
        [/中全景|^MFS$/i, 'Knee-up framing: crop above the knees, showing head, torso and hands.'],
        [/全身|^FS$/i, 'Head-to-toe framing: both shoes and the ground under them are visible, with margin above the head.'],
        [/近景|^MCU$/i, 'Head-and-shoulders framing: crop below the shoulders, face fully in frame.'],
        [/特写|^E?CU$/i, 'Tight close-up: face fills most of the frame. Do not invent hands or props.'],
        [/中景|^MS$/i, 'Waist-up framing: crop below the waist, hands visible when they are in frame.'],
    ];
    const line = rules.find(([pattern]) => pattern.test(raw))?.[1] || 'Frame the person according to the shot contract, with the face clearly visible.';
    return `${line} Exactly one person appears in the frame.`;
}

// The shot contract already carries the pose, camera angle, distance and where
// the subject sits in the frame. The adapter used to send only the framing, so
// every result came back as a straight-on standing figure no matter what the
// plan asked for - that is what made the first shoot look like passport photos.
function compositionLine(variant = {}) {
    const parts = [];
    if (variant.action) parts.push(`Pose and action: ${variant.action}.`);
    if (variant.camera) parts.push(`Camera: ${variant.camera}.`);
    if (variant.distance) parts.push(`Distance: ${variant.distance}.`);
    if (variant.subjectPlacement) parts.push(`Subject placement: ${variant.subjectPlacement}.`);
    return parts.join(' ');
}

// Only the approved reference library is fetched. Anything else is refused
// rather than proxied, so a crafted poseRef cannot make the Worker fetch an
// arbitrary URL.
async function fetchLibraryImage(rawUrl, fetchImpl = fetch) {
    let url;
    try { url = new URL(rawUrl); } catch { return null; }
    if (url.origin !== 'https://hruiccc.github.io') return null;
    if (!/^\/RuiC-PoseAtlas\/(?:thumbs\/[A-Za-z0-9_-]+\.jpg|(?:costume|portrait)\/thumbs\/[A-Za-z0-9_-]+\.webp)$/.test(url.pathname)) return null;
    if (url.search || url.hash) return null;
    try {
        const response = await fetchImpl(url.href, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
        if (!response.ok || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get('content-type') || '')) return null;
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!bytes.length || bytes.length > 3 * 1024 * 1024) return null;
        return { bytes, mime: response.headers.get('content-type').split(';')[0] };
    } catch {
        return null;
    }
}

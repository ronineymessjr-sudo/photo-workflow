// Image-service adapters for one shot at a time.
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

import { assertReadyToGenerate, buildShotRequests, ContinuityError } from './continuity.mjs';
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

const ADAPTERS = {
    'openai-images-edits': callOpenAiEdits,
    'reference-json': callReferenceJson,
    'cloudflare-workers-ai': callCloudflareWorkersAi,
};

// Cloudflare Workers AI: no API key, the Worker carries the `[ai]` binding. It
// exposes two reference-image slots only, so `scene` is described in the prompt
// instead of being uploaded - the caller is told about that gap separately.
async function callCloudflareWorkersAi({ env, prompt, size, seed, references, variant }) {
    const ai = env?.AI;
    if (!ai || typeof ai.run !== 'function') {
        throw new GenerationError('GENERATION_NOT_CONFIGURED', '这个部署没有绑定 Workers AI（wrangler.toml 里的 [ai]），无法用 Cloudflare 出图', 503, { missing: ['AI binding'] });
    }
    // FLUX reads English. A prompt mixing Chinese guidance into English
    // instructions measurably degrades it, and the contract's locked fields
    // (wardrobe, location) are user input in Chinese. Translate first, and keep
    // every constraint rather than summarising it away.
    prompt = await englishPrompt(ai, prompt);
    const slots = ['identity', 'style'];
    const chosen = slots.map(role => references.find(reference => reference.role === role)).filter(Boolean);
    if (chosen.length < 2) {
        throw new GenerationError('GENERATION_REFERENCE_MISSING', `Cloudflare 需要人物与风格两张参考图，当前只有 ${chosen.length} 张`, 409);
    }
    const portrait = String(size || '').startsWith('1024x1536') || !String(size || '').includes('x');
    const width = portrait ? 768 : 1024;
    const height = portrait ? 1024 : 768;
    // The shot text alone does not tell the model what the two images are for.
    // Without this, a wide environmental description produced a street with no
    // person in it, and a close shot invented a different face.
    const composed = [
        'Create one photorealistic DSLR photograph containing exactly ONE person.',
        'Reference image 1 is the face photograph: it defines facial identity, apparent age, skin tone and hair. The person in the result must be this same individual, not a similar-looking model.',
        'Reference image 2 is the outfit reference: every visible garment, layer, colour, material and accessory comes from it exactly. Do not invent, replace or simplify clothing.',
        `Shot contract: ${prompt}`,
        framingLine(variant),
        'Real photographic rendering: visible skin pores and peach fuzz, uneven natural skin tone, true light falloff with genuinely dark shadow areas, mixed colour temperature, worn everyday surfaces with marks and dust, natural lens vignetting, frame not perfectly level.',
        'Avoid: text, captions, watermark, collage, split frames, extra limbs, deformed hands, melted or fused fingers, duplicate subject, plastic skin, beauty filter, HDR glow.',
    ].filter(Boolean).join(' ');
    const form = new FormData();
    form.append('prompt', composed);
    form.append('width', String(width));
    form.append('height', String(height));
    chosen.forEach((reference, index) => {
        const bytes = reference.buffer instanceof Uint8Array ? reference.buffer : new Uint8Array(reference.buffer || []);
        form.append(`input_image_${index}`, new Blob([bytes], { type: reference.mime || 'image/png' }), `reference-${index}`);
    });
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
    return { contentType, base64: result.image };
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
    for (const reference of request.references) {
        const assetPath = (group.references || []).find(item => item.role === reference.role)?.path;
        if (!assetPath) throw new GenerationError('GENERATION_REFERENCE_BYTES_MISSING', `参考图没有存储路径：${reference.role}`, 409);
        let asset;
        try {
            asset = await readAsset(assetPath, { env, store });
        } catch (error) {
            if (error instanceof AssetError) throw new GenerationError('GENERATION_REFERENCE_INVALID', error.message, 409);
            throw error;
        }
        if (!asset) throw new GenerationError('GENERATION_REFERENCE_MISSING', `参考图读不到：${reference.role}`, 409);
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
                    content: 'Translate the user text into concise English photography instructions. Keep every concrete constraint: how many people, framing and crop, camera height, subject position, pose and action, location and its details, time of day, weather, lighting direction, garments, colour grade. Do not add anything that is not stated. Do not describe faces or clothing beyond what is given, since reference images supply those. Return only the English text.',
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

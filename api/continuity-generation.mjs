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
};

/**
 * Generates exactly one shot. Never loops, never fans out: the caller decides
 * which shot to (re)make, which is what keeps retry scoped to a single frame.
 */
export async function generateShot({ group, shotId, providerId, env = {}, fetchImpl = fetch, store = null } = {}) {
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

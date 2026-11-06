// Reference-asset storage for continuity groups.
//
// Three backends, in priority order, all behind one function:
//   R2  -> durable, production
//   KV  -> durable, small files only
//   mem -> per-isolate, DEV ONLY; we return durable:false so the UI can warn
//
// The asset id is content-addressed (sha256 prefix), so uploading the same photo
// twice yields the same id and the contract stays stable across reruns.

export const ASSET_LIMITS = {
    maxBytes: 8 * 1024 * 1024,
    mimes: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' },
};

export class AssetError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.name = 'AssetError';
        this.code = code;
        this.status = status;
    }
}

export function parseDataUrl(dataUrl) {
    if (typeof dataUrl !== 'string' || !dataUrl.trim()) throw new AssetError('ASSET_REQUIRED', '需要 dataUrl');
    const match = /^data:([a-z/+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
    if (!match) throw new AssetError('ASSET_FORMAT_INVALID', '只接受 data:<mime>;base64,<数据> 形式');
    const mime = match[1].toLowerCase();
    const extension = ASSET_LIMITS.mimes[mime];
    if (!extension) throw new AssetError('ASSET_TYPE_UNSUPPORTED', `只支持 JPEG/PNG/WebP，收到 ${mime}`, 415);
    const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
    if (!buffer.length) throw new AssetError('ASSET_EMPTY', '图片内容为空');
    if (buffer.length > ASSET_LIMITS.maxBytes) {
        throw new AssetError('ASSET_TOO_LARGE', `图片超过 ${Math.round(ASSET_LIMITS.maxBytes / 1024 / 1024)}MB`, 413);
    }
    return { mime, extension, buffer };
}

export function createMemoryStore() {
    const files = new Map();
    return {
        durable: false,
        async put(key, buffer, meta) { files.set(key, { buffer, meta }); },
        async get(key) { return files.get(key) || null; },
        get size() { return files.size; },
    };
}

async function sha256Hex(buffer) {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function resolveAssetStore(env = {}, fallbackStore = null) {
    const r2 = env.CONTINUITY_ASSETS;
    if (r2 && typeof r2.put === 'function') {
        return {
            durable: true,
            async put(key, buffer, meta) {
                await r2.put(key, buffer, { customMetadata: meta });
            },
            async get(key) {
                const object = await r2.get(key);
                if (!object) return null;
                const buffer = Buffer.from(await object.arrayBuffer());
                return { buffer, meta: object.customMetadata || {} };
            },
        };
    }
    const kv = env.CONTINUITY_KV;
    if (kv && typeof kv.put === 'function') {
        return {
            durable: true,
            async put(key, buffer, meta) {
                await kv.put(key, buffer.toString('base64'), { metadata: meta });
            },
            async get(key) {
                const encoded = await kv.get(key);
                if (!encoded) return null;
                return { buffer: Buffer.from(encoded, 'base64'), meta: {} };
            },
        };
    }
    return fallbackStore || createMemoryStore();
}

/**
 * Stores a reference image and returns a content-addressed asset descriptor.
 * @param {{ dataUrl: string, role?: string, env?: object, store?: object }} options
 */
export async function storeAsset({ dataUrl, role = 'misc', env = {}, store = null } = {}) {
    const { mime, extension, buffer } = parseDataUrl(dataUrl);
    const hash = await sha256Hex(buffer);
    const safeRole = ['identity', 'scene', 'style'].includes(role) ? role : 'misc';
    const key = `continuity/${safeRole}/${hash.slice(0, 16)}.${extension}`;
    const backend = store || resolveAssetStore(env);
    await backend.put(key, buffer, { mime, role: safeRole, bytes: String(buffer.length) });
    return {
        assetId: hash.slice(0, 16),
        path: `/api/continuity/asset/${hash.slice(0, 16)}`,
        key,
        mime,
        bytes: buffer.length,
        sha256: hash,
        durable: backend.durable === true,
        fetchedAt: new Date().toISOString(),
    };
}

export async function readAsset(assetPathOrKey, { env = {}, store = null } = {}) {
    const backend = store || resolveAssetStore(env);
    const clean = String(assetPathOrKey).replace(/^.*\/api\/continuity\/asset\//, '').replace(/^continuity\//, '');
    const id = clean.replace(/[^a-z0-9]/gi, '').slice(0, 16);
    if (id.length < 8) throw new AssetError('ASSET_ID_INVALID', '资产 ID 不合法');
    for (const extension of Object.values(ASSET_LIMITS.mimes)) {
        for (const role of ['identity', 'scene', 'style', 'misc']) {
            const found = await backend.get(`continuity/${role}/${id}.${extension}`);
            if (found) return { ...found, mime: found.meta?.mime || `image/${extension === 'jpg' ? 'jpeg' : extension}` };
        }
    }
    return null;
}

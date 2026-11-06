const ATLAS_SITE = 'https://hruiccc.github.io/RuiC-PoseAtlas/';
const ATLAS_REPOSITORY = 'https://github.com/HRuiCcc/RuiC-PoseAtlas';
const MAX_DATASET_BYTES = 2 * 1024 * 1024;
const CACHE_TTL_MS = 5 * 60 * 1000;
const RETRY_TTL_MS = 30 * 1000;
const FETCH_TIMEOUT_MS = 6000;
const caches = new WeakMap();

export const POSEATLAS_DATASETS = Object.freeze([
    { kind: 'pose', key: 'poses', url: `${ATLAS_SITE}data/poses.json` },
    { kind: 'costume', key: 'costumes', url: `${ATLAS_SITE}data/costumes.json` },
    { kind: 'portrait', key: 'images', url: `${ATLAS_SITE}data/faces.json` },
]);

const ANGLES = { front: '正面', diagonal: '斜侧', side: '侧面', high: '俯视', low: '仰视' };
const SEASONS = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季', party: '派对' };
const HAIRS = { short: '短发', medium: '中发', semilong: '中长发', long: '长发' };
const GROUPS = { dress: '连衣裙', skirt: '半身裙', outer: '外套', top: '上装', bottom: '下装', shoes: '鞋履', bag: '包袋', accessory: '配饰' };
const COLORS = { brown: '棕色', black: '黑色', white: '白色', red: '红色', blue: '蓝色', green: '绿色', beige: '米色', gray: '灰色', pink: '粉色' };
const WARDROBE_TERMS = { ribbon: '发带', knit: '针织', mini: '短款', dress: '连衣裙', tights: '连裤袜', suede: '麂皮', boots: '靴子', bag: '包袋', leather: '皮革', coat: '外套', shirt: '衬衫', skirt: '半身裙', shoes: '鞋履' };
const ALIASES = [
    ['坐姿', '坐着', '坐下', 'seated', 'sitting', 'sit'],
    ['站姿', '站立', '站着', 'standing', 'stance'],
    ['自然', '放松', 'natural', 'relaxed'],
    ['春季', '春天', 'spring'], ['夏季', '夏天', 'summer'],
    ['秋日', '秋季', '秋天', 'autumn', 'fall'], ['冬季', '冬天', 'winter'],
    ['棕色', '咖啡色', 'brown'], ['白色', 'white', 'ivory'], ['黑色', 'black'],
    ['针织', '毛衣', 'knit'], ['衬衫', 'shirt'], ['外套', 'coat', 'outer'],
    ['牛仔', 'denim'], ['连衣裙', 'dress'], ['半身裙', 'skirt'],
    ['中长发', 'semilong'], ['短发', 'short'], ['中发', 'medium'], ['长发', 'long'],
    ['正面', 'front'], ['斜侧', 'diagonal'], ['侧面', '侧拍', 'side'],
    ['俯视', '俯拍', 'high'], ['仰视', '仰拍', 'low'],
];

function text(value, limit = 120) {
    return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit) : '';
}

function normalized(value) {
    return String(value || '').normalize('NFKC').toLowerCase().trim();
}

function makeTemplate(kind, row) {
    if (!row || typeof row.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(row.id)) return null;
    const upstreamId = row.id;
    const wardrobeTitleParts = [SEASONS[text(row.cat, 48)] || '穿搭', GROUPS[text(row.group, 48)] || '造型', COLORS[text(row.color, 48)] || text(row.color, 48), WARDROBE_TERMS[text(row.main, 48)] || text(row.main, 48)].filter(Boolean);
    const wardrobeTitle = wardrobeTitleParts.join(' · ');
    const portraitTitle = [HAIRS[text(row.hair, 48)] || '', row.sec === 'styling' ? '妆发参考' : '人像参考'].filter(Boolean).join(' · ');
    const title = kind === 'pose'
        ? text(row.names?.zh || row.names?.en || row.names?.ja || upstreamId)
        : kind === 'costume' ? wardrobeTitle : portraitTitle;
    const category = text(kind === 'pose' ? row.category : row.group, 48);
    const series = text(row.series, 48);
    const season = text(row.cat, 48);
    const style = text(row.style);
    const section = text(row.sec, 48);
    const hair = text(row.hair, 48);
    const rawTags = kind === 'costume' && Array.isArray(row.tags) ? row.tags.slice(0, 24).map(tag => text(tag, 48)).filter(Boolean) : [];
    if (kind === 'portrait' && !['face', 'styling'].includes(section)) return null;
    const angles = kind === 'pose' && Array.isArray(row.variants)
        ? [...new Set(row.variants.map(variant => variant?.angle).filter(angle => Object.hasOwn(ANGLES, angle)))]
        : [];
    const metadataTokens = new Set(normalized([category, season, row.color, hair, ...rawTags, ...angles].join(' ')).split(/\s+/));
    const semanticTags = ALIASES.filter(words => words.some(word => metadataTokens.has(word))).map(words => words[0]);
    const tags = [...new Set([category, SEASONS[season], HAIRS[hair], ...semanticTags, ...rawTags].filter(Boolean))].slice(0, 24);
    const description = kind === 'pose'
        ? `${category || '人体姿势'}参考，可用角度${angles.map(angle => ANGLES[angle]).join('、') || '待核对'}。`
        : kind === 'costume'
            ? [...new Set(rawTags.map(tag => WARDROBE_TERMS[tag] || COLORS[tag] || tag).filter(tag => tag && !wardrobeTitleParts.includes(tag)))].slice(0, 8).join(' · ') || '原站搭配细节参考'
            : [style, section === 'styling' ? 'AI 造型参考' : 'AI 人像参考'].filter(Boolean).join(' · ');
    const page = kind === 'pose' ? '' : kind === 'costume' ? 'costume.html' : 'face.html';
    const hash = new URLSearchParams({ [kind === 'pose' ? 'pose' : kind === 'costume' ? 'costume' : 'portrait']: upstreamId });
    if (angles.length) hash.set('angle', angles.includes('front') ? 'front' : angles[0]);
    const sourceUrl = `${ATLAS_SITE}${page}?lang=zh#${hash}`;
    return {
        id: `atlas-${kind}-${upstreamId.toLowerCase()}`,
        upstreamId,
        sourceItemId: upstreamId,
        kind,
        title,
        description,
        tags,
        category,
        series,
        season,
        color: text(row.color, 48),
        section,
        hair,
        style,
        poseNumber: text(row.no, 48),
        angles,
        synthetic: true,
        asset: null,
        assetUrl: null,
        rightsStatus: 'external_reference',
        rights: { status: 'external_reference', evidence: `${ATLAS_REPOSITORY}/blob/main/LICENSE`, allowedUses: ['agent-reference'] },
        attribution: 'RuiC-PoseAtlas · 原始素材归各原作者所有',
        source: { type: 'poseatlas', url: sourceUrl, repository: ATLAS_REPOSITORY, itemId: upstreamId },
        sourceUrl,
        searchText: normalized([upstreamId, row.no, title, description, ...tags, ...Object.values(row.names || {}), series, season, category, row.color, hair, section, style, ...angles].join(' ')),
    };
}

export function normalizePoseAtlasDataset(kind, dataset) {
    const spec = POSEATLAS_DATASETS.find(item => item.kind === kind);
    const rows = spec && dataset?.[spec.key];
    if (!Array.isArray(rows) || rows.length > 5000) throw new Error('POSEATLAS_INVALID_DATASET');
    const ids = new Set();
    return rows.map(row => makeTemplate(kind, row)).filter(template => {
        if (!template || ids.has(template.id)) return false;
        ids.add(template.id);
        return true;
    });
}

export function searchPoseAtlasTemplates(templates, options = {}) {
    const { kind, query = '', category, angle, season, color, hair, section } = options;
    if (kind && !POSEATLAS_DATASETS.some(item => item.kind === kind)) throw new Error('POSEATLAS_INVALID_KIND');
    if (typeof query !== 'string' || query.length > 160) throw new Error('POSEATLAS_INVALID_QUERY');
    const requestedLimit = Number(options.limit ?? 6);
    const limit = Number.isInteger(requestedLimit) ? Math.min(6, Math.max(1, requestedLimit)) : 6;
    const q = normalized(query);
    const groups = ALIASES.filter(words => words.some(word => q.includes(word)));
    const tokens = q.split(/[^\p{L}\p{N}_-]+/u).filter(Boolean);
    const filters = { category, season, color, hair, section };
    const scored = templates.filter(template => {
        if (kind && template.kind !== kind) return false;
        if (angle && !template.angles.includes(angle)) return false;
        return Object.entries(filters).every(([key, value]) => !value || normalized(template[key]) === normalized(value));
    }).map(template => {
        const corpus = template.searchText;
        const score = groups.filter(words => words.some(word => corpus.includes(word))).length * 10
            + tokens.filter(token => corpus.includes(token)).length * 3
            + (q && corpus.includes(q) ? 20 : 0);
        return { template, score };
    }).filter(item => !q || item.score > 0);
    scored.sort((a, b) => b.score - a.score || a.template.id.localeCompare(b.template.id));
    return {
        total: scored.length,
        results: scored.slice(0, limit).map(({ template }) => {
            const { searchText, ...card } = template;
            return card;
        }),
        source: 'poseatlas-live',
    };
}

async function fetchDataset(spec, fetchImpl) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(new Error('POSEATLAS_TIMEOUT'));
        }, FETCH_TIMEOUT_MS);
    });
    try {
        return await Promise.race([timeout, (async () => {
            const response = await fetchImpl(spec.url, { signal: controller.signal, redirect: 'manual', headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error('POSEATLAS_UPSTREAM_UNAVAILABLE');
            if (Number(response.headers.get('content-length')) > MAX_DATASET_BYTES) throw new Error('POSEATLAS_DATASET_TOO_LARGE');
            const reader = response.body?.getReader();
            if (!reader) throw new Error('POSEATLAS_INVALID_RESPONSE');
            const chunks = [];
            let bytes = 0;
            while (true) {
                const chunk = await reader.read();
                if (chunk.done) break;
                bytes += chunk.value.byteLength;
                if (bytes > MAX_DATASET_BYTES) {
                    await reader.cancel();
                    throw new Error('POSEATLAS_DATASET_TOO_LARGE');
                }
                chunks.push(chunk.value);
            }
            const buffer = new Uint8Array(bytes);
            let offset = 0;
            for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
            return normalizePoseAtlasDataset(spec.kind, JSON.parse(new TextDecoder().decode(buffer)));
        })()]);
    } finally {
        clearTimeout(timer);
        controller.abort();
    }
}

export async function loadPoseAtlasCatalog({ fetchImpl = fetch, now = Date.now() } = {}) {
    const cached = caches.get(fetchImpl);
    if (cached?.value && cached.expiresAt > now) return { ...cached.value, externalRequests: 0, cacheStatus: 'hit' };
    if (cached?.pending) return { ...await cached.pending, externalRequests: 0, cacheStatus: 'shared' };
    const entry = { value: null, expiresAt: 0, pending: null };
    caches.set(fetchImpl, entry);
    entry.pending = (async () => {
        const responses = await Promise.allSettled(POSEATLAS_DATASETS.map(spec => fetchDataset(spec, fetchImpl)));
        const loaded = responses.filter(result => result.status === 'fulfilled');
        const status = loaded.length === POSEATLAS_DATASETS.length ? 'ready' : loaded.length ? 'partial' : 'unavailable';
        const value = {
            templates: loaded.flatMap(result => result.value),
            source: { type: 'poseatlas', url: ATLAS_SITE, repository: ATLAS_REPOSITORY, fetchedAt: new Date(now).toISOString() },
            status,
            datasetStatus: Object.fromEntries(responses.map((result, index) => [POSEATLAS_DATASETS[index].kind, result.status === 'fulfilled' ? 'ready' : 'unavailable'])),
            externalRequests: POSEATLAS_DATASETS.length,
            cacheStatus: 'miss',
        };
        entry.value = value;
        entry.expiresAt = now + (status === 'ready' ? CACHE_TTL_MS : RETRY_TTL_MS);
        return value;
    })();
    try { return await entry.pending; }
    finally { entry.pending = null; }
}

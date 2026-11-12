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
import { pickLightKit } from './light-kit.mjs';
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
    'modelscope-qwen-edit': 'modelscope-qwen-edit',
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



// Framing as a composition instruction, not a label. "medium-close-up" left the
// model to invent the crop, which is why every frame came back filling the
// height with a full standing figure. These say exactly where the frame edge
// falls and how much space to leave.

// The assembled direction text, exported so tools can compose a frame with the
// text-to-image model using exactly the same wording the edit models receive.
// Two implementations of this used to drift apart; there is only one now.
// One person, stated once and reused by every prompt builder. A plan line like
// "人物停在下一层内侧踏步" was read as two positions and produced the same person
// twice in one frame: a valid photograph that fails the shoot.
// Phrased as a requirement first, an exclusion second. Written as "only one
// person is allowed", the model dropped the subject entirely and returned an empty
// staircase - a constraint about absence invites absence.
const RULE_ONE_PERSON = '画面中必须有一个人，而且只有一个人：人物清楚可见、是画面主体；不要出现第二个人，不要复制、镜像或添加倒影。';
function subjectCountHint(locked = {}, prompt = '') {
    const brief = `${locked.people || ''} ${locked.subject || ''} ${prompt || ''}`;
    const explicit = String(locked.people || '').trim().match(/^(\d{1,3}|[一二两三四五六七八九十]+)(?:位|名|个|人)?$/);
    const chinese = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    if (explicit) return /^\d+$/.test(explicit[1]) ? Number(explicit[1]) : (chinese[explicit[1]] || 1);
    if (/双人|两人|二人|情侣|夫妻|伴侣|闺蜜|多人|couple|duo|two[- ]people|two[- ]person/i.test(brief)) return 2;
    const count = brief.match(/(?:^|[^\d])([2-9]|[一二两三四五六七八九十])\s*(?:位|名|个|人)/);
    if (!count) return 1;
    return /^\d+$/.test(count[1]) ? Number(count[1]) : (chinese[count[1]] || 1);
}

function subjectRule(locked, prompt) {
    const count = subjectCountHint(locked, prompt);
    return count > 1
        ? `画面中必须有${count}位人物，人数与人物关系严格按照拍摄需求；不要复制、镜像或添加倒影。`
        : RULE_ONE_PERSON;
}

// Aesthetic-banned words, from the plan-quality-lab de-AI diagnosis
// (prompt-packs/2026-10-27-deepseek/07-AI味诊断与去AI化方案.md). Each one
// measurably pushes the model toward render-look output: flat light, polished
// skin, staged sets. "Photorealistic photograph" used to open every FLUX prompt
// here - it is the first entry on the lab's banned list.
const BANNED_AESTHETIC_WORDS = [
    'photorealistic', '8k', 'ultra detailed', 'masterpiece', 'award winning',
    'hyperrealistic', 'perfect skin', 'cinematic lighting', 'dreamy', 'ethereal',
    'studio backdrop', 'hdr', 'glow', 'flawless',
];

export function stripBannedWords(text) {
    let out = String(text || '');
    for (const word of BANNED_AESTHETIC_WORDS) {
        const phrase = word.replace(/ /g, '\\s+');
        out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}_])${phrase}(?=$|[^\\p{L}\\p{N}_])[,.;:]?`, 'giu'), '$1');
    }
    return out.replace(/,\s*,+/g, ',').replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
}

// The realism lock from the lab pack (PROMPTS-TEXTURE.md). Its three laws:
// film stock beats any adjective, light must be uneven, the venue must be a
// little dirty. Stated as physical constraints rather than adjectives.
export function realismTextZh(film = 'Kodak Portra 400') {
    return `真实感：这是一张真实拍摄的 ${film} 胶片照片，不是渲染图；胶片颗粒与高光过渡自然；光衰减真实，背光一侧真正暗下去，暗部不被提亮；场景有使用痕迹（磨损、水渍、灰尘），皮肤有毛孔与细小绒毛，不做磨皮、不像影棚布景。`;
}

export function directionText({ prompt, locked, variant, poseRef, size }) {
    const framed = { ...variant, size: size || variant?.size };
    const film = directive(locked?.filmStock) || directive(variant?.filmStock) || 'Kodak Portra 400';
    const fields = directionFields({ prompt, locked, variant: framed, poseRef, framing: framingZh(framed), film });
    const body = fields.map(([key, value]) => `${FIELD_LABELS_ZH[key] || key}：${value}`).join('\n');
    // Stated as a rule rather than left implicit. Without it, a plan line like
    // "人物停在下一层内侧踏步" was read as two positions and produced the same
    // person twice in one frame - a real photograph that fails the shoot.
    return `${body}\n${subjectRule(locked, prompt)}`;
}

// One field list shared by every adapter.
//
// This exists because the Cloudflare adapter and the Seedream adapter each built
// their own prompt and drifted: Seedream silently lost the framing instruction,
// so every frame came back as a full standing figure filling the frame. Adding a
// field here now reaches both.
function directionFields({ prompt, locked, variant, poseRef, framing, film }) {
    return [
        // Framing first, deliberately. Measured: when the picture description ran
        // first, a shot asking for waist-up came back full body - the prose
        // describes walking down stairs, and the model satisfies the action by
        // widening the frame. Putting the crop ahead of the prose is the only
        // ordering that moved the result upward.
        ['framing', framing],
        ['prompt', poseInFrame(prompt, variant?.size)],
        ['subject', locked?.subject],
        ['wardrobeGroup', directive(locked?.wardrobe)],
        ['style', locked?.styleProfile],
        ['location', variant?.scene || locked?.location],
        ['weather', locked?.weather],
        ['timeOfDay', locked?.timeOfDay],
        // The realism lock runs right after the scene fields so the film stock
        // anchors every concrete description that follows it.
        ['realism', realismTextZh(film)],
        ['pose', poseRef?.title ? `摆姿库姿势：${poseRef.title}${poseRef.angle ? `（参考角度 ${poseRef.angle}）` : ''}` : ''],
        ['poseDirection', poseRef?.direction],
        ['action', poseInFrame(variant?.action, variant?.size)],
        ['camera', variant?.camera],
        ['lens', variant?.lens],
        ['placement', variant?.subjectPlacement],
        // A plan that names its lighting keeps it; one that does not inherits a
        // structured kit entry matched by time of day, location and weather -
        // distilled from the lab briefs that were actually run. Without this,
        // unlit plans came back flat and evenly bright.
        ['lighting', directive(variant?.lighting) || pickLightKit({
            timeOfDay: locked?.timeOfDay || variant?.timeOfDay,
            location: variant?.scene || locked?.location || variant?.location,
            weather: locked?.weather || variant?.weather,
            mood: locked?.mood,
        }).light],
        ['wardrobeShot', directive(variant?.wardrobe)],
        ['props', directive(variant?.props)],
        // The plan's crop_boundary often describes a different framing than
        // shot_size ("头顶到膝盖入画" on an MCU shot). Passing both hands the
        // model two contradictory crops, and it resolves them by going wider, so
        // the clauses that fall outside this frame are dropped the same way.
        ['crop', poseInFrame(directive(variant?.crop), variant?.size)],
        ['mustShow', variant?.mustShow],
        ['rejectIf', variant?.rejectIf],
    ].filter(([, value]) => typeof value === 'string' && value.trim());
}

const FIELD_LABELS_ZH = {
    prompt: '画面', subject: '人物', wardrobeGroup: '全组服装', style: '风格',
    location: '场景', weather: '天气', timeOfDay: '时间', framing: '取景',
    realism: '真实感',
    pose: '姿势', poseDirection: '摆姿指导', action: '动作', camera: '机位',
    lens: '焦段', placement: '构图位置', lighting: '光线', wardrobeShot: '服装',
    props: '道具', crop: '裁切', mustShow: '必须出现', rejectIf: '不得出现',
};

// Framing is stated as where the frame edge CUTS, because that is the part the
// model obeys. "半身近景，不拍到手" produced full-body frames; "画框下沿切在腰部
// 偏上，腰部以下完全不在画面内" produced the requested crop in testing. Naming
// what is absent is weaker than stating the cut.
const FRAMING_ZH = {
    ECU: '极特写：画框只包含脸部局部（眼睛或嘴唇），额头与下巴被画框切掉，脸占画面八成以上',
    CU: '特写：画框下沿切在锁骨下方，胸口以下完全不在画面内，画面里只有头部、颈部和肩，不出现手臂、不出现手',
    MCU: '近景半身：画框下沿切在胸部，胸部以下完全不在画面内，画面里只有头部到胸前，不出现腰、腿、脚，人物占画面高度七成以上',
    MS: '中景腰上人像：只显示头部、肩膀、胸部和上腹，画框必须在自然腰线结束；绝不出现裙子、胯部、腿、膝盖、靴子或脚；禁止全身照、七分身照和远景，必要时裁掉手肘以下，人物占画面高度约七成',
    MFS: '中全景：画框下沿切在膝盖上方，膝盖以下完全不在画面内，人物占画面高度约八成',
    FS: '全身：从头到脚完整入画，头顶留约十分之一空间，脚下地面露出，人物不要顶到画框上下边缘',
    WS: '全景：人物只占画面高度的三分之一到二分之一，环境与建筑是主体，人物明显小于画框',
    EWS: '远景：人物很小，占画面高度不足五分之一，以空间、建筑和光线为主',
};

// Body parts that cannot appear once the frame cuts higher up. The plan's pose
// text often describes them anyway ("单脚踩在下一级踏步，另一脚在后"), and the
// model resolves that conflict by widening the frame - which is exactly how every
// tight shot became a full-body shot. Those clauses are dropped, not summarised.
const OFF_FRAME = {
    ECU: /手|臂|肩|胸|腰|腹|腿|膝|脚|踝|站立|行走|下行|上行|踏步|扶|踩|full[- ]body|hands?|arms?|shoulders?|chest|waist|abdomen|legs?|knees?|feet|shoes?|standing|walking|stairs?|ground|stepping/i,
    CU: /手|臂|胸|腰|腹|腿|膝|脚|踝|踏步|地面|踩|站立|hands?|arms?|chest|waist|abdomen|legs?|knees?|feet|shoes?|stairs?|ground|stepping|full[- ]body/i,
    MCU: /腰|腹|腿|膝|脚|踝|踏步|地面|踩|下行|上行|waist|abdomen|legs?|knees?|feet|shoes?|stairs?|ground|full[- ]body/i,
    MS: /腿|膝|脚|踝|踏步|地面|踩/,
    MFS: /地面|踏步|踩/,
};

function visibleFrame(size) {
    return String(size || '').trim().toUpperCase();
}

function isWaistUp(variant = {}) {
    return /^(MS|中景|MEDIUM)$/i.test(String(variant.size || variant.shotType || '').trim());
}

function wardrobeVisibleInFrame(value, variant = {}) {
    const text = directive(value);
    if (!isWaistUp(variant) || !text) return text;
    return text.split(/(?<=[，,；;。])/)
        .filter(part => !/(裙|裤|靴|鞋|袜|下装|skirt|trousers|pants|boots|shoes|socks|lower[- ]body)/i.test(part))
        .join('');
}

function promptVisibleInFrame(prompt, variant = {}) {
    const text = typeof prompt === 'string' ? prompt : '';
    if (!isWaistUp(variant)) return text;
    const upperWardrobe = wardrobeVisibleInFrame(text.match(/Subject and clothing:\s*(.*?)\. User constraints:/is)?.[1], variant);
    if (!upperWardrobe) return text;
    return text.replace(/Subject and clothing:\s*.*?\. User constraints:/is, `Subject and clothing: ${upperWardrobe}. User constraints:`);
}

// Keep the clauses of the pose that still make sense inside the frame.
function poseInFrame(pose, size) {
    const raw = typeof pose === 'string' ? pose.trim() : '';
    if (!raw) return '';
    const pattern = OFF_FRAME[visibleFrame(size)];
    if (!pattern) return raw;
    const kept = raw.split(/[，,；;。.!?]+/).map(part => part.trim()).filter(Boolean)
        .filter(part => !pattern.test(part));
    // If nothing survives the crop, say so rather than falling back to the whole
    // pose: a pose that only exists below the frame has no bearing on the picture.
    return kept.join('，');
}

function detailFrameTarget(variant = {}) {
    const text = [variant.prompt, variant.action, variant.crop, variant.mustShow, variant.wardrobe]
        .filter(value => typeof value === 'string').join(' ');
    if (/服装细节|衣物细节|衣料|织物|面料|服饰纹理|garment detail|fabric detail|textile detail|fabric texture/i.test(text)) return '指定服装或面料细节';
    if (/手部细节|手指细节|hand detail|hands close[- ]?up|finger detail/i.test(text)) return '指定手部细节';
    if (/配饰细节|首饰细节|accessory detail|jewelry detail|jewellery detail/i.test(text)) return '指定配饰细节';
    return '';
}

function framingZh(variant) {
    const code = String(variant?.size || '').trim().toUpperCase();
    const detailTarget = detailFrameTarget(variant);
    if (detailTarget && ['ECU', 'CU'].includes(code)) return `细节特写：画框集中在${detailTarget}，保留真实材质和局部形态，不强行让脸占满画面`;
    if (FRAMING_ZH[code]) return FRAMING_ZH[code];
    const raw = String(variant?.shotType || '');
    if (/特写|close/i.test(raw) && /中|medium/i.test(raw)) return FRAMING_ZH.MCU;
    if (/特写|close/i.test(raw)) return FRAMING_ZH.CU;
    if (/全身|full/i.test(raw)) return FRAMING_ZH.FS;
    if (/全景|wide/i.test(raw)) return FRAMING_ZH.WS;
    if (/中景|medium/i.test(raw)) return FRAMING_ZH.MS;
    return '';
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

    // Same field list the Cloudflare adapter draws from, so a field can no
    // longer reach one provider and silently miss another.
    const fields = directionFields({ prompt, locked, variant, poseRef, framing: framingZh(variant) });
    const direction = [
        ...fields.map(([key, value]) => `${FIELD_LABELS_ZH[key] || key}：${value}`),
        '同一组保持参考人物的脸、年龄、发型与身份；服装只按衣装参考，不增添其他单品。',
        '每次只改变本镜要求的动作、机位与场景。',
        // The complaint that produced this line: every frame filled the height
        // with a standing figure. Say the crop out loud.
        '不要让人物顶到画框上下边缘；人物在画面中的大小必须服从上面的取景要求。',
    ].join('\n');

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



// Two-phase ModelScope helpers.
//
// The model takes 20-40s. A synchronous handler behind the Pages proxy dies at
// 30s, so the work is split: submit() returns a task id immediately, and a
// separate poll() call collects the result. Each HTTP request then finishes in
// a couple of seconds.
export async function submitModelScope({ env, prompt, size, seed, references, variant, poseRef, anchor, locked, store = null, fetchImpl = fetch }) {
    const token = env?.MODELSCOPE_TOKEN;
    if (!token) throw new GenerationError('GENERATION_NOT_CONFIGURED', '缺少魔搭 MODELSCOPE_TOKEN', 503, { missing: ['MODELSCOPE_TOKEN'] });
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const images = [];
    if (anchor?.assetId) {
        const stored = await readAsset(`/api/continuity/asset/${anchor.assetId}`, { env, store });
        if (!stored?.buffer?.length) throw new GenerationError('GENERATION_ANCHOR_MISSING', '已锁定的母图读不到', 409);
        images.push(dataUrlFor(stored.buffer, stored.mime));
    }
    const waistUp = isWaistUp(variant);
    for (const reference of references) {
        if (waistUp && reference.role === 'style') continue;
        images.push(reference.dataUrl);
    }
    if (poseRef && !waistUp) {
        if (!poseRef.imageUrl) throw new GenerationError('GENERATION_REFERENCE_MISSING', '已选择 PoseAtlas 姿势，但没有可用的姿势参考图', 409);
        const poseImage = await fetchLibraryImage(poseRef.imageUrl, fetchImpl);
        if (!poseImage) throw new GenerationError('GENERATION_REFERENCE_MISSING', 'PoseAtlas 姿势参考图无法读取；已停止生成，没有退化为纯文字姿势', 409);
        images.push(dataUrlFor(poseImage.bytes, poseImage.mime));
    }
    const frameLocked = waistUp ? { ...locked, subject: wardrobeVisibleInFrame(locked?.subject, variant), wardrobe: wardrobeVisibleInFrame(locked?.wardrobe, variant) } : locked;
    const framePrompt = promptVisibleInFrame(prompt, variant);
    const fields = directionFields({ prompt: framePrompt, locked: frameLocked, variant, poseRef, framing: framingZh(variant) });
    const direction = [
        ...fields.map(([key, value]) => `${FIELD_LABELS_ZH[key] || key}：${value}`),
        ...(poseRef?.imageUrl && !waistUp ? ['最后一张参考图来自摆姿库，只参考身体动作、肢体关系和重心；不要复制线稿、参考图中的脸、服装、背景、文字或标记。'] : []),
        subjectRule(frameLocked, framePrompt),
    ].join('\n');

    const response = await fetchImpl(MODELSCOPE_ENDPOINT, {
        method: 'POST',
        headers: { ...headers, 'X-ModelScope-Async-Mode': 'true' },
        body: JSON.stringify({
            model: MODELSCOPE_MODEL,
            prompt: direction,
            ...(size ? { size } : {}),
            ...(images.length ? { image_url: images } : {}),
            ...(Number.isSafeInteger(seed) ? { seed } : {}),
        }),
        signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        // 403 on this endpoint is never "bad request": it is ModelScope's
        // account gate, and the two gates say different things. Reporting them
        // separately means the fix is a link, not a debugging session.
        if (response.status === 403) {
            const message = /bind your Alibaba Cloud account/i.test(detail)
                ? '魔搭要求先绑定阿里云账号：https://modelscope.cn/my/settings/account'
                : /email verification|verified accounts/i.test(detail)
                    ? '魔搭要求先完成邮箱验证：https://modelscope.cn/my/settings/account'
                    : `魔搭拒绝访问（403）：${detail.slice(0, 160)}`;
            throw new GenerationError('GENERATION_ACCOUNT_UNVERIFIED', message, 403, { console: 'https://modelscope.cn/my/settings/account' });
        }
        throw new GenerationError('GENERATION_UPSTREAM_FAILED', `魔搭提交返回 ${response.status}：${detail.slice(0, 200)}`, response.status === 429 ? 429 : 502);
    }
    const payload = await response.json().catch(() => null);
    const taskId = payload?.task_id || payload?.data?.task_id;
    if (!taskId) throw new GenerationError('GENERATION_INVALID_RESPONSE', '魔搭没有返回 task_id', 502);
    return { taskId, prompt: direction, referencesSent: images.length };
}

export async function pollModelScope({ env, taskId, fetchImpl = fetch }) {
    const token = env?.MODELSCOPE_TOKEN;
    if (!token) throw new GenerationError('GENERATION_NOT_CONFIGURED', '缺少魔搭 MODELSCOPE_TOKEN', 503, { missing: ['MODELSCOPE_TOKEN'] });
    if (typeof taskId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(taskId)) {
        throw new GenerationError('GENERATION_TASK_ID_INVALID', '魔搭任务编号无效', 400);
    }
    let response;
    try {
        response = await fetchImpl(MODELSCOPE_TASK + taskId, {
            headers: { Authorization: `Bearer ${token}`, 'X-ModelScope-Task-Type': 'image_generation' },
            // The Pages proxy cuts off at 30s. Give slow ModelScope task reads
            // more room than the previous 20s while keeping a safe margin.
            signal: AbortSignal.timeout(25000),
        });
    } catch {
        throw new GenerationError('GENERATION_POLL_RETRYABLE', '暂时无法查询魔搭任务，请稍后继续查询同一任务', 503);
    }
    if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
            throw new GenerationError('GENERATION_POLL_RETRYABLE', `魔搭暂时无法查询任务（HTTP ${response.status}），请稍后继续查询同一任务`, 503);
        }
        throw new GenerationError('GENERATION_UPSTREAM_FAILED', `魔搭查询返回 ${response.status}`, 502);
    }
    const state = await response.json().catch(() => null);
    // ModelScope answers with "SUCCEED", not "SUCCEEDED". Matching only the
    // longer spelling meant a finished task read as pending forever, and the
    // caller timed out while the image sat on the server.
    const status = String(state?.task_status || '').toUpperCase();
    if (status === 'FAILED' || status === 'CANCELED' || status === 'CANCELLED') {
        throw new GenerationError('GENERATION_UPSTREAM_FAILED', `魔搭任务失败：${String(state?.errors?.message || state?.message || '').slice(0, 200)}`, 502);
    }
    if (status !== 'SUCCEED' && status !== 'SUCCEEDED' && status !== 'SUCCESS') {
        return { status: 'pending', upstream: status || 'PENDING' };
    }
    const url = state?.output_images?.[0] || state?.data?.[0]?.url;
    if (!url) throw new GenerationError('GENERATION_INVALID_RESPONSE', '魔搭任务成功但没有图片地址', 502);
    let image;
    try {
        image = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
    } catch {
        throw new GenerationError('GENERATION_POLL_RETRYABLE', '暂时无法下载魔搭结果，请稍后继续查询同一任务', 503);
    }
    if (image.status === 429 || image.status >= 500) {
        throw new GenerationError('GENERATION_POLL_RETRYABLE', `暂时无法下载魔搭结果（HTTP ${image.status}），请稍后继续查询同一任务`, 503);
    }
    if (!image.ok) throw new GenerationError('GENERATION_INVALID_RESPONSE', '下载魔搭结果失败', 502);
    const bytes = new Uint8Array(await image.arrayBuffer());
    return {
        status: 'succeeded',
        contentType: image.headers.get('content-type')?.split(';')[0] || 'image/png',
        base64: Buffer.from(bytes).toString('base64'),
    };
}

// ModelScope (魔搭) · Qwen-Image-Edit adapter.
//
// The only option found that satisfies all four requirements at once:
//   1. cheap enough to test at volume - 2000 free calls/day after real-name
//      verification, i.e. zero marginal cost for our whole test cycle
//   2. takes reference images - Qwen-Image-Edit accepts an image_url ARRAY, so
//      face + outfit + pose can all be supplied
//   3. reachable from mainland China without a proxy
//   4. OpenAI-compatible shape, so it drops into this adapter layer
//
// It is asynchronous: the POST returns a task id and the result has to be polled.
const MODELSCOPE_ENDPOINT = 'https://api-inference.modelscope.cn/v1/images/generations';
const MODELSCOPE_TASK = 'https://api-inference.modelscope.cn/v1/tasks/';
const MODELSCOPE_MODEL = 'Qwen/Qwen-Image-Edit-2511';

async function callModelScope({ env, prompt, size, seed, references, variant, poseRef, anchor, locked, store = null, fetchImpl = fetch }) {
    const token = env?.MODELSCOPE_TOKEN;
    if (!token) {
        throw new GenerationError('GENERATION_NOT_CONFIGURED', '缺少魔搭 MODELSCOPE_TOKEN（实名后每日 2000 次免费）', 503, { missing: ['MODELSCOPE_TOKEN'] });
    }
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // Reference images, anchor first: this model conditions on them directly,
    // which is why it can hold a face where the Cloudflare brush cannot.
    const images = [];
    if (anchor?.assetId) {
        const stored = await readAsset(`/api/continuity/asset/${anchor.assetId}`, { env, store });
        if (!stored?.buffer?.length) throw new GenerationError('GENERATION_ANCHOR_MISSING', '已锁定的母图读不到；停止生成，不能退回无母图请求', 409);
        images.push(dataUrlFor(stored.buffer, stored.mime));
    }
    const waistUp = isWaistUp(variant);
    for (const reference of references) {
        // The selected AUT-0118 library image contains a bag and necklace that
        // conflict with the locked wardrobe contract. Waist-up shots use its
        // already-compiled text description instead of copying those props.
        if (waistUp && reference.role === 'style') continue;
        images.push(reference.dataUrl);
    }
    // Full-body PoseAtlas line art repeatedly overrode the waist-up crop in
    // production. Keep the selected pose's title and direction in the prompt,
    // but do not send its full-body image for a waist-up frame.
    if (poseRef && !waistUp) {
        if (!poseRef.imageUrl) throw new GenerationError('GENERATION_REFERENCE_MISSING', '已选择 PoseAtlas 姿势，但没有可用的姿势参考图', 409);
        const poseImage = await fetchLibraryImage(poseRef.imageUrl, fetchImpl);
        if (!poseImage) throw new GenerationError('GENERATION_REFERENCE_MISSING', 'PoseAtlas 姿势参考图无法读取；已停止生成，没有退化为纯文字姿势', 409);
        images.push(dataUrlFor(poseImage.bytes, poseImage.mime));
    }

    const frameLocked = waistUp ? { ...locked, subject: wardrobeVisibleInFrame(locked?.subject, variant), wardrobe: wardrobeVisibleInFrame(locked?.wardrobe, variant) } : locked;
    const framePrompt = promptVisibleInFrame(prompt, variant);
    const fields = directionFields({ prompt: framePrompt, locked: frameLocked, variant, poseRef, framing: framingZh(variant) });
    const direction = [
        ...fields.map(([key, value]) => `${FIELD_LABELS_ZH[key] || key}：${value}`),
        ...(poseRef?.imageUrl && !waistUp ? ['最后一张参考图来自摆姿库，只参考身体动作、肢体关系和重心；不要复制线稿、参考图中的脸、服装、背景、文字或标记。'] : []),
        subjectRule(frameLocked, framePrompt),
    ].join('\n');

    const submit = await fetchImpl(MODELSCOPE_ENDPOINT, {
        method: 'POST',
        headers: { ...headers, 'X-ModelScope-Async-Mode': 'true' },
        body: JSON.stringify({
            model: MODELSCOPE_MODEL,
            prompt: direction,
            ...(images.length ? { image_url: images } : {}),
            ...(Number.isSafeInteger(seed) ? { seed } : {}),
        }),
        signal: AbortSignal.timeout(60000),
    }).catch(error => {
        throw new GenerationError('GENERATION_UPSTREAM_FAILED', `魔搭提交失败：${String(error?.message || error).slice(0, 160)}`, 502);
    });

    if (!submit.ok) {
        const detail = await submit.text().catch(() => '');
        throw new GenerationError('GENERATION_UPSTREAM_FAILED', `魔搭返回 ${submit.status}：${detail.slice(0, 200)}`, submit.status === 429 ? 429 : 502);
    }
    const submitted = await submit.json().catch(() => null);
    const taskId = submitted?.task_id || submitted?.data?.task_id;
    if (!taskId) throw new GenerationError('GENERATION_INVALID_RESPONSE', '魔搭没有返回 task_id', 502);

    // Poll. The image model takes 10-25s; the loop is bounded so the request
    // cannot hang past the Pages Function 30s ceiling.
    // Measured: one frame takes ~85s on this model.
    const deadline = Date.now() + 240000;
    while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        const poll = await fetchImpl(MODELSCOPE_TASK + taskId, {
            headers: { ...headers, 'X-ModelScope-Task-Type': 'image_generation' },
            signal: AbortSignal.timeout(20000),
        }).catch(() => null);
        if (!poll?.ok) continue;
        const state = await poll.json().catch(() => null);
        const status = String(state?.task_status || '').toUpperCase();
        if (status === 'SUCCEED' || status === 'SUCCEEDED' || status === 'SUCCESS') {
            const url = state?.output_images?.[0] || state?.data?.[0]?.url;
            if (!url) throw new GenerationError('GENERATION_INVALID_RESPONSE', '魔搭任务成功但没有图片地址', 502);
            const imageResponse = await fetchImpl(url, { signal: AbortSignal.timeout(60000) });
            if (!imageResponse.ok) throw new GenerationError('GENERATION_INVALID_RESPONSE', '下载魔搭结果失败', 502);
            const bytes = new Uint8Array(await imageResponse.arrayBuffer());
            return {
                contentType: imageResponse.headers.get('content-type')?.split(';')[0] || 'image/png',
                base64: Buffer.from(bytes).toString('base64'),
                prompt: direction,
                referencesSent: images.length,
                anchored: Boolean(anchor?.assetId),
            };
        }
        if (status === 'FAILED' || status === 'CANCELED' || status === 'CANCELLED') {
            throw new GenerationError('GENERATION_UPSTREAM_FAILED', `魔搭任务失败：${String(state?.errors?.message || state?.message || '').slice(0, 200)}`, 502);
        }
    }
    throw new GenerationError('GENERATION_UPSTREAM_FAILED', '魔搭任务超时未完成', 504);
}

const ADAPTERS = {
    'openai-images-edits': callOpenAiEdits,
    'reference-json': callReferenceJson,
    'cloudflare-workers-ai': callCloudflareWorkersAi,
    'volcengine-seedream': callSeedream,
    'modelscope-qwen-edit': callModelScope,
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
        clamp(poseInFrame(prompt, variant?.size), 220),
        locked?.subject ? `人物范围：${clamp(locked.subject, 80)}` : '',
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
        directive(variant?.wardrobe) ? `本镜服装：${clamp(directive(variant.wardrobe), 70)}` : '',
        variant?.camera ? `机位：${clamp(variant.camera, 26)}` : '',
        variant?.lens ? `焦段：${clamp(variant.lens, 18)}` : '',
        variant?.subjectPlacement ? `人物在画面中的位置：${clamp(variant.subjectPlacement, 40)}` : '',
        // The plan names the light. Not sending it is why frames came back with
        // generic studio lighting no matter what the shot called for.
        directive(variant?.lighting) ? `现场光线：${clamp(directive(variant.lighting), 80)}` : (pickLightKit({
            timeOfDay: locked?.timeOfDay, location: locked?.location, weather: locked?.weather,
        }).light),
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
    // line drawings. The selected pose is already included in the translated
    // direction above, so don't append its untranslated title afterward.
    const poseBytes = null;
    // The prompt budget matters: FLUX.2 klein states a ~512 token cap and that
    // longer prompts degrade rather than truncate cleanly. The version below runs
    // ~400 tokens so nothing important falls off the end.
    const composed = [
        // Opens with the realism lock, never with "photorealistic" - that word is
        // the first entry on the lab pack's banned list and pushes toward the
        // flat-lit render look this pipeline existed to escape.
        'Real photograph, real optical light falloff, the unlit side genuinely dark, venue shows wear, visible skin pores, no retouching. Follow the subject brief for who appears in the frame; do not add people.',
        anchorBuffer
            ? 'Image 1 is the accepted frame from this shoot. Preserve established identity and group-wide wardrobe continuity except where the current shot contract specifies a change. Follow that contract for pose, action, scene, lighting, camera and framing. Image 2 is the approved visual-style reference.'
            : 'Image 1 supplies the identity reference; Image 2 is the approved visual-style reference.',
        direction ? `Shot: ${stripBannedWords(direction)}.` : '',
        directive(variant?.mustShow) ? `Must contain: ${shortList(variant.mustShow)}.` : '',
        directive(variant?.rejectIf) ? `Redo if: ${shortList(variant.rejectIf)}.` : '',
        framingLine(variant),
        depthOfField(variant?.cameraSettings),
        'Natural skin texture and camera-like tonal transitions; preserve the face from the identity reference without beauty-filter smoothing.',
        'Avoid excessive smoothing, waxy skin, over-sharpening, HDR glow, text, watermark, collage, extra limbs and malformed hands.',
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
export async function generateShot({ group, shotId, providerId = '', env = {}, fetchImpl = fetch, store = null, submitOnly = false, attempt = 0 } = {}) {
    // Fall back to the provider pinned on the contract, so the shoot keeps using
    // the brush it was approved with.
    providerId = providerId || group?.imageProvider || '';
    if (!shotId) throw new ContinuityError('CONTINUITY_SHOT_REQUIRED', '需要镜头 ID', 400);
    if (!(group?.shots || []).some(shot => shot.shotId === shotId)) {
        throw new ContinuityError('CONTINUITY_SHOT_UNKNOWN', `没有这个镜头：${shotId}`, 404);
    }
    // Gate first: references confirmed, master human-confirmed, provider capable.
    const requests = buildShotRequests(group, { providerId, shotIds: [shotId], seedBase: 428193 + Math.max(0, Math.min(2, Number(attempt) || 0)) * 10000 });
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

    const aspectSizes = {
        '1:1': '1328x1328', '16:9': '1664x928', '9:16': '928x1664',
        '4:3': '1472x1140', '3:4': '1140x1472', '3:2': '1584x1056', '2:3': '1056x1584',
    };
    const size = isWaistUp(request.variant)
        ? aspectSizes['3:4']
        : aspectSizes[request.aspect] || '1056x1584';

    // Async provider: hand the work off and return immediately. A 20-40s
    // generation cannot be held open behind the Pages proxy (30s ceiling).
    if (submitOnly && providerId === 'modelscope-qwen-edit') {
        const submitted = await submitModelScope({
            env, prompt: request.prompt, size, seed: request.seed, references,
            variant: request.variant,
            poseRef: (group.shots || []).find(shot => shot.shotId === shotId)?.poseRef || null,
            anchor: request.anchor, locked: request.locked, store, fetchImpl,
        });
        return {
            shotId, provider: providerId, status: 'pending', taskId: submitted.taskId,
            referencesSent: submitted.referencesSent, sentPrompt: submitted.prompt,
            lockedHash: request.lockedHash, qc: { verdict: 'pending' },
        };
    }

    const wide = String(request.aspect || '').startsWith('3:2');
    const synchronousSize = wide ? '1536x1024' : '1024x1536';
    const image = await adapter({
        env, fetchImpl, prompt: request.prompt, size: synchronousSize,
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
                    content: 'Translate the user text into concise English photography instructions, 120 words maximum. Keep every concrete constraint: how many people, framing and crop, camera height, subject position, pose and action, location and its details, time of day, weather, lighting direction and quality, colour grade. Keep any film stock and camera name in the text verbatim. Never use these words: photorealistic, masterpiece, 8k, cinematic lighting, dreamy, ethereal, HDR, glow. Compress repetition instead of expanding it. Do not add anything that is not stated. Do not describe faces or clothing beyond what is given, since reference images supply those. Return only the English text, no preamble.',
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
    if (aperture >= 8) return 'Deeper depth of field: keep the subject and intended environmental details legible.';
    if (aperture <= 2) return "Shallow depth of field: keep the shot's specified focus detail sharp and let the background soften naturally.";
    return 'Moderate depth of field: subject sharp, background gently softened.';
}

// Framing stated as what SHOULD be visible. Saying "person occupies at most 40%"
// read as permission to omit the person entirely and produced an empty street.
function framingLine(variant) {
    // Prefer the raw size code (EWS/MCU/CU...). shotType arrives as a machine
    // label like "medium-close-up", which none of the patterns below match, so
    // every frame silently fell through to the generic fallback line.
    const raw = String(variant?.size || variant?.shotType || variant?.shotSize || '');
    const detailTarget = detailFrameTarget(variant);
    if (detailTarget && /特写|close|ECU|CU/i.test(raw)) {
        const target = detailTarget.includes('服装') ? 'garment or fabric detail'
            : detailTarget.includes('手部') ? 'hand detail' : 'accessory detail';
        return `Tight detail framing on the specified ${target}; retain its natural material and shape without forcing the face to fill the frame.`;
    }
    const rules = [
        [/环境全景|环境远景|^(?:E?WS)$/i, "Wide environmental framing: keep the subject small but clearly visible within the surrounding environment; preserve the shot's specified pose and action."],
        [/中全景|^MFS$/i, 'Knee-up framing: crop above the knees, showing head, torso and hands.'],
        [/全身|^FS$/i, 'Head-to-toe framing: both shoes and the ground under them are visible, with margin above the head.'],
        [/近景|^MCU$/i, 'Head-and-shoulders framing: crop below the shoulders, face fully in frame.'],
        [/特写|^E?CU$/i, 'Tight close-up: face fills most of the frame. Do not invent hands or props.'],
        [/中景|^MS$/i, 'Waist-up framing: crop below the waist, hands visible when they are in frame.'],
    ];
    return rules.find(([pattern]) => pattern.test(raw))?.[1] || 'Frame the subject according to the shot contract, with the face clearly visible.';
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

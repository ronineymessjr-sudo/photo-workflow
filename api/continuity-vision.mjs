// Vision pre-screen for QC.
//
// DeepSeek (or any OpenAI-compatible vision model) only ever produces
// *suggestions*. The safety rule is asymmetric on purpose:
//   - a vision "fail" may downgrade to retry (it cannot make a bad image pass)
//   - a vision "pass" is recorded as unknown, so a human still has to confirm
//     the key items (identity / anatomy / style match)
//   - if the service is missing or returns prose, everything stays unknown and
//     the verdict is needs-human, never pass
//
// This mirrors the methodology: the planning/vision model must not declare its
// own success.

import { QC_ITEMS } from './continuity.mjs';

// Only these three are objective enough for automated pre-screening; identity,
// anatomy and style match stay human decisions.
export const PRE_SCREEN_ITEMS = ['wardrobe', 'place-weather', 'shot-spec'];

export class VisionError extends Error {
    constructor(code, message, status = 502) {
        super(message);
        this.name = 'VisionError';
        this.code = code;
        this.status = status;
    }
}

function buildPrompt({ shot, locked }) {
    return [
        '你是摄影质检查员。只做客观比对，不要评价好看与否。',
        `拍摄圣经（不可更改的锁定条件）：`,
        `- 人物：${locked.subject}`,
        `- 服装：${locked.wardrobe}`,
        `- 地点：${locked.location}`,
        `- 天气：${locked.weather}`,
        `- 时间：${locked.timeOfDay}`,
        `本镜要求：景别 ${shot.size}；机位 ${shot.camera}；焦段 ${shot.lens}；人物位置 ${shot.subjectPlacement || '未指定'}。`,
        '请只输出严格 JSON，不要解释、不要代码块：',
        '{"wardrobe":"pass|fail","place-weather":"pass|fail","shot-spec":"pass|fail","notes":"一句话，指出最明显的问题"}',
        '判定标准：服装颜色/材质/版型与锁定条件明显不符才 fail；地点或天气明显不符才 fail；景别/角度/焦段明显不符才 fail。不确定时给 pass。',
    ].join('\n');
}

function parseScores(text) {
    if (typeof text !== 'string') return {};
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    let parsed;
    try { parsed = JSON.parse(match[0]); } catch { return {}; }
    const scores = {};
    for (const item of PRE_SCREEN_ITEMS) {
        const value = String(parsed[item] || '').toLowerCase();
        if (value === 'fail') scores[item] = 'fail';
        // A vision "pass" is downgraded to unknown: only a human can clear a key item.
        else if (value === 'pass') scores[item] = 'unknown';
    }
    if (typeof parsed.notes === 'string') scores.notes = parsed.notes.slice(0, 200);
    return scores;
}

/**
 * @returns {{available: boolean, scores: Record<string,string>, reason?: string}}
 */
export async function prescreen({ imageDataUrl, shot, locked, env = {}, fetchImpl = fetch } = {}) {
    const apiKey = env.DEEPSEEK_API_KEY || env.CONTINUITY_VISION_KEY;
    if (!apiKey) return { available: false, scores: {}, reason: '未配置视觉模型：缺少 DEEPSEEK_API_KEY' };
    if (!imageDataUrl) return { available: false, scores: {}, reason: '没有可检查的图片' };
    const base = (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
    const model = env.CONTINUITY_VISION_MODEL || 'deepseek-vl2';

    let response;
    try {
        response = await fetchImpl(`${base}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                temperature: 0,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: buildPrompt({ shot, locked }) },
                        { type: 'image_url', image_url: { url: imageDataUrl } },
                    ],
                }],
            }),
        });
    } catch (error) {
        return { available: false, scores: {}, reason: `视觉服务不可达：${String(error?.message || error)}` };
    }
    if (!response.ok) return { available: false, scores: {}, reason: `视觉服务 HTTP ${response.status}` };
    const payload = await response.json().catch(() => ({}));
    const text = payload?.choices?.[0]?.message?.content;
    const scores = parseScores(typeof text === 'string' ? text : Array.isArray(text) ? text.map(part => part?.text || '').join('') : '');
    if (!Object.keys(scores).some(key => PRE_SCREEN_ITEMS.includes(key))) {
        return { available: true, scores: {}, reason: '视觉模型没有返回可解析的判定，保持未判定' };
    }
    return { available: true, scores };
}

// Merge vision suggestions into a human-provided score sheet without ever
// upgrading a score. Vision can turn something into fail; it cannot turn it
// into pass.
export function mergeScores(humanScores = {}, visionScores = {}) {
    const merged = { ...humanScores };
    for (const item of PRE_SCREEN_ITEMS) {
        const vision = visionScores[item];
        if (!vision) continue;
        if (vision === 'fail') merged[item] = 'fail';
        else if (!merged[item] || merged[item] === 'unknown') merged[item] = 'unknown';
    }
    return merged;
}

export function summariseVision(vision) {
    if (!vision?.available) return vision?.reason || '未启用视觉初筛';
    const flagged = Object.entries(vision.scores).filter(([key, value]) => PRE_SCREEN_ITEMS.includes(key) && value === 'fail').map(([key]) => key);
    return flagged.length ? `视觉初筛发现问题：${flagged.join('、')}` : '视觉初筛未发现客观问题（关键项仍需人眼）';
}

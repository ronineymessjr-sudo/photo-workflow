#!/usr/bin/env node
// Builds SERIES packs: one brief = one shoot = one set of frames.
// The unit of generation is a series, not a single shot: identity, wardrobe,
// location, light and colour grade stay locked across every frame, and the
// frames are produced as edits of one reference image instead of independent
// text-to-image rolls (which is what produced five different casts before).
//
//   node export-series-pack.mjs --briefs briefs-format-2026-10-27.json \
//        --out results/format-2026-10-27-deepseek --dir prompt-packs/2026-10-27-deepseek/series
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const briefsPath = resolve(arg('briefs', 'briefs-format-2026-10-27.json'));
const outDir = resolve(arg('out', 'results/format-2026-10-27-deepseek'));
const packDir = resolve(arg('dir', 'prompt-packs/2026-10-27-deepseek/series'));
await mkdir(packDir, { recursive: true });

const SIZE_CN = { ECU: '大特写', CU: '特写', MCU: '近景', MS: '中景', MFS: '中全', FS: '全身', WS: '全景', EWS: '大远景' };
const ANGLE_CN = {
    eye_level: '平视', high_angle: '高机位俯拍', low_angle: '低机位仰拍', overhead: '正俯拍',
    shoulder_level: '肩高机位', ground_level: '地面低角度', dutch_angle: '斜切机位', back_view: '背面机位',
};
const APERTURE = { ECU: 1.8, CU: 1.8, MCU: 2.0, MS: 2.8, MFS: 3.5, FS: 4.0, WS: 5.6, EWS: 8 };

// Colour grade per style family — one grade per series is what makes a set read
// as one shoot instead of a stock-photo collage.
function gradeOf(brief) {
    const text = `${brief.input?.style || ''} ${brief.input?.mood || ''} ${brief.input?.scene || ''}`;
    if (/古风|汉服|中式|禅|茶/.test(text)) return 'low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff';
    if (/赛博|霓虹|夜|赛博朋克/.test(text)) return 'high-saturation cyan and magenta neon, deep shadows, wet reflections';
    if (/极简|性冷淡|白墙/.test(text)) return 'high-key, near-monochrome, clean whites, minimal contrast';
    if (/日系|胶片|教室/.test(text)) return 'low-contrast pastel, slightly green shadows, fine grain';
    if (/法式|复古|咖啡馆/.test(text)) return 'warm amber highlights, muted browns, soft contrast';
    if (/电影|青橙/.test(text)) return 'teal shadows with warm skin tones, cinematic contrast';
    if (/暗黑|哥特|废墟/.test(text)) return 'desaturated cool grey, crushed blacks, single warm accent';
    if (/田园|花|清新/.test(text)) return 'bright airy pastel, golden backlight, gentle bloom';
    if (/黑白|纪实|street/i.test(text)) return 'black and white, strong grain, high micro-contrast';
    if (/商业|商务|办公/.test(text)) return 'neutral daylight, clean whites, restrained saturation';
    return 'natural colour, gentle film curve, consistent white balance across the series';
}
function wardrobeOf(record) {
    const counts = new Map();
    for (const shot of record.shots || []) {
        const text = String(shot.wardrobe_styling || '')
            .replace(/待确认/g, '')
            .replace(/具体[^，,；;。]*[，,；;。]?/g, '')
            .replace(/[（(]\s*[)）]/g, '')
            .replace(/[，,；;、]\s*(?=[，,；;、])/g, '')
            .replace(/^[，,；;、\s]+|[，,；;、\s]+$/g, '')
            .replace(/^(?:服装(?:与妆发)?|妆发)[，,；;、\s]*/g, '')
            .replace(/^的/g, '')
            .trim();
        if (text.length < 4) continue;
        counts.set(text, (counts.get(text) || 0) + 1);
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : 'one fixed outfit chosen before the shoot, unchanged in every frame';
}
function lightOf(record) {
    const counts = new Map();
    for (const shot of record.shots || []) {
        const text = String(shot.lighting_setup || '').trim();
        if (text.length < 6) continue;
        counts.set(text, (counts.get(text) || 0) + 1);
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : 'one lighting setup for the whole series';
}
function aspectOf(shot) {
    const f = Number(String(shot.lens || '').replace(/[^\d].*$/, '')) || null;
    if (['EWS', 'WS'].includes(shot.shot_size) && f !== null && f <= 35) return { ratio: '3:2', size: '1536x1024', cn: '横幅' };
    return { ratio: '2:3', size: '1024x1536', cn: '竖幅' };
}
function bansOf(brief) {
    const extra = String(brief.input?.extra || '');
    const bans = ['no in-image text or labels', 'no watermark', 'no extra people in frame', 'no objects that are not listed in this frame'];
    if (/闪光/.test(extra)) bans.push('no flash');
    if (/三脚架/.test(extra)) bans.push('no tripod visible');
    if (/不入水|不下池/.test(extra)) bans.push('do not put the subject in the water');
    if (/不进入|不得进入|围栏/.test(extra)) bans.push('do not enter restricted area');
    return bans;
}

const briefs = JSON.parse(await readFile(briefsPath, 'utf8'));
const index = [];

for (const [briefIndex, brief] of briefs.entries()) {
    let record;
    try {
        record = JSON.parse(await readFile(resolve(outDir, `${brief.id}.json`), 'utf8'));
    } catch { continue; }
    const shots = record.shots || [];
    if (!shots.length) continue;

    const code = `S${String(briefIndex + 1).padStart(2, '0')}`;
    const grade = gradeOf(brief);
    const wardrobe = wardrobeOf(record);
    const light = lightOf(record);
    const bans = bansOf(brief);
    const identity = `${brief.input?.modelDesc || '一名成年人'}（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）`;
    const scene = brief.input?.scene || '';
    // Hero frame: the frame that shows identity best — full or mid shot at eye level.
    const heroIndex = shots.findIndex(shot => ['FS', 'MFS', 'MS'].includes(shot.shot_size) && shot.camera_angle === 'eye_level');
    const hero = heroIndex >= 0 ? heroIndex : 0;
    const heroAspect = aspectOf(shots[hero]);

    // English lock stays referential on purpose: mixing Chinese descriptions into
    // an English prompt measurably degrades image models, and in an edit workflow
    // "same as the reference image" is both shorter and stricter than describing
    // the wardrobe again in words.
    const lockEn = [
        'CONSISTENCY LOCK',
        'the same person as the reference image',
        'identical face, hairstyle, makeup and outfit',
        'same location and same lighting direction',
        `same colour grade: ${grade}`,
        `${heroAspect.ratio} ${heroAspect.cn === '竖幅' ? 'vertical' : 'horizontal'} framing`,
        'no in-image text or labels',
    ].join(', ');

    const md = [`# ${code} · ${brief.input?.theme || brief.id}`, '',
        `用例 \`${brief.id}\`　镜头 ${shots.length}　画幅 ${heroAspect.cn} ${heroAspect.ratio}（${heroAspect.size}）`, '',
        '## 系列圣经（每次生成前先读这一段，全系列不变）', '',
        `- **人物**：${identity}`,
        `- **服装**：${wardrobe}`,
        `- **场地**：${scene}`,
        `- **光线**：${light}`,
        `- **调色**：${grade}`,
        `- **画幅**：${heroAspect.cn} ${heroAspect.ratio}`,
        `- **焦段序列**：${shots.map(shot => shot.lens).join(' → ')}`,
        `- **禁用项**：${bans.join('；')}`,
        `- **原始要求**：${brief.input?.extra || '—'}`, '',
        '> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。', '',
        '## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）', '',
        '三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：', ''];
    // Reference frames need the identity and outfit, not the hero framing —
    // strip framing and pose tokens so "head-and-shoulders" is not fought by a
    // leftover "full body shot".
    const heroPrompt = String(shots[hero].generator_prompt || '')
        .replace(/[,，]?\s*\d{1,3}(?:-\d{1,3})?\s*mm\s*(?:lens|镜头)?/gi, '')
        .replace(/\b(?:full[ -]?body(?: shot)?|medium shot|close[ -]?up|half[ -]?body|wide shot)\b/gi, '')
        .replace(/[,，]?\s*(?:侧身站立|侧身|站姿|坐姿)\s*/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/[.\s]+$/, '')
        .trim();
    const refFrames = [
        { name: '参考帧 A · 正面胸像', frame: 'head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2' },
        { name: '参考帧 B · 45° 侧脸', frame: 'head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2' },
        { name: '参考帧 C · 全身定妆', frame: 'full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4' },
    ];
    for (const ref of refFrames) {
        md.push(`### ${ref.name}`, '', '```text', `${heroPrompt}, ${ref.frame}, photorealistic editorial photograph, natural skin texture, clean unmarked frame.`, '```', '');
    }
    md.push('> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。', '');

    md.push('## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）', '');
    md.push('| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |', '|---|---|---|---|---|---|---|');
    for (const [i, shot] of shots.entries()) {
        md.push(`| ${i + 1} | ${shot.shot_language} | ${SIZE_CN[shot.shot_size] || shot.shot_size} | ${ANGLE_CN[shot.camera_angle] || shot.camera_angle} | ${shot.lens} | f/${APERTURE[shot.shot_size] ?? 2.8} | ${shot.photographer_position} |`);
    }
    md.push('');
    for (const [i, shot] of shots.entries()) {
        const ap = APERTURE[shot.shot_size] ?? 2.8;
        const aspect = aspectOf(shot);
        md.push(`### ${code}-${String(i + 1).padStart(2, '0')}　${shot.shot_language}`, '');
        md.push(`- 文件名：\`${brief.id}__${String(i + 1).padStart(2, '0')}.png\`　${SIZE_CN[shot.shot_size] || shot.shot_size} / ${ANGLE_CN[shot.camera_angle] || shot.camera_angle} / ${shot.lens} / f/${ap} / ${aspect.cn}`);
        md.push(`- 机位：${shot.photographer_position}`);
        md.push(`- 动作：${shot.model_pose}`);
        md.push(`- 服装：${shot.wardrobe_styling}`);
        md.push(`- 光线：${shot.lighting_setup}`);
        md.push(`- 道具：${shot.shot_props}`);
        md.push(`- 裁切／必见：${shot.crop_boundary}　｜　${shot.must_show}`);
        md.push(`- 废片判据：${shot.reject_if}`);
        md.push('');
        const propsEn = /^无/.test(String(shot.shot_props || '').trim()) ? 'none' : shot.shot_props;
        md.push('```text');
        md.push(`${lockEn}, frame ${i + 1} of ${shots.length}, ${shot.generator_prompt.replace(/[,，]?\s*\d{1,3}(?:-\d{1,3})?\s*mm\s*(?:lens|镜头)?/gi, '').replace(/[.\s]+$/, '')}, ${shot.lens} lens at f/${ap}, ${['ECU', 'CU', 'MCU'].includes(shot.shot_size) ? 'shallow depth of field, background melting into bokeh' : 'subject and environment clearly readable'}, photorealistic editorial photograph, natural skin texture, clean unmarked frame.`);
        md.push('```', '');
        md.push(`编辑指令（用 REF 做图生图时）：\`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: ${propsEn}.\``, '');
        md.push(`负面：\`${bans.join(', ')}, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon\``, '');
    }

    md.push('## 第三步：系列接触印样（拼贴）', '',
        `- 版式：${shots.length <= 9 ? '3×3' : '4×3'} 网格，格间留 8px 白边，外边距一致`,
        '- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）',
        `- 统一标签格式：\`${code}-01 ｜ 镜头名 ｜ ${shots[0].lens} f/${APERTURE[shots[0].shot_size] ?? 2.8}\``,
        '- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"', '');

    md.push('## 一致性自检（每系列出完逐项过）', '',
        '- [ ] 脸型/发型一致（同一人）', '- [ ] 服装一致（颜色、材质、配饰）', '- [ ] 场地一致（同一处，背景元素不跑）',
        '- [ ] 光位一致（主光方向不跳）', '- [ ] 色温一致（冷暖不跳）', '- [ ] 画幅一致（竖就全竖）',
        '- [ ] 画面无多余人/物，无文字水印', '');

    await writeFile(resolve(packDir, `${code}-${brief.id}.md`), md.join('\n') + '\n', 'utf8');
    index.push({
        code, id: brief.id, theme: brief.input?.theme || brief.id, shots: shots.length,
        hero: `${code}-${String(hero + 1).padStart(2, '0')}`, aspect: `${heroAspect.cn} ${heroAspect.ratio}`,
        wardrobe, file: `${code}-${brief.id}.md`,
    });
}

const overview = ['# 系列组图总览', '',
    `共 ${index.length} 个系列，每系列一套组图（同一人 / 同一服装 / 同一场地 / 同一光线 / 同一调色）。`, '',
    '## 一览', '', '| 系列 | 用例 | 主题 | 镜头数 | 参考帧 | 画幅 | 服装（锁定） |', '|---|---|---|---|---|---|---|'];
for (const item of index) {
    overview.push(`| ${item.code} | \`${item.id}\` | ${item.theme} | ${item.shots} | ${item.hero} | ${item.aspect} | ${item.wardrobe.slice(0, 40)} |`);
}
overview.push('', '## 出图顺序（每个系列都这样跑）', '',
    '1. 出 3 张定妆参考帧 → 挑一张作 REF',
    '2. 以 REF 为参考图，逐帧图生图，只改机位与姿势',
    '3. 全系列出完 → 排 3×3 / 4×3 接触印样，标签后期加',
    '4. 过一遍一致性自检 7 项', '',
    '> 关键：**不要**每帧都从零文生图。上一轮 5 张拼贴是 5 次独立文生图，结果换了 5 组不同的脸和衣服，这就是为什么成不了系列。');
await writeFile(resolve(packDir, '00-系列总览.md'), overview.join('\n') + '\n', 'utf8');

console.log(`系列包已生成：${packDir}（${index.length} 个系列）`);
console.log(index.map(item => `${item.code}:${item.shots}镜`).join(' '));

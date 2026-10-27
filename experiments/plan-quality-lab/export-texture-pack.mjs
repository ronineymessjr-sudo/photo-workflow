#!/usr/bin/env node
// Texture-first prompt pack.
//
// Identity consistency is explicitly NOT a requirement here - different faces
// across frames are acceptable. What must hold is photographic realism: real
// film stock, real optics, real light falloff, real dirt. So the prompt order is
// inverted compared with the earlier pack:
//
//   [PHOTOGRAPHIC REALITY] -> [SCENE/CONTENT] -> [9 PANELS] -> [GRADE] -> [LAYOUT]
//
// and the identity lock is reduced to one line, freeing tokens for texture.
//
//   node export-texture-pack.mjs --dir prompt-packs/2026-10-27-deepseek/series \
//        --md prompt-packs/2026-10-27-deepseek/PROMPTS-TEXTURE.md
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const dir = resolve(arg('dir', 'prompt-packs/2026-10-27-deepseek/series'));
const mdPath = resolve(arg('md', 'prompt-packs/2026-10-27-deepseek/PROMPTS-TEXTURE.md'));
const jsonlPath = resolve(arg('jsonl', 'prompt-packs/2026-10-27-deepseek/PROMPTS-TEXTURE.jsonl'));

const SIZE_EN = { ECU: 'extreme close-up', CU: 'close-up', MCU: 'medium close-up', MS: 'medium shot', MFS: 'medium-full shot', FS: 'full body', WS: 'wide shot', EWS: 'extreme wide shot' };

// Film stocks carry texture in a way prompt adjectives cannot: grain structure,
// halation behaviour and colour rendition are baked into the emulsion.
function filmRecipe(data) {
    const text = `${data.theme} ${data.identity?.scene || ''} ${data.style?.grade || ''}`;
    if (/黑白|街头|纪实/.test(text)) return {
        stock: 'Ilford HP5 Plus 400 pushed to 1600',
        body: 'Nikon F3 with a 28mm f/2.8',
        texture: 'coarse visible grain, deep blacks, slight blown highlights, dust specks from the scan',
    };
    if (/赛博|霓虹/.test(text)) return {
        stock: 'CineStill 800T',
        body: 'Sony A7S III with a 35mm f/1.4',
        texture: 'tungsten balance, red halation bleeding around neon, wet-asphalt reflections, visible grain in shadows',
    };
    if (/古风|汉服|园林|中式|茶/.test(text)) return {
        stock: 'Kodak Portra 400',
        body: 'contax 645 with an 80mm f/2',
        texture: 'soft overcast daylight, gentle halation in the highlights, fine grain, slightly muted greens',
    };
    if (/日系|胶片|教室/.test(text)) return {
        stock: 'Fujicolor Pro 400H',
        body: 'Pentax 67 with a 105mm f/2.4',
        texture: 'low contrast, faint green shadows, soft highlight rolloff, light grain',
    };
    if (/法式|复古|咖啡/.test(text)) return {
        stock: 'Kodak Gold 200',
        body: 'Leica M6 with a 50mm f/1.4',
        texture: 'warm amber cast, gentle grain, slight underexposure in the shadows',
    };
    if (/暗黑|哥特|废墟/.test(text)) return {
        stock: 'Kodak Portra 800 pushed one stop',
        body: 'Canon EOS-1V with a 24mm f/1.4',
        texture: 'cool desaturated shadows, heavy grain, halation on the single warm light',
    };
    if (/花田|田园|清新/.test(text)) return {
        stock: 'Fujifilm Velvia 50',
        body: 'Nikon FM2 with an 85mm f/1.8',
        texture: 'saturated greens and yellows, crisp grain, bright backlit bloom around petals',
    };
    if (/电影感|青橙|天台/.test(text)) return {
        stock: 'CineStill 50D',
        body: 'ARRI-style full-frame with a 35mm f/2',
        texture: 'teal shadows, warm skin, visible halation on practical lights, fine grain',
    };
    if (/商务|办公|极简|白墙/.test(text)) return {
        stock: 'digital full-frame at ISO 320, minimal processing',
        body: 'Sony A7 IV with an 85mm f/1.8',
        texture: 'clean neutral colour, faint shadow noise, real window light falloff',
    };
    if (/泳池|黄昏|逆光/.test(text)) return {
        stock: 'Kodak Portra 400 backlit',
        body: 'Canon EOS-1V with an 85mm f/1.8',
        texture: 'warm sunset flare, grain visible in the sky, highlights just below clipping',
    };
    return {
        stock: 'Kodak Portra 400',
        body: 'full-frame camera with an 85mm f/1.8',
        texture: 'fine grain, gentle highlight rolloff, natural colour',
    };
}

function textureBlock(data) {
    const film = filmRecipe(data);
    return [
        '[PHOTOGRAPHIC REALITY]',
        `shot on ${film.stock}, ${film.body}`,
        `real photograph, not a render`,
        film.texture,
        'skin has visible pores, fine peach fuzz, uneven tone, slight shine on the nose, no retouching',
        'light falls off into real shadow, the unlit side is genuinely dark',
        'mixed colour temperature: daylight from one side, a warmer practical from the other',
        'the location shows wear: scuffed stone, water stains, dust in the air, a few ordinary objects left in frame',
        'natural optical bokeh with cat-eye vignetting at the edges, slight chromatic aberration, mild lens vignette',
        'frame is not perfectly level, exposure is slightly under',
    ].join(', ');
}

function panelBrief(frame, index) {
    const prompt = String(frame.prompt || '');
    const after = prompt.split(/\[FRAME \d+\/\d+\]/).pop() || prompt;
    const cleaned = after
        .replace(/,?\s*\d{1,3}(?:-\d{1,3})?\s*mm lens at f\/[\d.]+/gi, '')
        .replace(/,?\s*(shallow depth of field with creamy bokeh|subject and environment both clearly readable)/gi, '')
        .replace(/,?\s*clean unmarked frame\.?/gi, '')
        .replace(/,?\s*\d:\d+\s*(vertical|horizontal)/gi, '')
        .replace(/,?\s*Chinese ancient style/gi, '')
        .replace(/,?\s*(photorealistic editorial photograph|documentary realism|not an advertisement)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/^[,\s]+|[,\s.]+$/g, '')
        .split(/[,，]/)
        .map(part => part.trim())
        .filter(Boolean)
        .slice(0, 5)
        .join(', ');
    return `panel ${index + 1}: ${SIZE_EN[frame.size] || frame.size} at ${frame.lens}, ${cleaned}`;
}

const files = (await readdir(dir)).filter(name => name.endsWith('.consistency.json')).sort();
const seriesList = [];
for (const file of files) seriesList.push(JSON.parse(await readFile(join(dir, file), 'utf8')));

const md = ['# 真实质感优先 · 单图多格提示词', '',
    '## 这一版的原则', '',
    '- **人物不必是同一个人**：51 张脸都可以，一致性不是目标。',
    '- **唯一必须成立的是"这是一张照片"**：真实胶片、真实光学、真实光衰减、真实脏。',
    '- 提示词顺序改为：**真实感 → 内容 → 九格 → 调色 → 版式**。真实感放在最前面，因为模型对开头权重最高。',
    '- 身份锁压到一句（`one person, natural and consistent within the frame`），把 token 省给质感。', '',
    '## 三条最容易被忽略的质感定律', '',
    '1. **胶片型号 > 任何形容词**。写 `Kodak Portra 400` 会真的带出颗粒结构与高光过渡；写 `photorealistic` 什么都不会发生。',
    '2. **光必须"不均匀"**。真实照片的暗部是暗的；AI 图通病是全图提亮。提示词里要明说 "the unlit side is genuinely dark"。',
    '3. **场景必须"有点脏"**。青苔、水渍、灰尘、脚手架、垃圾桶——去掉这些就变成影棚布景。', '',
    '## 禁词表（写了就会变假）', '',
    '`8k`、`ultra detailed`、`masterpiece`、`award winning`、`hyperrealistic`、`perfect skin`、`cinematic lighting`、`dreamy`、`ethereal`、`studio backdrop`、`HDR`、`beauty`、`glow`、`flawless`', '',
    '## 出图后必做的一步', '',
    '提示词只能把 AI 味压到 40 分。要压到 20 分以下，出图后做一次轻处理：',
    '1. 降清晰度（Clarity −10 到 −20）、降对比（−5）；',
    '2. 加 5–8% 胶片颗粒（不是电子噪点）；',
    '3. 高光略压（−10），别让脸发亮；',
    '4. 需要的话整体降饱和 5–10%。', ''];

const jsonl = [];
for (const data of seriesList) {
    const frames = data.frames.slice(0, 9);
    const wide = String(data.style.aspect).startsWith('3:2');
    const canvasSize = wide ? '1536x1024' : '1024x1536';
    const grid = frames.length <= 4 ? '2x2' : frames.length <= 6 ? '2x3' : '3x3';
    const film = filmRecipe(data);

    const prompt = [
        textureBlock(data),
        // The Chinese scene name stays in the markdown for humans; the English
        // prompt relies on the per-panel descriptions instead, because mixing
        // CJK into an English prompt measurably degrades the render.
        '[SETTING] one single location used by every panel, the same architecture, the same ground and the same props across all panels',
        'one person, natural and consistent within the frame, wearing clothes that look worn rather than styled',
        `[CONTACT SHEET] one single photograph laid out as a ${grid} contact sheet of ${frames.length} frames, thin even white gutters, identical panel sizes, no captions, no numbers, no handwriting, no text anywhere`,
        `[PANELS] ${frames.map((frame, index) => panelBrief(frame, index)).join('; ')}`,
        `[GRADE] ${data.style.grade}`,
        `${wide ? 'horizontal 3:2' : 'vertical 2:3'} framing`,
    ].join(', ');

    md.push('', `## ${data.series} ${data.theme}（\`${data.briefId}\`）`, '',
        `- 胶片/机身：**${film.stock}** + ${film.body}`,
        `- 画布：${canvasSize}　网格：${grid}　面板：${frames.length}`,
        `- 格子对应：${frames.map((frame, index) => `${index + 1}→${frame.id.replace(`${data.series}-`, '')}`).join('　')}`, '',
        '```text', prompt, '```', '');
    jsonl.push(JSON.stringify({
        series: data.series, briefId: data.briefId, theme: data.theme, film: film.stock, camera: film.body,
        canvasSize, grid, panels: frames.length,
        mapping: frames.map((frame, index) => ({ panel: index + 1, id: frame.id, file: frame.file, size: frame.size, lens: frame.lens })),
        prompt,
    }));
}

md.push('', '## 质感验收（8 项，每项 0–2 分，满分 16）', '',
    '| # | 项目 | 2 分标准 |', '|---|---|---|',
    '| 1 | 皮肤 | 近看有毛孔/绒毛/色差不均，不反光 |',
    '| 2 | 光比 | 暗部真暗，有方向性 |',
    '| 3 | 颗粒 | 有胶片颗粒结构，不是彩噪 |',
    '| 4 | 高光 | 有过渡，不过曝成白块 |',
    '| 5 | 虚化 | 高光成多边形/猫眼，边缘有色散 |',
    '| 6 | 场地 | 有磨损、污渍、杂物 |',
    '| 7 | 色彩 | 有色温混合，不是一套滤镜 |',
    '| 8 | 姿态 | 不"端"，手部自然 |', '',
    '≥12 分可用；8–11 分按上面的后处理救；<8 分重出。', '',
    '## 裁剪与命名', '',
    '按九宫格裁开（3×3 每格约 341×512，2×3 每格约 512×512），命名 `{用例ID}__{两位镜号}.png`，例如 `style-hanfu-court__01.png`。');

await writeFile(mdPath, md.join('\n') + '\n', 'utf8');
await writeFile(jsonlPath, jsonl.join('\n') + '\n', 'utf8');
console.log(`质感优先提示词已生成：${mdPath}`);
console.log(`系列 ${seriesList.length} 个`);

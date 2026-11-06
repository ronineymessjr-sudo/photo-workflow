#!/usr/bin/env node
// One canvas per series: a 3x3 contact sheet generated in a SINGLE image.
//
// Why: without a local face-embedding pipeline you cannot lock an identity
// across separate API calls - each call re-samples a new face. Inside one
// generation the identity is sampled once and shared by all nine panels, so
// "same person, same outfit, same light" is structural instead of a promise.
// Panels are then cropped into individual frames.
//
//   node export-grid-pack.mjs --dir prompt-packs/2026-10-27-deepseek/series \
//        --md prompt-packs/2026-10-27-deepseek/PROMPTS-GRID.md
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const dir = resolve(arg('dir', 'prompt-packs/2026-10-27-deepseek/series'));
const mdPath = resolve(arg('md', 'prompt-packs/2026-10-27-deepseek/PROMPTS-GRID.md'));
const jsonlPath = resolve(arg('jsonl', 'prompt-packs/2026-10-27-deepseek/PROMPTS-GRID.jsonl'));

const SIZE_EN = { ECU: 'extreme close-up', CU: 'close-up', MCU: 'medium close-up', MS: 'medium shot', MFS: 'medium-full shot', FS: 'full body', WS: 'wide shot', EWS: 'extreme wide shot' };
const files = (await readdir(dir)).filter(name => name.endsWith('.consistency.json')).sort();
const seriesList = [];
for (const file of files) seriesList.push(JSON.parse(await readFile(join(dir, file), 'utf8')));

// Panel brief: keep it short (the canvas prompt already carries the locks), and
// strip phrases the model tends to over-weight ("editorial photograph" etc.).
function panelBrief(frame, index) {
    const prompt = String(frame.prompt || '');
    const afterFrame = prompt.split(/\[FRAME \d+\/\d+\]/).pop() || prompt;
    const cleaned = afterFrame
        .replace(/,?\s*\d{1,3}(?:-\d{1,3})?\s*mm lens at f\/[\d.]+/gi, '')
        .replace(/,?\s*(shallow depth of field with creamy bokeh|subject and environment both clearly readable)/gi, '')
        .replace(/,?\s*clean unmarked frame\.?/gi, '')
        // Aspect and style already live in the locks; repeating them in every
        // panel makes the canvas prompt longer than the model can weight.
        .replace(/,?\s*\d:\d+\s*(vertical|horizontal)/gi, '')
        .replace(/,?\s*Chinese ancient style/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/^[,\s]+|[,\s.]+$/g, '')
        .split(/[,，]/)
        .map(part => part.trim())
        .filter(Boolean)
        .slice(0, 5)
        .join(', ');
    return `panel ${index + 1}: ${SIZE_EN[frame.size] || frame.size} at ${frame.lens}, ${cleaned}`;
}

const md = ['# 单图多格系列提示词（一次生成一张九宫格）', '',
    '## 为什么改成这样', '',
    '**分开调用生成 9 张图，人物一定漂**——每次调用都从噪声重新采一张脸，任何提示词都锁不住。',
    '**一张画布内出 9 格，人物天然一致**——九格来自同一次采样，脸、衣服、场地、光线是同一个人同一个现场。',
    '出完按九宫格裁开，就是一套组图；要某格更高清，就把这张九宫格当参考图，用编辑模式单独放大那一格。', '',
    '## 用法', '',
    '1. 每个系列生成 **1 张 3×3 九宫格**（提示词见下），尺寸 **1024×1536 竖版**或 **1536×1024 横版**；',
    '2. 按裁剪表切成 9 张，命名 `{用例ID}__{镜号}.png`；',
    '3. 需要单格精修时：把九宫格拖进编辑模式，提示词写 `crop panel 4 and render it at full quality, keep the same person and outfit`；',
    '4. 拼贴发布时**标签后期加**，图内绝不能出现文字（模型写出来的参数 5/12 是错的）。', '',
    '## 九宫格位置与镜号对照', '',
    '（行优先：左上→右上，再中排，再下排）', '',
    '| 系列 | 主题 | 镜数 | 画幅 | 格子→镜号 |',
    '|---|---|---|---|---|'];

const jsonl = [];
let canvasCount = 0;

for (const data of seriesList) {
    const frames = data.frames.slice(0, 9);
    const wide = String(data.style.aspect).startsWith('3:2');
    const canvasSize = wide ? '1536x1024' : '1024x1536';
    const grid = frames.length <= 4 ? '2x2' : frames.length <= 6 ? '2x3' : '3x3';

    // On a fresh canvas there is no reference image yet, so the identity lock is
    // rewritten from "same as the reference" to "one person shared by all panels".
    const identityShort = data.identityLock
        .replace(/one single person, the same person as the reference image/i, 'one single consistent person shared by every panel');
    const realismShort = data.realismLock;
    const styleShort = data.styleLock;

    const panels = frames.map((frame, index) => panelBrief(frame, index)).join('; ');
    const canvasPrompt = [
        identityShort,
        realismShort,
        styleShort,
        `[CONTACT SHEET] one single photographic image laid out as a ${grid} contact sheet of ${frames.length} frames`,
        'thin even white gutters between panels, identical panel sizes, no captions, no numbers, no text anywhere in the image',
        'all panels shot at the same location in the same session with the same person, same outfit and same light direction',
        `panels in reading order: ${panels}`,
        `${canvasSize.includes('1536x1024') ? 'horizontal 3:2' : 'vertical 2:3'} framing, photorealistic editorial photograph`,
    ].join(', ');

    canvasCount += 1;
    md.push('', `## ${data.series} ${data.theme}（\`${data.briefId}\`）`, '',
        `- 画幅：${data.style.aspect}　画布：**${canvasSize}**　网格：${grid}　面板：${frames.length}`,
        `- 镜号对应：${frames.map((frame, index) => `${index + 1}→${frame.id.replace(`${data.series}-`, '')}`).join('　')}`,
        `- 参考：${data.identity.hair}｜${data.identity.scene}`, '',
        '```text', canvasPrompt, '```', '');
    if (data.frames.length > 9) {
        md.push(`> 该系列还有 ${data.frames.length - 9} 帧放不进九宫格，单独出：${data.frames.slice(9).map(frame => frame.id).join('、')}`, '');
    }

    jsonl.push(JSON.stringify({
        series: data.series, briefId: data.briefId, theme: data.theme,
        canvasSize, grid, panels: frames.length,
        mapping: frames.map((frame, index) => ({ panel: index + 1, id: frame.id, file: frame.file, size: frame.size, lens: frame.lens })),
        prompt: canvasPrompt,
    }));
}

md.push('', '## 裁剪与命名', '',
    '| 网格 | 单格尺寸（1024×1536 画布） | 说明 |', '|---|---|---|',
    '| 3×3 | 约 341×512 | 预览够用；要印刷级就把单格用编辑模式放大 |',
    '| 2×3 | 约 512×512 | 面板更大，适合只出一部分镜头的系列 |',
    '| 2×2 | 约 512×768 | 四个机位的小系列 |', '',
    '命名规则：`{用例ID}__{两位镜号}.png`，例如 `style-hanfu-court__01.png`。', '',
    '## 一句话总结', '',
    '把"一致性"从提示词的承诺，变成"同一次采样"的事实——这是不装本地模型时唯一可靠的锁。');

await writeFile(mdPath, md.join('\n') + '\n', 'utf8');
await writeFile(jsonlPath, jsonl.join('\n') + '\n', 'utf8');
console.log(`单图多格提示词已生成：${mdPath}`);
console.log(`系列 ${seriesList.length} 个，画布 ${canvasCount} 张，平均每张 ${(seriesList.reduce((sum, item) => sum + Math.min(item.frames.length, 9), 0) / seriesList.length).toFixed(1)} 格`);

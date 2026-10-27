#!/usr/bin/env node
// Flattens every series into ONE hand-off file: reference frames plus all frame
// prompts, each with its output filename and camera parameters, so the whole
// job can be run from a single document without hopping between 28 packs.
//
//   node export-all-prompts.mjs --dir prompt-packs/2026-10-27-deepseek/series \
//        --md prompt-packs/2026-10-27-deepseek/PROMPTS-ALL.md \
//        --txt prompt-packs/2026-10-27-deepseek/PROMPTS-ALL.txt
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const dir = resolve(arg('dir', 'prompt-packs/2026-10-27-deepseek/series'));
const mdPath = resolve(arg('md', 'prompt-packs/2026-10-27-deepseek/PROMPTS-ALL.md'));
const txtPath = resolve(arg('txt', 'prompt-packs/2026-10-27-deepseek/PROMPTS-ALL.txt'));

const files = (await readdir(dir)).filter(name => name.endsWith('.consistency.json')).sort();
const seriesList = [];
for (const file of files) seriesList.push(JSON.parse(await readFile(resolve(dir, file), 'utf8')));

const totalFrames = seriesList.reduce((sum, item) => sum + item.frames.length, 0);
const totalRefs = seriesList.length * 3;

const md = [];
const txt = [];
md.push('# 全部提示词 · 单一交付文件', '',
    `系列 ${seriesList.length} 个　参考帧 ${totalRefs} 张　分镜帧 ${totalFrames} 张　合计 ${totalRefs + totalFrames} 条提示词`, '',
    '## 怎么用（三步，不用再翻别的文件）', '',
    '1. **每个系列先出 3 张参考帧**（REF-A 正面 / REF-B 45°侧脸 / REF-C 全身），挑一张脸最稳的存成该系列的 `__REF-A.png`。',
    '2. **再按顺序出分镜帧**：每条提示词都自带 `[IDENTITY LOCK]` 与 `[STYLE LOCK]`（同一系列逐字相同），用参考图走编辑模式，只改机位与姿势。',
    '3. 全部出完按系列拼 3×3 接触印样，**标签后期加，图里不许有字**。', '',
    '## 铁律', '',
    '- 同一系列内：**不许换人、不许换衣服、不许换场地、不许换画幅、不许换调色**。',
    '- 提示词里那两段锁**原样复制**，一个字都别改。',
    '- 每张图按下面写的文件名存盘，我才能对回方案审。', '',
    '## 系列索引', '',
    '| 系列 | 用例 | 主题 | 帧数 | 画幅 | 服装（锁定） |',
    '|---|---|---|---|---|---|');
for (const item of seriesList) {
    md.push(`| ${item.series} | \`${item.briefId}\` | ${item.theme} | ${item.frames.length} | ${item.style.aspect} | ${String(item.identity.wardrobe || '开拍前定').slice(0, 30)} |`);
}
md.push('');

txt.push(`# 全部提示词（纯文本版）　系列 ${seriesList.length} / 参考帧 ${totalRefs} / 分镜 ${totalFrames}`);
txt.push('# 格式：文件名 | 参数 ｜ 下一行是提示词，空行分隔。同一系列的 IDENTITY/STYLE 锁逐字相同，勿改。');
txt.push('');

for (const item of seriesList) {
    md.push('---', '', `## ${item.series} ${item.theme}（\`${item.briefId}\`）`, '',
        `- 画幅：${item.style.aspect}（${item.style.size}）｜调色：${item.style.grade}`,
        `- 人物：${item.identity.gender}，${item.identity.hair}｜场地：${item.identity.scene}`,
        `- 光线：${item.identity.light}`,
        `- 参考帧：\`${item.refFile}\`（三选一）`, '',
        '### 参考帧（先出这 3 张）', '');

    txt.push(`===== ${item.series} ${item.theme} [${item.briefId}] ${item.style.aspect} =====`);
    txt.push('');

    for (const ref of item.refs) {
        md.push(`**${ref.name}** → \`${ref.file}\``, '', '```text', ref.prompt, '```', '');
        txt.push(`--- ${ref.file} | ${ref.name}`);
        txt.push(ref.prompt);
        txt.push('');
    }

    md.push('### 分镜帧（按顺序出，用参考图）', '');
    for (const frame of item.frames) {
        md.push(`**${frame.id} ${frame.size}/${frame.angle}/${frame.lens}/f${frame.aperture}** → \`${frame.file}\``, '', '```text', frame.prompt, '```', '');
        txt.push(`--- ${frame.file} | ${frame.id} ${frame.size}/${frame.angle}/${frame.lens}/f${frame.aperture}`);
        txt.push(frame.prompt);
        txt.push('');
    }
}

await writeFile(mdPath, md.join('\n') + '\n', 'utf8');
await writeFile(txtPath, txt.join('\n') + '\n', 'utf8');
console.log(`单文件交付已生成：`);
console.log(`  Markdown：${mdPath}`);
console.log(`  纯文本：${txtPath}`);
console.log(`系列 ${seriesList.length} / 参考帧 ${totalRefs} / 分镜 ${totalFrames} / 合计 ${totalRefs + totalFrames} 条`);

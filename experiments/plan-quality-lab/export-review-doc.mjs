#!/usr/bin/env node
// Exports a human-review document from an eval run: every brief, every shot,
// every field — focal length and shooting distance first because that is what
// the operator reads on set.
//
//   node export-review-doc.mjs --briefs briefs-format-2026-10-27.json \
//        --out results/format-subagent-2026-10-27 --doc REVIEW-FORMAT-2026-10-27.md
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const briefsPath = resolve(arg('briefs', 'briefs-format-2026-10-27.json'));
const outDir = resolve(arg('out', 'results/format-subagent-2026-10-27'));
const docPath = resolve(arg('doc', 'REVIEW-FORMAT-2026-10-27.md'));

const briefs = JSON.parse(await readFile(briefsPath, 'utf8'));
const sizeLabel = { ECU: '大特写', CU: '特写', MCU: '近景', MS: '中景', MFS: '中全', FS: '全身', WS: '全景', EWS: '大远景' };
const angleLabel = {
    eye_level: '平视', high_angle: '高机位俯拍', low_angle: '低机位仰拍', overhead: '正俯拍',
    shoulder_level: '肩高机位', ground_level: '地面低角度', dutch_angle: '斜切机位', back_view: '背面机位',
};

const lines = [];
const push = (...rows) => lines.push(...rows);

push('# 摄影方案逐镜详单（人工验收版）', '');
push(`- 用例文件：\`${briefsPath.split(/[\\/]/).pop()}\``);
push(`- 结果目录：\`${outDir.split(/[\\/]/).slice(-2).join('/')}\``);
push(`- 生成时间：${new Date().toISOString()}`);
push(`- 用例数：${briefs.length}`, '');

const stats = { briefs: 0, shots: 0, pass: 0, lens: new Set(), sizes: new Set(), angles: new Set() };

for (const [index, brief] of briefs.entries()) {
    let record;
    try {
        record = JSON.parse(await readFile(resolve(outDir, `${brief.id}.json`), 'utf8'));
    } catch {
        push(`## ${index + 1}. ${brief.id} — 无结果文件`, '');
        continue;
    }
    stats.briefs += 1;
    const shots = record.shots || [];
    const ok = !record.error && record.evaluation?.pass !== false;
    if (ok) stats.pass += 1;
    stats.shots += shots.length;
    for (const shot of shots) {
        if (shot.lens) stats.lens.add(shot.lens);
        if (shot.shot_size) stats.sizes.add(shot.shot_size);
        if (shot.camera_angle) stats.angles.add(shot.camera_angle);
    }
    const input = brief.input || {};
    push(`## ${index + 1}. ${input.theme || brief.id}`, '');
    push(`- 用例 ID：\`${brief.id}\``);
    push(`- 方案标题：${record.planTitle || input.theme || '—'}`);
    push(`- 风格：${input.style || '—'}　情绪：${input.mood || '—'}　时长：${input.duration || '—'}　人数：${input.people || '—'}`);
    push(`- 人物：${input.modelDesc || '—'}`);
    push(`- 场地：${input.scene || '—'}`);
    push(`- 额外要求：${input.extra || '—'}`);
    push(`- 结果：${ok ? '✅ 生产校验 + 质量评测全过' : '❌ ' + (record.error || '评测未过')}　镜头数：${shots.length}（要求 ${record.requestedShots ?? '—'}）`);
    push('');
    if (!shots.length) { push(''); continue; }
    push('| # | 镜头名 | 景别 | 机位角度 | 焦段 | 机位与拍摄距离 | 人物位置 |');
    push('|---|---|---|---|---|---|---|');
    for (const [i, shot] of shots.entries()) {
        push(`| ${i + 1} | ${shot.shot_language} | ${sizeLabel[shot.shot_size] || shot.shot_size}（${shot.shot_size}） | ${angleLabel[shot.camera_angle] || shot.camera_angle}（${shot.camera_angle}） | ${shot.lens} | ${shot.photographer_position} | ${shot.model_position} |`);
    }
    push('');
    for (const [i, shot] of shots.entries()) {
        push(`### ${index + 1}.${i + 1} ${shot.shot_language}`, '');
        push(`- **景别 / 焦段 / 角度**：${sizeLabel[shot.shot_size] || shot.shot_size}（${shot.shot_size}） / ${shot.lens} / ${angleLabel[shot.camera_angle] || shot.camera_angle}（${shot.camera_angle}）`);
        push(`- **机位与距离**：${shot.photographer_position}`);
        push(`- **人物动作**：${shot.model_pose}`);
        push(`- **人物位置**：${shot.model_position}`);
        push(`- **服装妆发**：${shot.wardrobe_styling}`);
        push(`- **光线**：${shot.lighting_setup}`);
        push(`- **道具**：${shot.shot_props}`);
        push(`- **裁切**：${shot.crop_boundary}`);
        push(`- **必须看见**：${shot.must_show}`);
        push(`- **废片判据**：${shot.reject_if}`);
        push(`- **不可拍时替代**：${shot.execution_note}`);
        push(`- **英文提示词**：${shot.generator_prompt}`);
        push('');
    }
    push('---', '');
}

push('## 汇总', '');
push(`- 用例：${stats.pass}/${stats.briefs} 组双通过`);
push(`- 镜头总数：${stats.shots}`);
push(`- 出现过的焦段：${[...stats.lens].join('、')}`);
push(`- 出现过的景别：${[...stats.sizes].map(key => `${key}/${sizeLabel[key] || ''}`).join('、')}`);
push(`- 出现过的机位角度：${[...stats.angles].join('、')}`);

await writeFile(docPath, lines.join('\n') + '\n', 'utf8');
console.log(`详单已写入：${docPath}（${stats.briefs} 组 / ${stats.shots} 镜）`);

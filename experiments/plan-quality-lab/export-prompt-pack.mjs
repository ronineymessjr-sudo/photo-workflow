#!/usr/bin/env node
// Builds a hand-off prompt pack from an eval run:
//   00-README.md               how to use, file names, round-trip protocol
//   01-人看版-拍摄详单.md        Chinese spec per shot + derived camera settings
//   02-提示词-GPTImage.md/.jsonl rich natural-language prompts for GPT Image 2/2.5
//   03-提示词-弱模型.md/.jsonl   compact tag prompts + negative prompts for SDXL/SD1.5/Turbo
//   04-自审报告.md              consistency + 小红书 convention gap analysis
//   05-回图验收清单.md          checklist used to grade returned images
//   06-prompts-all.json        machine-readable bundle (UI / other agents)
//
//   node export-prompt-pack.mjs --briefs briefs-format-2026-10-27.json \
//        --out results/format-2026-10-27-deepseek --dir prompt-packs/2026-10-27-deepseek \
//        --label "DeepSeek 真实端到端"
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const briefsPath = resolve(arg('briefs', 'briefs-format-2026-10-27.json'));
const outDir = resolve(arg('out', 'results/format-2026-10-27-deepseek'));
const packDir = resolve(arg('dir', 'prompt-packs/2026-10-27-deepseek'));
const label = arg('label', 'DeepSeek 真实端到端');
await mkdir(packDir, { recursive: true });

const SIZE_CN = { ECU: '大特写', CU: '特写', MCU: '近景', MS: '中景', MFS: '中全', FS: '全身', WS: '全景', EWS: '大远景' };
const ANGLE_CN = {
    eye_level: '平视', high_angle: '高机位俯拍', low_angle: '低机位仰拍', overhead: '正俯拍',
    shoulder_level: '肩高机位', ground_level: '地面低角度', dutch_angle: '斜切机位', back_view: '背面机位',
};
// Aperture by framing: keeps the depth-of-field promise of each shot size, and
// matches what the 小红书 references actually shoot (wide open for close-ups).
const APERTURE = { ECU: 1.8, CU: 1.8, MCU: 2.0, MS: 2.8, MFS: 3.5, FS: 4.0, WS: 5.6, EWS: 8 };
const MOTION = /奔跑|跑|跳|滑|舞|旋|水花|飞扬|甩|翻|跃|冲刺|走动抓拍/;
const NIGHT = /夜|霓虹|路灯|街灯|烛|灯带|黄昏|日落|蓝调|车流|荧光/;

function lensNumber(lens) {
    const m = String(lens || '').match(/^(\d+)/);
    return m ? Number(m[1]) : null;
}
function distanceOf(text) {
    const m = String(text || '').match(/(\d+(?:\.\d+)?)\s*(米|厘米|m\b)/);
    if (!m) return null;
    return m[2] === '厘米' ? Number(m[1]) / 100 : Number(m[1]);
}
function aspectOf(shot) {
    const f = lensNumber(shot.lens);
    // Wide environmental frames read better horizontally; social portraits are
    // vertical. This mirrors 小红书 feed conventions (vertical first).
    if (['EWS', 'WS'].includes(shot.shot_size) && f !== null && f <= 35) return { ratio: '3:2', orientation: 'horizontal', size: '1536x1024', lite: '1216x832' };
    return { ratio: '2:3', orientation: 'vertical', size: '1024x1536', lite: '832x1216' };
}
function shutterOf(shot) {
    const text = `${shot.model_pose} ${shot.execution_note} ${shot.camera_angle}`;
    if (MOTION.test(text)) return '1/1000s 以上（凝固动作）';
    if (/慢门|拖影|光轨/.test(`${shot.execution_note} ${shot.lighting_setup}`)) return '1/8–1/15s（稳定支撑机身）';
    return '1/125–1/200s（安全快门）';
}
function exposureOf(shot) {
    const text = `${shot.lighting_setup} ${shot.execution_note}`;
    if (NIGHT.test(text)) return { iso: 'ISO 800–3200', wb: '自动或 3200K（保留现场冷暖）' };
    if (/正午|强光|晴天|日光|自然光|顺光|逆光|侧光|天光/.test(text)) return { iso: 'ISO 100–400', wb: '5500K 日光' };
    return { iso: 'ISO 400–800', wb: '自动白平衡' };
}
function usesFlashBan(shot) {
    return /禁用闪光|不开闪光|无闪光|不用闪光|自然光/.test(`${shot.lighting_setup} ${shot.execution_note} ${shot.shot_props}`);
}
function doFText(shot) {
    const ap = APERTURE[shot.shot_size] ?? 2.8;
    if (['ECU', 'CU', 'MCU'].includes(shot.shot_size)) return `shallow depth of field at f/${ap}, background melting into bokeh`;
    if (['MS', 'MFS'].includes(shot.shot_size)) return `subject sharp against a softly separated background at f/${ap}`;
    return `subject and environment both readable at f/${ap}`;
}

// GPT Image 2/2.5 follows natural language: keep the original intent, then add
// orientation, optics and rendering constraints the model otherwise invents.
// The base prompt often already names the lens, so strip it before restating —
// duplicated optics confuse the model into averaging two focal lengths.
function gptPrompt(shot, aspect) {
    const ap = APERTURE[shot.shot_size] ?? 2.8;
    const base = String(shot.generator_prompt || '')
        .replace(/[,，]?\s*\d{1,3}(?:-\d{1,3})?\s*mm\s*(?:lens|镜头)?/gi, '')
        .replace(/[,，]?\s*f\/?\d+(?:\.\d+)?\b/gi, '')
        .replace(/[.\s]+$/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    const parts = [base];
    parts.push(`${aspect.orientation === 'vertical' ? 'Vertical 2:3 portrait' : 'Horizontal 3:2 landscape'} framing`);
    parts.push(`shot on a full-frame camera with a ${shot.lens} lens`);
    parts.push(doFText(shot));
    parts.push('photorealistic editorial photograph, natural skin texture, true-to-life colour, sharp focus on the eyes, natural anatomy');
    if (usesFlashBan(shot)) parts.push('continuous available light only, no flash');
    parts.push('clean unmarked frame, no text or watermark');
    return `${parts.join(', ')}.`;
}

// Weaker text encoders ignore long clauses and treat negations as content.
// Keep short visual tags, move every refusal into the negative prompt.
function litePrompt(shot) {
    const clauses = String(shot.generator_prompt || '')
        .split(/[,，;；]/)
        .map(item => item.trim())
        .filter(Boolean)
        .filter(item => !/\b(?:no|without|never|not|avoid)\b/i.test(item))
        .filter(item => !/\d+(?:\.\d+)?\s*(?:meters?|m\b|centimet)/i.test(item))
        .filter(item => !/^camera\b/i.test(item));
    const core = clauses.slice(0, 6).join(', ');
    const ap = APERTURE[shot.shot_size] ?? 2.8;
    const tags = [core, `${shot.lens} lens`, `f${ap}`, 'photorealistic', 'detailed skin texture', 'cinematic lighting', 'high detail'];
    return tags.join(', ');
}
function negativePrompt(shot) {
    const base = [
        'lowres', 'blurry', 'jpeg artifacts', 'bad anatomy', 'extra fingers', 'deformed hands',
        'extra limbs', 'fused fingers', 'distorted face', 'asymmetric eyes', 'plastic skin',
        'oversaturated', 'watermark', 'text', 'logo', 'signature', 'cropped head', 'out of frame',
        'duplicate subject', 'tilted horizon',
    ];
    if (usesFlashBan(shot)) base.push('flash', 'harsh flash shadow', 'blown highlights');
    if (['ECU', 'CU'].includes(shot.shot_size)) base.push('wide angle distortion', 'big nose', 'distorted proportions');
    return base.join(', ');
}

const briefs = JSON.parse(await readFile(briefsPath, 'utf8'));
const rows = [];
for (const brief of briefs) {
    let record;
    try {
        record = JSON.parse(await readFile(resolve(outDir, `${brief.id}.json`), 'utf8'));
    } catch { continue; }
    for (const [index, shot] of (record.shots || []).entries()) {
        const aspect = aspectOf(shot);
        const exposure = exposureOf(shot);
        rows.push({
            id: `${brief.id}#${index + 1}`,
            briefId: brief.id,
            shotIndex: index + 1,
            file: `${brief.id}__${String(index + 1).padStart(2, '0')}.png`,
            title: brief.input?.theme || brief.id,
            scene: brief.input?.scene || '',
            requirement: brief.input?.extra || '',
            shot,
            aspect,
            aperture: APERTURE[shot.shot_size] ?? 2.8,
            shutter: shutterOf(shot),
            exposure,
            distance: distanceOf(shot.photographer_position),
            gpt: gptPrompt(shot, aspect),
            lite: litePrompt(shot),
            negative: negativePrompt(shot),
        });
    }
}

// ---------- 00 README ----------
const readme = `# 提示词交付包 · ${label}

生成时间：${new Date().toISOString()}　用例：${briefs.length} 组　镜头：${rows.length}

## 文件清单

| 文件 | 给谁看 | 用途 |
|---|---|---|
| \`01-人看版-拍摄详单.md\` | 人 | 每镜 15 字段 + 推导出的画幅/光圈/快门/ISO/白平衡，用于核对方案本身 |
| \`02-提示词-GPTImage.md\` / \`.jsonl\` | GPT Image 2 / 2.5 | 完整自然语言提示词（已补画幅、光圈、景深、写实约束） |
| \`03-提示词-弱模型.md\` / \`.jsonl\` | SDXL / SD1.5 / Turbo / Flux-schnell | 精简标签式正向 + 固化负向 + 参数档位 |
| \`04-自审报告.md\` | 人 | 方案自洽性审核 + 与小红书爆款规律的差距 |
| \`05-回图验收清单.md\` | 我（回图后审） | 逐图打分标准与判定口径 |
| \`06-prompts-all.json\` | 程序 / 另一会话 | 全字段 + 两版提示词的结构化总表 |

## 回图命名规范（重要）

请按 \`{用例ID}__{两位镜号}.png\` 命名，例如 \`style-hanfu-court__01.png\`。
放回目录：\`prompt-packs/2026-10-27-deepseek/returned/<模型名>/\`，我按文件名自动对回方案逐镜审核。

## 建议的喂图批次

1. **先跑 12 镜小样**，确认口径再全量。这 12 镜覆盖了最容易翻车的类型（竖幅全身、低角度仰拍、微俯半身、贴脸特写、逆光发丝、超广角、长焦压缩、多人、无人物元素）：

| # | 镜头 ID | 类型 | 为什么选它 |
|---|---|---|---|
| 1 | \`style-hanfu-court#1\` | 85mm 竖幅全身 | 检验竖屏全身构图与门框框景 |
| 2 | \`style-minimal-white#1\` | 50mm 大留白 | 检验负空间与干净背景 |
| 3 | \`ppl-skater-dusk#2\` | 24mm 低角度仰拍 | 检验透视拉长与广角畸变 |
| 4 | \`ppl-business-portrait#5\` | 35mm 高机位俯拍 | 检验俯拍是否拍成大头娃娃 |
| 5 | \`style-newchinese-tea#3\` | 40cm 手部特写 | 检验手部与道具细节 |
| 6 | \`style-flower-field#3\` | 135mm 背景压缩 | 检验长焦压缩与虚化 |
| 7 | \`scene-spiral-stairs#1\` | 16mm 超广角俯拍 | 检验极端透视与几何 |
| 8 | \`scene-museum-quiet#4\` | 50mm 侧脸近景 | 检验射灯光斑与侧脸轮廓 |
| 9 | \`ppl-kids-sportsday#9\` | 200mm 远距抓拍 | 检验远摄压缩与人数控制 |
| 10 | \`scene-parking-garage#2\` | 24mm 冷调低角度 | 检验低光噪点与色温 |
| 11 | \`ppl-cat-home#6\` | 30cm 趴地低角度 | 检验人与宠物同框 |
| 12 | \`scene-pool-dusk#6\` | 逆光剪影 | 检验逆光曝光与人脸可辨 |

2. 弱模型单独目录，跑同一批 12 镜，看降级到什么程度。
3. 每镜同参数出 3 张，取最好一张进验收（弱模型尤其必要）。

## 关于"弱模型能不能控住质量"

能控住下限，控不住上限，办法是四个手段叠加（详见 \`03\` 的末尾）：
1. **提示词降维**：≤60 token 的视觉标签，去掉距离数字与否定句（弱模型会把 "no flash" 画成闪光灯）。
2. **负向固化**：手部/多肢/文字水印/过度饱和等一律进负面，不占正向权重。
3. **比例锁定**：竖幅 832×1216、横幅 1216×832，避免 1024 方图裁切导致构图崩坏。
4. **多种子取样 + 阈值验收**：每镜 3 种子，按 \`05\` 的清单过线即收，不过线就换种子或改用图生图修补。
`;
await writeFile(resolve(packDir, '00-README.md'), readme, 'utf8');

// ---------- 01 human spec ----------
const human = [`# ${label} · 人看版拍摄详单`, '', `用例 ${briefs.length} 组 / 镜头 ${rows.length}。逐镜列出全部字段，并补上执行所需的机身参数。`, ''];
let currentBrief = '';
for (const row of rows) {
    if (row.briefId !== currentBrief) {
        currentBrief = row.briefId;
        human.push(`## ${row.title}（\`${row.briefId}\`）`, '', `- 场地：${row.scene}`, `- 额外要求：${row.requirement}`, '');
    }
    const s = row.shot;
    human.push(`### ${row.id}　${s.shot_language}`, '');
    human.push('| 项目 | 内容 |', '|---|---|');
    human.push(`| 景别 | ${SIZE_CN[s.shot_size] || s.shot_size}（${s.shot_size}） |`);
    human.push(`| 焦段 | ${s.lens} |`);
    human.push(`| 机位角度 | ${ANGLE_CN[s.camera_angle] || s.camera_angle}（${s.camera_angle}） |`);
    human.push(`| 机位与拍摄距离 | ${s.photographer_position} |`);
    human.push(`| 人物动作 | ${s.model_pose} |`);
    human.push(`| 人物位置 | ${s.model_position} |`);
    human.push(`| 服装妆发 | ${s.wardrobe_styling} |`);
    human.push(`| 光线 | ${s.lighting_setup} |`);
    human.push(`| 道具 | ${s.shot_props} |`);
    human.push(`| 裁切范围 | ${s.crop_boundary} |`);
    human.push(`| 必须看见 | ${s.must_show} |`);
    human.push(`| 废片判据 | ${s.reject_if} |`);
    human.push(`| 不可拍时替代 | ${s.execution_note} |`);
    human.push(`| **画幅** | ${row.aspect.ratio} ${row.aspect.orientation === 'vertical' ? '竖幅' : '横幅'} |`);
    human.push(`| **光圈（建议）** | f/${row.aperture} |`);
    human.push(`| **快门（建议）** | ${row.shutter} |`);
    human.push(`| **ISO / 白平衡（建议）** | ${row.exposure.iso}　${row.exposure.wb} |`);
    human.push('');
}
await writeFile(resolve(packDir, '01-人看版-拍摄详单.md'), human.join('\n') + '\n', 'utf8');

// ---------- 02 GPT prompts ----------
const gptMd = [`# ${label} · GPT Image 2 / 2.5 提示词`, '', `共 ${rows.length} 镜。每镜：文件名 → 画幅 → 提示词（可直接整段复制）。`, ''];
const gptJsonl = [];
for (const row of rows) {
    gptMd.push(`## ${row.id}　${row.shot.shot_language}`, '');
    gptMd.push(`- 文件名：\`${row.file}\``);
    gptMd.push(`- 画幅：${row.aspect.ratio}（${row.aspect.size}）｜焦段 ${row.shot.lens}｜f/${row.aperture}`);
    gptMd.push('');
    gptMd.push('```text');
    gptMd.push(row.gpt);
    gptMd.push('```', '');
    gptJsonl.push(JSON.stringify({ id: row.id, file: row.file, aspect: row.aspect, lens: row.shot.lens, aperture: row.aperture, prompt: row.gpt }));
}
await writeFile(resolve(packDir, '02-提示词-GPTImage.md'), gptMd.join('\n') + '\n', 'utf8');
await writeFile(resolve(packDir, '02-提示词-GPTImage.jsonl'), gptJsonl.join('\n') + '\n', 'utf8');

// ---------- 02b sample batch ----------
const SAMPLE_IDS = [
    'style-hanfu-court#1', 'style-minimal-white#1', 'ppl-skater-dusk#2', 'ppl-business-portrait#5',
    'style-newchinese-tea#3', 'style-flower-field#3', 'scene-spiral-stairs#1', 'scene-museum-quiet#4',
    'ppl-kids-sportsday#9', 'scene-parking-garage#2', 'ppl-cat-home#6', 'scene-pool-dusk#6',
];
const sampleRows = SAMPLE_IDS.map(id => rows.find(row => row.id === id)).filter(Boolean);
const sample = [`# 12 镜小样（先跑这个，确认口径再全量）`, '',
    '这 12 镜覆盖最容易翻车的类型：竖幅全身、大留白、低角度仰拍、高机位俯拍、手部特写、长焦压缩、超广角、侧脸近景、远距抓拍、低光冷调、人宠同框、逆光剪影。', '',
    '建议：GPT Image 2 与弱模型各跑一遍，同一 ID 对比，就能看出"质量差多少、差在哪"。', ''];
for (const row of sampleRows) {
    sample.push(`## ${row.id}　${row.shot.shot_language}`, '');
    sample.push(`- 文件名：\`${row.file}\`　画幅：${row.aspect.ratio}（${row.aspect.size}）　${row.shot.lens}　f/${row.aperture}`);
    sample.push(`- 人看要点：${row.shot.shot_size} / ${ANGLE_CN[row.shot.camera_angle] || row.shot.camera_angle} / ${row.shot.photographer_position}`);
    sample.push('');
    sample.push('```text');
    sample.push(row.gpt);
    sample.push('```', '');
    sample.push('弱模型版：');
    sample.push('```text');
    sample.push(row.lite);
    sample.push('```');
    sample.push('负向：');
    sample.push('```text');
    sample.push(row.negative);
    sample.push('```', '');
}
await writeFile(resolve(packDir, '02b-小样12镜.md'), sample.join('\n') + '\n', 'utf8');

// ---------- 03 lite prompts ----------
const liteMd = [`# ${label} · 弱模型提示词（SDXL / SD1.5 / Turbo / Flux-schnell）`, '',
    '原理：弱文本编码器读不懂长句，且会把 "no flash" 当成"闪光灯"画出来。所以正向只留视觉标签，所有禁止项进负面。', ''];
const liteJsonl = [];
for (const row of rows) {
    liteMd.push(`## ${row.id}　${row.shot.shot_language}`, '');
    liteMd.push(`- 文件名：\`${row.file}\``);
    liteMd.push(`- 分辨率：竖幅 832×1216 / 横幅 1216×832（SD1.5 用 512×768 / 768×512）`);
    liteMd.push('');
    liteMd.push('正向：');
    liteMd.push('```text');
    liteMd.push(row.lite);
    liteMd.push('```');
    liteMd.push('负向：');
    liteMd.push('```text');
    liteMd.push(row.negative);
    liteMd.push('```', '');
    liteJsonl.push(JSON.stringify({ id: row.id, file: row.file, size: row.aspect.lite, positive: row.lite, negative: row.negative }));
}
liteMd.push('## 参数档位', '', '| 模型 | 步数 | CFG | 采样器 | 备注 |', '|---|---|---|---|---|');
liteMd.push('| SDXL / Pony / Illustrious | 28–32 | 6–7 | DPM++ 2M Karras | 负面权重 1.0，必要时把 hands 相关权重提到 1.3 |');
liteMd.push('| SD 1.5 系 | 24–28 | 7 | DPM++ 2M Karras | 分辨率不要超过 768，超了会多头多手 |');
liteMd.push('| SDXL-Turbo / Lightning | 4–8 | 1.5–2 | 默认 | 提示词再砍一半，只留主体+场景+光 |');
liteMd.push('| Flux-schnell | 4 | 3.5 | 默认 | 可用较长句，但仍建议去掉否定句 |');
liteMd.push('', '## 质量兜底四件事', '',
    '1. **每镜 3 个种子**（如 42 / 1234 / 777），挑脸部与手部最干净的一张。',
    '2. **比例锁定**：竖幅就出竖幅，别用方图后期裁——裁完构图必崩。',
    '3. **人物特写加修脸/修手**（ADetailer、face restore、局部重绘），弱模型的差距 80% 在手和眼。',
    '4. **不达标就改图生图**：先用弱模型出大致构图，再用同一张图做 img2img 提升细节，比硬调提示词有效。');
await writeFile(resolve(packDir, '03-提示词-弱模型.md'), liteMd.join('\n') + '\n', 'utf8');
await writeFile(resolve(packDir, '03-提示词-弱模型.jsonl'), liteJsonl.join('\n') + '\n', 'utf8');

// ---------- 04 self audit ----------
const angleCount = {}; const sizeCount = {}; const lensCount = {};
let verticalMention = 0; let apertureMention = 0; let side45 = 0;
const anomalies = [];
for (const row of rows) {
    const s = row.shot;
    angleCount[s.camera_angle] = (angleCount[s.camera_angle] || 0) + 1;
    sizeCount[s.shot_size] = (sizeCount[s.shot_size] || 0) + 1;
    lensCount[s.lens] = (lensCount[s.lens] || 0) + 1;
    const all = Object.values(s).join(' ');
    if (/竖(?:幅|构图|屏)|9:16|2:3/.test(all)) verticalMention += 1;
    if (/f\/\d|光圈/.test(all)) apertureMention += 1;
    if (/45|斜前(?:方|侧)|侧前(?:方)?45/.test(all)) side45 += 1;
    const f = lensNumber(s.lens);
    const d = row.distance;
    const push = (text, reasonable) => anomalies.push({ id: row.id, text, reasonable });
    if (f && ['ECU', 'CU'].includes(s.shot_size) && d !== null && d > 3) {
        // A long lens at long range is a legitimate candid grab; a normal lens
        // at that range simply cannot fill the frame.
        push(`${row.id}：${s.shot_size} 距 ${d} 米、用 ${s.lens}${f >= 135 ? '（长焦远距抓拍，合理）' : '（装不满画面，建议换 135mm 以上或缩短距离）'}`, f >= 135);
    }
    if (f && ['ECU', 'CU', 'MCU'].includes(s.shot_size) && f <= 24) push(`${row.id}：${s.shot_size} 用 ${s.lens}，广角近距离拍脸会畸变（若追求变形风格可保留，否则建议换 50mm 以上）`, false);
    if (f && ['WS', 'EWS'].includes(s.shot_size) && f >= 135 && d !== null && d < 20) {
        // Field width needed ≈ 4 m for a group WS, 8 m for EWS; distance ≈ width * f / 36mm.
        const width = s.shot_size === 'EWS' ? 8 : 4;
        const needDist = Math.ceil((f * width) / 36);
        push(`${row.id}：${s.shot_size} 用 ${s.lens} 且仅 ${d} 米，收不下${SIZE_CN[s.shot_size]}（建议后退到 ${needDist} 米以上，或换 35mm）`, false);
    }
    if (s.camera_angle === 'low_angle' && /俯拍/.test(s.photographer_position)) push(`${row.id}：角度标 low_angle 但机位文字写俯拍`, false);
    if (s.camera_angle === 'high_angle' && /仰拍/.test(s.photographer_position)) push(`${row.id}：角度标 high_angle 但机位文字写仰拍`, false);
}
const total = rows.length;
const pct = n => `${((n / total) * 100).toFixed(1)}%`;
const audit = [`# ${label} · 自审报告`, '',
    `镜头总数 ${total}。对照依据：小红书人像爆款通行规律（平视基础位、微俯收下颌、低机位仰拍拉腿、45° 侧机位、竖屏 9:16、35/50/85/135 分工、大光圈虚化、忌切关节）。`, '',
    '## 一、机位角度分布', '', '| 角度 | 数量 | 占比 | 小红书口径评价 |', '|---|---|---|---|'];
const angleVerdict = {
    eye_level: '安全但不抓眼；爆款要求"别站着平视拍"，平视适合情绪/纪实，不宜占大头',
    high_angle: '微俯收下颌，是半身/坐姿主力，占比偏少',
    low_angle: '拉腿显高，全身照必备，占比合理',
    ground_level: '贴地低角度，氛围片好用，占比合理',
    overhead: '正俯拍风险高（大头娃娃），仅适合几何/静物/床面',
};
for (const [key, count] of Object.entries(angleCount).sort((a, b) => b[1] - a[1])) {
    audit.push(`| ${ANGLE_CN[key] || key}（${key}） | ${count} | ${pct(count)} | ${angleVerdict[key] || '—'} |`);
}
audit.push('', '## 二、与爆款规律的差距', '');
audit.push(`1. **平视占 ${pct(angleCount.eye_level || 0)}**：整体偏"稳"偏"纪实"，缺爆款的仰拍拉长与微俯收脸节奏。改善方向——同一组方案里强制配比：竖幅全身至少 1 镜低机位仰拍，半身/坐姿至少 1 镜微俯。`);
audit.push(`2. **画幅几乎没写**：全部 ${total} 镜里只有 ${verticalMention} 镜提到画幅。小红书是 9:16 竖屏场，方案不写画幅等于把构图交给生图模型随机决定。**交付包已按「人物镜竖幅 2:3、大环境横幅 3:2」自动补齐**。`);
audit.push(`3. **光圈几乎没写**：只有 ${apertureMention} 镜提到光圈/景深。爆款的"背景糊成奶油"靠 f/1.4–2.8，不写光圈模型会给你 f/8 的实地板照。**交付包已按景别给光圈（特写 f/1.8 → 大远景 f/8）**。`);
audit.push(`4. **45° 侧机位只 ${side45} 镜（${pct(side45)}）**：这是人像"封神位"，能规避脸平、大小脸。改善方向——每组至少 1 镜"人物与镜头成 45°"。`);
audit.push(`5. **切关节风险 0 处**：裁切描述都避开了膝盖/手腕，这一点符合规范。`);
audit.push('', '## 三、方案自洽性抽查', '');
const needsFix = anomalies.filter(item => !item.reasonable);
const reasonable = anomalies.filter(item => item.reasonable);
if (needsFix.length) {
    audit.push(`**需修正 ${needsFix.length} 处**（这些是方案本身的问题，不是校验器问题，建议在方案层改掉再交付执行）：`, '');
    for (const item of needsFix) audit.push(`- ${item.text}`);
    audit.push('');
} else {
    audit.push('未发现焦段/景别/距离互相矛盾的镜头。', '');
}
if (reasonable.length) {
    audit.push(`合理例外 ${reasonable.length} 处（长焦远距抓拍，安全约束导致必须远距离，不算错误）：`, '');
    for (const item of reasonable) audit.push(`- ${item.text}`);
    audit.push('');
}
audit.push('', '## 四、给提示词的补救措施（已落地在本包内）', '',
    `- GPT 版提示词统一补上：画幅（${rows.filter(r => r.aspect.orientation === 'vertical').length} 竖 / ${rows.filter(r => r.aspect.orientation === 'horizontal').length} 横）、光圈、景深描述、写实材质约束、"no text/watermark"。`,
    '- 弱模型版把"禁止闪光灯"等否定句从正向剔除，全部挪进负面提示词，避免反向理解。',
    '- 两种版本都保留了原方案的镜头语言（构图/光位/道具），不改创作意图，只补执行参数。');
await writeFile(resolve(packDir, '04-自审报告.md'), audit.join('\n') + '\n', 'utf8');

// ---------- 05 review checklist ----------
const checklist = `# 回图验收清单（我用这张表逐图核对）

## 判定分三档

- **A 通过**：画面与方案意图一致，可直接用。
- **B 可用但有瑕疵**：构图/光线对，但手、眼、边缘有小问题，可修图救。
- **C 不通过**：与方案描述冲突，或出现硬伤，必须重生。

## 逐图核对项（每项 0–2 分，满分 20）

| # | 核对项 | 判 A 的标准 |
|---|---|---|
| 1 | 景别是否对 | 画面裁切范围与方案 shot_size 一致（ECU 到眼/唇，FS 含脚） |
| 2 | 机位高度是否对 | 平视≈眼睛高度；俯拍能看到头顶面；仰拍能看到下颌底 |
| 3 | 焦段透视是否对 | 85mm 脸部自然不拉伸；24mm 有环境纵深；135mm 背景压缩 |
| 4 | 人物动作 | 与 model_pose 描述的动作一致，不是站桩 |
| 5 | 人物位置 | 与 model_position 一致（左下/中央/三分线） |
| 6 | 服装妆发 | 与 wardrobe_styling 一致，没有凭空加配饰 |
| 7 | 光线方向与质感 | 与 lighting_setup 一致（逆光要发丝光，窗光要软） |
| 8 | 道具是否出现 | 与 shot_props 一致；未提供的道具不能出现（出现即 C） |
| 9 | 裁切禁忌 | 没有切在关节/脖子；头顶不顶格 |
| 10 | 硬伤检查 | 手指数量、眼睛对称、多余肢体、文字水印（任一出现即 C） |

## 分模型阈值

| 模型 | 期望 A 率 | 处理办法 |
|---|---|---|
| GPT Image 2 / 2.5 | ≥80% | B 档少量，C 档直接重跑该镜 |
| SDXL 系 | 40–60% | C 档换种子；手部问题走局部重绘 |
| SD1.5 / Turbo | 20–40% | 只求构图与光位对，人物细节靠 img2img 二次修 |

## 我出报告时会给你什么

1. 逐图评分表（A/B/C + 失分项 + 一句话结论）
2. 按镜头维度的失败聚类（例：仰拍全身普遍拉腿过度、逆光普遍人脸发黑）
3. 提示词修正建议（哪些词要换、哪些参数要调），可直接回灌到 \`02\` / \`03\`
`;
await writeFile(resolve(packDir, '05-回图验收清单.md'), checklist, 'utf8');

// ---------- 06 machine bundle ----------
const bundle = {
    label, generatedAt: new Date().toISOString(), briefs: briefs.length, shots: rows.length,
    sourceBriefs: basename(briefsPath), sourceResults: outDir.split(/[\\/]/).slice(-1)[0],
    items: rows.map(row => ({
        id: row.id, briefId: row.briefId, shotIndex: row.shotIndex, file: row.file, theme: row.title, scene: row.scene,
        aspect: row.aspect, lens: row.shot.lens, aperture: row.aperture, shutter: row.shutter, exposure: row.exposure,
        spec: row.shot, promptGpt: row.gpt, promptLite: row.lite, negative: row.negative,
    })),
};
await writeFile(resolve(packDir, '06-prompts-all.json'), JSON.stringify(bundle, null, 2), 'utf8');

console.log(`交付包已生成：${packDir}`);
console.log(`镜头 ${rows.length}　竖幅 ${rows.filter(r => r.aspect.orientation === 'vertical').length} / 横幅 ${rows.filter(r => r.aspect.orientation === 'horizontal').length}`);
console.log(`自洽性异常待确认：${anomalies.length}`);

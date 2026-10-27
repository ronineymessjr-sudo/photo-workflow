#!/usr/bin/env node
// Builds SERIES packs where identity and style are hard locks, not hopes.
//
// Every frame prompt in a series starts with two byte-identical blocks:
//   [IDENTITY LOCK] same person as REF…, age band, hair, face/skin/makeup fixed
//   [STYLE LOCK]    one colour grade, one light direction, one aspect, one size
// so a model that only reads the first 40 tokens still gets the same person and
// the same look. `check-series-consistency.mjs` then proves the blocks match.
//
//   node export-series-pack.mjs --briefs briefs-format-2026-10-27.json \
//        --out results/format-2026-10-27-deepseek --dir prompt-packs/2026-10-27-deepseek/series
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

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

function gradeOf(brief) {
    const text = `${brief.input?.style || ''} ${brief.input?.mood || ''} ${brief.input?.scene || ''}`;
    if (/古风|汉服|中式|禅|茶/.test(text)) return 'low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening';
    if (/赛博|霓虹/.test(text)) return 'high-saturation cyan and magenta neon, deep blacks, wet reflective highlights';
    if (/极简|性冷淡|白墙/.test(text)) return 'high-key near-monochrome, clean whites, low contrast, no colour cast';
    if (/日系|胶片|教室/.test(text)) return 'low-contrast pastel with faint green shadows and fine 400-speed grain';
    if (/法式|复古|咖啡馆/.test(text)) return 'warm amber highlights, muted browns, gentle contrast, vintage lens character';
    if (/电影|青橙/.test(text)) return 'teal shadows and warm skin tones, cinematic contrast, subtle halation';
    if (/暗黑|哥特|废墟/.test(text)) return 'desaturated cool grey, crushed blacks, one warm accent light';
    if (/田园|花|清新/.test(text)) return 'bright airy pastel, golden backlight bloom, clean highlights';
    if (/黑白|纪实/.test(text)) return 'black and white with strong grain and high micro-contrast';
    if (/商务|办公/.test(text)) return 'neutral daylight, clean whites, restrained saturation';
    return 'natural colour with a gentle film curve and consistent white balance';
}
function genderOf(brief) {
    const text = `${brief.input?.modelDesc || ''} ${brief.input?.people || ''}`;
    if (/儿童|孩子|小孩|男孩|女孩|小学生/.test(text)) return { label: 'child', cn: '儿童' };
    if (/女|woman|female|lady|girl/i.test(text)) return { label: 'woman', cn: '女性' };
    if (/男|man|male|boy/i.test(text)) return { label: 'man', cn: '男性' };
    if (/猫|狗|宠物/.test(text)) return { label: 'pet owner', cn: '宠物主人' };
    return { label: 'adult', cn: '成年人' };
}
function hairOf(record) {
    const text = (record.shots || []).map(shot => `${shot.wardrobe_styling} ${shot.model_position}`).join(' ');
    if (/低束|盘发|发髻|低马尾/.test(text)) return 'hair tied back in a low bun';
    if (/披发|长发|自然垂落/.test(text)) return 'long hair worn loose';
    if (/短发|寸头/.test(text)) return 'short cropped hair';
    if (/马尾/.test(text)) return 'ponytail';
    return 'hairstyle fixed at the reference frame';
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
            // Twice: "服装待确认，妆发待确认；建议…" leaves "服装，妆发；建议…" after
            // the first pass, and one more strip clears the leftover prefix.
            .replace(/^(?:服装(?:与妆发)?|妆发)[，,；;、\s]*/g, '')
            .replace(/^(?:服装(?:与妆发)?|妆发)[，,；;、\s]*/g, '')
            .replace(/^的/g, '')
            .trim();
        if (text.length < 4) continue;
        counts.set(text, (counts.get(text) || 0) + 1);
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : '';
}
function lightOf(record) {
    const counts = new Map();
    for (const shot of record.shots || []) {
        const text = String(shot.lighting_setup || '').trim();
        if (text.length < 6) continue;
        counts.set(text, (counts.get(text) || 0) + 1);
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : '';
}
function aspectOf(shot) {
    const f = Number(String(shot.lens || '').replace(/[^\d].*$/, '')) || null;
    if (['EWS', 'WS'].includes(shot.shot_size) && f !== null && f <= 35) return { ratio: '3:2', size: '1536x1024', cn: '横幅', en: 'horizontal' };
    return { ratio: '2:3', size: '1024x1536', cn: '竖幅', en: 'vertical' };
}
function bansOf(brief) {
    const extra = String(brief.input?.extra || '');
    const bans = ['no text or labels inside the image', 'no watermark', 'no extra people', 'no props beyond the listed ones'];
    if (/闪光/.test(extra)) bans.push('no flash');
    if (/三脚架/.test(extra)) bans.push('no tripod');
    if (/不入水|不下池/.test(extra)) bans.push('keep the subject out of the water');
    if (/不进入|不得进入|围栏/.test(extra)) bans.push('stay out of the restricted area');
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
    const gender = genderOf(brief);
    const hair = hairOf(record);
    const wardrobe = wardrobeOf(record);
    const light = lightOf(record);
    const bans = bansOf(brief);
    const scene = brief.input?.scene || '';
    const heroIndex = shots.findIndex(shot => ['FS', 'MFS', 'MS'].includes(shot.shot_size) && shot.camera_angle === 'eye_level');
    const hero = heroIndex >= 0 ? heroIndex : 0;
    const aspect = aspectOf(shots[hero]);
    const refFile = `${brief.id}__REF-A.png`;

    // IDENTITY LOCK — byte-identical in every frame of this series. Referential
    // first (works with image-edit models), then explicit attributes so
    // text-only and IP-Adapter pipelines get the same instruction.
    const identity = [
        '[IDENTITY LOCK]',
        'one single person, the same person as the reference image',
        gender.label,
        hair,
        'identical face shape, nose, eye spacing, mouth and jawline in every frame',
        'identical skin tone and identical makeup in every frame',
        'never swap in another face or another model between frames',
    ].join(', ');
    const style = [
        '[STYLE LOCK]',
        grade,
        'one single lighting direction for the whole series',
        `${aspect.ratio} ${aspect.en} framing`,
        'natural skin texture, no beauty-filter plastic look',
    ].join(', ');

    const md = [`# ${code} · ${brief.input?.theme || brief.id}`, '',
        `用例 \`${brief.id}\`　镜头 ${shots.length}　画幅 ${aspect.cn} ${aspect.ratio}（${aspect.size}）`, '',
        '## 一、身份卡（Identity Card）— 全系列不许变', '',
        '| 项目 | 锁定值 | 说明 |', '|---|---|---|',
        `| 性别/年龄段 | ${gender.cn}（${gender.label}） | 由需求推断，不符请先改这里 |`,
        `| 发型 | ${hair} | 必须由参考帧定死 |`,
        '| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |',
        '| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |',
        `| 服装 | ${wardrobe || '开拍前定一套，全系列不换'} | 换衣即断系列 |`,
        `| 场地 | ${scene} | 同一处，背景元素不跑 |`,
        `| 光线 | ${light} | 主光方向不变 |`,
        `| 调色 | ${grade} | 一套 LUT 到底 |`, '',
        '## 二、两条锁（每帧提示词开头，必须逐字相同）', '',
        '```text', identity, '```', '', '```text', style, '```', '',
        '> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。', '',
        '## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）', ''];
    const heroPrompt = String(shots[hero].generator_prompt || '')
        .replace(/[,，]?\s*\d{1,3}(?:-\d{1,3})?\s*mm\s*(?:lens|镜头)?/gi, '')
        .replace(/\b(?:full[ -]?body(?: shot)?|medium shot|close[ -]?up|half[ -]?body|wide shot)\b/gi, '')
        .replace(/,\s*,/g, ',')
        .replace(/[.\s]+$/, '')
        .trim();
    const refs = [
        { name: '参考帧 A · 正面胸像', frame: 'head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2' },
        { name: '参考帧 B · 45° 侧脸', frame: 'head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2' },
        { name: '参考帧 C · 全身定妆', frame: 'full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4' },
    ];
    for (const ref of refs) {
        md.push(`### ${ref.name}`, '', '```text', `${identity}, ${style}, ${heroPrompt}, ${ref.frame}, photorealistic editorial photograph, clean unmarked frame.`, '```', '');
    }
    md.push(`> 三张里挑**脸最稳、衣服最还原**的一张，命名为 \`${refFile}\`，后面所有帧都从它出发。`, '');

    md.push('## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）', '');
    md.push('| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |', '|---|---|---|---|---|---|---|');
    for (const [i, shot] of shots.entries()) {
        md.push(`| ${i + 1} | ${shot.shot_language} | ${SIZE_CN[shot.shot_size] || shot.shot_size} | ${ANGLE_CN[shot.camera_angle] || shot.camera_angle} | ${shot.lens} | f/${APERTURE[shot.shot_size] ?? 2.8} | ${shot.photographer_position} |`);
    }
    md.push('');

    const frames = [];
    for (const [i, shot] of shots.entries()) {
        const ap = APERTURE[shot.shot_size] ?? 2.8;
        // One aspect for the whole series: a mixed-orientation set stops reading
        // as one shoot (and check-series-consistency.mjs rejects it).
        const shotAspect = aspect;
        const propsEn = /^无/.test(String(shot.shot_props || '').trim()) ? 'none' : shot.shot_props;
        const content = String(shot.generator_prompt || '')
            .replace(/[,，]?\s*\d{1,3}(?:-\d{1,3})?\s*mm\s*(?:lens|镜头)?/gi, '')
            .replace(/[.\s]+$/, '')
            .trim();
        const dof = ['ECU', 'CU', 'MCU'].includes(shot.shot_size)
            ? 'shallow depth of field with creamy bokeh'
            : 'subject and environment both clearly readable';
        const framePrompt = `${identity}, ${style}, [FRAME ${i + 1}/${shots.length}] ${shotAspect.ratio} ${shotAspect.en}, ${content}, ${shot.lens} lens at f/${ap}, ${dof}, photorealistic editorial photograph, clean unmarked frame.`;

        md.push(`### ${code}-${String(i + 1).padStart(2, '0')}　${shot.shot_language}`, '');
        md.push(`- 文件名：\`${brief.id}__${String(i + 1).padStart(2, '0')}.png\``);
        md.push(`- 景别/角度/焦段/光圈：${SIZE_CN[shot.shot_size] || shot.shot_size} / ${ANGLE_CN[shot.camera_angle] || shot.camera_angle} / ${shot.lens} / f/${ap} / ${shotAspect.cn}`);
        md.push(`- 机位：${shot.photographer_position}`);
        md.push(`- 动作：${shot.model_pose}`);
        md.push(`- 道具：${shot.shot_props}　｜　裁切：${shot.crop_boundary}`);
        md.push(`- 必见：${shot.must_show}　｜　废片判据：${shot.reject_if}`);
        md.push('');
        md.push('```text', framePrompt, '```', '');
        md.push(`编辑指令（用 REF 图生图）：\`Keep the face, hairstyle and outfit identical to ${refFile}. Change only camera position, framing and pose to match FRAME ${i + 1}. Props allowed: ${propsEn}.\``, '');
        md.push(`负面：\`${bans.join(', ')}, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon\``, '');
        frames.push({
            id: `${code}-${String(i + 1).padStart(2, '0')}`,
            file: `${brief.id}__${String(i + 1).padStart(2, '0')}.png`,
            size: shot.shot_size, angle: shot.camera_angle, lens: shot.lens, aperture: ap,
            aspect: `${shotAspect.ratio} ${shotAspect.en}`,
            prompt: framePrompt,
            promptHash: createHash('sha1').update(`${identity}|${style}`).digest('hex').slice(0, 12),
        });
    }

    md.push('## 五、参考图模式（不同模型怎么保证不换脸）', '',
        '| 模型/工具 | 保证同一人的手段 | 备注 |', '|---|---|---|',
        `| GPT Image 2 / 2.5 | 用 \`${refFile}\` 走编辑模式，\`input_fidelity\` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |`,
        '| Flux Kontext / nano-banana | 参考图 + "same person as input image" | 多图参考时 REF 放第一位 |',
        '| SDXL + IP-Adapter FaceID / InstantID / PuLID | 参考图作 face embedding，权重 0.7–0.9 | 没有这些插件，纯文生图必漂 |',
        '| SD1.5 + Roop/Reactor 后处理 | 先出图再统一换脸，最后统一调色 | 保底方案，适合批量 |',
        '| 任意模型 + 固定种子 | 同种子同提示词只改机位句 | 仅对同构图有效，换景别仍会漂 |', '');

    md.push('## 六、一致性自检（出完逐项过，不过就重出该帧）', '',
        '- [ ] 脸型/五官一致（不是"长得像"，是同一个人）',
        '- [ ] 发型/发色一致',
        '- [ ] 服装一致（版型、颜色、配饰都在）',
        '- [ ] 场地一致（背景建筑、家具、标识不跑）',
        '- [ ] 主光方向一致（阴影落点不跳边）',
        '- [ ] 色温/对比一致（拼在一起不像两张片子）',
        '- [ ] 画幅一致（竖就全竖，不混排）',
        '- [ ] 无文字/水印/多余人', '',
        '**"同一个人"的量化口径**（不靠肉眼）：用 InsightFace/ArcFace 提取每帧人脸 embedding，与 REF 帧比对余弦相似度——', '',
        '| 相似度 | 判定 | 处理 |', '|---|---|---|',
        '| ≥ 0.55 | 同一人 | 收 |',
        '| 0.40–0.55 | 疑似换脸 | 优先重出；必须用时只保留侧脸/背影帧 |',
        '| < 0.40 | 换人了 | 直接废片，重出', '',
        '批量脚本可以一次跑完整个系列，把低于阈值的帧号直接列出来。', '');

    await writeFile(resolve(packDir, `${code}-${brief.id}.md`), md.join('\n') + '\n', 'utf8');
    await writeFile(resolve(packDir, `${code}-${brief.id}.consistency.json`), JSON.stringify({
        series: code, briefId: brief.id, theme: brief.input?.theme || brief.id, refFile,
        identityLock: identity, styleLock: style,
        identity: { gender: gender.label, hair, wardrobe, scene, light },
        style: { grade, aspect: `${aspect.ratio} ${aspect.en}`, size: aspect.size, bans },
        refs: refs.map((ref, index) => ({
            name: ref.name,
            file: `${brief.id}__REF-${['A', 'B', 'C'][index]}.png`,
            prompt: `${identity}, ${style}, ${heroPrompt}, ${ref.frame}, photorealistic editorial photograph, clean unmarked frame.`,
        })),
        frames,
    }, null, 2), 'utf8');

    index.push({ code, id: brief.id, theme: brief.input?.theme || brief.id, shots: shots.length, hero: `${code}-${String(hero + 1).padStart(2, '0')}`, aspect: `${aspect.cn} ${aspect.ratio}`, wardrobe: wardrobe || '（开拍前定）' });
}

const overview = ['# 系列组图总览', '',
    `共 ${index.length} 个系列，每系列一套组图：同一人、同一服装、同一场地、同一主光、同一调色、同一画幅。`, '',
    '## 一致性是怎么被"强制"的', '',
    '每个系列有两条**逐字相同**的锁，放在每帧提示词最前面：', '',
    '- `[IDENTITY LOCK]`：同一个人（指代 REF）+ 性别年龄 + 发型 + 脸型/五官/肤色/妆容逐帧一致 + 不得换人',
    '- `[STYLE LOCK]`：一套调色 + 统一主光方向 + 固定画幅 + 真实肤质', '',
    '正文（构图/姿势/道具）每帧变化，这两段一个字不动；`check-series-consistency.mjs` 逐帧校验有没有被改。', '',
    '## 一览', '', '| 系列 | 用例 | 主题 | 镜头数 | 参考帧 | 画幅 | 服装（锁定） |', '|---|---|---|---|---|---|---|'];
for (const item of index) {
    overview.push(`| ${item.code} | \`${item.id}\` | ${item.theme} | ${item.shots} | ${item.hero} | ${item.aspect} | ${item.wardrobe.slice(0, 36)} |`);
}
overview.push('', '## 出图顺序', '',
    '1. 出 3 张定妆参考帧 → 挑 1 张命名 `{用例ID}__REF-A.png`',
    '2. 用 REF 走图生图/编辑模式，逐帧只改机位与姿势',
    '3. 全系列出完 → 3×3 / 4×3 接触印样，**标签后期加，图内不许有字**',
    '4. 过一致性自检 8 项', '');
await writeFile(resolve(packDir, '00-系列总览.md'), overview.join('\n') + '\n', 'utf8');

console.log(`系列包已生成：${packDir}（${index.length} 个系列，${index.reduce((sum, item) => sum + item.shots, 0)} 帧）`);

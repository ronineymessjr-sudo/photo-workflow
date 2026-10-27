#!/usr/bin/env node
// Builds the continuity contract from the audited series packs.
// locked.* can only be filled here from the original brief; shots are appended
// with variant fields only, so a later shot cannot rewrite the scene or wardrobe.
//
//   node continuity/build.mjs --dir prompt-packs/2026-10-27-deepseek/series \
//        --briefs briefs-format-2026-10-27.json --out continuity/groups
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const seriesDir = resolve(arg('dir', 'prompt-packs/2026-10-27-deepseek/series'));
const briefsPath = resolve(arg('briefs', 'briefs-format-2026-10-27.json'));
const outDir = resolve(arg('out', 'continuity/groups'));
await mkdir(outDir, { recursive: true });

const briefs = JSON.parse(await readFile(briefsPath, 'utf8'));
const briefById = new Map(briefs.map(brief => [brief.id, brief]));

const SIZE_TYPE = { ECU: 'detail-extreme-close-up', CU: 'close-up', MCU: 'medium-close-up', MS: 'medium', MFS: 'medium-full', FS: 'full-body', WS: 'environmental-wide', EWS: 'establishing-extreme-wide' };
const SEASON = /春|樱|花田|油菜花/;
const WEATHER = /雨|雪|雾|阴天|风沙|晴/;

function timeOfDay(brief) {
    const text = `${brief.input?.scene || ''} ${brief.input?.mood || ''} ${brief.input?.extra || ''} ${brief.input?.theme || ''}`;
    if (/蓝调|黄昏|日落|傍晚|golden/i.test(text)) return '黄昏/蓝调窗口';
    if (/夜|霓虹|午夜|车流/.test(text)) return '夜间';
    if (/午后|下午/.test(text)) return '午后';
    if (/清晨|日出|早晨/.test(text)) return '清晨';
    if (/正午|中午/.test(text)) return '正午';
    return '白天';
}
function weatherOf(brief) {
    const text = `${brief.input?.scene || ''} ${brief.input?.extra || ''} ${brief.input?.mood || ''}`;
    const found = text.match(WEATHER);
    if (found) return found[0] === '晴' ? '晴' : found[0];
    return '阴天（散射光，无直射硬光）';
}
function seasonOf(brief) {
    const text = `${brief.input?.scene || ''} ${brief.input?.extra || ''} ${brief.input?.theme || ''}`;
    if (SEASON.test(text)) return '春';
    if (/雪|冬/.test(text)) return '冬';
    if (/夏|烈日|泳池/.test(text)) return '夏';
    if (/秋|落叶|银杏/.test(text)) return '秋';
    return '不限定（按场地植被判断）';
}

const files = (await readdir(seriesDir)).filter(name => name.endsWith('.consistency.json')).sort();
const built = [];
for (const file of files) {
    const data = JSON.parse(await readFile(join(seriesDir, file), 'utf8'));
    const brief = briefById.get(data.briefId);
    if (!brief) continue;
    const input = brief.input || {};

    const locked = {
        subject: `${input.modelDesc || '一名成年人'}（同一人物，外观以身份参考图为准）`,
        wardrobe: data.identity.wardrobe || '开拍前确认一套，全系列不换',
        location: input.scene || '',
        season: seasonOf(brief),
        weather: weatherOf(brief),
        timeOfDay: timeOfDay(brief),
        light: data.identity.light || '',
        colorGrade: data.style.grade,
        styleProfile: `从用户选定的风格参考提取：${input.style || '按题材'}；${data.style.grade}`,
        mustKeep: ['同一人物', '同一服装', '同一地点', '同一天气', '同一光线方向', '同一调色'],
        mustAvoid: (data.style.bans || []).filter(ban => typeof ban === 'string'),
    };

    // References are declared, not assumed: nothing runs until a human marks them
    // confirmed. Style anchor must be a user-selected reference image, never a
    // frame we generated ourselves.
    const references = [
        { assetId: `${data.briefId}-identity`, role: 'identity', status: 'pending', note: '人物参考：只负责脸/发型/体态' },
        { assetId: `${data.briefId}-scene`, role: 'scene', status: 'pending', note: '场景参考：只负责地点结构与空间关系' },
        { assetId: `${data.briefId}-style`, role: 'style', status: 'pending', note: '风格参考：只负责构图/光线/色彩/颗粒，必须来自用户图库' },
    ];

    const shots = data.frames.map(frame => ({
        shotId: frame.id,
        shotType: SIZE_TYPE[frame.size] || frame.size,
        camera: `${frame.angle}，${frame.lens}`,
        lens: frame.lens,
        distance: (() => {
            const match = String(frame.prompt).match(/camera\s*([\d.]+)\s*(meters?|m)\b/i);
            return match ? `${match[1]} 米` : '';
        })(),
        action: '',
        subjectPlacement: '',
        mustKeep: ['同一人物', '同一服装', '同一地点', '同一天气'],
        prompt: frame.prompt,
        size: frame.size,
        aspect: frame.aspect,
        props: '',
        file: frame.file,
    }));

    const group = { continuityGroupId: `${input.theme || data.theme}-${data.series}`, series: data.series, briefId: data.briefId, locked, references, master: { confirmedBy: 'none' }, shots };
    const lockedHash = createHash('sha1').update(JSON.stringify(locked)).digest('hex').slice(0, 12);
    await writeFile(join(outDir, `${data.series}-${data.briefId}.json`), JSON.stringify({ ...group, lockedHash }, null, 2), 'utf8');
    built.push({ series: data.series, briefId: data.briefId, shots: shots.length, lockedHash });
}

console.log(`已生成 ${built.length} 份连续性契约 → ${outDir}`);
console.log(`锁定字段版本（hash）示例：${built[0].series} ${built[0].lockedHash}`);
console.log('下一步：把三张参考图落到磁盘并标记 confirmed，再把 master.confirmedBy 设为 human，之后才允许逐镜生成。');

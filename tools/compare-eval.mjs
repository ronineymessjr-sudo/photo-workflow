// Compare two evaluation runs side by side.
//
//   node tools/compare-eval.mjs --a runtime/eval/flux-baseline --b runtime/eval/seedream-v1
//
// Prints a frame-by-frame table and writes comparison.md next to the runs, so a
// model upgrade decision has evidence instead of impressions.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};
const A = argOf('a');
const B = argOf('b');
if (!A || !B) {
    console.log('用法: node tools/compare-eval.mjs --a <目录> --b <目录>');
    process.exit(1);
}

const load = async dir => JSON.parse(await readFile(path.join(dir, 'report.json'), 'utf8'));
const a = await load(A);
const b = await load(B);
const byShot = report => new Map(report.frames.map(frame => [frame.shotId, frame]));
const aMap = byShot(a);
const bMap = byShot(b);

const lines = [
    `# 评测对比：${a.label} vs ${b.label}`,
    '',
    `- A：${a.provider}（${a.at.slice(0, 16).replace('T', ' ')}）`,
    `- B：${b.provider}（${b.at.slice(0, 16).replace('T', ' ')}）`,
    '',
    '| 镜头 | 这张考什么 | A 耗时 | B 耗时 | A 大小 | B 大小 | A seed | B seed |',
    '|---|---|---|---|---|---|---|---|',
];

for (const shotId of [...new Set([...aMap.keys(), ...bMap.keys()])].sort()) {
    const frameA = aMap.get(shotId);
    const frameB = bMap.get(shotId);
    const cell = (value, suffix = '') => (value === undefined ? '失败' : `${value}${suffix}`);
    lines.push(`| ${shotId} | ${(frameA || frameB)?.why || ''} | ${cell(frameA?.elapsed, 's')} | ${cell(frameB?.elapsed, 's')} | ${cell(frameA && Math.round(frameA.bytes / 1024), 'KB')} | ${cell(frameB && Math.round(frameB.bytes / 1024), 'KB')} | ${cell(frameA?.seed)} | ${cell(frameB?.seed)} |`);
}

const stats = report => {
    const ok = report.frames.filter(frame => frame.ok);
    return {
        ok: ok.length,
        total: report.frames.length,
        avgElapsed: ok.length ? (ok.reduce((sum, frame) => sum + frame.elapsed, 0) / ok.length).toFixed(1) : '-',
        anchored: ok.filter(frame => frame.anchored).length,
        avgTokens: ok.length ? Math.round(ok.reduce((sum, frame) => sum + (frame.promptTokens || 0), 0) / ok.length) : '-',
    };
};
const sa = stats(a);
const sb = stats(b);

lines.push('', '## 汇总', '', '| 项 | A | B |', '|---|---|---|');
lines.push(`| 成功 | ${sa.ok}/${sa.total} | ${sb.ok}/${sb.total} |`);
lines.push(`| 平均耗时 | ${sa.avgElapsed}s | ${sb.avgElapsed}s |`);
lines.push(`| 锚定帧数 | ${sa.anchored} | ${sb.anchored} |`);
lines.push(`| 提示词平均 token | ${sa.avgTokens} | ${sb.avgTokens} |`);

lines.push('', '## 怎么判读', '',
    '自动能判的只有这些：能不能出、多快、有没有走锚点、提示词多长。',
    '',
    '**质量必须并排看图**，重点看四件：',
    '1. 主体有没有丢（`EWS` 那一格）',
    '2. 机位有没有被执行（`low_angle` 那一格）',
    '3. 皮肤是不是照片级（`CU` 那格的毛孔、雀斑、光衰减）',
    '4. 系列之间是不是同一个人',
    '',
    '两边图片分别在：', '', '```', path.resolve(A), path.resolve(B), '```');

const output = path.join(path.dirname(A), `comparison-${a.label}-vs-${b.label}.md`);
await writeFile(output, lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\n已写入 ${output}`);

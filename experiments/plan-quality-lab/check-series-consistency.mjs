#!/usr/bin/env node
// Verifies that every frame in every series still carries the exact same
// [IDENTITY LOCK] and [STYLE LOCK] strings, that no Chinese leaks into the
// English prompts, and that wardrobe/grade/aspect stay constant per series.
//
//   node check-series-consistency.mjs --dir prompt-packs/2026-10-27-deepseek/series
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const dir = resolve(arg('dir', 'prompt-packs/2026-10-27-deepseek/series'));

const files = (await readdir(dir)).filter(name => name.endsWith('.consistency.json')).sort();
const problems = [];
let seriesCount = 0;
let frameCount = 0;
const cjk = /[\u4e00-\u9fa5]/;

for (const file of files) {
    const data = JSON.parse(await readFile(resolve(dir, file), 'utf8'));
    seriesCount += 1;
    const { series, briefId, identityLock, styleLock, realismLock, frames } = data;
    if (!identityLock?.startsWith('[IDENTITY LOCK]')) problems.push(`${series}: 缺少 [IDENTITY LOCK]`);
    if (!styleLock?.startsWith('[STYLE LOCK]')) problems.push(`${series}: 缺少 [STYLE LOCK]`);
    if (!realismLock?.startsWith('[REALISM LOCK]')) problems.push(`${series}: 缺少 [REALISM LOCK]（会退回磨皮广告片质感）`);
    if (!frames?.length) { problems.push(`${series}: 没有分镜帧`); continue; }
    const hashes = new Set();
    for (const frame of frames) {
        frameCount += 1;
        if (!frame.prompt.startsWith(identityLock)) problems.push(`${series}/${frame.id}: 帧提示词开头不是同一条 IDENTITY LOCK`);
        if (!frame.prompt.includes(styleLock)) problems.push(`${series}/${frame.id}: 帧提示词里找不到同一条 STYLE LOCK`);
        if (realismLock && !frame.prompt.includes(realismLock)) problems.push(`${series}/${frame.id}: 帧提示词里找不到同一条 REALISM LOCK`);
        hashes.add(frame.promptHash);
        // English prompt must stay English; CJK in a prompt measurably degrades
        // image models and usually means a spec field leaked through.
        const promptWithoutLocks = frame.prompt
            .replace(identityLock, '').replace(styleLock, '')
            .replace(realismLock || '', '');
        if (cjk.test(promptWithoutLocks)) problems.push(`${series}/${frame.id}: 提示词正文含中文，会拖累模型`);
        if (!/\d{1,3}(-\d{1,3})?mm lens at f\/\d/.test(frame.prompt)) problems.push(`${series}/${frame.id}: 缺焦段/光圈参数`);
        if (!/(2:3 vertical|3:2 horizontal)/.test(frame.prompt)) problems.push(`${series}/${frame.id}: 缺画幅声明`);
    }
    if (hashes.size !== 1) problems.push(`${series}: 各帧锁不一致（出现 ${hashes.size} 个不同 hash）`);
    // Aspect must not mix inside one series unless the frame is intentionally a wider frame.
    const aspects = new Set(frames.map(frame => frame.aspect));
    if (aspects.size > 1) problems.push(`${series}: 画幅不统一 → ${[...aspects].join(' / ')}`);
}

console.log(`检查 ${seriesCount} 个系列 / ${frameCount} 帧`);
if (problems.length) {
    console.log(`发现 ${problems.length} 处问题：`);
    for (const item of problems.slice(0, 40)) console.log(' -', item);
    process.exitCode = 1;
} else {
    console.log('全部通过：每帧的 IDENTITY LOCK / STYLE LOCK 逐字一致，画幅统一，提示词无中文，参数齐全');
}

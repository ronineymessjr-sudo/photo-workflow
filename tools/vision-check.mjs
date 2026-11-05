#!/usr/bin/env node
// DeepSeek vision check on one generated image.
//
// The brain is a single service: DeepSeek reads the frame and answers the three
// objective QC questions. The key comes from DEEPSEEK_API_KEY or the DPAPI store
// used by the local AI panel - never from a file in the repo.
//
//   node tools/vision-check.mjs --image out.png --size WS --camera "eye_level, 35mm" \
//        --wardrobe "炭灰大衣" --location "旧车站月台" --weather 雨
import { readFile } from 'node:fs/promises';
import { prescreen, mergeScores, summariseVision, PRE_SCREEN_ITEMS } from '../api/continuity-vision.mjs';
import { createLocalAiCredentials } from './local-ai-credentials.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};

const imagePath = arg('image', '');
if (!imagePath) {
    console.error('用法：node tools/vision-check.mjs --image 图.png --wardrobe 服装 --location 地点 [--weather 天气] [--size WS] [--camera "eye_level, 35mm"]');
    process.exit(2);
}

const buffer = await readFile(imagePath);
const mime = imagePath.toLowerCase().endsWith('.jpg') || imagePath.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
const imageDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

let env = { ...process.env };
if (!env.DEEPSEEK_API_KEY) {
    // Reuse the key the local panel already stores (DPAPI-encrypted, per user).
    const credentials = createLocalAiCredentials();
    const stored = await credentials.load().catch(() => null);
    if (stored?.provider === 'deepseek' && stored.apiKey) {
        env = { ...env, DEEPSEEK_API_KEY: stored.apiKey, DEEPSEEK_BASE_URL: env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com' };
        console.log('已从本地加密密钥库载入 DeepSeek 密钥');
    }
}

const shot = {
    size: arg('size', 'MS'),
    camera: arg('camera', '未指定'),
    lens: arg('lens', ''),
    subjectPlacement: arg('placement', ''),
};
const locked = {
    subject: arg('subject', '一名成年人'),
    wardrobe: arg('wardrobe', '未提供'),
    location: arg('location', '未提供'),
    weather: arg('weather', '未提供'),
    timeOfDay: arg('time', '未提供'),
};

console.log(`检查：${imagePath}（${Math.round(buffer.length / 1024)}KB）`);
console.log(`锁定条件：服装 ${locked.wardrobe}｜地点 ${locked.location}｜天气 ${locked.weather}`);

const vision = await prescreen({ imageDataUrl, shot, locked, env });
if (!vision.available) {
    console.error(`\n❌ ${vision.reason}`);
    if (String(vision.reason).includes('DEEPSEEK_API_KEY')) {
        console.error('配置方式（二选一）：');
        console.error('  1) 环境变量：set DEEPSEEK_API_KEY=sk-...  （PowerShell: $env:DEEPSEEK_API_KEY="sk-..."）');
        console.error('  2) 打开本地面板的 AI 设置页保存一次，会存进 Windows DPAPI 加密库');
    }
    process.exit(3);
}

const merged = mergeScores(Object.fromEntries(PRE_SCREEN_ITEMS.map(item => [item, 'unknown'])), vision.scores);
console.log('\n判定：');
for (const item of PRE_SCREEN_ITEMS) {
    const value = vision.scores[item];
    const label = value === 'fail' ? '不通过' : '未判定（需人眼）';
    console.log(`  ${item}: ${label}`);
}
if (vision.scores.notes) console.log(`  备注：${vision.scores.notes}`);
console.log(`\n小结：${summariseVision(vision)}`);
console.log('提示：视觉只会把问题判为不通过，不会替你判通过；关键项仍需人工确认。');
void merged;

#!/usr/bin/env node
// Preflight for the local identity-locked pipeline.
// Tells you exactly what is missing before you waste a generation run:
//   - is ComfyUI reachable
//   - are the identity / controlnet nodes installed
//   - are the checkpoints, IP-Adapter and insightface models on disk
//
//   node preflight.mjs --config comfy/series.config.json
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const configPath = resolve(arg('config', 'comfy/series.config.json'));
const config = JSON.parse(await readFile(configPath, 'utf8'));
const base = config.comfy.url.replace(/\/$/, '');

const REQUIRED_NODES = [
    'CheckpointLoaderSimple', 'CLIPTextEncode', 'EmptyLatentImage', 'KSampler',
    'VAEDecode', 'SaveImage', 'LoadImage',
    'IPAdapterUnifiedLoader', 'IPAdapter',            // ComfyUI_IPAdapter_plus
];
const OPTIONAL_NODES = [
    'ControlNetLoader', 'ControlNetApplyAdvanced',     // core
    'IPAdapterAdvanced', 'IPAdapterFaceID',            // extra identity strength
];

async function getJson(path) {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

let objectInfo = null;
try {
    objectInfo = await getJson('/object_info');
    console.log(`✅ ComfyUI 可访问：${base}（节点 ${Object.keys(objectInfo).length} 个）`);
} catch (error) {
    console.log(`❌ 连不上 ComfyUI（${base}）：${error.message}`);
    console.log('   先启动：ComfyUI_windows_portable\\ComfyUI_windows_portable\\run_nvidia_gpu.bat');
    process.exitCode = 1;
}

if (objectInfo) {
    const missing = REQUIRED_NODES.filter(name => !objectInfo[name]);
    const missingOptional = OPTIONAL_NODES.filter(name => !objectInfo[name]);
    if (missing.length) {
        console.log(`❌ 缺少必要节点：${missing.join(', ')}`);
        console.log('   装法：cd ComfyUI/custom_nodes && git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus');
        console.log('   还需要：pip install insightface onnxruntime（在 ComfyUI 的 python_embeded 里跑）');
        process.exitCode = 1;
    } else {
        console.log('✅ 身份锁定节点齐全（IPAdapterUnifiedLoader / IPAdapter）');
    }
    if (missingOptional.length) console.log(`ℹ️  可选节点未装：${missingOptional.join(', ')}（不影响跑，锁姿势/锁场景时再装）`);

    // Model file inventory straight from ComfyUI so paths match reality.
    for (const [label, folder, key] of [
        ['checkpoint', 'checkpoints', config.model.checkpoint],
        ['controlnet（锁场景）', 'controlnet', config.sceneLock.controlnetModel],
        ['controlnet（锁姿势）', 'controlnet', config.poseLock.controlnetModel],
    ]) {
        if (!key) continue;
        try {
            const list = await getJson(`/models/${folder}`);
            const found = list.some(name => name === key || name.endsWith(`/${key}`));
            console.log(found ? `✅ ${label}：${key}` : `❌ ${label} 缺失：${key}（放到 ComfyUI/models/${folder}/）`);
            if (!found) process.exitCode = 1;
        } catch (error) {
            console.log(`⚠️  无法读取 /models/${folder}：${error.message}`);
        }
    }
}

// InsightFace 的 buffalo_l 是 FaceID 的身份来源，放错位置会静默退化成普通 IP-Adapter。
const insightfacePaths = [
    'D:/AI项目/ComfyUI/ComfyUI_windows_portable/ComfyUI_windows_portable/ComfyUI/models/insightface/models/buffalo_l',
    'D:/AI项目/ComfyUI/ComfyUI_windows_portable_cu126/ComfyUI_windows_portable/ComfyUI/models/insightface/models/buffalo_l',
];
const hasInsightface = insightfacePaths.some(dir => existsSync(dir));
console.log(hasInsightface ? '✅ insightface buffalo_l 就位' : '❌ 缺 insightface buffalo_l（FaceID 会失效，只能退化成风格参考）');

console.log('');
console.log('检查完成。全绿之后运行：node comfy/run-series.mjs --series S01 --config comfy/series.config.json');

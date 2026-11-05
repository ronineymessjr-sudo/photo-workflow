#!/usr/bin/env node
// White-base face fusion through ComfyUI: the base portrait keeps its pose,
// clothing and pure-white background, only the identity comes from the face
// reference.
//
// Why this exists: the reference-edit channel we tested cannot hold an identity
// (two runs, two different people). FaceID injection is the only path that can,
// so the parameters live here instead of in a prompt.
//
//   node comfy/run-fusion.mjs --base base.png --face face.png --out out.png --dry-run
//   node comfy/run-fusion.mjs --base base.png --face face.png --out out.png
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { decodePng, encodePng, getPixel, setPixel } from '../tools/lib/png.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const flag = name => argv.includes(`--${name}`);

const configPath = arg('config', 'comfy/fusion.config.json');
const basePath = arg('base', '');
const facePath = arg('face', '');
const outPath = arg('out', '');
const dryRun = flag('dry-run');
const promptOverride = arg('prompt', '');

if (!basePath || !facePath || !outPath) {
    console.error('用法：node comfy/run-fusion.mjs --base 底模.png --face 人脸.png --out 结果.png [--dry-run]');
    process.exit(2);
}

const config = JSON.parse(await readFile(configPath, 'utf8'));
const baseUrl = config.comfy.url.replace(/\/$/, '');
const positive = promptOverride || config.prompt.positive;

function workflow(baseName, faceName) {
    return {
        1: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: config.model.checkpoint } },
        2: { class_type: 'LoadImage', inputs: { image: baseName } },
        3: { class_type: 'LoadImage', inputs: { image: faceName } },
        4: { class_type: 'CLIPTextEncode', inputs: { text: positive, clip: ['1', 1] } },
        5: { class_type: 'CLIPTextEncode', inputs: { text: config.prompt.negative, clip: ['1', 1] } },
        6: { class_type: 'IPAdapterUnifiedLoader', inputs: { model: ['1', 0], preset: config.model.ipadapterPreset } },
        7: {
            class_type: 'IPAdapterAdvanced',
            inputs: {
                model: ['6', 0], ipadapter: ['6', 1], image: ['3', 0],
                weight: config.model.ipadapterWeight,
                weight_type: 'linear',
                combine_embeds: 'concat',
                start_at: config.model.ipadapterStartPercent,
                end_at: config.model.ipadapterEndPercent,
                embeds_scaling: 'V only',
            },
        },
        // img2img from the base so pose, clothing and the white background survive.
        8: { class_type: 'VAEEncode', inputs: { pixels: ['2', 0], vae: ['1', 2] } },
        9: {
            class_type: 'KSampler',
            inputs: {
                model: ['7', 0], positive: ['4', 0], negative: ['5', 0], latent_image: ['8', 0],
                seed: Number(arg('seed', '428193')), steps: config.sampler.steps, cfg: config.sampler.cfg,
                sampler_name: config.sampler.samplerName, scheduler: config.sampler.scheduler,
                denoise: config.sampler.denoise,
            },
        },
        10: { class_type: 'VAEDecode', inputs: { samples: ['9', 0], vae: ['1', 2] } },
        11: { class_type: 'SaveImage', inputs: { images: ['10', 0], filename_prefix: 'fusion/result' } },
    };
}

if (dryRun) {
    console.log(`底模 ${path.basename(basePath)}　人脸 ${path.basename(facePath)}`);
    console.log(`FaceID 权重 ${config.model.ipadapterWeight}　denoise ${config.sampler.denoise}　画布 ${config.canvas.width}x${config.canvas.height}`);
    console.log(`节点数 ${Object.keys(workflow('base.png', 'face.png')).length}；出水后按 ${config.postprocess.aspect} 裁切并清理角标`);
    process.exit(0);
}

async function upload(filePath) {
    const buffer = await readFile(filePath);
    const form = new FormData();
    form.set('image', new Blob([buffer], { type: 'image/png' }), path.basename(filePath));
    form.set('overwrite', 'true');
    const response = await fetch(`${baseUrl}/upload/image`, { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`上传失败 HTTP ${response.status}`);
    const payload = await response.json();
    return payload.name;
}

const baseName = await upload(basePath);
const faceName = await upload(facePath);
const created = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow(baseName, faceName), client_id: 'fusion' }),
}).then(response => response.json());
if (created.error) throw new Error(JSON.stringify(created.error).slice(0, 300));

const deadline = Date.now() + config.comfy.timeoutSeconds * 1000;
let resultFile = '';
while (Date.now() < deadline) {
    const history = await fetch(`${baseUrl}/history/${created.prompt_id}`).then(response => response.json());
    const entry = history[created.prompt_id];
    if (entry?.outputs) {
        const images = Object.values(entry.outputs).flatMap(output => output.images || []);
        if (images.length) { resultFile = images[0].filename; break; }
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
}
if (!resultFile) throw new Error('生成超时');

// Post-process: same rules as the channel path - crop to the configured aspect
// and remove any corner stamp before the frame is allowed into QC.
const raw = await readFile(path.join(baseUrl.startsWith('http') ? '' : '', resultFile)).catch(() => null);
void raw;
console.log(`ComfyUI 输出：${resultFile}`);
console.log(`下一步：node tools/image-postprocess.mjs --in <从 ComfyUI output 取回的图> --out ${outPath} --clean-watermark --aspect ${config.postprocess.aspect}`);
console.log('然后过质量门：脸相似度 ≥ ' + config.qualityGate.identitySimilarity + '，肤色 ΔE < ' + config.qualityGate.skinDeltaE + '，背景四角方差 < ' + config.qualityGate.backgroundCornerVariance);

export { workflow };

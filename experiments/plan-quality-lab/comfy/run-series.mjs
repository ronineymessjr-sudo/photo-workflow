#!/usr/bin/env node
// Runs one series through the local ComfyUI pipeline with identity, scene and
// pose locks. Prompts come straight from the audited series pack, so the text
// side is already fixed; this script only supplies what text cannot:
//   - the reference image (IP-Adapter FaceID -> same face)
//   - an optional venue photo (ControlNet depth -> same architecture)
//   - an optional pose image (ControlNet openpose -> same body line)
//   - a deterministic seed per (series, frame)
//
//   node run-series.mjs --series S01 --config comfy/series.config.json --dry-run
//   node run-series.mjs --series S01 --ref D:/shots/ref-a.png --venue D:/shots/garden.jpg
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const flag = name => argv.includes(`--${name}`);

const configPath = resolve(arg('config', 'comfy/series.config.json'));
const seriesArg = arg('series', 'S01');
const dryRun = flag('dry-run');
const refOverride = arg('ref', '');
const venueImage = arg('venue', '');
const poseImage = arg('pose', '');

const config = JSON.parse(await readFile(configPath, 'utf8'));
const base = config.comfy.url.replace(/\/$/, '');
const packDir = resolve('prompt-packs/2026-10-27-deepseek/series');
const files = (await readdirSafe(packDir)).filter(name => name.endsWith('.consistency.json'));
const target = [];
for (const file of files) {
    const data = JSON.parse(await readFile(join(packDir, file), 'utf8'));
    if (seriesArg === 'all' || data.series === seriesArg) target.push(data);
}
if (!target.length) {
    console.error(`找不到系列 ${seriesArg}（可用：${files.length} 个）`);
    process.exit(2);
}

async function readdirSafe(dir) {
    const { readdir } = await import('node:fs/promises');
    return readdir(dir);
}

const NEGATIVE_BASE = [
    'plastic skin', 'airbrushed skin', 'HDR look', '3d render', 'CGI', 'digital painting',
    'glowing skin', 'perfect symmetry', 'doll face', 'smooth gradient background',
    'over-sharpened', 'beauty filter', 'bloom', 'clean studio backdrop',
    'different person', 'changed hairstyle', 'changed outfit',
    'extra fingers', 'deformed hands', 'distorted face', 'duplicate subject', 'tilted horizon',
    'text', 'watermark', 'logo',
].join(', ');

async function readComfyJson(path, init) {
    const response = await fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`ComfyUI ${path} -> HTTP ${response.status}`);
    return response.json();
}

async function queue(workflow) {
    const created = await readComfyJson('/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow, client_id: 'photoatelier-series' }),
    });
    if (created.error) throw new Error(JSON.stringify(created.error).slice(0, 400));
    const promptId = created.prompt_id;
    const deadline = Date.now() + config.comfy.timeoutSeconds * 1000;
    while (Date.now() < deadline) {
        const history = await readComfyJson(`/history/${promptId}`);
        const entry = history[promptId];
        if (entry?.outputs) {
            const images = Object.values(entry.outputs).flatMap(output => output.images || []);
            return images.map(image => image.filename);
        }
        if (entry?.status?.status_str === 'error') throw new Error('生成失败，见 ComfyUI 控制台');
        await new Promise(resolveDelay => setTimeout(resolveDelay, 1500));
    }
    throw new Error('生成超时');
}

await mkdir(config.output.dir, { recursive: true });
await mkdir(config.output.returnedDir, { recursive: true });

for (const data of target) {
    const seriesIndex = Number(String(data.series).replace(/\D/g, '')) || 1;
    const reference = refOverride || join(config.output.returnedDir, data.refFile);
    console.log(`\n=== ${data.series} ${data.theme}（${data.frames.length} 帧）`);
    console.log(`参考图：${reference}${refOverride ? '' : '（需先把定妆帧命名为该文件名放到 returned/local-comfy）'}`);

    for (const [frameIndex, frame] of data.frames.entries()) {
        const wide = frame.aspect.startsWith('3:2');
        const width = wide ? config.output.widthWide : config.output.width;
        const height = wide ? config.output.heightWide : config.output.height;
        const seed = config.seeds.base + seriesIndex * 100 + frameIndex;

        const workflow = {
            1: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: config.model.checkpoint } },
            2: { class_type: 'CLIPTextEncode', inputs: { text: frame.prompt, clip: ['1', 1] } },
            3: { class_type: 'CLIPTextEncode', inputs: { text: NEGATIVE_BASE, clip: ['1', 1] } },
            4: { class_type: 'LoadImage', inputs: { image: basename(reference) } },
            5: { class_type: 'IPAdapterUnifiedLoader', inputs: { model: ['1', 0], preset: config.model.ipadapterPreset } },
            6: {
                class_type: 'IPAdapter',
                inputs: {
                    model: ['5', 0], ipadapter: ['5', 1], image: ['4', 0],
                    weight: config.model.ipadapterWeight, start_at: 0, end_at: 1, weight_type: 'linear',
                },
            },
            7: { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
            8: {
                class_type: 'KSampler',
                inputs: {
                    model: ['6', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['7', 0],
                    seed, steps: config.sampler.steps, cfg: config.sampler.cfg,
                    sampler_name: config.sampler.samplerName, scheduler: config.sampler.scheduler,
                    denoise: config.sampler.denoise,
                },
            },
            9: { class_type: 'VAEDecode', inputs: { samples: ['8', 0], vae: ['1', 2] } },
            10: { class_type: 'SaveImage', inputs: { images: ['9', 0], filename_prefix: `photoatelier/${data.briefId}__${String(frameIndex + 1).padStart(2, '0')}` } },
        };

        // Scene lock: depth from a real venue photo keeps walls, windows and stairs.
        if (venueImage && config.sceneLock.mode !== 'off') {
            workflow[11] = { class_type: 'LoadImage', inputs: { image: basename(venueImage) } };
            workflow[12] = { class_type: 'ControlNetLoader', inputs: { control_net_name: config.sceneLock.controlnetModel } };
            workflow[13] = {
                class_type: 'ControlNetApplyAdvanced',
                inputs: {
                    positive: ['2', 0], negative: ['3', 0], control_net: ['12', 0], image: ['11', 0],
                    strength: config.sceneLock.strength, start_percent: 0, end_percent: 1,
                },
            };
            workflow[8].inputs.positive = ['13', 0];
            workflow[8].inputs.negative = ['13', 1];
        }
        // Pose lock: openpose skeleton from the chosen reference frame.
        if (poseImage && config.poseLock.mode !== 'off') {
            workflow[14] = { class_type: 'LoadImage', inputs: { image: basename(poseImage) } };
            workflow[15] = { class_type: 'ControlNetLoader', inputs: { control_net_name: config.poseLock.controlnetModel } };
            workflow[16] = {
                class_type: 'ControlNetApplyAdvanced',
                inputs: {
                    positive: workflow[8].inputs.positive, negative: workflow[8].inputs.negative,
                    control_net: ['15', 0], image: ['14', 0],
                    strength: config.poseLock.strength, start_percent: 0, end_percent: 1,
                },
            };
            workflow[8].inputs.positive = ['16', 0];
            workflow[8].inputs.negative = ['16', 1];
        }

        const label = `${data.series}-${String(frameIndex + 1).padStart(2, '0')}`;
        if (dryRun) {
            console.log(`  [dry-run] ${label} seed=${seed} ${width}x${height} 节点数=${Object.keys(workflow).length}`);
            continue;
        }
        process.stdout.write(`  ${label} seed=${seed} … `);
        try {
            const created = await queue(workflow);
            const target_name = frame.file;
            if (created.length) {
                const source = join(config.output.dir, created[0]);
                const destination = join(config.output.returnedDir, target_name);
                await copyFile(source, destination);
                console.log(`完成 → ${target_name}`);
            } else {
                console.log('完成（未返回文件名，去 ComfyUI output 里找）');
            }
        } catch (error) {
            console.log(`失败：${error.message}`);
            process.exitCode = 1;
            break;
        }
    }
}

console.log('\n提示：出图后跑 img2img 低重绘（denoise 0.15–0.25）+ 颗粒，AI 味才能压到可接受水平。');

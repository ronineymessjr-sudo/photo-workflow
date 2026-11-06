#!/usr/bin/env node
// Post-processing for generated frames, aimed at the two things that break a
// white-background production run:
//
//   1. aspect drift  - the channel returns 1024x1024 even when the base is 4:5,
//      so the framing has to be restored by cropping, not by stretching
//   2. watermark     - every render carries a corner stamp; it is removed by
//      cloning a clean patch from above the mark, with a feathered edge
//
// Pure Node (see tools/lib/png.mjs), so this runs in CI and on the server.
//
//   node tools/image-postprocess.mjs --in shot.png --out shot-clean.png \
//        --clean-watermark --aspect 4:5
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { decodePng, encodePng, getPixel, setPixel } from './lib/png.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const flag = name => argv.includes(`--${name}`);

const inputPath = arg('in', '');
const outputPath = arg('out', '');
const aspectArg = arg('aspect', '');
const cleanWatermark = flag('clean-watermark');
const watermarkBox = arg('watermark-box', '');
if (!inputPath || !outputPath) {
    console.error('用法：node tools/image-postprocess.mjs --in a.png --out b.png [--clean-watermark] [--aspect 4:5]');
    process.exit(2);
}

const source = await readFile(inputPath);
let image = decodePng(source);
const notes = [`输入 ${image.width}x${image.height}`];

// --- watermark removal ------------------------------------------------------
// Default box: bottom-right corner, sized for the stamp we measured on renders.
function parseBox(value, width, height) {
    if (value) {
        const [x, y, w, h] = value.split(',').map(Number);
        if ([x, y, w, h].every(Number.isFinite)) return { x, y, width: w, height: h };
    }
    return {
        x: Math.round(width * 0.70),
        y: Math.round(height * 0.925),
        width: Math.round(width * 0.30),
        height: Math.round(height * 0.075),
    };
}

// Two fill strategies. 'row-left' copies from the same row just left of the box:
// tone varies vertically along a shoulder or a backdrop gradient, so taking the
// same y keeps the gradient continuous and the patch invisible. 'above' is the
// old behaviour, kept for cases where the left neighbour is a subject edge.
export function cleanRegion(image, box, { feather = 8, mode = 'row-left' } = {}) {
    const { x, y, width, height } = box;
    const gap = Math.max(3, Math.round(width * 0.02));
    const aboveSourceY = y - height - Math.max(4, Math.round(height * 0.25));
    if (mode === 'above' && aboveSourceY < 0) throw new Error('水印区域上方没有足够的干净像素可以克隆');
    if (mode === 'row-left' && x - gap - 1 < 0) throw new Error('水印区域左侧没有足够的干净像素可以克隆');

    for (let row = 0; row < height; row += 1) {
        for (let column = 0; column < width; column += 1) {
            const targetX = x + column;
            const targetY = y + row;
            if (targetX >= image.width || targetY >= image.height) continue;
            const reference = mode === 'above'
                ? getPixel(image, targetX, aboveSourceY + row)
                : getPixel(image, x - gap - 1, targetY);
            // Feather only along the edge that borders live content (left for
            // row-left, top for above). The other edges sit on the frame, so
            // fading there would leave the stamp partially visible.
            const edgeDistance = mode === 'above' ? row : column;
            const alpha = feather > 0 ? Math.max(0, Math.min(1, edgeDistance / feather)) : 1;
            const current = getPixel(image, targetX, targetY);
            // ±1 dither hides the flat-fill look without being visible as noise.
            const dither = ((targetX * 7 + targetY * 13) % 3) - 1;
            const mix = channel => Math.max(0, Math.min(255, Math.round(current[channel] * (1 - alpha) + (reference[channel] + dither) * alpha)));
            setPixel(image, targetX, targetY, [mix(0), mix(1), mix(2), 255]);
        }
    }
    return box;
}

if (cleanWatermark) {
    const box = parseBox(watermarkBox, image.width, image.height);
    cleanRegion(image, box);
    notes.push(`已清理水印区域 ${box.width}x${box.height} @ (${box.x},${box.y})`);
}

// --- aspect correction ------------------------------------------------------
// Crop only; never resample. Losing pixels is honest, stretching is not.
function cropToAspect(image, ratioWidth, ratioHeight) {
    const targetRatio = ratioWidth / ratioHeight;
    const currentRatio = image.width / image.height;
    let cropWidth = image.width;
    let cropHeight = image.height;
    if (currentRatio > targetRatio) cropWidth = Math.round(image.height * targetRatio);
    else cropHeight = Math.round(image.width / targetRatio);
    const offsetX = Math.round((image.width - cropWidth) / 2);
    const offsetY = Math.round((image.height - cropHeight) * 0.35); // keep the head, trim more from the bottom
    const out = Buffer.alloc(cropWidth * cropHeight * 4);
    for (let row = 0; row < cropHeight; row += 1) {
        const from = ((offsetY + row) * image.width + offsetX) * 4;
        image.data.copy(out, row * cropWidth * 4, from, from + cropWidth * 4);
    }
    return { width: cropWidth, height: cropHeight, data: out };
}

if (aspectArg) {
    const [ratioWidth, ratioHeight] = aspectArg.split(':').map(Number);
    if (!Number.isFinite(ratioWidth) || !Number.isFinite(ratioHeight) || ratioWidth <= 0 || ratioHeight <= 0) {
        throw new Error(`画幅参数不合法：${aspectArg}`);
    }
    const before = `${image.width}x${image.height}`;
    image = cropToAspect(image, ratioWidth, ratioHeight);
    notes.push(`画幅 ${aspectArg}：${before} → ${image.width}x${image.height}`);
}

await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
await writeFile(outputPath, encodePng(image));
const bytes = (await readFile(outputPath)).length;
notes.push(`输出 ${image.width}x${image.height}，${Math.round(bytes / 1024)}KB`);
console.log(notes.join('　|　'));

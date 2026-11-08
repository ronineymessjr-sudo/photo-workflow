// Decide whether a generated file is a usable frame.
//
// "The task succeeded" and "there is a photograph" are different claims. The
// provider reports success for whatever it returns, and an all-white card passes
// every status check while being worthless. These checks are deliberately
// mechanical - they cannot judge whether the picture is any good, only whether it
// is a picture at all, which is the part that can be automated without pretending.

import { decodePng } from './png.mjs';

const MIN_SIDE = 512;

// Mean absolute difference between neighbouring pixels, sampled on a grid. A
// blank or flat-filled image scores near zero; any real photograph scores high.
function roughness(image) {
    const { width, height, data } = image;
    const stepX = Math.max(1, Math.floor(width / 64));
    const stepY = Math.max(1, Math.floor(height / 64));
    let total = 0;
    let count = 0;
    for (let y = stepY; y < height - stepY; y += stepY) {
        for (let x = stepX; x < width - stepX; x += stepX) {
            const index = (y * width + x) * 4;
            const right = (y * width + x + stepX) * 4;
            const down = ((y + stepY) * width + x) * 4;
            total += Math.abs(data[index] - data[right]) + Math.abs(data[index] - data[down]);
            count += 1;
        }
    }
    return count ? total / count : 0;
}

export function inspectPng(buffer) {
    if (!buffer || !buffer.length) return { ok: false, reason: 'empty', bytes: 0 };
    let image;
    try {
        image = decodePng(buffer);
    } catch (error) {
        return { ok: false, reason: `decode: ${String(error.message).slice(0, 80)}`, bytes: buffer.length };
    }
    const { width, height } = image;
    if (width < MIN_SIDE || height < MIN_SIDE) {
        return { ok: false, reason: `too small: ${width}x${height}`, width, height, bytes: buffer.length };
    }
    const score = roughness(image);
    // Measured on real frames from the model: 12-40. A solid fill sits under 1.
    if (score < 2) {
        return { ok: false, reason: `flat image (roughness ${score.toFixed(2)})`, width, height, score, bytes: buffer.length };
    }
    return { ok: true, width, height, score, bytes: buffer.length };
}

export function summarise(result) {
    return result.ok
        ? `${result.width}x${result.height} ${Math.round(result.bytes / 1024)}KB`
        : `不可用：${result.reason}`;
}

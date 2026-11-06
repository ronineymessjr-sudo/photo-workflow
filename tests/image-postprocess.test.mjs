import test from 'node:test';
import assert from 'node:assert/strict';
import { decodePng, encodePng, getPixel, setPixel } from '../tools/lib/png.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const runAsync = promisify(execFile);

function makeImage(width, height, color) {
    const data = Buffer.alloc(width * height * 4);
    for (let index = 0; index < width * height; index += 1) {
        data[index * 4] = color[0];
        data[index * 4 + 1] = color[1];
        data[index * 4 + 2] = color[2];
        data[index * 4 + 3] = 255;
    }
    return { width, height, data };
}

test('png codec survives an encode/decode round trip byte for byte', () => {
    const image = makeImage(7, 5, [12, 200, 90]);
    setPixel(image, 3, 2, [255, 0, 128, 255]);
    const decoded = decodePng(encodePng(image));
    assert.equal(decoded.width, 7);
    assert.equal(decoded.height, 5);
    assert.deepEqual(getPixel(decoded, 3, 2), [255, 0, 128, 255]);
    assert.deepEqual(getPixel(decoded, 0, 0), [12, 200, 90, 255]);
});

test('the codec rejects formats it cannot handle instead of writing corrupt files', () => {
    assert.throws(() => decodePng(Buffer.from('not a png at all')), /不是 PNG/);
});

test('postprocess crops to the requested aspect without resampling', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'postprocess-'));
    const input = join(dir, 'in.png');
    const output = join(dir, 'out.png');
    await writeFile(input, encodePng(makeImage(1000, 1000, [240, 240, 240])));
    await runAsync('node', [resolve('tools/image-postprocess.mjs'), '--in', input, '--out', output, '--aspect', '4:5']);
    const result = decodePng(await readFile(output));
    assert.equal(result.width, 800);
    assert.equal(result.height, 1000);
});

test('watermark cleanup changes the corner region and leaves the rest alone', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'postprocess-'));
    const input = join(dir, 'in.png');
    const output = join(dir, 'out.png');
    // White frame with a solid black stamp in the bottom-right corner.
    const image = makeImage(200, 200, [250, 250, 250]);
    for (let y = 180; y < 196; y += 1) {
        for (let x = 140; x < 200; x += 1) setPixel(image, x, y, [0, 0, 0, 255]);
    }
    await writeFile(input, encodePng(image));
    await runAsync('node', [resolve('tools/image-postprocess.mjs'), '--in', input, '--out', output, '--clean-watermark']);

    const before = decodePng(await readFile(input));
    const after = decodePng(await readFile(output));
    // Inside the stamp: no longer black.
    const inside = getPixel(after, 170, 188);
    assert.ok(inside[0] > 100, `水印区域应被填充，实际 ${inside.join(',')}`);
    // Far away: untouched.
    assert.deepEqual(getPixel(after, 10, 10), getPixel(before, 10, 10));
    // The fill must not introduce alpha holes.
    assert.equal(getPixel(after, 170, 188)[3], 255);
});

test('cleanup refuses to run when there is no clean patch to copy from', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'postprocess-'));
    const input = join(dir, 'in.png');
    const output = join(dir, 'out.png');
    await writeFile(input, encodePng(makeImage(100, 100, [255, 255, 255])));
    const { stderr } = await runAsync('node', [
        resolve('tools/image-postprocess.mjs'), '--in', input, '--out', output,
        '--clean-watermark', '--watermark-box', '0,0,100,100',
    ]).then(() => ({ stderr: '' })).catch(error => ({ stderr: String(error.stderr || '') }));
    assert.match(stderr, /没有足够/);
});

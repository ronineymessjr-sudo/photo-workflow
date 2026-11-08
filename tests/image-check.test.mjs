import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectPng } from '../tools/lib/image-check.mjs';
import { encodePng } from '../tools/lib/png.mjs';

test('a real generated frame passes inspection', () => {
    // A frame from the completed series, so the thresholds are checked against
    // actual model output rather than a synthetic gradient.
    const buffer = readFileSync('runtime/series-full/shot-09-1-compose.png');
    const result = inspectPng(buffer);
    assert.equal(result.ok, true, result.reason);
    assert.ok(result.width >= 512 && result.height >= 512);
});

test('a white card is rejected even though every status check says success', () => {
    // The provider reports SUCCEED and returns a valid PNG. It is still worthless,
    // and this is the class of failure that "the task succeeded" cannot catch.
    const blank = encodePng({ width: 700, height: 700, data: Buffer.alloc(700 * 700 * 4, 255) });
    const result = inspectPng(blank);
    assert.equal(result.ok, false);
    assert.match(result.reason, /flat image/);
});

test('an empty body and an error page are rejected with different reasons', () => {
    assert.equal(inspectPng(Buffer.alloc(0)).reason, 'empty');
    const html = Buffer.from('<html><body>502 Bad Gateway</body></html>');
    assert.match(inspectPng(html).reason, /decode/);
});

test('a tiny image is rejected: it cannot be a deliverable frame', () => {
    const small = encodePng({ width: 256, height: 256, data: Buffer.alloc(256 * 256 * 4, 128) });
    const result = inspectPng(small);
    assert.equal(result.ok, false);
    assert.match(result.reason, /too small/);
});

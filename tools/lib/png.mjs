// Minimal PNG codec (8-bit RGB/RGBA, non-interlaced) so aspect correction and
// watermark cleanup work without sharp/pngjs or any native dependency.
//
// Deliberately narrow: we only ever read what image models emit and write RGBA
// back out. Anything else throws instead of producing a corrupt file.

import zlib from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

function crc32(buffer) {
    let c = 0xffffffff;
    for (let index = 0; index < buffer.length; index += 1) c = CRC_TABLE[(c ^ buffer[index]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function readChunks(buffer) {
    if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('不是 PNG 文件');
    const chunks = [];
    let offset = 8;
    while (offset + 8 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        const data = buffer.subarray(offset + 8, offset + 8 + length);
        chunks.push({ type, data });
        offset += 12 + length;
        if (type === 'IEND') break;
    }
    return chunks;
}

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    return pb <= pc ? b : c;
}

export function decodePng(buffer) {
    const chunks = readChunks(buffer);
    const ihdr = chunks.find(chunk => chunk.type === 'IHDR');
    if (!ihdr) throw new Error('缺少 IHDR');
    const width = ihdr.data.readUInt32BE(0);
    const height = ihdr.data.readUInt32BE(4);
    const bitDepth = ihdr.data[8];
    const colorType = ihdr.data[9];
    const interlace = ihdr.data[12];
    if (bitDepth !== 8) throw new Error(`只支持 8 位色深，当前 ${bitDepth}`);
    if (interlace !== 0) throw new Error('不支持隔行扫描 PNG');
    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
    if (!channels) throw new Error(`不支持的色彩类型 ${colorType}`);

    const idat = Buffer.concat(chunks.filter(chunk => chunk.type === 'IDAT').map(chunk => chunk.data));
    const raw = zlib.inflateSync(idat);
    const bpp = channels;
    const stride = width * bpp;
    const out = Buffer.alloc(width * height * 4);
    let prev = Buffer.alloc(stride);
    let offset = 0;

    for (let y = 0; y < height; y += 1) {
        const filter = raw[offset];
        offset += 1;
        const line = Buffer.from(raw.subarray(offset, offset + stride));
        offset += stride;
        for (let x = 0; x < stride; x += 1) {
            const left = x >= bpp ? line[x - bpp] : 0;
            const up = prev[x];
            const upLeft = x >= bpp ? prev[x - bpp] : 0;
            switch (filter) {
                case 0: break;
                case 1: line[x] = (line[x] + left) & 0xff; break;
                case 2: line[x] = (line[x] + up) & 0xff; break;
                case 3: line[x] = (line[x] + ((left + up) >> 1)) & 0xff; break;
                case 4: line[x] = (line[x] + paeth(left, up, upLeft)) & 0xff; break;
                default: throw new Error(`未知的行过滤类型 ${filter}`);
            }
        }
        for (let x = 0; x < width; x += 1) {
            const source = x * bpp;
            const target = (y * width + x) * 4;
            if (channels === 4) {
                out[target] = line[source];
                out[target + 1] = line[source + 1];
                out[target + 2] = line[source + 2];
                out[target + 3] = line[source + 3];
            } else if (channels === 3) {
                out[target] = line[source];
                out[target + 1] = line[source + 1];
                out[target + 2] = line[source + 2];
                out[target + 3] = 255;
            } else {
                out[target] = line[source];
                out[target + 1] = line[source];
                out[target + 2] = line[source];
                out[target + 3] = 255;
            }
        }
        prev = line;
    }
    return { width, height, data: out };
}

function chunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
}

// Always writes RGBA with filter 0: bigger files, but byte-exact and simple.
export function encodePng({ width, height, data }) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y += 1) {
        raw[y * (stride + 1)] = 0;
        data.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
    }
    return Buffer.concat([
        SIGNATURE,
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

export function getPixel(image, x, y) {
    const offset = (y * image.width + x) * 4;
    return [image.data[offset], image.data[offset + 1], image.data[offset + 2], image.data[offset + 3]];
}

export function setPixel(image, x, y, rgba) {
    const offset = (y * image.width + x) * 4;
    image.data[offset] = rgba[0];
    image.data[offset + 1] = rgba[1];
    image.data[offset + 2] = rgba[2];
    image.data[offset + 3] = rgba[3];
}

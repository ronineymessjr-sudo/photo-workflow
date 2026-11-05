#!/usr/bin/env node
// Snapshots the RuiC-PoseAtlas metadata and (optionally) caches a few base
// images locally, so a fusion run can be reproduced even if upstream changes.
//
// Why this exists: the metadata is served with max-age=600 and the images with
// max-age=0 at 2MB / 6–21s each. Calling upstream during generation would make
// "same input, same output" impossible and would be painfully slow.
//
//   node tools/atlas-snapshot.mjs                     # metadata only
//   node tools/atlas-snapshot.mjs --images 6 --section face
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const imageCount = Math.max(0, Number(arg('images', '0')) || 0);
const section = arg('section', 'face');
const hair = arg('hair', '');

const SITE = 'https://hruiccc.github.io/RuiC-PoseAtlas/';
const DATASETS = [
    { kind: 'pose', key: 'poses', url: `${SITE}data/poses.json` },
    { kind: 'costume', key: 'costumes', url: `${SITE}data/costumes.json` },
    { kind: 'portrait', key: 'images', url: `${SITE}data/faces.json` },
];

const stamp = new Date().toISOString().slice(0, 10);
const outDir = path.join(root, 'runtime', 'atlas-snapshot', stamp);
const imageDir = path.join(outDir, 'images');
await mkdir(outDir, { recursive: true });
if (imageCount) await mkdir(imageDir, { recursive: true });

function fnv(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

const manifest = { takenAt: new Date().toISOString(), source: SITE, datasets: {}, images: [] };

for (const dataset of DATASETS) {
    const started = Date.now();
    const response = await fetch(dataset.url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`${dataset.kind} 拉取失败：HTTP ${response.status}`);
    const raw = await response.text();
    const parsed = JSON.parse(raw);
    const rows = parsed?.[dataset.key];
    if (!Array.isArray(rows)) throw new Error(`${dataset.kind} 里没有 ${dataset.key}`);
    const ids = rows.map(row => row?.id).filter(Boolean).sort();
    await writeFile(path.join(outDir, `${dataset.kind}.json`), raw, 'utf8');
    manifest.datasets[dataset.kind] = {
        url: dataset.url,
        rows: rows.length,
        bytes: raw.length,
        idHash: fnv(ids.join(',')),
        elapsedMs: Date.now() - started,
        cacheControl: response.headers.get('cache-control') || '',
    };
    console.log(`${dataset.kind}: ${rows.length} 行 / ${Math.round(raw.length / 1024)}KB / idHash ${manifest.datasets[dataset.kind].idHash} / ${Date.now() - started}ms`);
}

// Cache a handful of base images, content-addressed, filtered by section/hair.
if (imageCount) {
    const faces = JSON.parse(await readFile(path.join(outDir, 'portrait.json'), 'utf8')).images || [];
    const candidates = faces.filter(row => (!section || row.sec === section) && (!hair || row.hair === hair));
    const picked = candidates.slice(0, imageCount);
    console.log(`\n缓存 ${picked.length} 张底模（section=${section}${hair ? ` hair=${hair}` : ''}，共 ${candidates.length} 张符合）`);
    for (const row of picked) {
        const url = row.full_remote || `${SITE}${row.full}`;
        const started = Date.now();
        const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
        if (!response.ok) { console.log(`  ✗ ${row.id} HTTP ${response.status}`); continue; }
        const buffer = Buffer.from(await response.arrayBuffer());
        const sha = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
        const file = path.join(imageDir, `${row.id}__${sha}.png`);
        if (!existsSync(file)) await writeFile(file, buffer);
        manifest.images.push({
            id: row.id, url, bytes: buffer.length, sha1: sha,
            width: row.w, height: row.h, hair: row.hair, sec: row.sec,
            elapsedMs: Date.now() - started, file: path.relative(root, file).replace(/\\/g, '/'),
        });
        console.log(`  ✓ ${row.id} ${Math.round(buffer.length / 1024)}KB ${Date.now() - started}ms sha ${sha}`);
    }
}

await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\n快照写入：${path.relative(root, outDir).replace(/\\/g, '/')}`);
console.log(`复现时请引用 manifest 里的 idHash；数据集一变，idHash 就会变。`);

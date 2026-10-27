#!/usr/bin/env node
// Local dev server for the continuity panel: serves the page, its assets and the
// continuity API without wrangler. Mirrors api/index.js routing so behaviour is
// the same as production (same modules, same error codes).
//
//   node tools/serve-continuity.mjs --port 8123
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    createGroup, setReference, confirmMaster, buildShotRequests,
    recordQc, continuitySummary, continuitySchema, ContinuityError,
} from '../api/continuity.mjs';
import { storeAsset, readAsset, AssetError, ASSET_LIMITS } from '../api/continuity-assets.mjs';
import { generateShot } from '../api/continuity-generation.mjs';
import { prescreen, mergeScores, summariseVision } from '../api/continuity-vision.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const portArgIndex = process.argv.indexOf('--port');
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : 8123) || 8123;

// Local assets live on disk so a restart does not break the stored references.
const assetRoot = path.resolve(process.env.CONTINUITY_ASSET_ROOT || path.join(root, 'runtime', 'continuity-assets'));
await mkdir(assetRoot, { recursive: true });
const diskStore = {
    durable: true,
    async put(key, buffer) {
        const target = path.join(assetRoot, key.replace(/^continuity\//, '').replace(/\//g, '__'));
        await writeFile(target, buffer);
    },
    async get(key) {
        const target = path.join(assetRoot, key.replace(/^continuity\//, '').replace(/\//g, '__'));
        try { return { buffer: await readFile(target), meta: {} }; } catch { return null; }
    },
};

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

function readBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        request.on('data', chunk => chunks.push(chunk));
        request.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!raw) return resolve({});
            try { resolve(JSON.parse(raw)); } catch (error) { reject(error); }
        });
        request.on('error', reject);
    });
}

const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const pathname = url.pathname;
    const json = (status, payload) => {
        response.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
        response.end(JSON.stringify(payload));
    };

    try {
        if (pathname === '/api/continuity/schema' && request.method === 'GET') return json(200, continuitySchema());
        if (pathname === '/api/continuity/asset' && request.method === 'POST') {
            const body = await readBody(request);
            const asset = await storeAsset({ dataUrl: body?.dataUrl, role: body?.role, store: diskStore });
            return json(201, asset);
        }
        if (pathname.startsWith('/api/continuity/asset/') && request.method === 'GET') {
            const asset = await readAsset(pathname, { store: diskStore });
            if (!asset) return json(404, { error: 'ASSET_NOT_FOUND' });
            response.writeHead(200, { 'Content-Type': asset.mime, 'Cache-Control': 'private, max-age=86400' });
            return response.end(asset.buffer);
        }
        if (pathname.startsWith('/api/continuity/') && request.method === 'POST') {
            const body = await readBody(request);
            if (pathname === '/api/continuity/init') return json(200, { group: createGroup(body || {}) });
            if (pathname === '/api/continuity/reference') return json(200, { group: setReference(body?.group, body?.reference || body) });
            if (pathname === '/api/continuity/master') return json(200, { group: confirmMaster(body?.group, { assetId: body?.assetId, actor: body?.actor }) });
            if (pathname === '/api/continuity/requests') {
                const requests = buildShotRequests(body?.group, {
                    providerId: body?.providerId,
                    shotIds: Array.isArray(body?.shotIds) ? body.shotIds : [],
                    seedBase: Number(body?.seedBase) || 428193,
                });
                return json(200, { requests, count: requests.length });
            }
            if (pathname === '/api/continuity/generate') {
                return json(200, await generateShot({ group: body?.group, shotId: body?.shotId, providerId: body?.providerId, store: diskStore }));
            }
            if (pathname === '/api/continuity/prescreen') {
                const shot = (body?.group?.shots || []).find(item => item.shotId === body?.shotId);
                if (!shot) return json(404, { error: '没有这个镜头', code: 'CONTINUITY_SHOT_UNKNOWN' });
                let imageDataUrl = body?.imageDataUrl || '';
                if (!imageDataUrl && body?.imagePath) {
                    const asset = await readAsset(body.imagePath, { store: diskStore });
                    if (asset) imageDataUrl = `data:${asset.mime};base64,${Buffer.from(asset.buffer).toString('base64')}`;
                }
                const vision = await prescreen({ imageDataUrl, shot, locked: body.group.locked });
                return json(200, { ...vision, summary: summariseVision(vision), merged: mergeScores(body?.scores || {}, vision.scores) });
            }
            if (pathname === '/api/continuity/qc') {
                return json(200, recordQc(body?.group, {
                    shotId: body?.shotId, scores: body?.scores,
                    humanConfirmed: body?.humanConfirmed === true, reviewer: body?.reviewer || 'human',
                }));
            }
            if (pathname === '/api/continuity/summary') return json(200, continuitySummary(body?.group));
            return json(404, { error: 'Not Found' });
        }

        // Static: the panel page plus its assets.
        const relative = pathname === '/' ? 'continuity.html' : pathname.replace(/^\/+/, '');
        const target = path.resolve(root, relative);
        if (!target.startsWith(root)) return json(403, { error: 'FORBIDDEN' });
        const content = await readFile(target);
        response.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream' });
        response.end(content);
    } catch (error) {
        if (error instanceof ContinuityError) return json(error.status, { error: error.message, code: error.code });
        if (error instanceof AssetError) return json(error.status, { error: error.message, code: error.code });
        // Generation/vision errors carry their own status so the UI can show
        // "少了哪个环境变量" instead of a generic 500.
        if (error?.name === 'GenerationError' || error?.name === 'VisionError') {
            return json(error.status || 502, { error: error.message, code: error.code, details: error.details });
        }
        if (error?.code === 'ENOENT') return json(404, { error: 'NOT_FOUND' });
        return json(500, { error: '服务器暂时不可用', detail: String(error?.message || error) });
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`连续性面板：http://127.0.0.1:${port}/`);
});

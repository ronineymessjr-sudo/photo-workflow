import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDirectorPlan } from '../api/director-plan.mjs';
import { generateDirectorCandidate } from '../api/director-generation.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
export function createServer({
    baseUrl = 'http://127.0.0.1:8004',
    fetchImpl = fetch,
    generationRoot = process.env.DIRECTOR_GENERATION_ROOT || 'D:\\AI项目\\director-master-aesthetic-agent-v0.28.0\\runtime\\photoatelier_external_generations',
} = {}) {
    const allowedGenerationRoot = path.resolve(generationRoot);
    return http.createServer(async (req, res) => {
        const reply = (status, data) => {
            res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(data));
        };
        try {
            // Only the loopback UI may invoke this credential-using local service.
            if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '')) return reply(403, { error: 'INVALID_HOST' });
            const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
            if (pathname === '/api/director/plan' && req.method === 'POST') {
                if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return reply(403, { error: 'INVALID_ORIGIN' });
                if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'JSON_REQUIRED' });
                let body = '';
                for await (const chunk of req) {
                    body += chunk;
                    if (Buffer.byteLength(body) > 16000) return reply(413, { error: 'BRIEF_TOO_LARGE' });
                }
                return reply(200, await createDirectorPlan(JSON.parse(body), { baseUrl, fetchImpl }));
            }
            if (pathname === '/api/director/generate-candidate' && req.method === 'POST') {
                if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) return reply(403, { error: 'INVALID_ORIGIN' });
                if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'JSON_REQUIRED' });
                let body = '';
                for await (const chunk of req) {
                    body += chunk;
                    if (Buffer.byteLength(body) > 20000) return reply(413, { error: 'GENERATION_REQUEST_TOO_LARGE' });
                }
                const request = JSON.parse(body);
                const result = await generateDirectorCandidate(request, { baseUrl, fetchImpl });
                if (request.dry_run === true) return reply(200, { ...result, candidateAsset: null });
                const output = result?.generation?.output;
                const outputPath = typeof output === 'string' ? path.resolve(output) : '';
                const insideGenerationRoot = outputPath && (outputPath === allowedGenerationRoot || outputPath.startsWith(allowedGenerationRoot + path.sep));
                if (!insideGenerationRoot || path.extname(outputPath).toLowerCase() !== '.png') {
                    return reply(502, { error: 'DIRECTOR_GENERATION_OUTPUT_NOT_SERVABLE' });
                }
                const candidateId = path.basename(outputPath);
                return reply(200, {
                    ...result,
                    candidateAsset: {
                        id: candidateId,
                        url: '/api/director/candidates/' + encodeURIComponent(candidateId),
                        synthetic: true,
                        status: 'candidate-awaiting-review',
                        source: 'external-director-provider',
                        model: result?.generation?.model || 'unknown',
                    },
                });
            }
            if (req.method !== 'GET') return reply(405, { error: 'METHOD_NOT_ALLOWED' });
            const candidateMatch = pathname.match(/^\/api\/director\/candidates\/([A-Za-z0-9._-]+)$/);
            if (candidateMatch) {
                const candidateName = decodeURIComponent(candidateMatch[1]);
                if (!candidateName.toLowerCase().endsWith('.png')) return reply(404, { error: 'NOT_FOUND' });
                const target = path.resolve(allowedGenerationRoot, candidateName);
                if (!target.startsWith(allowedGenerationRoot + path.sep)) return reply(403, { error: 'FORBIDDEN' });
                const content = await readFile(target);
                res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
                return res.end(content);
            }
            // Never expose repository files, configuration, or credentials.
            if (pathname !== '/' && pathname !== '/index.html' && !/^\/assets\/[\w./-]+$/.test(pathname)) return reply(404, { error: 'NOT_FOUND' });
            const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
            if (!target.startsWith(root + path.sep) && target !== path.join(root, 'index.html')) return reply(403, { error: 'FORBIDDEN' });
            const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
            const content = await readFile(target);
            res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            res.end(content);
        } catch (error) {
            reply(error.code === 'ENOENT' ? 404 : error instanceof SyntaxError || error.message === 'INVALID_BRIEF' ? 400 : 502,
                { error: error.message?.startsWith('DIRECTOR_') ? error.message : '摄影 Agent 请求失败，请检查服务和输入；未使用旧模板替代。' });
        }
    });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    createServer().listen(8125, '127.0.0.1', () => console.log('摄影系统：http://127.0.0.1:8125/'));
}

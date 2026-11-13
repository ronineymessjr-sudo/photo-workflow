import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createDirectorPlan } from '../api/director-plan.mjs';
import { generateDirectorCandidate } from '../api/director-generation.mjs';
import { buildDirectorIdentityWorkflow } from '../api/director-identity-workflow.mjs';
import { aiPlanProviders, handleAiPlan } from '../api/ai-plan.mjs';
import { handleAiBrief } from '../api/ai-brief.mjs';
import { createLocalAiCredentials } from './local-ai-credentials.mjs';
import { confirmStudioProposal, createStudioProposal, searchStudio, consumeStudioSearchQuota, AiStudioError } from '../api/ai-studio/service.mjs';
import { AiStudioQuota } from '../api/ai-studio/quota.mjs';
import { createWeakProvider } from '../api/ai-studio/weak-provider.mjs';
import { createLocalFeishuConfig } from './local-feishu-config.mjs';
import { createLocalFeishuWriter } from './local-feishu-writer.mjs';
import { createContinuityHandler } from './serve-continuity.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const REMOTE_API_BASE = 'https://photoatelier-api.photomagic.workers.dev';
const studioPaths = new Set(['/api/ai/plan-lite', '/api/ai/studio/proposals', '/api/ai/studio/confirm',
    '/api/ai/studio/feishu/status', '/api/ai/studio/feishu/sync']);
const authProxyPaths = new Set(['/api/auth/login', '/api/auth/methods', '/api/auth/session',
    '/api/auth/email/send', '/api/auth/email/verify']);

async function resolveRemoteStudioUser(authorization, fetchImpl) {
    if (!/^Bearer [A-Za-z0-9_-]{20,8192}$/.test(authorization || '')) return null;
    try {
        const response = await fetchImpl(`${REMOTE_API_BASE}/api/auth/session`, {
            headers: { Authorization: authorization }, redirect: 'error', signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return null;
        const session = await response.json();
        return session.success === true && typeof session.user?.id === 'string' ? session.user.id : null;
    } catch { return null; }
}

function localStudioQuota() {
    const objects = new Map();
    return {
        idFromName: name => name,
        get(id) {
            if (!objects.has(id)) {
                const values = new Map();
                const store = { get: async key => values.get(key), put: async (key, value) => values.set(key, value) };
                let queue = Promise.resolve();
                const storage = { transaction(callback) {
                    const result = queue.then(() => callback(store));
                    queue = result.catch(() => {});
                    return result;
                } };
                objects.set(id, new AiStudioQuota({ storage }));
            }
            const object = objects.get(id);
            return { fetch: (input, init) => object.fetch(input instanceof Request ? input : new Request(input, init)) };
        },
    };
}

export async function attachLocalImageGenerationStatus(plan, { baseUrl, fetchImpl = fetch } = {}) {
    if (!plan || plan.director?.source !== 'byok-ai-plan' || !baseUrl) return plan;
    try {
        const response = await fetchImpl(new URL('/v1/photoatelier/external-provider-status', baseUrl), {
            headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return plan;
        const status = await response.json();
        if (status?.credential_configured !== true) return plan;
        plan.director = {
            ...plan.director,
            imageGenerationConnected: true,
            imageGenerationMode: 'local-external-provider-candidate-review',
            imageGenerationProvider: typeof status.provider === 'string' ? status.provider : '',
            imageGenerationModel: typeof status.model === 'string' ? status.model : '',
        };
    } catch { /* Image generation remains unavailable if the local Director cannot be verified. */ }
    return plan;
}

export function createServer({
    baseUrl = 'http://127.0.0.1:8004',
    fetchImpl = fetch,
    aiCredentials = createLocalAiCredentials(),
    localFeishuConfig = createLocalFeishuConfig({ fetchImpl, localWriter: createLocalFeishuWriter() }),
    studioEnvironment = {},
    resolveStudioUser = authorization => resolveRemoteStudioUser(authorization, fetchImpl),
    continuityEnvironment = process.env,
    continuityAssetRoot,
    generationRoot = process.env.DIRECTOR_GENERATION_ROOT || 'D:\\AI项目\\director-master-aesthetic-agent-v0.28.0\\runtime\\photoatelier_external_generations',
} = {}) {
    const allowedGenerationRoot = path.resolve(generationRoot);
    const studioEnv = { ...studioEnvironment, JWT_SECRET: randomBytes(32).toString('hex'), AI_STUDIO_QUOTA: localStudioQuota() };
    const continuityHandler = createContinuityHandler({
        assetRoot: continuityAssetRoot,
        generationEnv: continuityEnvironment,
        authorizeGenerate: request => resolveStudioUser(request.headers.authorization).then(Boolean),
    });
    return http.createServer(async (req, res) => {
        const reply = (status, data) => {
            res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(data));
        };
        try {
            // Only the loopback UI may invoke this credential-using local service.
            if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '')) return reply(403, { error: 'INVALID_HOST' });
            const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
            if (pathname === '/api/health' && req.method === 'GET') {
                return reply(200, { status: 'ok', service: 'photo-workflow-local', time: new Date().toISOString() });
            }
            if (authProxyPaths.has(pathname)) {
                const expectedMethod = ['/api/auth/methods', '/api/auth/session'].includes(pathname) ? 'GET' : 'POST';
                if (req.method !== expectedMethod) return reply(405, { error: 'METHOD_NOT_ALLOWED' });
                if (expectedMethod === 'POST' && req.headers.origin !== `http://${req.headers.host}`) return reply(403, { error: 'INVALID_ORIGIN' });
                const headers = { Accept: 'application/json' };
                if (req.headers.authorization) headers.Authorization = req.headers.authorization;
                let body;
                if (expectedMethod === 'POST') {
                    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return reply(415, { error: 'JSON_REQUIRED' });
                    const chunks = [];
                    let size = 0;
                    for await (const chunk of req) {
                        size += chunk.length;
                        if (size > 8192) return reply(413, { error: 'REQUEST_TOO_LARGE' });
                        chunks.push(chunk);
                    }
                    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
                    catch { return reply(400, { error: 'INVALID_JSON' }); }
                    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'INVALID_JSON' });
                    headers['Content-Type'] = 'application/json';
                }
                try {
                    const upstream = await fetchImpl(`${REMOTE_API_BASE}${pathname}${new URL(req.url, 'http://127.0.0.1').search}`, {
                        method: expectedMethod, headers, body: body === undefined ? undefined : JSON.stringify(body),
                        redirect: 'error', signal: AbortSignal.timeout(10000),
                    });
                    const raw = await upstream.text();
                    if (Buffer.byteLength(raw) > 65536) return reply(502, { error: 'AUTH_RESPONSE_TOO_LARGE' });
                    let payload;
                    try { payload = JSON.parse(raw); }
                    catch { return reply(502, { error: 'AUTH_RESPONSE_INVALID' }); }
                    return reply(upstream.status, payload);
                } catch {
                    return reply(502, { error: 'AUTH_SERVICE_UNAVAILABLE' });
                }
            }
            if (pathname === '/continuity.html' || pathname.startsWith('/api/continuity/')) {
                if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return reply(403, { error: 'INVALID_ORIGIN' });
                return continuityHandler(req, res);
            }
            if (studioPaths.has(pathname)) {
                if (pathname === '/api/ai/studio/feishu/status' && req.method === 'GET') {
                    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return reply(403, { error: 'INVALID_ORIGIN' });
                    const uid = await resolveStudioUser(req.headers.authorization);
                    return uid ? reply(200, await localFeishuConfig.check()) : reply(401, { error: '未登录' });
                }
                if (req.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' });
                if (req.headers.origin !== `http://${req.headers.host}`) return reply(403, { error: 'INVALID_ORIGIN' });
                if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return reply(415, { error: 'JSON_REQUIRED' });
                const chunks = [];
                let size = 0;
                const limit = pathname === '/api/ai/studio/feishu/sync' ? 256 * 1024
                    : pathname === '/api/ai/plan-lite' ? 8192 : 32768;
                for await (const chunk of req) {
                    size += chunk.length;
                    if (size > limit) return reply(413, { error: 'REQUEST_TOO_LARGE' });
                    chunks.push(chunk);
                }
                const raw = Buffer.concat(chunks).toString('utf8');
                let input;
                try { input = JSON.parse(raw); } catch { return reply(400, { error: 'INVALID_JSON' }); }
                if (!input || typeof input !== 'object' || Array.isArray(input)) return reply(400, { error: 'INVALID_JSON' });
                const uid = await resolveStudioUser(req.headers.authorization);
                try {
                    if (pathname === '/api/ai/plan-lite') {
                        const allowed = await consumeStudioSearchQuota({ uid, ip: 'loopback', env: studioEnv });
                        if (!allowed) return reply(429, { error: 'RATE_LIMITED' });
                        return reply(200, await searchStudio({
                            prompt: input.prompt, planId: input.planId, expectedRevision: input.expectedRevision,
                            uid, env: studioEnv, fetchImpl,
                            intentProviderFactory: async () => {
                                const saved = await aiCredentials.load();
                                if (!saved) return null;
                                const provider = aiPlanProviders().find(item => item.id === saved.provider);
                                if (!provider) return null;
                                return createWeakProvider({ apiKey: saved.apiKey, baseUrl: provider.endpoint.replace(/\/chat\/completions$/, ''),
                                    model: saved.provider === 'deepseek' && /^deepseek-v4[.]1-?flash$/i.test(saved.model) ? 'deepseek-flash' : saved.model,
                                    timeoutMs: 8000, fetchImpl });
                            },
                        }));
                    }
                    if (!uid) return reply(401, { error: '未登录' });
                    if (pathname === '/api/ai/studio/feishu/sync') {
                        if (!input.plan || String(input.plan.id) !== input.planId) return reply(400, { error: 'INVALID_PLAN_ID' });
                        if (/data:image\/[^;]+;base64,/i.test(raw)) return reply(400, { error: 'TEXT_PLAN_REQUIRED' });
                        return reply(200, { ...await localFeishuConfig.sync({ uid, plan: input.plan }), storage: 'local' });
                    }
                    if (pathname === '/api/ai/studio/proposals') return reply(200, await createStudioProposal({
                        searchReceipt: input.searchReceipt, selectedIds: input.selectedIds, uid, env: studioEnv, fetchImpl,
                    }));
                    return reply(200, {
                        ...await confirmStudioProposal({ proposalToken: input.proposalToken, idempotencyKey: input.idempotencyKey,
                            uid, env: studioEnv, fetchImpl }), storage: 'local',
                    });
                } catch (error) {
                    return reply(error instanceof AiStudioError ? error.status : 502,
                        { error: error instanceof AiStudioError ? error.code : 'AI_STUDIO_ERROR' });
                }
            }
            if (pathname === '/api/ai/providers' && req.method === 'GET') return reply(200, { providers: aiPlanProviders() });
            if (pathname === '/api/ai/local-config' && req.method === 'GET') return reply(200, await aiCredentials.status());
            if (pathname === '/api/ai/local-config' && ['POST', 'DELETE'].includes(req.method)) {
                if (req.headers.origin !== `http://${req.headers.host}`) return reply(403, { error: 'INVALID_ORIGIN' });
                if (req.method === 'DELETE') { await aiCredentials.clear(); return reply(200, { configured: false }); }
                if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'JSON_REQUIRED' });
                let body = '';
                for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 4096) return reply(413, { error: 'REQUEST_TOO_LARGE' }); }
                try { await aiCredentials.save(JSON.parse(body)); }
                catch { return reply(400, { error: '无法保存模型配置，请检查服务商、模型和本机系统权限。' }); }
                const status = await aiCredentials.status();
                return status.configured ? reply(200, status) : reply(500, { error: '本机配置保存后无法读取，请检查 Windows 账户权限。' });
            }
            if (['/api/ai/brief', '/api/ai/plan'].includes(pathname) && req.method === 'POST') {
                if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return reply(403, { error: 'INVALID_ORIGIN' });
                if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'JSON_REQUIRED' });
                let body = '';
                for await (const chunk of req) {
                    body += chunk;
                    if (Buffer.byteLength(body) > 16000) return reply(413, { error: 'REQUEST_TOO_LARGE' });
                }
                let input = JSON.parse(body);
                if (input.useSaved === true) {
                    if (req.headers.origin !== `http://${req.headers.host}`) return reply(403, { error: 'INVALID_ORIGIN' });
                    const saved = await aiCredentials.load();
                    if (!saved) return reply(503, { error: '本机保存的 AI 配置不可用，请到设置检查。' });
                    input = { ...saved, ...(pathname === '/api/ai/brief' ? { conversation: input.conversation } : { input: input.input }) };
                }
                const providerFetch = async (url, options) => {
                    try {
                        const response = await fetchImpl(url, options);
                        if (response?.status === 0) {
                            let host = 'unknown';
                            try { host = new URL(url).host; } catch { /* keep the sanitized fallback */ }
                            console.warn(JSON.stringify({ event: 'ai_provider_empty_response', host,
                                responseType: response.type || 'unknown', ok: response.ok === true }));
                        }
                        return response;
                    }
                    catch (error) {
                        let host = 'unknown';
                        try { host = new URL(url).host; } catch { /* keep the sanitized fallback */ }
                        console.warn(JSON.stringify({ event: 'ai_provider_network_failure', host,
                            errorName: error?.name || 'Error', causeCode: error?.cause?.code || '' }));
                        throw error;
                    }
                };
                const result = await (pathname === '/api/ai/brief'
                    ? handleAiBrief(input, {}, { fetchImpl: providerFetch })
                    : handleAiPlan(input, {}, { fetchImpl: providerFetch, onNetworkError: detail => {
                        console.warn(JSON.stringify({ event: 'ai_provider_network_failure', ...detail }));
                    } }));
                if (pathname === '/api/ai/plan' && result.status === 200) {
                    await attachLocalImageGenerationStatus(result.body, { baseUrl, fetchImpl });
                }
                return reply(result.status, result.body);
            }
            if (pathname === '/api/director/plan' && req.method === 'POST') {
                if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return reply(403, { error: 'INVALID_ORIGIN' });
                if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'JSON_REQUIRED' });
                let body = '';
                for await (const chunk of req) {
                    body += chunk;
                    if (Buffer.byteLength(body) > 16000) return reply(413, { error: 'BRIEF_TOO_LARGE' });
                }
                const input = JSON.parse(body);
                return reply(200, await createDirectorPlan(input, { baseUrl, fetchImpl, referenceFetchImpl: fetchImpl }));
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
                        poseStatus: result?.generation?.pose_composition_gate?.status || 'unknown',
                        poseReasons: Array.isArray(result?.generation?.pose_composition_gate?.reasons)
                            ? result.generation.pose_composition_gate.reasons : [],
                        faceQualityStatus: result?.generation?.face_quality_gate?.status || 'unknown',
                        shotLanguage: result?.generation?.shot_language || result?.generation?.request?.selected_shot?.shot_language || '',
                        contractFingerprint: result?.selected_shot_contract?.fingerprint || result?.generation?.shot_contract_fingerprint || '',
                        contractSource: result?.selected_shot_contract?.source || result?.generation?.shot_contract_source || '',
                    },
                });
            }
            if (pathname === '/api/director/identity-lock-workflow' && req.method === 'POST') {
                if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) return reply(403, { error: 'INVALID_ORIGIN' });
                if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'JSON_REQUIRED' });
                let body = '';
                for await (const chunk of req) {
                    body += chunk;
                    if (Buffer.byteLength(body) > 20000) return reply(413, { error: 'IDENTITY_WORKFLOW_REQUEST_TOO_LARGE' });
                }
                return reply(200, await buildDirectorIdentityWorkflow(JSON.parse(body), { baseUrl, fetchImpl }));
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
            if (pathname !== '/' && pathname !== '/index.html' && pathname !== '/favicon.jpg' && !/^\/assets\/[\w./-]+$/.test(pathname)) return reply(404, { error: 'NOT_FOUND' });
            const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
            if (!target.startsWith(root + path.sep) && target !== path.join(root, 'index.html')) return reply(403, { error: 'FORBIDDEN' });
            const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
            const content = await readFile(target);
            res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            res.end(content);
        } catch (error) {
            const referenceFailure = ['REFERENCE_LIBRARY_UNAVAILABLE', 'REFERENCE_IMAGES_REQUIRED', 'UNAVAILABLE_REFERENCE', 'INVALID_REFERENCE_SELECTION',
                'POSE_REFERENCE_CONFLICTS_WITH_USER_CONSTRAINTS', 'WARDROBE_REFERENCE_MISMATCH'].includes(error.message);
            const status = error.code === 'ENOENT' ? 404
                : error instanceof SyntaxError || error.message === 'INVALID_BRIEF' || error.message === 'INVALID_REFERENCE_SELECTION'
                    || error.message === 'POSE_REFERENCE_CONFLICTS_WITH_USER_CONSTRAINTS' ? 400
                    : error.message === 'PERSON_REQUIRED' ? 400
                    : error.message === 'WARDROBE_REFERENCE_MISMATCH' ? 422
                        : referenceFailure ? 503 : 502;
            reply(status, error.message === 'PERSON_REQUIRED'
                ? { error: '当前方案流程至少需要 1 位拍摄对象；纯静物方案暂未支持。', code: 'PERSON_REQUIRED' }
                : { error: referenceFailure || error.message?.startsWith('DIRECTOR_') || error.message === 'INVALID_BRIEF'
                    ? error.message : '摄影 Agent 请求失败，请检查服务和输入；未使用旧模板替代。' });
        }
    });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const port = Number(process.env.DIRECTOR_BRIDGE_PORT || 8125);
    createServer().listen(port, '127.0.0.1', () => console.log(`摄影系统：http://127.0.0.1:${port}/`));
}

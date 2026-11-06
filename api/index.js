// Photo Workflow Backend API - Cloudflare Workers
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createDirectorPlan, createGuestPlanDraft, createTemplatePlan } from './director-plan.mjs';
import { prepareReferenceContext, referencePlanFields } from './ai-studio/reference-brief.mjs';
import { buildDirectorIdentityWorkflow } from './director-identity-workflow.mjs';
import { attachJevReview } from './jev-review.mjs';
import { recordWebRequest } from './web-telemetry.mjs';
import { emailLoginEnabled, handleEmailAuth } from './email-auth.mjs';
import { aiPlanProviders, handleAiPlan } from './ai-plan.mjs';
import { handleAiBrief } from './ai-brief.mjs';
import { generateCloudCandidate, prepareCloudCandidateReferences } from './director-cloud-generation.mjs';
import { confirmStudioProposal, createStudioProposal, searchStudio, consumeStudioSearchQuota, consumeStudioImageQuota, AiStudioError } from './ai-studio/service.mjs';
import { checkStudioFeishuConnection, syncStudioPlan } from './ai-studio/feishu-sync.mjs';
import { workspaceEntryKey } from '../assets/workspace-sync-protocol.mjs';
export { AiStudioQuota } from './ai-studio/quota.mjs';
import { createGroup, setReference, confirmMaster, buildShotRequests, recordQc, continuitySummary, continuitySchema, attachResult, handoffFor, setImageProvider, ContinuityError } from './continuity.mjs';
import { storeAsset, readAsset } from './continuity-assets.mjs';
import { generateShot } from './continuity-generation.mjs';
import { listProviders, recommendProvider, assertGroupProvider } from './continuity-providers.mjs';
import { groupFromStudio } from './continuity-studio-bridge.mjs';
import { prescreen, mergeScores, summariseVision } from './continuity-vision.mjs';

// Reads a stored reference/result image back as a data URL for the vision call.
async function assetToDataUrl(imagePath, env) {
    const asset = await readAsset(imagePath, { env });
    if (!asset) return '';
    return `data:${asset.mime};base64,${Buffer.from(asset.buffer).toString('base64')}`;
}
export { WorkspaceSync } from './workspace-state.mjs';

// Cloudflare Workers 环境中 Buffer 不可用，使用替代方案
function base64UrlEncode(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
}

// ===== Input Validation =====
function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    return password.length >= 6 && password.length <= 128;
}

function sanitizeString(str, maxLength = 500) {
    if (!str || typeof str !== 'string') return '';
    return str.slice(0, maxLength).replace(/[<>"'&]/g, '');
}

// ===== Password Hashing =====
function hashPassword(password, env) {
    const salt = env.PASSWORD_SALT || 'photoatelier_salt_2025';
    return createHash('sha256').update(password + salt).digest('hex');
}

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json'
};

const STUDIO_PATHS = new Set(['/api/ai/plan-lite', '/api/ai/studio/proposals', '/api/ai/studio/confirm',
    '/api/ai/studio/feishu/status', '/api/ai/studio/feishu/sync']);
const STUDIO_CORS = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
};
function studioOriginAllowed(origin, env) {
    const allowed = String(env.AI_STUDIO_ALLOWED_ORIGINS || '').split(',').map(value => value.trim());
    return Boolean(origin && (allowed.includes(origin) || (env.ENVIRONMENT !== 'production'
        && /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin))));
}
function studioJson(status, body, origin) {
    return new Response(JSON.stringify(body), { status, headers: {
        ...STUDIO_CORS, ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    } });
}

// ===== HTTP Helper using fetch =====
async function sbQuery(env, path, method = 'GET', body = null) {
    const key = env.SUPABASE_SERVICE_KEY;
    if (!env.SUPABASE_URL || !key) {
        return { error: 'Supabase not configured' };
    }
    const base = env.SUPABASE_URL.trim().replace(/\/+$/, '');
    const url = `${base.startsWith('https://') ? base : `https://${base}`}/rest/v1/${path}`;
    const headers = {
        'apikey': key,
        'Content-Type': 'application/json'
    };
    if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
    if (method === 'POST' || method === 'PATCH') {
        headers['Prefer'] = 'return=representation';
    }
    
    try {
        const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
        const text = await res.text();
        
        if (!res.ok) {
            let errorMsg = `Supabase error ${res.status}`;
            try {
                const errJson = JSON.parse(text);
                errorMsg = errJson.message || errJson.error || errJson.details || JSON.stringify(errJson);
            } catch {}
            return { error: errorMsg };
        }
        
        try { return JSON.parse(text); } catch { return text; }
    } catch (err) {
        return { error: err.message };
    }
}

// ===== Auth =====
function genToken(userId, env) {
    const secret = env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const payload = JSON.stringify({ uid: userId, t: Date.now() });
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    return base64UrlEncode(JSON.stringify({ p: payload, s: sig }));
}

function verifyToken(authHeader, env) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const secret = env.JWT_SECRET;
    if (!secret) return null;
    try {
        const decoded = JSON.parse(base64UrlDecode(authHeader.slice(7)));
        const expectedSig = createHmac('sha256', secret).update(decoded.p).digest('hex');
        if (typeof decoded.s !== 'string' || !/^[a-f0-9]{64}$/.test(decoded.s)) return null;
        if (!timingSafeEqual(new TextEncoder().encode(decoded.s), new TextEncoder().encode(expectedSig))) return null;
        const payload = JSON.parse(decoded.p);
        if (typeof payload.uid !== 'string' || !payload.uid || !Number.isSafeInteger(payload.t)) return null;
        if (payload.t > Date.now() + 300000 || Date.now() - payload.t > 7 * 24 * 3600 * 1000) return null;
        return payload.uid;
    } catch { return null; }
}

function candidatePlanSupportsGeneration(plan) {
    return Array.isArray(plan?.shotList) && plan.shotList.length > 0 && plan.shotList.every(shot =>
        typeof shot?.directorContract?.shot_language === 'string' && typeof shot?.directorContract?.generator_prompt === 'string');
}

function candidateAssetSignature(owner, assetId, expires, env) {
    return createHmac('sha256', env.JWT_SECRET).update(`${owner}:${assetId}:${expires}`).digest('hex');
}

function candidateAssetUrl(owner, assetId, env) {
    const expires = Date.now() + 365 * 24 * 60 * 60 * 1000;
    const signature = candidateAssetSignature(owner, assetId, expires, env);
    return `/api/director/candidates/${assetId}?owner=${encodeURIComponent(owner)}&exp=${expires}&sig=${signature}`;
}

function validCandidateAssetUrl(url, assetId, env) {
    const owner = url.searchParams.get('owner') || '';
    const expires = Number(url.searchParams.get('exp'));
    const signature = url.searchParams.get('sig') || '';
    if (!owner || owner.length > 128 || !Number.isSafeInteger(expires) || expires <= Date.now()
        || expires > Date.now() + 366 * 24 * 60 * 60 * 1000 || !/^[a-f0-9]{64}$/i.test(signature) || !env.JWT_SECRET) return null;
    const expected = candidateAssetSignature(owner, assetId, expires, env);
    return timingSafeEqual(new TextEncoder().encode(signature.toLowerCase()), new TextEncoder().encode(expected)) ? owner : null;
}

function cloudImageGenerationEnabled(plan, uid, env) {
    return Boolean(uid && env.JWT_SECRET && typeof env.AI?.run === 'function' && env.WORKSPACE_SYNC && candidatePlanSupportsGeneration(plan));
}

// ===== Handlers =====
async function handleLogin(env, body) {
    try {
        const { email, password } = body;
        
        // 输入验证
        if (!validateEmail(email)) return { status: 400, body: { error: '邮箱格式不正确' } };
        if (!validatePassword(password)) return { status: 400, body: { error: '密码长度需为6-128位' } };
        
        const sanitizedEmail = sanitizeString(email, 255);
        const users = await sbQuery(env, `users?email=eq.${encodeURIComponent(sanitizedEmail)}&select=id,email,password_hash&limit=1`);
        if (users.error) return { status: 503, body: { error: '登录服务暂时不可用，请稍后重试' } };
        
        if (users && users.length > 0) {
            if (users[0].password_hash !== hashPassword(password, env)) return { status: 401, body: { error: '密码错误' } };
            return { status: 200, body: { success: true, user: { id: users[0].id, email: users[0].email }, token: genToken(users[0].id, env) } };
        }

        const newUser = await sbQuery(env, 'users', 'POST', { email: sanitizedEmail, password_hash: hashPassword(password, env) });
        if (newUser.error) return { status: 503, body: { error: '注册服务暂时不可用，请稍后重试' } };
        return { status: 201, body: { success: true, user: { id: newUser[0].id, email: newUser[0].email }, token: genToken(newUser[0].id, env) } };
    } catch (err) {
        return { status: 500, body: { error: '登录服务发生错误，请稍后重试' } };
    }
}

async function handleGetSchedules(env, uid) {
    const data = await sbQuery(env, `schedules?user_id=eq.${uid}&select=*&order=date.asc`);
    const schedules = (data || []).map(row => {
        let metadata = {};
        try { metadata = row.description ? JSON.parse(row.description) : {}; } catch (_) {}
        return {
            ...row,
            planId: metadata.planId || row.plan_id || '',
            audience: metadata.audience || ['photographer', 'model', 'assistant'],
            planSummary: metadata.planSummary || null,
        };
    });
    return { status: 200, body: { schedules } };
}

async function handleCreateSchedule(env, uid, body) {
    const metadata = {
        planId: body.planId || body.plan_id || '',
        audience: Array.isArray(body.audience) ? body.audience : ['photographer', 'model', 'assistant'],
        planSummary: body.planSummary || null,
    };
    const record = {
        id: body.id,
        user_id: uid,
        date: body.date,
        title: body.title,
        time: body.time || null,
        location: body.location || null,
        description: JSON.stringify(metadata),
        status: body.status || 'pending',
    };
    const data = await sbQuery(env, 'schedules', 'POST', record);
    const saved = data && data[0] ? data[0] : record;
    return { status: 201, body: { schedule: { ...saved, ...metadata } } };
}

async function handleDeleteSchedule(env, uid, id) {
    const filter = `id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(uid)}`;
    const existing = await sbQuery(env, `schedules?${filter}&select=id`);
    if (!existing || !existing.length) return { status: 404, body: { error: '日程不存在' } };
    await sbQuery(env, `schedules?${filter}`, 'DELETE');
    return { status: 200, body: { success: true } };
}

async function handleGetPlans(env, uid) {
    const data = await sbQuery(env, `plans?user_id=eq.${uid}&select=*&order=created_at.desc`);
    return { status: 200, body: { plans: data || [] } };
}

async function handleCreatePlan(env, uid, body) {
    // 简化：直接返回成功，不调用 Supabase
    return { 
        status: 201, 
        body: { 
            plan: {
                id: Date.now().toString(),
                user_id: uid,
                title: body.title || 'Untitled',
                style: body.style || null,
                created_at: new Date().toISOString()
            }
        }
    };
}

async function handleGetMessages(env, uid) {
    const data = await sbQuery(env, `messages?user_id=eq.${uid}&select=*&order=created_at.desc`);
    return { status: 200, body: { messages: data || [] } };
}

async function handleCreateMessage(env, uid, body) {
    const data = await sbQuery(env, 'messages', 'POST', { ...body, user_id: uid });
    return { status: 201, body: { message: data[0] } };
}

async function handleDeleteMessage(env, uid, id) {
    const filter = `id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(uid)}`;
    const existing = await sbQuery(env, `messages?${filter}&select=id`);
    if (!existing || !existing.length) return { status: 404, body: { error: '消息不存在' } };
    await sbQuery(env, `messages?${filter}`, 'DELETE');
    return { status: 200, body: { success: true } };
}

async function handlePublicMessage(env, body) {
    const { name, email, phone, service_type, message } = body;
    if (!name || !email) return { status: 400, body: { error: '姓名和邮箱为必填项' } };
    const data = await sbQuery(env, 'messages', 'POST', {
        name, email, phone: phone || '', service_type: service_type || '其他',
        message: message || '', status: 'new', user_id: '00000000-0000-0000-0000-000000000000'
    });
    return { status: 201, body: { success: true, message: data[0] } };
}

async function handleDashboardStats(env, uid) {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    
    const schedules = await sbQuery(env, `schedules?user_id=eq.${uid}&select=*`);
    const schedulesData = schedules || [];
    
    const currentMonthShoots = schedulesData.filter(s => s.date && s.date.startsWith(currentMonth)).length;
    const lastMonthShoots = schedulesData.filter(s => s.date && s.date.startsWith(lastMonth)).length;
    const monthGrowth = lastMonthShoots > 0 ? Math.round((currentMonthShoots - lastMonthShoots) / lastMonthShoots * 100) : 0;
    
    const completedShoots = schedulesData.filter(s => s.status === 'completed' || !s.status).length;
    const completionRate = schedulesData.length > 0 ? Math.round(completedShoots / schedulesData.length * 100) : 0;
    
    const uniqueLocations = [...new Set(schedulesData.map(s => s.location).filter(Boolean))];
    const activeClients = uniqueLocations.length;
    
    const trends = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7);
        const monthName = (d.getMonth() + 1) + '月';
        const count = schedulesData.filter(s => s.date && s.date.startsWith(monthStr)).length;
        trends.push({ month: monthName, count });
    }
    
    const venueCounts = {};
    schedulesData.forEach(s => {
        if (s.location) venueCounts[s.location] = (venueCounts[s.location] || 0) + 1;
    });
    const topVenues = Object.entries(venueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count], index) => ({ rank: index + 1, name, count }));
    
    const defaultVenues = [
        { rank: 1, name: '复古酒店', count: 15 },
        { rank: 2, name: '天台', count: 12 },
        { rank: 3, name: '影棚', count: 10 },
        { rank: 4, name: '咖啡馆', count: 8 },
        { rank: 5, name: '公园', count: 6 }
    ];
    const finalTopVenues = topVenues.length >= 5 ? topVenues : [...topVenues, ...defaultVenues.slice(topVenues.length)];
    
    return {
        status: 200,
        body: {
            stats: { monthShoots: currentMonthShoots, monthGrowth, completionRate, activeClients, newClients: Math.max(0, currentMonthShoots - lastMonthShoots), equipmentRate: 76 },
            trends,
            topVenues: finalTopVenues,
            customerTypes: { new: 40, old: 35, repeat: 25 },
            topEquipment: [{ rank: 1, name: 'A7M4', count: 45 }, { rank: 2, name: '85mm', count: 38 }, { rank: 3, name: '闪光灯', count: 32 }, { rank: 4, name: '反光板', count: 28 }, { rank: 5, name: '三脚架', count: 20 }],
            customerAnalysis: { satisfaction: 4.8, repeatRate: 68, repeatGrowth: 8, types: { personal: 45, studio: 35, enterprise: 20 } }
        }
    };
}

// ===== Main Export =====
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;
        const isStudio = STUDIO_PATHS.has(path);
        const origin = request.headers.get('Origin');
        if (isStudio && !studioOriginAllowed(origin, env)) return studioJson(403, { error: 'ORIGIN_NOT_ALLOWED' });
        if (method === 'OPTIONS') {
            return isStudio ? new Response(null, { status: 204, headers: { ...STUDIO_CORS, 'Access-Control-Allow-Origin': origin } })
                : new Response(null, { status: 200, headers: CORS });
        }

        // Parse body
        let body = {};
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            if (isStudio || path === '/api/ai/plan' || path === '/api/ai/brief' || path === '/api/continuity/asset'
                || path === '/api/director/generate-candidate') {
                if (!request.headers.get('content-type')?.startsWith('application/json')) return isStudio
                    ? studioJson(415, { error: 'JSON_REQUIRED' }, origin) : Response.json({ error: 'JSON_REQUIRED' }, { status: 415, headers: CORS });
                // Reference images arrive as base64, so this route needs a larger cap
                // than the text routes (8MB binary ≈ 11MB base64 + envelope).
                const limit = isStudio ? (path === '/api/ai/plan-lite' ? 8192 : 32768)
                    : path === '/api/continuity/asset' ? 12 * 1024 * 1024
                        : path === '/api/director/generate-candidate' ? 24 * 1024 : 16000;
                const reader = request.body?.getReader();
                let size = 0, chunks = [];
                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        size += value.length;
                        if (size > limit) { await reader.cancel(); return isStudio
                            ? studioJson(413, { error: 'REQUEST_TOO_LARGE' }, origin) : Response.json({ error: 'REQUEST_TOO_LARGE' }, { status: 413, headers: CORS }); }
                        chunks.push(value);
                    }
                }
                const bytes = new Uint8Array(size);
                let offset = 0;
                for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
                try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return isStudio
                    ? studioJson(400, { error: 'INVALID_JSON' }, origin) : Response.json({ error: 'INVALID_JSON' }, { status: 400, headers: CORS }); }
                if (isStudio && (!body || typeof body !== 'object' || Array.isArray(body))) return studioJson(400, { error: 'INVALID_JSON' }, origin);
            } else {
                try { body = await request.json(); } catch {}
            }
        }

        let result;

        try {
            const uid = verifyToken(request.headers.get('authorization'), env);

            // BYOK is stateless: keys are used for one provider request, never saved.
            if (path === '/api/ai/plan-lite' && method === 'POST') {
                const allowed = await consumeStudioSearchQuota({ uid, ip: request.headers.get('CF-Connecting-IP'), env });
                if (allowed === null) result = { status: 503, body: { error: 'AI_STUDIO_QUOTA_NOT_CONFIGURED' } };
                else if (!allowed) result = { status: 429, body: { error: 'RATE_LIMITED' } };
                else result = { status: 200, body: await searchStudio({
                    prompt: body.prompt, planId: body.planId, expectedRevision: body.expectedRevision, uid, env,
                }) };
            }
            else if (path === '/api/ai/studio/proposals' && method === 'POST') {
                result = uid ? { status: 200, body: await createStudioProposal({
                    searchReceipt: body.searchReceipt, selectedIds: body.selectedIds, uid, env,
                }) } : { status: 401, body: { error: '未登录' } };
            }
            else if (path === '/api/ai/studio/confirm' && method === 'POST') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else if (!env.WORKSPACE_SYNC) result = { status: 503, body: { error: 'WORKSPACE_SYNC_NOT_CONFIGURED' } };
                else {
                    const commit = await confirmStudioProposal({ proposalToken: body.proposalToken, idempotencyKey: body.idempotencyKey, uid, env });
                    const object = env.WORKSPACE_SYNC.get(env.WORKSPACE_SYNC.idFromName(`user:${uid}`));
                    const response = await object.fetch(new Request('https://workspace.internal/studio/commit', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(commit),
                    }));
                    const saved = await response.json();
                    result = { status: response.status, body: response.ok ? { ...commit, ...saved, storage: 'workspace' } : saved };
                }
            }
            else if (path === '/api/ai/studio/feishu/status' && method === 'GET') {
                result = uid ? { status: 200, body: await checkStudioFeishuConnection({ env }) }
                    : { status: 401, body: { error: '未登录' } };
            }
            else if (path === '/api/ai/studio/feishu/sync' && method === 'POST') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else if (typeof body.planId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(body.planId)) result = { status: 400, body: { error: 'INVALID_PLAN_ID' } };
                else if (!env.WORKSPACE_SYNC) result = { status: 503, body: { error: 'WORKSPACE_SYNC_NOT_CONFIGURED' } };
                else {
                    const object = env.WORKSPACE_SYNC.get(env.WORKSPACE_SYNC.idFromName(`user:${uid}`));
                    const workspace = await (await object.fetch(new Request('https://workspace.internal/state'))).json();
                    const plan = workspace.entries[workspaceEntryKey('local', 'pw_plans', `record:${body.planId}`)];
                    if (!plan) result = { status: 404, body: { error: 'PLAN_NOT_FOUND' } };
                    else {
                        const outcome = await syncStudioPlan({ uid, plan, env });
                        const saved = await object.fetch(new Request('https://workspace.internal/studio/sync-result', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(outcome),
                        }));
                        const data = await saved.json();
                        result = { status: saved.status, body: saved.ok ? { ...outcome, ...data, storage: 'workspace' } : data };
                    }
                }
            }
            else if (path === '/api/ai/providers' && method === 'GET') {
                result = { status: 200, body: { providers: aiPlanProviders(env) } };
            }
            else if (path === '/api/ai/plan' && method === 'POST') {
                result = await handleAiPlan(body, env);
                if (result.status === 200) {
                    result.body.director = { ...result.body.director,
                        imageGenerationConnected: cloudImageGenerationEnabled(result.body, uid, env),
                        imageGenerationMode: cloudImageGenerationEnabled(result.body, uid, env)
                            ? 'cloud-fal-candidate-review' : 'cloud-image-provider-not-configured',
                    };
                }
            }
            else if (path === '/api/ai/brief' && method === 'POST') {
                result = await handleAiBrief(body, env);
            }
            // Shared browser business data, isolated by the authenticated account.
            else if (path === '/api/auth/session' && method === 'GET') {
                result = uid ? { status: 200, body: { success: true, user: { id: uid } } }
                    : { status: 401, body: { error: '登录已失效，请重新登录' } };
            }
            else if (path === '/api/workspace/state' && ['GET', 'POST'].includes(method)) {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else if (!env.WORKSPACE_SYNC) result = { status: 503, body: { error: 'WORKSPACE_SYNC_NOT_CONFIGURED' } };
                else {
                    const object = env.WORKSPACE_SYNC.get(env.WORKSPACE_SYNC.idFromName(`user:${uid}`));
                    const response = await object.fetch(new Request('https://workspace.internal/state', {
                        method, headers: { 'Content-Type': 'application/json' },
                        body: method === 'POST' ? JSON.stringify(body) : undefined,
                    }));
                    result = { status: response.status, body: await response.json() };
                }
            }
            // Continuity: locked shoot bible + role-separated references + per-shot requests.
            // Stateless: the client sends the contract back on every call.
            // Continuity asset storage: content-addressed reference images.
            else if (path === '/api/continuity/asset' && method === 'POST') {
                const asset = await storeAsset({ dataUrl: body?.dataUrl, role: body?.role, env });
                result = { status: 201, body: asset };
            }
            else if (path.startsWith('/api/continuity/asset/') && method === 'GET') {
                const asset = await readAsset(path, { env });
                if (!asset) result = { status: 404, body: { error: 'ASSET_NOT_FOUND' } };
                else return new Response(asset.buffer, {
                    status: 200,
                    headers: { ...CORS, 'Content-Type': asset.mime, 'Cache-Control': 'private, max-age=86400' },
                });
            }
            else if (path === '/api/continuity/schema' && method === 'GET') {
                result = { status: 200, body: continuitySchema() };
            }
            else if (path === '/api/continuity/init' && method === 'POST') {
                result = { status: 200, body: { group: createGroup(body || {}) } };
            }
            else if (path === '/api/continuity/reference' && method === 'POST') {
                result = { status: 200, body: { group: setReference(body?.group, body?.reference || body) } };
            }
            else if (path === '/api/continuity/master' && method === 'POST') {
                result = { status: 200, body: { group: confirmMaster(body?.group, { assetId: body?.assetId, actor: body?.actor }) } };
            }
            else if (path === '/api/continuity/requests' && method === 'POST') {
                const shots = buildShotRequests(body?.group, {
                    providerId: body?.providerId,
                    shotIds: Array.isArray(body?.shotIds) ? body.shotIds : [],
                    seedBase: Number(body?.seedBase) || 428193,
                });
                result = { status: 200, body: { requests: shots, count: shots.length } };
            }
            // Manual hand-off: the image is made elsewhere (ChatGPT web), then
            // uploaded back. Same contract checks, same QC path.
            // Image-provider catalog: the brush is pluggable, the brain is not.
            else if (path === '/api/continuity/providers' && method === 'GET') {
                const needReferences = url.searchParams.get('needReferences') !== 'false';
                const maxPriceTier = url.searchParams.get('maxPriceTier') || '';
                const configuredEnv = { OPENAI_API_KEY: env.OPENAI_API_KEY, CONTINUITY_IMAGE_ENDPOINT: env.CONTINUITY_IMAGE_ENDPOINT, CONTINUITY_IMAGE_KEY: env.CONTINUITY_IMAGE_KEY };
                result = {
                    status: 200,
                    body: {
                        providers: listProviders({ needReferences, maxPriceTier }),
                        ...recommendProvider({ needReferences, configuredEnv, maxPriceTier }),
                    },
                };
            }
            else if (path === '/api/continuity/provider' && method === 'POST') {
                // Validate before writing: a provider that cannot take references
                // must not be pinned on a continuity group.
                const provider = body?.providerId ? assertGroupProvider(body?.group, body.providerId) : null;
                result = { status: 200, body: { group: setImageProvider(body?.group, { providerId: provider.id }), provider } };
            }
            else if (path === '/api/continuity/from-studio' && method === 'POST') {
                result = { status: 200, body: groupFromStudio({
                    templates: body?.templates, input: body?.input || {}, planId: body?.planId || '', selectedIds: body?.selectedIds || [],
                }) };
            }
            else if (path === '/api/continuity/handoff' && method === 'POST') {
                result = { status: 200, body: handoffFor(body?.group, { shotId: body?.shotId || '' }) };
            }
            else if (path === '/api/continuity/attach' && method === 'POST') {
                const asset = await storeAsset({ dataUrl: body?.dataUrl, role: 'misc', env });
                const group = attachResult(body?.group, {
                    shotId: body?.shotId, assetId: asset.assetId, path: asset.path,
                    provider: body?.provider || 'manual', seed: body?.seed ?? null,
                });
                result = { status: 200, body: { group, asset } };
            }
            else if (path === '/api/continuity/generate' && method === 'POST') {
                const generated = await generateShot({
                    group: body?.group, shotId: body?.shotId, providerId: body?.providerId, env,
                });
                result = { status: 200, body: generated };
            }
            else if (path === '/api/continuity/prescreen' && method === 'POST') {
                const shot = (body?.group?.shots || []).find(item => item.shotId === body?.shotId);
                if (!shot) result = { status: 404, body: { error: '没有这个镜头', code: 'CONTINUITY_SHOT_UNKNOWN' } };
                else {
                    const vision = await prescreen({
                        imageDataUrl: body?.imageDataUrl || (body?.imagePath ? await assetToDataUrl(body.imagePath, env) : ''),
                        shot, locked: body.group.locked, env,
                    });
                    result = {
                        status: 200,
                        body: { ...vision, summary: summariseVision(vision), merged: mergeScores(body?.scores || {}, vision.scores) },
                    };
                }
            }
            else if (path === '/api/continuity/qc' && method === 'POST') {
                const judged = recordQc(body?.group, {
                    shotId: body?.shotId, scores: body?.scores,
                    humanConfirmed: body?.humanConfirmed === true, reviewer: body?.reviewer || 'human',
                });
                result = { status: 200, body: judged };
            }
            else if (path === '/api/continuity/summary' && method === 'POST') {
                result = { status: 200, body: continuitySummary(body?.group) };
            }
            // Auth
            else if (path === '/api/director/plan' && method === 'POST') {
                let plan;
                if (!env.DIRECTOR_API_BASE || !env.DIRECTOR_API_BASE.startsWith('https://')) {
                    plan = createGuestPlanDraft(body);
                    const referenceContext = await prepareReferenceContext(body);
                    Object.assign(plan, referencePlanFields(referenceContext));
                    if (uid && referenceContext?.templates.some(template => template.sourceUrl && template.kind === 'pose')) {
                        plan = createTemplatePlan(body, referenceContext);
                        plan.director.imageGenerationConnected = cloudImageGenerationEnabled(plan, uid, env);
                    }
                } else {
                    plan = await createDirectorPlan(body, { baseUrl: env.DIRECTOR_API_BASE });
                    plan.director = { ...plan.director,
                        imageGenerationConnected: cloudImageGenerationEnabled(plan, uid, env),
                        imageGenerationMode: cloudImageGenerationEnabled(plan, uid, env)
                            ? 'cloud-fal-candidate-review' : 'cloud-image-provider-not-configured',
                    };
                }
                result = { status: 200, body: await attachJevReview(plan, env) };
            }
            else if (path === '/api/director/generate-candidate' && method === 'POST') {
                if (!uid) result = { status: 401, body: { error: 'SIGN_IN_REQUIRED' } };
                else if (!env.AI || typeof env.AI.run !== 'function') result = { status: 503, body: { error: 'IMAGE_PROVIDER_NOT_CONFIGURED' } };
                else if (!env.WORKSPACE_SYNC || !env.JWT_SECRET) result = { status: 503, body: { error: 'CANDIDATE_STORAGE_NOT_CONFIGURED' } };
                else {
                    const allowed = await consumeStudioImageQuota({ uid, env });
                    if (allowed === null) result = { status: 503, body: { error: 'IMAGE_QUOTA_NOT_CONFIGURED' } };
                    else if (allowed === 'global-limit') result = { status: 429, body: { error: 'GLOBAL_IMAGE_DAILY_LIMIT_REACHED' } };
                    else if (!allowed) result = { status: 429, body: { error: 'IMAGE_DAILY_LIMIT_REACHED' } };
                    else {
                        try {
                            const referenceContext = await prepareCloudCandidateReferences(body);
                            const generated = await generateCloudCandidate(body, { ai: env.AI, referenceContext });
                            const assetId = crypto.randomUUID().replace(/-/g, '');
                            const object = env.WORKSPACE_SYNC.get(env.WORKSPACE_SYNC.idFromName(`user:${uid}`));
                            const stored = await object.fetch(new Request(`https://workspace.internal/candidate-assets/${assetId}`, {
                                method: 'PUT', headers: { 'Content-Type': generated.mime }, body: generated.bytes,
                            }));
                            if (!stored.ok) throw new Error('CANDIDATE_ASSET_STORE_FAILED');
                            const assetUrl = new URL(candidateAssetUrl(uid, assetId, env), url.origin).href;
                            result = { status: 201, body: {
                                request_id: typeof body.request_id === 'string' ? body.request_id.slice(0, 128) : assetId,
                                selected_shot_contract: { source: 'template-library-shot-contract',
                                    referenceIds: referenceContext.templates.map(template => template.id),
                                    library: referenceContext.library },
                                candidateAsset: { id: assetId, url: assetUrl, synthetic: true,
                                    status: 'candidate-awaiting-human-review', source: 'cloudflare-workers-ai',
                                    model: generated.model, poseStatus: 'not-run', poseReasons: [], faceQualityStatus: 'not-run',
                                    shotLanguage: generated.shotLanguage, contractSource: 'template-library-shot-contract',
                                    referenceIds: referenceContext.templates.map(template => template.id),
                                    contractFingerprint: '', expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                                    productionRelease: false },
                            } };
                        } catch (error) {
                            const code = ['REFERENCE_LIBRARY_UNAVAILABLE', 'INVALID_REFERENCE_SELECTION', 'UNAVAILABLE_REFERENCE',
                                'IMAGE_PROVIDER_NOT_CONFIGURED', 'IMAGE_PROVIDER_GENERATION_FAILED',
                                'IMAGE_PROVIDER_INVALID_RESPONSE', 'IMAGE_PROVIDER_INVALID_IMAGE_TYPE', 'IMAGE_PROVIDER_IMAGE_SIZE_INVALID',
                                'GENERATION_PROVIDER_NOT_ALLOWED', 'GENERATION_BILLING_MODE_NOT_ALLOWED', 'CLOUD_REFERENCE_IMAGE_NOT_CONFIGURED',
                                'INVALID_GENERATION_REQUEST', 'SHOT_CONTRACT_REQUIRED'].includes(error.message)
                                ? error.message : 'IMAGE_GENERATION_FAILED';
                            const status = code === 'REFERENCE_LIBRARY_UNAVAILABLE' || code === 'IMAGE_PROVIDER_NOT_CONFIGURED' || code === 'IMAGE_PROVIDER_GENERATION_FAILED' ? 503
                                        : code === 'GENERATION_PROVIDER_NOT_ALLOWED' || code === 'GENERATION_BILLING_MODE_NOT_ALLOWED'
                                            || code === 'CLOUD_REFERENCE_IMAGE_NOT_CONFIGURED' || code === 'INVALID_GENERATION_REQUEST'
                                            || code === 'SHOT_CONTRACT_REQUIRED' ? 400 : 502;
                            result = { status, body: { error: code } };
                        }
                    }
                }
            }
            else if (path.startsWith('/api/director/candidates/') && method === 'GET') {
                const match = path.match(/^\/api\/director\/candidates\/([a-f0-9]{32})$/i);
                const owner = match && validCandidateAssetUrl(url, match[1].toLowerCase(), env);
                if (!owner) result = { status: 404, body: { error: 'CANDIDATE_ASSET_NOT_FOUND' } };
                else if (!env.WORKSPACE_SYNC) result = { status: 503, body: { error: 'CANDIDATE_STORAGE_NOT_CONFIGURED' } };
                else {
                    const object = env.WORKSPACE_SYNC.get(env.WORKSPACE_SYNC.idFromName(`user:${owner}`));
                    const asset = await object.fetch(new Request(`https://workspace.internal/candidate-assets/${match[1].toLowerCase()}`));
                    if (!asset.ok) result = { status: asset.status, body: await asset.json() };
                    else return new Response(asset.body, { status: 200, headers: { ...CORS,
                        'Content-Type': asset.headers.get('Content-Type') || 'application/octet-stream',
                        'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff',
                    } });
                }
            }
            else if (path === '/api/director/identity-lock-workflow' && method === 'POST') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else if (body.reference_image_path) result = { status: 422, body: { error: 'IDENTITY_REFERENCE_LOCAL_ONLY：云端尚未配置参考图存储，请使用本机摄影系统' } };
                else if (!env.DIRECTOR_API_BASE || !env.DIRECTOR_API_BASE.startsWith('https://')) result = { status: 503, body: { error: 'DIRECTOR_NOT_CONFIGURED：请先部署受保护的 Director 服务' } };
                else result = { status: 200, body: await buildDirectorIdentityWorkflow(body, { baseUrl: env.DIRECTOR_API_BASE }) };
            }
            else if (path === '/api/auth/methods' && method === 'GET') {
                result = { status: 200, body: { emailOtp: emailLoginEnabled(env), password: true, guest: true } };
            }
            else if (['/api/auth/email/send', '/api/auth/email/verify'].includes(path) && method === 'POST') {
                result = await handleEmailAuth(env, body, path.endsWith('/send') ? 'send' : 'verify', { query: sbQuery, sign: genToken });
            }
            else if (path === '/api/auth/login' && method === 'POST') {
                result = await handleLogin(env, body);
            }
            // Schedules
            else if (path === '/api/schedules' && method === 'GET') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else result = await handleGetSchedules(env, uid);
            }
            else if (path === '/api/schedules' && method === 'POST') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else result = await handleCreateSchedule(env, uid, body);
            }
            else if (path.startsWith('/api/schedules/') && method === 'DELETE') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else result = await handleDeleteSchedule(env, uid, path.split('/').pop());
            }
            // Plans
            else if (path === '/api/plans' && method === 'GET') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else result = await handleGetPlans(env, uid);
            }
            else if (path === '/api/plans' && method === 'POST') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else {
                    result = await handleCreatePlan(env, uid, body);
                }
            }
            // Messages
            else if (path === '/api/messages' && method === 'GET') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else result = await handleGetMessages(env, uid);
            }
            else if (path === '/api/messages' && method === 'POST') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else result = await handleCreateMessage(env, uid, body);
            }
            else if (path.startsWith('/api/messages/') && method === 'DELETE') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else result = await handleDeleteMessage(env, uid, path.split('/').pop());
            }
            // Public message
            else if (path === '/api/messages/public' && method === 'POST') {
                result = await handlePublicMessage(env, body);
            }
            // Dashboard
            else if (path === '/api/dashboard/stats' && method === 'GET') {
                if (!uid) result = { status: 401, body: { error: '未登录' } };
                else result = await handleDashboardStats(env, uid);
            }
            // Health
            else if (path === '/api/health' || path === '/health') {
                result = { status: 200, body: { status: 'ok', time: new Date().toISOString(), service: 'photo-workflow-web', release: 'web-discovery-20261015' } };
            }
            else {
                result = { status: 404, body: { error: 'Not Found' } };
            }

            if (isStudio) return studioJson(result.status, result.body, origin);
            const requestId = recordWebRequest(request, result, env, body);
            return new Response(JSON.stringify(result.body), { 
                status: result.status, 
                headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Request-Id': requestId }
            });

        } catch (e) {
            if (isStudio) return studioJson(e instanceof AiStudioError ? e.status : 500,
                { error: e instanceof AiStudioError ? e.code : 'AI_STUDIO_ERROR' }, origin);
            // Contract violations are the product here: report the exact code so the
            // UI can show "参考图未确认" instead of a generic server error.
            if (e instanceof ContinuityError || e?.name === 'GenerationError' || e?.name === 'AssetError') {
                const failure = { status: e.status || 400, body: { error: e.message, code: e.code, ...(e.details ? { details: e.details } : {}) } };
                const requestId = recordWebRequest(request, failure, env, body);
                return new Response(JSON.stringify(failure.body), {
                    status: e.status || 400,
                    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Request-Id': requestId }
                });
            }
            const failure = { status: 500, body: { error: '服务器暂时不可用，请稍后重试' } };
            const requestId = recordWebRequest(request, failure, env, body);
            return new Response(JSON.stringify(failure.body), {
                status: 500, 
                headers: { ...CORS, 'Content-Type': 'application/json', 'X-Request-Id': requestId }
            });
        }
    }
};

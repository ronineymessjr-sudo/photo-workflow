// Photo Workflow Backend API - Cloudflare Workers
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createDirectorPlan, createGuestPlanDraft } from './director-plan.mjs';
import { buildDirectorIdentityWorkflow } from './director-identity-workflow.mjs';
import { attachJevReview } from './jev-review.mjs';
import { recordWebRequest } from './web-telemetry.mjs';
import { emailLoginEnabled, handleEmailAuth } from './email-auth.mjs';
import { aiPlanProviders, handleAiPlan } from './ai-plan.mjs';
import { handleAiBrief } from './ai-brief.mjs';
import { createGroup, setReference, confirmMaster, buildShotRequests, recordQc, continuitySummary, continuitySchema, attachResult, handoffFor, ContinuityError } from './continuity.mjs';
import { storeAsset, readAsset } from './continuity-assets.mjs';
import { generateShot } from './continuity-generation.mjs';
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
        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 200, headers: CORS });
        }

        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Parse body
        let body = {};
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            if (path === '/api/ai/plan' || path === '/api/ai/brief' || path === '/api/continuity/asset') {
                if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'JSON_REQUIRED' }, { status: 415, headers: CORS });
                // Reference images arrive as base64, so this route needs a larger cap
                // than the text routes (8MB binary ≈ 11MB base64 + envelope).
                const limit = path === '/api/continuity/asset' ? 12 * 1024 * 1024 : 16000;
                const reader = request.body?.getReader();
                let size = 0, chunks = [];
                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        size += value.length;
                        if (size > limit) { await reader.cancel(); return Response.json({ error: 'REQUEST_TOO_LARGE' }, { status: 413, headers: CORS }); }
                        chunks.push(value);
                    }
                }
                const bytes = new Uint8Array(size);
                let offset = 0;
                for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
                try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400, headers: CORS }); }
            } else {
                try { body = await request.json(); } catch {}
            }
        }

        let result;

        try {
            const uid = verifyToken(request.headers.get('authorization'), env);

            // BYOK is stateless: keys are used for one provider request, never saved.
            if (path === '/api/ai/providers' && method === 'GET') {
                result = { status: 200, body: { providers: aiPlanProviders(env) } };
            }
            else if (path === '/api/ai/plan' && method === 'POST') {
                result = await handleAiPlan(body, env);
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
                } else {
                    plan = await createDirectorPlan(body, { baseUrl: env.DIRECTOR_API_BASE });
                    plan.director = { ...plan.director, imageGenerationConnected: false, imageGenerationMode: 'cloud-image-delivery-not-configured' };
                }
                result = { status: 200, body: await attachJevReview(plan, env) };
            }
            else if (path === '/api/director/generate-candidate' && method === 'POST') {
                result = { status: 503, body: { error: 'CANDIDATE_IMAGE_DELIVERY_NOT_CONFIGURED', message: '云端候选图回传尚未配置；当前可生成并保存文字分镜。' } };
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

            const requestId = recordWebRequest(request, result, env, body);
            return new Response(JSON.stringify(result.body), { 
                status: result.status, 
                headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Request-Id': requestId }
            });

        } catch (e) {
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

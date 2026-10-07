const PREFIX = '/api/collab';
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

function error(status, code, message = code) {
    return { status, body: { error: code, message } };
}

function normalizedEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function text(value, max = 500) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function publicMember(member) {
    if (!member) return null;
    const { invite_token_hash, ...safe } = member;
    return safe;
}

async function makeInviteToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashInviteToken(token) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function supabaseRoot(env) {
    const raw = String(env.SUPABASE_URL || '').trim();
    if (!raw) return '';
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(normalized);
        if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return '';
        return url.origin;
    } catch {
        return '';
    }
}

async function db(env, table, method = 'GET', filters = {}, body, fetchImpl = fetch) {
    const root = supabaseRoot(env);
    const key = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    if (!root || !key) throw Object.assign(new Error('COLLAB_BACKEND_NOT_CONFIGURED'), { status: 503, code: 'COLLAB_BACKEND_NOT_CONFIGURED' });
    const query = new URLSearchParams(filters);
    const response = await fetchImpl(`${root}/rest/v1/${table}?${query}`, {
        method,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            ...(method === 'POST' || method === 'PATCH' || method === 'DELETE' ? { Prefer: 'return=representation' } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    if (!response.ok) {
        const missingSchema = response.status === 404 || data?.code === '42P01' || data?.code === '42703';
        throw Object.assign(new Error(missingSchema ? 'COLLAB_SCHEMA_NOT_INSTALLED' : 'COLLAB_STORAGE_ERROR'), {
            status: missingSchema ? 503 : 502,
            code: missingSchema ? 'COLLAB_SCHEMA_NOT_INSTALLED' : 'COLLAB_STORAGE_ERROR',
        });
    }
    return data;
}

async function profile(env, uid, fetchImpl) {
    const rows = await db(env, 'users', 'GET', { id: `eq.${uid}`, select: 'id,email', limit: '1' }, undefined, fetchImpl);
    if (!Array.isArray(rows) || !rows[0]) return null;
    return { id: rows[0].id, email: normalizedEmail(rows[0].email) };
}

async function membershipsFor(env, eventId, user, fetchImpl) {
    const byId = await db(env, 'shoot_event_members', 'GET', {
        event_id: `eq.${eventId}`, user_id: `eq.${user.id}`,
        select: 'id,event_id,user_id,invitee_email,role,status,invited_at,expires_at,invite_token_hash,accepted_at', limit: '1',
    }, undefined, fetchImpl);
    if (Array.isArray(byId) && byId[0]) return byId[0];
    if (!user.email) return null;
    const byEmail = await db(env, 'shoot_event_members', 'GET', {
        event_id: `eq.${eventId}`, invitee_email: `eq.${user.email}`,
        select: 'id,event_id,user_id,invitee_email,role,status,invited_at,expires_at,invite_token_hash,accepted_at', limit: '1',
    }, undefined, fetchImpl);
    return Array.isArray(byEmail) ? byEmail[0] || null : null;
}

async function activity(env, eventId, actorId, kind, summary, fetchImpl) {
    await db(env, 'shoot_event_activity', 'POST', {}, {
        id: crypto.randomUUID(), event_id: eventId, actor_id: actorId,
        kind, summary, created_at: new Date().toISOString(),
    }, fetchImpl);
}

function visibleEvent(event, membership, isOwner) {
    if (isOwner || membership?.status === 'accepted') return { ...event, access: isOwner ? 'owner' : 'member', membership: publicMember(membership) };
    return {
        id: event.id,
        title: event.title,
        shoot_date: event.shoot_date,
        time: event.time,
        status: event.status,
        location: null,
        access: membership?.status === 'declined' ? 'declined' : 'invited',
        membership: publicMember(membership),
    };
}

async function listEvents(env, user, fetchImpl) {
    const memberRows = await db(env, 'shoot_event_members', 'GET', {
        or: `(user_id.eq.${user.id},invitee_email.eq.${user.email})`,
        select: 'event_id,role,status,invitee_email',
    }, undefined, fetchImpl);
    const memberIds = [...new Set((Array.isArray(memberRows) ? memberRows : []).map(row => row.event_id).filter(Boolean))];
    const filters = { select: '*', order: 'shoot_date.asc,created_at.desc' };
    filters.or = memberIds.length
        ? `(owner_id.eq.${user.id},id.in.(${memberIds.join(',')}))`
        : `owner_id.eq.${user.id}`;
    const events = await db(env, 'shoot_events', 'GET', filters, undefined, fetchImpl);
    const membersByEvent = new Map((Array.isArray(memberRows) ? memberRows : []).map(row => [row.event_id, row]));
    return (Array.isArray(events) ? events : [])
        .filter(event => event.owner_id === user.id || membersByEvent.get(event.id)?.status !== 'declined')
        .map(event => visibleEvent(event, membersByEvent.get(event.id) || null, event.owner_id === user.id));
}

async function createFromSchedule(env, user, body, fetchImpl) {
    const scheduleId = text(body.scheduleId, 120);
    if (!scheduleId) return error(400, 'SCHEDULE_REQUIRED', '请先选择一个已有日程');
    const schedules = await db(env, 'schedules', 'GET', {
        id: `eq.${scheduleId}`, user_id: `eq.${user.id}`,
        select: 'id,user_id,date,title,time,location,description,plan_id', limit: '1',
    }, undefined, fetchImpl);
    const schedule = Array.isArray(schedules) ? schedules[0] : null;
    if (!schedule) return error(404, 'SCHEDULE_NOT_FOUND', '找不到你自己的这个日程');

    const existing = await db(env, 'shoot_events', 'GET', {
        owner_id: `eq.${user.id}`, schedule_id: `eq.${schedule.id}`, select: '*', limit: '1',
    }, undefined, fetchImpl);
    if (Array.isArray(existing) && existing[0]) return { status: 200, body: { event: existing[0], existing: true } };

    let metadata = {};
    try { metadata = schedule.description ? JSON.parse(schedule.description) : {}; } catch { /* legacy descriptions are not plan metadata */ }
    const event = {
        id: crypto.randomUUID(), owner_id: user.id, schedule_id: schedule.id,
        plan_id: schedule.plan_id || metadata.planId || null,
        title: text(schedule.title, 160) || '拍摄协作',
        shoot_date: schedule.date, time: text(schedule.time, 80) || null,
        location: text(schedule.location, 500) || null,
        plan_summary: metadata.planSummary || null,
        status: 'scheduled', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const saved = await db(env, 'shoot_events', 'POST', {}, event, fetchImpl);
    const created = Array.isArray(saved) ? saved[0] : event;
    await activity(env, created.id, user.id, 'event_created', '已从方案日程建立协作空间', fetchImpl);
    return { status: 201, body: { event: { ...created, access: 'owner' }, existing: false } };
}

async function eventAccess(env, eventId, user, fetchImpl) {
    const rows = await db(env, 'shoot_events', 'GET', { id: `eq.${eventId}`, select: '*', limit: '1' }, undefined, fetchImpl);
    const event = Array.isArray(rows) ? rows[0] : null;
    if (!event) return { event: null, owner: false, membership: null };
    const owner = event.owner_id === user.id;
    return { event, owner, membership: owner ? null : await membershipsFor(env, eventId, user, fetchImpl) };
}

async function inviteMember(env, eventId, user, body, fetchImpl) {
    const email = normalizedEmail(body.email);
    const role = body.role;
    if (!EMAIL_RE.test(email)) return error(400, 'INVALID_INVITE_EMAIL', '请输入有效邮箱');
    if (!['model', 'assistant'].includes(role)) return error(400, 'INVALID_MEMBER_ROLE', '成员角色只能是模特或摄影助理');
    if (email === user.email) return error(400, 'CANNOT_INVITE_SELF', '不能邀请自己的账号');
    const access = await eventAccess(env, eventId, user, fetchImpl);
    if (!access.event) return error(404, 'EVENT_NOT_FOUND', '协作空间不存在');
    if (!access.owner) return error(403, 'OWNER_ONLY', '只有方案创建者可以邀请成员');
    const accounts = await db(env, 'users', 'GET', { email: `eq.${email}`, select: 'id,email', limit: '1' }, undefined, fetchImpl);
    const account = Array.isArray(accounts) ? accounts[0] : null;
    if (account?.id === user.id) return error(400, 'CANNOT_INVITE_SELF', '不能邀请自己的账号');
    const rawToken = await makeInviteToken();
    const tokenHash = await hashInviteToken(rawToken);
    const invitedAt = new Date();
    const expiresAt = new Date(invitedAt.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const prior = await db(env, 'shoot_event_members', 'GET', {
        event_id: `eq.${eventId}`, invitee_email: `eq.${email}`, select: '*', limit: '1',
    }, undefined, fetchImpl);
    let member;
    if (Array.isArray(prior) && prior[0]) {
        if (prior[0].status === 'accepted') return error(409, 'MEMBER_ALREADY_ACCEPTED', '该成员已经加入');
        const updated = await db(env, 'shoot_event_members', 'PATCH', { id: `eq.${prior[0].id}` }, {
            user_id: account?.id || null, role, status: 'invited', invited_at: invitedAt.toISOString(),
            expires_at: expiresAt, invite_token_hash: tokenHash, accepted_at: null,
        }, fetchImpl);
        member = Array.isArray(updated) ? updated[0] : prior[0];
    } else {
        const inserted = await db(env, 'shoot_event_members', 'POST', {}, {
            id: crypto.randomUUID(), event_id: eventId, user_id: account?.id || null,
            invitee_email: email, role, status: 'invited', invited_at: invitedAt.toISOString(),
            expires_at: expiresAt, invite_token_hash: tokenHash, accepted_at: null,
        }, fetchImpl);
        member = Array.isArray(inserted) ? inserted[0] : null;
    }
    await activity(env, eventId, user.id, 'member_invited', `已邀请${role === 'model' ? '模特' : '摄影助理'}`, fetchImpl);
    return { status: 201, body: { member: { ...publicMember(member), invitee_email: email }, inviteUrl: `/crew.html?event=${encodeURIComponent(eventId)}&invite=${rawToken}`, delivery: 'manual-link' } };
}

async function respondToInvite(env, eventId, user, accepted, body, fetchImpl) {
    const access = await eventAccess(env, eventId, user, fetchImpl);
    if (!access.event) return error(404, 'EVENT_NOT_FOUND', '协作空间不存在');
    if (access.owner || !access.membership || access.membership.status !== 'invited') return error(403, 'INVITE_NOT_PENDING', '没有等待处理的邀请');
    if (access.membership.invitee_email !== user.email) return error(403, 'INVITE_EMAIL_MISMATCH', '请使用收到邀请的邮箱账号登录');
    if (access.membership.user_id && access.membership.user_id !== user.id) return error(403, 'INVITE_ACCOUNT_MISMATCH', '请使用受邀的账号登录');
    if (!access.membership.expires_at || Date.parse(access.membership.expires_at) <= Date.now()) return error(410, 'INVITE_EXPIRED', '邀请链接已过期，请联系创建者重新邀请');
    const suppliedToken = text(body.token, 64);
    if (!/^[a-f0-9]{64}$/i.test(suppliedToken) || await hashInviteToken(suppliedToken) !== access.membership.invite_token_hash) {
        return error(403, 'INVITE_TOKEN_INVALID', '邀请链接无效，请使用创建者发给你的完整链接');
    }
    const status = accepted ? 'accepted' : 'declined';
    const saved = await db(env, 'shoot_event_members', 'PATCH', { id: `eq.${access.membership.id}` }, {
        user_id: user.id, status, accepted_at: accepted ? new Date().toISOString() : null, invite_token_hash: null,
    }, fetchImpl);
    await activity(env, eventId, user.id, accepted ? 'member_accepted' : 'member_declined', accepted ? '成员已确认加入' : '成员婉拒了邀请', fetchImpl);
    return { status: 200, body: { success: true, membership: publicMember(Array.isArray(saved) ? saved[0] : { ...access.membership, status }) } };
}

async function sendEventMessage(env, eventId, user, body, fetchImpl) {
    const content = text(body.content, 2000);
    if (!content) return error(400, 'MESSAGE_REQUIRED', '请输入消息内容');
    const access = await eventAccess(env, eventId, user, fetchImpl);
    if (!access.event) return error(404, 'EVENT_NOT_FOUND', '协作空间不存在');
    if (!access.owner && access.membership?.status !== 'accepted') return error(403, 'EVENT_MEMBERS_ONLY', '只有已加入的活动成员可以发消息');
    const message = {
        id: crypto.randomUUID(), event_id: eventId, sender_id: user.id,
        body: content, created_at: new Date().toISOString(),
    };
    const saved = await db(env, 'shoot_event_messages', 'POST', {}, message, fetchImpl);
    await activity(env, eventId, user.id, 'message_posted', '活动讨论有新消息', fetchImpl);
    return { status: 201, body: { message: Array.isArray(saved) ? saved[0] : message } };
}

async function updateEventStatus(env, eventId, user, body, fetchImpl) {
    if (!['scheduled', 'completed', 'cancelled'].includes(body.status)) return error(400, 'INVALID_EVENT_STATUS', '无效的拍摄状态');
    const access = await eventAccess(env, eventId, user, fetchImpl);
    if (!access.event) return error(404, 'EVENT_NOT_FOUND', '协作空间不存在');
    if (!access.owner) return error(403, 'OWNER_ONLY', '只有方案创建者可以修改拍摄状态');
    const updated = await db(env, 'shoot_events', 'PATCH', { id: `eq.${eventId}` }, {
        status: body.status, updated_at: new Date().toISOString(),
    }, fetchImpl);
    await activity(env, eventId, user.id, 'status_changed', `拍摄状态更新为 ${body.status}`, fetchImpl);
    return { status: 200, body: { event: Array.isArray(updated) ? updated[0] : { ...access.event, status: body.status } } };
}

export async function handleCrewRequest({ url, method, env, uid, body = {}, fetchImpl = fetch }) {
    if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) return null;
    if (!uid) return error(401, 'LOGIN_REQUIRED', '请先登录账号再使用拍摄协作');
    if (!supabaseRoot(env) || !(env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) {
        return error(503, 'COLLAB_BACKEND_NOT_CONFIGURED', '协作服务尚未配置服务端数据库密钥');
    }
    try {
        const user = await profile(env, uid, fetchImpl);
        if (!user) return error(403, 'ACCOUNT_NOT_FOUND', '当前登录账号不存在');
        const parts = url.pathname.slice(PREFIX.length).split('/').filter(Boolean).map(decodeURIComponent);
        if (parts.length === 1 && parts[0] === 'events' && method === 'GET') {
            return { status: 200, body: { events: await listEvents(env, user, fetchImpl) } };
        }
        if (parts.length === 1 && parts[0] === 'events' && method === 'POST') return await createFromSchedule(env, user, body, fetchImpl);
        if (parts[0] === 'events' && parts.length >= 2) {
            const eventId = parts[1];
            if (!/^[0-9a-f-]{36}$/i.test(eventId)) return error(400, 'INVALID_EVENT_ID');
            const access = await eventAccess(env, eventId, user, fetchImpl);
            if (!access.event) return error(404, 'EVENT_NOT_FOUND', '协作空间不存在');
            if (!access.owner && !access.membership) return error(404, 'EVENT_NOT_FOUND', '协作空间不存在');
            if (parts.length === 2 && method === 'GET') {
                const members = access.owner || access.membership?.status === 'accepted'
                    ? await db(env, 'shoot_event_members', 'GET', { event_id: `eq.${eventId}`, select: 'id,role,status,invitee_email,invited_at,accepted_at', order: 'invited_at.asc' }, undefined, fetchImpl)
                    : [];
                return { status: 200, body: { event: visibleEvent(access.event, access.membership, access.owner), members: members || [] } };
            }
            if (parts[2] === 'members' && method === 'POST') return await inviteMember(env, eventId, user, body, fetchImpl);
            if (parts[2] === 'accept' && method === 'POST') return await respondToInvite(env, eventId, user, true, body, fetchImpl);
            if (parts[2] === 'decline' && method === 'POST') return await respondToInvite(env, eventId, user, false, body, fetchImpl);
            if (parts[2] === 'status' && method === 'PATCH') return await updateEventStatus(env, eventId, user, body, fetchImpl);
            if (parts[2] === 'messages' && method === 'GET') {
                if (!access.owner && access.membership?.status !== 'accepted') return error(403, 'EVENT_MEMBERS_ONLY', '确认加入后才能查看活动讨论');
                const messages = await db(env, 'shoot_event_messages', 'GET', { event_id: `eq.${eventId}`, select: '*', order: 'created_at.asc', limit: '300' }, undefined, fetchImpl);
                return { status: 200, body: { messages: messages || [] } };
            }
            if (parts[2] === 'messages' && method === 'POST') return await sendEventMessage(env, eventId, user, body, fetchImpl);
            if (parts[2] === 'activity' && method === 'GET') {
                if (!access.owner && access.membership?.status !== 'accepted') return error(403, 'EVENT_MEMBERS_ONLY', '确认加入后才能查看活动记录');
                const entries = await db(env, 'shoot_event_activity', 'GET', { event_id: `eq.${eventId}`, select: '*', order: 'created_at.desc', limit: '100' }, undefined, fetchImpl);
                return { status: 200, body: { activity: entries || [] } };
            }
        }
        return error(404, 'NOT_FOUND');
    } catch (err) {
        return error(err.status || 502, err.code || 'COLLAB_REQUEST_FAILED', err.code === 'COLLAB_SCHEMA_NOT_INSTALLED'
            ? '请先应用 supabase/migrations/20261004_crew_hall.sql'
            : err.code === 'COLLAB_BACKEND_NOT_CONFIGURED'
                ? '协作服务尚未配置服务端数据库密钥'
                : '协作请求暂时失败，请稍后重试');
    }
}

export async function updateInquiryStatus({ env, uid, messageId, status, fetchImpl = fetch }) {
    if (!['new', 'pending', 'completed'].includes(status)) return error(400, 'INVALID_INQUIRY_STATUS');
    if (!supabaseRoot(env) || !(env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) return error(503, 'INQUIRY_BACKEND_NOT_CONFIGURED');
    try {
        const updated = await db(env, 'messages', 'PATCH', { id: `eq.${messageId}`, user_id: `eq.${uid}`, select: '*' }, { status }, fetchImpl);
        if (!Array.isArray(updated) || !updated[0]) return error(404, 'INQUIRY_NOT_FOUND', '咨询记录不存在');
        return { status: 200, body: { success: true, message: updated[0] } };
    } catch (err) {
        return error(err.status || 502, err.code || 'INQUIRY_UPDATE_FAILED', '咨询状态保存失败');
    }
}

export async function getCustomerInquiries({ env, uid, fetchImpl = fetch }) {
    try {
        const messages = await db(env, 'messages', 'GET', {
            user_id: `eq.${uid}`,
            select: 'id,name,email,phone,service_type,message,status,created_at',
            order: 'created_at.desc',
        }, undefined, fetchImpl);
        return { status: 200, body: { messages: messages || [] } };
    } catch (err) {
        return error(err.status || 502, err.code || 'INQUIRY_READ_FAILED', '客户咨询读取失败');
    }
}

export async function deleteCustomerInquiry({ env, uid, messageId, fetchImpl = fetch }) {
    try {
        const deleted = await db(env, 'messages', 'DELETE', {
            id: `eq.${messageId}`, user_id: `eq.${uid}`, select: 'id',
        }, undefined, fetchImpl);
        if (!Array.isArray(deleted) || !deleted.length) return error(404, 'INQUIRY_NOT_FOUND', '咨询记录不存在');
        return { status: 200, body: { success: true } };
    } catch (err) {
        return error(err.status || 502, err.code || 'INQUIRY_DELETE_FAILED', '客户咨询删除失败');
    }
}

export async function createPublicInquiry({ env, body, fetchImpl = fetch }) {
    const ownerId = String(env.PUBLIC_INQUIRY_OWNER_ID || '');
    const name = text(body.name, 100);
    const email = normalizedEmail(body.email);
    if (!name || !EMAIL_RE.test(email)) return error(400, 'INVALID_INQUIRY', '请填写姓名和有效邮箱');
    if (!/^[0-9a-f-]{36}$/i.test(ownerId)) return error(503, 'PUBLIC_INQUIRY_OWNER_NOT_CONFIGURED', '网站咨询收件人尚未配置');
    const record = {
        id: crypto.randomUUID(), user_id: ownerId,
        type: 'customer_inquiry', title: name,
        content: text(body.message, 4000), read: false,
        name, email, phone: text(body.phone, 80),
        service_type: text(body.service_type, 120) || '其他', status: 'new',
    };
    try {
        const saved = await db(env, 'messages', 'POST', {}, record, fetchImpl);
        return { status: 201, body: { success: true, message: Array.isArray(saved) ? saved[0] : record } };
    } catch (err) {
        return error(err.status || 502, err.code || 'INQUIRY_CREATE_FAILED', '咨询暂时无法提交，请稍后重试');
    }
}

export async function getUserSchedules({ env, uid, fetchImpl = fetch }) {
    try {
        const rows = await db(env, 'schedules', 'GET', { user_id: `eq.${uid}`, select: '*', order: 'date.asc' }, undefined, fetchImpl);
        const schedules = (Array.isArray(rows) ? rows : []).map(row => {
            let metadata = {};
            try { metadata = row.description ? JSON.parse(row.description) : {}; } catch { /* keep legacy free-text descriptions */ }
            return {
                ...row,
                planId: metadata.planId || row.plan_id || '',
                audience: metadata.audience || ['photographer', 'model', 'assistant'],
                planSummary: metadata.planSummary || null,
            };
        });
        return { status: 200, body: { schedules } };
    } catch (err) {
        return error(err.status || 502, err.code || 'SCHEDULE_READ_FAILED', '日程读取失败');
    }
}

export async function createUserSchedule({ env, uid, body, fetchImpl = fetch }) {
    const id = text(body.id, 120);
    const date = text(body.date, 20);
    const title = text(body.title, 160);
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) return error(400, 'INVALID_SCHEDULE', '日程编号、日期和标题为必填项');
    const metadata = {
        planId: text(body.planId || body.plan_id, 120),
        audience: Array.isArray(body.audience) ? body.audience : ['photographer', 'model', 'assistant'],
        planSummary: body.planSummary || null,
    };
    const record = {
        id, user_id: uid, date, title,
        time: text(body.time, 80) || null,
        location: text(body.location, 500) || null,
        description: JSON.stringify(metadata),
        plan_id: metadata.planId || null,
        status: text(body.status, 40) || 'pending',
    };
    try {
        const rows = await db(env, 'schedules', 'POST', {}, record, fetchImpl);
        return { status: 201, body: { schedule: { ...(Array.isArray(rows) ? rows[0] : record), ...metadata } } };
    } catch (err) {
        return error(err.status || 502, err.code || 'SCHEDULE_CREATE_FAILED', '日程保存失败');
    }
}

export async function updateUserSchedule({ env, uid, scheduleId, body, fetchImpl = fetch }) {
    const id = text(scheduleId, 120);
    const date = text(body.date, 20);
    const title = text(body.title, 160);
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) return error(400, 'INVALID_SCHEDULE', '日程编号、日期和标题为必填项');
    const metadata = {
        planId: text(body.planId || body.plan_id, 120),
        audience: Array.isArray(body.audience) ? body.audience : ['photographer', 'model', 'assistant'],
        planSummary: body.planSummary || null,
    };
    const record = {
        date, title,
        time: text(body.time, 80) || null,
        location: text(body.location, 500) || null,
        description: JSON.stringify(metadata),
        plan_id: metadata.planId || null,
        status: text(body.status, 40) || 'pending',
    };
    try {
        const rows = await db(env, 'schedules', 'PATCH', { id: `eq.${id}`, user_id: `eq.${uid}`, select: '*' }, record, fetchImpl);
        if (!Array.isArray(rows) || !rows[0]) return error(404, 'SCHEDULE_NOT_FOUND', '日程不存在');
        return { status: 200, body: { schedule: { ...rows[0], ...metadata } } };
    } catch (err) {
        return error(err.status || 502, err.code || 'SCHEDULE_UPDATE_FAILED', '日程更新失败');
    }
}

export async function deleteUserSchedule({ env, uid, scheduleId, fetchImpl = fetch }) {
    try {
        const rows = await db(env, 'schedules', 'DELETE', {
            id: `eq.${scheduleId}`, user_id: `eq.${uid}`, select: 'id',
        }, undefined, fetchImpl);
        if (!Array.isArray(rows) || !rows.length) return error(404, 'SCHEDULE_NOT_FOUND', '日程不存在');
        return { status: 200, body: { success: true } };
    } catch (err) {
        return error(err.status || 502, err.code || 'SCHEDULE_DELETE_FAILED', '日程删除失败');
    }
}

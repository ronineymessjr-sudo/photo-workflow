import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import worker from '../api/index.js';
import { createPublicInquiry, createUserSchedule, deleteCustomerInquiry, deleteUserSchedule, getCustomerInquiries, getUserSchedules, handleCrewRequest, updateInquiryStatus, updateUserSchedule } from '../api/crew-collaboration.mjs';
import { createServer } from '../tools/serve-director.mjs';

const photographer = { id: '00000000-0000-4000-8000-000000000001', email: 'photo@example.com' };
const model = { id: '00000000-0000-4000-8000-000000000002', email: 'model@example.com' };
const assistant = { id: '00000000-0000-4000-8000-000000000003', email: 'assistant@example.com' };
const env = { SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_KEY: 'server-only-test-key' };

test('production Worker deployment fails closed without collaboration secrets', async () => {
    const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
    assert.match(workflow, /SUPABASE_SERVICE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_KEY \}\}/);
    assert.match(workflow, /if \[ -z "\$SUPABASE_SERVICE_KEY" \]; then[\s\S]*?exit 1/);
    assert.match(workflow, /if \[ -n "\$PUBLIC_INQUIRY_OWNER_ID" \]; then[\s\S]*?secret put PUBLIC_INQUIRY_OWNER_ID/);
    assert.match(workflow, /curl --fail --silent --show-error https:\/\/photoatelier-api\.photomagic\.workers\.dev\/api\/health/);
});

test('collaboration migration uses the existing UUID schedule key type', async () => {
    const migration = await readFile(new URL('../supabase/migrations/20261004_crew_hall.sql', import.meta.url), 'utf8');
    assert.match(migration, /schedule_id uuid references public\.schedules\(id\) on delete set null/);
});

function fakeDatabase(seed = {}) {
    const tables = {
        users: [photographer, model, assistant],
        schedules: [{ id: 'schedule-1', user_id: photographer.id, date: '2026-10-20', title: '雨夜人像', time: '18:30', location: '棚内地址', description: JSON.stringify({ planId: 'plan-1', planSummary: { title: '雨夜分镜', theme: '雨夜街拍' } }), plan_id: 'plan-1' }],
        shoot_events: [], shoot_event_members: [], shoot_event_messages: [], shoot_event_activity: [],
        messages: [{ id: 'lead-1', user_id: photographer.id, status: 'new' }],
        ...seed,
    };
    const fetchImpl = async (rawUrl, options = {}) => {
        const url = new URL(rawUrl);
        const table = url.pathname.split('/').pop();
        const rows = tables[table];
        if (!rows) return Response.json({ code: '42P01' }, { status: 404 });
        const method = options.method || 'GET';
        const filters = [...url.searchParams.entries()].filter(([key]) => !['select', 'order', 'limit'].includes(key));
        const matches = row => filters.every(([key, value]) => {
            if (key === 'or') return value.slice(1, -1).split(',').some(part => {
                const inMatch = part.match(/^([\w]+)\.in\.\((.*)\)$/);
                if (inMatch) return inMatch[2].split(',').includes(String(row[inMatch[1]]));
                const eqMatch = part.match(/^([\w]+)\.eq\.(.*)$/);
                return Boolean(eqMatch && String(row[eqMatch[1]]) === eqMatch[2]);
            });
            if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
            return true;
        });
        if (method === 'GET') {
            let found = rows.filter(matches);
            const limit = Number(url.searchParams.get('limit'));
            if (limit) found = found.slice(0, limit);
            return Response.json(found);
        }
        if (method === 'POST') {
            const row = JSON.parse(options.body);
            rows.push(row);
            return Response.json([row], { status: 201 });
        }
        if (method === 'PATCH') {
            const update = JSON.parse(options.body);
            const changed = rows.filter(matches).map(row => Object.assign(row, update));
            return Response.json(changed);
        }
        if (method === 'DELETE') {
            const deleted = rows.filter(matches);
            tables[table] = rows.filter(row => !matches(row));
            return Response.json(deleted);
        }
        return Response.json({ code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    };
    return { tables, fetchImpl };
}

async function call(fetchImpl, uid, path, method = 'GET', body) {
    return handleCrewRequest({ url: new URL(`https://app.example${path}`), method, env, uid, body, fetchImpl });
}

test('the collaboration API requires a real account and server database secret', async () => {
    const preflight = await worker.fetch(new Request('https://api.example/api/messages/lead-1', { method: 'OPTIONS' }), {});
    assert.match(preflight.headers.get('Access-Control-Allow-Methods'), /PATCH/);
    const result = await handleCrewRequest({ url: new URL('https://app.example/api/collab/events'), method: 'GET', env, uid: null });
    assert.equal(result.status, 401);
    const unconfigured = await handleCrewRequest({ url: new URL('https://app.example/api/collab/events'), method: 'GET', env: {}, uid: photographer.id });
    assert.equal(unconfigured.status, 503);
    const response = await worker.fetch(new Request('https://api.example/api/collab/events'), {});
    assert.equal(response.status, 401);

    const secret = 'test-jwt-secret';
    const payload = JSON.stringify({ uid: photographer.id, t: Date.now() });
    const signature = createHmac('sha256', secret).update(payload).digest('hex');
    const token = Buffer.from(JSON.stringify({ p: payload, s: signature })).toString('base64url');
    const configuredIdentity = await worker.fetch(new Request('https://api.example/api/collab/events', {
        headers: { Authorization: `Bearer ${token}` },
    }), { JWT_SECRET: secret });
    assert.equal(configuredIdentity.status, 503);
    assert.equal((await configuredIdentity.json()).error, 'COLLAB_BACKEND_NOT_CONFIGURED');
});

test('loopback preview serves the collaboration page without exposing private repository files', async t => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    const page = await fetch(`${base}/crew.html`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /PRIVATE SHOOT SPACE/);
    assert.equal((await fetch(`${base}/assets/crew-hall.js`)).status, 200);
    assert.equal((await fetch(`${base}/supabase/migrations/20261004_crew_hall.sql`)).status, 404);
});

test('an owner can create one private collaboration space from only their own schedule', async () => {
    const { tables, fetchImpl } = fakeDatabase();
    const first = await call(fetchImpl, photographer.id, '/api/collab/events', 'POST', { scheduleId: 'schedule-1' });
    assert.equal(first.status, 201);
    assert.equal(first.body.event.plan_id, 'plan-1');
    assert.deepEqual(first.body.event.plan_summary, { title: '雨夜分镜', theme: '雨夜街拍' });
    assert.equal(first.body.event.location, '棚内地址');
    const second = await call(fetchImpl, photographer.id, '/api/collab/events', 'POST', { scheduleId: 'schedule-1' });
    assert.equal(second.status, 200);
    assert.equal(second.body.existing, true);
    assert.equal(tables.shoot_events.length, 1);
    const otherOwnersSchedule = await call(fetchImpl, model.id, '/api/collab/events', 'POST', { scheduleId: 'schedule-1' });
    assert.equal(otherOwnersSchedule.status, 404);
});

test('pending invite hides exact location and cannot read or post activity messages', async () => {
    const { tables, fetchImpl } = fakeDatabase();
    const created = await call(fetchImpl, photographer.id, '/api/collab/events', 'POST', { scheduleId: 'schedule-1' });
    const eventId = created.body.event.id;
    const invite = await call(fetchImpl, photographer.id, `/api/collab/events/${eventId}/members`, 'POST', { email: model.email, role: 'model' });
    assert.equal(invite.status, 201);
    assert.equal(invite.body.delivery, 'manual-link');
    assert.match(invite.body.inviteUrl, new RegExp(eventId));
    const inviteToken = new URL(invite.body.inviteUrl, 'https://app.example').searchParams.get('invite');
    assert.match(inviteToken, /^[a-f0-9]{64}$/);
    assert.equal('invite_token_hash' in invite.body.member, false);

    const pending = await call(fetchImpl, model.id, `/api/collab/events/${eventId}`);
    assert.equal(pending.status, 200);
    assert.equal(pending.body.event.location, null);
    assert.equal(pending.body.event.membership.status, 'invited');
    assert.equal('invite_token_hash' in pending.body.event.membership, false);
    assert.equal((await call(fetchImpl, model.id, `/api/collab/events/${eventId}/messages`)).status, 403);
    assert.equal((await call(fetchImpl, model.id, `/api/collab/events/${eventId}/messages`, 'POST', { content: '到了' })).status, 403);

    const mismatchedEmail = await call(fetchImpl, assistant.id, `/api/collab/events/${eventId}/accept`, 'POST', {});
    assert.equal(mismatchedEmail.status, 404);
    const missingToken = await call(fetchImpl, model.id, `/api/collab/events/${eventId}/accept`, 'POST', {});
    assert.equal(missingToken.status, 403, JSON.stringify(missingToken.body));
    const wrongToken = await call(fetchImpl, model.id, `/api/collab/events/${eventId}/accept`, 'POST', { token: '0'.repeat(64) });
    assert.equal(wrongToken.status, 403, JSON.stringify(wrongToken.body));
    const accepted = await call(fetchImpl, model.id, `/api/collab/events/${eventId}/accept`, 'POST', { token: inviteToken });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.membership.status, 'accepted');
    const joined = await call(fetchImpl, model.id, `/api/collab/events/${eventId}`);
    assert.equal(joined.body.event.location, '棚内地址');
    assert.equal(tables.shoot_event_activity.some(item => item.kind === 'member_accepted'), true);
});

test('accepted members and the owner share event chat while unrelated accounts remain isolated', async () => {
    const { tables, fetchImpl } = fakeDatabase();
    const created = await call(fetchImpl, photographer.id, '/api/collab/events', 'POST', { scheduleId: 'schedule-1' });
    const eventId = created.body.event.id;
    const invite = await call(fetchImpl, photographer.id, `/api/collab/events/${eventId}/members`, 'POST', { email: model.email, role: 'model' });
    const inviteToken = new URL(invite.body.inviteUrl, 'https://app.example').searchParams.get('invite');
    await call(fetchImpl, model.id, `/api/collab/events/${eventId}/accept`, 'POST', { token: inviteToken });

    const sent = await call(fetchImpl, model.id, `/api/collab/events/${eventId}/messages`, 'POST', { content: '我会提前二十分钟到。' });
    assert.equal(sent.status, 201);
    const ownerMessages = await call(fetchImpl, photographer.id, `/api/collab/events/${eventId}/messages`);
    assert.equal(ownerMessages.body.messages.length, 1);
    assert.equal(ownerMessages.body.messages[0].body, '我会提前二十分钟到。');
    assert.equal((await call(fetchImpl, assistant.id, `/api/collab/events/${eventId}/messages`)).status, 404);
    assert.equal(tables.shoot_event_activity.some(item => item.kind === 'message_posted'), true);
});

test('only the event owner can change status and contact inquiry PATCH is owner-scoped', async () => {
    const { tables, fetchImpl } = fakeDatabase();
    const created = await call(fetchImpl, photographer.id, '/api/collab/events', 'POST', { scheduleId: 'schedule-1' });
    const eventId = created.body.event.id;
    assert.equal((await call(fetchImpl, model.id, `/api/collab/events/${eventId}/status`, 'PATCH', { status: 'completed' })).status, 404);
    const changed = await call(fetchImpl, photographer.id, `/api/collab/events/${eventId}/status`, 'PATCH', { status: 'completed' });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.event.status, 'completed');
    assert.equal(tables.shoot_event_activity.some(item => item.kind === 'status_changed'), true);

    const update = await updateInquiryStatus({ env, uid: photographer.id, messageId: 'lead-1', status: 'pending', fetchImpl });
    assert.equal(update.status, 200);
    assert.equal(tables.messages[0].status, 'pending');
    const foreign = await updateInquiryStatus({ env, uid: model.id, messageId: 'lead-1', status: 'completed', fetchImpl });
    assert.equal(foreign.status, 404);
    assert.equal(tables.messages[0].status, 'pending');
});

test('public customer inquiries are assigned to a configured owner and use private owner-scoped reads', async () => {
    const { tables, fetchImpl } = fakeDatabase();
    const unconfigured = await createPublicInquiry({ env, body: { name: '李女士', email: 'li@example.com' }, fetchImpl });
    assert.equal(unconfigured.status, 503);
    const publicEnv = { ...env, PUBLIC_INQUIRY_OWNER_ID: photographer.id };
    const created = await createPublicInquiry({
        env: publicEnv, fetchImpl,
        body: { name: '李女士', email: 'LI@example.com', phone: '123', service_type: '写真', message: '想预约周末拍摄' },
    });
    assert.equal(created.status, 201);
    const saved = tables.messages.find(item => item.email === 'li@example.com');
    assert.equal(saved.user_id, photographer.id);
    assert.notEqual(saved.user_id, '00000000-0000-0000-0000-000000000000');
    const inbox = await getCustomerInquiries({ env: publicEnv, uid: photographer.id, fetchImpl });
    assert.equal(inbox.status, 200);
    assert.equal(inbox.body.messages.some(item => item.email === 'li@example.com'), true);
    const wrongOwner = await deleteCustomerInquiry({ env: publicEnv, uid: model.id, messageId: saved.id, fetchImpl });
    assert.equal(wrongOwner.status, 404);
    assert.equal(tables.messages.includes(saved), true);
});

test('schedule CRUD uses the server-side account scope and keeps plan linkage for the collaboration handoff', async () => {
    const { tables, fetchImpl } = fakeDatabase();
    const owned = await getUserSchedules({ env, uid: photographer.id, fetchImpl });
    assert.equal(owned.body.schedules[0].planId, 'plan-1');
    assert.deepEqual(owned.body.schedules[0].planSummary, { title: '雨夜分镜', theme: '雨夜街拍' });
    assert.equal((await getUserSchedules({ env, uid: model.id, fetchImpl })).body.schedules.length, 0);

    const created = await createUserSchedule({
        env, uid: photographer.id, fetchImpl,
        body: { id: 'schedule-2', date: '2026-10-23', title: '棚拍', planId: 'plan-2', audience: ['model'] },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.schedule.plan_id, 'plan-2');
    assert.equal(tables.schedules.find(item => item.id === 'schedule-2').user_id, photographer.id);
    assert.equal((await deleteUserSchedule({ env, uid: model.id, scheduleId: 'schedule-2', fetchImpl })).status, 404);
    assert.equal((await deleteUserSchedule({ env, uid: photographer.id, scheduleId: 'schedule-2', fetchImpl })).status, 200);
});

test('schedule updates are scoped to owner and preserve collaboration metadata', async () => {
    let request;
    const result = await updateUserSchedule({
        env, uid: photographer.id, scheduleId: 'schedule-1',
        body: { date: '2026-10-05', title: '更新后的拍摄', time: '14:00', location: '影棚B', planId: 'plan-2', audience: ['model'], planSummary: { theme: '人像' }, status: 'pending' },
        fetchImpl: async (url, options) => {
            request = { url: new URL(url), options };
            return Response.json([{ id: 'schedule-1', user_id: photographer.id, date: '2026-10-05', title: '更新后的拍摄', ...JSON.parse(options.body) }]);
        },
    });
    assert.equal(result.status, 200);
    assert.equal(request.options.method, 'PATCH');
    assert.equal(request.url.searchParams.get('user_id'), `eq.${photographer.id}`);
    assert.equal(result.body.schedule.planId, 'plan-2');
    assert.deepEqual(result.body.schedule.audience, ['model']);
    assert.deepEqual(JSON.parse(request.options.body).description, JSON.stringify({ planId: 'plan-2', audience: ['model'], planSummary: { theme: '人像' } }));
});

test('authenticated Worker PATCH route delegates schedule updates to the scoped service', async () => {
    const secret = 'schedule-route-test-secret';
    const payload = JSON.stringify({ uid: photographer.id, t: Date.now() });
    const signature = createHmac('sha256', secret).update(payload).digest('hex');
    const token = Buffer.from(JSON.stringify({ p: payload, s: signature })).toString('base64url');
    const originalFetch = globalThis.fetch;
    let request;
    globalThis.fetch = async (url, options) => {
        request = { url: new URL(url), options };
        return Response.json([{ id: 'schedule-1', user_id: photographer.id, date: '2026-10-05', title: 'Worker 路由更新' }]);
    };
    try {
        const response = await worker.fetch(new Request('https://api.example/api/schedules/schedule-1', {
            method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: '2026-10-05', title: 'Worker 路由更新', audience: ['model'] }),
        }), { JWT_SECRET: secret, SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_KEY: 'test-service-key' });
        assert.equal(response.status, 200);
        assert.equal(request.options.method, 'PATCH');
        assert.equal(request.url.searchParams.get('user_id'), `eq.${photographer.id}`);
        assert.equal((await response.json()).schedule.title, 'Worker 路由更新');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

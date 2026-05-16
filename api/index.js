// Photo Workflow Backend API - Vercel Serverless
// 零依赖，纯 fetch 调 Supabase REST + 飞书 API

const SUPABASE_URL = 'https://woywgfoqurumrkyoznnb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndveXdnZm9xdXJ1bXJreW96bm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTMxMjEsImV4cCI6MjA5NDQ2OTEyMX0.RQrLvKLrDQKayT_Sreel2uSx99SelrZJqr5f76bucDE';
const FEISHU_APP_ID = 'cli_a90a10b74af85bd9';
const FEISHU_APP_SECRET = 'k626pzEQO2adxuhZhty2If81t0BwIdzr';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
};

// ===== Supabase REST Helper =====
function sb(table) {
  const base = `${SUPABASE_URL}/rest/v1/${table}`;
  return {
    select: (query = '') => fetch(`${base}?select=${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    }).then(r => r.json()),
    insert: (data) => fetch(base, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    update: (id, data) => fetch(`${base}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    delete: (id) => fetch(`${base}?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    }).then(r => r.json()),
    query: (url) => fetch(`${SUPABASE_URL}/rest/v1/${url}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    }).then(r => r.json())
  };
}

// ===== Feishu Helper =====
let feishuTokenCache = { token: null, expires: 0 };

async function getFeishuToken() {
  if (feishuTokenCache.token && Date.now() < feishuTokenCache.expires) {
    return feishuTokenCache.token;
  }
  const r = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
  });
  const d = await r.json();
  if (d.code !== 0) throw new Error('飞书认证失败: ' + d.msg);
  feishuTokenCache = { token: d.tenant_access_token, expires: Date.now() + (d.expire - 60) * 1000 };
  return feishuTokenCache.token;
}

async function feishuApi(path, method, body) {
  const token = await getFeishuToken();
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`https://open.feishu.cn${path}`, opts).then(r => r.json());
}

// ===== Auth =====
function genToken(userId) {
  return Buffer.from(JSON.stringify({ uid: userId, t: Date.now() })).toString('base64url');
}

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(Buffer.from(authHeader.slice(7), 'base64url').toString());
    // Token 有效期 7 天
    if (Date.now() - payload.t > 7 * 24 * 3600 * 1000) return null;
    return payload.uid;
  } catch { return null; }
}

// ===== Route Handlers =====

// POST /api/auth/login
async function handleLogin(req, res) {
  const { email, password } = await body(req);
  if (!email || !password) return json(res, 400, { error: '请输入邮箱和密码' });

  // 查找用户
  const { data: users } = await sb('users').query(`users?email=eq.${encodeURIComponent(email)}&select=*`);
  if (users && users.length > 0) {
    if (users[0].password_hash !== password) return json(res, 401, { error: '密码错误' });
    return json(res, 200, { success: true, user: { id: users[0].id, email: users[0].email }, token: genToken(users[0].id) });
  }

  // 注册新用户
  const { data: newUser, error } = await sb('users').insert({ email, password_hash: password });
  if (error) return json(res, 500, { error: '注册失败: ' + (error.message || JSON.stringify(error)) });

  return json(res, 201, { success: true, user: { id: newUser[0].id, email: newUser[0].email }, token: genToken(newUser[0].id) });
}

// GET /api/schedules
async function handleGetSchedules(req, res) {
  const uid = verifyToken(req.headers.authorization);
  if (!uid) return json(res, 401, { error: '未登录' });
  const { data } = await sb('schedules').query(`schedules?user_id=eq.${uid}&select=*&order=date.asc`);
  return json(res, 200, { schedules: data || [] });
}

// POST /api/schedules
async function handleCreateSchedule(req, res) {
  const uid = verifyToken(req.headers.authorization);
  if (!uid) return json(res, 401, { error: '未登录' });
  const bodyData = await body(req);
  const { data, error } = await sb('schedules').insert({ ...bodyData, user_id: uid });
  if (error) return json(res, 500, { error: error.message });
  return json(res, 201, { schedule: data[0] });
}

// DELETE /api/schedules/:id
async function handleDeleteSchedule(req, res, id) {
  const uid = verifyToken(req.headers.authorization);
  if (!uid) return json(res, 401, { error: '未登录' });
  await sb('schedules').delete(id);
  return json(res, 200, { success: true });
}

// GET /api/plans
async function handleGetPlans(req, res) {
  const uid = verifyToken(req.headers.authorization);
  if (!uid) return json(res, 401, { error: '未登录' });
  const { data } = await sb('plans').query(`plans?user_id=eq.${uid}&select=*&order=created_at.desc`);
  return json(res, 200, { plans: data || [] });
}

// POST /api/plans
async function handleCreatePlan(req, res) {
  const uid = verifyToken(req.headers.authorization);
  if (!uid) return json(res, 401, { error: '未登录' });
  const bodyData = await body(req);
  const { data, error } = await sb('plans').insert({ ...bodyData, user_id: uid });
  if (error) return json(res, 500, { error: error.message });
  return json(res, 201, { plan: data[0] });
}

// POST /api/feishu/sync-calendar - 同步日程到飞书日历
async function handleFeishuCalendarSync(req, res) {
  const uid = verifyToken(req.headers.authorization);
  if (!uid) return json(res, 401, { error: '未登录' });

  const { schedules } = await body(req);
  if (!schedules || !schedules.length) return json(res, 400, { error: '没有日程数据' });

  const results = [];
  for (const s of schedules) {
    const startTime = s.time ? new Date(`${s.date}T${s.time}`) : new Date(`${s.date}T09:00:00`);
    const endTime = new Date(startTime.getTime() + 2 * 3600 * 1000);

    const r = await feishuApi('/open-apis/calendar/v4/calendars/primary/events', 'POST', {
      summary: s.title,
      description: `拍摄日程: ${s.title}`,
      start_time: { timestamp: Math.floor(startTime.getTime() / 1000) },
      end_time: { timestamp: Math.floor(endTime.getTime() / 1000) },
      location: s.location || '',
      reminders: [{ minutes: 60 }]
    });

    results.push({ title: s.title, success: r.code === 0, event_id: r.data?.event_id, error: r.msg });
  }

  const synced = results.filter(r => r.success).length;
  return json(res, 200, { success: true, synced, total: results.length, results });
}

// POST /api/feishu/bitable - 写入飞书多维表格
async function handleFeishuBitable(req, res) {
  const uid = verifyToken(req.headers.authorization);
  if (!uid) return json(res, 401, { error: '未登录' });

  const { app_token, table_id, records } = await body(req);
  if (!app_token || !table_id || !records) return json(res, 400, { error: '缺少 app_token, table_id 或 records' });

  const results = [];
  for (const record of records) {
    const r = await feishuApi(`/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records`, 'POST', {
      fields: record
    });
    results.push({ success: r.code === 0, record_id: r.data?.record_id, error: r.msg });
  }

  const synced = results.filter(r => r.success).length;
  return json(res, 200, { success: true, synced, total: results.length, results });
}

// POST /api/feishu/token - 获取飞书token（测试用）
async function handleFeishuToken(req, res) {
  try {
    const token = await getFeishuToken();
    return json(res, 200, { success: true, token: token.substring(0, 10) + '...' });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}

// ===== Helpers =====
function body(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve({}); } });
  });
}

function json(res, status, data) {
  res.writeHead(status, CORS);
  res.end(JSON.stringify(data));
}

// ===== Main Router =====
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(200, CORS); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  try {
    // Auth
    if (path === '/api/auth/login' && method === 'POST') return handleLogin(req, res);

    // Schedules
    if (path === '/api/schedules' && method === 'GET') return handleGetSchedules(req, res);
    if (path === '/api/schedules' && method === 'POST') return handleCreateSchedule(req, res);
    if (path.startsWith('/api/schedules/') && method === 'DELETE') {
      const id = path.split('/').pop();
      return handleDeleteSchedule(req, res, id);
    }

    // Plans
    if (path === '/api/plans' && method === 'GET') return handleGetPlans(req, res);
    if (path === '/api/plans' && method === 'POST') return handleCreatePlan(req, res);

    // Feishu
    if (path === '/api/feishu/sync-calendar' && method === 'POST') return handleFeishuCalendarSync(req, res);
    if (path === '/api/feishu/bitable' && method === 'POST') return handleFeishuBitable(req, res);
    if (path === '/api/feishu/token' && method === 'GET') return handleFeishuToken(req, res);

    // Health
    if (path === '/api/health') return json(res, 200, { status: 'ok', time: new Date().toISOString() });

    json(res, 404, { error: 'Not Found: ' + path });
  } catch (e) {
    console.error('API Error:', e);
    json(res, 500, { error: e.message });
  }
};

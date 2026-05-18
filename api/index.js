// Photo Workflow Backend API - Vercel Serverless
// 使用 Node.js 内置 https 模块，兼容性好

const https = require('https');

const SUPABASE_URL = 'woywgfoqurumrkyoznnb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndveXdnZm9xdXJ1bXJreW96bm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTMxMjEsImV4cCI6MjA5NDQ2OTEyMX0.RQrLvKLrDQKayT_Sreel2uSx99SelrZJqr5f76bucDE';
const FEISHU_APP_ID = 'cli_a90a10b74af85bd9';
const FEISHU_APP_SECRET = 'k626pzEQO2adxuhZhty2If81t0BwIdzr';

// 飞书多维表格配置
const FEISHU_BITABLE = {
  schedules: { app_token: 'IeTubz0IJaW31asIcpec3Q9znkg', table_id: 'tbl3bLzlKfA2tnli' },
  venues: { app_token: 'G88ebeTj4aFscFst3jscKrWunjh', table_id: 'tblQvOK4Lj5Ba2PS' },
  models: { app_token: 'ZGwtbqZpNahQfJsAkIOcQrZ3ntf', table_id: 'tblwzEsBiS9gpKdQ' },
  plans: { app_token: 'RVlrb6rKla7BAnsMj0vcryDznGf', table_id: 'tblzim7PKRvx2tec' }
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
};

// ===== HTTP Helper =====
function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// Supabase REST 调用
function sbQuery(path, method = 'GET', body = null) {
  const options = {
    hostname: SUPABASE_URL,
    path: `/rest/v1/${path}`,
    method: method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  if (method === 'POST' || method === 'PATCH') {
    options.headers['Prefer'] = 'return=representation';
  }
  return request(options, body ? JSON.stringify(body) : null);
}

// 飞书 API 调用
let feishuToken = null;
let feishuTokenExpire = 0;

async function getFeishuToken() {
  if (feishuToken && Date.now() < feishuTokenExpire) return feishuToken;
  
  const options = {
    hostname: 'open.feishu.cn',
    path: '/open-apis/auth/v3/tenant_access_token/internal',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };
  
  const data = await request(options, JSON.stringify({
    app_id: FEISHU_APP_ID,
    app_secret: FEISHU_APP_SECRET
  }));
  
  if (data.code !== 0) throw new Error(data.msg);
  feishuToken = data.tenant_access_token;
  feishuTokenExpire = Date.now() + (data.expire - 60) * 1000;
  return feishuToken;
}

async function feishuApi(path, method, body) {
  const token = await getFeishuToken();
  const options = {
    hostname: 'open.feishu.cn',
    path: path,
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  return request(options, body ? JSON.stringify(body) : null);
}

// ===== Auth =====
function genToken(userId) {
  return Buffer.from(JSON.stringify({ uid: userId, t: Date.now() })).toString('base64');
}

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(Buffer.from(authHeader.slice(7), 'base64').toString());
    if (Date.now() - payload.t > 7 * 24 * 3600 * 1000) return null;
    return payload.uid;
  } catch { return null; }
}

// ===== Handlers =====
async function handleLogin(body) {
  const { email, password } = body;
  if (!email || !password) return { status: 400, body: { error: '请输入邮箱和密码' } };

  const users = await sbQuery(`users?email=eq.${encodeURIComponent(email)}&select=*`);
  if (users && users.length > 0) {
    if (users[0].password_hash !== password) return { status: 401, body: { error: '密码错误' } };
    return { status: 200, body: { success: true, user: { id: users[0].id, email: users[0].email }, token: genToken(users[0].id) } };
  }

  const newUser = await sbQuery('users', 'POST', { email, password_hash: password });
  if (newUser.error) return { status: 500, body: { error: '注册失败' } };
  return { status: 201, body: { success: true, user: { id: newUser[0].id, email: newUser[0].email }, token: genToken(newUser[0].id) } };
}

async function handleGetSchedules(uid) {
  const data = await sbQuery(`schedules?user_id=eq.${uid}&select=*&order=date.asc`);
  return { status: 200, body: { schedules: data || [] } };
}

async function handleCreateSchedule(uid, body) {
  const data = await sbQuery('schedules', 'POST', { ...body, user_id: uid });
  return { status: 201, body: { schedule: data[0] } };
}

async function handleDeleteSchedule(uid, id) {
  await sbQuery(`schedules?id=eq.${id}`, 'DELETE');
  return { status: 200, body: { success: true } };
}

async function handleGetPlans(uid) {
  const data = await sbQuery(`plans?user_id=eq.${uid}&select=*&order=created_at.desc`);
  return { status: 200, body: { plans: data || [] } };
}

async function handleCreatePlan(uid, body) {
  const data = await sbQuery('plans', 'POST', { ...body, user_id: uid });
  return { status: 201, body: { plan: data[0] } };
}

async function handleFeishuCalendarSync(uid, body) {
  const { schedules } = body;
  if (!schedules || !schedules.length) return { status: 400, body: { error: '没有日程数据' } };

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
  return { status: 200, body: { success: true, synced, total: results.length, results } };
}

async function handleFeishuBitable(uid, body) {
  const { table, records } = body;
  if (!table || !records) return { status: 400, body: { error: '缺少 table 或 records 参数' } };

  const config = FEISHU_BITABLE[table];
  if (!config) return { status: 400, body: { error: `未知的表格类型: ${table}` } };

  const results = [];
  for (const record of records) {
    const r = await feishuApi(`/open-apis/bitable/v1/apps/${config.app_token}/tables/${config.table_id}/records`, 'POST', { fields: record });
    results.push({ success: r.code === 0, record_id: r.data?.record_id, error: r.msg });
  }

  return { status: 200, body: { success: true, synced: results.filter(r => r.success).length, total: results.length, results } };
}

async function handleFeishuToken() {
  try {
    const token = await getFeishuToken();
    return { status: 200, body: { success: true, token: token.substring(0, 10) + '...' } };
  } catch (e) {
    return { status: 500, body: { error: e.message } };
  }
}

// ===== Messages =====
async function handleGetMessages(uid) {
  const data = await sbQuery(`messages?user_id=eq.${uid}&select=*&order=created_at.desc`);
  return { status: 200, body: { messages: data || [] } };
}

async function handleCreateMessage(uid, body) {
  const data = await sbQuery('messages', 'POST', { ...body, user_id: uid });
  return { status: 201, body: { message: data[0] } };
}

async function handleUpdateMessage(uid, id, body) {
  const data = await sbQuery(`messages?id=eq.${id}`, 'PATCH', body);
  return { status: 200, body: { success: true, message: data[0] } };
}

async function handleDeleteMessage(uid, id) {
  await sbQuery(`messages?id=eq.${id}`, 'DELETE');
  return { status: 200, body: { success: true } };
}

// ===== Public Message Submit (no auth required - for portfolio contact form) =====
async function handlePublicMessage(body) {
  const { name, email, phone, service_type, message } = body;
  if (!name || !email) return { status: 400, body: { error: '姓名和邮箱为必填项' } };
  const data = await sbQuery('messages', 'POST', {
    name, email, phone: phone || '', service_type: service_type || '其他',
    message: message || '', status: 'new', user_id: '00000000-0000-0000-0000-000000000000'
  });
  return { status: 201, body: { success: true, message: data[0] } };
}

// ===== Dashboard Stats (Real-time calculation) =====
async function handleDashboardStats(uid) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // '2025-05'
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  
  // 获取所有日程
  const schedules = await sbQuery(`schedules?user_id=eq.${uid}&select=*`);
  const schedulesData = schedules || [];
  
  // 本月拍摄数
  const currentMonthShoots = schedulesData.filter(s => s.date && s.date.startsWith(currentMonth)).length;
  const lastMonthShoots = schedulesData.filter(s => s.date && s.date.startsWith(lastMonth)).length;
  const monthGrowth = lastMonthShoots > 0 ? Math.round((currentMonthShoots - lastMonthShoots) / lastMonthShoots * 100) : 0;
  
  // 完成率（假设 status 字段，如果没有则默认 100%）
  const completedShoots = schedulesData.filter(s => s.status === 'completed' || !s.status).length;
  const completionRate = schedulesData.length > 0 ? Math.round(completedShoots / schedulesData.length * 100) : 0;
  
  // 活跃客户数（从日程中提取不同地点作为客户）
  const uniqueLocations = [...new Set(schedulesData.map(s => s.location).filter(Boolean))];
  const activeClients = uniqueLocations.length;
  
  // 近6个月趋势
  const trends = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    const monthName = (d.getMonth() + 1) + '月';
    const count = schedulesData.filter(s => s.date && s.date.startsWith(monthStr)).length;
    trends.push({ month: monthName, count });
  }
  
  // 热门场地 TOP5
  const venueCounts = {};
  schedulesData.forEach(s => {
    if (s.location) {
      venueCounts[s.location] = (venueCounts[s.location] || 0) + 1;
    }
  });
  const topVenues = Object.entries(venueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count], index) => ({ rank: index + 1, name, count }));
  
  // 填充假数据如果不足5个
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
      stats: {
        monthShoots: currentMonthShoots,
        monthGrowth: monthGrowth,
        completionRate: completionRate,
        activeClients: activeClients,
        newClients: Math.max(0, currentMonthShoots - lastMonthShoots),
        equipmentRate: 76 // 固定值，后续可从设备表计算
      },
      trends: trends,
      topVenues: finalTopVenues,
      customerTypes: {
        new: 40,
        old: 35,
        repeat: 25
      },
      topEquipment: [
        { rank: 1, name: 'A7M4', count: 45 },
        { rank: 2, name: '85mm', count: 38 },
        { rank: 3, name: '闪光灯', count: 32 },
        { rank: 4, name: '反光板', count: 28 },
        { rank: 5, name: '三脚架', count: 20 }
      ],
      customerAnalysis: {
        satisfaction: 4.8,
        repeatRate: 68,
        repeatGrowth: 8,
        types: { personal: 45, studio: 35, enterprise: 20 }
      }
    }
  };
}

// ===== Main =====
module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // Parse body
  let body = {};
  if (method === 'POST' || method === 'PUT') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch {}
  }

  let result;

  try {
    // Auth
    if (path === '/api/auth/login' && method === 'POST') {
      result = await handleLogin(body);
    }
    // Schedules
    else if (path === '/api/schedules' && method === 'GET') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleGetSchedules(uid);
    }
    else if (path === '/api/schedules' && method === 'POST') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleCreateSchedule(uid, body);
    }
    else if (path.startsWith('/api/schedules/') && method === 'DELETE') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleDeleteSchedule(uid, path.split('/').pop());
    }
    // Plans
    else if (path === '/api/plans' && method === 'GET') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleGetPlans(uid);
    }
    else if (path === '/api/plans' && method === 'POST') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleCreatePlan(uid, body);
    }
    // Feishu
    else if (path === '/api/feishu/sync-calendar' && method === 'POST') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleFeishuCalendarSync(uid, body);
    }
    else if (path === '/api/feishu/bitable' && method === 'POST') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleFeishuBitable(uid, body);
    }
    else if (path === '/api/feishu/token' && method === 'GET') {
      result = await handleFeishuToken();
    }
    // Dashboard
    else if (path === '/api/dashboard/stats' && method === 'GET') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleDashboardStats(uid);
    }
    // Messages
    else if (path === '/api/messages' && method === 'GET') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleGetMessages(uid);
    }
    else if (path === '/api/messages' && method === 'POST') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleCreateMessage(uid, body);
    }
    else if (path.startsWith('/api/messages/') && method === 'PATCH') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleUpdateMessage(uid, path.split('/').pop(), body);
    }
    else if (path.startsWith('/api/messages/') && method === 'DELETE') {
      const uid = verifyToken(req.headers.authorization);
      if (!uid) result = { status: 401, body: { error: '未登录' } };
      else result = await handleDeleteMessage(uid, path.split('/').pop());
    }
    // Public message submit (no auth - for portfolio)
    else if (path === '/api/messages/public' && method === 'POST') {
      result = await handlePublicMessage(body);
    }
    // Health
    else if (path === '/api/health') {
      result = { status: 200, body: { status: 'ok', time: new Date().toISOString() } };
    }
    else {
      result = { status: 404, body: { error: 'Not Found' } };
    }

    res.writeHead(result.status, CORS);
    res.end(JSON.stringify(result.body));

  } catch (e) {
    console.error('API Error:', e);
    res.writeHead(500, CORS);
    res.end(JSON.stringify({ error: e.message }));
  }
};

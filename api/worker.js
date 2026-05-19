// Photo Workflow API - Simplified Version
const SUPABASE_URL = 'https://woywgfoqurumrkyoznnb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndveXdnZm9xdXJ1bXJreW96bm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTMxMjEsImV4cCI6MjA5NDQ2OTEyMX0.RQrLvKLrDQKayT_Sreel2uSx99SelrZJqr5f76bucDE';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

async function sbQuery(path, method = 'GET', body = null) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  return res.json();
}

function genToken(userId) {
  return btoa(JSON.stringify({ uid: userId, t: Date.now() }));
}

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(atob(authHeader.slice(7)));
    if (Date.now() - payload.t > 7 * 24 * 3600 * 1000) return null;
    return payload.uid;
  } catch { return null; }
}

// Health check
async function handleHealth() {
  return [200, { status: 'ok', time: new Date().toISOString() }];
}

// Login
async function handleLogin(body) {
  const { email, password } = body;
  if (!email || !password) return [400, { error: '请输入邮箱和密码' }];

  const users = await sbQuery(`users?email=eq.${encodeURIComponent(email)}&select=*`);
  if (users && users.length > 0) {
    if (users[0].password_hash !== password) return [401, { error: '密码错误' }];
    return [200, { success: true, user: { id: users[0].id, email: users[0].email }, token: genToken(users[0].id) }];
  }

  const newUser = await sbQuery('users', 'POST', { email, password_hash: password });
  if (newUser.error) return [500, { error: '注册失败' }];
  return [201, { success: true, user: { id: newUser[0].id, email: newUser[0].email }, token: genToken(newUser[0].id) }];
}

// Schedules
async function handleGetSchedules(uid) {
  const data = await sbQuery(`schedules?user_id=eq.${uid}&select=*&order=date.asc`);
  return [200, { schedules: data || [] }];
}

async function handleCreateSchedule(uid, body) {
  const data = await sbQuery('schedules', 'POST', { ...body, user_id: uid });
  return [201, { schedule: data[0] }];
}

async function handleDeleteSchedule(uid, id) {
  await sbQuery(`schedules?id=eq.${id}`, 'DELETE');
  return [200, { success: true }];
}

// Plans
async function handleGetPlans(uid) {
  const data = await sbQuery(`plans?user_id=eq.${uid}&select=*&order=created_at.desc`);
  return [200, { plans: data || [] }];
}

async function handleCreatePlan(uid, body) {
  const data = await sbQuery('plans', 'POST', { ...body, user_id: uid });
  return [201, { plan: data[0] }];
}

// Messages
async function handleGetMessages(uid) {
  const data = await sbQuery(`messages?user_id=eq.${uid}&select=*&order=created_at.desc`);
  return [200, { messages: data || [] }];
}

async function handleCreateMessage(uid, body) {
  const data = await sbQuery('messages', 'POST', { ...body, user_id: uid });
  return [201, { message: data[0] }];
}

async function handleUpdateMessage(uid, id, body) {
  const data = await sbQuery(`messages?id=eq.${id}`, 'PATCH', body);
  return [200, { success: true, message: data[0] }];
}

async function handleDeleteMessage(uid, id) {
  await sbQuery(`messages?id=eq.${id}`, 'DELETE');
  return [200, { success: true }];
}

// Public message
async function handlePublicMessage(body) {
  const { name, email, phone, service_type, message } = body;
  if (!name || !email) return [400, { error: '姓名和邮箱为必填项' }];
  const data = await sbQuery('messages', 'POST', {
    name, email, phone: phone || '', service_type: service_type || '其他',
    message: message || '', status: 'new', user_id: '00000000-0000-0000-0000-000000000000'
  });
  return [201, { success: true, message: data[0] }];
}

// Dashboard
async function handleDashboardStats(uid) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const schedules = await sbQuery(`schedules?user_id=eq.${uid}&select=*`);
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

  const messages = await sbQuery(`messages?user_id=eq.${uid}&select=status`);
  const messagesData = messages || [];
  const newMessages = messagesData.filter(m => m.status === 'new').length;

  return [200, {
    stats: {
      monthShoots: currentMonthShoots,
      monthGrowth: monthGrowth,
      completionRate: completionRate,
      activeClients: activeClients,
      newClients: newMessages,
      totalShoots: schedulesData.length,
      completedShoots: completedShoots
    },
    trends: trends,
    topVenues: topVenues
  }];
}

// Main handler
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    let body = {};
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      try { body = await request.json(); } catch {}
    }

    const authHeader = request.headers.get('Authorization') || '';
    let result;

    try {
      if (path === '/api/health') {
        result = await handleHealth();
      }
      else if (path === '/api/auth/login' && method === 'POST') {
        result = await handleLogin(body);
      }
      else if (path === '/api/schedules' && method === 'GET') {
        const uid = verifyToken(authHeader);
        result = uid ? await handleGetSchedules(uid) : [401, { error: '未登录' }];
      }
      else if (path === '/api/schedules' && method === 'POST') {
        const uid = verifyToken(authHeader);
        result = uid ? await handleCreateSchedule(uid, body) : [401, { error: '未登录' }];
      }
      else if (path.startsWith('/api/schedules/') && method === 'DELETE') {
        const uid = verifyToken(authHeader);
        result = uid ? await handleDeleteSchedule(uid, path.split('/').pop()) : [401, { error: '未登录' }];
      }
      else if (path === '/api/plans' && method === 'GET') {
        const uid = verifyToken(authHeader);
        result = uid ? await handleGetPlans(uid) : [401, { error: '未登录' }];
      }
      else if (path === '/api/plans' && method === 'POST') {
        const uid = verifyToken(authHeader);
        result = uid ? await handleCreatePlan(uid, body) : [401, { error: '未登录' }];
      }
      else if (path === '/api/messages' && method === 'GET') {
        const uid = verifyToken(authHeader);
        result = uid ? await handleGetMessages(uid) : [401, { error: '未登录' }];
      }
      else if (path === '/api/messages' && method === 'POST') {
        const uid = verifyToken(authHeader);
        result = uid ? await handleCreateMessage(uid, body) : [401, { error: '未登录' }];
      }
      else if (path.startsWith('/api/messages/') && method === 'PATCH') {
        const uid = verifyToken(authHeader);
        result = uid ? await handleUpdateMessage(uid, path.split('/').pop(), body) : [401, { error: '未登录' }];
      }
      else if (path.startsWith('/api/messages/') && method === 'DELETE') {
        const uid = verifyToken(authHeader);
        result = uid ? await handleDeleteMessage(uid, path.split('/').pop()) : [401, { error: '未登录' }];
      }
      else if (path === '/api/messages/public' && method === 'POST') {
        result = await handlePublicMessage(body);
      }
      else if (path === '/api/dashboard/stats' && method === 'GET') {
        const uid = verifyToken(authHeader);
        result = uid ? await handleDashboardStats(uid) : [401, { error: '未登录' }];
      }
      else {
        result = [404, { error: 'Not Found', path }];
      }

      const [status, data] = result;
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  }
};

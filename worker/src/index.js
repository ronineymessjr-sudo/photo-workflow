import { approveAgentRun, createAgentDraft, getAgentRun, regenerateAgentRun } from './agent/workflow.js';

const DEFAULT_ORIGINS = [
  'http://127.0.0.1:8123',
  'http://localhost:8123',
  'https://photoatelier.pages.dev',
  'https://ronineymessjr-sudo.github.io',
];
const PUBLIC_FEEDBACK_AREA_CODES = Object.freeze({
  plan: 'plan',
  references: 'references',
  schedule: 'schedule',
  lut: 'lut',
  connections: 'connections',
  ui: 'ui',
  other: 'other',
  '方案生成': 'plan',
  '参考图库': 'references',
  '日程与现场': 'schedule',
  'LUT与后期': 'lut',
  'LUT 与后期': 'lut',
  '数据连接': 'connections',
  '界面与操作': 'ui',
  '其他': 'other',
  'Plan generation': 'plan',
  'Reference library': 'references',
  'Schedule and on-set': 'schedule',
  'LUTs and post': 'lut',
  'LUT & post': 'lut',
  'Data connections': 'connections',
  'Interface and interactions': 'ui',
  'Other': 'other',
  'プラン生成': 'plan',
  'リファレンス': 'references',
  '参考ライブラリ': 'references',
  '日程と現場': 'schedule',
  'LUTと仕上げ': 'lut',
  'データ接続': 'connections',
  '画面と操作': 'ui',
  'その他': 'other',
  '계획 생성': 'plan',
  '플랜 생성': 'plan',
  '레퍼런스 라이브러리': 'references',
  '일정과 현장': 'schedule',
  'LUT와 후반 작업': 'lut',
  'LUT와 후반': 'lut',
  'LUT와 후보정': 'lut',
  '데이터 연결': 'connections',
  '화면과 조작': 'ui',
  '기타': 'other',
});

const COMMON_FIELDS = ['id', 'createdAt', 'updatedAt', 'payloadJson'];
const NUMBER_FIELDS = new Set(['sequence', 'durationMinutes', 'strength', 'planScore', 'executionScore', 'keepRate', 'selectedCount']);
const ENTITY_FIELDS = {
  projects: ['title', 'status', 'shootingType', 'date', 'location', 'style', 'brief'],
  references: ['projectId', 'title', 'sourcePlatform', 'sourceUrl', 'styleTags', 'category', 'notes', 'provider', 'externalId', 'previewUrl', 'photographer', 'obsidianPath'],
  plans: ['projectId', 'concept', 'rationale', 'generationMode', 'visualDirection', 'equipment', 'risks', 'status', 'planStatus', 'executionStatus', 'deliveryStatus', 'scheduledAt', 'scheduleLocation', 'backupPrimary', 'backupSecondary', 'materialPath', 'selectedCount', 'editVersion', 'feedbackStatus', 'agentRunId', 'agentStatus', 'provider', 'model', 'promptVersion', 'schemaVersion', 'contextSnapshotJson', 'outputJson', 'validationJson', 'userApproved', 'parentPlanId', 'traceId', 'approvedAt'],
  shots: ['projectId', 'planId', 'sequence', 'scene', 'shotSize', 'focalLength', 'composition', 'lighting', 'pose', 'durationMinutes', 'priority', 'fallback', 'captureStatus', 'referenceIds'],
  tasks: ['projectId', 'planId', 'taskType', 'phase', 'status', 'title', 'startAt', 'endAt', 'dueAt', 'location', 'timezone', 'deliveryStatus'],
  luts: ['projectId', 'planId', 'name', 'inputColorSpace', 'fileUrl', 'style', 'strength', 'notes'],
  reviews: ['projectId', 'planId', 'planScore', 'executionScore', 'keepRate', 'successes', 'failures', 'lightingIssues', 'finalGrade', 'clientFeedback', 'reusableInsights', 'nextActions', 'obsidianPath'],
  messages: ['projectId', 'type', 'severity', 'status', 'relatedEntity', 'relatedId', 'traceId', 'content', 'metadataJson'],
};

class HttpError extends Error {
  constructor(status, message, code = 'HTTP_ERROR', details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function allowedOrigins(env) {
  return new Set(String(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(','))
    .split(',').map(value => value.trim()).filter(Boolean));
}

function responseHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = allowedOrigins(env);
  const allowOrigin = !origin ? '*' : allowed.has(origin) ? origin : 'null';
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-PhotoAtelier-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
}

function json(request, env, data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: responseHeaders(request, env) });
}

function authorize(request, env) {
  if (!env.APP_SYNC_TOKEN) throw new HttpError(503, 'APP_SYNC_TOKEN is not configured');
  if (request.headers.get('X-PhotoAtelier-Token') !== env.APP_SYNC_TOKEN) {
    throw new HttpError(401, 'Invalid PhotoAtelier sync token');
  }
}

export function normalizePublicFeedback(payload = {}) {
  const clean = (value, max) => String(value ?? '').trim().slice(0, max);
  const task = clean(payload.task, 240);
  const friction = clean(payload.friction, 1200);
  const area = clean(payload.area, 60) || '其他';
  const areaCode = normalizeFeedbackAreaCode(area);
  const rating = Number(payload.rating);
  if (!task || !friction) throw new HttpError(400, 'Task and friction are required', 'INVALID_FEEDBACK');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Rating must be an integer from 1 to 5', 'INVALID_FEEDBACK');
  return {
    feedbackId: /^[a-zA-Z0-9-]{8,80}$/.test(String(payload.feedbackId || '')) ? String(payload.feedbackId) : crypto.randomUUID(),
    task,
    friction,
    area,
    areaCode,
    rating,
    page: normalizeFeedbackPage(payload.page),
    build: clean(payload.build, 60),
    sessionId: clean(payload.sessionId, 80),
    analyticsConsent: payload.analyticsConsent === true,
  };
}

export function buildPublicFeedbackRecord(payload, now = new Date().toISOString()) {
  const feedback = normalizePublicFeedback(payload);
  const id = `feedback-${feedback.feedbackId}`;
  return {
    id,
    projectId: 'public-beta',
    type: 'beta-feedback',
    severity: feedback.rating >= 4 ? 'high' : feedback.rating === 3 ? 'medium' : 'low',
    status: 'unread',
    relatedEntity: 'public-beta',
    relatedId: feedback.sessionId || 'anonymous',
    traceId: id,
    content: `[${feedback.area}] ${feedback.task}\n${feedback.friction}`,
    metadataJson: {
      areaCode: feedback.areaCode,
      rating: feedback.rating,
      page: feedback.page,
      build: feedback.build,
      sessionId: feedback.sessionId,
      analyticsConsent: feedback.analyticsConsent,
      source: 'public-beta',
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function shouldIgnorePublicFeedback(payload = {}) {
  const feedback = normalizePublicFeedback(payload);
  const probeBuild = feedback.build === 'deploy-check' || /(^|-)deploy-check(?:-|$)/.test(feedback.feedbackId);
  const probeSession = feedback.sessionId === 'system-check' || /(^|-)system-check(?:-|$)/.test(feedback.feedbackId);
  return probeBuild && probeSession;
}

export function isIgnoredPublicFeedbackRecord(record = {}) {
  if (record.projectId !== 'public-beta' || record.type !== 'beta-feedback') return false;
  let metadata = {};
  if (typeof record.metadataJson === 'string') {
    try { metadata = JSON.parse(record.metadataJson || '{}'); } catch (_) {}
  } else {
    metadata = record.metadataJson || {};
  }
  const fingerprint = [record.id, record.traceId].map(value => String(value || '')).join(' ');
  const probeBuild = metadata.build === 'deploy-check' || /(^|-)deploy-check(?:-|$)/.test(fingerprint);
  const probeSession = (metadata.sessionId || record.relatedId) === 'system-check' || /(^|-)system-check(?:-|$)/.test(fingerprint);
  return probeBuild && probeSession;
}

function normalizeFeedbackPage(value) {
  try {
    const url = new URL(String(value || ''));
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch (_) {
    return '';
  }
}

function normalizeFeedbackAreaCode(value) {
  return PUBLIC_FEEDBACK_AREA_CODES[String(value || '').trim()] || 'other';
}

async function acceptPublicFeedback(request, env) {
  if (env.PUBLIC_FEEDBACK_ENABLED !== 'true') throw new HttpError(503, 'Public feedback is not enabled', 'FEEDBACK_DISABLED');
  const origin = request.headers.get('Origin');
  if (origin && !allowedOrigins(env).has(origin)) throw new HttpError(403, 'Origin not allowed', 'ORIGIN_NOT_ALLOWED');
  if (Number(request.headers.get('Content-Length') || 0) > 20_000) throw new HttpError(413, 'Feedback payload is too large', 'PAYLOAD_TOO_LARGE');
  const payload = await request.json().catch(() => { throw new HttpError(400, 'Invalid JSON body', 'INVALID_FEEDBACK'); });
  if (String(payload.website || '').trim()) return { accepted: true };
  if (shouldIgnorePublicFeedback(payload)) return { accepted: true, ignored: true };
  const record = buildPublicFeedbackRecord(payload);
  const summary = await syncFeishu('messages', [record], env);
  if (summary.errors.length || summary.conflicts.length) throw new HttpError(502, 'Feedback storage is temporarily unavailable', 'FEEDBACK_STORAGE_ERROR');
  return { accepted: true, feedbackId: record.id };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');
      if (origin && !allowedOrigins(env).has(origin)) return json(request, env, { error: 'Origin not allowed' }, 403);
      return json(request, env, { ok: true });
    }

    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/health') {
        return json(request, env, {
          ok: true,
          service: 'photoatelier-v2-api',
          time: new Date().toISOString(),
          syncProtected: Boolean(env.APP_SYNC_TOKEN),
          feishuConfigured: Boolean(env.FEISHU_APP_ID && env.FEISHU_APP_SECRET && env.FEISHU_APP_TOKEN),
          planningV5: env.AGENT_ENDPOINT_V5 || env.AGENT_ENDPOINT ? 'external-provider' : 'deterministic-context-fallback',
          visionAgent: env.AGENT_VISION_ENDPOINT ? 'external-provider' : 'deterministic-fallback',
          imageGenerationConfigured: Boolean(env.IMAGE_GENERATION_ENDPOINT),
          publicFeedbackEnabled: env.PUBLIC_FEEDBACK_ENABLED === 'true',
        });
      }

      if (url.pathname === '/api/public/feedback' && request.method === 'POST') {
        return json(request, env, { ok: true, ...(await acceptPublicFeedback(request, env)) }, 202);
      }

      authorize(request, env);

      const agentDeps = {
        env,
        list: async entity => (await listFeishuRecords(entity, env)).map(item => item.business).filter(item => item.id),
        sync: (entity, records) => syncFeishu(entity, records, env),
        writeMessage: message => syncFeishu('messages', [message], env),
      };


      if (url.pathname === '/api/v1/agent/plans/draft-v5' && request.method === 'POST') {
        const payload = await request.json();
        const result = await createV5PlanDraft(payload, env);
        return json(request, env, { ok: true, ...result });
      }

      if (url.pathname === '/api/v1/images/expected-look' && request.method === 'POST') {
        const payload = await request.json();
        const result = await generateExpectedLookImages(payload, env);
        return json(request, env, { ok: true, ...result });
      }

      if (url.pathname === '/api/v1/visual-dna/analyze' && request.method === 'POST') {
        const payload = await request.json();
        const result = await analyzeVisualDNA(payload, env);
        return json(request, env, { ok: true, ...result });
      }

      if (url.pathname === '/api/v1/creative-directions/generate' && request.method === 'POST') {
        const payload = await request.json();
        const result = await generateCreativeDirections(payload, env);
        return json(request, env, { ok: true, ...result });
      }

      if (url.pathname === '/api/v1/shots/design' && request.method === 'POST') {
        const payload = await request.json();
        const result = await designShots(payload, env);
        return json(request, env, { ok: true, ...result });
      }

      if (url.pathname === '/api/v1/agent/plans/draft' && request.method === 'POST') {
        const payload = await request.json();
        return json(request, env, { ok: true, ...(await createAgentDraft(payload.project_id, payload.options || {}, agentDeps)) });
      }

      const runMatch = url.pathname.match(/^\/api\/v1\/agent\/runs\/([^/]+)$/);
      if (runMatch && request.method === 'GET') {
        const run = await getAgentRun(decodeURIComponent(runMatch[1]), agentDeps);
        if (!run) throw new HttpError(404, 'Agent run not found');
        return json(request, env, { ok: true, ...run });
      }

      const regenerateMatch = url.pathname.match(/^\/api\/v1\/agent\/runs\/([^/]+)\/regenerate$/);
      if (regenerateMatch && request.method === 'POST') {
        const payload = await request.json();
        return json(request, env, { ok: true, ...(await regenerateAgentRun(decodeURIComponent(regenerateMatch[1]), payload.instruction || '', agentDeps)) });
      }

      const approveMatch = url.pathname.match(/^\/api\/v1\/agent\/runs\/([^/]+)\/approve$/);
      if (approveMatch && request.method === 'POST') {
        const payload = await request.json();
        return json(request, env, { ok: true, ...(await approveAgentRun(decodeURIComponent(approveMatch[1]), payload.edited_plan || null, agentDeps)) });
      }

      if (url.pathname === '/api/agent/generate-plan' && request.method === 'POST') {
        const payload = await request.json();
        const plan = await generatePlan(payload, env);
        return json(request, env, { ok: true, mode: env.AGENT_ENDPOINT ? 'configured-agent' : 'worker-rule-fallback', plan });
      }

      if (url.pathname === '/api/references/search-images' && request.method === 'POST') {
        const { query, count = 12 } = await request.json();
        return json(request, env, { ok: true, items: await searchReferenceImages(query, count, env) });
      }

      if (url.pathname === '/api/obsidian/search' && request.method === 'POST') {
        const { query, filters = {} } = await request.json();
        return json(request, env, { ok: true, items: await searchObsidian(query, filters, env) });
      }

      if (url.pathname === '/api/obsidian/read' && request.method === 'POST') {
        const { path } = await request.json();
        return json(request, env, { ok: true, item: await readObsidian(path, env) });
      }

      if (url.pathname === '/api/obsidian/write' && request.method === 'POST') {
        const payload = await request.json();
        return json(request, env, { ok: true, ...(await writeObsidianReview(payload, env)) });
      }

      const listMatch = url.pathname.match(/^\/api\/feishu\/([a-z-]+)\/records$/);
      if (listMatch && request.method === 'GET') {
        let records = (await listFeishuRecords(listMatch[1], env))
          .map(item => item.business)
          .filter(record => record.id);
        if (listMatch[1] === 'messages') {
          records = records.filter(record => !isIgnoredPublicFeedbackRecord(record));
        }
        return json(request, env, { ok: true, entity: listMatch[1], records });
      }

      const syncMatch = url.pathname.match(/^\/api\/feishu\/([a-z-]+)\/sync$/);
      if (syncMatch && request.method === 'POST') {
        const { records } = await request.json();
        return json(request, env, { ok: true, ...(await syncFeishu(syncMatch[1], records || [], env)) });
      }

      const deleteMatch = url.pathname.match(/^\/api\/feishu\/([a-z-]+)\/delete$/);
      if (deleteMatch && request.method === 'POST') {
        const { ids } = await request.json();
        return json(request, env, { ok: true, ...(await deleteFeishu(deleteMatch[1], ids || [], env)) });
      }

      return json(request, env, { error: 'Not found' }, 404);
    } catch (error) {
      return json(request, env, { error: error.message || 'Unknown error', code: error.code || 'INTERNAL_ERROR', details: error.details || {} }, error.status || 500);
    }
  },
};

async function generatePlan(payload, env) {
  if (env.AGENT_ENDPOINT) {
    const response = await fetch(env.AGENT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.AGENT_API_KEY ? { Authorization: `Bearer ${env.AGENT_API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Agent endpoint failed: ${response.status}`);
    const data = await response.json();
    return data.plan || data;
  }

  const project = payload.project || {};
  return {
    concept: `${project.title || '摄影项目'}完整拍摄方案`,
    rationale: 'Worker 未配置外部 Agent，使用确定性降级方案。',
    visualDirection: {
      palette: project.style || '自然、统一、可执行',
      lighting: '根据现场环境光建立主光方向，准备柔光补光。',
      composition: '建立环境、主体画面、情绪特写、细节补充。',
    },
    equipment: ['主相机', '35/50mm镜头', '85mm镜头', '反光板', '备用电池与存储卡'],
    shots: [
      { scene: '环境建立', shotSize: '全景', focalLength: '35mm', composition: '三分构图', lighting: '环境侧光', pose: '自然进入场景', durationMinutes: 10, priority: '必拍', fallback: '缩小场景范围' },
      { scene: '主体肖像', shotSize: '半身', focalLength: '85mm', composition: '留白构图', lighting: '柔和侧光', pose: '侧身回望', durationMinutes: 12, priority: '必拍', fallback: '改用50mm中景' },
      { scene: '情绪细节', shotSize: '特写', focalLength: '85mm', composition: '中心构图', lighting: '柔光', pose: '视线离镜', durationMinutes: 8, priority: '推荐', fallback: '改拍手部或服装细节' },
    ],
    tasks: [
      { phase: '前期', title: '确认场地、天气与人员', status: 'todo' },
      { phase: '拍摄', title: '完成必拍镜头', status: 'todo' },
      { phase: '后期', title: '选片、调色与输出', status: 'todo' },
    ],
    lutSuggestion: { name: 'Clean Neutral', inputColorSpace: 'Rec.709', strength: 35, notes: '保持肤色自然。' },
    risks: ['天气', '人流', '光线变化', '设备电量与存储空间'],
  };
}

async function tenantToken(env) {
  if (!env.FEISHU_APP_ID || !env.FEISHU_APP_SECRET || !env.FEISHU_APP_TOKEN) {
    throw new Error('Feishu base configuration is incomplete');
  }
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET }),
  });
  const data = await response.json();
  if (!response.ok || data.code !== 0) throw new Error(data.msg || 'Feishu auth failed');
  return data.tenant_access_token;
}

async function feishuApi(path, token, options = {}) {
  const response = await fetch(`https://open.feishu.cn/open-apis${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${token}` },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.code !== 0) throw new Error(data?.msg || `Feishu request failed: ${response.status}`);
  return data.data || {};
}

function assertEntity(entity, env) {
  if (!ENTITY_FIELDS[entity]) throw new HttpError(404, `Unsupported entity: ${entity}`);
  const tableId = tableIdFor(entity, env);
  if (!tableId) throw new Error(`Feishu table is not configured for ${entity}`);
  return tableId;
}

async function listFeishuRecords(entity, env, suppliedToken) {
  const tableId = assertEntity(entity, env);
  const token = suppliedToken || await tenantToken(env);
  const rows = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ page_size: '500' });
    if (pageToken) query.set('page_token', pageToken);
    const data = await feishuApi(`/bitable/v1/apps/${env.FEISHU_APP_TOKEN}/tables/${tableId}/records/search?${query}`, token, {
      method: 'POST',
      body: { field_names: [...new Set([...COMMON_FIELDS, ...ENTITY_FIELDS[entity]])] },
    });
    for (const record of data.items || []) rows.push(decodeFeishuRecord(record));
    pageToken = data.has_more ? data.page_token || '' : '';
  } while (pageToken);
  return rows;
}

async function syncFeishu(entity, records, env) {
  const tableId = assertEntity(entity, env);
  const token = await tenantToken(env);
  const existing = new Map((await listFeishuRecords(entity, env, token)).map(item => [item.business.id, item]));
  const summary = { entity, created: 0, updated: 0, skipped: 0, conflicts: [], errors: [] };

  for (const record of records) {
    if (!record?.id) {
      summary.errors.push({ id: '', error: 'Missing business id' });
      continue;
    }
    const remote = existing.get(record.id);
    const remoteTime = Date.parse(remote?.business?.updatedAt || 0);
    const localTime = Date.parse(record.updatedAt || 0);
    if (remote && remoteTime > localTime) {
      summary.conflicts.push({ id: record.id, remoteUpdatedAt: remote.business.updatedAt, localUpdatedAt: record.updatedAt });
      continue;
    }
    if (remote && remoteTime === localTime) {
      summary.skipped += 1;
      continue;
    }

    try {
      const fields = normalizeFields(entity, record);
      if (remote) {
        await feishuApi(`/bitable/v1/apps/${env.FEISHU_APP_TOKEN}/tables/${tableId}/records/${remote.recordId}`, token, {
          method: 'PUT', body: { fields },
        });
        summary.updated += 1;
      } else {
        await feishuApi(`/bitable/v1/apps/${env.FEISHU_APP_TOKEN}/tables/${tableId}/records`, token, {
          method: 'POST', body: { fields },
        });
        summary.created += 1;
      }
    } catch (error) {
      summary.errors.push({ id: record.id, error: error.message });
    }
  }
  return summary;
}

async function deleteFeishu(entity, ids, env) {
  const tableId = assertEntity(entity, env);
  const token = await tenantToken(env);
  const existing = new Map((await listFeishuRecords(entity, env, token)).map(item => [item.business.id, item]));
  const summary = { entity, deleted: 0, missing: 0, errors: [] };
  for (const id of [...new Set(ids.map(String))]) {
    const remote = existing.get(id);
    if (!remote) {
      summary.missing += 1;
      continue;
    }
    try {
      await feishuApi(`/bitable/v1/apps/${env.FEISHU_APP_TOKEN}/tables/${tableId}/records/${remote.recordId}`, token, { method: 'DELETE' });
      summary.deleted += 1;
    } catch (error) {
      summary.errors.push({ id, error: error.message });
    }
  }
  return summary;
}

function normalizeFields(entity, record) {
  const fields = { payloadJson: JSON.stringify(record) };
  for (const key of [...new Set([...COMMON_FIELDS, ...ENTITY_FIELDS[entity]])]) {
    if (key === 'payloadJson' || record[key] == null || record[key] === '') continue;
    const value = record[key];
    if (NUMBER_FIELDS.has(key)) fields[key] = Number(value) || 0;
    else fields[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
  return fields;
}

function decodeFeishuRecord(record) {
  const fields = record.fields || {};
  let payload = {};
  try { payload = JSON.parse(cellText(fields.payloadJson) || '{}'); } catch (_) {}
  if (!payload.id) payload.id = cellText(fields.id);
  if (!payload.projectId) payload.projectId = cellText(fields.projectId);
  if (!payload.createdAt) payload.createdAt = cellText(fields.createdAt);
  if (!payload.updatedAt) payload.updatedAt = cellText(fields.updatedAt);
  return { recordId: record.record_id, business: payload };
}

function cellText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(item => typeof item === 'object' ? item.text || item.name || '' : item).join('');
  return value.text || value.name || '';
}

function tableIdFor(entity, env) {
  return {
    projects: env.FEISHU_TABLE_PROJECTS,
    references: env.FEISHU_TABLE_REFERENCES,
    plans: env.FEISHU_TABLE_PLANS,
    shots: env.FEISHU_TABLE_SHOTS,
    tasks: env.FEISHU_TABLE_TASKS,
    luts: env.FEISHU_TABLE_LUTS,
    reviews: env.FEISHU_TABLE_REVIEWS,
    messages: env.FEISHU_TABLE_MESSAGES,
  }[entity];
}

async function searchReferenceImages(query, count, env) {
  if (!env.PEXELS_API_KEY) throw new Error('PEXELS_API_KEY missing');
  const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(Number(count) || 12, 30)}`, {
    headers: { Authorization: env.PEXELS_API_KEY },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Pexels failed: ${response.status}`);
  return (data.photos || []).map(photo => ({
    id: String(photo.id), provider: 'Pexels', title: `${query} · ${photo.photographer}`,
    photographer: photo.photographer, previewUrl: photo.src?.medium, sourceUrl: photo.url,
  }));
}

async function searchObsidian(query, filters, env) {
  if (!env.OBSIDIAN_BRIDGE_URL) throw new Error('OBSIDIAN_BRIDGE_URL missing');
  const base = env.OBSIDIAN_BRIDGE_URL.replace(/\/$/, '');
  const url = new URL(`${base}/v1/search`);
  url.searchParams.set('query', String(query || '').trim());
  for (const key of ['type', 'workflowStage', 'tag', 'orientation', 'license', 'limit']) {
    if (filters?.[key]) url.searchParams.set(key, String(filters[key]));
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: { ...(env.OBSIDIAN_BRIDGE_TOKEN ? { Authorization: `Bearer ${env.OBSIDIAN_BRIDGE_TOKEN}` } : {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Obsidian bridge failed: ${response.status}`);
  return data.items || data;
}

async function readObsidian(path, env) {
  if (!env.OBSIDIAN_BRIDGE_URL) throw new Error('OBSIDIAN_BRIDGE_URL missing');
  const base = env.OBSIDIAN_BRIDGE_URL.replace(/\/$/, '');
  const url = new URL(`${base}/v1/notes/read`);
  url.searchParams.set('path', String(path || '').trim());
  const response = await fetch(url, {
    method: 'GET',
    headers: { ...(env.OBSIDIAN_BRIDGE_TOKEN ? { Authorization: `Bearer ${env.OBSIDIAN_BRIDGE_TOKEN}` } : {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Obsidian bridge failed: ${response.status}`);
  return data.item || data;
}


async function writeObsidianReview(payload, env) {
  if (!env.OBSIDIAN_BRIDGE_URL) throw new Error('OBSIDIAN_BRIDGE_URL missing');
  const response = await fetch(`${env.OBSIDIAN_BRIDGE_URL.replace(/\/$/, '')}/v1/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(env.OBSIDIAN_BRIDGE_TOKEN ? { Authorization: `Bearer ${env.OBSIDIAN_BRIDGE_TOKEN}` } : {}) },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Obsidian bridge failed: ${response.status}`);
  return data || {};
}


async function createV5PlanDraft(payload, env) {
  const snapshot = payload?.contextSnapshot;
  if (!snapshot?.projectId || !snapshot?.brief || !Array.isArray(snapshot.equipment) || !Array.isArray(snapshot.references)) {
    throw new HttpError(400, 'Invalid planning context snapshot', 'INVALID_PLANNING_CONTEXT', { required: ['projectId', 'brief', 'equipment', 'references'] });
  }
  if (Number(payload.schemaVersion || 0) !== 5) throw new HttpError(400, 'schemaVersion must be 5', 'UNSUPPORTED_SCHEMA_VERSION');
  const endpoint = env.AGENT_ENDPOINT_V5 || env.AGENT_ENDPOINT;
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(env.AGENT_API_KEY ? { Authorization: `Bearer ${env.AGENT_API_KEY}` } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new HttpError(502, `Agent endpoint failed: ${response.status}`, 'AGENT_PROVIDER_FAILED', { status: response.status });
    const normalizedOutput = data?.normalizedOutput || data?.output || data?.plan || data;
    assertV5PlanShape(normalizedOutput);
    return { requestId: data?.requestId || crypto.randomUUID(), normalizedOutput, rawOutput: data, provider: 'external-agent', model: data?.model || 'configured-by-provider' };
  }
  const normalizedOutput = deterministicV5Plan(snapshot, payload.instruction || '');
  return {
    requestId: crypto.randomUUID(),
    normalizedOutput,
    rawOutput: { mode: 'deterministic-context-fallback', contextHash: snapshot.contextHash || null },
    provider: 'photoatelier-worker',
    model: 'deterministic-v5',
  };
}

async function generateExpectedLookImages(payload, env) {
  if (!env.IMAGE_GENERATION_ENDPOINT) {
    throw new HttpError(503, 'Expected-look image provider is not configured', 'IMAGE_PROVIDER_NOT_CONFIGURED');
  }
  const response = await fetch(env.IMAGE_GENERATION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(env.IMAGE_GENERATION_API_KEY ? { Authorization: `Bearer ${env.IMAGE_GENERATION_API_KEY}` } : {}) },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new HttpError(502, `Image provider failed: ${response.status}`, 'IMAGE_PROVIDER_FAILED', { status: response.status });
  const assets = Array.isArray(data?.assets) ? data.assets : Array.isArray(data?.images) ? data.images : [];
  if (!assets.length) throw new HttpError(502, 'Image provider returned no assets', 'IMAGE_PROVIDER_EMPTY_RESULT');
  return { requestId: data?.requestId || crypto.randomUUID(), assets: assets.map((asset, index) => ({
    id: asset.id || `provider-asset-${index + 1}`,
    url: asset.url || asset.imageUrl,
    width: asset.width || null,
    height: asset.height || null,
  })) };
}

function deterministicV5Plan(snapshot, instruction) {
  const brief = snapshot.brief || {};
  const equipment = snapshot.equipment || [];
  const references = snapshot.references || [];
  const knowledgeSources = snapshot.knowledgeSources || [];
  const referenceIds = references.map(item => item.referenceAssetId).filter(Boolean);
  const equipmentIds = equipment.map(item => item.equipmentItemId).filter(Boolean);
  const primaryLens = equipment.find(item => item.category === 'lens');
  const focal = primaryLens?.focalRange || '使用已分配镜头的可用焦段';
  const theme = brief.theme || brief.goal || '摄影项目';
  const style = [brief.style, brief.mood].filter(Boolean).join('、') || '自然、统一';
  const targetCount = positiveIntegerFromText(brief.deliverableTarget) || 12;
  const byRole = new Map();
  for (const source of knowledgeSources) {
    const role = source.selectionRole || inferWorkerKnowledgeRole(source);
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role).push(source);
  }
  const sourceFor = role => byRole.get(role)?.[0] || null;
  const sceneKnowledgeSources = (byRole.get('scene') || []).slice(0, 2);
  const sceneKnowledge = sourceFor('scene');
  const compositionKnowledge = sourceFor('composition');
  const lightingKnowledge = sourceFor('lighting');
  const actionKnowledge = sourceFor('action');
  const movementKnowledge = sourceFor('movement');
  const styleKnowledge = sourceFor('style');
  const colorKnowledge = sourceFor('color');
  const postKnowledge = sourceFor('post');
  const workflowKnowledge = sourceFor('workflow');
  const generalKnowledge = sourceFor('general');
  const reviewInsights = (snapshot.historicalReviewSummary || []).map(item => item.reusableInsights).filter(Boolean).slice(0, 2);
  const usedKnowledge = uniqueKnowledgeSources([sceneKnowledgeSources, compositionKnowledge, lightingKnowledge, actionKnowledge, movementKnowledge, styleKnowledge, colorKnowledge, postKnowledge, workflowKnowledge, generalKnowledge]);
  const trace = (...sources) => ({
    referenceAssetIds: referenceIds.slice(0, 3),
    equipmentItemIds: equipmentIds.slice(0, 4),
    knowledgeSourceIds: uniqueKnowledgeSources(sources).map(item => item.id),
    templateId: snapshot.template?.id || null,
  });
  const direction = (fallback, source, purpose) => source
    ? `${fallback}；将「${source.title}」作为${purpose}候选${knowledgeNeedsVerification(source) ? '，具体步骤与参数需在拍摄前打开原始来源核验' : ''}`
    : fallback;
  const sceneName = brief.locationIntent || brief.location || theme;
  const shots = [
    {
      sequence: 1, scene: `${sceneName}环境建立`, shotSize: '全景', cameraAngle: '平视',
      composition: direction('环境引导线与主体关系', compositionKnowledge, '构图与机位'), focalLength: primaryLens?.focalRange || focal,
      lighting: '先判断环境主光方向，再根据已分配灯具决定是否轻量补光',
      poseGuidance: direction('让主体自然进入场景，先完成放松动作', movementKnowledge, '动态与运镜'),
      subjectAction: '行走或与环境互动', variationCount: 3, targetSelectCount: 2, priority: 'must', estimatedMinutes: 12,
      fallback: direction('缩小场景范围，优先保留人物与一处关键环境信息', sceneKnowledge, '备选场景'),
      sourceTrace: trace(sceneKnowledgeSources, compositionKnowledge, movementKnowledge),
    },
    {
      sequence: 2, scene: `${theme}主体肖像`, shotSize: '半身', cameraAngle: '平视或略低机位',
      composition: direction('主体清晰，背景保持层次', styleKnowledge, '风格表达'), focalLength: focal,
      lighting: direction('保留现场光方向，以柔和补光控制眼神光和肤色', lightingKnowledge, '光线方向'),
      poseGuidance: direction('肩颈放松，视线在镜头内外各完成一组', actionKnowledge, '动作引导'),
      subjectAction: '静态表情与轻微转身', variationCount: 4, targetSelectCount: 3, priority: 'must', estimatedMinutes: 15,
      fallback: '切换更简洁背景；只有已分配合适焦段时才使用焦段压缩杂乱元素',
      sourceTrace: trace(lightingKnowledge, actionKnowledge, styleKnowledge),
    },
    {
      sequence: 3, scene: `${theme}情绪与细节`, shotSize: '特写', cameraAngle: '平视',
      composition: '眼神、手部或服装细节作为视觉重点', focalLength: focal,
      lighting: direction('延续主体肖像光比，避免突然改变色温', colorKnowledge, '色彩连续性'),
      poseGuidance: direction('减少大动作，使用呼吸、视线和手部细节表达情绪', actionKnowledge, '细节动作'),
      subjectAction: '微表情与细节互动', variationCount: 4, targetSelectCount: 2, priority: 'optional', estimatedMinutes: 10,
      fallback: '改拍手部、服装或道具细节', sourceTrace: trace(actionKnowledge, styleKnowledge, colorKnowledge),
    },
  ];
  const look = snapshot.lookRequest || { enabled: false };
  const knowledgeGuidance = usedKnowledge.map(source => ({
    sourceId: source.id,
    title: source.title,
    role: source.selectionRole || inferWorkerKnowledgeRole(source),
    groundingStatus: source.groundingStatus || 'vault-note',
    sourceUrl: source.sourceUrl || null,
    whyUsed: source.whyMatched || `用于${knowledgeRoleLabel(source.selectionRole || inferWorkerKnowledgeRole(source))}`,
    verificationRequired: knowledgeNeedsVerification(source),
  }));
  const verificationChecklist = knowledgeGuidance.filter(item => item.verificationRequired).map(item =>
    `打开原始来源核验「${item.title}」的具体步骤、参数和示例；核验前只作为${knowledgeRoleLabel(item.role)}候选。`);
  if (sceneKnowledge && knowledgeNeedsVerification(sceneKnowledge)) verificationChecklist.push(`确认场景候选「${sceneKnowledge.title}」的实际地址、许可、天气和现场光线。`);
  const lookKnowledge = uniqueKnowledgeSources([styleKnowledge, lightingKnowledge, colorKnowledge]);
  const styleKeywords = [...new Set([brief.style, brief.mood, ...lookKnowledge.flatMap(item => item.tags || [])].filter(Boolean))].slice(0, 10);
  const retrievalCoverage = Object.entries(snapshot.knowledgeRetrieval?.coverage || {}).filter(([, count]) => Number(count) > 0).map(([role, count]) => `${knowledgeRoleLabel(role)} ${count}`).join('、');
  const output = {
    concept: `${theme} · ${style}拍摄方案`,
    rationale: `基于已冻结的 Brief、${equipment.length} 项可用设备、${references.length} 条真实参考与 ${knowledgeSources.length} 条知识依据生成。${retrievalCoverage ? `知识覆盖：${retrievalCoverage}。` : ''}${reviewInsights.length ? `同时参考 ${reviewInsights.length} 条本项目历史复盘。` : ''}${instruction ? `补充要求：${instruction}` : ''}`,
    visualDirection: {
      style, mood: brief.mood || '', referenceTitles: references.slice(0, 5).map(item => item.title),
      knowledgeTitles: usedKnowledge.map(item => item.title), styleKeywords,
      knowledgeRoles: Object.fromEntries(knowledgeGuidance.map(item => [item.role, item.title])),
    },
    preparationGuide: [
      '逐项确认已分配设备可用状态、电池和存储卡',
      '在拍摄前再次确认场地限制、人员到场时间和模特授权',
      `按交付目标预留至少 ${targetCount} 张最终成片的覆盖量`,
      ...(workflowKnowledge ? [direction('按既有检查清单完成拍摄准备', workflowKnowledge, '流程检查')] : []),
      ...(generalKnowledge ? [direction('核对 Obsidian 本地摄影索引与相关笔记', generalKnowledge, '本地知识复核')] : []),
      ...reviewInsights.map(insight => `历史复盘提醒：${insight}`),
      ...verificationChecklist.slice(0, 5),
    ],
    expectedDeliverableCount: targetCount,
    mustHaveShotCount: 2,
    equipmentRecommendations: equipment.map(item => ({ equipmentItemId: item.equipmentItemId, name: item.name, role: item.role || 'assigned', source: 'assigned', externalRequirement: false, reason: '来自项目已选择且当前可用的设备' })),
    shots,
    knowledgeGuidance,
    verificationChecklist,
    postProductionGuidance: [
      ...(colorKnowledge ? [direction('先统一曝光、白平衡与肤色，再建立创意色彩', colorKnowledge, '调色方向')] : ['先统一曝光、白平衡与肤色，再建立创意色彩']),
      ...(postKnowledge ? [direction('按最终交付规格完成剪辑、排版或发布包装', postKnowledge, '后期与发布')] : []),
    ],
    expectedLook: {
      enabled: Boolean(look.enabled),
      realReferenceAssetIds: referenceIds,
      colorIntent: look.colorIntent || (colorKnowledge ? `参考「${colorKnowledge.title}」的色彩方向，具体参数待核验` : ''),
      lightingIntent: look.lightingIntent || (lightingKnowledge ? `参考「${lightingKnowledge.title}」的光线方向，现场测光确认` : ''),
      retouchIntent: look.retouchIntent || '',
      lutIntent: look.lutIntent || '',
      styleKeywords,
      knowledgeSourceIds: lookKnowledge.map(item => item.id),
      knowledgeVerificationRequired: lookKnowledge.some(knowledgeNeedsVerification),
    },
    risks: [...new Set([
      ...(snapshot.constraints || []),
      '现场光线与人流可能变化，应保留可执行的替代机位',
      ...(verificationChecklist.length ? [`${verificationChecklist.length} 条知识依据仍需核验，未核验前不得照抄参数、地址或动作步骤`] : []),
    ])],
  };
  assertV5PlanShape(output);
  return output;
}

function inferWorkerKnowledgeRole(source) {
  if (source.kind === 'action') return 'action';
  if (source.kind === 'scene') return 'scene';
  const text = `${source.title || ''} ${(source.tags || []).join(' ')}`;
  if (/姿势|动作|表情|手部|道具|走动|转圈/.test(text)) return 'action';
  if (/场景|海边|街头|建筑|咖啡馆|校园|公园|棚拍|室内|室外/.test(text)) return 'scene';
  if (/构图|景别|前景|焦段|机位|视角|广角|长焦/.test(text)) return 'composition';
  if (/光线|灯光|布光|逆光|侧光|闪光|补光|夜景/.test(text)) return 'lighting';
  if (/运镜|一镜到底|镜头运动|稳定器|转场/.test(text)) return 'movement';
  if (/调色|色彩|达芬奇|LUT|滤镜|肤色|色温/.test(text)) return 'color';
  if (/剪辑|字幕|排版|修图|发布|封面|声音/.test(text)) return 'post';
  if (/氛围感|电影感|高级感|复古|古风|情绪|风格/.test(text)) return 'style';
  if (/工作流|器材|相机|参数|设置|备份|准备/.test(text)) return 'workflow';
  return 'general';
}

function knowledgeNeedsVerification(source) {
  return source?.requiresVerification === true || source?.groundingStatus === 'metadata-only';
}

function uniqueKnowledgeSources(sources) {
  const ids = new Set();
  return sources.flat().filter(source => {
    if (!source?.id || ids.has(source.id)) return false;
    ids.add(source.id);
    return true;
  });
}

function knowledgeRoleLabel(role) {
  return ({ action: '动作引导', scene: '场景勘察', composition: '构图与机位', lighting: '光线', movement: '运镜', style: '风格表达', color: '色彩', post: '后期与发布', workflow: '拍摄流程', general: '通用灵感' })[role] || role;
}

function assertV5PlanShape(value) {
  if (!value?.concept || !value?.rationale || !Array.isArray(value?.shots) || !value.shots.length) {
    throw new HttpError(502, 'Agent output does not match V5 plan contract', 'INVALID_AGENT_OUTPUT');
  }
  for (const shot of value.shots) {
    if (!shot?.sourceTrace || !Array.isArray(shot.sourceTrace.referenceAssetIds) || !Array.isArray(shot.sourceTrace.equipmentItemIds)) {
      throw new HttpError(502, 'Agent shot is missing sourceTrace', 'INVALID_AGENT_OUTPUT', { sequence: shot?.sequence || null });
    }
  }
}
function positiveIntegerFromText(value) {
  const match = String(value || '').match(/\d+/);
  const number = match ? Number(match[0]) : 0;
  return Number.isInteger(number) && number > 0 ? number : 0;
}

async function analyzeVisualDNA(payload, env) {
  const { references, snapshot } = payload;
  if (!Array.isArray(references) || !references.length) {
    throw new HttpError(400, 'At least one reference is required', 'INVALID_VISUAL_DNA_REQUEST');
  }
  const endpoint = env.AGENT_VISION_ENDPOINT;
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(env.AGENT_VISION_API_KEY ? { Authorization: `Bearer ${env.AGENT_VISION_API_KEY}` } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new HttpError(502, `Vision Agent failed: ${response.status}`, 'VISION_AGENT_FAILED', { status: response.status });
    return { requestId: data?.requestId || crypto.randomUUID(), analysis: data?.analysis || data, provider: 'vision-agent', model: data?.model || 'configured-by-provider' };
  }
  const analysis = deterministicVisualDNAAnalysis(references, snapshot);
  return {
    requestId: crypto.randomUUID(),
    analysis,
    provider: 'photoatelier-worker',
    model: 'deterministic-v3',
  };
}

function deterministicVisualDNAAnalysis(references, snapshot) {
  const brief = snapshot?.brief || {};
  const allTags = references.flatMap(item => item.tags || []);
  const tagSet = new Set(allTags);
  return {
    compositionAnalysis: tagSet.has('环境') || tagSet.has('environment')
      ? { description: '环境人像比例较高，人物不占满画面，大量留白，偏非中心构图', patterns: ['环境叙事', '留白', '非中心'] }
      : { description: '人物与环境兼顾，中等景别为主，构图均衡', patterns: ['均衡', '中等景别'] },
    lensAnalysis: {
      description: '标准焦段覆盖，兼顾环境叙事与情绪肖像',
      focalRecommendations: [{ mm: '35mm', purpose: '环境叙事' }, { mm: '50mm', purpose: '自然人物关系' }, { mm: '85mm', purpose: '情绪肖像' }],
    },
    subjectAnalysis: {
      description: '以自然状态为主，避免刻意摆拍',
      avoid: ['强摆拍'],
      recommend: ['自然动作', '低互动', '非直视镜头'],
    },
    lightingAnalysis: (brief.mood || '').includes('夜景')
      ? { description: '主要利用环境光塑造氛围，保持光线方向自然，必要时使用辅助反光，避免明显人工光痕迹', direction: '环境光为主', approach: '弱化人工光痕迹，保留自然光感' }
      : { description: '柔和自然光为主，避免过硬光比，保持真实光影关系', direction: '自然光', approach: '柔光优先，必要时反光补光' },
    colorAnalysis: (brief.style || '').includes('胶片')
      ? { description: '胶片质感，低饱和偏暖，带颗粒感', saturation: '低饱和', temperature: '暖色倾向', texture: '胶片颗粒' }
      : (brief.style || '').includes('清冷')
        ? { description: '清冷色调，低饱和偏冷，质感干净', saturation: '低饱和', temperature: '冷色倾向', texture: '胶片颗粒' }
        : { description: '自然真实色彩，适度饱和，保持肤色准确', saturation: '适中', temperature: '中性', texture: '干净' },
  };
}

async function generateCreativeDirections(payload, env) {
  const { visualDNA, brief } = payload;
  if (!visualDNA) throw new HttpError(400, 'visualDNA is required', 'INVALID_CREATIVE_DIRECTION_REQUEST');
  const endpoint = env.AGENT_ENDPOINT_V5 || env.AGENT_ENDPOINT;
  if (endpoint) {
    const response = await fetch(`${endpoint}/creative-directions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(env.AGENT_API_KEY ? { Authorization: `Bearer ${env.AGENT_API_KEY}` } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new HttpError(502, `Agent failed for creative directions: ${response.status}`, 'AGENT_PROVIDER_FAILED', { status: response.status });
    return { requestId: data?.requestId || crypto.randomUUID(), directions: data?.directions || data, provider: 'external-agent' };
  }
  const directions = deterministicCreativeDirections(visualDNA, brief || {});
  return {
    requestId: crypto.randomUUID(),
    directions,
    provider: 'photoatelier-worker',
    model: 'deterministic-v3',
  };
}

function deterministicCreativeDirections(visualDNA, brief) {
  const colorTemp = visualDNA.colorAnalysis?.temperature || '中性';
  const lightApproach = visualDNA.lightingAnalysis?.approach || '自然光';
  const compPatterns = visualDNA.compositionAnalysis?.patterns || [];
  const theme = brief.theme || '';
  return [
    { title: `${theme || '主题'}·${compPatterns[0] || '视觉'}风格`, keywords: [colorTemp, lightApproach, ...compPatterns.slice(0, 2)], styleTags: [brief.style || '', colorTemp, lightApproach].filter(Boolean), moodDescription: brief.mood || `${colorTemp}色调与${lightApproach}的结合`, referenceAssetIds: [] },
    { title: `${theme || '纪实'}现场纪实`, keywords: ['抓拍', '自然状态', '街头氛围'], styleTags: [brief.style ? `${brief.style}纪实` : '纪实', 'documentary'], moodDescription: `以纪实手法捕捉${theme || '场景'}中的自然瞬间`, referenceAssetIds: [] },
    { title: `${colorTemp}情绪人像`, keywords: ['静态', '情绪表达', '浅景深'], styleTags: [brief.style ? `${brief.style}情绪` : '情绪人像', 'intimate'], moodDescription: `聚焦情绪与氛围，以${colorTemp}光影营造内省的空间感`, referenceAssetIds: [] },
  ];
}

async function designShots(payload, env) {
  const { visualDNA, creativeDirection, brief, equipment, shootingScale } = payload;
  if (!visualDNA || !creativeDirection) throw new HttpError(400, 'visualDNA and creativeDirection are required', 'INVALID_SHOT_DESIGN_REQUEST');
  const endpoint = env.AGENT_ENDPOINT_V5 || env.AGENT_ENDPOINT;
  if (endpoint) {
    const response = await fetch(`${endpoint}/shot-design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(env.AGENT_API_KEY ? { Authorization: `Bearer ${env.AGENT_API_KEY}` } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new HttpError(502, `Agent failed for shot design: ${response.status}`, 'AGENT_PROVIDER_FAILED', { status: response.status });
    return { requestId: data?.requestId || crypto.randomUUID(), shots: data?.shots || data, provider: 'external-agent' };
  }
  const shots = deterministicShotDesignWorker(visualDNA, creativeDirection, brief || {}, equipment || [], shootingScale || 'standard');
  return {
    requestId: crypto.randomUUID(),
    shots,
    provider: 'photoatelier-worker',
    model: 'deterministic-v3',
  };
}

function deterministicShotDesignWorker(visualDNA, creativeDirection, brief, equipment, shootingScale) {
  const scaleMap = { simple: 6, standard: 12, comprehensive: 20 };
  const count = scaleMap[shootingScale] || 12;
  const focalRecd = visualDNA.lensAnalysis?.focalRecommendations || [{ mm: '50mm', purpose: '标准' }];
  const referenceIds = visualDNA.referenceAssetIds || [];
  const keywords = creativeDirection.keywords || [];
  const emotions = keywords.length ? keywords : ['自然、真实'];
  const templates = [
    { scene: '环境', shotSize: '远景', cameraAngle: '平视', priority: 'must', category: 'establishing', estimatedMinutes: 15 },
    { scene: '人物', shotSize: '半身', cameraAngle: '平视', priority: 'must', category: 'portrait', estimatedMinutes: 10 },
    { scene: '人物', shotSize: '全身', cameraAngle: '低角度', priority: 'must', category: 'portrait', estimatedMinutes: 10 },
    { scene: '细节', shotSize: '特写', cameraAngle: '俯视', priority: 'recommended', category: 'detail', estimatedMinutes: 8 },
    { scene: '动作', shotSize: '中景', cameraAngle: '平视', priority: 'recommended', category: 'action', estimatedMinutes: 12 },
    { scene: '氛围', shotSize: '远景', cameraAngle: '高角度', priority: 'recommended', category: 'mood', estimatedMinutes: 10 },
  ];
  const shots = [];
  for (let i = 0; i < count; i++) {
    const t = templates[i % templates.length];
    const focal = focalRecd[i % focalRecd.length];
    const refId = referenceIds.length ? referenceIds[i % referenceIds.length] : null;
    shots.push({
      sequence: i + 1,
      scene: `${brief.theme || '场景'}${t.scene}`,
      shotSize: t.shotSize,
      cameraAngle: t.cameraAngle,
      composition: visualDNA.compositionAnalysis?.patterns?.[i % (visualDNA.compositionAnalysis?.patterns?.length || 1)] || '均衡构图',
      focalLength: typeof focal === 'object' ? focal.mm : String(focal),
      lighting: {
        main: visualDNA.lightingAnalysis?.approach || '自然光',
        direction: (visualDNA.lightingAnalysis?.direction || '自然方向').includes('侧') ? '45度侧面' : (visualDNA.lightingAnalysis?.direction || '自然方向').includes('逆') ? '逆光方向' : '正面/顺光方向',
        auxiliary: (visualDNA.lightingAnalysis?.approach || '').includes('环境') ? '必要时反光板补光' : '可用反光板微补',
        effect: (visualDNA.lightingAnalysis?.approach || '').includes('环境') ? '保持自然过渡，避免明显人工光痕迹' : '保留光影质感，强化氛围',
      },
      poseGuidance: visualDNA.subjectAnalysis?.recommend?.[0] || '自然放松',
      subjectAction: t.category === 'action' ? '自然移动' : t.category === 'establishing' ? '环境建立' : '静态表现',
      variationCount: t.priority === 'must' ? 3 : 2,
      targetSelectCount: t.priority === 'must' ? 2 : 1,
      priority: t.priority,
      estimatedMinutes: t.estimatedMinutes,
      fallback: '',
      emotion: emotions[i % emotions.length],
      mood: creativeDirection.moodDescription || '',
      referenceAssetId: refId,
      whyThisShot: `${t.category === 'establishing' ? '建立环境氛围' : t.category === 'portrait' ? '核心人物表现' : t.category === 'detail' ? '细节与质感补充' : t.category === 'action' ? '捕捉动态瞬间' : t.category === 'mood' ? '氛围与情绪传递' : '丰富拍摄内容'}，基于${brief.theme || '选定方向'}的风格要求`,
      visualMatchScore: referenceIds.length ? Math.max(60, 100 - i * 3) : 0,
      learningFocus: `${visualDNA.compositionAnalysis?.patterns?.[0] || '构图'}、${visualDNA.lightingAnalysis?.direction || '光线'}、${visualDNA.colorAnalysis?.temperature || '色调'}`,
      sourceTrace: { referenceAssetIds: refId ? [refId] : [], equipmentItemIds: equipment.slice(0, 4).map(e => e.equipmentItemId).filter(Boolean), templateId: null },
    });
  }
  return shots;
}

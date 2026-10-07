import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { buildPublicFeedbackRecord, normalizePublicFeedback, shouldIgnorePublicFeedback } from '../../../worker/src/index.js';

const env = { APP_SYNC_TOKEN: 'test-token', ALLOWED_ORIGINS: 'https://photoatelier.test' };
function allowRateLimit() { return { async limit() { return { success: true }; } }; }
function denyRateLimit() { return { async limit() { return { success: false }; } }; }
function request(path, body) {
  return new Request(`https://worker.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PhotoAtelier-Token': 'test-token', Origin: 'https://photoatelier.test' },
    body: JSON.stringify(body),
  });
}
const snapshot = {
  id: 'snapshot-1', projectId: 'project-1', contextHash: 'hash-1',
  brief: { shootingType: '人像创作', goal: '城市人像', theme: '蓝调街道', style: '电影感', mood: '安静', deliverableTarget: '精修 12 张' },
  equipment: [{ equipmentItemId: 'equipment-1', name: 'Sony Alpha 7 IV', category: 'camera', availabilityStatus: 'available', role: 'primary-camera' }],
  references: [{ referenceAssetId: 'reference-1', title: '夜景实拍参考', synthetic: false }],
  knowledgeSources: [
    { id: 'knowledge-composition', title: '前景构图的拍摄思路与技巧', kind: 'rag_chunk', selectionRole: 'composition', tags: ['前景构图'], groundingStatus: 'metadata-only', requiresVerification: true },
    { id: 'knowledge-action', title: '表情管理', kind: 'action', selectionRole: 'action', tags: ['表情'], groundingStatus: 'metadata-only', requiresVerification: true },
    { id: 'knowledge-lighting', title: '夜景人像光线方向', kind: 'rag_chunk', selectionRole: 'lighting', tags: ['夜景', '光线'], groundingStatus: 'metadata-only', requiresVerification: true },
    { id: 'knowledge-color', title: '电影感调色方向', kind: 'rag_chunk', selectionRole: 'color', tags: ['电影感', '调色'], groundingStatus: 'metadata-only', requiresVerification: true },
  ],
  knowledgeRetrieval: { mode: 'brief-auto-plus-manual', coverage: { composition: 1, action: 1, lighting: 1, color: 1 } },
  knowledgePolicy: { forbidInventedParameters: true },
  constraints: ['不阻塞公共通道'],
  lookRequest: { enabled: true, colorIntent: '低饱和蓝橙', lightingIntent: '保留霓虹', retouchIntent: '保留肤质', lutIntent: '创意 LUT' },
};

test('Mini Program login exchanges a one-time code for a scoped, short-lived session without exposing WeChat identifiers', async () => {
  const originalFetch = globalThis.fetch;
  const paths = [];
  globalThis.fetch = async url => {
    const endpoint = new URL(String(url));
    paths.push(endpoint.pathname);
    assert.equal(endpoint.hostname, 'api.weixin.qq.com');
    assert.equal(endpoint.searchParams.get('appid'), 'wx-test-app');
    assert.equal(endpoint.searchParams.get('secret'), 'server-only-secret');
    assert.equal(endpoint.searchParams.get('js_code'), 'one-time-code');
    assert.equal(endpoint.searchParams.get('grant_type'), 'authorization_code');
    return new Response(JSON.stringify({ openid: 'private-open-id', session_key: 'private-session-key' }), { status: 200 });
  };
  const miniEnv = {
    ...env,
    WECHAT_APP_ID: 'wx-test-app',
    WECHAT_APP_SECRET: 'server-only-secret',
    MINI_LOGIN_LIMITER: allowRateLimit(),
    MINI_AI_LIMITER: allowRateLimit(),
  };

  try {
    const login = await worker.fetch(new Request('https://worker.test/api/mini/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.10' },
      body: JSON.stringify({ code: 'one-time-code' }),
    }), miniEnv);
    assert.equal(login.status, 200);
    const session = await login.json();
    assert.ok(session.token);
    assert.ok(session.expiresAt);
    assert.equal(JSON.stringify(session).includes('private-open-id'), false);
    assert.equal(JSON.stringify(session).includes('private-session-key'), false);

    const plan = await worker.fetch(new Request('https://worker.test/api/v1/agent/plans/draft-v5', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ contextSnapshot: snapshot, schemaVersion: 5 }),
    }), miniEnv);
    assert.equal(plan.status, 200);
    assert.equal((await plan.json()).provider, 'photoatelier-worker');

    const privateRecords = await worker.fetch(new Request('https://worker.test/api/feishu/messages/records', {
      headers: { Authorization: `Bearer ${session.token}` },
    }), miniEnv);
    assert.equal(privateRecords.status, 403);
    assert.equal((await privateRecords.json()).code, 'MINI_SCOPE_DENIED');
    assert.deepEqual(paths, ['/sns/jscode2session']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Mini Program cloud routes fail closed when WeChat or rate-limit credentials are incomplete', async () => {
  const response = await worker.fetch(new Request('https://worker.test/api/mini/session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'one-time-code' }),
  }), { ...env, WECHAT_APP_ID: 'wx-test-app', MINI_LOGIN_LIMITER: allowRateLimit(), MINI_AI_LIMITER: allowRateLimit() });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'MINI_AUTH_NOT_CONFIGURED');
});

test('Mini Program concept-image calls use a dedicated per-session limiter before reaching the provider', async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ openid: 'private-open-id', session_key: 'private-session-key' }), { status: 200 });
  };
  const miniEnv = {
    ...env, WECHAT_APP_ID: 'wx-test-app', WECHAT_APP_SECRET: 'server-only-secret',
    MINI_LOGIN_LIMITER: allowRateLimit(), MINI_AI_LIMITER: allowRateLimit(), MINI_IMAGE_LIMITER: denyRateLimit(),
  };
  try {
    const login = await worker.fetch(new Request('https://worker.test/api/mini/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'one-time-code' }),
    }), miniEnv);
    const { token } = await login.json();
    const response = await worker.fetch(new Request('https://worker.test/api/v1/images/expected-look', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt: 'portrait', count: 4 }),
    }), miniEnv);
    assert.equal(response.status, 429);
    assert.equal((await response.json()).code, 'MINI_AI_RATE_LIMITED');
    assert.equal(upstreamCalls, 1, 'only the one-time WeChat code exchange reached an upstream service');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('worker V5 planning endpoint creates a context-traceable deterministic fallback without external keys', async () => {
  const response = await worker.fetch(request('/api/v1/agent/plans/draft-v5', { contextSnapshot: snapshot, instruction: '避免假脸感', schemaVersion: 5 }), env);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.provider, 'photoatelier-worker');
  assert.equal(data.model, 'deterministic-v5');
  assert.equal(data.normalizedOutput.expectedDeliverableCount, 12);
  assert.ok(data.normalizedOutput.shots.every(shot => shot.sourceTrace.referenceAssetIds.includes('reference-1')));
  assert.ok(data.normalizedOutput.shots.every(shot => shot.sourceTrace.equipmentItemIds.includes('equipment-1')));
  assert.ok(data.normalizedOutput.shots[0].sourceTrace.knowledgeSourceIds.includes('knowledge-composition'));
  assert.ok(data.normalizedOutput.shots[1].sourceTrace.knowledgeSourceIds.includes('knowledge-action'));
  assert.ok(data.normalizedOutput.shots[1].lighting.includes('夜景人像光线方向'));
  assert.ok(data.normalizedOutput.knowledgeGuidance.every(item => item.verificationRequired));
  assert.ok(data.normalizedOutput.verificationChecklist.length >= 4);
  assert.ok(data.normalizedOutput.risks.some(item => item.includes('不得照抄参数')));
  assert.equal(data.normalizedOutput.expectedLook.enabled, true);
  assert.ok(data.normalizedOutput.expectedLook.knowledgeSourceIds.includes('knowledge-color'));
  assert.equal(data.normalizedOutput.expectedLook.knowledgeVerificationRequired, true);
});

test('worker V5 planning rejects malformed context with a structured error', async () => {
  const response = await worker.fetch(request('/api/v1/agent/plans/draft-v5', { contextSnapshot: {}, schemaVersion: 5 }), env);
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.code, 'INVALID_PLANNING_CONTEXT');
  assert.ok(Array.isArray(data.details.required));
});

test('Worker exposes complete V5 creative-direction and shot-design results for Mini Program gateways', async () => {
  const directionResponse = await worker.fetch(request('/api/v1/creative-directions/generate', {
    visualDNA: {
      referenceAssetIds: ['reference-1'],
      compositionAnalysis: { patterns: ['留白'] },
      lensAnalysis: { focalRecommendations: [{ mm: '50mm', purpose: '自然人物关系' }] },
      subjectAnalysis: { recommend: ['自然动作'] },
      lightingAnalysis: { approach: '柔光优先', direction: '侧光' },
      colorAnalysis: { temperature: '暖色倾向' },
    },
    brief: { theme: '窗光人像', style: '胶片质感', mood: '安静' },
  }), env);
  assert.equal(directionResponse.status, 200);
  const directionData = await directionResponse.json();
  assert.equal(directionData.provider, 'photoatelier-worker');
  assert.equal(directionData.directions.length, 3);
  assert.ok(directionData.directions.every(item => item.title && Array.isArray(item.keywords) && Array.isArray(item.styleTags)));

  const shotResponse = await worker.fetch(request('/api/v1/shots/design', {
    visualDNA: {
      referenceAssetIds: ['reference-1'],
      compositionAnalysis: { patterns: ['留白'] },
      lensAnalysis: { focalRecommendations: [{ mm: '50mm', purpose: '自然人物关系' }] },
      subjectAnalysis: { recommend: ['自然动作'] },
      lightingAnalysis: { approach: '柔光优先', direction: '侧光' },
    },
    creativeDirection: { id: 'direction-1', keywords: ['暖色', '自然动作'] },
    brief: { theme: '窗光人像', shootingScale: 'simple' },
    equipment: [],
    shootingScale: 'simple',
  }), env);
  assert.equal(shotResponse.status, 200);
  const shotData = await shotResponse.json();
  assert.equal(shotData.provider, 'photoatelier-worker');
  assert.equal(shotData.shots.length, 6);
  assert.equal(shotData.shots[0].sourceTrace.referenceAssetIds[0], 'reference-1');
});

test('Worker VisualDNA fallback is identified as deterministic metadata analysis, not image recognition', async () => {
  const response = await worker.fetch(request('/api/v1/visual-dna/analyze', {
    references: [{ title: '城市夜景参考', tags: ['环境', '夜景'], role: 'style' }],
    snapshot: { brief: { style: '胶片质感', mood: '夜景' } },
  }), env);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.provider, 'photoatelier-worker');
  assert.equal(result.model, 'deterministic-v3');
  assert.ok(result.analysis.compositionAnalysis.description);
  assert.equal(JSON.stringify(result).includes('image recognition'), false);
});

test('expected-look image route never returns fake images when provider is absent', async () => {
  const response = await worker.fetch(request('/api/v1/images/expected-look', { count: 2 }), env);
  assert.equal(response.status, 503);
  const data = await response.json();
  assert.equal(data.code, 'IMAGE_PROVIDER_NOT_CONFIGURED');
});

test('expected-look image route calls the HF-routed Krea provider and returns usable hosted assets', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const requestUrl = new URL(String(url));
    calls.push({ url: requestUrl, options });
    if (requestUrl.searchParams.has('_subdomain') && requestUrl.pathname.endsWith('/turbo')) {
      return new Response(JSON.stringify({ request_id: 'queue-1', status: 'IN_PROGRESS' }), { status: 200 });
    }
    if (requestUrl.pathname.endsWith('/queue-1/status')) {
      return new Response(JSON.stringify({ status: 'COMPLETED' }), { status: 200 });
    }
    if (requestUrl.pathname.endsWith('/queue-1')) {
      return new Response(JSON.stringify({ images: [
        { url: 'https://v3b.fal.media/files/test-1.jpg', width: 1536, height: 1024 },
        { url: 'https://v3b.fal.media/files/test-2.jpg', width: 1536, height: 1024 },
        { url: 'https://example.invalid/not-a-provider-image.jpg', width: 1536, height: 1024 },
      ] }), { status: 200 });
    }
    throw new Error(`Unexpected mocked provider URL: ${requestUrl}`);
  };

  try {
    const response = await worker.fetch(request('/api/v1/images/expected-look', {
      prompt: '俯拍视角，模特在雨后巷口侧身回望，真实电影感人像',
      aspectRatio: '3:2',
      count: 7,
    }), { ...env, HF_TOKEN: 'test-hf-token' });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.provider, 'huggingface/fal-ai');
    assert.equal(data.model, 'krea/Krea-2-Turbo');
    assert.equal(data.requestId, 'queue-1');
    assert.equal(data.assets.length, 2);
    assert.deepEqual(data.assets[0], {
      id: 'queue-1:1',
      url: 'https://v3b.fal.media/files/test-1.jpg',
      width: 1536,
      height: 1024,
    });
    const submit = calls[0];
    const submittedBody = JSON.parse(submit.options.body);
    assert.equal(submittedBody.prompt, '俯拍视角，模特在雨后巷口侧身回望，真实电影感人像');
    assert.equal(submittedBody.num_images, 4);
    assert.deepEqual(submittedBody.image_size, { width: 1536, height: 1024 });
    assert.equal(submittedBody.enable_prompt_expansion, false);
    assert.equal(submit.options.headers.Authorization, 'Bearer test-hf-token');
    assert.equal(calls.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('expected-look image route reports exhausted HF credits without attempting a fallback provider', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: 'payment required' }), { status: 402 });
  };
  try {
    const response = await worker.fetch(request('/api/v1/images/expected-look', { prompt: 'portrait', count: 1 }), { ...env, HF_TOKEN: 'test-hf-token' });
    assert.equal(response.status, 402);
    assert.equal((await response.json()).code, 'IMAGE_PROVIDER_CREDITS_EXHAUSTED');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('public beta feedback is sanitized and cannot carry project content implicitly', () => {
  const normalized = normalizePublicFeedback({
    feedbackId: 'fb-12345678', task: '  建立夜景方案  ', area: '方案生成', friction: '步骤太长', rating: 4,
    page: 'https://photoatelier.pages.dev/legacy/index.html?project=private#plan', build: 'beta', sessionId: 'session-1',
  });
  assert.equal(normalized.task, '建立夜景方案');
  assert.equal(normalized.page, 'https://photoatelier.pages.dev/legacy/index.html');
  assert.equal(normalized.rating, 4);
  assert.equal('project' in normalized, false);

  const record = buildPublicFeedbackRecord(normalized, '2026-07-18T00:00:00.000Z');
  assert.equal(record.projectId, 'public-beta');
  assert.equal(record.type, 'beta-feedback');
  assert.equal(record.severity, 'high');
  assert.equal(record.metadataJson.page.includes('private'), false);
});

test('public beta system validation probes are acknowledged without entering the message queue', async () => {
  assert.equal(shouldIgnorePublicFeedback({
    feedbackId: 'fb-system-check',
    task: '系统验证，请忽略',
    area: '其他',
    friction: '验证公开反馈可写入 Messages 队列。',
    rating: 1,
    page: 'https://photoatelier.pages.dev/',
    build: 'deploy-check',
    sessionId: 'system-check',
  }), true);

  const response = await worker.fetch(new Request('https://worker.test/api/public/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://photoatelier.test' },
    body: JSON.stringify({
      feedbackId: 'fb-system-check',
      task: '系统验证，请忽略',
      area: '其他',
      friction: '验证公开反馈可写入 Messages 队列。',
      rating: 1,
      page: 'https://photoatelier.pages.dev/',
      build: 'deploy-check',
      sessionId: 'system-check',
    }),
  }), { ...env, PUBLIC_FEEDBACK_ENABLED: 'true' });

  assert.equal(response.status, 202);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.accepted, true);
  assert.equal(data.ignored, true);
});

test('message listing hides historical public beta validation probes', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('/auth/v3/tenant_access_token/internal')) {
      return new Response(JSON.stringify({ code: 0, tenant_access_token: 'tenant-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (String(url).includes('/records')) {
      return new Response(JSON.stringify({
        code: 0,
        data: {
          items: [
            { record_id: 'rec-probe', fields: { payloadJson: JSON.stringify({ id: 'feedback-deploy-check-system-check', projectId: 'public-beta', type: 'beta-feedback', relatedId: 'system-check', traceId: 'feedback-deploy-check-system-check', metadataJson: { build: 'deploy-check', sessionId: 'system-check' } }) } },
            { record_id: 'rec-user', fields: { payloadJson: JSON.stringify({ id: 'feedback-user-0001', projectId: 'public-beta', type: 'beta-feedback', relatedId: 'visitor', traceId: 'feedback-user-0001', metadataJson: { build: 'public-beta-r6', sessionId: 'visitor' } }) } },
          ],
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected fetch: ${url} ${options.method || 'GET'}`);
  };

  try {
    const response = await worker.fetch(new Request('https://worker.test/api/feishu/messages/records', {
      headers: { 'X-PhotoAtelier-Token': 'sync-token' },
    }), {
      APP_SYNC_TOKEN: 'sync-token',
      FEISHU_APP_ID: 'app-id',
      FEISHU_APP_SECRET: 'app-secret',
      FEISHU_APP_TOKEN: 'app-token',
      FEISHU_TABLE_MESSAGES: 'table-messages',
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload.records.map(item => item.id), ['feedback-user-0001']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('public beta feedback adds a stable areaCode for localized labels', () => {
  for (const [area, areaCode] of [
    ['方案生成', 'plan'],
    ['Plan generation', 'plan'],
    ['参考ライブラリ', 'references'],
    ['LUT와 후보정', 'lut'],
  ]) {
    const normalized = normalizePublicFeedback({
      feedbackId: `feedback-area-${areaCode}`,
      task: '完成方案',
      friction: '设置过程太长',
      area,
      rating: 2,
    });
    assert.equal(normalized.areaCode, areaCode);
    assert.equal(buildPublicFeedbackRecord(normalized).metadataJson.areaCode, areaCode);
  }
});

test('public feedback route rejects invalid input before private sync authorization', async () => {
  const response = await worker.fetch(new Request('https://worker.test/api/public/feedback', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://photoatelier.test' },
    body: JSON.stringify({ task: '', friction: '', rating: 8 }),
  }), { ...env, PUBLIC_FEEDBACK_ENABLED: 'true' });
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.code, 'INVALID_FEEDBACK');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { buildPublicFeedbackRecord, normalizePublicFeedback, shouldIgnorePublicFeedback } from '../../../worker/src/index.js';

const env = { APP_SYNC_TOKEN: 'test-token', ALLOWED_ORIGINS: 'https://photoatelier.test' };
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

test('expected-look image route never returns fake images when provider is absent', async () => {
  const response = await worker.fetch(request('/api/v1/images/expected-look', { count: 2 }), env);
  assert.equal(response.status, 503);
  const data = await response.json();
  assert.equal(data.code, 'IMAGE_PROVIDER_NOT_CONFIGURED');
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

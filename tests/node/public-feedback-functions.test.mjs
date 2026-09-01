import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestPost } from '../../functions/api/public/feedback.js';
import { isValidFeedback, normalizeFeedbackArea, normalizeFeedbackPage } from '../../functions/api/public/_shared.js';

test('localized public feedback areas normalize to stable storage codes', () => {
  for (const [area, code] of [
    ['方案生成', 'plan'],
    ['参考图库', 'references'],
    ['日程与现场', 'schedule'],
    ['LUT 与后期', 'lut'],
    ['数据连接', 'connections'],
    ['界面与操作', 'ui'],
    ['Plan generation', 'plan'],
    ['Reference library', 'references'],
    ['Schedule and on-set', 'schedule'],
    ['LUTs and post', 'lut'],
    ['Data connections', 'connections'],
    ['Interface and interactions', 'ui'],
    ['プラン生成', 'plan'],
    ['リファレンス', 'references'],
    ['日程と現場', 'schedule'],
    ['LUTと仕上げ', 'lut'],
    ['データ接続', 'connections'],
    ['画面と操作', 'ui'],
    ['계획 생성', 'plan'],
    ['레퍼런스 라이브러리', 'references'],
    ['일정과 현장', 'schedule'],
    ['LUT와 후반 작업', 'lut'],
    ['데이터 연결', 'connections'],
    ['화면과 조작', 'ui'],
  ]) assert.equal(normalizeFeedbackArea(area), code);
  assert.equal(normalizeFeedbackArea('unknown'), '');
  assert.equal(normalizeFeedbackPage('https://photoatelier.pages.dev/en/?utm_source=test#feedback'), 'https://photoatelier.pages.dev/en/');
  assert.equal(normalizeFeedbackPage('not-a-url'), '');
});

test('public feedback route accepts localized area labels and stores stable codes', async () => {
  const payload = {
    feedbackId: '123e4567-e89b-42d3-a456-426614174000',
    task: 'Submit a public beta issue',
    area: 'Plan generation',
    friction: 'The feedback form keeps saying it is queued.',
    rating: 4,
    page: 'https://photoatelier.pages.dev/en/?utm_source=test#feedback',
    build: 'public-beta-2026.07',
    locale: 'en',
    sessionId: 'session-1',
  };
  assert.equal(isValidFeedback(payload), true);

  let bindArgs = null;
  const env = {
    FEEDBACK_DB: {
      prepare(sql) {
        assert.match(sql, /INSERT OR IGNORE INTO public_feedback/);
        return {
          bind(...args) {
            bindArgs = args;
            return {
              async run() {
                return { success: true };
              },
            };
          },
        };
      },
    },
  };

  const request = new Request('https://photoatelier.pages.dev/api/public/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const response = await onRequestPost({ request, env });
  assert.equal(response.status, 202);
  assert.equal(bindArgs?.[3], 'plan');
  assert.equal(bindArgs?.[6], 'https://photoatelier.pages.dev/en/');
  assert.deepEqual(await response.json(), {
    ok: true,
    accepted: true,
    feedbackId: payload.feedbackId,
  });
});

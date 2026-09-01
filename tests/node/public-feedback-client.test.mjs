import test from 'node:test';
import assert from 'node:assert/strict';

import { sendFeedback, shouldQueueFeedbackRetry } from '../../src/public-feedback-client.js';

test('feedback client does not queue non-retryable validation failures', async () => {
  await assert.rejects(
    sendFeedback({ feedbackId: 'feedback-invalid' }, async () => new Response(JSON.stringify({ error: 'INVALID_FEEDBACK' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    })),
    error => {
      assert.equal(error.status, 422);
      assert.equal(error.code, 'INVALID_FEEDBACK');
      assert.equal(shouldQueueFeedbackRetry(error), false);
      return true;
    },
  );
});

test('feedback client keeps retryable server failures in the queue', async () => {
  await assert.rejects(
    sendFeedback({ feedbackId: 'feedback-retry' }, async () => new Response(JSON.stringify({ error: 'STORAGE_UNAVAILABLE' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })),
    error => {
      assert.equal(error.status, 503);
      assert.equal(shouldQueueFeedbackRetry(error), true);
      return true;
    },
  );
});

test('feedback client treats network errors as retryable', async () => {
  await assert.rejects(
    sendFeedback({ feedbackId: 'feedback-network' }, async () => {
      throw new TypeError('fetch failed');
    }),
    error => {
      assert.equal(error instanceof TypeError, true);
      assert.equal(shouldQueueFeedbackRetry(error), true);
      return true;
    },
  );
});

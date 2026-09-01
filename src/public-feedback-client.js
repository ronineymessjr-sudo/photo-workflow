export const FEEDBACK_ENDPOINT = '/api/public/feedback';

export function isRetryableFeedbackStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export function shouldQueueFeedbackRetry(error) {
  return error?.retryable === true;
}

function buildFeedbackError(response, body) {
  const error = new Error(`Feedback API returned ${response.status}`);
  error.status = response.status;
  error.retryable = isRetryableFeedbackStatus(response.status);
  error.code = body?.error || body?.code || '';
  return error;
}

export async function sendFeedback(payload, fetchImpl = fetch, endpoint = FEEDBACK_ENDPOINT) {
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    error.retryable = true;
    throw error;
  }

  if (!response.ok) {
    let body = null;
    try {
      body = await response.json();
    } catch (_) {}
    throw buildFeedbackError(response, body);
  }

  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}

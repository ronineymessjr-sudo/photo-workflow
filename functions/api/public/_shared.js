const AREA_VALUES = new Set(['plan', 'references', 'schedule', 'lut', 'connections', 'ui', 'other']);
const EVENT_VALUES = new Set(['page_view', 'analytics_consent_changed', 'landing_cta_open_workspace', 'feedback_submitted']);

export function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function readJson(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 20_000) throw new Error('Payload too large');
  return request.json();
}

export function text(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export function isValidFeedback(payload) {
  return isUuid(payload.feedbackId)
    && text(payload.task, 240).length > 1
    && AREA_VALUES.has(payload.area)
    && text(payload.friction, 1200).length > 1
    && Number.isInteger(Number(payload.rating))
    && Number(payload.rating) >= 1
    && Number(payload.rating) <= 5;
}

export function isValidEvent(payload) {
  return isUuid(payload.eventId) && EVENT_VALUES.has(payload.name);
}

export function isDeployCheck(payload) {
  return payload.build === 'deploy-check' && payload.sessionId === 'system-check';
}

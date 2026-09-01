const AREA_VALUES = new Set(['plan', 'references', 'schedule', 'lut', 'connections', 'ui', 'other']);
const AREA_ALIASES = new Map([
  ['\u65b9\u6848\u751f\u6210', 'plan'],
  ['\u53c2\u8003\u56fe\u5e93', 'references'],
  ['\u65e5\u7a0b\u4e0e\u73b0\u573a', 'schedule'],
  ['LUT\u4e0e\u540e\u671f', 'lut'],
  ['LUT \u4e0e\u540e\u671f', 'lut'],
  ['\u6570\u636e\u8fde\u63a5', 'connections'],
  ['\u754c\u9762\u4e0e\u64cd\u4f5c', 'ui'],
  ['\u5176\u4ed6', 'other'],
  ['Plan generation', 'plan'],
  ['Reference library', 'references'],
  ['Schedule and on-set', 'schedule'],
  ['LUTs and post', 'lut'],
  ['LUT & post', 'lut'],
  ['Data connections', 'connections'],
  ['Interface and interactions', 'ui'],
  ['Other', 'other'],
  ['\u30d7\u30e9\u30f3\u751f\u6210', 'plan'],
  ['\u30ea\u30d5\u30a1\u30ec\u30f3\u30b9', 'references'],
  ['\u53c2\u8003\u30e9\u30a4\u30d6\u30e9\u30ea', 'references'],
  ['\u65e5\u7a0b\u3068\u73fe\u5834', 'schedule'],
  ['LUT\u3068\u4ed5\u4e0a\u3052', 'lut'],
  ['\u30c7\u30fc\u30bf\u63a5\u7d9a', 'connections'],
  ['\u753b\u9762\u3068\u64cd\u4f5c', 'ui'],
  ['\u305d\u306e\u4ed6', 'other'],
  ['\uacc4\ud68d \uc0dd\uc131', 'plan'],
  ['\ud50c\ub79c \uc0dd\uc131', 'plan'],
  ['\ub808\ud37c\ub7f0\uc2a4 \ub77c\uc774\ube0c\ub7ec\ub9ac', 'references'],
  ['\uc77c\uc815\uacfc \ud604\uc7a5', 'schedule'],
  ['LUT\uc640 \ud6c4\ubc18 \uc791\uc5c5', 'lut'],
  ['LUT\uc640 \ud6c4\ubc18', 'lut'],
  ['LUT\uc640 \ud6c4\ubcf4\uc815', 'lut'],
  ['\ub370\uc774\ud130 \uc5f0\uacb0', 'connections'],
  ['\ud654\uba74\uacfc \uc870\uc791', 'ui'],
  ['\uae30\ud0c0', 'other'],
]);
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

export function normalizeFeedbackArea(value) {
  const normalized = text(value, 60);
  return AREA_VALUES.has(normalized) ? normalized : (AREA_ALIASES.get(normalized) || '');
}

export function normalizeFeedbackPage(value) {
  try {
    const url = new URL(String(value || ''));
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch (_) {
    return '';
  }
}

export function isValidFeedback(payload) {
  return isUuid(payload.feedbackId)
    && text(payload.task, 240).length > 1
    && Boolean(normalizeFeedbackArea(payload.area))
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

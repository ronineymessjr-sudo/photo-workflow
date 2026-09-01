import { isDeployCheck, isValidFeedback, json, normalizeFeedbackArea, normalizeFeedbackPage, readJson, text } from './_shared.js';

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await readJson(request);
  } catch (_) {
    return json({ ok: false, error: 'INVALID_JSON' }, 400);
  }

  if (text(payload.website, 120)) return json({ ok: true, accepted: true }, 202);
  if (isDeployCheck(payload)) return json({ ok: true, accepted: true, ignored: true }, 202);
  if (!isValidFeedback(payload)) return json({ ok: false, error: 'INVALID_FEEDBACK' }, 422);
  if (!env.FEEDBACK_DB) return json({ ok: false, error: 'STORAGE_UNAVAILABLE' }, 503);

  await env.FEEDBACK_DB.prepare(`
    INSERT OR IGNORE INTO public_feedback
      (id, received_at, task, area, friction, rating, page, build, locale, session_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread')
  `).bind(
    payload.feedbackId,
    new Date().toISOString(),
    text(payload.task, 240),
    normalizeFeedbackArea(payload.area),
    text(payload.friction, 1200),
    Number(payload.rating),
    normalizeFeedbackPage(payload.page),
    text(payload.build, 80),
    text(payload.locale, 24),
    text(payload.sessionId, 80),
  ).run();

  return json({ ok: true, accepted: true, feedbackId: payload.feedbackId }, 202);
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
}

import { isValidEvent, json, readJson, text } from './_shared.js';

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await readJson(request);
  } catch (_) {
    return json({ ok: false, error: 'INVALID_JSON' }, 400);
  }

  if (!isValidEvent(payload)) return json({ ok: false, error: 'INVALID_EVENT' }, 422);
  if (!env.FEEDBACK_DB) return json({ ok: false, error: 'STORAGE_UNAVAILABLE' }, 503);

  await env.FEEDBACK_DB.prepare(`
    INSERT OR IGNORE INTO public_events
      (id, received_at, name, page, locale, session_id, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    payload.eventId,
    new Date().toISOString(),
    payload.name,
    text(payload.page, 500),
    text(payload.locale, 24),
    text(payload.sessionId, 80),
    JSON.stringify(payload.metadata || {}).slice(0, 2000),
  ).run();

  return json({ ok: true, accepted: true }, 202);
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
}

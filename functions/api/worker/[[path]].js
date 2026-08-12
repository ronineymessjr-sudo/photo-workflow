const DEFAULT_UPSTREAM = 'https://photoatelier-v2-api.photomagic.workers.dev';

export async function onRequest({ request, env, params }) {
  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  const upstream = String(env.PHOTOATELIER_WORKER_URL || DEFAULT_UPSTREAM).replace(/\/$/, '');
  const source = new URL(request.url);
  const target = new URL(`${upstream}/${path}`);
  target.search = source.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('X-Forwarded-Host', source.host);

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Cache-Control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

import { createHmac, randomUUID } from 'node:crypto';

export function recordWebRequest(request, result, env, body = {}) {
    const path = new URL(request.url).pathname;
    const health = path === '/api/health' || path === '/health';
    const auth = ['/api/auth/login', '/api/auth/email/verify'].includes(path) && request.method === 'POST';
    const success = auth && (result.status === 200 || result.status === 201) && result.body?.success === true;
    const known = /^\/api\/(ai\/(providers|plan)|auth\/(login|methods|email\/(send|verify))|director\/(plan|generate-candidate|identity-lock-workflow)|schedules|plans|messages(?:\/public)?|dashboard\/stats|health)$/;
    const route = known.test(path) || health ? path : /^\/api\/(schedules|messages)\//.test(path) ? path.replace(/^(\/api\/[^/]+)\/.*/, '$1/:id') : 'other';
    let originHost = 'none';
    try {
        const host = new URL(request.headers.get('origin')).hostname;
        originHost = ['photo-workflow.pages.dev', 'photoatelier.pages.dev', 'ronineymessjr-sudo.github.io', '127.0.0.1', 'localhost'].includes(host) ? host : 'other';
    } catch {}
    const requestId = randomUUID();
    const synthetic = path.startsWith('/api/auth/') && typeof body.email === 'string' && body.email.toLowerCase().endsWith('.invalid');
    const event = {
        event: auth ? success ? 'web_auth_success' : 'web_auth_failure' : 'web_request',
        app: 'photo-workflow-web',
        occurred_at: new Date().toISOString(),
        request_id: requestId,
        route,
        method: request.method,
        status: result.status,
        origin_host: originHost,
        traffic_class: health ? 'maintenance' : synthetic ? 'synthetic' : 'user_or_bot',
    };
    if (success) {
        event.action = result.status === 201 ? 'signup' : 'login';
        event.actor_hash = createHmac('sha256', env.JWT_SECRET).update(`web-analytics:${result.body.user.id}`).digest('hex').slice(0, 24);
    }
    console.log(JSON.stringify(event));
    return requestId;
}

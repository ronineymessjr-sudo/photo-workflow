// Pages Functions: same-origin proxy to the Workers API.
//
// Why this exists
// ---------------
// The front end used to call https://photoatelier-api.photomagic.workers.dev
// directly. From mainland China that host is unreachable for two separate
// reasons, both measured on 2026-11-07:
//   1. DNS poisoning  - local resolvers answer with Facebook/Dropbox IPs
//                       (31.13.82.33, 157.240.0.35, 108.160.167.167)
//   2. SNI blocking   - forcing the real Cloudflare edge IP via --resolve still
//                       times out, so the block happens at the TLS handshake
//
// A custom domain on the same account (photo.ronineymessjrstudio.cn) resolves to
// real Cloudflare edge IPs and answers 200, so the network path is fine - it is
// the *.workers.dev hostname that is blocked.
//
// This function makes the browser call /api/* on the Pages domain instead. The
// hop to workers.dev happens inside Cloudflare's network, which is not affected.
// Nothing about the API changes; only who dials it.

const UPSTREAM = 'https://photoatelier-api.photomagic.workers.dev';

// Hop-by-hop headers must not be forwarded in either direction.
const HOP_BY_HOP = [
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailer', 'transfer-encoding', 'upgrade', 'host',
];

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const target = UPSTREAM + url.pathname + url.search;

    const headers = new Headers(context.request.headers);
    for (const name of HOP_BY_HOP) headers.delete(name);
    // Let the upstream see its own host, not the Pages domain.
    headers.set('host', new URL(UPSTREAM).host);

    const init = {
        method: context.request.method,
        headers,
        redirect: 'manual',
    };
    if (!['GET', 'HEAD'].includes(context.request.method)) {
        init.body = context.request.body;
        // Cloudflare requires this when streaming a request body upstream.
        init.duplex = 'half';
    }

    let upstream;
    try {
        upstream = await fetch(target, init);
    } catch (error) {
        return Response.json({
            error: '上游 API 不可达',
            code: 'API_PROXY_UNREACHABLE',
            detail: String(error?.message || error).slice(0, 200),
            target,
        }, { status: 502 });
    }

    const out = new Headers(upstream.headers);
    for (const name of HOP_BY_HOP) out.delete(name);
    // The body is re-streamed, so any upstream encoding no longer applies.
    out.delete('content-encoding');
    out.delete('content-length');

    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}

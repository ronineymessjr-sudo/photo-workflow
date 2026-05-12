import indexHtml from "./index.html";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Serve index.html for root path and all non-API routes
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(indexHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Image generation API
    if (url.pathname === '/imageGeneration') {
      const apiKey = request.headers.get('x-api-key') || request.headers.get('Authorization')?.replace('Bearer ', '');
      const MINIMAX_KEY = apiKey || '';

      if (!MINIMAX_KEY) {
        return new Response(JSON.stringify({ error: 'Missing API key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const prompt = body.prompt || body.prompt_text || '';

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Missing prompt' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        const upstream = await fetch('https://api.minimaxi.com/v1/image_generation', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MINIMAX_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'image-01',
            prompt: prompt
          })
        });

        const data = await upstream.json();

        let imageUrl = null;
        const candidates = [
          data.image_urls?.[0],
          data.data?.[0]?.url || data.data?.[0]?.base64,
          data.images?.[0]?.url || data.images?.[0],
          data.output?.url,
          data.result?.url,
          data.url
        ];
        for (const c of candidates) {
          if (c && typeof c === 'string' && (c.startsWith('http') || c.startsWith('data:'))) {
            imageUrl = c;
            break;
          }
        }

        return new Response(JSON.stringify({
          success: !!imageUrl,
          imageUrl: imageUrl,
          raw: data
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};

// Vercel Serverless Function - 图片生成 API
// 替代原 Cloudflare Worker 的 /imageGeneration 端点

export default async function handler(request, response) {
  // 只处理 POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const MINIMAX_KEY = request.headers['x-api-key'] || 
    (request.headers['authorization'] || '').replace('Bearer ', '');

  if (!MINIMAX_KEY) {
    return response.status(401).json({ error: 'Missing API key' });
  }

  const body = request.body;
  const prompt = body.prompt || body.prompt_text || '';

  if (!prompt) {
    return response.status(400).json({ error: 'Missing prompt' });
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

    return response.status(200).json({
      success: !!imageUrl,
      imageUrl: imageUrl,
      raw: data
    });

  } catch (e) {
    return response.status(500).json({ error: e.message });
  }
}

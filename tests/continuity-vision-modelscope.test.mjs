import test from 'node:test';
import assert from 'node:assert/strict';
import { prescreen } from '../api/continuity-vision.mjs';

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('vision prescreen falls back to ModelScope VL when DEEPSEEK_API_KEY is absent', async () => {
    const shot = { size: 'WS', camera: 'eye_level，35mm', lens: '35mm' };
    const locked = { subject: '成年人', wardrobe: '大衣', location: '月台', weather: '雨', timeOfDay: '夜间' };
    const viaModelScope = await prescreen({
        imageDataUrl: PNG_1PX, shot, locked, env: { MODELSCOPE_TOKEN: 'ms-vlm-token' },
        fetchImpl: async (url, init) => {
            assert.equal(url, 'https://api-inference.modelscope.cn/v1/chat/completions');
            assert.equal(init.headers.Authorization, 'Bearer ms-vlm-token');
            assert.equal(JSON.parse(init.body).model, 'Qwen/Qwen2.5-VL-72B-Instruct');
            return Response.json({ choices: [{ message: { content: '{"wardrobe":"pass","place-weather":"fail","shot-spec":"pass"}' } }] });
        },
    });
    assert.equal(viaModelScope.available, true);
    assert.equal(viaModelScope.scores['place-weather'], 'fail');
});

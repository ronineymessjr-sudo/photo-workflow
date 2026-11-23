import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeScores, prescreen } from '../api/continuity-vision.mjs';

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('vision prescreen falls back to ModelScope VL when DEEPSEEK_API_KEY is absent', async () => {
    const shot = { size: 'WS', camera: 'eye_level，35mm', lens: '35mm' };
    const locked = { subject: '成年人', wardrobe: '大衣', location: '月台', weather: '雨', timeOfDay: '夜间' };
    const viaModelScope = await prescreen({
        imageDataUrl: PNG_1PX, shot, locked, env: { MODELSCOPE_TOKEN: 'ms-vlm-token' },
        fetchImpl: async (url, init) => {
            assert.equal(url, 'https://api-inference.modelscope.cn/v1/chat/completions');
            assert.equal(init.headers.Authorization, 'Bearer ms-vlm-token');
            assert.equal(JSON.parse(init.body).model, 'Qwen/Qwen3.5-35B-A3B');
            assert.equal(JSON.parse(init.body).enable_thinking, false);
            return Response.json({ choices: [{ message: { content: '{"wardrobe":"pass","place-weather":"fail","shot-spec":"pass"}' } }] });
        },
    });
    assert.equal(viaModelScope.available, true);
    assert.equal(viaModelScope.scores['place-weather'], 'fail');
});

test('vision receives pose and crop requirements and can reject a head-only turn', async () => {
    const shot = {
        size: 'MS', camera: '平视', lens: '50mm',
        action: '躯干斜转三分之四，脸朝画面右侧',
        mustShow: '完整腰结和下缘留量',
        rejectIf: '只有头转、躯干仍正对镜头',
    };
    const result = await prescreen({
        imageDataUrl: PNG_1PX, shot, locked: {}, env: { MODELSCOPE_TOKEN: 'test' },
        fetchImpl: async (_url, init) => {
            const prompt = JSON.parse(init.body).messages[0].content[0].text;
            for (const field of ['action', 'mustShow', 'rejectIf']) assert.ok(prompt.includes(shot[field]), field);
            return Response.json({ choices: [{ message: { content: '{"wardrobe":"pass","shot-spec":"fail"}' } }] });
        },
    });
    assert.deepEqual(mergeScores({}, result.scores), { wardrobe: 'unknown', 'shot-spec': 'fail' });
});

// Probe: can a ModelScope vision model count people reliably enough to gate a shoot?
import fs from 'node:fs';

const TOKEN = process.env.MODELSCOPE_TOKEN;
const MODELS = ['PaddlePaddle/ERNIE-4.5-VL-28B-A3B-PT', 'OpenGVLab/InternVL3_5-241B-A28B'];
const CASES = [
    ['runtime/fs-refix2/shot-02-1-compose.png', 0, '空楼梯'],
    ['runtime/compose-check/shot-06-1-compose.png', 1, '单人全身'],
    ['runtime/fs-refix/shot-02-1-compose.png', 2, '两人'],
];

async function ask(model, file) {
    const b = fs.readFileSync(file);
    const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({
            model,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: `data:image/png;base64,${b.toString('base64')}` } },
                    { type: 'text', text: '数一数画面里有几个人。只输出一个阿拉伯数字。' },
                ],
            }],
            max_tokens: 8,
            temperature: 0,
        }),
        signal: AbortSignal.timeout(90000),
    });
    const text = await response.text();
    let content = null;
    try { content = JSON.parse(text).choices?.[0]?.message?.content; } catch { content = text.slice(0, 120); }
    return { status: response.status, content };
}

(async () => {
    for (const model of MODELS) {
        console.log(`== ${model}`);
        for (const [file, expected, label] of CASES) {
            const { status, content } = await ask(model, file);
            const digits = String(content ?? '').match(/\d/);
            const got = digits ? Number(digits[0]) : null;
            const verdict = got === expected ? 'ok' : 'MISS';
            console.log(`   ${label} 期望 ${expected} 实得 ${got ?? '-'} [${verdict}] ${status} ${JSON.stringify(String(content ?? '').slice(0, 40))}`);
        }
    }
})();

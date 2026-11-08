// Ad-hoc ModelScope runner: submit one task, poll it, save the result.
//
// Exists because the two-stage pipeline needs to be tested directly before it is
// wired into the contract: compose with a text-to-image model, then transfer the
// face with an edit model. Each stage is one call, and holding the raw knobs makes
// it obvious which stage produced a bad frame.
//
//   MODELSCOPE_TOKEN=... node tools/ms-raw.mjs \
//     --model Qwen/Qwen-Image --prompt "..." --size "928*1664" --out runtime/x/a.png
//   MODELSCOPE_TOKEN=... node tools/ms-raw.mjs \
//     --model Qwen/Qwen-Image-Edit-2511 --prompt "..." --image runtime/x/a.png --out runtime/x/b.png

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};
const argAll = name => args.reduce((list, item, index) => (item === `--${name}` ? [...list, args[index + 1]] : list), []);

const TOKEN = process.env.MODELSCOPE_TOKEN || '';
const MODEL = argOf('model') || 'Qwen/Qwen-Image';
const PROMPT = argOf('prompt') || '';
const SIZE = argOf('size') || '';
const OUT = argOf('out') || `runtime/ms-raw/${Date.now()}.png`;
const IMAGES = argAll('image');
const TIMEOUT_MS = Number(argOf('timeout') || 600000);

if (!TOKEN) {
    console.log('缺少 MODELSCOPE_TOKEN');
    process.exit(1);
}
if (!PROMPT) {
    console.log('缺少 --prompt');
    process.exit(1);
}

const api = 'https://api-inference.modelscope.cn';
const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
    'X-ModelScope-Async-Mode': 'true',
};

const images = [];
for (const file of IMAGES) {
    const bytes = await readFile(file);
    images.push(`data:image/png;base64,${bytes.toString('base64')}`);
}

const body = { model: MODEL, prompt: PROMPT };
if (images.length) body.image_url = images;
// Qwen-Image takes "宽*高"; the edit model ignores it, so only send when asked.
if (SIZE) body.size = SIZE;

const started = Date.now();
const submit = await fetch(`${api}/v1/images/generations`, {
    method: 'POST', headers, body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
});
const submitted = await submit.text();
if (!submit.ok) {
    console.log(`提交失败 ${submit.status}: ${submitted.slice(0, 300)}`);
    process.exit(1);
}
let taskId = null;
try { taskId = JSON.parse(submitted).task_id; } catch { /* fall through */ }
if (!taskId) {
    console.log(`没有 task_id: ${submitted.slice(0, 200)}`);
    process.exit(1);
}
console.log(`task ${taskId}`);
console.log(`模型 ${MODEL}${SIZE ? ` | 尺寸 ${SIZE}` : ''}${images.length ? ` | 参考图 ${images.length} 张` : ''}`);

// Poll until terminal or the caller's patience runs out. The task keeps running
// server-side, so the id is printed above and can be collected later by hand.
while (Date.now() - started < TIMEOUT_MS) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const poll = await fetch(`${api}/v1/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${TOKEN}`, 'X-ModelScope-Task-Type': 'image_generation' },
        signal: AbortSignal.timeout(25000),
    }).catch(() => null);
    if (!poll?.ok) continue;
    const state = await poll.json().catch(() => null);
    const status = String(state?.task_status || '').toUpperCase();
    if (status === 'FAILED' || status === 'CANCELED' || status === 'CANCELLED') {
        console.log(`任务失败: ${JSON.stringify(state?.errors || state).slice(0, 300)}`);
        process.exit(1);
    }
    if (status !== 'SUCCEED' && status !== 'SUCCEEDED' && status !== 'SUCCESS') continue;

    const url = state?.output_images?.[0] || state?.data?.[0]?.url;
    if (!url) {
        console.log('成功但没有图片地址');
        process.exit(1);
    }
    const image = await fetch(url, { signal: AbortSignal.timeout(120000) });
    const bytes = Buffer.from(await image.arrayBuffer());
    await mkdir(path.dirname(OUT), { recursive: true });
    await writeFile(OUT, bytes);
    console.log(`ok ${((Date.now() - started) / 1000).toFixed(0)}s ${Math.round(bytes.length / 1024)}KB -> ${OUT}`);
    process.exit(0);
}
console.log(`轮询超过 ${Math.round(TIMEOUT_MS / 1000)}s，任务仍在跑: ${taskId}`);

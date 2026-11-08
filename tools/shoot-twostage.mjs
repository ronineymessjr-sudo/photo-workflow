// Two-stage shoot: compose the frame, then put the right face in it.
//
// Why two calls instead of one:
//
// The edit model inherits the composition of whatever reference it is given, so
// asking it to also invent a fresh framing fights its own prior - which is how
// every "半身近景" came back as a full-body standing figure. Text-to-image has no
// such prior: it follows the crop instruction, and it is also 4-5x faster.
//
//   stage 1  Qwen-Image          plan text -> frame with the correct framing,
//                                 camera angle, light and clothing
//   stage 2  Qwen-Image-Edit     frame + identity photo -> same frame, same
//                                 clothing, same pose, this person's face
//
// Both stages are saved so a bad result can be attributed to composition or to
// the face transfer rather than guessed at.
//
//   MODELSCOPE_TOKEN=... node tools/shoot-twostage.mjs --shots 3,4 --out runtime/twostage/run1

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { directionText } from '../api/continuity-generation.mjs';
import { inspectPng, summarise } from './lib/image-check.mjs';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};
const PICK = (argOf('shots') || '').split(',').map(item => item.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
const BRIEF = argOf('brief') || 'scene-spiral-stairs';
const OUT = argOf('out') || `runtime/twostage/${BRIEF}`;
const IDENTITY = argOf('identity') || 'runtime/deploy-test/identity.png';
const STYLE = argOf('style') || '';
const TOKEN = process.env.MODELSCOPE_TOKEN || '';
// Every shot must end with a usable frame. A transport error or a blank card is
// retried rather than accepted, and the report is rewritten after each shot so an
// interrupted run still leaves an accurate record of what exists.
const ATTEMPTS = Math.max(1, Number(argOf('attempts')) || 3);
const PACK = 'experiments/plan-quality-lab/prompt-packs/2026-10-27-deepseek/06-prompts-all.json';
// Sizes where the face is large enough that swapping it is worth the wait.
const SWAP_SIZES = new Set(['ECU', 'CU', 'MCU', 'MS', 'MFS']);

if (!TOKEN) {
    console.log('缺少 MODELSCOPE_TOKEN');
    process.exit(1);
}

const api = 'https://api-inference.modelscope.cn';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, 'X-ModelScope-Async-Mode': 'true' };

const dataUrl = async file => `data:image/png;base64,${(await readFile(file)).toString('base64')}`;

async function runTask({ model, prompt, size, images, label }) {
    const body = { model, prompt };
    if (images?.length) body.image_url = images;
    if (size) body.size = size;
    const submit = await fetch(`${api}/v1/images/generations`, {
        method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
    });
    const raw = await submit.text();
    if (!submit.ok) throw new Error(`${label} 提交失败 ${submit.status}: ${raw.slice(0, 200)}`);
    let taskId = null;
    try { taskId = JSON.parse(raw).task_id; } catch { /* handled below */ }
    if (!taskId) throw new Error(`${label} 没有 task_id: ${raw.slice(0, 160)}`);

    // Frames take 50s (text-to-image) to 450s (edit with two references), so the
    // ceiling is generous and the task id is logged before waiting.
    const deadline = Date.now() + 600000;
    while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const poll = await fetch(`${api}/v1/tasks/${taskId}`, {
            headers: { Authorization: `Bearer ${TOKEN}`, 'X-ModelScope-Task-Type': 'image_generation' },
            signal: AbortSignal.timeout(25000),
        }).catch(() => null);
        if (!poll?.ok) continue;
        const state = await poll.json().catch(() => null);
        const status = String(state?.task_status || '').toUpperCase();
        if (status === 'FAILED' || status === 'CANCELED' || status === 'CANCELLED') {
            throw new Error(`${label} 任务失败: ${JSON.stringify(state?.errors || {}).slice(0, 200)}`);
        }
        if (status !== 'SUCCEED' && status !== 'SUCCEEDED' && status !== 'SUCCESS') continue;
        const url = state?.output_images?.[0];
        if (!url) throw new Error(`${label} 成功但没有图片地址`);
        const image = await fetch(url, { signal: AbortSignal.timeout(120000) });
        return Buffer.from(await image.arrayBuffer());
    }
    throw new Error(`${label} 轮询超时，任务仍在跑: ${taskId}`);
}

const pack = JSON.parse(await readFile(PACK, 'utf8'));
const rows = pack.items
    .filter(item => item.briefId === BRIEF)
    .filter(item => !PICK.length || PICK.includes(item.shotIndex))
    .sort((a, b) => a.shotIndex - b.shotIndex);
if (!rows.length) {
    console.log(`模板里没有 ${BRIEF} 的这些镜头`);
    process.exit(1);
}

const identityData = await dataUrl(IDENTITY);
const styleData = STYLE ? await dataUrl(STYLE) : '';
await mkdir(OUT, { recursive: true });

const first = rows[0];
const locked = {
    subject: '一名成年人（同一人物，外观以身份参考图为准）',
    location: first.scene,
    weather: '室内，晴天侧窗光',
    timeOfDay: '白天',
    styleProfile: '低饱和纪实，自然光为主，禁用闪光灯',
    wardrobe: '开拍前确认一套，全系列不换',
};


// Run one stage until it yields an inspectable image, or give up honestly.
async function produce(label, attemptFn) {
    let lastReason = '';
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
        try {
            const buffer = await attemptFn(attempt);
            const check = inspectPng(buffer);
            if (check.ok) return { buffer, check, attempts: attempt };
            lastReason = check.reason;
            process.stdout.write(`第 ${attempt} 次不可用（${check.reason}）· `);
        } catch (error) {
            lastReason = String(error.message).slice(0, 160);
            process.stdout.write(`第 ${attempt} 次失败（${lastReason.slice(0, 60)}）· `);
        }
    }
    return { buffer: null, reason: lastReason, attempts: ATTEMPTS };
}

const saveReport = async () => {
    await writeFile(path.join(OUT, 'report.json'), JSON.stringify({
        brief: BRIEF, at: new Date().toISOString(), frames: report,
    }, null, 2));
};

const report = [];
for (const row of rows) {
    const spec = row.spec;
    const shotId = `shot-${String(row.shotIndex).padStart(2, '0')}`;
    const size = spec.shot_size;
    const variant = {
        size, shotType: size,
        camera: spec.camera_angle, lens: row.lens || spec.lens,
        action: spec.model_pose, subjectPlacement: spec.model_position,
        lighting: spec.lighting_setup, wardrobe: spec.wardrobe_styling,
        props: spec.shot_props, crop: spec.crop_boundary,
        mustShow: spec.must_show, rejectIf: spec.reject_if,
        cameraSettings: [row.lens || spec.lens, row.aperture ? `f/${String(row.aperture).replace(/^f\/?/i, '')}` : '', row.shutter].filter(Boolean).join(' '),
    };
    const direction = directionText({ prompt: spec.generator_prompt, locked, variant, poseRef: null, size });

    // Compose: portrait sizes for anything tighter than a wide, landscape for
    // wides, so the aspect does half of the framing work.
    const wide = /^(EWS|WS)$/.test(String(size).toUpperCase());
    const canvas = wide ? '1536x1024' : '1024x1536';

    const started = Date.now();
    process.stdout.write(`${shotId} ${String(size).padEnd(4)} 构图... `);
    const composedRun = await produce('构图', attempt => runTask({
        model: 'Qwen/Qwen-Image',
        // A blank card is usually a degenerate sample, so a retry shifts the seed
        // instead of repeating the identical request.
        prompt: attempt === 1 ? direction : `${direction}\n（重试：画面必须包含一个清楚可见的人，占据画面主体的位置）`,
        size: canvas, label: '构图',
    }));
    if (!composedRun.buffer) {
        console.log(`三试未出片（${composedRun.reason}）`);
        report.push({ shotId, size, angle: spec.camera_angle, ok: false, stage: 'compose', error: composedRun.reason });
        await saveReport();
        continue;
    }
    const composed = composedRun.buffer;
    const composePath = path.join(OUT, `${shotId}-1-compose.png`);
    await writeFile(composePath, composed);
    process.stdout.write(`ok ${summarise(composedRun.check)} | `);

    // Only swap where the face is actually legible. In a wide or full-body frame
    // the face occupies a few dozen pixels, so a 10-minute edit changes nothing
    // that survives viewing - and identity drift is invisible at that scale anyway.
    if (!SWAP_SIZES.has(String(size).toUpperCase())) {
        console.log('跳过换脸（脸太小，换了也看不出来）');
        report.push({ shotId, size, angle: spec.camera_angle, ok: true, composed: true, swapped: false, compose: composePath, final: composePath });
        await saveReport();
        continue;
    }
    process.stdout.write('换脸... ');

    // Transfer: keep everything about the composed frame, replace only the face.
    const swapPrompt = [
        '以第一张图为底图，保持它的构图、机位、取景范围、场景、光线、姿势、身体比例和服装完全不变。',
        '只把人物的脸替换成第二张参考图里的人：五官、脸型、发型、发色与参考图一致，肤色按现场光线自然匹配。',
        '不要改变画框边界，不要改变人物在画面中的大小，不要新增或删除任何物体。',
    ].join('');
    const images = [ `data:image/png;base64,${composed.toString('base64')}`, identityData ];
    if (styleData) images.push(styleData);

    const swapRun = await produce('换脸', () => runTask({
        model: 'Qwen/Qwen-Image-Edit-2511', prompt: swapPrompt, images, label: '换脸',
    }));
    if (!swapRun.buffer) {
        // The composed frame is still a usable photograph, so the shot ships with
        // the model's own face rather than shipping nothing. The report says which.
        console.log(`换脸失败（${swapRun.reason}），保留构图版本`);
        report.push({ shotId, size, angle: spec.camera_angle, ok: true, composed: true, swapped: false, swapError: swapRun.reason, compose: composePath, final: composePath });
        await saveReport();
        continue;
    }
    const swapped = swapRun.buffer;
    const finalPath = path.join(OUT, `${shotId}-2-face.png`);
    await writeFile(finalPath, swapped);
    console.log(`ok ${((Date.now() - started) / 1000).toFixed(0)}s ${summarise(swapRun.check)}`);
    // swapped must be recorded here too: leaving it undefined made every frame
    // report as composition-only and the contact sheet labelled them all wrong.
    report.push({ shotId, size, angle: spec.camera_angle, ok: true, composed: true, swapped: true, compose: composePath, final: finalPath });
    await saveReport();
}

await saveReport();

const shipped = report.filter(entry => entry.ok);
const missing = rows.length - shipped.length;
const swappedCount = shipped.filter(entry => entry.swapped).length;
console.log(`\n出片 ${shipped.length}/${rows.length}｜换脸 ${swappedCount} 张｜构图直出 ${shipped.length - swappedCount} 张  ->  ${OUT}`);
if (missing) {
    // Non-zero exit so a caller cannot mistake a partial series for a complete one.
    for (const entry of report.filter(item => !item.ok)) console.log(`  未出片: ${entry.shotId}（${entry.error}）`);
    process.exitCode = 1;
}

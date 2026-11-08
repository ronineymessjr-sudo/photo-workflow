// Two-phase shooting for async providers (ModelScope).
//
// The image model needs 20-40s while the Pages proxy cuts at 30s, so the API is
// split: POST generate returns a task id (202), then this script polls
// /api/continuity/collect until the frame lands in storage.
//
//   node tools/shoot-async.mjs --brief scene-spiral-stairs --shots 4,8,1
//   node tools/shoot-async.mjs --brief scene-spiral-stairs --shots 4,8,1 --set-as-anchor

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};
const BASE = (argOf('base') || 'https://photo.ronineymessjrstudio.cn').replace(/\/$/, '');
const BRIEF = argOf('brief') || 'scene-spiral-stairs';
const PICK = (argOf('shots') || '').split(',').map(Number).filter(Number.isFinite);
const OUT = argOf('out') || `runtime/ms-${BRIEF}`;
const PROVIDER = argOf('provider') || 'modelscope-qwen-edit';
const PACK = 'experiments/plan-quality-lab/prompt-packs/2026-10-27-deepseek/06-prompts-all.json';
const MAX_POLLS = 40;

// A throwaway identity: the generate route requires a signed-in user.
async function signIn() {
    const response = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `qa-${Date.now()}@example.com`, password: 'ProbeTest2026' }),
        signal: AbortSignal.timeout(30000),
    });
    const body = await response.json();
    if (!body?.token) throw new Error(`登录失败 ${response.status} ${JSON.stringify(body).slice(0, 120)}`);
    return body.token;
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

const token = await signIn();
const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
async function post(pathname, body, timeout = 60000) {
    const response = await fetch(BASE + pathname, {
        method: 'POST', headers: auth, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout),
    });
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 200) }; }
    return { status: response.status, body: parsed };
}

const shots = rows.map(row => ({
    shotId: `shot-${String(row.shotIndex).padStart(2, '0')}`,
    size: row.spec.shot_size,
    camera_angle: row.spec.camera_angle,
    lens: row.lens || row.spec.lens,
    model_pose: row.spec.model_pose,
    model_position: row.spec.model_position,
    generator_prompt: row.spec.generator_prompt,
    lighting_setup: row.spec.lighting_setup,
    wardrobe_styling: row.spec.wardrobe_styling,
    shot_props: row.spec.shot_props,
    crop_boundary: row.spec.crop_boundary,
    must_show: row.spec.must_show,
    reject_if: row.spec.reject_if,
    aperture: row.aperture,
    shutter: row.shutter,
    file: `${BRIEF}__${String(row.shotIndex).padStart(2, '0')}.png`,
}));
const first = rows[0];
console.log(`画笔 ${PROVIDER}｜${shots.length} 镜：${shots.map(shot => `${shot.shotId}/${shot.size}`).join(' ')}\n`);

let group = (await post('/api/continuity/init', {
    input: { theme: first.theme, style: '纪实建筑人像', scene: first.scene, modelDesc: '一名成年人' },
    lockedHints: {
        location: first.scene, weather: '室内，晴天侧窗光', timeOfDay: '白天',
        styleProfile: '低饱和纪实，自然光为主，禁用闪光灯',
    },
    shots,
})).body.group;
if (!group) {
    console.log('建组失败');
    process.exit(1);
}

for (const [role, file] of Object.entries({
    identity: 'runtime/deploy-test/identity.png',
    style: 'runtime/deploy-test/style.png',
    scene: 'runtime/deploy-test/scene.png',
})) {
    const dataUrl = `data:image/png;base64,${(await readFile(file)).toString('base64')}`;
    const uploaded = await post('/api/continuity/asset', { dataUrl, role }, 120000);
    if (!uploaded.body?.assetId) {
        console.log(`上传 ${role} 失败：${JSON.stringify(uploaded.body).slice(0, 160)}`);
        process.exit(1);
    }
    group = (await post('/api/continuity/reference', {
        group, reference: { role, assetId: uploaded.body.assetId, status: 'confirmed', path: uploaded.body.path },
    })).body.group;
}
group = (await post('/api/continuity/master', {
    group, assetId: group.references.find(reference => reference.role === 'identity').assetId, actor: 'human',
})).body.group;
console.log('三档参考 + 主图确认完成\n');

// Closest frame first so the anchor carries the largest face.
const rank = shot => (/ECU|CU/.test(shot.size) ? 0 : /MCU/.test(shot.size) ? 1 : /MS/.test(shot.size) ? 2 : 3);
const ordered = [...shots].sort((a, b) => rank(a) - rank(b));

await mkdir(OUT, { recursive: true });
const report = [];
for (const shot of ordered) {
    process.stdout.write(`${shot.shotId} ${shot.size.padEnd(4)} ${shot.camera_angle.padEnd(10)} 提交... `);
    const started = Date.now();
    const submitted = await post('/api/continuity/generate', { group, shotId: shot.shotId, providerId: PROVIDER });
    if (![200, 202].includes(submitted.status) || !submitted.body?.taskId) {
        console.log(`失败 ${submitted.status} ${JSON.stringify(submitted.body).slice(0, 220)}`);
        report.push({ shotId: shot.shotId, ok: false, status: submitted.status });
        continue;
    }
    const { taskId, seed } = submitted.body;
    process.stdout.write(`task ${String(taskId).slice(0, 10)} 等待... `);

    let done = null;
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const collected = await post('/api/continuity/collect', { taskId, shotId: shot.shotId, seed });
        if (collected.status !== 200) {
            console.log(`收集失败 ${collected.status} ${JSON.stringify(collected.body).slice(0, 200)}`);
            break;
        }
        if (collected.body?.status === 'succeeded') { done = collected.body; break; }
    }
    if (!done) {
        console.log('超时未完成');
        report.push({ shotId: shot.shotId, ok: false, status: 'timeout' });
        continue;
    }

    const image = await fetch(BASE + done.image.path, { signal: AbortSignal.timeout(60000) });
    const bytes = Buffer.from(await image.arrayBuffer());
    await writeFile(path.join(OUT, shot.file), bytes);
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`ok ${elapsed}s seed ${seed} ${Math.round(bytes.length / 1024)}KB`);
    report.push({ shotId: shot.shotId, ok: true, size: shot.size, angle: shot.camera_angle, elapsed: Number(elapsed), seed, file: shot.file });

    if (!group.anchor) {
        const pinned = await post('/api/continuity/anchor', { group, assetId: done.image.assetId, path: done.image.path, shotId: shot.shotId });
        if (pinned.body?.group) {
            group = pinned.body.group;
            console.log(`   设为身份锚点（${shot.shotId}），后续镜头从这张编辑`);
        }
    }
}

console.log(`\n完成 ${report.filter(entry => entry.ok).length}/${shots.length}  ->  ${OUT}`);
await writeFile(path.join(OUT, 'report.json'), JSON.stringify({ base: BASE, provider: PROVIDER, brief: BRIEF, frames: report }, null, 2));

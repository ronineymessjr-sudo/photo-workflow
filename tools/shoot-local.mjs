// Shoot from the local machine, not through the Worker.
//
// Two limits make the Worker the wrong place to call the image model:
//   1. the Pages proxy cuts any request at 30s, and generation takes 20-40s
//   2. a Cloudflare edge request to a mainland API fails outright - the same call
//      from this machine returns in 0.5s
//
// So the local process talks to the model and the Worker only stores the result.
// That keeps the contract, the gate and the asset store intact while avoiding
// both limits.
//
//   MODELSCOPE_TOKEN=... node tools/shoot-local.mjs --brief scene-spiral-stairs --shots 4,8,1

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createGroup, setReference, confirmMaster, setAnchor } from '../api/continuity.mjs';
import { submitModelScope, pollModelScope } from '../api/continuity-generation.mjs';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};
const BRIEF = argOf('brief') || 'scene-spiral-stairs';
const PICK = (argOf('shots') || '').split(',').map(Number).filter(Number.isFinite);
const OUT = argOf('out') || `runtime/local-${BRIEF}`;
const PACK = 'experiments/plan-quality-lab/prompt-packs/2026-10-27-deepseek/06-prompts-all.json';
const TOKEN = process.env.MODELSCOPE_TOKEN || '';
// Composition tests must not be anchored: pinning the first frame would make
// every later shot an edit of it, which hides whether the framing instruction
// itself is working.
const ANCHOR = !args.includes('--no-anchor');

if (!TOKEN) {
    console.log('缺少 MODELSCOPE_TOKEN 环境变量');
    process.exit(1);
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

let group = createGroup({
    input: { theme: first.theme, style: '纪实建筑人像', scene: first.scene, modelDesc: '一名成年人' },
    lockedHints: {
        location: first.scene, weather: '室内，晴天侧窗光', timeOfDay: '白天',
        styleProfile: '低饱和纪实，自然光为主，禁用闪光灯',
    },
    shots,
});

// Local references: real bytes loaded from disk into an in-memory store.
const referenceFiles = {
    identity: 'runtime/deploy-test/identity.png',
    style: 'runtime/deploy-test/style.png',
    scene: 'runtime/deploy-test/scene.png',
};
const memory = new Map();
for (const [role, file] of Object.entries(referenceFiles)) {
    const bytes = await readFile(file);
    const assetId = `local${role}asset`.slice(0, 16);
    memory.set(assetId, bytes);
    group = setReference(group, { role, assetId, status: 'confirmed', path: `/api/continuity/asset/${assetId}` });
}
group = confirmMaster(group, { assetId: group.references.find(reference => reference.role === 'identity').assetId, actor: 'human' });

const store = {
    async put() {},
    async get(key) {
        const match = String(key).match(/continuity\/[a-z]+\/([a-z0-9]+)\./i);
        const bytes = match ? memory.get(match[1]) : null;
        return bytes ? { buffer: bytes, meta: { mime: 'image/png' } } : null;
    },
};

// submitModelScope expects a references array of {role, dataUrl}.
const references = [];
for (const [role, file] of Object.entries(referenceFiles)) {
    const bytes = await readFile(file);
    references.push({ role, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` });
}

const env = { MODELSCOPE_TOKEN: TOKEN };
console.log(`本地直连魔搭｜${shots.length} 镜：${shots.map(shot => `${shot.shotId}/${shot.size}`).join(' ')}\n`);

await mkdir(OUT, { recursive: true });
const report = [];
for (const shot of shots) {
    const started = Date.now();
    process.stdout.write(`${shot.shotId} ${shot.size.padEnd(4)} ${shot.camera_angle.padEnd(10)} 提交... `);
    try {
        const submitted = await submitModelScope({
            env,
            prompt: shot.generator_prompt,
            references,
            variant: {
                size: shot.size, shotType: shot.size, camera: shot.camera_angle, lens: shot.lens,
                action: shot.model_pose, subjectPlacement: shot.model_position,
                lighting: shot.lighting_setup, wardrobe: shot.wardrobe_styling,
                props: shot.shot_props, crop: shot.crop_boundary,
                mustShow: shot.must_show, rejectIf: shot.reject_if,
            },
            poseRef: null,
            anchor: group.anchor,
            locked: group.locked,
            store,
        });
        process.stdout.write(`task ${submitted.taskId} 等待... `);

        let done = null;
        // Measured: 85s with two references, ~190s with three. Poll for 300s and
        // print the full task id so a timeout is recoverable, not wasted.
        for (let attempt = 0; attempt < 60; attempt += 1) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const polled = await pollModelScope({ env, taskId: submitted.taskId });
            if (polled.status === 'succeeded') { done = polled; break; }
        }
        if (!done) {
            console.log('超时');
            report.push({ shotId: shot.shotId, ok: false });
            continue;
        }
        const bytes = Buffer.from(done.base64, 'base64');
        await writeFile(path.join(OUT, shot.file), bytes);
        console.log(`ok ${((Date.now() - started) / 1000).toFixed(1)}s ${Math.round(bytes.length / 1024)}KB`);

        // Feed the finished frame back as the in-memory anchor so later shots are
        // edited from it instead of re-sampling a face.
        if (ANCHOR && !group.anchor) {
            const anchorId = `anchor01frame`.slice(0, 16);
            memory.set(anchorId, bytes);
            group = setAnchor(group, { assetId: anchorId, path: `/api/continuity/asset/${anchorId}`, shotId: shot.shotId });
            console.log(`   设为身份锚点（${shot.shotId}），后续从这张编辑`);
        }
        report.push({ shotId: shot.shotId, ok: true, size: shot.size, angle: shot.camera_angle, seed: submitted.seed, file: shot.file });
    } catch (error) {
        if (error?.code === 'GENERATION_ACCOUNT_UNVERIFIED') {
            console.log('账号未通过校验');
            console.log(`   ${error.message}`);
            console.log('   完成验证后重跑同一条命令即可，不需要改代码。');
            process.exitCode = 2;
            break;
        }
        console.log(`失败 ${error?.code || ''} ${String(error?.message || error).slice(0, 200)}`);
        report.push({ shotId: shot.shotId, ok: false, error: String(error?.message || error).slice(0, 200) });
    }
}

console.log(`\n完成 ${report.filter(entry => entry.ok).length}/${shots.length}  ->  ${OUT}`);

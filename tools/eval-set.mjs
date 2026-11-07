// A fixed evaluation set: the same four frames, the same references, the same
// seeds, whichever provider you point it at.
//
// Why this exists: without a fixed set, every model upgrade is a gamble - you
// cannot tell whether the new model is better, or whether you simply got a
// different result. With one, upgrading becomes a 10-minute measurement instead
// of a leap of faith.
//
//   node tools/eval-set.mjs --provider volcengine-seedream --label seedream-v1
//   node tools/eval-set.mjs --provider cloudflare-flux-klein --label flux-baseline
//
// Both runs land in runtime/eval/<label>/ with a report.json, so two providers
// can be compared frame by frame.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};
const BASE = (argOf('base') || 'https://photo.ronineymessjrstudio.cn').replace(/\/$/, '');
const PROVIDER = argOf('provider') || 'volcengine-seedream';
const LABEL = argOf('label') || PROVIDER;
const OUT = `runtime/eval/${LABEL}`;
const PACK = 'experiments/plan-quality-lab/prompt-packs/2026-10-27-deepseek/06-prompts-all.json';

// Four frames chosen to stress different failure modes:
//   EWS/overhead  can the model keep a person in a wide architectural frame
//   MCU/low_angle can it follow a hard camera angle without flattening it
//   FS/high_angle can it hold composition from above
//   CU/eye_level  is the skin and micro-detail actually photographic
const EVAL_SHOTS = [
    { brief: 'scene-spiral-stairs', index: 1, why: '环境全景 + 俯拍：主体会不会丢' },
    { brief: 'scene-spiral-stairs', index: 4, why: '近景 + 仰拍：机位跟不跟' },
    { brief: 'scene-spiral-stairs', index: 6, why: '全身 + 俯拍：构图稳不稳' },
    { brief: 'scene-spiral-stairs', index: 9, why: '远景 + 俯拍：几何空间对不对' },
];

async function post(pathname, body, timeout = 240000) {
    const response = await fetch(BASE + pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
    });
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 300) }; }
    return { status: response.status, body: parsed };
}

const dataUrl = async file => `data:image/png;base64,${(await readFile(file)).toString('base64')}`;

const pack = JSON.parse(await readFile(PACK, 'utf8'));
const rows = EVAL_SHOTS.map(evalShot => {
    const row = pack.items.find(item => item.briefId === evalShot.brief && item.shotIndex === evalShot.index);
    if (!row) throw new Error(`评测集里的镜头不存在：${evalShot.brief}#${evalShot.index}`);
    return { ...evalShot, row };
});

console.log(`评测集：${rows.length} 个固定镜头  画笔：${PROVIDER}  标签：${LABEL}\n`);
for (const item of rows) {
    console.log(`  #${item.index} ${item.row.spec.shot_size}/${item.row.spec.camera_angle}  ${item.why}`);
}

const first = rows[0].row;
let group = (await post('/api/continuity/init', {
    input: {
        theme: first.theme,
        style: '纪实建筑人像',
        scene: first.scene,
        modelDesc: '一名成年人',
        wardrobeNote: '',
    },
    lockedHints: {
        location: first.scene,
        weather: '室内，晴天侧窗光',
        timeOfDay: '白天',
        styleProfile: '低饱和纪实，自然光为主，禁用闪光灯',
    },
    shots: rows.map(({ row, index }) => ({
        shotId: `shot-${String(index).padStart(2, '0')}`,
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
        file: `eval__${String(index).padStart(2, '0')}.png`,
    })),
})).body.group;

if (!group) {
    console.log('建组失败');
    process.exit(1);
}

// The same three reference images every run, so a provider comparison is fair.
for (const [role, file] of Object.entries({
    identity: 'runtime/deploy-test/identity.png',
    style: 'runtime/deploy-test/style.png',
    scene: 'runtime/deploy-test/scene.png',
})) {
    const uploaded = await post('/api/continuity/asset', { dataUrl: await dataUrl(file), role });
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

await mkdir(OUT, { recursive: true });
const report = [];
for (const item of rows) {
    const shotId = `shot-${String(item.index).padStart(2, '0')}`;
    const started = Date.now();
    process.stdout.write(`  ${shotId} ... `);
    const generated = await post('/api/continuity/generate', { group, shotId, providerId: PROVIDER });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    if (generated.status !== 200) {
        console.log(`失败 ${generated.status} ${JSON.stringify(generated.body).slice(0, 140)}`);
        report.push({ shotId, ok: false, status: generated.status, why: item.why });
        continue;
    }
    const result = generated.body;
    const imageResponse = await fetch(BASE + result.image.path, { signal: AbortSignal.timeout(60000) });
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    const file = `eval__${String(item.index).padStart(2, '0')}.png`;
    await writeFile(path.join(OUT, file), bytes);
    console.log(`ok ${elapsed}s ${Math.round(bytes.length / 1024)}KB seed ${result.seed}${result.anchored ? ' 锚定' : ''}`);
    report.push({
        shotId, ok: true, file, why: item.why,
        elapsed: Number(elapsed), bytes: bytes.length,
        seed: result.seed, anchored: Boolean(result.anchored),
        referencesSent: result.referencesSent,
        promptTokens: Math.round(result.sentPrompt.length / 3.6),
        sentPrompt: result.sentPrompt,
    });
}

const okCount = report.filter(entry => entry.ok).length;
await writeFile(path.join(OUT, 'report.json'), JSON.stringify({
    label: LABEL, provider: PROVIDER, base: BASE, at: new Date().toISOString(), frames: report,
}, null, 2));

console.log(`\n完成 ${okCount}/${rows.length}  ->  ${OUT}`);
console.log('对比两次评测：');
console.log(`  node tools/compare-eval.mjs --a runtime/eval/flux-baseline --b ${OUT}`);

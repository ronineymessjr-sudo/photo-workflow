// Shoot a series from an existing plan template instead of inventing shots.
//
// The templates in 06-prompts-all.json already carry shot size, camera angle,
// lens, pose, subject placement, lighting and crop rules - everything that makes
// a frame look photographed rather than posed. This script feeds those straight
// into the contract so the model cannot fall back to a straight-on standing
// figure.
//
//   node tools/shoot-template.mjs --brief scene-spiral-stairs --shots 1,2,4,6,8,9

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};
const BASE = (argOf('base') || 'https://photo.ronineymessjrstudio.cn').replace(/\/$/, '');
const BRIEF = argOf('brief') || 'scene-spiral-stairs';
const PICK = (argOf('shots') || '').split(',').map(value => Number(value)).filter(Number.isFinite);
const OUT = argOf('out') || `runtime/shoot-${BRIEF}`;
const USE_POSES = args.includes('--poses');
const DRY_RUN = args.includes('--dry-run');
const PROVIDER = 'cloudflare-flux-klein';
const PACK = 'experiments/plan-quality-lab/prompt-packs/2026-10-27-deepseek/06-prompts-all.json';

async function post(pathname, body, timeout = 180000) {
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


// Pose library entries are filtered hard: the catalogue also contains poses that
// are not appropriate for a general shoot. Only neutral standing, seated,
// turning and leaning categories are eligible, and a second pass rejects any
// title that references those categories.
// Only the standard-photography series is eligible. The catalogue's other
// series (full_sexy, duo, upper) contain poses that are not appropriate to feed
// an image model for a general shoot, so they are excluded at the series level
// rather than relying on keyword matching alone.
const POSE_SERIES = 'full_std';
const POSE_BLOCKED = /挤胸|事业线|性感|大胆|趴|跪|M字|后入|骑乘|贴身|正常位|侧卧|撩|劈叉|倒立|吻|翘臀|打开/i;

async function pickPoses(count) {
    const response = await fetch('https://hruiccc.github.io/RuiC-PoseAtlas/data/poses.json', { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return [];
    const data = await response.json();
    const eligible = (data.poses || []).filter(pose =>
        pose.series === POSE_SERIES && !POSE_BLOCKED.test(pose.names?.zh || ''));
    // Spread across camera angles so consecutive frames are not the same view.
    const angles = ['front', 'side', 'diagonal', 'high', 'low', 'front'];
    const picked = [];
    for (let index = 0; index < count && index < eligible.length; index += 1) {
        const pose = eligible[index * 3 % eligible.length];
        const wanted = angles[index % angles.length];
        const variant = (pose.variants || []).find(item => item.angle === wanted) || (pose.variants || [])[0];
        if (!variant?.thumb) continue;
        picked.push({
            id: pose.id,
            title: pose.names?.zh || pose.id,
            imageUrl: `https://hruiccc.github.io/RuiC-PoseAtlas/${variant.thumb}`,
            angle: variant.angle,
        });
    }
    return picked;
}

(async () => {
    const pack = JSON.parse(await readFile(PACK, 'utf8'));
    const rows = pack.items
        .filter(item => item.briefId === BRIEF)
        .filter(item => !PICK.length || PICK.includes(item.shotIndex))
        .sort((a, b) => a.shotIndex - b.shotIndex);
    if (!rows.length) {
        console.log(`模板里没有 ${BRIEF} 的镜头`);
        process.exit(1);
    }
    const first = rows[0];
    console.log(`模板: ${BRIEF}（${first.theme} / ${first.scene}）`);
    console.log(`镜头: ${rows.map(r => `#${r.shotIndex} ${r.spec.shot_size}/${r.spec.camera_angle}`).join('  ')}\n`);

    // The template's own spec fields are what stop every frame looking the same.
    const shots = rows.map(row => ({
        shotId: `shot-${String(row.shotIndex).padStart(2, '0')}`,
        size: row.spec.shot_size,
        camera_angle: row.spec.camera_angle,
        lens: row.lens || row.spec.lens,
        model_pose: row.spec.model_pose,
        model_position: row.spec.model_position,
        generator_prompt: row.spec.generator_prompt,
        // Everything the plan states about this frame, not just the prose.
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

    if (USE_POSES) {
        const poses = await pickPoses(shots.length);
        shots.forEach((shot, index) => { if (poses[index]) shot.poseRef = poses[index]; });
        console.log(`姿势模板: ${poses.map((pose, index) => `${shots[index].shotId}←${pose.angle}/${pose.title}`).join('  ')}\n`);
    }

    const init = await post('/api/continuity/init', {
        input: {
            theme: first.theme,
            style: '纪实建筑人像',
            scene: first.scene,
            modelDesc: '一名成年人，齐肩短发',
            wardrobeNote: '深色针织上衣与长裤',
        },
        lockedHints: {
            location: first.scene,
            weather: '室内，晴天侧窗光',
            timeOfDay: '白天',
            styleProfile: '低饱和纪实，自然光为主，禁用闪光灯',
        },
        shots,
    });
    if (!init.body?.group) {
        console.log(`建组失败 ${init.status}: ${JSON.stringify(init.body).slice(0, 200)}`);
        process.exit(1);
    }
    let group = init.body.group;
    console.log(`建组 ${init.status}  锁定版本 ${group.lockedHash}`);

    for (const [role, file] of Object.entries({
        identity: 'runtime/deploy-test/identity.png',
        style: 'runtime/deploy-test/style.png',
        scene: 'runtime/deploy-test/scene.png',
    })) {
        const uploaded = await post('/api/continuity/asset', { dataUrl: await dataUrl(file), role });
        if (!uploaded.body?.assetId) {
            console.log(`上传 ${role} 失败 ${uploaded.status}: ${JSON.stringify(uploaded.body).slice(0, 160)}`);
            process.exit(1);
        }
        const confirmed = await post('/api/continuity/reference', {
            group, reference: { role, assetId: uploaded.body.assetId, status: 'confirmed', path: uploaded.body.path },
        });
        group = confirmed.body.group;
    }
    group = (await post('/api/continuity/master', {
        group, assetId: group.references.find(r => r.role === 'identity').assetId, actor: 'human',
    })).body.group;
    console.log('三档参考 + 主图确认完成\n');

    await mkdir(OUT, { recursive: true });
    const report = [];
    for (const shot of shots) {
        const started = Date.now();
        process.stdout.write(`${shot.shotId} ${shot.size.padEnd(4)} ${shot.camera_angle.padEnd(10)} ${shot.lens.padEnd(5)} ... `);
        const generated = await post('/api/continuity/generate', { group, shotId: shot.shotId, providerId: PROVIDER });
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        if (generated.status !== 200) {
            console.log(`失败 ${generated.status} ${JSON.stringify(generated.body).slice(0, 180)}`);
            report.push({ shotId: shot.shotId, ok: false });
            continue;
        }
        const result = generated.body;
        const imageResponse = await fetch(BASE + result.image.path, { signal: AbortSignal.timeout(60000) });
        const bytes = Buffer.from(await imageResponse.arrayBuffer());
        await writeFile(path.join(OUT, shot.file), bytes);
        console.log(`ok ${elapsed}s seed ${result.seed} ${Math.round(bytes.length / 1024)}KB`);
        report.push({ shotId: shot.shotId, size: shot.size, angle: shot.camera_angle, ok: true, seed: result.seed, file: shot.file });
    }
    console.log(`\n完成 ${report.filter(r => r.ok).length}/${shots.length}  ->  ${OUT}`);
    await writeFile(path.join(OUT, 'report.json'), JSON.stringify({ base: BASE, brief: BRIEF, lockedHash: group.lockedHash, frames: report }, null, 2));
})();

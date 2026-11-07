// Shoot a short series against the live deployment and save every frame.
//
// One contract, several shots: same identity/style references, same locked
// location and light, only framing and pose change. That is the shape the whole
// pipeline was built for, so this is the honest test of the final output.
//
//   node tools/shoot-series.mjs --base https://photo.ronineymessjrstudio.cn

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};
const BASE = (argOf('base') || 'https://photo.ronineymessjrstudio.cn').replace(/\/$/, '');
const OUT = argOf('out') || 'runtime/shoot-series';
const PROVIDER = 'cloudflare-flux-klein';

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

// A dusk street scene forces the things AI gets wrong: real light falloff,
// mixed colour temperature, a location with wear instead of a clean set.
const SHOTS = [
    {
        shotId: 'shot-01', size: 'WS', lens: '35mm', camera_angle: 'eye_level',
        model_pose: '沿人行道慢慢走，双手插在外套口袋里，视线看前方',
        model_position: '画面右侧三分之一处，留出街道纵深',
        generator_prompt: 'environmental wide shot, wet asphalt reflecting shop signs, pedestrian crossing lines leading into the frame, low golden light from the left',
        file: 'street__01.png',
    },
    {
        shotId: 'shot-02', size: 'MS', lens: '50mm', camera_angle: 'eye_level',
        model_pose: '停在店门口，侧身回头，一只手扶着门框',
        model_position: '画面中央偏左',
        generator_prompt: 'waist-up shot at a shop doorway, warm interior light spilling out, cool blue dusk light outside, hand resting on the door frame',
        file: 'street__02.png',
    },
    {
        shotId: 'shot-03', size: 'MCU', lens: '85mm', camera_angle: 'eye_level',
        model_pose: '微微低头，抬手把碎发别到耳后',
        model_position: '画面中央',
        generator_prompt: 'head-and-shoulders shot, hand lifting hair behind the ear, neon sign bokeh behind, mixed magenta and tungsten light on the face',
        file: 'street__03.png',
    },
    {
        shotId: 'shot-04', size: 'ECU', lens: '135mm', camera_angle: 'eye_level',
        model_pose: '直视镜头，表情平静，不笑',
        model_position: '眼睛在画面上三分之一',
        generator_prompt: 'tight facial close-up, window blind shadows across one cheek, shallow depth of field, visible skin pores and peach fuzz, slight under-exposure',
        file: 'street__04.png',
    },
];

(async () => {
    console.log(`目标: ${BASE}\n`);

    const init = await post('/api/continuity/init', {
        input: {
            theme: '黄昏city街头人像',
            style: '纪实街拍',
            scene: '老城区街道，湿地面，商铺灯箱，傍晚六点半',
            modelDesc: '一名成年人，齐肩短发',
            wardrobeNote: '深色大衣，围巾',
            extra: '禁用补光，保留街头真实质感',
        },
        lockedHints: {
            location: '老城区街道，湿地面与商铺灯箱',
            weather: '刚下过雨的阴天傍晚',
            timeOfDay: '傍晚六点半，天光将暗',
            styleProfile: '纪实街拍，低饱和，自然光',
        },
        shots: SHOTS,
    });
    if (!init.body?.group) {
        console.log(`建组失败 ${init.status}: ${JSON.stringify(init.body).slice(0, 200)}`);
        process.exit(1);
    }
    let group = init.body.group;
    console.log(`建组 ${init.status}  锁定版本 ${group.lockedHash}  镜头 ${group.shots.length}`);

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
        console.log(`参考 ${role.padEnd(8)} ${uploaded.body.assetId}`);
    }

    const master = await post('/api/continuity/master', {
        group, assetId: group.references.find(r => r.role === 'identity').assetId, actor: 'human',
    });
    group = master.body.group;
    console.log('主图确认 human\n');

    await mkdir(OUT, { recursive: true });
    const report = [];
    for (const shot of SHOTS) {
        const started = Date.now();
        process.stdout.write(`${shot.shotId} ${shot.size.padEnd(4)} ${shot.lens.padEnd(6)} ... `);
        const generated = await post('/api/continuity/generate', { group, shotId: shot.shotId, providerId: PROVIDER });
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        if (generated.status !== 200) {
            console.log(`失败 ${generated.status} ${JSON.stringify(generated.body).slice(0, 200)}`);
            report.push({ shotId: shot.shotId, ok: false, status: generated.status });
            continue;
        }
        const result = generated.body;
        const imageResponse = await fetch(BASE + result.image.path, { signal: AbortSignal.timeout(60000) });
        const bytes = Buffer.from(await imageResponse.arrayBuffer());
        const outputPath = path.join(OUT, shot.file);
        await writeFile(outputPath, bytes);
        console.log(`ok ${elapsed}s  seed ${result.seed}  ${Math.round(bytes.length / 1024)}KB  -> ${shot.file}`);
        report.push({ shotId: shot.shotId, ok: true, elapsed, seed: result.seed, bytes: bytes.length, file: shot.file });
    }

    console.log(`\n完成 ${report.filter(r => r.ok).length}/${SHOTS.length}`);
    await writeFile(path.join(OUT, 'report.json'), JSON.stringify({ base: BASE, lockedHash: group.lockedHash, frames: report }, null, 2));
})();

// End-to-end run against the DEPLOYED stack.
//
// Proves the thing that could not be proven locally: the Pages Function proxy,
// the Workers AI binding and the continuity gate all working together on the
// real deployment. Run with:
//   node tools/e2e-deployed.mjs --base https://preview-proxy.photo-workflow.pages.dev
//
// Nothing here fakes a step; if the gate refuses or the model errors, it prints
// the actual status and exits non-zero.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};
const BASE = (argOf('base') || 'https://preview-proxy.photo-workflow.pages.dev').replace(/\/$/, '');
const OUT_DIR = argOf('out') || 'runtime/deploy-test/result';

async function post(pathname, body, timeout = 120000) {
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

async function dataUrlOf(file) {
    const bytes = await readFile(file);
    return `data:image/png;base64,${bytes.toString('base64')}`;
}

const files = {
    identity: 'runtime/deploy-test/identity.png',
    style: 'runtime/deploy-test/style.png',
    scene: 'runtime/deploy-test/scene.png',
};

(async () => {
    console.log(`目标: ${BASE}\n`);

    // 1) Contract
    const init = await post('/api/continuity/init', {
        input: {
            theme: '白底影棚人像',
            style: '纪实棚拍',
            scene: '纯白无缝背景影棚，柔光箱正面光',
            modelDesc: '一名成年人，自然短发',
            wardrobeNote: '白色露肩上衣',
        },
        shots: [{
            shotId: 'shot-01', size: 'MS', lens: '85mm', camera_angle: 'eye_level',
            model_pose: '正面站姿，双手自然垂下，看镜头',
            model_position: '画面中央',
            generator_prompt: 'waist-up studio portrait, plain white seamless background, soft frontal light',
            file: 'studiotest__01.png',
        }],
    });
    if (!init.body?.group) {
        console.log(`① 建组失败: ${init.status} ${JSON.stringify(init.body).slice(0, 200)}`);
        process.exit(1);
    }
    let group = init.body.group;
    console.log(`① 建组 ${init.status}  锁定版本 ${group.lockedHash}`);

    // 2) References - uploaded as bytes, not filenames
    for (const [role, file] of Object.entries(files)) {
        const dataUrl = await dataUrlOf(file);
        const uploaded = await post('/api/continuity/asset', { dataUrl, role }, 180000);
        if (!uploaded.body?.assetId) {
            console.log(`② 上传 ${role} 失败: ${uploaded.status} ${JSON.stringify(uploaded.body).slice(0, 200)}`);
            process.exit(1);
        }
        const confirmed = await post('/api/continuity/reference', {
            group,
            reference: { role, assetId: uploaded.body.assetId, status: 'confirmed', path: uploaded.body.path },
        });
        group = confirmed.body.group;
        console.log(`② ${role.padEnd(8)} ${uploaded.status}  ${uploaded.body.assetId}  ${Math.round((uploaded.body.bytes || 0) / 1024)}KB`);
    }

    // 3) The gate must refuse before a human confirms the master frame
    const early = await post('/api/continuity/generate', { group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein' });
    console.log(`③ 未确认主图就生成: ${early.status} ${early.body?.code || ''}`);

    // 4) Master frame
    const master = await post('/api/continuity/master', {
        group,
        assetId: group.references.find(reference => reference.role === 'identity').assetId,
        actor: 'human',
    });
    group = master.body.group;
    console.log(`④ 主图确认 actor=${group.master.confirmedBy}`);

    // 5) Real generation - one shot, one call
    console.log('⑤ 正在调 Cloudflare Workers AI（可能要 20-60 秒）...');
    const started = Date.now();
    const generated = await post('/api/continuity/generate', {
        group, shotId: 'shot-01', providerId: 'cloudflare-flux-klein',
    }, 180000);
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    if (generated.status !== 200) {
        console.log(`⑤ 生成失败 ${generated.status} ${JSON.stringify(generated.body).slice(0, 400)}`);
        process.exit(1);
    }
    const result = generated.body;
    console.log(`⑤ 生成成功 ${elapsed}s`);
    console.log(`   provider: ${result.provider} / ${result.adapter}`);
    console.log(`   seed: ${result.seed}   尺寸: ${result.size}`);
    console.log(`   qc: ${JSON.stringify(result.qc)}`);
    console.log(`   图片: ${result.image.assetId} (${Math.round((result.image.bytes || 0) / 1024)}KB)`);

    // 6) Fetch the produced bytes back through the same proxy
    const imageResponse = await fetch(BASE + result.image.path, { signal: AbortSignal.timeout(60000) });
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    await mkdir(OUT_DIR, { recursive: true });
    const outputPath = path.join(OUT_DIR, 'studiotest__01.png');
    await writeFile(outputPath, bytes);
    console.log(`⑥ 取回成品 ${imageResponse.status} ${bytes.length} 字节 -> ${outputPath}`);
})();

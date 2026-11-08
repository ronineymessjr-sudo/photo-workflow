// Dry-run a template frame and print the exact prompt that would be sent.
//
// Generation costs Workers AI neurons and today's free allocation is finite, so
// checking "did the plan actually reach the model" should not require burning a
// generation. This runs the real assembly path with a stubbed AI binding.
//
//   node tools/preview-prompt.mjs --brief scene-spiral-stairs --shots 1

import { readFile } from 'node:fs/promises';
import { createGroup, setReference, confirmMaster } from '../api/continuity.mjs';
import { generateShot } from '../api/continuity-generation.mjs';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};
const BRIEF = argOf('brief') || 'scene-spiral-stairs';
const SHOTS = (argOf('shots') || '').split(',').map(Number).filter(Number.isFinite);
const PROVIDER = argOf('provider') || 'cloudflare-flux-klein';
const PACK = 'experiments/plan-quality-lab/prompt-packs/2026-10-27-deepseek/06-prompts-all.json';

const pack = JSON.parse(await readFile(PACK, 'utf8'));
const rows = pack.items
    .filter(item => item.briefId === BRIEF)
    .filter(item => !SHOTS.length || SHOTS.includes(item.shotIndex))
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
    poseRef: {
        id: 'preview-pose',
        title: '站立・回眸顾盼',
        imageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/full_single_P017_front.jpg',
        angle: 'front',
    },
}));

let group = createGroup({
    input: { theme: rows[0].theme, style: '纪实建筑人像', scene: rows[0].scene },
    lockedHints: { location: rows[0].scene, weather: '室内，晴天侧窗光', timeOfDay: '白天', styleProfile: '低饱和纪实，自然光为主' },
    shots,
});
for (const role of ['identity', 'scene', 'style']) {
    group = setReference(group, { role, assetId: `preview-${role}-asset`, status: 'confirmed', path: `/api/continuity/asset/preview-${role}-asset` });
}
group = confirmMaster(group, { assetId: 'preview-identity-asset', actor: 'human' });

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const store = { async put() {}, async get() { return { buffer: PNG, meta: { mime: 'image/png' } }; } };
// Stand-in for the real translation call so the preview shows the finished
// English prompt without spending neurons. It echoes the Chinese back as a
// marker, which makes it obvious when a field would reach the model untranslated.
let translateCalls = 0;
const env = {
    ARK_API_KEY: 'preview-stub',
    MODELSCOPE_TOKEN: 'preview-stub',
    AI: {
        async run(model, payload) {
            if (String(model).includes('llama')) {
                translateCalls += 1;
                const input = payload?.messages?.at(-1)?.content || '';
                return { response: `[EN] ${input}` };
            }
            return { image: PNG.toString('base64') };
        },
    },
};

for (const shot of shots) {
    const result = await generateShot({
        group, shotId: shot.shotId, providerId: PROVIDER,
        env, store,
        // Stub whichever upstream the selected provider talks to.
        fetchImpl: async url => {
            // ModelScope is two-phase: submit returns a task id, then the task is
            // polled. Both shapes have to be stubbed or the preview cannot reach
            // the assembled prompt.
            if (String(url).includes('modelscope') && String(url).includes('/images/generations')) {
                return new Response(JSON.stringify({ task_id: 'preview-task', task_status: 'PENDING' }), {
                    status: 200, headers: { 'content-type': 'application/json' },
                });
            }
            if (String(url).includes('modelscope') && String(url).includes('/v1/tasks/')) {
                return new Response(JSON.stringify({ task_status: 'SUCCEED', output_images: ['https://cdn.example/out.png'] }), {
                    status: 200, headers: { 'content-type': 'application/json' },
                });
            }
            if (String(url).includes('ark.cn-beijing.volces.com')) {
                return new Response(JSON.stringify({ data: [{ b64_json: PNG.toString('base64') }] }), {
                    status: 200, headers: { 'content-type': 'application/json' },
                });
            }
            return new Response(PNG, { status: 200, headers: { 'content-type': 'image/jpeg' } });
        },
    });
    console.log(`\n${'='.repeat(78)}`);
    console.log(`${shot.shotId}  ${shot.size}  ${shot.camera_angle}  ${shot.lens}  参考图 ${result.referencesSent} 张  seed ${result.seed}`);
    console.log(`${'='.repeat(78)}`);
    console.log(result.sentPrompt);
}
console.log(`\n翻译调用: ${translateCalls} 次（真环境会把中文段落换成英文）`);
console.log('\n以上是实际会发给模型的提示词。检查要点：');
console.log('  · 光线（顶光/侧窗/禁用闪光灯）在不在');
console.log('  · 姿势与机位是否具体');
console.log('  · must contain / reject and redo 两段是否带上');
console.log('  · Reference image 3 的姿势说明是否带上');

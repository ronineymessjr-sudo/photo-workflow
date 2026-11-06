import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { handleAiPlan } from '../api/ai-plan.mjs';

// Explicit live test: sends synthetic briefs to the anonymous free endpoint.
const directory = process.argv[2];
if (!directory) throw new Error('Provide an evidence output directory');
await mkdir(directory, { recursive: true });
const cases = [
    { id: 'rain-high-angle', theme: '雨夜城市纪实', scene: '安全步行街', modelDesc: '一位成年人物', duration: '1小时', people: '1', extra: '所有镜头高机位俯拍，人物左下角，完整全身。无助手、无闪光灯，不进入机动车道。' },
    { id: 'window-portrait', theme: '窗边自然人像', scene: '小房间的一扇窗旁', modelDesc: '一位成年人物', duration: '1小时', people: '1', extra: '只有50mm镜头，用窗户自然光。没有闪光灯、反光板或助手。站姿和坐姿均可，不爬窗，不拍床铺。' },
    { id: 'two-friends', theme: '朋友毕业纪实', scene: '校园步道', modelDesc: '两位成年朋友，不是情侣', duration: '1小时', people: '2', extra: '双人镜头，动作以交流和并肩行走为主。不要牵手、拥抱、亲吻，不进入车道。仅现有35mm镜头，自然光。' },
];
const evidence = [];
for (const item of cases) {
    const { id, ...input } = item;
    const started = Date.now();
    let provider = {};
    const result = await handleAiPlan({ provider: 'pollinations-free', model: 'openai', input }, { ENABLE_EXPERIMENTAL_FREE_AI: 'true' }, { fetchImpl: async (url, options) => {
        const response = await fetch(url, options);
        const raw = await response.clone().text();
        await writeFile(resolve(directory, `${id}.raw.json`), raw);
        try {
            const payload = JSON.parse(raw);
            provider = { httpStatus: response.status, reportedModel: payload.model, usage: payload.usage, finishReason: payload.choices?.[0]?.finish_reason };
        } catch { provider = { httpStatus: response.status }; }
        return response;
    } });
    const shots = result.body.shotList || [];
    const checks = { completeStructuredPlan: result.status === 200, uniqueShots: new Set(shots.map(s => s.directorContract.shot_language)).size === shots.length };
    if (id === 'rain-high-angle' && shots.length) {
        checks.allHighAngle = shots.every(s => s.directorContract.camera_angle === 'high_angle');
        checks.allFullBodyOrWider = shots.every(s => ['FS', 'WS', 'EWS'].includes(s.directorContract.shot_size));
        checks.allLowerLeft = shots.every(s => /左下|lower.left/i.test(s.composition));
    }
    if (id === 'window-portrait' && shots.length) checks.only50mm = shots.every(s => /50/.test(s.focalLength));
    if (id === 'two-friends' && shots.length) checks.only35mm = shots.every(s => /35/.test(s.focalLength));
    const record = { id, input, elapsedMs: Date.now() - started, ...provider, checks, result };
    await writeFile(resolve(directory, `${id}.result.json`), JSON.stringify(record, null, 2));
    evidence.push({ id, status: result.status, elapsedMs: record.elapsedMs, shots: shots.length, ...provider, checks });
    console.log(JSON.stringify(evidence.at(-1)));
}
await writeFile(resolve(directory, 'summary.json'), JSON.stringify(evidence, null, 2));

// Real-model / real-pipeline plan quality evaluation.
// Runs the SAME briefs through a chosen backend and applies the same
// hard-constraint checks used by the production plan route.
// Backends:
//   director  - local deterministic engine at 127.0.0.1:8004 (no key needed)
//   deepseek  - production handleAiPlan code path with a real DeepSeek key
//               (set DEEPSEEK_API_KEY in the environment; never passed on argv)
// Usage: node real-model-eval.mjs --backend director [--out results/real-model-<date>]
// This script performs REAL generation for the chosen backend. It is not an
// offline unit test.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDirectorPlan } from '../../api/director-plan.mjs';
import { handleAiPlan, validateHardConstraints, extractHardConstraints } from '../../api/ai-plan.mjs';

const DIRECTOR_BASE = process.env.DIRECTOR_BASE || 'http://127.0.0.1:8004';

// Brief 1-3 reuse the 2026-10-25 acceptance briefs for comparability.
// Brief 4 is a new low-constraint case for diversity.
const BRIEFS = [
    {
        id: 'rain-high-angle',
        input: {
            theme: '雨夜城市纪实', style: '自然纪实，克制', modelDesc: '一位成年人物，无助理',
            scene: '有可安全站立低台阶的步行街，路灯环境光，不进入机动车道', mood: '安静',
            duration: '1小时', people: '1',
            extra: '所有镜头高机位俯拍，人物位于左下角且完整全身；仅35mm；无助手、闪光灯或反光板；不建议屋顶、脚手架、攀爬或进入车道；写明动作口令、摄影师站位、灯光利用与替代方案。',
        },
    },
    {
        id: 'window-portrait',
        input: {
            theme: '窗边人像', style: '安静，自然', modelDesc: '一位成年人物',
            scene: '室内窗边，窗帘可调', mood: '柔和',
            duration: '1小时', people: '1',
            extra: '仅50mm；只用窗户自然光；无闪光灯、反光板或助手；不爬窗、不拍摄床铺。',
        },
    },
    {
        id: 'two-friends-graduation',
        input: {
            theme: '双人毕业纪实', style: '自然纪实', modelDesc: '两位成年朋友',
            scene: '大学校园主干道与教学楼前', mood: '轻松',
            duration: '1小时', people: '2',
            extra: '仅35mm；自然光；两位朋友以交流、并肩行走为主；不牵手、不拥抱、不亲吻；无助手或额外道具。',
        },
    },
    {
        id: 'overcast-park',
        input: {
            theme: '阴天公园散步纪实', style: '自然纪实，克制', modelDesc: '一位成年人物',
            scene: '有步行道和长椅的城市公园，阴天散射光', mood: '平静',
            duration: '1小时', people: '1',
            extra: '仅50mm；无助手、闪光灯或反光板；长椅只作环境不安排坐姿特写；不进入水域；各镜头动作需明确不同。',
        },
    },
];

const requiredContract = ['shot_language', 'model_pose', 'photographer_position', 'lens', 'model_position', 'lighting_setup', 'crop_boundary', 'must_show', 'reject_if', 'execution_note', 'generator_prompt', 'shot_size', 'camera_angle'];
const sizes = ['ECU', 'CU', 'MCU', 'MS', 'MFS', 'FS', 'WS', 'EWS'];
const angles = ['eye_level', 'high_angle', 'ground_level', 'overhead', 'low_angle'];

function bigrams(text) {
    const clean = String(text || '').replace(/\s+/g, '');
    const set = new Set();
    for (let i = 0; i < clean.length - 1; i++) set.add(clean.slice(i, i + 2));
    return set;
}

function similarity(a, b) {
    const sa = bigrams(a); const sb = bigrams(b);
    if (!sa.size || !sb.size) return 0;
    let overlap = 0;
    for (const g of sa) if (sb.has(g)) overlap++;
    return overlap / Math.max(sa.size, sb.size);
}

export function evaluatePlan(shotPlans, input) {
    const findings = [];
    const add = msg => findings.push(msg);
    const shots = Array.isArray(shotPlans) ? shotPlans : [];
    if (shots.length < 2) add(`返回镜头数不足（${shots.length}）`);

    const names = shots.map(s => String(s?.shot_language || '').trim());
    const dupNames = names.filter((n, i) => n && names.indexOf(n) !== i);
    if (dupNames.length) add(`镜头名称重复：${[...new Set(dupNames)].join('、')}`);

    for (const [i, shot] of shots.entries()) {
        const missing = requiredContract.filter(k => {
            if (k === 'photographer_position') return !(String(shot?.photographer_position || '').trim() || String(shot?.photographer_position || '').trim());
            return typeof shot?.[k] !== 'string' || !shot[k].trim();
        });
        if (missing.length) add(`镜头${i + 1} 缺字段：${missing.join('、')}`);
        if (shot?.shot_size && !sizes.includes(shot.shot_size)) add(`镜头${i + 1} 景别代号不支持：${shot.shot_size}`);
        if (shot?.camera_angle && !angles.includes(shot.camera_angle)) add(`镜头${i + 1} 机位代号不支持：${shot.camera_angle}`);
        const pose = String(shot?.model_pose || '').trim();
        if (pose && pose.length < 8) add(`镜头${i + 1} 动作口令过短，无法指导执行：“${pose}”`);
    }

    // Substantively similar actions despite different names.
    for (let i = 0; i < shots.length; i++) {
        for (let j = i + 1; j < shots.length; j++) {
            const sim = similarity(shots[i]?.model_pose, shots[j]?.model_pose);
            if (sim >= 0.7) add(`镜头${i + 1} 与镜头${j + 1} 动作实质相近（相似度 ${(sim * 100).toFixed(0)}%）：“${String(shots[i]?.model_pose).slice(0, 14)}…” vs “${String(shots[j]?.model_pose).slice(0, 14)}…”`);
        }
    }

    // Production hard-constraint validator (same code as the Worker route).
    const violations = validateHardConstraints(shots, input);
    findings.push(...violations.map(v => `硬约束：${v}`));

    const constraints = extractHardConstraints(input);
    return {
        findings: [...new Set(findings)],
        hardConstraintCount: violations.length,
        activeConstraints: {
            fullBodyAll: constraints.fullBodyAll, downwardAll: constraints.downwardAll,
            lowerLeftAll: constraints.lowerLeftAll, focalLengthOnly: constraints.focalLengthOnly,
            prohibited: constraints.prohibited.map(p => p.label),
        },
        pass: findings.length === 0,
    };
}

function extractShotPlans(plan) {
    return (plan?.shotList || []).map(s => s.directorContract || {});
}

async function runDirector(input) {
    const plan = await createDirectorPlan(input, { baseUrl: DIRECTOR_BASE });
    return { plan, shotPlans: extractShotPlans(plan), meta: { source: plan.director?.source } };
}

async function runDeepseek(input, apiKey) {
    const result = await handleAiPlan({ provider: 'deepseek', apiKey, model: 'deepseek-flash', input }, {}, { fetchImpl: fetch });
    if (result.status !== 200) throw new Error(`API ${result.status}: ${result.body?.code || ''} ${result.body?.error || ''}`);
    return { plan: result.body, shotPlans: extractShotPlans(result.body), meta: { source: result.body.director?.source, provider: result.body.director?.provider } };
}

const backend = process.argv.includes('--backend') ? process.argv[process.argv.indexOf('--backend') + 1] : 'director';
const outDir = resolve(import.meta.dirname, process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : `results/real-model-${new Date().toISOString().slice(0, 10)}-${backend}`);
await mkdir(outDir, { recursive: true });

if (backend === 'deepseek' && typeof process.env.DEEPSEEK_API_KEY !== 'string') {
    console.error('需要环境变量 DEEPSEEK_API_KEY（不要写入文件或命令行历史）');
    process.exit(2);
}

const summary = [];
for (const brief of BRIEFS) {
    const started = Date.now();
    let record = { id: brief.id, backend, startedAt: new Date().toISOString(), input: brief.input };
    try {
        const run = backend === 'director' ? await runDirector(brief.input) : await runDeepseek(brief.input, process.env.DEEPSEEK_API_KEY);
        const elapsed = ((Date.now() - started) / 1000).toFixed(3);
        const evaluation = evaluatePlan(run.shotPlans, brief.input);
        record = { ...record, elapsedSeconds: Number(elapsed), shotCount: run.shotPlans.length, requestedShots: run.plan.director?.desiredShotCount, meta: run.meta, evaluation, shots: run.shotPlans, planTitle: run.plan.title, submittedBrief: run.plan.director?.submittedBrief };
        console.log(`[${brief.id}] ${backend} ${elapsed}s, ${run.shotPlans.length} 镜头, ${evaluation.findings.length} 项问题${evaluation.pass ? '（全部通过）' : ''}`);
    } catch (error) {
        record = { ...record, error: String(error.message || error), elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(3)) };
        console.log(`[${brief.id}] ${backend} 失败：${record.error}`);
    }
    summary.push(record);
    await writeFile(resolve(outDir, `${brief.id}.json`), JSON.stringify(record, null, 2), 'utf8');
}

await writeFile(resolve(outDir, 'summary.json'), JSON.stringify({
    backend, ranAt: new Date().toISOString(), totalBriefs: BRIEFS.length,
    pass: summary.filter(r => r.evaluation?.pass).length,
    perBrief: summary.map(r => ({ id: r.id, shotCount: r.shotCount, elapsedSeconds: r.elapsedSeconds, pass: r.evaluation?.pass ?? null, findings: r.evaluation?.findings ?? [], error: r.error })),
}), null, 2);
console.log(`\n结果目录：${outDir}`);

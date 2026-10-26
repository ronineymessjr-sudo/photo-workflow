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
import { evaluatePlan } from './eval-checks.mjs';

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
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;
const briefsToRun = only ? BRIEFS.filter(b => b.id === only) : BRIEFS;
if (only && !briefsToRun.length) { console.error(`未知用例：${only}`); process.exit(2); }
const outDir = resolve(import.meta.dirname, process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : `results/real-model-${new Date().toISOString().slice(0, 10)}-${backend}`);
await mkdir(outDir, { recursive: true });

async function loadDeepseekKey() {
    if (typeof process.env.DEEPSEEK_API_KEY === 'string' && process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
    // Fall back to the local key relay (user pasted the key at 127.0.0.1:8129).
    try {
        const response = await fetch('http://127.0.0.1:8129/key', { signal: AbortSignal.timeout(3000) });
        if (!response.ok) return null;
        const data = await response.json();
        return typeof data.apiKey === 'string' && data.apiKey ? data.apiKey : null;
    } catch {
        return null;
    }
}

if (backend === 'deepseek' && !await loadDeepseekKey()) {
    console.error('未找到 DeepSeek 密钥：请设置环境变量 DEEPSEEK_API_KEY，或在本机密钥中转页 http://127.0.0.1:8129/ 粘贴密钥后重试');
    process.exit(2);
}

const summary = [];
for (const brief of briefsToRun) {
    const started = Date.now();
    let record = { id: brief.id, backend, startedAt: new Date().toISOString(), input: brief.input };
    try {
        const run = backend === 'director' ? await runDirector(brief.input) : await runDeepseek(brief.input, await loadDeepseekKey());
        const elapsed = ((Date.now() - started) / 1000).toFixed(3);
        const evaluation = evaluatePlan(run.shotPlans, brief.input, validateHardConstraints);
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
    backend, ranAt: new Date().toISOString(), totalBriefs: briefsToRun.length,
    pass: summary.filter(r => r.evaluation?.pass).length,
    perBrief: summary.map(r => ({ id: r.id, shotCount: r.shotCount, elapsedSeconds: r.elapsedSeconds, pass: r.evaluation?.pass ?? null, findings: r.evaluation?.findings ?? [], error: r.error })),
}), null, 2);
console.log(`\n结果目录：${outDir}`);

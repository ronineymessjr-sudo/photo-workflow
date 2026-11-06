// Sub-agent-as-provider harness: evaluates plan generation by a language
// model through the EXACT production prompt and validation pipeline.
//
//   node subagent-harness.mjs capture   # write the exact prompts a real
//                                        provider would receive to <out>/prompts/
//   node subagent-harness.mjs replay    # feed raw model answers (raw-<id>.txt)
//                                        through handleAiPlan's full validation
//                                        and write results/<out>/ records
//
// No network calls: the "provider" is whatever text is placed in raw-<id>.txt.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { handleAiPlan, validateHardConstraints, extractHardConstraints } from '../../api/ai-plan.mjs';
import { evaluatePlan } from './eval-checks.mjs';

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

const request = input => ({ provider: 'deepseek', apiKey: 'subagent-eval-not-a-real-key', model: 'deepseek-flash', input });

async function captureProviderRequest(input) {
    let captured = null;
    await handleAiPlan(request(input), {}, {
        fetchImpl: async (_url, init) => {
            captured = JSON.parse(init.body);
            throw new Error('CAPTURED');
        },
    });
    if (!captured) throw new Error('未能捕获生产提示词');
    return captured;
}

const mode = process.argv[2] || 'capture';
const briefsIdx = process.argv.indexOf('--briefs');
if (briefsIdx > -1) {
    const external = JSON.parse(readFileSync(resolve(import.meta.dirname, process.argv[briefsIdx + 1]), 'utf8'));
    if (!Array.isArray(external) || !external.length || external.some(b => !b?.id || !b?.input)) throw new Error('--briefs 文件格式应为 [{id, input}]');
    BRIEFS.length = 0;
    BRIEFS.push(...external);
    console.log(`已加载外部用例 ${BRIEFS.length} 组：${BRIEFS.map(b => b.id).join('、')}`);
}
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;
const briefsToRun = only ? BRIEFS.filter(b => b.id === only) : BRIEFS;
if (only && !briefsToRun.length) { console.error(`未知用例：${only}`); process.exit(2); }
const runTag = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'real-model-2026-10-26-subagent';
const outDir = resolve(import.meta.dirname, runTag);
await mkdir(resolve(outDir, 'prompts'), { recursive: true });

if (mode === 'capture') {
    for (const brief of briefsToRun) {
        const captured = await captureProviderRequest(brief.input);
        const system = captured.messages.find(m => m.role === 'system')?.content || '';
        const user = captured.messages.find(m => m.role === 'user')?.content || '';
        await writeFile(resolve(outDir, 'prompts', `${brief.id}.system.txt`), system, 'utf8');
        await writeFile(resolve(outDir, 'prompts', `${brief.id}.user.txt`), user, 'utf8');
        console.log(`[${brief.id}] 提示词已捕获：system ${system.length} 字 + user ${user.length} 字`);
    }
    console.log(`\n请把模型按提示词生成的纯 JSON 保存为 ${resolve(outDir, 'raw-<brief-id>.txt')}，然后运行 replay。`);
} else if (mode === 'replay') {
    const summary = [];
    for (const brief of briefsToRun) {
        const started = Date.now();
        let raw;
        try {
            raw = await readFile(resolve(outDir, `raw-${brief.id}.txt`), 'utf8');
        } catch {
            console.log(`[${brief.id}] 缺少 raw-${brief.id}.txt，跳过`);
            continue;
        }
        const captured = await captureProviderRequest(brief.input);
        const record = { id: brief.id, backend: 'subagent-glm', startedAt: new Date().toISOString(), input: brief.input };
        const result = await handleAiPlan(request(brief.input), {}, {
            fetchImpl: async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: raw } }] }),
        });
        const elapsed = Number(((Date.now() - started) / 1000).toFixed(3));
        if (result.status !== 200) {
            record.status = result.status; record.error = result.body?.error; record.code = result.body?.code; record.elapsedSeconds = elapsed;
            console.log(`[${brief.id}] 生产校验拒绝（${result.status} ${result.body?.code}）`);
        } else {
            const shotPlans = (result.body?.shotList || []).map(s => s.directorContract || {});
            const evaluation = evaluatePlan(shotPlans, brief.input, validateHardConstraints);
            Object.assign(record, {
                elapsedSeconds: elapsed, shotCount: shotPlans.length,
                requestedShots: result.body.director?.desiredShotCount,
                productionValidation: 'pass', evaluation, shots: shotPlans,
                planTitle: result.body.title,
            });
            console.log(`[${brief.id}] 生产校验通过，${shotPlans.length} 镜头，${evaluation.findings.length} 项附加问题${evaluation.pass ? '（全部通过）' : ''}`);
        }
        summary.push(record);
        await writeFile(resolve(outDir, `${brief.id}.json`), JSON.stringify(record, null, 2), 'utf8');
    }
    await writeFile(resolve(outDir, 'summary.json'), JSON.stringify({
        backend: 'subagent-glm', ranAt: new Date().toISOString(), totalBriefs: summary.length,
        productionPass: summary.filter(r => r.productionValidation === 'pass').length,
        evalPass: summary.filter(r => r.evaluation?.pass).length,
        perBrief: summary.map(r => ({ id: r.id, status: r.status || 200, shotCount: r.shotCount, elapsedSeconds: r.elapsedSeconds, productionValidation: r.productionValidation || 'rejected', code: r.code, error: r.error, pass: r.evaluation?.pass ?? null, findings: r.evaluation?.findings ?? [] })),
    }), null, 2);
    console.log(`\n结果目录：${outDir}`);
} else {
    console.error('用法：node subagent-harness.mjs capture|replay [--briefs <file>] [--only <id>] [--out <dir>]');
    process.exit(2);
}

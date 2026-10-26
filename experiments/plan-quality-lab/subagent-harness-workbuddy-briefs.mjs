// One-off handoff run: WorkBuddy briefs A-D (WORKBUDDY-DEEPSEEK-REAL-PLAN-TEST.md).
// Original harness kept untouched per handoff instructions.
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
import { resolve } from 'node:path';
import { handleAiPlan, validateHardConstraints, extractHardConstraints } from '../../api/ai-plan.mjs';
import { evaluatePlan } from './eval-checks.mjs';

const BRIEFS = [
    { // 交接单 A 自然人像（弱约束）
        id: 'a-natural-portrait',
        input: {
            theme: '周末公园自然人像', style: '纪实、自然', modelDesc: '一名成年人',
            scene: '公园步道与草地', mood: '松弛', duration: '1小时', people: '1',
            extra: '只使用现场自然光，无助手，不预设道具、服装或具体建筑',
        },
    },
    { // 交接单 B 强约束（同 2026-10-25 雨夜需求族）
        id: 'b-strong-constraints',
        input: {
            theme: '雨夜城市纪实人像', style: '克制、电影感', modelDesc: '一名成年人',
            scene: '有安全低台阶的步行街，路灯环境光', mood: '安静', duration: '1小时', people: '1',
            extra: '所有镜头都要高机位俯拍，人物在画面左下角，完整全身。仅使用35mm镜头；无助手、闪光灯或反光板。不得建议屋顶、脚手架、攀爬或进入机动车道。',
        },
    },
    { // 交接单 C 双人关系（2 小时，预计 12 组）
        id: 'c-two-persons',
        input: {
            theme: '双人毕业纪念', style: '自然纪实', modelDesc: '两名成年同学，未指定亲密关系',
            scene: '校园开放庭院，午后自然光', mood: '轻松', duration: '2小时', people: '2',
            extra: '避免情侣化动作；不使用未提供的学位服、花束、道具和额外灯光',
        },
    },
    { // 交接单 D 产品与人物（3 小时）
        id: 'd-product-person',
        input: {
            theme: '手持香水的品牌静物与人物', style: '干净、克制', modelDesc: '一名成年模特',
            scene: '室内白墙与现有桌面', mood: '精致但真实', duration: '3小时', people: '1',
            extra: '只有一瓶香水、一张桌子和现场自然光；需要产品正面、手持关系和环境交代，不添加鲜花、反光板或额外布景',
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
const outDir = resolve(import.meta.dirname, `results/real-model-2026-10-26-workbuddy-retry`);
await mkdir(resolve(outDir, 'prompts'), { recursive: true });

if (mode === 'capture') {
    for (const brief of BRIEFS) {
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
    for (const brief of BRIEFS) {
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
    console.error('用法：node subagent-harness.mjs capture|replay');
    process.exit(2);
}

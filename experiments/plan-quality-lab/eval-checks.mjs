// Shared plan-quality checks for real-model / sub-agent evaluation runs.
// Mirrors the production hard-constraint validator plus soft quality
// findings (duplicate names, short action commands, near-duplicate actions).

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

export function evaluatePlan(shotPlans, input, validateHardConstraints) {
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
        // Product/landscape briefs legitimately have no-person shots.
        const personless = /^(模特不入画|无人物)/.test(pose);
        if (pose && pose.length < 8 && !personless) add(`镜头${i + 1} 动作口令过短，无法指导执行：“${pose}”`);
    }

    for (let i = 0; i < shots.length; i++) {
        if (/^(模特不入画|无人物)/.test(String(shots[i]?.model_pose || '').trim())) continue;
        for (let j = i + 1; j < shots.length; j++) {
            if (/^(模特不入画|无人物)/.test(String(shots[j]?.model_pose || '').trim())) continue;
            const sim = similarity(shots[i]?.model_pose, shots[j]?.model_pose);
            if (sim >= 0.7) add(`镜头${i + 1} 与镜头${j + 1} 动作实质相近（相似度 ${(sim * 100).toFixed(0)}%）：“${String(shots[i]?.model_pose).slice(0, 14)}…” vs “${String(shots[j]?.model_pose).slice(0, 14)}…”`);
        }
    }

    const violations = validateHardConstraints ? validateHardConstraints(shots, input) : [];
    findings.push(...violations.map(v => `硬约束：${v}`));

    return { findings: [...new Set(findings)], hardConstraintCount: violations.length, pass: findings.length === 0 };
}

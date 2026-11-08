// Shared plan-quality checks for real-model / sub-agent evaluation runs.
// Mirrors the production hard-constraint validator plus soft quality
// findings (duplicate names, short action commands, near-duplicate actions).

const requiredContract = ['shot_language', 'model_pose', 'photographer_position', 'lens', 'model_position', 'wardrobe_styling', 'lighting_setup', 'shot_props', 'crop_boundary', 'must_show', 'reject_if', 'execution_note', 'generator_prompt', 'shot_size', 'camera_angle'];
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

const DISTANCE = /(?:约|距|距离|保持在)?\s*\d+(?:\.\d+)?\s*(?:米|m\b|厘米|cm\b)|贴(?:近)?(?:脸|面部|玻璃)|一臂|半米|咫尺|贴脸|近距离平视|\babout \d+(?:\.\d+)? ?m\b|\bwithin \d+(?:\.\d+)? ?m\b|\bdistance of \d+/i;
const UNSAFE_POSITION = /站在车道|车道中线|探出池边|探身出池|下水拍摄|踩入花田|踩踏花朵|站在天台边缘|爬上护栏|站上窗台/;

function focalLengths(text) {
    return [...String(text || '').matchAll(/\b(\d{1,3}(?:\s*-\s*\d{1,3})?)\s*mm\b/gi)]
        .map(match => match[1].replace(/\s/g, '').toLowerCase());
}

function promptPoseConflict(shot) {
    const pose = String(shot?.model_pose || '');
    const prompt = String(shot?.generator_prompt || '');
    const seated = /坐|蹲|跪/.test(pose);
    const standing = /站立|站在|站定|站姿/.test(pose);
    const personless = /^(?:模特不入画|无人物)/.test(pose.trim());
    const promptPersonless = /\b(?:no person|without people|empty scene)\b/i.test(prompt);
    const promptMentionsPerson = /\b(?:portrait|woman|man|model|person|human|face|body)\b/i.test(prompt);
    if (seated && /\b(?:standing|stand upright|standing pose)\b/i.test(prompt)) return '动作写坐/蹲/跪，英文提示词却要求站立';
    if (standing && /\b(?:sitting|seated|sits|sitting pose)\b/i.test(prompt)) return '动作写站立，英文提示词却要求坐姿';
    if (personless && promptMentionsPerson && !promptPersonless) return '动作写无人物入画，英文提示词却要求人物';
    if (!personless && promptPersonless) return '动作要求人物入画，英文提示词却排除人物';
    return '';
}

export function evaluatePlan(shotPlans, input, validateHardConstraints, validatePhotographerFeasibility) {
    const findings = [];
    const add = msg => findings.push(msg);
    const shots = Array.isArray(shotPlans) ? shotPlans : [];
    if (shots.length < 2) add(`返回镜头数不足（${shots.length}）`);

    const names = shots.map(s => String(s?.shot_language || '').trim());
    const dupNames = names.filter((n, i) => n && names.indexOf(n) !== i);
    if (dupNames.length) add(`镜头名称重复：${[...new Set(dupNames)].join('、')}`);

    for (const [i, shot] of shots.entries()) {
        const missing = requiredContract.filter(k => {
            if (k === 'photographer_position') return !String(shot?.photographer_position || '').trim();
            return typeof shot?.[k] !== 'string' || !shot[k].trim();
        });
        if (missing.length) add(`镜头${i + 1} 缺字段：${missing.join('、')}`);
        if (shot?.shot_size && !sizes.includes(shot.shot_size)) add(`镜头${i + 1} 景别代号不支持：${shot.shot_size}`);
        if (shot?.camera_angle && !angles.includes(shot.camera_angle)) add(`镜头${i + 1} 机位代号不支持：${shot.camera_angle}`);
        const pose = String(shot?.model_pose || '').trim();
        // Product/landscape briefs legitimately have no-person shots.
        const personless = /^(模特不入画|无人物)/.test(pose);
        if (pose && pose.length < 8 && !personless) add(`镜头${i + 1} 动作口令过短，无法指导执行：“${pose}”`);
        const position = String(shot?.photographer_position || '');
        if (position.trim() && !DISTANCE.test(position)) add(`镜头${i + 1} 摄影师站位未给出可执行距离`);
        if (UNSAFE_POSITION.test(position.replace(/(?:不得|不要|禁止|严禁|切勿).{0,12}(?:车道|池边|天台边缘|窗台|护栏|花田|泳池)/g, ''))) add(`镜头${i + 1} 摄影师站位存在明显安全风险：“${position.slice(0, 36)}”`);

        const plannedLens = focalLengths(shot?.lens);
        const promptLens = focalLengths(shot?.generator_prompt);
        if (plannedLens.length && promptLens.length && !plannedLens.includes(promptLens[0])) add(`镜头${i + 1} 焦段字段与英文提示词冲突`);
        const poseConflict = promptPoseConflict(shot);
        if (poseConflict) add(`镜头${i + 1} ${poseConflict}`);
    }

    if (typeof validatePhotographerFeasibility === 'function') {
        findings.push(...validatePhotographerFeasibility(shots).map(finding => `摄影可行性：${finding}`));
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

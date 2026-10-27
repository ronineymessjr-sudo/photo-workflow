// Visual QC gate.
//
// The planning model must not declare its own success. Each image is scored on
// the seven checks from the methodology; a DeepSeek vision pass can pre-screen,
// but a human confirmation is required for the final verdict on key shots.
export const QC_ITEMS = [
    { id: 'identity', label: '人物身份是否漂移', humanRequired: true },
    { id: 'wardrobe', label: '服装是否改变', humanRequired: false },
    { id: 'place-weather', label: '地点与天气是否一致', humanRequired: false },
    { id: 'shot-spec', label: '镜头要求是否实现（景别/角度/焦段）', humanRequired: false },
    { id: 'anatomy', label: '人数与肢体是否正常', humanRequired: true },
    { id: 'face-sharp', label: '面部是否清晰、无畸变', humanRequired: false },
    { id: 'style-match', label: '构图与风格是否贴近风格参考', humanRequired: true },
];

export const VERDICT = {
    PASS: 'pass',
    RETRY: 'retry',
    HUMAN: 'needs-human',
};

/**
 * @param {Record<string, 'pass'|'fail'|'unknown'>} scores 每项判定
 * @param {{ reviewer?: 'vision'|'human', humanConfirmed?: boolean }} options
 */
export function judge(scores = {}, options = {}) {
    const failed = [];
    const unknown = [];
    for (const item of QC_ITEMS) {
        const score = scores[item.id];
        if (score === 'fail') failed.push(item.id);
        else if (score !== 'pass') unknown.push(item.id);
    }
    const needsHuman = QC_ITEMS.filter(item => item.humanRequired).map(item => item.id);
    const humanPending = needsHuman.some(id => scores[id] !== 'pass') || options.humanConfirmed !== true;

    let verdict = VERDICT.PASS;
    if (failed.length) verdict = VERDICT.RETRY;
    else if (unknown.length || humanPending) verdict = VERDICT.HUMAN;

    return {
        verdict,
        failed,
        unknown,
        requiresHuman: needsHuman,
        reviewer: options.reviewer || 'none',
        // Retry scope is a single shot, never the whole series.
        retryScope: verdict === VERDICT.RETRY ? 'single-shot' : 'none',
    };
}

export function describeVerdict(result) {
    if (result.verdict === VERDICT.PASS) return '通过';
    if (result.verdict === VERDICT.RETRY) return `重做本镜（未过：${result.failed.join('、')}）`;
    return `待人工确认（未判定：${[...result.failed, ...result.unknown].join('、') || '关键项需人眼'}）`;
}

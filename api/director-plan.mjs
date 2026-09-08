// Shared by the local bridge and the authenticated Worker route.
export async function createDirectorPlan(input, { baseUrl, fetchImpl = fetch } = {}) {
    if (!baseUrl) throw new Error('DIRECTOR_NOT_CONFIGURED');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_BRIEF');
    const fields = ['theme', 'style', 'modelDesc', 'scene', 'mood', 'duration', 'people', 'extra'];
    const labels = ['主题', '风格', '模特描述', '场景', '情绪', '时长', '人数', '用户补充及限制'];
    const brief = fields.map((key, i) => {
        if (input[key] != null && typeof input[key] !== 'string') throw new Error('INVALID_BRIEF');
        return input[key] ? `${labels[i]}：${input[key]}` : '';
    }).filter(Boolean).join('\n');
    if ((!input.theme && !input.modelDesc) || brief.length > 2000) throw new Error('INVALID_BRIEF');
    const requestId = `workflow-${crypto.randomUUID()}`;
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/v1/photoatelier/shoot-plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, brief, output_count: 3 }),
        signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`DIRECTOR_UPSTREAM_${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.shot_plans) || !result.shot_plans.length) throw new Error('DIRECTOR_INVALID_RESPONSE');
    const text = value => typeof value === 'string' ? value : '';
    const shotList = result.shot_plans.map((shot, index) => ({
        id: `${requestId}-${index}`, scene: input.scene || '场地待确认',
        description: text(shot.model_pose), shotSize: text(shot.framing),
        method: text(shot.photographer_position), focalLength: text(shot.lens),
        composition: text(shot.model_position), lighting: text(shot.lighting_setup),
        props: '以实际场地和已有资源为准', angle: text(shot.camera_angle),
        mood: input.mood || '待确认', duration: 0,
        notes: `裁切：${text(shot.crop_boundary)}；必须呈现：${text(shot.must_show)}；拒绝：${text(shot.reject_if)}`,
        lightingSetup: text(shot.lighting_setup), priority: '待人工确认',
        alternative: text(shot.execution_note), camera: {},
        directorContract: shot,
    }));
    return {
        title: input.theme || '摄影方案', input, savedAt: new Date().toISOString(),
        style: input.style || '', images: [], shotList,
        sections: [
            { ti: '你的本次需求', ic: '📝', c: [brief] },
            { ti: '摄影 Agent 接入记录', ic: '🎬', c: [
                `请求：${requestId}`, '已调用 Director 拍摄方案接口；不是重新训练生图权重。',
                '本次为三个候选镜头；焦距、站位与现场时长需人工确认。',
                '方案服务目前使用检索与规则编排，不能保证完全理解所有语义；请逐项审核。',
            ] },
            ...shotList.map((shot, i) => ({ ti: `镜头 ${i + 1}`, ic: '📷', c: [
                shot.description, `摄影师：${shot.method}`, `模特：${shot.composition}`,
                `光线：${shot.lighting}`, shot.notes,
            ] })),
        ],
        director: { requestId, source: 'director-shoot-plan', submittedBrief: brief,
            reviewRequired: true, imageGenerationConnected: true,
            imageGenerationMode: 'local-candidate-review-only', generationCandidates: [] },
    };
}

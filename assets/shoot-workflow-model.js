(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.ShootWorkflowModel = api;
})(typeof window === 'object' ? window : globalThis, function () {
    const fields = ['title', 'description', 'method', 'composition', 'shotSize', 'focalLength', 'lighting', 'notes'];
    function shots(plan, legacy = []) {
        const source = !plan.workflowRevision && legacy.length ? legacy : (plan.shotList || plan.shots || []);
        return source.map((shot, i) => ({ ...shot, id: String(shot.id || `${plan.id}-shot-${i + 1}`) }));
    }
    function referenceUrl(value) {
        if (!String(value || '').trim()) return '';
        const url = new URL(String(value).trim());
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('参考链接只能使用公开的 HTTP / HTTPS 地址');
        return url.href;
    }
    function editShot(plan, list, shotId, patch) {
        const index = list.findIndex(s => s.id === shotId);
        if (index < 0) throw new Error('分镜不存在');
        const previous = list[index];
        const next = { ...previous };
        for (const field of fields) {
            if (patch[field] !== undefined) next[field] = String(patch[field]).trim().slice(0, 2000);
        }
        if (!next.title || !next.description) throw new Error('请填写拍摄画面和人物动作');
        const duration = Number(patch.duration ?? previous.duration ?? 0);
        if (!Number.isFinite(duration) || duration < 0 || duration > 480) throw new Error('预计用时须为 0–480 分钟');
        next.duration = duration;
        next.reference = {
            url: referenceUrl(patch.referenceUrl ?? previous.reference?.url),
            purpose: String(patch.referencePurpose ?? previous.reference?.purpose ?? '').trim().slice(0, 500),
            synthetic: patch.synthetic === undefined ? !!previous.reference?.synthetic : !!patch.synthetic
        };
        if (next.reference.url && !next.reference.purpose) throw new Error('请说明这张参考借鉴什么');
        next.lightingSetup = next.lighting;
        next.revision = (previous.revision || 0) + 1;
        // Keep the original Director contract as provenance, never silently reuse it after visual edits.
        const visualChanged = fields.some(f => next[f] !== previous[f]);
        if (visualChanged && next.directorContract) {
            next.contractNeedsReview = true;
            next.generatedOriginal = previous.generatedOriginal || Object.fromEntries([...fields, 'lightingSetup'].map(f => [f, previous[f] ?? '']));
        }
        const shotList = list.map((s, i) => i === index ? next : s);
        return { ...plan, shotList, workflowRevision: (plan.workflowRevision || 0) + 1, updatedAt: new Date().toISOString() };
    }
    function restoreGenerated(plan, shotId) {
        const previous = plan.shotList.find(s => s.id === shotId);
        if (!previous?.generatedOriginal) throw new Error('没有可恢复的生成稿');
        const restored = { ...previous, ...previous.generatedOriginal, contractNeedsReview: false, revision: (previous.revision || 0) + 1 };
        delete restored.generatedOriginal;
        return { ...plan, shotList: plan.shotList.map(s => s.id === shotId ? restored : s), workflowRevision: (plan.workflowRevision || 0) + 1, updatedAt: new Date().toISOString() };
    }
    function session(plan, schedule, saved = {}) {
        const list = shots(plan);
        const ids = list.map(s => s.id);
        const order = [...new Set([...(saved.order || []), ...ids])].filter(id => ids.includes(id));
        const records = { ...(saved.records || {}) };
        for (const shot of list) {
            const previous = records[shot.id];
            if (previous?.status === 'done' && (previous.shotRevision || 0) !== (shot.revision || 0)) {
                records[shot.id] = { ...previous, status: 'retake', changeReason: '分镜已修改，请重新核对' };
            }
        }
        return { ...saved, planId: String(plan.id), scheduleId: String(schedule.id), order, records, confirmations: saved.confirmations || {} };
    }
    function record(state, shotId, patch) {
        if (!state.order.includes(shotId)) throw new Error('分镜不属于本次拍摄');
        if (patch.status && !['pending', 'done', 'retake'].includes(patch.status)) throw new Error('无效拍摄状态');
        return { ...state, records: { ...state.records, [shotId]: { ...state.records[shotId], ...patch, updatedAt: new Date().toISOString() } } };
    }
    function move(state, shotId, offset) {
        const order = [...state.order], from = order.indexOf(shotId), to = from + offset;
        if (from >= 0 && to >= 0 && to < order.length) [order[from], order[to]] = [order[to], order[from]];
        return { ...state, order };
    }
    function packetVersion(plan, schedule) {
        return JSON.stringify([plan.workflowRevision || 0, schedule.date, schedule.time, schedule.location, schedule.callDetails || {}]);
    }
    function packet(plan, schedule, role) {
        const list = shots(plan);
        return {
            title: plan.title, date: schedule.date, time: schedule.time || '待确认',
            location: schedule.location || plan.input?.scene || '待确认', role,
            details: schedule.callDetails || {},
            rows: list.map((s, i) => ({ number: i + 1, title: s.title || s.scene, action: s.description,
                instruction: role === 'model' ? s.description : role === 'assistant' ? [s.focalLength, s.lightingSetup || s.lighting, s.props].filter(Boolean).join('；') : [s.method, s.composition].filter(Boolean).join('；'),
                duration: Number(s.duration) || 0, reference: s.reference || null }))
        };
    }
    return { shots, referenceUrl, editShot, restoreGenerated, session, record, move, packet, packetVersion };
});

(function () {
    window.generateDirectorPlan = async function (input) {
        if (window.PhotoAtelierOwnAI?.isEnabled()) return window.PhotoAtelierOwnAI.generatePlan(input);
        const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
        if (local) {
            const response = await fetch('/api/director/plan', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input), signal: AbortSignal.timeout(65000)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '摄影 Agent 未连接');
            return data;
        }
        return window.api.request('/api/director/plan', 'POST', input, 65000);
    };
    window.generateDirectorCandidate = async function (input) {
        const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
        const request = async (path, data, timeout = 28000) => {
            if (!local) return window.api.request(path, 'POST', data, timeout);
            const response = await fetch(path, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data), signal: AbortSignal.timeout(timeout),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || '候选生图失败');
            return payload;
        };
        let result = await request('/api/director/generate-candidate', input);
        if (result.status !== 'pending' || !result.taskId) return result;
        const deadline = Date.now() + 7 * 60 * 1000;
        while (Date.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, 4000));
            result = await request('/api/director/collect-candidate', { taskId: result.taskId });
            if (result.status !== 'pending') return result;
        }
        throw new Error('魔搭仍在生成；任务已保留，可稍后重试查询同一任务。');
    };
    window.buildDirectorIdentityWorkflow = async function (input) {
        const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
        if (!local) throw new Error('身份锁定工作流暂仅接入本机 Director，云端尚未配置受保护的参考图存储');
        const response = await fetch('/api/director/identity-lock-workflow', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input), signal: AbortSignal.timeout(65000)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '身份锁定工作流创建失败');
        return data;
    };
})();

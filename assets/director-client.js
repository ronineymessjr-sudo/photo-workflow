(function () {
    window.generateDirectorPlan = async function (input) {
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
        return window.api.request('/api/director/plan', 'POST', input);
    };
    window.generateDirectorCandidate = async function (input) {
        const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
        if (!local) throw new Error('候选生图暂仅接入本机 Director，云端未配置受保护的生图服务');
        const response = await fetch('/api/director/generate-candidate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input), signal: AbortSignal.timeout(130000)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '候选生图失败');
        return data;
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

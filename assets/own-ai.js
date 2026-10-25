(async function () {
    const byId = id => document.getElementById(id);
    if (!byId('ownAiSettings') || !window.api) return;
    const provider = byId('ownAiProvider'), model = byId('ownAiModel'), key = byId('ownAiKey');
    const status = byId('ownAiStatus'), consent = byId('ownAiConsent');
    let active = null, catalog = [];
    window.PhotoAtelierOwnAI = {
        isEnabled: () => Boolean(active),
        async generatePlan(input) {
            if (!active) throw new Error('请先在设置中接入自己的 AI');
            const config = active;
            return window.api.request('/api/ai/plan', 'POST', { ...config, input }, 100000);
        },
    };
    byId('ownAiEnable').addEventListener('click', () => {
        const selected = catalog.find(p => p.id === provider.value);
        if (!selected || !/^[a-z0-9][a-z0-9._:/-]{0,119}$/i.test(model.value.trim()) || !key.value.trim() || !consent.checked) {
            status.textContent = '请选择服务商、填写模型和密钥，并确认上方数据传递及费用说明。'; return;
        }
        active = { provider: selected.id, model: model.value.trim(), apiKey: key.value.trim() };
        key.value = '';
        status.textContent = `本次生成将使用 ${selected.name} / ${active.model}。尚未调用；生成时才会消耗供应商额度。`;
    });
    byId('ownAiClear').addEventListener('click', () => {
        active = null; key.value = ''; consent.checked = false;
        status.textContent = '已断开并清除本次密钥；下一次生成恢复原有入口。';
    });
    const showEndpoint = () => {
        active = null;
        key.value = '';
        byId('ownAiEndpoint').textContent = catalog.find(p => p.id === provider.value)?.endpoint || '';
        consent.checked = false;
        status.textContent = '未接入。此入口只生成文字方案，不生成图片。';
    };
    provider.addEventListener('change', showEndpoint);
    consent.addEventListener('change', () => {
        if (!consent.checked) {
            active = null;
            status.textContent = '授权已取消，当前不会调用自己的 AI。';
        }
    });
    try {
        const result = await window.api.request('/api/ai/providers', 'GET');
        catalog = Array.isArray(result.providers) ? result.providers : [];
        provider.replaceChildren(...catalog.map(p => {
            const option = document.createElement('option'); option.value = p.id; option.textContent = p.name; return option;
        }));
        showEndpoint();
    } catch {
        status.textContent = 'AI 接入接口尚不可用。当前未启用，不影响原有方案。';
        byId('ownAiEnable').disabled = true;
    }
})();

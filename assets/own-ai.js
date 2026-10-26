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
        if (!selected || !/^[a-z0-9][a-z0-9._:/-]{0,119}$/i.test(model.value.trim()) || (selected.requiresKey !== false && !key.value.trim()) || !consent.checked) {
            status.textContent = '请选择服务商、填写模型和密钥，并确认上方数据传递及费用说明。'; return;
        }
        active = { provider: selected.id, model: model.value.trim(), ...(selected.requiresKey === false ? {} : { apiKey: key.value.trim() }) };
        key.value = '';
        status.textContent = selected.requiresKey === false
            ? '本次生成将使用免费匿名接口。可能限流或不可用，不会自动切换收费服务。'
            : `本次生成将使用 ${selected.name} / ${active.model}。尚未调用；生成时才会消耗供应商额度。`;
    });
    byId('ownAiClear').addEventListener('click', () => {
        active = null; key.value = ''; consent.checked = false;
        status.textContent = '已断开并清除本次密钥；下一次生成恢复原有入口。';
    });
    const showEndpoint = () => {
        active = null;
        key.value = '';
        const selected = catalog.find(p => p.id === provider.value);
        const free = selected?.requiresKey === false;
        byId('ownAiEndpoint').textContent = selected?.endpoint || '';
        key.disabled = free;
        key.placeholder = free ? '免费试用无需密钥' : '仅本次打开页面有效';
        model.readOnly = free;
        model.value = selected?.suggestedModel || '';
        byId('ownAiConsentText').textContent = free
            ? '允许将本次拍摄需求经 Photo Workflow 转交 Pollinations 免费匿名接口。不要填写隐私或客户机密；该免费接口可能限流、失效，不会自动转为付费调用。'
            : selected?.freeOnly
                ? '允许将密钥和本次拍摄需求经 Photo Workflow 转交 OpenRouter 及其免费模型供应商。此入口限制零价格路由；仍需要免费账号密钥，可能限流。不要填写客户机密。'
                : '允许将我填写的密钥和拍摄需求经 Photo Workflow 服务端转交上方供应商；调用可能消耗我在该供应商的付费额度。密钥不保存，刷新页面后需重新填写。';
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

(async function () {
    const byId = id => document.getElementById(id);
    if (!byId('ownAiSettings') || !window.api) return;
    const provider = byId('ownAiProvider'), model = byId('ownAiModel'), key = byId('ownAiKey');
    const status = byId('ownAiStatus'), consent = byId('ownAiConsent');
    const remember = byId('ownAiRemember'), rememberLabel = byId('ownAiRememberLabel');
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(window.location?.hostname);
    let active = null, catalog = [];
    const changed = () => window.dispatchEvent?.(new Event('photo-ai-state'));
    async function aiRequest(path, method, body, timeout = 10000) {
        if (!local) return window.api.request(path, method, body, timeout);
        const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(timeout) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'AI 请求失败');
        return data;
    }
    window.PhotoAtelierOwnAI = {
        isEnabled: () => Boolean(active),
        async generatePlan(input) {
            if (!active) throw new Error('请先在设置中接入自己的 AI');
            const config = active;
            return aiRequest('/api/ai/plan', 'POST', { ...config, input }, 100000);
        },
        async extractBrief(conversation) {
            if (!active) throw new Error('请先在设置中接入自己的 AI');
            return aiRequest('/api/ai/brief', 'POST', { ...active, conversation }, 50000);
        },
    };
    byId('ownAiEnable').addEventListener('click', () => {
        const selected = catalog.find(p => p.id === provider.value);
        if (!selected || !/^[a-z0-9][a-z0-9._:/-]{0,119}$/i.test(model.value.trim()) || (selected.requiresKey !== false && !key.value.trim()) || !consent.checked) {
            status.textContent = '请选择服务商、填写模型和密钥，并确认上方数据传递及费用说明。'; return;
        }
        const config = { provider: selected.id, model: model.value.trim(), ...(selected.requiresKey === false ? {} : { apiKey: key.value.trim() }) };
        const activate = value => {
            active = value; key.value = '';
            status.textContent = value.useSaved ? `已保存 ${selected.name} / ${config.model}；下次打开自动载入，调用时验证服务。` : selected.requiresKey === false
                ? '本次生成将使用免费匿名接口。可能限流或不可用，不会自动切换收费服务。'
                : `本次生成将使用 ${selected.name} / ${config.model}。尚未调用；生成时才会消耗供应商额度。`;
            changed();
        };
        if (local && remember?.checked && selected.requiresKey !== false) {
            status.textContent = '正在保存到本机 Windows 账户…';
            const controls = [provider, model, key, consent, remember, byId('ownAiEnable'), byId('ownAiClear')];
            controls.forEach(control => { control.disabled = true; });
            aiRequest('/api/ai/local-config', 'POST', config).then(() => activate({ useSaved: true }))
                .catch(() => { status.textContent = '保存失败，未启用模型；请检查本机服务和系统权限。'; })
                .finally(() => { controls.forEach(control => { control.disabled = false; }); });
        } else activate(config);
    });
    byId('ownAiClear').addEventListener('click', () => {
        active = null; key.value = ''; consent.checked = false;
        status.textContent = '已断开并清除本次密钥；下一次生成恢复原有入口。';
        changed();
        if (local) aiRequest('/api/ai/local-config', 'DELETE').catch(() => { status.textContent = '本次已断开，但未能移除本机保存的配置，请检查服务。'; });
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
                : local ? '允许将拍摄需求和密钥转交上方供应商；调用可能产生费用。可选择仅在本机 Windows 账户加密保存。'
                : '允许将我填写的密钥和拍摄需求经 Photo Workflow 服务端转交上方供应商；调用可能消耗我在该供应商的付费额度。密钥不保存，刷新页面后需重新填写。';
        consent.checked = false;
        status.textContent = '未接入。此入口只生成文字方案，不生成图片。';
        changed();
    };
    provider.addEventListener('change', showEndpoint);
    consent.addEventListener('change', () => {
        if (!consent.checked) {
            active = null;
            status.textContent = '授权已取消，当前不会调用自己的 AI。';
            changed();
            if (local) aiRequest('/api/ai/local-config', 'DELETE').catch(() => { status.textContent = '授权已取消，但未能移除本机保存的配置，请检查服务。'; });
        }
    });
    try {
        const result = await aiRequest('/api/ai/providers', 'GET');
        catalog = Array.isArray(result.providers) ? result.providers : [];
        provider.replaceChildren(...catalog.map(p => {
            const option = document.createElement('option'); option.value = p.id; option.textContent = p.name; return option;
        }));
        showEndpoint();
        if (local && rememberLabel) {
            const saved = await aiRequest('/api/ai/local-config', 'GET');
            rememberLabel.hidden = !saved.supported && !saved.configured;
            if (saved.configured && catalog.some(item => item.id === saved.provider)) {
                provider.value = saved.provider; model.value = saved.model; showEndpoint(); consent.checked = true; remember.checked = true;
                active = { useSaved: true }; status.textContent = `已载入本机配置 ${saved.provider} / ${saved.model}；调用时验证服务。`;
                changed();
            }
        }
    } catch {
        status.textContent = 'AI 接入接口尚不可用。当前未启用，不影响原有方案。';
        byId('ownAiEnable').disabled = true;
    }
})();

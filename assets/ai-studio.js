(function () {
    const $ = id => document.getElementById(id);
    if (!$('studioReferenceSearch')) return;
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
    const state = { result: null, proposal: null, planId: null, revision: 0, owner: null };
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const revision = plan => Number.isSafeInteger(plan?.revision) ? plan.revision : 0;
    const current = () => typeof currentPlanData === 'object' ? currentPlanData : null;
    const selected = () => [...$('studioReferenceResults').querySelectorAll('input:checked')].map(input => input.value);
    const status = message => { $('studioReferenceStatus').textContent = message; };

    async function request(path, method = 'POST', body) {
        if (!local) return window.api.request(path, method, body, 45000);
        const token = localStorage.getItem('pw_token');
        const response = await fetch(path, {
            method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '参考库请求失败');
        return data;
    }

    function clearProposal() {
        state.proposal = null;
        $('studioReferenceConfirm').disabled = true;
        $('studioReferenceProposal').disabled = !state.result?.searchReceipt || !selected().length;
        $('studioReferencePreview').replaceChildren();
    }

    function sourceLink(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' && parsed.hostname === 'hruiccc.github.io'
                && parsed.pathname.startsWith('/RuiC-PoseAtlas/') ? parsed.href : '';
        } catch { return ''; }
    }

    async function search() {
        const plan = current();
        const prompt = $('studioReferencePrompt').value.trim()
            || ['f-theme', 'f-style', 'f-scene', 'f-mood', 'f-model', 'f-extra'].map(id => $(id)?.value || '').join(' ').trim();
        if (!prompt) { status('请填写参考需求或拍摄需求。'); return; }
        $('studioReferenceSearch').disabled = true;
        state.result = null;
        clearProposal();
        state.owner = localStorage.getItem('pa_workspace_owner');
        state.planId = plan?.id == null ? null : String(plan.id);
        state.revision = revision(plan);
        status('正在检索 RuiC-PoseAtlas…');
        try {
            const body = { prompt };
            if (state.planId && window.__PHOTOATELIER_SESSION_VERIFIED__) Object.assign(body, { planId: state.planId, expectedRevision: state.revision });
            const result = await request('/api/ai/plan-lite', 'POST', body);
            state.result = result;
            const list = $('studioReferenceResults');
            list.replaceChildren();
            for (const template of result.selectedTemplates || []) {
                const card = document.createElement('div');
                card.className = 'studio-reference-card';
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox'; checkbox.value = template.id;
                checkbox.addEventListener('change', clearProposal);
                const text = document.createElement('span');
                text.textContent = `${template.title} · ${template.poseNumber || template.upstreamId || template.id}`;
                label.append(checkbox, text);
                const detail = document.createElement('p');
                const rightsLabel = template.rightsStatus === 'external_reference' ? '外部来源参考' : template.rightsStatus;
                detail.textContent = [template.description, ...(template.angles || []), rightsLabel].filter(Boolean).join(' · ');
                card.append(label, detail);
                const url = sourceLink(template.sourceUrl);
                if (url) {
                    const link = document.createElement('a');
                    link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '查看原站参考';
                    card.append(link);
                }
                list.append(card);
            }
            const library = result.library;
            status(`${result.reply} ${library?.count || 0} 条上游参考可检索，模型调用 ${result.modelCalls || 0} 次。${library?.status === 'unavailable' ? '上游暂不可用，当前结果来自原创样例。' : ''}`);
            clearProposal();
        } catch (error) { status(error.message); }
        finally { $('studioReferenceSearch').disabled = false; }
    }

    async function propose() {
        if (!state.result?.searchReceipt || !selected().length) return;
        $('studioReferenceProposal').disabled = true;
        try {
            const proposal = await request('/api/ai/studio/proposals', 'POST', { searchReceipt: state.result.searchReceipt, selectedIds: selected() });
            state.proposal = proposal;
            $('studioReferencePreview').textContent = proposal.proposal.guidance?.brief || proposal.proposal.summary;
            $('studioReferenceConfirm').disabled = false;
            status('引用提案已生成，请检查拍摄转译后确认加入当前方案。');
        } catch (error) { status(error.message); }
        finally { $('studioReferenceProposal').disabled = !state.result?.searchReceipt || !selected().length; }
    }

    async function storePlan(plan, expectedRevision) {
        if (!navigator.locks?.request) throw new Error('浏览器需要支持方案写入锁。');
        return navigator.locks.request('photoatelier-studio-plans', () => {
            if (localStorage.getItem('pa_workspace_owner') !== state.owner) throw new Error('账号已切换，请重新检索。');
            const plans = getPlans();
            const index = plans.findIndex(item => String(item.id) === String(plan.id));
            if (index < 0 || revision(plans[index]) !== expectedRevision) throw new Error('方案已有更新，请重新检索。');
            plans[index] = plan;
            if (!savePlans(plans)) throw new Error('方案保存失败，请检查浏览器存储空间。');
            if (String(current()?.id) === String(plan.id)) {
                currentPlanData = plan;
                $('outCnt').innerHTML = renderPlanContent(plan);
            }
        });
    }

    async function confirm() {
        if (!state.proposal) return;
        $('studioReferenceConfirm').disabled = true;
        try {
            if (!window.__PHOTOATELIER_SESSION_VERIFIED__ || !state.owner) throw new Error('请先登录当前方案所属账号。');
            const synced = await window.PhotoAtelierWorkspaceSync?.sync({ force: true, noReload: true });
            if (!synced) throw new Error('请先完成工作区同步，再确认引用。');
            const commit = await request('/api/ai/studio/confirm', 'POST', { proposalToken: state.proposal.proposalToken, idempotencyKey: crypto.randomUUID() });
            let plan = commit.plan;
            if (commit.storage === 'local') {
                const existing = getPlans().find(item => String(item.id) === String(commit.planId));
                if (existing?.aiStudio?.appliedProposalIds?.includes(commit.proposalId)) {
                    state.result = null;
                    clearProposal();
                    status('该引用提案已加入方案。');
                    return;
                }
                if (!existing || revision(existing) !== commit.expectedRevision) throw new Error('方案已有更新，请重新检索。');
                const references = new Map((existing.aiStudio?.references || []).map(item => [item.sourceItemId, item]));
                commit.references.forEach(item => references.set(item.sourceItemId, item));
                plan = { ...existing, revision: commit.expectedRevision + 1, aiStudio: {
                    ...existing.aiStudio, references: [...references.values()], guidance: commit.guidance,
                    conversation: [...(existing.aiStudio?.conversation || []), ...(commit.conversation || [])].slice(-20),
                    appliedProposalIds: [...(existing.aiStudio?.appliedProposalIds || []), commit.proposalId].slice(-50),
                    sync: { status: 'pending', updatedAt: new Date().toISOString() },
                } };
            }
            await storePlan(plan, commit.expectedRevision);
            await window.PhotoAtelierWorkspaceSync?.sync({ force: true, noReload: true });
            state.result = null;
            clearProposal();
            status(`已加入方案，版本 ${plan.revision}。飞书待同步。`);
        } catch (error) { $('studioReferenceConfirm').disabled = false; status(error.message); }
    }

    async function syncPlan(id) {
        const plan = getPlans().find(item => String(item.id) === String(id));
        if (!plan) return;
        state.owner = localStorage.getItem('pa_workspace_owner');
        try {
            if (!window.__PHOTOATELIER_SESSION_VERIFIED__ || !state.owner) throw new Error('请先登录当前方案所属账号。');
            const connection = await request('/api/ai/studio/feishu/status', 'GET');
            if (!connection.connected) throw new Error(connection.credential_configured ? '飞书服务暂未连通，方案保持待同步，可稍后重试。' : '现有飞书同步凭据尚未配置。');
            if (!local && !await window.PhotoAtelierWorkspaceSync?.sync({ force: true, noReload: true })) throw new Error('工作区同步尚未完成。');
            const snapshot = { id: plan.id, title: plan.title, input: plan.input, revision: revision(plan), savedAt: plan.savedAt,
                shotList: (plan.shotList || []).map(({ directorContract, ...shot }) => ({ ...shot, referenceImages: undefined, images: undefined })), aiStudio: plan.aiStudio };
            const outcome = await request('/api/ai/studio/feishu/sync', 'POST', { planId: String(id), ...(local ? { plan: snapshot } : {}) });
            const latest = getPlans().find(item => String(item.id) === String(id));
            if (revision(latest) !== revision(plan) || latest?.aiStudio?.sync?.updatedAt !== plan.aiStudio.sync.updatedAt) throw new Error('方案已更新，旧同步结果已保留，请同步最新版本。');
            const next = outcome.plan || { ...latest, aiStudio: { ...latest.aiStudio, sync: { ...latest.aiStudio.sync, status: outcome.status, code: outcome.code, syncedAt: outcome.syncedAt } } };
            await storePlan(next, revision(plan));
            await window.PhotoAtelierWorkspaceSync?.sync({ force: true, noReload: true });
            toast(outcome.status === 'synced' ? '方案与参考已写入飞书并读回核对。' : '飞书同步尚未完成，方案保持待同步。', outcome.status === 'synced' ? 'ok' : 'er');
        } catch (error) { toast(error.message, 'er'); }
    }

    window.PhotoAtelierStudio = {
        syncCurrentPlan() {
            const plan = current();
            if (!plan?.aiStudio?.references?.length) { toast('请先打开带有摆姿库参考的方案。', 'er'); return; }
            return syncPlan(plan.id);
        },
        augmentInput(input) {
            return $('studioReferenceAuto').checked ? { ...input, useReferenceLibrary: true, referenceIds: selected() } : input;
        },
        renderPlanReferences(plan) {
            const references = plan.aiStudio?.references || [];
            if (!references.length) return '';
            return `<section class="studio-reference-summary"><h3>摆姿库参考与拍摄转译</h3><ul class="studio-reference-list">${references.map(item => {
                const url = sourceLink(item.externalUrl || item.sourceUrl);
                const image = sourceLink(item.referenceImageUrl);
                const preview = /\.(?:jpg|webp)$/.test(image) ? `<img src="${escape(image)}" alt="${escape(item.title)}" loading="lazy">` : '';
                const kind = { pose: '摆姿', costume: '服装', portrait: '人脸' }[item.kind] || '参考';
                return `<li>${preview}<strong>${kind} · ${escape(item.title)}</strong><span>${escape(item.poseNumber || item.upstreamId || item.sourceItemId)} · ${escape((item.angles || []).join(' / '))}</span>${url ? ` <a href="${escape(url)}" target="_blank" rel="noopener noreferrer">原站参考</a>` : ''}</li>`;
            }).join('')}</ul><p>${escape(plan.aiStudio.guidance?.style || '')}</p><ul>${(plan.aiStudio.guidance?.suggestions || []).map(item => `<li>${escape(item.direction)}</li>`).join('')}</ul><p>飞书${plan.aiStudio.sync?.status === 'synced' ? '已核对同步' : '待同步'}</p><button type="button" class="btn btn-s btn-sm" data-studio-sync="${escape(plan.id)}">同步方案和参考到飞书</button></section>`;
        },
        syncPlan,
    };
    $('studioReferenceSearch').addEventListener('click', search);
    $('studioReferenceProposal').addEventListener('click', propose);
    $('studioReferenceConfirm').addEventListener('click', confirm);
    document.addEventListener('click', event => {
        const button = event.target.closest('[data-studio-sync]');
        if (button) syncPlan(button.dataset.studioSync);
    });
    window.addEventListener('storage', event => {
        if (['pw_plans', 'pw_token', 'pa_workspace_owner'].includes(event.key)) { state.result = null; clearProposal(); }
    });
})();

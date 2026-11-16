(function () {
    const DONE_KEY_PREFIX = 'pa_shoot_done_';

    function esc(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function parseFocalValue(focal) {
        const match = String(focal || '').match(/(\d{1,3}(?:\.\d+)?)/);
        return match ? Number(match[1]) : 9999;
    }

    function clusterShotsForLocation(shots = []) {
        const indexed = shots.map((shot, originalIndex) => ({ ...shot, originalIndex }));
        const sceneOrder = [];
        const byScene = new Map();
        for (const item of indexed) {
            const scene = String(item.scene || '场地待确认').trim() || '场地待确认';
            if (!byScene.has(scene)) {
                sceneOrder.push(scene);
                byScene.set(scene, []);
            }
            byScene.get(scene).push(item);
        }
        const clustered = [];
        for (const scene of sceneOrder) {
            const group = byScene.get(scene);
            group.sort((a, b) => {
                const diff = parseFocalValue(a.focalLength) - parseFocalValue(b.focalLength);
                return diff !== 0 ? diff : a.originalIndex - b.originalIndex;
            });
            clustered.push(...group);
        }
        return clustered;
    }

    function getDoneSet(planId) {
        if (!planId || typeof localStorage === 'undefined') return new Set();
        try {
            const raw = JSON.parse(localStorage.getItem(`${DONE_KEY_PREFIX}${planId}`) || '[]');
            return new Set(Array.isArray(raw) ? raw : []);
        } catch {
            return new Set();
        }
    }

    function saveDoneSet(planId, set) {
        if (!planId || typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(`${DONE_KEY_PREFIX}${planId}`, JSON.stringify([...set]));
        } catch {}
    }

    function toggleDone(planId, originalIndex) {
        const set = getDoneSet(planId);
        if (set.has(originalIndex)) set.delete(originalIndex);
        else set.add(originalIndex);
        saveDoneSet(planId, set);
        return set;
    }

    function resolvePlan(planId) {
        if (typeof window !== 'undefined' && window.currentPlanData && String(window.currentPlanData.id) === String(planId)) {
            return window.currentPlanData;
        }
        if (typeof getPlans === 'function') {
            return getPlans().find(p => String(p.id) === String(planId)) || null;
        }
        return null;
    }

    function resolveShots(plan) {
        if (!plan) return [];
        if (typeof generateShotList === 'function') {
            let list = generateShotList(plan);
            try {
                const saved = JSON.parse(localStorage.getItem(`pa_shots_${plan.id}`) || '[]');
                if (Array.isArray(saved) && saved.length > 0) list = saved;
            } catch {}
            return list;
        }
        return Array.isArray(plan.shotList) ? plan.shotList : [];
    }

    function injectStyles() {
        if (typeof document === 'undefined' || document.getElementById('pa-shoot-mode-style')) return;
        const style = document.createElement('style');
        style.id = 'pa-shoot-mode-style';
        style.textContent = `
            #pa-shoot-mode-overlay {
                position: fixed; inset: 0; z-index: 9999;
                background: #0f1115; color: #f4f4f5;
                display: flex; flex-direction: column;
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .sm-header {
                display: flex; align-items: center; justify-content: space-between; gap: .75rem;
                padding: .85rem 1.25rem; border-bottom: 1px solid #262a33; background: #161920;
                flex-wrap: wrap;
            }
            .sm-title { font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: .6rem; }
            .sm-counter { font-family: 'JetBrains Mono', monospace; font-size: .9rem; color: #38bdf8; }
            .sm-header-actions { display: flex; align-items: center; gap: .5rem; }
            .sm-btn-ghost {
                background: #232732; color: #e4e4e7; border: 1px solid #323846;
                padding: .45rem .8rem; border-radius: 8px; font-size: .85rem; cursor: pointer;
            }
            .sm-btn-ghost.active { background: #0284c7; border-color: #38bdf8; color: #fff; }
            .sm-progress-track { height: 4px; background: #232732; width: 100%; }
            .sm-progress-fill { height: 100%; background: #22c55e; transition: width .2s ease; }
            .sm-body {
                flex: 1; overflow-y: auto; padding: 1.25rem; max-width: 780px; width: 100%; margin: 0 auto;
                display: flex; flex-direction: column; gap: 1rem;
            }
            .sm-badges { display: flex; flex-wrap: wrap; gap: .5rem; }
            .sm-badge {
                padding: .3rem .7rem; border-radius: 999px; font-size: .85rem; font-weight: 600;
                background: #232732; color: #e4e4e7; border: 1px solid #323846;
            }
            .sm-badge.scene { background: rgba(56,189,248,.15); border-color: rgba(56,189,248,.4); color: #7dd3fc; }
            .sm-badge.lens { background: rgba(168,85,247,.16); border-color: rgba(168,85,247,.4); color: #d8b4fe; }
            .sm-badge.done { background: rgba(34,197,94,.2); border-color: rgba(34,197,94,.5); color: #86efac; }
            .sm-shot-heading { font-size: 1.45rem; font-weight: 800; line-height: 1.3; margin: 0; }
            .sm-pose-card {
                background: #1b1f29; border: 2px solid #38bdf8; border-radius: 14px; padding: 1.15rem 1.25rem;
            }
            .sm-pose-label { font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; color: #38bdf8; font-weight: 700; margin-bottom: .4rem; }
            .sm-pose-text { font-size: 1.25rem; font-weight: 600; line-height: 1.55; color: #fff; }
            .sm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .75rem; }
            .sm-info-box {
                background: #161920; border: 1px solid #262a33; border-radius: 10px; padding: .85rem 1rem;
            }
            .sm-info-box h4 { font-size: .78rem; color: #9ca3af; margin: 0 0 .35rem; font-weight: 600; }
            .sm-info-box p { font-size: .95rem; line-height: 1.45; margin: 0; color: #f4f4f5; }
            .sm-reject-box {
                background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.38); border-radius: 10px; padding: .85rem 1rem;
            }
            .sm-reject-box h4 { font-size: .78rem; color: #fca5a5; margin: 0 0 .3rem; font-weight: 700; }
            .sm-reject-box p { font-size: .92rem; line-height: 1.45; margin: 0; color: #fecaca; }
            .sm-footer {
                display: grid; grid-template-columns: 1fr 2fr 1fr; gap: .75rem;
                padding: .9rem 1.25rem; border-top: 1px solid #262a33; background: #161920;
            }
            .sm-nav-btn {
                padding: .9rem .75rem; border-radius: 12px; font-size: 1rem; font-weight: 700;
                border: 1px solid #323846; background: #232732; color: #f4f4f5; cursor: pointer;
            }
            .sm-nav-btn:disabled { opacity: .4; cursor: not-allowed; }
            .sm-done-btn {
                padding: .9rem 1rem; border-radius: 12px; font-size: 1.05rem; font-weight: 800;
                border: none; background: #22c55e; color: #052e16; cursor: pointer;
            }
            .sm-done-btn.is-done { background: #334155; color: #cbd5e1; }
        `;
        document.head.appendChild(style);
    }

    let activeState = null;

    function getOrderedShots(plan, mode) {
        const base = resolveShots(plan);
        if (mode === 'location') return clusterShotsForLocation(base);
        return base.map((shot, originalIndex) => ({ ...shot, originalIndex }));
    }

    function renderOverlay() {
        if (!activeState || typeof document === 'undefined') return;
        const overlay = document.getElementById('pa-shoot-mode-overlay');
        if (!overlay) return;
        const { plan, mode, cursor } = activeState;
        const list = getOrderedShots(plan, mode);
        if (!list.length) {
            overlay.innerHTML = `<div class="sm-header"><div class="sm-title">📷 片场模式</div><button class="sm-btn-ghost" onclick="window.PhotoAtelierShootMode.close()">退出</button></div><div class="sm-body"><p>当前方案暂无分镜。</p></div>`;
            return;
        }
        const safeCursor = Math.max(0, Math.min(cursor, list.length - 1));
        activeState.cursor = safeCursor;
        const shot = list[safeCursor];
        const contract = shot.directorContract || {};
        const doneSet = getDoneSet(plan.id);
        const isDone = doneSet.has(shot.originalIndex);
        const doneCount = list.filter(item => doneSet.has(item.originalIndex)).length;
        const pct = Math.round((doneCount / list.length) * 100);
        const optics = [shot.camera?.aperture, shot.camera?.shutter].filter(Boolean).join(' · ');

        overlay.innerHTML = `
            <div class="sm-header">
                <div class="sm-title">
                    <span>📷 片场执行</span>
                    <span class="sm-counter">${safeCursor + 1} / ${list.length} · 已拍 ${doneCount}/${list.length}</span>
                </div>
                <div class="sm-header-actions">
                    <button type="button" class="sm-btn-ghost ${mode === 'story' ? 'active' : ''}" data-sm-mode="story">成片顺序</button>
                    <button type="button" class="sm-btn-ghost ${mode === 'location' ? 'active' : ''}" data-sm-mode="location">场地/焦段动线</button>
                    <button type="button" class="sm-btn-ghost" data-sm-close="1">✕ 退出</button>
                </div>
            </div>
            <div class="sm-progress-track"><div class="sm-progress-fill" style="width:${pct}%"></div></div>
            <div class="sm-body">
                <div class="sm-badges">
                    <span class="sm-badge scene">📍 ${esc(shot.scene || '场地待确认')}</span>
                    <span class="sm-badge lens">🔭 ${esc(shot.focalLength || '焦段待定')} · ${esc(shot.shotSize || '景别待定')}</span>
                    <span class="sm-badge">📐 ${esc(shot.angle || '平视')}</span>
                    ${isDone ? '<span class="sm-badge done">✓ 已拍完</span>' : ''}
                </div>
                <h2 class="sm-shot-heading">镜头 ${String(shot.originalIndex + 1).padStart(2, '0')} · ${esc(shot.title || shot.scene || '拍摄动作')}</h2>
                <div class="sm-pose-card">
                    <div class="sm-pose-label">模特动作与引导口令</div>
                    <div class="sm-pose-text">${esc(shot.description || contract.model_pose || '按现场自然状态引导')}</div>
                </div>
                <div class="sm-grid">
                    <div class="sm-info-box"><h4>摄影师站位与构图</h4><p>${esc([shot.method, shot.composition].filter(Boolean).join(' · ') || '待确认')}</p></div>
                    <div class="sm-info-box"><h4>光线与机内参考</h4><p>${esc(shot.lightingSetup || shot.lighting || '现场自然光')}${optics ? `<br><span style="color:#7dd3fc;font-size:.85rem">${esc(optics)}</span>` : ''}</p></div>
                    <div class="sm-info-box"><h4>服装与本镜道具</h4><p>${esc([shot.wardrobe || contract.wardrobe_styling, shot.props || contract.shot_props].filter(Boolean).join(' / ') || '沿用主方案')}</p></div>
                </div>
                ${(contract.reject_if || contract.must_show) ? `
                    <div class="sm-reject-box">
                        <h4>⚠️ 快门前核对（必见 / 避坑）</h4>
                        <p>${contract.must_show ? `必见：${esc(contract.must_show)}<br>` : ''}${contract.reject_if ? `避坑：${esc(contract.reject_if)}` : ''}</p>
                    </div>
                ` : ''}
            </div>
            <div class="sm-footer">
                <button type="button" class="sm-nav-btn" data-sm-prev="1" ${safeCursor === 0 ? 'disabled' : ''}>← 上一镜</button>
                <button type="button" class="sm-done-btn ${isDone ? 'is-done' : ''}" data-sm-toggle-done="1">${isDone ? '✓ 已拍完（点击取消）' : '✓ 拍完并下一镜'}</button>
                <button type="button" class="sm-nav-btn" data-sm-next="1" ${safeCursor >= list.length - 1 ? 'disabled' : ''}>下一镜 →</button>
            </div>
        `;

        overlay.querySelector('[data-sm-close]')?.addEventListener('click', close);
        overlay.querySelectorAll('[data-sm-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                activeState.mode = btn.dataset.smMode;
                activeState.cursor = 0;
                renderOverlay();
            });
        });
        overlay.querySelector('[data-sm-prev]')?.addEventListener('click', () => step(-1));
        overlay.querySelector('[data-sm-next]')?.addEventListener('click', () => step(1));
        overlay.querySelector('[data-sm-toggle-done]')?.addEventListener('click', () => {
            const updated = toggleDone(plan.id, shot.originalIndex);
            if (updated.has(shot.originalIndex) && safeCursor < list.length - 1) {
                activeState.cursor += 1;
            }
            renderOverlay();
        });
    }

    function step(delta) {
        if (!activeState) return;
        const list = getOrderedShots(activeState.plan, activeState.mode);
        const next = activeState.cursor + delta;
        if (next >= 0 && next < list.length) {
            activeState.cursor = next;
            renderOverlay();
        }
    }

    function onKeyDown(e) {
        if (!activeState) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
    }

    function open(planId, startIndex = 0, options = {}) {
        const plan = resolvePlan(planId);
        if (!plan || typeof document === 'undefined') return;
        injectStyles();
        close();
        const overlay = document.createElement('div');
        overlay.id = 'pa-shoot-mode-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', '片场执行模式');
        document.body.appendChild(overlay);
        activeState = { plan, mode: options.mode || 'story', cursor: startIndex };
        if (typeof window !== 'undefined') window.addEventListener('keydown', onKeyDown);
        renderOverlay();
    }

    function close() {
        if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeyDown);
        const existing = typeof document !== 'undefined' ? document.getElementById('pa-shoot-mode-overlay') : null;
        if (existing) existing.remove();
        const closedPlan = activeState?.plan;
        activeState = null;
        if (closedPlan && typeof renderPlanContent === 'function' && typeof document !== 'undefined') {
            const out = document.getElementById('outCnt');
            if (out && out.classList.contains('active')) {
                out.innerHTML = renderPlanContent(closedPlan);
            }
        }
    }

    const api = { clusterShotsForLocation, getDoneSet, toggleDone, open, close };
    if (typeof window !== 'undefined') window.PhotoAtelierShootMode = api;
    if (typeof globalThis !== 'undefined') globalThis.PhotoAtelierShootMode = api;
})();

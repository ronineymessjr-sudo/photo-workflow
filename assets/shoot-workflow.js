(function () {
    const M = window.ShootWorkflowModel;
    const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const roles = { photographer: '摄影师', model: '模特', assistant: '摄影助理' };
    let context = {}, returnFocus;
    const dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.setAttribute('aria-labelledby', 'workflow-title');
    document.body.append(dialog);
    function persist(key, value) {
        if (!ss(key, value)) throw new Error('存储空间不足，修改未保存。请先导出备份。');
    }
    function planById(id) {
        const plan = getPlans().find(p => String(p.id) === String(id));
        if (!plan) throw new Error('方案已不存在');
        return { ...plan, shotList: M.shots(plan, sg('pa_shots_' + plan.id) || []) };
    }
    function sessionKey(id) { return 'pw_shoot_session_' + id; }
    function data() {
        const schedule = (sg('pw_schedule') || []).find(s => String(s.id) === String(context.scheduleId));
        if (!schedule) throw new Error('拍摄日程已不存在');
        const plan = planById(schedule.planId);
        return { plan, schedule, state: M.session(plan, schedule, sg(sessionKey(schedule.id)) || {}) };
    }
    function button(action, label, extra = '', primary = false) {
        return `<button type="button" class="btn ${primary ? 'btn-p' : 'btn-s'}" data-workflow="${action}" ${extra}>${label}</button>`;
    }
    function icon(action, name, label, extra = '') {
        return `<button type="button" class="icon-button" data-workflow="${action}" aria-label="${label}" title="${label}" ${extra}><i data-lucide="${name}"></i></button>`;
    }
    function show(title, body, footer = '') {
        dialog.innerHTML = `<header><h2 id="workflow-title">${h(title)}</h2>${icon('close', 'x', '关闭')}</header><div class="workflow-body">${body}<p role="alert" id="workflow-error" class="workflow-error" hidden></p></div>${footer ? `<footer>${footer}</footer>` : ''}`;
        if (!dialog.open) { returnFocus = document.activeElement; dialog.showModal(); }
        else { const heading = dialog.querySelector('#workflow-title'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
        if (window.lucide) lucide.createIcons({ root: dialog });
    }
    dialog.addEventListener('close', () => returnFocus?.isConnected && returnFocus.focus());
    function reference(shot) {
        const ref = shot.reference;
        let url;
        try { url = M.referenceUrl(ref?.url); } catch { return ''; }
        if (!url) return '';
        return `<p class="workflow-reference"><a href="${h(url)}" target="_blank" rel="noopener noreferrer">打开参考原页</a> · ${ref.synthetic ? 'AI 概念图' : '外部参考 · 真实性未核验'}<br>借鉴：${h(ref.purpose)}<br><small>仅作参考，转载与商用需另行获得授权。</small></p>`;
    }
    function renderStoryboard(plan) {
        const list = M.shots(plan, sg('pa_shots_' + plan.id) || []);
        const source = plan.director?.source;
        const label = source === 'guest-rule-draft' ? '规则编排草稿 · 待摄影师确认' : source === 'director-shoot-plan' ? 'Director 检索 / 规则编排 · 待摄影师确认' : '保存的方案';
        const timed = list.every(s => Number(s.duration) > 0);
        const total = list.reduce((n, s) => n + (Number(s.duration) || 0), 0);
        return `<section class="storyboard" aria-label="分镜脚本">
            <div class="workflow-summary"><div><h3>拍摄分镜</h3><p>${list.length} 个镜头 · ${timed ? `预计 ${total} 分钟` : '用时待补充'} · ${h(label)}</p><p>版本 ${Number(plan.workflowRevision || 0) + 1} · 本机保存</p></div>
            <div class="workflow-actions">${button('brief', '修改需求')}${button('library', '方案库')}${button('schedule', '安排拍摄', `data-plan="${h(plan.id)}"`, true)}${button('pdf', 'PDF / 打印', `data-plan="${h(plan.id)}"`)}</div></div>
            ${plan.director?.shotCountLimited ? '<p class="workflow-muted">本次不同分镜数量不足，未复制镜头补数。</p>' : ''}
            <div class="storyboard-overview"><table><caption>分镜总表</caption><thead><tr><th>序号</th><th>拍摄画面</th><th>人物动作</th><th>景别 / 焦段</th></tr></thead><tbody>${list.map((s, i) => `<tr><td>${String(i + 1).padStart(2, '0')}</td><td><a href="#shot-detail-${i}" data-workflow="expand" data-index="${i}">${h(s.title || s.scene)}</a></td><td>${h(s.description)}</td><td>${h([s.shotSize, s.focalLength].filter(Boolean).join(' / '))}</td></tr>`).join('')}</tbody></table></div>
            <div class="storyboard-list">${list.map((s, i) => `<details class="storyboard-shot" id="shot-detail-${i}"><summary>${String(i + 1).padStart(2, '0')} · ${h(s.title || s.scene)}</summary><article>${renderShotInstructions(s)}${reference(s)}<div class="workflow-shot-tools"><span class="workflow-muted">${s.duration ? `预计 ${s.duration} 分钟` : '预计用时待确认'}${s.contractNeedsReview ? ' · 已编辑，原生图合同待重新审核' : ''}</span>${button('edit', '编辑分镜与参考', `data-plan="${h(plan.id)}" data-index="${i}"`)}</div></article></details>`).join('')}</div></section>`;
    }
    function field(label, name, value, wide = false, type = 'text') {
        return `<label class="${wide ? 'wide' : ''}">${label}${type === 'textarea' ? `<textarea name="${name}" maxlength="2000">${h(value)}</textarea>` : `<input name="${name}" type="${type}" value="${h(value)}" ${type === 'number' ? 'min="0" max="480"' : 'maxlength="2000"'}>`}</label>`;
    }
    function edit(planId, index) {
        const plan = planById(planId), shot = plan.shotList[index];
        context = { mode: 'edit', planId, shotId: shot.id };
        const input = { ...shot, lighting: shot.lightingSetup || shot.lighting };
        const labels = { title: '拍摄画面', description: '人物怎么做', method: '摄影师站哪里', composition: '人物放在哪里', shotSize: '景别', focalLength: '焦段', lighting: '光线怎么用', notes: '现场提醒' };
        show(`编辑分镜 ${String(index + 1).padStart(2, '0')}`, `<form id="workflow-edit"><div class="workflow-grid">${Object.entries(labels).map(([key, label]) => field(label, key, input[key] || '', ['title', 'description'].includes(key), ['description', 'notes'].includes(key) ? 'textarea' : 'text')).join('')}${field('预计拍摄用时（分钟，0 为待定）', 'duration', shot.duration || 0)}${field('参考原页链接（选填）', 'referenceUrl', shot.reference?.url || '', true, 'url')}${field('这张参考借鉴什么', 'referencePurpose', shot.reference?.purpose || '', true)}</div><label class="workflow-check"><input type="checkbox" name="synthetic" ${shot.reference?.synthetic ? 'checked' : ''}>参考为 AI 概念图</label></form>`, `${shot.generatedOriginal ? button('restore-shot', '恢复生成版') : ''}${button('close', '取消')}<button type="submit" form="workflow-edit" class="btn btn-p">保存分镜</button>`);
    }
    function openCall(scheduleId, role = getCurrentRole()) {
        context = { mode: 'call', scheduleId, role: roles[role] ? role : 'photographer' };
        renderCall();
    }
    function openDay(date) {
        const schedules = (sg('pw_schedule') || []).filter(s => s.date === date);
        if (!schedules.length) return addSchedule(date);
        context = { mode: 'day' };
        show(date + ' 的拍摄', schedules.map(s => `<div class="workflow-call-row"><span>${h(s.time || '待定')}</span><div><strong>${h(s.title)}</strong><p>${h(s.location || '地点待确认')}</p>${s.planId ? button('call-entry', '拍摄通告', `data-schedule="${h(s.id)}"`) : '<p class="workflow-muted">独立日程，尚未关联方案</p>'}</div></div>`).join(''));
    }
    function renderCall() {
        const { plan, schedule, state } = data(), role = context.role;
        const p = M.packet(plan, schedule, role), details = p.details;
        const confirmed = state.confirmations[role]?.version === M.packetVersion(plan, schedule);
        const ownNote = role === 'model' ? details.wardrobe : role === 'assistant' ? details.equipment : details.notes;
        const noteTitle = role === 'model' ? '服装与妆造' : role === 'assistant' ? '器材与场地准备' : '拍摄备注';
        const tabs = `<div class="workflow-role-tabs" aria-label="通告角色">${Object.entries(roles).map(([r, label]) => `<button type="button" data-workflow="role" data-role="${r}" aria-pressed="${r === role}">${label}</button>`).join('')}</div>`;
        show('拍摄日通告', `${tabs}<h3>${h(p.title)}</h3><dl class="workflow-facts"><div><dt>日期</dt><dd>${h(p.date)}</dd></div><div><dt>集合时间</dt><dd>${h(p.time)}</dd></div><div><dt>拍摄地点</dt><dd>${h(p.location)}</dd></div></dl>
            <p class="workflow-muted">联系人：${h(details.contact || '待补充')} · 集合点：${h(details.meeting || '待补充')}</p><h3>${noteTitle}</h3><p>${h(ownNote || '待摄影师补充')}</p>
            <details class="workflow-call-details"><summary>编辑本次拍摄安排</summary><form id="workflow-call-edit"><div class="workflow-grid">${field('集合时间', 'time', schedule.time || '', false, 'time')}${field('拍摄地点', 'location', schedule.location || '')}${field('集合点', 'meeting', details.meeting || '')}${field('联系人', 'contact', details.contact || '')}${field('服装与妆造', 'wardrobe', details.wardrobe || '', true, 'textarea')}${field('器材与场地准备', 'equipment', details.equipment || '', true, 'textarea')}${field('拍摄备注', 'notes', details.notes || '', true, 'textarea')}</div><button class="btn btn-s" type="submit">保存安排</button></form></details>
            <h3>${role === 'model' ? '动作顺序' : role === 'assistant' ? '逐镜头准备' : '拍摄顺序'} · ${p.rows.length} 镜</h3>${p.rows.map(row => `<div class="workflow-call-row"><span class="workflow-step-number">${String(row.number).padStart(2, '0')}</span><div><strong>${h(row.title)}</strong><p>${h(row.instruction || '待补充')}</p>${role === 'photographer' ? `<p>人物动作：${h(row.action)}</p>` : ''}</div></div>`).join('')}
            <p class="workflow-muted">${confirmed ? '本机已记录此角色核对' : '本机尚未核对当前版本'}。角色预览不等于已发送给其他人。</p>`, `<div class="workflow-actions">${button('print-call', '导出通告 / PDF')}${button('confirm-call', confirmed ? '已核对' : '记录本机核对')}</div>${button('field', '进入现场', '', true)}`);
    }
    function openField(scheduleId) {
        context = { mode: 'field', scheduleId, active: 0 };
        renderField();
    }
    function renderField() {
        const { plan, schedule, state } = data();
        context.active = Math.max(0, Math.min(context.active || 0, state.order.length - 1));
        const id = state.order[context.active], shot = plan.shotList.find(s => s.id === id);
        if (!shot) throw new Error('方案暂无可执行分镜');
        const r = state.records[id] || {}, count = state.order.filter(key => state.records[key]?.status === 'done').length;
        const seconds = Number(r.seconds || 0) + (r.startedAt ? Math.max(0, Math.floor((Date.now() - r.startedAt) / 1000)) : 0);
        show('拍摄现场', `<p class="workflow-muted">${h(schedule.date)} · ${h(plan.title)} · ${count}/${state.order.length} 已完成</p><progress class="workflow-progress" value="${count}" max="${state.order.length}"></progress><div class="workflow-field-layout"><nav class="workflow-shot-nav" aria-label="现场分镜">${state.order.map((key, i) => `<button type="button" data-workflow="select-shot" data-index="${i}" aria-current="${i === context.active}" aria-label="镜头 ${i + 1}${state.records[key]?.status === 'done' ? ' 已完成' : ''}"><span>${state.records[key]?.status === 'done' ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="shot-name">${h(plan.shotList.find(s => s.id === key)?.title)}</span></button>`).join('')}</nav><section class="workflow-field-main"><p class="workflow-muted">镜头 ${context.active + 1} / ${state.order.length}</p><h3>${h(shot.title || shot.scene)}</h3>${renderShotInstructions(shot)}${reference(shot)}
            <div class="workflow-status">${[['pending', '待拍'], ['done', '完成'], ['retake', '补拍']].map(([status, text]) => button('status', text, `data-status="${status}" aria-pressed="${(r.status || 'pending') === status}"`)).join('')}</div>
            <div class="workflow-actions">${button('timer', r.startedAt ? '暂停计时' : '开始计时')}<span class="workflow-timer" id="workflow-timer" data-seconds="${Number(r.seconds || 0)}" data-start="${r.startedAt || 0}">${Math.floor(seconds / 60)}分 ${seconds % 60}秒</span>${icon('earlier', 'arrow-up', '提前拍摄')}${icon('later', 'arrow-down', '稍后拍摄')}</div>
            <form id="workflow-notes"><label>实拍备注<textarea name="notes" maxlength="2000" placeholder="记录现场变化、补拍原因">${h(r.notes || '')}</textarea></label><button type="submit" class="btn btn-s">保存备注</button><span class="workflow-muted" id="workflow-note-status"></span></form></section></div>`, `${button('call', '通告')}<div class="workflow-actions">${icon('next', 'arrow-right', '下一镜')}${button('complete-next', context.active === state.order.length - 1 ? '完成此镜' : '完成并下一镜', '', true)}</div>`);
    }
    function writeRecord(patch) {
        const { plan, state, schedule } = data();
        const id = state.order[context.active];
        const revision = plan.shotList.find(s => s.id === id)?.revision || 0;
        persist(sessionKey(schedule.id), M.record(state, id, { ...patch, ...(patch.status ? { shotRevision: revision } : {}) }));
    }
    function savePendingNotes(pause = false) {
        const form = dialog.querySelector('#workflow-notes');
        if (form) {
            const { state } = data(), r = state.records[state.order[context.active]] || {};
            writeRecord({ notes: form.elements.notes.value, ...(pause && r.startedAt ? { seconds: (r.seconds || 0) + Math.max(0, Math.floor((Date.now() - r.startedAt) / 1000)), startedAt: null } : {}) });
        }
    }
    function printCall() {
        const { plan, schedule } = data(), p = M.packet(plan, schedule, context.role);
        const win = window.open('', '_blank');
        if (!win) throw new Error('请允许弹出打印窗口');
        const note = context.role === 'model' ? p.details.wardrobe : context.role === 'assistant' ? p.details.equipment : p.details.notes;
        win.document.write(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${h(p.title)} · ${roles[context.role]}</title><style>@page{size:A4;margin:16mm}body{font:14px/1.65 system-ui;color:#222;max-width:900px;margin:24px auto;padding:0 20px}h1{font-size:26px}h2{font-size:18px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;text-align:left;padding:10px;vertical-align:top}tr{break-inside:avoid}button{padding:12px}@media print{button{display:none}}</style><button onclick="print()">打印 / 另存为 PDF</button><h1>${h(p.title)}</h1><h2>${roles[context.role]}拍摄通告</h2><p>${h(p.date)} · ${h(p.time)} · ${h(p.location)}</p><p>集合：${h(p.details.meeting || '待确认')}<br>联系人：${h(p.details.contact || '待确认')}</p><p>${h(note || '准备事项待补充')}</p><table><thead><tr><th>镜头</th><th>画面</th><th>${context.role === 'model' ? '人物动作' : '执行重点'}</th></tr></thead><tbody>${p.rows.map(r => `<tr><td>${r.number}</td><td>${h(r.title)}</td><td>${h(r.instruction)}</td></tr>`).join('')}</tbody></table><p>方案版本 ${Number(plan.workflowRevision || 0) + 1} · 本机导出，未自动发送</p></html>`);
        win.document.close();
    }
    function refresh() {
        renderSavedPlanLibrary(); renderSchedules(); renderRoleHome(getCurrentRole()); renderCalendar();
    }
    function saveEditedPlan(next) {
        persist(SK.P, getPlans().map(p => String(p.id) === String(next.id) ? next : p));
        dialog.close(); loadPlan(next.id); refresh(); toast('分镜已保存；导出与拍摄通告已更新', 'ok');
    }
    function error(e) {
        const el = dialog.open && dialog.querySelector('#workflow-error');
        if (el) { el.hidden = false; el.textContent = e.message; }
        else toast(e.message || '操作失败', 'er');
    }
    document.addEventListener('click', event => {
        const target = event.target.closest('[data-workflow]');
        if (!target) return;
        event.preventDefault();
        const action = target.dataset.workflow;
        try {
            if (context.mode === 'field' && dialog.contains(target)) savePendingNotes(['next', 'select-shot', 'earlier', 'later', 'call', 'close', 'status'].includes(action));
            if (action === 'close') dialog.close();
            else if (action === 'brief') { $('tab-gen').classList.remove('workflow-result'); $('briefForm').scrollIntoView({ block: 'start' }); }
            else if (action === 'library') showTab('tpl');
            else if (action === 'schedule') addSchedule('', target.dataset.plan);
            else if (action === 'pdf') exportShotListPDF(target.dataset.plan);
            else if (action === 'expand') { const el = $('shot-detail-' + target.dataset.index); el.open = true; el.scrollIntoView({ block: 'start' }); }
            else if (action === 'edit') edit(target.dataset.plan, Number(target.dataset.index));
            else if (action === 'restore-shot') {
                if (!confirm('恢复此镜头原始生成内容？当前参考链接和预计用时会保留。')) return;
                saveEditedPlan(M.restoreGenerated(planById(context.planId), context.shotId));
            }
            else if (action === 'call-entry') openCall(target.dataset.schedule);
            else if (action === 'field-entry') openField(target.dataset.schedule);
            else if (action === 'role') { context.role = target.dataset.role; renderCall(); }
            else if (action === 'confirm-call') { const { plan, schedule, state } = data(); state.confirmations[context.role] = { at: new Date().toISOString(), version: M.packetVersion(plan, schedule), scope: 'local-only' }; persist(sessionKey(schedule.id), state); renderCall(); }
            else if (action === 'print-call') printCall();
            else if (action === 'field') openField(context.scheduleId);
            else if (action === 'call') openCall(context.scheduleId);
            else if (action === 'select-shot') { context.active = Number(target.dataset.index); renderField(); }
            else if (action === 'next') { const { state } = data(); context.active = (context.active + 1) % state.order.length; renderField(); }
            else if (action === 'complete-next') {
                const { state } = data(), r = state.records[state.order[context.active]] || {};
                writeRecord({ status: 'done', startedAt: null, seconds: (r.seconds || 0) + (r.startedAt ? Math.max(0, Math.floor((Date.now() - r.startedAt) / 1000)) : 0) });
                context.active = Math.min(context.active + 1, state.order.length - 1); renderField();
            }
            else if (action === 'status') { writeRecord({ status: target.dataset.status }); renderField(); }
            else if (action === 'earlier' || action === 'later') { const { state, schedule } = data(); const id = state.order[context.active]; const next = M.move(state, id, action === 'earlier' ? -1 : 1); persist(sessionKey(schedule.id), next); context.active = next.order.indexOf(id); renderField(); }
            else if (action === 'timer') { const { state } = data(); const r = state.records[state.order[context.active]] || {}; writeRecord(r.startedAt ? { seconds: (r.seconds || 0) + Math.max(0, Math.floor((Date.now() - r.startedAt) / 1000)), startedAt: null } : { startedAt: Date.now() }); renderField(); }
        } catch (e) { error(e); }
    });
    dialog.addEventListener('cancel', event => {
        try { if (context.mode === 'field') savePendingNotes(true); } catch (e) { event.preventDefault(); error(e); }
    });
    dialog.addEventListener('submit', event => {
        event.preventDefault();
        try {
            const values = Object.fromEntries(new FormData(event.target));
            if (event.target.id === 'workflow-edit') {
                const plan = planById(context.planId);
                const next = M.editShot(plan, plan.shotList, context.shotId, { ...values, synthetic: values.synthetic === 'on' });
                saveEditedPlan(next);
            } else if (event.target.id === 'workflow-call-edit') {
                const { schedule } = data();
                const next = { ...schedule, time: values.time, location: values.location, callDetails: { meeting: values.meeting, contact: values.contact, wardrobe: values.wardrobe, equipment: values.equipment, notes: values.notes } };
                persist('pw_schedule', (sg('pw_schedule') || []).map(s => String(s.id) === String(next.id) ? next : s));
                renderCall(); refresh();
            } else if (event.target.id === 'workflow-notes') {
                writeRecord({ notes: values.notes }); $('workflow-note-status').textContent = ' 已保存';
            }
        } catch (e) { error(e); }
    });
    setInterval(() => {
        const el = dialog.open && $('workflow-timer');
        if (!el || !Number(el.dataset.start)) return;
        const seconds = Number(el.dataset.seconds) + Math.max(0, Math.floor((Date.now() - Number(el.dataset.start)) / 1000));
        el.textContent = `${Math.floor(seconds / 60)}分 ${seconds % 60}秒`;
    }, 1000);
    function openForPlan(planId, scheduleId) {
        const schedules = (sg('pw_schedule') || []).filter(s => String(s.planId) === String(planId));
        if (scheduleId) return openField(scheduleId);
        if (schedules.length === 1) return openField(schedules[0].id);
        showTab('tpl'); toast(schedules.length ? '请选择具体拍摄日期进入现场' : '请先为方案安排拍摄日期');
    }
    window.ShootWorkflow = { renderStoryboard, openCall, openField, openForPlan, openDay, reference };
    if (new URLSearchParams(location.search).get('view') === 'library') showTab('tpl');
})();

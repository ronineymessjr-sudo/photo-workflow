import { escapeHtml, formToObject, formatDate, toast } from '../core/utils.js';

export function renderSchedule(ctx) {
  const model = ctx.v5.queries.scheduleWorkspace.get(ctx.project.id);
  const monthValue = ctx.storage.get(`calendarMonth:${ctx.project.id}`, new Date().toISOString().slice(0, 7));
  const selectedEventId = ctx.storage.get(`selectedShootEvent:${ctx.project.id}`, model.events.find(item => item.status !== 'cancelled')?.id || '');
  const active = model.getEvent(selectedEventId);
  const revenue = ctx.v5.queries.revenue.getPeriods({ projectId: ctx.project.id, timezone: ctx.project.timezone || 'Asia/Shanghai' });

  return `
    <section class="page-header"><div><h1>日程与现场执行</h1><p>确认版本进入日历后，现场记录始终追踪到具体 CalendarEvent、PlanRevision 和 Shot。</p></div>${active ? `<span class="status-pill">${escapeHtml(active.event.status)}</span>` : ''}</section>
    <section class="grid cols-2">
      <article class="card"><h2>创建拍摄日程</h2><form id="shoot-event-form" class="form-grid">
        <label class="full">正式方案版本<select name="planRevisionId" required><option value="">选择版本</option>${model.confirmedRevisions.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.concept)} · V${item.revisionNumber}</option>`).join('')}</select></label>
        <label>日期<input type="date" name="date" required></label><label>开始<input type="time" name="time" value="09:00" required></label>
        <label>结束<input type="time" name="endTime" value="12:00" required></label><label>地点<input name="location" value="${escapeHtml(ctx.project.location || '')}"></label>
        <label class="full">标题<input name="title" value="${escapeHtml(ctx.project.title)} 拍摄"></label>
        <label>预计收入<input name="expectedRevenue" type="number" min="0" value="0"></label><label>币种<input name="currency" value="CNY"></label>
        <div class="full"><button class="button primary" ${model.confirmedRevisions.length ? '' : 'disabled'}>加入日程</button></div>
      </form></article>
      <article class="card"><h2>普通任务</h2><form id="task-form" class="form-grid">
        <label>阶段<select name="phase"><option>前期</option><option>拍摄</option><option>后期</option><option>发布</option></select></label>
        <label>状态<select name="status"><option value="todo">待办</option><option value="doing">进行中</option><option value="done">完成</option></select></label>
        <label class="full">任务<input name="title" required></label><label>开始<input type="datetime-local" name="startAt"></label><label>截止<input type="datetime-local" name="dueAt"></label>
        <div class="full"><button class="button secondary">添加任务</button></div>
      </form></article>
    </section>
    <section class="grid cols-2 plan-section">
      <article class="card calendar-card"><div class="status-row"><button class="button ghost" data-calendar-shift="-1">←</button><h2>${escapeHtml(formatMonth(monthValue))}</h2><button class="button ghost" data-calendar-shift="1">→</button></div>${renderCalendar(monthValue, model.events)}</article>
      <article class="card"><h2>拍摄日程（${model.events.length}）</h2><div class="list">${model.events.map(event => `<div class="list-item"><div><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(formatDate(event.startAt))} → ${escapeHtml(formatDate(event.endAt))}</p><p>${escapeHtml(event.location || '未设置地点')} · ${escapeHtml(event.status)}</p></div><div class="item-actions"><button class="button secondary" data-open-event="${escapeHtml(event.id)}">打开</button>${event.status !== 'cancelled' && event.status !== 'completed' ? `<button class="button danger" data-cancel-event="${escapeHtml(event.id)}">取消</button>` : ''}</div></div>`).join('') || '<div class="empty">尚未创建拍摄日程。</div>'}</div></article>
    </section>
    <section class="grid cols-3 plan-section">
      ${financeCard('今日', revenue.today)}${financeCard('本周', revenue.week)}${financeCard('本月', revenue.month)}
    </section>
    <section class="card plan-section">
      <div class="status-row"><div><h2>现场镜头模式</h2><p class="hint">${active ? escapeHtml(active.revision?.concept || active.event.title) : '从日程中打开一场拍摄。'}</p></div>${active ? `<div class="topbar-actions">${['scheduled','confirmed','preparing'].includes(active.event.status) ? '<button id="start-shoot-btn" class="button primary">开始拍摄</button>' : ''}${active.event.status === 'in_progress' ? '<button id="complete-shoot-btn" class="button primary">完成拍摄</button>' : ''}</div>` : ''}</div>
      <div class="shot-execution-list">${active?.shots.map((shot, index) => renderShot(shot, index, active.event.id)).join('') || '<div class="empty">暂无可执行镜头。</div>'}</div>
    </section>
    <section class="card plan-section"><h2>普通任务（${model.tasks.length}）</h2><div class="list">${model.tasks.map(task => `<div class="list-item"><div><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.phase || '')} · ${escapeHtml(task.status || 'todo')} · ${escapeHtml(task.dueAt || '未设置截止')}</p></div><div class="item-actions">${task.status !== 'done' ? `<button class="button secondary" data-done-task="${escapeHtml(task.id)}">完成</button>` : ''}<button class="button danger" data-delete-task="${escapeHtml(task.id)}">删除</button></div></div>`).join('') || '<div class="empty">暂无普通任务。</div>'}</div></section>
  `;
}

export function bindSchedule(ctx) {
  document.getElementById('shoot-event-form')?.addEventListener('submit', event => {
    event.preventDefault(); const value = formToObject(event.currentTarget);
    try {
      const result = ctx.v5.schedule.createShootEvent({ projectId: ctx.project.id, planRevisionId: value.planRevisionId, title: value.title, startAt: combine(value.date, value.time), endAt: combine(value.date, value.endTime), location: value.location, timezone: ctx.project.timezone || 'Asia/Shanghai', expectedRevenue: Number(value.expectedRevenue || 0), currency: value.currency || 'CNY' });
      ctx.storage.set(`selectedShootEvent:${ctx.project.id}`, result.event.id); toast('拍摄日程已创建'); ctx.refresh();
    } catch (error) { toast(error.message); }
  });
  document.getElementById('task-form')?.addEventListener('submit', event => { event.preventDefault(); ctx.v5.schedule.createTask({ projectId: ctx.project.id, ...formToObject(event.currentTarget) }); toast('任务已添加'); ctx.refresh(); });
  document.querySelectorAll('[data-done-task]').forEach(button => button.addEventListener('click', () => { const task = ctx.v5.repositories.tasks.require(button.dataset.doneTask); ctx.v5.schedule.updateTask({ taskId: task.id, expectedVersion: task.recordVersion, patch: { status: 'done' } }); ctx.refresh(); }));
  document.querySelectorAll('[data-delete-task]').forEach(button => button.addEventListener('click', () => { ctx.v5.schedule.removeTask(button.dataset.deleteTask); ctx.refresh(); }));
  document.querySelectorAll('[data-open-event]').forEach(button => button.addEventListener('click', () => { ctx.storage.set(`selectedShootEvent:${ctx.project.id}`, button.dataset.openEvent); ctx.refresh(); }));
  document.querySelectorAll('[data-cancel-event]').forEach(button => button.addEventListener('click', () => { ctx.v5.schedule.cancelEvent(button.dataset.cancelEvent, '用户取消'); ctx.refresh(); }));
  document.querySelectorAll('[data-calendar-shift]').forEach(button => button.addEventListener('click', () => { const current = ctx.storage.get(`calendarMonth:${ctx.project.id}`, new Date().toISOString().slice(0, 7)); ctx.storage.set(`calendarMonth:${ctx.project.id}`, shiftMonth(current, Number(button.dataset.calendarShift))); ctx.refresh(); }));
  document.querySelectorAll('[data-calendar-date]').forEach(button => button.addEventListener('click', () => { const input = document.querySelector('[name="date"]'); if (input) input.value = button.dataset.calendarDate; }));
  document.getElementById('start-shoot-btn')?.addEventListener('click', () => runOnset(ctx, active => ctx.v5.onset.startShoot({ calendarEventId: active.event.id }), '现场拍摄已开始'));
  document.getElementById('complete-shoot-btn')?.addEventListener('click', () => runOnset(ctx, active => ctx.v5.onset.completeShoot({ calendarEventId: active.event.id }), '拍摄已完成，后期任务已建立'));
  document.querySelectorAll('[data-shot-status]').forEach(button => button.addEventListener('click', () => runOnset(ctx, active => ctx.v5.onset.updateShotCaptureStatus({ shotId: button.dataset.shotId, calendarEventId: active.event.id, captureStatus: button.dataset.shotStatus, notes: '' }), '镜头状态已记录')));
}

function runOnset(ctx, action, message) { try { const model = ctx.v5.queries.scheduleWorkspace.get(ctx.project.id); const id = ctx.storage.get(`selectedShootEvent:${ctx.project.id}`, ''); const active = model.getEvent(id); if (!active) return; action(active); toast(message); ctx.refresh(); } catch (error) { toast(error.message); } }
function renderShot(shot, index, eventId) { const status = shot.captureStatus || 'planned'; return `<article class="execution-shot ${status}" data-event-id="${escapeHtml(eventId)}"><div class="shot-index">${shot.sequence || index + 1}</div><div class="execution-shot-main"><h3>${escapeHtml(shot.scene || `镜头 ${index + 1}`)}</h3><p>${escapeHtml(shot.shotSize || '')} · ${escapeHtml(shot.focalLength || '')} · ${escapeHtml(shot.poseGuidance || '')}</p><p>${escapeHtml(shot.lighting || '')}</p></div><div class="execution-actions"><button class="button ${status === 'captured' ? 'primary' : 'secondary'}" data-shot-id="${escapeHtml(shot.id)}" data-shot-status="captured">完成</button><button class="button ghost" data-shot-id="${escapeHtml(shot.id)}" data-shot-status="retake_required">补拍</button><button class="button ghost" data-shot-id="${escapeHtml(shot.id)}" data-shot-status="skipped">跳过</button></div></article>`; }
function renderCalendar(value, events) { const [year, month] = value.split('-').map(Number); const leading = (new Date(year, month - 1, 1).getDay() + 6) % 7; const days = new Date(year, month, 0).getDate(); const cells = Array.from({ length: leading }, () => '<div class="calendar-cell muted"></div>'); for (let day = 1; day <= days; day += 1) { const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`; const matches = events.filter(item => String(item.startAt).slice(0,10) === date); cells.push(`<button class="calendar-cell ${matches.length ? 'has-event' : ''}" data-calendar-date="${date}"><strong>${day}</strong>${matches.slice(0,2).map(item => `<span>${escapeHtml(item.title)}</span>`).join('')}</button>`); } return `<div class="calendar-weekdays">${['一','二','三','四','五','六','日'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div>`; }
function financeCard(label, value) { return `<article class="card"><h2>${label}</h2><p>预计 ¥${value.expected} · 已收 ¥${value.received}</p><p>支出 ¥${value.expense} · 净收入 ¥${value.netReceived}</p></article>`; }
function combine(date, time) { return `${date}T${time || '09:00'}`; }
function shiftMonth(value, delta) { const [year, month] = value.split('-').map(Number); const date = new Date(year, month - 1 + delta, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}`; }
function formatMonth(value) { const [year, month] = value.split('-'); return `${year} 年 ${Number(month)} 月`; }

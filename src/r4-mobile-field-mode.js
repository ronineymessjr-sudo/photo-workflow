// R4-E Mobile Field Mode and mobile Schedule adapter
// PhotoAtelier R4 visual system - mobile-only surfaces

const R4_TOKENS = {
  canvas: '#111312',
  raised: '#191D1B',
  selected: '#242A27',
  border: '#303833',
  primaryText: '#F2F5F1',
  secondaryText: '#B5BDB6',
  tertiaryText: '#7D887F',
  action: '#8DB89E',
  warning: '#D6A75B',
  danger: '#D9776D',
  success: '#75B892',
};

const BOTTOM_NAV = [
  { id: 'plans', label: '方案', icon: 'clipboard-list' },
  { id: 'references', label: '参考', icon: 'images' },
  { id: 'schedule', label: '日程', icon: 'calendar-days' },
  { id: 'me', label: '我的', icon: 'user' },
];

const DEFAULT_STATE = {
  plan: null,
  shots: [],
  references: [],
  currentShotIndex: 0,
  completedShotIds: new Set(),
  notes: {},
  schedules: [],
  activeTab: 'plans',
  reducedMotion: false,
};

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function lucideIcon(name, size = 20) {
  return `<i data-lucide="${escHtml(name)}" style="width:${size}px;height:${size}px" aria-hidden="true"></i>`;
}

function refreshIcons(root) {
  if (window.PhotoAtelierR4IconSystem?.refreshIcons) {
    window.PhotoAtelierR4IconSystem.refreshIcons(root);
  } else if (window.lucide?.createIcons) {
    window.lucide.createIcons({ nameAttr: 'data-lucide' });
  }
}

function normalizeState(state) {
  const s = { ...DEFAULT_STATE, ...state };
  if (!(s.completedShotIds instanceof Set)) {
    s.completedShotIds = new Set(Array.from(s.completedShotIds || []));
  }
  return s;
}

function getCurrentShot(state) {
  const shots = state.shots || [];
  if (!shots.length) return null;
  let idx = Math.max(0, Math.min(state.currentShotIndex, shots.length - 1));
  // Prefer the next uncompleted shot on first mount.
  if (state.completedShotIds.has(shots[idx]?.id)) {
    const next = shots.findIndex((shot) => !state.completedShotIds.has(shot.id));
    if (next >= 0) idx = next;
  }
  return shots[idx] || shots[0];
}

function getReferenceForShot(state, shot) {
  if (!shot || !state.references) return null;
  if (shot.referenceId) {
    return state.references.find((r) => r.id === shot.referenceId) || null;
  }
  return null;
}

function formatTime(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m)) return '';
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} 小时 ${r} 分钟` : `${h} 小时`;
}

function renderBottomNav(state, onTabChange) {
  const items = BOTTOM_NAV.map((item) => {
    const selected = state.activeTab === item.id;
    return `
      <button
        type="button"
        class="r4-bottom-nav__item${selected ? ' r4-bottom-nav__item--selected' : ''}"
        data-nav="${escHtml(item.id)}"
        aria-current="${selected ? 'page' : 'false'}"
        aria-label="${escHtml(item.label)}"
      >
        <span class="r4-bottom-nav__icon">${lucideIcon(item.icon, 20)}</span>
        <span class="r4-bottom-nav__label">${escHtml(item.label)}</span>
      </button>
    `;
  }).join('');
  return `<nav class="r4-bottom-nav" aria-label="移动主导航">${items}</nav>`;
}

function renderFieldMode(state, handlers = {}) {
  state = normalizeState(state);
  const shot = getCurrentShot(state);
  const reference = getReferenceForShot(state, shot);
  const completed = shot ? state.completedShotIds.has(shot.id) : false;
  const remaining = state.shots.filter((s) => !state.completedShotIds.has(s.id)).length;

  const referenceHtml = reference
    ? `
      <figure class="r4-shot-reference">
        <img
          src="${escHtml(reference.url || reference.thumbnailUrl || '')}"
          alt="${escHtml(reference.title || '当前参考图')}"
          class="r4-shot-reference__image"
          loading="eager"
        />
        ${reference.synthetic ? '<figcaption class="r4-shot-reference__badge">AI 概念图</figcaption>' : ''}
      </figure>
    `
    : `
      <div class="r4-shot-reference r4-shot-reference--empty">
        <span class="r4-shot-reference__placeholder-icon">${lucideIcon('images', 24)}</span>
        <p class="r4-shot-reference__placeholder-text">当前镜头暂无参考图</p>
      </div>
    `;

  const shotTitle = shot
    ? `<h1 class="r4-shot-title">${escHtml(shot.number ? `镜头 ${shot.number}` : '')}${escHtml(shot.title || shot.name || '未命名镜头')}</h1>`
    : `<h1 class="r4-shot-title">暂无拍摄镜头</h1>`;

  const metaRows = [];
  if (shot?.lens || shot?.focalLength) {
    metaRows.push({ label: '镜头', value: shot.lens || shot.focalLength });
  }
  if (shot?.pose || shot?.movement) {
    metaRows.push({ label: '姿势 / 动作', value: shot.pose || shot.movement });
  }
  if (shot?.lighting || shot?.lightingDirection) {
    metaRows.push({ label: '光线方向', value: shot.lighting || shot.lightingDirection });
  }
  if (shot?.estimatedMinutes || shot?.duration) {
    metaRows.push({ label: '预计用时', value: formatTime(shot.estimatedMinutes || shot.duration) });
  }

  const metaHtml = metaRows.length
    ? `<dl class="r4-shot-meta">
        ${metaRows.map((row) => `
          <div class="r4-shot-meta__row">
            <dt class="r4-shot-meta__label">${escHtml(row.label)}</dt>
            <dd class="r4-shot-meta__value">${escHtml(row.value)}</dd>
          </div>
        `).join('')}
      </dl>`
    : '';

  const progressHtml = state.shots.length
    ? `<div class="r4-shot-progress" role="status" aria-live="polite">
        <span class="r4-shot-progress__count">已完成 ${state.shots.length - remaining} / ${state.shots.length}</span>
        <span class="r4-shot-progress__remaining">${remaining ? `剩余 ${remaining} 个镜头` : '全部完成'}</span>
      </div>`
    : '';

  const primaryAction = shot
    ? `<button
        type="button"
        class="r4-btn r4-btn--primary r4-btn--block${completed ? ' r4-btn--success' : ''}"
        data-action="mark-complete"
        aria-pressed="${completed ? 'true' : 'false'}"
      >
        <span class="r4-btn__icon">${lucideIcon(completed ? 'check' : 'check', 20)}</span>
        <span>${completed ? '已完成' : '标记拍摄完成'}</span>
      </button>`
    : '';

  const secondaryActions = shot
    ? `<div class="r4-shot-actions">
        <button type="button" class="r4-btn r4-btn--secondary" data-action="view-reference">
          <span class="r4-btn__icon">${lucideIcon('external-link', 18)}</span>
          <span>查看参考</span>
        </button>
        <button type="button" class="r4-btn r4-btn--secondary" data-action="add-note">
          <span>添加笔记</span>
        </button>
      </div>`
    : '';

  return `
    <section class="r4-field-mode" aria-label="移动现场模式">
      <header class="r4-field-header">
        <h2 class="r4-field-header__plan">${escHtml(state.plan?.name || state.plan?.title || '当前方案')}</h2>
        ${progressHtml}
      </header>
      <main class="r4-field-body">
        ${referenceHtml}
        <div class="r4-shot-card">
          ${shotTitle}
          ${metaHtml}
          ${primaryAction}
          ${secondaryActions}
        </div>
      </main>
      ${renderBottomNav(state, handlers.onTabChange)}
    </section>
  `;
}

function renderSchedule(state, handlers = {}) {
  state = normalizeState(state);
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = state.selectedScheduleDate || today;
  const monthStart = new Date(selectedDate.slice(0, 7) + '-01');
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const startWeekday = monthStart.getDay();

  const schedulesByDay = {};
  for (const sched of state.schedules || []) {
    const d = sched.date || sched.scheduledDate;
    if (!d) continue;
    if (!schedulesByDay[d]) schedulesByDay[d] = [];
    schedulesByDay[d].push(sched);
  }

  const weekLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push('<div class="r4-cal-cell r4-cal-cell--pad"></div>');
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dateStr = `${selectedDate.slice(0, 8)}${String(d).padStart(2, '0')}`;
    const hasPlan = !!schedulesByDay[dateStr]?.length;
    const isToday = dateStr === today;
    const isSelected = dateStr === selectedDate;
    cells.push(`
      <button
        type="button"
        class="r4-cal-cell${isSelected ? ' r4-cal-cell--selected' : ''}${isToday ? ' r4-cal-cell--today' : ''}${hasPlan ? ' r4-cal-cell--marked' : ''}"
        data-date="${escHtml(dateStr)}"
        aria-label="${escHtml(dateStr)}${hasPlan ? '，有日程' : ''}"
      >
        <span class="r4-cal-cell__day">${d}</span>
        ${hasPlan ? '<span class="r4-cal-cell__dot" aria-hidden="true"></span>' : ''}
      </button>
    `);
  }

  const dayPlans = schedulesByDay[selectedDate] || [];

  return `
    <section class="r4-schedule" aria-label="移动日程">
      <header class="r4-schedule__header">
        <button type="button" class="r4-btn r4-btn--ghost r4-btn--icon" data-action="prev-month" aria-label="上一月">
          ${lucideIcon('chevron-left', 20)}
        </button>
        <h2 class="r4-schedule__title">${escHtml(selectedDate.slice(0, 7))}</h2>
        <button type="button" class="r4-btn r4-btn--ghost r4-btn--icon" data-action="next-month" aria-label="下一月">
          ${lucideIcon('chevron-right', 20)}
        </button>
      </header>
      <div class="r4-cal-grid" role="grid" aria-label="月份日历">
        ${weekLabels.map((l) => `<div class="r4-cal-weekday" role="columnheader">${escHtml(l)}</div>`).join('')}
        ${cells.join('')}
      </div>
      <div class="r4-schedule__plans">
        <h3 class="r4-schedule__subheading">${escHtml(selectedDate)} 的方案</h3>
        ${dayPlans.length
          ? dayPlans.map((p) => `
            <div class="r4-schedule__plan">
              <div class="r4-schedule__plan-title">${escHtml(p.title || p.name || '未命名日程')}</div>
              <div class="r4-schedule__plan-meta">${escHtml(p.location || '')} ${escHtml(p.time || '')}</div>
            </div>
          `).join('')
          : '<p class="r4-empty-state">当日没有拍摄安排</p>'}
      </div>
      ${renderBottomNav(state, handlers.onTabChange)}
    </section>
  `;
}

function bindFieldMode(container, state, handlers = {}) {
  const root = typeof container === 'string' ? document.querySelector(container) : container;
  if (!root) return null;

  function update(newState) {
    const merged = { ...state, ...newState };
    state = normalizeState(merged);
    root.innerHTML = renderFieldMode(state, handlers);
    refreshIcons(root);
    bindEvents(root, state);
  }

  function bindEvents(el, currentState) {
    el.querySelector('[data-action="mark-complete"]')?.addEventListener('click', () => {
      const shot = getCurrentShot(currentState);
      if (!shot) return;
      const completed = currentState.completedShotIds.has(shot.id);
      if (completed) {
        currentState.completedShotIds.delete(shot.id);
      } else {
        currentState.completedShotIds.add(shot.id);
      }
      if (handlers.onMarkComplete) handlers.onMarkComplete(shot.id, !completed, currentState);
      // Advance to next uncompleted shot automatically when marking complete.
      if (!completed) {
        const nextIndex = currentState.shots.findIndex((s) => !currentState.completedShotIds.has(s.id));
        if (nextIndex >= 0) currentState.currentShotIndex = nextIndex;
      }
      update(currentState);
    });

    el.querySelector('[data-action="view-reference"]')?.addEventListener('click', () => {
      const shot = getCurrentShot(currentState);
      const ref = getReferenceForShot(currentState, shot);
      if (handlers.onViewReference) handlers.onViewReference(ref, shot);
      else if (ref?.url) window.open(ref.url, '_blank');
    });

    el.querySelector('[data-action="add-note"]')?.addEventListener('click', () => {
      const shot = getCurrentShot(currentState);
      if (!shot) return;
      openNoteSheet(shot.id, currentState, handlers.onNoteChange ? (id, note) => handlers.onNoteChange(id, note, currentState) : null);
    });

    el.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-nav');
        if (handlers.onTabChange) handlers.onTabChange(tab, currentState);
      });
    });
  }

  update(state);
  return { update, state: () => state };
}

function bindSchedule(container, state, handlers = {}) {
  const root = typeof container === 'string' ? document.querySelector(container) : container;
  if (!root) return null;

  function update(newState) {
    const merged = { ...state, ...newState };
    state = normalizeState(merged);
    root.innerHTML = renderSchedule(state, handlers);
    refreshIcons(root);
    bindEvents(root, state);
  }

  function bindEvents(el, currentState) {
    el.querySelectorAll('[data-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const date = btn.getAttribute('data-date');
        currentState.selectedScheduleDate = date;
        if (handlers.onDateSelect) handlers.onDateSelect(date, currentState);
        update(currentState);
      });
    });

    el.querySelector('[data-action="prev-month"]')?.addEventListener('click', () => {
      const d = new Date(currentState.selectedScheduleDate || new Date().toISOString().slice(0, 10));
      d.setMonth(d.getMonth() - 1);
      currentState.selectedScheduleDate = d.toISOString().slice(0, 10);
      update(currentState);
    });

    el.querySelector('[data-action="next-month"]')?.addEventListener('click', () => {
      const d = new Date(currentState.selectedScheduleDate || new Date().toISOString().slice(0, 10));
      d.setMonth(d.getMonth() + 1);
      currentState.selectedScheduleDate = d.toISOString().slice(0, 10);
      update(currentState);
    });

    el.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-nav');
        if (handlers.onTabChange) handlers.onTabChange(tab, currentState);
      });
    });
  }

  update(state);
  return { update, state: () => state };
}

function openNoteSheet(shotId, state, onSave) {
  const existing = document.querySelector('.r4-sheet');
  if (existing) existing.remove();

  const root = document.createElement('div');
  root.className = `r4-sheet${state.reducedMotion ? ' r4-sheet--reduced' : ''}`;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'r4-note-sheet-title');
  root.innerHTML = `
    <div class="r4-sheet__backdrop" data-sheet-close></div>
    <div class="r4-sheet__panel">
      <div class="r4-sheet__handle" aria-hidden="true"></div>
      <h3 id="r4-note-sheet-title" class="r4-sheet__title">添加笔记</h3>
      <textarea
        class="r4-sheet__textarea"
        rows="5"
        placeholder="记录现场光线、模特状态或任何需要注意的事…"
        data-sheet-input
      >${escHtml(state.notes?.[shotId] || '')}</textarea>
      <div class="r4-sheet__actions">
        <button type="button" class="r4-btn r4-btn--quiet" data-sheet-close>取消</button>
        <button type="button" class="r4-btn r4-btn--primary" data-sheet-save>保存</button>
      </div>
    </div>
  `;

  document.body.appendChild(root);
  requestAnimationFrame(() => root.classList.add('r4-sheet--open'));

  const input = root.querySelector('[data-sheet-input]');
  input?.focus();

  function close() {
    root.classList.remove('r4-sheet--open');
    const remove = () => root.remove();
    if (state.reducedMotion) remove();
    else root.addEventListener('transitionend', remove, { once: true });
  }

  root.querySelectorAll('[data-sheet-close]').forEach((el) => {
    el.addEventListener('click', close);
  });

  root.querySelector('[data-sheet-save]')?.addEventListener('click', () => {
    const note = input?.value || '';
    if (!state.notes) state.notes = {};
    state.notes[shotId] = note;
    if (onSave) onSave(shotId, note);
    close();
  });
}

export function renderMobileFieldMode(container, state, handlers) {
  return bindFieldMode(container, state, handlers);
}

export function renderMobileSchedule(container, state, handlers) {
  return bindSchedule(container, state, handlers);
}

export function initMobileFieldMode(options = {}) {
  const container = options.container || document.getElementById('r4-mobile-field-mode');
  if (!container) return null;
  return renderMobileFieldMode(container, options.state || {}, options.handlers || {});
}

export function initMobileSchedule(options = {}) {
  const container = options.container || document.getElementById('r4-mobile-schedule');
  if (!container) return null;
  return renderMobileSchedule(container, options.state || {}, options.handlers || {});
}

// Stable global aliases for cross-package integration.
if (typeof window !== 'undefined') {
  window.PhotoAtelierR4MobileField = {
    renderMobileFieldMode,
    renderMobileSchedule,
    initMobileFieldMode,
    initMobileSchedule,
    BOTTOM_NAV,
  };
}

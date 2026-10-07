(() => {
  const API_BASE = localStorage.getItem('pa_api_base') || 'https://photoatelier-api.photomagic.workers.dev';
  const token = localStorage.getItem('pw_token');
  const user = (() => { try { return JSON.parse(localStorage.getItem('pw_user') || '{}'); } catch { return {}; } })();
  const query = new URLSearchParams(location.search);
  const inboundEvent = query.get('event');
  const inboundToken = query.get('invite');
  if (inboundEvent && inboundToken) {
    sessionStorage.setItem('pw_pending_crew_event', inboundEvent);
    sessionStorage.setItem('pw_pending_crew_token', inboundToken);
  }
  const state = { schedules: [], events: [], event: null, membership: null, members: [], timer: null };
  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const roleNames = { model: '模特', assistant: '摄影助理' };
  const statusNames = { scheduled: '待拍摄', completed: '已完成', cancelled: '已取消', invited: '待确认', accepted: '已加入', declined: '已婉拒' };

  function toast(message, isError = false) {
    const el = byId('toast');
    el.textContent = message;
    el.classList.toggle('error', isError);
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function setNotice(message) {
    const el = byId('backendNotice');
    el.textContent = message || '';
    el.hidden = !message;
  }

  async function request(path, method = 'GET', body) {
    const response = await fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.message || data.error || `请求失败 (${response.status})`), { code: data.error, status: response.status });
    return data;
  }

  function timeLabel(date, time) {
    const dateText = date ? new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : '未设置日期';
    return time ? `${dateText} · ${time}` : dateText;
  }

  function statusText(event) {
    return statusNames[event.access === 'invited' ? event.membership?.status : event.status] || '进行中';
  }

  async function loadSchedules() {
    const select = byId('scheduleSelect');
    try {
      const data = await request('/api/schedules');
      state.schedules = Array.isArray(data.schedules) ? data.schedules : [];
      select.innerHTML = '<option value="">选择一个已确认的拍摄日程</option>' + state.schedules.map(item =>
        `<option value="${esc(item.id)}">${esc(item.date || '待定')} · ${esc(item.title || '未命名方案')}</option>`
      ).join('');
      select.disabled = state.schedules.length === 0;
      if (!state.schedules.length) select.innerHTML = '<option value="">请先在工作台创建拍摄日程</option>';
    } catch (err) {
      select.innerHTML = '<option value="">暂时无法读取日程</option>';
      select.disabled = true;
      toast(`日程读取失败：${err.message}`, true);
    }
  }

  async function loadEvents(selectId) {
    try {
      const data = await request('/api/collab/events');
      state.events = Array.isArray(data.events) ? data.events : [];
      setNotice('');
      renderEventList();
      const chosen = selectId || query.get('event') || sessionStorage.getItem('pw_pending_crew_event') || state.event?.id;
      if (chosen && state.events.some(event => event.id === chosen)) await selectEvent(chosen);
      else if (state.events.length) await selectEvent(state.events[0].id);
      else showEmpty();
    } catch (err) {
      state.events = [];
      renderEventList();
      if (err.code === 'COLLAB_SCHEMA_NOT_INSTALLED') setNotice('协作表结构尚未安装。请管理员应用仓库中的 Supabase migration 后刷新；数据不会保存在浏览器假装同步。');
      else if (err.code === 'COLLAB_BACKEND_NOT_CONFIGURED') setNotice('协作服务端尚未配置数据库服务密钥，跨账号协作暂不可用。');
      else setNotice(`协作空间读取失败：${err.message}`);
      showEmpty();
    }
  }

  function renderEventList() {
    const root = byId('eventList');
    byId('eventCount').textContent = String(state.events.length);
    byId('listEmpty').hidden = state.events.length > 0;
    root.innerHTML = state.events.map(event => `
      <button type="button" class="event-item ${state.event?.id === event.id ? 'selected' : ''}" data-event="${esc(event.id)}">
        <strong>${esc(event.title)}</strong>
        <span>${esc(timeLabel(event.shoot_date, event.time))}</span>
        <span class="event-state">${esc(statusText(event))}${event.access === 'invited' ? ' · 邀请' : ''}</span>
      </button>`).join('');
    root.querySelectorAll('[data-event]').forEach(button => button.addEventListener('click', () => selectEvent(button.dataset.event)));
  }

  function showEmpty() {
    state.event = null;
    byId('detailEmpty').hidden = false;
    byId('detailContent').hidden = true;
    renderEventList();
  }

  async function selectEvent(id) {
    try {
      const data = await request(`/api/collab/events/${encodeURIComponent(id)}`);
      state.event = data.event;
      state.members = data.members || [];
      state.membership = data.event.membership || null;
      history.replaceState(null, '', `?event=${encodeURIComponent(id)}`);
      renderEventList();
      const active = state.event.access !== 'invited';
      const [messagesData, activityData] = active ? await Promise.all([
        request(`/api/collab/events/${encodeURIComponent(id)}/messages`),
        request(`/api/collab/events/${encodeURIComponent(id)}/activity`),
      ]) : [{ messages: [] }, { activity: [] }];
      renderDetail(messagesData.messages || [], activityData.activity || []);
    } catch (err) {
      toast(err.message, true);
      await loadEvents();
    }
  }

  function summaryText(summary) {
    if (!summary) return '方案说明暂未附加。可以回方案库继续查看完整方案。';
    if (typeof summary === 'string') return summary;
    const preferred = ['title', 'theme', 'style', 'concept', 'summary', 'brief', 'description'];
    const entries = preferred.filter(key => summary[key]).map(key => `${key === 'title' ? '方案' : key === 'theme' ? '主题' : key === 'style' ? '风格' : '说明'}：${summary[key]}`);
    return entries.length ? entries.join('\n') : '方案已关联。请回方案库查看完整分镜与执行细节。';
  }

  function renderDetail(messages, activityItems) {
    const event = state.event;
    const isOwner = event.access === 'owner';
    const invited = event.access === 'invited';
    const declined = event.access === 'declined';
    byId('detailEmpty').hidden = true;
    const root = byId('detailContent');
    root.hidden = false;
    const locationText = event.location || (invited ? '确认加入后显示' : '未设置');
    const membersHtml = state.members.map(member => `
      <div class="member-row"><span><strong>${esc(roleNames[member.role] || '成员')}</strong>${isOwner || member.status === 'accepted' ? ` · ${esc(member.invitee_email)}` : ''}</span><span class="member-state">${esc(statusNames[member.status] || member.status)}</span></div>`).join('') || '<p class="hint">还没有其他成员。</p>';
    const messageHtml = messages.map(message => `
      <div class="message ${message.sender_id === user.id ? 'mine' : ''}"><div class="message-head"><span>${message.sender_id === user.id ? '我' : '协作成员'}</span><time>${esc(new Date(message.created_at).toLocaleString('zh-CN'))}</time></div><div class="message-body">${esc(message.body)}</div></div>`).join('') || '<p class="hint">还没有讨论消息。可以在这里确认集合时间、分镜重点和现场变化。</p>';
    const activityHtml = activityItems.map(item => `
      <div class="activity-item"><span class="activity-dot"></span><div>${esc(item.summary)}<time>${esc(new Date(item.created_at).toLocaleString('zh-CN'))}</time></div></div>`).join('') || '<p class="hint">拍摄变更与成员确认会记录在这里。</p>';
    const inviteForm = isOwner ? `
      <form id="inviteForm" class="invite-form"><input id="inviteEmail" type="email" autocomplete="email" placeholder="受邀者账号邮箱" required maxlength="255"><select id="inviteRole" aria-label="成员角色"><option value="model">模特</option><option value="assistant">摄影助理</option></select><button class="button" type="submit">生成邀请</button></form>
      <div id="inviteResult" class="invite-link" hidden></div><p class="hint">系统不会代发邮件。生成后复制链接，通过你信任的方式发给对应邮箱用户。</p>` : '';
    const inviteActions = invited ? `<div class="invite-prompt"><p>你受邀以「${esc(roleNames[event.membership?.role] || '成员')}」参与这场拍摄。确认加入后才会显示详细地点和活动讨论。邀请链接 14 天内有效。</p><div class="invite-actions"><button id="acceptInvite" class="button primary" type="button">接受邀请</button><button id="declineInvite" class="button" type="button">婉拒</button></div></div>` : '';
    const declinedNote = declined ? '<div class="invite-prompt"><p>你已婉拒这场拍摄邀请；如需重新加入，请联系创建者重新邀请。</p></div>' : '';
    const statusControl = isOwner ? `<select id="eventStatus" aria-label="拍摄状态"><option value="scheduled" ${event.status === 'scheduled' ? 'selected' : ''}>待拍摄</option><option value="completed" ${event.status === 'completed' ? 'selected' : ''}>已完成</option><option value="cancelled" ${event.status === 'cancelled' ? 'selected' : ''}>已取消</option></select>` : '';
    const composer = !invited ? `<form id="messageForm" class="composer"><textarea id="messageInput" maxlength="2000" rows="2" placeholder="发送与这场拍摄有关的消息…" required></textarea><button class="button primary" type="submit">发送</button></form>` : '';

    root.innerHTML = `
      <div class="event-title-row"><div><h2>${esc(event.title)}</h2><p class="event-subtitle">来自方案日程 · ${esc(event.plan_id ? `方案 ${event.plan_id}` : '未关联方案编号')}</p></div><span class="status-pill ${esc(event.status)}">${esc(statusText(event))}</span></div>
      <div class="event-meta"><span>${esc(timeLabel(event.shoot_date, event.time))}</span><span>地点：${esc(locationText)}</span>${isOwner ? `<span>${statusControl}</span>` : ''}</div>
      ${inviteActions}
      ${declinedNote}
      <div class="event-content" ${invited || declined ? 'hidden' : ''}>
        <div>
          <section class="section"><h3>关联方案</h3><div class="summary">${esc(summaryText(event.plan_summary))}</div></section>
          <section class="section"><h3>活动讨论</h3><div id="messages" class="messages">${messageHtml}</div>${composer}</section>
        </div>
        <div>
          <section class="section"><h3>参与成员</h3><div class="members">${membersHtml}</div>${inviteForm}</section>
          <section class="section"><h3>活动记录</h3><div class="activity-list">${activityHtml}</div></section>
        </div>
      </div>`;

    byId('messageForm')?.addEventListener('submit', sendMessage);
    byId('inviteForm')?.addEventListener('submit', createInvite);
    byId('acceptInvite')?.addEventListener('click', () => respondInvite('accept'));
    byId('declineInvite')?.addEventListener('click', () => respondInvite('decline'));
    byId('eventStatus')?.addEventListener('change', changeStatus);
  }

  async function createEvent() {
    const scheduleId = byId('scheduleSelect').value;
    if (!scheduleId) return toast('先在工作台创建并选择一条拍摄日程。', true);
    try {
      const result = await request('/api/collab/events', 'POST', { scheduleId });
      toast(result.existing ? '这条日程已有关联协作空间。' : '协作空间已建立。');
      await loadEvents(result.event.id);
    } catch (err) { toast(err.message, true); }
  }

  async function createInvite(event) {
    event.preventDefault();
    try {
      const result = await request(`/api/collab/events/${encodeURIComponent(state.event.id)}/members`, 'POST', {
        email: byId('inviteEmail').value,
        role: byId('inviteRole').value,
      });
      const inviteUrl = new URL(result.inviteUrl, location.href).href;
      const eventId = state.event.id;
      byId('inviteEmail').value = '';
      await selectEvent(eventId);
      const resultEl = byId('inviteResult');
      resultEl.hidden = false;
      resultEl.innerHTML = `<span>${esc(inviteUrl)}</span> <button id="copyInvite" class="button" type="button">复制链接</button>`;
      byId('copyInvite').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(inviteUrl); toast('邀请链接已复制，请手动发给受邀邮箱。'); }
        catch { toast(inviteUrl); }
      });
      toast('邀请已记录；还没有发送邮件。');
    } catch (err) { toast(err.message, true); }
  }

  async function respondInvite(action) {
    try {
      const eventId = state.event.id;
      const inviteToken = query.get('invite') || (sessionStorage.getItem('pw_pending_crew_event') === eventId ? sessionStorage.getItem('pw_pending_crew_token') : '');
      await request(`/api/collab/events/${encodeURIComponent(eventId)}/${action}`, 'POST', { token: inviteToken });
      sessionStorage.removeItem('pw_pending_crew_event');
      sessionStorage.removeItem('pw_pending_crew_token');
      toast(action === 'accept' ? '已加入拍摄协作。' : '已婉拒邀请。');
      await loadEvents(eventId);
    } catch (err) { toast(err.message, true); }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const input = byId('messageInput');
    const content = input.value.trim();
    if (!content) return;
    try {
      await request(`/api/collab/events/${encodeURIComponent(state.event.id)}/messages`, 'POST', { content });
      input.value = '';
      await selectEvent(state.event.id);
    } catch (err) { toast(err.message, true); }
  }

  async function changeStatus(event) {
    const status = event.target.value;
    try {
      await request(`/api/collab/events/${encodeURIComponent(state.event.id)}/status`, 'PATCH', { status });
      toast('拍摄状态已同步给活动成员。');
      await loadEvents(state.event.id);
    } catch (err) { toast(err.message, true); }
  }

  async function boot() {
    const authenticated = token && token !== 'local-token' && user.id;
    if (!authenticated) {
      byId('authGate').hidden = false;
      byId('authMessage').textContent = '请先在摄影工作台使用真实账号登录。受邀成员也必须使用邀请邮箱登录后确认加入。';
      return;
    }
    byId('app').hidden = false;
    byId('accountLabel').textContent = user.email || '已登录';
    byId('createEvent').addEventListener('click', createEvent);
    await Promise.all([loadSchedules(), loadEvents()]);
    state.timer = setInterval(async () => {
      if (document.hidden) return;
      await loadEvents(state.event?.id);
    }, 20000);
    addEventListener('pagehide', () => clearInterval(state.timer), { once: true });
  }

  boot();
})();

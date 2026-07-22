import { inferWorkflowStage } from '../core/schema.js';
import { escapeHtml, formatDate, formToObject, toast } from '../core/utils.js';
import { buildRoleBrief, computeProjectReadiness, WORKSPACE_ROLES } from '../services/role-workspace.js';

export function renderDashboard(ctx) {
  const { data, project } = ctx;
  const refs = data.listByProject('references', project.id);
  const plans = data.listByProject('plans', project.id).sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
  const tasks = data.listByProject('tasks', project.id);
  const reviews = data.listByProject('reviews', project.id);
  const messages = data.listByProject('messages', project.id);
  const done = tasks.filter(item => item.status === 'done').length;
  const activePlan = plans.find(item => item.planStatus === 'confirmed' && item.planStatus !== 'archived') || plans[0];
  const pendingRefs = refs.filter(item => !['verified', 'private', 'commercial-ok'].includes(item.verificationStatus)).length;
  const lastSync = ctx.storage.get('lastSyncSummary', null);
  const role = ctx.storage.get('workspaceRole', 'photographer');
  const roleBrief = buildRoleBrief(data, project.id, role, activePlan?.id || '');
  const readiness = computeProjectReadiness(data, project.id, activePlan?.id || '');

  return `
    <section class="page-header">
      <div>
        <h1>${escapeHtml(project.title)}</h1>
        <p>${escapeHtml(project.brief || '围绕同一个 Project 管理参考、方案、执行、消息、后期和复盘。')}</p>
      </div>
      <span class="status-pill">${escapeHtml(activePlan ? inferWorkflowStage(activePlan) : project.status || 'active')}</span>
    </section>

    <section class="grid cols-4">
      ${metric('参考记录', refs.length)}
      ${metric('待验证参考', pendingRefs)}
      ${metric('任务完成', `${done}/${tasks.length}`)}
      ${metric('复盘记录', reviews.length)}
    </section>

    <section class="card plan-section role-dashboard-card">
      <div class="status-row"><div><h2>${escapeHtml(WORKSPACE_ROLES[role]?.label || role)}视角</h2><p class="hint">${escapeHtml(WORKSPACE_ROLES[role]?.description || '')}</p></div><span class="status-pill ${readiness.status === 'ready' ? 'badge-ok' : readiness.status === 'blocked' ? 'badge-danger' : 'badge-warn'}">开拍就绪 ${readiness.score}%</span></div>
      <p class="role-summary">${escapeHtml(roleBrief.summary || project.brief || '')}</p>
      <div class="grid cols-3">${roleBrief.priorities.map((item, index) => `<article class="role-priority"><span>${index + 1}</span><p>${escapeHtml(item)}</p></article>`).join('')}</div>
      <div class="stack-actions"><button class="button secondary" data-go-page="crew">打开团队与通告</button><button class="button ghost" data-go-page="schedule">进入现场执行</button></div>
    </section>

    <section class="grid cols-2 plan-section">
      <article class="card">
        <h2>项目概况</h2>
        <table>
          <tr><th>类型</th><td>${escapeHtml(project.shootingType || '未设置')}</td></tr>
          <tr><th>日期</th><td>${escapeHtml(project.date || '未设置')}</td></tr>
          <tr><th>地点</th><td>${escapeHtml(project.location || '未设置')}</td></tr>
          <tr><th>风格</th><td>${escapeHtml(project.style || '未设置')}</td></tr>
          <tr><th>当前方案</th><td>${escapeHtml(activePlan?.concept || '尚未生成')}</td></tr>
          <tr><th>更新时间</th><td>${formatDate(project.updatedAt)}</td></tr>
        </table>
      </article>

      <article class="card">
        <h2>下一步</h2>
        ${renderNextStep(activePlan, pendingRefs, reviews.length)}
        <div class="list plan-section">
          ${tasks.filter(item => item.status !== 'done').slice(0, 5).map(item => `<div class="list-item"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.taskType || item.phase || '任务')} · ${escapeHtml(item.dueAt || item.startAt || '未设截止')}</p></div></div>`).join('') || '<div class="empty">暂无待办。</div>'}
        </div>
      </article>
    </section>

    <section class="grid cols-2 plan-section">
      <article class="card">
        <h2>方案状态</h2>
        <div class="list">${plans.slice(0, 6).map(plan => `<div class="list-item"><div><h3>${escapeHtml(plan.concept || plan.title || plan.id)}</h3><p>${escapeHtml(inferWorkflowStage(plan))} · ${formatDate(plan.updatedAt)}</p></div><span class="tag">${escapeHtml(plan.planStatus || 'draft')}</span></div>`).join('') || '<div class="empty">暂无方案。</div>'}</div>
      </article>
      <article class="card">
        <h2>运行状态</h2>
        <table>
          <tr><th>本地数据审计</th><td>${data.auditIntegrity().ok ? '<span class="badge-ok">通过</span>' : '<span class="badge-warn">需要检查</span>'}</td></tr>
          <tr><th>最近远端同步</th><td>${lastSync ? `${formatDate(lastSync.completedAt)} · 新建 ${lastSync.created} / 更新 ${lastSync.updated}` : '尚未同步'}</td></tr>
          <tr><th>Legacy 迁移</th><td>${ctx.storage.get('legacyMigrationReport', null)?.completed ? '已完成' : '未执行或无旧数据'}</td></tr>
          <tr><th>正式入口</th><td>V2 Canonical Workspace</td></tr>
        </table>
      </article>
    </section>

    <section class="card plan-section">
      <div class="page-header" style="margin-bottom:16px">
        <div><h2 style="margin:0 0 6px">项目消息与协作记录</h2><p>消息看板整合到工作台，不再占用单独页面。</p></div>
      </div>
      <form id="message-form" class="form-grid">
        <label>类型<select name="type"><option>提醒</option><option>协作</option><option>客户反馈</option><option>系统</option></select></label>
        <label>状态<select name="status"><option value="unread">未读</option><option value="read">已读</option></select></label>
        <label class="full">消息内容<textarea name="content" rows="3" required></textarea></label>
        <div class="full"><button class="button primary">添加消息</button></div>
      </form>
      <div class="list plan-section">
        ${messages.map(item => `<div class="list-item"><div><h3>${escapeHtml(item.type || '消息')} ${item.status === 'read' ? '<span class="tag">已读</span>' : '<span class="tag badge-warn">未读</span>'}</h3><p>${escapeHtml(item.content || '')}</p><p>${formatDate(item.createdAt)}</p></div><div class="item-actions">${item.status !== 'read' ? `<button class="button secondary" data-read-message="${item.id}">标为已读</button>` : ''}<button class="button danger" data-delete-message="${item.id}">删除</button></div></div>`).join('') || '<div class="empty">暂无项目消息。</div>'}
      </div>
    </section>
  `;
}

export function bindDashboard(ctx) {

  document.querySelectorAll('[data-go-page]').forEach(button => button.addEventListener('click', () => {
    location.hash = button.dataset.goPage;
  }));

  document.getElementById('message-form')?.addEventListener('submit', event => {
    event.preventDefault();
    ctx.data.create('messages', { ...formToObject(event.currentTarget), projectId: ctx.project.id });
    toast('消息已添加');
    ctx.refresh();
  });

  document.querySelectorAll('[data-read-message]').forEach(button => button.addEventListener('click', () => {
    ctx.data.update('messages', button.dataset.readMessage, { status: 'read' });
    ctx.refresh();
  }));

  document.querySelectorAll('[data-delete-message]').forEach(button => button.addEventListener('click', () => {
    ctx.data.remove('messages', button.dataset.deleteMessage);
    ctx.refresh();
  }));
}

function renderNextStep(plan, pendingRefs, reviewCount) {
  if (!plan) return '<div class="notice warning"><p>先添加参考并生成第一份方案草稿。</p></div>';
  if (plan.agentStatus === 'awaiting_approval') return '<div class="notice warning"><p>Agent 草稿正在等待人工批准。</p></div>';
  if (plan.planStatus === 'candidate') return '<div class="notice warning"><p>预选方案已经生成，需要确认采用后才能排期。</p></div>';
  if (plan.executionStatus === 'unscheduled') return '<div class="notice warning"><p>正式方案尚未排期，请创建拍摄通告。</p></div>';
  if (plan.executionStatus === 'scheduled' || plan.executionStatus === 'preparing') return '<div class="notice"><p>拍摄已排期，检查设备、参考和现场镜头顺序。</p></div>';
  if (plan.executionStatus === 'shooting') return '<div class="notice"><p>当前处于现场执行阶段，优先完成必拍镜头。</p></div>';
  if (plan.deliveryStatus !== 'delivered') return '<div class="notice"><p>拍摄已经完成，继续备份、选片、调色和交付。</p></div>';
  if (!reviewCount) return '<div class="notice"><p>项目已经交付，补充复盘并回流到 Obsidian。</p></div>';
  if (pendingRefs) return `<div class="notice warning"><p>仍有 ${pendingRefs} 条参考没有完成来源或授权验证。</p></div>`;
  return '<div class="notice"><p>项目闭环已经完成，可以归档或复用为下次拍摄模板。</p></div>';
}

const metric = (label, value) => `<article class="card"><div class="metric">${value}</div><div class="metric-label">${label}</div></article>`;

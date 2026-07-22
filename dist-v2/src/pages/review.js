import { summarizeReviewFeedback, ROLE_FEEDBACK_FIELDS } from '../services/feedback-analytics.js';
import { downloadText, escapeHtml, formToObject, formatDate, safeFilePart, toast } from '../core/utils.js';

export function renderReview(ctx) {
  const reviews = ctx.data.listByProject('reviews', ctx.project.id).sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  const plans = ctx.data.listByProject('plans', ctx.project.id).filter(item => item.planStatus === 'confirmed');
  const selectedId = ctx.storage.get(`reviewPlan:${ctx.project.id}`, plans[0]?.id || '');
  const plan = plans.find(item => item.id === selectedId) || plans[0];
  const feedback = summarizeReviewFeedback(reviews);

  return `
    <section class="page-header"><div><h1>复盘与知识回流</h1><p>把现场、选片、调色和客户反馈沉淀为可检索经验，并可写入 Obsidian 专用目录。</p></div>${plan ? `<span class="status-pill">${escapeHtml(plan.deliveryStatus || 'not_started')}</span>` : ''}</section>

    <section class="card">
      <label>复盘方案<select id="review-plan-select"><option value="">选择方案</option>${plans.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === plan?.id ? 'selected' : ''}>${escapeHtml(item.concept || item.title || item.id)}</option>`).join('')}</select></label>
    </section>

    <section class="grid cols-4 plan-section feedback-metrics">
      ${feedbackMetric('复盘数量', feedback.count)}
      ${feedbackMetric('方案均分', `${feedback.averagePlanScore}/5`)}
      ${feedbackMetric('执行均分', `${feedback.averageExecutionScore}/5`)}
      ${feedbackMetric('流程可复用', `${feedback.reusableRate}%`)}
    </section>

    <section class="grid cols-2 plan-section">
      <article class="card">
        <h2>反馈趋势</h2>
        ${feedback.count ? `<p class="role-summary">当前最高频改进方向：<strong>${escapeHtml(feedback.topArea?.label || '尚未形成趋势')}</strong>；多角色反馈覆盖率 ${feedback.roleCoverageRate}%。</p><div class="feedback-bars">${feedback.rankedAreas.map(item => `<div class="feedback-bar"><span>${escapeHtml(item.label)}</span><div><i style="width:${feedback.count ? Math.round(item.count / feedback.count * 100) : 0}%"></i></div><strong>${item.count}</strong></div>`).join('')}</div>` : '<div class="empty">保存至少一条复盘后，这里会显示真实反馈趋势。</div>'}
      </article>
      <article class="card">
        <h2>角色反馈覆盖</h2>
        <p class="hint">覆盖率不是满意度，只表示每次复盘是否真正收集了对应角色的声音。</p>
        <div class="readiness-list">${ROLE_FEEDBACK_FIELDS.map(([role, , label]) => `<div class="readiness-item ${feedback.roleCoverage[role] === feedback.count && feedback.count ? 'ok' : 'warning'}"><span>${feedback.roleCoverage[role] === feedback.count && feedback.count ? '✓' : '!'}</span><div><strong>${escapeHtml(label)}</strong><p>${feedback.roleCoverage[role] || 0}/${feedback.count} 条复盘包含反馈</p></div></div>`).join('')}</div>
      </article>
    </section>

    <section class="grid cols-2 plan-section">
      <article class="card">
        <h2>新增复盘</h2>
        ${plan ? `<form id="review-form" class="form-grid">
          <input type="hidden" name="planId" value="${escapeHtml(plan.id)}">
          <label>方案评分<input type="number" name="planScore" min="1" max="5" value="4"></label>
          <label>执行评分<input type="number" name="executionScore" min="1" max="5" value="4"></label>
          <label>出片率 %<input type="number" name="keepRate" min="0" max="100" value="60"></label>
          <label>最终调色<input name="finalGrade" value="${escapeHtml(plan.editVersion || '')}" placeholder="例如：Clean Neutral v2"></label>
          <label class="full">成功经验 / 有效姿势<textarea name="successes" rows="3"></textarea></label>
          <label class="full">失败镜头 / 动作<textarea name="failures" rows="3"></textarea></label>
          <label class="full">光线问题<textarea name="lightingIssues" rows="3"></textarea></label>
          <label class="full">摄影师操作摩擦<textarea name="photographerFriction" rows="3" placeholder="哪些步骤太慢、太复杂或信息不足"></textarea></label>
          <label class="full">模特体验反馈<textarea name="modelFeedback" rows="3" placeholder="通告、妆造、动作沟通、安全边界和现场节奏"></textarea></label>
          <label class="full">助理执行反馈<textarea name="assistantFeedback" rows="3" placeholder="器材、交通、场地、镜头顺序和备份流程"></textarea></label>
          <label class="full">客户反馈<textarea name="clientFeedback" rows="3"></textarea></label>
          <label>最需优化的环节<select name="improvementArea"><option value="brief">Brief 与沟通</option><option value="references">参考与方案</option><option value="schedule">排期与通告</option><option value="onsite">现场执行</option><option value="post">后期与交付</option><option value="system">系统体验</option></select></label>
          <label>下次是否复用此流程<select name="workflowReuse"><option value="yes">会复用</option><option value="with-changes">修改后复用</option><option value="no">不会复用</option></select></label>
          <label class="full">可复用经验<textarea name="reusableInsights" rows="3"></textarea></label>
          <label class="full">下次改进<textarea name="nextActions" rows="3"></textarea></label>
          <div class="full"><button class="button primary">保存复盘</button></div>
        </form>` : '<div class="empty">先确认一份正式方案。</div>'}
      </article>
      <article class="card">
        <h2>历史复盘（${reviews.length}）</h2>
        <div class="list">${reviews.map(item => `<div class="list-item"><div><h3>方案 ${escapeHtml(item.planScore)}/5 · 执行 ${escapeHtml(item.executionScore)}/5 · 出片率 ${escapeHtml(item.keepRate || 0)}%</h3><p>${escapeHtml(item.successes || item.reusableInsights || '')}</p><p>优先改进：${escapeHtml(improvementName(item.improvementArea))} · 流程复用：${escapeHtml(reuseName(item.workflowReuse))}</p><p>${formatDate(item.createdAt)}${item.obsidianPath ? ` · Obsidian: ${escapeHtml(item.obsidianPath)}` : ''}</p></div><div class="item-actions"><button class="button secondary" data-export-review="${escapeHtml(item.id)}">Markdown</button><button class="button primary" data-sync-review="${escapeHtml(item.id)}">写入 Obsidian</button></div></div>`).join('') || '<div class="empty">项目完成后在这里沉淀经验。</div>'}</div>
      </article>
    </section>
  `;
}

export function bindReview(ctx) {
  document.getElementById('review-plan-select')?.addEventListener('change', event => {
    ctx.storage.set(`reviewPlan:${ctx.project.id}`, event.target.value);
    ctx.refresh();
  });

  document.getElementById('review-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const value = formToObject(event.currentTarget);
    const workspace = ctx.v5.queries.planningWorkspace.get(ctx.project.id);
    const revision = workspace.revisions.find(item => item.planId === value.planId && item.status === 'confirmed')
      || workspace.revisions.find(item => item.planId === value.planId);
    const knowledgeGuidanceSnapshot = revision?.knowledgeGuidance || revision?.rawApprovedOutput?.knowledgeGuidance || [];
    const review = ctx.data.create('reviews', {
      ...value,
      projectId: ctx.project.id,
      planScore: Number(value.planScore || 0),
      executionScore: Number(value.executionScore || 0),
      keepRate: Number(value.keepRate || 0),
      bestPoses: value.successes || '',
      failedActions: value.failures || '',
      knowledgeSourceIds: knowledgeGuidanceSnapshot.map(item => item.sourceId).filter(Boolean),
      knowledgeGuidanceSnapshot,
      knowledgeValidationStatus: knowledgeGuidanceSnapshot.length ? 'needs-shoot-review' : 'not-applicable',
    });
    toast('复盘已保存，可导出 Markdown 或写入 Obsidian');
    ctx.storage.set(`lastReview:${ctx.project.id}`, review.id);
    ctx.refresh();
  });

  document.querySelectorAll('[data-export-review]').forEach(button => button.addEventListener('click', () => {
    const review = ctx.data.get('reviews', button.dataset.exportReview);
    const plan = review && ctx.data.get('plans', review.planId);
    if (!review || !plan) return toast('复盘关联的方案不存在');
    downloadText(`${safeFilePart(ctx.project.title)}-${safeFilePart(plan.concept || plan.id)}-复盘.md`, buildReviewMarkdown(ctx.project, plan, review), 'text/markdown;charset=utf-8');
    toast('复盘 Markdown 已导出');
  }));

  document.querySelectorAll('[data-sync-review]').forEach(button => button.addEventListener('click', async () => {
    const review = ctx.data.get('reviews', button.dataset.syncReview);
    const plan = review && ctx.data.get('plans', review.planId);
    if (!review || !plan) return toast('复盘关联的方案不存在');
    const element = button;
    element.disabled = true;
    element.textContent = '写入中…';
    try {
      const result = await ctx.api.writeObsidianReview(ctx.project, plan, review);
      const path = result.filename || result.path || result.item?.filename || '';
      ctx.data.update('reviews', review.id, { obsidianPath: path, obsidianWrittenAt: new Date().toISOString() });
      toast(path ? `已写入 Obsidian：${path}` : '已写入 Obsidian');
      ctx.refresh();
    } catch (error) {
      toast(error.message === 'REMOTE_DISABLED' ? '请启用连接了本地 Obsidian Bridge 的 Worker' : `写入失败：${error.message}`);
    } finally {
      element.disabled = false;
      element.textContent = '写入 Obsidian';
    }
  }));
}

export function buildReviewMarkdown(project, plan, review) {
  const safe = value => String(value ?? '').replace(/"/g, '\\"');
  return `---
projectId: "${safe(project.id)}"
planId: "${safe(plan.id)}"
shootDate: "${safe(project.date || plan.scheduledAt || '')}"
style: "${safe(project.style || '')}"
deliveryStatus: "${safe(plan.deliveryStatus || '')}"
planScore: ${Number(review.planScore || 0)}
executionScore: ${Number(review.executionScore || 0)}
keepRate: ${Number(review.keepRate || 0)}
knowledgeValidationStatus: "${safe(review.knowledgeValidationStatus || 'not-applicable')}"
knowledgeSourceIds: [${(review.knowledgeSourceIds || []).map(id => `"${safe(id)}"`).join(', ')}]
tags: [PhotoAtelier, 摄影复盘]
---

# ${project.title}｜${plan.concept || '摄影复盘'}

## 项目信息

- 地点：${project.location || '未设置'}
- 拍摄类型：${project.shootingType || '未设置'}
- 后期版本：${review.finalGrade || plan.editVersion || '未设置'}

## 方案知识依据

${formatKnowledgeGuidance(review.knowledgeGuidanceSnapshot)}

## 有效方案与姿势

${review.successes || review.bestPoses || '待补充'}

## 失败镜头与动作

${review.failures || review.failedActions || '待补充'}

## 光线问题

${review.lightingIssues || '待补充'}

## 多角色体验反馈

### 摄影师操作摩擦

${review.photographerFriction || '待补充'}

### 模特体验

${review.modelFeedback || '待补充'}

### 助理执行

${review.assistantFeedback || '待补充'}

### 客户反馈

${review.clientFeedback || '待补充'}

- 最需优化的环节：${improvementName(review.improvementArea)}
- 下次是否复用流程：${reuseName(review.workflowReuse)}

## 可复用经验

${review.reusableInsights || '待补充'}

## 下次改进

${review.nextActions || '待补充'}
`;
}


function improvementName(value) {
  return ({ brief: 'Brief 与沟通', references: '参考与方案', schedule: '排期与通告', onsite: '现场执行', post: '后期与交付', system: '系统体验' }[value] || '未设置');
}

function reuseName(value) {
  return ({ yes: '会复用', 'with-changes': '修改后复用', no: '不会复用' }[value] || '未设置');
}

function formatKnowledgeGuidance(items) {
  if (!Array.isArray(items) || !items.length) return '本方案未记录知识来源。';
  return items.map(item => `- ${item.title || item.sourceId}（${item.role || 'general'}）｜${item.verificationRequired ? '拍摄后需核验有效性' : '已作为本地知识使用'}｜${item.sourceId || ''}`).join('\n');
}

function feedbackMetric(label, value) { return `<article class="card"><div class="metric">${escapeHtml(value)}</div><div class="metric-label">${escapeHtml(label)}</div></article>`; }

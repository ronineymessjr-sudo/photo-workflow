import { escapeHtml, toast } from '../core/utils.js';

export function renderPlan(ctx) {
  const workspace = ctx.v5.queries.planningWorkspace.get(ctx.project.id);
  const referenceModel = ctx.v5.queries.referenceLibrary.getProject(ctx.project.id);
  const knowledgeSources = ctx.storage.get(`resolvedProjectKnowledgeSources:${ctx.project.id}`, ctx.storage.get(`projectKnowledgeSources:${ctx.project.id}`, []));
  const selection = resolveSelection(ctx, workspace);

  return `
    <section class="page-header">
      <div><h1>方案中心</h1><p>先冻结项目上下文并生成可审查草稿；人工批准后才建立正式版本与镜头。</p></div>
      <div class="topbar-actions">
        <button id="export-plan-pdf-btn" class="button secondary" ${selection ? '' : 'disabled'}>导出 PDF</button>
        <button id="generate-plan-btn" class="button primary">生成 Agent 草稿</button>
      </div>
    </section>

    <section class="plan-workspace">
      <aside class="card plan-library">
        <div class="status-row"><h2>方案库</h2><span class="tag">${workspace.generationRuns.length + workspace.revisions.length}</span></div>
        <div class="plan-tabs-summary">
          ${statusCount('待批准', workspace.generationRuns.filter(item => item.status === 'awaiting_approval').length)}
          ${statusCount('预选', workspace.revisions.filter(item => item.status === 'candidate').length)}
          ${statusCount('正式', workspace.revisions.filter(item => item.status === 'confirmed').length)}
        </div>
        <div class="list">
          ${workspace.generationRuns.map(run => renderLibraryButton(`run:${run.id}`, run.normalizedOutput?.concept || '生成草稿', runLabel(run), selection?.key)).join('')}
          ${workspace.revisions.map(revision => renderLibraryButton(`revision:${revision.id}`, revision.concept || '方案版本', revisionLabel(revision), selection?.key)).join('')}
          ${!workspace.generationRuns.length && !workspace.revisions.length ? '<div class="empty">尚未生成方案。</div>' : ''}
        </div>
      </aside>

      <div class="plan-main">
        ${selection ? renderSelection(selection, { workspace, references: referenceModel.selectedReferences.map(item => item.asset), knowledgeSources, shotLinks: referenceModel.shotBindings, project: ctx.project }) : '<div class="empty">先生成第一份 Agent 草稿。</div>'}
      </div>
    </section>
  `;
}

function renderSelection(selection, ctx) {
  if (selection.type === 'run') return renderGenerationRun(selection.record, ctx);
  return renderRevision(selection.record, ctx);
}

function renderGenerationRun(run, ctx) {
  const output = run.normalizedOutput || {};
  const shots = output.shots || [];
  return `
    ${renderContextSummary(ctx.project, ctx.references.length, ctx.knowledgeSources.length, run)}
    <section class="card plan-section approval-panel">
      <div><h2>${run.status === 'awaiting_approval' ? '待人工批准' : runLabel(run)}</h2><p>当前记录是 GenerationRun 草稿，尚未创建正式 PlanRevision、Shots 或日程。</p></div>
      <div class="topbar-actions">
        ${run.status === 'awaiting_approval' ? '<button id="regenerate-plan-btn" class="button secondary">按意见重生成</button><button id="approve-plan-btn" class="button primary">批准为预选方案</button>' : ''}
      </div>
    </section>
    ${run.error ? `<section class="card plan-section"><h2>生成错误</h2><p>${escapeHtml(run.error.message || run.error.code || '生成失败')}</p></section>` : ''}
    ${shots.length ? `<section class="card plan-section"><div class="status-row"><h2>草稿镜头（${shots.length}）</h2><span class="tag badge-warn">未写入 Shots</span></div><div class="shot-list">${shots.map((shot, index) => renderDraftShot(shot, index)).join('')}</div></section>` : ''}
    <details class="card plan-section"><summary>查看结构化草稿与运行信息</summary><pre class="json">${escapeHtml(JSON.stringify(run, null, 2))}</pre></details>
  `;
}

function renderRevision(revision, ctx) {
  const plan = ctx.workspace.plans.find(item => item.id === revision.planId);
  const shots = ctx.workspace.shots.filter(item => item.planRevisionId === revision.id);
  const expectedLook = ctx.workspace.expectedLooks.find(item => item.planRevisionId === revision.id);
  const generatedAssets = ctx.workspace.generatedAssets.filter(item => item.planRevisionId === revision.id);
  return `
    ${renderContextSummary(ctx.project, ctx.references.length, ctx.knowledgeSources.length, revision)}
    <section class="card plan-section approval-panel">
      <div><h2>${revision.status === 'confirmed' ? '正式方案' : '预选方案'}</h2><p>${escapeHtml(revision.rationale || '')}</p></div>
      <div class="topbar-actions">
        ${revision.status === 'candidate' ? '<button id="confirm-plan-btn" class="button primary">确认采用</button>' : ''}
        ${expectedLook?.enabled ? '<button id="generate-look-btn" class="button secondary">生成 AI 预期效果</button>' : ''}
        ${revision.status === 'confirmed' ? '<button id="schedule-plan-btn" class="button primary">安排拍摄</button>' : ''}
      </div>
    </section>
    ${shots.length ? `<section class="card plan-section"><div class="status-row"><h2>正式镜头（${shots.length}）</h2><span class="tag badge-ok">PlanRevision ${revision.revisionNumber}</span></div><div class="shot-list">${shots.map((shot, index) => renderFormalShot(shot, index, ctx.references, ctx.shotLinks)).join('')}</div></section>` : ''}
    ${expectedLook ? renderExpectedLook(expectedLook, generatedAssets) : ''}
    <details class="card plan-section"><summary>查看结构化方案版本</summary><pre class="json">${escapeHtml(JSON.stringify({ plan, revision }, null, 2))}</pre></details>
  `;
}

function renderContextSummary(project, referenceCount, knowledgeCount, source) {
  return `<section class="grid cols-2">
    <article class="card"><h2>ProjectContext 输入</h2><table>
      <tr><th>项目</th><td>${escapeHtml(project.title)}</td></tr>
      <tr><th>时间</th><td>${escapeHtml(project.date || '未设置')}</td></tr>
      <tr><th>地点</th><td>${escapeHtml(project.location || '未设置')}</td></tr>
      <tr><th>风格</th><td>${escapeHtml(project.style || '未设置')}</td></tr>
      <tr><th>真实参考</th><td>${referenceCount}</td></tr>
      <tr><th>知识依据</th><td>${knowledgeCount}</td></tr>
    </table></article>
    <article class="card"><div class="status-row"><h2>方案状态</h2><span class="tag">${escapeHtml(source.status || 'draft')}</span></div><h3>${escapeHtml(source.concept || source.normalizedOutput?.concept || '')}</h3><p class="hint">${escapeHtml(source.provider || '')} · ${escapeHtml(source.promptVersion || '')}</p></article>
  </section>`;
}

function renderDraftShot(shot, index) {
  return `<article class="shot-row"><div class="shot-index">${shot.sequence || index + 1}</div><div><h3>${escapeHtml(shot.scene || '')}</h3><p>${escapeHtml(shot.shotSize || '')} · ${escapeHtml(shot.focalLength || '')} · ${escapeHtml(shot.composition || '')}</p><p>姿势：${escapeHtml(shot.poseGuidance || '')}</p><p>光线：${escapeHtml(shot.lighting || '')}</p><p>备用：${escapeHtml(shot.fallback || '')}</p></div><span class="tag badge-warn">草稿</span></article>`;
}

function renderFormalShot(shot, index, references, shotLinks) {
  const selectedReference = shotLinks.find(item => item.link.shotId === shot.id)?.asset?.id || '';
  return `<article class="shot-row"><div class="shot-index">${shot.sequence || index + 1}</div><div><h3>${escapeHtml(shot.scene || '')}</h3><p>${escapeHtml(shot.shotSize || '')} · ${escapeHtml(shot.focalLength || '')} · ${escapeHtml(shot.composition || '')}</p><p>姿势：${escapeHtml(shot.poseGuidance || '')}</p><p>光线：${escapeHtml(shot.lighting || '')}</p><p>备用：${escapeHtml(shot.fallback || '')}</p><label class="shot-reference-control">镜头参考<select data-reference-select="${escapeHtml(shot.id)}"><option value="">未绑定</option>${references.map(ref => `<option value="${escapeHtml(ref.id)}" ${ref.id === selectedReference ? 'selected' : ''}>${escapeHtml(ref.title)}（真实参考图）</option>`).join('')}</select></label></div><span class="tag">${escapeHtml(shot.captureStatus || 'planned')}</span></article>`;
}

function renderExpectedLook(expectedLook, assets) {
  return `<section class="card plan-section"><div class="status-row"><h2>预期效果</h2><span class="tag badge-warn">AI 概念图，不是实拍参考</span></div><p>${escapeHtml(expectedLook.colorIntent || '')}</p><div class="grid cols-3">${assets.map(asset => `<article class="card"><img src="${escapeHtml(asset.url || '')}" alt="AI 概念图" style="width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:8px"><p>AI 概念图 ${asset.sequence || ''}</p></article>`).join('') || '<div class="empty">尚未生成概念图。</div>'}</div></section>`;
}

export function bindPlan(ctx) {
  document.querySelectorAll('[data-select-plan]').forEach(button => button.addEventListener('click', () => {
    ctx.storage.set(`selectedV5Plan:${ctx.project.id}`, button.dataset.selectPlan);
    ctx.refresh();
  }));

  document.getElementById('generate-plan-btn')?.addEventListener('click', async event => {
    await withBusy(event.currentTarget, '正在冻结上下文并生成…', async () => {
      const knowledgeContext = await resolveKnowledgeContext(ctx);
      const snapshot = ctx.v5.planningContext.build({
        projectId: ctx.project.id,
        knowledgeSources: knowledgeContext.items,
        knowledgeRetrieval: knowledgeContext.retrieval,
        lookRequest: { enabled: true, generateConceptImages: false, count: 4 },
      });
      const result = await ctx.v5.planning.createGenerationRun({ projectId: ctx.project.id, contextSnapshotId: snapshot.id });
      ctx.storage.set(`selectedV5Plan:${ctx.project.id}`, `run:${result.run.id}`);
      toast('Agent 草稿已生成，尚未写入正式镜头');
      ctx.refresh();
    });
  });

  document.getElementById('regenerate-plan-btn')?.addEventListener('click', async event => {
    const selected = resolveSelection(ctx, ctx.v5.queries.planningWorkspace.get(ctx.project.id));
    if (selected?.type !== 'run') return;
    const instruction = window.prompt('输入需要保留或调整的内容。', '');
    if (instruction == null) return;
    await withBusy(event.currentTarget, '重新生成中…', async () => {
      const result = await ctx.v5.planning.createGenerationRun({
        projectId: ctx.project.id,
        contextSnapshotId: selected.record.contextSnapshotId,
        instruction,
        parentRunId: selected.record.id,
      });
      ctx.storage.set(`selectedV5Plan:${ctx.project.id}`, `run:${result.run.id}`);
      toast('新草稿已生成，原草稿和正式数据均未被覆盖');
      ctx.refresh();
    });
  });

  document.getElementById('approve-plan-btn')?.addEventListener('click', async event => {
    const selected = resolveSelection(ctx, ctx.v5.queries.planningWorkspace.get(ctx.project.id));
    if (selected?.type !== 'run') return;
    await withBusy(event.currentTarget, '正在校验并正式写入…', async () => {
      const result = ctx.v5.planning.approveGenerationRun({ generationRunId: selected.record.id });
      ctx.storage.set(`selectedV5Plan:${ctx.project.id}`, `revision:${result.revision.id}`);
      toast(result.idempotent ? '该草稿此前已批准' : '草稿已批准并进入预选方案库');
      ctx.refresh();
    });
  });

  document.getElementById('confirm-plan-btn')?.addEventListener('click', async event => {
    const selected = resolveSelection(ctx, ctx.v5.queries.planningWorkspace.get(ctx.project.id));
    if (selected?.type !== 'revision') return;
    await withBusy(event.currentTarget, '正在确认版本…', async () => {
      ctx.v5.planning.confirmPlanRevision({ planRevisionId: selected.record.id, expectedVersion: selected.record.recordVersion });
      toast('方案版本已确认');
      ctx.refresh();
    });
  });

  document.getElementById('generate-look-btn')?.addEventListener('click', async event => {
    const selected = resolveSelection(ctx, ctx.v5.queries.planningWorkspace.get(ctx.project.id));
    if (selected?.type !== 'revision') return;
    await withBusy(event.currentTarget, '正在生成概念图…', async () => {
      const result = await ctx.v5.planning.requestExpectedLookImages({ planRevisionId: selected.record.id, count: 4 });
      toast(result.error ? `概念图生成失败，但方案不受影响：${result.error.message}` : 'AI 预期效果已生成');
      ctx.refresh();
    });
  });

  document.querySelectorAll('[data-reference-select]').forEach(select => select.addEventListener('change', () => {
    const model = ctx.v5.queries.referenceLibrary.getProject(ctx.project.id);
    model.shotBindings.filter(item => item.link.shotId === select.dataset.referenceSelect).forEach(item => ctx.v5.references.removeShotLink(item.link.id));
    if (select.value) ctx.v5.references.bindToShot({ shotId: select.dataset.referenceSelect, referenceAssetId: select.value, role: 'shotGuide', score: 100, reason: '用户手动绑定', locked: true });
    toast(select.value ? '镜头参考已绑定' : '镜头绑定已清除，项目关系仍保留');
    ctx.refresh();
  }));

  document.getElementById('schedule-plan-btn')?.addEventListener('click', () => {
    const selected = resolveSelection(ctx, ctx.v5.queries.planningWorkspace.get(ctx.project.id));
    if (selected?.type === 'revision') ctx.storage.set(`schedulePlanRevision:${ctx.project.id}`, selected.record.id);
    location.hash = 'schedule';
  });

  document.getElementById('export-plan-pdf-btn')?.addEventListener('click', () => {
    const workspace = ctx.v5.queries.planningWorkspace.get(ctx.project.id);
    const selected = resolveSelection(ctx, workspace);
    if (!selected) return;
    const output = selected.type === 'run' ? selected.record.normalizedOutput : selected.record;
    const shots = selected.type === 'run' ? output?.shots || [] : workspace.shots.filter(item => item.planRevisionId === selected.record.id);
    exportPlanPdf(ctx.project, output, shots);
  });
}

async function resolveKnowledgeContext(ctx) {
  const manual = ctx.storage.get(`projectKnowledgeSources:${ctx.project.id}`, []);
  const workspace = ctx.v5.queries.projectWorkspace.get(ctx.project.id);
  try {
    const result = await ctx.api.recommendKnowledgeContext(workspace.brief || ctx.project, {
      limit: 12,
      manuallySelectedKnowledgeSources: manual,
    });
    const items = Array.isArray(result?.items) ? result.items : manual;
    ctx.storage.set(`resolvedProjectKnowledgeSources:${ctx.project.id}`, items);
    ctx.storage.set(`projectKnowledgeRetrieval:${ctx.project.id}`, result?.retrieval || null);
    return { items, retrieval: result?.retrieval || null };
  } catch (error) {
    const retrieval = {
      mode: 'manual-fallback',
      query: '',
      requestedRoles: [],
      coverage: {},
      manualCount: manual.length,
      autoCount: 0,
      candidatesEvaluated: 0,
      indexVersion: '',
    };
    ctx.storage.set(`resolvedProjectKnowledgeSources:${ctx.project.id}`, manual);
    ctx.storage.set(`projectKnowledgeRetrieval:${ctx.project.id}`, retrieval);
    return { items: manual, retrieval };
  }
}

function resolveSelection(ctx, workspace) {
  const stored = ctx.storage.get(`selectedV5Plan:${ctx.project.id}`, '');
  const candidates = [
    ...workspace.generationRuns.map(record => ({ key: `run:${record.id}`, type: 'run', record })),
    ...workspace.revisions.map(record => ({ key: `revision:${record.id}`, type: 'revision', record })),
  ];
  return candidates.find(item => item.key === stored)
    || candidates.find(item => item.type === 'run' && item.record.status === 'awaiting_approval')
    || candidates[0]
    || null;
}

async function withBusy(button, label, action) {
  const original = button?.textContent || '';
  if (button) { button.disabled = true; button.textContent = label; }
  try { await action(); }
  catch (error) { toast(error.message || '操作失败'); }
  finally { if (button) { button.disabled = false; button.textContent = original; } }
}

function renderLibraryButton(key, title, status, selectedKey) {
  return `<button class="plan-list-button ${key === selectedKey ? 'active' : ''}" data-select-plan="${escapeHtml(key)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(status)}</span></button>`;
}

function runLabel(run) { return ({ awaiting_approval: '草稿 · 待批准', approved: '草稿 · 已批准', failed: '生成失败', running: '生成中' })[run.status] || run.status; }
function revisionLabel(revision) { return `${revision.status === 'confirmed' ? '正式' : '预选'} · 版本 ${revision.revisionNumber || 1}`; }
function statusCount(label, value) { return `<div><strong>${value}</strong><span>${label}</span></div>`; }

function exportPlanPdf(project, plan, shots) {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return toast('浏览器阻止了导出窗口');
  const rows = shots.map((shot, index) => `<tr><td>${shot.sequence || index + 1}</td><td>${escapeHtml(shot.scene || '')}</td><td>${escapeHtml(shot.shotSize || '')}</td><td>${escapeHtml(shot.focalLength || '')}</td><td>${escapeHtml(shot.poseGuidance || '')}</td><td>${escapeHtml(shot.lighting || '')}</td></tr>`).join('');
  win.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(project.title)}拍摄方案</title><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;color:#222;padding:28px;line-height:1.55}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #bbb;padding:7px;text-align:left}button{margin-bottom:20px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">打印 / 保存为 PDF</button><h1>${escapeHtml(project.title)}</h1><p>${escapeHtml(plan?.concept || '')}</p><table><thead><tr><th>#</th><th>场景</th><th>景别</th><th>焦段</th><th>姿势</th><th>光线</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
  win.document.close();
}

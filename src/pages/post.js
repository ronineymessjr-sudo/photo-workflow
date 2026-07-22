import { parseCubeLut, renderLutPreview } from '../core/lut.js';
import { escapeHtml, formToObject, toast } from '../core/utils.js';

let previewLut = null;

export function renderPost(ctx) {
  const model = ctx.v5.queries.postWorkspace.get(ctx.project.id);
  const selectedRevisionId = ctx.storage.get(`postRevision:${ctx.project.id}`, model.confirmedRevisions[0]?.id || '');
  const current = model.getByRevision(selectedRevisionId);
  const job = current.job;
  return `
    <section class="page-header"><div><h1>LUT 与后期交付</h1><p>后期状态按固定顺序推进，双备份和交付位置是硬性检查；LUT 作为全局预设重复使用。</p></div>${job ? `<span class="status-pill">${escapeHtml(job.status)}</span>` : ''}</section>
    <section class="card"><div class="status-row"><div><h2>后期项目</h2><p class="hint">选择已确认的方案版本。</p></div></div>
      <label>方案版本<select id="post-revision-select"><option value="">选择版本</option>${model.confirmedRevisions.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === selectedRevisionId ? 'selected' : ''}>${escapeHtml(item.concept)} · V${item.revisionNumber}</option>`).join('')}</select></label>
      ${current.revision && !job ? '<div class="plan-section"><button id="start-post-btn" class="button primary">建立后期任务</button></div>' : ''}
      ${job ? renderJob(job) : '<div class="empty plan-section">选择正式版本并建立后期任务。</div>'}
    </section>
    <section class="grid cols-2 plan-section">
      <article class="card"><h2>全局 LUT 预设</h2><form id="lut-form" class="form-grid"><label>名称<input name="name" required></label><label>来源<select name="sourceType"><option value="local">本地</option><option value="open-source">开源</option></select></label><label class="full">文件路径<input name="localPath"></label><label>输入色彩空间<input name="inputColorSpace" value="display-referred"></label><label>输出色彩空间<input name="outputColorSpace" value="display-referred"></label><label class="full">创意用途<input name="creativeIntent"></label><div class="full"><button class="button secondary">导入预设记录</button></div></form>
        <div class="list plan-section">${model.lutPresets.map(lut => `<div class="list-item"><div><h3>${escapeHtml(lut.name)}</h3><p>${escapeHtml(lut.inputColorSpace)} → ${escapeHtml(lut.outputColorSpace)}</p></div>${job ? `<button class="button secondary" data-select-lut="${escapeHtml(lut.id)}">用于当前后期</button>` : ''}</div>`).join('') || '<div class="empty">暂无 LUT 预设。</div>'}</div>
      </article>
      <article class="card"><h2>三栏 LUT 预览</h2><p class="hint">预览使用合成测试图，不覆盖原始素材。</p><label>读取 .cube 文件<input id="cube-file-input" type="file" accept=".cube,text/plain"></label><label>强度<input id="lut-strength" type="range" min="0" max="100" value="35"></label><div class="grid cols-3 plan-section"><div><p>源图</p><canvas id="lut-source-canvas" style="width:100%"></canvas></div><div><p>LUT 预览</p><canvas id="lut-preview-canvas" style="width:100%"></canvas></div><div><p>参考色基</p><canvas id="lut-target-canvas" style="width:100%"></canvas></div></div></article>
    </section>`;
}

function renderJob(job) {
  return `<div class="plan-section"><div class="delivery-pipeline">${['not_started','backing_up','backed_up','selecting','editing','awaiting_feedback','delivered','archived'].map(status => `<span class="tag ${job.status === status ? 'badge-ok' : ''}">${status}</span>`).join('')}</div>
    <form id="post-advance-form" class="form-grid plan-section">
      <label>主备份路径<input name="primaryBackupPath" value="${escapeHtml(job.primaryBackupPath || '')}"></label><label>第二备份路径<input name="secondaryBackupPath" value="${escapeHtml(job.secondaryBackupPath || '')}"></label>
      <label>原始素材路径<input name="sourceMediaPath" value="${escapeHtml(job.sourceMediaPath || '')}"></label><label>精选数量<input name="selectedCount" type="number" min="0" value="${Number(job.selectedCount || 0)}"></label>
      <label>编辑版本<input name="editVersion" value="${escapeHtml(job.editVersion || '')}"></label><label>交付链接/路径<input name="deliveryUrl" value="${escapeHtml(job.deliveryUrl || '')}"></label>
      <label class="full">备注<textarea name="notes">${escapeHtml(job.notes || '')}</textarea></label>
      <div class="full">${nextStatus(job.status) ? `<button class="button primary" data-next-status="${nextStatus(job.status)}">推进到 ${nextStatus(job.status)}</button>` : '<span class="tag badge-ok">流程已归档</span>'}</div>
    </form></div>`;
}

export function bindPost(ctx) {
  drawPreview();
  document.getElementById('post-revision-select')?.addEventListener('change', event => { ctx.storage.set(`postRevision:${ctx.project.id}`, event.target.value); ctx.refresh(); });
  document.getElementById('start-post-btn')?.addEventListener('click', () => { const id = ctx.storage.get(`postRevision:${ctx.project.id}`, ''); ctx.v5.post.start({ planRevisionId: id }); toast('后期任务已建立'); ctx.refresh(); });
  document.getElementById('post-advance-form')?.addEventListener('submit', event => { event.preventDefault(); const model = ctx.v5.queries.postWorkspace.get(ctx.project.id); const current = model.getByRevision(ctx.storage.get(`postRevision:${ctx.project.id}`, '')); if (!current.job) return; const value = formToObject(event.currentTarget); try { ctx.v5.post.advance({ postProductionJobId: current.job.id, nextStatus: event.submitter.dataset.nextStatus, expectedVersion: current.job.recordVersion, patch: { ...value, selectedCount: Number(value.selectedCount || 0) } }); toast('后期状态已推进'); ctx.refresh(); } catch (error) { toast(error.message); } });
  document.getElementById('lut-form')?.addEventListener('submit', event => { event.preventDefault(); ctx.v5.post.importLutPreset(formToObject(event.currentTarget)); toast('LUT 预设已导入全局库'); ctx.refresh(); });
  document.querySelectorAll('[data-select-lut]').forEach(button => button.addEventListener('click', () => { const model = ctx.v5.queries.postWorkspace.get(ctx.project.id); const job = model.getByRevision(ctx.storage.get(`postRevision:${ctx.project.id}`, '')).job; if (!job) return; ctx.v5.post.selectLutPreset({ postProductionJobId: job.id, lutPresetId: button.dataset.selectLut, strength: Number(document.getElementById('lut-strength')?.value || 100) }); toast('LUT 已用于当前后期任务'); ctx.refresh(); }));
  document.getElementById('cube-file-input')?.addEventListener('change', async event => { const file = event.target.files?.[0]; if (!file) return; try { previewLut = parseCubeLut(await file.text()); toast(`已读取 ${previewLut.title}`); drawPreview(); } catch (error) { toast(error.message); } });
  document.getElementById('lut-strength')?.addEventListener('input', drawPreview);
}

function drawPreview() { const strength = Number(document.getElementById('lut-strength')?.value || 35) / 100; renderLutPreview(document.getElementById('lut-source-canvas'), null, 0, 'source'); renderLutPreview(document.getElementById('lut-preview-canvas'), previewLut, strength, 'source'); renderLutPreview(document.getElementById('lut-target-canvas'), null, 0, 'target'); }
function nextStatus(status) { return ({ not_started:'backing_up', backing_up:'backed_up', backed_up:'selecting', selecting:'editing', editing:'awaiting_feedback', awaiting_feedback:'delivered', delivered:'archived' })[status] || ''; }

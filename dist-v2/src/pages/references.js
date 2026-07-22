import { escapeHtml, formToObject, toast } from '../core/utils.js';

const KIND_BY_CATEGORY = {
  '构图': 'composition_reference',
  '光线': 'lighting_reference',
  '姿势': 'pose_reference',
  '色彩': 'color_reference',
  '场景': 'location_reference',
  'LUT参考': 'color_reference',
};

export function renderReferences(ctx) {
  const library = ctx.v5.queries.referenceLibrary.getProject(ctx.project.id);
  const imageResults = ctx.storage.get(`referenceImageResults:${ctx.project.id}`, []);
  const obsidianResults = ctx.storage.get(`obsidianResults:${ctx.project.id}`, []);
  const selectedKnowledge = ctx.storage.get(`projectKnowledgeSources:${ctx.project.id}`, []);

  return `
    <section class="page-header">
      <div><h1>灵感与参考数据库</h1><p>素材先收录到全局参考库，再明确选入当前项目；镜头绑定由方案页单独管理。</p></div>
    </section>

    <section class="grid cols-2">
      <article class="card">
        <h2>收录真实参考素材</h2>
        <form id="reference-form" class="form-grid">
          <label>标题<input name="title" required></label>
          <label>来源平台<select name="sourcePlatform"><option>小红书</option><option>抖音</option><option>X</option><option>Obsidian</option><option>Pexels</option><option>本地文件</option><option>其他</option></select></label>
          <label class="full">原始链接<input name="sourceUrl" type="url"></label>
          <label class="full">本地文件路径<input name="localPath" placeholder="例如 C:\\Photos\\reference.jpg"></label>
          <label>风格标签<input name="styleTags" placeholder="复古,电影感"></label>
          <label>分类<select name="category"><option>构图</option><option>光线</option><option>姿势</option><option>色彩</option><option>场景</option><option>LUT参考</option></select></label>
          <label>验证状态<select name="verificationStatus"><option value="pending">待补全</option><option value="verified">已验证</option><option value="private">本地私人参考</option><option value="commercial-ok">可商用</option></select></label>
          <label class="full">备注<textarea name="notes" rows="4"></textarea></label>
          <div class="full"><button class="button primary">收录到全局库</button></div>
        </form>
      </article>

      <article class="card">
        <h2>当前项目参考（${library.selectedReferences.length}）</h2>
        <div class="list">
          ${library.selectedReferences.map(({ asset, link }) => renderAsset(asset, `<button class="button danger" data-remove-project-reference="${escapeHtml(link.id)}">移出项目</button>`)).join('') || '<div class="empty">当前项目还没有选入参考素材。</div>'}
        </div>
        <h2 class="plan-section">全局参考库（${library.availableAssets.length}）</h2>
        <div class="list">
          ${library.availableAssets.map(asset => renderAsset(asset, `<button class="button secondary" data-select-project-reference="${escapeHtml(asset.id)}">选入项目</button>`)).join('') || '<div class="empty">没有待选素材。</div>'}
        </div>
      </article>
    </section>

    <section class="grid cols-2 plan-section">
      <article class="card">
        <h2>批量参考图搜索</h2>
        <p class="hint">真实图片可收录到全局库；AI 概念图只作为概念预览，不会标记为真实实拍参考。</p>
        <form id="image-search-form" class="toolbar">
          <input name="query" required placeholder="例如：复古街拍 夜景 人像">
          <input name="count" type="number" min="1" max="30" value="12">
          <button class="button primary">搜索</button>
        </form>
        <div class="grid cols-3">
          ${imageResults.map((item, index) => {
            const synthetic = item.synthetic === true;
            return `<article class="card">
              <img src="${escapeHtml(item.previewUrl || '')}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px">
              <p>${escapeHtml(item.title || item.photographer || (synthetic ? 'AI 概念图' : '参考图'))}</p>
              <span class="tag ${synthetic ? 'badge-warn' : 'badge-ok'}">${synthetic ? 'AI 概念图' : '真实参考图'}</span>
              <button class="button secondary" data-add-image-result="${index}" ${synthetic ? 'disabled' : ''}>${synthetic ? '不可收录为实拍参考' : '收录到全局库'}</button>
            </article>`;
          }).join('') || '<div class="empty">尚未搜索参考图。</div>'}
        </div>
      </article>

      <article class="card">
        <div class="status-row"><h2>个人知识库与摄影数据库</h2><span class="tag">已选 ${selectedKnowledge.length}/12</span></div>
        <p class="hint">同时检索 Obsidian、Ronin RAG、动作库和场景库。图片进入真实参考库；笔记和知识块只进入方案知识上下文。</p>
        <form id="obsidian-search-form" class="toolbar">
          <input name="query" required placeholder="例如：电影感人像、前景构图、海边、转圈">
          <button class="button primary">搜索知识库</button>
        </form>
        <h3 class="plan-section">当前项目知识依据</h3>
        <div class="list">
          ${selectedKnowledge.map(item => `<div class="list-item"><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.sourceType || item.kind || '')} · ${escapeHtml(item.groundingStatus || '')}</p></div><button class="button danger" data-remove-knowledge="${escapeHtml(item.id)}">移出</button></div>`).join('') || '<div class="empty">尚未选择知识依据。搜索后按需加入，不会全量复制。</div>'}
        </div>
        <h3 class="plan-section">检索结果</h3>
        <div class="list">
          ${obsidianResults.map((item, index) => {
            const knowledge = isKnowledgeItem(item);
            const selected = knowledge && selectedKnowledge.some(source => source.id === knowledgeId(item));
            return `
            <div class="list-item">
              <div><h3>${escapeHtml(item.title || item.filename || item.path)}</h3><p>${escapeHtml(resultExcerpt(item))}</p><span class="tag ${knowledge ? '' : 'badge-ok'}">${knowledge ? '知识来源' : '真实图片'}</span> <span class="tag">${escapeHtml(item.sourceType || item.type || '')}</span></div>
              <button class="button secondary" ${knowledge ? `data-toggle-knowledge="${index}"` : `data-import-obsidian-asset="${index}"`}>${knowledge ? (selected ? '移出项目知识' : '加入项目知识') : '收录为真实参考图'}</button>
            </div>
          `; }).join('') || '<div class="empty">尚未检索个人知识库。</div>'}
        </div>
      </article>
    </section>
  `;
}

export function bindReferences(ctx) {
  document.getElementById('reference-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const value = formToObject(event.currentTarget);
    if (!value.sourceUrl && !value.localPath) return toast('请填写原始链接或本地文件路径');
    const result = ctx.v5.references.ingestAsset(toAssetInput(value));
    toast(result.deduplicated ? '素材已存在，已合并补充信息' : '真实参考素材已收录到全局库');
    ctx.refresh();
  });

  document.querySelectorAll('[data-select-project-reference]').forEach(button => button.addEventListener('click', () => {
    ctx.v5.references.selectForProject({ projectId: ctx.project.id, referenceAssetId: button.dataset.selectProjectReference, role: 'general' });
    toast('参考素材已选入当前项目');
    ctx.refresh();
  }));

  document.querySelectorAll('[data-remove-project-reference]').forEach(button => button.addEventListener('click', () => {
    ctx.v5.references.removeProjectLink(button.dataset.removeProjectReference);
    toast('已移出当前项目，全局素材仍然保留');
    ctx.refresh();
  }));

  document.getElementById('image-search-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const value = formToObject(event.currentTarget);
    try {
      const result = await ctx.api.searchReferenceImages(value.query, Number(value.count || 12));
      ctx.storage.set(`referenceImageResults:${ctx.project.id}`, result.items || []);
      toast(`找到 ${(result.items || []).length} 张图片`);
    } catch (error) {
      toast(error.message === 'REMOTE_DISABLED' ? '请先启用已有后端，批量搜索需要图片 Provider' : `搜索失败：${error.message}`);
    }
    ctx.refresh();
  });

  document.querySelectorAll('[data-add-image-result]').forEach(button => button.addEventListener('click', () => {
    const item = ctx.storage.get(`referenceImageResults:${ctx.project.id}`, [])[Number(button.dataset.addImageResult)];
    if (!item || item.synthetic === true) return;
    const result = ctx.v5.references.ingestAsset({
      title: item.title || '批量参考图', assetKind: 'location_reference', sourceType: item.provider || 'image-search',
      sourceId: item.id || null, sourceUrl: item.sourceUrl || null, previewUrl: item.previewUrl || null,
      photographer: item.photographer || '', verificationStatus: 'pending', synthetic: false,
    });
    toast(result.deduplicated ? '该图片已在全局库中' : '真实参考图已收录到全局库');
    ctx.refresh();
  }));

  document.getElementById('obsidian-search-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const value = formToObject(event.currentTarget);
    try {
      const result = await ctx.api.searchObsidian(value.query, { limit: 40 });
      ctx.storage.set(`obsidianResults:${ctx.project.id}`, result.items || []);
      toast(`找到 ${(result.items || []).length} 条知识或图片记录`);
    } catch (error) {
      toast(`个人知识库搜索失败：${error.message}`);
    }
    ctx.refresh();
  });

  document.querySelectorAll('[data-import-obsidian-asset]').forEach(button => button.addEventListener('click', () => {
    const item = ctx.storage.get(`obsidianResults:${ctx.project.id}`, [])[Number(button.dataset.importObsidianAsset)];
    if (!item || item.type !== 'asset') return toast('只有真实图片附件可以收录到参考素材库');
    const result = ctx.v5.references.ingestAsset({
      title: item.title || item.filename, assetKind: inferObsidianAssetKind(item), sourceType: 'obsidian-local-library', sourceId: item.id,
      previewUrl: ctx.api.obsidianAssetThumbnailUrl(item.id), localPath: item.filename || null, tags: item.tags || [], verificationStatus: 'private',
      licenseStatus: item.licenseClass || 'local-private-reference', contentHash: item.contentHash || null, synthetic: false,
      sourceMetadata: { obsidianPath: item.filename || '', workflowStage: item.workflowStage || '' },
    });
    toast(result.deduplicated ? '该 Obsidian 素材已在全局库中' : 'Obsidian 素材已收录到全局库');
    ctx.refresh();
  }));

  document.querySelectorAll('[data-toggle-knowledge]').forEach(button => button.addEventListener('click', () => {
    const item = ctx.storage.get(`obsidianResults:${ctx.project.id}`, [])[Number(button.dataset.toggleKnowledge)];
    if (!item || !isKnowledgeItem(item)) return;
    const source = normalizeKnowledgeSource(item);
    const current = ctx.storage.get(`projectKnowledgeSources:${ctx.project.id}`, []);
    const exists = current.some(entry => entry.id === source.id);
    if (!exists && current.length >= 12) return toast('每个方案最多选择 12 条知识依据，请先移出不相关内容');
    ctx.storage.set(`projectKnowledgeSources:${ctx.project.id}`, exists ? current.filter(entry => entry.id !== source.id) : [...current, source]);
    toast(exists ? '已移出项目知识上下文' : '已加入项目知识上下文');
    ctx.refresh();
  }));

  document.querySelectorAll('[data-remove-knowledge]').forEach(button => button.addEventListener('click', () => {
    const current = ctx.storage.get(`projectKnowledgeSources:${ctx.project.id}`, []);
    ctx.storage.set(`projectKnowledgeSources:${ctx.project.id}`, current.filter(entry => entry.id !== button.dataset.removeKnowledge));
    toast('已移出项目知识上下文');
    ctx.refresh();
  }));
}

function renderAsset(asset, action) {
  return `<div class="list-item">
    <div>
      <h3>${escapeHtml(asset.title)}</h3>
      <p>${escapeHtml(asset.sourceType || '')} · ${escapeHtml(asset.assetKind || '')} · ${escapeHtml(asset.verificationStatus || 'pending')}</p>
      <span class="tag ${asset.synthetic ? 'badge-warn' : 'badge-ok'}">${asset.synthetic ? 'AI 概念图' : '真实参考图'}</span>
      ${asset.previewUrl ? `<img src="${escapeHtml(asset.previewUrl)}" alt="" style="width:120px;height:80px;object-fit:cover;border-radius:8px;margin-top:8px">` : ''}
      ${asset.sourceUrl ? `<div><a class="link" href="${escapeHtml(asset.sourceUrl)}" target="_blank" rel="noreferrer">打开原始链接</a></div>` : ''}
      ${asset.localPath ? `<p class="hint">${escapeHtml(asset.localPath)}</p>` : ''}
    </div>
    <div class="item-actions">${action}</div>
  </div>`;
}

function toAssetInput(value) {
  return {
    title: value.title,
    assetKind: KIND_BY_CATEGORY[value.category] || 'real_photo',
    sourceType: value.sourcePlatform || 'upload',
    sourceUrl: value.sourceUrl || null,
    localPath: value.localPath || null,
    tags: String(value.styleTags || '').split(',').map(item => item.trim()).filter(Boolean),
    verificationStatus: value.verificationStatus || 'pending',
    synthetic: false,
    sourceMetadata: { category: value.category || '', notes: value.notes || '' },
  };
}

function isKnowledgeItem(item) {
  return item?.type === 'document' || item?.type === 'knowledge';
}

function knowledgeId(item) {
  return String(item?.id || item?.filename || item?.path || '');
}

function resultExcerpt(item) {
  return String(item?.snippet || item?.matches?.[0]?.context || item?.text || item?.filename || '').replace(/\s+/g, ' ').trim().slice(0, 220);
}

function normalizeKnowledgeSource(item) {
  return {
    id: knowledgeId(item),
    type: item.type,
    kind: item.kind || (item.type === 'document' ? 'obsidian-note' : 'knowledge'),
    title: item.title || item.filename || item.path,
    sourceType: item.sourceType || (item.type === 'document' ? 'obsidian' : 'ronin-knowledge'),
    path: item.type === 'document' ? item.filename || item.path || null : null,
    sourceUrl: item.sourceUrl || null,
    excerpt: String(item.snippet || item.matches?.[0]?.context || item.text || '').replace(/\s+/g, ' ').trim().slice(0, 1200),
    tags: item.tags || [],
    workflowStage: Array.isArray(item.workflowStage) ? item.workflowStage : [item.workflowStage].filter(Boolean),
    groundingStatus: item.groundingStatus || (item.type === 'document' ? 'vault-note' : 'metadata-only'),
  };
}

function inferObsidianAssetKind(item) {
  const text = [item.title, item.filename, ...(item.tags || [])].join(' ');
  if (/姿势|动作|pose/i.test(text)) return 'pose_reference';
  if (/光线|布光|lighting/i.test(text)) return 'lighting_reference';
  if (/构图|composition/i.test(text)) return 'composition_reference';
  if (/色彩|调色|color/i.test(text)) return 'color_reference';
  if (/场景|地点|location/i.test(text)) return 'location_reference';
  return 'real_photo';
}

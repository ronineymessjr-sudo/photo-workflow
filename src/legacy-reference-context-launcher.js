const root = window;

const STORAGE_KEY = 'pa_reference_handoff_target';

const OPEN_TARGETS = {
  pexels: {
    id: 'pexels',
    name: 'Pexels',
    note: '免费实拍图片',
    urlForQuery: (query) => `https://www.pexels.com/zh-cn/search/${encodeURIComponent(query)}/`,
  },
  unsplash: {
    id: 'unsplash',
    name: 'Unsplash',
    note: '高质量摄影作品',
    urlForQuery: (query) => `https://unsplash.com/s/photos/${encodeURIComponent(query)}`,
  },
  pixabay: {
    id: 'pixabay',
    name: 'Pixabay',
    note: '免费图片范围较广',
    urlForQuery: (query) => `https://pixabay.com/images/search/${encodeURIComponent(query)}/`,
  },
  'personal-library': {
    id: 'personal-library',
    name: '个人图库',
    note: '搜索已连接的私人摄影库',
    urlForQuery: null,
  },
};

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, '');
}

function app() {
  return root.PhotoAtelierV5?.ready ? root.PhotoAtelierV5.application : null;
}

function currentPlan() {
  const application = app();
  if (!application) return null;
  const activeId = root.currentPlanId;
  if (activeId) {
    const active = application.repositories.plans.get(activeId);
    if (active?.projectId) return active;
  }
  return application.repositories.plans.list((item) => item.projectId)
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))[0] || null;
}

function currentShot(shotId) {
  const application = app();
  const plan = currentPlan();
  if (!application || !plan?.projectId || !shotId) return null;
  return application.repositories.shots.get(shotId) || null;
}

function selectedReferenceIds(plan) {
  const application = app();
  if (!application || !plan?.projectId) return [];
  try {
    const model = application.queries.referenceLibrary.getProject(plan.projectId);
    return (model.selectedReferences || []).map((item) => item.asset.id);
  } catch {
    return [];
  }
}

function getPersonalLibraryHealth() {
  const bridge = root.window?.PhotoAtelierKnowledge;
  if (!bridge || typeof bridge.checkPersonalLibraryHealth !== 'function') {
    return { available: false, reason: '未配置个人图库连接' };
  }
  return bridge.checkPersonalLibraryHealth().catch(() => ({ available: false, reason: '健康检查失败' }));
}

function buildReferenceContext({ plan, shotId } = {}) {
  const resolvedPlan = plan || currentPlan();
  if (!resolvedPlan) return null;
  const input = resolvedPlan.input || {};
  const shot = shotId ? currentShot(shotId) : null;
  const context = {
    planId: resolvedPlan.id,
    projectId: resolvedPlan.projectId || null,
    theme: input.theme || '',
    style: input.style || '',
    scene: input.scene || '',
    mood: input.mood || '',
    orientation: input.orientation || '',
    focalLength: shot?.focalLength || input.focalLength || '',
    shotId: shot?.id || null,
    shotScene: shot?.scene || '',
    selectedReferenceIds: selectedReferenceIds(resolvedPlan),
  };
  const hasContent = Object.values(context).some((value) =>
    Array.isArray(value) ? value.length > 0 : String(value || '').trim().length > 0
  );
  return hasContent ? context : null;
}

function buildHandoffQuery(context) {
  if (!context) return '';
  const parts = [];
  if (context.theme) parts.push(context.theme);
  if (context.style) parts.push(context.style);
  if (context.scene) parts.push(context.scene);
  if (context.mood) parts.push(context.mood);
  if (context.focalLength) parts.push(String(context.focalLength));
  if (context.shotScene) parts.push(context.shotScene);
  const query = parts.filter(Boolean).join(' ').trim();
  return query || '';
}

function getAvailableTargets() {
  const personal = root.window?.PhotoAtelierKnowledge?.checkPersonalLibraryHealth
    ? { ...OPEN_TARGETS['personal-library'] }
    : null;
  const base = [OPEN_TARGETS.pexels, OPEN_TARGETS.unsplash, OPEN_TARGETS.pixabay];
  return personal ? [...base, personal] : base;
}

function getSelectedTarget() {
  const saved = readStorage(STORAGE_KEY, null);
  return OPEN_TARGETS[saved] ? saved : 'pexels';
}

function setSelectedTarget(targetId) {
  if (OPEN_TARGETS[targetId]) {
    writeStorage(STORAGE_KEY, targetId);
  }
}

function getTargetById(targetId) {
  return OPEN_TARGETS[targetId] || null;
}

async function openContextualReferenceSearch({ plan, shotId } = {}) {
  const context = buildReferenceContext({ plan, shotId });
  if (!context) {
    if (typeof root.toast === 'function') root.toast('当前没有可携带的方案上下文', 'er');
    return { opened: false, reason: '缺少方案上下文' };
  }
  const targetId = getSelectedTarget();
  const target = getTargetById(targetId);
  if (!target) {
    if (typeof root.toast === 'function') root.toast('未找到配置的目标应用', 'er');
    return { opened: false, reason: '目标应用不可用' };
  }

  if (targetId === 'personal-library') {
    const health = await getPersonalLibraryHealth();
    if (!health.available) {
      if (typeof root.toast === 'function') root.toast('个人图库未连接，请先在设置中配置', 'er');
      return { opened: false, reason: health.reason || '个人图库不可用' };
    }
    const bridge = root.window?.PhotoAtelierKnowledge;
    if (bridge && typeof bridge.openPersonalLibrarySearch === 'function') {
      bridge.openPersonalLibrarySearch(context);
      return { opened: true, target: targetId, context };
    }
    if (typeof root.toast === 'function') root.toast('个人图库暂不支持上下文搜索', 'er');
    return { opened: false, reason: '个人图库不支持上下文搜索' };
  }

  const query = buildHandoffQuery(context);
  if (!query) {
    if (typeof root.toast === 'function') root.toast('当前上下文缺少可搜索的关键词', 'er');
    return { opened: false, reason: '搜索关键词为空' };
  }
  const url = target.urlForQuery(query);
  root.open(url, '_blank', 'noopener,noreferrer');
  return { opened: true, target: targetId, url, query, context };
}

function renderContextualReferenceAction({ plan, shotId } = {}) {
  const context = buildReferenceContext({ plan, shotId });
  if (!context) return '';
  const targetId = getSelectedTarget();
  const target = getTargetById(targetId);
  if (!target) return '';
  const query = buildHandoffQuery(context);
  if (!query && targetId !== 'personal-library') return '';
  const label = targetId === 'personal-library'
    ? `搜索个人图库：${escapeHtml(query || context.theme || '当前方案')}`
    : `在 ${escapeHtml(target.name)} 搜索：${escapeHtml(query)}`;
  return `<div class="reference-context-handoff">
    <button class="btn btn-p btn-sm" type="button" onclick="openContextualReferenceSearch(${shotId ? `{shotId:'${escapeHtml(shotId)}'}` : ''})">${label}</button>
    <select class="reference-context-handoff__target" aria-label="选择搜索目标" onchange="setSelectedTarget(this.value);window.renderContextualReferenceHandoff?.()">
      ${getAvailableTargets().map((t) => `<option value="${escapeHtml(t.id)}" ${t.id === targetId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
    </select>
  </div>`;
}

function renderSourceButton(asset) {
  if (!asset || asset.synthetic === true) return '';
  if (!asset.sourceUrl) return '';
  return `<a class="btn btn-s btn-sm" href="${escapeHtml(asset.sourceUrl)}" target="_blank" rel="noreferrer" title="查看图片来源">来源</a>`;
}

root.openContextualReferenceSearch = openContextualReferenceSearch;
root.setSelectedTarget = setSelectedTarget;
root.renderContextualReferenceHandoff = renderContextualReferenceAction;
root.buildReferenceContext = buildReferenceContext;
root.buildHandoffQuery = buildHandoffQuery;
root.renderSourceButton = renderSourceButton;

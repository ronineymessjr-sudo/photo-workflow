const root = window;

const STORAGE_KEY = 'pa_reference_handoff_target';

const OPEN_TARGETS = {
  pexels: {
    id: 'pexels',
    name: 'Pexels',
    kind: 'licensed-media',
    note: '可下载素材，使用前检查人物与商标权利',
    urlForQuery: (query) => `https://www.pexels.com/zh-cn/search/${encodeURIComponent(query)}/`,
  },
  unsplash: {
    id: 'unsplash',
    name: 'Unsplash',
    kind: 'licensed-media',
    note: '可下载素材，使用前检查人物与商标权利',
    urlForQuery: (query) => `https://unsplash.com/s/photos/${encodeURIComponent(query)}`,
  },
  pixabay: {
    id: 'pixabay',
    name: 'Pixabay',
    kind: 'licensed-media',
    note: '可下载素材，使用前检查具体内容限制',
    urlForQuery: (query) => `https://pixabay.com/images/search/${encodeURIComponent(query)}/`,
  },
  behance: {
    id: 'behance',
    name: 'Behance',
    kind: 'inspiration-only',
    note: '仅作作品灵感检索，不代表可下载或商用',
    urlForQuery: (query) => `https://www.behance.net/search/projects?search=${encodeURIComponent(query)}`,
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    kind: 'inspiration-only',
    note: '仅作灵感检索，版权以原始来源为准',
    urlForQuery: (query) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
  },
  xinpianchang: {
    id: 'xinpianchang',
    name: '新片场',
    kind: 'inspiration-only',
    note: '仅查看公开作品和创作思路，不复制素材',
    urlForQuery: (query) => `https://www.xinpianchang.com/search?kw=${encodeURIComponent(query)}`,
  },
  zcool: {
    id: 'zcool',
    name: '站酷',
    kind: 'inspiration-only',
    note: '仅查看公开作品和创作思路，不复制素材',
    urlForQuery: (query) => `https://www.zcool.com.cn/search/content?word=${encodeURIComponent(query)}`,
  },
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    kind: 'inspiration-only',
    note: '跳转公开搜索结果，使用内容前另行确认授权',
    urlForQuery: (query) => `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}&source=web_search_result_notes`,
  },
  bilibili: {
    id: 'bilibili',
    name: '哔哩哔哩',
    kind: 'inspiration-only',
    note: '跳转公开视频搜索，不下载或重新分发',
    urlForQuery: (query) => `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`,
  },
  'personal-library': {
    id: 'personal-library',
    name: '个人图库',
    kind: 'personal',
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
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
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
  const base = [
    OPEN_TARGETS.pexels,
    OPEN_TARGETS.unsplash,
    OPEN_TARGETS.pixabay,
    OPEN_TARGETS.behance,
    OPEN_TARGETS.pinterest,
    OPEN_TARGETS.xinpianchang,
    OPEN_TARGETS.zcool,
    OPEN_TARGETS.xiaohongshu,
    OPEN_TARGETS.bilibili,
  ];
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
  const usageNote = target.kind === 'licensed-media'
    ? '可作为素材候选，但人物肖像、商标和具体许可仍需在原站确认。'
    : target.kind === 'inspiration-only'
      ? '仅跳转到公开搜索结果作灵感参考，不代表获得下载、复制或商业使用授权。'
      : '只检索你自己的图库，不上传原图。';
  return `<div class="reference-context-handoff">
    <select class="reference-context-handoff__target" aria-label="选择搜索目标" onchange="setSelectedTarget(this.value);window.renderContextualReferenceHandoff?.()">
      <optgroup label="可下载素材候选">
        ${getAvailableTargets().filter(t => t.kind === 'licensed-media').map((t) => `<option value="${escapeHtml(t.id)}" ${t.id === targetId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
      </optgroup>
      <optgroup label="作品灵感搜索">
        ${getAvailableTargets().filter(t => t.kind === 'inspiration-only').map((t) => `<option value="${escapeHtml(t.id)}" ${t.id === targetId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
      </optgroup>
      ${getAvailableTargets().some(t => t.kind === 'personal') ? `<optgroup label="我的内容">${getAvailableTargets().filter(t => t.kind === 'personal').map((t) => `<option value="${escapeHtml(t.id)}" ${t.id === targetId ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}</optgroup>` : ''}
    </select>
    <button class="btn btn-p btn-sm" type="button" onclick="openContextualReferenceSearch(${shotId ? `{shotId:'${escapeHtml(shotId)}'}` : ''})">${label}</button>
    <small class="reference-context-handoff__policy">${escapeHtml(usageNote)}</small>
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

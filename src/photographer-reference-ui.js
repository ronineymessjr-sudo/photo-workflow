const root = window;

const state = {
  assets: [],
  catalogById: new Map(),
  query: '',
  filter: '',
  view: 'recommended',
  personalLibrary: { available: false, checked: false, helper: '', libraryFolder: '.', loading: false, results: [], query: '' },
};

const POSE_DETAILS = {
  'bundled-pose-01': { title: '靠墙站姿', tags: ['靠墙', '站姿', '自然松弛'] },
  'bundled-pose-02': { title: '街头近景人像', tags: ['街拍', '近景', '站姿'] },
  'bundled-pose-03': { title: '台阶正面坐姿', tags: ['台阶', '坐姿', '正面'] },
  'bundled-pose-04': { title: '河边逆光人像', tags: ['逆光', '站姿', '河边'] },
  'bundled-pose-05': { title: '街头自然微笑', tags: ['街拍', '微笑', '站姿'] },
  'bundled-pose-06': { title: '阳光台阶坐姿', tags: ['台阶', '坐姿', '阳光'] },
  'bundled-pose-07': { title: '白墙侧身站姿', tags: ['靠墙', '站姿', '侧身'] },
  'bundled-pose-08': { title: '墙边轻松微笑', tags: ['靠墙', '微笑', '站姿'] },
  'bundled-pose-09': { title: '咖啡馆自然坐姿', tags: ['室内', '坐姿', '生活感'] },
  'bundled-pose-10': { title: '休闲侧坐姿势', tags: ['坐姿', '休闲', '侧身'] },
  'bundled-pose-11': { title: '彩色墙面站姿', tags: ['街拍', '站姿', '色彩'] },
  'bundled-pose-12': { title: '台阶侧坐姿势', tags: ['台阶', '坐姿', '侧身'] },
};

function app() {
  return root.PhotoAtelierV5?.ready ? root.PhotoAtelierV5.application : null;
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = String(value ?? '');
  return element.innerHTML;
}

function notify(message, type = 'ok') {
  const element = document.getElementById('toast');
  if (!element) return;
  element.textContent = message;
  element.className = `toast show ${type === 'er' ? 'er' : 'ok'}`;
  window.setTimeout(() => { element.className = 'toast'; }, 3000);
}

function displayUrl(value) {
  if (!value) return '';
  if (/^(https?:|data:|blob:|\/)/i.test(value)) return value;
  return `../${String(value).replace(/^\.\//, '')}`;
}

function currentPlan() {
  const application = app();
  if (!application) return null;
  const activeId = root.currentPlanId;
  if (activeId) {
    const active = application.repositories.plans.get(activeId);
    if (active?.projectId) return active;
  }
  return application.repositories.plans.list(item => item.projectId)
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))[0] || null;
}

function projectModel() {
  const application = app();
  const plan = currentPlan();
  if (!application || !plan?.projectId) return { plan, selected: [], selectedIds: new Set(), links: new Map(), shotBindings: [] };
  try {
    const model = application.queries.referenceLibrary.getProject(plan.projectId);
    return {
      plan,
      selected: model.selectedReferences,
      selectedIds: new Set(model.selectedReferences.map(item => item.asset.id)),
      links: new Map(model.selectedReferences.map(item => [item.asset.id, item.link])),
      shotBindings: model.shotBindings || [],
    };
  } catch {
    return { plan, selected: [], selectedIds: new Set(), links: new Map(), shotBindings: [] };
  }
}

function currentShots() {
  const application = app();
  const plan = currentPlan();
  if (!application || !plan?.projectId) return [];
  return application.repositories.shots.list(item => item.projectId === plan.projectId)
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
}

function enrichAsset(asset) {
  const detail = POSE_DETAILS[asset.id] || {};
  return {
    ...asset,
    title: detail.title || asset.title || '我的参考图',
    tags: [...new Set([...(asset.tags || []), ...(detail.tags || [])])],
  };
}

function ingestCatalogAsset(asset) {
  const application = app();
  if (!application || asset.synthetic === true) return null;
  const enriched = enrichAsset(asset);
  return application.references.ingestAsset({
    ...enriched,
    previewUrl: displayUrl(asset.previewUrl),
    synthetic: false,
  }).asset;
}

async function loadCatalog() {
  const response = await fetch('../data/v5-real-data-catalog.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const catalog = await response.json();
  const realAssets = (catalog.referenceAssets || []).filter(asset => asset.synthetic !== true && asset.previewUrl);
  realAssets.forEach(asset => state.catalogById.set(asset.id, enrichAsset(asset)));
  const ingested = realAssets.map(ingestCatalogAsset).filter(Boolean);
  const all = app()?.repositories.referenceAssets.list(asset => asset.synthetic !== true && asset.previewUrl) || [];
  state.assets = uniqueAssets([...ingested, ...all]).map(enrichAsset);
}

function uniqueAssets(assets) {
  return [...new Map(assets.map(asset => [asset.id, asset])).values()];
}

function searchableText(asset) {
  return [asset.title, asset.photographer, ...(asset.tags || [])].filter(Boolean).join(' ').toLowerCase();
}

function visibleAssets() {
  const model = projectModel();
  let source;
  if (state.view === 'selected') source = model.selected.map(item => item.asset);
  else if (state.view === 'personal') source = state.personalLibrary.results;
  else source = state.assets;
  const query = [state.query, state.filter].filter(Boolean).join(' ').trim().toLowerCase();
  return source.map(enrichAsset).filter(asset => !query || query.split(/\s+/).every(term => searchableText(asset).includes(term)));
}

function renderShotBindings(asset, model) {
  if (state.view !== 'selected' || !model.plan) return '';
  const shots = currentShots();
  if (!shots.length) return '';
  const bindingsByShotId = new Map((model.shotBindings || [])
    .filter(item => item.asset.id === asset.id)
    .map(item => [item.link.shotId, item.link]));
  const buttons = shots.map(shot => {
    const bound = bindingsByShotId.get(shot.id);
    const label = escapeHtml(shot.scene || `镜头 ${shot.sequence}`);
    if (bound) {
      return `<button class="btn btn-s btn-xs" type="button" onclick="unbindEasyReferenceFromShot('${escapeHtml(bound.id)}')">${label} · 已绑定</button>`;
    }
    return `<button class="btn btn-p btn-xs" type="button" onclick="bindEasyReferenceToShot('${escapeHtml(asset.id)}', '${escapeHtml(shot.id)}')">${label}</button>`;
  }).join('');
  return `<div class="reference-shot-bindings">${buttons}</div>`;
}

function renderCard(asset, model) {
  const selected = model.selectedIds.has(asset.id);
  const link = model.links.get(asset.id);
  const sourceLabel = asset.sourceType === 'browser-upload' ? '我的图片' : asset.sourceType === 'obsidian-local' ? '个人图库' : '开放实拍参考';
  const action = selected
    ? `<button class="btn btn-s btn-sm" type="button" onclick="removeEasyReference('${escapeHtml(link.id)}')">移出方案</button>`
    : `<button class="btn btn-p btn-sm" type="button" onclick="addEasyReference('${escapeHtml(asset.id)}')">${model.plan ? '加入当前方案' : '先创建方案'}</button>`;
  const source = typeof root.renderSourceButton === 'function' ? root.renderSourceButton(asset) : '';
  const badgeLabel = asset.synthetic === true ? 'AI 概念图' : '真实参考图';
  return `<article class="reference-photo-card">
    <div class="reference-photo-card__media">
      <img src="${escapeHtml(displayUrl(asset.previewUrl))}" alt="${escapeHtml(asset.title)}" loading="eager">
      <span class="reference-photo-card__badge">${escapeHtml(badgeLabel)}</span>
    </div>
    <div class="reference-photo-card__body">
      <strong class="reference-photo-card__title">${escapeHtml(asset.title)}</strong>
      <div class="reference-photo-card__meta">${escapeHtml((asset.tags || []).slice(0, 3).join(' · ') || sourceLabel)}<br>${escapeHtml(sourceLabel)}</div>
      ${renderShotBindings(asset, model)}
      <div class="reference-photo-card__actions">${action}${source}</div>
    </div>
  </article>`;
}

function renderOpenSources() {
  const target = document.getElementById('easyReferenceOpenSources');
  if (!target) return;
  const html = typeof root.renderContextualReferenceHandoff === 'function'
    ? root.renderContextualReferenceHandoff()
    : '';
  target.innerHTML = html || '<div class="reference-easy-empty">当前没有可携带的方案上下文，先创建或打开一个拍摄方案。</div>';
}

function personalLibraryBridge() {
  return globalThis.window?.PhotoAtelierKnowledge;
}

async function checkPersonalLibrary() {
  const bridge = personalLibraryBridge();
  if (!bridge || typeof bridge.checkPersonalLibraryHealth !== 'function') {
    state.personalLibrary.checked = true;
    state.personalLibrary.available = false;
    ensurePersonalLibraryUi();
    render();
    return;
  }
  try {
    const health = await bridge.checkPersonalLibraryHealth();
    state.personalLibrary.available = health.available === true;
    state.personalLibrary.checked = true;
    state.personalLibrary.helper = health.helper || '';
    state.personalLibrary.libraryFolder = health.libraryFolder || '.';
    if (!health.available && state.view === 'personal') state.view = 'recommended';
  } catch {
    state.personalLibrary.available = false;
    state.personalLibrary.checked = true;
    if (state.view === 'personal') state.view = 'recommended';
  }
  ensurePersonalLibraryUi();
  render();
}

function ensurePersonalLibraryUi() {
  const container = document.querySelector('.reference-easy-tabs');
  if (!container) return;
  let button = container.querySelector('[data-easy-reference-view="personal"]');
  if (!state.personalLibrary.available) {
    if (button) button.remove();
    return;
  }
  if (!button) {
    button = document.createElement('button');
    button.className = 'reference-easy-tab';
    button.type = 'button';
    button.dataset.easyReferenceView = 'personal';
    button.textContent = '个人图库';
    button.onclick = () => setEasyReferenceView('personal');
    container.appendChild(button);
  }
  button.classList.toggle('is-active', state.view === 'personal');
}

async function loadPersonalResults(query = '') {
  if (!state.personalLibrary.available) return;
  const bridge = personalLibraryBridge();
  if (!bridge || typeof bridge.searchPersonalLibrary !== 'function') return;
  state.personalLibrary.loading = true;
  state.personalLibrary.query = query;
  render();
  try {
    const results = await bridge.searchPersonalLibrary(query, { limit: 20 });
    const assets = (results || []).filter(item => item.type === 'asset' && item.synthetic !== true);
    const helper = state.personalLibrary.helper;
    const ingested = [];
    for (const item of assets) {
      try {
        const application = app();
        if (!application) break;
        const input = {
          title: item.title || String(item.filename || '个人参考').replace(/\.[^.]+$/, ''),
          assetKind: 'real_photo',
          sourceType: 'obsidian-local',
          sourceId: item.id,
          previewUrl: helper ? `${helper.replace(/\/$/, '')}/v1/assets/${encodeURIComponent(item.id)}/thumbnail` : '',
          localPath: item.filename || null,
          tags: [...new Set([...(item.tags || []), '个人图库'])],
          licenseStatus: item.licenseClass || 'local-private-reference',
          verificationStatus: item.validationStatus || 'private',
          synthetic: false,
          sourceMetadata: { filename: item.filename, size: item.size, id: item.id },
        };
        ingested.push(application.references.ingestAsset(input).asset);
      } catch { /* 单张失败不影响其余 */ }
    }
    state.assets = uniqueAssets([...state.assets, ...ingested]).map(enrichAsset);
    state.personalLibrary.results = ingested.map(enrichAsset);
  } catch {
    state.personalLibrary.results = [];
  } finally {
    state.personalLibrary.loading = false;
  }
  render();
}

function render() {
  const gallery = document.getElementById('easyReferenceGallery');
  const openSources = document.getElementById('easyReferenceOpenSources');
  const meta = document.getElementById('easyReferenceMeta');
  const planButton = document.getElementById('easyReferencePlanButton');
  if (!gallery || !openSources || !meta) return;
  const model = projectModel();
  const isOpen = state.view === 'open';
  const isPersonal = state.view === 'personal';
  gallery.hidden = isOpen;
  openSources.hidden = !isOpen;
  if (planButton) planButton.textContent = model.plan ? `当前方案：${model.plan.title || model.plan.name || '未命名方案'}` : '先创建拍摄方案';
  if (isOpen) {
    meta.textContent = '携带当前方案上下文，在选定的目标图库继续搜索。';
    renderOpenSources();
    return;
  }
  const assets = visibleAssets();
  if (isPersonal) {
    meta.textContent = state.personalLibrary.loading ? '正在搜索个人图库...' : `个人图库 ${assets.length} 张`;
  } else if (state.view === 'selected') {
    meta.textContent = `${model.plan ? `当前方案已加入 ${assets.length} 张` : '请先创建或打开一个方案'}`;
  } else {
    meta.textContent = `找到 ${assets.length} 张可直接使用的真实参考图`;
  }
  gallery.innerHTML = assets.map(asset => renderCard(asset, model)).join('') || `<div class="reference-easy-empty">${isPersonal ? '个人图库没有匹配图片。' : state.view === 'selected' ? '当前方案还没有参考图。回到“推荐图片”挑选即可。' : '没有匹配图片，换个简单关键词，或到“开放图库”继续找。'}</div>`;
}

root.loadEasyReferenceGallery = async function () {
  const meta = document.getElementById('easyReferenceMeta');
  try {
    if (!app()) throw new Error('数据引擎尚未就绪');
    if (state.assets.length) { render(); checkPersonalLibrary().catch(() => {}); return; }
    await loadCatalog();
    render();
    checkPersonalLibrary().catch(() => {});
  } catch (error) {
    if (meta) meta.textContent = '内置参考图暂时没有载入，可以先上传自己的图片或刷新页面。';
    const gallery = document.getElementById('easyReferenceGallery');
    if (gallery) gallery.innerHTML = '<div class="reference-easy-empty">参考图暂时不可用，请刷新页面重试。</div>';
    console.warn('[PhotoAtelier] Reference gallery unavailable.', error);
  }
};

root.setEasyReferenceView = function (view) {
  state.view = ['recommended', 'selected', 'open', 'personal'].includes(view) ? view : 'recommended';
  document.querySelectorAll('[data-easy-reference-view]').forEach(button => button.classList.toggle('is-active', button.dataset.easyReferenceView === state.view));
  ensurePersonalLibraryUi();
  if (state.view === 'personal') loadPersonalResults(state.query);
  else render();
};

root.setEasyReferenceFilter = function (filter) {
  state.filter = filter || '';
  document.querySelectorAll('[data-easy-reference-filter]').forEach(button => button.classList.toggle('is-active', button.dataset.easyReferenceFilter === state.filter));
  render();
};

root.searchEasyReferences = function () {
  state.query = document.getElementById('easyReferenceSearch')?.value.trim() || '';
  if (state.view === 'personal') loadPersonalResults(state.query);
  else render();
};

root.addEasyReference = function (assetId) {
  const application = app();
  const model = projectModel();
  if (!application || !model.plan?.projectId) {
    root.showTab?.('gen');
    notify('先创建或打开一个拍摄方案，再加入参考图', 'er');
    return;
  }
  const asset = application.repositories.referenceAssets.get(assetId);
  if (!asset || asset.synthetic === true) return;
  application.references.selectForProject({ projectId: model.plan.projectId, referenceAssetId: asset.id, role: 'general' });
  notify('参考图已加入当前方案', 'ok');
  render();
};

root.removeEasyReference = function (linkId) {
  if (!linkId || !app()) return;
  app().references.removeProjectLink(linkId);
  notify('已移出当前方案，图片仍保留在参考库', 'ok');
  render();
};

root.openEasyReferencePlan = function () {
  const plan = currentPlan();
  root.showTab?.('gen');
  if (plan?.id && typeof root.loadPlan === 'function') root.loadPlan(plan.id);
};

root.bindEasyReferenceToShot = function (assetId, shotId) {
  const application = app();
  if (!application) return;
  try {
    application.references.bindToShot({ shotId, referenceAssetId: assetId, role: 'shotGuide' });
    notify('已绑定到镜头', 'ok');
    render();
  } catch (error) {
    notify(error.message || '绑定失败', 'er');
  }
};

root.unbindEasyReferenceFromShot = function (linkId) {
  if (!linkId || !app()) return;
  try {
    app().references.removeShotLink(linkId);
    notify('已取消镜头绑定', 'ok');
    render();
  } catch (error) {
    notify(error.message || '取消绑定失败', 'er');
  }
};

root.handleEasyReferenceUpload = async function (event) {
  const files = [...(event.target.files || [])].filter(file => file.type.startsWith('image/')).slice(0, 6);
  if (!files.length || !app()) return;
  const model = projectModel();
  let added = 0;
  for (const file of files) {
    if (file.size > 12 * 1024 * 1024) continue;
    const previewUrl = await createPreview(file);
    const result = app().references.ingestAsset({
      title: file.name.replace(/\.[^.]+$/, '') || '我的参考图',
      assetKind: 'real_photo',
      sourceType: 'browser-upload',
      sourceId: `${file.name}:${file.size}:${file.lastModified}`,
      previewUrl,
      localPath: file.name,
      tags: ['我的图片'],
      licenseStatus: 'local-private-reference',
      verificationStatus: 'private',
      synthetic: false,
      sourceMetadata: { fileName: file.name, fileSize: file.size, lastModified: file.lastModified },
    });
    if (model.plan?.projectId) app().references.selectForProject({ projectId: model.plan.projectId, referenceAssetId: result.asset.id, role: 'general' });
    added += 1;
  }
  event.target.value = '';
  state.assets = uniqueAssets(app().repositories.referenceAssets.list(asset => asset.synthetic !== true && asset.previewUrl)).map(enrichAsset);
  state.view = model.plan ? 'selected' : 'recommended';
  document.querySelectorAll('[data-easy-reference-view]').forEach(button => button.classList.toggle('is-active', button.dataset.easyReferenceView === state.view));
  notify(model.plan ? `已上传并加入 ${added} 张参考图` : `已保存 ${added} 张参考图，创建方案后即可加入`, 'ok');
  render();
};

function createPreview(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', .82));
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('图片读取失败')); };
    image.src = objectUrl;
  });
}

document.getElementById('easyReferenceSearch')?.addEventListener('keydown', event => {
  if (event.key === 'Enter') root.searchEasyReferences();
});

root.loadEasyReferenceGallery();

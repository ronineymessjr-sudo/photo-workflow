const root = window;

const state = {
  assets: [],
  catalogById: new Map(),
  query: '',
  filter: '',
  view: 'recommended',
  personalLibrary: { available: false, checked: false, helper: '', libraryFolder: '.', loading: false, results: [], query: '' },
  detail: { assetId: null, fit: 'contain' },
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

function assetKindLabel(asset) {
  if (asset.synthetic === true) return 'AI 概念图';
  const map = {
    real_photo: '实拍参考',
    pose_reference: '姿势参考',
    lighting_reference: '光线参考',
    composition_reference: '构图参考',
    color_reference: '色彩参考',
    location_reference: '场景参考',
  };
  return map[asset.assetKind] || '真实参考图';
}

function sourceTypeLabel(asset) {
  if (asset.synthetic === true) return 'AI 生成';
  if (asset.sourceType === 'browser-upload') return '我的图片';
  if (asset.sourceType === 'obsidian-local') return '个人图库';
  if (asset.sourceType?.includes('pexels')) return 'Pexels';
  if (asset.sourceType?.includes('unsplash')) return 'Unsplash';
  if (asset.sourceType?.includes('pixabay')) return 'Pixabay';
  return '开放实拍参考';
}

function usefulFact(asset) {
  if (asset.photographer) return asset.photographer;
  const firstTag = (asset.tags || []).find(tag => !['实拍参考', '我的图片', '个人图库'].includes(tag));
  if (firstTag) return firstTag;
  if (asset.licenseStatus && asset.licenseStatus !== 'unknown') return asset.licenseStatus;
  return sourceTypeLabel(asset);
}

function renderR4Card(asset, model) {
  const selected = model.selectedIds.has(asset.id);
  const isConcept = asset.synthetic === true;
  const kindLabel = assetKindLabel(asset);
  const fact = usefulFact(asset);
  return `<article class="r4-reference-card" tabindex="0" role="button" aria-label="打开 ${escapeHtml(asset.title)} 详情" onclick="openEasyReferenceDetail('${escapeHtml(asset.id)}')">
    <div class="r4-reference-card__media">
      <img src="${escapeHtml(displayUrl(asset.previewUrl))}" alt="${escapeHtml(asset.title)}" loading="eager">
      <span class="r4-reference-card__kind ${isConcept ? 'is-concept' : ''}">${escapeHtml(kindLabel)}</span>
    </div>
    <div class="r4-reference-card__body">
      <div>
        <strong class="r4-reference-card__title">${escapeHtml(asset.title)}</strong>
        <div class="r4-reference-card__fact">${escapeHtml(fact)}</div>
      </div>
      <div class="r4-reference-card__state">
        <span class="r4-reference-card__dot ${isConcept ? 'is-concept' : ''}"></span>
        <span class="r4-reference-card__fact">${selected ? '已加入当前方案' : isConcept ? '概念图，不作为实拍依据' : '真实参考图'}</span>
      </div>
    </div>
  </article>`;
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
      return `<button class="btn btn-s btn-xs" type="button" onclick="event.stopPropagation(); unbindEasyReferenceFromShot('${escapeHtml(bound.id)}')">${label} · 已绑定</button>`;
    }
    return `<button class="btn btn-p btn-xs" type="button" onclick="event.stopPropagation(); bindEasyReferenceToShot('${escapeHtml(asset.id)}', '${escapeHtml(shot.id)}')">${label}</button>`;
  }).join('');
  return `<div class="reference-shot-bindings">${buttons}</div>`;
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
  gallery.hidden = isOpen;
  openSources.hidden = !isOpen;
  gallery.classList.add('r4-reference-grid');
  if (planButton) planButton.textContent = model.plan ? `当前方案：${model.plan.title || model.plan.name || '未命名方案'}` : '先创建拍摄方案';
  if (isOpen) {
    meta.textContent = '携带当前方案上下文，在选定的目标图库继续搜索。';
    renderOpenSources();
    return;
  }
  const assets = visibleAssets();
  const isPersonal = state.view === 'personal';
  if (isPersonal) {
    meta.textContent = state.personalLibrary.loading ? '正在搜索个人图库...' : `个人图库 ${assets.length} 张`;
  } else if (state.view === 'selected') {
    meta.textContent = `${model.plan ? `当前方案已加入 ${assets.length} 张` : '请先创建或打开一个方案'}`;
  } else {
    meta.textContent = `找到 ${assets.length} 张可直接使用的真实参考图`;
  }
  gallery.innerHTML = assets.map(asset => renderR4Card(asset, model)).join('') || `<div class="reference-easy-empty">${isPersonal ? '个人图库没有匹配图片。' : state.view === 'selected' ? '当前方案还没有参考图。回到“推荐图片”挑选即可。' : '没有匹配图片，换个简单关键词，或到“开放图库”继续找。'}</div>`;
}

root.loadEasyReferenceGallery = async function () {
  injectR4Stylesheet();
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
  if (state.detail.assetId === assetId) renderR4Detail(assetId);
};

root.removeEasyReference = function (linkId) {
  if (!linkId || !app()) return;
  const asset = findAssetByLinkId(linkId);
  app().references.removeProjectLink(linkId);
  notify('已移出当前方案，图片仍保留在参考库', 'ok');
  render();
  if (asset && state.detail.assetId === asset.id) renderR4Detail(asset.id);
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
    if (state.detail.assetId === assetId) renderR4Detail(assetId);
  } catch (error) {
    notify(error.message || '绑定失败', 'er');
  }
};

root.unbindEasyReferenceFromShot = function (linkId) {
  if (!linkId || !app()) return;
  try {
    const asset = findAssetByShotLinkId(linkId);
    app().references.removeShotLink(linkId);
    notify('已取消镜头绑定', 'ok');
    render();
    if (asset && state.detail.assetId === asset.id) renderR4Detail(asset.id);
  } catch (error) {
    notify(error.message || '取消绑定失败', 'er');
  }
};

function findAssetByLinkId(linkId) {
  const application = app();
  if (!application) return null;
  const link = application.repositories.projectReferenceLinks.get(linkId);
  if (!link) return null;
  return application.repositories.referenceAssets.get(link.referenceAssetId);
}

function findAssetByShotLinkId(linkId) {
  const application = app();
  if (!application) return null;
  const link = application.repositories.shotReferenceLinks.get(linkId);
  if (!link) return null;
  return application.repositories.referenceAssets.get(link.referenceAssetId);
}

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

/* R4-D detail view */

function injectR4Stylesheet() {
  if (document.getElementById('r4-reference-workspace-styles')) return;
  const link = document.createElement('link');
  link.id = 'r4-reference-workspace-styles';
  link.rel = 'stylesheet';
  link.href = '../src/r4-reference-workspace.css';
  document.head.appendChild(link);
}

function getAssetById(assetId) {
  const application = app();
  const fromRepo = application?.repositories.referenceAssets.get(assetId);
  if (fromRepo) return enrichAsset(fromRepo);
  return state.assets.find(asset => asset.id === assetId) || state.catalogById.get(assetId) || null;
}

function getProjectLinksForAsset(assetId) {
  const application = app();
  if (!application) return [];
  return application.repositories.projectReferenceLinks.list(item => item.referenceAssetId === assetId)
    .map(link => {
      const project = application.repositories.projects.get(link.projectId);
      return { link, project };
    });
}

function getShotLinksForAsset(assetId) {
  const application = app();
  if (!application) return [];
  return application.repositories.shotReferenceLinks.list(item => item.referenceAssetId === assetId)
    .map(link => {
      const shot = application.repositories.shots.get(link.shotId);
      const plan = shot ? application.repositories.plans.get(shot.planId) : null;
      const project = plan ? application.repositories.projects.get(plan.projectId) : null;
      return { link, shot, project };
    });
}

function formatSourceUrl(asset) {
  if (!asset.sourceUrl && asset.localPath) {
    return { href: displayUrl(asset.localPath), label: '打开本地文件' };
  }
  if (!asset.sourceUrl) return null;
  try {
    const url = new URL(asset.sourceUrl);
    if (['pexels.com', 'unsplash.com', 'pixabay.com'].some(host => url.hostname.includes(host))) {
      return { href: asset.sourceUrl, label: `在 ${url.hostname.replace(/^www\./, '')} 打开` };
    }
    return { href: asset.sourceUrl, label: '打开来源' };
  } catch {
    if (asset.localPath) return { href: displayUrl(asset.localPath), label: '打开本地文件' };
    return null;
  }
}

function ensureDetailModal() {
  let modal = document.getElementById('r4ReferenceDetailModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'r4ReferenceDetailModal';
  modal.className = 'r4-reference-detail';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'r4ReferenceDetailTitle');
  modal.innerHTML = `
    <div class="r4-reference-detail__sheet" onclick="if(event.target===this)closeEasyReferenceDetail()">
      <div class="r4-reference-detail__image-zone">
        <div class="r4-reference-detail__image-frame" id="r4ReferenceDetailImageFrame">
          <img id="r4ReferenceDetailImage" src="" alt="">
        </div>
        <div class="r4-reference-detail__floating-toolbar" role="toolbar" aria-label="图片工具">
          <button type="button" aria-label="完整显示" title="完整显示" onclick="setEasyReferenceImageFit('contain')" aria-pressed="true" id="r4ReferenceFitContain"><i data-lucide="scan"></i></button>
          <button type="button" aria-label="铺满画面" title="铺满画面" onclick="setEasyReferenceImageFit('cover')" aria-pressed="false" id="r4ReferenceFitCover"><i data-lucide="maximize-2"></i></button>
          <button type="button" aria-label="返回网格" title="返回网格" onclick="closeEasyReferenceDetail(); setEasyReferenceView('recommended')"><i data-lucide="layout-grid"></i></button>
          <button type="button" aria-label="查看拍摄信息" title="查看拍摄信息" onclick="focusEasyReferenceInfo()"><i data-lucide="info"></i></button>
        </div>
      </div>
      <div class="r4-reference-detail__panel r4-reference-detail__panel--analysis">
        <header class="r4-reference-detail__header">
          <div>
            <p class="r4-reference-detail__eyebrow" id="r4ReferenceDetailEyebrow">参考素材</p>
            <h2 class="r4-reference-detail__title" id="r4ReferenceDetailTitle">参考素材</h2>
          </div>
          <button class="r4-reference-detail__close" type="button" aria-label="关闭详情" title="关闭" onclick="closeEasyReferenceDetail()"><i data-lucide="x"></i></button>
        </header>
        <div class="r4-reference-detail__scroll" id="r4ReferenceDetailAnalysis"></div>
      </div>
      <div class="r4-reference-detail__panel r4-reference-detail__panel--links">
        <div class="r4-reference-detail__scroll" id="r4ReferenceDetailLinks"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function renderR4DetailFact(label, value, isHtml = false) {
  const content = isHtml ? value : escapeHtml(value ?? '未记录');
  return `<div class="r4-reference-detail__fact"><dt>${escapeHtml(label)}</dt><dd>${content}</dd></div>`;
}

function renderR4Detail(assetId) {
  const asset = getAssetById(assetId);
  if (!asset) return;
  const modal = ensureDetailModal();
  const model = projectModel();
  const selected = model.selectedIds.has(asset.id);
  const link = model.links.get(asset.id);
  const isConcept = asset.synthetic === true;
  const source = formatSourceUrl(asset);

  document.getElementById('r4ReferenceDetailTitle').textContent = asset.title || '参考素材';
  document.getElementById('r4ReferenceDetailEyebrow').textContent = isConcept ? 'AI 概念图' : assetKindLabel(asset);

  const image = document.getElementById('r4ReferenceDetailImage');
  image.src = displayUrl(asset.previewUrl);
  image.alt = asset.title || '参考素材';
  updateEasyReferenceImageFit();

  const tags = (asset.tags || []).filter(tag => !['实拍参考', '我的图片', '个人图库'].includes(tag)).join(' · ') || '未标注';
  const analysisHtml = `
    <div class="r4-reference-detail__section">
      <h3>素材与来源</h3>
      <div class="r4-reference-detail__kind-pill ${isConcept ? 'is-concept' : ''}">${isConcept ? 'AI 概念图' : '真实参考图'}</div>
      ${renderR4DetailFact('来源', source ? `<a href="${escapeHtml(source.href)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>` : (asset.localPath ? '本地文件' : '未记录'), true)}
      ${renderR4DetailFact('作者', asset.photographer || '未知')}
      ${renderR4DetailFact('授权', asset.licenseStatus || '未知')}
      ${renderR4DetailFact('标签', tags)}
    </div>
    <div class="r4-reference-detail__section" id="r4ReferenceDetailInfo">
      <h3>分析与拍摄</h3>
      ${renderR4DetailFact('构图', asset.composition || asset.sourceMetadata?.composition || '未记录')}
      ${renderR4DetailFact('镜头 / 焦段', asset.lens || asset.sourceMetadata?.lens || asset.focalLength || '未记录')}
      ${renderR4DetailFact('光线', asset.lighting || asset.sourceMetadata?.lighting || '未记录')}
      ${renderR4DetailFact('色彩 / LUT', asset.colorDirection || asset.sourceMetadata?.colorDirection || '未记录')}
      ${renderR4DetailFact('验证状态', asset.verificationStatus || '待核验')}
    </div>
  `;
  document.getElementById('r4ReferenceDetailAnalysis').innerHTML = analysisHtml;

  const projectLinks = getProjectLinksForAsset(asset.id);
  const shotLinks = getShotLinksForAsset(asset.id);
  const projectList = projectLinks.length
    ? projectLinks.map(({ project }) => `<div class="r4-reference-detail__linked-plan"><span>${escapeHtml(project?.title || project?.name || '未命名方案')}</span></div>`).join('')
    : '<div class="r4-reference-detail__empty">尚未加入任何方案</div>';
  const shotList = shotLinks.length
    ? shotLinks.map(({ shot, project }) => `<div class="r4-reference-detail__linked-shot"><span>${escapeHtml(project?.title || project?.name || '方案')} · ${escapeHtml(shot?.scene || `镜头 ${shot?.sequence}`)}</span></div>`).join('')
    : '<div class="r4-reference-detail__empty">未绑定到镜头</div>';

  const primaryAction = selected
    ? `<button class="r4-reference-detail__primary-action is-remove" type="button" onclick="removeEasyReference('${escapeHtml(link.id)}')">移出当前方案</button>`
    : `<button class="r4-reference-detail__primary-action" type="button" onclick="addEasyReference('${escapeHtml(asset.id)}')">加入当前方案</button>`;

  document.getElementById('r4ReferenceDetailLinks').innerHTML = `
    <div class="r4-reference-detail__section">
      <h3>关联方案</h3>
      ${projectList}
    </div>
    <div class="r4-reference-detail__section">
      <h3>关联镜头</h3>
      ${shotList}
      ${state.view === 'selected' && model.plan ? renderShotBindings(asset, model) : ''}
    </div>
    <div class="r4-reference-detail__section">
      ${primaryAction}
    </div>
  `;
  root.PhotoAtelierR4IconSystem?.refreshIcons(modal);
}

root.openEasyReferenceDetail = function (assetId) {
  state.detail.assetId = assetId;
  renderR4Detail(assetId);
  const modal = ensureDetailModal();
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
};

root.closeEasyReferenceDetail = function () {
  const modal = document.getElementById('r4ReferenceDetailModal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
};

root.setEasyReferenceImageFit = function (fit) {
  state.detail.fit = fit === 'cover' ? 'cover' : 'contain';
  updateEasyReferenceImageFit();
};

function updateEasyReferenceImageFit() {
  const frame = document.getElementById('r4ReferenceDetailImageFrame');
  const containBtn = document.getElementById('r4ReferenceFitContain');
  const coverBtn = document.getElementById('r4ReferenceFitCover');
  if (!frame) return;
  frame.classList.toggle('is-cover', state.detail.fit === 'cover');
  if (containBtn) containBtn.setAttribute('aria-pressed', String(state.detail.fit === 'contain'));
  if (coverBtn) coverBtn.setAttribute('aria-pressed', String(state.detail.fit === 'cover'));
}

root.focusEasyReferenceInfo = function () {
  document.getElementById('r4ReferenceDetailInfo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* Initialization */

injectR4Stylesheet();

document.getElementById('easyReferenceSearch')?.addEventListener('keydown', event => {
  if (event.key === 'Enter') root.searchEasyReferences();
});

root.loadEasyReferenceGallery();

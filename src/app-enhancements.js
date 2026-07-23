(function (root) {
  'use strict';

  const Domain = root.PhotoWorkflowDomain;
  const Store = root.PhotoWorkflowStore;
  if (!Domain || !Store) return;

  const KEYS = {
    schedules: 'pw_schedule', reviews: 'pa_reviews', shootRecords: 'pa_shoot_records',
    decisions: 'pa_relation_decisions', versions: 'pa_plan_versions', messages: 'pw_messages',
    lutMeta: 'pa_lut_profiles', equipment: 'pw_eq', venues: 'pw_venues', models: 'pw_models',
    assetDecisions: 'pa_asset_decisions', preferences: 'pa_workflow_preferences'
  };
  const DEFAULT_LUT_ID = 't3-portra-400';
  const DEFAULT_PREFERENCES = {
    inputTransform: 'srgb-display', software: 'davinci-resolve', lutStrength: 65,
    autoReferences: true, autoSchedule: false, planLibraryLimit: 50
  };
  const LUT_FRIENDLY_NAMES = {
    't3-portra-160': ['柔和人像 160', '低反差、暖肤色，自然光人像'],
    't3-portra-400': ['日常客片 400', '暖肤色、生活方式与复古客片'],
    't3-pro-400h': ['清新粉彩 400H', '偏冷绿、婚纱与日系清新人像'],
    't3-superia-400': ['城市街拍 400', '中等对比、城市与街头胶片感'],
    't3-astia-100f': ['柔和反转片 100F', '柔和但颜色清晰，适合时尚人像'],
    't3-velvia-50': ['风光鲜艳 50', '高饱和蓝天与植被，不建议直接套近景肤色'],
    't3-hp5-400': ['纪实黑白 400', '中等反差黑白，适合情绪与纪实'],
    't3-trix-400': ['硬朗黑白 400', '更强黑白对比，适合街拍与舞台'],
    'vlog-astia': ['V-Log 柔和人像', '只用于 Panasonic V-Log / V-Gamut'],
    'vlog-classic-neg': ['V-Log 复古街拍', '只用于 Panasonic V-Log / V-Gamut'],
    'vlog-eterna': ['V-Log 电影基底', '只用于 Panasonic V-Log / V-Gamut'],
    'vlog-acros': ['V-Log 黑白纪实', '只用于 Panasonic V-Log / V-Gamut']
  };
  const proxyBase = () => ((root.getObsidianSettings && root.getObsidianSettings().helperBaseUrl) || 'http://127.0.0.1:8124').replace(/\/$/, '');
  let activeLut = null;
  let originalImage = null;
  let referenceImage = null;
  let originalImageIsDemo = false;
  let lutDemoPromise = null;
  const lutProfileCache = new Map();
  let liveLocalResults = new Map();
  let openLutCatalog = [];
  let openLutSources = [];
  let lutSoftwareProfiles = [];
  let lutInputTransforms = [];
  let referenceImageCatalog = [];
  let activePlanLibraryView = 'candidate';
  let calendarViewDate = new Date();
  let selectedCalendarDate = '';
  const PLAN_LIFECYCLE = {
    candidate: { label: '预选方案', hint: '待确认是否采用' },
    confirmed: { label: '方案库', hint: '已确认，等待排期' },
    scheduled: { label: '已排期', hint: '已进入拍摄日程' }
  };

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); return value; }
  function workflowPreferences() { return { ...DEFAULT_PREFERENCES, ...read(KEYS.preferences, {}) }; }
  function localDateString(date) {
    const value = date instanceof Date ? date : new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  function planLifecycleStatus(plan) {
    if (PLAN_LIFECYCLE[plan?.lifecycleStatus]) return plan.lifecycleStatus;
    const scheduled = read(KEYS.schedules, []).some(item => String(item.planId) === String(plan?.id));
    return scheduled ? 'scheduled' : 'confirmed';
  }
  function loadImageAsset(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`示例图片读取失败：${src}`));
      image.src = src;
    });
  }
  async function ensureDemoImages() {
    if (originalImage && referenceImage) return { originalImage, referenceImage };
    if (!lutDemoPromise) {
      lutDemoPromise = Promise.all([
        loadImageAsset('assets/demo/references/pose-01.jpg'),
        loadImageAsset('assets/demo/references/pose-04.jpg')
      ]).then(([source, reference]) => {
        if (!originalImage) { originalImage = source; originalImageIsDemo = true; }
        referenceImage = referenceImage || reference;
        return { originalImage, referenceImage };
      }).catch(error => {
        lutDemoPromise = null;
        throw error;
      });
    }
    return lutDemoPromise;
  }
  async function loadCatalogLutProfile(id) {
    if (!id) return null;
    const validProfile = profile => Number.isInteger(Number(profile?.size)) && Array.isArray(profile?.data) && profile.data.length === Number(profile.size) ** 3;
    if (lutProfileCache.has(id) && validProfile(lutProfileCache.get(id))) return lutProfileCache.get(id);
    let profile = await Store.get('lutProfiles', id);
    if (!validProfile(profile)) {
      const item = openLutCatalog.find(candidate => candidate.id === id);
      if (!item) return null;
      const response = await fetch(item.fileUrl, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`LUT 读取失败 HTTP ${response.status}`);
      const parsed = Domain.parseCubeLut(await response.text());
      profile = { ...parsed, ...item, parsedId: parsed.id, id: item.id, filename: item.filename, licenseClass: item.sourceLicense };
    }
    lutProfileCache.set(id, profile);
    return profile;
  }
  function esc(value) {
    return root.escHtml ? root.escHtml(String(value == null ? '' : value)) : String(value == null ? '' : value).replace(/[&<>"']/g, '');
  }
  function safeMediaUrl(value, fallback = '') {
    const url = String(value || '').trim();
    return /^(?:https?:\/\/|assets\/)/i.test(url) ? url : fallback;
  }
  function notify(message, type) {
    if (typeof root.toast === 'function') { root.toast(message, type); return; }
    const element = document.getElementById('toast');
    if (!element) return;
    element.textContent = message;
    element.className = `toast show ${type || ''}`;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { element.className = 'toast'; }, 2600);
  }
  function currentPlan(planId) {
    return (root.getPlans ? root.getPlans() : read('pw_plans', [])).find(plan => String(plan.id) === String(planId));
  }
  function updatePlan(plan) {
    plan.createdAt = plan.createdAt || Domain.nowIso();
    plan.updatedAt = Domain.nowIso();
    const plans = (root.getPlans ? root.getPlans() : read('pw_plans', [])).map(item => String(item.id) === String(plan.id) ? plan : item);
    write('pw_plans', plans);
    Store.put('plans', canonicalPlan(plan)).catch(() => {});
    recordVersion(plan, 'update');
    root.PhotoAtelierFeishu?.schedule();
    root.renderPlanLibrary?.();
    return plan;
  }
  function cascadeDeletePlan(planId) {
    const schedules = read(KEYS.schedules, []);
    const reviews = read(KEYS.reviews, []);
    const shootRecords = read(KEYS.shootRecords, []);
    write(KEYS.schedules, schedules.filter(item => String(item.planId) !== String(planId)));
    write(KEYS.reviews, reviews.filter(item => String(item.planId) !== String(planId)));
    write(KEYS.shootRecords, shootRecords.filter(item => String(item.planId) !== String(planId)));
    const decisions = read(KEYS.decisions, {}); delete decisions[planId]; write(KEYS.decisions, decisions);
    const versions = read(KEYS.versions, {}); delete versions[planId]; write(KEYS.versions, versions);
    Promise.all([
      Store.remove('plans', planId),
      ...schedules.filter(item => String(item.planId) === String(planId)).map(item => Store.remove('schedules', item.id)),
      ...shootRecords.filter(item => String(item.planId) === String(planId)).map(item => Store.remove('shootRecords', item.id)),
      Store.remove('reviews', `review-${planId}`)
    ]).catch(() => {});
  }
  function canonicalPlan(plan) {
    const normalizedBrief = Domain.normalizeBrief(plan.input || {});
    const relationGraph = buildCanonicalRelations(plan);
    return { ...plan, entityType: 'plans', normalizedBrief, relationGraph, updatedAt: Domain.nowIso() };
  }
  function buildCanonicalRelations(plan) {
    const relation = plan.relations || {};
    const decisions = read(KEYS.decisions, {})[plan.id] || {};
    const refs = Array.isArray(relation.references) ? relation.references : [];
    const slotItems = (Array.isArray(relation.slots) ? relation.slots : []).flatMap(slot => (slot.topItems || []).map(item => ({ ...item, role: slot.id })));
    const shotAssignments = Object.entries(plan.shotReferenceAssignments || {}).map(([shotId, referenceId]) => {
      const reference = [...refs, ...referenceImageCatalog].find(item => String(item.id || item.referenceId) === String(referenceId)) || {};
      return { ...reference, id: referenceId, role: 'materialReference', targetId: `${plan.id}:${shotId}`, reason: `已分配给镜头 ${shotId}`, validationStatus: reference.validationStatus || reference.status || 'pending' };
    });
    const candidates = [...slotItems, ...refs
      .filter(item => !/(索引|总览|收藏夹说明|README)/i.test(`${item.title || ''} ${item.sourceFile || ''}`))
      .map(item => ({ ...item, role: item.slotId || 'materialReference' })), ...shotAssignments];
    const deduped = Array.from(candidates.reduce((map, item) => {
      const id = item.id || item.referenceId || `ref-${map.size}`;
      const key = `${id}:${item.role}:${item.targetId || plan.id}`;
      if (!map.has(key) || Number(item.score || 0) > Number(map.get(key).score || 0)) map.set(key, { ...item, id });
      return map;
    }, new Map()).values());
    return deduped.map((item, index) => {
      const id = item.id || item.referenceId || `ref-${index}`;
      const decision = decisions[id] || {};
      return Domain.createRelation({
        sourceId: id,
        targetId: item.targetId || plan.id,
        role: item.role || 'materialReference',
        score: item.score == null ? Math.max(45, 92 - index * 5) : item.score,
        reason: item.reason || item.matchReason || '与方案主题、场景或执行槽位匹配',
        provenance: {
          source: item.platform || item.sourceFile || 'reference-database',
          sourceUrl: item.sourceUrl || '',
          licenseClass: item.licenseClass || (item.sourceUrl ? 'needs-review' : 'local-private-reference'),
          title: item.title || id
        },
        validationStatus: item.validationStatus || item.status || 'pending',
        locked: Boolean(decision.locked),
        rejected: Boolean(decision.rejected)
      });
    });
  }
  function recordVersion(plan, reason) {
    const versions = read(KEYS.versions, {});
    const list = versions[plan.id] || [];
    const signature = Domain.stableHash({ input: plan.input, relations: plan.relations, status: plan.workflowStatus, lifecycleStatus: planLifecycleStatus(plan), lutProfileId: plan.lutProfileId });
    if (!list.some(item => item.signature === signature)) {
      list.unshift({ id: `ver-${Date.now()}`, signature, reason, createdAt: Domain.nowIso(), snapshot: { input: plan.input, workflowStatus: plan.workflowStatus, lifecycleStatus: planLifecycleStatus(plan), lutProfileId: plan.lutProfileId } });
      versions[plan.id] = list.slice(0, 20);
      write(KEYS.versions, versions);
    }
  }

  function workflowReferences(plan) {
    const related = Array.isArray(plan.relations?.references) ? plan.relations.references : [];
    const planText = `${plan.input?.theme || ''} ${plan.input?.style || ''} ${plan.input?.scene || ''} ${plan.input?.mood || ''}`.toLowerCase();
    const localImages = referenceImageCatalog.map((item, index) => {
      const text = `${item.title || ''} ${(item.tags || []).join(' ')} ${item.applicableScene || ''} ${(item.coreFocus || []).join(' ')}`.toLowerCase();
      const hits = planText.split(/[\s,，、/]+/).filter(token => token.length > 1 && text.includes(token)).length;
      return { item, score: Number(item.sourceAuditScore || 60) + hits * 15 - index * .01 };
    }).sort((a, b) => b.score - a.score).map(entry => entry.item);
    const items = [...localImages, ...related];
    return Array.from(items.reduce((map, item, index) => {
      const id = String(item.id || item.referenceId || `reference-${index}`);
      if (!/(索引|总览|收藏夹说明|README)/i.test(`${item.title || ''} ${item.sourceFile || ''}`) && !map.has(id)) map.set(id, { ...item, id });
      return map;
    }, new Map()).values());
  }

  function referenceThumbnail(item) {
    if (!item) return '';
    const sourceName = `${item.sourceFile || ''} ${(item.materialUrls || []).join(' ')}`;
    const demoMatch = sourceName.match(/pexels[_-](\d{2})_/i);
    if (demoMatch) return `assets/demo/references/pose-${demoMatch[1]}.jpg`;
    const localImage = item.kind === 'local_image' || /\.(png|jpe?g|webp)$/i.test(item.sourceFile || '');
    const proxyAssetId = item.proxyAssetId || (/^asset-[0-9a-f]{16}$/i.test(item.id || '') ? item.id : '');
    if (localImage && proxyAssetId) {
      const folder = root.getObsidianSettings?.().libraryFolder || '摄影姿势库';
      return `${proxyBase()}/v1/assets/${encodeURIComponent(proxyAssetId)}/thumbnail?libraryFolder=${encodeURIComponent(folder)}`;
    }
    const direct = (item.materialUrls || []).find(url => /^https?:.*\.(png|jpe?g|webp)(?:\?|$)/i.test(url));
    return direct || '';
  }

  function referenceMatchScore(reference, shot, index) {
    const shotText = `${shot.scene || ''} ${shot.description || ''} ${shot.shotSize || ''} ${shot.angle || ''} ${shot.mood || ''} ${shot.composition || ''} ${shot.props || ''}`.toLowerCase();
    const referenceText = `${reference.title || ''} ${(reference.tags || []).join(' ')} ${reference.summary || ''} ${reference.applicableScene || ''} ${(reference.coreFocus || []).join(' ')} ${reference.shotSizeNormalized || ''}`.toLowerCase();
    const tokens = shotText.split(/[\s,，、/]+/).filter(token => token.length > 1);
    let score = Math.min(40, Number(reference.sourceAuditScore || 60) / 2);
    score += tokens.filter(token => referenceText.includes(token)).length * 12;
    if (reference.kind === 'local_image') score += 30;
    if (/坐|沙发|椅|台阶/.test(shotText) && /坐|沙发|椅|台阶/.test(referenceText)) score += 20;
    if (/站|走|全身/.test(shotText) && /站|走|全身/.test(referenceText)) score += 15;
    if (/特写|手部|眼神|半身/.test(shotText) && /特写|手|眼|半身/.test(referenceText)) score += 15;
    return score - index * .01;
  }

  function suggestedReference(plan, shot, shotIndex, references, excludedIds = new Set()) {
    const assignedId = plan.shotReferenceAssignments?.[`shot-${shotIndex}`];
    if (assignedId) return references.find(item => item.id === assignedId) || null;
    const unused = references.filter(item => !excludedIds.has(item.id));
    const candidates = unused.length ? unused : references;
    const ranked = candidates.map((item, index) => ({ item, score: referenceMatchScore(item, shot, index) })).sort((a, b) => b.score - a.score);
    return ranked[0]?.item || null;
  }

  function renderProductionMap(plan, shots, relationGraph) {
    const references = workflowReferences(plan);
    const selected = plan.resourceSelections || {};
    const schedule = read(KEYS.schedules, []).find(item => String(item.planId) === String(plan.id));
    const records = read(KEYS.shootRecords, []).filter(item => String(item.planId) === String(plan.id));
    const completed = records.filter(item => item.completed).length;
    const review = read(KEYS.reviews, []).find(item => String(item.planId) === String(plan.id));
    const assigned = Object.keys(plan.shotReferenceAssignments || {}).length;
    const resourceCount = (selected.equipmentIds || []).length + (selected.venueId ? 1 : 0) + (selected.modelId ? 1 : 0);
    const lifecycle = planLifecycleStatus(plan);
    const nodes = [
      ['需求简报', plan.input?.theme || '待补主题', Boolean(plan.input?.theme)],
      ['预选提案', lifecycle === 'candidate' ? '等待采用' : '已通过', Boolean(plan.id)],
      ['正式方案', lifecycle === 'candidate' ? '尚未入库' : '已确认', lifecycle !== 'candidate'],
      ['拍前准备', `${references.length} 条参考 · ${resourceCount} 项资源`, references.length > 0 && resourceCount > 0],
      ['排期通告', schedule ? `${schedule.date} ${schedule.time || ''}` : '日期待确认', Boolean(schedule)],
      ['现场执行', `${completed}/${shots.length} 镜头完成`, completed > 0],
      ['备份选片', review ? `出片率 ${review.keepRate || 0}%` : '待备份与选片', Boolean(review)],
      ['后期交付', plan.lutProfileId ? '通用预览已选' : '待专项确认', Boolean(plan.lutProfileId)]
    ];
    const issues = Domain.evaluateWorkflow({ plan, relations: relationGraph, shots }).issues;
    const lifecycleAction = lifecycle === 'candidate'
      ? `<button class="btn btn-p btn-sm" onclick="confirmCandidatePlan('${esc(plan.id)}')">确认采用</button>`
      : lifecycle === 'confirmed'
        ? `<button class="btn btn-p btn-sm" onclick="openPlanScheduleDialog('${esc(plan.id)}')">安排拍摄</button>`
        : `<button class="btn btn-p btn-sm" onclick="openPlanSchedule('${esc(plan.id)}')">查看日程</button>`;
    return `<div class="production-map"><div class="production-map__head"><div><strong>摄影师执行流程</strong><p>提案先确认，再完成拍前准备、排期、现场拍摄、备份选片和交付。</p></div><div class="production-map__actions"><button class="btn btn-s btn-sm" onclick="autoMatchShotReferences('${esc(plan.id)}')">匹配镜头参考</button>${lifecycleAction}</div></div><div class="production-map__flow">${nodes.map((node, index) => `${index ? '<i>→</i>' : ''}<div class="production-map__node ${node[2] ? 'is-ready' : ''}"><span>${index + 1}</span><strong>${esc(node[0])}</strong><small>${esc(node[1])}</small></div>`).join('')}</div>${issues.length ? `<div class="production-map__issues">待补：${issues.slice(0, 4).map(item => esc(item.message)).join(' · ')}</div>` : '<div class="production-map__issues is-ready">方案结构已达到执行条件，仍需在现场确认安全与授权。</div>'}</div>`;
  }

  function planPackageData(plan, shots) {
    const references = workflowReferences(plan);
    const used = new Set();
    const shotReferences = shots.map((shot, index) => {
      const reference = suggestedReference(plan, shot, index, references, used);
      if (reference) used.add(reference.id);
      return { shotId: `shot-${index}`, shot, reference };
    });
    const equipment = read(KEYS.equipment, []);
    const selectedIds = plan.resourceSelections?.equipmentIds || [];
    const selectedEquipment = selectedIds.map(id => equipment.find(item => String(item.id) === String(id))).filter(Boolean);
    const recommendedEquipment = equipmentRequirements(plan, shots).map(item => `${item.label}：${item.reason}`);
    const schedule = read(KEYS.schedules, []).find(item => String(item.planId) === String(plan.id));
    const lut = [...read(KEYS.lutMeta, []), ...openLutCatalog].find(item => item.id === plan.lutProfileId) || null;
    const transformId = detectPlanInputTransform(plan);
    const transform = lutInputTransforms.find(item => item.id === transformId);
    return { shotReferences, selectedEquipment, recommendedEquipment, schedule, lut, transform };
  }

  function renderPlanPackageSummary(plan, shots) {
    const data = planPackageData(plan, shots);
    const lifecycle = planLifecycleStatus(plan);
    const lifecycleMeta = PLAN_LIFECYCLE[lifecycle];
    const matchedReferences = data.shotReferences.filter(item => item.reference);
    const thumbnails = matchedReferences.slice(0, 6);
    const selectedNames = data.selectedEquipment.map(item => item.n).filter(Boolean);
    const equipmentText = selectedNames.length ? selectedNames.join('、') : data.recommendedEquipment.slice(0, 3).join('；');
    const lutName = data.lut ? (LUT_FRIENDLY_NAMES[data.lut.id]?.[0] || data.lut.title) : '等待专项 Agent / 人工确认';
    const postStatus = data.lut ? '已选通用预览，最终效果未批准' : '通用方案未自动定调';
    const scheduleText = data.schedule
      ? `${data.schedule.date || '日期待定'} ${data.schedule.time || ''} · ${data.schedule.location || '地点待定'}`
      : '确认采用后可安排日期、时间和地点';
    const lifecycleAction = lifecycle === 'candidate'
      ? `<button class="btn btn-p btn-sm" onclick="confirmCandidatePlan('${esc(plan.id)}')">确认采用</button>`
      : lifecycle === 'confirmed'
        ? `<button class="btn btn-p btn-sm" onclick="openPlanScheduleDialog('${esc(plan.id)}')">安排拍摄</button>`
        : `<button class="btn btn-p btn-sm" onclick="openPlanSchedule('${esc(plan.id)}')">查看日程</button>`;
    return `<section class="plan-package-summary" id="plan-package-${esc(plan.id)}">
      <div class="plan-package-summary__head"><div><span class="plan-package-state plan-package-state--${lifecycle}">${esc(lifecycleMeta.label)}</span><span>方案 ID ${esc(plan.id)}</span><h4>方案下一步</h4><p>${esc(lifecycleMeta.hint)}。当前状态下可执行的动作如下，所有操作沿用同一个方案 ID。</p></div><div class="plan-package-summary__actions">${lifecycleAction}<button class="btn btn-s btn-sm" onclick="loadPlan('${esc(plan.id)}')">${lifecycle === 'candidate' ? '继续编辑' : '打开分镜'}</button><button class="btn btn-s btn-sm" onclick="completePlanPackage('${esc(plan.id)}')">补齐拍前资料</button>${lifecycle !== 'candidate' ? `<button class="btn btn-s btn-sm" onclick="openPlanReview('${esc(plan.id)}')">查看复盘</button>` : ''}<select class="plan-export-select" aria-label="导出方案" onchange="if(this.value){exportPlanDocument('${esc(plan.id)}',this.value);this.value='';}"><option value="">导出…</option><option value="pdf">PDF / 打印</option><option value="csv">拍摄表格 CSV</option><option value="txt">文字版 TXT</option><option value="json">完整数据包 JSON</option></select><button class="btn btn-s btn-sm" onclick="openPlanLibrary()">返回方案库</button></div></div>
      <div class="plan-package-grid">
        <article class="plan-package-card plan-package-card--references"><div class="plan-package-card__label">镜头参考</div><strong>${matchedReferences.length}/${shots.length} 个镜头已有可用参考</strong><div class="plan-package-thumbnails">${thumbnails.map((item, index) => `<figure><img src="${esc(referenceThumbnail(item.reference))}" alt="${esc(item.reference.title || `镜头 ${index + 1} 参考`)}"><figcaption>${index + 1}</figcaption></figure>`).join('')}</div></article>
        <article class="plan-package-card"><div class="plan-package-card__label">镜头执行</div><strong>${shots.length} 个镜头 · ${shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0)} 分钟</strong><p>${shots.slice(0, 3).map(shot => shot.name || shot.scene || shot.description).filter(Boolean).join(' / ')}</p></article>
        <article class="plan-package-card plan-package-card--lut"><div class="plan-package-card__label">后期交接</div>${data.lut ? `<div class="plan-package-lut-preview"><canvas id="plan-package-lut-${esc(plan.id)}" width="240" height="135"></canvas></div>` : '<div class="plan-package-post-placeholder"><span>POST</span><small>等待专项确认</small></div>'}<strong>${esc(lutName)}</strong><p>${esc(data.transform?.label || 'sRGB / Rec.709')} · ${esc(postStatus)}</p></article>
        <article class="plan-package-card plan-package-card--equipment"><img src="assets/demo/equipment-kit.jpg" alt="摄影器材参考"><div><div class="plan-package-card__label">设备包</div><strong>${selectedNames.length ? `${selectedNames.length} 件已确认` : '推荐清单待确认'}</strong><p>${esc(equipmentText || '请在设备库录入你的实际器材')}</p></div></article>
        <article class="plan-package-card"><div class="plan-package-card__label">拍摄日程</div><strong>${data.schedule ? '已关联日程' : '待创建'}</strong><p>${esc(scheduleText)}</p></article>
      </div>
    </section>`;
  }

  function renderShotReferenceBoard(plan, shots) {
    const references = workflowReferences(plan);
    if (!references.length) return '<p class="workflow-resource-empty">当前方案还没有参考素材。先到参考图库关联素材，再回来分配到镜头。</p>';
    const options = references.map(item => `<option value="${esc(item.id)}">${esc(item.title || item.id)} · ${esc(item.platform || item.kind || '本地')}</option>`).join('');
    const usedSuggestions = new Set();
    return `<p class="workflow-resource-note">当前可选参考 ${references.length} 条；每个镜头单独绑定，不再只显示前 8 个。</p><div class="shot-reference-board">${shots.map((shot, index) => {
      const selected = suggestedReference(plan, shot, index, references, usedSuggestions);
      if (selected) usedSuggestions.add(selected.id);
      const thumbnail = referenceThumbnail(selected);
      return `<article class="shot-reference-card"><div class="shot-reference-card__media">${thumbnail ? `<img src="${esc(thumbnail)}" alt="${esc(selected?.title || '镜头参考')}" loading="eager">` : `<div><span>${String(index + 1).padStart(2, '0')}</span><small>REFERENCE</small></div>`}</div><div class="shot-reference-card__body"><div><span class="eq-tag">镜头 ${index + 1}</span><strong>${esc(shot.name || shot.scene || shot.description || `镜头 ${index + 1}`)}</strong></div><p>${esc(shot.shotSize || '')} · ${esc(shot.angle || shot.method || '')} · ${esc(shot.lighting || '')}</p><label>绑定参考<select onchange="setShotReferenceAssignment('${esc(plan.id)}','shot-${index}',this.value)"><option value="">未指定</option>${options.replace(`value="${esc(selected?.id || '')}"`, `value="${esc(selected?.id || '')}" selected`)}</select></label><small>${selected ? `${esc(selected.title)} · ${esc(selected.licenseClass || '授权待确认')}${plan.shotReferenceAssignments?.[`shot-${index}`] ? ' · 已确认' : ' · 智能建议'}` : '未匹配参考'}</small></div></article>`;
    }).join('')}</div>`;
  }

  root.setShotReferenceAssignment = function (planId, shotId, referenceId) {
    const plan = currentPlan(planId);
    if (!plan) return;
    const assignments = { ...(plan.shotReferenceAssignments || {}) };
    if (referenceId) assignments[shotId] = referenceId; else delete assignments[shotId];
    plan.shotReferenceAssignments = assignments;
    updatePlan(plan); refreshCurrentPlan(plan);
  };

  root.autoMatchShotReferences = function (planId) {
    const plan = currentPlan(planId);
    if (!plan) return;
    const references = workflowReferences(plan);
    const shots = typeof root.generateShotList === 'function' ? root.generateShotList(plan) : [];
    if (!references.length || !shots.length) { notify('需要先有参考素材和镜头表', 'er'); return; }
    const used = new Set();
    plan.shotReferenceAssignments = Object.fromEntries(shots.map((shot, index) => {
      const unused = references.filter(item => !used.has(item.id));
      const candidates = unused.length ? unused : references;
      const ranked = candidates.map((item, itemIndex) => ({ item, score: referenceMatchScore(item, shot, itemIndex) })).sort((a, b) => b.score - a.score);
      const winner = ranked[0].item;
      used.add(winner.id);
      return [`shot-${index}`, winner.id];
    }));
    updatePlan(plan); refreshCurrentPlan(plan);
    notify(`已为 ${shots.length} 个镜头匹配参考`, 'ok');
  };

  function ensurePlanSchedule(plan, details = {}) {
    const schedules = read(KEYS.schedules, []);
    const index = schedules.findIndex(item => String(item.planId) === String(plan.id));
    const existing = index >= 0 ? schedules[index] : null;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const schedule = {
      ...(existing || {}),
      id: existing?.id || `schedule-${plan.id}`,
      planId: plan.id,
      title: details.title || existing?.title || plan.title || plan.input?.theme || '拍摄方案',
      date: details.date || existing?.date || localDateString(tomorrow),
      time: details.time || existing?.time || '14:00',
      location: details.location ?? existing?.location ?? plan.input?.scene ?? '',
      status: existing?.status || 'scheduled',
      preparation: existing?.preparation || {},
      notes: details.notes ?? existing?.notes ?? '方案确认后建立的正式拍摄日程。',
      createdAt: existing?.createdAt || Domain.nowIso(),
      updatedAt: Domain.nowIso()
    };
    if (index >= 0) schedules[index] = schedule; else schedules.unshift(schedule);
    write(KEYS.schedules, schedules);
    Store.put('schedules', schedule).catch(() => {});
    return schedule;
  }

  root.completePlanPackage = async function (planId) {
    const plan = currentPlan(planId);
    if (!plan) return;
    const shots = typeof root.generateShotList === 'function' ? root.generateShotList(plan) : [];
    const references = workflowReferences(plan);
    const used = new Set();
    plan.shotReferenceAssignments = Object.fromEntries(shots.map((shot, index) => {
      const candidates = references.filter(item => !used.has(item.id));
      const pool = candidates.length ? candidates : references;
      const winner = pool.map((item, itemIndex) => ({ item, score: referenceMatchScore(item, shot, itemIndex) })).sort((a, b) => b.score - a.score)[0]?.item;
      if (winner) used.add(winner.id);
      return [`shot-${index}`, winner?.id || ''];
    }).filter(([, id]) => id));
    const equipmentIds = matchEquipment(plan, shots).map(group => group.matches[0]?.id).filter(Boolean);
    plan.resourceSelections = { equipmentIds, venueId: '', modelId: '', ...(plan.resourceSelections || {}), equipmentIds };
    plan.recommendedEquipment = equipmentRequirements(plan, shots);
    plan.postProductionStatus = plan.lutProfileId ? 'manual-preview' : 'specialist-required';
    plan.packageStatus = 'preflight-ready';
    plan.shootPackageCompletedAt = Domain.nowIso();
    updatePlan(plan);
    refreshCurrentPlan(plan);
    root.renderPlanLibrary?.();
    notify(`拍前资料已补齐：${shots.length} 个镜头、${Object.keys(plan.shotReferenceAssignments).length} 张参考和设备建议；日程仍需单独确认`, 'ok');
  };

  root.exportPlanPackage = function (planId) {
    const plan = currentPlan(planId);
    if (!plan) return;
    const shots = typeof root.generateShotList === 'function' ? root.generateShotList(plan) : [];
    const data = planPackageData(plan, shots);
    const review = read(KEYS.reviews, []).find(item => String(item.planId) === String(plan.id)) || null;
    const payload = {
      version: 1, exportedAt: Domain.nowIso(), plan: canonicalPlan(plan), shots,
      shotReferences: data.shotReferences.map(item => ({ shotId: item.shotId, reference: item.reference || null })),
      equipment: data.selectedEquipment, recommendedEquipment: data.recommendedEquipment,
      lut: data.lut, inputTransform: data.transform, schedule: data.schedule || null, review
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }), `${Domain.slug(plan.title || 'photoatelier-plan')}-shoot-package.json`);
    notify('完整方案包已导出', 'ok');
  };

  function buildPlanText(plan, shots, data) {
    const schedule = data.schedule;
    const references = data.shotReferences.filter(item => item.reference);
    const lines = [
      `# ${plan.title || plan.input?.theme || '拍摄方案'}`,
      '',
      `方案状态：${PLAN_LIFECYCLE[planLifecycleStatus(plan)].label}`,
      `方案 ID：${plan.id}`,
      `风格：${plan.input?.style || '待确认'}`,
      `场景：${plan.input?.scene || '待确认'}`,
      `时长：${plan.input?.duration || '待确认'}`,
      `人数：${plan.input?.people || 1}`,
      schedule ? `日程：${schedule.date || ''} ${schedule.time || ''} ${schedule.location || ''}` : '日程：尚未安排',
      '',
      '## 镜头表',
      ...shots.map((shot, index) => `${index + 1}. ${shot.name || shot.scene || shot.description || `镜头 ${index + 1}`}｜${shot.shotSize || ''}｜${shot.focalLength || ''}｜${shot.lighting || ''}｜${shot.duration || 0} 分钟\n   动作：${shot.description || shot.method || '现场确认'}\n   备选：${shot.alternative || '按现场条件调整'}`),
      '',
      '## 参考素材',
      ...(references.length ? references.map((item, index) => `${index + 1}. 镜头 ${Number(item.shotId.replace('shot-', '')) + 1}：${item.reference.title || item.reference.id}｜${item.reference.sourceUrl || item.reference.sourceFile || ''}`) : ['暂无已绑定参考素材']),
      '',
      '## 设备与后期',
      `设备：${data.selectedEquipment.map(item => item.n || item.name).filter(Boolean).join('、') || data.recommendedEquipment.join('；') || '待确认'}`,
      `LUT：${data.lut?.title || '等待专项 Agent / 人工确认'}`,
      `输入色彩：${data.transform?.label || 'sRGB / Rec.709'}`,
      '',
      '## 拍摄后流程',
      '- 现场结束后立即双备份原始文件',
      '- 完成初选、精修确认、交付和复盘回流'
    ];
    return lines.join('\n');
  }

  function exportPlanPrintView(plan, shots, data) {
    const popup = window.open('', '_blank');
    if (!popup) { notify('浏览器拦截了打印窗口，请允许弹出窗口后重试', 'er'); return; }
    const references = data.shotReferences.filter(item => item.reference);
    const schedule = data.schedule;
    const referenceThumbnail = item => {
      const ref = item.reference;
      return ref.previewUrl || ref.sourceUrl || ref.localPath || '';
    };
    const esc = root.esc || (s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));

    popup.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(plan.title || '拍摄执行稿')}</title><style>
      @page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;color:#171717;font:11px/1.5 Arial,"Microsoft YaHei",sans-serif}
      h1{margin:0 0 6px;font-size:22px;letter-spacing:-.02em}
      .subtitle{color:#666;font-size:12px;margin:0 0 16px}
      .overview{width:100%;border-collapse:collapse;margin:0 0 20px}
      .overview th,.overview td{padding:5px 8px;border:1px solid #ccc;vertical-align:middle;text-align:left;font-size:11px}
      .overview th{background:#f5f5f5;font-weight:600;white-space:nowrap}
      .overview .ref-thumb{width:40px;height:30px;object-fit:cover;border-radius:2px}
      .shot-section{page-break-inside:avoid;margin:0 0 24px;padding:12px;border:1px solid #ddd;border-radius:4px}
      .shot-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:6px}
      .shot-header h3{margin:0;font-size:15px}
      .shot-header .shot-priority{font-size:10px;padding:2px 6px;border-radius:3px;font-weight:600}
      .shot-priority.must{background:#fef2f2;color:#dc2626}
      .shot-priority.recommended{background:#fffbeb;color:#d97706}
      .shot-priority.optional{background:#f0fdf4;color:#16a34a}
      .ref-row{display:flex;gap:10px;margin-bottom:8px;align-items:flex-start}
      .ref-row img{width:120px;height:90px;object-fit:cover;border-radius:4px;border:1px solid #ddd}
      .ref-row .ref-info{flex:1}
      .ref-row .ref-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.04em}
      .ref-row .learning-focus{font-size:12px;margin-top:4px;color:#333;line-height:1.5}
      .exec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 16px}
      .exec-item{margin-bottom:2px}
      .exec-item .label{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.05em;display:block}
      .exec-item .value{font-size:12px;font-weight:500}
      .foot{margin-top:24px;padding-top:8px;border-top:1px solid #ddd;color:#999;font-size:9px;text-align:center}
      @media print{.shot-section{page-break-inside:avoid}}
    </style></head><body>
    <h1>${esc(plan.title || plan.input?.theme || '拍摄执行稿')}</h1>
    <p class="subtitle">${esc(schedule ? `${schedule.date || ''} ${schedule.time || ''} ${schedule.location || ''}` : '拍摄执行稿 · 按镜头逐条执行')}</p>

    <h2 style="font-size:14px;margin:0 0 8px">镜头执行表</h2>
    <table class="overview">
      <thead><tr><th>#</th><th>画面</th><th>场景</th><th>景别</th><th>焦段</th><th>情绪</th><th>参考图</th></tr></thead>
      <tbody>${shots.map((shot, i) => {
        const ref = references.find(r => r.shotId === shot.id || r.shotIndex === i);
        return `<tr><td>${i + 1}</td><td><strong>${esc(shot.name || shot.scene || `Shot${String(i+1).padStart(2,'0')}`)}</strong></td><td>${esc(shot.scene || '')}</td><td>${esc(shot.shotSize || '')}</td><td>${esc(shot.focalLength || '')}</td><td>${esc(shot.emotion || '')}</td><td>${ref ? `<img class="ref-thumb" src="${esc(referenceThumbnail(ref))}" alt="Ref${i+1}">` : '-'}</td></tr>`;
      }).join('')}</tbody>
    </table>

    ${shots.map((shot, i) => {
      const ref = references.find(r => r.shotId === shot.id || r.shotIndex === i);
      const priority = shot.priority || 'recommended';
      const priorityLabel = {must:'必拍',recommended:'推荐',optional:'可选',should:'推荐',could:'可选'}[priority] || priority;
      return `<div class="shot-section">
        <div class="shot-header">
          <h3>Shot ${String(i+1).padStart(2,'0')} · ${esc(shot.name || shot.scene || '')}</h3>
          <span class="shot-priority ${priority}">${esc(priorityLabel)}</span>
        </div>
        <div class="ref-row">
          ${ref ? `<img src="${esc(referenceThumbnail(ref))}" alt="参考图">` : '<div style="width:120px;height:90px;background:#f5f5f5;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#999;font-size:10px">无参考图</div>'}
          <div class="ref-info">
            <span class="ref-label">学习重点</span>
            <div class="learning-focus">${esc(shot.learningFocus || '构图、光线、色调')}</div>
          </div>
        </div>
        <div class="exec-grid">
          <div class="exec-item"><span class="label">景别</span><span class="value">${esc(shot.shotSize || '')}</span></div>
          <div class="exec-item"><span class="label">焦段</span><span class="value">${esc(shot.focalLength || '')}</span></div>
          <div class="exec-item"><span class="label">机位</span><span class="value">${esc(shot.cameraAngle || shot.angle || '')}</span></div>
          <div class="exec-item"><span class="label">动作</span><span class="value">${esc(shot.subjectAction || shot.description || '')}</span></div>
          <div class="exec-item"><span class="label">构图</span><span class="value">${esc(shot.composition || '')}</span></div>
          <div class="exec-item"><span class="label">光线方案</span><span class="value">${typeof shot.lighting === 'object' ? `${esc(shot.lighting.main || '')}<br><small>方向：${esc(shot.lighting.direction || '')}</small><br><small>辅助：${esc(shot.lighting.auxiliary || '')}</small><br><small>效果：${esc(shot.lighting.effect || '')}</small>` : esc(shot.lighting || '')}</span></div>
          <div class="exec-item"><span class="label">情绪</span><span class="value">${esc(shot.emotion || '')}</span></div>
          <div class="exec-item"><span class="label">预计</span><span class="value">${esc(shot.estimatedMinutes || shot.duration || 0)} 分钟</span></div>
          <div class="exec-item"><span class="label">备选</span><span class="value">${esc(shot.fallback || shot.alternative || '')}</span></div>
          ${shot.whyThisShot ? `<div class="exec-item" style="grid-column:1/-1"><span class="label">为什么拍</span><span class="value">${esc(shot.whyThisShot)}</span></div>` : ''}
          ${shot.visualMatchScore != null ? `<div class="exec-item"><span class="label">参考匹配</span><span class="value">${shot.visualMatchScore}%</span></div>` : ''}
        </div>
      </div>`;
    }).join('')}

    <div class="foot">PhotoAtelier V3.1 执行稿 · ${esc(new Date().toLocaleString())}</div>
    <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));<\/script></body></html>`);
    popup.document.close();
  }

  root.exportPlanDocument = function (planId, format) {
    const plan = currentPlan(planId);
    if (!plan) { notify('方案不存在', 'er'); return; }
    const shots = typeof root.generateShotList === 'function' ? root.generateShotList(plan) : [];
    const data = planPackageData(plan, shots);
    const filename = Domain.slug(plan.title || plan.input?.theme || 'photoatelier-plan');
    if (format === 'json') { root.exportPlanPackage(planId); return; }
    if (format === 'pdf') { exportPlanPrintView(plan, shots, data); return; }
    if (format === 'txt') {
      downloadBlob(new Blob([buildPlanText(plan, shots, data)], { type: 'text/plain;charset=utf-8' }), `${filename}-shoot-plan.txt`);
      notify('文字版方案已导出', 'ok');
      return;
    }
    if (format === 'csv') {
      const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const rows = [['序号', '镜头', '动作', '景别', '焦段', '机位/方法', '光线', '道具', '备选镜头', '预计分钟', '参考素材']];
      shots.forEach((shot, index) => {
        const reference = data.shotReferences[index]?.reference;
        rows.push([index + 1, shot.name || shot.scene || `镜头 ${index + 1}`, shot.description || '', shot.shotSize || '', shot.focalLength || '', shot.angle || shot.method || '', shot.lighting || '', shot.props || '', shot.alternative || '', shot.duration || 0, reference?.sourceUrl || reference?.sourceFile || reference?.title || '']);
      });
      downloadBlob(new Blob([`\ufeff${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' }), `${filename}-shot-list.csv`);
      notify('拍摄表格已导出，可用 Excel 或飞书表格打开', 'ok');
    }
  };

  root.confirmCandidatePlan = function (planId) {
    const plan = currentPlan(planId);
    if (!plan) return;
    plan.lifecycleStatus = 'confirmed';
    plan.lifecycleUpdatedAt = Domain.nowIso();
    plan.packageStatus = plan.packageStatus === 'preflight-ready' ? plan.packageStatus : 'confirmed';
    updatePlan(plan);
    activePlanLibraryView = 'confirmed';
    refreshCurrentPlan(plan);
    root.renderPlanLibrary?.();
    notify('方案已确认并进入正式方案库', 'ok');
  };

  function ensurePlanScheduleDialog() {
    if (document.getElementById('planScheduleDialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'planScheduleDialog';
    dialog.className = 'workflow-dialog';
    dialog.innerHTML = `<form onsubmit="event.preventDefault();confirmPlanSchedule();"><div class="workflow-dialog__head"><div><span>SHOOT CALL</span><h3>确认拍摄日程</h3><p>日期、集合时间和地点确认后，方案才会进入“已排期”。</p></div><button type="button" class="btn-i2" aria-label="关闭" onclick="closePlanScheduleDialog()">×</button></div><input id="planSchedulePlanId" type="hidden"><div class="workflow-dialog__grid"><label>拍摄标题<input id="planScheduleTitle" required></label><label>拍摄日期<input id="planScheduleDate" type="date" required></label><label>集合 / 开拍时间<input id="planScheduleTime" type="time" required></label><label>拍摄地点<input id="planScheduleLocation" placeholder="场地或详细地址"></label><label class="wide">通告备注<textarea id="planScheduleNotes" placeholder="人员、妆造、交通、停车、场地权限或备用方案"></textarea></label></div><div class="workflow-dialog__actions"><button type="button" class="btn btn-s" onclick="closePlanScheduleDialog()">取消</button><button type="submit" class="btn btn-p">确认并加入日程</button></div></form>`;
    document.body.appendChild(dialog);
  }

  root.openPlanScheduleDialog = function (planId) {
    const plan = currentPlan(planId);
    if (!plan) return;
    if (planLifecycleStatus(plan) === 'candidate') { notify('请先确认采用这份预选方案', 'er'); return; }
    ensurePlanScheduleDialog();
    const existing = read(KEYS.schedules, []).find(item => String(item.planId) === String(plan.id));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('planSchedulePlanId').value = plan.id;
    document.getElementById('planScheduleTitle').value = existing?.title || plan.title || plan.input?.theme || '拍摄方案';
    document.getElementById('planScheduleDate').value = existing?.date || localDateString(tomorrow);
    document.getElementById('planScheduleTime').value = existing?.time || '14:00';
    document.getElementById('planScheduleLocation').value = existing?.location || plan.input?.scene || '';
    document.getElementById('planScheduleNotes').value = existing?.notes || '';
    document.getElementById('planScheduleDialog').showModal();
  };

  root.closePlanScheduleDialog = function () {
    document.getElementById('planScheduleDialog')?.close();
  };

  root.confirmPlanSchedule = function () {
    const planId = document.getElementById('planSchedulePlanId')?.value;
    const plan = currentPlan(planId);
    const date = document.getElementById('planScheduleDate')?.value;
    const time = document.getElementById('planScheduleTime')?.value;
    if (!plan || !date || !time) { notify('请填写拍摄日期和时间', 'er'); return; }
    const schedule = ensurePlanSchedule(plan, {
      title: document.getElementById('planScheduleTitle')?.value.trim(),
      date,
      time,
      location: document.getElementById('planScheduleLocation')?.value.trim(),
      notes: document.getElementById('planScheduleNotes')?.value.trim()
    });
    plan.lifecycleStatus = 'scheduled';
    plan.lifecycleUpdatedAt = Domain.nowIso();
    plan.scheduleId = schedule.id;
    updatePlan(plan);
    activePlanLibraryView = 'scheduled';
    root.closePlanScheduleDialog();
    refreshCurrentPlan(plan);
    root.renderCalendar?.();
    root.renderSchedules?.();
    root.renderPlanLibrary?.();
    root.PhotoAtelierFeishu?.schedule();
    notify('拍摄日程已确认，方案已进入“已排期”', 'ok');
  };

  root.openPlanSchedule = function (planId) {
    const schedule = read(KEYS.schedules, []).find(item => String(item.planId) === String(planId));
    if (!schedule) { root.openPlanScheduleDialog(planId); return; }
    root.showTab?.('calendar');
    setTimeout(() => root.selectCalendarDate?.(schedule.date), 0);
  };

  root.openPlanReview = function (planId) {
    if (typeof root.loadPlan !== 'function') return;
    root.loadPlan(planId);
    setTimeout(() => {
      const publish = document.getElementById('workflow-publish-' + planId);
      if (publish) { publish.open = true; publish.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }, 300);
  };

  root.openPlanLibrary = function () {
    const panel = document.getElementById('planLibraryPanel');
    if (!panel) return;
    root.renderPlanLibrary?.();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function enhancePlanLibraryMarkup() {
    const host = document.getElementById('tab-gen');
    if (!host || document.getElementById('planLibraryPanel')) return;
    const panel = document.createElement('section');
    panel.className = 'panel plan-library-panel';
    panel.id = 'planLibraryPanel';
    panel.innerHTML = `<div class="p-head plan-library-head"><div><h2>方案工作台</h2><p>预选、确认和排期是三个独立动作；不会因为生成了一份提案就自动占用日程。</p></div><div class="plan-library-tools"><input id="planLibrarySearch" type="search" placeholder="搜索主题、风格或场景" oninput="renderPlanLibrary()"><button class="btn btn-s btn-sm" onclick="exportAllPlanPackages()">导出索引</button></div></div><div class="plan-library-tabs" id="planLibraryTabs" role="tablist" aria-label="方案状态"></div><div class="p-body" id="planLibraryList"></div>`;
    host.appendChild(panel);
    ensurePlanScheduleDialog();
  }

  root.setPlanLibraryView = function (view) {
    if (!PLAN_LIFECYCLE[view]) return;
    activePlanLibraryView = view;
    root.renderPlanLibrary();
  };

  root.renderPlanLibrary = function () {
    const target = document.getElementById('planLibraryList');
    if (!target) return;
    const query = (document.getElementById('planLibrarySearch')?.value || '').trim().toLowerCase();
    const limit = workflowPreferences().planLibraryLimit;
    const allPlans = (root.getPlans ? root.getPlans() : read('pw_plans', [])).filter(plan => {
      const text = `${plan.title || ''} ${plan.input?.theme || ''} ${plan.input?.style || ''} ${plan.input?.scene || ''}`.toLowerCase();
      return !query || text.includes(query);
    }).slice(0, limit);
    const counts = Object.fromEntries(Object.keys(PLAN_LIFECYCLE).map(status => [status, allPlans.filter(plan => planLifecycleStatus(plan) === status).length]));
    const tabs = document.getElementById('planLibraryTabs');
    if (tabs) tabs.innerHTML = Object.entries(PLAN_LIFECYCLE).map(([status, meta]) => `<button type="button" role="tab" aria-selected="${activePlanLibraryView === status}" class="${activePlanLibraryView === status ? 'is-active' : ''}" onclick="setPlanLibraryView('${status}')"><span>${esc(meta.label)}</span><strong>${counts[status]}</strong><small>${esc(meta.hint)}</small></button>`).join('');
    const plans = allPlans.filter(plan => planLifecycleStatus(plan) === activePlanLibraryView);
    target.innerHTML = plans.length ? `<div class="plan-library-grid">${plans.map(plan => {
      const shots = typeof root.generateShotList === 'function' ? root.generateShotList(plan) : [];
      const data = planPackageData(plan, shots);
      const lifecycle = planLifecycleStatus(plan);
      const referenceCount = data.shotReferences.filter(item => item.reference).length;
      const previews = data.shotReferences.filter(item => item.reference).slice(0, 3);
      const lutName = data.lut ? (LUT_FRIENDLY_NAMES[data.lut.id]?.[0] || data.lut.title) : '未选 LUT';
      const equipmentCount = data.selectedEquipment.length;
      const date = plan.updatedAt || plan.createdAt || plan.at || Number(plan.id);
      const meta = PLAN_LIFECYCLE[lifecycle];
      const needsCompletion = plan.packageStatus !== 'preflight-ready';
      const openLabel = lifecycle === 'candidate' ? '继续编辑' : '打开分镜';
      const reviewAction = lifecycle !== 'candidate' ? `<button class="btn btn-s btn-sm" onclick="openPlanReview('${esc(plan.id)}')">查看复盘</button>` : '';
      const completeAction = needsCompletion ? `<button class="btn btn-s btn-sm" onclick="completePlanPackage('${esc(plan.id)}')">补齐拍前资料</button>` : '';
      const primaryAction = lifecycle === 'candidate'
        ? `<button class="btn btn-p btn-sm" onclick="confirmCandidatePlan('${esc(plan.id)}')">确认采用</button>`
        : lifecycle === 'confirmed'
          ? `<button class="btn btn-p btn-sm" onclick="openPlanScheduleDialog('${esc(plan.id)}')">安排拍摄</button>`
          : `<button class="btn btn-p btn-sm" onclick="openPlanSchedule('${esc(plan.id)}')">查看日程</button>`;
      const postLabel = data.lut ? `通用预览：${lutName}` : '后期待确认';
      const scheduleLabel = data.schedule ? `${data.schedule.date || ''} ${data.schedule.time || ''}` : '待排日程';
      return `<article class="plan-library-card" data-plan-id="${esc(plan.id)}"><div class="plan-library-card__media">${previews.length ? previews.map(item => `<img src="${esc(referenceThumbnail(item.reference))}" alt="${esc(item.reference.title || '方案参考图')}" loading="lazy">`).join('') : '<div>暂无参考图</div>'}</div><div class="plan-library-card__body"><div class="plan-library-card__top"><span class="eq-tag plan-library-state plan-library-state--${lifecycle}" title="${esc(meta.hint)}">${esc(meta.label)}</span><time>${date ? esc(new Date(date).toLocaleDateString()) : '日期待定'}</time></div><strong>${esc(plan.title || plan.input?.theme || '未命名方案')}</strong><p>${esc(plan.input?.style || '风格待定')} · ${esc(plan.input?.scene || '场景待定')}</p><div class="plan-library-metrics"><span>镜头 ${shots.length}</span><span>参考 ${referenceCount}/${shots.length}</span><span>${esc(postLabel)}</span><span>设备 ${equipmentCount || '待选'}</span><span>${esc(scheduleLabel)}</span></div><div class="plan-library-card__actions"><button class="btn btn-s btn-sm" onclick="loadPlan('${esc(plan.id)}')">${openLabel}</button>${primaryAction}${completeAction}${reviewAction}<select class="plan-export-select" aria-label="导出方案" onchange="if(this.value){exportPlanDocument('${esc(plan.id)}',this.value);this.value='';}"><option value="">导出…</option><option value="pdf">PDF / 打印</option><option value="csv">表格 CSV</option><option value="txt">文字版 TXT</option></select></div></div></article>`;
    }).join('')}</div>` : `<p class="workflow-resource-empty">${query ? '当前状态下没有匹配的方案。' : activePlanLibraryView === 'candidate' ? '暂无预选方案。新生成的提案会先放在这里。' : activePlanLibraryView === 'confirmed' ? '暂无待排期的正式方案。先从预选方案中确认采用。' : '暂无已排期方案。正式方案确认日期后会出现在这里。'}</p>`;
  };

  root.duplicatePlanPackage = async function (planId) {
    const source = currentPlan(planId);
    if (!source) return;
    const clone = JSON.parse(JSON.stringify(source));
    clone.id = `${Date.now()}`;
    clone.title = `${source.title || source.input?.theme || '拍摄方案'}（副本）`;
    clone.input = { ...(clone.input || {}), theme: `${clone.input?.theme || '拍摄方案'}（副本）` };
    clone.createdAt = Domain.nowIso(); clone.updatedAt = clone.createdAt;
    clone.lifecycleStatus = 'candidate';
    clone.lifecycleUpdatedAt = clone.createdAt;
    delete clone.scheduleId;
    const plans = [clone, ...(root.getPlans ? root.getPlans() : read('pw_plans', []))].slice(0, workflowPreferences().planLibraryLimit);
    write('pw_plans', plans);
    await Store.put('plans', canonicalPlan(clone));
    recordVersion(clone, 'duplicate');
    activePlanLibraryView = 'candidate';
    root.renderPlanLibrary();
    notify('已复制为新的预选方案', 'ok');
  };

  root.exportAllPlanPackages = function () {
    const plans = (root.getPlans ? root.getPlans() : read('pw_plans', [])).map(plan => {
      const shots = typeof root.generateShotList === 'function' ? root.generateShotList(plan) : [];
      const data = planPackageData(plan, shots);
      return { id: plan.id, title: plan.title || plan.input?.theme, lifecycleStatus: planLifecycleStatus(plan), status: plan.packageStatus || 'draft', shotCount: shots.length, referenceCount: data.shotReferences.filter(item => item.reference).length, lut: data.lut?.title || '', equipmentCount: data.selectedEquipment.length, scheduleId: data.schedule?.id || '' };
    });
    downloadBlob(new Blob([JSON.stringify({ exportedAt: Domain.nowIso(), plans }, null, 2)], { type: 'application/json;charset=utf-8' }), 'photoatelier-plan-library.json');
  };

  function renderLifecyclePanel(plan) {
    const records = read(KEYS.shootRecords, []).filter(item => String(item.planId) === String(plan.id));
    const review = read(KEYS.reviews, []).find(item => String(item.planId) === String(plan.id)) || {};
    const shots = typeof root.generateShotList === 'function' ? root.generateShotList(plan) : [];
    const relationGraph = buildCanonicalRelations(plan);
    const roleOrder = ['materialReference', 'shotAngle', 'poseGuide', 'composition', 'lighting', 'colorLut', 'publishingCopy'];
    const relations = roleOrder.map(role => relationGraph.find(item => item.role === role)).filter(Boolean);
    relationGraph.forEach(item => { if (relations.length < 8 && !relations.includes(item)) relations.push(item); });
    const publishing = Domain.buildPublishingPackage(plan.input || {}, (plan.relations || {}).seo || {});
    const evaluation = Domain.evaluateWorkflow({ plan, relations: relationGraph, shots });
    const lifecycle = planLifecycleStatus(plan);
    return `
      <details class="workflow-loop" id="plan-execution-${esc(plan.id)}">
        <summary class="workflow-loop__head">
          <div><span class="workflow-loop__kicker">EXECUTION WORKSPACE</span><h3>执行与交付</h3><p>方案、参考、设备、日程和现场记录共享同一组关系 ID。</p></div>
          <div class="workflow-loop__score"><span>结构完整度</span><strong>${evaluation.score}</strong><small>/ 100</small><em>点击查看</em></div>
        </summary>
        <div class="workflow-loop__body">
        <div class="plan-execution-rhythm" style="display:grid;grid-template-columns:repeat(6,1fr);gap:.5rem;margin:0 0 1rem;"><div class="plan-execution-rhythm__step ${lifecycle === 'candidate' ? 'is-active' : ''}"><span>01</span><strong>准备</strong><small>确认方案与参考</small></div><div class="plan-execution-rhythm__step ${records.length ? 'is-active' : ''}"><span>02</span><strong>拍摄</strong><small>现场执行</small></div><div class="plan-execution-rhythm__step ${review.keepRate ? 'is-active' : ''}"><span>03</span><strong>选片</strong><small>备份与初选</small></div><div class="plan-execution-rhythm__step ${plan.lutProfileId ? 'is-active' : ''}"><span>04</span><strong>精修</strong><small>调色与后期</small></div><div class="plan-execution-rhythm__step ${publishing.platforms.length ? 'is-active' : ''}"><span>05</span><strong>交付</strong><small>输出与发布</small></div><div class="plan-execution-rhythm__step ${review.id ? 'is-active' : ''}"><span>06</span><strong>复盘</strong><small>经验回流</small></div></div>
        ${renderProductionMap(plan, shots, relationGraph)}
        ${renderPlanPackageSummary(plan, shots)}
        <details class="workflow-extended-details">
          <summary><span>详细执行工具</span><small>参考、设备、现场记录、LUT、发布与复盘</small></summary>
          <div class="workflow-extended-details__body">
        <details class="workflow-phase-toggle" id="workflow-references-${esc(plan.id)}">
          <summary><span class="workflow-phase-toggle__number">04</span><span class="workflow-phase-toggle__copy"><strong>参考与资源</strong><small>确认依据，再把素材和真实库存绑定到镜头。</small></span><span class="workflow-phase-toggle__hint">点击查看</span></summary>
          <div class="workflow-phase-toggle__body">
          <div class="workflow-grid">
            <div class="workflow-block">
              <h5>关联依据</h5>
              <div class="workflow-recommendations">${relations.length ? relations.map(rel => renderRecommendation(plan, rel)).join('') : '<p>当前方案尚无可操作的素材关系。</p>'}</div>
            </div>
            <div class="workflow-block">
              <h5>日程与状态</h5>
              ${renderScheduleLink(plan)}
              <div class="workflow-loop__actions" style="margin-top:.6rem;"><button class="btn btn-s btn-sm" onclick="createScheduleDraftFromCurrentPlan()">创建/打开日程</button><button class="btn btn-s btn-sm" onclick="openPlanVersions('${esc(plan.id)}')">查看版本</button></div>
            </div>
            <div class="workflow-block workflow-block--wide">
              <h5>镜头参考板</h5>
              ${renderShotReferenceBoard(plan, shots)}
            </div>
            <div class="workflow-block workflow-block--wide">
              <h5>场地、模特与设备</h5>
              ${renderResourceDrawer(plan, shots)}
            </div>
          </div>
          </div>
        </details>
        <details class="workflow-phase-toggle" id="workflow-records-${esc(plan.id)}">
          <summary><span class="workflow-phase-toggle__number">05</span><span class="workflow-phase-toggle__copy"><strong>现场记录</strong><small>逐镜头记录实拍结果、失败原因、样片和补拍状态。</small></span><span class="workflow-phase-toggle__hint">点击查看</span></summary>
          <div class="workflow-phase-toggle__body">
          <div class="workflow-block workflow-block--wide">
            ${shots.map((shot, index) => renderShotRow(plan.id, shot, index, records)).join('') || '<p>当前没有镜头记录。</p>'}
          </div>
          </div>
        </details>
        <details class="workflow-phase-toggle" id="plan-post-${esc(plan.id)}">
          <summary><span class="workflow-phase-toggle__number">06</span><span class="workflow-phase-toggle__copy"><strong>后期交接</strong><small>做格式兼容检查和手动预览，不替代专项后期决策。</small></span><span class="workflow-phase-toggle__hint">点击查看</span></summary>
          <div class="workflow-phase-toggle__body">
          <div class="workflow-block workflow-block--wide">
            ${renderLutRecommendations(plan, shots)}
            ${renderLutWorkbench(plan)}
          </div>
          </div>
        </details>
        <details class="workflow-phase-toggle" id="workflow-publish-${esc(plan.id)}">
          <summary><span class="workflow-phase-toggle__number">07</span><span class="workflow-phase-toggle__copy"><strong>发布与复盘</strong><small>整理平台交付内容，并把拍摄经验回流到本地知识库。</small></span><span class="workflow-phase-toggle__hint">点击查看</span></summary>
          <div class="workflow-phase-toggle__body">
          <div class="workflow-grid">
            <div class="workflow-block workflow-block--wide">
              <h5>国内与海外发布包</h5>
              <div class="workflow-publish-list">${publishing.platforms.map(renderPublishCard).join('')}</div>
            </div>
            <div class="workflow-block workflow-block--wide">
              <h5>成片复盘与 Obsidian 回流</h5>
              ${renderReviewForm(plan, review)}
            </div>
          </div>
          </div>
        </details>
        <details class="workflow-agent-details">
          <summary>通用方案 Agent（可选）</summary>
          <div class="workflow-block workflow-block--secondary">
            ${renderAgentApproval(plan)}
          </div>
        </details>
          </div>
        </details>
        </div>
      </details>`;
  }

  function renderAgentApproval(plan) {
    const status = plan.agentStatus || '';
    const draft = plan.agentDraft || {};
    const output = draft.output || {};
    const validation = plan.agentValidation || draft.validation || {};
    const issues = validation.photography?.issues || [];
    if (!status) return `<div style="display:flex;justify-content:space-between;gap:.8rem;align-items:center;flex-wrap:wrap;"><div><p style="margin:0;">这里只校验通用方案结构，并在批准后写入飞书正式记录；它不承担专项后期决策。</p><p style="margin:.3rem 0 0;color:var(--t3);font-size:.7rem;">未配置模型时不影响本地工作稿、参考库、设备和日程。</p></div><button class="btn btn-p btn-sm" onclick="createAgentDraftForPlan('${esc(plan.id)}')">生成结构审批草稿</button></div>`;
    if (status === 'loading') return '<p>正在构建 ProjectContext、生成草稿并执行校验…</p>';
    if (status === 'completed') return `<div style="display:flex;justify-content:space-between;gap:.8rem;align-items:center;flex-wrap:wrap;"><div><strong>已批准并正式写入飞书</strong><p style="margin:.3rem 0 0;color:var(--t3);font-size:.7rem;">Agent Plan：${esc(plan.agentPlanId || '')} · 原方案仍完整保留</p></div><span class="eq-tag">completed</span></div>`;
    if (status === 'failed') return `<div><p style="color:var(--er);">Agent 草稿失败：${esc(plan.agentError || '未知错误')}</p><button class="btn btn-s btn-sm" onclick="createAgentDraftForPlan('${esc(plan.id)}')">重新生成</button></div>`;
    return `<div>
      <div style="display:flex;justify-content:space-between;gap:.8rem;align-items:flex-start;flex-wrap:wrap;"><div><strong>${esc(draft.concept || 'Agent 草稿已生成')}</strong><p style="margin:.3rem 0 0;color:var(--t3);font-size:.7rem;">${esc(plan.agentProvider || draft.provider || 'local-rule-fallback')} · ${esc(plan.agentRunId || '')}</p></div><span class="eq-tag">待批准</span></div>
      <div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.55rem;"><span class="eq-tag">草稿镜头 ${(output.shots || []).length}</span><span class="eq-tag">任务 ${(output.tasks || []).length}</span><span class="eq-tag">校验 ${esc(validation.photography?.status || 'unknown')}</span></div>
      ${issues.length ? `<div style="margin-top:.55rem;color:var(--t3);font-size:.7rem;">${issues.slice(0, 4).map(item => `${esc(item.code)}：${esc(item.message)}`).join('<br>')}</div>` : ''}
      <div class="workflow-loop__actions" style="margin-top:.65rem;"><button class="btn btn-s btn-sm" onclick="regenerateAgentDraftForPlan('${esc(plan.id)}')">按意见重生成</button><button class="btn btn-p btn-sm" onclick="approveAgentDraftForPlan('${esc(plan.id)}')">批准并写入正式记录</button></div>
    </div>`;
  }

  root.createAgentDraftForPlan = async function (planId) {
    const plan = currentPlan(planId);
    const Feishu = root.PhotoAtelierFeishu;
    if (!plan || !Feishu) return;
    const config = Feishu.settings();
    if (!config.enabled || !config.token) { notify('请先在设置中启用飞书同步并保存同步密钥', 'er'); return; }
    plan.agentStatus = 'loading'; updatePlan(plan); refreshCurrentPlan(plan);
    try {
      await Feishu.pushAll();
      const result = await Feishu.createAgentDraft(`project-${plan.id}`, String(plan.id));
      plan.agentRunId = result.run_id;
      plan.agentPlanId = result.plan?.id || '';
      plan.agentStatus = result.status;
      plan.agentProvider = result.plan?.provider || '';
      plan.agentDraft = result.plan || {};
      plan.agentValidation = result.validation || result.plan?.validation || {};
      updatePlan(plan);
      notify('Agent 草稿已生成，原方案未被覆盖', 'ok');
    } catch (error) {
      plan.agentStatus = 'failed'; plan.agentError = error.message; updatePlan(plan);
      notify(`Agent 草稿失败：${error.message}`, 'er');
    }
    refreshCurrentPlan(plan);
  };

  root.regenerateAgentDraftForPlan = async function (planId) {
    const plan = currentPlan(planId);
    if (!plan?.agentRunId) return;
    const instruction = prompt('输入需要保留或调整的内容，例如：保留灯光，只调整镜头顺序与摆姿。', '');
    if (instruction == null) return;
    try {
      const result = await root.PhotoAtelierFeishu.regenerateAgentRun(plan.agentRunId, instruction);
      plan.agentStatus = result.status;
      plan.agentDraft = result.plan || plan.agentDraft;
      plan.agentValidation = result.validation || result.plan?.validation || {};
      updatePlan(plan); refreshCurrentPlan(plan);
      notify('Agent 草稿已重新生成，仍需批准', 'ok');
    } catch (error) { notify(`重新生成失败：${error.message}`, 'er'); }
  };

  root.approveAgentDraftForPlan = async function (planId) {
    const plan = currentPlan(planId);
    if (!plan?.agentRunId) return;
    try {
      const result = await root.PhotoAtelierFeishu.approveAgentRun(plan.agentRunId);
      plan.agentStatus = result.status;
      plan.agentWrittenIds = result.written || {};
      updatePlan(plan); refreshCurrentPlan(plan);
      notify(result.idempotent ? '该 Agent 草稿此前已批准，没有重复创建' : 'Agent 草稿已批准并写入正式记录', 'ok');
    } catch (error) { notify(`批准失败：${error.message}`, 'er'); }
  };

  function renderRecommendation(plan, rel) {
    const title = rel.provenance && rel.provenance.title || rel.sourceId;
    const source = rel.provenance && rel.provenance.source || '本地库';
    const license = rel.provenance && rel.provenance.licenseClass || '待确认';
    return `<div class="workflow-recommendation ${rel.locked ? 'is-locked' : ''} ${rel.rejected ? 'is-rejected' : ''}">
      <div class="workflow-recommendation__head"><strong style="font-size:.74rem;">${esc(title)}</strong><span class="eq-tag">${rel.score}</span></div>
      <div class="workflow-recommendation__meta">${esc(rel.reason)}<br>来源：${esc(source)} · 授权：${esc(license)} · ${esc(rel.validationStatus)}<br>更新：${new Date(rel.updatedAt).toLocaleDateString()}</div>
      <div style="display:flex;gap:.35rem;margin-top:.45rem;"><button class="btn btn-s btn-sm" onclick="setRelationDecision('${esc(plan.id)}','${esc(rel.sourceId)}','lock')">${rel.locked ? '取消锁定' : '锁定'}</button><button class="btn btn-s btn-sm" onclick="setRelationDecision('${esc(plan.id)}','${esc(rel.sourceId)}','reject')">${rel.rejected ? '恢复' : '否决'}</button></div>
    </div>`;
  }

  function equipmentRequirements(plan, shots) {
    const text = `${plan.input?.theme || ''} ${plan.input?.style || ''} ${plan.input?.scene || ''} ${plan.input?.extra || ''} ${shots.map(shot => `${shot.focalLength || ''} ${shot.lighting || ''} ${shot.method || ''}`).join(' ')}`;
    const requirements = [
      { category: 'camera', label: '相机机身', reason: '方案执行的基础机身' },
      { category: 'lens', label: '镜头', reason: /135mm|85mm/.test(text) ? '镜头表以中长焦人像为主' : /35mm|广角|环境/.test(text) ? '需要环境人像或广角镜头' : '覆盖方案中的主要景别' }
    ];
    if (!/纯自然光|自然光为主/.test(text) || /夜景|室内|补光|闪光|灯/.test(text)) requirements.push({ category: 'light', label: '灯光', reason: '场景存在补光或控光需求' });
    if (/视频|跟拍|运动|动态|长曝光/.test(text)) requirements.push({ category: 'tripod', label: '稳定器/脚架', reason: '动态或低速快门需要稳定支持' });
    if (/户外|日光|大光圈|长曝光/.test(text)) requirements.push({ category: 'filter', label: '滤镜/附件', reason: '控制曝光或现场反光' });
    return requirements;
  }

  function matchEquipment(plan, shots) {
    const inventory = read(KEYS.equipment, []);
    const text = `${plan.input?.theme || ''} ${plan.input?.style || ''} ${plan.input?.scene || ''} ${shots.map(shot => `${shot.focalLength || ''} ${shot.lighting || ''}`).join(' ')}`.toLowerCase();
    return equipmentRequirements(plan, shots).map(requirement => {
      const matches = inventory.filter(item => item.c === requirement.category).map(item => {
        let score = 60;
        const name = `${item.n || ''} ${item.note || ''}`.toLowerCase();
        ['35mm', '50mm', '85mm', '105mm', '135mm', '24-70', '70-200', 'nd', 'cpl', 'ad600', 'ad200', 'v1', 'rs3'].forEach(token => { if (text.includes(token) && name.includes(token)) score += 18; });
        if (/夜景|室内/.test(text) && /ad600|ad200|v1|补光|闪光/.test(name)) score += 12;
        if (/复古|文艺/.test(text) && /fuji|35mm|50mm/.test(name)) score += 8;
        return { ...item, score: Math.min(score, 98) };
      }).sort((a, b) => b.score - a.score).slice(0, 3);
      return { ...requirement, matches };
    });
  }

  function scoreResource(item, plan, fields) {
    const brief = `${plan.input?.theme || ''} ${plan.input?.style || ''} ${plan.input?.scene || ''}`.toLowerCase();
    const value = fields.map(field => item[field] || '').join(' ').toLowerCase();
    const tokens = brief.split(/[\s,，、]+/).filter(token => token.length > 1);
    return 45 + Math.min(45, tokens.filter(token => value.includes(token)).length * 12);
  }

  function renderResourceDrawer(plan, shots) {
    const selected = plan.resourceSelections || { equipmentIds: [], venueId: '', modelId: '' };
    const equipment = matchEquipment(plan, shots);
    const venues = read(KEYS.venues, []).map(item => ({ ...item, score: scoreResource(item, plan, ['name', 'styles', 'addr', 'note']) })).sort((a, b) => b.score - a.score);
    const models = read(KEYS.models, []).map(item => ({ ...item, score: scoreResource(item, plan, ['name', 'tags', 'styles', 'note']) })).sort((a, b) => b.score - a.score);
    const equipmentHtml = equipment.map(group => `<div class="workflow-resource-group"><div><strong>${esc(group.label)}</strong><span>${esc(group.reason)}</span></div><div class="workflow-resource-options workflow-equipment-options">${group.matches.length ? group.matches.map(item => `<button class="workflow-equipment-option ${selected.equipmentIds?.includes(item.id) ? 'is-selected' : ''}" onclick="togglePlanEquipment('${esc(plan.id)}','${esc(item.id)}')"><img src="${esc(safeMediaUrl(item.imageUrl, 'assets/demo/equipment-kit.jpg'))}" alt="${esc(item.n)}"><span><strong>${esc(item.n)}</strong><small>匹配 ${item.score} · ${selected.equipmentIds?.includes(item.id) ? '已选' : '点击选用'}</small></span></button>`).join('') : '<span class="workflow-resource-empty">库存中没有匹配设备；下方推荐仍会写进拍摄包。</span>'}</div></div>`).join('');
    return `<div class="workflow-resource-drawer">
      <div class="workflow-resource-selects">
        <label>场地<select onchange="setPlanResourceSelection('${esc(plan.id)}','venueId',this.value)"><option value="">暂不指定</option>${venues.map(item => `<option value="${esc(item.id)}" ${item.id === selected.venueId ? 'selected' : ''}>${esc(item.name)} · 匹配 ${item.score}</option>`).join('')}</select></label>
        <label>模特<select onchange="setPlanResourceSelection('${esc(plan.id)}','modelId',this.value)"><option value="">暂不指定</option>${models.map(item => `<option value="${esc(item.id)}" ${item.id === selected.modelId ? 'selected' : ''}>${esc(item.name)} · 匹配 ${item.score}</option>`).join('')}</select></label>
        <div style="display:flex;gap:.35rem;flex-wrap:wrap;"><button class="btn btn-s btn-sm" onclick="quickAddPlanResource('${esc(plan.id)}','venue')">+ 场地</button><button class="btn btn-s btn-sm" onclick="quickAddPlanResource('${esc(plan.id)}','model')">+ 模特</button><button class="btn btn-s btn-sm" onclick="showTab('venue')">设备库存</button></div>
      </div>
      <div class="workflow-resource-groups">${equipmentHtml}</div>
      <p class="workflow-resource-note">匹配分数来自方案主题、镜头焦段、光线和库存备注；只有你主动选中的资源会写入方案。</p>
    </div>`;
  }

  root.setPlanResourceSelection = function (planId, field, value) {
    const plan = currentPlan(planId);
    if (!plan) return;
    plan.resourceSelections = { equipmentIds: [], venueId: '', modelId: '', ...(plan.resourceSelections || {}), [field]: value };
    updatePlan(plan); refreshCurrentPlan(plan);
  };

  root.togglePlanEquipment = function (planId, equipmentId) {
    const plan = currentPlan(planId);
    if (!plan) return;
    const selections = { equipmentIds: [], venueId: '', modelId: '', ...(plan.resourceSelections || {}) };
    selections.equipmentIds = selections.equipmentIds.includes(equipmentId) ? selections.equipmentIds.filter(id => id !== equipmentId) : [...selections.equipmentIds, equipmentId];
    plan.resourceSelections = selections;
    updatePlan(plan); refreshCurrentPlan(plan);
  };

  root.quickAddPlanResource = function (planId, type) {
    const isVenue = type === 'venue';
    const name = prompt(isVenue ? '场地名称' : '模特姓名');
    if (!name?.trim()) return;
    const detail = prompt(isVenue ? '地址、风格或注意事项' : '标签、擅长风格或联系方式') || '';
    const key = isVenue ? KEYS.venues : KEYS.models;
    const list = read(key, []);
    const item = isVenue
      ? { id: `venue-${Date.now()}`, name: name.trim(), addr: detail, styles: detail, note: '', at: Domain.nowIso() }
      : { id: `model-${Date.now()}`, name: name.trim(), tags: detail, styles: detail, contact: '', note: '', at: Domain.nowIso() };
    list.push(item); write(key, list);
    const plan = currentPlan(planId);
    if (plan) {
      plan.resourceSelections = { equipmentIds: [], venueId: '', modelId: '', ...(plan.resourceSelections || {}), [isVenue ? 'venueId' : 'modelId']: item.id };
      updatePlan(plan); refreshCurrentPlan(plan);
    }
  };

  function renderScheduleLink(plan) {
    const schedule = read(KEYS.schedules, []).find(item => String(item.planId) === String(plan.id));
    if (!schedule) return '<p>尚未创建日程。创建后会保留 planId、topicId 和关系来源。</p>';
    const options = Domain.SCHEDULE_STATUSES.map(item => `<option value="${item.id}" ${item.id === (schedule.status || 'scheduled') ? 'selected' : ''}>${item.label}</option>`).join('');
    return `<p>${esc(schedule.date || '未定日期')} ${esc(schedule.time || '')} · ${esc(schedule.location || '未定地点')}</p><select class="schedule-workflow-status" onchange="setScheduleWorkflowStatus('${esc(schedule.id)}',this.value)">${options}</select>`;
  }

  function renderShotRow(planId, shot, index, records) {
    const id = `shot-${index}`;
    const record = records.find(item => item.shotId === id) || {};
    const title = shot.name || shot.title || shot.scene || `镜头 ${index + 1}`;
    return `<div class="workflow-shot-row">
      <input type="checkbox" aria-label="完成 ${esc(title)}" ${record.completed ? 'checked' : ''} onchange="saveShootRecord('${esc(planId)}','${id}',{completed:this.checked})">
      <strong style="font-size:.72rem;min-width:0;overflow:hidden;text-overflow:ellipsis;">${esc(title)}</strong>
      <input value="${esc(record.notes || '')}" placeholder="实拍备注或失败原因" onchange="saveShootRecord('${esc(planId)}','${id}',{notes:this.value})">
      <input type="number" min="0" value="${esc(record.elapsedMinutes || '')}" placeholder="分钟" onchange="saveShootRecord('${esc(planId)}','${id}',{elapsedMinutes:Number(this.value)||0})">
      <label class="workflow-shot-action"><input type="checkbox" ${record.needsReshoot ? 'checked' : ''} onchange="saveShootRecord('${esc(planId)}','${id}',{needsReshoot:this.checked})">补拍</label>
      <label class="workflow-shot-action">${record.sampleName ? esc(record.sampleName) : '样片'}<input type="file" accept="image/*" onchange="saveShootSample(event,'${esc(planId)}','${id}')"></label>
    </div>`;
  }

  function renderReviewForm(plan, review) {
    const id = esc(plan.id);
    return `<div class="workflow-review-grid">
      <label>有效姿势<input id="review-best-${id}" value="${esc(review.bestPoses || '')}" placeholder="哪些姿势最有效"></label>
      <label>失败动作<input id="review-failed-${id}" value="${esc(review.failedActions || '')}" placeholder="需要避免或补拍的动作"></label>
      <label>光线问题<input id="review-light-${id}" value="${esc(review.lightingIssues || '')}" placeholder="现场光线与解决办法"></label>
      <label>最终调色<input id="review-grade-${id}" value="${esc(review.finalGrade || '')}" placeholder="LUT、参数或色彩方向"></label>
      <label>出片率 %<input id="review-rate-${id}" type="number" min="0" max="100" value="${esc(review.keepRate == null ? '' : review.keepRate)}"></label>
      <label>客户反馈<input id="review-feedback-${id}" value="${esc(review.clientFeedback || '')}" placeholder="满意点和修改意见"></label>
      <label class="wide">可复用经验<textarea id="review-insight-${id}" rows="3" placeholder="以后遇到相似主题可以直接复用什么">${esc(review.reusableInsights || '')}</textarea></label>
    </div><div class="workflow-loop__actions" style="margin-top:.6rem;"><button class="btn btn-p btn-sm" onclick="savePlanReview('${id}')">保存复盘</button><button class="btn btn-s btn-sm" onclick="returnReviewToObsidian('${id}')">回流到 Obsidian</button><span style="font-size:.7rem;color:var(--t3);">${review.returnedToObsidian ? '已回流，不会修改原笔记或原图' : '仅写入 PhotoAtelier/复盘回流'}</span></div>`;
  }

  function renderLutWorkbench(plan) {
    const profiles = read(KEYS.lutMeta, []);
    const options = profiles.map(item => `<option value="${esc(item.id)}" ${item.id === plan.lutProfileId ? 'selected' : ''}>${esc(item.title)}</option>`).join('');
    const strength = plan.lutStrength == null ? workflowPreferences().lutStrength : plan.lutStrength;
    const previewLabel = plan.lutProfileId ? '当前通用预览' : '示例效果（未写入方案）';
    const previewNote = plan.lutProfileId ? '已选择通用预览，最终后期仍需专项确认。' : '中图使用默认示例 LUT 验证预览工具，不会写入当前方案。';
    return `<div class="workflow-lut-controls" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.5rem;">
      <label>LUT 文件<input type="file" accept=".cube" onchange="importCubeLut(event,'${esc(plan.id)}')"></label>
      <label>已导入 LUT<select id="lut-select-${esc(plan.id)}" onchange="selectLutProfile('${esc(plan.id)}',this.value)"><option value="">选择 LUT</option>${options}</select></label>
      <label>替换源图<input type="file" accept="image/*" onchange="loadLutImage(event,'original','${esc(plan.id)}')"></label>
      <label>替换参考色<input type="file" accept="image/*" onchange="loadLutImage(event,'reference','${esc(plan.id)}')"></label>
      <label>强度 <span id="lut-strength-label-${esc(plan.id)}">${esc(strength)}%</span><input id="lut-strength-${esc(plan.id)}" type="range" min="0" max="100" value="${esc(strength)}" oninput="updateLutPreview('${esc(plan.id)}',this.value)"></label>
    </div>
    <div class="workflow-lut-canvases"><figure><figcaption>源图（未套 LUT）</figcaption><canvas id="lut-original-${esc(plan.id)}" width="360" height="225"></canvas></figure><figure><figcaption>${previewLabel}</figcaption><canvas id="lut-output-${esc(plan.id)}" width="360" height="225"></canvas></figure><figure><figcaption>参考色彩目标</figcaption><canvas id="lut-reference-${esc(plan.id)}" width="360" height="225"></canvas></figure></div>
    <p id="lut-analysis-${esc(plan.id)}" style="margin-top:.5rem;">${previewNote}</p>`;
  }

  function lutHandoffContext(plan) {
    const transformId = detectPlanInputTransform(plan);
    return {
      transformId,
      label: plan.lutProfileId ? '已选择通用预览' : '等待专项后期确认',
      reason: '当前只按输入色彩空间检查兼容性，不根据题材自动指定创意 LUT 或调色参数'
    };
  }

  function detectPlanInputTransform(plan) {
    const text = `${plan.input?.theme || ''} ${plan.input?.style || ''} ${plan.input?.extra || ''} ${plan.input?.camera || ''}`.toLowerCase();
    if (/s-?log\s*3|s-?gamut3/.test(text)) return 'sony-slog3-sgamut3cine';
    if (/d-?log\s*m/.test(text)) return 'dji-dlogm';
    if (/apple\s*log|苹果\s*log/.test(text)) return 'apple-log';
    if (/v-?log|v-?gamut/.test(text)) return 'panasonic-vlog';
    if (/blackmagic.*(film|gen\s*5)|bmd.*(film|gen\s*5)/.test(text)) return 'blackmagic-film-gen5';
    return 'srgb-display';
  }

  function renderLutRecommendations(plan, shots) {
    const handoff = lutHandoffContext(plan);
    const importedProfiles = read(KEYS.lutMeta, []);
    const importedIds = new Set(importedProfiles.map(profile => profile.id));
    const transformId = handoff.transformId;
    const transform = lutInputTransforms.find(item => item.id === transformId);
    const directVLogLook = transformId === 'panasonic-vlog';
    const profiles = [...importedProfiles.map(profile => ({ ...profile, installed: true })), ...openLutCatalog.filter(profile => !importedIds.has(profile.id)).map(profile => ({ ...profile, installed: false }))]
      .filter(profile => directVLogLook ? profile.inputColorSpace === 'Panasonic V-Log / V-Gamut' : profile.inputColorSpace === 'sRGB display-referred')
      .sort((a, b) => Number(b.installed) - Number(a.installed) || String(a.title || '').localeCompare(String(b.title || '')));
    const options = profiles.map(profile => `<option value="${esc(profile.id)}">${esc(profile.title)}</option>`).join('');
    const assignments = plan.shotLutAssignments || {};
    const chain = transformId === 'srgb-display'
      ? '当前素材已是 sRGB / Rec.709，可直接进行通用 LUT 预览。'
      : directVLogLook
        ? '当前可使用 V-Log 专用 Look 进行通用预览。'
        : `先执行 ${transform?.label || '对应 Log'} → Rec.709 技术转换，再进行下方通用预览。`;
    return `<div class="workflow-lut-recommendation"><div class="post-agent-boundary"><span>PREVIEW ONLY</span><strong>${esc(handoff.label)}</strong><p>${esc(handoff.reason)}。${esc(chain)} 输入空间不匹配的 LUT 不进入预览候选。</p></div>${profiles.length ? `<div class="workflow-lut-suggestions">${profiles.slice(0, 4).map(profile => `<button class="btn ${profile.id === plan.lutProfileId ? 'btn-p' : 'btn-s'} btn-sm" onclick="${profile.installed ? `applyLutRecommendation('${esc(plan.id)}','${esc(profile.id)}')` : `installOpenLut('${esc(profile.id)}','${esc(plan.id)}')`}">${profile.installed ? '预览 · ' : '安装并预览 · '}${esc(LUT_FRIENDLY_NAMES[profile.id]?.[0] || profile.title)}</button>`).join('')}</div><details><summary>按镜头指定已安装 LUT</summary><div class="workflow-shot-lut-grid">${shots.slice(0, 10).map((shot, index) => `<label>${esc(shot.name || shot.description || `镜头 ${index + 1}`)}<select onchange="setShotLutAssignment('${esc(plan.id)}','shot-${index}',this.value)"><option value="">跟随方案</option>${importedProfiles.map(profile => `<option value="${esc(profile.id)}" ${assignments[`shot-${index}`] === profile.id ? 'selected' : ''}>${esc(LUT_FRIENDLY_NAMES[profile.id]?.[0] || profile.title)}</option>`).join('')}</select></label>`).join('')}</div></details>` : '<p class="workflow-resource-empty">当前输入空间没有兼容的通用预览 LUT。</p>'}</div>`;
  }

  root.applyLutRecommendation = function (planId, lutId) {
    const plan = currentPlan(planId);
    if (!plan) return;
    const shots = typeof root.generateShotList === 'function' ? root.generateShotList(plan) : [];
    plan.lutProfileId = lutId;
    plan.postProductionStatus = 'manual-preview';
    plan.shotLutAssignments = Object.fromEntries(shots.map((shot, index) => [`shot-${index}`, lutId]));
    updatePlan(plan); refreshCurrentPlan(plan);
  };

  root.setShotLutAssignment = function (planId, shotId, lutId) {
    const plan = currentPlan(planId);
    if (!plan) return;
    plan.shotLutAssignments = { ...(plan.shotLutAssignments || {}), [shotId]: lutId };
    if (lutId) plan.postProductionStatus = 'manual-preview';
    updatePlan(plan);
  };

  function enhanceLutWorkspaceMarkup() {
    if (document.getElementById('tab-lut')) return;
    const settings = document.getElementById('tab-settings');
    if (!settings) return;
    const tab = document.createElement('div');
    tab.className = 'tab-cnt';
    tab.id = 'tab-lut';
    const preferences = workflowPreferences();
    tab.innerHTML = `<div style="max-width:1200px;margin:0 auto;display:grid;gap:1rem;">
      <section class="panel"><div class="p-head"><div><h2>LUT 效果对比</h2><p style="margin:.25rem 0 0;color:var(--t3);font-size:.72rem;">打开即显示真实样片与 .cube 计算结果；上传自己的图片后会替换示例图，不覆盖原文件。</p></div></div><div class="p-body">
        <div class="workflow-lut-controls" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.5rem;">
          <label>导入 LUT<input type="file" accept=".cube" onchange="importCubeLut(event,'')"></label>
          <label>已导入 LUT<select id="lut-library-select" onchange="selectLibraryLutProfile(this.value)"><option value="">选择 LUT</option></select></label>
          <label>替换源图<input type="file" accept="image/*" onchange="loadLibraryLutImage(event,'original')"></label>
          <label>替换参考色<input type="file" accept="image/*" onchange="loadLibraryLutImage(event,'reference')"></label>
          <label>强度 <span id="lut-library-strength-label">${esc(preferences.lutStrength)}%</span><input id="lut-library-strength" type="range" min="0" max="100" value="${esc(preferences.lutStrength)}" oninput="updateLibraryLutPreview(this.value)"></label>
        </div>
        <div class="workflow-lut-canvases"><figure><figcaption>源图（未套 LUT）</figcaption><canvas id="lut-library-original" width="360" height="225"></canvas></figure><figure><figcaption>当前 LUT 效果</figcaption><canvas id="lut-library-output" width="360" height="225"></canvas></figure><figure><figcaption>参考色彩目标</figcaption><canvas id="lut-library-reference" width="360" height="225"></canvas></figure></div>
        <p id="lut-library-analysis" style="margin-top:.5rem;">正在载入示例源图、真实 LUT 和参考色彩。</p>
        <div class="lut-tool-actions"><button class="btn btn-p btn-sm" onclick="applyDemoLutEffect()">试用暖胶片效果</button><button class="btn btn-s btn-sm" onclick="exportLibraryLutImage('image/jpeg')">导出效果 JPG</button><button class="btn btn-s btn-sm" onclick="exportLibraryLutImage('image/png')">导出效果 PNG</button><label>CUBE 尺寸<select id="lut-convert-size"><option value="17">17 点 · Blackmagic</option><option value="33" selected>33 点 · 通用</option></select></label><button class="btn btn-s btn-sm" onclick="exportActiveCube()">转换并下载 CUBE</button><a class="btn btn-s btn-sm" href="https://github.com/AcademySoftwareFoundation/OpenColorIO" target="_blank" rel="noopener">OpenColorIO</a></div>
        <p class="lut-export-note">效果图最长边限制为 1920px，适合预览、选片和像素蛋糕前置样片；不会覆盖原图，也不会保留原文件 EXIF。正式 RAW/Log 批处理仍应交给 DaVinci、Adobe Camera Raw 或 OpenColorIO。</p>
      </div></section>
      <section class="panel"><div class="p-head"><div><h2>LUT 怎么用</h2><p style="margin:.25rem 0 0;color:var(--t3);font-size:.72rem;">选择素材拍摄格式和最后处理软件，下面会明确告诉你是否必须先把 Log 还原为正常颜色。</p></div></div><div class="p-body"><div class="lut-delivery-controls"><label>素材拍摄格式<select id="open-lut-input" onchange="renderLutPipeline();renderOpenLutCatalog()"><option value="srgb-display">普通照片 / Rec.709</option><option value="sony-slog3-sgamut3cine">Sony S-Log3</option><option value="dji-dlogm">DJI D-Log M</option><option value="apple-log">Apple Log</option><option value="panasonic-vlog">Panasonic V-Log</option><option value="blackmagic-film-gen5">Blackmagic Film Gen 5</option></select></label><label>最后处理软件<select id="lut-software" onchange="renderLutPipeline();renderOpenLutCatalog()"><option value="davinci-resolve">DaVinci Resolve</option><option value="photoshop">Adobe Photoshop</option><option value="pixelcake">像素蛋糕</option><option value="blackmagic-camera">Blackmagic Camera</option></select></label></div><div id="lut-pipeline" class="lut-pipeline"></div><div id="lut-transform-list" class="lut-transform-list"></div></div></section>
      <section class="panel"><div class="p-head" style="justify-content:space-between;gap:.6rem;flex-wrap:wrap;"><div><h2>开源 LUT 目录</h2><p style="margin:.2rem 0 0;color:var(--t3);font-size:.7rem;">只收录许可证和输入色彩空间已核验的文件。</p></div><input id="open-lut-search" placeholder="搜索人像、街拍、黑白..." oninput="renderOpenLutCatalog()"></div><div class="p-body"><div id="open-lut-audit" class="workflow-health" style="margin-bottom:.65rem;"></div><details class="open-lut-source-audit"><summary>查看来源专业性、社区反馈和采用决策</summary><div id="open-lut-source-list"></div></details><div id="open-lut-list" class="open-lut-grid"></div></div></section>
      <section class="panel"><div class="p-head"><h2>已安装 LUT</h2><span id="lut-library-count" style="font-size:.72rem;color:var(--t3);"></span></div><div class="p-body" id="lut-library-list"></div></section>
    </div>`;
    settings.parentNode.insertBefore(tab, settings);
  }

  root.renderLutWorkspace = function () {
    const profiles = read(KEYS.lutMeta, []);
    const selectable = activeLut && !profiles.some(item => item.id === activeLut.id)
      ? [{ ...activeLut, title: LUT_FRIENDLY_NAMES[activeLut.id]?.[0] || activeLut.title, demo: true }, ...profiles]
      : profiles;
    const select = document.getElementById('lut-library-select');
    const selected = select?.value || activeLut?.id || '';
    if (select) select.innerHTML = `<option value="">选择 LUT</option>${selectable.map(item => `<option value="${esc(item.id)}" ${item.id === selected ? 'selected' : ''}>${esc(LUT_FRIENDLY_NAMES[item.id]?.[0] || item.title)}${item.demo ? ' · 示例' : ''}</option>`).join('')}`;
    const count = document.getElementById('lut-library-count');
    if (count) count.textContent = `${profiles.length} 个已导入文件`;
    const list = document.getElementById('lut-library-list');
    if (!list) return;
    list.innerHTML = profiles.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:.65rem;">${profiles.map(item => `<article style="padding:.75rem;border:1px solid var(--bd);border-radius:8px;background:var(--bg2);"><strong style="display:block;color:var(--t1);">${esc(item.title)}</strong><div style="margin-top:.3rem;font-size:.68rem;color:var(--t3);">${esc(item.filename)} · ${esc(item.size)}³ · ${esc(item.licenseClass || 'user-imported')}</div><button class="btn btn-s btn-sm" style="margin-top:.55rem;" onclick="applyLibraryLutToLatestPlan('${esc(item.id)}')">应用到最近方案</button></article>`).join('')}</div>` : '<p style="color:var(--t3);font-size:.75rem;">还没有 LUT。可直接导入标准 .cube 文件。</p>';
    root.renderOpenLutCatalog();
  };

  async function loadOpenLutCatalog() {
    try {
      const response = await fetch('assets/lut-library.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const catalog = await response.json();
      openLutCatalog = catalog.items || [];
      openLutSources = catalog.sources || [];
      lutSoftwareProfiles = catalog.softwareProfiles || [];
      lutInputTransforms = catalog.inputTransforms || [];
      const audit = document.getElementById('open-lut-audit');
      if (audit) audit.innerHTML = `<div>正式收录<br><strong>${catalog.itemCount || openLutCatalog.length} 个</strong></div><div>许可证<br><strong>MIT · Apache-2.0</strong></div><div>Log 输入<br><strong>5 类受控转换</strong></div><div>交付软件<br><strong>4 种工作流</strong></div>`;
      const sourceList = document.getElementById('open-lut-source-list');
      if (sourceList) sourceList.innerHTML = openLutSources.map(source => `<article><div><strong>${esc(source.id)}</strong><span class="eq-tag">${esc(source.license)}</span><span class="eq-tag">${esc(source.adoption)}</span></div><p>社区快照：${esc(source.starsSnapshot)} stars · ${esc(source.forksSnapshot)} forks · 审计 ${esc(source.auditedAt)}</p><p>${esc(source.notes)}</p><a href="${esc(source.repo)}" target="_blank">查看项目</a></article>`).join('');
      const preferences = workflowPreferences();
      const input = document.getElementById('open-lut-input');
      const software = document.getElementById('lut-software');
      if (input) input.value = preferences.inputTransform;
      if (software) software.value = preferences.software;
      root.renderLutWorkspace();
      root.renderLutPipeline();
      await initializeLutDemo();
    } catch (error) { addSystemMessage('开源 LUT 目录读取失败', error.message, 'LUT'); }
  }

  root.renderOpenLutCatalog = function () {
    const target = document.getElementById('open-lut-list');
    if (!target) return;
    const query = (document.getElementById('open-lut-search')?.value || '').trim().toLowerCase();
    const input = document.getElementById('open-lut-input')?.value || 'srgb-display';
    const softwareId = document.getElementById('lut-software')?.value || 'davinci-resolve';
    const software = lutSoftwareProfiles.find(item => item.id === softwareId);
    const installed = new Set(read(KEYS.lutMeta, []).map(item => item.id));
    const filtered = openLutCatalog.filter(item => {
      const inputMatch = input === 'panasonic-vlog' ? item.inputColorSpace === 'Panasonic V-Log / V-Gamut' : item.inputColorSpace === 'sRGB display-referred';
      const text = `${item.title} ${item.category} ${(item.tags || []).join(' ')} ${item.useCase}`.toLowerCase();
      return inputMatch && (!query || text.includes(query));
    });
    const requiresTransform = input !== 'srgb-display' && input !== 'panasonic-vlog';
    target.innerHTML = filtered.map(item => {
      const friendly = LUT_FRIENDLY_NAMES[item.id] || [item.title, item.useCase];
      return `<article class="open-lut-card"><canvas class="open-lut-preview" data-lut-preview="${esc(item.id)}" width="320" height="180" aria-label="${esc(friendly[0])}效果预览"></canvas><div class="open-lut-card__head"><div><strong>${esc(friendly[0])}</strong><small>${esc(item.title)}</small></div><span class="eq-tag">${esc(item.sourceLicense)}</span></div><p>${esc(friendly[1])}</p><dl><div><dt>输入</dt><dd>${esc(item.inputColorSpace)}</dd></div><div><dt>输出</dt><dd>${esc(item.outputColorSpace)}</dd></div><div><dt>${esc(software?.name || '目标')}</dt><dd>${software?.directCubeImport ? '可导入 CUBE' : '不直接导入 CUBE'}</dd></div><div><dt>许可</dt><dd>${item.commercialUse ? '允许商业使用，保留许可声明' : '限制使用'}</dd></div></dl><div class="open-lut-warning">${requiresTransform ? '先用对应相机的官方技术 LUT 还原正常颜色，再套这个创意 LUT。' : esc(item.warning)}</div><div class="open-lut-card__actions"><button class="btn ${installed.has(item.id) ? 'btn-p' : 'btn-s'} btn-sm" ${installed.has(item.id) ? 'disabled' : `onclick="installOpenLut('${esc(item.id)}')"`}>${installed.has(item.id) ? '已安装' : '安装到工作台'}</button><button class="btn btn-s btn-sm" onclick="previewCatalogLut('${esc(item.id)}')">放到上方对比</button><a class="btn btn-s btn-sm" href="${esc(item.fileUrl)}" download="${esc(item.filename)}">下载 .cube</a></div></article>`;
    }).join('') || '<p class="workflow-resource-empty">没有匹配的开源 LUT。</p>';
    renderOpenLutPreviews(filtered).catch(error => addSystemMessage('LUT 效果预览失败', error.message, 'LUT'));
  };

  root.renderLutPipeline = function () {
    const inputId = document.getElementById('open-lut-input')?.value || 'srgb-display';
    const softwareId = document.getElementById('lut-software')?.value || 'davinci-resolve';
    const transform = lutInputTransforms.find(item => item.id === inputId);
    const software = lutSoftwareProfiles.find(item => item.id === softwareId);
    const pipeline = document.getElementById('lut-pipeline');
    const transforms = document.getElementById('lut-transform-list');
    if (!pipeline || !transform || !software) return;
    const direct = software.directCubeImport;
    pipeline.innerHTML = `<div><span>1</span><strong>${esc(transform.label)}</strong><small>你的素材格式</small></div><i>→</i><div><span>2</span><strong>${transform.distributionMode === 'not-required' ? '颜色已经正常' : '先还原正常颜色'}</strong><small>${transform.modelRequired ? '使用相机官方技术 LUT' : esc(transform.outputColorSpace)}</small></div><i>→</i><div><span>3</span><strong>再选风格 LUT</strong><small>胶片、清新、黑白等效果</small></div><i>→</i><div><span>4</span><strong>${esc(software.name)}</strong><small>${direct ? '导入 .cube' : '成片/XMP 工作流'}</small></div>`;
    const action = transform.sourceUrl ? `<a class="btn btn-s btn-sm" href="${esc(transform.sourceUrl)}" target="_blank">打开官方来源</a>` : '';
    const statusLabels = { verified: '已核验', official: '官方来源', 'not-required': '无需还原', 'official-reference-required': '需官方文件', 'official-source-linked': '官方来源已链接', 'model-dependent': '需确认机型' };
    const isSony = inputId === 'sony-slog3-sgamut3cine';
    const explanation = isSony
      ? 'Sony S-Log3 对应的是技术还原流程，不是一种固定胶片滤镜。工作台不会用普通照片伪造 S-Log3 效果：请先从 Sony 官方页面取得与你机型、S-Gamut3.Cine 匹配的技术 LUT，还原后再套下方创意 LUT。'
      : transform.distributionMode === 'not-required'
        ? '普通照片或 Rec.709 视频颜色已经正常，可以直接选择下方创意 LUT。'
        : transform.instructions;
    transforms.innerHTML = `<article class="lut-transform-card"><div><strong>${esc(transform.label)} → ${esc(transform.outputColorSpace)}</strong><span class="eq-tag">${esc(statusLabels[transform.status] || transform.status)}</span></div><p>${esc(explanation)}</p>${action}</article><article class="lut-transform-card"><div><strong>${esc(software.name)} 中怎么用</strong><span class="eq-tag">${direct ? '.cube' : '效果图'}</span></div><p>${esc(software.workflow)}</p><a class="btn btn-s btn-sm" href="${esc(software.sourceUrl)}" target="_blank">查看官方说明</a></article><div class="lut-transform-visual"><figure class="is-log"><img src="assets/demo/references/pose-01.jpg" alt="Log 素材示意"><figcaption>${inputId === 'srgb-display' ? '正常源图' : 'Log 原片示意，非官方色彩模拟'}</figcaption></figure><figure><img src="assets/demo/references/pose-01.jpg" alt="还原正常颜色示意"><figcaption>技术还原后</figcaption></figure><figure><canvas id="lut-pipeline-creative" width="320" height="180"></canvas><figcaption>再套创意 LUT 的真实计算</figcaption></figure></div>`;
    renderPipelineCreativePreview().catch(() => {});
  };

  async function renderOpenLutPreviews(items) {
    await ensureDemoImages();
    await Promise.all(items.map(async item => {
      const canvas = document.querySelector(`[data-lut-preview="${CSS.escape(item.id)}"]`);
      if (!canvas) return;
      drawImageToCanvas(originalImage, canvas);
      if (item.inputColorSpace !== 'sRGB display-referred') {
        const context = canvas.getContext('2d');
        context.fillStyle = 'rgba(12,16,20,.62)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#fff'; context.font = '600 18px sans-serif'; context.textAlign = 'center';
        context.fillText('需要真实 V-Log 源片', canvas.width / 2, canvas.height / 2 - 4);
        context.font = '13px sans-serif'; context.fillText('普通照片不做虚假预览', canvas.width / 2, canvas.height / 2 + 20);
        return;
      }
      const profile = await loadCatalogLutProfile(item.id);
      applyLutToCanvas(profile, canvas, canvas, workflowPreferences().lutStrength);
    }));
  }

  async function renderPipelineCreativePreview() {
    await ensureDemoImages();
    const canvas = document.getElementById('lut-pipeline-creative');
    if (!canvas) return;
    drawImageToCanvas(originalImage, canvas);
    const profile = await loadCatalogLutProfile(DEFAULT_LUT_ID);
    applyLutToCanvas(profile, canvas, canvas, workflowPreferences().lutStrength);
  }

  async function initializeLutDemo() {
    await ensureDemoImages();
    activeLut = activeLut || await loadCatalogLutProfile(DEFAULT_LUT_ID);
    drawImageToCanvas(originalImage, document.getElementById('lut-library-original'));
    drawImageToCanvas(referenceImage, document.getElementById('lut-library-reference'));
    root.renderLutWorkspace();
    const select = document.getElementById('lut-library-select');
    if (select && activeLut) select.value = activeLut.id;
    await root.updateLibraryLutPreview(workflowPreferences().lutStrength);
  }

  root.installOpenLut = async function (catalogId, planId) {
    const item = openLutCatalog.find(candidate => candidate.id === catalogId);
    if (!item) { notify('LUT 目录尚未加载', 'er'); return; }
    try {
      const response = await fetch(item.fileUrl, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`下载失败 HTTP ${response.status}`);
      const parsed = Domain.parseCubeLut(await response.text());
      const profile = { ...parsed, ...item, parsedId: parsed.id, id: item.id, filename: item.filename, licenseClass: item.sourceLicense, installedAt: Domain.nowIso() };
      await Store.put('lutProfiles', profile);
      const meta = read(KEYS.lutMeta, []).filter(existing => existing.id !== item.id);
      meta.unshift({ ...item, importedAt: profile.installedAt, licenseClass: item.sourceLicense });
      write(KEYS.lutMeta, meta);
      if (planId) root.applyLutRecommendation(planId, item.id);
      root.renderLutWorkspace();
      notify(`已安装 ${item.title}`, 'ok');
      return profile;
    } catch (error) { notify(`LUT 安装失败：${error.message}`, 'er'); return null; }
  };

  root.selectLibraryLutProfile = async function (lutId) {
    activeLut = lutId ? await loadCatalogLutProfile(lutId) : null;
    root.updateLibraryLutPreview(document.getElementById('lut-library-strength')?.value || 100);
  };

  root.previewCatalogLut = async function (lutId) {
    await ensureDemoImages();
    activeLut = await loadCatalogLutProfile(lutId);
    root.renderLutWorkspace();
    const select = document.getElementById('lut-library-select');
    if (select) select.value = lutId;
    await root.updateLibraryLutPreview(document.getElementById('lut-library-strength')?.value || workflowPreferences().lutStrength);
    document.getElementById('tab-lut')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  root.loadLibraryLutImage = function (event, type) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const image = new Image();
    image.onload = () => {
      if (type === 'original') { originalImage = image; originalImageIsDemo = false; } else referenceImage = image;
      drawImageToCanvas(image, document.getElementById(`lut-library-${type}`));
      root.updateLibraryLutPreview(document.getElementById('lut-library-strength')?.value || 100);
      URL.revokeObjectURL(image.src);
    };
    image.src = URL.createObjectURL(file);
  };

  root.updateLibraryLutPreview = async function (strengthValue) {
    const label = document.getElementById('lut-library-strength-label');
    if (label) label.textContent = `${strengthValue}%`;
    const source = document.getElementById('lut-library-original');
    const output = document.getElementById('lut-library-output');
    if (!source || !output || !originalImage || !activeLut) return;
    if (originalImageIsDemo && activeLut.inputColorSpace && activeLut.inputColorSpace !== 'sRGB display-referred') {
      drawLogSourceNotice(source, output, activeLut.inputColorSpace);
      const analysis = document.getElementById('lut-library-analysis');
      if (analysis) analysis.textContent = `${activeLut.inputColorSpace} 专用 LUT 需要对应 Log 源片；普通示例图不做虚假效果计算。`;
      return;
    }
    applyLutToCanvas(activeLut, source, output, Number(strengthValue));
    const analysis = document.getElementById('lut-library-analysis');
    if (analysis) analysis.textContent = buildColorAnalysis(source, output, document.getElementById('lut-library-reference'));
  };

  function downloadBlob(blob, filename) {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  }

  root.applyDemoLutEffect = async function () {
    await ensureDemoImages();
    const id = DEFAULT_LUT_ID;
    const profile = await loadCatalogLutProfile(id);
    if (!profile) return;
    activeLut = profile;
    drawImageToCanvas(originalImage, document.getElementById('lut-library-original'));
    drawImageToCanvas(referenceImage, document.getElementById('lut-library-reference'));
    root.renderLutWorkspace();
    const select = document.getElementById('lut-library-select');
    if (select) select.value = id;
    const strength = document.getElementById('lut-library-strength');
    if (strength) strength.value = 65;
    await root.updateLibraryLutPreview(65);
    notify('日常客片 400 已套用，可替换自己的源图或直接导出示例', 'ok');
  };

  root.exportActiveCube = async function () {
    const valid = activeLut && Number.isInteger(Number(activeLut.size)) && Array.isArray(activeLut.data) && activeLut.data.length === Number(activeLut.size) ** 3;
    if (!valid) activeLut = await loadCatalogLutProfile(document.getElementById('lut-library-select')?.value || DEFAULT_LUT_ID);
    if (!activeLut) { notify('请先选择或导入一个 LUT', 'er'); return; }
    const size = Number(document.getElementById('lut-convert-size')?.value || 33);
    try {
      const text = Domain.serializeCubeLut(activeLut, size);
      const base = Domain.slug(activeLut.title || 'photoatelier-lut');
      downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${base}-${size}point.cube`);
      notify(`已导出 ${size} 点 CUBE`, 'ok');
    } catch (error) { notify(`CUBE 转换失败：${error.message}`, 'er'); }
  };

  root.exportLibraryLutImage = async function (mimeType) {
    if (!originalImage || !activeLut) { notify('请先添加原图并选择 LUT', 'er'); return; }
    const maxEdge = 1920;
    const scale = Math.min(1, maxEdge / Math.max(originalImage.naturalWidth || originalImage.width, originalImage.naturalHeight || originalImage.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((originalImage.naturalWidth || originalImage.width) * scale));
    canvas.height = Math.max(1, Math.round((originalImage.naturalHeight || originalImage.height) * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const strength = Number(document.getElementById('lut-library-strength')?.value || 100) / 100;
    notify('正在渲染效果图…', 'i');
    await new Promise(resolve => requestAnimationFrame(resolve));
    for (let index = 0; index < imageData.data.length; index += 4) {
      const rgb = Domain.sampleCube(activeLut, imageData.data[index] / 255, imageData.data[index + 1] / 255, imageData.data[index + 2] / 255, strength);
      imageData.data[index] = Math.round(rgb[0] * 255);
      imageData.data[index + 1] = Math.round(rgb[1] * 255);
      imageData.data[index + 2] = Math.round(rgb[2] * 255);
    }
    context.putImageData(imageData, 0, 0);
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, .92));
    if (!blob) { notify('效果图导出失败', 'er'); return; }
    downloadBlob(blob, `${Domain.slug(activeLut.title || 'photoatelier-effect')}-${Math.round(strength * 100)}.${extension}`);
    notify(`效果图已导出为 ${extension.toUpperCase()}`, 'ok');
  };

  root.applyLibraryLutToLatestPlan = function (lutId) {
    const plan = (root.getPlans ? root.getPlans() : read('pw_plans', []))[0];
    if (!plan) { notify('请先生成一个方案', 'er'); return; }
    plan.lutProfileId = lutId;
    updatePlan(plan);
    notify(`已应用到 ${plan.title}`, 'ok');
  };

  function renderPublishCard(item) {
    return `<article class="workflow-publish-card"><strong>${esc(item.label)}</strong><div>${esc(item.spec.ratio)} · ${esc(item.spec.duration)} · 标签 ${esc(item.spec.tagRange)}</div><div style="margin-top:.25rem;color:var(--t1);">${esc(item.title)}</div><div style="margin-top:.25rem;">${esc(item.keywords.slice(0, 7).join(' / '))}</div><button class="btn btn-s btn-sm" style="margin-top:.4rem;" onclick='copyPublishPackage(${JSON.stringify(item).replace(/'/g, "&#39;")})'>复制发布包</button></article>`;
  }

  root.setRelationDecision = function (planId, sourceId, action) {
    const all = read(KEYS.decisions, {});
    all[planId] = all[planId] || {};
    const next = all[planId][sourceId] || {};
    if (action === 'lock') next.locked = !next.locked;
    if (action === 'reject') next.rejected = !next.rejected;
    all[planId][sourceId] = next;
    write(KEYS.decisions, all);
    const plan = currentPlan(planId);
    if (plan) { updatePlan(plan); refreshCurrentPlan(plan); }
  };

  root.saveShootRecord = function (planId, shotId, patch) {
    const records = read(KEYS.shootRecords, []);
    const index = records.findIndex(item => String(item.planId) === String(planId) && item.shotId === shotId);
    const value = { ...(index >= 0 ? records[index] : {}), ...patch, id: index >= 0 ? records[index].id : `shoot-${planId}-${shotId}`, planId, shotId, updatedAt: Domain.nowIso() };
    if (index >= 0) records[index] = value; else records.push(value);
    write(KEYS.shootRecords, records);
    Store.put('shootRecords', value).catch(() => {});
    root.PhotoAtelierFeishu?.schedule();
  };

  root.saveShootSample = async function (event, planId, shotId) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const assetId = `sample-${planId}-${shotId}-${Domain.stableHash([file.name, file.size, file.lastModified])}`;
    await Store.put('assets', { id: assetId, type: 'shoot-sample', planId, shotId, title: file.name, size: file.size, mimeType: file.type, blob: file, validationStatus: 'local-private', updatedAt: Domain.nowIso() });
    root.saveShootRecord(planId, shotId, { sampleId: assetId, sampleName: file.name });
    notify('样片已保存在本地 IndexedDB', 'ok');
    const plan = currentPlan(planId); if (plan) refreshCurrentPlan(plan);
  };

  root.savePlanReview = function (planId) {
    const value = collectReview(planId);
    const reviews = read(KEYS.reviews, []);
    const index = reviews.findIndex(item => String(item.planId) === String(planId));
    if (index >= 0) reviews[index] = { ...reviews[index], ...value }; else reviews.unshift(value);
    write(KEYS.reviews, reviews);
    Store.put('reviews', value).catch(() => {});
    root.PhotoAtelierFeishu?.schedule();
    addSystemMessage('复盘已保存', `方案 ${currentPlan(planId)?.title || planId} 的复盘已进入知识回流队列。`, '复盘回流');
    notify('复盘已保存', 'ok');
  };

  function collectReview(planId) {
    const value = id => document.getElementById(`${id}-${planId}`)?.value || '';
    return {
      id: `review-${planId}`, planId, bestPoses: value('review-best'), failedActions: value('review-failed'),
      lightingIssues: value('review-light'), finalGrade: value('review-grade'), keepRate: Number(value('review-rate')) || 0,
      clientFeedback: value('review-feedback'), reusableInsights: value('review-insight'), updatedAt: Domain.nowIso()
    };
  }

  root.returnReviewToObsidian = async function (planId) {
    root.savePlanReview(planId);
    const review = read(KEYS.reviews, []).find(item => String(item.planId) === String(planId));
    const plan = currentPlan(planId);
    try {
      const response = await fetch(`${proxyBase()}/v1/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: { id: plan.id, title: plan.title, input: plan.input }, review })
      });
      if (!response.ok) throw new Error((await response.json()).error || `HTTP ${response.status}`);
      const result = await response.json();
      const reviews = read(KEYS.reviews, []);
      const index = reviews.findIndex(item => String(item.planId) === String(planId));
      reviews[index] = { ...reviews[index], returnedToObsidian: true, obsidianFile: result.filename, returnedAt: Domain.nowIso() };
      write(KEYS.reviews, reviews);
      await Store.put('reviews', reviews[index]);
      notify('复盘已回流到 Obsidian', 'ok');
      refreshCurrentPlan(plan);
    } catch (error) { notify(`回流失败：${error.message}`, 'er'); }
  };

  root.setScheduleWorkflowStatus = function (scheduleId, status) {
    const schedules = read(KEYS.schedules, []);
    const index = schedules.findIndex(item => String(item.id) === String(scheduleId));
    if (index < 0) return;
    schedules[index] = { ...schedules[index], status, updatedAt: Domain.nowIso() };
    write(KEYS.schedules, schedules);
    Store.put('schedules', schedules[index]).catch(() => {});
    root.PhotoAtelierFeishu?.schedule();
    root.renderSchedules && root.renderSchedules();
  };

  const PREP_ITEMS = [
    ['brief', '方案确认'], ['equipment', '设备装包'], ['location', '场地确认'],
    ['batteries', '电池充满'], ['cards', '存储卡清空'], ['contacts', '人员通知']
  ];

  function renderSelectedCalendarDay() {
    const target = document.getElementById('calendarDayDetail');
    if (!target) return;
    const date = selectedCalendarDate || localDateString(new Date());
    const schedules = read(KEYS.schedules, []).filter(item => item.date === date).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    const title = new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    target.innerHTML = `<div class="calendar-day-detail__head"><div><span>SELECTED DAY</span><h3>${esc(title)}</h3></div><button class="btn btn-s btn-sm" onclick="openManualScheduleForDate('${esc(date)}')">添加日程</button></div><div class="calendar-day-detail__items">${schedules.length ? schedules.map(item => `<article><time>${esc(item.time || '时间待定')}</time><div><strong>${esc(item.title || '未命名拍摄')}</strong><p>${esc(item.location || '地点待定')}</p></div><span>${esc(Domain.SCHEDULE_STATUSES.find(status => status.id === (item.status || 'scheduled'))?.label || '已安排')}</span>${item.planId ? `<button class="btn btn-s btn-sm" onclick="loadPlan('${esc(item.planId)}')">打开方案</button>` : ''}</article>`).join('') : '<p>这一天还没有拍摄安排。</p>'}</div>`;
  }

  function renderWorkflowCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstDay.getDay());
    const schedules = read(KEYS.schedules, []);
    const today = localDateString(new Date());
    const monthLabel = document.getElementById('calendarMonthLabel');
    if (monthLabel) monthLabel.textContent = `${year} 年 ${month + 1} 月`;
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    let html = days.map(day => `<div class="calendar-header">${day}</div>`).join('');
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const dateStr = localDateString(date);
      const events = schedules.filter(item => item.date === dateStr);
      const classes = ['calendar-day'];
      if (date.getMonth() !== month) classes.push('other-month');
      if (dateStr === today) classes.push('today');
      if (dateStr === selectedCalendarDate) classes.push('is-selected');
      html += `<button type="button" class="${classes.join(' ')}" data-date="${dateStr}" aria-label="${dateStr}${events.length ? `，${events.length} 项日程` : ''}" onclick="selectCalendarDate('${dateStr}')"><span class="calendar-day-num">${date.getDate()}</span>${events.length ? `<span class="calendar-event-count">${events.length}</span><small>${esc(events[0].title || '拍摄')}</small>` : ''}</button>`;
    }
    grid.innerHTML = html;
    renderSelectedCalendarDay();
  }

  function installCalendarController() {
    selectedCalendarDate = selectedCalendarDate || localDateString(new Date());
    root.renderCalendar = renderWorkflowCalendar;
    root.selectCalendarDate = function (dateStr) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return;
      selectedCalendarDate = dateStr;
      calendarViewDate = new Date(`${dateStr}T00:00:00`);
      renderWorkflowCalendar();
    };
    root.showDaySchedules = root.selectCalendarDate;
    root.changeCalendarMonth = function (delta) {
      calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + Number(delta || 0), 1);
      renderWorkflowCalendar();
    };
    root.showCalendarToday = function () {
      selectedCalendarDate = localDateString(new Date());
      calendarViewDate = new Date();
      renderWorkflowCalendar();
    };
    root.openManualScheduleForDate = function (dateStr) {
      root.addSchedule?.();
      const input = document.getElementById('schedDate');
      if (input) input.value = dateStr;
    };
    if (typeof root.deleteSchedule !== 'function') {
      root.deleteSchedule = function (scheduleId) {
        const schedules = read(KEYS.schedules, []);
        const deleted = schedules.find(item => String(item.id) === String(scheduleId));
        if (!deleted || !confirm(`确定删除“${deleted.title || '这项日程'}”吗？`)) return null;
        write(KEYS.schedules, schedules.filter(item => String(item.id) !== String(scheduleId)));
        if (deleted.planId) {
          const plan = currentPlan(deleted.planId);
          if (plan) {
            plan.lifecycleStatus = 'confirmed';
            plan.lifecycleUpdatedAt = Domain.nowIso();
            delete plan.scheduleId;
            updatePlan(plan);
          }
        }
        renderWorkflowCalendar();
        root.renderSchedules?.();
        notify('日程已删除，关联方案已回到方案库', 'ok');
        return deleted;
      };
    }
  }

  function enhanceScheduleMarkup() {
    const host = document.querySelector('#tab-calendar > div');
    if (!host || document.getElementById('scheduleWorkflowBoard')) return;
    const grid = document.getElementById('calendarGrid');
    if (grid && !document.getElementById('calendarToolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'calendarToolbar';
      toolbar.className = 'calendar-toolbar';
      toolbar.innerHTML = `<div><button type="button" class="btn-i2" aria-label="上个月" title="上个月" onclick="changeCalendarMonth(-1)">‹</button><strong id="calendarMonthLabel"></strong><button type="button" class="btn-i2" aria-label="下个月" title="下个月" onclick="changeCalendarMonth(1)">›</button></div><button type="button" class="btn btn-s btn-sm" onclick="showCalendarToday()">今天</button>`;
      grid.parentNode.insertBefore(toolbar, grid);
      const detail = document.createElement('section');
      detail.id = 'calendarDayDetail';
      detail.className = 'calendar-day-detail';
      grid.parentNode.insertBefore(detail, grid.nextSibling);
    }
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.style.marginBottom = '1rem';
    panel.innerHTML = '<div class="p-head"><div><h2>拍摄执行看板</h2><p style="margin:.2rem 0 0;color:var(--t3);font-size:.72rem;">从准备、拍摄到选片交付，全部沿用同一个 planId。</p></div></div><div class="p-body" id="scheduleWorkflowBoard"></div>';
    host.insertBefore(panel, host.firstChild);
  }

  function renderScheduleWorkflowBoard() {
    const target = document.getElementById('scheduleWorkflowBoard');
    if (!target) return;
    const schedules = read(KEYS.schedules, []);
    const plans = root.getPlans ? root.getPlans() : read('pw_plans', []);
    const records = read(KEYS.shootRecords, []);
    target.innerHTML = `<div class="schedule-board">${Domain.SCHEDULE_STATUSES.map(status => {
      const items = schedules.filter(item => (item.status || 'scheduled') === status.id);
      return `<section class="schedule-board__column"><header><strong>${esc(status.label)}</strong><span>${items.length}</span></header><div class="schedule-board__items">${items.map(item => {
        const plan = plans.find(candidate => String(candidate.id) === String(item.planId));
        const shots = plan && typeof root.generateShotList === 'function' ? root.generateShotList(plan) : [];
        const completed = records.filter(record => String(record.planId) === String(item.planId) && record.completed).length;
        const checklist = item.preparation || {};
        const prepDone = PREP_ITEMS.filter(([key]) => checklist[key]).length;
        return `<article class="schedule-board__card"><strong>${esc(item.title || plan?.title || '未命名拍摄')}</strong><div class="schedule-board__meta">${esc(item.date || '日期未定')} ${esc(item.time || '')}<br>${esc(item.location || '地点未定')} · 镜头 ${completed}/${shots.length}</div><div class="schedule-prep">${PREP_ITEMS.map(([key, label]) => `<button class="${checklist[key] ? 'is-done' : ''}" onclick="toggleSchedulePreparation('${esc(item.id)}','${key}')">${checklist[key] ? '✓' : '○'} ${label}</button>`).join('')}</div><div class="schedule-board__footer"><span>准备 ${prepDone}/${PREP_ITEMS.length}</span><select onchange="setScheduleWorkflowStatus('${esc(item.id)}',this.value)">${Domain.SCHEDULE_STATUSES.map(option => `<option value="${option.id}" ${option.id === status.id ? 'selected' : ''}>${option.label}</option>`).join('')}</select></div></article>`;
      }).join('') || '<p>暂无</p>'}</div></section>`;
    }).join('')}</div>`;
  }

  root.toggleSchedulePreparation = function (scheduleId, key) {
    const schedules = read(KEYS.schedules, []);
    const index = schedules.findIndex(item => String(item.id) === String(scheduleId));
    if (index < 0) return;
    const preparation = { ...(schedules[index].preparation || {}) };
    preparation[key] = !preparation[key];
    schedules[index] = { ...schedules[index], preparation, updatedAt: Domain.nowIso() };
    write(KEYS.schedules, schedules);
    Store.put('schedules', schedules[index]).catch(() => {});
    root.PhotoAtelierFeishu?.schedule();
    root.renderSchedules?.();
  };

  root.openPlanVersions = function (planId) {
    const list = read(KEYS.versions, {})[planId] || [];
    const text = list.length ? list.map((item, index) => `${index + 1}. ${new Date(item.createdAt).toLocaleString()} · ${item.reason} · ${item.snapshot.workflowStatus || '方案'}`).join('\n') : '当前方案还没有版本快照。';
    alert(text);
  };

  root.openLatestPlanVersions = function () {
    const plan = (root.getPlans ? root.getPlans() : read('pw_plans', []))[0];
    if (!plan) { notify('当前还没有方案版本', 'er'); return; }
    root.openPlanVersions(plan.id);
  };

  root.copyPublishPackage = function (item) {
    const text = [`${item.label}｜${item.title}`, `封面：${item.coverText}`, `规格：${item.spec.ratio} · ${item.spec.duration}`, `关键词：${item.keywords.join(' / ')}`, `Alt：${item.altText}`, ...item.captionOutline.map((line, index) => `${index + 1}. ${line}`)].join('\n');
    navigator.clipboard.writeText(text).then(() => notify('发布包已复制', 'ok'));
  };

  root.importCubeLut = function (event, planId) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        activeLut = Domain.parseCubeLut(reader.result);
        activeLut.filename = file.name;
        activeLut.licenseClass = 'user-imported';
        await Store.put('lutProfiles', activeLut);
        const meta = read(KEYS.lutMeta, []).filter(item => item.id !== activeLut.id);
        meta.unshift({ id: activeLut.id, title: activeLut.title, filename: file.name, size: activeLut.size, importedAt: activeLut.importedAt, licenseClass: activeLut.licenseClass });
        write(KEYS.lutMeta, meta);
        const plan = planId ? currentPlan(planId) : null;
        if (plan) { plan.lutProfileId = activeLut.id; plan.postProductionStatus = 'manual-preview'; updatePlan(plan); }
        root.PhotoAtelierFeishu?.schedule();
        notify(`已导入 ${activeLut.title}`, 'ok');
        if (plan) refreshCurrentPlan(plan);
        root.renderLutWorkspace?.();
      } catch (error) { notify(error.message, 'er'); }
    };
    reader.readAsText(file);
  };

  root.selectLutProfile = async function (planId, lutId) {
    activeLut = lutId ? await loadCatalogLutProfile(lutId) : null;
    const plan = currentPlan(planId); plan.lutProfileId = lutId; plan.postProductionStatus = lutId ? 'manual-preview' : 'specialist-required'; updatePlan(plan);
    root.updateLutPreview(planId, document.getElementById(`lut-strength-${planId}`)?.value || 100);
  };

  root.loadLutImage = function (event, type, planId) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const image = new Image();
    image.onload = () => {
      if (type === 'original') { originalImage = image; originalImageIsDemo = false; } else referenceImage = image;
      drawImageToCanvas(image, document.getElementById(`lut-${type}-${planId}`));
      root.updateLutPreview(planId, document.getElementById(`lut-strength-${planId}`)?.value || 100);
      URL.revokeObjectURL(image.src);
    };
    image.src = URL.createObjectURL(file);
  };

  root.updateLutPreview = async function (planId, strengthValue, persist = true) {
    const label = document.getElementById(`lut-strength-label-${planId}`);
    if (label) label.textContent = `${strengthValue}%`;
    const plan = currentPlan(planId);
    if (plan && persist) { plan.lutStrength = Number(strengthValue); updatePlan(plan); }
    if ((!activeLut || (plan?.lutProfileId && activeLut.id !== plan.lutProfileId)) && plan) activeLut = await loadCatalogLutProfile(plan.lutProfileId || DEFAULT_LUT_ID);
    const source = document.getElementById(`lut-original-${planId}`);
    const output = document.getElementById(`lut-output-${planId}`);
    if (!source || !output || !originalImage || !activeLut) return;
    if (originalImageIsDemo && activeLut.inputColorSpace && activeLut.inputColorSpace !== 'sRGB display-referred') {
      drawLogSourceNotice(source, output, activeLut.inputColorSpace);
      const analysis = document.getElementById(`lut-analysis-${planId}`);
      if (analysis) analysis.textContent = `${activeLut.inputColorSpace} 专用 LUT：请上传对应 Log 源片后再计算，当前普通示例图不会被错误套用。`;
      return;
    }
    applyLutToCanvas(activeLut, source, output, Number(strengthValue));
    const analysis = document.getElementById(`lut-analysis-${planId}`);
    if (analysis) analysis.textContent = `${plan?.lutProfileId ? '通用预览已选，最终后期仍需专项确认。' : '示例效果，未写入当前方案。'} ${buildColorAnalysis(source, output, document.getElementById(`lut-reference-${planId}`))}`;
  };

  root.initializePlanLutPreview = async function (planId) {
    const plan = currentPlan(planId);
    if (!plan) return;
    await ensureDemoImages();
    activeLut = await loadCatalogLutProfile(plan.lutProfileId || DEFAULT_LUT_ID);
    drawImageToCanvas(originalImage, document.getElementById(`lut-original-${planId}`));
    drawImageToCanvas(referenceImage, document.getElementById(`lut-reference-${planId}`));
    const strength = plan.lutStrength == null ? workflowPreferences().lutStrength : plan.lutStrength;
    await root.updateLutPreview(planId, strength, false);
    const packageCanvas = document.getElementById(`plan-package-lut-${planId}`);
    if (packageCanvas) {
      drawImageToCanvas(originalImage, packageCanvas);
      if (activeLut && originalImageIsDemo && activeLut.inputColorSpace && activeLut.inputColorSpace !== 'sRGB display-referred') drawLogSourceNotice(packageCanvas, packageCanvas, activeLut.inputColorSpace);
      else if (activeLut) applyLutToCanvas(activeLut, packageCanvas, packageCanvas, strength);
    }
  };

  function drawLogSourceNotice(source, output, inputColorSpace) {
    const context = output.getContext('2d');
    if (source !== output) context.drawImage(source, 0, 0, output.width, output.height);
    context.fillStyle = 'rgba(8,12,16,.68)';
    context.fillRect(0, 0, output.width, output.height);
    context.fillStyle = '#fff'; context.textAlign = 'center'; context.font = '600 15px sans-serif';
    context.fillText('需要对应 Log 源片', output.width / 2, output.height / 2 - 5);
    context.font = '11px sans-serif';
    context.fillText(String(inputColorSpace).slice(0, 32), output.width / 2, output.height / 2 + 16);
  }

  function applyLutToCanvas(profile, source, output, strengthValue) {
    if (!profile || !Number.isInteger(Number(profile.size)) || !Array.isArray(profile.data) || profile.data.length !== Number(profile.size) ** 3 || !source || !output) return;
    const sourceContext = source.getContext('2d', { willReadFrequently: true });
    const outputContext = output.getContext('2d');
    const imageData = sourceContext.getImageData(0, 0, source.width, source.height);
    const pixels = imageData.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const rgb = Domain.sampleCube(profile, pixels[index] / 255, pixels[index + 1] / 255, pixels[index + 2] / 255, Number(strengthValue) / 100);
      pixels[index] = Math.round(rgb[0] * 255);
      pixels[index + 1] = Math.round(rgb[1] * 255);
      pixels[index + 2] = Math.round(rgb[2] * 255);
    }
    outputContext.putImageData(imageData, 0, 0);
  }

  function drawImageToCanvas(image, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale, height = image.height * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }
  function colorStats(canvas) {
    if (!canvas) return null;
    const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 40) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count += 1; }
    if (!count) return null;
    r /= count; g /= count; b /= count;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return { r, g, b, luma: .2126 * r + .7152 * g + .0722 * b, saturation: max ? (max - min) / max * 100 : 0 };
  }
  function buildColorAnalysis(source, output, reference) {
    const before = colorStats(source), after = colorStats(output), target = referenceImage ? colorStats(reference) : null;
    if (!before || !after) return '等待图像分析。';
    const base = `LUT 后亮度 ${after.luma >= before.luma ? '提高' : '降低'} ${Math.abs(after.luma - before.luma).toFixed(0)}，饱和度变化 ${(after.saturation - before.saturation).toFixed(0)}。`;
    if (!target) return `${base} 添加参考图可比较目标色彩。`;
    return `${base} 与参考图亮度差 ${Math.abs(after.luma - target.luma).toFixed(0)}，饱和度差 ${Math.abs(after.saturation - target.saturation).toFixed(0)}；这是色彩匹配，不改变人物与构图。`;
  }

  function refreshCurrentPlan(plan) {
    if (!plan || !document.getElementById('outCnt') || typeof root.renderPlanContent !== 'function') return;
    root.currentPlanData = plan;
    document.getElementById('outCnt').innerHTML = root.renderPlanContent(plan);
    setTimeout(() => root.initializePlanLutPreview?.(plan.id), 0);
  }

  function addSystemMessage(name, message, serviceType, status) {
    const messages = read(KEYS.messages, []).filter(item => item.name !== '测试客户');
    const id = `system-${Domain.stableHash([name, message])}`;
    if (!messages.some(item => item.id === id)) messages.unshift({ id, name, email: 'local@photoatelier', phone: '', service_type: serviceType || '系统提醒', message, status: status || 'new', created_at: Domain.nowIso(), source: 'workflow' });
    write(KEYS.messages, messages.slice(0, 100));
    Store.bulkPut('messages', messages.slice(0, 100)).catch(() => {});
    root.PhotoAtelierFeishu?.schedule();
  }

  async function seedIndexedDb() {
    try {
      const [refs, workflows] = await Promise.all([fetch('assets/reference-database.json').then(r => r.json()), fetch('assets/workflow-database.json').then(r => r.json())]);
      const deduped = Domain.deduplicateAssets(refs.items || []);
      referenceImageCatalog = deduped.items.filter(item => item.kind === 'local_image' && /\.(png|jpe?g|webp)$/i.test(item.sourceFile || (item.materialUrls || [])[0] || ''));
      await Store.bulkPut('assets', deduped.items.map(item => ({ ...item, id: String(item.id), validationStatus: item.sourceUrl || item.sourceFile ? 'reviewed' : 'needs-details' })));
      await Store.bulkPut('topics', workflows.topics || []);
      await Store.put('meta', { id: 'seed-status', referenceCount: deduped.items.length, duplicateCount: deduped.duplicates.length, topicCount: (workflows.topics || []).length, seededAt: Domain.nowIso() });
    } catch (error) { addSystemMessage('素材种子载入失败', error.message || String(error), '数据健康'); }
  }

  async function hydrateReferenceImageCatalog() {
    if (!root.getObsidianSettings?.().enabled) return;
    try {
      const folder = root.getObsidianSettings?.().libraryFolder || '摄影姿势库';
      const params = new URLSearchParams({ query: '', type: 'asset', orientation: 'all', workflowStage: 'all', libraryFolder: folder, limit: '100' });
      const response = await fetch(`${proxyBase()}/v1/search?${params}`, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const metadataByFile = new Map(referenceImageCatalog.map(item => [String(item.sourceFile || (item.materialUrls || [])[0] || '').replace(/\\/g, '/').toLowerCase(), item]));
      referenceImageCatalog = (payload.items || []).filter(item => item.type === 'asset').map(item => {
        const key = String(item.filename || '').replace(/\\/g, '/').toLowerCase();
        const metadata = metadataByFile.get(key) || {};
        return { ...metadata, ...item, id: item.id, proxyAssetId: item.id, kind: 'local_image', sourceFile: item.filename, materialUrls: [item.filename], platform: 'Obsidian 本地', licenseClass: metadata.licenseClass || item.licenseClass || 'local-private-reference' };
      });
    } catch (_) {}
  }

  function enhanceSettingsMarkup() {
    const grid = document.querySelector('#tab-settings .settings-grid');
    if (!grid) return;
    let section = document.getElementById('workflowDataHealth')?.closest('.fg');
    if (!section) {
      section = document.createElement('div');
      section.className = 'fg';
      section.innerHTML = `<details><summary style="color:var(--t3);cursor:pointer;font-size:.74rem;">系统诊断（高级）</summary><div style="margin-top:.65rem;"><div class="workflow-health" id="workflowDataHealth"><div>正在检查本机数据…</div><div>正在检查个人图库…</div><div>正在检查候选内容…</div></div><div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;"><button class="btn btn-s btn-sm" onclick="rebuildLocalIndex()">更新个人图库</button><button class="btn btn-s btn-sm" onclick="runDailyResearch()">运行每日检索</button><button class="btn btn-s btn-sm" onclick="refreshWorkflowHealth()">刷新状态</button></div></div></details>`;
    }
    const obsidian = document.getElementById('settingsObsidianUrl')?.closest('.fg');
    if (!section.isConnected) {
      if (obsidian && obsidian.nextSibling) obsidian.parentNode.insertBefore(section, obsidian.nextSibling); else grid.appendChild(section);
    }
    enhanceWorkflowPreferences(grid, section);
    enhanceFeishuSettings(grid, section);
  }

  function enhanceWorkflowPreferences(grid, anchor) {
    if (document.getElementById('settingsWorkflowDefaults')) return;
    const preferences = workflowPreferences();
    const section = document.createElement('div');
    section.className = 'fg';
    section.id = 'settingsWorkflowDefaults';
    section.innerHTML = `<label>拍摄工作流默认值</label><div class="workflow-preference-grid"><label>默认素材格式<select id="settingsDefaultInput"><option value="srgb-display">普通照片 / Rec.709</option><option value="sony-slog3-sgamut3cine">Sony S-Log3</option><option value="dji-dlogm">DJI D-Log M</option><option value="apple-log">Apple Log</option><option value="panasonic-vlog">Panasonic V-Log</option><option value="blackmagic-film-gen5">Blackmagic Film Gen 5</option></select></label><label>默认处理软件<select id="settingsDefaultSoftware"><option value="davinci-resolve">DaVinci Resolve</option><option value="photoshop">Adobe Photoshop</option><option value="pixelcake">像素蛋糕</option><option value="blackmagic-camera">Blackmagic Camera</option></select></label><label>默认 LUT 强度<input id="settingsDefaultLutStrength" type="number" min="0" max="100" value="${esc(preferences.lutStrength)}"></label><label>方案库保留数量<input id="settingsPlanLibraryLimit" type="number" min="10" max="200" value="${esc(preferences.planLibraryLimit)}"></label><label class="workflow-preference-toggle"><input id="settingsAutoReferences" type="checkbox" ${preferences.autoReferences ? 'checked' : ''}>生成后自动匹配参考图</label></div><div class="workflow-preference-actions"><button class="btn btn-p btn-sm" onclick="saveWorkflowPreferences()">保存默认值</button><button class="btn btn-s btn-sm" onclick="resetWorkflowPreferences()">恢复推荐值</button><span>日程始终需要手动确认日期、时间和地点。</span></div>`;
    section.querySelector('#settingsDefaultInput').value = preferences.inputTransform;
    section.querySelector('#settingsDefaultSoftware').value = preferences.software;
    if (anchor?.nextSibling) grid.insertBefore(section, anchor.nextSibling); else grid.appendChild(section);
  }

  root.saveWorkflowPreferences = async function () {
    const preferences = {
      inputTransform: document.getElementById('settingsDefaultInput')?.value || DEFAULT_PREFERENCES.inputTransform,
      software: document.getElementById('settingsDefaultSoftware')?.value || DEFAULT_PREFERENCES.software,
      lutStrength: Math.max(0, Math.min(100, Number(document.getElementById('settingsDefaultLutStrength')?.value || DEFAULT_PREFERENCES.lutStrength))),
      autoReferences: Boolean(document.getElementById('settingsAutoReferences')?.checked),
      autoSchedule: false,
      planLibraryLimit: Math.max(10, Math.min(200, Number(document.getElementById('settingsPlanLibraryLimit')?.value || DEFAULT_PREFERENCES.planLibraryLimit)))
    };
    write(KEYS.preferences, preferences);
    const input = document.getElementById('open-lut-input'); if (input) input.value = preferences.inputTransform;
    const software = document.getElementById('lut-software'); if (software) software.value = preferences.software;
    const strength = document.getElementById('lut-library-strength'); if (strength) strength.value = preferences.lutStrength;
    root.renderLutPipeline?.(); root.renderOpenLutCatalog?.(); root.renderPlanLibrary?.();
    await root.updateLibraryLutPreview?.(preferences.lutStrength);
    notify('工作流默认值已保存', 'ok');
  };

  root.resetWorkflowPreferences = function () {
    write(KEYS.preferences, DEFAULT_PREFERENCES);
    document.getElementById('settingsWorkflowDefaults')?.remove();
    enhanceWorkflowPreferences(document.querySelector('#tab-settings .settings-grid'), document.getElementById('workflowDataHealth')?.closest('.fg'));
    notify('已恢复推荐默认值', 'ok');
  };

  function enhanceFeishuSettings(grid, anchor) {
    const Feishu = root.PhotoAtelierFeishu;
    if (!Feishu || document.getElementById('settingsFeishuApiBase')) return;
    const config = Feishu.settings();
    const section = document.createElement('div');
    section.className = 'fg';
    section.innerHTML = `<details><summary style="color:var(--t3);cursor:pointer;font-size:.74rem;">飞书多维表格同步（可选）</summary>
      <div style="display:grid;gap:.5rem;margin-top:.65rem;">
        <input id="settingsFeishuApiBase" value="${esc(config.apiBase)}" placeholder="Worker API 地址">
        <input id="settingsFeishuSyncToken" type="password" value="${esc(config.token)}" placeholder="本机同步密钥">
        <div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:center;font-size:.75rem;color:var(--t2);">
          <label style="display:flex;align-items:center;gap:.35rem;"><input id="settingsFeishuEnabled" type="checkbox" ${config.enabled ? 'checked' : ''}>启用飞书同步</label>
          <label style="display:flex;align-items:center;gap:.35rem;"><input id="settingsFeishuAuto" type="checkbox" ${config.auto ? 'checked' : ''}>保存后自动推送</label>
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;">
          <button class="btn btn-s btn-sm" onclick="saveFeishuSettings()">保存连接</button>
          <button class="btn btn-s btn-sm" onclick="testFeishuConnection()">测试连接</button>
          <button class="btn btn-p btn-sm" id="feishuSyncButton" onclick="syncFeishuNow()">立即双向同步</button>
        </div>
        <div id="feishuSyncStatus" class="workflow-health"><div>连接状态<br><strong>尚未检查</strong></div><div>上次同步<br><strong>${config.lastSync ? new Date(config.lastSync).toLocaleString() : '尚未同步'}</strong></div><div>同步范围<br><strong>8 张业务表</strong></div></div>
      </div></details>`;
    if (anchor?.nextSibling) grid.insertBefore(section, anchor.nextSibling); else grid.appendChild(section);
  }

  function setFeishuStatus(state, detail) {
    const target = document.getElementById('feishuSyncStatus');
    const button = document.getElementById('feishuSyncButton');
    if (button) button.disabled = state === 'syncing';
    if (!target) return;
    const config = root.PhotoAtelierFeishu?.settings() || {};
    const labels = { syncing: '同步中', ok: '已连接', warning: '部分完成', error: '连接失败' };
    const push = detail?.result?.push;
    const summary = push ? `新建 ${push.created} / 更新 ${push.updated} / 跳过 ${push.skipped}` : (detail?.message || '等待操作');
    target.innerHTML = `<div>连接状态<br><strong>${labels[state] || '尚未检查'}</strong></div><div>同步结果<br><strong>${esc(summary)}</strong></div><div>上次同步<br><strong>${config.lastSync ? new Date(config.lastSync).toLocaleString() : '尚未同步'}</strong></div>`;
  }

  root.saveFeishuSettings = function () {
    const config = root.PhotoAtelierFeishu.saveSettings({
      apiBase: document.getElementById('settingsFeishuApiBase')?.value || '',
      token: document.getElementById('settingsFeishuSyncToken')?.value || '',
      enabled: Boolean(document.getElementById('settingsFeishuEnabled')?.checked),
      auto: Boolean(document.getElementById('settingsFeishuAuto')?.checked)
    });
    notify(config.enabled ? '飞书同步设置已保存' : '飞书同步保持关闭', 'ok');
    return config;
  };

  root.testFeishuConnection = async function () {
    root.saveFeishuSettings();
    try {
      const health = await root.PhotoAtelierFeishu.health();
      if (!health.feishuConfigured) throw new Error('Worker 尚未配置飞书');
      if (root.PhotoAtelierFeishu.settings().enabled) await root.PhotoAtelierFeishu.listEntity('projects');
      setFeishuStatus('ok', { message: 'Worker 与飞书均可用' });
      notify('Worker 与飞书多维表格连接正常', 'ok');
    } catch (error) {
      setFeishuStatus('error', { message: error.message });
      notify(`飞书连接失败：${error.message}`, 'er');
    }
  };

  root.syncFeishuNow = async function () {
    root.saveFeishuSettings();
    setFeishuStatus('syncing');
    try {
      const result = await root.PhotoAtelierFeishu.syncAll({ pull: true });
      setFeishuStatus(result.ok ? 'ok' : 'warning', { result });
      notify(`飞书同步完成：新建 ${result.push.created}，更新 ${result.push.updated}`, result.ok ? 'ok' : 'er');
      root.renderSchedules?.();
      root.renderMessages?.();
      root.renderHistFull?.();
    } catch (error) {
      setFeishuStatus('error', { message: error.message });
      notify(`飞书同步失败：${error.message}`, 'er');
    }
  };

  root.addEventListener('photoatelier:sync-state', event => setFeishuStatus(event.detail?.state, event.detail));

  function enhanceReferenceMarkup() {
    const host = document.querySelector('#tab-reference .reference-advanced-tools__body > div');
    if (!root.getObsidianSettings?.().enabled || !host || document.getElementById('liveLocalLibrary')) return;
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = 'liveLocalLibrary';
    panel.style.marginBottom = '1rem';
    panel.innerHTML = `<div class="p-head" style="justify-content:space-between;gap:.75rem;flex-wrap:wrap;"><div><h2>本地真实参考图</h2><div style="font-size:.72rem;color:var(--t3);margin-top:.2rem;">直接读取 Obsidian 图片、附件和基础 EXIF；显示真实缩略图，不复制原图。</div></div><button class="btn btn-s btn-sm" onclick="rebuildLocalIndex()">重建索引</button></div><div class="p-body"><div style="display:grid;grid-template-columns:minmax(220px,1.4fr) repeat(3,minmax(130px,.65fr)) auto;gap:.5rem;align-items:center;"><input id="liveLocalQuery" placeholder="搜索姿势、场景、光线、相机或镜头"><select id="liveLocalType"><option value="asset" selected>只看图片</option><option value="all">图片和笔记</option><option value="document">只看笔记</option></select><select id="liveLocalOrientation"><option value="all">全部方向</option><option value="portrait">竖图</option><option value="landscape">横图</option><option value="square">方图</option></select><select id="liveLocalStage"><option value="all">全部阶段</option><option value="inspiration">灵感</option><option value="shot-planning">拍摄规划</option><option value="color-grading">调色</option><option value="publishing">发布</option><option value="review">复盘</option></select><button class="btn btn-p btn-sm" onclick="searchLiveLocalAssets()">搜索</button></div><div id="liveLocalMeta" style="margin-top:.6rem;font-size:.72rem;color:var(--t3);"></div><div id="liveLocalResults" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:.65rem;margin-top:.65rem;"></div></div>`;
    panel.querySelector('.p-body')?.insertAdjacentHTML('afterbegin', '<div id="referenceGovernanceMeta" class="workflow-health" style="margin-bottom:.65rem;"></div>');
    host.insertBefore(panel, host.firstChild);
    ['liveLocalQuery', 'liveLocalType', 'liveLocalOrientation', 'liveLocalStage'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.addEventListener(id === 'liveLocalQuery' ? 'keydown' : 'change', event => {
        if (event.type === 'change' || event.key === 'Enter') root.searchLiveLocalAssets();
      });
    });
  }

  root.searchLiveLocalAssets = async function () {
    const query = document.getElementById('liveLocalQuery')?.value || '';
    const type = document.getElementById('liveLocalType')?.value || 'all';
    const orientation = document.getElementById('liveLocalOrientation')?.value || 'all';
    const workflowStage = document.getElementById('liveLocalStage')?.value || 'all';
    const target = document.getElementById('liveLocalResults');
    const meta = document.getElementById('liveLocalMeta');
    if (!target) return;
    target.innerHTML = '<div class="spinner" style="width:20px;height:20px;"></div>';
    try {
      const settings = root.getObsidianSettings ? root.getObsidianSettings() : { libraryFolder: '摄影姿势库' };
      const params = new URLSearchParams({ query, type, orientation, workflowStage, libraryFolder: settings.libraryFolder || '摄影姿势库', limit: '40' });
      const response = await fetch(`${proxyBase()}/v1/search?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error((await response.json()).error || `HTTP ${response.status}`);
      const payload = await response.json();
      liveLocalResults = new Map((payload.items || []).map(item => [item.id, item]));
      if (meta) meta.textContent = `命中 ${payload.count || 0} 条 · 索引 ${payload.indexVersion || '未知'} · 图片只读取缩略预览`;
      target.innerHTML = (payload.items || []).map(renderLiveLocalAsset).join('') || '<p style="color:var(--t3);font-size:.75rem;">没有命中，换关键词或放宽筛选条件。</p>';
    } catch (error) {
      const message = root.describeObsidianProxyError
        ? root.describeObsidianProxyError(error, root.getObsidianSettings?.() || {})
        : `本地图库检索失败：${error.message || error}`;
      if (meta) meta.textContent = message;
      target.innerHTML = `<p style="color:var(--er);font-size:.75rem;">${esc(message)}</p>`;
    }
  };

  function renderLiveLocalAsset(item) {
    const thumbnail = item.type === 'asset' ? `${proxyBase()}/v1/assets/${encodeURIComponent(item.id)}/thumbnail?libraryFolder=${encodeURIComponent(root.getObsidianSettings?.().libraryFolder || '摄影姿势库')}` : '';
    const details = [item.type === 'asset' ? '图片' : '笔记', item.width && item.height ? `${item.width}×${item.height}` : '', item.orientation, item.cameraModel, item.lensModel, item.workflowStage, item.licenseClass, item.validationStatus].filter(Boolean);
    return `<article style="border:1px solid var(--bd);border-radius:8px;background:var(--bg2);overflow:hidden;display:grid;grid-template-rows:${thumbnail ? '150px' : '0'} auto;">${thumbnail ? `<img src="${esc(thumbnail)}" alt="${esc(item.title)}" loading="lazy" style="width:100%;height:150px;object-fit:cover;">` : ''}<div style="padding:.65rem;min-width:0;"><strong style="font-size:.78rem;color:var(--t1);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.title || item.filename)}</strong><div style="font-size:.66rem;color:var(--t3);word-break:break-all;margin-top:.2rem;">${esc(item.filename)}</div><div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.45rem;">${details.map(detail => `<span class="eq-tag">${esc(detail)}</span>`).join('')}</div><div style="margin-top:.5rem;display:flex;gap:.35rem;"><button class="btn btn-s btn-sm" onclick="attachLiveAssetToLatestPlan('${esc(item.id)}')">关联最近方案</button></div></div></article>`;
  }

  root.attachLiveAssetToLatestPlan = function (assetId) {
    const item = liveLocalResults.get(assetId);
    const plans = root.getPlans ? root.getPlans() : read('pw_plans', []);
    const plan = plans[0];
    if (!item || !plan) { notify('当前没有可关联的方案', 'er'); return; }
    plan.relations = plan.relations || {};
    plan.relations.references = Array.isArray(plan.relations.references) ? plan.relations.references : [];
    if (!plan.relations.references.some(ref => ref.id === item.id)) plan.relations.references.unshift({
      id: item.id, title: item.title, platform: 'Obsidian 本地', sourceFile: item.filename,
      licenseClass: item.licenseClass, validationStatus: item.validationStatus, score: 100,
      reason: '用户从本地实时图库手动关联并锁定', role: 'materialReference'
    });
    const decisions = read(KEYS.decisions, {});
    decisions[plan.id] = decisions[plan.id] || {};
    decisions[plan.id][item.id] = { locked: true, rejected: false };
    write(KEYS.decisions, decisions);
    updatePlan(plan);
    notify(`已关联到 ${plan.title}`, 'ok');
  };

  root.getReferenceAssetDecision = function (assetId) {
    return read(KEYS.assetDecisions, {})[assetId] || {};
  };

  root.refreshReferenceGovernance = async function () {
    const target = document.getElementById('referenceGovernanceMeta');
    if (!target) return;
    const decisions = Object.values(read(KEYS.assetDecisions, {}));
    const meta = await Store.get('meta', 'seed-status') || {};
    target.innerHTML = `<div>可用素材<br><strong>${esc(meta.referenceCount || 0)}</strong></div><div>自动去重<br><strong>${esc(meta.duplicateCount || 0)} 条重复</strong></div><div>人工决策<br><strong>${decisions.filter(item => item.verified).length} 验证 · ${decisions.filter(item => item.locked).length} 锁定 · ${decisions.filter(item => item.rejected).length} 否决</strong></div>`;
  };

  root.setReferenceAssetDecision = async function (assetId, action) {
    const decisions = read(KEYS.assetDecisions, {});
    const decision = { verified: false, locked: false, rejected: false, ...(decisions[assetId] || {}) };
    if (action === 'verify') decision.verified = !decision.verified;
    if (action === 'lock') { decision.locked = !decision.locked; if (decision.locked) decision.rejected = false; }
    if (action === 'reject') { decision.rejected = !decision.rejected; if (decision.rejected) decision.locked = false; }
    decision.updatedAt = Domain.nowIso();
    decisions[assetId] = decision;
    write(KEYS.assetDecisions, decisions);
    const asset = await Store.get('assets', String(assetId));
    if (asset) await Store.put('assets', { ...asset, validationStatus: decision.rejected ? 'rejected' : decision.verified ? 'verified' : 'pending', userLocked: decision.locked, updatedAt: decision.updatedAt });
    root.renderReferenceDatabase?.();
    root.refreshReferenceGovernance();
  };

  root.editReferenceTags = function (assetId) {
    const decisions = read(KEYS.assetDecisions, {});
    const current = decisions[assetId] || {};
    const value = prompt('输入标签，用逗号分隔', (current.tags || []).join(', '));
    if (value == null) return;
    current.tags = value.split(/[,，]/).map(item => item.trim()).filter(Boolean).slice(0, 20);
    current.updatedAt = Domain.nowIso();
    decisions[assetId] = current;
    write(KEYS.assetDecisions, decisions);
    root.renderReferenceDatabase?.();
  };

  root.replaceLatestPlanReference = async function (assetId) {
    const plan = (root.getPlans ? root.getPlans() : read('pw_plans', []))[0];
    const asset = await Store.get('assets', String(assetId));
    if (!plan || !asset) { notify('没有可替换的方案或参考素材', 'er'); return; }
    const decisions = read(KEYS.decisions, {})[plan.id] || {};
    const existing = Array.isArray(plan.relations?.references) ? plan.relations.references : [];
    const locked = existing.filter(item => decisions[item.id || item.referenceId]?.locked);
    const replacement = {
      id: asset.id, title: asset.title, platform: asset.platform || '参考数据库', sourceFile: asset.sourceFile || '', sourceUrl: asset.sourceUrl || '',
      licenseClass: asset.licenseClass || 'needs-review', validationStatus: root.getReferenceAssetDecision(asset.id).verified ? 'verified' : asset.validationStatus || 'pending',
      score: 100, reason: '用户从参考图库选为主要参考', role: 'materialReference'
    };
    plan.relations = { ...(plan.relations || {}), references: [replacement, ...locked.filter(item => String(item.id) !== String(assetId))] };
    const allDecisions = read(KEYS.decisions, {});
    allDecisions[plan.id] = { ...(allDecisions[plan.id] || {}), [assetId]: { locked: true, rejected: false } };
    write(KEYS.decisions, allDecisions);
    updatePlan(plan);
    notify(`已替换 ${plan.title} 的主要参考`, 'ok');
  };

  root.refreshWorkflowHealth = async function () {
    const el = document.getElementById('workflowDataHealth');
    if (!el) return;
    const stores = await Promise.all(['plans', 'schedules', 'reviews', 'assets', 'candidates'].map(async name => [name, (await Store.getAll(name)).length]));
    let proxy = { ok: false, documents: 0, assets: 0 };
    if (root.getObsidianSettings?.().enabled) {
      try { const response = await fetch(`${proxyBase()}/v1/health`, { cache: 'no-store' }); if (response.ok) proxy = await response.json(); } catch (_) {}
    }
    el.innerHTML = `<div>本机数据<br><strong>${stores.map(([name, count]) => `${name} ${count}`).join(' · ')}</strong></div><div>个人图库<br><strong>${proxy.ok ? `${proxy.documents || 0} 篇笔记 · ${proxy.assets || 0} 张图片` : '未连接（可选）'}</strong></div><div>图库状态<br><strong>${esc(proxy.indexVersion || '尚未建立')}</strong></div>`;
  };

  root.rebuildLocalIndex = async function () {
    try {
      const response = await fetch(`${proxyBase()}/v1/index/rebuild`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error((await response.json()).error || `HTTP ${response.status}`);
      const result = await response.json();
      addSystemMessage('本地索引已更新', `${result.documents} 篇笔记、${result.assets} 个附件可检索。`, '数据健康', 'completed');
      notify('本地索引已重建', 'ok');
      root.refreshWorkflowHealth();
    } catch (error) { notify(`索引失败：${error.message}`, 'er'); }
  };

  root.runDailyResearch = async function () {
    try {
      const response = await fetch(`${proxyBase()}/v1/candidates/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 24 }) });
      if (!response.ok) throw new Error((await response.json()).error || `HTTP ${response.status}`);
      const result = await response.json();
      await Store.bulkPut('candidates', result.candidates || []);
      (result.candidates || []).slice(0, 8).forEach(item => addSystemMessage('每日候选', `${item.title}\n${item.reason}\n${item.sourceUrl}`, '待验证素材'));
      notify(`生成 ${result.candidates.length} 条待验证候选`, 'ok');
      root.renderMessages && root.renderMessages();
      root.refreshWorkflowHealth();
    } catch (error) { notify(`每日检索失败：${error.message}`, 'er'); }
  };

  function enhanceHistoryRows() {
    const reviews = read(KEYS.reviews, []);
    const schedules = read(KEYS.schedules, []);
    document.querySelectorAll('#histFull .hist-item').forEach(row => {
      const openButton = row.querySelector('button[onclick^="loadPlan"]');
      const match = openButton && openButton.getAttribute('onclick').match(/loadPlan\('([^']+)'\)/);
      if (!match || row.querySelector('.workflow-version-button')) return;
      const planId = match[1];
      const meta = row.querySelector('.hist-meta');
      if (meta) {
        const schedule = schedules.find(item => String(item.planId) === String(planId));
        const review = reviews.find(item => String(item.planId) === String(planId));
        const state = review ? (review.returnedToObsidian ? '已回流' : '已复盘') : schedule ? (Domain.SCHEDULE_STATUSES.find(item => item.id === schedule.status)?.label || '已有日程') : '仅方案';
        meta.insertAdjacentHTML('beforeend', `<span>${esc(state)}</span>`);
      }
      const actions = row.querySelector('.hist-actions');
      if (actions) actions.insertAdjacentHTML('beforeend', `<button class="btn btn-s btn-sm workflow-version-button" onclick="openPlanVersions('${esc(planId)}')">版本</button>`);
    });
  }

  function removeLegacyTabs() {
    ['tab-message', 'tab-hist', 'tab-dashboard', 'tab-tpl', 'tab-backup'].forEach(id => document.getElementById(id)?.remove());
  }

  function focusEquipmentLibrary() {
    document.querySelectorAll('#tab-venue .resource-tab').forEach(button => {
      if (button.dataset.resource !== 'eq') button.remove();
      else { button.classList.add('active'); button.style.pointerEvents = 'none'; }
    });
    ['resource-venue', 'resource-model'].forEach(id => document.getElementById(id)?.remove());
    document.getElementById('resource-eq')?.classList.add('active');
  }

  function installDataManagementOverrides() {
    root.exportAllData = async function () {
      const local = {};
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && (key.startsWith('pw_') || key.startsWith('pa_'))) local[key] = localStorage.getItem(key);
      }
      const payload = { version: 3, exportedAt: Domain.nowIso(), localStorage: local, indexedDb: await Store.exportDatabase() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `photoatelier_backup_${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
      notify('LocalStorage 与 IndexedDB 已完整导出', 'ok');
    };
    root.importAllData = function (event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const payload = JSON.parse(reader.result);
          const local = payload.localStorage || payload;
          Object.entries(local).forEach(([key, value]) => {
            if (key.startsWith('pw_') || key.startsWith('pa_')) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          });
          if (payload.indexedDb && payload.indexedDb.stores) {
            for (const [storeName, items] of Object.entries(payload.indexedDb.stores)) {
              if (Domain.ENTITY_TYPES.includes(storeName)) await Store.bulkPut(storeName, items);
            }
          }
          notify('数据已完整导入，正在刷新', 'ok');
          setTimeout(() => location.reload(), 700);
        } catch (error) { notify(`导入失败：${error.message}`, 'er'); }
      };
      reader.readAsText(file);
      event.target.value = '';
    };
    root.clearAllData = async function () {
      if (!confirm('确定清空 PhotoAtelier 的本地数据吗？Obsidian 原笔记和原图不会删除。')) return;
      const keys = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && (key.startsWith('pw_') || key.startsWith('pa_'))) keys.push(key);
      }
      keys.forEach(key => localStorage.removeItem(key));
      await Store.clearAll();
      location.reload();
    };
  }

  function wrapExistingFunctions() {
    const scheduleFeishu = () => root.PhotoAtelierFeishu?.schedule();
    const originalRender = root.renderPlanContent;
    if (typeof originalRender === 'function' && !originalRender.__workflowWrapped) {
      const wrapped = function (plan) {
        setTimeout(() => root.initializePlanLutPreview?.(plan.id), 0);
        return originalRender(plan) + renderLifecyclePanel(plan);
      };
      wrapped.__workflowWrapped = true;
      root.renderPlanContent = wrapped;
    }
    const originalSavePlan = root.savePlan;
    if (typeof originalSavePlan === 'function' && !originalSavePlan.__workflowWrapped) {
      const wrapped = async function (plan) {
        plan.lifecycleStatus = PLAN_LIFECYCLE[plan.lifecycleStatus] ? plan.lifecycleStatus : 'candidate';
        plan.lifecycleUpdatedAt = plan.lifecycleUpdatedAt || Domain.nowIso();
        const id = await originalSavePlan(plan);
        plan.createdAt = plan.createdAt || Domain.nowIso();
        plan.updatedAt = plan.updatedAt || plan.createdAt;
        write('pw_plans', (root.getPlans ? root.getPlans() : read('pw_plans', [])).map(item => String(item.id) === String(plan.id) ? plan : item));
        recordVersion(plan, 'create');
        await Store.put('plans', canonicalPlan(plan));
        const preferences = workflowPreferences();
        if (preferences.autoReferences) root.autoMatchShotReferences?.(plan.id);
        activePlanLibraryView = planLifecycleStatus(plan);
        root.renderPlanLibrary?.();
        scheduleFeishu();
        return id;
      };
      wrapped.__workflowWrapped = true;
      root.savePlan = wrapped;
    }
    const originalRenderSchedules = root.renderSchedules;
    if (typeof originalRenderSchedules === 'function' && !originalRenderSchedules.__workflowWrapped) {
      const wrapped = function () {
        originalRenderSchedules();
        const schedules = read(KEYS.schedules, []);
        document.querySelectorAll('.schedule-item[data-id]').forEach(row => {
          const item = schedules.find(schedule => String(schedule.id) === String(row.dataset.id));
          if (!item || row.querySelector('.schedule-workflow-status')) return;
          const select = document.createElement('select'); select.className = 'schedule-workflow-status';
          select.innerHTML = Domain.SCHEDULE_STATUSES.map(status => `<option value="${status.id}" ${status.id === (item.status || 'scheduled') ? 'selected' : ''}>${status.label}</option>`).join('');
          select.onchange = event => root.setScheduleWorkflowStatus(item.id, event.target.value);
          row.querySelector('.schedule-info')?.appendChild(select);
        });
        renderScheduleWorkflowBoard();
      };
      wrapped.__workflowWrapped = true;
      root.renderSchedules = wrapped;
    }
    const originalCreateSchedule = root.createScheduleDraftFromCurrentPlan;
    if (typeof originalCreateSchedule === 'function' && !originalCreateSchedule.__workflowWrapped) {
      const wrapped = function () {
        const plan = root.currentPlanData || (root.getPlans ? root.getPlans()[0] : read('pw_plans', [])[0]);
        if (!plan) { notify('请先打开一个方案', 'er'); return; }
        return root.openPlanScheduleDialog(plan.id);
      };
      wrapped.__workflowWrapped = true;
      root.createScheduleDraftFromCurrentPlan = wrapped;
    }
    const originalSaveSchedule = root.saveScheduleWithUndo;
    if (typeof originalSaveSchedule === 'function' && !originalSaveSchedule.__workflowWrapped) {
      const wrapped = function (schedule) {
        const result = originalSaveSchedule(schedule);
        Store.bulkPut('schedules', read(KEYS.schedules, [])).catch(() => {});
        scheduleFeishu();
        return result;
      };
      wrapped.__workflowWrapped = true;
      root.saveScheduleWithUndo = wrapped;
    }
    const originalSubmitSchedule = root.submitSchedule;
    if (typeof originalSubmitSchedule === 'function' && !originalSubmitSchedule.__workflowWrapped) {
      const wrapped = function () {
        const result = originalSubmitSchedule();
        root.renderCalendar?.();
        Store.bulkPut('schedules', read(KEYS.schedules, [])).catch(() => {});
        scheduleFeishu();
        return result;
      };
      wrapped.__workflowWrapped = true;
      root.submitSchedule = wrapped;
    }
    const originalDeleteSchedule = root.deleteSchedule;
    if (typeof originalDeleteSchedule === 'function' && !originalDeleteSchedule.__workflowWrapped) {
      const wrapped = function (id) {
        const result = originalDeleteSchedule(id);
        Store.remove('schedules', id).catch(() => {});
        root.PhotoAtelierFeishu?.deleteRecords('tasks', [id]).catch(() => {});
        return result;
      };
      wrapped.__workflowWrapped = true;
      root.deleteSchedule = wrapped;
    }
    const originalDeletePlan = root.delPlan;
    if (typeof originalDeletePlan === 'function' && !originalDeletePlan.__workflowWrapped) {
      const wrapped = function (id) {
        const plan = currentPlan(id);
        const shotIds = plan ? (typeof root.generateShotList === 'function' ? root.generateShotList(plan) : []).map((shot, index) => String(shot.id || `shot-${plan.id}-${index + 1}`)) : [];
        const taskIds = read(KEYS.schedules, []).filter(item => String(item.planId) === String(id)).map(item => item.id);
        root.PhotoAtelierFeishu?.deleteRecords('plans', [id]).catch(() => {});
        root.PhotoAtelierFeishu?.deleteRecords('shots', shotIds).catch(() => {});
        root.PhotoAtelierFeishu?.deleteRecords('tasks', taskIds).catch(() => {});
        root.PhotoAtelierFeishu?.deleteRecords('reviews', [`review-${id}`]).catch(() => {});
        cascadeDeletePlan(id);
        const result = originalDeletePlan(id);
        root.renderPlanLibrary?.();
        return result;
      };
      wrapped.__workflowWrapped = true;
      root.delPlan = wrapped;
    }
    const originalUpdateMessage = root.updateMsg;
    if (typeof originalUpdateMessage === 'function' && !originalUpdateMessage.__workflowWrapped) {
      const wrapped = async function (id, status) {
        const result = await originalUpdateMessage(id, status);
        scheduleFeishu();
        return result;
      };
      wrapped.__workflowWrapped = true;
      root.updateMsg = wrapped;
    }
    const originalDeleteMessage = root.deleteMsg;
    if (typeof originalDeleteMessage === 'function' && !originalDeleteMessage.__workflowWrapped) {
      const wrapped = async function (id) {
        const existed = read(KEYS.messages, []).some(item => String(item.id) === String(id));
        const result = await originalDeleteMessage(id);
        const remains = read(KEYS.messages, []).some(item => String(item.id) === String(id));
        if (existed && !remains) root.PhotoAtelierFeishu?.deleteRecords('messages', [id]).catch(() => {});
        return result;
      };
      wrapped.__workflowWrapped = true;
      root.deleteMsg = wrapped;
    }
    const originalSettings = root.loadSettingsData;
    if (typeof originalSettings === 'function' && !originalSettings.__workflowWrapped) {
      const wrapped = function () { originalSettings(); enhanceSettingsMarkup(); setTimeout(root.refreshWorkflowHealth, 0); };
      wrapped.__workflowWrapped = true;
      root.loadSettingsData = wrapped;
    }
    const originalHistory = root.renderHistFull;
    if (typeof originalHistory === 'function' && !originalHistory.__workflowWrapped) {
      const wrapped = function () { originalHistory(); enhanceHistoryRows(); };
      wrapped.__workflowWrapped = true;
      root.renderHistFull = wrapped;
    }
  }

  async function bootstrap() {
    installCalendarController();
    wrapExistingFunctions();
    installDataManagementOverrides();
    enhanceSettingsMarkup();
    enhanceReferenceMarkup();
    enhanceLutWorkspaceMarkup();
    enhanceScheduleMarkup();
    enhancePlanLibraryMarkup();
    focusEquipmentLibrary();
    const migration = await Store.migrateLegacy(localStorage);
    await seedIndexedDb();
    await hydrateReferenceImageCatalog();
    await loadOpenLutCatalog();
    root.refreshReferenceGovernance();
    const validStatuses = new Set(Domain.SCHEDULE_STATUSES.map(item => item.id));
    const schedules = read(KEYS.schedules, []).map(item => ({ ...item, status: validStatuses.has(item.status) ? item.status : 'scheduled' }));
    write(KEYS.schedules, schedules);
    await Store.bulkPut('schedules', schedules);
    const plans = (root.getPlans ? root.getPlans() : read('pw_plans', [])).map(plan => ({
      ...plan,
      lifecycleStatus: PLAN_LIFECYCLE[plan.lifecycleStatus] ? plan.lifecycleStatus : (schedules.some(item => String(item.planId) === String(plan.id)) ? 'scheduled' : 'confirmed'),
      lifecycleUpdatedAt: plan.lifecycleUpdatedAt || plan.updatedAt || plan.createdAt || Domain.nowIso()
    }));
    write('pw_plans', plans);
    await Store.bulkPut('plans', plans.map(canonicalPlan));
    activePlanLibraryView = plans.some(plan => plan.lifecycleStatus === 'candidate') ? 'candidate' : plans.some(plan => plan.lifecycleStatus === 'confirmed') ? 'confirmed' : 'scheduled';
    addSystemMessage('本地工作台已就绪', `数据迁移完成：${migration.counts ? `${migration.counts.plans} 个方案、${migration.counts.schedules} 个日程` : '已保持现有数据'}。`, '数据健康', 'completed');
    document.querySelectorAll('[onclick*="createDemoMessage"]').forEach(button => button.remove());
    removeLegacyTabs();
    root.renderPlanLibrary();
    root.renderSchedules && root.renderSchedules();
    root.renderCalendar();
    if (root.PhotoAtelierFeishu?.settings().enabled) root.testFeishuConnection?.();
  }

  bootstrap().catch(error => addSystemMessage('本地数据层启动失败', error.message || String(error), '数据健康'));
})(window);

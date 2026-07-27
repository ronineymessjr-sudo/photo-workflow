const root = window;

const state = {
  section: 'summary',
  query: '',
  detailIds: {
    venue: null,
    talent: null,
    equipment: null,
  },
  formSection: null,
  readyAttempts: 0,
  readyTimer: null,
};

const sourceProviders = {
  venue: new Map(),
  talent: new Map(),
};

const SECTION_CONFIG = {
  venue: {
    title: '场地',
    empty: '还没有场地。先录入一个真实可用的拍摄地点。',
    icon: 'map-pin',
  },
  talent: {
    title: '人员',
    empty: '还没有人员档案。只录入已获得同意保存的信息。',
    icon: 'user',
  },
  equipment: {
    title: '设备',
    empty: '还没有登记设备。设备目录不代表你已经拥有器材。',
    icon: 'camera',
  },
};

function ensureSectionMounts() {
  const tab = document.getElementById('tab-resources');
  if (!tab) return;
  const anchor = document.getElementById('resource-eq') || document.getElementById('r4-resource-lut');
  [
    ['resource-venue', 'venue'],
    ['resource-model', 'talent'],
  ].forEach(([id, section]) => {
    let container = document.getElementById(id);
    if (!container) {
      container = document.createElement('div');
      container.className = 'resource-content';
      container.id = id;
      tab.insertBefore(container, anchor || null);
    }
    container.dataset.r4ResourceSection = section;
    if (!container.querySelector('.r4-resource-module-mount')) {
      container.replaceChildren();
      const mount = document.createElement('div');
      mount.className = 'r4-resource-module-mount';
      mount.dataset.module = section;
      container.appendChild(mount);
    }
  });
}

function app() {
  return root.PhotoAtelierV5?.ready ? root.PhotoAtelierV5.application : null;
}

function scheduleReadyRefresh() {
  if (state.readyTimer || state.readyAttempts >= 40) return;
  state.readyAttempts += 1;
  state.readyTimer = root.setTimeout(() => {
    state.readyTimer = null;
    if (!app()) {
      scheduleReadyRefresh();
      return;
    }
    state.readyAttempts = 0;
    syncBriefSelectors();
    showSection(state.section);
  }, 250);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

function notify(message, type = 'ok') {
  if (typeof root.toast === 'function') {
    root.toast(message, type);
    return;
  }
  const element = document.getElementById('toast');
  if (!element) return;
  element.textContent = message;
  element.className = `toast show ${type === 'er' ? 'er' : 'ok'}`;
  setTimeout(() => { element.className = 'toast'; }, 2800);
}

function currentPlan(application = app()) {
  if (!application) return null;
  const activeId = root.currentPlanId;
  if (activeId) {
    const active = application.repositories.plans.get(activeId);
    if (active?.projectId) return active;
  }
  return application.repositories.plans.list(item => item.projectId)
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))[0] || null;
}

function currentContext() {
  const application = app();
  if (!application) return null;
  const activeLegacyPlanId = root.currentPlanId || null;
  const isolatedProjectId = activeLegacyPlanId ? `legacy-${activeLegacyPlanId}` : null;
  let project = isolatedProjectId
    ? application.repositories.projects.get(isolatedProjectId)
    : null;
  if (!project && isolatedProjectId) {
    const legacyPlan = typeof root.getPlans === 'function'
      ? root.getPlans().find(item => String(item.id) === String(activeLegacyPlanId))
      : null;
    project = root.PhotoAtelierV5.data.create('projects', {
      id: isolatedProjectId,
      title: legacyPlan?.input?.theme || legacyPlan?.title || '当前摄影方案',
      status: 'active',
      defaultCurrency: 'CNY',
      timezone: 'Asia/Shanghai',
    });
  }
  const candidatePlan = currentPlan(application);
  if (!project) {
    project = candidatePlan?.projectId
      ? application.repositories.projects.get(candidatePlan.projectId)
      : root.PhotoAtelierV5.data.ensureDefaultProject();
  }
  const plan = candidatePlan?.projectId === project.id ? candidatePlan : null;
  if (!project) return null;
  return {
    application,
    plan,
    project,
    catalog: application.queries.resourceCatalog.get(project.id),
  };
}

function entriesFor(catalog, section) {
  if (section === 'venue') return catalog.venues || [];
  if (section === 'talent') return catalog.talent || [];
  if (section === 'equipment') return catalog.equipment || [];
  return [];
}

function matchesQuery(entry, section) {
  const query = state.query.trim().toLowerCase();
  if (!query) return true;
  const resource = entry.resource || {};
  const model = entry.model || {};
  const values = section === 'venue'
    ? [entry.displayName, resource.address, resource.indoorOutdoor, ...(resource.features || []), resource.lightingNotes]
    : section === 'talent'
      ? [entry.displayName, resource.contact, resource.consentStatus, ...(resource.styleTags || []), resource.availabilityNotes]
      : [entry.displayName, entry.category, model.brand, model.model, resource.ownership, resource.availabilityStatus, resource.notes];
  return values.filter(Boolean).join(' ').toLowerCase().includes(query);
}

function assignmentFor(entry, planId) {
  const assignments = entry.assignments || [];
  return assignments.find(item => (item.planId || null) === (planId || null))
    || assignments.find(item => !item.planId)
    || assignments[0]
    || null;
}

function selectedCount(catalog, planId) {
  return ['venues', 'talent', 'equipment'].reduce((total, key) => (
    total + (catalog[key] || []).filter(item => assignmentFor(item, planId)).length
  ), 0);
}

function resourceMeta(entry, section) {
  const resource = entry.resource || {};
  if (section === 'venue') {
    return [resource.indoorOutdoor === 'indoor' ? '室内' : resource.indoorOutdoor === 'outdoor' ? '室外' : '类型待确认', resource.address || '地址待补充'];
  }
  if (section === 'talent') {
    const consent = {
      granted: '已授权',
      denied: '拒绝授权',
      not_requested: '授权待确认',
    }[resource.consentStatus] || '授权待确认';
    return [consent, (resource.styleTags || []).slice(0, 2).join(' · ') || '风格待补充'];
  }
  const ownership = {
    owned: '自有',
    rented: '租赁',
    borrowed: '借用',
    wishlist: '愿望清单',
  }[resource.ownership] || '来源待确认';
  const availability = resource.availabilityStatus === 'available' ? '可用' : '暂不可用';
  return [ownership, `${resource.quantity || 1} 件`, availability];
}

function renderListCard(entry, section, planId) {
  const selected = assignmentFor(entry, planId);
  const resource = entry.resource || {};
  const consentClass = section === 'talent' && resource.consentStatus !== 'granted' ? ' is-pending' : '';
  return `<button type="button" class="r4-resource-list-card${state.detailIds[section] === resource.id ? ' is-active' : ''}" data-r4-resource-detail="${esc(resource.id)}">
    <span class="r4-resource-list-card__icon"><i data-lucide="${SECTION_CONFIG[section].icon}"></i></span>
    <span class="r4-resource-list-card__copy">
      <strong>${esc(entry.displayName)}</strong>
      <small>${resourceMeta(entry, section).map(esc).join(' · ')}</small>
    </span>
    ${selected ? '<span class="r4-resource-selected-badge">本方案</span>' : `<span class="r4-resource-status-dot${consentClass}"></span>`}
  </button>`;
}

function renderSummary(context) {
  const mount = document.querySelector('#r4-resource-summary .r4-resource-module-mount');
  if (!mount) return;
  const { catalog, plan, project } = context;
  const groups = [
    ['venue', '场地', catalog.venues],
    ['talent', '人员', catalog.talent],
    ['equipment', '设备', catalog.equipment],
  ].map(([section, label, entries]) => {
    const selected = (entries || []).filter(item => assignmentFor(item, plan?.id));
    return `<section class="r4-resource-summary-group">
      <header><div><i data-lucide="${SECTION_CONFIG[section].icon}"></i><strong>${label}</strong></div><span>${selected.length}</span></header>
      ${selected.length
        ? selected.map(item => `<button type="button" data-r4-resource-open="${section}" data-r4-resource-detail="${esc(item.resource.id)}">${esc(item.displayName)}</button>`).join('')
        : `<button type="button" class="is-empty" data-r4-resource-open="${section}">去选择${label}</button>`}
    </section>`;
  }).join('');
  const lutName = root.currentPlanData?.selectedLutName || root.currentPlanData?.lutName || '';
  mount.innerHTML = `<div class="r4-resource-summary">
    <div class="r4-resource-summary__intro">
      <div><span>当前上下文</span><strong>${esc(plan?.title || plan?.concept || project.title || '资源总览')}</strong></div>
      <small>${selectedCount(catalog, plan?.id)} 项已选择</small>
    </div>
    <div class="r4-resource-summary__grid">${groups}
      <section class="r4-resource-summary-group">
        <header><div><i data-lucide="palette"></i><strong>LUT</strong></div><span>${lutName ? 1 : 0}</span></header>
        <button type="button" class="${lutName ? '' : 'is-empty'}" data-r4-resource-open="lut">${esc(lutName || '去选择 LUT')}</button>
      </section>
    </div>
  </div>`;
  document.getElementById('r4-resource-summary')?.classList.add('is-v5-mounted');
  bindMountEvents(mount, context);
}

function renderSection(section) {
  ensureSectionMounts();
  const context = currentContext();
  if (!context || !SECTION_CONFIG[section]) {
    scheduleReadyRefresh();
    return;
  }
  const contentId = section === 'venue' ? 'resource-venue' : section === 'talent' ? 'resource-model' : 'resource-eq';
  const content = document.getElementById(contentId);
  const mount = content?.querySelector('.r4-resource-module-mount');
  if (!content || !mount) return;

  let entries = entriesFor(context.catalog, section).filter(item => matchesQuery(item, section));
  const selectedId = state.detailIds[section];
  if (!selectedId && entries[0]) state.detailIds[section] = entries[0].resource.id;
  const selectedEntry = entriesFor(context.catalog, section).find(item => item.resource.id === state.detailIds[section]) || null;

  mount.innerHTML = `<div class="r4-resource-workspace">
    <section class="r4-resource-master">
      <header class="r4-resource-master__header">
        <div><span>${SECTION_CONFIG[section].title}库</span><strong>${entriesFor(context.catalog, section).length}</strong></div>
        <button type="button" class="btn btn-p btn-sm r4-resource-add-button" data-r4-resource-add="${section}"><i data-lucide="plus"></i><span>添加${SECTION_CONFIG[section].title}</span></button>
      </header>
      <label class="r4-resource-search"><i data-lucide="search"></i><input type="search" value="${esc(state.query)}" placeholder="搜索${SECTION_CONFIG[section].title}" data-r4-resource-search></label>
      <div class="r4-resource-list">
        ${entries.length ? entries.map(item => renderListCard(item, section, context.plan?.id)).join('') : `<div class="r4-resource-list-empty"><p>${SECTION_CONFIG[section].empty}</p><button type="button" class="btn btn-p btn-sm" data-r4-resource-add="${section}">添加第一个${SECTION_CONFIG[section].title}</button></div>`}
      </div>
    </section>
    <section class="r4-resource-detail">
      ${state.formSection === section ? renderForm(section, context) : renderDetail(selectedEntry, section, context)}
    </section>
  </div>`;

  content.classList.add('is-v5-mounted');
  bindMountEvents(mount, context);
  root.PhotoAtelierR4IconSystem?.refreshIcons(content);
  updateBadge(context);
}

function renderForm(section, context) {
  if (section === 'venue') {
    return `<form class="r4-resource-form" data-r4-resource-form="venue">
      <header><div><span>新增场地</span><h2>记录真实拍摄地点</h2></div><button type="button" class="r4-icon-button" data-r4-resource-cancel><i data-lucide="x"></i></button></header>
      <div class="r4-resource-form__grid">
        <label>场地名称<input name="name" required></label>
        <label>地址<input name="address"></label>
        <label>类型<select name="indoorOutdoor"><option value="unknown">待确认</option><option value="indoor">室内</option><option value="outdoor">室外</option><option value="mixed">室内外</option></select></label>
        <label>费用说明<input name="priceNote"></label>
        <label class="wide">场地特征<input name="features" placeholder="白墙、落地窗、屋顶"></label>
        <label class="wide">光线说明<textarea name="lightingNotes"></textarea></label>
        <label class="wide">限制条件<input name="restrictions" placeholder="拍摄许可、营业时间、噪音限制"></label>
      </div>
      <button class="btn btn-p" type="submit">保存到场地库</button>
    </form>`;
  }
  if (section === 'talent') {
    return `<form class="r4-resource-form" data-r4-resource-form="talent">
      <header><div><span>新增人员</span><h2>记录模特与拍摄对象</h2></div><button type="button" class="r4-icon-button" data-r4-resource-cancel><i data-lucide="x"></i></button></header>
      <div class="r4-resource-form__grid">
        <label>显示名称<input name="displayName" required></label>
        <label>联系方式<input name="contact"></label>
        <label>肖像与拍摄授权<select name="consentStatus"><option value="not_requested">待确认</option><option value="granted">已授权</option><option value="denied">拒绝授权</option></select></label>
        <label>图像分析授权<select name="analysisConsent"><option value="not_requested">未请求</option><option value="granted">已授权</option><option value="denied">不同意</option></select></label>
        <label class="wide">风格标签<input name="styleTags" placeholder="自然、时尚、双人互动"></label>
        <label class="wide">作品集链接<textarea name="portfolioUrls" placeholder="每行一个个人主页或作品集链接"></textarea></label>
        <label class="wide">档期说明<input name="availabilityNotes"></label>
        <label class="wide">拍摄边界<textarea name="boundaries" placeholder="不可公开花絮、禁拍区域等"></textarea></label>
      </div>
      <button class="btn btn-p" type="submit">保存人员档案</button>
    </form>`;
  }
  const models = context.application.catalog.searchEquipmentModels('', {}).slice(0, 120);
  return `<form class="r4-resource-form" data-r4-resource-form="equipment">
    <header><div><span>新增设备</span><h2>登记真实器材状态</h2></div><button type="button" class="r4-icon-button" data-r4-resource-cancel><i data-lucide="x"></i></button></header>
    <datalist id="r4EquipmentModelOptions">${models.map(item => `<option value="${esc(`${item.brand} ${item.model}`)}"></option>`).join('')}</datalist>
    <div class="r4-resource-form__grid">
      <label class="wide">型号或自定义名称<input name="name" list="r4EquipmentModelOptions" required></label>
      <label>来源<select name="ownership"><option value="owned">自有</option><option value="rented">租赁</option><option value="borrowed">借用</option><option value="wishlist">愿望清单</option></select></label>
      <label>数量<input name="quantity" type="number" min="1" value="1"></label>
      <label>状态<select name="condition"><option value="good">状态良好</option><option value="needs_charge">待充电</option><option value="needs_repair">待检修</option></select></label>
      <label>可用性<select name="availabilityStatus"><option value="available">可用</option><option value="unavailable">不可用</option></select></label>
      <label class="wide">备注<input name="notes"></label>
    </div>
    <button class="btn btn-p" type="submit">保存到设备库</button>
  </form>`;
}

function renderDetail(entry, section, context) {
  if (!entry) {
    return `<div class="r4-resource-detail-empty"><i data-lucide="${SECTION_CONFIG[section].icon}"></i><h2>选择一项查看详情</h2><p>${SECTION_CONFIG[section].empty}</p></div>`;
  }
  const resource = entry.resource;
  const assignment = assignmentFor(entry, context.plan?.id);
  const meta = resourceMeta(entry, section);
  const blocked = section === 'talent' && resource.consentStatus === 'denied';
  const detailRows = section === 'venue'
    ? [
        ['地址', resource.address || '待补充'],
        ['场地特征', (resource.features || []).join(' · ') || '待补充'],
        ['光线', resource.lightingNotes || '待勘景'],
        ['限制', (resource.restrictions || []).join(' · ') || '待确认'],
        ['费用', resource.priceNote || '待确认'],
      ]
    : section === 'talent'
      ? [
          ['联系方式', resource.contact || '未记录'],
          ['档期', resource.availabilityNotes || '待确认'],
          ['拍摄授权', meta[0]],
          ['图像分析授权', resource.analysisConsent === 'granted' ? '已授权' : resource.analysisConsent === 'denied' ? '不同意' : '未请求'],
          ['拍摄边界', resource.boundaries || '待沟通'],
        ]
      : [
          ['型号分类', entry.category || '自定义设备'],
          ['来源', meta[0]],
          ['库存数量', `${resource.quantity || 1} 件`],
          ['状态', resource.condition || 'good'],
          ['可用性', meta[2]],
          ['备注', resource.notes || '无'],
        ];
  const assignmentSummary = assignment
    ? `${assignment.quantity || resource.quantity || 1} 件 · ${assignment.required ? '必需' : '可替换'}`
    : '';
  return `<article class="r4-resource-detail-card">
    <header>
      <span class="r4-resource-detail-card__icon"><i data-lucide="${SECTION_CONFIG[section].icon}"></i></span>
      <div><span>${SECTION_CONFIG[section].title}详情</span><h2>${esc(entry.displayName)}</h2><p>${meta.map(esc).join(' · ')}</p></div>
    </header>
    <dl>${detailRows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
    ${assignment ? `<div class="r4-resource-assignment-note"><i data-lucide="check-circle-2"></i><span>已用于当前方案 · ${esc(assignmentSummary)}</span></div>` : ''}
    ${blocked ? '<div class="r4-resource-consent-warning">该人员已拒绝授权，不能加入执行方案。</div>' : ''}
    <div class="r4-resource-detail-card__actions">
      ${assignment
        ? `<button type="button" class="btn btn-s" data-r4-resource-remove="${esc(assignment.id)}">移出当前方案</button>`
        : `<label class="r4-resource-assignment-option">数量<input data-r4-assignment-quantity type="number" min="1" value="1"></label>
           <label class="r4-resource-assignment-check"><input data-r4-assignment-required type="checkbox" ${section !== 'equipment' ? 'checked' : ''}> 必需</label>
           <button type="button" class="btn btn-p" data-r4-resource-select="${esc(resource.id)}" ${blocked ? 'disabled' : ''}>${section === 'talent' && resource.consentStatus !== 'granted' ? '选择并标记待授权' : '用于当前方案'}</button>`}
    </div>
  </article>`;
}

function bindMountEvents(mount, context) {
  mount.querySelectorAll('[data-r4-resource-detail]').forEach(button => {
    button.addEventListener('click', () => {
      const section = button.dataset.r4ResourceOpen || state.section;
      if (SECTION_CONFIG[section]) {
        state.section = section;
        state.detailIds[section] = button.dataset.r4ResourceDetail || null;
        root.showResourceSection?.(section);
      }
    });
  });
  mount.querySelectorAll('[data-r4-resource-open]:not([data-r4-resource-detail])').forEach(button => {
    button.addEventListener('click', () => root.showResourceSection?.(button.dataset.r4ResourceOpen));
  });
  mount.querySelector('[data-r4-resource-search]')?.addEventListener('input', event => {
    state.query = event.currentTarget.value;
    renderSection(state.section);
  });
  mount.querySelectorAll('[data-r4-resource-add]').forEach(button => {
    button.addEventListener('click', event => {
      state.formSection = event.currentTarget.dataset.r4ResourceAdd;
      renderSection(state.section);
    });
  });
  mount.querySelector('[data-r4-resource-cancel]')?.addEventListener('click', () => {
    state.formSection = null;
    renderSection(state.section);
  });
  mount.querySelector('[data-r4-resource-form]')?.addEventListener('submit', event => saveResource(event, context));
  mount.querySelector('[data-r4-resource-select]')?.addEventListener('click', event => {
    selectResource(state.section, event.currentTarget.dataset.r4ResourceSelect, context, mount);
  });
  mount.querySelector('[data-r4-resource-remove]')?.addEventListener('click', event => {
    context.application.catalog.removeResourceAssignment(event.currentTarget.dataset.r4ResourceRemove);
    notify('已从当前方案移除，全局资源仍然保留');
    refresh();
  });
}

function saveResource(event, context) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  let saved;
  try {
    if (form.dataset.r4ResourceForm === 'venue') {
      saved = context.application.catalog.saveVenue({
        name: values.name,
        address: values.address,
        indoorOutdoor: values.indoorOutdoor,
        features: splitList(values.features),
        lightingNotes: values.lightingNotes,
        restrictions: splitList(values.restrictions),
        priceNote: values.priceNote,
        source: 'custom',
      });
      state.detailIds.venue = saved.id;
    } else if (form.dataset.r4ResourceForm === 'talent') {
      saved = context.application.catalog.saveTalentProfile({
        displayName: values.displayName,
        contact: values.contact,
        portfolioUrls: splitLines(values.portfolioUrls),
        styleTags: splitList(values.styleTags),
        availabilityNotes: values.availabilityNotes,
        consentStatus: values.consentStatus,
        boundaries: values.boundaries,
        analysisConsent: values.analysisConsent,
      });
      state.detailIds.talent = saved.id;
    } else {
      const target = normalize(values.name);
      const model = context.application.catalog.searchEquipmentModels(values.name || '').find(item => (
        [item.model, `${item.brand} ${item.model}`, ...(item.aliases || [])].some(name => normalize(name) === target)
      ));
      saved = context.application.catalog.addEquipmentItem({
        equipmentModelId: model?.id || null,
        customName: model ? '' : values.name,
        ownership: values.ownership,
        quantity: Number(values.quantity || 1),
        condition: values.condition,
        availabilityStatus: values.availabilityStatus,
        notes: values.notes,
      });
      state.detailIds.equipment = saved.id;
    }
    state.formSection = null;
    notify('已保存到全局资源库');
    refresh();
  } catch (error) {
    notify(error.message || '保存失败', 'er');
  }
}

function selectResource(section, resourceId, context, mount) {
  const type = section === 'talent' ? 'talent' : section;
  const quantity = Number(mount.querySelector('[data-r4-assignment-quantity]')?.value || 1);
  const required = Boolean(mount.querySelector('[data-r4-assignment-required]')?.checked);
  const assignment = context.application.catalog.assignResourceToProject({
    projectId: context.project.id,
    planId: context.plan?.id || null,
    resourceType: type,
    resourceId,
    role: section === 'venue' ? 'primary-location' : section === 'talent' ? 'subject' : 'available',
    quantity,
    required,
    status: 'selected',
  });
  const entry = entriesFor(context.catalog, section).find(item => item.resource.id === resourceId);
  applyBriefSelection(section, entry);
  notify('已加入当前方案');
  const workspace = root.r4ResourceWorkspaceContext;
  if (workspace?.mode === 'select' && section !== 'equipment') {
    workspace.onSelect?.({ section, entry, assignment });
    root.closeResourceWorkspace?.();
  }
  refresh();
}

function applyBriefSelection(section, entry) {
  if (!entry) return;
  if (section === 'venue') {
    const field = document.getElementById('f-scene');
    if (field) field.value = entry.displayName;
  }
  if (section === 'talent') {
    const field = document.getElementById('f-model');
    if (field) field.value = entry.displayName;
  }
  root.updatePlanReadiness?.();
}

function syncBriefSelectors(context = currentContext()) {
  if (!context) return;
  const venueSelect = document.getElementById('importVenueSelect');
  const talentSelect = document.getElementById('importModelSelect');
  if (venueSelect) {
    venueSelect.innerHTML = '<option value="">从场地库导入</option>'
      + (context.catalog.venues || []).map(entry => {
        const address = entry.resource?.address ? ` - ${entry.resource.address}` : '';
        return `<option value="${esc(entry.resource.id)}">${esc(entry.displayName)}${esc(address)}</option>`;
      }).join('');
  }
  if (talentSelect) {
    talentSelect.innerHTML = '<option value="">从人员库导入</option>'
      + (context.catalog.talent || []).map(entry => {
        const consent = entry.resource?.consentStatus === 'granted' ? '' : '（授权待确认）';
        return `<option value="${esc(entry.resource.id)}">${esc(entry.displayName)}${consent}</option>`;
      }).join('');
  }
}

function importBriefResource(section) {
  const context = currentContext();
  if (!context) {
    notify('资源库尚未就绪，请稍后重试', 'er');
    return;
  }
  const select = document.getElementById(section === 'venue' ? 'importVenueSelect' : 'importModelSelect');
  const resourceId = select?.value;
  if (!resourceId) {
    notify(section === 'venue' ? '请先选择场地' : '请先选择人员', 'er');
    return;
  }
  const entry = entriesFor(context.catalog, section).find(item => item.resource.id === resourceId);
  if (!entry) {
    notify('所选资源不存在，请刷新后重试', 'er');
    return;
  }
  if (section === 'talent' && entry.resource.consentStatus === 'denied') {
    notify('该人员已拒绝授权，不能用于当前方案', 'er');
    return;
  }
  context.application.catalog.assignResourceToProject({
    projectId: context.project.id,
    planId: context.plan?.id || null,
    resourceType: section,
    resourceId,
    role: section === 'venue' ? 'primary-location' : 'subject',
    quantity: 1,
    required: true,
    status: 'selected',
  });
  applyBriefSelection(section, entry);
  notify(`已导入${section === 'venue' ? '场地' : '人员'}：${entry.displayName}`);
  refresh();
}

function splitList(value) {
  return String(value || '').split(/[,，]/).map(item => item.trim()).filter(Boolean);
}

function splitLines(value) {
  return String(value || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function embedLutWorkspace() {
  const mount = document.querySelector('#r4-resource-lut .r4-resource-module-mount');
  const source = document.getElementById('tab-lut');
  if (!mount || !source || source.parentElement === mount) return;
  source.classList.remove('tab-cnt', 'active');
  source.classList.add('r4-embedded-lut-workspace');
  mount.appendChild(source);
  document.getElementById('r4-resource-lut')?.classList.add('is-v5-mounted');
}

function updateBadge(context = currentContext()) {
  const badge = document.getElementById('t-eq');
  if (!badge || !context) return;
  badge.textContent = String(selectedCount(context.catalog, context.plan?.id));
}

function showSection(section) {
  ensureSectionMounts();
  state.section = ['summary', 'venue', 'talent', 'equipment', 'lut'].includes(section) ? section : 'summary';
  state.query = '';
  document.querySelectorAll('#tab-resources .resource-content').forEach(element => {
    element.classList.toggle('active', element.dataset.r4ResourceSection === state.section);
  });
  if (state.section === 'summary') {
    const context = currentContext();
    if (context) renderSummary(context);
    else scheduleReadyRefresh();
  } else if (state.section === 'lut') {
    embedLutWorkspace();
    root.renderLutWorkspace?.();
  } else {
    renderSection(state.section);
  }
}

function refresh() {
  ensureSectionMounts();
  const context = currentContext();
  if (!context) return;
  syncBriefSelectors(context);
  renderSummary(context);
  if (SECTION_CONFIG[state.section]) renderSection(state.section);
  updateBadge(context);
}

function registerSourceProvider(section, provider) {
  if (!sourceProviders[section]) throw new Error('仅支持场地和人员来源');
  if (!provider?.id || typeof provider.normalize !== 'function') {
    throw new Error('来源必须提供 id 和 normalize(record) 方法');
  }
  sourceProviders[section].set(provider.id, Object.freeze({ ...provider }));
  return () => sourceProviders[section].delete(provider.id);
}

function listSourceProviders(section) {
  return [...(sourceProviders[section]?.values() || [])].map(provider => ({
    id: provider.id,
    label: provider.label || provider.id,
    capabilities: provider.capabilities || [],
  }));
}

function importProviderRecord(section, providerId, externalRecord) {
  const context = currentContext();
  const provider = sourceProviders[section]?.get(providerId);
  if (!context || !provider) throw new Error('外部来源尚未注册');
  const normalized = provider.normalize(externalRecord);
  const saved = section === 'venue'
    ? context.application.catalog.saveVenue({ ...normalized, source: providerId })
    : context.application.catalog.saveTalentProfile(normalized);
  state.detailIds[section] = saved.id;
  refresh();
  return saved;
}

const api = Object.freeze({
  showSection,
  refresh,
  currentContext,
  syncBriefSelectors,
  importBriefResource,
  registerSourceProvider,
  listSourceProviders,
  importProviderRecord,
});

root.PhotoAtelierResourceWorkspace = api;
root.renderEq = () => showSection('equipment');
root.renderVenue = () => showSection('venue');
root.renderModel = () => showSection('talent');
root.refreshImportSelects = () => syncBriefSelectors();
root.importFromVenue = () => importBriefResource('venue');
root.importFromModel = () => importBriefResource('talent');

ensureSectionMounts();
if (app()) {
  syncBriefSelectors();
  showSection(root.r4ResourceSection || 'summary');
} else {
  state.section = root.r4ResourceSection || 'summary';
  scheduleReadyRefresh();
}

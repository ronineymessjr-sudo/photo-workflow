(function (root) {
  'use strict';

  const Domain = root.PhotoWorkflowDomain;
  const Store = root.PhotoWorkflowStore;
  if (!Domain || !Store) return;

  const ENTITIES = ['projects', 'references', 'plans', 'shots', 'tasks', 'luts', 'reviews', 'messages'];
  const SETTINGS = {
    apiBase: 'pa_feishu_api_base',
    token: 'pa_feishu_sync_token',
    enabled: 'pa_feishu_enabled',
    auto: 'pa_feishu_auto_sync',
    lastSync: 'pa_feishu_last_sync'
  };
  const DEFAULT_API_BASE = 'https://photoatelier-v2-api.photomagic.workers.dev';
  let syncTimer = 0;
  let syncing = false;

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function nowIso() {
    return Domain.nowIso ? Domain.nowIso() : new Date().toISOString();
  }

  function settings() {
    const legacy = readJson('pa_v2_settings', {});
    return {
      apiBase: (localStorage.getItem(SETTINGS.apiBase) || legacy.apiBase || DEFAULT_API_BASE).replace(/\/$/, ''),
      token: localStorage.getItem(SETTINGS.token) || legacy.syncToken || '',
      enabled: localStorage.getItem(SETTINGS.enabled) === 'true' || (!localStorage.getItem(SETTINGS.enabled) && Boolean(legacy.remoteEnabled)),
      auto: localStorage.getItem(SETTINGS.auto) === 'true' || (!localStorage.getItem(SETTINGS.auto) && Boolean(legacy.remoteEnabled)),
      lastSync: localStorage.getItem(SETTINGS.lastSync) || ''
    };
  }

  function saveSettings(next) {
    localStorage.setItem(SETTINGS.apiBase, (next.apiBase || DEFAULT_API_BASE).replace(/\/$/, ''));
    if (next.token) localStorage.setItem(SETTINGS.token, next.token);
    else localStorage.removeItem(SETTINGS.token);
    localStorage.setItem(SETTINGS.enabled, next.enabled ? 'true' : 'false');
    localStorage.setItem(SETTINGS.auto, next.auto ? 'true' : 'false');
    return settings();
  }

  async function request(path, options) {
    const config = settings();
    if (!config.enabled) throw new Error('FEISHU_SYNC_DISABLED');
    if (!config.token) throw new Error('FEISHU_SYNC_TOKEN_MISSING');
    const response = await fetch(`${config.apiBase}${path}`, {
      method: options?.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-PhotoAtelier-Token': config.token
      },
      body: options?.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  }

  async function health() {
    const config = settings();
    const response = await fetch(`${config.apiBase}/api/health`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  }

  function stamp(record, fallbackId) {
    const rawId = String(record.id || fallbackId);
    const idTime = /^\d{13}$/.test(rawId) ? new Date(Number(rawId)).toISOString() : '';
    const createdAt = record.createdAt || record.created_at || record.dateCreated || record.updatedAt || idTime || '1970-01-01T00:00:00.000Z';
    return { ...record, id: String(record.id || fallbackId), createdAt, updatedAt: record.updatedAt || record.updated_at || createdAt };
  }

  function projectIdFor(plan) {
    return String(plan.projectId || `project-${plan.id}`);
  }

  function planShots(plan) {
    const saved = readJson(`pa_shots_${plan.id}`, []);
    if (saved.length) return saved;
    if (Array.isArray(plan.shots)) return plan.shots;
    if (Array.isArray(plan.shotList)) return plan.shotList;
    if (typeof root.generateShotList === 'function') {
      try { return root.generateShotList(plan) || []; } catch (_) { return []; }
    }
    return [];
  }

  function unique(records) {
    const map = new Map();
    records.forEach(record => {
      if (!record?.id) return;
      const current = map.get(String(record.id));
      if (!current || Date.parse(record.updatedAt || 0) >= Date.parse(current.updatedAt || 0)) map.set(String(record.id), record);
    });
    return Array.from(map.values());
  }

  async function collectLocal() {
    const plans = readJson('pw_plans', []).map((plan, index) => stamp(plan, `plan-${index}`));
    const projects = plans.map(plan => stamp({
      id: projectIdFor(plan),
      title: plan.title || plan.input?.theme || 'PhotoAtelier project',
      status: plan.workflowStatus || plan.status || 'active',
      shootingType: plan.input?.shootingType || plan.input?.theme || '',
      date: plan.input?.date || plan.date || '',
      location: plan.input?.location || plan.input?.scene || '',
      style: plan.input?.style || '',
      brief: plan.input || plan.brief || '',
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    }, projectIdFor(plan)));

    const normalizedPlans = plans.map(plan => ({
      ...plan,
      projectId: projectIdFor(plan),
      concept: plan.concept || plan.title || plan.input?.theme || '',
      rationale: plan.rationale || plan.summary || '',
      generationMode: plan.generationMode || plan.mode || 'local-workflow',
      visualDirection: plan.visualDirection || plan.input?.style || '',
      equipment: plan.equipment || plan.relations?.equipment || [],
      risks: plan.risks || []
    }));

    const shootRecords = readJson('pa_shoot_records', []);
    const shots = plans.flatMap(plan => planShots(plan).map((shot, index) => {
      const shotId = String(shot.id || `shot-${plan.id}-${index + 1}`);
      const live = shootRecords.find(item => String(item.planId) === String(plan.id) && (String(item.shotId) === String(shot.id) || item.shotId === `shot-${index}`)) || {};
      return stamp({
        ...shot,
        ...live,
        id: shotId,
        projectId: projectIdFor(plan),
        planId: String(plan.id),
        sequence: shot.sequence || index + 1,
        scene: shot.scene || shot.name || shot.title || '',
        shotSize: shot.shotSize || shot.size || '',
        focalLength: shot.focalLength || shot.focal || '',
        durationMinutes: shot.durationMinutes || live.elapsedMinutes || 0,
        updatedAt: live.updatedAt || plan.updatedAt
      }, shotId);
    }));

    const tasks = unique([...readJson('pw_schedule', []), ...readJson('pw_schedules', [])]).map((task, index) => {
      const linkedPlan = plans.find(plan => String(plan.id) === String(task.planId));
      return stamp({
        ...task,
        id: String(task.id || `task-${index}`),
        projectId: task.projectId || (linkedPlan ? projectIdFor(linkedPlan) : 'project-unassigned'),
        planId: task.planId || '',
        phase: task.phase || 'shooting',
        status: task.status || 'scheduled',
        title: task.title || task.name || 'Shooting schedule',
        startAt: task.startAt || [task.date, task.time].filter(Boolean).join('T'),
        dueAt: task.dueAt || ''
      }, `task-${index}`);
    });

    const planById = new Map(plans.map(plan => [String(plan.id), plan]));
    const reviews = readJson('pa_reviews', []).map((review, index) => {
      const plan = planById.get(String(review.planId));
      return stamp({
        ...review,
        id: review.id || `review-${review.planId || index}`,
        projectId: review.projectId || (plan ? projectIdFor(plan) : 'project-unassigned'),
        planScore: review.planScore || review.keepRate || 0,
        executionScore: review.executionScore || review.keepRate || 0,
        successes: review.successes || review.bestPoses || review.reusableInsights || '',
        failures: review.failures || [review.failedActions, review.lightingIssues].filter(Boolean).join('; '),
        nextActions: review.nextActions || review.clientFeedback || ''
      }, `review-${index}`);
    });

    const luts = readJson('pa_lut_profiles', []).map((lut, index) => {
      const plan = plans.find(item => item.lutProfileId === lut.id);
      return stamp({
        ...lut,
        id: lut.id || `lut-${index}`,
        projectId: lut.projectId || (plan ? projectIdFor(plan) : 'project-library'),
        planId: lut.planId || plan?.id || '',
        name: lut.name || lut.title || lut.filename || 'Imported LUT',
        inputColorSpace: lut.inputColorSpace || 'unknown',
        style: lut.style || lut.title || '',
        strength: lut.strength || plan?.lutStrength || 100,
        notes: lut.notes || lut.licenseClass || '',
        createdAt: lut.importedAt || lut.createdAt,
        updatedAt: lut.updatedAt || lut.importedAt
      }, `lut-${index}`);
    });

    const messages = readJson('pw_messages', [])
      .map((message, index) => stamp({
        ...message,
        id: message.id || `message-${index}`,
        projectId: message.projectId || 'project-system',
        type: message.type || message.service_type || 'notification',
        status: message.status || 'new',
        content: message.content || message.message || message.name || '',
        createdAt: message.createdAt || message.created_at,
        updatedAt: message.updatedAt || message.created_at
      }, `message-${index}`))
      .filter(message => !isIgnoredPublicBetaProbeMessage(message));

    const relationReferences = plans.flatMap(plan => {
      const relation = plan.relations || {};
      const refs = [...(relation.references || []), ...(relation.slots || []).flatMap(slot => slot.topItems || [])];
      return refs.map((ref, index) => stamp({
        ...ref,
        id: String(ref.id || ref.referenceId || `reference-${plan.id}-${index}`),
        projectId: projectIdFor(plan),
        title: ref.title || ref.name || 'Reference',
        sourcePlatform: ref.sourcePlatform || ref.platform || ref.provider || 'local',
        sourceUrl: ref.sourceUrl || ref.url || '',
        styleTags: ref.styleTags || ref.tags || [],
        category: ref.category || ref.role || ref.slotId || 'reference',
        notes: ref.notes || ref.reason || ref.matchReason || '',
        obsidianPath: ref.obsidianPath || ref.sourceFile || '',
        updatedAt: plan.updatedAt
      }, `reference-${plan.id}-${index}`));
    });
    const libraryAssets = await Store.getAll('assets').catch(() => []);
    const references = unique([...relationReferences, ...libraryAssets.map((asset, index) => stamp({
      ...asset,
      id: String(asset.id || `asset-${index}`),
      projectId: asset.projectId || 'project-library',
      sourcePlatform: asset.sourcePlatform || asset.platform || asset.provider || 'Obsidian',
      sourceUrl: asset.sourceUrl || '',
      styleTags: asset.styleTags || asset.tags || [],
      category: asset.category || asset.workflowStage || asset.type || 'reference',
      notes: asset.notes || asset.reason || '',
      obsidianPath: asset.obsidianPath || asset.sourceFile || asset.filename || ''
    }, `asset-${index}`))]);

    return { projects: unique(projects), references, plans: unique(normalizedPlans), shots: unique(shots), tasks: unique(tasks), luts: unique(luts), reviews: unique(reviews), messages: unique(messages) };
  }

  function mergeByUpdatedAt(local, remote) {
    const map = new Map((local || []).map(item => [String(item.id), item]));
    (remote || []).forEach(item => {
      if (!item?.id) return;
      const current = map.get(String(item.id));
      if (!current || Date.parse(item.updatedAt || 0) > Date.parse(current.updatedAt || 0)) map.set(String(item.id), item);
    });
    return Array.from(map.values());
  }

  function isIgnoredPublicBetaProbeMessage(record) {
    if (!record || record.projectId !== 'public-beta' || record.type !== 'beta-feedback') return false;
    let metadata = {};
    if (typeof record.metadataJson === 'string') {
      try { metadata = JSON.parse(record.metadataJson || '{}'); } catch (_) {}
    } else {
      metadata = record.metadataJson || {};
    }
    const fingerprint = [record.id, record.traceId].map(value => String(value || '')).join(' ');
    const probeBuild = metadata.build === 'deploy-check' || /(^|-)deploy-check(?:-|$)/.test(fingerprint);
    const probeSession = (metadata.sessionId || record.relatedId) === 'system-check' || /(^|-)system-check(?:-|$)/.test(fingerprint);
    return probeBuild && probeSession;
  }

  async function mergeRemote(entity, records) {
    const remoteRecords = entity === 'messages' ? (records || []).filter(item => !isIgnoredPublicBetaProbeMessage(item)) : (records || []);
    if (entity === 'projects') writeJson('pa_projects', mergeByUpdatedAt(readJson('pa_projects', []), records));
    if (entity === 'plans') writeJson('pw_plans', mergeByUpdatedAt(readJson('pw_plans', []), records));
    if (entity === 'tasks') {
      const merged = mergeByUpdatedAt(readJson('pw_schedule', []), records);
      writeJson('pw_schedule', merged);
      writeJson('pw_schedules', merged);
    }
    if (entity === 'reviews') writeJson('pa_reviews', mergeByUpdatedAt(readJson('pa_reviews', []), records));
    if (entity === 'luts') writeJson('pa_lut_profiles', mergeByUpdatedAt(readJson('pa_lut_profiles', []), records));
    if (entity === 'messages') {
      const localMessages = readJson('pw_messages', []);
      const keptLocal = localMessages.filter(item => !isIgnoredPublicBetaProbeMessage(item));
      const removedLocalIds = localMessages.filter(item => isIgnoredPublicBetaProbeMessage(item)).map(item => String(item.id));
      writeJson('pw_messages', mergeByUpdatedAt(keptLocal, remoteRecords));
      await Promise.all(removedLocalIds.map(id => Store.remove('messages', id).catch(() => {})));
    }
    if (entity === 'references') {
      writeJson('pa_feishu_references', mergeByUpdatedAt(readJson('pa_feishu_references', []), records));
      await Store.bulkPut('assets', remoteRecords);
    }
    if (entity === 'shots') {
      const byPlan = new Map();
      records.forEach(shot => {
        if (!shot.planId) return;
        if (!byPlan.has(String(shot.planId))) byPlan.set(String(shot.planId), []);
        byPlan.get(String(shot.planId)).push(shot);
      });
      byPlan.forEach((items, planId) => writeJson(`pa_shots_${planId}`, mergeByUpdatedAt(readJson(`pa_shots_${planId}`, []), items)));
    }
    const storeName = { tasks: 'schedules', luts: 'lutProfiles' }[entity] || entity;
    if (Domain.ENTITY_TYPES.includes(storeName)) await Store.bulkPut(storeName, remoteRecords).catch(() => {});
  }

  async function pushAll() {
    const local = await collectLocal();
    const summary = { created: 0, updated: 0, skipped: 0, conflicts: 0, errors: [] };
    for (const entity of ENTITIES) {
      const records = local[entity] || [];
      if (!records.length) continue;
      const result = await request(`/api/feishu/${entity}/sync`, { method: 'POST', body: { records } });
      summary.created += result.created || 0;
      summary.updated += result.updated || 0;
      summary.skipped += result.skipped || 0;
      summary.conflicts += (result.conflicts || []).length;
      summary.errors.push(...(result.errors || []).map(error => ({ entity, ...error })));
    }
    return summary;
  }

  async function pullAll() {
    const summary = {};
    for (const entity of ENTITIES) {
      const result = await request(`/api/feishu/${entity}/records`);
      await mergeRemote(entity, result.records || []);
      summary[entity] = (result.records || []).length;
    }
    return summary;
  }

  function listEntity(entity) {
    if (!ENTITIES.includes(entity)) throw new Error(`Unsupported entity: ${entity}`);
    return request(`/api/feishu/${entity}/records`);
  }

  function createAgentDraft(projectId, parentPlanId) {
    return request('/api/v1/agent/plans/draft', {
      method: 'POST',
      body: { project_id: projectId, options: { parent_plan_id: parentPlanId || '' } }
    });
  }

  function regenerateAgentRun(runId, instruction) {
    return request(`/api/v1/agent/runs/${encodeURIComponent(runId)}/regenerate`, {
      method: 'POST', body: { instruction: instruction || '' }
    });
  }

  function approveAgentRun(runId, editedPlan) {
    return request(`/api/v1/agent/runs/${encodeURIComponent(runId)}/approve`, {
      method: 'POST', body: { edited_plan: editedPlan || null }
    });
  }

  async function syncAll(options) {
    if (syncing) throw new Error('SYNC_ALREADY_RUNNING');
    syncing = true;
    root.dispatchEvent(new CustomEvent('photoatelier:sync-state', { detail: { state: 'syncing' } }));
    try {
      const push = await pushAll();
      const pull = options?.pull === false ? null : await pullAll();
      const completedAt = nowIso();
      localStorage.setItem(SETTINGS.lastSync, completedAt);
      const result = { ok: push.errors.length === 0, push, pull, completedAt };
      root.dispatchEvent(new CustomEvent('photoatelier:sync-state', { detail: { state: result.ok ? 'ok' : 'warning', result } }));
      return result;
    } catch (error) {
      root.dispatchEvent(new CustomEvent('photoatelier:sync-state', { detail: { state: 'error', error } }));
      throw error;
    } finally {
      syncing = false;
    }
  }

  function schedule() {
    const config = settings();
    if (!config.enabled || !config.auto || !config.token) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncAll({ pull: false }).catch(() => {}), 1200);
  }

  async function deleteRecords(entity, ids) {
    if (!ids?.length) return { deleted: 0 };
    return request(`/api/feishu/${entity}/delete`, { method: 'POST', body: { ids } });
  }

  root.PhotoAtelierFeishu = { ENTITIES, settings, saveSettings, health, listEntity, createAgentDraft, regenerateAgentRun, approveAgentRun, collectLocal, pushAll, pullAll, syncAll, schedule, deleteRecords };
})(window);

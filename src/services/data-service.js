import { uid, nowIso } from '../core/utils.js';
import {
  APP_SCHEMA_VERSION,
  ENTITIES,
  LEGACY_KEYS,
  normalizePlanState,
} from '../core/schema.js';

export { ENTITIES };

export class DataService {
  constructor(storage) {
    this.storage = storage;
    ENTITIES.forEach(name => {
      if (!Array.isArray(this.storage.get(name))) this.storage.set(name, []);
    });
  }

  assertEntity(entity) {
    if (!ENTITIES.includes(entity)) throw new Error(`不支持的实体：${entity}`);
  }

  list(entity, predicate = null) {
    this.assertEntity(entity);
    const items = this.storage.get(entity, []);
    return predicate ? items.filter(predicate) : items;
  }

  get(entity, id) {
    return this.list(entity).find(item => String(item.id) === String(id)) || null;
  }

  create(entity, input = {}) {
    this.assertEntity(entity);
    const items = this.list(entity);
    const id = input.id || uid(entity.replace(/s$/, ''));
    if (items.some(item => String(item.id) === String(id))) throw new Error(`${entity}:${id} 已存在`);
    const now = nowIso();
    const record = normalizeRecord(entity, {
      ...input,
      id,
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
    });
    items.unshift(record);
    this.storage.set(entity, items);
    return record;
  }

  update(entity, id, patch = {}, { preserveUpdatedAt = false } = {}) {
    this.assertEntity(entity);
    const items = this.list(entity);
    const index = items.findIndex(item => String(item.id) === String(id));
    if (index < 0) throw new Error(`${entity}:${id} 不存在`);
    const next = normalizeRecord(entity, {
      ...items[index],
      ...patch,
      id: items[index].id,
      updatedAt: preserveUpdatedAt && patch.updatedAt ? patch.updatedAt : nowIso(),
    });
    items[index] = next;
    this.storage.set(entity, items);
    return next;
  }

  upsert(entity, record, { preserveUpdatedAt = true } = {}) {
    const existing = this.get(entity, record.id);
    return existing
      ? this.update(entity, record.id, record, { preserveUpdatedAt })
      : this.create(entity, record);
  }

  remove(entity, id) {
    const record = this.get(entity, id);
    this.storage.set(entity, this.list(entity).filter(item => String(item.id) !== String(id)));
    if (record) {
      const tombstones = this.storage.get('syncTombstones', []);
      tombstones.push({ entity, id: String(id), projectId: record.projectId || record.id, deletedAt: nowIso() });
      this.storage.set('syncTombstones', deduplicateByKey(tombstones, item => `${item.entity}:${item.id}`));
    }
  }

  listTombstones(projectId) {
    return this.storage.get('syncTombstones', []).filter(item => String(item.projectId) === String(projectId));
  }

  clearTombstones(items) {
    const keys = new Set(items.map(item => `${item.entity}:${item.id}`));
    this.storage.set('syncTombstones', this.storage.get('syncTombstones', [])
      .filter(item => !keys.has(`${item.entity}:${item.id}`)));
  }

  mergeRemote(entity, remoteRecords) {
    const items = this.list(entity);
    const byId = new Map(items.map(item => [String(item.id), item]));
    let inserted = 0;
    let updated = 0;
    for (const raw of remoteRecords || []) {
      if (!raw?.id) continue;
      const remote = normalizeRecord(entity, raw);
      const local = byId.get(String(remote.id));
      if (!local) {
        items.push(remote);
        byId.set(String(remote.id), remote);
        inserted += 1;
      } else if (Date.parse(remote.updatedAt || 0) > Date.parse(local.updatedAt || 0)) {
        Object.assign(local, remote);
        updated += 1;
      }
    }
    this.storage.set(entity, items);
    return { inserted, updated };
  }

  listByProject(entity, projectId) {
    return this.list(entity, item => String(item.projectId) === String(projectId));
  }

  ensureDefaultProject() {
    const projects = this.list('projects');
    if (projects.length) return projects[0];
    return this.create('projects', {
      id: 'default-project',
      title: '我的摄影项目',
      status: 'active',
      shootingType: '待设置',
      brief: '从参考、方案、排期、现场执行到后期复盘的统一项目。',
    });
  }

  analyzeLegacy() {
    const snapshot = readLegacySnapshot();
    const operations = buildMigrationOperations(snapshot);
    const existingMigrationKeys = new Set(
      ENTITIES.flatMap(entity => this.list(entity).map(item => item.migrationKey).filter(Boolean)),
    );
    const counts = {};
    const duplicates = [];
    const orphanRelations = [];

    for (const [entity, records] of Object.entries(operations)) {
      counts[entity] = { detected: records.length, new: 0, existing: 0 };
      for (const record of records) {
        if (existingMigrationKeys.has(record.migrationKey) || this.get(entity, record.id)) {
          counts[entity].existing += 1;
          duplicates.push({ entity, id: record.id, migrationKey: record.migrationKey });
        } else counts[entity].new += 1;
      }
    }

    const planIds = new Set([...this.list('plans').map(item => String(item.id)), ...(operations.plans || []).map(item => String(item.id))]);
    for (const entity of ['shots', 'tasks', 'reviews', 'shootRecords', 'relations', 'planVersions']) {
      for (const record of operations[entity] || []) {
        if (record.planId && !planIds.has(String(record.planId))) orphanRelations.push({ entity, id: record.id, planId: record.planId });
      }
    }

    const sourceCounts = Object.fromEntries(Object.entries(snapshot)
      .filter(([, value]) => Array.isArray(value) || (value && typeof value === 'object'))
      .map(([key, value]) => [key, Array.isArray(value) ? value.length : Object.keys(value).length]));

    return {
      schemaVersion: APP_SCHEMA_VERSION,
      generatedAt: nowIso(),
      sourceCounts,
      counts,
      duplicates,
      orphanRelations,
      warnings: buildMigrationWarnings(snapshot, orphanRelations),
      operations,
      hasLegacyData: Object.values(sourceCounts).some(Number),
    };
  }

  migrateLegacy(options = {}) {
    const { commit = true, force = false, returnReport = false } = options;
    const previous = this.storage.get('legacyMigrationReport', null);
    if (commit && previous?.completed && !force) {
      const project = this.get('projects', previous.legacyProjectId) || this.ensureDefaultProject();
      return returnReport ? previous : attachReport(project, previous);
    }

    const analysis = this.analyzeLegacy();
    const report = {
      schemaVersion: APP_SCHEMA_VERSION,
      startedAt: nowIso(),
      completed: false,
      dryRun: !commit,
      legacyProjectId: 'legacy-default-project',
      counts: analysis.counts,
      sourceCounts: analysis.sourceCounts,
      warnings: analysis.warnings,
      duplicates: analysis.duplicates,
      orphanRelations: analysis.orphanRelations,
      inserted: {},
      skipped: {},
    };

    if (!commit) return report;

    const rollback = this.storage.snapshot?.({ includeLegacy: true }) || null;
    if (rollback) this.storage.set('preMigrationBackup', rollback);

    try {
      for (const [entity, records] of Object.entries(analysis.operations)) {
        report.inserted[entity] = 0;
        report.skipped[entity] = 0;
        for (const record of records) {
          const existing = this.list(entity).find(item => item.migrationKey === record.migrationKey || String(item.id) === String(record.id));
          if (existing) {
            report.skipped[entity] += 1;
            continue;
          }
          this.create(entity, record);
          report.inserted[entity] += 1;
        }
      }
      const project = this.get('projects', report.legacyProjectId) || this.ensureDefaultProject();
      report.completed = true;
      report.completedAt = nowIso();
      this.storage.set('legacyMigrationDone', true);
      this.storage.set('legacyMigrationReport', report);
      return returnReport ? report : attachReport(project, report);
    } catch (error) {
      if (rollback && this.storage.restoreSnapshot) this.storage.restoreSnapshot(rollback, { replace: true });
      report.error = error.message;
      report.failedAt = nowIso();
      this.storage.set('legacyMigrationReport', report);
      throw error;
    }
  }

  auditIntegrity() {
    const issues = [];
    const ids = {};
    for (const entity of ENTITIES) {
      ids[entity] = new Set();
      for (const record of this.list(entity)) {
        if (!record.id) issues.push({ severity: 'error', entity, code: 'MISSING_ID' });
        if (ids[entity].has(String(record.id))) issues.push({ severity: 'error', entity, id: record.id, code: 'DUPLICATE_ID' });
        ids[entity].add(String(record.id));
        if (!record.schemaVersion) issues.push({ severity: 'warning', entity, id: record.id, code: 'MISSING_SCHEMA_VERSION' });
      }
    }
    for (const entity of ENTITIES.filter(name => name !== 'projects')) {
      for (const record of this.list(entity)) {
        if (record.projectId && !ids.projects.has(String(record.projectId))) issues.push({ severity: 'error', entity, id: record.id, code: 'ORPHAN_PROJECT', projectId: record.projectId });
        if (record.planId && !ids.plans.has(String(record.planId))) issues.push({ severity: 'warning', entity, id: record.id, code: 'ORPHAN_PLAN', planId: record.planId });
      }
    }
    return {
      checkedAt: nowIso(),
      ok: !issues.some(item => item.severity === 'error'),
      issues,
      counts: Object.fromEntries(ENTITIES.map(entity => [entity, this.list(entity).length])),
    };
  }
}

function normalizeRecord(entity, input) {
  const record = { ...input, schemaVersion: input.schemaVersion || APP_SCHEMA_VERSION };
  if (entity === 'plans') Object.assign(record, normalizePlanState(record));
  if (entity === 'shots') record.captureStatus = record.captureStatus || record.shotStatus || 'planned';
  if (entity === 'tasks') record.taskType = record.taskType || inferTaskType(record);
  return record;
}

function inferTaskType(task) {
  if (task.taskType) return task.taskType;
  if (task.date || task.location || task.lifecycleStatus === 'scheduled') return 'shoot-call';
  if (/后期|选片|调色|交付/.test(`${task.phase || ''}${task.title || ''}`)) return 'post-production';
  if (/发布|小红书|抖音|Instagram/i.test(`${task.phase || ''}${task.title || ''}`)) return 'publishing';
  return 'checklist';
}

function readLegacySnapshot() {
  const storage = globalThis.localStorage;
  const snapshot = {};
  for (const key of LEGACY_KEYS) snapshot[key] = safeParse(storage?.getItem?.(key), []);
  snapshot.dynamicShots = {};
  if (storage?.length != null) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith('pa_shots_')) snapshot.dynamicShots[key] = safeParse(storage.getItem(key), []);
    }
  }
  return snapshot;
}

function buildMigrationOperations(snapshot) {
  const operations = Object.fromEntries(ENTITIES.map(entity => [entity, []]));
  const rawProjects = asArray(snapshot.pa_projects);
  const legacyProject = {
    id: 'legacy-default-project',
    title: 'Legacy 历史项目',
    status: 'archived',
    shootingType: '迁移数据',
    brief: '由旧版 PhotoAtelier 数据迁移生成。',
    source: 'legacy-migration',
    migrationKey: 'migration:legacy-default-project',
  };
  operations.projects.push(legacyProject);
  rawProjects.forEach((project, index) => operations.projects.push(withMigration('projects', project, 'pa_projects', index, {
    id: stringId(project.id, `legacy-project-${index + 1}`),
    title: project.title || project.name || `历史项目 ${index + 1}`,
    status: project.status || 'archived',
  })));
  const projectIds = new Set(operations.projects.map(item => String(item.id)));
  const resolveProjectId = value => projectIds.has(String(value)) ? String(value) : legacyProject.id;

  asArray(snapshot.pw_plans).forEach((plan, index) => {
    const id = stringId(plan.id, `legacy-plan-${index + 1}`);
    const state = normalizePlanState(plan);
    operations.plans.push(withMigration('plans', plan, 'pw_plans', index, {
      id,
      projectId: resolveProjectId(plan.projectId),
      concept: plan.concept || plan.title || plan.input?.theme || `历史方案 ${index + 1}`,
      rationale: plan.rationale || plan.summary || '',
      generationMode: plan.generationMode || 'legacy-import',
      source: 'legacy',
      ...state,
    }));
    const embedded = asArray(plan.shots || plan.shotList || plan.output?.shots);
    embedded.forEach((shot, shotIndex) => operations.shots.push(withMigration('shots', shot, `pw_plans:${id}:shots`, shotIndex, {
      id: stringId(shot.id, `${id}-shot-${shotIndex + 1}`),
      projectId: resolveProjectId(plan.projectId),
      planId: id,
      sequence: Number(shot.sequence || shotIndex + 1),
      scene: shot.scene || shot.name || `镜头 ${shotIndex + 1}`,
      shotSize: shot.shotSize || shot.shot_size || shot.size || '',
      focalLength: shot.focalLength || shot.focal_length || shot.focal || '',
      captureStatus: shot.captureStatus || 'planned',
    })));
  });

  Object.entries(snapshot.dynamicShots || {}).forEach(([key, shots]) => {
    const planId = key.replace(/^pa_shots_/, '');
    asArray(shots).forEach((shot, index) => operations.shots.push(withMigration('shots', shot, key, index, {
      id: stringId(shot.id, `${planId}-shot-${index + 1}`),
      projectId: resolveProjectId(shot.projectId),
      planId,
      sequence: Number(shot.sequence || index + 1),
      captureStatus: shot.captureStatus || shot.status || 'planned',
    })));
  });

  const schedules = deduplicateByKey([
    ...asArray(snapshot.pw_schedule).map((item, index) => ({ item, sourceKey: 'pw_schedule', index })),
    ...asArray(snapshot.pw_schedules).map((item, index) => ({ item, sourceKey: 'pw_schedules', index })),
    ...asArray(snapshot.pw_todos).map((item, index) => ({ item, sourceKey: 'pw_todos', index })),
  ], entry => stringId(entry.item.id, `${entry.item.date || ''}:${entry.item.time || ''}:${entry.item.title || entry.item.name || entry.index}`));
  schedules.forEach(({ item: task, sourceKey, index }) => operations.tasks.push(withMigration('tasks', task, sourceKey, index, {
    id: stringId(task.id, `legacy-task-${index + 1}`),
    projectId: resolveProjectId(task.projectId),
    planId: task.planId || '',
    title: task.title || task.name || '历史任务',
    status: normalizeTaskStatus(task.status),
    taskType: task.date || task.location || task.time ? 'shoot-call' : inferTaskType(task),
    startAt: task.startAt || combineDateTime(task.date, task.time),
    endAt: task.endAt || combineDateTime(task.date, task.endTime),
    dueAt: task.dueAt || task.date || '',
    location: task.location || task.scene || '',
    timezone: task.timezone || 'Asia/Shanghai',
  })));

  migrateSimple(operations.messages, snapshot.pw_messages, 'pw_messages', 'message', item => ({
    projectId: resolveProjectId(item.projectId), type: item.type || '历史消息', status: item.status || 'read', content: item.content || item.text || item.title || '',
  }));
  migrateSimple(operations.reviews, snapshot.pa_reviews, 'pa_reviews', 'review', item => ({ projectId: resolveProjectId(item.projectId) }));
  migrateSimple(operations.shootRecords, snapshot.pa_shoot_records, 'pa_shoot_records', 'shoot-record', item => ({ projectId: resolveProjectId(item.projectId), captureStatus: item.captureStatus || item.status || 'captured' }));
  migrateSimple(operations.luts, snapshot.pa_lut_profiles, 'pa_lut_profiles', 'lut', item => ({ projectId: resolveProjectId(item.projectId), name: item.name || item.title || '历史 LUT' }));
  migrateSimple(operations.planVersions, snapshot.pa_plan_versions, 'pa_plan_versions', 'plan-version', item => ({ projectId: resolveProjectId(item.projectId) }));
  migrateSimple(operations.relations, [...asArray(snapshot.pa_relation_decisions), ...asArray(snapshot.pa_asset_decisions)], 'pa_relation_decisions', 'relation', item => ({ projectId: resolveProjectId(item.projectId) }));
  migrateSimple(operations.references, snapshot.pa_feishu_references, 'pa_feishu_references', 'reference', item => ({ projectId: resolveProjectId(item.projectId), title: item.title || item.name || '历史参考', verificationStatus: item.verificationStatus || 'pending' }));
  migrateSimple(operations.assets, snapshot.pa_custom_shots, 'pa_custom_shots', 'asset', item => ({ projectId: resolveProjectId(item.projectId), assetType: item.assetType || 'custom-shot-template' }));
  migrateSimple(operations.equipment, [...asArray(snapshot.pw_eq), ...asArray(snapshot.pw_equipment)], 'pw_equipment', 'equipment', item => ({ projectId: resolveProjectId(item.projectId), name: item.name || item.title || '历史设备' }));
  migrateSimple(operations.people, snapshot.pw_models, 'pw_models', 'person', item => ({ projectId: resolveProjectId(item.projectId), name: item.name || item.title || '历史人物' }));
  migrateSimple(operations.venues, snapshot.pw_venues, 'pw_venues', 'venue', item => ({ projectId: resolveProjectId(item.projectId), name: item.name || item.title || '历史场地' }));

  for (const entity of ENTITIES) operations[entity] = deduplicateByKey(operations[entity], item => item.migrationKey || `${entity}:${item.id}`);
  return operations;
}

function migrateSimple(target, raw, sourceKey, idPrefix, patcher) {
  asArray(raw).forEach((item, index) => target.push(withMigration('', item, sourceKey, index, {
    id: stringId(item.id, `legacy-${idPrefix}-${index + 1}`),
    ...(patcher ? patcher(item, index) : {}),
  })));
}

function withMigration(_entity, input, sourceKey, index, patch) {
  const legacyId = stringId(input?.id, `${sourceKey}-${index + 1}`);
  return {
    ...(input || {}),
    ...patch,
    legacyId,
    source: input?.source || 'legacy-migration',
    sourceKey,
    migrationKey: `${sourceKey}:${legacyId}`,
    createdAt: input?.createdAt || input?.dateCreated || nowIso(),
    updatedAt: input?.updatedAt || input?.dateUpdated || input?.createdAt || nowIso(),
  };
}

function buildMigrationWarnings(snapshot, orphans) {
  const warnings = [];
  if (orphans.length) warnings.push(`${orphans.length} 条记录引用了不存在的方案，已保留并标记供人工检查。`);
  if (asArray(snapshot.pw_plans).some(plan => !plan.id)) warnings.push('部分旧方案没有稳定 ID，迁移器生成了确定性回退 ID。');
  if (Object.keys(snapshot.dynamicShots || {}).length) warnings.push('检测到动态 pa_shots_* 镜头存储，已合并到统一 Shots。');
  return warnings;
}

function normalizeTaskStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['done', 'completed', 'complete', '已完成'].includes(value)) return 'done';
  if (['doing', 'in-progress', 'shooting', '进行中'].includes(value)) return 'doing';
  return 'todo';
}

function combineDateTime(date, time) {
  if (!date) return '';
  return time ? `${date}T${time}` : `${date}T09:00`;
}

function safeParse(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
function stringId(value, fallback) { return String(value == null || value === '' ? fallback : value); }

function deduplicateByKey(items, keyFn) {
  const seen = new Set();
  return (items || []).filter((item, index) => {
    const key = String(keyFn(item, index));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function attachReport(project, report) {
  return Object.assign(project, { migrationReport: report });
}

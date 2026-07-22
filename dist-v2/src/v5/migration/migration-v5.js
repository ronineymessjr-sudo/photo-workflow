import { createEntity } from '../common/entity.js';
import { stableHash, normalizeSearchText } from '../common/stable.js';
import { AppError } from '../common/errors.js';

export class SchemaV5MigrationService {
  constructor({ data, storage, repositories, catalogService }) {
    this.data = data;
    this.storage = storage;
    this.repos = repositories;
    this.catalogService = catalogService;
  }

  analyze() {
    const operations = this.buildOperations();
    const existingKeys = new Set(this.data.constructor ? [] : []);
    const counts = {};
    for (const [entity, records] of Object.entries(operations)) {
      counts[entity] = { detected: records.length, new: 0, existing: 0 };
      for (const record of records) {
        const duplicate = this.data.list(entity).some(item => item.migrationKey === record.migrationKey || item.id === record.id);
        if (duplicate) counts[entity].existing += 1;
        else counts[entity].new += 1;
      }
    }
    return {
      fromSchemaVersion: 4,
      toSchemaVersion: 5,
      generatedAt: new Date().toISOString(),
      counts,
      operations,
      warnings: this.buildWarnings(operations),
      existingKeys: [...existingKeys],
    };
  }

  migrate({ commit = true, force = false } = {}) {
    const prior = this.storage.get('schemaV5MigrationReport', null);
    if (commit && prior?.completed && !force) return prior;
    const analysis = this.analyze();
    const report = {
      ...analysis,
      startedAt: new Date().toISOString(),
      dryRun: !commit,
      completed: false,
      inserted: {},
      skipped: {},
    };
    if (!commit) return report;
    const rollback = this.storage.snapshot?.({ includeLegacy: true }) || null;
    if (rollback) this.storage.set('preSchemaV5MigrationBackup', rollback);
    try {
      this.catalogService.importEquipmentModels();
      for (const [entity, records] of Object.entries(analysis.operations)) {
        report.inserted[entity] = 0;
        report.skipped[entity] = 0;
        for (const record of records) {
          const duplicate = this.data.list(entity).some(item => item.migrationKey === record.migrationKey || item.id === record.id);
          if (duplicate) { report.skipped[entity] += 1; continue; }
          this.data.create(entity, record);
          report.inserted[entity] += 1;
        }
      }
      report.completed = true;
      report.completedAt = new Date().toISOString();
      this.storage.set('schemaV5MigrationReport', report);
      return report;
    } catch (error) {
      if (rollback && this.storage.restoreSnapshot) this.storage.restoreSnapshot(rollback, { replace: true });
      report.failedAt = new Date().toISOString();
      report.error = error instanceof AppError ? error.toJSON() : { code: 'MIGRATION_FAILED', message: error.message, details: {} };
      this.storage.set('schemaV5MigrationReport', report);
      throw error;
    }
  }

  buildOperations() {
    const operations = {
      projectBriefs: [], equipmentItems: [], resourceAssignments: [], talentProfiles: [], participantAssignments: [],
      referenceAssets: [], projectReferenceLinks: [], generationRuns: [], planRevisions: [], calendarEvents: [], financialEntries: [],
      postProductionJobs: [], lutPresets: [],
    };
    for (const project of this.data.list('projects')) {
      operations.projectBriefs.push(migrated('project-brief', `v4:project:${project.id}:brief`, {
        id: `brief-${project.id}`,
        projectId: project.id,
        shootingType: project.shootingType || '',
        goal: project.goal || '',
        theme: project.theme || project.title || '',
        style: project.style || '',
        mood: project.mood || '',
        locationIntent: project.location || '',
        dateIntent: project.date || '',
        deliverableTarget: project.deliverables || '',
        constraints: Array.isArray(project.constraints) ? project.constraints : [],
        notes: project.brief || '',
      }));
    }
    for (const item of this.data.list('equipment')) {
      const model = findModel([...this.catalogService.seed, ...this.data.list('equipmentModels')], item.name || item.n || item.title);
      const equipmentItem = migrated('equipment-item', `v4:equipment:${item.id}`, {
        id: `equipment-item-${item.id}`,
        equipmentModelId: model?.id || null,
        customName: model ? null : item.name || item.n || item.title || '历史设备',
        ownership: item.ownership || 'owned',
        quantity: Number(item.quantity || 1),
        condition: item.condition || 'unknown',
        availabilityStatus: normalizeAvailability(item.status || item.availabilityStatus),
        notes: item.notes || item.note || '',
        legacyId: item.id,
      });
      operations.equipmentItems.push(equipmentItem);
      if (item.projectId) operations.resourceAssignments.push(migrated('resource-assignment', `v4:equipment:${item.id}:project:${item.projectId}`, {
        id: `assignment-equipment-${item.id}`,
        projectId: item.projectId,
        resourceType: 'equipment',
        resourceId: equipmentItem.id,
        planId: item.planId || null,
        role: item.role || 'available',
        quantity: Number(item.quantity || 1),
        status: 'selected',
        required: Boolean(item.required),
        notes: item.notes || item.note || '',
      }));
    }
    for (const venue of this.data.list('venues').filter(item => !item.migrationKey && !String(item.id || '').startsWith('venue-v5-'))) {
      const globalVenue = migrated('venue', `v4:venue:${venue.id}`, {
        id: `venue-v5-${venue.id}`,
        name: venue.name || venue.title || '历史场地',
        address: venue.address || venue.location || '',
        indoorOutdoor: venue.indoorOutdoor || 'unknown',
        features: venue.features || [],
        lightingNotes: venue.lightingNotes || venue.notes || '',
        restrictions: venue.restrictions || [],
        priceNote: venue.priceNote || '',
        referenceAssetIds: [],
        legacyId: venue.id,
      });
      operations.resourceAssignments.push(...(venue.projectId ? [migrated('resource-assignment', `v4:venue:${venue.id}:project:${venue.projectId}`, {
        id: `assignment-venue-${venue.id}`, projectId: venue.projectId, resourceType: 'venue', resourceId: globalVenue.id,
        planId: venue.planId || null, role: venue.role || 'primary-location', status: 'selected', required: true, notes: venue.notes || '',
      })] : []));
      if (!this.data.get('venues', globalVenue.id)) operations.venues = [...(operations.venues || []), globalVenue];
    }
    for (const person of this.data.list('people')) {
      const talent = migrated('talent', `v4:person:${person.id}`, {
        id: `talent-${person.id}`,
        displayName: person.name || person.displayName || person.title || '历史模特',
        contact: person.contact || '',
        portfolioUrls: person.portfolioUrls || [],
        styleTags: person.styleTags || person.tags || [],
        availabilityNotes: person.availabilityNotes || '',
        consentStatus: normalizeConsent(person.consentStatus),
        boundaries: person.boundaries || person.privacyBoundaries || '',
        privateNotes: person.privateNotes || person.notes || '',
        analysisConsent: 'not_requested', analysisStatus: 'none', analysisSummary: null, legacyId: person.id,
      });
      operations.talentProfiles.push(talent);
      if (person.projectId) {
        operations.resourceAssignments.push(migrated('resource-assignment', `v4:person:${person.id}:project:${person.projectId}`, {
          id: `assignment-talent-${person.id}`, projectId: person.projectId, resourceType: 'talent', resourceId: talent.id,
          planId: person.planId || null, role: 'subject', status: 'selected', required: true, notes: '',
        }));
        operations.participantAssignments.push(migrated('participant-assignment', `v4:participant:${person.id}:project:${person.projectId}`, {
          id: `participant-model-${person.id}`, projectId: person.projectId, role: 'model', displayName: talent.displayName,
          contact: talent.contact, talentProfileId: talent.id, callTimeOffsetMinutes: 30, responsibilities: [], preparation: [], status: 'confirmed',
        }));
      }
    }
    for (const reference of this.data.list('references')) {
      const asset = migrated('reference-asset', `v4:reference:${reference.id}`, {
        id: `reference-asset-${reference.id}`,
        assetKind: reference.assetKind || 'real_photo', sourceType: reference.sourceType || reference.source || 'legacy',
        sourceId: reference.sourceId || reference.id, sourceUrl: reference.sourceUrl || reference.url || null,
        previewUrl: reference.previewUrl || reference.imageUrl || reference.thumbnail || null, localPath: reference.localPath || null,
        title: reference.title || reference.name || '历史参考', tags: reference.tags || [], photographer: reference.photographer || '',
        licenseStatus: reference.licenseStatus || 'unknown', verificationStatus: reference.verificationStatus || 'pending',
        contentHash: reference.contentHash || null, perceptualHash: reference.perceptualHash || null, synthetic: false,
        identityKey: reference.contentHash ? `content:${reference.contentHash}` : `legacy:${reference.id}`, legacyId: reference.id,
      });
      operations.referenceAssets.push(asset);
      if (reference.projectId) operations.projectReferenceLinks.push(migrated('project-reference-link', `v4:reference:${reference.id}:project:${reference.projectId}`, {
        id: `project-reference-${reference.id}`, projectId: reference.projectId, referenceAssetId: asset.id,
        role: reference.role || 'general', notes: reference.notes || '', locked: Boolean(reference.locked),
      }));
    }
    for (const plan of this.data.list('plans')) {
      const versions = this.data.list('planVersions', item => item.planId === plan.id);
      const source = versions.length ? versions : [plan];
      const generationRun = buildLegacyGenerationRun(plan, source);
      if (generationRun) operations.generationRuns.push(generationRun);
      source.forEach((version, index) => operations.planRevisions.push(migrated('plan-revision', `v4:plan:${plan.id}:revision:${version.id || index + 1}`, {
        id: `revision-${version.id || `${plan.id}-${index + 1}`}`,
        projectId: plan.projectId, planId: plan.id, generationRunId: generationRun?.id || null, contextSnapshotId: null,
        revisionNumber: Number(version.revisionNumber || index + 1),
        status: plan.planStatus === 'confirmed' || plan.lifecycleStatus === 'confirmed' || plan.lifecycleStatus === 'scheduled' ? 'confirmed' : 'candidate',
        concept: version.concept || plan.concept || plan.title || '历史方案', rationale: version.rationale || plan.rationale || '',
        visualDirection: version.visualDirection || {}, preparationGuide: version.preparationGuide || plan.preparationGuide || [],
        expectedDeliverableCount: Number(version.expectedDeliverableCount || plan.expectedDeliverableCount || plan.deliverableCount || 1),
        mustHaveShotCount: Number(version.mustHaveShotCount || 0), equipmentRecommendations: version.equipmentRecommendations || [],
        risks: version.risks || plan.risks || [], rawApprovedOutput: null, legacyId: version.id || plan.id,
      })));
      if (plan.deliveryStatus && plan.deliveryStatus !== 'not_started') operations.postProductionJobs.push(migrated('post-production-job', `v4:plan:${plan.id}:post`, {
        id: `post-${plan.id}`, projectId: plan.projectId, planId: plan.id,
        planRevisionId: operations.planRevisions.filter(item => item.planId === plan.id).at(-1)?.id || null,
        status: mapPostStatus(plan.deliveryStatus), expectedLookSnapshot: plan.expectedLook || null,
        primaryBackupPath: plan.backupPrimary || '', secondaryBackupPath: plan.backupSecondary || '', sourceMediaPath: plan.sourceMediaPath || '',
        selectedCount: Number(plan.selectedCount || 0), editVersion: plan.editVersion || '', feedbackStatus: plan.feedbackStatus || 'not_requested',
        deliveryUrl: plan.deliveryUrl || '', deliveredAt: plan.deliveredAt || null, lutPresetId: plan.lutPresetId || null, notes: '',
      }));
    }
    for (const task of this.data.list('tasks').filter(item => item.taskType === 'shoot-call')) {
      operations.calendarEvents.push(migrated('calendar-event', `v4:task:${task.id}:event`, {
        id: `event-${task.id}`, projectId: task.projectId, planId: task.planId || null,
        planRevisionId: operations.planRevisions.filter(item => item.planId === task.planId).at(-1)?.id || null,
        eventType: 'shoot', title: task.title || '历史拍摄', startAt: toIso(task.startAt || task.date), endAt: toIso(task.endAt || task.startAt || task.date, 2),
        timezone: task.timezone || 'Asia/Shanghai', location: task.location || '', status: task.status === 'done' ? 'completed' : 'scheduled',
        participantAssignmentIds: [], notes: task.notes || '', blocksTime: true, legacyId: task.id,
      }));
      const amount = Number(task.expectedRevenue || task.amount || task.price || 0);
      if (amount > 0) operations.financialEntries.push(migrated('financial-entry', `v4:task:${task.id}:expected-revenue`, {
        id: `finance-expected-${task.id}`, projectId: task.projectId, calendarEventId: `event-${task.id}`,
        planRevisionId: operations.planRevisions.filter(item => item.planId === task.planId).at(-1)?.id || null,
        type: 'expected_revenue', amount, currency: task.currency || 'CNY', occurredAt: toIso(task.startAt || task.date), status: 'expected', notes: '',
      }));
    }
    for (const lut of this.data.list('luts')) operations.lutPresets.push(migrated('lut-preset', `v4:lut:${lut.id}`, {
      id: `lut-preset-${lut.id}`, name: lut.name || lut.title || '历史 LUT', sourceType: lut.sourceType || 'legacy', sourceUrl: lut.sourceUrl || null,
      localPath: lut.localPath || null, inputColorSpace: lut.inputColorSpace || 'display-referred', outputColorSpace: lut.outputColorSpace || 'display-referred',
      creativeIntent: lut.creativeIntent || '', licenseStatus: lut.licenseStatus || 'unknown', verificationStatus: lut.verificationStatus || 'pending', legacyId: lut.id,
    }));
    deduplicateReferenceOperations(operations);
    return operations;
  }

  buildWarnings(operations) {
    const warnings = [];
    if (operations.equipmentItems.some(item => !item.equipmentModelId)) warnings.push('部分历史设备无法与内置型号精确匹配，已保留为自定义设备。');
    if (operations.calendarEvents.some(item => !item.planRevisionId)) warnings.push('部分历史日程未能关联到方案版本，保留事件并等待人工关联。');
    return warnings;
  }
}

function migrated(prefix, migrationKey, input) { return createEntity(prefix, { ...input, migrationKey, source: input.source || 'schema-v5-migration' }); }
function findModel(models, name) {
  const target = normalizeSearchText(name);
  if (!target) return null;
  return models.find(item => {
    const candidates = [item.model, `${item.brand} ${item.model}`, ...(item.aliases || [])].map(normalizeSearchText);
    return candidates.some(candidate => candidate && (target === candidate || target.includes(candidate) || compact(target) === compact(candidate)));
  }) || null;
}
function compact(value) { return String(value || '').replace(/[^a-z0-9]+/gi, ''); }
function normalizeAvailability(value) { return /ready|available|可用|正常/i.test(String(value || '')) ? 'available' : 'unknown'; }
function normalizeConsent(value) { return /granted|confirmed|同意|已确认/i.test(String(value || '')) ? 'granted' : 'not_requested'; }
function mapPostStatus(value) {
  const mapping = { backed_up: 'backed_up', selecting: 'selecting', editing: 'editing', awaiting_feedback: 'awaiting_feedback', delivered: 'delivered' };
  return mapping[value] || 'not_started';
}
function toIso(value, addHours = 0) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  if (addHours) date.setHours(date.getHours() + addHours);
  return date.toISOString();
}


function buildLegacyGenerationRun(plan, versions) {
  const provider = plan.agentProvider || plan.provider || plan.aiProvider || plan.generatedBy || '';
  const model = plan.agentModel || plan.model || plan.aiModel || '';
  const rawOutput = plan.agentOutput || plan.rawAgentOutput || plan.generationOutput || null;
  const instruction = plan.agentInstruction || plan.prompt || '';
  const runId = plan.generationRunId || plan.agentRunId || `generation-run-legacy-${plan.id}`;
  if (!provider && !model && !rawOutput && !instruction && !plan.generatedAt) return null;
  const lastVersion = versions.at(-1);
  const approvedRevisionId = `revision-${lastVersion?.id || `${plan.id}-${versions.length || 1}`}`;
  return migrated('generation-run', `v4:plan:${plan.id}:generation-run`, {
    id: runId,
    projectId: plan.projectId,
    contextSnapshotId: null,
    runType: 'plan',
    provider: provider || 'legacy-unknown-provider',
    model: model || 'legacy-unknown-model',
    promptVersion: plan.agentPromptVersion || plan.promptVersion || 'legacy',
    status: 'approved',
    instruction,
    parentRunId: null,
    validation: { ok: null, migrated: true },
    rawOutput,
    normalizedOutput: plan.normalizedAgentOutput || null,
    error: null,
    approvedPlanId: plan.id,
    approvedPlanRevisionId: approvedRevisionId,
    approvedAt: plan.generatedAt || plan.updatedAt || plan.createdAt || new Date().toISOString(),
    legacyId: plan.agentRunId || plan.generationRunId || plan.id,
  });
}

function deduplicateReferenceOperations(operations) {
  const canonicalByIdentity = new Map();
  const replacement = new Map();
  const kept = [];
  for (const asset of operations.referenceAssets || []) {
    const identity = referenceMigrationIdentity(asset);
    const canonical = canonicalByIdentity.get(identity);
    if (!canonical) {
      asset.legacyIds = [...new Set([asset.legacyId].filter(Boolean))];
      canonicalByIdentity.set(identity, asset);
      kept.push(asset);
      continue;
    }
    replacement.set(asset.id, canonical.id);
    canonical.legacyIds = [...new Set([...(canonical.legacyIds || []), asset.legacyId].filter(Boolean))];
    canonical.tags = [...new Set([...(canonical.tags || []), ...(asset.tags || [])])];
    canonical.previewUrl ||= asset.previewUrl;
    canonical.localPath ||= asset.localPath;
  }
  operations.referenceAssets = kept;
  for (const link of operations.projectReferenceLinks || []) {
    if (replacement.has(link.referenceAssetId)) link.referenceAssetId = replacement.get(link.referenceAssetId);
  }
  const seenLinks = new Set();
  operations.projectReferenceLinks = (operations.projectReferenceLinks || []).filter(link => {
    const key = `${link.projectId}:${link.referenceAssetId}:${link.role || 'general'}`;
    if (seenLinks.has(key)) return false;
    seenLinks.add(key);
    return true;
  });
}
function referenceMigrationIdentity(asset) {
  if (asset.contentHash) return `content:${asset.contentHash}`;
  if (asset.sourceType && asset.sourceId) return `source:${asset.sourceType}:${asset.sourceId}`;
  if (asset.sourceUrl) return `url:${normalizeMigrationUrl(asset.sourceUrl)}`;
  return `legacy:${asset.id}`;
}
function normalizeMigrationUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) url.searchParams.delete(key);
    return url.toString();
  } catch { return String(value || '').trim(); }
}

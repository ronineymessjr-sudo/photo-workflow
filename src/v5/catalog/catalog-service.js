import { createEntity, updateEntity } from '../common/entity.js';
import { AppError, invariant } from '../common/errors.js';
import { normalizeSearchText, stableHash } from '../common/stable.js';
import { EQUIPMENT_MODEL_SEED } from '../seeds/equipment-models.js';
import { PLAN_TEMPLATE_SEED } from '../seeds/plan-templates.js';

export class CatalogService {
  constructor(repositories, options = {}) {
    this.repos = repositories;
    this.seed = options.seed || EQUIPMENT_MODEL_SEED;
    this.planTemplateSeed = options.planTemplateSeed || PLAN_TEMPLATE_SEED;
  }

  importEquipmentModels(models = this.seed) {
    const inserted = [];
    const updated = [];
    const unchanged = [];
    for (const raw of models) {
      const existing = this.repos.equipmentModels.get(raw.id);
      if (!existing) {
        inserted.push(this.repos.equipmentModels.create(createEntity('equipment-model', raw)));
        continue;
      }
      if (catalogFingerprint(existing) === catalogFingerprint(raw)) unchanged.push(existing);
      else updated.push(this.repos.equipmentModels.save(updateEntity(existing, raw)));
    }
    return { inserted, updated, unchanged, total: models.length };
  }


  importPlanTemplates(templates = this.planTemplateSeed) {
    const inserted = [];
    const updated = [];
    const unchanged = [];
    for (const raw of templates) {
      const existing = this.repos.planTemplates.get(raw.id);
      if (!existing) { inserted.push(this.repos.planTemplates.create(createEntity('plan-template', raw))); continue; }
      if (stableHash(stripRecordMetadata(existing)) === stableHash(stripRecordMetadata(raw))) unchanged.push(existing);
      else updated.push(this.repos.planTemplates.save(updateEntity(existing, raw)));
    }
    return { inserted, updated, unchanged, total: templates.length };
  }

  searchPlanTemplates(query = '', filters = {}) {
    const normalized = normalizeSearchText(query);
    return this.repos.planTemplates.list(item => {
      if (filters.shootingType && !(item.shootingTypes || []).some(value => normalizeSearchText(value).includes(normalizeSearchText(filters.shootingType)))) return false;
      if (!normalized) return true;
      return normalizeSearchText([item.name, item.description, ...(item.shootingTypes || [])].join(' ')).includes(normalized);
    });
  }

  searchEquipmentModels(query = '', filters = {}) {
    const normalized = normalizeSearchText(query);
    return this.repos.equipmentModels.list(item => {
      if (filters.category && item.category !== filters.category) return false;
      if (filters.brand && normalizeSearchText(item.brand) !== normalizeSearchText(filters.brand)) return false;
      if (filters.mount && normalizeSearchText(item.mount) !== normalizeSearchText(filters.mount)) return false;
      if (!normalized) return true;
      return normalizeSearchText([item.brand, item.model, item.category, item.mount, ...(item.aliases || []), ...(item.tags || [])].join(' ')).includes(normalized);
    });
  }

  addEquipmentItem(input) {
    const model = input.equipmentModelId ? this.repos.equipmentModels.require(input.equipmentModelId) : null;
    invariant(model || String(input.customName || '').trim(), 'EQUIPMENT_NAME_REQUIRED', '请选择设备型号或填写自定义设备名称');
    invariant(['owned', 'rented', 'borrowed', 'wishlist'].includes(input.ownership || 'owned'), 'INVALID_OWNERSHIP', '设备来源不合法');
    return this.repos.equipmentItems.create(createEntity('equipment-item', {
      equipmentModelId: model?.id || null,
      customName: model ? null : String(input.customName).trim(),
      ownership: input.ownership || 'owned',
      quantity: Math.max(1, Number(input.quantity || 1)),
      condition: input.condition || 'good',
      availabilityStatus: input.availabilityStatus || 'available',
      notes: input.notes || '',
    }));
  }

  saveVenue(input) {
    invariant(String(input.name || '').trim(), 'VENUE_NAME_REQUIRED', '场地名称不能为空');
    const record = createEntity('venue', {
      name: String(input.name).trim(),
      address: input.address || '',
      indoorOutdoor: input.indoorOutdoor || 'unknown',
      features: uniqueStrings(input.features),
      lightingNotes: input.lightingNotes || '',
      restrictions: uniqueStrings(input.restrictions),
      priceNote: input.priceNote || '',
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      referenceAssetIds: uniqueStrings(input.referenceAssetIds),
      source: input.source || 'custom',
    });
    return this.repos.venues.create(record);
  }

  saveTalentProfile(input) {
    invariant(String(input.displayName || '').trim(), 'TALENT_NAME_REQUIRED', '模特显示名称不能为空');
    return this.repos.talentProfiles.create(createEntity('talent', {
      displayName: String(input.displayName).trim(),
      contact: input.contact || '',
      portfolioUrls: uniqueStrings(input.portfolioUrls),
      styleTags: uniqueStrings(input.styleTags),
      availabilityNotes: input.availabilityNotes || '',
      consentStatus: input.consentStatus || 'not_requested',
      boundaries: input.boundaries || '',
      privateNotes: input.privateNotes || '',
      analysisConsent: input.analysisConsent || 'not_requested',
      analysisStatus: 'none',
      analysisSummary: null,
    }));
  }

  assignResourceToProject(input) {
    this.repos.projects.require(input.projectId);
    const repository = resourceRepository(this.repos, input.resourceType);
    repository.require(input.resourceId);
    const existing = this.repos.resourceAssignments.list(item =>
      item.projectId === input.projectId && item.resourceType === input.resourceType && item.resourceId === input.resourceId && (item.planId || '') === (input.planId || ''))[0];
    if (existing) return existing;
    return this.repos.resourceAssignments.create(createEntity('resource-assignment', {
      projectId: input.projectId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      planId: input.planId || null,
      role: input.role || 'available',
      quantity: input.quantity == null ? null : Math.max(1, Number(input.quantity)),
      status: input.status || 'selected',
      required: Boolean(input.required),
      notes: input.notes || '',
    }));
  }

  removeResourceAssignment(assignmentId) {
    const assignment = this.repos.resourceAssignments.require(assignmentId);
    this.repos.resourceAssignments.remove(assignmentId);
    return assignment;
  }

  listProjectResources(projectId) {
    return this.repos.resourceAssignments.list(item => item.projectId === projectId).map(assignment => {
      const resource = resourceRepository(this.repos, assignment.resourceType).get(assignment.resourceId);
      return { assignment, resource };
    });
  }
}

function resourceRepository(repos, type) {
  if (type === 'equipment') return repos.equipmentItems;
  if (type === 'venue') return repos.venues;
  if (type === 'talent') return repos.talentProfiles;
  throw new AppError('INVALID_RESOURCE_TYPE', '资源类型不支持', { type });
}
function uniqueStrings(values) { return [...new Set((values || []).map(value => String(value).trim()).filter(Boolean))]; }

function catalogFingerprint(value) {
  const { id, brand, model, category, mount = null, sensorFormat = null, focalRange = null, maxAperture = null, aliases = [], tags = [], source = '', sourceUrl = '', isBuiltIn = false, catalogVersion = '', verifiedAt = '' } = value || {};
  return stableHash({ id, brand, model, category, mount, sensorFormat, focalRange, maxAperture, aliases, tags, source, sourceUrl, isBuiltIn, catalogVersion, verifiedAt });
}

function stripRecordMetadata(value) { const { createdAt, updatedAt, schemaVersion, recordVersion, ...rest } = value || {}; return rest; }

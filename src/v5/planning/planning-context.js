import { createEntity } from '../common/entity.js';
import { AppError, invariant } from '../common/errors.js';
import { stableHash } from '../common/stable.js';
import { validatePlanningContext } from '../contracts/validators.js';

export class PlanningContextBuilder {
  constructor(repositories) { this.repos = repositories; }

  build(command) {
    const project = this.repos.projects.require(command.projectId);
    const brief = this.repos.projectBriefs.list(item => item.projectId === command.projectId)[0]
      || createBriefFromLegacyProject(project);
    validateBriefForPlanning(brief);
    const template = command.templateId ? this.repos.planTemplates.get(command.templateId) : null;
    const assignmentIds = new Set(command.equipmentAssignmentIds || []);
    const equipmentAssignments = this.repos.resourceAssignments.list(item =>
      item.projectId === command.projectId && item.resourceType === 'equipment' && item.status === 'selected' && (!assignmentIds.size || assignmentIds.has(item.id)));
    if (assignmentIds.size) {
      const foundIds = new Set(equipmentAssignments.map(item => item.id));
      const missingIds = [...assignmentIds].filter(id => !foundIds.has(id));
      if (missingIds.length) throw new AppError('EQUIPMENT_ASSIGNMENT_NOT_SELECTED', '选择的设备未分配到项目或已取消选择', { assignmentIds: missingIds });
    }
    const resolvedEquipment = equipmentAssignments.map(assignment => resolveEquipment(this.repos, assignment));
    const unavailable = resolvedEquipment.filter(item => item.availabilityStatus !== 'available');
    if (assignmentIds.size && unavailable.length) throw new AppError('EQUIPMENT_UNAVAILABLE', '选择的设备当前不可用', { equipmentItemIds: unavailable.map(item => item.equipmentItemId) });
    const equipment = resolvedEquipment.filter(item => item.availabilityStatus === 'available');
    const venueAssignment = command.venueAssignmentId
      ? this.repos.resourceAssignments.require(command.venueAssignmentId)
      : this.repos.resourceAssignments.list(item => item.projectId === command.projectId && item.resourceType === 'venue' && item.status === 'selected')[0];
    const venue = venueAssignment ? resolveVenue(this.repos, venueAssignment) : null;
    const talentIds = new Set(command.talentAssignmentIds || []);
    const talent = this.repos.resourceAssignments.list(item =>
      item.projectId === command.projectId && item.resourceType === 'talent' && item.status === 'selected' && (!talentIds.size || talentIds.has(item.id)))
      .map(assignment => resolveTalent(this.repos, assignment));
    const projectLinkIds = new Set(command.projectReferenceLinkIds || []);
    const references = this.repos.projectReferenceLinks.list(item =>
      item.projectId === command.projectId && (!projectLinkIds.size || projectLinkIds.has(item.id)))
      .map(link => resolveReference(this.repos, link));
    const reviews = this.repos.reviews.list(item => item.projectId === command.projectId);
    const historicalReviewSummary = reviews.slice(0, 10).map(item => ({
      id: item.id,
      planId: item.planId || null,
      planScore: item.planScore ?? null,
      executionScore: item.executionScore ?? null,
      reusableInsights: item.reusableInsights || '',
      failedShots: item.failedShots || '',
      knowledgeSourceIds: item.knowledgeSourceIds || [],
      knowledgeValidationStatus: item.knowledgeValidationStatus || 'not-recorded',
    }));
    const lookRequest = normalizeLookRequest(command.lookRequest);
    const knowledgeSources = normalizeKnowledgeSources(command.knowledgeSources);
    const knowledgeRetrieval = normalizeKnowledgeRetrieval(command.knowledgeRetrieval, knowledgeSources);
    const knowledgePolicy = {
      maxSources: 12,
      metadataOnlyUse: 'idea-candidate',
      requiresOriginalSourceVerification: true,
      forbidInventedParameters: true,
      sceneRequiresLocationConfirmation: true,
    };
    const immutablePayload = {
      projectId: project.id,
      brief: stripMutableFields(brief),
      template: template ? stripMutableFields(template) : null,
      equipment,
      venue,
      talent,
      references,
      knowledgeSources,
      knowledgeRetrieval,
      knowledgePolicy,
      historicalReviewSummary,
      constraints: uniqueStrings([...(brief.constraints || []), ...(command.constraints || [])]),
      lookRequest,
    };
    invariant(references.every(item => item.synthetic === false), 'SYNTHETIC_REFERENCE_IN_CONTEXT', '方案上下文不能混入 AI 生成图');
    const snapshot = createEntity('planning-snapshot', {
      ...immutablePayload,
      contextHash: stableHash(immutablePayload),
      immutable: true,
    });
    validatePlanningContext({
      id: snapshot.id,
      projectId: snapshot.projectId,
      brief: snapshot.brief,
      template: snapshot.template,
      equipment: snapshot.equipment,
      venue: snapshot.venue,
      talent: snapshot.talent,
      references: snapshot.references,
      knowledgeSources: snapshot.knowledgeSources,
      knowledgeRetrieval: snapshot.knowledgeRetrieval,
      knowledgePolicy: snapshot.knowledgePolicy,
      constraints: snapshot.constraints,
      lookRequest: snapshot.lookRequest,
      createdAt: snapshot.createdAt,
      contextHash: snapshot.contextHash,
    });
    return this.repos.planningSnapshots.create(snapshot);
  }
}

function resolveEquipment(repos, assignment) {
  const item = repos.equipmentItems.require(assignment.resourceId);
  const model = item.equipmentModelId ? repos.equipmentModels.get(item.equipmentModelId) : null;
  return {
    assignmentId: assignment.id,
    equipmentItemId: item.id,
    equipmentModelId: model?.id || null,
    name: model ? `${model.brand} ${model.model}` : item.customName,
    category: model?.category || item.category || 'accessory',
    mount: model?.mount || null,
    sensorFormat: model?.sensorFormat || null,
    focalRange: model?.focalRange || null,
    maxAperture: model?.maxAperture || null,
    availabilityStatus: item.availabilityStatus,
    ownership: item.ownership,
    quantity: assignment.quantity || item.quantity || 1,
    role: assignment.role,
    required: Boolean(assignment.required),
  };
}
function resolveVenue(repos, assignment) {
  const venue = repos.venues.require(assignment.resourceId);
  return {
    assignmentId: assignment.id,
    venueId: venue.id,
    name: venue.name,
    address: venue.address || '',
    indoorOutdoor: venue.indoorOutdoor,
    features: venue.features || [],
    lightingNotes: venue.lightingNotes || '',
    restrictions: venue.restrictions || [],
    role: assignment.role,
  };
}
function resolveTalent(repos, assignment) {
  const profile = repos.talentProfiles.require(assignment.resourceId);
  return {
    assignmentId: assignment.id,
    talentProfileId: profile.id,
    displayName: profile.displayName,
    styleTags: profile.styleTags || [],
    boundaries: profile.boundaries || '',
    consentStatus: profile.consentStatus,
    role: assignment.role,
  };
}
function resolveReference(repos, link) {
  const asset = repos.referenceAssets.require(link.referenceAssetId);
  if (asset.synthetic) throw new AppError('SYNTHETIC_REFERENCE_IN_CONTEXT', 'AI 生成图不能作为实拍参考输入', { referenceAssetId: asset.id });
  return {
    projectReferenceLinkId: link.id,
    referenceAssetId: asset.id,
    assetKind: asset.assetKind,
    sourceType: asset.sourceType,
    sourceUrl: asset.sourceUrl || null,
    previewUrl: asset.previewUrl || null,
    title: asset.title,
    tags: asset.tags || [],
    role: link.role,
    notes: link.notes || '',
    locked: Boolean(link.locked),
    synthetic: false,
  };
}
function normalizeLookRequest(input) {
  if (!input?.enabled) return { enabled: false, generateConceptImages: false, count: 0, colorIntent: '', retouchIntent: '' };
  return {
    enabled: true,
    generateConceptImages: Boolean(input.generateConceptImages),
    count: Math.min(9, Math.max(1, Number(input.count || 4))),
    colorIntent: input.colorIntent || '',
    retouchIntent: input.retouchIntent || '',
    lightingIntent: input.lightingIntent || '',
    lutIntent: input.lutIntent || '',
  };
}
function normalizeKnowledgeSources(input) {
  const seen = new Set();
  return (Array.isArray(input) ? input : []).map(item => ({
    id: String(item?.id || '').trim(),
    type: item?.type || 'knowledge',
    kind: item?.kind || 'note',
    title: String(item?.title || '').trim(),
    sourceType: item?.sourceType || 'obsidian',
    path: item?.path || null,
    sourceUrl: item?.sourceUrl || null,
    excerpt: String(item?.excerpt || item?.snippet || '').trim().slice(0, 1200),
    tags: uniqueStrings(Array.isArray(item?.tags) ? item.tags : [item?.tags]),
    workflowStage: uniqueStrings(Array.isArray(item?.workflowStage) ? item.workflowStage : [item?.workflowStage]),
    groundingStatus: item?.groundingStatus || 'vault-note',
    selectionRole: item?.selectionRole || 'general',
    selectionMode: item?.selectionMode || 'manual',
    whyMatched: String(item?.whyMatched || '').trim(),
    matchedTerms: uniqueStrings(Array.isArray(item?.matchedTerms) ? item.matchedTerms : [item?.matchedTerms]),
    score: Number.isFinite(Number(item?.score)) ? Number(item.score) : null,
    requiresVerification: item?.requiresVerification === true || item?.groundingStatus === 'metadata-only',
  })).filter(item => {
    if (!item.id || !item.title || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 12);
}
function normalizeKnowledgeRetrieval(input, sources) {
  const value = input && typeof input === 'object' ? input : {};
  const coverage = value.coverage && typeof value.coverage === 'object'
    ? Object.fromEntries(Object.entries(value.coverage).map(([key, count]) => [key, Number(count || 0)]))
    : {};
  return {
    mode: value.mode || (sources.length ? 'manual' : 'none'),
    query: String(value.query || '').trim(),
    requestedRoles: uniqueStrings(value.requestedRoles || []),
    coverage,
    manualCount: Number(value.manualCount || sources.filter(item => item.selectionMode === 'manual').length),
    autoCount: Number(value.autoCount || sources.filter(item => item.selectionMode === 'automatic').length),
    candidatesEvaluated: Number(value.candidatesEvaluated || 0),
    indexVersion: String(value.indexVersion || ''),
  };
}
function createBriefFromLegacyProject(project) {
  return {
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
    constraints: project.constraints || [],
    notes: project.brief || '',
  };
}
function stripMutableFields(value) {
  const { updatedAt, version, ...rest } = structuredClone(value || {});
  return rest;
}
function uniqueStrings(values) { return [...new Set((values || []).map(value => String(value).trim()).filter(Boolean))]; }

function validateBriefForPlanning(brief) {
  const missing = [];
  if (!String(brief?.shootingType || '').trim()) missing.push('shootingType');
  if (!String(brief?.goal || brief?.theme || '').trim()) missing.push('goalOrTheme');
  if (!String(brief?.deliverableTarget || '').trim()) missing.push('deliverableTarget');
  if (missing.length) throw new AppError('BRIEF_INCOMPLETE', '生成方案前需要补全拍摄类型、目标/主题和交付目标', { missing });
}

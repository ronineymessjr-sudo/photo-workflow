export const APP_VERSION = '2.5.0-domain-implementation';
export const APP_SCHEMA_VERSION = 5;
export const BACKUP_FORMAT = 'photoatelier.backup.v5';

// Existing Feishu eight-table sync remains unchanged until the remote schema is upgraded.
export const SYNC_ENTITIES = Object.freeze([
  'projects', 'references', 'plans', 'shots', 'tasks', 'luts', 'reviews', 'messages',
]);

export const V4_LOCAL_ENTITIES = Object.freeze([
  'assets', 'equipment', 'venues', 'people', 'shootRecords', 'relations', 'planVersions',
]);

export const V5_LOCAL_ENTITIES = Object.freeze([
  'projectBriefs',
  'equipmentModels', 'equipmentItems', 'talentProfiles', 'resourceAssignments', 'planTemplates',
  'referenceAssets', 'projectReferenceLinks', 'shotReferenceLinks',
  'planningSnapshots', 'generationRuns', 'visualDNAs', 'creativeDirections', 'planRevisions', 'expectedLooks',
  'imageGenerationRuns', 'generatedAssets',
  'calendarEvents', 'financialEntries', 'participantAssignments',
  'postProductionJobs', 'lutPresets', 'sharePackets', 'domainEvents',
]);

export const LOCAL_ENTITIES = Object.freeze([...new Set([...V4_LOCAL_ENTITIES, ...V5_LOCAL_ENTITIES])]);
export const ENTITIES = Object.freeze([...new Set([...SYNC_ENTITIES, ...LOCAL_ENTITIES])]);

export const PLAN_STATUSES = Object.freeze(['draft', 'candidate', 'confirmed', 'archived', 'cancelled']);
export const PLAN_REVISION_STATUSES = Object.freeze(['candidate', 'confirmed', 'superseded', 'rejected', 'archived']);
export const GENERATION_RUN_STATUSES = Object.freeze(['queued', 'running', 'awaiting_approval', 'failed', 'approved', 'rejected']);
export const EXECUTION_STATUSES = Object.freeze(['unscheduled', 'scheduled', 'preparing', 'shooting', 'completed', 'cancelled']);
export const DELIVERY_STATUSES = Object.freeze(['not_started', 'backed_up', 'selecting', 'editing', 'awaiting_feedback', 'delivered']);
export const SHOT_STATUSES = Object.freeze(['planned', 'captured', 'retake_required', 'skipped']);
export const TASK_TYPES = Object.freeze(['checklist', 'shoot-call', 'post-production', 'publishing']);
export const CALENDAR_EVENT_TYPES = Object.freeze(['shoot', 'meeting', 'deadline', 'personal', 'other']);
export const FINANCIAL_ENTRY_TYPES = Object.freeze(['expected_revenue', 'received_revenue', 'expense']);

export const LEGACY_KEYS = Object.freeze([
  'pw_plans', 'pw_schedule', 'pw_schedules', 'pw_messages', 'pw_todos', 'pw_tpl',
  'pw_eq', 'pw_equipment', 'pw_models', 'pw_venues',
  'pa_projects', 'pa_reviews', 'pa_shoot_records', 'pa_lut_profiles',
  'pa_plan_versions', 'pa_relation_decisions', 'pa_asset_decisions',
  'pa_feishu_references', 'pa_custom_shots', 'pa_workflow_preferences',
]);

export function normalizePlanState(input = {}) {
  const legacy = input.lifecycleStatus || input.planStatus || input.status;
  let planStatus = PLAN_STATUSES.includes(input.planStatus) ? input.planStatus : 'draft';
  let executionStatus = EXECUTION_STATUSES.includes(input.executionStatus) ? input.executionStatus : 'unscheduled';
  let deliveryStatus = DELIVERY_STATUSES.includes(input.deliveryStatus) ? input.deliveryStatus : 'not_started';

  if (legacy === 'candidate') planStatus = 'candidate';
  if (legacy === 'confirmed') planStatus = 'confirmed';
  if (legacy === 'scheduled') {
    planStatus = 'confirmed';
    executionStatus = 'scheduled';
  }
  if (legacy === 'shooting') {
    planStatus = 'confirmed';
    executionStatus = 'shooting';
  }
  if (legacy === 'completed') {
    planStatus = 'confirmed';
    executionStatus = 'completed';
  }
  if (input.postProductionStatus === 'delivered') deliveryStatus = 'delivered';

  return { planStatus, executionStatus, deliveryStatus };
}

export function inferWorkflowStage(plan = {}) {
  const { planStatus, executionStatus, deliveryStatus } = normalizePlanState(plan);
  if (planStatus === 'cancelled') return '已取消';
  if (planStatus === 'archived') return '已归档';
  if (deliveryStatus === 'delivered') return '已交付';
  if (deliveryStatus !== 'not_started') return '后期处理中';
  if (executionStatus === 'completed') return '拍摄完成';
  if (executionStatus === 'shooting') return '拍摄中';
  if (executionStatus === 'preparing') return '拍前准备';
  if (executionStatus === 'scheduled') return '已排期';
  if (planStatus === 'confirmed') return '正式方案';
  if (planStatus === 'candidate') return '预选方案';
  return '草稿';
}

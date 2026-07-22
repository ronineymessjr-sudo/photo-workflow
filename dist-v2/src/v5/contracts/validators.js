import { AppError } from '../common/errors.js';

export function validatePlanningContext(value) {
  const issues = [];
  requiredString(value, 'id', issues);
  requiredString(value, 'projectId', issues);
  if (!value?.brief || typeof value.brief !== 'object') issues.push('brief 必须是对象');
  arrayField(value, 'equipment', issues);
  arrayField(value, 'references', issues);
  arrayField(value, 'knowledgeSources', issues);
  arrayField(value, 'constraints', issues);
  requiredString(value, 'createdAt', issues);
  requiredString(value, 'contextHash', issues);
  if (value?.visualDNAId != null && typeof value.visualDNAId !== 'string') issues.push('visualDNAId 必须为字符串或 null');
  if (value?.shootingScale != null && !['simple', 'standard', 'comprehensive'].includes(value.shootingScale)) issues.push('shootingScale 必须为 simple/standard/comprehensive');
  for (const reference of value?.references || []) {
    if (reference.synthetic !== false) issues.push('PlanningContext 只能包含真实参考素材');
    if (!reference.referenceAssetId) issues.push('参考素材缺少 referenceAssetId');
  }
  for (const source of value?.knowledgeSources || []) {
    if (!source?.id) issues.push('知识来源缺少 id');
    if (!source?.title) issues.push('知识来源缺少 title');
    if (!source?.groundingStatus) issues.push('知识来源缺少 groundingStatus');
  }
  if (value?.knowledgeRetrieval != null && typeof value.knowledgeRetrieval !== 'object') issues.push('knowledgeRetrieval 必须是对象');
  if (value?.knowledgePolicy != null) {
    if (typeof value.knowledgePolicy !== 'object') issues.push('knowledgePolicy 必须是对象');
    else if (value.knowledgePolicy.forbidInventedParameters !== true) issues.push('knowledgePolicy 必须禁止编造参数');
  }
  return finish('INVALID_PLANNING_CONTEXT', issues);
}

export function validatePlanGenerationOutput(value) {
  const issues = [];
  requiredString(value, 'concept', issues);
  requiredString(value, 'rationale', issues);
  arrayField(value, 'preparationGuide', issues);
  arrayField(value, 'shots', issues, true);
  arrayField(value, 'risks', issues);
  if (!Number.isInteger(value?.expectedDeliverableCount) || value.expectedDeliverableCount < 1) {
    issues.push('expectedDeliverableCount 必须为正整数');
  }
  const sequences = new Set();
  for (const shot of value?.shots || []) {
    for (const field of ['scene', 'shotSize', 'cameraAngle', 'composition', 'focalLength', 'lighting', 'poseGuidance', 'priority']) {
      requiredString(shot, field, issues, `shot.${field}`);
    }
    if (!Number.isInteger(shot.sequence) || shot.sequence < 1) issues.push('镜头 sequence 必须为正整数');
    if (shot.emotion && typeof shot.emotion !== 'string') issues.push(`镜头 ${shot.sequence} emotion 必须为字符串`);
    if (shot.learningFocus && typeof shot.learningFocus !== 'string') issues.push(`镜头 ${shot.sequence} learningFocus 必须为字符串`);
    if (shot.whyThisShot && typeof shot.whyThisShot !== 'string') issues.push(`镜头 ${shot.sequence} whyThisShot 必须为字符串`);
    if (shot.visualMatchScore != null && (typeof shot.visualMatchScore !== 'number' || shot.visualMatchScore < 0 || shot.visualMatchScore > 100)) issues.push(`镜头 ${shot.sequence} visualMatchScore 必须为 0-100 整数`);
    if (shot.lighting && typeof shot.lighting === 'object' && !shot.lighting.main) issues.push(`镜头 ${shot.sequence} 结构化光线缺少 main 字段`);
    if (sequences.has(shot.sequence)) issues.push(`镜头 sequence 重复：${shot.sequence}`);
    sequences.add(shot.sequence);
    if (!shot.sourceTrace || !Array.isArray(shot.sourceTrace.referenceAssetIds) || !Array.isArray(shot.sourceTrace.equipmentItemIds)) {
      issues.push(`镜头 ${shot.sequence || '?'} 缺少 sourceTrace`);
    }
  }
  return finish('INVALID_PLAN_GENERATION_OUTPUT', issues);
}


export function validatePlanOutputAgainstContext(output, snapshot) {
  validatePlanGenerationOutput(output);
  const issues = [];
  const referenceIds = new Set((snapshot?.references || []).map(item => item.referenceAssetId));
  const equipmentIds = new Set((snapshot?.equipment || []).map(item => item.equipmentItemId));
  const knowledgeSourceIds = new Set((snapshot?.knowledgeSources || []).map(item => item.id));
  const recommendations = new Map((output?.equipmentRecommendations || []).map(item => [item.equipmentItemId || item.name, item]));
  for (const recommendation of output?.equipmentRecommendations || []) {
    if (recommendation.equipmentItemId && !equipmentIds.has(recommendation.equipmentItemId) && recommendation.externalRequirement !== true) {
      issues.push(`未分配设备 ${recommendation.equipmentItemId} 必须标记 externalRequirement=true`);
    }
  }
  for (const shot of output?.shots || []) {
    for (const referenceAssetId of shot.sourceTrace?.referenceAssetIds || []) {
      if (!referenceIds.has(referenceAssetId)) issues.push(`镜头 ${shot.sequence} 引用了未选参考 ${referenceAssetId}`);
    }
    for (const equipmentItemId of shot.sourceTrace?.equipmentItemIds || []) {
      if (equipmentIds.has(equipmentItemId)) continue;
      const recommendation = recommendations.get(equipmentItemId);
      if (!recommendation?.externalRequirement) issues.push(`镜头 ${shot.sequence} 引用了未选设备 ${equipmentItemId}`);
    }
    for (const knowledgeSourceId of shot.sourceTrace?.knowledgeSourceIds || []) {
      if (!knowledgeSourceIds.has(knowledgeSourceId)) issues.push(`镜头 ${shot.sequence} 引用了未选知识来源 ${knowledgeSourceId}`);
    }
  }
  for (const guidance of output?.knowledgeGuidance || []) {
    if (guidance?.sourceId && !knowledgeSourceIds.has(guidance.sourceId)) issues.push(`知识指导引用了未选来源 ${guidance.sourceId}`);
  }
  for (const knowledgeSourceId of output?.expectedLook?.knowledgeSourceIds || []) {
    if (!knowledgeSourceIds.has(knowledgeSourceId)) issues.push(`预期效果引用了未选知识来源 ${knowledgeSourceId}`);
  }
  return finish('PLAN_OUTPUT_CONTEXT_MISMATCH', issues);
}

export function validateSharePacket(value) {
  const issues = [];
  for (const field of ['id', 'projectId', 'planRevisionId', 'recipientRole', 'status']) requiredString(value, field, issues);
  if (!['model', 'assistant'].includes(value?.recipientRole)) issues.push('recipientRole 仅支持 model 或 assistant');
  if (!Number.isInteger(value?.version) || value.version < 1) issues.push('version 必须为正整数');
  if (!value?.payloadSnapshot || typeof value.payloadSnapshot !== 'object') issues.push('payloadSnapshot 必须为对象');
  return finish('INVALID_SHARE_PACKET', issues);
}

function requiredString(value, field, issues, label = field) {
  if (typeof value?.[field] !== 'string' || !value[field].trim()) issues.push(`${label} 必须为非空字符串`);
}
function arrayField(value, field, issues, nonEmpty = false) {
  if (!Array.isArray(value?.[field])) issues.push(`${field} 必须为数组`);
  else if (nonEmpty && !value[field].length) issues.push(`${field} 不能为空`);
}
function finish(code, issues) {
  if (issues.length) throw new AppError(code, '数据未通过合同校验', { issues });
  return true;
}

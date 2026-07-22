export const IMPROVEMENT_AREAS = Object.freeze({
  brief: 'Brief 与沟通',
  references: '参考与方案',
  schedule: '排期与通告',
  onsite: '现场执行',
  post: '后期与交付',
  system: '系统体验',
});

export const ROLE_FEEDBACK_FIELDS = Object.freeze([
  ['photographer', 'photographerFriction', '摄影师'],
  ['model', 'modelFeedback', '模特'],
  ['assistant', 'assistantFeedback', '助理'],
  ['client', 'clientFeedback', '客户'],
]);

export function summarizeReviewFeedback(reviews = []) {
  const valid = (reviews || []).filter(Boolean);
  const average = field => valid.length
    ? roundOne(valid.reduce((sum, item) => sum + number(item[field]), 0) / valid.length)
    : 0;
  const areaCounts = Object.fromEntries(Object.keys(IMPROVEMENT_AREAS).map(key => [key, 0]));
  const reuseCounts = { yes: 0, 'with-changes': 0, no: 0, unknown: 0 };
  const roleCoverage = Object.fromEntries(ROLE_FEEDBACK_FIELDS.map(([role]) => [role, 0]));

  for (const review of valid) {
    if (areaCounts[review.improvementArea] !== undefined) areaCounts[review.improvementArea] += 1;
    const reuse = reuseCounts[review.workflowReuse] !== undefined ? review.workflowReuse : 'unknown';
    reuseCounts[reuse] += 1;
    for (const [role, field] of ROLE_FEEDBACK_FIELDS) {
      if (String(review[field] || '').trim()) roleCoverage[role] += 1;
    }
  }

  const rankedAreas = Object.entries(areaCounts)
    .map(([key, count]) => ({ key, label: IMPROVEMENT_AREAS[key], count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const topArea = rankedAreas.find(item => item.count > 0) || null;
  const reusable = reuseCounts.yes + reuseCounts['with-changes'];
  const possibleRoleResponses = valid.length * ROLE_FEEDBACK_FIELDS.length;
  const completedRoleResponses = Object.values(roleCoverage).reduce((sum, count) => sum + count, 0);

  return {
    count: valid.length,
    averagePlanScore: average('planScore'),
    averageExecutionScore: average('executionScore'),
    averageKeepRate: average('keepRate'),
    areaCounts,
    rankedAreas,
    topArea,
    reuseCounts,
    reusableRate: valid.length ? Math.round((reusable / valid.length) * 100) : 0,
    roleCoverage,
    roleCoverageRate: possibleRoleResponses ? Math.round((completedRoleResponses / possibleRoleResponses) * 100) : 0,
  };
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function roundOne(value) { return Math.round(value * 10) / 10; }

const REVIEWED_SOURCE_IDS = new Set([
  'full_single_p017',
  'full_single_p016',
  'full_single_p019',
  'full_single_p020',
  'full_single_p022',
  'full_single_p027',
  'full_single_p029',
]);
const RAISED_ARM_SOURCE_IDS = new Set([
  'full_single_p016',
  'full_single_p019',
  'full_single_p020',
  'full_single_p027',
  'full_single_p029',
]);

const REASON_LABELS = Object.freeze({
  sexualized: '性化表达，普通人像不使用',
  balance_risk: '单腿抬高或脚部离地，需确认平衡与动作安全',
  floor_pose: '跪卧或地面姿势，需确认场地与服装适配',
  unstable_support: '单手或地面支撑动作，普通人像不使用',
  extreme_extension: '大幅度伸展或后弯，普通人像不使用',
  overhead_action: '手臂抬高或手部过头，需摄影师确认动作自然度',
  source_metadata_review: '原库缩略图动作需要人工核对',
  multi_person_context: '双人姿势，仅用于明确的双人拍摄并需人工复核',
});

function poseText(template) {
  return String([
    template?.upstreamId,
    template?.title,
    template?.englishTitle,
    template?.description,
    template?.category,
    template?.series,
    ...(Array.isArray(template?.tags) ? template.tags : []),
  ].filter(Boolean).join(' ')).normalize('NFKC').toLowerCase();
}

export function classifyPose(template) {
  if (template?.kind && template.kind !== 'pose') return null;
  const text = poseText(template);
  const upstreamId = String(template?.upstreamId || '').toLowerCase();
  const reasonTags = [];
  const add = tag => { if (!reasonTags.includes(tag)) reasonTags.push(tag); };

  if (/full_sexy|性感|性化|撩胸|挤胸|内衣|裸露|erotic|sexual|lingerie/i.test(text)) add('sexualized');
  if (/跪|跪坐|后仰|躺|卧|趴|劈叉|倒立|双手后撑|双腿悬空|m字开腿|深蹲|kneel|reclin|supine|prone|split|inversion/i.test(text)) add('floor_pose');
  if (/单手支撑|双腿斜向前伸|双腿斜/.test(text)) add('unstable_support');
  if (/单腿.{0,8}(?:后抬|高抬|抬高|抬起)|(?:后抬|高抬|抬高|抬起).{0,8}单腿|踮脚|脚离地|抬腿|one (?:foot|leg) lifted|on tiptoe/i.test(text)) add('balance_risk');
  if (/大幅后弯|极限伸展|强力拉伸|过度后弯|extreme backbend|extreme stretch/i.test(text)) add('extreme_extension');
  if (/举过头|过头伸展|手臂上举|双臂上举|双手举|抱头|手扶后脑|抚后脑|抚后颈|overhead|arms raised/i.test(text)) add('overhead_action');
  if (RAISED_ARM_SOURCE_IDS.has(upstreamId)) add('overhead_action');
  if (REVIEWED_SOURCE_IDS.has(upstreamId)) add('source_metadata_review');
  if (/(?:^|[\s_-])duo(?:[_\s-]|$)|情侣|双人|两人|couple|two[- ]person/i.test(text)) add('multi_person_context');

  const suitability = reasonTags.some(tag => ['sexualized', 'balance_risk', 'floor_pose', 'unstable_support', 'extreme_extension'].includes(tag))
    ? 'exclude'
    : reasonTags.length ? 'review' : 'safe';
  return { suitability, reasonTags };
}

export function poseReasonLabels(reasonTags = []) {
  return reasonTags.map(tag => REASON_LABELS[tag] || '需摄影师人工复核');
}

export function isMultiPersonRequested(value, people) {
  const count = Number(String(people ?? '').trim());
  return (Number.isFinite(count) && count > 1)
    || /双人|两人|二人|情侣|夫妻|伴侣|闺蜜|多人|couple|duo|two[- ]people|two[- ]person/i.test(`${String(value || '')} ${String(people || '')}`);
}

export function isPoseAllowed(template, { poseContext = 'single', naturalPoseOnly = false } = {}) {
  const classification = classifyPose(template);
  if (!classification || classification.suitability === 'exclude') return false;
  if (classification.reasonTags.includes('multi_person_context') && poseContext !== 'multi') return false;
  if (naturalPoseOnly && classification.suitability !== 'safe') return false;
  return true;
}

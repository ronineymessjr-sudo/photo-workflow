const REVIEWED_SOURCE_IDS = new Set([
  'full_single_p016',
  'full_single_p019',
  'full_single_p020',
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
const NATURAL_SOLO_POSE_FAMILIES = Object.freeze({
  full_single_p015: 'standing_weight_shift',
  full_single_p017: 'standing_look_back',
  full_single_p018: 'hands_at_waist',
  full_single_p021: 'standing_neck_touch',
  full_single_p022: 'standing_open_chest',
  full_single_p025: 'wide_stance_hands_at_waist',
});

const REASON_LABELS = Object.freeze({
  sexualized: '性化表达，普通人像不使用',
  balance_risk: '单腿抬高或脚部离地，需确认平衡与动作安全',
  floor_pose: '跪卧或地面姿势，需确认场地与服装适配',
  unstable_support: '单手或地面支撑动作，普通人像不使用',
  extreme_extension: '大幅度伸展或后弯，普通人像不使用',
  intimate_pair: '亲密双人姿势，不用于普通合照方案',
  overhead_action: '手臂抬高或手部过头，需摄影师确认动作自然度',
  pose_exaggeration_review: '动作容易被生成得过于夸张，需摄影师先确认',
  generation_compliance_review: '生成结果服从动作不稳定，需摄影师先确认',
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

function poseFamilyFor(template) {
  const id = String(template?.upstreamId || '').toLowerCase();
  if (NATURAL_SOLO_POSE_FAMILIES[id]) return NATURAL_SOLO_POSE_FAMILIES[id];
  const text = poseText(template);
  if (/duo|pair60|双人|情侣|两人|couple|two[- ]person/i.test(text)) return 'pair_interaction';
  if (/蹲|squat/i.test(text)) return 'squat';
  if (/跪|躺|卧|趴|reclin|supine|prone|kneel/i.test(text)) return 'floor_pose';
  if (/脚踝|ankle/.test(text)) return 'ankle_reach';
  if (/支撑|扶地|elbow support|one-hand support/i.test(text)) return 'supported_lean';
  if (/单膝|one knee up/i.test(text)) return 'knee_up';
  if (/上举|举过头|overhead|arms raised|one arm up/i.test(text)) return 'raised_arms';
  if (/回眸|回头|looking over the shoulder|look(?:ing)? back/i.test(text)) return 'look_back';
  if (/扶腰|扶髋|手扶腰|手扶髋|hands on hips|hand on hip|hip out/i.test(text)) return 'hands_at_waist';
  if (/抚发|撩发|挽至耳后|hair|发丝/i.test(text)) return 'hair_touch';
  if (/坐|sit|seated/i.test(text)) return 'seated';
  if (/前倾|弯腰|lean(?:ing)? forward/i.test(text)) return 'forward_lean';
  if (/站|stand/i.test(text)) return 'standing';
  return 'unclassified';
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
  if (upstreamId === 'full_single_p022') add('pose_exaggeration_review');
  if (upstreamId === 'full_single_p025') add('generation_compliance_review');
  const isDuo = ['duo', 'pair60'].includes(String(template?.series || '').toLowerCase())
    || /^pair60_/i.test(upstreamId)
    || /(?:^|[\s_-])duo(?:[_\s-]|$)|情侣|双人|两人|couple|two[- ]person/i.test(text);
  if (isDuo) add('multi_person_context');
  if (isDuo && /正常位|后入|骑乘位|侧卧位|贴脸系|贴身|趴卧|坐位贴身|立位贴身/.test(text)) add('intimate_pair');
  if (!NATURAL_SOLO_POSE_FAMILIES[upstreamId] && template?.source?.type !== 'original' && !reasonTags.length) add('source_metadata_review');

  const suitability = reasonTags.some(tag => ['sexualized', 'balance_risk', 'floor_pose', 'unstable_support', 'extreme_extension', 'intimate_pair'].includes(tag))
    ? 'exclude'
    : reasonTags.length ? 'review' : 'safe';
  return { suitability, reasonTags, poseFamily: poseFamilyFor(template) };
}

export function poseReasonLabels(reasonTags = []) {
  return reasonTags.map(tag => REASON_LABELS[tag] || '需摄影师人工复核');
}

export function isMultiPersonRequested(value, people) {
  const count = Number(String(people ?? '').trim());
  return (Number.isFinite(count) && count > 1)
    || /双人|两人|二人|情侣|夫妻|伴侣|闺蜜|多人|couple|duo|two[- ]people|two[- ]person/i.test(`${String(value || '')} ${String(people || '')}`);
}

export function isPoseAllowed(template, { poseContext = 'single', naturalPoseOnly = false, allowReview = false } = {}) {
  const classification = classifyPose(template);
  if (!classification || classification.suitability === 'exclude') return false;
  if (classification.reasonTags.includes('multi_person_context') && poseContext !== 'multi') return false;
  if (classification.suitability === 'review' && !allowReview) return false;
  if (naturalPoseOnly && classification.suitability !== 'safe') return false;
  return true;
}

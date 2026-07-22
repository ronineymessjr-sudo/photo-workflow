const TEMPLATE_VERSION = '2026.07.15.1';

function template(id, name, shootingTypes, input) {
  return Object.freeze({
    id,
    name,
    shootingTypes,
    version: TEMPLATE_VERSION,
    source: 'photoatelier-curated-workflow',
    isBuiltIn: true,
    requiredBriefFields: ['shootingType', 'goalOrTheme', 'deliverableTarget'],
    ...input,
  });
}

export const PLAN_TEMPLATE_SEED = Object.freeze([
  template('plan-template-portrait-editorial', '人像／模特创作', ['人像创作', '模特拍摄', '写真', '时尚人像'], {
    description: '以环境建立、主体肖像、动作变化、情绪特写和细节作为完整覆盖。',
    preparationChecklist: ['确认模特授权与边界', '确认服装数量与换装空间', '确认主光方向和天气备用方案'],
    riskChecklist: ['模特状态与沟通节奏', '混合色温', '公共空间人流', '换装隐私'],
    shotSkeletons: [
      { key: 'establishing', sceneRole: '环境建立', shotSize: '全景', priority: 'must', targetSelectCount: 2 },
      { key: 'portrait', sceneRole: '主体肖像', shotSize: '半身', priority: 'must', targetSelectCount: 3 },
      { key: 'movement', sceneRole: '动作变化', shotSize: '全身', priority: 'optional', targetSelectCount: 2 },
      { key: 'emotion', sceneRole: '情绪特写', shotSize: '特写', priority: 'must', targetSelectCount: 2 },
      { key: 'detail', sceneRole: '服装与手部细节', shotSize: '特写', priority: 'optional', targetSelectCount: 2 },
    ],
    expectedLookDefaults: { retouchIntent: '保留真实肤质，清理临时瑕疵', colorIntent: '肤色优先，统一环境色彩关系' },
  }),
  template('plan-template-commercial-product', '商业／产品拍摄', ['商业产品', '产品静物', '电商', '品牌内容'], {
    description: '以 SKU、必拍角度、材质控制、比例参照和交付规格为中心。',
    preparationChecklist: ['确认 SKU 与数量', '确认必拍角度和品牌规范', '准备清洁用品与色卡', '确认背景和道具'],
    riskChecklist: ['反光材质控制', '产品瑕疵与清洁', '色彩准确性', 'SKU 漏拍'],
    shotSkeletons: [
      { key: 'hero', sceneRole: '主视觉 Hero', shotSize: '产品全貌', priority: 'must', targetSelectCount: 2 },
      { key: 'front', sceneRole: '标准正面', shotSize: '标准角度', priority: 'must', targetSelectCount: 1 },
      { key: 'angles', sceneRole: '侧面与背面', shotSize: '标准角度', priority: 'must', targetSelectCount: 3 },
      { key: 'detail', sceneRole: '材质与功能细节', shotSize: '微距/特写', priority: 'must', targetSelectCount: 3 },
      { key: 'scale', sceneRole: '使用场景与比例', shotSize: '环境中景', priority: 'optional', targetSelectCount: 2 },
    ],
    expectedLookDefaults: { retouchIntent: '保持结构和材质真实，清理灰尘划痕', colorIntent: '品牌色与产品色准确优先' },
  }),
  template('plan-template-event-documentary', '活动／婚礼纪实', ['活动', '婚礼', '会议', '纪实'], {
    description: '按时间线覆盖关键节点、人物关系、环境、情绪和细节。',
    preparationChecklist: ['确认完整时间线', '确认必拍人物与联系方式', '准备双机双卡和备用电池', '确认现场光线限制'],
    riskChecklist: ['关键节点不可重拍', '人物漏拍', '低光与混合色温', '存储与备份'],
    shotSkeletons: [
      { key: 'venue', sceneRole: '场地与氛围', shotSize: '全景', priority: 'must', targetSelectCount: 3 },
      { key: 'key-moment', sceneRole: '关键节点', shotSize: '中景', priority: 'must', targetSelectCount: 6 },
      { key: 'people', sceneRole: '必拍人物与合影', shotSize: '多人中景', priority: 'must', targetSelectCount: 6 },
      { key: 'emotion', sceneRole: '情绪反应', shotSize: '特写', priority: 'must', targetSelectCount: 4 },
      { key: 'details', sceneRole: '现场细节', shotSize: '特写', priority: 'optional', targetSelectCount: 4 },
    ],
    expectedLookDefaults: { retouchIntent: '统一肤色和曝光，不改变纪实内容', colorIntent: '保持现场氛围与系列一致性' },
  }),
  template('plan-template-personal-brand', '个人品牌／内容创作', ['个人品牌', '社交媒体内容', '创作者肖像', '职业形象'], {
    description: '同时覆盖头像、环境职业照、横竖版内容和社交平台裁切。',
    preparationChecklist: ['确认品牌关键词', '确认平台和画幅', '准备职业道具', '确认服装与背景色关系'],
    riskChecklist: ['画幅适配不足', '品牌气质不一致', '道具信息错误', '交付裁切遗漏'],
    shotSkeletons: [
      { key: 'avatar', sceneRole: '头像与近景', shotSize: '近景', priority: 'must', targetSelectCount: 3 },
      { key: 'environment', sceneRole: '职业环境照', shotSize: '中景', priority: 'must', targetSelectCount: 3 },
      { key: 'working', sceneRole: '工作状态', shotSize: '中近景', priority: 'must', targetSelectCount: 3 },
      { key: 'vertical', sceneRole: '竖版社交媒体', shotSize: '半身/全身', priority: 'must', targetSelectCount: 3 },
      { key: 'horizontal', sceneRole: '横版封面与留白', shotSize: '环境中景', priority: 'optional', targetSelectCount: 2 },
    ],
    expectedLookDefaults: { retouchIntent: '自然、可信、保持个人辨识度', colorIntent: '与个人品牌主色和发布平台统一' },
  }),
]);

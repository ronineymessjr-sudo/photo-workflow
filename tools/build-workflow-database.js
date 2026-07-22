const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const referencePath = path.join(projectRoot, 'assets', 'reference-database.json');
const outJson = path.join(projectRoot, 'assets', 'workflow-database.json');
const outCsv = path.join(projectRoot, 'assets', 'topic-database.csv');
const outSlotCsv = path.join(projectRoot, 'assets', 'slot-mapping.csv');
const outShotCsv = path.join(projectRoot, 'assets', 'shot-plan.csv');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function pickRefs(items, keywords, limit = 8) {
  const scored = items.map((item) => {
    const hay = [
      item.title, item.category, item.summary, item.applicableScene, item.applicableSubject,
      (item.tags || []).join(' '), (item.coreFocus || []).join(' '), (item.seoKeywords || []).join(' ')
    ].filter(Boolean).join(' ');
    let score = 0;
    keywords.forEach((kw) => { if (hay.includes(kw)) score += 1; });
    if (item.priority === '高') score += 0.5;
    return { item, score };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => ({
      id: item.id,
      title: item.title,
      url: item.sourceUrl || '',
      category: item.category,
      tags: item.tags || []
    }));
  return scored;
}

const SLOT_DEFINITIONS = [
  {
    id: 'materialReference',
    label: '素材参考',
    purpose: '图片、视频、平台链接和本地示例图，只负责看画面/找素材，不承担姿势或调色决策。',
    keywords: ['本地素材', '图片', '视频', 'Pexels', 'Pixabay', '参考图', '示例图', '平台收藏', '小红书', '抖音'],
    hardSignals: ['local_image', 'external_library', 'platform_capture']
  },
  {
    id: 'shotAngle',
    label: '拍摄角度/景别',
    purpose: '决定镜头距离、机位、运动方式和画面覆盖范围。',
    keywords: ['构图', '镜头', '35mm', '鱼眼', '特写', '大景', '空镜', '侧颜', '回眸', '站姿', '坐姿'],
    hardSignals: ['shotSizeNormalized', 'cameraMovement']
  },
  {
    id: 'poseGuide',
    label: '姿势引导',
    purpose: '现场给模特说什么、身体怎么摆、动作怎么引导。',
    keywords: ['姿势', '动作', '引导', '站', '坐', '托腮', '撩头发', '回眸', '持扇', '抛帽', 'pose'],
    hardSignals: ['姿势/引导']
  },
  {
    id: 'composition',
    label: '构图',
    purpose: '选择三分、居中、线条、留白、前后景层次等构图策略。',
    keywords: ['构图', '三分', '居中', '对称', '线条', '留白', '前景', '框架', 'composition'],
    hardSignals: ['compositionNormalized']
  },
  {
    id: 'lighting',
    label: '光线',
    purpose: '决定自然光、窗边光、逆光、夜景霓虹、光影对比等现场条件。',
    keywords: ['光影', '阳光', '逆光', '自然光', '窗边', '夜景', '霓虹', '高光', '阴影'],
    hardSignals: ['lighting']
  },
  {
    id: 'colorLut',
    label: 'LUT/调色',
    purpose: '只放调色、胶片、LUT、色彩管线和后期相关内容。',
    keywords: ['调色', 'LUT', '后期', '色彩', '胶片', 'film', 'color', 'Lightroom', '肤色', '颗粒'],
    hardSignals: ['调色/后期', 'color-grading']
  },
  {
    id: 'publishingCopy',
    label: '发布/SEO文案',
    purpose: '标题、封面字、正文结构、平台关键词和发布角度。',
    keywords: ['标题', '文案', '小红书', '抖音', '朋友圈', 'SEO', '发布', '爆款', '收藏理由'],
    hardSignals: ['publishing']
  }
];

function itemText(item) {
  return [
    item.title,
    item.category,
    item.platform,
    item.kind,
    item.summary,
    item.applicableScene,
    item.applicableSubject,
    item.workflowStage,
    item.shotSizeNormalized,
    item.cameraMovement,
    (item.tags || []).join(' '),
    (item.coreFocus || []).join(' '),
    (item.compositionNormalized || []).join(' '),
    (item.seoKeywords || []).join(' '),
    (item.searchQueries || []).join(' ')
  ].filter(Boolean).join(' ');
}

function scoreTopicMatch(item, config) {
  const hay = itemText(item);
  let score = 0;
  (config.keywords || []).forEach((kw) => { if (hay.includes(kw)) score += 3; });
  (config.scenes || []).forEach((kw) => { if (hay.includes(kw)) score += 2; });
  (config.props || []).forEach((kw) => { if (hay.includes(kw)) score += 1; });
  (config.poses || []).forEach((kw) => { if (hay.includes(kw)) score += 1; });
  if (item.priority === '高') score += 1;
  return score;
}

function scoreSlotMatch(item, slot) {
  const hay = itemText(item);
  let score = 0;
  slot.keywords.forEach((kw) => { if (hay.includes(kw)) score += 3; });
  slot.hardSignals.forEach((signal) => {
    if (item.kind === signal || item.category === signal || item.workflowStage === signal) score += 5;
    if (signal === 'shotSizeNormalized' && item.shotSizeNormalized) score += 2;
    if (signal === 'cameraMovement' && item.cameraMovement && item.cameraMovement !== 'static') score += 2;
    if (signal === 'compositionNormalized' && item.compositionNormalized && item.compositionNormalized.length) score += 2;
  });
  if (slot.id === 'colorLut' && item.category !== '调色/后期' && !/调色|lut|胶片|色彩|后期/i.test(hay)) score -= 8;
  if (slot.id === 'shotAngle' && /调色|lut|后期/i.test(hay)) score -= 5;
  if (slot.id === 'poseGuide' && /调色|lut|后期|标题|文案/i.test(hay)) score -= 5;
  return score;
}

function isIndexLikeReference(item) {
  const hay = `${item.title || ''} ${item.sourceFile || ''}`;
  return item.kind === 'obsidian_note' && /(^00_|索引|总览|收藏\s*-|收藏_)/.test(hay);
}

function isAllowedForSlot(item, slot, slotScore) {
  const hay = itemText(item);
  if (isIndexLikeReference(item)) return false;
  if (slot.id === 'materialReference') {
    return ['local_image', 'external_library', 'platform_capture', 'obsidian_table_row'].includes(item.kind) ||
      (item.sourceUrl && item.kind !== 'obsidian_note');
  }
  if (slot.id === 'shotAngle') {
    if (/调色|lut|后期|标题|文案/i.test(hay)) return false;
    return /构图|镜头|景别|机位|特写|大景|空镜|侧颜|回眸|站姿|坐姿|35mm|鱼眼/.test(hay) ||
      (item.shotSizeNormalized && item.shotSizeNormalized !== 'medium-shot') ||
      (item.cameraMovement && item.cameraMovement !== 'static');
  }
  if (slot.id === 'poseGuide') {
    if (/调色|lut|后期|标题|文案/i.test(hay)) return false;
    return item.category === '姿势/引导' || /姿势|动作|引导|站|坐|托腮|撩头发|回眸|持扇|抛帽|pose/.test(hay);
  }
  if (slot.id === 'composition') {
    if (/调色|lut|后期|标题|文案/i.test(hay)) return false;
    return /构图|三分|居中|对称|线条|留白|前景|框架|composition/.test(hay) ||
      ((item.compositionNormalized || []).filter((x) => x !== 'saliency-focus').length > 0);
  }
  if (slot.id === 'lighting') {
    if (/标题|文案/i.test(hay)) return false;
    return /光影|阳光|逆光|自然光|窗边|夜景|霓虹|高光|阴影|侧光/.test(hay);
  }
  if (slot.id === 'colorLut') {
    return item.category === '调色/后期' &&
      /调色|LUT|后期|色彩|胶片|film|color|Lightroom|肤色|颗粒|colorfit/i.test(hay);
  }
  if (slot.id === 'publishingCopy') {
    const platformText = `${item.platform || ''} ${item.kind || ''} ${item.title || ''}`;
    if (item.platform === 'Obsidian') {
      return /标题|文案|朋友圈|SEO|发布|爆款|收藏理由/.test(`${item.title || ''} ${(item.tags || []).join(' ')}`);
    }
    return /标题|文案|朋友圈|SEO|发布|爆款|收藏理由/.test(hay) ||
      /小红书|抖音|platform_capture|external_library/.test(platformText);
  }
  return slotScore > 0;
}

function buildSlotAssignments(topic, config, referenceItems) {
  const slots = {};
  SLOT_DEFINITIONS.forEach((slot) => {
    const scored = referenceItems.map((item) => {
      const topicScore = scoreTopicMatch(item, config);
      const slotScore = scoreSlotMatch(item, slot);
      const score = topicScore + slotScore;
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        platform: item.platform,
        url: item.sourceUrl || '',
        localFile: item.sourceFile || '',
        score,
        reason: [
          topicScore > 0 ? '命中选题关键词/场景' : '',
          slotScore > 0 ? `匹配${slot.label}` : '',
          item.priority === '高' ? '高优先级参考' : ''
        ].filter(Boolean).join('；') || '弱匹配，备用参考'
      };
    }).filter((candidate) => {
      const item = referenceItems.find((ref) => ref.id === candidate.id);
      return candidate.score > 0 && item && isAllowedForSlot(item, slot, scoreSlotMatch(item, slot));
    });
    const deduped = Array.from(scored.reduce((map, candidate) => {
      const key = `${candidate.title}|${candidate.category}|${candidate.platform}`;
      const existing = map.get(key);
      const candidateIsSpecific = /\/explore\//.test(candidate.url || '');
      const existingIsSpecific = existing && /\/explore\//.test(existing.url || '');
      if (!existing || candidate.score > existing.score || (candidate.score === existing.score && candidateIsSpecific && !existingIsSpecific)) {
        map.set(key, candidate);
      }
      return map;
    }, new Map()).values());
    const candidates = deduped
      .sort((a, b) => b.score - a.score)
      .slice(0, slot.id === 'materialReference' ? 10 : 6);
    slots[slot.id] = {
      label: slot.label,
      purpose: slot.purpose,
      items: candidates
    };
  });
  return slots;
}

function buildShotPlan(topicId, title, config, slots) {
  const angleRefs = slots.shotAngle.items.slice(0, 4).map((item) => item.id);
  const poseRefs = slots.poseGuide.items.slice(0, 4).map((item) => item.id);
  const compositionRefs = slots.composition.items.slice(0, 3).map((item) => item.id);
  const lightingRefs = slots.lighting.items.slice(0, 3).map((item) => item.id);
  const scene = config.scenes[0] || '通用场景';
  const shotTemplates = [
    {
      name: '建立环境',
      shotSize: 'long-shot',
      cameraAngle: '平视或略低机位',
      cameraMovement: topicId.includes('video') ? 'travelling-in' : 'static',
      composition: 'foreground-background-layering',
      lens: '24-35mm',
      purpose: `交代${scene}和人物关系`
    },
    {
      name: '主体半身',
      shotSize: 'medium-shot',
      cameraAngle: '平视，略侧 30 度',
      cameraMovement: 'static',
      composition: 'rule-of-thirds',
      lens: '35-50mm',
      purpose: '稳定出片，保证脸部和服装信息'
    },
    {
      name: '情绪特写',
      shotSize: 'close-up',
      cameraAngle: '略高或侧逆光',
      cameraMovement: topicId.includes('video') ? 'handheld' : 'static',
      composition: 'saliency-focus',
      lens: '50-85mm',
      purpose: '抓眼神、手部和情绪细节'
    }
  ];
  return shotTemplates.map((shot, index) => ({
    id: `${topicId}-shot-${index + 1}`,
    ...shot,
    posePrompt: config.poses[index % config.poses.length],
    lighting: index === 0 ? '顺光/环境光' : index === 1 ? '侧光/窗边光' : '逆光/轮廓光',
    referenceIds: [...new Set([angleRefs[index], poseRefs[index], compositionRefs[index % compositionRefs.length], lightingRefs[index % lightingRefs.length]].filter(Boolean))],
    executionNote: `这一镜只使用拍摄角度/姿势/构图/光线槽位的素材，不混用 LUT 或文案素材。`
  }));
}

function buildMaterialBoard(slots) {
  return {
    imageReferences: slots.materialReference.items.filter((item) => /图片|素材|Pexels|Pixabay|本地|小红书|抖音/.test(`${item.platform} ${item.category}`)).slice(0, 8),
    poseReferences: slots.poseGuide.items.slice(0, 6),
    angleReferences: slots.shotAngle.items.slice(0, 6),
    colorReferences: slots.colorLut.items.slice(0, 6),
    note: '素材板按用途拆分：看图归素材，看动作归姿势，看机位归角度，看颜色归 LUT/调色。'
  };
}

function buildTopicColorPlaybook(topicId, config, slots) {
  const colorRefs = slots.colorLut.items.slice(0, 5);
  const lutChoice = topicId.includes('summer') || topicId.includes('graduation') ? '生命力清新绿'
    : topicId.includes('cafe') ? '咖啡馆暖棕胶片'
      : topicId.includes('chinese') ? '新中式低饱和留白'
        : topicId.includes('urban') || topicId.includes('video') ? '城市夜景青橙'
          : 'Clean Commercial Skin';
  return {
    selectedLook: lutChoice,
    why: `根据选题「${config.coreLook}」选择，不从拍摄角度或姿势素材里推断 LUT。`,
    pipeline: [
      '先校正曝光和白平衡',
      '确认输入色彩空间/相机配置',
      '再做创意 LUT 或手动 HSL',
      '最后单独校正肤色和导出空间'
    ],
    colorReferenceIds: colorRefs.map((item) => item.id),
    avoid: config.risks.filter((risk) => /色|肤|绿|噪|光/.test(risk)).concat(['不要为了套 LUT 牺牲肤色'])
  };
}

function buildPublishingPlan(topicId, config, slots) {
  const copyRefs = slots.publishingCopy.items.slice(0, 5);
  return {
    platformPriority: topicId.includes('video') ? ['抖音', 'TikTok', 'YouTube Shorts', '小红书'] : ['小红书', 'Instagram', 'Pinterest', '朋友圈', '抖音'],
    globalPlatforms: ['Instagram', 'Pinterest', 'TikTok', 'YouTube Shorts'],
    headlineAngles: config.copyAngles.map((angle) => `${angle}｜${config.category}拍摄参考`),
    coverText: config.copyAngles[0],
    seoKeywords: [...new Set([config.category, ...config.keywords, ...config.scenes, '拍摄姿势', '摄影参考'])].slice(0, 12),
    englishQueries: [...new Set([`${config.category} portrait photography`, `${config.keywords.slice(0, 3).join(' ')} photography`, `${config.scenes.slice(0, 2).join(' ')} portrait moodboard`])],
    copyReferenceIds: copyRefs.map((item) => item.id),
    note: '发布槽只使用标题/平台/SEO相关素材，不拿 LUT 或角度素材充当文案证据。'
  };
}

function makeTopic(id, title, config, referenceItems) {
  const refs = pickRefs(referenceItems, config.keywords, 10);
  const slots = buildSlotAssignments({ id, title }, config, referenceItems);
  return {
    id,
    title,
    category: config.category,
    suitableSubject: config.subject,
    season: config.season,
    priceTier: config.priceTier,
    difficulty: config.difficulty,
    coreLook: config.coreLook,
    sceneKeywords: config.scenes,
    props: config.props,
    poses: config.poses,
    colorDirection: config.color,
    copyAngles: config.copyAngles,
    riskNotes: config.risks,
    searchQueries: [
      `${title} 摄影参考`,
      `${title} 小红书 拍摄姿势`,
      `${title} moodboard portrait`,
      `${config.category} 人像拍摄 案例`
    ],
    referenceIds: refs.map((ref) => ref.id),
    referencePreview: refs,
    slotAssignments: slots,
    shotPlan: buildShotPlan(id, title, config, slots),
    materialBoard: buildMaterialBoard(slots),
    colorPlaybook: buildTopicColorPlaybook(id, config, slots),
    publishingPlan: buildPublishingPlan(id, config, slots),
    decisionReasoning: [
      `选题核心是「${config.coreLook}」，所以先按场景和主体匹配参考，再按专业槽位二次筛选。`,
      'LUT/调色只从调色、胶片、色彩、后期相关条目中选择。',
      '拍摄角度只从景别、构图、机位、镜头运动相关条目中选择。',
      '素材参考只承担画面/链接/示例图功能，不直接替代姿势或调色判断。'
    ],
    readyChecklistId: `${id}-preflight`,
    reviewTemplateId: `${id}-review`
  };
}

function buildTopics(referenceItems) {
  const configs = [
    ['summer-vitality', '春夏生命力写真', {
      category: '外景人像', subject: '单人女生/普通客片', season: '春夏', priceTier: '199-399',
      difficulty: '容易', coreLook: '明亮、自由、自然动作、绿色或花草背景',
      keywords: ['生命力', '春日', '夏天', '草地', '花海', '阳光'],
      scenes: ['草地', '花海', '公园', '蓝天'], props: ['花束', '草帽', '水果', '浅色服装'],
      poses: ['走动回头', '蹲下摸花', '手遮阳光', '侧身大笑', '坐草地伸腿'],
      color: '低对比、暖肤、绿色干净、保留高光空气感',
      copyAngles: ['生命力溢出屏幕', '春夏自由感', '不用复杂动作也能出片'],
      risks: ['强光容易眯眼', '绿色容易脏', '户外天气不可控']
    }],
    ['graduation-single', '毕业季单人照', {
      category: '校园写真', subject: '毕业生/学生', season: '5-7月', priceTier: '199-399',
      difficulty: '容易', coreLook: '青春、纪念感、校园符号、轻胶片',
      keywords: ['毕业', '青春', '校园', '学士服', '胶片'],
      scenes: ['操场', '教学楼', '树荫', '楼梯'], props: ['学士帽', '证书', '花束', '书包'],
      poses: ['抛帽', '扶帽看镜头', '抱花侧身', '走廊回眸', '坐台阶'],
      color: '清新胶片、肤色暖、绿色不过饱和',
      copyAngles: ['毕业不是结束', '青春导演', '谁拍谁好看'],
      risks: ['旺季场地拥挤', '服装同质化', '强日照下脸部阴影重']
    }],
    ['new-chinese-qipao', '新中式/旗袍写真', {
      category: '国风人像', subject: '国风/旗袍模特', season: '全年', priceTier: '399-699',
      difficulty: '中等', coreLook: '含蓄、线条、古典场景、留白',
      keywords: ['新中式', '旗袍', '国风', '汉服', '园林'],
      scenes: ['园林', '茶馆', '老街', '室内窗边'], props: ['团扇', '油纸伞', '书卷', '花枝'],
      poses: ['持扇半遮', '侧身回眸', '倚栏远眺', '坐案前', '抚花看远处'],
      color: '低饱和、冷暖克制、肤色干净、红绿不过艳',
      copyAngles: ['东方留白', '新中式氛围', '一眼国风'],
      risks: ['妆造影响成片上限', '姿态要求更高', '场地和道具需要协调']
    }],
    ['cafe-daily', '咖啡馆日常写真', {
      category: '室内生活方式', subject: '单人女生/情侣', season: '全年', priceTier: '199-399',
      difficulty: '容易', coreLook: '松弛、日常、暖调、故事感',
      keywords: ['咖啡馆', '室内', '氛围', '复古', '胶片'],
      scenes: ['窗边座位', '吧台', '门口', '桌面'], props: ['咖啡杯', '书', '耳机', '甜点'],
      poses: ['托腮看窗外', '拿杯低头笑', '翻书侧脸', '靠窗坐', '手扶头发'],
      color: '暖棕、低饱和、中低对比、保留室内光感',
      copyAngles: ['下午茶氛围感', '普通咖啡馆也能拍', '松弛感日常'],
      risks: ['场地许可', '客流干扰', '室内光线不足']
    }],
    ['urban-night', '城市夜景电影感', {
      category: '夜景/情绪人像', subject: '单人/情侣/时尚客片', season: '全年', priceTier: '399-699',
      difficulty: '中等', coreLook: '霓虹、低调、动感、电影截图感',
      keywords: ['夜景', '电影感', '光影', '城市', '霓虹'],
      scenes: ['街道', '天桥', '商场外立面', '车灯背景'], props: ['透明伞', '耳机', '外套'],
      poses: ['边走边回头', '靠墙看远处', '低头整理衣领', '伞下侧脸', '慢门动感'],
      color: '青橙或冷暖分离，控制肤色，压暗背景',
      copyAngles: ['城市夜晚像电影', '不用影棚也能拍大片', '氛围比动作重要'],
      risks: ['噪点和糊片', '安全和人流', '肤色容易偏色']
    }],
    ['video-vlog-cinematic', 'Vlog/短视频电影感', {
      category: '视频拍摄', subject: '视频创作者/个人IP', season: '全年', priceTier: '399-699',
      difficulty: '中等', coreLook: '空镜、转场、运动镜头、生活叙事',
      keywords: ['视频', 'vlog', '空镜', '转场', '电影感', '稳定器'],
      scenes: ['街道', '校园', '咖啡馆', '运动场'], props: ['稳定器', '耳机', '包', '运动道具'],
      poses: ['走路跟拍', '推拉转场', '回头看镜头', '拿物件进入画面', '空镜切主体'],
      color: '统一白平衡，适度颗粒，降低素材间色差',
      copyAngles: ['新手也能有电影感', '空镜这样拍才有用', '转场不是乱晃'],
      risks: ['素材衔接不顺', '收音和稳定性', '剪辑时间成本']
    }],
    ['couple-city-story', '城市情侣故事感', {
      category: '情侣人像', subject: '情侣/纪念日客片', season: '全年', priceTier: '399-699',
      difficulty: '中等', coreLook: '互动、生活感、城市环境和关系叙事',
      keywords: ['情侣', '互动', '城市', '纪实', '故事感'],
      scenes: ['街角', '地铁口', '便利店', '天桥'], props: ['耳机', '饮料', '透明伞', '外套'],
      poses: ['并肩走路聊天', '一前一后回头', '靠肩看远处', '牵手穿过街道', '近距离自然互动'],
      color: '自然肤色、轻胶片、城市色彩克制',
      copyAngles: ['把恋爱拍成电影', '不看镜头更有故事', '城市情侣照动作清单'],
      risks: ['互动容易僵硬', '公共场景人流', '两人肤色和曝光需要兼顾']
    }],
    ['beach-sunset', '海边日落人像', {
      category: '海边人像', subject: '单人/情侣/旅拍', season: '春夏秋', priceTier: '399-699',
      difficulty: '中等', coreLook: '逆光、风感、海面层次和日落暖色',
      keywords: ['海边', '日落', '逆光', '旅拍', '风感'],
      scenes: ['沙滩', '礁石', '海岸公路', '浅水区'], props: ['长裙', '草帽', '薄纱', '花束'],
      poses: ['迎风走动', '提裙回头', '坐礁石侧身', '逆光剪影', '沿海岸线奔跑'],
      color: '高光柔和、暖肤、蓝橙平衡、保留天空层次',
      copyAngles: ['日落前二十分钟怎么拍', '海边不只会拍背影', '风越大越有氛围'],
      risks: ['黄金时间短', '海风和盐雾', '地面湿滑和器材安全']
    }],
    ['indoor-moody-window', '室内窗边情绪人像', {
      category: '室内情绪人像', subject: '单人女生/个人写真', season: '全年', priceTier: '399-699',
      difficulty: '中等', coreLook: '窗光、安静情绪、局部动作和明暗层次',
      keywords: ['室内', '窗边', '情绪', '光影', '私房'],
      scenes: ['窗边', '床铺区', '走廊', '镜子前'], props: ['白衬衫', '书', '杯子', '薄纱帘'],
      poses: ['侧坐看窗外', '手扶脸颊', '倚墙低头', '镜前整理头发', '蜷腿坐床边'],
      color: '低饱和、柔和高光、阴影保留细节、肤色中性',
      copyAngles: ['一扇窗就能拍完整组', '情绪照不等于不笑', '室内自然光布置'],
      risks: ['室内亮度不足', '背景容易杂乱', '情绪引导要求高']
    }],
    ['sports-dynamic', '运动感动态写真', {
      category: '运动人像', subject: '运动爱好者/品牌客片', season: '全年', priceTier: '399-699',
      difficulty: '中等', coreLook: '力量、速度、低机位和动作定格',
      keywords: ['运动', '动态', '力量', '速度', '低机位'],
      scenes: ['运动场', '健身房', '街道', '楼梯'], props: ['球类', '运动包', '毛巾', '水瓶'],
      poses: ['冲刺起步', '跳跃定格', '系鞋带低头', '持球看镜头', '训练间歇喘息'],
      color: '中高对比、清晰细节、肤色健康、背景降饱和',
      copyAngles: ['快门和动作怎么配合', '低机位拍出力量感', '运动写真镜头清单'],
      risks: ['快门不足导致糊片', '动作重复消耗体力', '场地安全']
    }],
    ['brand-editorial', '品牌商业人像', {
      category: '商业摄影', subject: '品牌/服装/个人IP', season: '全年', priceTier: '699+',
      difficulty: '较高', coreLook: '产品清楚、人物有态度、画面统一且可排版',
      keywords: ['商业', '品牌', '时尚', '杂志', '产品'],
      scenes: ['影棚', '建筑外立面', '办公室', '纯色背景'], props: ['产品', '服装配件', '品牌包装', '造型道具'],
      poses: ['正面强视线', '侧身展示服装', '手持产品', '行走抓拍', '留白构图'],
      color: '中性肤色、品牌色准确、对比稳定、跨图一致',
      copyAngles: ['一组图覆盖多个版位', '商业人像拍摄清单', '品牌色如何进入画面'],
      risks: ['品牌色偏差', '产品信息不清楚', '交付规格和版权边界']
    }],
    ['wedding-documentary', '婚礼纪实故事', {
      category: '婚礼纪实', subject: '新人/家庭', season: '全年', priceTier: '699+',
      difficulty: '较高', coreLook: '真实情绪、关键瞬间、人物关系和环境交代',
      keywords: ['婚礼', '纪实', '情绪', '仪式', '家庭'],
      scenes: ['准备房间', '仪式区', '宴会厅', '户外合影区'], props: ['戒指', '手捧花', '誓言卡', '头纱'],
      poses: ['整理头纱', '交换戒指', '父母拥抱', '新人对视', '宾客反应'],
      color: '肤色自然、白色礼服保留层次、室内混合光统一',
      copyAngles: ['婚礼当天必须守住的瞬间', '纪实不是随便抓拍', '家庭关系怎么拍'],
      risks: ['关键时刻不可重来', '混合光复杂', '多人隐私与发布授权']
    }]
  ];
  return configs.map(([id, title, config]) => makeTopic(id, title, config, referenceItems));
}

function buildPreflight(topics) {
  return topics.map((topic) => ({
    id: `${topic.id}-preflight`,
    topicId: topic.id,
    title: `${topic.title} 拍摄前检查清单`,
    sections: [
      { name: '客户沟通', items: ['确认拍摄主题和参考图', '确认出片数量和交付时间', '确认是否可公开发布', '确认妆造/服装由谁负责'] },
      { name: '场地光线', items: ['确认场地许可和集合点', '确认最佳光线时间', '准备雨天/阴天备选方案', '确认附近换装和休息点'] },
      { name: '道具服装', items: topic.props.map((prop) => `准备/确认 ${prop}`).concat(['准备备用浅色/深色搭配', '确认鞋子是否适合走动']) },
      { name: '拍摄执行', items: topic.poses.map((pose) => `必拍动作：${pose}`).concat(['先拍安全构图，再尝试创意动作', '每组动作保留横竖构图']) },
      { name: '后期交付', items: ['同步调色方向给客户', '记录实际使用 LUT/参数', '交付后收集反馈并回流复盘库'] }
    ]
  }));
}

function buildReviewTemplates(topics) {
  return topics.map((topic) => ({
    id: `${topic.id}-review`,
    topicId: topic.id,
    title: `${topic.title} 成片复盘模板`,
    fields: [
      '拍摄日期', '场地', '天气/光线', '客户/模特反馈', '最终成片数量', '出片率',
      '最有效姿势', '失败动作', '实际调色参数', '参考素材ID', '可复用经验', '下次改进'
    ],
    prompts: [
      `本次是否达成「${topic.coreLook}」？`,
      '哪些参考真正帮助了现场引导？',
      '哪些动作因为场地/光线/模特状态失败？',
      '最终调色和原计划差异在哪里？',
      '哪张图可以回流到本地参考库？'
    ]
  }));
}

function buildCopyLibrary(topics) {
  return topics.flatMap((topic) => topic.copyAngles.map((angle, index) => ({
    id: `${topic.id}-copy-${index + 1}`,
    topicId: topic.id,
    title: `${topic.title} 标题角度 ${index + 1}`,
    platform: index % 2 === 0 ? '小红书' : '抖音',
    headline: `${angle}｜${topic.title}拍摄参考`,
    coverText: angle,
    tags: [topic.title, topic.category, ...topic.sceneKeywords].slice(0, 8),
    captionStructure: ['开头给结果', '中段讲场景/动作/光线', '结尾给收藏理由或约拍引导'],
    seoKeywords: [`${topic.title} 拍摄`, `${topic.category} 摄影`, `${topic.title} 姿势`]
  })));
}

function buildColorLibrary() {
  return [
    {
      id: 'lut-summer-vitality',
      name: '生命力清新绿',
      suitableTopics: ['summer-vitality', 'graduation-single'],
      palette: ['干净绿色', '暖肤色', '浅蓝天空', '低饱和白色'],
      lightroom: ['曝光 +0.2 到 +0.5', '高光 -20', '阴影 +10', '绿色色相略偏青', '绿色饱和 -10', '肤色橙色明度 +8'],
      avoid: ['绿色发黄', '皮肤过粉', '高光死白']
    },
    {
      id: 'lut-cafe-brown',
      name: '咖啡馆暖棕胶片',
      suitableTopics: ['cafe-daily'],
      palette: ['暖棕', '奶油白', '低饱和红', '柔和黑'],
      lightroom: ['色温略暖', '对比 +8', '黑色色阶 +4', '橙色饱和 -5', '颗粒 10-15'],
      avoid: ['肤色脏黄', '阴影死黑', '棕色一片糊']
    },
    {
      id: 'lut-new-chinese-muted',
      name: '新中式低饱和留白',
      suitableTopics: ['new-chinese-qipao'],
      palette: ['朱红', '墨绿', '米白', '冷灰'],
      lightroom: ['整体饱和 -8', '高光柔化', '红色饱和 -5', '绿色明度 -5', '清晰度 -5'],
      avoid: ['红绿过艳', '脸部发灰', '服装纹理丢失']
    },
    {
      id: 'lut-urban-cinematic',
      name: '城市夜景青橙',
      suitableTopics: ['urban-night', 'video-vlog-cinematic'],
      palette: ['青蓝阴影', '暖橙肤色', '霓虹洋红', '深黑背景'],
      lightroom: ['降低黑位', '阴影偏青', '高光偏暖', '降低杂色', '肤色单独校正'],
      avoid: ['肤色变绿', '霓虹过曝', '噪点太重']
    },
    {
      id: 'lut-natural-skin',
      name: '自然肤色中性基线',
      suitableTopics: ['couple-city-story', 'brand-editorial', 'wedding-documentary'],
      palette: ['中性肤色', '干净白色', '柔和蓝灰', '稳定黑位'],
      lightroom: ['先校正白平衡', '橙色明度 +5', '红色饱和 -3', '高光 -15', '阴影 +8'],
      avoid: ['肤色偏洋红', '白色礼服溢出', '不同机位色温不一致']
    },
    {
      id: 'lut-ocean-sunset',
      name: '海边日落蓝橙',
      suitableTopics: ['beach-sunset'],
      palette: ['日落橙', '海水蓝', '暖肤色', '柔和高光'],
      lightroom: ['高光 -30', '阴影 +12', '蓝色色相略偏青', '橙色明度 +5', '去朦胧 +4'],
      avoid: ['天空断层', '肤色过橙', '海水青得不自然']
    },
    {
      id: 'lut-editorial-neutral',
      name: '商业杂志中性调',
      suitableTopics: ['brand-editorial', 'sports-dynamic'],
      palette: ['中性灰', '准确品牌色', '健康肤色', '清晰黑白'],
      lightroom: ['对比 +10', '纹理 +8', '清晰度 +5', '保持品牌主色准确', '统一输出色彩空间'],
      avoid: ['创意色压过产品色', '肤色塑料感', '局部锐化过度']
    },
    {
      id: 'lut-window-moody',
      name: '窗边柔灰情绪',
      suitableTopics: ['indoor-moody-window'],
      palette: ['柔灰', '低饱和肤色', '奶白高光', '冷影'],
      lightroom: ['对比 -5', '高光 -20', '阴影 +15', '清晰度 -5', '蓝色饱和 -10'],
      avoid: ['脸部发灰', '暗部死黑', '整体没有视觉焦点']
    }
  ];
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('；') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function main() {
  if (!fs.existsSync(referencePath)) {
    throw new Error('Missing assets/reference-database.json. Run npm run build-reference-db first.');
  }
  const reference = JSON.parse(fs.readFileSync(referencePath, 'utf8'));
  const referenceItems = reference.items || [];
  const topics = buildTopics(referenceItems);
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceReferenceCount: referenceItems.length,
    openSourceTaxonomy: reference.openSourceTaxonomy || {},
    knowledgeGraphSchema: {
      nodeTypes: ['topic', 'referenceAsset', 'shotPlan', 'slotAssignment', 'colorPlaybook', 'publishingPlan', 'preflightChecklist', 'reviewTemplate'],
      edgeTypes: ['usesAsMaterial', 'usesAsAngle', 'usesAsPose', 'usesAsComposition', 'usesAsLighting', 'usesAsColor', 'usesAsCopy'],
      slotDefinitions: SLOT_DEFINITIONS
    },
    topics,
    preflightChecklists: buildPreflight(topics),
    reviewTemplates: buildReviewTemplates(topics),
    copyLibrary: buildCopyLibrary(topics),
    colorLibrary: buildColorLibrary(),
    bitableTables: [
      { name: '选题库', fields: ['标题', '分类', '适合对象', '季节', '价格档', '难度', '核心画面', '场景关键词', '道具', '姿势', '调色方向', '风险', '参考素材ID'] },
      { name: '拍摄前清单', fields: ['选题ID', '分组', '检查项', '负责人', '状态'] },
      { name: '成片复盘库', fields: ['选题ID', '拍摄日期', '场地', '出片率', '最有效姿势', '失败动作', '调色参数', '客户反馈', '可复用经验'] },
      { name: '文案标题库', fields: ['平台', '选题ID', '标题', '封面字', '标签', '正文结构', 'SEO关键词'] },
      { name: '调色/LUT库', fields: ['名称', '适用选题', '色板', 'Lightroom建议', '避免问题'] },
      { name: '选题槽位映射', fields: ['选题ID', '槽位', '用途', '参考素材ID', '匹配原因', '匹配分'] },
      { name: '镜头执行表', fields: ['选题ID', '镜头名', '景别', '机位', '运动', '构图', '镜头焦段', '姿势口令', '光线', '参考素材ID'] }
    ]
  };
  fs.writeFileSync(outJson, JSON.stringify(payload, null, 2), 'utf8');
  const headers = ['id', 'title', 'category', 'suitableSubject', 'season', 'priceTier', 'difficulty', 'coreLook', 'sceneKeywords', 'props', 'poses', 'colorDirection', 'riskNotes', 'searchQueries', 'referenceIds'];
  const csv = [headers.join(',')].concat(topics.map((topic) => headers.map((header) => csvEscape(topic[header])).join(','))).join('\n');
  fs.writeFileSync(outCsv, csv, 'utf8');

  const slotHeaders = ['topicId', 'topicTitle', 'slotId', 'slotLabel', 'slotPurpose', 'referenceId', 'referenceTitle', 'category', 'platform', 'score', 'reason'];
  const slotRows = topics.flatMap((topic) => Object.entries(topic.slotAssignments || {}).flatMap(([slotId, slot]) => {
    return (slot.items || []).map((item) => ({
      topicId: topic.id,
      topicTitle: topic.title,
      slotId,
      slotLabel: slot.label,
      slotPurpose: slot.purpose,
      referenceId: item.id,
      referenceTitle: item.title,
      category: item.category,
      platform: item.platform,
      score: item.score,
      reason: item.reason
    }));
  }));
  fs.writeFileSync(outSlotCsv, [slotHeaders.join(',')].concat(slotRows.map((row) => slotHeaders.map((header) => csvEscape(row[header])).join(','))).join('\n'), 'utf8');

  const shotHeaders = ['topicId', 'topicTitle', 'shotId', 'name', 'shotSize', 'cameraAngle', 'cameraMovement', 'composition', 'lens', 'posePrompt', 'lighting', 'purpose', 'referenceIds', 'executionNote'];
  const shotRows = topics.flatMap((topic) => (topic.shotPlan || []).map((shot) => ({
    topicId: topic.id,
    topicTitle: topic.title,
    shotId: shot.id,
    name: shot.name,
    shotSize: shot.shotSize,
    cameraAngle: shot.cameraAngle,
    cameraMovement: shot.cameraMovement,
    composition: shot.composition,
    lens: shot.lens,
    posePrompt: shot.posePrompt,
    lighting: shot.lighting,
    purpose: shot.purpose,
    referenceIds: shot.referenceIds,
    executionNote: shot.executionNote
  })));
  fs.writeFileSync(outShotCsv, [shotHeaders.join(',')].concat(shotRows.map((row) => shotHeaders.map((header) => csvEscape(row[header])).join(','))).join('\n'), 'utf8');
  console.log(`Generated ${topics.length} topics`);
  console.log(outJson);
  console.log(outCsv);
  console.log(outSlotCsv);
  console.log(outShotCsv);
}

main();

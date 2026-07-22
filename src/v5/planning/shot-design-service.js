import { createEntity } from '../common/entity.js';
import { AppError, invariant } from '../common/errors.js';

const SHOT_SCALE_RANGES = {
  simple: { min: 5, max: 8, target: 6 },
  standard: { min: 10, max: 15, target: 12 },
  comprehensive: { min: 15, max: 25, target: 20 },
};

const SIMPLE_SHOT_TEMPLATES = [
  { scene: '环境', shotSize: '远景', cameraAngle: '平视', composition: '全景构图', subjectAction: '环境建立', priority: 'must', estimatedMinutes: 15, category: 'establishing' },
  { scene: '人物', shotSize: '半身', cameraAngle: '平视', composition: '三分法', subjectAction: '静态摆拍', priority: 'must', estimatedMinutes: 10, category: 'portrait' },
  { scene: '人物', shotSize: '全身', cameraAngle: '低角度', composition: '中心对称', subjectAction: '静态摆拍', priority: 'must', estimatedMinutes: 10, category: 'portrait' },
  { scene: '细节', shotSize: '特写', cameraAngle: '俯视', composition: '居中构图', subjectAction: '细节展示', priority: 'should', estimatedMinutes: 8, category: 'detail' },
  { scene: '动作', shotSize: '中景', cameraAngle: '平视', composition: '引导线', subjectAction: '自然动作', priority: 'should', estimatedMinutes: 12, category: 'action' },
  { scene: '氛围', shotSize: '远景', cameraAngle: '高角度', composition: '留白构图', subjectAction: '氛围营造', priority: 'should', estimatedMinutes: 10, category: 'mood' },
];

const STANDARD_EXTRA_TEMPLATES = [
  { scene: '人物', shotSize: '半身', cameraAngle: '高角度', composition: '对角线', subjectAction: '情绪表达', priority: 'should', estimatedMinutes: 10, category: 'portrait' },
  { scene: '人物', shotSize: '特写', cameraAngle: '平视', composition: '居中构图', subjectAction: '面部特写', priority: 'could', estimatedMinutes: 8, category: 'portrait' },
  { scene: '群像', shotSize: '全身', cameraAngle: '平视', composition: '三角构图', subjectAction: '群体互动', priority: 'should', estimatedMinutes: 15, category: 'group' },
  { scene: '群像', shotSize: '半身', cameraAngle: '低角度', composition: '层次构图', subjectAction: '关系互动', priority: 'could', estimatedMinutes: 12, category: 'group' },
  { scene: '细节', shotSize: '特写', cameraAngle: '俯视', composition: '居中构图', subjectAction: '物件特写', priority: 'could', estimatedMinutes: 8, category: 'detail' },
  { scene: '细节', shotSize: '近景', cameraAngle: '平视', composition: '三分法', subjectAction: '材质纹理', priority: 'could', estimatedMinutes: 8, category: 'detail' },
];

const COMPREHENSIVE_EXTRA_TEMPLATES = [
  { scene: '环境', shotSize: '远景', cameraAngle: '高角度', composition: '对称构图', subjectAction: '空间展现', priority: 'should', estimatedMinutes: 15, category: 'establishing' },
  { scene: '环境', shotSize: '中景', cameraAngle: '平视', composition: '框架构图', subjectAction: '空间过渡', priority: 'could', estimatedMinutes: 12, category: 'establishing' },
  { scene: '人物', shotSize: '全身', cameraAngle: '高角度', composition: '负空间', subjectAction: '姿态展示', priority: 'could', estimatedMinutes: 10, category: 'portrait' },
  { scene: '人物', shotSize: '半身', cameraAngle: '低角度', composition: '三分法', subjectAction: '力量感', priority: 'could', estimatedMinutes: 10, category: 'portrait' },
  { scene: '人物', shotSize: '特写', cameraAngle: '平视', composition: '居中构图', subjectAction: '手部特写', priority: 'could', estimatedMinutes: 8, category: 'portrait' },
  { scene: '群像', shotSize: '全身', cameraAngle: '高角度', composition: '散点构图', subjectAction: '群体全景', priority: 'could', estimatedMinutes: 15, category: 'group' },
  { scene: '群像', shotSize: '中景', cameraAngle: '平视', composition: '三角构图', subjectAction: '小群体互动', priority: 'could', estimatedMinutes: 12, category: 'group' },
  { scene: '细节', shotSize: '特写', cameraAngle: '侧视', composition: '对角线', subjectAction: '局部刻画', priority: 'could', estimatedMinutes: 8, category: 'detail' },
];

export class ShotDesignService {
  constructor(repositories, gateways = {}) {
    this.repos = repositories;
    this.planningGateway = gateways.planningGateway || null;
  }

  async designShots(command) {
    const {
      projectId,
      creativeDirectionId,
      visualDNAId,
      shootingScale,
      equipmentItemIds,
      instruction,
    } = command;

    const project = this.repos.projects.require(projectId);
    invariant(project, 'PROJECT_NOT_FOUND', '项目不存在', { projectId });

    const creativeDirection = this.repos.creativeDirections.require(creativeDirectionId);
    invariant(creativeDirection, 'CREATIVE_DIRECTION_NOT_FOUND', '创意方向不存在', { creativeDirectionId });
    invariant(creativeDirection.status === 'selected', 'CREATIVE_DIRECTION_NOT_SELECTED', '创意方向必须为已选定状态', { creativeDirectionId, status: creativeDirection.status });

    const visualDNA = this.repos.visualDNAs.require(visualDNAId);
    invariant(visualDNA, 'VISUAL_DNA_NOT_FOUND', '视觉DNA不存在', { visualDNAId });

    const brief = this.repos.projectBriefs.list(item => item.projectId === projectId)[0];
    invariant(brief, 'BRIEF_NOT_FOUND', '项目缺少拍摄简报', { projectId });

    const equipmentAssignments = this.repos.resourceAssignments
      .list(item => item.projectId === projectId && item.resourceType === 'equipment' && item.status === 'selected');
    const equipment = equipmentAssignments.map(assignment => {
      const item = this.repos.equipmentItems.get(assignment.resourceId);
      if (!item) return null;
      const model = item.equipmentModelId ? this.repos.equipmentModels.get(item.equipmentModelId) : null;
      return {
        assignmentId: assignment.id,
        equipmentItemId: item.id,
        name: model ? `${model.brand} ${model.model}` : item.customName,
        category: model?.category || item.category || 'accessory',
        focalRange: model?.focalRange || null,
        maxAperture: model?.maxAperture || null,
      };
    }).filter(Boolean);

    const scale = shootingScale || brief.shootingScale || 'standard';
    invariant(SHOT_SCALE_RANGES[scale], 'INVALID_SHOOTING_SCALE', '无效的拍摄规模', { shootingScale: scale });

    let shotDesigns;

    if (this.planningGateway?.designShots) {
      shotDesigns = await this.planningGateway.designShots({
        creativeDirection,
        visualDNA,
        brief,
        equipment,
        shootingScale: scale,
        instruction: instruction || '',
      });
    } else {
      shotDesigns = deterministicShotDesign(visualDNA, creativeDirection, brief, equipment, scale);
    }

    const shots = shotDesigns.map((design, index) => this.repos.shots.create(createEntity('shot', {
      projectId,
      planId: null,
      planRevisionId: null,
      sequence: index + 1,
      scene: design.scene,
      shotSize: design.shotSize,
      cameraAngle: design.cameraAngle,
      composition: design.composition,
      focalLength: design.focalLength,
      lighting: design.lighting,
      poseGuidance: design.poseGuidance,
      subjectAction: design.subjectAction,
      variationCount: design.variationCount,
      targetSelectCount: design.targetSelectCount,
      priority: design.priority,
      estimatedMinutes: design.estimatedMinutes,
      fallback: design.fallback || '',
      captureStatus: 'planned',
      sourceTrace: {
        referenceAssetIds: design.sourceTrace?.referenceAssetIds || [],
        equipmentItemIds: design.sourceTrace?.equipmentItemIds || [],
        templateId: design.sourceTrace?.templateId || null,
      },
      emotion: design.emotion,
      mood: design.mood,
      referenceAssetId: design.referenceAssetId,
      learningFocus: design.learningFocus,
      whyThisShot: design.whyThisShot,
      visualMatchScore: design.visualMatchScore,
    })));

    return {
      shots,
      events: [{
        type: 'ShotsDesigned',
        projectId,
        creativeDirectionId,
        visualDNAId,
        shotCount: shots.length,
        shootingScale: scale,
      }],
    };
  }
}

export function deterministicShotDesign(visualDNA, creativeDirection, brief, equipment, shootingScale) {
  const scale = SHOT_SCALE_RANGES[shootingScale] || SHOT_SCALE_RANGES.standard;

  const focalRecommendations = visualDNA.lensAnalysis?.focalRecommendations || [{ mm: '50mm', purpose: '标准' }];
  const lightingProfile = visualDNA.lightingAnalysis || {};
  const compositionPatterns = visualDNA.compositionAnalysis?.patterns || [];
  const referenceAssetIds = visualDNA.referenceAssetIds || [];
  const moodDescription = creativeDirection.moodDescription || '';
  const keywords = creativeDirection.keywords || [];

  let templates = [...SIMPLE_SHOT_TEMPLATES];
  if (shootingScale === 'standard' || shootingScale === 'comprehensive') {
    templates = [...templates, ...STANDARD_EXTRA_TEMPLATES];
  }
  if (shootingScale === 'comprehensive') {
    templates = [...templates, ...COMPREHENSIVE_EXTRA_TEMPLATES];
  }

  const targetCount = Math.min(scale.max, Math.max(scale.min, scale.target));
  while (templates.length < targetCount) {
    templates.push({ ...templates[templates.length % 6], priority: 'could' });
  }
  templates = templates.slice(0, targetCount);

  const emotions = deriveEmotions(moodDescription, keywords);
  const moods = deriveMoods(moodDescription, keywords);

  return templates.map((template, index) => {
    const focalRec = focalRecommendations[index % focalRecommendations.length];
    const focalLength = typeof focalRec === 'object' ? (focalRec.mm || '50mm') : String(focalRec);
    const lighting = deriveStructuredLighting(lightingProfile, template.category);
    const composition = compositionPatterns.length
      ? compositionPatterns[index % compositionPatterns.length]
      : template.composition;
    const refAssetId = referenceAssetIds.length
      ? referenceAssetIds[index % referenceAssetIds.length]
      : null;
    const emotion = emotions[index % emotions.length];
    const mood = moods[index % moods.length];

    const equipmentItemIds = equipment
      .filter(item => isEquipmentRelevant(item, template.category))
      .map(item => item.equipmentItemId);

    const learningFocus = deriveLearningFocus(visualDNA, template.category);

    return {
      scene: template.scene,
      shotSize: template.shotSize,
      cameraAngle: template.cameraAngle,
      composition,
      focalLength,
      lighting,
      poseGuidance: derivePoseGuidance(template.category, brief),
      subjectAction: template.subjectAction,
      variationCount: template.priority === 'must' ? 3 : 2,
      targetSelectCount: template.priority === 'must' ? 2 : 1,
      priority: template.priority,
      estimatedMinutes: template.estimatedMinutes,
      fallback: '',
      sourceTrace: {
        referenceAssetIds: refAssetId ? [refAssetId] : [],
        equipmentItemIds,
        templateId: null,
      },
      emotion,
      mood,
      referenceAssetId: refAssetId,
      learningFocus,
      whyThisShot: `${template.category === 'establishing' ? '建立环境氛围' : template.category === 'portrait' ? '核心人物表现' : template.category === 'detail' ? '细节与质感补充' : template.category === 'action' ? '捕捉动态瞬间' : template.category === 'mood' ? '氛围与情绪传递' : '丰富拍摄内容'}，基于${creativeDirection.title || '选定方向'}的风格要求`,
      visualMatchScore: referenceAssetIds.length ? Math.max(60, 100 - index * 3) : 0,
    };
  });
}

function deriveEmotions(moodDescription, keywords) {
  const tokens = [moodDescription, ...keywords].filter(Boolean).join('，');
  if (!tokens.trim()) return ['自然、真实'];
  const candidates = tokens.split(/[，,、；;\s]+/).filter(Boolean);
  if (candidates.length === 0) return ['自然、真实'];
  if (candidates.length < 3) return [...candidates, '克制、安静', '温暖、柔和'];
  return candidates.slice(0, 6);
}

function deriveMoods(moodDescription, keywords) {
  const tokens = [moodDescription, ...keywords].filter(Boolean).join('，');
  if (!tokens.trim()) return ['自然'];
  const candidates = tokens.split(/[，,、；;\s]+/).filter(Boolean);
  if (candidates.length === 0) return ['自然'];
  if (candidates.length < 2) return [...candidates, '清冷', '温暖'];
  return candidates.slice(0, 4);
}

function deriveStructuredLighting(lightingAnalysis, category) {
  const base = lightingAnalysis?.approach || lightingAnalysis?.direction || '自然光';
  const direction = lightingAnalysis?.direction || '自然方向';
  return {
    main: base,
    direction: direction.includes('侧') ? '45度侧面' : direction.includes('逆') ? '逆光方向' : direction.includes('顶') ? '顶光方向' : '正面/顺光方向',
    auxiliary: base.includes('环境') ? '必要时反光板补光' : base.includes('自然') ? '可用反光板微补' : '辅助光源配合',
    effect: base.includes('环境') ? '保持自然过渡，避免明显人工光痕迹' : base.includes('柔') ? '柔化阴影，保持肤质自然' : '保留光影质感，强化氛围',
  };
}

function deriveLighting(lightingProfile, category) {
  const base = lightingProfile.approach || lightingProfile.direction || '自然光';
  const modifiers = {
    establishing: base,
    portrait: base,
    detail: base,
    action: base,
    mood: base,
    group: base,
  };
  return modifiers[category] || base;
}

function derivePoseGuidance(category, brief) {
  const style = brief?.style || '';
  const guides = {
    establishing: '无特定姿势，注重环境氛围',
    portrait: style ? `符合${style}风格的姿势` : '自然放松的姿态',
    detail: '配合细节展示的手部或局部姿势',
    action: '自然动态，捕捉运动瞬间',
    mood: '情绪驱动，弱化姿势控制',
    group: '自然互动，注意人物关系和视线',
  };
  return guides[category] || '自然放松的姿态';
}

function isEquipmentRelevant(equipment, category) {
  const cat = equipment.category || '';
  if (category === 'detail' && (cat === 'lens' || cat === 'accessory')) return true;
  if (category === 'portrait' && (cat === 'lens' || cat === 'lighting')) return true;
  if (category === 'establishing' && (cat === 'lens' || cat === 'tripod')) return true;
  if (category === 'action' && (cat === 'lens')) return true;
  if (cat === 'lens' || cat === 'camera') return true;
  return false;
}

function deriveLearningFocus(visualDNA, category) {
  const compositionDim = visualDNA.compositionAnalysis?.patterns || [];
  const lightingDim = visualDNA.lightingAnalysis?.approach ? [visualDNA.lightingAnalysis.approach] : [];
  const lensDim = visualDNA.lensAnalysis?.description ? [visualDNA.lensAnalysis.description] : [];
  const colorDim = visualDNA.colorAnalysis?.description ? [visualDNA.colorAnalysis.description] : [];

  const focusMap = {
    establishing: [
      compositionDim.length ? `空间构图：${compositionDim.slice(0, 2).join('、')}` : '空间构图关系',
      lightingDim.length ? `环境光：${lightingDim.slice(0, 2).join('、')}` : '环境光氛围',
      colorDim.length ? `色调：${colorDim.slice(0, 2).join('、')}` : '色调控制',
    ].join('、'),
    portrait: [
      '人物比例、留白关系',
      lensDim.length ? `镜头特性：${lensDim.slice(0, 2).join('、')}` : '焦段选择',
      lightingDim.length ? `人像光：${lightingDim.slice(0, 1).join('、')}` : '人像光线',
    ].join('、'),
    detail: [
      '细节构图、景深控制',
      lightingDim.length ? `局部光：${lightingDim.slice(0, 1).join('、')}` : '局部光线',
      '质感呈现',
    ].join('、'),
    action: [
      '动态捕捉、快门选择',
      compositionDim.length ? `动势构图：${compositionDim.slice(0, 1).join('、')}` : '动势构图',
      '连拍节奏',
    ].join('、'),
    mood: [
      colorDim.length ? `氛围色调：${colorDim.slice(0, 2).join('、')}` : '氛围色调',
      '情绪表达、留白节奏',
      lightingDim.length ? `氛围光：${lightingDim.slice(0, 1).join('、')}` : '氛围光线',
    ].join('、'),
    group: [
      '人物关系、视线引导',
      compositionDim.length ? `群体构图：${compositionDim.slice(0, 2).join('、')}` : '群体构图',
      '层次控制',
    ].join('、'),
  };

  return focusMap[category] || '构图、光线、色调';
}

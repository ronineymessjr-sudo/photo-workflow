import { createEntity, updateEntity } from '../common/entity.js';
import { AppError, invariant } from '../common/errors.js';

export class VisualAnalysisService {
  constructor(repositories, gateways = {}) {
    this.repos = repositories;
    this.visionGateway = gateways.visionGateway || null;
  }

  async analyze(command) {
    const project = this.repos.projects.require(command.projectId);

    const links = this.repos.projectReferenceLinks.list(
      item => item.projectId === command.projectId,
    );
    const references = links.map(link => {
      const asset = this.repos.referenceAssets.get(link.referenceAssetId);
      if (!asset) return null;
      return {
        projectReferenceLinkId: link.id,
        referenceAssetId: asset.id,
        assetKind: asset.assetKind,
        tags: asset.tags || [],
        title: asset.title,
        role: link.role,
      };
    }).filter(Boolean);

    invariant(references.length > 0, 'VISUAL_DNA_NO_REFERENCES', '至少需要一张参考素材才能进行视觉分析');

    const referenceAssetIds = references.map(item => item.referenceAssetId);

    const brief = this.repos.projectBriefs.list(
      item => item.projectId === command.projectId,
    )[0] || null;

    const snapshot = { brief };

    let analysis;
    if (this.visionGateway?.analyzeReferences) {
      analysis = await this.visionGateway.analyzeReferences({ references, snapshot });
    } else {
      analysis = deterministicVisualDNA(snapshot, references);
    }

    const visualDNA = this.repos.visualDNAs.create(createEntity('visual-dna', {
      projectId: command.projectId,
      referenceAssetIds,
      compositionAnalysis: analysis.compositionAnalysis,
      lensAnalysis: analysis.lensAnalysis,
      subjectAnalysis: analysis.subjectAnalysis,
      lightingAnalysis: analysis.lightingAnalysis,
      colorAnalysis: analysis.colorAnalysis,
      immutable: true,
    }));

    return {
      visualDNA,
      events: [{
        type: 'VisualDNAAnalyzed',
        visualDNAId: visualDNA.id,
        projectId: command.projectId,
        referenceAssetIds,
      }],
    };
  }

  selectCreativeDirection(command) {
    const selected = this.repos.creativeDirections.require(command.creativeDirectionId);
    invariant(selected.projectId, 'CREATIVE_DIRECTION_MISSING_PROJECT', '创作方向缺少项目关联');

    const siblings = this.repos.creativeDirections.list(
      item => item.projectId === selected.projectId && item.id !== selected.id,
    );

    for (const sibling of siblings) {
      if (sibling.status === 'selected') {
        this.repos.creativeDirections.save(updateEntity(sibling, { status: 'rejected' }));
      }
    }

    const updated = this.repos.creativeDirections.save(updateEntity(selected, {
      status: 'selected',
      selectedAt: new Date().toISOString(),
    }));

    return {
      creativeDirection: updated,
      events: [{
        type: 'CreativeDirectionSelected',
        creativeDirectionId: updated.id,
        projectId: updated.projectId,
      }],
    };
  }
}

export function deterministicVisualDNA(snapshot, references) {
  const brief = snapshot?.brief || {};
  const allTags = references.flatMap(item => item.tags || []);
  const tagSet = new Set(allTags);

  const compositionAnalysis = deriveComposition(tagSet);
  const lensAnalysis = deriveLens(tagSet);
  const subjectAnalysis = deriveSubject(tagSet);
  const lightingAnalysis = deriveLighting(brief, tagSet);
  const colorAnalysis = deriveColor(brief, tagSet);

  return {
    compositionAnalysis,
    lensAnalysis,
    subjectAnalysis,
    lightingAnalysis,
    colorAnalysis,
  };
}

function deriveComposition(tagSet) {
  if (tagSet.has('环境') || tagSet.has('environment')) {
    return {
      description: '环境人像比例较高，人物不占满画面，大量留白，偏非中心构图',
      patterns: ['环境叙事', '留白', '非中心'],
    };
  }
  if (tagSet.has('特写') || tagSet.has('closeup')) {
    return {
      description: '特写为主，画面紧凑，主体占据大部分画面，构图偏中心',
      patterns: ['特写', '紧凑', '中心构图'],
    };
  }
  return {
    description: '人物与环境兼顾，中等景别为主，构图均衡',
    patterns: ['均衡', '中等景别'],
  };
}

function deriveLens(tagSet) {
  if (tagSet.has('广角') || tagSet.has('wide')) {
    return {
      description: '广角镜头主导，适合环境叙事和空间感表达',
      focalRecommendations: [
        { mm: '24mm', purpose: '环境交代' },
        { mm: '35mm', purpose: '环境叙事' },
        { mm: '50mm', purpose: '自然人物关系' },
      ],
    };
  }
  if (tagSet.has('长焦') || tagSet.has('telephoto')) {
    return {
      description: '长焦镜头主导，适合压缩空间和情绪肖像',
      focalRecommendations: [
        { mm: '85mm', purpose: '情绪肖像' },
        { mm: '135mm', purpose: '压缩空间肖像' },
        { mm: '70-200mm', purpose: '灵活变焦' },
      ],
    };
  }
  return {
    description: '标准焦段覆盖，兼顾环境叙事与情绪肖像',
    focalRecommendations: [
      { mm: '35mm', purpose: '环境叙事' },
      { mm: '50mm', purpose: '自然人物关系' },
      { mm: '85mm', purpose: '情绪肖像' },
    ],
  };
}

function deriveSubject(tagSet) {
  if (tagSet.has('摆拍') || tagSet.has('posed')) {
    return {
      description: '参考中包含摆拍倾向，建议适度放松避免僵硬感',
      avoid: ['强摆拍', '僵硬姿态'],
      recommend: ['自然动作', '微调姿态', '情绪引导'],
    };
  }
  return {
    description: '以自然状态为主，避免刻意摆拍，鼓励被摄者自然表达',
    avoid: ['强摆拍'],
    recommend: ['自然动作', '低互动', '非直视镜头'],
  };
}

function deriveLighting(brief, tagSet) {
  const mood = String(brief.mood || '').toLowerCase();
  if (mood.includes('夜景') || mood.includes('暗') || tagSet.has('夜景') || tagSet.has('night')) {
    return {
      description: '主要利用环境光塑造氛围，保持光线方向自然，必要时使用辅助反光，避免明显人工光痕迹',
      direction: '环境光为主',
      approach: '弱化人工光痕迹，保留自然光感',
    };
  }
  if (mood.includes('明亮') || tagSet.has('硬光') || tagSet.has('hardlight')) {
    return {
      description: '明亮光线为主，可使用硬光塑造轮廓，注意控制光比避免过硬阴影',
      direction: '正面或侧顺光',
      approach: '适度补光控制反差',
    };
  }
  return {
    description: '柔和自然光为主，避免过硬光比，保持真实光影关系',
    direction: '自然光',
    approach: '柔光优先，必要时反光补光',
  };
}

function deriveColor(brief, tagSet) {
  const style = String(brief.style || '').toLowerCase();
  const mood = String(brief.mood || '').toLowerCase();

  if (style.includes('胶片') || mood.includes('胶片') || tagSet.has('胶片') || tagSet.has('film')) {
    return {
      description: '胶片质感，低饱和偏暖，带颗粒感',
      saturation: '低饱和',
      temperature: '暖色倾向',
      texture: '胶片颗粒',
    };
  }
  if (style.includes('清冷') || mood.includes('清冷') || tagSet.has('清冷') || tagSet.has('cool')) {
    return {
      description: '清冷色调，低饱和偏冷，质感干净',
      saturation: '低饱和',
      temperature: '冷色倾向',
      texture: '胶片颗粒',
    };
  }
  if (style.includes('鲜艳') || mood.includes('鲜艳') || tagSet.has('鲜艳') || tagSet.has('vivid')) {
    return {
      description: '色彩饱满鲜艳，高饱和度，视觉冲击力强',
      saturation: '高饱和',
      temperature: '中性偏暖',
      texture: '干净锐利',
    };
  }
  return {
    description: '自然真实色彩，适度饱和，保持肤色准确',
    saturation: '适中',
    temperature: '中性',
    texture: '干净',
  };
}

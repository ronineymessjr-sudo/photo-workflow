import { createEntity, updateEntity } from '../common/entity.js';
import { AppError, invariant } from '../common/errors.js';

export class CreativeDirectionService {
  constructor(repositories, gateways = {}) {
    this.repos = repositories;
    this.planningGateway = gateways.planningGateway || null;
  }

  async generateDirections(command) {
    const project = this.repos.projects.get(command.projectId);
    invariant(project, 'PROJECT_NOT_FOUND', '项目不存在', { projectId: command.projectId });
    invariant(command.visualDNAId, 'VISUAL_DNA_REQUIRED', '需要提供 VisualDNA 标识');

    const visualDNA = this.repos.visualDNAs.require(command.visualDNAId);
    invariant(visualDNA.projectId === command.projectId, 'VISUAL_DNA_PROJECT_MISMATCH', 'VisualDNA 不属于当前项目');

    const brief = this.repos.projectBriefs.list(item => item.projectId === command.projectId)[0]
      || { theme: project.theme || project.title || '', style: project.style || '', mood: project.mood || '' };

    let directionSpecs;
    if (this.planningGateway?.generateCreativeDirections) {
      directionSpecs = await this.planningGateway.generateCreativeDirections({ visualDNA, brief });
    } else {
      directionSpecs = deterministicCreativeDirections(visualDNA, brief);
    }

    const directions = directionSpecs.map(spec =>
      this.repos.creativeDirections.create(createEntity('creative-direction', {
        projectId: command.projectId,
        visualDNAId: visualDNA.id,
        title: spec.title,
        keywords: spec.keywords,
        styleTags: spec.styleTags,
        moodDescription: spec.moodDescription,
        referenceAssetIds: spec.referenceAssetIds || [],
        status: 'candidate',
        selectedAt: null,
      })),
    );

    return {
      directions,
      events: [{ type: 'CreativeDirectionsGenerated', projectId: command.projectId, visualDNAId: visualDNA.id, directionIds: directions.map(d => d.id) }],
    };
  }

  selectDirection(command) {
    const direction = this.repos.creativeDirections.require(command.creativeDirectionId);
    invariant(direction.status === 'candidate', 'CREATIVE_DIRECTION_NOT_SELECTABLE', '只有候选方向的创意方向可以被选择', { status: direction.status });

    const selected = this.repos.creativeDirections.save(updateEntity(direction, {
      status: 'selected',
      selectedAt: new Date().toISOString(),
    }));

    const otherCandidates = this.repos.creativeDirections.list(
      item => item.projectId === direction.projectId && item.status === 'candidate' && item.id !== direction.id,
    );
    const rejected = otherCandidates.map(item =>
      this.repos.creativeDirections.save(updateEntity(item, { status: 'rejected' })),
    );

    return {
      selected,
      rejected,
      events: [{ type: 'CreativeDirectionSelected', creativeDirectionId: selected.id, projectId: selected.projectId, rejectedIds: rejected.map(r => r.id) }],
    };
  }
}

export function deterministicCreativeDirections(visualDNA, brief) {
  const colorAnalysis = visualDNA.colorAnalysis || {};
  const lightingAnalysis = visualDNA.lightingAnalysis || {};
  const compositionAnalysis = visualDNA.compositionAnalysis || {};

  const theme = brief.theme || '';
  const style = brief.style || '';
  const mood = brief.mood || '';

  const colorTemp = String(colorAnalysis.temperature || '').trim();
  const lightApproach = String(lightingAnalysis.approach || '').trim();
  const compPatterns = Array.isArray(compositionAnalysis.patterns) ? compositionAnalysis.patterns : [];
  const colorKeywords = Array.isArray(colorAnalysis.dominantTones) ? colorAnalysis.dominantTones : [];

  const dirATitle = buildTitle(theme, compPatterns, lightApproach) || `${theme || '主题'}视觉风格`;
  const dirAKeywords = uniqueStrings([
    colorTemp || '中性色调',
    lightApproach || '自然光',
    ...compPatterns.slice(0, 2),
    ...colorKeywords.slice(0, 2),
  ]);
  const dirAStyleTags = uniqueStrings([
    style,
    colorTemp,
    lightApproach,
    ...compPatterns.slice(0, 1),
  ].filter(Boolean));
  const dirAMood = mood || `${colorTemp}色调与${lightApproach || '自然'}光线的结合`;

  const dirBTitle = `${theme || '纪实'}现场纪实`;
  const dirBKeywords = uniqueStrings([
    '抓拍',
    '自然状态',
    '街头氛围',
    lightApproach ? `${lightApproach}纪实` : '',
  ]);
  const dirBStyleTags = uniqueStrings([
    style ? `${style}纪实` : '纪实',
    'documentary',
    'candid',
    ...colorKeywords.slice(0, 1),
  ]);
  const dirBMood = `以纪实手法捕捉${theme || '场景'}中的自然瞬间，${lightApproach || '环境光'}下的真实状态`;

  const dirCTitle = `${colorTemp || '低光'}情绪人像`;
  const dirCKeywords = uniqueStrings([
    '静态',
    '情绪表达',
    '浅景深',
    colorTemp || '',
    ...colorKeywords.slice(0, 1),
  ]);
  const dirCStyleTags = uniqueStrings([
    style ? `${style}情绪` : '情绪人像',
    'intimate',
    'close-up',
    ...compPatterns.slice(0, 1),
  ]);
  const dirCMood = `聚焦情绪与氛围，以${colorTemp || '低色温'}光影营造${mood || '内省'}的空间感`;

  return [
    {
      title: dirATitle,
      keywords: dirAKeywords,
      styleTags: dirAStyleTags,
      moodDescription: dirAMood,
      referenceAssetIds: [],
    },
    {
      title: dirBTitle,
      keywords: dirBKeywords,
      styleTags: dirBStyleTags,
      moodDescription: dirBMood,
      referenceAssetIds: [],
    },
    {
      title: dirCTitle,
      keywords: dirCKeywords,
      styleTags: dirCStyleTags,
      moodDescription: dirCMood,
      referenceAssetIds: [],
    },
  ];
}

function buildTitle(theme, compPatterns, lightApproach) {
  const parts = [theme];
  const pattern = compPatterns[0];
  if (pattern) parts.push(pattern);
  if (lightApproach) parts.push(lightApproach);
  const joined = parts.filter(Boolean).join('·');
  return joined ? `${joined}感` : '';
}

function uniqueStrings(values) {
  return [...new Set(values.map(v => String(v).trim()).filter(Boolean))];
}

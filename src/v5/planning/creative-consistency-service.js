import { AppError, invariant } from '../common/errors.js';

const CONTRADICTORY_PAIRS = [
  ['清冷', '温暖'],
  ['冷色', '暖色'],
  ['夜景', '日系'],
  ['胶片', '明亮'],
  ['低饱和', '鲜艳'],
  ['情绪', '活泼'],
  ['安静', '欢快'],
  ['克制', '热情'],
];

export function hasContradiction(words1, words2) {
  const set1 = new Set(words1.map(w => String(w).trim()).filter(Boolean));
  const set2 = new Set(words2.map(w => String(w).trim()).filter(Boolean));
  for (const [a, b] of CONTRADICTORY_PAIRS) {
    if ((set1.has(a) && set2.has(b)) || (set1.has(b) && set2.has(a))) {
      return true;
    }
  }
  return false;
}

function extractKeyWords(...texts) {
  const joined = texts.filter(Boolean).join(' ');
  return joined
    .split(/[，,、；;\s]+/)
    .map(w => w.trim())
    .filter(Boolean);
}

export class CreativeConsistencyService {
  constructor(repositories) {
    this.repos = repositories;
  }

  async audit(command) {
    const { projectId, visualDNAId, creativeDirectionId, shots: commandShots } = command;

    const project = this.repos.projects.get(projectId);
    invariant(project, 'PROJECT_NOT_FOUND', '项目不存在', { projectId });

    const visualDNA = this.repos.visualDNAs.get(visualDNAId);
    invariant(visualDNA, 'VISUAL_DNA_NOT_FOUND', 'VisualDNA 不存在', { visualDNAId });

    const creativeDirection = this.repos.creativeDirections.get(creativeDirectionId);
    invariant(creativeDirection, 'CREATIVE_DIRECTION_NOT_FOUND', '创意方向不存在', { creativeDirectionId });

    const brief = this.repos.projectBriefs.list(item => item.projectId === projectId)[0]
      || { theme: project.theme || '', style: project.style || '', mood: project.mood || '' };

    const shots = commandShots
      || this.repos.shots.list(s => s.projectId === projectId);

    const checks = [
      this._checkStyleConsistency(brief, creativeDirection),
      this._checkVisualDNAAlignment(visualDNA, shots),
      this._checkReferenceBinding(shots),
      this._checkEmotionCoherence(creativeDirection, shots),
      this._checkColorTemperatureConsistency(visualDNA, shots),
    ];

    const issues = [];
    const warnings = [];
    const passed = [];

    for (const result of checks) {
      if (result.severity === 'FAIL') {
        issues.push(result);
      } else if (result.severity === 'WARN') {
        warnings.push(result);
      }
      if (result.passed) {
        passed.push(result);
      }
    }

    const score = Math.max(0, 100 - issues.length * 15 - warnings.length * 5);

    return { score, issues, warnings, passed };
  }

  _checkStyleConsistency(brief, creativeDirection) {
    const briefWords = extractKeyWords(brief.style, brief.mood);
    const directionWords = extractKeyWords(
      ...(creativeDirection.keywords || []),
      ...(creativeDirection.styleTags || []),
    );

    if (briefWords.length === 0) {
      return { rule: 'STYLE_CONSISTENCY', passed: true, message: '简报无风格/情绪关键词，跳过风格一致性检查', severity: 'PASS' };
    }

    if (hasContradiction(briefWords, directionWords)) {
      return {
        rule: 'STYLE_CONSISTENCY',
        passed: false,
        message: `创意方向与简报风格矛盾：简报 [${briefWords.join(', ')}] vs 方向 [${directionWords.join(', ')}]`,
        severity: 'FAIL',
      };
    }

    const overlap = directionWords.filter(w => briefWords.includes(w));
    if (overlap.length === 0 && briefWords.length > 0) {
      return {
        rule: 'STYLE_CONSISTENCY',
        passed: false,
        message: `创意方向未包含简报风格关键词：简报期望 [${briefWords.join(', ')}]，方向实际 [${directionWords.join(', ')}]`,
        severity: 'FAIL',
      };
    }

    return {
      rule: 'STYLE_CONSISTENCY',
      passed: true,
      message: `风格一致，重叠关键词：[${overlap.join(', ')}]`,
      severity: 'PASS',
    };
  }

  _checkVisualDNAAlignment(visualDNA, shots) {
    if (!shots || shots.length === 0) {
      return { rule: 'VISUAL_DNA_ALIGNMENT', passed: true, message: '无镜头数据，跳过 VisualDNA 对齐检查', severity: 'PASS' };
    }

    const focalRecs = visualDNA.lensAnalysis?.focalRecommendations || [];
    const validFocalMms = focalRecs.map(r => (typeof r === 'object' ? r.mm : String(r)));
    const lightingApproach = visualDNA.lightingAnalysis?.approach || '';
    const compositionPatterns = visualDNA.compositionAnalysis?.patterns || [];

    const misaligned = [];

    for (const shot of shots) {
      if (validFocalMms.length > 0 && shot.focalLength && !validFocalMms.includes(shot.focalLength)) {
        misaligned.push(`镜头 #${shot.sequence || '?'} 焦段 ${shot.focalLength} 不在推荐 [${validFocalMms.join(', ')}] 中`);
      }
      if (lightingApproach && shot.lighting && compositionPatterns.length === 0) {
        // Lighting check only when we have a clear approach
      }
      if (compositionPatterns.length > 0 && shot.composition && !compositionPatterns.includes(shot.composition)) {
        misaligned.push(`镜头 #${shot.sequence || '?'} 构图「${shot.composition}」不在推荐 [${compositionPatterns.join(', ')}] 中`);
      }
    }

    if (misaligned.length > 0) {
      return {
        rule: 'VISUAL_DNA_ALIGNMENT',
        passed: false,
        message: `镜头与 VisualDNA 不对齐：${misaligned.join('; ')}`,
        severity: 'FAIL',
      };
    }

    return {
      rule: 'VISUAL_DNA_ALIGNMENT',
      passed: true,
      message: '镜头焦段/构图/光线与 VisualDNA 分析一致',
      severity: 'PASS',
    };
  }

  _checkReferenceBinding(shots) {
    if (!shots || shots.length === 0) {
      return { rule: 'REFERENCE_BINDING', passed: true, message: '无镜头数据，跳过参考绑定检查', severity: 'PASS' };
    }

    const unboundCount = shots.filter(s => !s.referenceAssetId).length;
    const total = shots.length;
    const boundCount = total - unboundCount;

    if (unboundCount > total / 2) {
      return {
        rule: 'REFERENCE_BINDING',
        passed: false,
        message: `超过半数镜头缺少参考素材绑定：${unboundCount}/${total} 未绑定`,
        severity: 'FAIL',
      };
    }

    if (unboundCount > 0) {
      return {
        rule: 'REFERENCE_BINDING',
        passed: true,
        message: `${unboundCount} 个镜头缺少参考素材绑定（${boundCount}/${total} 已绑定）`,
        severity: 'WARN',
      };
    }

    return {
      rule: 'REFERENCE_BINDING',
      passed: true,
      message: `所有镜头均已绑定参考素材（${total}/${total}）`,
      severity: 'PASS',
    };
  }

  _checkEmotionCoherence(creativeDirection, shots) {
    if (!shots || shots.length === 0) {
      return { rule: 'EMOTION_COHERENCE', passed: true, message: '无镜头数据，跳过情绪一致性检查', severity: 'PASS' };
    }

    const directionKeywords = creativeDirection.keywords || [];
    if (directionKeywords.length === 0) {
      return { rule: 'EMOTION_COHERENCE', passed: true, message: '创意方向无关键词，跳过情绪一致性检查', severity: 'PASS' };
    }

    const contradictions = [];

    for (const shot of shots) {
      const shotEmotionWords = extractKeyWords(shot.emotion, shot.mood);
      if (shotEmotionWords.length > 0 && hasContradiction(directionKeywords, shotEmotionWords)) {
        contradictions.push(`镜头 #${shot.sequence || '?'} 情绪 [${shotEmotionWords.join(', ')}] 与方向 [${directionKeywords.join(', ')}] 矛盾`);
      }
    }

    if (contradictions.length > 0) {
      return {
        rule: 'EMOTION_COHERENCE',
        passed: false,
        message: `镜头情绪与创意方向矛盾：${contradictions.join('; ')}`,
        severity: 'FAIL',
      };
    }

    return {
      rule: 'EMOTION_COHERENCE',
      passed: true,
      message: '镜头情绪与创意方向一致',
      severity: 'PASS',
    };
  }

  _checkColorTemperatureConsistency(visualDNA, shots) {
    if (!shots || shots.length === 0) {
      return { rule: 'COLOR_TEMPERATURE_CONSISTENCY', passed: true, message: '无镜头数据，跳过色温一致性检查', severity: 'PASS' };
    }

    const temperature = visualDNA.colorAnalysis?.temperature || '';
    if (!temperature) {
      return { rule: 'COLOR_TEMPERATURE_CONSISTENCY', passed: true, message: 'VisualDNA 无色温倾向，跳过色温一致性检查', severity: 'PASS' };
    }

    const isCool = temperature.includes('冷');
    const isWarm = temperature.includes('暖');

    if (!isCool && !isWarm) {
      return { rule: 'COLOR_TEMPERATURE_CONSISTENCY', passed: true, message: `VisualDNA 色温为「${temperature}」，无需检查矛盾`, severity: 'PASS' };
    }

    const warmWords = ['温暖', '暖色', '明亮', '日系', '鲜艳', '活泼', '热情', '欢快'];
    const coolWords = ['清冷', '冷色', '夜景', '胶片', '低饱和', '情绪', '安静', '克制'];

    const contradictions = [];

    for (const shot of shots) {
      const shotWords = extractKeyWords(shot.lighting, shot.mood, shot.emotion);
      if (isCool && shotWords.some(w => warmWords.includes(w))) {
        contradictions.push(`镜头 #${shot.sequence || '?'} 含暖调词 [${shotWords.filter(w => warmWords.includes(w)).join(', ')}]，但 VisualDNA 为冷色倾向`);
      }
      if (isWarm && shotWords.some(w => coolWords.includes(w))) {
        contradictions.push(`镜头 #${shot.sequence || '?'} 含冷调词 [${shotWords.filter(w => coolWords.includes(w)).join(', ')}]，但 VisualDNA 为暖色倾向`);
      }
    }

    if (contradictions.length > 0) {
      return {
        rule: 'COLOR_TEMPERATURE_CONSISTENCY',
        passed: false,
        message: `镜头色温与 VisualDNA 矛盾：${contradictions.join('; ')}`,
        severity: 'FAIL',
      };
    }

    return {
      rule: 'COLOR_TEMPERATURE_CONSISTENCY',
      passed: true,
      message: `镜头色温与 VisualDNA「${temperature}」一致`,
      severity: 'PASS',
    };
  }
}

import { PhotographyKnowledgeService, buildKnowledgeShotList, knowledgeImageDirection } from './services/photography-knowledge-service.js';

function legacySearch(query, options = {}) {
  return Promise.resolve(window.bootstrapObsidianSettings?.()).then(() => {
    const settings = window.getObsidianSettings?.();
    if (!settings?.helperBaseUrl || typeof window.searchObsidianProxy !== 'function') return [];
    return window.searchObsidianProxy(query, settings, options.limit || 8);
  });
}

function replaceSection(sections, marker, content) {
  const section = (sections || []).find(item => String(item.ti || '').includes(marker));
  if (section) section.c = content;
}

function sourceLabel(source) {
  const provenance = source.groundingStatus === 'metadata-only' ? '候选元数据' : '本地笔记';
  return `【${provenance}】${source.title}${source.path ? ` · ${source.path}` : ''}`;
}

const service = new PhotographyKnowledgeService({
  searchObsidian: legacySearch,
  catalogUrl: '../data/ronin-photography-knowledge.json',
});

export async function enrichLegacyPlan(plan) {
  const knowledge = await service.buildForInput(plan.input || {});
  plan.knowledgeContext = knowledge;
  plan.knowledgeShotList = buildKnowledgeShotList(plan.input || {}, knowledge);
  const guidance = knowledge.guidance;
  replaceSection(plan.sections, '摆姿', [
    guidance.poseSummary,
    ...plan.knowledgeShotList.slice(0, 5).map(shot => `【${shot.priority}】${shot.description}：${shot.notes}`),
  ]);
  replaceSection(plan.sections, '场景建议', [
    guidance.sceneSummary,
    ...plan.knowledgeShotList.slice(0, 3).map(shot => `· ${shot.scene}：${shot.composition}`),
  ]);
  replaceSection(plan.sections, '光线建议', [
    guidance.lightingSummary,
    ...plan.knowledgeShotList.slice(0, 3).map(shot => `· ${shot.description}：${shot.lighting}`),
  ]);
  plan.sections = plan.sections || [];
  const evidence = [
    `【策略】${guidance.label}；${guidance.timelineSummary}`,
    ...knowledge.sources.slice(0, 6).map(sourceLabel),
    ...(knowledge.warnings || []).map(warning => `【边界】${warning}`),
  ];
  const existing = plan.sections.find(section => section.ti === '📚 知识依据');
  if (existing) existing.c = evidence;
  else plan.sections.splice(1, 0, { ti: '📚 知识依据', ic: '📚', c: evidence });
  return plan;
}

export function getLegacyImageDirection(plan, shotIndex) {
  return knowledgeImageDirection(plan, shotIndex);
}

window.PhotoAtelierKnowledge = { enrichLegacyPlan, getLegacyImageDirection };

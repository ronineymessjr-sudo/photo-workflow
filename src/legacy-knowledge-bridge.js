import { PhotographyKnowledgeService, buildKnowledgeShotList, knowledgeImageDirection } from './services/photography-knowledge-service.js';

function readObsidianSettings() {
  if (typeof globalThis.window === 'undefined') return null;
  return typeof globalThis.window.getObsidianSettings === 'function' ? globalThis.window.getObsidianSettings() : null;
}

function legacySearch(query, options = {}) {
  return Promise.resolve(globalThis.window?.bootstrapObsidianSettings?.()).then(() => {
    const settings = readObsidianSettings();
    if (!settings?.helperBaseUrl || typeof globalThis.window?.searchObsidianProxy !== 'function') return [];
    return globalThis.window.searchObsidianProxy(query, settings, options.limit || 8);
  }).catch(() => []);
}

export async function checkPersonalLibraryHealth() {
  const settings = readObsidianSettings();
  if (!settings?.helperBaseUrl) return { available: false, reason: '未配置个人图库服务', healthResult: 'not_configured' };
  const helper = settings.helperBaseUrl.replace(/\/$/, '');
  try {
    const response = await fetch(`${helper}/v1/health?libraryFolder=${encodeURIComponent(settings.libraryFolder || '.')}`, { cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { available: false, reason: '个人图库服务未授权', helper, libraryFolder: settings.libraryFolder || '.', healthResult: 'unauthorized' };
      }
      if (response.status === 404) {
        return { available: false, reason: '个人图库路径缺失', helper, libraryFolder: settings.libraryFolder || '.', healthResult: 'path_missing' };
      }
      return { available: false, reason: '个人图库服务无响应', helper, libraryFolder: settings.libraryFolder || '.', healthResult: 'service_unavailable' };
    }
    const data = await response.json();
    if (!data.ok) return { available: false, reason: '个人图库服务未就绪', helper, libraryFolder: settings.libraryFolder || '.', healthResult: 'service_unavailable' };
    return { available: true, helper, libraryFolder: settings.libraryFolder || '.', count: data.count || 0, healthResult: 'reachable' };
  } catch {
    return { available: false, reason: '个人图库连接失败', helper, libraryFolder: settings.libraryFolder || '.', healthResult: 'service_unavailable' };
  }
}

export function getPersonalLibraryHealth() {
  return checkPersonalLibraryHealth();
}

export async function preparePersonalLibrary() {
  return {
    prepared: false,
    state: 'needs_repair',
    reason: '当前本地桥接未暴露安全的文件夹创建端点',
    architectureDecision: 'ARCHITECTURE DECISION REQUIRED: local-obsidian-proxy 缺少显式的 POST /v1/library/prepare 可写端点，以安全创建 PhotoAtelier / Reference Inbox / Shoot Notes / Reviews 目录。在增加该端点前，请手动建立上述目录结构并点击“再次测试”。',
  };
}

export function searchPersonalLibrary(query, options = {}) {
  return legacySearch(query, options).catch(() => []);
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

if (typeof globalThis.window !== 'undefined') {
  globalThis.window.PhotoAtelierKnowledge = {
    enrichLegacyPlan,
    getLegacyImageDirection,
    checkPersonalLibraryHealth,
    getPersonalLibraryHealth,
    preparePersonalLibrary,
    searchPersonalLibrary,
  };
}

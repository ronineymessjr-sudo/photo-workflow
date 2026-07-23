const STORAGE_KEY = 'photoatelier.personal-library.settings';

const LIBRARY_STRUCTURE = [
  {
    name: 'PhotoAtelier',
    purpose: '个人摄影工作库根目录',
    children: [
      { name: 'Reference Inbox', purpose: '待整理的新参考图与灵感素材' },
      { name: 'Shoot Notes', purpose: '每次拍摄的准备、勘景与执行笔记' },
      { name: 'Reviews', purpose: '拍摄后的复盘、成片反馈与可复用经验' },
    ],
  },
];

const DEFAULT_SETTINGS = {
  enabled: false,
  helperBaseUrl: '',
  libraryFolder: 'PhotoAtelier',
  obsidianUrl: '',
  apiKey: '',
};

function readSettings() {
  if (typeof globalThis.window !== 'undefined' && typeof globalThis.window.getObsidianSettings === 'function') {
    const settings = globalThis.window.getObsidianSettings() || {};
    return { ...DEFAULT_SETTINGS, ...settings };
  }
  return { ...DEFAULT_SETTINGS };
}

function storageGet(key, fallback) {
  if (typeof globalThis.window === 'undefined') return fallback;
  try {
    const raw = globalThis.window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  if (typeof globalThis.window === 'undefined') return;
  try {
    globalThis.window.localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

export function getObsidianSettings() {
  return { ...DEFAULT_SETTINGS, ...storageGet(STORAGE_KEY, {}), ...readSettings() };
}

export function saveObsidianSettings(partial) {
  const settings = { ...getObsidianSettings(), ...partial };
  storageSet(STORAGE_KEY, settings);
  return settings;
}

export function getLibraryStructure() {
  return LIBRARY_STRUCTURE.map(folder => ({
    ...folder,
    children: folder.children.map(child => ({ ...child })),
  }));
}

function knowledgeBridge() {
  return globalThis.window?.PhotoAtelierKnowledge;
}

function isConfigured(settings) {
  return Boolean(settings?.helperBaseUrl);
}

export async function preparePersonalLibrary() {
  const settings = getObsidianSettings();
  if (!isConfigured(settings)) {
    return {
      prepared: false,
      state: 'not_configured',
      reason: '未配置个人图库服务地址',
      manualStructure: getLibraryStructure(),
      architectureDecision: null,
      testAgain: false,
    };
  }

  const bridge = knowledgeBridge();
  if (!bridge || typeof bridge.preparePersonalLibrary !== 'function') {
    return {
      prepared: false,
      state: 'needs_repair',
      reason: '当前本地桥接未暴露安全的文件夹创建端点',
      manualStructure: getLibraryStructure(),
      architectureDecision: 'ARCHITECTURE DECISION REQUIRED: local-obsidian-proxy 缺少显式的 POST /v1/library/prepare 可写端点，以安全创建 PhotoAtelier / Reference Inbox / Shoot Notes / Reviews 目录。在增加该端点前，请手动建立上述目录结构并点击“再次测试”。',
      testAgain: true,
    };
  }

  try {
    const result = await bridge.preparePersonalLibrary(settings);
    return {
      prepared: true,
      state: 'connected',
      ...result,
    };
  } catch (error) {
    return {
      prepared: false,
      state: 'needs_repair',
      reason: error?.message || String(error),
      manualStructure: getLibraryStructure(),
      testAgain: true,
    };
  }
}

export async function testPersonalLibraryConnection() {
  const settings = getObsidianSettings();
  if (!isConfigured(settings)) {
    return { status: 'not_configured', available: false, reason: '未配置个人图库服务地址' };
  }

  const bridge = knowledgeBridge();
  if (!bridge || typeof bridge.checkPersonalLibraryHealth !== 'function') {
    return { status: 'unavailable', available: false, reason: '未找到个人图库桥接' };
  }

  const health = await bridge.checkPersonalLibraryHealth();
  if (health.available) {
    return { status: 'connected', available: true, healthResult: health.healthResult || 'reachable', ...health };
  }

  const result = health.healthResult || 'service_unavailable';
  if (result === 'unauthorized') {
    return { status: 'needs_repair', available: false, healthResult: 'unauthorized', ...health };
  }
  if (result === 'path_missing') {
    return { status: 'unavailable', available: false, healthResult: 'path_missing', ...health };
  }
  if (result === 'not_configured') {
    return { status: 'not_configured', available: false, healthResult: 'not_configured', ...health };
  }
  return { status: 'unavailable', available: false, healthResult: 'service_unavailable', ...health };
}

export async function getPersonalLibraryHealth() {
  const settings = getObsidianSettings();
  if (!isConfigured(settings)) {
    return { status: 'not_configured', available: false, reason: '未配置个人图库服务地址' };
  }
  const bridge = knowledgeBridge();
  if (!bridge || typeof bridge.getPersonalLibraryHealth !== 'function') {
    return { status: 'unavailable', available: false, reason: '未找到个人图库健康检查接口' };
  }
  const health = await bridge.getPersonalLibraryHealth();
  return { status: health.available ? 'connected' : 'unavailable', ...health };
}

const controllerState = {
  status: 'not_configured',
  settings: { ...DEFAULT_SETTINGS },
  lastHealth: null,
  lastPrepare: null,
};

export function getControllerState() {
  return { ...controllerState };
}

export function initializeController() {
  controllerState.settings = getObsidianSettings();
  controllerState.status = isConfigured(controllerState.settings) ? 'ready_to_test' : 'not_configured';
  controllerState.lastHealth = null;
  controllerState.lastPrepare = null;
  return getControllerState();
}

export async function runHealthCheck() {
  controllerState.status = 'ready_to_test';
  const result = await testPersonalLibraryConnection();
  controllerState.lastHealth = result;
  if (result.status === 'connected') controllerState.status = 'connected';
  else if (result.status === 'needs_repair') controllerState.status = 'needs_repair';
  else controllerState.status = 'unavailable';
  return result;
}

export async function runPrepareLibrary() {
  const result = await preparePersonalLibrary();
  controllerState.lastPrepare = result;
  if (result.prepared) {
    controllerState.status = 'connected';
  } else if (result.state === 'not_configured') {
    controllerState.status = 'not_configured';
  } else {
    controllerState.status = 'needs_repair';
  }
  return result;
}

export function updateSettings(partial) {
  controllerState.settings = saveObsidianSettings(partial);
  controllerState.status = isConfigured(controllerState.settings) ? 'ready_to_test' : 'not_configured';
  return getControllerState();
}

if (typeof globalThis.window !== 'undefined') {
  globalThis.window.PhotoAtelierPersonalLibraryOnboarding = {
    getObsidianSettings,
    saveObsidianSettings,
    getLibraryStructure,
    preparePersonalLibrary,
    testPersonalLibraryConnection,
    getPersonalLibraryHealth,
    getControllerState,
    initializeController,
    runHealthCheck,
    runPrepareLibrary,
    updateSettings,
  };
}

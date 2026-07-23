import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const launcherUrl = pathToFileURL(path.resolve(__dirname, '..', '..', '..', 'src', 'legacy-reference-context-launcher.js')).href;

class FakeStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

function createMocks({ plan = null, shot = null, personalLibraryAvailable = false } = {}) {
  const storage = new FakeStorage();
  const plans = plan ? [plan] : [];
  const shots = shot ? [shot] : [];
  const selectedReferences = [];
  const openedUrls = [];

  globalThis.window = globalThis;
  globalThis.localStorage = storage;
  globalThis.open = (url) => openedUrls.push(url);
  globalThis.toast = () => {};

  globalThis.PhotoAtelierV5 = {
    ready: true,
    application: {
      repositories: {
        plans: {
          get: (id) => plans.find((p) => String(p.id) === String(id)) || null,
          list: (filter) => (filter ? plans.filter(filter) : plans),
        },
        shots: {
          get: (id) => shots.find((s) => String(s.id) === String(id)) || null,
          list: (filter) => (filter ? shots.filter(filter) : shots),
        },
        referenceAssets: {},
      },
      queries: {
        referenceLibrary: {
          getProject: () => ({ selectedReferences, shotBindings: [] }),
        },
      },
      references: {},
    },
  };

  globalThis.PhotoAtelierKnowledge = personalLibraryAvailable
    ? {
        checkPersonalLibraryHealth: async () => ({ available: true, helper: 'http://127.0.0.1:8124', libraryFolder: 'PhotoAtelier' }),
        openPersonalLibrarySearch: (context) => openedUrls.push({ personal: true, context }),
      }
    : undefined;

  globalThis.currentPlanId = plan?.id || null;

  return { storage, openedUrls, selectedReferences };
}

async function loadLauncher() {
  await import(launcherUrl);
}

describe('R3-B - contextual reference handoff', () => {
  beforeEach(() => {
    createMocks();
  });

  it('builds context from plan and shot without inventing fields', async () => {
    const plan = {
      id: 'plan-1',
      projectId: 'proj-1',
      input: { theme: '城市夜景', style: '电影感', scene: '街道', mood: '安静' },
    };
    const shot = { id: 'shot-1', projectId: 'proj-1', scene: '霓虹半身', focalLength: '50mm', sequence: 1 };
    createMocks({ plan, shot });
    await loadLauncher();

    const context = globalThis.buildReferenceContext({ shotId: 'shot-1' });
    assert.equal(context.planId, 'plan-1');
    assert.equal(context.theme, '城市夜景');
    assert.equal(context.style, '电影感');
    assert.equal(context.scene, '街道');
    assert.equal(context.mood, '安静');
    assert.equal(context.focalLength, '50mm');
    assert.equal(context.shotScene, '霓虹半身');
    assert.equal(context.shotId, 'shot-1');
  });

  it('omits missing fields from handoff query', async () => {
    const plan = {
      id: 'plan-2',
      projectId: 'proj-2',
      input: { theme: '人像', style: '', scene: '公园', mood: '自然' },
    };
    createMocks({ plan });
    await loadLauncher();

    const context = globalThis.buildReferenceContext();
    const query = globalThis.buildHandoffQuery(context);
    assert.ok(query.includes('人像'));
    assert.ok(query.includes('公园'));
    assert.ok(query.includes('自然'));
    assert.ok(!query.includes('风格'));
    assert.ok(!query.includes('电影感'));
  });

  it('renders a single contextual action naming the target and query', async () => {
    const plan = {
      id: 'plan-3',
      projectId: 'proj-3',
      input: { theme: '情绪人像', style: '胶片', scene: '海边', mood: '孤独' },
    };
    createMocks({ plan });
    await loadLauncher();

    const html = globalThis.renderContextualReferenceHandoff();
    assert.ok(html.includes('reference-context-handoff'));
    assert.ok(html.includes('在 Pexels 搜索：'));
    assert.ok(html.includes('情绪人像'));
    assert.ok(html.includes('胶片'));
    assert.ok(html.includes('海边'));
    assert.ok(!html.includes('reference-open-source'));
  });

  it('opens only the selected target with encoded context query', async () => {
    const plan = {
      id: 'plan-4',
      projectId: 'proj-4',
      input: { theme: '城市夜景', style: '电影感', scene: '街道', mood: '安静' },
    };
    const { openedUrls } = createMocks({ plan });
    await loadLauncher();

    globalThis.setSelectedTarget('unsplash');
    const result = await globalThis.openContextualReferenceSearch();
    assert.equal(result.opened, true);
    assert.equal(result.target, 'unsplash');
    assert.equal(openedUrls.length, 1);
    assert.match(openedUrls[0], /unsplash\.com/);
    assert.match(openedUrls[0], /%E5%9F%8E%E5%B8%82%E5%A4%9C%E6%99%AF/);
  });

  it('hides handoff when there is no usable context', async () => {
    createMocks();
    await loadLauncher();

    const html = globalThis.renderContextualReferenceHandoff();
    assert.equal(html, '');
    const result = await globalThis.openContextualReferenceSearch();
    assert.equal(result.opened, false);
  });

  it('renders source button only for real assets with concrete sourceUrl', async () => {
    createMocks();
    await loadLauncher();

    const realWithUrl = globalThis.renderSourceButton({ sourceUrl: 'https://pexels.com/photo/1', synthetic: false });
    assert.ok(realWithUrl.includes('href="https://pexels.com/photo/1"'));
    assert.ok(realWithUrl.includes('来源'));

    const realWithoutUrl = globalThis.renderSourceButton({ sourceUrl: '', synthetic: false });
    assert.equal(realWithoutUrl, '');

    const synthetic = globalThis.renderSourceButton({ sourceUrl: 'https://example.com/img.jpg', synthetic: true });
    assert.equal(synthetic, '');
  });

  it('supports personal library target when health check passes', async () => {
    const plan = {
      id: 'plan-5',
      projectId: 'proj-5',
      input: { theme: '家庭照', style: '自然', scene: '客厅' },
    };
    const { openedUrls } = createMocks({ plan, personalLibraryAvailable: true });
    await loadLauncher();

    globalThis.setSelectedTarget('personal-library');
    const result = await globalThis.openContextualReferenceSearch();
    assert.equal(result.opened, true);
    assert.equal(result.target, 'personal-library');
    assert.equal(openedUrls.length, 1);
    assert.equal(openedUrls[0].personal, true);
  });

  it('does not open personal library when health check fails', async () => {
    const plan = {
      id: 'plan-6',
      projectId: 'proj-6',
      input: { theme: '街拍', style: '复古', scene: '胡同' },
    };
    createMocks({ plan, personalLibraryAvailable: false });
    await loadLauncher();

    globalThis.setSelectedTarget('personal-library');
    const result = await globalThis.openContextualReferenceSearch();
    assert.equal(result.opened, false);
    assert.ok(result.reason.includes('个人图库'));
  });
});

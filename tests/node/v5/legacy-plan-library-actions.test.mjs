import { describe, it, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appEnhancementsUrl = pathToFileURL(path.resolve(__dirname, '..', '..', '..', 'src', 'app-enhancements.js')).href;

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

function makeInputElement(value = '') {
  return {
    _value: value,
    get value() { return this._value; },
    set value(v) { this._value = String(v); },
  };
}

function makeDialog() {
  return {
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; },
  };
}

function createMocks({ preserveRenderPlanContent = false } = {}) {
  const storage = new FakeStorage();
  const elements = {
    planLibraryList: { innerHTML: '' },
    planLibraryTabs: { innerHTML: '' },
    planLibrarySearch: { value: '' },
    planSchedulePlanId: makeInputElement(''),
    planScheduleTitle: makeInputElement(''),
    planScheduleDate: makeInputElement(''),
    planScheduleTime: makeInputElement(''),
    planScheduleLocation: makeInputElement(''),
    planScheduleNotes: makeInputElement(''),
    planScheduleDialog: makeDialog(),
    outCnt: null,
  };

  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.localStorage = storage;
  globalThis.document = {
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById(id) {
      if (id.startsWith('workflow-publish-')) {
        return { open: false, scrollIntoView() {} };
      }
      return elements[id] ?? null;
    },
    createElement(tag) {
      return {
        tagName: tag,
        classList: { add() {}, remove() {}, toggle() {} },
        className: '',
        id: '',
        innerHTML: '',
        style: {},
        setAttribute() {},
        appendChild() {},
        addEventListener() {},
        open: false,
        showModal() { this.open = true; },
        close() { this.open = false; },
        scrollIntoView() {},
      };
    },
    body: { appendChild() {} },
  };

  globalThis.PhotoWorkflowDomain = {
    nowIso: () => new Date().toISOString(),
    stableHash: () => 'stable-hash',
    normalizeBrief: (input) => input || {},
    SCHEDULE_STATUSES: [{ id: 'scheduled' }],
    evaluateWorkflow: () => ({ score: 80, issues: [] }),
    buildPublishingPackage: () => ({ platforms: [] }),
    buildCanonicalRelations: () => [],
  };

  globalThis.PhotoWorkflowStore = {
    migrateLegacy: async () => ({ counts: {} }),
    bulkPut: async () => {},
    put: async () => {},
    remove: async () => {},
  };

  // Provide a minimal legacy render function so the wrapper appends the lifecycle panel.
  // Once the module is loaded and wraps it, do not overwrite the wrapped version.
  if (!preserveRenderPlanContent || typeof globalThis.renderPlanContent !== 'function') {
    globalThis.renderPlanContent = (plan) => `<div class="legacy-plan-content" data-plan-id="${plan.id}">legacy</div>`;
  }

  return { storage, elements };
}

async function loadModule() {
  await import(appEnhancementsUrl);
}

function writePlan(storage, plan) {
  const plans = JSON.parse(storage.getItem('pw_plans') || '[]');
  const idx = plans.findIndex((p) => String(p.id) === String(plan.id));
  if (idx >= 0) plans[idx] = plan; else plans.push(plan);
  storage.setItem('pw_plans', JSON.stringify(plans));
}

function getPlan(storage, planId) {
  const plans = JSON.parse(storage.getItem('pw_plans') || '[]');
  return plans.find((p) => String(p.id) === String(planId));
}

function getSchedules(storage) {
  return JSON.parse(storage.getItem('pw_schedule') || '[]');
}

describe('P1 - plan library, approval, schedule and execution actions', () => {
  before(async () => {
    createMocks();
    await loadModule();
  });

  beforeEach(() => {
    const { storage } = createMocks({ preserveRenderPlanContent: true });
    storage.clear();
    globalThis.setPlanLibraryView('candidate');
  });

  describe('plan library cards', () => {
    function renderCardHtml(plan) {
      writePlan(globalThis.localStorage, plan);
      globalThis.setPlanLibraryView(planLifecycleStatusForTest(plan));
      globalThis.renderPlanLibrary();
      return globalThis.document.getElementById('planLibraryList').innerHTML;
    }

    function planLifecycleStatusForTest(plan) {
      if (plan.lifecycleStatus === 'candidate') return 'candidate';
      if (plan.lifecycleStatus === 'scheduled' || getSchedules(globalThis.localStorage).some((s) => String(s.planId) === String(plan.id))) return 'scheduled';
      return 'confirmed';
    }

    it('candidate plan shows state label and primary action "确认采用"', () => {
      const html = renderCardHtml({ id: 'p-cand', lifecycleStatus: 'candidate', packageStatus: 'draft', input: { theme: '测试预选', style: '电影感', scene: '街道' }, createdAt: Date.now() });
      assert.ok(html.includes('预选方案'));
      assert.ok(html.includes('确认采用'));
      assert.ok(html.includes('继续编辑'));
      assert.ok(html.includes('补齐拍前资料'));
      assert.ok(!html.includes('查看复盘'));
    });

    it('confirmed plan shows state label and primary action "安排拍摄"', () => {
      const html = renderCardHtml({ id: 'p-conf', lifecycleStatus: 'confirmed', packageStatus: 'preflight-ready', input: { theme: '测试确认', style: '自然', scene: '公园' }, createdAt: Date.now() });
      assert.ok(html.includes('方案库'));
      assert.ok(html.includes('安排拍摄'));
      assert.ok(html.includes('打开分镜'));
      assert.ok(html.includes('查看复盘'));
      assert.ok(!html.includes('确认采用'));
    });

    it('scheduled plan shows state label and primary action "查看日程"', () => {
      globalThis.localStorage.setItem('pw_schedule', JSON.stringify([{ id: 's-1', planId: 'p-sched', date: '2026-08-01', time: '10:00' }]));
      const html = renderCardHtml({ id: 'p-sched', lifecycleStatus: 'scheduled', packageStatus: 'preflight-ready', input: { theme: '测试排期', style: '商业', scene: '影棚' }, createdAt: Date.now() });
      assert.ok(html.includes('已排期'));
      assert.ok(html.includes('查看日程'));
      assert.ok(html.includes('打开分镜'));
      assert.ok(html.includes('查看复盘'));
      assert.ok(!html.includes('安排拍摄'));
    });

    it('exposes export options on the card', () => {
      const html = renderCardHtml({ id: 'p-export', lifecycleStatus: 'candidate', packageStatus: 'draft', input: { theme: '导出测试', style: '胶片', scene: '咖啡馆' }, createdAt: Date.now() });
      assert.ok(html.includes('导出…'));
      assert.ok(html.includes('PDF / 打印'));
      assert.ok(html.includes('表格 CSV'));
      assert.ok(html.includes('文字版 TXT'));
    });
  });

  describe('approval and scheduling', () => {
    it('confirming a candidate plan keeps the same planId and moves it to confirmed', () => {
      writePlan(globalThis.localStorage, { id: 'p-approve', lifecycleStatus: 'candidate', packageStatus: 'draft', input: { theme: '审批测试' }, createdAt: Date.now() });
      globalThis.confirmCandidatePlan('p-approve');
      const plan = getPlan(globalThis.localStorage, 'p-approve');
      assert.equal(plan.lifecycleStatus, 'confirmed');
      assert.equal(plan.packageStatus, 'confirmed');
      assert.equal(plan.id, 'p-approve');
    });

    it('scheduling a confirmed plan preserves planId and lifecycle becomes scheduled', () => {
      writePlan(globalThis.localStorage, { id: 'p-schedule', lifecycleStatus: 'confirmed', packageStatus: 'preflight-ready', input: { theme: '排期测试', scene: '外景' }, createdAt: Date.now() });
      globalThis.openPlanScheduleDialog('p-schedule');
      globalThis.document.getElementById('planSchedulePlanId').value = 'p-schedule';
      globalThis.document.getElementById('planScheduleTitle').value = '排期测试';
      globalThis.document.getElementById('planScheduleDate').value = '2026-08-10';
      globalThis.document.getElementById('planScheduleTime').value = '09:30';
      globalThis.document.getElementById('planScheduleLocation').value = '公园';
      globalThis.confirmPlanSchedule();

      const plan = getPlan(globalThis.localStorage, 'p-schedule');
      const schedules = getSchedules(globalThis.localStorage);
      const schedule = schedules.find((s) => String(s.planId) === 'p-schedule');
      assert.equal(plan.lifecycleStatus, 'scheduled');
      assert.ok(schedule);
      assert.equal(String(schedule.planId), 'p-schedule');
      assert.equal(schedule.date, '2026-08-10');
      assert.equal(schedule.time, '09:30');
    });

    it('openPlanSchedule redirects to schedule dialog when no schedule exists', () => {
      writePlan(globalThis.localStorage, { id: 'p-no-schedule', lifecycleStatus: 'confirmed', packageStatus: 'preflight-ready', input: { theme: '无日程' }, createdAt: Date.now() });
      globalThis.openPlanSchedule('p-no-schedule');
      assert.equal(globalThis.document.getElementById('planScheduleDialog').open, true);
    });
  });

  describe('contextual actions for opened plan', () => {
    it('renderPlanContent wrapper includes execution-and-delivery rhythm', () => {
      const plan = { id: 'p-rhythm', lifecycleStatus: 'confirmed', packageStatus: 'preflight-ready', input: { theme: '节奏测试', style: '胶片', scene: '海边' }, lutProfileId: 't3-portra-400', createdAt: Date.now() };
      const html = globalThis.renderPlanContent(plan);
      assert.ok(html.includes('plan-execution-rhythm'));
      assert.ok(html.includes('准备'));
      assert.ok(html.includes('拍摄'));
      assert.ok(html.includes('选片'));
      assert.ok(html.includes('精修'));
      assert.ok(html.includes('交付'));
      assert.ok(html.includes('复盘'));
    });

    it('openPlanReview loads the plan and expands the publish panel', (t, done) => {
      let loadedId = null;
      globalThis.loadPlan = (id) => { loadedId = id; };
      globalThis.openPlanReview('p-review');
      assert.equal(loadedId, 'p-review');
      setTimeout(done, 50);
    });
  });

  describe('missing details completion', () => {
    it('completePlanPackage offers a completion action and sets packageStatus to preflight-ready', () => {
      writePlan(globalThis.localStorage, { id: 'p-incomplete', lifecycleStatus: 'candidate', packageStatus: 'draft', input: { theme: '补齐测试', style: '自然', scene: '室内' }, createdAt: Date.now() });
      globalThis.completePlanPackage('p-incomplete');
      const plan = getPlan(globalThis.localStorage, 'p-incomplete');
      assert.equal(plan.packageStatus, 'preflight-ready');
      assert.equal(plan.id, 'p-incomplete');
    });
  });
});

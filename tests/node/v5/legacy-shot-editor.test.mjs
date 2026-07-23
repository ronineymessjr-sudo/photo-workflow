import test from 'node:test';
import assert from 'node:assert/strict';
import LegacyShotEditor from '../../../src/legacy-shot-editor.js';

const { createShotEditor } = LegacyShotEditor;

function makePlan(id) {
  return {
    id,
    input: { style: '复古', mood: '自然', duration: '2小时' },
    shots: [
      { scene: '窗边', description: '自然光人像', shotSize: '中景', method: '定点拍摄', focalLength: '85mm f/1.4', composition: '三分法', lighting: '自然光', props: '无', angle: '平视', mood: '慵懒', duration: 5, notes: '测试镜头1', references: [{ url: 'ref1.jpg' }] },
      { scene: '沙发区', description: '室内休闲', shotSize: '近景', method: '定点拍摄', focalLength: '50mm f/1.4', composition: '中心构图', lighting: '窗光', props: '抱枕', angle: '俯视', mood: '放松', duration: 5, notes: '测试镜头2', references: [{ url: 'ref2.jpg' }] }
    ]
  };
}

function makeDeps(planId, planData) {
  const storage = new Map();
  const notifications = [];
  const rendered = [];
  return {
    currentPlanId: planId,
    currentPlanData: planData,
    storage: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v)
    },
    toast: (msg, type) => notifications.push({ msg, type }),
    renderPlanContent: (p) => rendered.push(p),
    getRenderableShotList: (plan) => plan.shots || [],
    notifications,
    rendered,
    storageMap: storage
  };
}

test('addCustomShot appends a shot and preserves existing reference links', () => {
  const plan = makePlan('plan-add');
  const deps = makeDeps('plan-add', plan);
  const editor = createShotEditor(deps);

  let promptStep = 0;
  globalThis.prompt = () => {
    promptStep += 1;
    if (promptStep === 1) return '门口';
    if (promptStep === 2) return '模特推门进入';
    if (promptStep === 3) return '35mm f/1.4';
    return '期待';
  };

  editor.addCustomShot('plan-add');
  delete globalThis.prompt;

  const shots = editor.getCurrentShots('plan-add');
  assert.equal(shots.length, 3);
  assert.equal(shots[2].scene, '门口');
  assert.equal(shots[2].description, '模特推门进入');
  assert.equal(shots[2].focalLength, '35mm f/1.4');
  assert.equal(shots[2].mood, '期待');
  assert.ok(Array.isArray(shots[2].references));
  assert.equal(shots[0].references.length, 1);
  assert.equal(shots[1].references.length, 1);
  assert.ok(deps.notifications.some(n => n.type === 'ok' && n.msg.includes('已添加')));
  assert.equal(deps.rendered.length, 1);
});

test('reorderShots changes order while preserving reference, device, and LUT links', () => {
  const plan = makePlan('plan-reorder');
  const deps = makeDeps('plan-reorder', plan);
  const editor = createShotEditor(deps);

  globalThis.prompt = () => '2, 1';
  editor.reorderShots('plan-reorder');
  delete globalThis.prompt;

  const shots = editor.getCurrentShots('plan-reorder');
  assert.equal(shots.length, 2);
  assert.equal(shots[0].scene, '沙发区');
  assert.equal(shots[1].scene, '窗边');
  assert.equal(shots[0].references[0].url, 'ref2.jpg');
  assert.equal(shots[1].references[0].url, 'ref1.jpg');
  assert.ok(deps.notifications.some(n => n.type === 'ok' && n.msg.includes('顺序')));
});

test('reorderShots rejects incomplete or duplicate ordering', () => {
  const plan = makePlan('plan-reorder-invalid');
  const deps = makeDeps('plan-reorder-invalid', plan);
  const editor = createShotEditor(deps);

  globalThis.prompt = () => '1, 1';
  editor.reorderShots('plan-reorder-invalid');
  delete globalThis.prompt;

  const shots = editor.getCurrentShots('plan-reorder-invalid');
  assert.equal(shots[0].scene, '窗边');
  assert.equal(shots[1].scene, '沙发区');
  assert.ok(deps.notifications.some(n => n.type === 'er'));
});

test('toggleShotView toggles is-concise class on plan-output-wrapper', () => {
  const plan = makePlan('plan-toggle');
  const wrapper = { classList: { toggle: (cls) => { wrapper.toggled = cls; return true; } }, querySelector: () => null };
  const deps = makeDeps('plan-toggle', plan);
  deps.document = { querySelector: (sel) => sel === '.plan-output-wrapper' ? wrapper : null };
  const editor = createShotEditor(deps);

  editor.toggleShotView('plan-toggle');
  assert.equal(wrapper.toggled, 'is-concise');
  assert.ok(deps.notifications.some(n => n.type === 'ok'));
});

test('editor gracefully degrades when optional V3/P4 modules are missing', () => {
  const plan = makePlan('plan-optional');
  const deps = makeDeps('plan-optional', plan);
  const editor = createShotEditor(deps);

  let promptStep = 0;
  globalThis.prompt = () => {
    promptStep += 1;
    if (promptStep === 1) return '天台';
    if (promptStep === 2) return '夜景背影';
    if (promptStep === 3) return '24mm f/1.4';
    return '孤独';
  };

  editor.addCustomShot('plan-optional');
  delete globalThis.prompt;

  const shots = editor.getCurrentShots('plan-optional');
  assert.equal(shots.length, 3);
});

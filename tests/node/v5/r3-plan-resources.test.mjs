import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..', '..', '..');

function loadLegacyPlanResources(overrides = {}) {
  const code = readFileSync(join(srcRoot, 'src', 'legacy-plan-resources.js'), 'utf8');
  const mockWindow = {
    getPersonalLibraryHealth: overrides.getPersonalLibraryHealth || null,
    ...overrides.window,
  };
  // eslint-disable-next-line no-new-func
  const run = new Function('window', code);
  run(mockWindow);
  return mockWindow;
}

function makePlan(overrides = {}) {
  return {
    id: 'plan-r3d-1',
    title: 'R3-D test plan',
    input: { theme: '城市夜景', style: '电影感', scene: '街道', mood: '安静' },
    result: { creativeDirection: { title: '霓虹人像', summary: '利用橱窗反射营造氛围。' } },
    relations: {
      references: [],
      slots: [],
    },
    ...overrides,
  };
}

test('renderPlanResources is exported on the mock window', () => {
  const win = loadLegacyPlanResources();
  assert.equal(typeof win.renderPlanResources, 'function');
});

test('invalid plan returns empty string', () => {
  const win = loadLegacyPlanResources();
  assert.equal(win.renderPlanResources(null), '');
  assert.equal(win.renderPlanResources({}), '');
  assert.equal(win.renderPlanResources({ id: '' }), '');
});

test('empty resources render collapsed detail with one reference-library route', () => {
  const win = loadLegacyPlanResources();
  const plan = makePlan({ result: {}, relations: {} });
  const html = win.renderPlanResources(plan);

  assert.match(html, /<details class="plan-resources">/);
  assert.match(html, /方案资源/);
  assert.match(html, /当前方案没有归档的创意方向、参考专辑或推荐内容。/);
  assert.match(html, /打开参考图库/);
  assert.doesNotMatch(html, /<h4>创意方向<\/h4>/);
  assert.doesNotMatch(html, /<h4>参考专辑<\/h4>/);
});

test('creative direction is archived inside 方案资源', () => {
  const win = loadLegacyPlanResources();
  const plan = makePlan();
  const html = win.renderPlanResources(plan);

  assert.match(html, /方案资源/);
  assert.match(html, /<h4>创意方向<\/h4>/);
  assert.match(html, /霓虹人像/);
  assert.match(html, /利用橱窗反射营造氛围。/);
});

test('reference album renders only real references, excluding seed albums and synthetic concepts', () => {
  const win = loadLegacyPlanResources();
  const plan = makePlan({
    relations: {
      references: [
        { id: 'seed-cover', title: '城市夜景 索引', sourceFile: 'cover.jpg', synthetic: false },
        { id: 'ai-concept', title: 'AI 概念图', sourceUrl: 'https://example.test/ai.jpg', synthetic: true },
        { id: 'real-1', title: '真实参考 1', sourceUrl: 'https://pexels.test/photo/1', previewUrl: 'assets/demo/references/pose-01.jpg', synthetic: false },
        { id: 'real-2', title: '真实参考 2', data: 'data:image/jpeg;base64,abc', synthetic: false },
      ],
    },
  });
  const html = win.renderPlanResources(plan);

  assert.match(html, /<h4>参考专辑<\/h4>/);
  assert.match(html, /真实参考 1/);
  assert.match(html, /真实参考 2/);
  assert.doesNotMatch(html, /城市夜景 索引/);
  assert.doesNotMatch(html, /AI 概念图/);
});

test('seed-only references do not render a fixed cover album', () => {
  const win = loadLegacyPlanResources();
  const plan = makePlan({
    relations: {
      references: [
        { id: 'seed-1', title: 'README' },
        { id: 'seed-2', title: '总览' },
      ],
    },
  });
  const html = win.renderPlanResources(plan);

  assert.doesNotMatch(html, /<h4>参考专辑<\/h4>/);
  assert.doesNotMatch(html, /README/);
  assert.doesNotMatch(html, /总览/);
});

test('shoot recommendations are archived from slot topItems matching shot context', () => {
  const win = loadLegacyPlanResources();
  const plan = makePlan({
    relations: {
      slots: [
        { id: 'slot-shot', topItems: [{ id: 'rec-1', title: '半身特写', reason: '突出情绪' }] },
        { id: 'slot-angle', topItems: [{ id: 'rec-2', title: '低角度仰拍', reason: '增强张力' }] },
        { id: 'slot-prop', topItems: [{ id: 'rec-3', title: '霓虹灯牌', reason: '环境元素' }] },
      ],
    },
  });
  const html = win.renderPlanResources(plan);

  assert.match(html, /<h4>拍摄推荐<\/h4>/);
  assert.match(html, /半身特写/);
  assert.match(html, /低角度仰拍/);
  assert.doesNotMatch(html, /霓虹灯牌/);
});

test('prop recommendations are archived from references matching prop/equipment roles', () => {
  const win = loadLegacyPlanResources();
  const plan = makePlan({
    relations: {
      references: [
        { id: 'prop-1', title: '反光板', role: 'prop', reason: '补光' },
        { id: 'prop-2', title: 'LED 棒灯', category: 'equipment', reason: '氛围光' },
        { id: 'real-1', title: '真实参考', sourceUrl: 'https://example.test/real', synthetic: false },
      ],
    },
  });
  const html = win.renderPlanResources(plan);
  const propsSection = html.match(/<section class="plan-resource-section plan-resource-section--props">[\s\S]*?<\/section>/)?.[0] || '';

  assert.match(propsSection, /道具推荐/);
  assert.match(propsSection, /反光板/);
  assert.match(propsSection, /LED 棒灯/);
  assert.doesNotMatch(propsSection, /真实参考/);
});

test('personal library status uses getPersonalLibraryHealth when available', () => {
  const win = loadLegacyPlanResources({
    getPersonalLibraryHealth: () => ({ status: 'connected', message: '3 albums' }),
  });
  const plan = makePlan({ result: {}, relations: {} });
  const html = win.renderPlanResources(plan);

  assert.match(html, /个人图库已连接/);
  assert.match(html, /3 albums/);
});

test('personal library status degrades quietly when health function is absent', () => {
  const win = loadLegacyPlanResources();
  const plan = makePlan({ result: {}, relations: {} });
  const html = win.renderPlanResources(plan);

  assert.doesNotMatch(html, /个人图库/);
});

test('app-enhancements no longer exposes main-workspace creative/album/shoot/props panels', () => {
  const code = readFileSync(join(srcRoot, 'src', 'app-enhancements.js'), 'utf8');

  assert.doesNotMatch(code, /关联依据/);
  assert.doesNotMatch(code, /镜头参考板/);
});

test('app-enhancements mounts 方案资源 detail via renderPlanResources', () => {
  const code = readFileSync(join(srcRoot, 'src', 'app-enhancements.js'), 'utf8');

  assert.match(code, /renderPlanResources\s*\?\s*root\.renderPlanResources\(plan\)/);
});

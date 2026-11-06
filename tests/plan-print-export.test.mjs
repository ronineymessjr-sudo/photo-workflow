import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../assets/plan-print-export.js', import.meta.url), 'utf8');

function loadExporter(open = () => null) {
    const window = { open };
    vm.runInNewContext(source, { window, Date });
    return window.PhotoAtelierPrintExport;
}

const plan = {
    title: '双人城市纪实',
    input: { theme: '城市雨夜', style: '纪实', scene: '街道', duration: '2小时', people: 2 },
    shotList: [{
        title: '并肩走入画面', description: '两位成年人自然并肩行走。',
        shotSize: '全身', focalLength: '35mm', method: '侧前方跟拍',
        composition: '人物错开半步', lighting: '现场光',
        directorContract: { must_show: ['两人完整轮廓'], reject_if: ['裁掉脚部'] }
    }]
};

test('print document includes Chinese overview and complete shot instructions safely escaped', () => {
    const html = loadExporter().buildHtml([{ ...plan, title: '<script>alert(1)</script>' }]);
    assert.match(html, /另存为 PDF/);
    assert.match(html, /分镜总表/);
    assert.match(html, /并肩走入画面/);
    assert.match(html, /两位成年人自然并肩行走/);
    assert.match(html, /两人完整轮廓/);
    assert.doesNotMatch(html, /<h1><script>/);
    assert.match(html, /&lt;script&gt;/);
});

test('print includes new wardrobe and props fields without adding empty rows to older plans', () => {
    const updated = { ...plan, shotList: [{ ...plan.shotList[0], wardrobe: '蓝色外套', props: '已有雨伞',
        directorContract: { ...plan.shotList[0].directorContract, wardrobe_styling: '蓝色外套', shot_props: '已有雨伞' } }] };
    const html = loadExporter().buildHtml([updated]);
    assert.match(html, /服装与妆发<\/th><td>蓝色外套/);
    assert.match(html, /本镜头道具<\/th><td>已有雨伞/);
    const older = loadExporter().buildHtml([plan]);
    assert.doesNotMatch(older, /服装与妆发|本镜头道具/);
});

test('model print view limits content to the model action instead of camera instructions', () => {
    const html = loadExporter().buildHtml([plan], 'model');
    assert.match(html, /动作提示/);
    assert.match(html, /两位成年人自然并肩行走/);
    assert.doesNotMatch(html, /35mm|侧前方跟拍|景别与焦段/);
});

test('execution print preserves external reference IDs, available angles, style guidance and sync state', () => {
    const html = loadExporter().buildHtml([{ ...plan, aiStudio: {
        references: [{ sourceItemId: 'atlas-pose-test', upstreamId: 'test', poseNumber: 'P001', title: '<坐姿>', angles: ['front', 'side'], attribution: 'RuiC-PoseAtlas', externalUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/#pose=test' }],
        guidance: { style: '低饱和电影感', suggestions: [{ direction: '双脚有支撑后放松肩颈。' }] }, sync: { status: 'pending' },
    } }]);
    assert.match(html, /P001/);
    assert.match(html, /front；side/);
    assert.match(html, /低饱和电影感/);
    assert.match(html, /双脚有支撑/);
    assert.match(html, /&lt;坐姿&gt;/);
    assert.match(html, /飞书待同步/);
});

test('print view reports popup blocking and writes a complete document when available', () => {
    assert.equal(loadExporter().open([plan]), false);
    let written = '';
    const popup = {
        document: { open() {}, write(value) { written = value; }, close() {} },
        focus() {}
    };
    assert.equal(loadExporter(() => popup).open([plan]), true);
    assert.match(written, /双人城市纪实/);
});

test('page routes its PDF buttons through the browser-native print renderer', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /assets\/plan-print-export\.js/);
    assert.match(html, /openPlanPrintView\(\[plan\], 'plan'\)/);
    assert.match(html, /openPlanPrintView\(\[plan\], 'model'\)/);
    assert.doesNotMatch(html, /doc\.save\(/);
    assert.doesNotMatch(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf/);
    assert.match(html, /saveDirectorShotField\(this\)/);
});

test('editing shot resources updates the plan and existing local shot copy', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const start = html.indexOf('function directorShotResource(');
    const end = html.indexOf('\nfunction getDirectorShotFitWarning(', start);
    assert.ok(start >= 0 && end > start);
    const stored = new Map();
    const plans = [{ id: 'plan-1', shotList: [{ props: '以实际场地和已有资源为准', directorContract: {} }] }];
    stored.set('pa_shots_plan-1', JSON.stringify([{ ...plans[0].shotList[0] }]));
    const context = {
        getPlans: () => plans,
        savePlans(value) { assert.equal(value, plans); return true; },
        localStorage: { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) },
        currentPlanData: plans[0],
    };
    vm.runInNewContext(html.slice(start, end), context);
    assert.equal(context.directorShotResource(plans[0].shotList[0], 'shot_props'), '');
    context.saveDirectorShotField({ dataset: { planId: 'plan-1', shotIndex: '0', field: 'wardrobe_styling' }, value: ' 深色外套 ' });
    context.saveDirectorShotField({ dataset: { planId: 'plan-1', shotIndex: '0', field: 'shot_props' }, value: '已有雨伞' });
    assert.equal(plans[0].shotList[0].directorContract.wardrobe_styling, '深色外套');
    assert.equal(plans[0].shotList[0].props, '已有雨伞');
    assert.equal(JSON.parse(stored.get('pa_shots_plan-1'))[0].directorContract.shot_props, '已有雨伞');
    context.savePlans = () => false;
    context.toast = message => assert.match(message, /修改未保存/);
    const failedEdit = { dataset: { planId: 'plan-1', shotIndex: '0', field: 'shot_props' }, value: '未保存的新道具' };
    context.saveDirectorShotField(failedEdit);
    assert.equal(failedEdit.value, '已有雨伞');
    assert.equal(plans[0].shotList[0].props, '已有雨伞');
    assert.equal(JSON.parse(stored.get('pa_shots_plan-1'))[0].directorContract.shot_props, '已有雨伞');
});

test('shot-size summary counts existing framing without inventing categories', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const start = html.indexOf('function renderShotSizeSummary(');
    const end = html.indexOf('\nfunction saveDirectorShotField(', start);
    assert.ok(start >= 0 && end > start);
    const context = {};
    vm.runInNewContext(html.slice(start, end), context);
    const summary = context.renderShotSizeSummary([
        { shotSize: '环境远景' }, { shotSize: '全身' }, { shotSize: '中全景' },
        { shotSize: '近景' }, { shotSize: '特写' }, { shotSize: '待确认' },
    ]);
    assert.equal(summary, '远景 1 · 全身 1 · 中景 1 · 近景/特写 2 · 待确认 1');
});

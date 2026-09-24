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

test('model print view limits content to the model action instead of camera instructions', () => {
    const html = loadExporter().buildHtml([plan], 'model');
    assert.match(html, /动作提示/);
    assert.match(html, /两位成年人自然并肩行走/);
    assert.doesNotMatch(html, /35mm|侧前方跟拍|景别与焦段/);
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
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('function generateQuoteSheet(planId) {');
const end = html.indexOf('\n// 生成服务确认单', start);
assert.ok(start >= 0 && end > start, 'quote sheet handler must be present');
const source = html.slice(start, end);

function loadQuoteSheet({ popup = {}, plan = { id: 'plan-1', title: '城市人像', input: { style: '纪实', duration: '2小时' } } } = {}) {
    const messages = [];
    let written = '';
    let printed = 0;
    const fields = new Map([
        ['quote-base-plan-1', '800'], ['quote-per-shot-plan-1', '50'],
        ['quote-per-edit-plan-1', '30'], ['quote-location-plan-1', '100'],
        ['quote-edit-count-plan-1', '2'], ['quote-location-count-plan-1', '1'],
        ['quote-extra-plan-1', '0'],
    ]);
    const printWindow = popup === null ? null : {
        document: { write(value) { written = value; }, close() {} },
        focus() {}, print() { printed++; },
    };
    const context = {
        SK: { P: 'pw_plans' }, sg: () => [plan],
        generateShotList: () => [{ title: '镜头一' }, { title: '镜头二' }],
        document: { getElementById: id => fields.has(id) ? { value: fields.get(id) } : null },
        window: { open: () => printWindow },
        escHtml: value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
        toast: (...args) => messages.push(args), Date,
        setTimeout(callback) { callback(); },
    };
    vm.runInNewContext(source, context);
    context.generateQuoteSheet(plan.id);
    return { messages, written, printed };
}

test('quote sheet has standalone print colors, escapes user content and triggers printing', () => {
    const result = loadQuoteSheet({ plan: {
        id: 'plan-1', title: '<script>alert(1)</script>', input: { style: '<b>纪实</b>', duration: '2小时' },
    } });
    assert.match(result.written, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(result.written, /<title>[^<]*<script>/);
    assert.match(result.written, /color: #26332f/);
    assert.doesNotMatch(result.written, /var\(--(?:t-dim|t-muted|ok)\)/);
    assert.equal(result.printed, 1);
    assert.deepEqual(result.messages[0], ['报价单已生成', 'ok']);
});

test('quote sheet reports a blocked popup instead of throwing or claiming success', () => {
    const result = loadQuoteSheet({ popup: null });
    assert.equal(result.written, '');
    assert.equal(result.printed, 0);
    assert.deepEqual(result.messages[0], ['报价单窗口被浏览器拦截，请允许此站点打开弹窗后重试', 'er']);
});

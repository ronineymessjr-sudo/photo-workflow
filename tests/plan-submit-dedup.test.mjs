import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('concurrent submits make only one model call and failures allow a retry', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const start = html.indexOf('async function handleSubmit(e)');
    const end = html.indexOf("$('briefForm').addEventListener('submit',handleSubmit);", start);
    assert.ok(start >= 0 && end > start);
    const nodes = new Map();
    const get = id => {
        if (!nodes.has(id)) {
            const classes = new Set();
            nodes.set(id, { disabled: false, value: '', innerHTML: '', classList: { add(value) { classes.add(value); }, remove(value) { classes.delete(value); }, contains(value) { return classes.has(value); } }, style: {} });
        }
        return nodes.get(id);
    };
    let calls = 0, rejectCall;
    const context = {
        $: get, window: { generateDirectorPlan() { calls++; return new Promise((_, reject) => { rejectCall = reject; }); } },
        setTimeout(callback) { callback(); }, console: { error() {} }, toast() {},
    };
    vm.runInNewContext(html.slice(start, end), context);
    get('outCnt').classList.add('active');
    const first = context.handleSubmit({ preventDefault() {} });
    await Promise.resolve();
    await context.handleSubmit({ preventDefault() {} });
    assert.equal(calls, 1);
    rejectCall(new Error('test failure'));
    await first;
    assert.equal(get('genBtn').disabled, false);
    assert.equal(get('outCnt').classList.contains('active'), true);
    assert.equal(get('outEmpty').classList.contains('active'), false);
    const retry = context.handleSubmit({ preventDefault() {} });
    await Promise.resolve();
    assert.equal(calls, 2);
    rejectCall(new Error('test failure'));
    await retry;
    assert.equal(get('genBtn').disabled, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('offline business API reads the existing browser records without a global parsing helper', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const start = html.indexOf('    const API_BASE =', html.indexOf('// ===== Auth System & App Entry'));
    const end = html.indexOf('    window.continueAsGuest', start);
    const saved = new Map([
        ['pw_plans', JSON.stringify([{ id: 'original-plan' }])],
        ['pw_schedule', JSON.stringify([{ id: 'original-schedule' }])],
        ['pw_messages', JSON.stringify([{ id: 'original-message' }])],
    ]);
    const context = {
        window: {}, URLSearchParams,
        location: { hostname: '127.0.0.1', search: '?offline=1' },
        localStorage: { getItem: key => saved.get(key) || null },
    };
    vm.runInNewContext(html.slice(start, end), context);
    assert.equal((await context.window.api.getPlans())[0].id, 'original-plan');
    assert.equal((await context.window.api.getSchedules()).schedules[0].id, 'original-schedule');
    assert.equal((await context.window.api.getMessages())[0].id, 'original-message');
});

test('dashboard uses actual plan and schedule results and reports failures', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const start = html.indexOf('async function renderRealDashboard()');
    const end = html.indexOf('\nfunction renderMessages()', start);
    assert.ok(start >= 0 && end > start);
    const target = { children: [], textContent: '', replaceChildren() { this.children = []; }, append(node) { this.children.push(node); } };
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const context = { Date, document: { getElementById: () => target, createElement: () => ({ textContent: '' }) }, api: {
        getPlans: async () => [{}, {}], getSchedules: async () => ({ schedules: [{ date: month + '-02', status: 'completed' }, { date: '2000-01-01' }] }),
    } };
    vm.runInNewContext(html.slice(start, end), context);
    await context.renderRealDashboard();
    assert.equal(target.children[0].textContent, '已保存方案 2 · 本月日程 1 · 已完成日程 1');
    assert.equal(target.children[1].textContent, '共 2 条日程');
    context.api.getSchedules = async () => { throw Error('offline'); };
    await context.renderRealDashboard();
    assert.match(target.textContent, /数据读取失败/);
});

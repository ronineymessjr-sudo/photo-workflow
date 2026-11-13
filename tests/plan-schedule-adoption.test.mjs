import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const saveStart = html.indexOf('function saveScheduleWithUndo(schedule) {');
const saveEnd = html.indexOf('\nfunction deleteScheduleWithUndo', saveStart);
const adoptStart = html.indexOf('function adoptSavedPlan(planId, dateInputId) {');
const adoptEnd = html.indexOf('\nfunction formatScheduleAudience', adoptStart);
assert.ok(saveStart >= 0 && saveEnd > saveStart && adoptStart >= 0 && adoptEnd > adoptStart);
const source = html.slice(saveStart, saveEnd) + '\n' + html.slice(adoptStart, adoptEnd);

function loadAdoption({ failScheduleWrite = false, initialSchedules = [] } = {}) {
    const plan = { id: 'plan-1', title: '室内自然人像', input: { scene: '简洁室内' }, shotList: Array.from({ length: 8 }, (_, i) => ({ id: `shot-${i}` })) };
    const schedules = [...initialSchedules];
    const events = [];
    let persistedSchedules = [...initialSchedules];
    const context = {
        SK: { P: 'pw_plans' }, SK_SCHED: 'pw_schedule',
        window: { __PHOTOATELIER_LOCAL_MODE__: true }, localStorage: { getItem: () => null },
        crypto: { randomUUID: () => 'schedule-1' },
        sg: key => key === 'pw_schedule' ? schedules : [plan],
        getPlans: () => [plan],
        savePlans: plans => { events.push(['savePlans', plans]); return true; },
        ss: (key, value) => {
            if (key === 'pw_schedule' && failScheduleWrite) return false;
            if (key === 'pw_schedule') persistedSchedules = value;
            return true;
        },
        UndoManager: { save: value => events.push(['undo', value]) },
        api: { createSchedule: async () => ({ schedule: {} }) },
        $(id) { return id === 'shoot-date' ? { value: '2026-12-01', reportValidity: () => true } : null; },
        toast: (...args) => events.push(['toast', ...args]),
        renderCalendar: () => events.push(['calendar']), renderSchedules: () => events.push(['schedules']),
        renderSavedPlanLibrary: () => events.push(['library']), renderRoleHome: () => events.push(['role-home']), getCurrentRole: () => 'photographer',
        _calendarCursor: null, Date, String, Set,
    };
    vm.runInNewContext(source, context);
    context.adoptSavedPlan('plan-1', 'shoot-date');
    return { plan, schedules, persistedSchedules, events };
}

test('adopting a plan persists the schedule link and caps the shared summary at six shots', () => {
    const result = loadAdoption();
    assert.equal(result.persistedSchedules.length, 1);
    assert.equal(result.persistedSchedules[0].planId, 'plan-1');
    assert.equal(result.persistedSchedules[0].date, '2026-12-01');
    assert.equal(result.persistedSchedules[0].audience.length, 3);
    assert.equal(result.persistedSchedules[0].planSummary.shots.length, 6);
    assert.equal(result.plan.status, 'scheduled');
    assert.equal(result.plan.scheduleId, 'schedule-1');
    assert.equal(result.plan.scheduledDate, '2026-12-01');
    assert.ok(result.events.some(event => event[0] === 'toast' && event[1] === '已加入方案日程'));
});

test('failed local schedule write does not mark the plan scheduled or show success', () => {
    const result = loadAdoption({ failScheduleWrite: true });
    assert.equal(result.plan.status, undefined);
    assert.equal(result.plan.scheduleId, undefined);
    assert.equal(result.events.some(event => event[0] === 'calendar'), false);
    assert.equal(result.events.some(event => event[0] === 'toast' && event[1] === '已加入方案日程'), false);
    assert.ok(result.events.some(event => event[0] === 'toast' && /日程.*未保存/.test(event[1])));
});

function loadScheduleForm({ editId = null, schedules = [] } = {}) {
    const events = [];
    const plan = { id: 'plan-1', title: '室内自然人像', input: { scene: '简洁室内' } };
    const values = { schedDate: '2026-12-01', schedTitle: '室内自然人像', schedTime: '', schedLocation: '简洁室内', schedPlanId: 'plan-1' };
    const start = html.indexOf('function submitSchedule() {');
    const end = html.indexOf('\nfunction closeScheduleModal()', start);
    assert.ok(start >= 0 && end > start);
    const context = {
        document: { getElementById: id => ({ value: values[id] }) },
        getPlans: () => [plan], sg: key => key === 'pw_schedule' ? schedules : [plan],
        SK: { P: 'pw_plans' }, SK_SCHED: 'pw_schedule',
        ss: () => false, saveScheduleWithUndo: () => false,
        buildSchedulePlanSummary: () => ({ theme: plan.title }),
        markPlanScheduled: () => events.push(['markPlanScheduled']),
        UndoManager: { save: () => events.push(['undo']) },
        toast: (...args) => events.push(['toast', ...args]),
        window: { _editingScheduleId: editId }, Date, String, crypto: { randomUUID: () => 'schedule-new' },
        renderCalendar: () => events.push(['calendar']), renderSchedules: () => events.push(['schedules']),
        renderSavedPlanLibrary: () => events.push(['library']), renderRoleHome: () => events.push(['role-home']),
        getCurrentRole: () => 'photographer',
    };
    vm.runInNewContext(html.slice(start, end), context);
    context.submitSchedule();
    return events;
}

test('failed manual schedule write does not mark a linked plan or show success', () => {
    const events = loadScheduleForm();
    assert.equal(events.some(event => event[0] === 'markPlanScheduled'), false);
    assert.equal(events.some(event => event[0] === 'calendar'), false);
    assert.equal(events.some(event => event[0] === 'toast' && event[1] === '日程已添加'), false);
    assert.ok(events.some(event => event[0] === 'toast' && /日程.*未保存/.test(event[1])));
});

test('failed schedule edit does not update linked plan or show success', () => {
    const events = loadScheduleForm({ editId: 'schedule-existing', schedules: [{ id: 'schedule-existing', title: '旧标题' }] });
    assert.equal(events.some(event => event[0] === 'markPlanScheduled'), false);
    assert.equal(events.some(event => event[0] === 'calendar'), false);
    assert.equal(events.some(event => event[0] === 'toast' && event[1] === '日程已更新'), false);
    assert.ok(events.some(event => event[0] === 'toast' && /日程.*未保存/.test(event[1])));
});

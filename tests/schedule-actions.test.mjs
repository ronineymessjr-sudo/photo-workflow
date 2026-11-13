import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('function deleteScheduleWithUndo(id)');
const end = html.indexOf('function savePlanWithUndo(plan)', start);
assert.ok(start >= 0 && end > start, 'schedule delete handlers must be present');
const source = html.slice(start, end);

function loadDeleteSchedule({ schedules, browserStorage = true, token = '', deleteRemote = async () => {} }) {
    const store = new Map([['pw_schedule', schedules], ['pw_plans', []]]);
    const renders = [];
    const context = {
        window: { __PHOTOATELIER_LOCAL_MODE__: browserStorage, __PHOTOATELIER_GUEST_MODE__: false },
        confirm: () => true,
        localStorage: { getItem: key => key === 'pw_token' ? token : null },
        USE_BROWSER_STORAGE: browserStorage,
        USE_GUEST_MODE: false,
        SK_SCHED: 'pw_schedule',
        SK: { P: 'pw_plans' },
        sg: key => store.get(key),
        ss: (key, value) => { store.set(key, value); return true; },
        UndoManager: { save() {} },
        api: { deleteSchedule: deleteRemote },
        toast() {},
        renderCalendar: () => renders.push('calendar'),
        renderSchedules: () => renders.push('schedules'),
        renderSavedPlanLibrary: () => renders.push('library'),
        renderRoleHome: () => renders.push('role-home'),
        getCurrentRole: () => 'photographer',
        String,
    };
    context.window.api = context.api;
    vm.runInNewContext(source, context);
    return { context, store, renders };
}

test('schedule delete button performs a recoverable local delete and refreshes linked views', async () => {
    assert.match(html, /onclick="deleteSchedule\('\$\{s\.id\}'\)"/);
    const { context, store, renders } = loadDeleteSchedule({ schedules: [{ id: 'test-1', title: 'synthetic' }] });
    await context.window.deleteSchedule('test-1');
    assert.deepEqual(store.get('pw_schedule'), []);
    assert.deepEqual(renders, ['calendar', 'schedules', 'library', 'role-home']);
});

test('cloud schedule deletion is confirmed by API before removing local data', async () => {
    let remoteCalls = 0;
    const { context, store } = loadDeleteSchedule({
        schedules: [{ id: 'test-2', title: 'synthetic' }], browserStorage: false, token: 'session',
        deleteRemote: async id => { assert.equal(id, 'test-2'); remoteCalls++; },
    });
    await context.window.deleteSchedule('test-2');
    assert.equal(remoteCalls, 1);
    assert.deepEqual(store.get('pw_schedule'), []);
});

test('failed cloud delete leaves the local schedule intact', async () => {
    const { context, store, renders } = loadDeleteSchedule({
        schedules: [{ id: 'test-3', title: 'synthetic' }], browserStorage: false, token: 'session',
        deleteRemote: async () => { throw new Error('network unavailable'); },
    });
    await context.window.deleteSchedule('test-3');
    assert.deepEqual(store.get('pw_schedule'), [{ id: 'test-3', title: 'synthetic' }]);
    assert.deepEqual(renders, []);
});

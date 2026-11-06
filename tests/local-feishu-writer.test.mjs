import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalFeishuWriter } from '../tools/local-feishu-writer.mjs';
import { createLocalFeishuConfig } from '../tools/local-feishu-config.mjs';

const configuration = 'FEISHU_APP_TOKEN = "baseMock"\nFEISHU_TABLE_PLANS = "tblPlans"\nFEISHU_TABLE_REFERENCES = "tblReferences"\n';
const plan = () => ({
    id: 'local-plan-1', revision: 1, title: '自然人像', input: { style: '电影感' },
    shotList: [{ id: 'shot-1', description: '自然行走', focalLength: '35mm' }],
    aiStudio: { references: [{ sourceItemId: 'pose-1', title: '站姿', kind: 'pose', source: 'original', rightsStatus: 'owned' }], sync: { status: 'pending', updatedAt: '2026-11-05T00:00:00.000Z' } },
});

function cli({ failPlanOnce = false, duplicate = false } = {}) {
    const calls = [];
    const rows = new Map();
    let failPlan = failPlanOnce;
    const api = async ({ method, apiPath, body }) => {
        calls.push({ method, apiPath, body });
        if (method === 'GET' && apiPath.endsWith('/tables?page_size=100')) return { items: [{ table_id: 'tblPlans' }, { table_id: 'tblReferences' }] };
        const [, table, suffix] = apiPath.match(/\/tables\/(tblPlans|tblReferences)\/records(.*)$/) || [];
        assert.ok(table);
        if (suffix.startsWith('/search')) {
            const id = body.filter.conditions[0].value[0];
            const found = [...rows.values()].filter(row => row.table === table && row.fields.id === id).map(({ table, ...row }) => row);
            if (duplicate && found.length) found.push(found[0]);
            return { items: found, has_more: false };
        }
        if (table === 'tblPlans' && failPlan) { failPlan = false; throw new Error('simulated CLI failure'); }
        if (method === 'POST') {
            const id = `rec${rows.size + 1}`;
            rows.set(id, { record_id: id, table, fields: body.fields });
            return { record: { record_id: id, fields: body.fields } };
        }
        assert.equal(method, 'PUT');
        const id = suffix.slice(1);
        assert.ok(rows.has(id));
        rows.set(id, { record_id: id, table, fields: body.fields });
        return { record: { record_id: id, fields: body.fields } };
    };
    return { api, calls, rows };
}

test('local status verifies tables and filtered record-search reads and returns status only', async () => {
    const mock = cli();
    const writer = createLocalFeishuWriter({ readFileImpl: async () => configuration, api: mock.api });
    assert.equal((await writer.configurationStatus()).configured, true);
    const status = await writer.status();
    assert.deepEqual(status, { credential_configured: true, connected: true, transport: 'local-lark-cli' });
    assert.equal(mock.calls.length, 3);
    assert.equal(mock.calls[0].method, 'GET');
    for (const request of mock.calls.slice(1)) {
        assert.equal(request.method, 'POST');
        assert.match(request.apiPath, /\/records\/search\?page_size=500$/);
        assert.deepEqual(request.body.field_names, ['id', 'createdAt', 'updatedAt', 'payloadJson']);
        assert.deepEqual(request.body.filter, { conjunction: 'and', conditions: [{ field_name: 'id', operator: 'is', value: ['ai-studio-status-readonly-probe-v1'] }] });
    }
    assert.ok(!JSON.stringify(status).includes('baseMock'));
});

test('table-list access alone cannot mark the local connection usable when record-search fails', async () => {
    const writer = createLocalFeishuWriter({ readFileImpl: async () => configuration, api: async ({ method }) => {
        if (method === 'GET') return { items: [{ table_id: 'tblPlans' }, { table_id: 'tblReferences' }] };
        throw new Error('record search permission denied');
    } });
    assert.equal((await writer.status()).connected, false);
});

test('local writer uses the existing payloadJson fields and safely retries business IDs', async () => {
    const mock = cli();
    const writer = createLocalFeishuWriter({ readFileImpl: async () => configuration, api: mock.api });
    assert.equal((await writer.sync({ uid: 'user-1', plan: plan() })).status, 'synced');
    const retry = await writer.sync({ uid: 'user-1', plan: plan() });
    assert.equal(retry.status, 'synced');
    assert.equal(retry.skipped, 2);
    assert.equal(mock.rows.size, 2);
    const stored = [...mock.rows.values()].find(row => row.table === 'tblPlans');
    const payload = JSON.parse(stored.fields.payloadJson);
    assert.equal(payload.ownerId, 'user-1');
    assert.equal(payload.shotList[0].focalLength, '35mm');
    assert.ok(stored.fields.concept);
    assert.equal(stored.fields.title, undefined);
});

test('local partial failure remains pending and retries already created references without duplicates', async () => {
    const mock = cli({ failPlanOnce: true });
    const writer = createLocalFeishuWriter({ readFileImpl: async () => configuration, api: mock.api });
    assert.equal((await writer.sync({ uid: 'user-1', plan: plan() })).status, 'pending');
    assert.equal(mock.rows.size, 1);
    const retry = await writer.sync({ uid: 'user-1', plan: plan() });
    assert.equal(retry.status, 'synced');
    assert.equal(retry.skipped, 1);
    assert.equal(mock.rows.size, 2);
});

test('concurrent local sync requests serialize and cannot create duplicate business rows', async () => {
    const mock = cli();
    const writer = createLocalFeishuWriter({ readFileImpl: async () => configuration, api: mock.api });
    const results = await Promise.all([writer.sync({ uid: 'user-1', plan: plan() }), writer.sync({ uid: 'user-1', plan: plan() })]);
    assert.ok(results.every(result => result.status === 'synced'));
    assert.equal(mock.rows.size, 2);
});

test('duplicate remote business IDs and missing configuration fail closed', async () => {
    const mock = cli({ duplicate: true });
    const writer = createLocalFeishuWriter({ readFileImpl: async () => configuration, api: mock.api });
    assert.equal((await writer.sync({ uid: 'user-1', plan: plan() })).status, 'pending');
    const absent = createLocalFeishuWriter({ readFileImpl: async () => '', api: async () => { throw new Error('must not call CLI'); } });
    assert.equal((await absent.configurationStatus()).configured, false);
    assert.equal((await absent.status()).connected, false);
    assert.equal((await absent.sync({ uid: 'user-1', plan: plan() })).status, 'pending');
});

test('the loader explicitly enables a configured local writer without loading its old sync-token', async () => {
    let synced;
    const localWriter = {
        configurationStatus: async () => ({ configured: true }),
        status: async () => ({ connected: true, transport: 'local-lark-cli' }),
        sync: async command => { synced = command; return { status: 'synced' }; },
    };
    const loader = createLocalFeishuConfig({ readFileImpl: async () => { throw new Error('must not load secret'); }, localWriter });
    assert.equal((await loader.check()).connected, true);
    assert.equal((await loader.sync({ uid: 'user-1', plan: plan() })).status, 'synced');
    assert.equal(synced.uid, 'user-1');
});

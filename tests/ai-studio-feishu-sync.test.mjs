import test from 'node:test';
import assert from 'node:assert/strict';
import { FEISHU_SYNC_SERVICE, MAX_FEISHU_RECORD_BYTES, studioFeishuStatus, checkStudioFeishuConnection, buildStudioFeishuRecords, syncStudioPlan } from '../api/ai-studio/feishu-sync.mjs';
import { createLocalFeishuConfig } from '../tools/local-feishu-config.mjs';

const token = 'test-only-sync-token-12345678901234567890';
const env = { APP_SYNC_TOKEN: token };
const plan = () => ({
    id: 'plan-42', revision: 3, title: '秋日人像', createdAt: '2026-11-05T01:00:00.000Z',
    input: { theme: '秋日人像', style: '电影感' }, shotList: [{ id: 'shot-1', action: '自然坐姿' }],
    aiStudio: {
        revision: 3,
        references: [
            { id: 'ref-1', sourceItemId: 'pa-pose-seat', title: '自然坐姿', kind: 'pose', source: 'original', tags: ['自然'], rightsStatus: 'owned' },
            { id: 'ref-2', sourceItemId: 'pa-costume-knit', title: '针织搭配', kind: 'costume', source: 'original', tags: ['棕色'], rightsStatus: 'owned' },
        ],
        sync: { status: 'pending', updatedAt: '2026-11-05T02:00:00.000Z' },
    },
});

function service({ failPlanOnce = false, corruptReadback = false } = {}) {
    const tables = { references: new Map(), plans: new Map() };
    const calls = [];
    let failing = failPlanOnce;
    const fetchImpl = async (url, options) => {
        assert.equal(new URL(url).origin, FEISHU_SYNC_SERVICE);
        assert.equal(options.headers['X-PhotoAtelier-Token'], token);
        calls.push({ url, options });
        const [, entity, operation] = new URL(url).pathname.match(/^\/api\/feishu\/(references|plans)\/(sync|records)$/) || [];
        assert.ok(entity);
        if (entity === 'plans' && operation === 'sync' && failing) {
            failing = false;
            return Response.json({ error: 'upstream rejected' }, { status: 503 });
        }
        if (operation === 'records') {
            const records = [...tables[entity].values()].map(record => structuredClone(record));
            if (corruptReadback && records[0]) records[0].title = 'changed while retaining the old fingerprint';
            return Response.json({ ok: true, records });
        }
        const summary = { ok: true, entity, created: 0, updated: 0, skipped: 0, conflicts: [], errors: [] };
        for (const record of JSON.parse(options.body).records) {
            const current = tables[entity].get(record.id);
            if (current && Date.parse(current.updatedAt) > Date.parse(record.updatedAt)) summary.conflicts.push({ id: record.id });
            else if (current && current.updatedAt === record.updatedAt) summary.skipped++;
            else {
                tables[entity].set(record.id, record);
                summary[current ? 'updated' : 'created']++;
            }
        }
        return Response.json(summary);
    };
    return { tables, calls, fetchImpl };
}

test('projection retains plan and reference provenance with stable account-scoped IDs', async () => {
    const first = await buildStudioFeishuRecords({ uid: 'user-a', plan: plan() });
    const retry = await buildStudioFeishuRecords({ uid: 'user-a', plan: plan() });
    const another = await buildStudioFeishuRecords({ uid: 'user-b', plan: plan() });
    assert.deepEqual(first, retry);
    assert.notEqual(first.plans[0].id, another.plans[0].id);
    assert.equal(first.plans[0].originalPlanId, 'plan-42');
    assert.equal(first.plans[0].ownerId, 'user-a');
    assert.equal(first.references[0].sourceItemId, 'pa-pose-seat');
    assert.equal(first.references[0].rightsStatus, 'owned');
    assert.equal(first.plans[0].aiStudio.sync, undefined);
    assert.equal(first.references[0].updatedAt, plan().aiStudio.sync.updatedAt);
});

test('successful write is verified by readback and a retry creates no duplicate rows', async () => {
    const mock = service();
    const first = await syncStudioPlan({ uid: 'user-a', plan: plan(), env, fetchImpl: mock.fetchImpl });
    assert.equal(first.status, 'synced');
    assert.equal(first.created, 3);
    assert.equal(first.revision, 3);
    const second = await syncStudioPlan({ uid: 'user-a', plan: plan(), env, fetchImpl: mock.fetchImpl });
    assert.equal(second.status, 'synced');
    assert.equal(second.skipped, 3);
    assert.equal(mock.tables.plans.size, 1);
    assert.equal(mock.tables.references.size, 2);
});

test('partial failure keeps the snapshot pending and retries previously written references safely', async () => {
    const mock = service({ failPlanOnce: true });
    const first = await syncStudioPlan({ uid: 'user-a', plan: plan(), env, fetchImpl: mock.fetchImpl });
    assert.equal(first.status, 'pending');
    assert.equal(mock.tables.references.size, 2);
    assert.equal(mock.tables.plans.size, 0);
    const second = await syncStudioPlan({ uid: 'user-a', plan: plan(), env, fetchImpl: mock.fetchImpl });
    assert.equal(second.status, 'synced');
    assert.equal(second.skipped, 2);
    assert.equal(second.created, 1);
});

test('a newer remote snapshot stays pending and is preserved', async () => {
    const mock = service();
    const records = await buildStudioFeishuRecords({ uid: 'user-a', plan: plan() });
    const reference = { ...records.references[0], updatedAt: '2026-11-06T00:00:00.000Z' };
    mock.tables.references.set(reference.id, reference);
    const result = await syncStudioPlan({ uid: 'user-a', plan: plan(), env, fetchImpl: mock.fetchImpl });
    assert.equal(result.status, 'pending');
    assert.equal(result.code, 'FEISHU_SYNC_CONFLICT');
    assert.equal(mock.tables.references.get(reference.id).updatedAt, reference.updatedAt);
});

test('equal-timestamp content changes and corrupted readback cannot be reported as synced', async () => {
    const mock = service();
    await syncStudioPlan({ uid: 'user-a', plan: plan(), env, fetchImpl: mock.fetchImpl });
    const changed = plan(); changed.title = '不同方案';
    const result = await syncStudioPlan({ uid: 'user-a', plan: changed, env, fetchImpl: mock.fetchImpl });
    assert.equal(result.status, 'pending');
    assert.equal(result.code, 'FEISHU_SYNC_READBACK_MISMATCH');
    const corrupted = service({ corruptReadback: true });
    assert.equal((await syncStudioPlan({ uid: 'user-a', plan: plan(), env, fetchImpl: corrupted.fetchImpl })).status, 'pending');
});

test('status checks expose only configuration and discard remote rows', async () => {
    const mock = service();
    assert.deepEqual(studioFeishuStatus(), { credential_configured: false, service: FEISHU_SYNC_SERVICE });
    const status = await checkStudioFeishuConnection({ env, fetchImpl: mock.fetchImpl });
    assert.equal(status.connected, true);
    assert.equal(status.records, undefined);
    assert.ok(!JSON.stringify(status).includes(token));
    assert.equal(mock.calls.length, 2);
});

test('missing credentials and invalid snapshots remain pending without an external request', async () => {
    const fetchImpl = async () => { throw new Error('unexpected external request'); };
    assert.equal((await syncStudioPlan({ uid: 'user-a', plan: plan(), fetchImpl })).code, 'FEISHU_SYNC_NOT_CONFIGURED');
    assert.equal((await syncStudioPlan({ uid: '', plan: plan(), env, fetchImpl })).code, 'INVALID_PLAN_SYNC_INPUT');
    const invalid = plan(); delete invalid.aiStudio.sync.updatedAt;
    assert.equal((await syncStudioPlan({ uid: 'user-a', plan: invalid, env, fetchImpl })).code, 'INVALID_PLAN_SYNC_TIMESTAMP');
});

test('local bridge reads the existing private token path internally and never returns it', async () => {
    const mock = service();
    const paths = [];
    const config = createLocalFeishuConfig({ directory: '/private-photoatelier', readFileImpl: async file => { paths.push(file); return ` ${token}\n`; }, fetchImpl: mock.fetchImpl });
    const status = await config.status();
    assert.equal(status.credential_configured, true);
    assert.ok(!JSON.stringify(status).includes(token));
    assert.match(paths[0], /private-photoatelier[\\/]sync-token\.txt$/);
    assert.equal(mock.calls.length, 0);
    assert.equal((await config.sync({ uid: 'user-a', plan: plan() })).status, 'synced');
    const missing = createLocalFeishuConfig({ readFileImpl: async () => { throw new Error('not present'); } });
    assert.equal((await missing.status()).credential_configured, false);
});

test('projection keeps shooting text, guidance and conversation while excluding binary and credential objects', async () => {
    const original = plan();
    const binary = 'data:image/png;base64,' + 'A'.repeat(MAX_FEISHU_RECORD_BYTES * 2);
    original.images = [binary];
    original.apiKey = 'credential-marker';
    original.providerConfig = { token: 'credential-marker' };
    original.input.secret = 'credential-marker';
    original.input.extra = '保留用户拍摄限制';
    original.shotList[0] = { ...original.shotList[0], description: '人物站在画面左下方', image: binary, camera: { apiKey: 'credential-marker' }, directorContract: { lens: '35mm', model_pose: '走动', generator_prompt: 'full body portrait', image: binary, token: 'credential-marker' } };
    original.sections = [{ ti: '执行说明', c: ['保留完整正文'], unknown: { apiKey: 'credential-marker' } }];
    original.aiStudio.references[0].previewUrl = binary;
    original.aiStudio.references[0].upstreamId = 'original-library-id-42';
    original.aiStudio.guidance = { style: '电影感', brief: '保留参考依据', suggestions: [{ sourceItemId: 'pa-pose-seat', kind: 'pose', direction: '肩部放松', unknown: 'credential-marker' }], apiKey: 'credential-marker' };
    original.aiStudio.conversation = [{ role: 'user', content: '需要自然坐姿', at: '2026-11-05T02:00:00.000Z', secret: 'credential-marker' }];
    const projected = await buildStudioFeishuRecords({ uid: 'user-a', plan: original });
    const serialized = JSON.stringify(projected);
    assert.ok(!serialized.includes('credential-marker'));
    assert.ok(!serialized.includes('data:image'));
    assert.equal(projected.plans[0].shotList[0].description, '人物站在画面左下方');
    assert.equal(projected.plans[0].shotList[0].directorContract.generator_prompt, 'full body portrait');
    assert.deepEqual(projected.plans[0].sections[0].c, ['保留完整正文']);
    assert.equal(projected.plans[0].aiStudio.guidance.suggestions[0].direction, '肩部放松');
    assert.equal(projected.plans[0].aiStudio.conversation[0].content, '需要自然坐姿');
    assert.equal(projected.references[0].upstreamId, 'original-library-id-42');
    assert.equal(projected.plans[0].aiStudio.references[0].upstreamId, 'original-library-id-42');
    assert.equal(original.images[0], binary);
});

test('an oversized text snapshot stays pending before any remote request and is not truncated', async () => {
    const original = plan();
    original.title = '正文'.repeat(MAX_FEISHU_RECORD_BYTES);
    let calls = 0;
    const result = await syncStudioPlan({ uid: 'user-a', plan: original, env, fetchImpl: async () => { calls++; throw new Error('unexpected'); } });
    assert.equal(result.status, 'pending');
    assert.equal(result.code, 'FEISHU_SYNC_RECORD_TOO_LARGE');
    assert.equal(calls, 0);
    assert.equal(original.title.length, MAX_FEISHU_RECORD_BYTES * 2);
});

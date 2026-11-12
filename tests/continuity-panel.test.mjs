import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const panelSource = await readFile(new URL('../assets/continuity-panel.js', import.meta.url), 'utf8');

function createPanel({ initialState = {}, fetchImpl } = {}) {
    const storage = new Map([['photoatelier.continuity.v1', JSON.stringify(initialState)]]);
    const elements = new Map();
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, { value: id === 'f-provider' ? 'modelscope-qwen-edit' : '', textContent: '', dataset: {}, hidden: true });
            return elements.get(id);
        },
    };
    const context = vm.createContext({
        document,
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
        fetch: fetchImpl,
        location: { origin: 'https://photo.test' },
        URL,
        setTimeout: callback => { callback(); return 1; },
        clearTimeout() {},
        Date,
        Promise,
        Set,
        Number,
        JSON,
        String,
    });
    vm.runInContext(`${panelSource.replace(/\nboot\(\);\s*$/, '')}\nglobalThis.__readState = () => state;`, context);
    context.render = () => {};
    return {
        context,
        state: () => context.__readState(),
        storage,
        elements,
    };
}

function jsonResponse(status, payload) {
    return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

test('pending shot blocks repeat generation before another request is sent', async () => {
    let requests = 0;
    const panel = createPanel({
        initialState: { pendingJobs: { 'shot-01': { taskId: 'task-1' } } },
        fetchImpl: async () => { requests++; return jsonResponse(200, {}); },
    });

    await panel.context.generateShot('shot-01');

    assert.equal(requests, 0);
});

test('collect prevents a second concurrent poll for the same task', async () => {
    let releaseFirst;
    let requests = 0;
    const panel = createPanel({
        initialState: { pendingJobs: { 'shot-01': { taskId: 'task-1', seed: 428501 } } },
        fetchImpl: async () => {
            requests++;
            await new Promise(resolve => { releaseFirst = resolve; });
            return jsonResponse(200, { status: 'pending', shotId: 'shot-01' });
        },
    });

    const first = panel.context.collectShot('shot-01');
    await Promise.resolve();
    const second = await panel.context.collectShot('shot-01');
    assert.equal(second, null);
    assert.equal(requests, 1);
    releaseFirst();
    assert.equal(await first, null);
});

test('a terminal collect failure clears the pending task and exposes a retry state', async () => {
    const panel = createPanel({
        initialState: { pendingJobs: { 'shot-01': { taskId: 'task-failed' } } },
        fetchImpl: async () => jsonResponse(502, {
            status: 'failed', terminal: true, retryable: true, code: 'GENERATION_UPSTREAM_FAILED', error: 'upstream failed',
        }),
    });
    const result = await panel.context.collectShot('shot-01');
    assert.equal(result.terminal, true);
    assert.equal(panel.state().pendingJobs['shot-01'], undefined);
    assert.equal(panel.state().generationErrors['shot-01'].code, 'GENERATION_UPSTREAM_FAILED');
});

test('a transient collect failure preserves the same task for another poll', async () => {
    const panel = createPanel({
        initialState: { pendingJobs: { 'shot-01': { taskId: 'task-retry', providerId: 'modelscope-qwen-edit', seed: 428501 } } },
        fetchImpl: async () => jsonResponse(503, {
            status: 'pending', terminal: false, retryable: true,
            taskId: 'task-retry', shotId: 'shot-01', code: 'GENERATION_POLL_RETRYABLE',
        }),
    });

    assert.equal(await panel.context.collectShot('shot-01'), null);
    assert.equal(panel.state().pendingJobs['shot-01'].taskId, 'task-retry');
    assert.equal(panel.state().pendingJobs['shot-01'].seed, 428501);
    assert.equal(panel.state().generationErrors?.['shot-01'], undefined);
});

test('retry counts are unchanged for 401, 429, 503 and network failures', async t => {
    for (const failure of [
        async () => jsonResponse(401, { error: 'SIGN_IN_REQUIRED' }),
        async () => jsonResponse(429, { error: 'IMAGE_DAILY_LIMIT_REACHED' }),
        async () => jsonResponse(503, { error: 'IMAGE_QUOTA_NOT_CONFIGURED' }),
        async () => { throw new Error('offline'); },
    ]) {
        const panel = createPanel({
            initialState: { retryCounts: { 'shot-01': 0 } },
            fetchImpl: async () => failure(),
        });

        await t.test(String(panel.state().retryCounts['shot-01']), async () => {
            await panel.context.generateShot('shot-01', true);
            assert.equal(panel.state().retryCounts['shot-01'], 0);
        });
    }
});

test('accepted async retry keeps its seed through collect and the saved result', async () => {
    const requests = [];
    const panel = createPanel({
        initialState: { group: { shots: [{ shotId: 'shot-01' }] }, retryCounts: { 'shot-01': 0 } },
        fetchImpl: async (path, init) => {
            const body = JSON.parse(init.body);
            requests.push({ path, body });
            if (path === '/api/continuity/requests') return jsonResponse(200, { requests: [{ shotId: 'shot-01', seed: 428501 }] });
            if (String(path).endsWith('/api/continuity/generate')) return jsonResponse(202, { status: 'pending', taskId: 'task-1' });
            return jsonResponse(200, { status: 'succeeded', shotId: 'shot-01', image: { assetId: 'asset-1', path: '/api/continuity/asset/0123456789abcdef' } });
        },
    });
    const collect = panel.context.collectShot;
    panel.context.collectShot = async () => null;

    await panel.context.generateShot('shot-01', true);
    assert.match(requests[1].path, /^https:\/\/photoatelier-api\.photomagic\.workers\.dev\/api\/continuity\/generate$/);
    assert.equal(panel.state().retryCounts['shot-01'], 1);
    assert.equal(panel.state().pendingJobs['shot-01'].seed, 428501);

    panel.context.collectShot = collect;
    const completed = await panel.context.collectShot('shot-01');
    assert.match(requests[2].path, /^https:\/\/photoatelier-api\.photomagic\.workers\.dev\/api\/continuity\/collect$/);
    assert.equal(requests[2].body.seed, 428501);
    assert.equal(completed.seed, 428501);
    assert.equal(panel.state().results['shot-01'].seed, 428501);
});

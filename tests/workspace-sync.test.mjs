import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker from '../api/index.js';
import { WorkspaceSync } from '../api/workspace-state.mjs';
import { mergeWorkspace, workspaceEntryKey, isWorkspaceEntry } from '../assets/workspace-sync-protocol.mjs';

const key = id => workspaceEntryKey('local', 'pw_eq', `record:${id}`);
test('independent edits and deletions merge; concurrent record changes preserve both copies', () => {
    const base = { [key('a')]: { id: 'a', n: 'A' }, [key('b')]: { id: 'b', n: 'B' } };
    const local = { ...base, [key('a')]: { id: 'a', n: 'A2' } };
    const remote = { [key('a')]: base[key('a')], [key('c')]: { id: 'c', n: 'C' } };
    const result = mergeWorkspace(base, local, remote);
    assert.deepEqual(result.conflicts, []);
    assert.equal(result.entries[key('a')].n, 'A2');
    assert.equal(result.entries[key('b')], undefined);
    assert.equal(result.entries[key('c')].n, 'C');
    const conflict = { [key('a')]: { id: 'a', n: 'Remote edit' } };
    assert.deepEqual(mergeWorkspace(base, local, conflict).conflicts, [key('a')]);
    assert.equal(local[key('a')].n, 'A2');
});
test('shared keys exclude login, provider credentials and configuration', () => {
    for (const name of ['pw_token', 'pw_user', 'pa_pexels_key', 'pa_api_base']) assert.equal(isWorkspaceEntry(workspaceEntryKey('local', name, '$value')), false);
    assert.equal(isWorkspaceEntry(workspaceEntryKey('local', 'pa_shot_images_test-plan', '$value')), true);
});
function durable() {
    const values = new Map();
    const storage = {
        get: async key => structuredClone(values.get(key)),
        put: async (key, value) => values.set(key, structuredClone(value)),
        delete: async key => values.delete(key),
        transaction: async fn => fn(storage),
    };
    return new WorkspaceSync({ storage });
}
test('durable state survives chunking and rejects a stale write or credential key', async () => {
    const object = durable();
    const entries = { [key('a')]: { id: 'a', n: '摄影'.repeat(50_000) } };
    const post = body => object.fetch(new Request('https://internal/state', { method: 'POST', body: JSON.stringify(body) }));
    assert.equal((await post({ revision: 0, entries })).status, 200);
    assert.deepEqual(await (await object.fetch(new Request('https://internal/state'))).json(), { revision: 1, entries });
    assert.equal((await post({ revision: 0, entries: {} })).status, 409);
    assert.equal((await post({ revision: 1, entries: { [workspaceEntryKey('local', 'pw_token', '$value')]: 'not-uploaded' } })).status, 400);
});
test('existing login signature protects shared state and selects a separate object per account', async () => {
    const objects = new Map();
    const env = { JWT_SECRET: 'unit-test-secret', WORKSPACE_SYNC: {
        idFromName: name => name,
        get(name) { if (!objects.has(name)) objects.set(name, durable()); return objects.get(name); },
    } };
    const token = uid => {
        const p = JSON.stringify({ uid, t: Date.now() });
        return Buffer.from(JSON.stringify({ p, s: createHmac('sha256', env.JWT_SECRET).update(p).digest('hex') })).toString('base64url');
    };
    const request = (uid, payload) => new Request('https://worker/api/workspace/state', {
        method: payload ? 'POST' : 'GET', headers: uid ? { Authorization: `Bearer ${token(uid)}` } : {},
        body: payload ? JSON.stringify(payload) : undefined,
    });
    assert.equal((await worker.fetch(request(null), env)).status, 401);
    assert.equal((await worker.fetch(request('a', { revision: 0, entries: { [key('a')]: { id: 'a', n: 'Private' } } }), env)).status, 200);
    assert.deepEqual((await (await worker.fetch(request('b'), env)).json()).entries, {});
    assert.equal((await (await worker.fetch(request('a'), env)).json()).entries[key('a')].n, 'Private');
});

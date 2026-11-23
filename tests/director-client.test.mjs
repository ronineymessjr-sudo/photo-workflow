import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const clientSource = await readFile(new URL('../assets/director-client.js', import.meta.url), 'utf8');

function createClient(request) {
    const window = { api: { request } };
    vm.runInNewContext(clientSource, {
        window,
        location: { hostname: 'photoatelier.example' },
        Promise,
        Date,
        setTimeout: callback => { callback(); return 0; },
    });
    return window;
}

test('director client submits asynchronously, polls, and returns the collected image', async () => {
    const calls = [];
    const window = createClient(async (path, method, body) => {
        calls.push({ path, method, body });
        if (path.endsWith('generate-candidate')) return { status: 'pending', taskId: 'task-123' };
        return { status: 'succeeded', candidateAsset: { url: '/candidate.png' } };
    });

    const result = await window.generateDirectorCandidate({ brief: 'waist-up portrait' });

    assert.deepEqual(JSON.parse(JSON.stringify(result)), { status: 'succeeded', candidateAsset: { url: '/candidate.png' } });
    assert.deepEqual(calls.map(call => call.path), [
        '/api/director/generate-candidate', '/api/director/collect-candidate',
    ]);
    assert.equal(calls[1].body.taskId, 'task-123');
});

test('director client preserves terminal provider error details', async () => {
    const window = createClient(async path => path.endsWith('generate-candidate')
        ? { status: 'pending', taskId: 'task-456' }
        : { status: 'failed', code: 'GENERATION_UPSTREAM_FAILED', error: '模型上游返回 502' });

    await assert.rejects(window.generateDirectorCandidate({ brief: 'portrait' }), error => {
        assert.equal(error.code, 'GENERATION_UPSTREAM_FAILED');
        assert.equal(error.message, '模型上游返回 502');
        return true;
    });
});

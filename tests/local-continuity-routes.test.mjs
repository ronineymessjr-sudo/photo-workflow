import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { after, test } from 'node:test';
import { createServer } from '../tools/serve-director.mjs';

const assetRoot = await mkdtemp(path.join(tmpdir(), 'photoatelier-local-continuity-'));
const forwardedAuthRequests = [];
const server = createServer({
    continuityEnvironment: {},
    continuityAssetRoot: assetRoot,
    fetchImpl: async (input, init = {}) => {
        forwardedAuthRequests.push({ url: String(input), init });
        return Response.json({ success: true, token: 'test-session-token', user: { id: 'test-user' } });
    },
    resolveStudioUser: async authorization => authorization === 'Bearer local-test-token' ? 'local-test-user' : null,
});
const listening = new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
await listening;
const baseUrl = `http://127.0.0.1:${server.address().port}`;
after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(assetRoot, { recursive: true, force: true });
});

test('local PhotoAtelier server serves continuity page and API on the main origin', async () => {
    const page = await fetch(`${baseUrl}/continuity.html`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /连续性分组/);

    const schema = await fetch(`${baseUrl}/api/continuity/schema`);
    assert.equal(schema.status, 200);
    assert.ok((await schema.json()).roles);

    const providers = await fetch(`${baseUrl}/api/continuity/providers?needReferences=true`);
    assert.equal(providers.status, 200);
    assert.equal((await providers.json()).manualOnly, true);
});

test('local unlimited generation still requires an authenticated user', async () => {
    const guest = await fetch(`${baseUrl}/api/continuity/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(guest.status, 401);
    assert.equal((await guest.json()).error, 'SIGN_IN_REQUIRED');

    const signedIn = await fetch(`${baseUrl}/api/continuity/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer local-test-token' },
        body: '{}',
    });
    assert.notEqual(signedIn.status, 401);
});

test('local continuity API rejects cross-origin writes', async () => {
    const response = await fetch(`${baseUrl}/api/continuity/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example' },
        body: '{}',
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, 'INVALID_ORIGIN');
});

test('local plan import preserves scene changes, all selected poses, and shot details', async () => {
    const templates = [
        { id: 'face-1', kind: 'portrait', title: '人物参考', referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/portrait/thumbs/face-1.webp' },
        { id: 'wardrobe-1', kind: 'costume', title: '米白针织衫', referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/costume/thumbs/wardrobe-1.webp' },
        { id: 'pose-1', kind: 'pose', title: '自然站姿', angles: ['正面'], direction: '肩部放松', referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/pose-1.jpg' },
        { id: 'pose-2', kind: 'pose', title: '侧身回望', angles: ['侧面'], direction: '身体侧转，目光回看', referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/pose-2.jpg' },
        { id: 'pose-3', kind: 'pose', title: '坐姿近景', angles: ['眼平'], direction: '坐在长椅边缘', referenceImageUrl: 'https://hruiccc.github.io/RuiC-PoseAtlas/thumbs/pose-3.jpg' },
    ];
    const shots = [
        { shotId: 'shot-01', directorContract: { referenceIds: ['pose-1'], shot_size: '全身', camera_angle: '眼平', lens: '50mm', model_pose: '自然站姿', model_position: '画面中央偏左', scene: '竹林小径', generator_prompt: '竹林小径全身人像' } },
        { shotId: 'shot-02', directorContract: { referenceIds: ['pose-2'], shot_size: '中景', camera_angle: '侧后方', lens: '85mm', model_pose: '侧身回望', model_position: '右侧三分线', scene: '溪边石阶', generator_prompt: '溪边石阶侧身人像' } },
        { shotId: 'shot-03', directorContract: { referenceIds: ['pose-3'], shot_size: '近景', camera_angle: '眼平', lens: '50mm', model_pose: '坐姿近景', model_position: '画面中央', scene: '木亭长椅', generator_prompt: '木亭长椅坐姿近景' } },
    ];
    const imported = await fetch(`${baseUrl}/api/continuity/from-studio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            planId: 'photographer-test-plan', planRevision: 7,
            input: { theme: '秋日人像', wardrobeNote: '米白针织衫', style: '自然暖调' },
            templates, selectedIds: templates.map(item => item.id), shots,
            guidance: { style: '自然暖调', suggestions: [{ sourceItemId: 'pose-2', direction: '身体侧转，目光回看' }] },
        }),
    });
    assert.equal(imported.status, 200);
    const conversion = await imported.json();
    assert.equal(conversion.group.shots.length, 3);
    assert.deepEqual(conversion.group.shots.map(shot => shot.scene), ['竹林小径', '溪边石阶', '木亭长椅']);
    assert.deepEqual(conversion.group.shots.map(shot => shot.poseRef.title), ['自然站姿', '侧身回望', '坐姿近景']);
    assert.equal(conversion.group.studio.planRevision, 7);
    assert.equal(conversion.group.locked.wardrobe, '米白针织衫');
    assert.equal(conversion.group.locked.styleProfile, '自然暖调');

    const confirmed = await fetch(`${baseUrl}/api/continuity/master`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: conversion.group, assetId: 'studio-portrait-face-1', actor: 'human' }),
    });
    assert.equal(confirmed.status, 200);
    const group = (await confirmed.json()).group;
    const requests = await fetch(`${baseUrl}/api/continuity/requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, providerId: 'cloudflare-flux-klein' }),
    });
    assert.equal(requests.status, 200);
    const requestPayload = await requests.json();
    assert.equal(requestPayload.count, 3);
    assert.deepEqual(requestPayload.requests.map(item => item.shotId), shots.map(item => item.shotId));
    assert.deepEqual(requestPayload.requests.map(item => item.variant.scene), ['竹林小径', '溪边石阶', '木亭长椅']);
    assert.deepEqual(requestPayload.requests.map(item => item.variant.action), ['自然站姿', '侧身回望', '坐姿近景']);
});

test('local login is forwarded to the PhotoAtelier auth service without persisting credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: baseUrl },
        body: JSON.stringify({ email: 'photographer@example.invalid', password: 'test-password' }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).token, 'test-session-token');
    assert.equal(forwardedAuthRequests.length, 1);
    assert.equal(forwardedAuthRequests[0].url, 'https://photoatelier-api.photomagic.workers.dev/api/auth/login');
    assert.deepEqual(JSON.parse(forwardedAuthRequests[0].init.body), {
        email: 'photographer@example.invalid', password: 'test-password',
    });
});

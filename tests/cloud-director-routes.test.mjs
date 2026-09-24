import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGuestPlanDraft } from '../api/director-plan.mjs';
import worker from '../api/index.js';

test('guest multi-person plan uses interaction-led shots without assuming romance', () => {
    const plan = createGuestPlanDraft({
        theme: '雨夜双人纪实',
        modelDesc: '两位成年朋友',
        scene: '地铁口与雨巷',
        mood: '克制、亲密',
        duration: '2小时',
        people: '2',
        extra: '以交流与共同观察为主',
    });

    assert.equal(plan.shotList.length, 12);
    assert.equal(new Set(plan.shotList.map(shot => shot.title)).size, 12);
    assert.ok(plan.shotList.some(shot => shot.title === '边走边交谈'));
    assert.ok(plan.shotList.some(shot => shot.title === '共同看向同一处'));
    assert.ok(plan.shotList.every(shot => shot.description.includes('两位人物')));
    assert.ok(plan.shotList.every(shot => !/必须牵手|拥吻|情侣/.test(shot.description)));
    assert.ok(new Set(plan.shotList.map(shot => shot.method)).size > 1);
});

test('cloud candidate endpoint explains that image delivery is not configured instead of returning 404', async () => {
    const response = await worker.fetch(new Request('https://unit.test/api/director/generate-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: true }),
    }), {});

    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'CANDIDATE_IMAGE_DELIVERY_NOT_CONFIGURED');
});

test('cloud plans do not advertise local-only candidate generation as a connected service', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ shot_plans: [{ shot_language: 'wide', model_pose: 'Walk together', framing: 'Environment wide' }] });
    try {
        const response = await worker.fetch(new Request('https://unit.test/api/director/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: 'walk', modelDesc: 'two adults', people: '2' }),
        }), { DIRECTOR_API_BASE: 'https://director.example.test' });
        const plan = await response.json();
        assert.equal(response.status, 200);
        assert.equal(plan.director.imageGenerationConnected, false);
        assert.equal(plan.director.imageGenerationMode, 'cloud-image-delivery-not-configured');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('schedule UI describes assigned roles without claiming that notifications were sent', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /参与角色：\$\{formatScheduleAudience\(s\.audience\)\}/);
    assert.doesNotMatch(html, /已同步给摄影师、模特、摄影助理|已同步：摄影师/);
    assert.match(html, /toast\('已加入方案日程'/);
});

test('new plan form does not prefill unrelated sensitive demo content', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const theme = html.match(/<input id="f-theme"[^>]*>/)?.[0] || '';
    const style = html.match(/<select id="f-style">([\s\S]*?)<\/select>/)?.[1] || '';
    const mood = html.match(/<input id="f-mood"[^>]*>/)?.[0] || '';
    const model = html.match(/<textarea id="f-model"[^>]*>([\s\S]*?)<\/textarea>/)?.[1];
    const scene = html.match(/<textarea id="f-scene"[^>]*>([\s\S]*?)<\/textarea>/)?.[1];
    const extra = html.match(/<textarea id="f-extra"[^>]*>([\s\S]*?)<\/textarea>/)?.[1];
    assert.match(theme, /placeholder="如：雨夜城市人像"/);
    assert.doesNotMatch(theme, /\bvalue=/);
    assert.match(style, /<option value="">选择风格<\/option>/);
    assert.doesNotMatch(style, /selected/);
    assert.match(mood, /placeholder="如：轻松、克制、热烈"/);
    assert.doesNotMatch(mood, /\bvalue=/);
    assert.equal(model, '');
    assert.equal(scene, '');
    assert.equal(extra, '');
});

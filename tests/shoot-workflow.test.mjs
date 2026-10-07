import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const M = createRequire(import.meta.url)('../assets/shoot-workflow-model.js');
const plan = { id: 'p1', title: '城市人像', input: { scene: '街道' }, shotList: [{ id: 's1', title: '街角', description: '自然向前走', method: '站在路边', lighting: '侧光', duration: 5, directorContract: { model_pose: 'walk' } }, { id: 's2', title: '回头', description: '看向身后', duration: 0 }] };
const day = { id: 'day1', date: '2026-10-05', time: '15:00', location: '街道' };
test('canonical edits preserve provenance and flag outdated generation contracts', () => {
    const next = M.editShot(plan, M.shots(plan), 's1', { description: '停下，转头看向朋友', duration: 8 });
    assert.equal(next.shotList[0].contractNeedsReview, true);
    assert.equal(next.shotList[0].directorContract.model_pose, 'walk');
    assert.equal(plan.shotList[0].description, '自然向前走');
    assert.equal(M.shots(next, [{ title: 'old override' }])[0].description, '停下，转头看向朋友');
});
test('legacy edits survive until canonical migration', () => {
    const list = M.shots(plan, [{ title: '保留旧编辑', description: '旧动作' }]);
    assert.equal(list[0].title, '保留旧编辑'); assert.equal(list[0].id, 'p1-shot-1');
});
test('restoring original visual content re-enables its contract and keeps reference', () => {
    const edited = M.editShot(plan, M.shots(plan), 's1', { description: '新动作', referenceUrl: 'https://example.com/', referencePurpose: '光线' });
    const restored = M.restoreGenerated(edited, 's1');
    assert.equal(restored.shotList[0].description, plan.shotList[0].description);
    assert.equal(restored.shotList[0].contractNeedsReview, false);
    assert.equal(restored.shotList[0].reference.purpose, '光线');
    assert.equal(restored.workflowRevision, 2);
});
test('references reject unsafe schemes and require a purpose', () => {
    for (const url of ['javascript:alert(1)', 'data:image/png;base64,x', 'https://u:pass@example.com/']) assert.throws(() => M.referenceUrl(url));
    assert.throws(() => M.editShot(plan, M.shots(plan), 's1', { referenceUrl: 'https://example.com/', referencePurpose: '' }));
    const next = M.editShot(plan, M.shots(plan), 's1', { referenceUrl: 'https://example.com/work/1', referencePurpose: '借鉴侧光', synthetic: true });
    assert.equal(next.shotList[0].reference.synthetic, true);
    assert.equal(next.shotList[0].contractNeedsReview, undefined);
});
test('invalid timing and empty actions are rejected', () => {
    for (const duration of [-1, 481, 'bad']) assert.throws(() => M.editShot(plan, M.shots(plan), 's1', { duration }));
    assert.throws(() => M.editShot(plan, M.shots(plan), 's1', { description: '' }));
});
test('each shooting date has separate persisted progress', () => {
    const a = M.record(M.session(plan, day), 's1', { status: 'done', notes: '第一天完成' });
    const b = M.session(plan, { ...day, id: 'day2' });
    assert.equal(b.records.s1, undefined); assert.notEqual(a.scheduleId, b.scheduleId);
    assert.equal(M.session(plan, day, JSON.parse(JSON.stringify(a))).records.s1.notes, '第一天完成');
});
test('reorder changes only session and excludes deleted shots', () => {
    const state = M.move(M.session(plan, day), 's2', -1);
    assert.deepEqual(state.order, ['s2', 's1']); assert.equal(plan.shotList[0].id, 's1');
    assert.deepEqual(M.session({ ...plan, shotList: plan.shotList.slice(0, 1) }, day, state).order, ['s1']);
});
test('role packets read current edits and confirmations expire on changes', () => {
    const before = M.packetVersion(plan, day);
    const next = M.editShot(plan, M.shots(plan), 's1', { description: '看向朋友' });
    assert.equal(M.packet(next, day, 'model').rows[0].instruction, '看向朋友');
    assert.notEqual(M.packetVersion(next, day), before);
    assert.notEqual(M.packetVersion(plan, { ...day, time: '16:00' }), before);
    assert.equal(M.packet(plan, day, 'assistant').rows[0].instruction, '侧光');
});
test('a completed shot becomes a retake when its content changes', () => {
    const state = M.record(M.session(plan, day), 's1', { status: 'done', shotRevision: 0 });
    const next = M.editShot(plan, M.shots(plan), 's1', { description: '新的动作' });
    assert.equal(M.session(next, day, state).records.s1.status, 'retake');
    assert.equal(M.session(plan, day, state).records.s1.status, 'done');
});
test('PDF print draft includes edited text and reference provenance', async () => {
    const scope = { window: {} }; vm.runInNewContext(await readFile(new URL('../assets/plan-print-export.js', import.meta.url), 'utf8'), scope);
    const next = M.editShot(plan, M.shots(plan), 's1', { description: '<停下>', referenceUrl: 'https://example.com/shot', referencePurpose: '侧光', synthetic: true });
    const html = scope.window.PhotoAtelierPrintExport.buildHtml([next]);
    assert.match(html, /&lt;停下&gt;/); assert.match(html, /侧光/); assert.match(html, /AI 概念图/);
});

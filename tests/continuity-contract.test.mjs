import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile, mkdtemp, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { assertCanGenerate, assertCanPlan, assertCanReview, ProviderCapabilityError, PROVIDERS } from '../experiments/plan-quality-lab/continuity/providers.mjs';
import { judge, QC_ITEMS, VERDICT } from '../experiments/plan-quality-lab/continuity/qc.mjs';

const runAsync = promisify(execFile);
const labDir = resolve('experiments/plan-quality-lab');
const groupsDir = join(labDir, 'continuity/groups');

const confirmedRefs = [
    { assetId: 'a-identity', role: 'identity', status: 'confirmed' },
    { assetId: 'a-scene', role: 'scene', status: 'confirmed' },
    { assetId: 'a-style', role: 'style', status: 'confirmed' },
];

test('a text-only vision service is rejected for generation but allowed to plan and review', () => {
    assert.throws(() => assertCanGenerate('deepseek-vision', confirmedRefs), ProviderCapabilityError);
    assert.equal(assertCanPlan('deepseek-vision').label.includes('DeepSeek'), true);
    assert.equal(assertCanReview('deepseek-vision').canReview, true);
    assert.equal(PROVIDERS['deepseek-vision'].supportsReferences, false);
});

test('generation fails closed when any reference is not confirmed, and when a role is missing', () => {
    for (const refs of [
        [{ ...confirmedRefs[0], status: 'pending' }, confirmedRefs[1], confirmedRefs[2]],
        [{ ...confirmedRefs[0], status: 'missing' }, confirmedRefs[1], confirmedRefs[2]],
        [confirmedRefs[0], confirmedRefs[1]],
    ]) {
        assert.throws(() => assertCanGenerate('gpt-image-2', refs), ProviderCapabilityError);
    }
    assert.equal(assertCanGenerate('gpt-image-2', confirmedRefs).supportsReferences, true);
});

test('an unknown provider cannot be assumed to support references', () => {
    assert.throws(() => assertCanGenerate('some-new-api', confirmedRefs), /未登记的图像服务/);
});

test('every built continuity group locks the scene and declares three reference roles', async () => {
    const files = (await readdir(groupsDir)).filter(name => name.endsWith('.json'));
    assert.ok(files.length >= 28, `应有至少 28 份契约，实际 ${files.length}`);
    for (const file of files) {
        const group = JSON.parse(await readFile(join(groupsDir, file), 'utf8'));
        assert.ok(group.locked.subject && group.locked.wardrobe && group.locked.location, `${file} 缺锁定字段`);
        assert.ok(group.locked.mustKeep.includes('同一地点'), `${file} mustKeep 缺地点`);
        const roles = group.references.map(reference => reference.role).sort().join(',');
        assert.equal(roles, 'identity,scene,style', `${file} 参考角色不完整`);
        assert.ok(group.shots.length >= 9, `${file} 镜头数不足`);
        assert.ok(group.shots.every(shot => shot.prompt && shot.shotId), `${file} 有镜头缺 prompt 或 id`);
        // Locked fields must not leak into shot-level overrides.
        assert.ok(group.shots.every(shot => !('location' in shot) && !('wardrobe' in shot)), `${file} 镜头里出现了可改写锁定字段的键`);
    }
});

test('the runner refuses to start before the master reference is confirmed by a human', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'continuity-'));
    const source = join(groupsDir, 'S01-style-hanfu-court.json');
    const group = JSON.parse(await readFile(source, 'utf8'));
    group.references = group.references.map(reference => ({ ...reference, status: 'confirmed' }));
    const target = join(dir, 'group.json');
    await writeFile(target, JSON.stringify(group), 'utf8');

    const attempt = async () => runAsync('node', [join(labDir, 'continuity/run.mjs'), '--group', target, '--provider', 'gpt-image-2', '--dry-run'])
        .then(() => ({ code: 0 }))
        .catch(error => ({ code: error.code, stderr: String(error.stderr) }));

    const withoutMaster = await attempt();
    assert.equal(withoutMaster.code, 2, '未确认主参考图时必须退出 2');
    assert.match(withoutMaster.stderr, /主参考图未经人工确认/);

    group.master = { confirmedBy: 'human', assetId: 'a-identity' };
    await writeFile(target, JSON.stringify(group), 'utf8');
    const withMaster = await runAsync('node', [join(labDir, 'continuity/run.mjs'), '--group', target, '--provider', 'gpt-image-2', '--dry-run']);
    assert.match(withMaster.stdout, /\[dry\] S01-01/);
    assert.match(withMaster.stdout, /refs=identity\/scene\/style/);

    // Tampering with locked fields must be detected against the stored hash.
    group.locked.location = '另一个完全不同的地点';
    await writeFile(target, JSON.stringify(group), 'utf8');
    const tampered = await attempt();
    assert.equal(tampered.code, 2);
    assert.match(tampered.stderr, /锁定字段被改写/);
});

test('QC verdicts separate retry-single-shot from needs-human', () => {
    const allPass = Object.fromEntries(QC_ITEMS.map(item => [item.id, 'pass']));
    assert.equal(judge(allPass, { humanConfirmed: true }).verdict, VERDICT.PASS);
    const wardrobeFail = judge({ ...allPass, wardrobe: 'fail' }, { humanConfirmed: true });
    assert.equal(wardrobeFail.verdict, VERDICT.RETRY);
    assert.equal(wardrobeFail.retryScope, 'single-shot');
    assert.equal(judge({ ...allPass, identity: 'unknown' }, { humanConfirmed: true }).verdict, VERDICT.HUMAN);
    assert.equal(judge(allPass, { humanConfirmed: false }).verdict, VERDICT.HUMAN);
});

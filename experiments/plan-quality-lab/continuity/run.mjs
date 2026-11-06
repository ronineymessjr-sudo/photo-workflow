#!/usr/bin/env node
// Per-shot runner with a hard gate and a reproducibility record.
//
// Contract:
//   1. locked fields come from the continuity group and are never rewritten
//   2. every request carries the same three reference roles (identity/scene/style)
//   3. provider without reference support -> ProviderCapabilityError, exit 2
//   4. each shot is one request (never "one prompt, count=9")
//   5. every attempt appends a manifest record: shot, hash, refs, prompt, seed, qc
//
//   node continuity/run.mjs --group continuity/groups/S01-style-hanfu-court.json \
//        --provider gpt-image-2 --dry-run
import { readFile, appendFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { assertCanGenerate, ProviderCapabilityError } from './providers.mjs';
import { QC_ITEMS, judge } from './qc.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const flag = name => argv.includes(`--${name}`);

const groupPath = resolve(arg('group', 'continuity/groups/S01-style-hanfu-court.json'));
const providerId = arg('provider', 'gpt-image-2');
const dryRun = flag('dry-run');
const manifestPath = resolve(dirname(groupPath), '..', 'manifest.jsonl');
const seedBase = Number(arg('seed', '428193'));

const group = JSON.parse(await readFile(groupPath, 'utf8'));
const seedIndex = Number(String(group.series).replace(/\D/g, '')) || 1;

// --- gates -----------------------------------------------------------------
try {
    assertCanGenerate(providerId, group.references);
} catch (error) {
    if (error instanceof ProviderCapabilityError) {
        console.error(`❌ ${error.message}`);
        console.error('   这条是故意的失败关闭：不允许悄悄退化成纯文生图。');
        console.error('   处理：补齐参考图并标记 confirmed，或换成支持参考图的图像服务。');
        process.exit(2);
    }
    throw error;
}
if (group.master?.confirmedBy !== 'human') {
    console.error('❌ 主参考图未经人工确认（master.confirmedBy != human）。');
    console.error('   先出 3 张候选、人工挑一张，再把它写进 master.assetId 并置为 human。');
    process.exit(2);
}

const lockedJson = JSON.stringify(group.locked);
const lockedHash = createHash('sha1').update(lockedJson).digest('hex').slice(0, 12);
if (lockedHash !== group.lockedHash) {
    console.error(`❌ 锁定字段被改写：当前 ${lockedHash} ≠ 契约 ${group.lockedHash}`);
    process.exit(2);
}

// --- per-shot requests -----------------------------------------------------
const requests = group.shots.map((shot, index) => ({
    shotId: shot.shotId,
    size: shot.size,
    aspect: shot.aspect,
    prompt: shot.prompt,
    seed: seedBase + seedIndex * 100 + index,
    references: group.references.map(reference => ({ assetId: reference.assetId, role: reference.role })),
    // Variant whitelist: only these may differ between shots.
    variant: { shotType: shot.shotType, camera: shot.camera, lens: shot.lens, distance: shot.distance },
    locked: { subject: group.locked.subject, wardrobe: group.locked.wardrobe, location: group.locked.location, timeOfDay: group.locked.timeOfDay },
}));

console.log(`契约：${group.continuityGroupId}　镜头 ${requests.length}　provider ${providerId}　lockedHash ${lockedHash}`);
if (dryRun) {
    for (const request of requests) {
        console.log(`  [dry] ${request.shotId} seed=${request.seed} refs=${request.references.map(reference => reference.role).join('/')} prompt=${request.prompt.length}字`);
    }
    console.log(`\nQC 检查项（每镜出图后逐项过）：${QC_ITEMS.map(item => item.id).join(' / ')}`);
    console.log('dry-run 结束：没有真正调用图像服务，也没有写 manifest。');
    process.exit(0);
}

// Real calls are intentionally not implemented here: this repo has no image
// service credentials, and shipping a fake call would violate the "fail closed"
// rule. The adapter stub throws so nothing silently pretends to succeed.
for (const request of requests) {
    await appendFile(manifestPath, JSON.stringify({
        ts: new Date().toISOString(),
        shotId: request.shotId,
        continuityGroupId: group.continuityGroupId,
        lockedHash,
        references: request.references,
        provider: providerId,
        seed: request.seed,
        promptHash: createHash('sha1').update(request.prompt).digest('hex').slice(0, 12),
        result: { status: 'not-attempted', reason: 'no image adapter configured' },
        qc: judge({}),
    }) + '\n', 'utf8');
}
console.error('❌ 未配置图像服务适配器：占位记录已写入 manifest，但没有任何图片生成。');
console.error('   配置适配器后重跑；缺配置时不会伪造成功。');
process.exit(3);

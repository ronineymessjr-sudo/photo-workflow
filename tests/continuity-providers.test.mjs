import test from 'node:test';
import assert from 'node:assert/strict';
import { listProviders, recommendProvider, assertGroupProvider, resolveProvider, PRICE_TIERS } from '../api/continuity-providers.mjs';
import { createGroup, setImageProvider, setReference, confirmMaster } from '../api/continuity.mjs';
import { generateShot } from '../api/continuity-generation.mjs';
import { storeAsset, createMemoryStore } from '../api/continuity-assets.mjs';

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function readyGroup(store) {
    let group = createGroup({
        input: { theme: '白底模特', scene: '白底影棚', style: '电商', modelDesc: '一名成年人', wardrobeNote: '白色露肩上衣' },
        shots: [{ shotId: 'shot-01', size: 'CU', lens: '85mm', generator_prompt: 'white background portrait' }],
    });
    for (const role of ['identity', 'scene', 'style']) {
        const asset = await storeAsset({ dataUrl: PNG_1PX, role, store });
        group = setReference(group, { role, assetId: asset.assetId, status: 'confirmed', path: asset.path });
    }
    return confirmMaster(group, { assetId: group.references[0].assetId });
}

test('cheap providers that cannot take references are filtered out', () => {
    const cheapWithRefs = listProviders({ needReferences: true, maxPriceTier: 'low' });
    assert.ok(cheapWithRefs.length >= 2);
    assert.ok(cheapWithRefs.every(provider => provider.supportsReferences));
    assert.ok(cheapWithRefs.every(provider => PRICE_TIERS[provider.priceTier] === 1));
    assert.equal(cheapWithRefs[0].priceLabel, '便宜');

    const all = listProviders();
    assert.ok(all.some(provider => provider.id === 'minimax-image' && provider.supportsReferences === false), '纯文生图服务应在全量列表里但被标注');
    assert.ok(!cheapWithRefs.some(provider => provider.id === 'gpt-image-2'), '偏贵档不应出现在便宜筛选里');
});

test('recommendation prefers configured credentials and explains the manual-only case', () => {
    const none = recommendProvider({ configuredEnv: {} });
    assert.equal(none.recommended, 'manual-chatgpt-web', '没有 API 凭据时应回落到手动通道');
    assert.equal(none.manualOnly, true);
    assert.deepEqual(none.apiReadyIds, []);
    assert.match(none.blockedReason, /只配了手动通道/);

    const withSiliconFlow = recommendProvider({
        configuredEnv: { CONTINUITY_IMAGE_ENDPOINT: 'https://example/run', CONTINUITY_IMAGE_KEY: 'k' },
    });
    assert.equal(withSiliconFlow.recommended, 'siliconflow-flux-kontext', '配了凭据后应优先推荐便宜且支持参考图的 API');
    assert.equal(withSiliconFlow.manualOnly, false);
    assert.equal(withSiliconFlow.blockedReason, '');
    assert.ok(withSiliconFlow.configuredIds.includes('siliconflow-flux-kontext'));
});

test('a text-only provider cannot be pinned on a continuity group', () => {
    assert.throws(() => assertGroupProvider({}, 'minimax-image'), /不支持参考图/);
    assert.throws(() => assertGroupProvider({}, 'no-such-provider'), /未登记的图像服务/);
    assert.equal(assertGroupProvider({}, 'siliconflow-flux-kontext').id, 'siliconflow-flux-kontext');
});

test('the chosen brush is stored on the contract and used by later calls', async () => {
    const store = createMemoryStore();
    let group = await readyGroup(store);
    group = setImageProvider(group, { providerId: 'gpt-image-2' });
    assert.equal(group.imageProvider, 'gpt-image-2');
    assert.equal(group.lockedHash, (await readyGroup(store)).lockedHash, '选画笔不应改动锁定字段');

    // No providerId passed: it must fall back to the pinned one, and fail on that
    // provider's own missing credential rather than silently using another.
    await assert.rejects(
        () => generateShot({ group, shotId: 'shot-01', env: {}, store, fetchImpl: async () => assert.fail('不应发起请求') }),
        error => error.code === 'GENERATION_NOT_CONFIGURED' && error.details.missing.includes('OPENAI_API_KEY'),
    );
});

test('switching the brush keeps references and locked fields intact', async () => {
    const store = createMemoryStore();
    let group = await readyGroup(store);
    const before = JSON.stringify(group.locked);
    group = setImageProvider(group, { providerId: 'flux-kontext' });
    group = setImageProvider(group, { providerId: 'siliconflow-flux-kontext' });
    assert.equal(JSON.stringify(group.locked), before);
    assert.equal(group.references.filter(reference => reference.status === 'confirmed').length, 3);
    assert.equal(resolveProvider(group.imageProvider).supportsReferences, true);
});

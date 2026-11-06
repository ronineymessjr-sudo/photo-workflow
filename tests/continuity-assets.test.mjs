import test from 'node:test';
import assert from 'node:assert/strict';
import { storeAsset, readAsset, parseDataUrl, createMemoryStore, AssetError, ASSET_LIMITS } from '../api/continuity-assets.mjs';
import { createGroup, setReference, confirmMaster, buildShotRequests } from '../api/continuity.mjs';

// 1x1 transparent PNG, small enough to inline.
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const JPEG_1PX = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDX/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAr/2gAIAQEAAD8AswD/2Q==';

test('only JPEG/PNG/WebP base64 payloads are accepted', () => {
    assert.equal(parseDataUrl(PNG_1PX).extension, 'png');
    assert.equal(parseDataUrl(JPEG_1PX).mime, 'image/jpeg');
    assert.throws(() => parseDataUrl('data:image/gif;base64,R0lGODlhAQABAA=='), (error) => error instanceof AssetError && error.code === 'ASSET_TYPE_UNSUPPORTED');
    assert.throws(() => parseDataUrl('https://example.com/a.png'), (error) => error instanceof AssetError && error.code === 'ASSET_FORMAT_INVALID');
    assert.throws(() => parseDataUrl(''), (error) => error instanceof AssetError && error.code === 'ASSET_REQUIRED');
});

test('oversized images are rejected before they reach storage', () => {
    const big = `data:image/png;base64,${'A'.repeat(Math.ceil((ASSET_LIMITS.maxBytes + 1024) * 4 / 3))}`;
    const store = createMemoryStore();
    return storeAsset({ dataUrl: big, role: 'identity', store }).then(
        () => assert.fail('should have thrown'),
        error => {
            assert.equal(error.code, 'ASSET_TOO_LARGE');
            assert.equal(store.size, 0, '被拒绝的图片不应写入存储');
        },
    );
});

test('asset ids are content-addressed, so the same photo keeps the same id', async () => {
    const store = createMemoryStore();
    const first = await storeAsset({ dataUrl: PNG_1PX, role: 'identity', store });
    const second = await storeAsset({ dataUrl: PNG_1PX, role: 'identity', store });
    assert.equal(first.assetId, second.assetId);
    assert.equal(first.path, `/api/continuity/asset/${first.assetId}`);
    assert.equal(first.durable, false);
    assert.equal(store.size, 1, '相同内容不应产生第二份副本');

    const otherRole = await storeAsset({ dataUrl: PNG_1PX, role: 'scene', store });
    assert.equal(otherRole.assetId, first.assetId, '同一张图换角色也是同一个 id');
    assert.notEqual(otherRole.key, first.key, '但存储键按角色分开，便于审计');
});

test('stored bytes can be read back with the right mime type', async () => {
    const store = createMemoryStore();
    const asset = await storeAsset({ dataUrl: JPEG_1PX, role: 'scene', store });
    const loaded = await readAsset(asset.path, { store });
    assert.ok(loaded, '应能按 path 回读');
    assert.equal(loaded.mime, 'image/jpeg');
    assert.equal(loaded.buffer.length, asset.bytes);

    const missing = await readAsset('/api/continuity/asset/0000000000000000', { store });
    assert.equal(missing, null);
    await assert.rejects(() => readAsset('/api/continuity/asset/abc', { store }), /资产 ID 不合法/);
});

test('a stored asset can be attached to a reference and unblocks generation', async () => {
    const store = createMemoryStore();
    let group = createGroup({
        input: { theme: '雨夜', scene: '旧车站月台', style: '纪实', modelDesc: '一名成年人' },
        shots: [{ shotId: 'shot-01', size: 'WS', lens: '35mm', generator_prompt: 'wide shot' }],
    });

    for (const role of ['identity', 'scene', 'style']) {
        const asset = await storeAsset({ dataUrl: PNG_1PX, role, store });
        group = setReference(group, { role, assetId: asset.assetId, status: 'confirmed', path: asset.path });
    }
    assert.ok(group.references.every(reference => reference.path?.startsWith('/api/continuity/asset/')));
    group = confirmMaster(group, { assetId: group.references[0].assetId });

    const requests = buildShotRequests(group, { providerId: 'gpt-image-2' });
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].references.map(reference => reference.assetId), group.references.map(reference => reference.assetId));
});

test('reference without a stored path stays pending and keeps generation blocked', async () => {
    const group = createGroup({ input: { theme: '雨夜', scene: '月台' }, shots: [{ shotId: 'shot-01', generator_prompt: 'x' }] });
    const withAsset = setReference(group, { role: 'identity', assetId: 'abcd1234abcd1234', status: 'confirmed', path: '/api/continuity/asset/abcd1234abcd1234' });
    assert.equal(withAsset.references.find(reference => reference.role === 'identity').status, 'confirmed');
    assert.throws(() => buildShotRequests(withAsset, { providerId: 'gpt-image-2' }), /参考图未确认/);
});

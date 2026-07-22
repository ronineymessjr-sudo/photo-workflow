const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  classifyByRules,
  normalizePlatformUrl,
  runDailyKnowledge
} = require('../../tools/daily-knowledge-lib');

test('normalizes platform URLs for deduplication without losing the navigable URL', () => {
  const normalized = normalizePlatformUrl(
    'https://www.xiaohongshu.com/explore/abc123?xsec_token=token&xsec_source=pc_collect',
    'xiaohongshu'
  );
  assert.equal(normalized.canonicalUrl, 'https://www.xiaohongshu.com/explore/abc123');
  assert.match(normalized.url, /xsec_token=token/);
  assert.equal(normalized.sourceId, 'abc123');
});

test('rule fallback produces searchable photography metadata', () => {
  const result = classifyByRules({
    platform: 'xiaohongshu',
    title: '自然光人像构图与摆姿教程',
    collectionName: '拍摄专辑',
    sourceTags: ['拍摄']
  });
  assert.equal(result.workflowStage, '拍摄');
  assert.equal(result.contentType, '教程');
  assert.ok(result.searchableTags.includes('人像'));
  assert.equal(result.needsReview, true);
});

test('daily run is incremental and preserves the same-day note on rerun', async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'photoatelier-daily-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  const captureDir = path.join(tempRoot, 'captures');
  const vaultRoot = path.join(tempRoot, 'vault');
  fs.mkdirSync(captureDir, { recursive: true });
  fs.writeFileSync(path.join(captureDir, 'xiaohongshu-test.json'), JSON.stringify({
    platform: 'xiaohongshu',
    collectionName: '拍摄专辑',
    capturedAt: '2026-07-18T02:00:00.000Z',
    tags: ['拍摄', '构图'],
    items: [
      {
        title: '自然光人像构图教程',
        url: 'https://www.xiaohongshu.com/explore/abc123?xsec_token=one',
        capturedAt: '2026-07-18T02:00:00.000Z'
      },
      {
        title: '同一链接的重复卡片',
        url: 'https://www.xiaohongshu.com/explore/abc123?xsec_token=two',
        capturedAt: '2026-07-18T02:00:00.000Z'
      }
    ]
  }), 'utf8');

  const config = {
    timezone: 'Asia/Shanghai',
    collection: { captureDir },
    agent: { enabled: false },
    storage: {
      ledgerFile: path.join(tempRoot, 'ledger.json'),
      runDir: path.join(tempRoot, 'runs'),
      vaultRoot,
      dailyFolder: '摄影知识库/09_每日收集',
      profileNote: '摄影知识库/10_个人兴趣画像.md',
      statusNote: '摄影知识库/11_每日自动化状态.md'
    },
    profile: { enabled: true, sensitiveInference: false }
  };

  const first = await runDailyKnowledge({ projectRoot: tempRoot, config, runAt: '2026-07-18T10:00:00.000Z' });
  assert.equal(first.newCount, 1);
  assert.equal(first.totalCount, 1);
  assert.equal(first.classificationMode, 'rules');

  const second = await runDailyKnowledge({ projectRoot: tempRoot, config, runAt: '2026-07-18T11:00:00.000Z' });
  assert.equal(second.newCount, 0);
  assert.equal(second.totalCount, 1);
  assert.equal(second.classificationMode, 'not-needed');

  const dailyNote = fs.readFileSync(path.join(vaultRoot, '摄影知识库', '09_每日收集', '2026-07-18.md'), 'utf8');
  const profile = fs.readFileSync(path.join(vaultRoot, '摄影知识库', '10_个人兴趣画像.md'), 'utf8');
  assert.match(dailyNote, /自然光人像构图教程/);
  assert.match(dailyNote, /xsec_token=one/);
  assert.match(profile, /sensitive_inference: false/);
  assert.match(profile, /唯一收藏链接：1/);
});

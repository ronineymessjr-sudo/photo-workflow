const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const WORKFLOW_STAGES = ['灵感', '策划', '拍摄', '剪辑', '调色', '发布', '复盘', '通用'];
const CONTENT_TYPES = ['教程', '案例', '参考', '工具', '观点', '其他'];
const VALUE_LEVELS = ['high', 'medium', 'low'];
const SUPPORTED_PLATFORMS = new Set(['xiaohongshu', 'douyin']);

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function expandPath(value, projectRoot) {
  const expanded = String(value || '')
    .replace(/%USERPROFILE%/gi, process.env.USERPROFILE || os.homedir())
    .replace(/%HOME%/gi, os.homedir());
  return path.isAbsolute(expanded) ? path.normalize(expanded) : path.resolve(projectRoot, expanded);
}

function cleanText(value, maxLength = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function uniqueStrings(values, max = 12) {
  return [...new Set((values || []).map((value) => cleanText(value, 40)).filter(Boolean))].slice(0, max);
}

function normalizePlatformUrl(rawUrl, platform) {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    parsed.hash = '';

    const normalizedPlatform = platform || (
      /xiaohongshu\.com|xhslink\.com/i.test(parsed.hostname) ? 'xiaohongshu'
        : /douyin\.com/i.test(parsed.hostname) ? 'douyin'
          : ''
    );
    if (!SUPPORTED_PLATFORMS.has(normalizedPlatform)) return null;

    const canonical = new URL(parsed.toString());
    canonical.search = '';
    canonical.hostname = canonical.hostname.toLowerCase();
    canonical.pathname = canonical.pathname.replace(/\/+$/, '') || '/';

    const idMatch = canonical.pathname.match(/\/(?:explore|discovery\/item|video|note)\/([^/?#]+)/i);
    const sourceId = idMatch ? idMatch[1] : crypto.createHash('sha1').update(canonical.toString()).digest('hex').slice(0, 16);
    return {
      platform: normalizedPlatform,
      url: parsed.toString(),
      canonicalUrl: canonical.toString(),
      sourceId
    };
  } catch (_) {
    return null;
  }
}

function firstMatchingStage(text) {
  const rules = [
    ['调色', /调色|色彩|lut|达芬奇|lightroom|camera raw|胶片色/i],
    ['剪辑', /剪辑|转场|卡点|节奏|premiere|final cut|pr教程|后期制作/i],
    ['拍摄', /拍摄|姿势|构图|布光|光线|镜头|焦段|机位|运镜|曝光|人像|街拍/i],
    ['策划', /策划|脚本|分镜|选题|提案|故事板|拍摄方案/i],
    ['发布', /发布|运营|标题|封面|流量|涨粉|账号定位/i],
    ['复盘', /复盘|数据分析|转化|反馈|成片评价/i],
    ['灵感', /灵感|参考|审美|电影感|氛围|情绪|创意/i]
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || '通用';
}

function inferTopics(text, sourceTags) {
  const rules = [
    ['人像', /人像|肖像|portrait/i],
    ['姿势', /姿势|动作|摆姿|pose/i],
    ['构图', /构图|取景|画面结构/i],
    ['布光', /布光|光线|闪光灯|柔光|自然光/i],
    ['镜头语言', /镜头|焦段|机位|运镜|景别/i],
    ['视频拍摄', /视频|短片|空镜|运镜|电影感/i],
    ['剪辑', /剪辑|转场|卡点|节奏|premiere|final cut/i],
    ['调色', /调色|色彩|lut|达芬奇|lightroom/i],
    ['场景', /场景|地点|室内|户外|棚拍|街拍/i],
    ['设计', /设计|版式|排版|字体|配色/i],
    ['内容运营', /运营|标题|封面|流量|涨粉|选题/i],
    ['AI工具', /\bai\b|人工智能|提示词|工作流|agent/i]
  ];
  const matched = rules.filter(([, pattern]) => pattern.test(text)).map(([topic]) => topic);
  return uniqueStrings([...matched, ...(sourceTags || [])], 6);
}

function inferContentType(text) {
  if (/教程|技巧|方法|步骤|指南|怎么|如何|入门|干货/i.test(text)) return '教程';
  if (/案例|样片|作品|实拍|前后对比|before|after/i.test(text)) return '案例';
  if (/工具|软件|插件|模板|lut|预设|器材/i.test(text)) return '工具';
  if (/观点|思考|趋势|为什么|经验/i.test(text)) return '观点';
  return '参考';
}

function classifyByRules(item) {
  const text = [item.title, item.author, item.collectionName, ...(item.sourceTags || [])].join(' ');
  const workflowStage = firstMatchingStage(text);
  const topics = inferTopics(text, item.sourceTags);
  const contentType = inferContentType(text);
  const primaryTopic = topics[0] || (workflowStage === '通用' ? '待分类' : workflowStage);
  const weakTitle = !item.title || item.title === item.sourceId || item.title.length < 5;
  return {
    summary: `${primaryTopic}相关${contentType}，来自${item.platform === 'xiaohongshu' ? '小红书' : '抖音'}收藏，正文内容尚待人工核验。`,
    primaryTopic,
    topics,
    workflowStage,
    contentType,
    searchableTags: uniqueStrings([...topics, workflowStage, contentType, ...(item.sourceTags || [])]),
    knowledgeValue: weakTitle ? 'low' : 'medium',
    needsReview: true,
    classifiedBy: 'rules'
  };
}

function cleanVisualIndex(value) {
  if (!value || typeof value !== 'object') return null;
  const fields = ['shotType', 'composition', 'subjectAction', 'lighting', 'scene', 'timeOfDay', 'colorStyle'];
  const visualIndex = Object.fromEntries(fields.map((field) => [field, cleanText(value[field], 80)]).filter(([, fieldValue]) => fieldValue));
  return Object.keys(visualIndex).length ? visualIndex : null;
}

function isHttpUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(String(value || '')).protocol);
  } catch (_) {
    return false;
  }
}

function sanitizeClassification(raw, fallback) {
  const workflowStage = WORKFLOW_STAGES.includes(raw?.workflowStage) ? raw.workflowStage : fallback.workflowStage;
  const contentType = CONTENT_TYPES.includes(raw?.contentType) ? raw.contentType : fallback.contentType;
  const knowledgeValue = VALUE_LEVELS.includes(raw?.knowledgeValue) ? raw.knowledgeValue : fallback.knowledgeValue;
  const topics = uniqueStrings(raw?.topics?.length ? raw.topics : fallback.topics, 6);
  const visualIndex = cleanVisualIndex(raw?.visualIndex);
  return {
    summary: cleanText(raw?.summary || fallback.summary, 240),
    primaryTopic: cleanText(raw?.primaryTopic || topics[0] || fallback.primaryTopic, 40),
    topics,
    workflowStage,
    contentType,
    searchableTags: uniqueStrings([
      ...(raw?.searchableTags?.length ? raw.searchableTags : fallback.searchableTags),
      ...Object.values(visualIndex || {})
    ]),
    knowledgeValue,
    needsReview: raw?.needsReview !== false,
    classifiedBy: raw?.classifiedBy || 'model',
    visualIndex
  };
}

function extractJsonArray(content) {
  const text = String(content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('模型没有返回 JSON 数组');
  return JSON.parse(text.slice(start, end + 1));
}

async function requestModelBatch(items, agentConfig, fetchImpl = global.fetch) {
  const baseUrl = process.env.DAILY_KB_AGENT_BASE_URL || agentConfig.baseUrl;
  const model = process.env.DAILY_KB_AGENT_MODEL || agentConfig.model;
  const apiKey = process.env.DAILY_KB_AGENT_API_KEY || process.env.OPENAI_API_KEY || '';
  if (!baseUrl || !model || typeof fetchImpl !== 'function') throw new Error('模型接口未配置');
  if (!apiKey) throw new Error('模型 API 密钥未配置');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(agentConfig.timeoutMs) || 8000);
  const payload = items.map((item) => ({
    id: item.id,
    platform: item.platform,
    title: item.title,
    author: item.author,
    collectionName: item.collectionName,
    sourceTags: item.sourceTags,
    hasCover: isHttpUrl(item.cover)
  }));
  const prompt = [
    '你是个人摄影知识库的分类代理。仅依据给定收藏元数据分类，不补写原帖正文，不推断用户的敏感属性。',
    `workflowStage 只能是：${WORKFLOW_STAGES.join('、')}。`,
    `contentType 只能是：${CONTENT_TYPES.join('、')}。knowledgeValue 只能是 high、medium、low。`,
    '每条返回 id、summary、primaryTopic、topics、workflowStage、contentType、searchableTags、knowledgeValue、needsReview、visualIndex。',
    'visualIndex 只在存在对应画面信息时返回，可用字段为 shotType、composition、subjectAction、lighting、scene、timeOfDay、colorStyle。不要猜测不可见细节。',
    '元数据不足时 needsReview 必须为 true。只返回 JSON 数组。',
    JSON.stringify(payload)
  ].join('\n');
  const content = [{ type: 'text', text: prompt }];
  for (const item of items) {
    if (!isHttpUrl(item.cover)) continue;
    content.push({ type: 'text', text: `封面对应条目 id: ${item.id}` });
    content.push({ type: 'image_url', image_url: { url: item.cover, detail: 'low' } });
  }

  try {
    const response = await fetchImpl(`${String(baseUrl).replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'Return valid JSON only.' },
          { role: 'user', content }
        ]
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`模型接口返回 HTTP ${response.status}`);
    const body = await response.json();
    return extractJsonArray(body?.choices?.[0]?.message?.content);
  } finally {
    clearTimeout(timeout);
  }
}

async function classifyItems(items, agentConfig = {}, fetchImpl = global.fetch) {
  if (!items.length) return { items: [], mode: 'not-needed', warnings: [] };
  const fallbacks = new Map(items.map((item) => [item.id, classifyByRules(item)]));
  if (!agentConfig.enabled || process.env.DAILY_KB_AGENT_PROVIDER === 'rules') {
    return { items: items.map((item) => ({ ...item, classification: fallbacks.get(item.id) })), mode: 'rules', warnings: [] };
  }
  if (agentConfig.provider === 'openai-vision' && !(process.env.DAILY_KB_AGENT_API_KEY || process.env.OPENAI_API_KEY)) {
    return {
      items: items.map((item) => ({ ...item, classification: fallbacks.get(item.id) })),
      mode: 'rules-fallback',
      warnings: ['视觉模型 API 密钥未配置，已使用规则分类']
    };
  }

  const batchSize = Math.max(1, Math.min(Number(agentConfig.batchSize) || 20, 50));
  const retries = Math.max(0, Math.min(Number(agentConfig.retries) || 0, 2));
  const classified = [];
  const warnings = [];
  let usedModel = false;

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    let modelRows = null;
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        modelRows = await requestModelBatch(batch, agentConfig, fetchImpl);
        usedModel = true;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!modelRows) warnings.push(`分类模型不可用，${batch.length} 条已使用规则分类：${cleanText(lastError?.message, 120)}`);
    const rowsById = new Map((modelRows || []).map((row) => [String(row.id), row]));
    for (const item of batch) {
      const fallback = fallbacks.get(item.id);
      const modelRow = rowsById.get(item.id);
      classified.push({
        ...item,
        classification: sanitizeClassification(modelRow ? { ...modelRow, classifiedBy: agentConfig.provider || 'model' } : fallback, fallback)
      });
    }
  }

  const modelMode = agentConfig.provider === 'openai-vision' ? 'vision-model' : 'model';
  return { items: classified, mode: usedModel ? (warnings.length ? 'hybrid' : modelMode) : 'rules-fallback', warnings };
}

function listCaptureFiles(captureDir) {
  if (!fs.existsSync(captureDir)) return [];
  return fs.readdirSync(captureDir)
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .map((name) => path.join(captureDir, name))
    .sort();
}

function loadUnprocessedCaptures(captureDir, processedFiles = []) {
  const processed = new Set(processedFiles);
  const files = listCaptureFiles(captureDir).filter((filePath) => !processed.has(path.basename(filePath)));
  const items = [];
  const warnings = [];

  for (const filePath of files) {
    try {
      const capture = readJson(filePath, {});
      for (const raw of capture.items || []) {
        const normalized = normalizePlatformUrl(raw.url, raw.platform || capture.platform);
        if (!normalized) continue;
        const id = `${normalized.platform}-${normalized.sourceId}`;
        items.push({
          id,
          ...normalized,
          title: cleanText(raw.title || normalized.sourceId, 180),
          author: cleanText(raw.author, 100),
          cover: cleanText(raw.cover, 1000),
          collectionName: cleanText(raw.collectionName || capture.collectionName, 100),
          collectionUrl: cleanText(raw.collectionUrl || capture.collectionUrl, 1000),
          sourceTags: uniqueStrings(raw.tags || capture.tags || []),
          capturedAt: raw.capturedAt || capture.capturedAt || new Date().toISOString(),
          captureFile: path.basename(filePath)
        });
      }
    } catch (error) {
      warnings.push(`${path.basename(filePath)} 无法读取：${cleanText(error.message, 120)}`);
    }
  }
  return { files, items, warnings };
}

function localDate(isoValue, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(isoValue));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function yamlString(value) {
  return JSON.stringify(String(value || ''));
}

function markdownLink(title, url) {
  return `[${String(title || '打开原帖').replace(/[\[\]]/g, '')}](<${url}>)`;
}

function formatVisualIndex(visualIndex) {
  if (!visualIndex) return '';
  const labels = {
    shotType: '景别',
    composition: '构图',
    subjectAction: '动作',
    lighting: '光线',
    scene: '场景',
    timeOfDay: '时间',
    colorStyle: '色彩'
  };
  return Object.entries(visualIndex).map(([key, value]) => `${labels[key] || key}：${value}`).join('；');
}

function buildDailyNote(date, runAt, newItems, summary) {
  const lines = [
    '---',
    `title: ${yamlString(`${date} 每日知识增量`)}`,
    'type: daily-knowledge-ingest',
    'generated_by: photoatelier-daily-agent',
    `generated_at: ${yamlString(runAt)}`,
    `new_items: ${newItems.length}`,
    'content_scope: metadata-only',
    '---',
    '',
    `# ${date} 每日知识增量`,
    '',
    '> 仅保存本人收藏页中可见的链接与公开元数据。原帖内容、版权状态和事实准确性仍需人工核验。',
    '',
    '## 运行摘要',
    '',
    `- 新增：${newItems.length}`,
    `- 已存在：${summary.existingCount}`,
    `- 分类方式：${summary.classificationMode}`,
    `- 采集状态：${summary.collectionStatus}`,
    ''
  ];

  if (!newItems.length) {
    lines.push('## 今日结果', '', '没有发现新的唯一链接。', '');
    return `${lines.join('\n')}\n`;
  }

  lines.push('## 新增条目', '');
  newItems.forEach((item, index) => {
    const c = item.classification;
    lines.push(
      `### ${index + 1}. ${item.title}`,
      '',
      `- 平台：${item.platform === 'xiaohongshu' ? '小红书' : '抖音'}`,
      `- 收藏夹：${item.collectionName || '未命名'}`,
      `- 原帖：${markdownLink('打开原帖', item.url)}`,
      `- 主题：${c.primaryTopic}`,
      `- 工作流阶段：${c.workflowStage}`,
      `- 内容类型：${c.contentType}`,
      `- 检索标签：${c.searchableTags.join('、') || '待补充'}`,
      `- 摘要：${c.summary}`,
      ...(c.visualIndex ? [`- 视觉索引：${formatVisualIndex(c.visualIndex)}`] : []),
      `- 核验状态：${c.needsReview ? '待人工核验' : '已具备充分元数据'}`,
      `- 知识 ID：\`${item.id}\``,
      ''
    );
  });
  return `${lines.join('\n')}\n`;
}

function countBy(items, getter) {
  const counts = new Map();
  for (const item of items) {
    for (const value of [].concat(getter(item) || []).filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
}

function formatCounts(rows, emptyText = '暂无数据') {
  if (!rows.length) return `- ${emptyText}`;
  return rows.slice(0, 12).map(([name, count]) => `- ${name}：${count}`).join('\n');
}

function buildProfileNote(runAt, ledgerItems, timezone) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = ledgerItems.filter((item) => Date.parse(item.firstSeenAt || 0) >= cutoff);
  const topics = countBy(ledgerItems, (item) => item.classification?.topics);
  const stages = countBy(ledgerItems, (item) => item.classification?.workflowStage);
  const contentTypes = countBy(ledgerItems, (item) => item.classification?.contentType);
  const platforms = countBy(ledgerItems, (item) => item.platform === 'xiaohongshu' ? '小红书' : '抖音');
  const recentTopics = countBy(recent, (item) => item.classification?.topics);

  return `---\ntitle: "个人兴趣画像（非敏感）"\ntype: generated-interest-profile\ngenerated_by: photoatelier-daily-agent\ngenerated_at: ${yamlString(runAt)}\nsource_scope: saved-content-metadata\nsensitive_inference: false\n---\n\n# 个人兴趣画像（非敏感）\n\n> 本页只汇总收藏内容表现出的主题与创作工作流偏好，不推断年龄、性别、健康、政治、宗教、财务、种族或性取向等敏感属性。\n\n## 当前规模\n\n- 唯一收藏链接：${ledgerItems.length}\n- 最近 30 天新增：${recent.length}\n- 更新时间：${localDate(runAt, timezone)}\n\n## 长期主题\n\n${formatCounts(topics)}\n\n## 最近 30 天主题\n\n${formatCounts(recentTopics)}\n\n## 创作阶段偏好\n\n${formatCounts(stages)}\n\n## 内容类型偏好\n\n${formatCounts(contentTypes)}\n\n## 平台分布\n\n${formatCounts(platforms)}\n\n## 使用边界\n\n- 画像仅用于知识检索、拍摄方案推荐和学习复盘。\n- 元数据不足的条目保持“待人工核验”，不自动当作事实或个人偏好。\n- 删除某条收藏记录后，下次重建画像时不再计入。\n`;
}

function buildStatusNote(runAt, summary, warnings) {
  const warningLines = warnings.length ? warnings.map((warning) => `- ${warning}`).join('\n') : '- 无';
  return `---\ntitle: "每日知识自动化状态"\ntype: generated-automation-status\ngenerated_by: photoatelier-daily-agent\ngenerated_at: ${yamlString(runAt)}\n---\n\n# 每日知识自动化状态\n\n## 最近运行\n\n- 时间：${runAt}\n- 采集状态：${summary.collectionStatus}\n- 新增链接：${summary.newCount}\n- 已有链接：${summary.existingCount}\n- 唯一链接总数：${summary.totalCount}\n- 分类方式：${summary.classificationMode}\n- 处理捕获文件：${summary.processedCaptureFiles}\n\n## 警告\n\n${warningLines}\n\n## 判断方式\n\n- \`vision-model\`：多模态模型根据可见元数据和封面完成分类。\n- \`model\`：文本模型根据可见元数据完成分类。\n- \`hybrid\`：部分批次使用模型，失败批次使用规则。\n- \`rules-fallback\`：模型不可用，规则分类继续运行。\n- \`rules\`：明确关闭模型，仅使用规则。\n- \`not-needed\`：本次没有新增链接，无需分类。\n- 登录失效或页面结构变化时只记录警告，不尝试绕过平台验证。\n`;
}

function buildDailyIndex(dailyDir) {
  const notes = fs.existsSync(dailyDir)
    ? fs.readdirSync(dailyDir).filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name)).sort().reverse()
    : [];
  const links = notes.length ? notes.map((name) => `- [[${name.replace(/\.md$/, '')}]]`).join('\n') : '- 暂无每日记录';
  return `---\ntitle: "每日知识收集索引"\ntype: generated-index\ngenerated_by: photoatelier-daily-agent\n---\n\n# 每日知识收集索引\n\n${links}\n`;
}

async function runDailyKnowledge(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, '..'));
  const configPath = expandPath(options.configPath || 'config/daily-knowledge-agent.json', projectRoot);
  const config = options.config || readJson(configPath, {});
  const storage = config.storage || {};
  const captureDir = expandPath(options.captureDir || config.collection?.captureDir || 'data/platform-captures', projectRoot);
  const ledgerFile = expandPath(storage.ledgerFile || 'data/daily-knowledge/ledger.json', projectRoot);
  const runDir = expandPath(storage.runDir || 'data/daily-knowledge/runs', projectRoot);
  const vaultRoot = expandPath(storage.vaultRoot || path.join(os.homedir(), 'Documents', 'Obsidian Vault'), projectRoot);
  const dailyDir = expandPath(path.join(vaultRoot, storage.dailyFolder || '摄影知识库/09_每日收集'), projectRoot);
  const profilePath = expandPath(path.join(vaultRoot, storage.profileNote || '摄影知识库/10_个人兴趣画像.md'), projectRoot);
  const statusPath = expandPath(path.join(vaultRoot, storage.statusNote || '摄影知识库/11_每日自动化状态.md'), projectRoot);
  const runAt = options.runAt || new Date().toISOString();
  const date = localDate(runAt, config.timezone);
  const dryRun = Boolean(options.dryRun);
  const ledger = readJson(ledgerFile, { schemaVersion: 1, updatedAt: null, processedCaptureFiles: [], items: [] });
  const captures = loadUnprocessedCaptures(captureDir, ledger.processedCaptureFiles || []);
  const existingByUrl = new Map((ledger.items || []).map((item) => [item.canonicalUrl, item]));
  const uniqueIncoming = new Map();
  for (const item of captures.items) {
    if (!uniqueIncoming.has(item.canonicalUrl)) uniqueIncoming.set(item.canonicalUrl, item);
  }

  const newCandidates = [...uniqueIncoming.values()].filter((item) => !existingByUrl.has(item.canonicalUrl));
  const existingCount = uniqueIncoming.size - newCandidates.length;
  const agentConfig = options.skipModel ? { ...(config.agent || {}), enabled: false } : (config.agent || {});
  const classification = await classifyItems(newCandidates, agentConfig, options.fetchImpl || global.fetch);
  const nextItems = [...(ledger.items || [])];
  for (const item of classification.items) {
    nextItems.push({
      ...item,
      firstSeenAt: item.capturedAt || runAt,
      lastSeenAt: item.capturedAt || runAt,
      verificationStatus: 'needs-review',
      contentScope: 'metadata-only'
    });
  }
  for (const incoming of uniqueIncoming.values()) {
    const existing = existingByUrl.get(incoming.canonicalUrl);
    if (existing && Date.parse(incoming.capturedAt || 0) > Date.parse(existing.lastSeenAt || 0)) existing.lastSeenAt = incoming.capturedAt;
  }

  const collectionWarnings = options.collectionWarnings || [];
  const warnings = [...collectionWarnings, ...captures.warnings, ...classification.warnings];
  const collectionStatus = collectionWarnings.length ? '部分失败' : (captures.files.length ? '已读取捕获文件' : '没有新的捕获文件');
  const summary = {
    ok: true,
    dryRun,
    runAt,
    date,
    collectionStatus,
    newCount: classification.items.length,
    existingCount,
    totalCount: nextItems.length,
    classificationMode: classification.mode,
    processedCaptureFiles: captures.files.length,
    warnings
  };

  if (!dryRun) {
    const nextLedger = {
      schemaVersion: 1,
      updatedAt: runAt,
      processedCaptureFiles: [...new Set([...(ledger.processedCaptureFiles || []), ...captures.files.map((file) => path.basename(file))])],
      items: nextItems
    };
    writeJson(ledgerFile, nextLedger);
    ensureDir(dailyDir);
    const todayItems = nextItems.filter((item) => localDate(item.firstSeenAt || runAt, config.timezone) === date);
    fs.writeFileSync(path.join(dailyDir, `${date}.md`), buildDailyNote(date, runAt, todayItems, summary), 'utf8');
    fs.writeFileSync(path.join(dailyDir, '00_每日收集索引.md'), buildDailyIndex(dailyDir), 'utf8');
    if (config.profile?.enabled !== false) fs.writeFileSync(profilePath, buildProfileNote(runAt, nextItems, config.timezone), 'utf8');
    fs.writeFileSync(statusPath, buildStatusNote(runAt, summary, warnings), 'utf8');
    ensureDir(runDir);
    writeJson(path.join(runDir, `${runAt.replace(/[:.]/g, '-')}.json`), summary);
  }

  return summary;
}

async function reclassifyExistingKnowledge(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, '..'));
  const configPath = expandPath(options.configPath || 'config/daily-knowledge-agent.json', projectRoot);
  const config = options.config || readJson(configPath, {});
  const storage = config.storage || {};
  const ledgerFile = expandPath(storage.ledgerFile || 'data/daily-knowledge/ledger.json', projectRoot);
  const ledger = readJson(ledgerFile, { schemaVersion: 1, updatedAt: null, processedCaptureFiles: [], items: [] });
  const agentConfig = config.agent || {};
  const candidates = (ledger.items || []).filter((item) => isHttpUrl(item.cover) && !item.classification?.visualIndex);
  const classification = await classifyItems(candidates, agentConfig, options.fetchImpl || global.fetch);
  const classifiedById = new Map(classification.items
    .filter((item) => item.classification?.classifiedBy === 'openai-vision')
    .map((item) => [item.id, item.classification]));
  const updatedAt = options.runAt || new Date().toISOString();
  const nextItems = (ledger.items || []).map((item) => {
    const nextClassification = classifiedById.get(item.id);
    return nextClassification ? { ...item, classification: nextClassification, visualIndexedAt: updatedAt } : item;
  });

  if (!options.dryRun && classifiedById.size) {
    writeJson(ledgerFile, { ...ledger, updatedAt, items: nextItems });
  }

  return {
    ok: true,
    dryRun: Boolean(options.dryRun),
    totalCandidates: candidates.length,
    updatedCount: classifiedById.size,
    classificationMode: classification.mode,
    warnings: classification.warnings
  };
}

module.exports = {
  buildDailyIndex,
  buildDailyNote,
  buildProfileNote,
  buildStatusNote,
  classifyByRules,
  classifyItems,
  expandPath,
  loadUnprocessedCaptures,
  normalizePlatformUrl,
  reclassifyExistingKnowledge,
  runDailyKnowledge,
  sanitizeClassification
};

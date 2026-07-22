import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogFile = path.join(projectRoot, 'data', 'ronin-photography-knowledge.json');
const vaultRoot = path.resolve(process.env.RONIN_OBSIDIAN_VAULT || path.join(os.homedir(), 'Documents', 'Obsidian Vault'));
const outputRoot = path.join(vaultRoot, '摄影知识库');
const dryRun = process.argv.includes('--dry-run');

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function safeName(value) {
  return String(value || '未命名').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 88) || '未命名';
}

function yaml(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ').trim();
}

function uniqueStrings(values) {
  return [...new Set((values || []).map(item => String(item).trim()).filter(Boolean))];
}

function roleOf(item) {
  if (item.kind === 'action') return '动作与姿势';
  if (item.kind === 'scene') return '场景';
  const category = String((item.tags || [])[0] || '');
  const classify = text => {
    if (/构图|景别|前景|焦段|机位|视角|广角|长焦|透视/.test(text)) return '构图与机位';
    if (/运镜|镜头运动|一镜到底|推拉摇移|稳定器|转场|超级慢动作|慢动作/.test(text)) return '运镜与视频';
    if (/拍照姿势|人像动作|动作引导|摆动作|表情|手部|站姿|坐姿|不露脸|道具|走动|转圈/.test(text)) return '动作与姿势';
    if (/光线|灯光|布光|逆光|侧光|闪光|补光|柔光|硬光|蓝调时刻|夜景/.test(text)) return '光线';
    if (/调色|色彩|达芬奇|LUT|滤镜|肤色|色温|剪辑|字幕|排版|修图|Photoshop|发布|封面|声音设计|降噪/.test(text)) return '色彩与后期';
    if (/场景|地点|海边|街头|建筑|咖啡馆|校园|公园|棚拍|室内|室外|勘景/.test(text)) return '场景';
    if (/氛围感|电影感|高级感|复古|古风|情绪|风格/.test(text)) return '风格与灵感';
    if (/工作流|器材|相机|镜头|参数|设置|备份|拍摄准备|文件管理/.test(text)) return '器材与流程';
    return null;
  };
  return classify(category) || classify(`${item.title || ''} ${(item.tags || []).join(' ')} ${item.question || ''}`) || '其他';
}

function folderFor(item) {
  if (item.kind === 'action') return '02_动作库';
  if (item.kind === 'scene') return '03_场景库';
  return '01_RAG知识';
}

function markdownFor(item, role) {
  const sourcePlatforms = uniqueStrings(item.sourcePlatform).join('、') || '未记录';
  const stages = uniqueStrings(item.workflowStage).join('、') || '未记录';
  const sourceLink = item.sourceUrl ? `[打开原始来源](${item.sourceUrl})` : '原始链接待补充';
  const itemTags = uniqueStrings(['摄影知识', role, ...uniqueStrings(item.tags)]);
  return [
    '---',
    `title: "${yaml(item.title)}"`,
    `ronin_id: "${yaml(item.id)}"`,
    'ronin_generated: true',
    'type: photography-knowledge',
    `kind: "${yaml(item.kind)}"`,
    `source_type: "${yaml(item.sourceType)}"`,
    `source_platform: "${yaml(sourcePlatforms)}"`,
    `source_url: "${yaml(item.sourceUrl || '')}"`,
    `workflow_stage: [${uniqueStrings(item.workflowStage).map(value => `"${yaml(value)}"`).join(', ')}]`,
    `grounding_status: "${yaml(item.groundingStatus || 'metadata-only')}"`,
    `verification_status: "${item.groundingStatus === 'metadata-only' ? 'needs-source-review' : 'source-backed'}"`,
    `source_snapshot: "${yaml(item.sourceSnapshot || '')}"`,
    `tags: [${itemTags.map(value => `"${yaml(value)}"`).join(', ')}]`,
    '---',
    '',
    `# ${item.title}`,
    '',
    '> [!warning] 来源待核验',
    '> 本页目前只依据标题、标签和已保存的元数据建立。它可以参与方案检索和方向推荐，但在使用具体参数、灯位、动作口令、地址或流程前，必须打开原始链接核验。',
    '',
    '## 适用问题',
    '',
    item.question || '待补充',
    '',
    '## 知识摘要',
    '',
    item.snippet || '待补充',
    '',
    '## 已知标签',
    '',
    ...(uniqueStrings(item.tags).map(value => `- ${value}`) || ['- 待补充']),
    '',
    '## 方案使用边界',
    '',
    `- 适用阶段：${stages}`,
    `- 推荐角色：${role}`,
    `- 来源平台：${sourcePlatforms}`,
    `- 当前依据：${item.groundingStatus || 'metadata-only'}`,
    `- 当前状态：${item.status || '待复核'}`,
    '',
    '## 原始来源',
    '',
    sourceLink,
    '',
    '## 原始索引文本',
    '',
    item.content || item.snippet || '待补充',
    '',
  ].join('\n');
}

function linkLabel(entry) {
  const platform = uniqueStrings(entry.item.sourcePlatform).join('、');
  const suffix = entry.duplicateTitle ? ` · ${platform || entry.item.kind} · ${entry.item.id.slice(-6)}` : '';
  return `${entry.item.title}${suffix}`.replace(/[\[\]|]/g, value => ({ '[': '［', ']': '］', '|': '｜' })[value]);
}

function makeLink(entry, fromRelative = '摄影知识库/00_摄影知识库总览.md') {
  const target = path.posix.relative(path.posix.dirname(fromRelative), entry.relative);
  const encoded = target.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `[${linkLabel(entry)}](${encoded})`;
}

function fileLink(label, targetRelative, fromRelative = '摄影知识库/00_摄影知识库总览.md') {
  const target = path.posix.relative(path.posix.dirname(fromRelative), targetRelative);
  const encoded = target.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `[${label}](${encoded})`;
}

function writeNew(file, content, result) {
  if (fs.existsSync(file)) {
    result.skipped += 1;
    return;
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
  }
  result.created += 1;
}

function writeManagedIndex(file, content, result) {
  if (fs.existsSync(file)) {
    const current = fs.readFileSync(file, 'utf8');
    if (!current.includes('ronin_generated: true')) {
      result.protected += 1;
      return;
    }
    if (current === content) {
      result.skipped += 1;
      return;
    }
    if (!dryRun) fs.writeFileSync(file, content, 'utf8');
    result.updated += 1;
    return;
  }
  writeNew(file, content, result);
}

function appendSection(file, marker, lines, result) {
  if (!fs.existsSync(file)) return;
  const current = fs.readFileSync(file, 'utf8');
  if (current.includes(marker)) return;
  if (!dryRun) fs.appendFileSync(file, `\n${marker}\n${lines.join('\n')}\n`, 'utf8');
  result.appended += 1;
}

if (!fs.existsSync(catalogFile)) throw new Error(`知识目录不存在：${catalogFile}`);
if (!isInside(vaultRoot, outputRoot)) throw new Error('输出目录超出 Obsidian Vault 范围');

const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
const entries = (catalog.items || []).filter(item => item.id && item.title).map(item => {
  const folder = folderFor(item);
  const filename = `${safeName(item.id)}_${safeName(item.title)}.md`;
  return { item, folder, role: roleOf(item), relative: path.posix.join('摄影知识库', folder, filename.replace(/\\/g, '/')) };
});
const titleCounts = new Map();
for (const entry of entries) titleCounts.set(entry.item.title, (titleCounts.get(entry.item.title) || 0) + 1);
for (const entry of entries) entry.duplicateTitle = titleCounts.get(entry.item.title) > 1;
const entriesById = new Map(entries.map(entry => [entry.item.id, entry]));
const result = { created: 0, updated: 0, appended: 0, skipped: 0, protected: 0 };

for (const entry of entries) {
  const target = path.join(vaultRoot, entry.relative);
  writeNew(target, markdownFor(entry.item, entry.role), result);
  const sourceIds = uniqueStrings(entry.item.sourceIds);
  const related = sourceIds.map(id => entriesById.get(`CHUNK-${id}`)).filter(source => source && source.item.id !== entry.item.id);
  const unresolvedSourceIds = sourceIds.filter(id => !entriesById.has(`CHUNK-${id}`));
  if (related.length || unresolvedSourceIds.length) appendSection(target, '<!-- ronin-related-sources -->', [
    '## 关联来源', '',
    ...related.map(source => `- ${makeLink(source, entry.relative)}`),
    ...unresolvedSourceIds.map(id => `- 上游记录尚未进入当前 RAG：\`${id}\``), ''
  ], result);
  appendSection(target, '<!-- ronin-user-validation -->', [
    '## 我的验证与补充', '',
    '- [ ] 已打开原始来源',
    '- [ ] 已用于拍摄方案',
    '- [ ] 已完成实拍验证',
    '- 有效条件：',
    '- 无效条件：',
    '- 我的参数或动作口令：',
    '- 关联复盘：', '',
    '> 完成来源核验后，可在页面属性中把 `grounding_status` 改为 `source-backed`，并把 `verification_status` 改为 `verified`；本地 Agent 会在下次索引刷新后读取这一状态。', ''
  ], result);
}

const byRole = new Map();
for (const entry of entries) {
  if (!byRole.has(entry.role)) byRole.set(entry.role, []);
  byRole.get(entry.role).push(entry);
}
const byStage = new Map();
const byTag = new Map();
for (const entry of entries) {
  for (const stage of uniqueStrings(entry.item.workflowStage)) {
    if (!byStage.has(stage)) byStage.set(stage, []);
    byStage.get(stage).push(entry);
  }
  for (const tag of uniqueStrings(entry.item.tags)) {
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag).push(entry);
  }
}
const sortedEntries = items => [...items].sort((a, b) => a.item.title.localeCompare(b.item.title, 'zh-CN') || a.item.id.localeCompare(b.item.id));
const details = (title, items, fromRelative) => [
  '<details>', `<summary>${title}（${items.length}）</summary>`, '', ...sortedEntries(items).map(entry => `- ${makeLink(entry, fromRelative)}`), '', '</details>', ''
].join('\n');
const roleOrder = ['构图与机位', '光线', '动作与姿势', '场景', '运镜与视频', '风格与灵感', '色彩与后期', '器材与流程', '其他'];
const stageOrder = ['灵感收集', '拍摄策划', '拍摄准备', '现场执行', '后期制作', '发布包装', '复盘学习', '工具管理'];
const planIndexPath = '摄影知识库/04_方案生成索引.md';
const workflowIndexPath = '摄影知识库/05_工作流索引.md';
const tagIndexPath = '摄影知识库/06_标签索引.md';
const reviewQueuePath = '摄影知识库/07_待核验队列.md';
const auditReportPath = '摄影知识库/08_系统审计报告.md';
const roleIndex = roleOrder.filter(role => byRole.has(role)).map(role => details(role, byRole.get(role), planIndexPath)).join('\n');
const workflowIndex = stageOrder.filter(stage => byStage.has(stage)).map(stage => details(stage, byStage.get(stage), workflowIndexPath)).join('\n');
const topTags = [...byTag.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'zh-CN')).slice(0, 40);
const tagIndex = topTags.map(([tag, items]) => details(tag, items, tagIndexPath)).join('\n');
const missingDirectSource = entries.filter(entry => !entry.item.sourceUrl);
const missingDirectSourceWithRag = missingDirectSource.filter(entry => uniqueStrings(entry.item.sourceIds).some(id => entriesById.has(`CHUNK-${id}`)));
const verificationByRole = roleOrder.filter(role => byRole.has(role)).map(role => details(role, byRole.get(role).filter(entry => entry.item.groundingStatus === 'metadata-only'), reviewQueuePath)).join('\n');
const folderIndexes = [
  {
    path: '摄影知识库/01_RAG知识/00_RAG知识索引.md',
    title: 'RAG 知识索引',
    description: '301 条来自小红书和抖音收藏的检索知识。优先通过方案用途、工作流或标签索引进入，避免在文件列表里逐条翻找。',
    items: entries.filter(entry => entry.folder === '01_RAG知识'),
  },
  {
    path: '摄影知识库/02_动作库/00_动作库索引.md',
    title: '动作库索引',
    description: '结构化动作候选。具体动作口令仍需通过关联来源补齐和实拍验证。',
    items: entries.filter(entry => entry.folder === '02_动作库'),
  },
  {
    path: '摄影知识库/03_场景库/00_场景库索引.md',
    title: '场景库索引',
    description: '结构化场景候选。实际地址、许可、天气和现场光线需要拍摄前确认。',
    items: entries.filter(entry => entry.folder === '03_场景库'),
  },
];

const overview = [
  '---', 'title: "摄影知识库总览"', 'type: index', 'ronin_generated: true', 'managed_file: true', `generated_at: "${yaml(catalog.generatedAt)}"`,
  `rights_boundary: "${yaml(catalog.rightsBoundary)}"`, 'tags: ["摄影知识", "索引", "PhotoAtelier"]', '---', '', '# 摄影知识库总览', '',
  '> 本库是 PhotoAtelier 的本地摄影知识入口。内容来自已整理的收藏元数据与已有 Obsidian 笔记；它用于检索、方案推荐和复盘回流，不替代对原始链接的核验。', '',
  '## 当前规模', '', `- RAG 知识：${catalog.stats?.rag || 0}`, `- 动作库：${catalog.stats?.actions || 0}`, `- 场景库：${catalog.stats?.scenes || 0}`,
  `- 总计：${catalog.stats?.total || entries.length}`, `- 当前依据：${Object.entries(catalog.profile?.groundingStatus || {}).map(([key, value]) => `${key} ${value}`).join('；') || '待统计'}`, '',
  '## 我现在想做什么', '',
  `- 我要规划一组拍摄：${fileLink('按构图、光线、动作、场景等用途查找', planIndexPath)}`,
  `- 我要按拍摄进度准备：${fileLink('从灵感收集到复盘学习逐阶段查找', workflowIndexPath)}`,
  `- 我只记得一个关键词：${fileLink('按高频标签查找', tagIndexPath)}`,
  `- 我要完善知识质量：${fileLink('处理待核验队列', reviewQueuePath)}`,
  `- 我要查看当前质量：${fileLink('打开系统审计报告', auditReportPath)}`,
  `- 我要看完整 RAG：${fileLink('打开 RAG 知识索引', folderIndexes[0].path)}`,
  `- 我要找动作：${fileLink('打开动作库索引', folderIndexes[1].path)}`,
  `- 我要找场景：${fileLink('打开场景库索引', folderIndexes[2].path)}`, '',
  '## 使用规则', '', '1. 方案生成可引用本库的标题、标签和摘要作为创作方向。', '2. 标记为 `metadata-only` 的页面，不能直接当作已验证的参数、地址或动作步骤。', '3. 拍摄完成后，在 PhotoAtelier 复盘中记录哪些知识真正有效，再将经验回流到 Obsidian。', ''
].join('\n');
const planIndex = ['---', 'title: "摄影方案生成索引"', 'type: index', 'ronin_generated: true', 'managed_file: true', 'tags: ["摄影知识", "方案生成", "检索"]', '---', '', '# 摄影方案生成索引', '', '> 按拍摄决策用途展开对应分组。这里仅使用现有标题、标签和适用问题聚合，不改变来源分类。', '', roleIndex].join('\n');
const workflowPage = ['---', 'title: "摄影工作流索引"', 'type: index', 'ronin_generated: true', 'managed_file: true', 'tags: ["摄影知识", "工作流", "检索"]', '---', '', '# 摄影工作流索引', '', '> 从灵感、策划、准备、现场、后期、发布到复盘，按当前任务阶段展开知识。', '', workflowIndex].join('\n');
const tagPage = ['---', 'title: "摄影标签索引"', 'type: index', 'ronin_generated: true', 'managed_file: true', 'tags: ["摄影知识", "标签", "检索"]', '---', '', '# 摄影标签索引', '', `> 当前显示使用频率最高的 ${topTags.length} 个标签。标签来自原始分类，不重新发明分类体系。`, '', tagIndex].join('\n');
const verificationPage = [
  '---', 'title: "摄影知识待核验队列"', 'type: index', 'ronin_generated: true', 'managed_file: true', 'tags: ["摄影知识", "待核验", "质量"]', '---', '', '# 摄影知识待核验队列', '',
  `> 当前 ${entries.filter(entry => entry.item.groundingStatus === 'metadata-only').length} 条知识仍为 metadata-only。先核验高频使用的构图、光线、动作、场景和色彩知识，再处理低频灵感。`, '',
  `## 没有直接原始链接（${missingDirectSource.length}）`, '',
  `> 其中 ${missingDirectSourceWithRag.length} 条已经关联回至少一个 RAG 页面；其余条目保留上游记录 ID，等待后续补齐来源。`, '',
  ...missingDirectSource.map(entry => `- ${makeLink(entry, reviewQueuePath)}`), '',
  '## 按用途展开全部待核验项', '', verificationByRole
].join('\n');

writeManagedIndex(path.join(outputRoot, '00_摄影知识库总览.md'), overview, result);
writeManagedIndex(path.join(outputRoot, '04_方案生成索引.md'), planIndex, result);
writeManagedIndex(path.join(outputRoot, '05_工作流索引.md'), workflowPage, result);
writeManagedIndex(path.join(outputRoot, '06_标签索引.md'), tagPage, result);
writeManagedIndex(path.join(outputRoot, '07_待核验队列.md'), verificationPage, result);
for (const folderIndex of folderIndexes) {
  const page = [
    '---', `title: "${folderIndex.title}"`, 'type: index', 'ronin_generated: true', 'managed_file: true', 'tags: ["摄影知识", "索引"]', '---', '',
    `# ${folderIndex.title}`, '', `> ${folderIndex.description}`, '',
    ...sortedEntries(folderIndex.items).map(entry => `- ${makeLink(entry, folderIndex.path)}`), ''
  ].join('\n');
  writeManagedIndex(path.join(vaultRoot, folderIndex.path), page, result);
}

console.log(JSON.stringify({
  dryRun,
  outputRoot,
  total: entries.length,
  created: result.created,
  updated: result.updated,
  appended: result.appended,
  skipped: result.skipped,
  protected: result.protected,
  folders: Object.fromEntries(['01_RAG知识', '02_动作库', '03_场景库'].map(folder => [folder, entries.filter(entry => entry.folder === folder).length]))
}, null, 2));

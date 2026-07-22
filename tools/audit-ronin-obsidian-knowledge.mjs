import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogFile = path.join(projectRoot, 'data', 'ronin-photography-knowledge.json');
const vaultRoot = path.resolve(process.env.RONIN_OBSIDIAN_VAULT || path.join(os.homedir(), 'Documents', 'Obsidian Vault'));
const knowledgeRoot = path.join(vaultRoot, '摄影知识库');
const writeReport = process.argv.includes('--write-report');

const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
const items = (catalog.items || []).filter(item => item.id && item.title);
const noteFiles = [];
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.md')) noteFiles.push(fullPath);
  }
}
walk(knowledgeRoot);

function countBy(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return counts;
}

function duplicateValues(values) {
  return [...countBy(values).entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
}

function percent(value) {
  return Math.round(value * 1000) / 10;
}

function frontMatter(raw) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  return Object.fromEntries(match[1].split(/\r?\n/).map(line => line.match(/^([\w-]+):\s*(.*)$/)).filter(Boolean).map(matchLine => [matchLine[1], matchLine[2].trim().replace(/^['"]|['"]$/g, '')]));
}

const knowledgeNotes = noteFiles.map(file => ({ file, raw: fs.readFileSync(file, 'utf8') })).map(note => ({ ...note, frontMatter: frontMatter(note.raw) })).filter(note => note.frontMatter.ronin_id);
const noteIds = new Set(knowledgeNotes.map(note => note.frontMatter.ronin_id));
const notesById = new Map(knowledgeNotes.map(note => [note.frontMatter.ronin_id, note]));
const missingNotes = items.filter(item => !noteIds.has(item.id));
const orphanNotes = knowledgeNotes.filter(note => !items.some(item => item.id === note.frontMatter.ronin_id));
const missingDirectUrl = items.filter(item => !item.sourceUrl);
const missingAnySource = items.filter(item => !item.sourceUrl && !(item.sourceIds || []).length);
const effectiveGrounding = item => notesById.get(item.id)?.frontMatter?.grounding_status || item.groundingStatus;
const metadataOnly = items.filter(item => effectiveGrounding(item) === 'metadata-only');
const sourceBacked = items.filter(item => effectiveGrounding(item) === 'source-backed');
const duplicateIds = duplicateValues(items.map(item => item.id));
const duplicateTitles = duplicateValues(items.map(item => item.title));
const duplicateUrls = duplicateValues(items.map(item => item.sourceUrl));
const validDomains = new Set(['www.xiaohongshu.com', 'xiaohongshu.com', 'www.douyin.com', 'douyin.com']);
const invalidUrls = items.filter(item => {
  if (!item.sourceUrl) return false;
  try { return !validDomains.has(new URL(item.sourceUrl).hostname); } catch { return true; }
});
const requiredChecks = items.flatMap(item => [
  Boolean(item.id), Boolean(item.title), Boolean(item.kind), Boolean(item.question), Boolean(item.snippet),
  Boolean((item.tags || []).length), Boolean((item.workflowStage || []).length), Boolean(item.sourceUrl || (item.sourceIds || []).length)
]);
const completeness = percent(requiredChecks.filter(Boolean).length / requiredChecks.length);
const noteCoverage = items.length ? noteIds.size / items.length : 0;
const consistency = percent((noteCoverage + (duplicateIds.length ? 0 : 1)) / 2);
const structuralValidity = 1 - ((invalidUrls.length + missingAnySource.length) / Math.max(1, items.length));
const groundingReadiness = sourceBacked.length / Math.max(1, items.length);
const validity = percent((structuralValidity * 0.6) + (groundingReadiness * 0.4));
const titleUniqueness = new Set(items.map(item => item.title)).size / Math.max(1, items.length);
const uniqueness = percent(((duplicateIds.length ? 0 : 1) + (duplicateUrls.length ? 0 : 1) + titleUniqueness) / 3);
const ageDays = Math.max(0, (Date.now() - Date.parse(catalog.generatedAt || 0)) / 86400000);
const timeliness = ageDays <= 7 ? 100 : ageDays <= 30 ? 80 : 50;
const dqs = Math.round((completeness * 0.30) + (consistency * 0.25) + (validity * 0.20) + (uniqueness * 0.15) + (timeliness * 0.10));

const indexFiles = noteFiles.filter(file => /索引|队列|总览/.test(path.basename(file)));
const brokenLinks = [];
for (const file of indexFiles) {
  const raw = fs.readFileSync(file, 'utf8');
  for (const match of raw.matchAll(/\[[^\]]+]\(([^)]+\.md)\)/g)) {
    const target = path.resolve(path.dirname(file), decodeURIComponent(match[1]));
    if (!fs.existsSync(target)) brokenLinks.push({ file: path.relative(vaultRoot, file).replace(/\\/g, '/'), target: match[1] });
  }
}

const audit = {
  generatedAt: new Date().toISOString(),
  dqs,
  dimensions: { completeness, consistency, validity, uniqueness, timeliness },
  groundingReadiness: percent(groundingReadiness),
  counts: {
    catalogItems: items.length,
    knowledgeNotes: knowledgeNotes.length,
    missingNotes: missingNotes.length,
    orphanNotes: orphanNotes.length,
    metadataOnly: metadataOnly.length,
    sourceBacked: sourceBacked.length,
    missingDirectUrl: missingDirectUrl.length,
    missingAnySource: missingAnySource.length,
    duplicateIds: duplicateIds.length,
    duplicateTitleGroups: duplicateTitles.length,
    duplicateUrls: duplicateUrls.length,
    invalidUrls: invalidUrls.length,
    brokenIndexLinks: brokenLinks.length,
  },
  duplicateTitles,
  brokenLinks,
};

if (writeReport) {
  const reportFile = path.join(knowledgeRoot, '08_系统审计报告.md');
  const verdict = groundingReadiness === 1 ? '内容已完成来源核验，可进入稳定复用阶段。' : '索引结构可用，但具体步骤和参数仍需按队列核验。';
  const report = [
    '---', 'title: "摄影知识库系统审计报告"', 'type: audit', 'ronin_generated: true', 'managed_file: true', `audit_date: "${new Date().toISOString()}"`, 'tags: ["摄影知识", "质量审计"]', '---', '',
    '# 摄影知识库系统审计报告', '', `> **DQS：${dqs}/100** — ${verdict}`, '', `> **可直接作为已核验知识使用：${audit.groundingReadiness}%**。DQS 衡量结构、完整性和一致性；它不等于内容已经实拍验证。`, '',
    '## 质量维度', '', '| 维度 | 得分 |', '|---|---:|', `| 完整性 | ${completeness} |`, `| 一致性 | ${consistency} |`, `| 有效性 | ${validity} |`, `| 唯一性 | ${uniqueness} |`, `| 时效性 | ${timeliness} |`, '',
    '## 已验证事实', '', `- 目录条目：${items.length}`, `- 对应 Obsidian 知识页：${knowledgeNotes.length}`, `- 缺失知识页：${missingNotes.length}`, `- 无归属知识页：${orphanNotes.length}`, `- metadata-only：${metadataOnly.length}`, `- source-backed：${sourceBacked.length}`, `- 无直接链接但有上游关联：${missingDirectUrl.length - missingAnySource.length}`, `- 完全没有来源关联：${missingAnySource.length}`, `- 重复 ID：${duplicateIds.length}`, `- 重复标题组：${duplicateTitles.length}`, `- 重复原始链接：${duplicateUrls.length}`, `- 无效来源域名：${invalidUrls.length}`, `- 索引断链：${brokenLinks.length}`, '',
    '## 使用影响', '', '- 当前知识适合用于检索、构思、方案候选和拍摄前检查。', '- 未升级为 `source-backed` 的页面，不应直接提供确定参数、地址、灯位或动作口令。', '- 重复标题保留为独立来源，索引中已补充平台和 ID 以便区分。', '',
    '## 下一轮治理顺序', '', '1. 先核验构图、光线、动作、场景、运镜和色彩中的高频条目。', '2. 核验后更新页面属性 `grounding_status: source-backed` 与 `verification_status: verified`。', '3. 在“我的验证与补充”记录有效条件、无效条件、参数和复盘链接。', '4. 刷新 PhotoAtelier 本地索引，让 Agent 使用更新后的状态和个人补充。', ''
  ].join('\n');
  const current = fs.existsSync(reportFile) ? fs.readFileSync(reportFile, 'utf8') : '';
  if (!current || current.includes('ronin_generated: true')) fs.writeFileSync(reportFile, report, 'utf8');
}

console.log(JSON.stringify(audit, null, 2));

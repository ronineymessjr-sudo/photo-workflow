import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.resolve(process.env.RONIN_SHOOTING_INDEX_ROOT || path.join(os.homedir(), 'feishu-shooting-index'));
const outputFile = path.join(projectRoot, 'data', 'ronin-photography-knowledge.json');

function readTable(filename) {
  const fullPath = path.join(sourceRoot, filename);
  const payload = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  return (payload.rows || []).map(row => Object.fromEntries((payload.fields || []).map((field, index) => [field, row[index]])));
}

function strings(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  return String(value || '').split(/[，,]/).map(item => item.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values.flatMap(strings))];
}

function frequency(items, select) {
  const counts = new Map();
  for (const item of items) {
    for (const value of unique([select(item)])) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN')));
}

function buildProfile(items) {
  return {
    groundingStatus: frequency(items, item => item.groundingStatus),
    workflowStages: frequency(items, item => item.workflowStage),
    sourcePlatforms: frequency(items, item => item.sourcePlatform),
    topTags: Object.fromEntries(Object.entries(frequency(items, item => item.tags)).slice(0, 40)),
  };
}

function ragItem(row) {
  const groundingStatus = row['内容依据'] === '标题与元数据' ? 'metadata-only' : 'source-backed';
  return {
    id: row['Chunk ID'],
    type: 'knowledge',
    kind: 'rag_chunk',
    title: row['知识块标题'],
    sourceType: 'ronin-rag',
    sourcePlatform: strings(row['来源平台']),
    sourceUrl: row['原始链接'] || null,
    question: row['适用问题'] || '',
    snippet: row['内容摘要'] || '',
    content: row['检索文本'] || row['内容摘要'] || '',
    tags: unique([row['内容细分类'], row['实体关键词']]),
    workflowStage: strings(row['知识阶段']),
    groundingStatus,
    confidence: row['分类置信度'] || '',
    status: row['RAG 状态'] || '',
    sourceIds: (row['来源灵感'] || []).map(item => item?.id).filter(Boolean),
    sourceSnapshot: row['处理批次'] || '',
  };
}

function actionItem(row) {
  return {
    id: row['动作 ID'],
    type: 'knowledge',
    kind: 'action',
    title: row['动作名称'],
    sourceType: 'ronin-action-library',
    sourcePlatform: [],
    sourceUrl: null,
    question: '拍摄人物时可以怎样引导动作？',
    snippet: row['动作口令'] || '',
    content: [row['动作类型'], row['动作口令'], row['适用主题'], row['适用景别']].flatMap(strings).join('；'),
    tags: unique([row['动作类型'], row['适用主题'], row['适用景别']]),
    workflowStage: ['拍摄策划', '现场执行'],
    groundingStatus: 'metadata-only',
    confidence: row['难度'] === '待确认' ? 'needs-review' : '',
    status: row['同步状态'] || '',
    sourceIds: (row['来源灵感'] || []).map(item => item?.id).filter(Boolean),
    sourceSnapshot: 'generated-actions.json',
  };
}

function sceneItem(row) {
  return {
    id: row['场景 ID'],
    type: 'knowledge',
    kind: 'scene',
    title: row['场景名称'],
    sourceType: 'ronin-scene-library',
    sourcePlatform: [],
    sourceUrl: null,
    question: '当前拍摄主题适合什么场景、时间和光线？',
    snippet: row['地址备注'] || '',
    content: [row['场景类型'], row['室内外'], row['最佳时间'], row['光线条件'], row['天气条件'], row['许可要求'], row['地址备注']].flatMap(strings).join('；'),
    tags: unique([row['场景类型'], row['室内外'], row['最佳时间'], row['光线条件']]),
    workflowStage: ['拍摄准备', '拍摄策划'],
    groundingStatus: 'metadata-only',
    confidence: row['费用'] === '待确认' ? 'needs-review' : '',
    status: row['同步状态'] || '',
    sourceIds: (row['来源灵感'] || []).map(item => item?.id).filter(Boolean),
    sourceSnapshot: 'generated-scenes.json',
  };
}

const rag = [...readTable('rag-chunks-0.json'), ...readTable('rag-chunks-200.json')].map(ragItem);
const actions = readTable('generated-actions.json').map(actionItem);
const scenes = readTable('generated-scenes.json').map(sceneItem);
const items = [...rag, ...actions, ...scenes].filter(item => item.id && item.title);

const payload = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  sourceRoot,
  rightsBoundary: 'metadata-and-links-only',
  stats: { total: items.length, rag: rag.length, actions: actions.length, scenes: scenes.length },
  profile: buildProfile(items),
  items,
};

fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputFile, ...payload.stats }, null, 2));

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PHOTOATELIER_OBSIDIAN_PROXY_PORT || 8124);
const VAULT_ROOT = path.resolve(process.env.PHOTOATELIER_OBSIDIAN_VAULT || path.join(os.homedir(), 'Documents', 'Obsidian Vault'));
const DEFAULT_LIBRARY = process.env.PHOTOATELIER_OBSIDIAN_LIBRARY || '.';
const WRITE_ROOT = path.join(VAULT_ROOT, 'PhotoAtelier', '复盘回流');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CANDIDATE_FILE = path.join(PROJECT_ROOT, 'data', 'daily-candidates.json');
const RONIN_CATALOG_FILE = path.resolve(process.env.PHOTOATELIER_RONIN_CATALOG || path.join(PROJECT_ROOT, 'data', 'ronin-photography-knowledge.json'));
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.heic']);
const ALLOWED_ORIGINS = new Set(['http://127.0.0.1:8123', 'http://localhost:8123']);
const MAX_BODY_BYTES = 256 * 1024;

let cache = null;

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function safeLibraryRoot(libraryFolder) {
  const requested = path.resolve(VAULT_ROOT, String(libraryFolder || DEFAULT_LIBRARY));
  if (!isInside(VAULT_ROOT, requested)) throw new Error('libraryFolder 超出 Obsidian 库范围');
  return requested;
}

function responseHeaders(req, contentType = 'application/json; charset=utf-8') {
  const origin = req.headers.origin;
  const allowOrigin = !origin || ALLOWED_ORIGINS.has(origin) ? (origin || 'http://127.0.0.1:8123') : 'null';
  return {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
}

function send(req, res, status, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, { ...responseHeaders(req), 'Content-Length': body.length, ...extraHeaders });
  res.end(body);
}

function validateOrigin(req) {
  const origin = req.headers.origin;
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { reject(new Error('请求内容过大')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (_) { reject(new Error('JSON 格式错误')); }
    });
    req.on('error', reject);
  });
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.obsidian' || entry.name === '.trash' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, out);
    else if (entry.isFile()) out.push(fullPath);
  }
  return out;
}

function parseFrontMatter(raw) {
  const match = String(raw).match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const output = {};
  match[1].split(/\r?\n/).forEach(line => {
    const field = line.match(/^([\w-]+):\s*(.*)$/);
    if (!field) return;
    const value = field[2].trim().replace(/^['"]|['"]$/g, '');
    output[field[1]] = /^\[.*\]$/.test(value) ? value.slice(1, -1).split(',').map(item => item.trim()).filter(Boolean) : value;
  });
  return output;
}

function stripMarkdown(text) {
  return String(text)
    .replace(/^---[\s\S]*?---/m, ' ')
    .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1')
    .replace(/!\[\[([^\]]+)]]/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?]]/g, '$1')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[`*_>#|~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMarkdownRelations(raw) {
  const embeds = [];
  const links = [];
  let match;
  const wikiEmbed = /!\[\[([^\]|#]+)(?:[|#][^\]]*)?]]/g;
  const markdownEmbed = /!\[[^\]]*]\(([^)]+)\)/g;
  const wikiLink = /(?<!!)\[\[([^\]|#]+)(?:[|#][^\]]*)?]]/g;
  while ((match = wikiEmbed.exec(raw))) embeds.push(decodeURIComponent(match[1].trim()));
  while ((match = markdownEmbed.exec(raw))) embeds.push(decodeURIComponent(match[1].trim().replace(/^<|>$/g, '')));
  while ((match = wikiLink.exec(raw))) links.push(match[1].trim());
  return { embeds: [...new Set(embeds)], links: [...new Set(links)] };
}

function fileHash(file) {
  const hash = crypto.createHash('sha1');
  const fd = fs.openSync(file, 'r');
  try {
    const stat = fs.fstatSync(fd);
    const buffer = Buffer.alloc(Math.min(stat.size, 1024 * 1024));
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    hash.update(buffer);
    hash.update(String(stat.size));
    return hash.digest('hex');
  } finally { fs.closeSync(fd); }
}

function readImageDimensions(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(64 * 1024);
    const length = fs.readSync(fd, buffer, 0, buffer.length, 0);
    const data = buffer.subarray(0, length);
    if (data.length >= 24 && data.toString('ascii', 1, 4) === 'PNG') {
      return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), orientation: 1 };
    }
    if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
      const kind = data.toString('ascii', 12, 16);
      if (kind === 'VP8X' && data.length >= 30) {
        return { width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3), orientation: 1 };
      }
    }
    if (data[0] === 0xff && data[1] === 0xd8) {
      const exif = readJpegExif(data);
      let offset = 2;
      while (offset + 9 < data.length) {
        if (data[offset] !== 0xff) { offset += 1; continue; }
        const marker = data[offset + 1];
        const blockLength = data.readUInt16BE(offset + 2);
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          return { width: data.readUInt16BE(offset + 7), height: data.readUInt16BE(offset + 5), orientation: exif.orientation || 1, ...exif };
        }
        if (blockLength < 2) break;
        offset += 2 + blockLength;
      }
      return exif;
    }
    return {};
  } finally { fs.closeSync(fd); }
}

function readJpegExif(data) {
  const output = {};
  let offset = 2;
  while (offset + 10 < data.length) {
    if (data[offset] !== 0xff) { offset += 1; continue; }
    const marker = data[offset + 1];
    const length = data.readUInt16BE(offset + 2);
    if (marker === 0xe1 && data.toString('ascii', offset + 4, offset + 10) === 'Exif\0\0') {
      parseTiffExif(data, offset + 10, output);
      break;
    }
    if (length < 2) break;
    offset += 2 + length;
  }
  return output;
}

function parseTiffExif(data, base, output) {
  if (base + 8 > data.length) return;
  const little = data.toString('ascii', base, base + 2) === 'II';
  const u16 = pos => little ? data.readUInt16LE(pos) : data.readUInt16BE(pos);
  const u32 = pos => little ? data.readUInt32LE(pos) : data.readUInt32BE(pos);
  function readAscii(entry, count) {
    const valueOffset = count <= 4 ? entry + 8 : base + u32(entry + 8);
    if (valueOffset < base || valueOffset + count > data.length) return '';
    return data.toString('utf8', valueOffset, valueOffset + count).replace(/\0+$/, '').trim();
  }
  function parseIfd(relative, allowExifPointer) {
    const start = base + relative;
    if (start < base || start + 2 > data.length) return;
    const count = Math.min(u16(start), 256);
    for (let i = 0; i < count; i += 1) {
      const entry = start + 2 + i * 12;
      if (entry + 12 > data.length) break;
      const tag = u16(entry), type = u16(entry + 2), itemCount = u32(entry + 4);
      if (tag === 0x0112 && type === 3) output.orientation = u16(entry + 8);
      if (tag === 0x010f) output.cameraMake = readAscii(entry, itemCount);
      if (tag === 0x0110) output.cameraModel = readAscii(entry, itemCount);
      if (tag === 0x0132) output.dateTime = readAscii(entry, itemCount);
      if (tag === 0x9003) output.dateTimeOriginal = readAscii(entry, itemCount);
      if (tag === 0xa434) output.lensModel = readAscii(entry, itemCount);
      if (allowExifPointer && tag === 0x8769) parseIfd(u32(entry + 8), false);
    }
  }
  try { parseIfd(u32(base + 4), true); } catch (_) {}
}

function resolveEmbed(notePath, embed, libraryRoot, allFilesByName) {
  const clean = embed.split(/[?#]/)[0];
  const candidates = [path.resolve(path.dirname(notePath), clean), path.resolve(libraryRoot, clean), allFilesByName.get(path.basename(clean).toLowerCase())].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate) && isInside(VAULT_ROOT, candidate)) || '';
}

function inferWorkflowStage(text) {
  if (/调色|LUT|后期|color/i.test(text)) return 'color-grading';
  if (/标题|文案|发布|SEO/i.test(text)) return 'publishing';
  if (/复盘|反馈|出片率/i.test(text)) return 'review';
  if (/姿势|构图|镜头|机位|光线/i.test(text)) return 'shot-planning';
  return 'inspiration';
}

function loadRoninKnowledge(documents = []) {
  if (!fs.existsSync(RONIN_CATALOG_FILE)) return [];
  const payload = JSON.parse(fs.readFileSync(RONIN_CATALOG_FILE, 'utf8'));
  const mirrors = new Map(documents.filter(document => document.canonicalKnowledgeId).map(document => [document.canonicalKnowledgeId, document]));
  return (payload.items || []).map(item => {
    const mirror = mirrors.get(item.id);
    const tags = [...new Set((item.tags || []).map(tag => String(tag).trim()).filter(Boolean))];
    const workflowStage = Array.isArray(item.workflowStage) ? item.workflowStage : [item.workflowStage].filter(Boolean);
    const groundingStatus = mirror?.frontMatter?.grounding_status || item.groundingStatus || 'metadata-only';
    const text = [item.question, item.snippet, item.content, tags.join(' '), workflowStage.join(' '), mirror?.text].filter(Boolean).join(' ');
    return {
      id: item.id,
      type: 'knowledge',
      kind: item.kind || 'knowledge',
      title: item.title || item.id,
      filename: `ronin://${item.kind || 'knowledge'}/${item.id}`,
      sourceType: item.sourceType || 'ronin-knowledge',
      sourcePlatform: item.sourcePlatform || [],
      sourceUrl: item.sourceUrl || null,
      question: item.question || '',
      snippet: item.snippet || '',
      text,
      lower: `${item.title || ''} ${text}`.toLowerCase(),
      tags,
      workflowStage,
      groundingStatus,
      requiresVerification: groundingStatus === 'metadata-only',
      confidence: item.confidence || '',
      validationStatus: mirror?.frontMatter?.verification_status || item.status || 'indexed',
      obsidianPath: mirror?.filename || null,
      sourceIds: item.sourceIds || [],
      updatedAt: payload.generatedAt || '',
      mtimeMs: Date.parse(payload.generatedAt || 0) || 0,
    };
  }).filter(item => item.id && item.title);
}

function buildIndex(libraryFolder) {
  const libraryRoot = safeLibraryRoot(libraryFolder);
  const files = walk(libraryRoot);
  const filesByName = new Map(files.map(file => [path.basename(file).toLowerCase(), file]));
  const assetsByPath = new Map();
  const assets = files.filter(file => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())).map(file => {
    const stat = fs.statSync(file);
    const dimensions = readImageDimensions(file);
    const item = {
      id: `asset-${crypto.createHash('sha1').update(path.relative(VAULT_ROOT, file).toLowerCase()).digest('hex').slice(0, 16)}`,
      type: 'asset', title: path.basename(file, path.extname(file)), filename: path.relative(VAULT_ROOT, file).replace(/\\/g, '/'),
      fullPath: file, extension: path.extname(file).toLowerCase(), size: stat.size, mtimeMs: stat.mtimeMs,
      width: dimensions.width || 0, height: dimensions.height || 0,
      orientation: dimensions.width && dimensions.height ? (dimensions.width > dimensions.height ? 'landscape' : dimensions.height > dimensions.width ? 'portrait' : 'square') : 'unknown',
      exifOrientation: dimensions.orientation || 1, cameraMake: dimensions.cameraMake || '', cameraModel: dimensions.cameraModel || '',
      lensModel: dimensions.lensModel || '', dateTimeOriginal: dimensions.dateTimeOriginal || dimensions.dateTime || '',
      contentHash: fileHash(file), perceptualHash: '', licenseClass: 'local-private-reference', validationStatus: 'local-verified',
      workflowStage: inferWorkflowStage(file), noteIds: [], tags: [], sourceUrl: '', updatedAt: new Date(stat.mtimeMs).toISOString()
    };
    assetsByPath.set(path.resolve(file).toLowerCase(), item);
    return item;
  });

  const documents = files.filter(file => path.extname(file).toLowerCase() === '.md').map(file => {
    const raw = fs.readFileSync(file, 'utf8');
    const stat = fs.statSync(file);
    const frontMatter = parseFrontMatter(raw);
    const text = stripMarkdown(raw);
    const relations = extractMarkdownRelations(raw);
    const id = `doc-${crypto.createHash('sha1').update(path.relative(VAULT_ROOT, file).toLowerCase()).digest('hex').slice(0, 16)}`;
    const embeddedAssets = relations.embeds.map(embed => resolveEmbed(file, embed, libraryRoot, filesByName)).filter(Boolean).map(resolved => assetsByPath.get(path.resolve(resolved).toLowerCase())).filter(Boolean);
    const tags = [...new Set([...(Array.isArray(frontMatter.tags) ? frontMatter.tags : String(frontMatter.tags || '').split(',')), ...(raw.match(/#[\p{L}\p{N}_/-]+/gu) || []).map(tag => tag.slice(1))].map(tag => String(tag).trim()).filter(Boolean))];
    embeddedAssets.forEach(asset => { asset.noteIds.push(id); asset.tags = [...new Set([...asset.tags, ...tags])]; asset.workflowStage = inferWorkflowStage(`${asset.workflowStage} ${text}`); });
    return {
      id, type: 'document', title: frontMatter.title || path.basename(file, '.md'), filename: path.relative(VAULT_ROOT, file).replace(/\\/g, '/'),
      fullPath: file, text, lower: `${path.relative(VAULT_ROOT, file)} ${text} ${tags.join(' ')}`.toLowerCase(),
      frontMatter, tags, links: relations.links, embeddedAssetIds: embeddedAssets.map(asset => asset.id),
      managedGenerated: Boolean(frontMatter.ronin_generated),
      knowledgeMirror: Boolean(frontMatter.ronin_generated && frontMatter.ronin_id),
      canonicalKnowledgeId: frontMatter.ronin_id || null,
      workflowStage: inferWorkflowStage(text), licenseClass: frontMatter.license || 'local-private-reference',
      validationStatus: 'local-verified', mtimeMs: stat.mtimeMs, size: stat.size, updatedAt: new Date(stat.mtimeMs).toISOString()
    };
  });

  const knowledgeSources = loadRoninKnowledge(documents);
  const catalogMtime = fs.existsSync(RONIN_CATALOG_FILE) ? fs.statSync(RONIN_CATALOG_FILE).mtimeMs : 0;
  const index = {
    indexVersion: crypto.createHash('sha1').update(JSON.stringify({ files: files.map(file => [file, fs.statSync(file).mtimeMs]), catalogMtime })).digest('hex').slice(0, 12),
    generatedAt: new Date().toISOString(), libraryFolder: path.relative(VAULT_ROOT, libraryRoot).replace(/\\/g, '/'), libraryRoot,
    documents, assets, knowledgeSources
  };
  cache = index;
  return index;
}

function getIndex(libraryFolder, force = false) {
  const normalized = path.relative(VAULT_ROOT, safeLibraryRoot(libraryFolder)).replace(/\\/g, '/');
  if (!force && cache && cache.libraryFolder === normalized) return cache;
  return buildIndex(libraryFolder);
}

function makeExcerpt(text, terms) {
  const lower = text.toLowerCase();
  const hit = terms.map(term => lower.indexOf(term)).filter(index => index >= 0).sort((a, b) => a - b)[0] || 0;
  return text.slice(Math.max(0, hit - 70), Math.max(0, hit - 70) + 220);
}

function searchIndex(params) {
  const index = getIndex(params.libraryFolder);
  const terms = String(params.query || '').toLowerCase().split(/\s+/).map(term => term.trim()).filter(Boolean);
  const type = params.type || 'all';
  const items = type === 'document'
    ? index.documents
    : type === 'asset'
      ? index.assets
      : type === 'knowledge'
        ? index.knowledgeSources
        : [...index.documents.filter(item => !item.managedGenerated), ...index.assets, ...index.knowledgeSources];
  const filtered = items.filter(item => {
    if (params.orientation && params.orientation !== 'all' && item.orientation !== params.orientation) return false;
    if (params.license && params.license !== 'all' && item.licenseClass !== params.license) return false;
    if (params.workflowStage && params.workflowStage !== 'all') {
      const stages = Array.isArray(item.workflowStage) ? item.workflowStage : [item.workflowStage];
      if (!stages.includes(params.workflowStage)) return false;
    }
    if (params.camera && !`${item.cameraMake || ''} ${item.cameraModel || ''}`.toLowerCase().includes(String(params.camera).toLowerCase())) return false;
    if (params.lens && !String(item.lensModel || '').toLowerCase().includes(String(params.lens).toLowerCase())) return false;
    if (params.tag && !(item.tags || []).some(tag => tag.toLowerCase().includes(String(params.tag).toLowerCase()))) return false;
    return true;
  });
  return filtered.map(item => {
    const hay = `${item.filename} ${item.title} ${item.text || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
    let score = terms.length ? 0 : 1;
    terms.forEach(term => {
      if (String(item.title).toLowerCase().includes(term)) score += 12;
      if (String(item.filename).toLowerCase().includes(term)) score += 8;
      const matches = hay.split(term).length - 1;
      if (matches > 0) score += Math.min(16, matches * 2);
    });
    return { ...item, fullPath: undefined, score, matches: score > 0 ? [{ context: makeExcerpt(item.text || item.filename, terms) }] : [] };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || b.mtimeMs - a.mtimeMs).slice(0, Math.min(100, Number(params.limit || 20)));
}

const KNOWLEDGE_STOP_TERMS = new Set(['一个', '一些', '可以', '怎么', '如何', '内容', '相关', '方案', '项目', '摄影', '拍摄', '照片', '效果', '使用', '进行', '完成', '需要']);
const ROLE_LABELS = {
  action: '动作引导', scene: '场景勘察', composition: '构图与机位', lighting: '光线', movement: '运镜',
  style: '风格表达', color: '色彩', post: '后期与发布', workflow: '拍摄流程', general: '通用灵感'
};

function queryTerms(brief = {}, instruction = '') {
  const fields = [
    [brief.locationIntent || brief.location, 10], [brief.theme, 9], [brief.style, 9], [brief.shootingType, 8],
    [brief.goal, 8], [brief.mood, 7], [brief.dateIntent || brief.date, 6], [brief.deliverableTarget || brief.deliverables, 5],
    [brief.notes || brief.brief, 4], [brief.constraints, 4], [instruction, 9]
  ];
  const weighted = new Map();
  for (const [rawValue, weight] of fields) {
    const rawItems = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const rawItem of rawItems) {
      const segments = String(rawItem || '').toLowerCase().split(/[\s,，。；;、/|：:（）()【】\[\]]+/).filter(Boolean);
      for (const segment of segments) {
        const tokens = [segment];
        if (/^[\p{Script=Han}]+$/u.test(segment) && segment.length > 2) {
          for (const size of [2, 3, 4]) {
            for (let index = 0; index <= segment.length - size; index += 1) tokens.push(segment.slice(index, index + size));
          }
        }
        for (const token of tokens) {
          if (token.length < 2 || KNOWLEDGE_STOP_TERMS.has(token)) continue;
          weighted.set(token, Math.max(weighted.get(token) || 0, weight));
        }
      }
    }
  }
  return [...weighted.entries()].map(([term, weight]) => ({ term, weight }));
}

function inferKnowledgeRole(item) {
  if (item.kind === 'action') return 'action';
  if (item.kind === 'scene') return 'scene';
  const category = String((item.tags || [])[0] || '');
  const primary = `${item.title || ''} ${(item.tags || []).join(' ')}`;
  const fallback = `${primary} ${item.question || ''}`;
  const classify = text => {
    if (/姿势|动作|表情|手部|站姿|坐姿|不露脸|道具|走动|转圈/.test(text)) return 'action';
    if (/构图|景别|前景|焦段|机位|视角|广角|长焦|透视/.test(text)) return 'composition';
    if (/运镜|镜头运动|一镜到底|推拉摇移|稳定器|转场/.test(text)) return 'movement';
    if (/光线|灯光|布光|逆光|侧光|闪光|补光|柔光|硬光|蓝调时刻|夜景/.test(text)) return 'lighting';
    if (/调色|色彩|达芬奇|LUT|滤镜|肤色|色温/.test(text)) return 'color';
    if (/剪辑|字幕|排版|修图|Photoshop|发布|封面|声音设计|降噪/.test(text)) return 'post';
    if (/场景|地点|海边|街头|建筑|咖啡馆|校园|公园|棚拍|室内|室外|勘景/.test(text)) return 'scene';
    if (/氛围感|电影感|高级感|复古|古风|情绪|风格/.test(text)) return 'style';
    if (/工作流|器材|相机|镜头|参数|设置|备份|拍摄准备|文件管理/.test(text)) return 'workflow';
    return null;
  };
  return classify(category) || classify(primary) || classify(fallback) || 'general';
}

function requestedKnowledgeRoles(brief = {}) {
  const text = Object.values(brief).flatMap(value => Array.isArray(value) ? value : [value]).join(' ');
  const roles = ['composition', 'lighting', 'workflow'];
  if (/人像|人物|模特|肖像|写真/.test(text)) roles.push('action', 'style');
  if (brief.locationIntent || brief.location || /场景|室内|室外|海边|街头|校园|公园|棚拍/.test(text)) roles.push('scene');
  if (/视频|短片|短视频|vlog|reel|抖音|小红书/i.test(text)) roles.push('movement', 'post');
  if (/精修|成片|照片|调色|电影感/.test(text)) roles.push('color');
  return [...new Set(roles)];
}

function isPhotographyDocument(item) {
  if (item.type !== 'document') return false;
  if (item.managedGenerated) return false;
  const topLevelFolder = String(item.filename || '').replace(/\\/g, '/').split('/')[0];
  if (topLevelFolder === '\u6444\u5f71\u77e5\u8bc6\u5e93') return false;
  return /摄影|拍摄|构图|姿势|人像|镜头|调色|灯光|photoatelier|photography/i.test(`${item.filename || ''} ${(item.tags || []).join(' ')} ${item.title || ''}`);
}

function scoreKnowledgeCandidate(item, terms, desiredRoles) {
  const role = inferKnowledgeRole(item);
  const title = String(item.title || '').toLowerCase();
  const tags = (item.tags || []).map(tag => String(tag).toLowerCase());
  const haystack = `${title} ${tags.join(' ')} ${item.question || ''} ${item.text || item.snippet || ''}`.toLowerCase();
  const matchedTerms = [];
  let score = desiredRoles.includes(role) ? 8 : 0;
  for (const { term, weight } of terms) {
    let matched = false;
    if (title.includes(term)) { score += weight * 4; matched = true; }
    if (tags.some(tag => tag.includes(term) || term.includes(tag))) { score += weight * 3; matched = true; }
    if (!matched && haystack.includes(term)) { score += weight; matched = true; }
    if (matched) matchedTerms.push(term);
  }
  if (item.kind === 'scene' && matchedTerms.length) score += 18;
  if (item.kind === 'action' && desiredRoles.includes('action')) score += 10;
  if (item.type === 'document') score += 6;
  return { role, score, matchedTerms: [...new Set(matchedTerms)].slice(0, 6) };
}

function normalizeRecommendedSource(item, ranking, selectionMode = 'automatic') {
  const groundingStatus = item.groundingStatus || (item.type === 'document' ? 'vault-note' : 'metadata-only');
  const requiresVerification = groundingStatus === 'metadata-only' || item.confidence === 'needs-review';
  const matched = ranking.matchedTerms.length ? `匹配 ${ranking.matchedTerms.slice(0, 3).join('、')}` : `补齐${ROLE_LABELS[ranking.role]}依据`;
  return {
    id: item.id,
    type: 'knowledge',
    kind: item.kind || (item.type === 'document' ? 'vault_note' : 'knowledge'),
    title: item.title,
    sourceType: item.sourceType || (item.type === 'document' ? 'obsidian' : 'ronin-knowledge'),
    sourcePlatform: item.sourcePlatform || [],
    path: item.obsidianPath || item.filename || item.path || null,
    sourceUrl: item.sourceUrl || null,
    excerpt: String(item.snippet || item.text || item.excerpt || '').slice(0, 1200),
    tags: item.tags || [],
    workflowStage: Array.isArray(item.workflowStage) ? item.workflowStage : [item.workflowStage].filter(Boolean),
    groundingStatus,
    selectionRole: ranking.role,
    selectionMode,
    whyMatched: selectionMode === 'manual' ? '用户手动选入项目知识上下文' : matched,
    matchedTerms: ranking.matchedTerms,
    score: Math.round(ranking.score),
    requiresVerification,
  };
}

function recommendKnowledgeContext(options = {}) {
  const index = getIndex(options.libraryFolder || DEFAULT_LIBRARY);
  const brief = options.brief || {};
  const limit = Math.min(12, Math.max(1, Number(options.limit || 12)));
  const desiredRoles = requestedKnowledgeRoles(brief);
  const terms = queryTerms(brief, options.instruction || '');
  const indexedCandidates = [...index.knowledgeSources, ...index.documents.filter(isPhotographyDocument)];
  const ranked = indexedCandidates.map(item => ({ item, ...scoreKnowledgeCandidate(item, terms, desiredRoles) }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.item.mtimeMs - a.item.mtimeMs || String(a.item.id).localeCompare(String(b.item.id)));
  const selected = [];
  const ids = new Set();
  const roleCounts = new Map();
  const kindCounts = new Map();
  const add = (item, ranking, mode = 'automatic', enforceQuota = true) => {
    if (!item?.id || !item?.title || ids.has(item.id) || selected.length >= limit) return false;
    const role = ranking.role || inferKnowledgeRole(item);
    const kind = item.type === 'document' ? 'document' : item.kind || 'knowledge';
    if (enforceQuota && ((roleCounts.get(role) || 0) >= 3 || (kind === 'scene' && (kindCounts.get(kind) || 0) >= 2) || (kind === 'action' && (kindCounts.get(kind) || 0) >= 2) || (kind === 'document' && (kindCounts.get(kind) || 0) >= 2))) return false;
    selected.push(normalizeRecommendedSource(item, { ...ranking, role }, mode));
    ids.add(item.id);
    roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    kindCounts.set(kind, (kindCounts.get(kind) || 0) + 1);
    return true;
  };
  for (const item of options.manuallySelectedKnowledgeSources || []) {
    add(item, scoreKnowledgeCandidate(item, terms, desiredRoles), 'manual', false);
  }
  for (const role of desiredRoles) {
    const candidate = ranked.find(entry => entry.role === role && !ids.has(entry.item.id));
    if (candidate) add(candidate.item, candidate);
  }
  const vaultCandidate = ranked.find(entry => entry.item.type === 'document' && !ids.has(entry.item.id));
  if (vaultCandidate) add(vaultCandidate.item, vaultCandidate);
  if (desiredRoles.includes('scene')) {
    const structuredScene = ranked.find(entry => entry.item.kind === 'scene' && !ids.has(entry.item.id));
    if (structuredScene) add(structuredScene.item, structuredScene);
  }
  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    add(candidate.item, candidate);
  }
  const coverage = Object.fromEntries(desiredRoles.map(role => [role, selected.filter(item => item.selectionRole === role).length]));
  const query = [brief.shootingType, brief.theme || brief.goal, brief.style, brief.mood, brief.locationIntent || brief.location, brief.deliverableTarget || brief.deliverables, options.instruction].filter(Boolean).join(' | ');
  return {
    items: selected,
    retrieval: {
      mode: 'brief-auto-plus-manual', query, requestedRoles: desiredRoles, coverage,
      manualCount: selected.filter(item => item.selectionMode === 'manual').length,
      autoCount: selected.filter(item => item.selectionMode === 'automatic').length,
      candidatesEvaluated: ranked.length, indexVersion: index.indexVersion, generatedAt: new Date().toISOString()
    },
    policy: {
      maxSources: 12, metadataOnlyUse: 'idea-candidate', requiresOriginalSourceVerification: true,
      forbidInventedParameters: true, sceneRequiresLocationConfirmation: true
    }
  };
}

function sanitizeFilename(value) {
  return String(value || '未命名复盘').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || '未命名复盘';
}

function writeReviewNote(payload) {
  const project = payload.project || {};
  const plan = payload.plan || {};
  const review = payload.review || {};
  if (!plan.id || !review.planId || String(plan.id) !== String(review.planId)) throw new Error('方案与复盘 ID 不一致');
  fs.mkdirSync(WRITE_ROOT, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const title = project.title || plan.title || plan.concept || plan.input?.theme || '摄影复盘';
  const knowledgeGuidance = Array.isArray(review.knowledgeGuidanceSnapshot) ? review.knowledgeGuidanceSnapshot : [];
  const filename = `${date}-${sanitizeFilename(title)}-${sanitizeFilename(plan.id)}.md`;
  const fullPath = path.join(WRITE_ROOT, filename);
  if (!isInside(WRITE_ROOT, fullPath)) throw new Error('回流文件名无效');
  const yaml = value => String(value == null ? '' : value).replace(/"/g, '\\"');
  const lines = [
    '---',
    `projectId: "${yaml(project.id || plan.projectId || '')}"`,
    `planId: "${yaml(plan.id)}"`,
    `shootDate: "${yaml(project.date || plan.scheduledAt || '')}"`,
    `style: "${yaml(project.style || plan.input?.style || '')}"`,
    `deliveryStatus: "${yaml(plan.deliveryStatus || '')}"`,
    `planScore: ${Number(review.planScore || 0)}`,
    `executionScore: ${Number(review.executionScore || 0)}`,
    `keepRate: ${Number(review.keepRate || 0)}`,
    `knowledgeValidationStatus: "${yaml(review.knowledgeValidationStatus || 'not-applicable')}"`,
    `knowledgeSourceIds: [${(review.knowledgeSourceIds || []).map(id => `"${yaml(id)}"`).join(', ')}]`,
    `created: ${new Date().toISOString()}`,
    'type: photography-review',
    'tags: [PhotoAtelier, 摄影复盘]',
    '---',
    '',
    `# ${title}`,
    '',
    `- 地点：${project.location || plan.input?.scene || ''}`,
    `- 拍摄类型：${project.shootingType || ''}`,
    `- 后期版本：${review.finalGrade || plan.editVersion || ''}`,
    '', '## 方案知识依据',
    knowledgeGuidance.length
      ? knowledgeGuidance.map(item => `- ${item.title || item.sourceId}（${item.role || 'general'}）｜${item.verificationRequired ? '拍摄后需核验有效性' : '已作为本地知识使用'}｜${item.sourceId || ''}`).join('\n')
      : '本方案未记录知识来源。',
    '',
    '## 有效方案与姿势', review.successes || review.bestPoses || '待补充',
    '', '## 失败镜头与动作', review.failures || review.failedActions || '待补充',
    '', '## 光线问题', review.lightingIssues || '待补充',
    '', '## 客户反馈', review.clientFeedback || '待补充',
    '', '## 可复用经验', review.reusableInsights || '待补充',
    '', '## 下次改进', review.nextActions || '待补充', ''
  ];
  fs.writeFileSync(fullPath, lines.join('\n'), { encoding: 'utf8', flag: 'w' });
  cache = null;
  return { filename: path.relative(VAULT_ROOT, fullPath).replace(/\\/g, '/'), writtenAt: new Date().toISOString() };
}

function buildCandidates(options = {}) {
  const referencePath = path.join(PROJECT_ROOT, 'assets', 'reference-database.json');
  const collectionPath = path.join(PROJECT_ROOT, 'assets', 'platform-collections.json');
  const references = fs.existsSync(referencePath) ? JSON.parse(fs.readFileSync(referencePath, 'utf8')).items || [] : [];
  const collections = fs.existsSync(collectionPath) ? JSON.parse(fs.readFileSync(collectionPath, 'utf8')) : {};
  const query = String(options.query || 'portrait photography').trim();
  const sources = references.filter(item => item.kind === 'external_library' || /Pexels|Pixabay|Behance|Flickr|Wikimedia|Unsplash|Pinterest/i.test(item.platform || '')).slice(0, 30);
  const candidates = sources.map((source, index) => ({
    id: `candidate-${crypto.createHash('sha1').update(`${query}:${source.id || source.sourceUrl}`).digest('hex').slice(0, 16)}`,
    entityType: 'candidates', title: `${source.title || source.platform}：${query}`, sourceId: source.id || '',
    sourceUrl: source.sourceUrl || '', platform: source.platform || 'external', query,
    reason: `来自已审计来源，用于补充“${query}”的视觉参考；进入正式素材库前仍需人工确认画面和授权。`,
    provenance: { source: source.platform || 'external', licenseClass: source.licenseClass || 'needs-review', auditScore: source.sourceAuditScore || 0 },
    validationStatus: 'pending', score: Math.max(45, Math.min(95, Number(source.sourceAuditScore || 60) - index)),
    createdAt: new Date().toISOString()
  }));
  Object.entries(collections).forEach(([platform, lists]) => (lists || []).forEach(list => candidates.push({
    id: `candidate-${crypto.createHash('sha1').update(`${platform}:${list.url}`).digest('hex').slice(0, 16)}`,
    entityType: 'candidates', title: `${list.name} 增量复核`, sourceUrl: list.url, platform, query: (list.tags || []).join(' '),
    reason: `收藏夹预期 ${list.expectedCount || '未知'} 条；仅在用户已登录且页面可访问时增量采集。`,
    provenance: { source: platform, licenseClass: 'platform-link-only', auditScore: 50 }, validationStatus: 'pending', score: 55,
    createdAt: new Date().toISOString()
  })));
  const limited = candidates.sort((a, b) => b.score - a.score).slice(0, Math.min(100, Number(options.limit || 24)));
  fs.mkdirSync(path.dirname(CANDIDATE_FILE), { recursive: true });
  fs.writeFileSync(CANDIDATE_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), query, candidates: limited }, null, 2), 'utf8');
  return limited;
}

function readVaultNote(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) throw new Error('path is required');
  const fullPath = path.resolve(VAULT_ROOT, normalized);
  if (!isInside(VAULT_ROOT, fullPath)) throw new Error('path is outside vault');
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) throw new Error('note not found');
  return {
    path: normalized,
    content: fs.readFileSync(fullPath, 'utf8'),
    updatedAt: fs.statSync(fullPath).mtime.toISOString(),
  };
}

function mimeFor(file) {
  return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff', '.heic': 'image/heic' })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(validateOrigin(req) ? 204 : 403, responseHeaders(req)); res.end(); return; }
  if (!validateOrigin(req)) { send(req, res, 403, { error: 'origin not allowed' }); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if ((url.pathname === '/v1/health' || url.pathname === '/health') && req.method === 'GET') {
      const index = getIndex(url.searchParams.get('libraryFolder') || DEFAULT_LIBRARY);
      const searchableDocuments = index.documents.filter(item => !item.managedGenerated).length;
      send(req, res, 200, { ok: true, vaultRoot: VAULT_ROOT, libraryFolder: index.libraryFolder, libraryExists: true, documents: index.documents.length, searchableDocuments, knowledgeMirrors: index.documents.filter(item => item.knowledgeMirror).length, managedIndexes: index.documents.filter(item => item.managedGenerated && !item.knowledgeMirror).length, assets: index.assets.length, knowledgeSources: index.knowledgeSources.length, count: searchableDocuments + index.knowledgeSources.length, indexVersion: index.indexVersion, generatedAt: index.generatedAt });
      return;
    }
    if (url.pathname === '/v1/index/rebuild' && req.method === 'POST') {
      const body = await readBody(req);
      const index = getIndex(body.libraryFolder || DEFAULT_LIBRARY, true);
      const searchableDocuments = index.documents.filter(item => !item.managedGenerated).length;
      send(req, res, 200, { ok: true, documents: index.documents.length, searchableDocuments, knowledgeMirrors: index.documents.filter(item => item.knowledgeMirror).length, managedIndexes: index.documents.filter(item => item.managedGenerated && !item.knowledgeMirror).length, assets: index.assets.length, knowledgeSources: index.knowledgeSources.length, count: searchableDocuments + index.knowledgeSources.length, indexVersion: index.indexVersion, generatedAt: index.generatedAt });
      return;
    }
    if ((url.pathname === '/v1/search' || url.pathname === '/search') && req.method === 'GET') {
      const results = searchIndex(Object.fromEntries(url.searchParams.entries()));
      send(req, res, 200, url.pathname === '/search' ? results : { items: results, count: results.length, indexVersion: getIndex(url.searchParams.get('libraryFolder') || DEFAULT_LIBRARY).indexVersion });
      return;
    }
    if (url.pathname === '/v1/context/recommend' && req.method === 'POST') {
      const body = await readBody(req);
      send(req, res, 200, recommendKnowledgeContext(body));
      return;
    }
    const assetMatch = url.pathname.match(/^\/v1\/assets\/([^/]+)\/thumbnail$/);
    if (assetMatch && req.method === 'GET') {
      const index = getIndex(url.searchParams.get('libraryFolder') || DEFAULT_LIBRARY);
      const asset = index.assets.find(item => item.id === assetMatch[1]);
      if (!asset || !isInside(index.libraryRoot, asset.fullPath)) { send(req, res, 404, { error: 'asset not found' }); return; }
      const stat = fs.statSync(asset.fullPath);
      res.writeHead(200, { ...responseHeaders(req, mimeFor(asset.fullPath)), 'Content-Length': stat.size, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(path.basename(asset.fullPath))}` });
      fs.createReadStream(asset.fullPath).pipe(res);
      return;
    }
    if (url.pathname === '/v1/notes/read' && req.method === 'GET') {
      send(req, res, 200, { ok: true, item: readVaultNote(url.searchParams.get('path')) });
      return;
    }
    if (url.pathname === '/v1/notes' && req.method === 'POST') {
      const body = await readBody(req);
      send(req, res, 201, { ok: true, ...writeReviewNote(body) });
      return;
    }
    if (url.pathname === '/v1/candidates/run' && req.method === 'POST') {
      const body = await readBody(req);
      const candidates = buildCandidates(body);
      send(req, res, 200, { ok: true, generatedAt: new Date().toISOString(), candidates });
      return;
    }
    if (url.pathname === '/v1/candidates' && req.method === 'GET') {
      const payload = fs.existsSync(CANDIDATE_FILE) ? JSON.parse(fs.readFileSync(CANDIDATE_FILE, 'utf8')) : { generatedAt: null, candidates: [] };
      send(req, res, 200, payload);
      return;
    }
    send(req, res, 404, { error: 'not found' });
  } catch (error) { send(req, res, 500, { error: error.message || String(error) }); }
}

function createServer() { return http.createServer(handleRequest); }

if (require.main === module) {
  createServer().listen(PORT, '127.0.0.1', () => {
    console.log(`PhotoAtelier local proxy listening on http://127.0.0.1:${PORT}`);
  });
}

module.exports = { createServer, buildIndex, searchIndex, recommendKnowledgeContext, buildCandidates, writeReviewNote, readVaultNote, safeLibraryRoot };

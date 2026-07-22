const fs = require('fs');
const path = require('path');
const os = require('os');

const projectRoot = path.resolve(__dirname, '..');
const vaultRoot = process.env.PHOTOATELIER_OBSIDIAN_VAULT ||
  path.join(os.homedir(), 'Documents', 'Obsidian Vault');
const libraryRoot = path.join(vaultRoot, process.env.PHOTOATELIER_OBSIDIAN_LIBRARY || '摄影姿势库');
const outJson = path.join(projectRoot, 'assets', 'reference-database.json');
const outCsv = path.join(projectRoot, 'assets', 'reference-database.csv');
const platformCaptureDir = path.join(projectRoot, 'data', 'platform-captures');
const openSourceTaxonomyPath = path.join(projectRoot, 'assets', 'open-source-reference-sources.json');
const externalAuditPath = path.join(projectRoot, 'assets', 'external-source-audit.json');
const openSourceTaxonomy = fs.existsSync(openSourceTaxonomyPath)
  ? JSON.parse(fs.readFileSync(openSourceTaxonomyPath, 'utf8'))
  : { sources: [], taxonomy: {} };
const externalSourceAudit = fs.existsSync(externalAuditPath)
  ? JSON.parse(fs.readFileSync(externalAuditPath, 'utf8'))
  : { sources: [], decisions: {} };
const approvedTaxonomySourceIds = new Set((externalSourceAudit.sources || [])
  .filter((source) => source.adoptionLevel === 'adopt' || source.adoptionLevel === 'adapt')
  .map((source) => source.id));

const EXTERNAL_LIBRARIES = [
  {
    id: 'pexels',
    title: 'Pexels',
    kind: 'external_library',
    category: '免费商用图片/视频',
    platform: 'Pexels',
    sourceUrl: 'https://www.pexels.com/search/{query}/',
    tags: ['免费商用', '图片', '视频', '人像', '场景参考'],
    seoKeywords: ['free portrait photography reference', 'commercial free photo reference'],
    usageNote: '适合补充人像、场景、姿势视觉参考；可用 Pexels API 自动拉图。'
  },
  {
    id: 'pixabay',
    title: 'Pixabay',
    kind: 'external_library',
    category: '免费商用图片/视频',
    platform: 'Pixabay',
    sourceUrl: 'https://pixabay.com/images/search/{query}/',
    tags: ['免费商用', '图片', '视频', '素材'],
    seoKeywords: ['royalty free photography reference', 'free visual material'],
    usageNote: '适合找通用素材、视频空镜和商业安全素材。'
  },
  {
    id: 'xiaohongshu',
    title: '小红书',
    kind: 'external_library',
    category: '中文案例/拍摄过程',
    platform: '小红书',
    sourceUrl: 'https://www.xiaohongshu.com/search_result?keyword={query}&source=web_search_result_notes',
    tags: ['中文案例', '拍摄过程', '姿势', '调色', '爆款标题'],
    seoKeywords: ['小红书 摄影 姿势', '小红书 人像 拍摄教程'],
    usageNote: '适合看真实案例、拍摄过程、中文标题和用户偏好；只保存链接和摘要。'
  },
  {
    id: 'huaban',
    title: '花瓣网',
    kind: 'external_library',
    category: '灵感板/视觉风格',
    platform: '花瓣',
    sourceUrl: 'https://huaban.com/search?q={query}',
    tags: ['灵感板', '风格参考', '构图', '配色'],
    seoKeywords: ['摄影 灵感板', '人像摄影 moodboard'],
    usageNote: '适合做 moodboard 和视觉方向，不作为版权素材直接使用。'
  },
  {
    id: 'zcool',
    title: '站酷',
    kind: 'external_library',
    category: '国内作品案例',
    platform: '站酷',
    sourceUrl: 'https://www.zcool.com.cn/search/content?word={query}',
    tags: ['作品集', '商业摄影', '国内审美', '案例'],
    seoKeywords: ['商业摄影 案例', '人像摄影 作品集'],
    usageNote: '适合看成片表达、排版和商业项目包装。'
  },
  {
    id: 'behance',
    title: 'Behance',
    kind: 'external_library',
    category: '海外商业作品',
    platform: 'Behance',
    sourceUrl: 'https://www.behance.net/search/projects?field=photography&search={query}',
    tags: ['商业摄影', '作品集', '海外审美', '品牌'],
    seoKeywords: ['editorial photography portfolio', 'commercial portrait photography'],
    usageNote: '适合找高质量项目结构、系列叙事和商业展示方式。'
  },
  {
    id: 'flickr-cc',
    title: 'Flickr Creative Commons',
    kind: 'external_library',
    category: '授权可筛选图片',
    platform: 'Flickr',
    sourceUrl: 'https://www.flickr.com/search/?text={query}&license=2%2C3%2C4%2C5%2C6%2C9',
    tags: ['Creative Commons', '授权筛选', '纪实', '资料图'],
    seoKeywords: ['creative commons photography reference', 'licensed photo reference'],
    usageNote: '适合需要明确授权来源的参考图，使用前仍需核对具体 license。'
  },
  {
    id: 'wikimedia',
    title: 'Wikimedia Commons',
    kind: 'external_library',
    category: '公共资料/历史图像',
    platform: 'Wikimedia',
    sourceUrl: 'https://commons.wikimedia.org/w/index.php?search={query}&title=Special:MediaSearch',
    tags: ['公共资料', '历史', '服饰', '道具', '建筑'],
    seoKeywords: ['historical costume reference', 'public domain visual reference'],
    usageNote: '适合查历史服饰、建筑、道具和公开资料图。'
  }
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.obsidian' || entry.name === '.trash') continue;
      walk(fullPath, out);
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const meta = {};
  if (!match) return meta;
  match[1].split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx < 0) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
    }
    meta[key] = value;
  });
  return meta;
}

function stripMarkdown(raw) {
  return raw
    .replace(/^---[\s\S]*?---/, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[\[([^\]]+)]]/g, '$1')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1 $2')
    .replace(/[`*_>#|~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLinks(raw) {
  const links = [];
  const markdownLinks = raw.matchAll(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g);
  for (const match of markdownLinks) links.push({ label: match[1], url: match[2] });
  const bareLinks = raw.matchAll(/https?:\/\/[^\s)]+/g);
  for (const match of bareLinks) {
    if (!links.some((link) => link.url === match[0])) links.push({ label: '', url: match[0] });
  }
  return links;
}

function parseTables(raw) {
  const rows = [];
  const lines = raw.split(/\r?\n/);
  let headers = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|') || !line.endsWith('|')) {
      headers = null;
      continue;
    }
    const cells = line.slice(1, -1).split('|').map((cell) => cell.trim());
    if (cells.every((cell) => /^-+$/.test(cell))) continue;
    if (!headers) {
      headers = cells;
      continue;
    }
    if (cells.length !== headers.length) continue;
    const row = {};
    headers.forEach((header, idx) => { row[header] = cells[idx]; });
    rows.push(row);
  }
  return rows;
}

function inferCategory(text, file) {
  const normalizedFile = String(file || '').replace(/摄影姿势库[\\/]/g, '').replace(/摄影姿势库/g, '');
  const hay = `${normalizedFile} ${text}`;
  if (/视频|vlog|转场|空镜|电影感/i.test(hay)) return '视频拍摄';
  if (/汉服|旗袍|新中式|国风/i.test(hay)) return '国风/汉服';
  if (/拍摄指南|拍摄手册|拍照姿势|姿势|动作|pose|站|坐|托腮|回眸/i.test(hay)) return '姿势/引导';
  if (/构图|技巧|光影|镜头/i.test(hay)) return '构图/技巧';
  if (/调色|LUT|色彩|colorfit|color grading|Lightroom/i.test(hay)) return '调色/后期';
  return '综合参考';
}

function inferTags(text, metaTags = []) {
  const candidates = ['生命力', '海边', '毕业照', '新中式', '花海', '咖啡馆', '汉服', '旗袍', '构图', '光影', '电影感', '空镜', 'vlog', '调色', 'LUT', '胶片', '草地', '春日', '夏天', '稳定器', '鱼眼', '35mm'];
  const found = candidates.filter((tag) => text.includes(tag));
  return [...new Set([...(Array.isArray(metaTags) ? metaTags : [metaTags].filter(Boolean)), ...found])].slice(0, 12);
}

function makeSearchQueries(title, category, tags) {
  const base = [title, category, ...tags].filter(Boolean).join(' ');
  return [
    base,
    `${title} 摄影参考`,
    `${category} 人像拍摄`,
    `${tags.slice(0, 3).join(' ')} pose reference`
  ].filter(Boolean);
}

function makeSeo(title, category, tags) {
  const keywords = [...new Set([title, category, ...tags, '摄影参考', '人像摄影', '拍摄姿势', 'moodboard'])].filter(Boolean);
  return {
    seoTitle: `${title} - ${category}摄影参考`,
    seoDescription: `${title} 的本地摄影参考条目，适合用于拍摄方案、姿势引导、构图和素材检索。`,
    seoKeywords: keywords.slice(0, 12)
  };
}

function inferDecisionFields(title, category, tags, text = '') {
  const hay = `${title} ${category} ${tags.join(' ')} ${text}`;
  const sceneMap = [
    ['海边', '海边/沙滩'],
    ['草地', '草地/公园'],
    ['花海', '花海/春夏外景'],
    ['咖啡馆', '咖啡馆/室内'],
    ['汉服', '园林/古风室内'],
    ['旗袍', '街巷/室内国风'],
    ['毕业', '校园/毕业季'],
    ['夜景', '城市夜景'],
    ['空镜', '街道/室内/环境空镜'],
    ['影棚', '影棚/商业室内']
  ];
  const subjectMap = [
    ['情侣', '情侣'],
    ['毕业', '毕业生/学生'],
    ['汉服', '汉服模特'],
    ['旗袍', '国风/旗袍模特'],
    ['商业', '商业客户'],
    ['vlog', '视频创作者'],
    ['视频', '视频创作者']
  ];
  const scene = (sceneMap.find(([key]) => hay.includes(key)) || [null, '通用人像场景'])[1];
  const subject = (subjectMap.find(([key]) => hay.includes(key)) || [null, '单人女生/普通客片'])[1];
  const hardSignals = ['鱼眼', '稳定器', '夜景', '转场', '影棚', '商业', '光影', '汉服'];
  const easySignals = ['姿势', '站', '坐', '托腮', '草地', '花海', '咖啡馆'];
  const replicability = hardSignals.some((key) => hay.includes(key)) ? '中等'
    : easySignals.some((key) => hay.includes(key)) ? '容易' : '中等';
  const risks = [];
  if (/海边|草地|花海|春日|夏天/.test(hay)) risks.push('天气和光线不稳定');
  if (/夜景|电影感|光影/.test(hay)) risks.push('需要控光或合适时段');
  if (/汉服|旗袍|新中式/.test(hay)) risks.push('妆造/服装/道具影响很大');
  if (/视频|vlog|转场|稳定器/.test(hay)) risks.push('需要运动镜头和剪辑配合');
  if (/咖啡馆|场地|书城/.test(hay)) risks.push('需要场地许可或低打扰拍摄');
  const coreFocus = [
    /姿势|动作|pose|站|坐|托腮|回眸/.test(hay) ? '姿势引导' : '',
    /构图|35mm|镜头/.test(hay) ? '构图镜头' : '',
    /调色|LUT|胶片|色彩|color/.test(hay) ? '色彩后期' : '',
    /光影|阳光|逆光/.test(hay) ? '光线氛围' : '',
    /标题|小红书|朋友圈/.test(hay) ? '发布表达' : ''
  ].filter(Boolean);
  const priceTier = /商业|影棚|品牌/.test(hay) ? '699+/商业单'
    : /汉服|旗袍|毕业|视频/.test(hay) ? '399-699'
      : /姿势|草地|花海|咖啡馆/.test(hay) ? '199-399' : '99-399';
  const worth = /生命力|构图|精选|电影感|汉服|调色|视频|毕业/.test(hay) ? '高' : '中';
  return {
    applicableScene: scene,
    applicableSubject: subject,
    replicability,
    shootingRisk: risks.length ? risks.join('；') : '常规沟通和审美匹配风险',
    coreFocus: coreFocus.length ? coreFocus : ['综合参考'],
    priceTier,
    worth,
    whyWorth: worth === '高'
      ? '可直接转化为拍摄选题、姿势引导或成片风格参考。'
      : '适合作为检索补充或局部灵感。'
  };
}

function inferOpenStandardFields(title, category, tags, text = '', platform = '') {
  const hay = `${title} ${category} ${tags.join(' ')} ${text} ${platform}`.toLowerCase();
  let licenseClass = 'local-private-reference';
  if (/pexels|pixabay|cc0|public domain|wikimedia/.test(hay)) licenseClass = 'public-domain';
  else if (/flickr|creative commons|cc /.test(hay)) licenseClass = 'attribution-required';
  else if (/小红书|抖音|xiaohongshu|douyin/.test(hay)) licenseClass = 'platform-link-only';
  else if (/behance|花瓣|站酷|huaban|zcool/.test(hay)) licenseClass = 'platform-link-only';

  let shotSize = '';
  if (/特写|close|脸|侧颜|托腮/.test(hay)) shotSize = 'close-up';
  else if (/半身|坐|medium/.test(hay)) shotSize = 'medium-shot';
  else if (/全身|站|走|long shot/.test(hay)) shotSize = 'long-shot';
  else if (/大景|环境|空镜|wide|风景/.test(hay)) shotSize = 'extreme-wide-shot';

  let cameraMovement = 'static';
  if (/vlog|跟拍|走动|运动|稳定器|转场|travelling/.test(hay)) cameraMovement = 'travelling-in';
  if (/摇|pan/.test(hay)) cameraMovement = 'panoramic';
  if (/推拉|zoom/.test(hay)) cameraMovement = 'zoom-in';
  if (/手持|handheld/.test(hay)) cameraMovement = 'handheld';
  if (/航拍|aerial/.test(hay)) cameraMovement = 'aerial';

  const composition = [];
  if (/三分|rule/.test(hay)) composition.push('rule-of-thirds');
  if (/居中|对称|center/.test(hay)) composition.push('center');
  if (/线条|leading/.test(hay)) composition.push('leading-lines');
  if (/留白|negative/.test(hay)) composition.push('negative-space');
  if (/框|窗|frame/.test(hay)) composition.push('frame-within-frame');
  if (/前景|层次/.test(hay)) composition.push('foreground-background-layering');

  let workflowStage = 'inspiration';
  if (/选题|主题/.test(hay)) workflowStage = 'topic-selection';
  if (/姿势|构图|镜头|清单/.test(hay)) workflowStage = 'shot-planning';
  if (/调色|lut|后期|color/.test(hay)) workflowStage = 'color-grading';
  if (/标题|文案|发布|seo/.test(hay)) workflowStage = 'publishing';
  if (/复盘|反馈/.test(hay)) workflowStage = 'review';

  return {
    licenseClass,
    shotSizeNormalized: shotSize || 'medium-shot',
    cameraMovement,
    compositionNormalized: composition.length ? composition : ['saliency-focus'],
    workflowStage,
    metadataStandard: ['IPTC', 'EXIF', 'XMP'],
    taxonomySources: [
      'iptc-photo-metadata',
      'digikam-dam',
      'shot-type-classifier',
      'movie-shot-classification',
      'cadb-composition'
    ].filter((sourceId) => approvedTaxonomySourceIds.has(sourceId)),
    sourceAuditScore: Math.round([
      'iptc-photo-metadata',
      'digikam-dam',
      'shot-type-classifier',
      'movie-shot-classification',
      'cadb-composition'
    ].map((sourceId) => (externalSourceAudit.sources || []).find((source) => source.id === sourceId)?.score || 0)
      .filter(Boolean)
      .reduce((sum, score, _, arr) => sum + score / arr.length, 0))
  };
}

function rowToItem(row, sourceFile, parentMeta, index) {
  const title = row['标题'] || row['姿势'] || row['笔记ID'] || row['类型'] || `条目 ${index + 1}`;
  const noteId = row['笔记ID'] || '';
  const rowSourceUrl = noteId && /^[0-9a-f]{6,}$/i.test(noteId)
    ? `https://www.xiaohongshu.com/explore/${noteId}`
    : (parentMeta.source || '');
  const tags = inferTags(`${title} ${Object.values(row).join(' ')}`, parentMeta.tags || []);
  const category = inferCategory(`${title} ${Object.values(row).join(' ')}`, sourceFile);
  const seo = makeSeo(title, category, tags);
  const decision = inferDecisionFields(title, category, tags, Object.values(row).join(' '));
  const openFields = inferOpenStandardFields(title, category, tags, Object.values(row).join(' '), rowSourceUrl);
  return {
    id: `${slugify(path.basename(sourceFile, '.md'))}-${slugify(title)}-${index + 1}`,
    title,
    kind: 'obsidian_table_row',
    category,
    platform: rowSourceUrl.includes('xiaohongshu.com') ? '小红书/Obsidian' : 'Obsidian',
    sourceUrl: rowSourceUrl,
    sourceFile,
    author: row['作者'] || '',
    tags,
    summary: row['类型标签'] || row['类型'] || row['说明'] || Object.values(row).join(' / '),
    materialUrls: rowSourceUrl ? [rowSourceUrl] : [],
    searchQueries: makeSearchQueries(title, category, tags),
    recommendedBitableView: '参考素材库',
    status: '待复核',
    priority: /精选|生命力|构图|大疆|电影感/.test(title) ? '高' : '中',
    usageNote: '从 Obsidian 表格抽取；建议复核原链接后补充作品截图、视频链接和授权备注。',
    ...decision,
    ...openFields,
    ...seo
  };
}

function fileToItem(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const rel = path.relative(vaultRoot, file).replace(/\\/g, '/');
  const meta = parseFrontMatter(raw);
  const text = stripMarkdown(raw);
  const title = meta.title || path.basename(file, '.md');
  const links = extractLinks(raw);
  const category = inferCategory(text, rel);
  const tags = inferTags(text, meta.tags || []);
  const seo = makeSeo(title, category, tags);
  const decision = inferDecisionFields(title, category, tags, text);
  const openFields = inferOpenStandardFields(title, category, tags, text, links[0]?.url || '');
  return {
    id: `doc-${slugify(rel)}`,
    title,
    kind: 'obsidian_note',
    category,
    platform: links.some((link) => link.url.includes('xiaohongshu.com')) ? '小红书/Obsidian' : 'Obsidian',
    sourceUrl: meta.source || links[0]?.url || '',
    sourceFile: rel,
    author: '',
    tags,
    summary: text.slice(0, 180),
    materialUrls: links.map((link) => link.url),
    searchQueries: makeSearchQueries(title, category, tags),
    recommendedBitableView: '参考素材库',
    status: links.length ? '待复核链接' : '本地可用',
    priority: /总览|精选|手册|索引/.test(title) ? '高' : '中',
    usageNote: '从 Obsidian 笔记抽取，可作为拍摄方案和参考检索的源材料。',
    ...decision,
    ...openFields,
    ...seo
  };
}

function imageToItem(file) {
  const rel = path.relative(vaultRoot, file).replace(/\\/g, '/');
  const title = path.basename(file, path.extname(file));
  const category = inferCategory(title, rel);
  const tags = inferTags(`${rel} ${title}`);
  const seo = makeSeo(title, category, tags);
  const decision = inferDecisionFields(title, category, tags, rel);
  const openFields = inferOpenStandardFields(title, category, tags, rel, 'local');
  return {
    id: `asset-${slugify(rel)}`,
    title,
    kind: 'local_image',
    category,
    platform: '本地素材',
    sourceUrl: '',
    sourceFile: rel,
    author: '',
    tags,
    summary: `本地参考图：${rel}`,
    materialUrls: [rel],
    searchQueries: makeSearchQueries(title, category, tags),
    recommendedBitableView: '本地图片素材',
    status: '本地可用',
    priority: '中',
    usageNote: '本地姿势示意图/参考图，适合生成拍摄姿势和引导词。',
    ...decision,
    ...openFields,
    ...seo
  };
}

function platformCaptureToItem(rawItem, capture, index) {
  const title = rawItem.title || `${capture.collectionName || capture.platform} ${index + 1}`;
  const text = `${title} ${capture.collectionName || ''} ${(rawItem.tags || []).join(' ')}`;
  const category = inferCategory(text, rawItem.url || capture.collectionUrl || '');
  const tags = inferTags(text, rawItem.tags || []);
  const seo = makeSeo(title, category, tags);
  const decision = inferDecisionFields(title, category, tags, text);
  const openFields = inferOpenStandardFields(title, category, tags, text, capture.platform);
  return {
    id: `capture-${slugify(capture.platform)}-${slugify(capture.collectionName)}-${slugify(rawItem.url || title)}`,
    title,
    kind: 'platform_capture',
    category,
    platform: capture.platform === 'douyin' ? '抖音' : '小红书',
    sourceUrl: rawItem.url || capture.collectionUrl || '',
    sourceFile: '',
    author: rawItem.author || '',
    tags,
    summary: `${capture.collectionName || '平台收藏'}收藏条目。${rawItem.cover ? '已记录封面链接。' : ''}`,
    materialUrls: [rawItem.url, rawItem.cover].filter(Boolean),
    searchQueries: makeSearchQueries(title, category, tags),
    recommendedBitableView: '平台收藏素材',
    status: '已抓取待复核',
    priority: '高',
    usageNote: '从已登录浏览器滚动抓取的收藏条目；建议复核链接有效性、封面和版权使用范围。',
    ...decision,
    ...openFields,
    ...seo
  };
}

function loadPlatformCaptures() {
  if (!fs.existsSync(platformCaptureDir)) return [];
  return walk(platformCaptureDir)
    .filter((file) => file.toLowerCase().endsWith('.json'))
    .flatMap((file) => {
      try {
        const capture = JSON.parse(fs.readFileSync(file, 'utf8'));
        return (capture.items || []).map((item, index) => platformCaptureToItem(item, capture, index));
      } catch {
        return [];
      }
    });
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('；') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function main() {
  const files = walk(libraryRoot);
  const items = [];

  EXTERNAL_LIBRARIES.forEach((item) => {
    const seo = makeSeo(item.title, item.category, item.tags);
    const decision = inferDecisionFields(item.title, item.category, item.tags, item.usageNote || '');
    const openFields = inferOpenStandardFields(item.title, item.category, item.tags, item.usageNote || '', item.platform || '');
    items.push({
      sourceFile: '',
      materialUrls: [item.sourceUrl],
      searchQueries: makeSearchQueries(item.title, item.category, item.tags),
      recommendedBitableView: '外部图库连接',
      status: '可连接',
      priority: '高',
      summary: item.usageNote,
      ...item,
      ...decision,
      ...openFields,
      ...seo
    });
  });

  files.filter((file) => file.toLowerCase().endsWith('.md')).forEach((file) => {
    const rel = path.relative(vaultRoot, file).replace(/\\/g, '/');
    const raw = fs.readFileSync(file, 'utf8');
    const meta = parseFrontMatter(raw);
    items.push(fileToItem(file));
    parseTables(raw).forEach((row, index) => items.push(rowToItem(row, rel, meta, index)));
  });

  files.filter((file) => /\.(png|jpe?g|webp)$/i.test(file)).forEach((file) => items.push(imageToItem(file)));
  items.push(...loadPlatformCaptures());

  const payload = {
    generatedAt: new Date().toISOString(),
    vaultRoot,
    libraryRoot,
    itemCount: items.length,
    openSourceTaxonomy,
    externalSourceAudit,
    bitableFields: [
      '标题', '类型', '分类', '平台', '来源链接', '本地文件', '作者', '标签', '摘要',
      '素材链接', '检索语句', '适用场景', '适用对象', '可复刻程度', '拍摄风险',
      '核心看点', '适合价格档', '是否值得模仿', '值得看的原因', 'SEO标题', 'SEO关键词',
      '授权类别', '标准镜头景别', '标准镜头运动', '标准构图', '工作流阶段', '用途备注', '状态', '优先级'
    ],
    items
  };

  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(payload, null, 2), 'utf8');

  const headers = ['id', 'title', 'kind', 'category', 'platform', 'sourceUrl', 'sourceFile', 'author', 'tags', 'summary', 'materialUrls', 'searchQueries', 'applicableScene', 'applicableSubject', 'replicability', 'shootingRisk', 'coreFocus', 'priceTier', 'worth', 'whyWorth', 'licenseClass', 'shotSizeNormalized', 'cameraMovement', 'compositionNormalized', 'workflowStage', 'seoTitle', 'seoKeywords', 'usageNote', 'status', 'priority'];
  const csv = [headers.join(',')].concat(items.map((item) => headers.map((header) => csvEscape(item[header])).join(','))).join('\n');
  fs.writeFileSync(outCsv, csv, 'utf8');

  console.log(`Generated ${items.length} reference items`);
  console.log(outJson);
  console.log(outCsv);
}

main();

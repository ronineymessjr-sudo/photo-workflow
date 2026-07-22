const DEFAULT_CATALOG_URL = './data/ronin-photography-knowledge.json';
const MAX_VAULT_SOURCES = 8;
const MAX_CATALOG_SOURCES = 6;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return String(value).split(/[\n,，;；]/).map(item => item.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values.flatMap(asArray).map(item => String(item).trim()).filter(Boolean))];
}

function shortText(value, length = 900) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, length);
}

function normalizeInput(input = {}) {
  return {
    theme: input.theme || input.title || input.goal || '',
    style: input.style || '',
    scene: input.scene || input.location || input.locationIntent || '',
    mood: input.mood || '',
    people: Number(input.people || input.peopleCount || 1) || 1,
    duration: input.duration || '2小时',
    modelDesc: input.modelDesc || input.talent || '',
    constraints: asArray(input.constraints),
  };
}

function knowledgeTerms(input) {
  const corpus = [input.theme, input.style, input.scene, input.mood, input.modelDesc, ...input.constraints].join(' ');
  const conceptTerms = [
    ...( /汉服|古风|园林|回廊|亭台|竹影/i.test(corpus) ? ['汉服', '古风', '园林', '回廊', '亭台', '竹影'] : []),
    ...( /小清新|少女|清新|校园|草地|自然光/i.test(corpus) ? ['小清新', '少女', '清新', '校园', '草地', '自然光'] : []),
  ];
  return unique([corpus, ...conceptTerms]
    .join(' ')
    .split(/[\s,，;；/、]+/)
    .filter(item => item.length >= 2)).slice(0, 16);
}

function scoreText(value, terms) {
  const haystack = String(value || '').toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(String(term).toLowerCase()) ? 1 : 0), 0);
}

function isPhotographyPath(filename) {
  return /摄影|photoatelier|photo-workflow|pose|拍摄|汉服|portrait/i.test(String(filename || ''));
}

function compactVaultSource(item, terms) {
  const text = shortText(item.text || item.excerpt || item.matches?.[0]?.context || '', 1100);
  return {
    id: `obsidian:${item.filename || item.id}`,
    type: 'knowledge',
    kind: 'obsidian-note',
    title: item.title || item.filename || '未命名 Obsidian 笔记',
    sourceType: 'obsidian-local',
    path: item.filename || null,
    sourceUrl: null,
    excerpt: text,
    tags: unique(item.tags || []),
    workflowStage: asArray(item.workflowStage || '摄影知识'),
    groundingStatus: 'vault-note',
    score: Number(item.score || 0) + scoreText(`${item.title || ''} ${item.filename || ''} ${text}`, terms),
  };
}

function compactCatalogSource(item, terms) {
  return {
    id: String(item.id),
    type: 'knowledge',
    kind: item.kind || 'rag_chunk',
    title: item.title || '未命名知识候选',
    sourceType: item.sourceType || 'ronin-catalog',
    path: null,
    sourceUrl: item.sourceUrl || null,
    excerpt: shortText(item.snippet || item.content || '', 700),
    tags: unique(item.tags || []),
    workflowStage: asArray(item.workflowStage),
    groundingStatus: item.groundingStatus || 'metadata-only',
    score: scoreText([item.title, item.snippet, item.content, ...(item.tags || [])].join(' '), terms),
  };
}

function detectProfile(input, vaultSources) {
  const corpus = [input.theme, input.style, input.scene, input.mood].join(' ');
  if (/汉服|古风|园林|回廊|亭台|竹影/i.test(corpus)) return 'hanfu-garden';
  if (/小清新|少女|清新|校园|草地|自然光/i.test(corpus)) return 'fresh-portrait';
  return 'evidence-guided';
}

function shotCountFor(duration) {
  if (duration === '1小时') return 5;
  if (duration === '3小时') return 12;
  if (duration === '半天') return 15;
  if (duration === '全天') return 20;
  return 8;
}

function sourceIds(sources) {
  return sources.map(item => item.id).filter(Boolean);
}

function makeShot(values, sources) {
  return {
    scene: values.scene,
    description: values.description,
    shotSize: values.shotSize,
    method: values.method,
    focalLength: values.focalLength,
    composition: values.composition,
    lighting: values.lighting,
    props: values.props || '无',
    angle: values.angle,
    mood: values.mood,
    duration: values.duration,
    notes: values.notes,
    camera: values.camera,
    lightingSetup: values.lightingSetup,
    priority: values.priority,
    alternative: values.alternative,
    knowledgeTerms: unique(values.knowledgeTerms || []),
    knowledgeSourceIds: sourceIds(sources),
  };
}

function freshPortraitShots(input, sources) {
  const scene = input.scene || '公园、校园或自然光场地';
  const coffee = /咖啡|窗边|室内/i.test(scene);
  const seatedScene = coffee ? '窗边座位或楼梯' : '台阶、长椅或草地';
  const prop = coffee ? '咖啡杯或书' : '花、书或草帽';
  const basicCamera = { iso: '100-400', shutter: '1/250', wb: '按现场校正', focusMode: 'AF-C', metering: '评价测光', driveMode: '连拍' };
  return [
    makeShot({ scene, description: '热身：重心转移站', shotSize: '全身', method: '平视连拍', focalLength: '35mm 或 50mm', composition: '人物偏离中心，保留环境层次', lighting: '柔和侧光或开放阴影', angle: '平视', mood: '放松', duration: 8, notes: '前后脚错开，重心放后脚；肩膀放松，视线离开镜头。先用具体口令热身，避免笔直僵站。', camera: basicCamera, lightingSetup: '优先树荫、窗边柔光或侧光；面部暗时再用反光板轻补。', priority: '必拍', alternative: '背景杂乱时改为中景，利用墙面或植被简化背景。', knowledgeTerms: ['重心转移站', '自然光', '热身', scene] }, sources),
    makeShot({ scene, description: '主视觉：侧身看远方', shotSize: '半身', method: '45 度侧拍', focalLength: '50mm 或 85mm', composition: '三分构图，眼神落在画面留白方向', lighting: '柔和侧光', angle: '45度侧', mood: input.mood || '清新自然', duration: 10, notes: '身体转 30-45 度，双手有明确位置，眼睛不直盯镜头。', camera: { ...basicCamera, focusMode: 'AF-S', driveMode: '单拍' }, lightingSetup: '把主光放在脸部偏侧，优先保护高光和肤色。', priority: '必拍', alternative: '光线过硬时转到开放阴影，用反光板补眼神光。', knowledgeTerms: ['侧身', '看远方', '半身', '柔和侧光'] }, sources),
    makeShot({ scene, description: '动态：慢走回眸', shotSize: '全身', method: '跟拍连拍', focalLength: '50mm 或 85mm', composition: '利用小径、栏杆或地面线条引导视线', lighting: '自然侧光或轻逆光', angle: '背面转', mood: '自然', duration: 10, notes: '让人物慢走，到预定位置回头；连续拍摄，抓表情变化而不是要求固定笑容。', camera: basicCamera, lightingSetup: '逆光时用反光板轻补面部；风大时保留衣摆和发丝动态。', priority: '必拍', alternative: '人流拥挤时改为靠墙站或原地侧身回头。', knowledgeTerms: ['走起来抓拍', '回眸', '连拍', '动态'] }, sources),
    makeShot({ scene: seatedScene, description: '关系镜头：坐姿与道具互动', shotSize: '中景', method: '侧坐回头', focalLength: '50mm', composition: '腿部形成前后层次，手部与道具构成小三角', lighting: coffee ? '窗边侧光' : '均匀自然光', props: prop, angle: '45度侧', mood: '安静', duration: 10, notes: '腿不要平行摆放；一手支撑或与道具互动，另一手托腮、整理头发或放在膝上。', camera: { ...basicCamera, shutter: '1/160', focusMode: 'AF-S', driveMode: '单拍' }, lightingSetup: '窗边保留侧光方向；户外优先选择阴影边缘避免斑驳光直落在脸上。', priority: '推荐', alternative: '没有可坐位置时改为靠栏杆或靠墙，继续使用手部互动。', knowledgeTerms: ['坐姿', '手部互动', prop, seatedScene] }, sources),
    makeShot({ scene, description: '细节：撩发、手部与眼神', shotSize: '特写', method: '动作过程抓拍', focalLength: '85mm', composition: '保留眼睛、手指与局部道具，背景干净', lighting: '柔光', props: prop, angle: '平视', mood: '细腻', duration: 8, notes: '让手从额头慢慢撩向发尾，或低头闻花、翻书；一次动作多拍几遍，不要求停在僵硬姿势。', camera: { ...basicCamera, shutter: '1/320' }, lightingSetup: '让脸和手在同一柔和光区，避免高光打在手背而脸部过暗。', priority: '推荐', alternative: '表情不自然时改拍手、衣料和道具，不强行拍正面。', knowledgeTerms: ['撩头发', '手部特写', '眼神', prop] }, sources),
    makeShot({ scene, description: '补充：环境留白肖像', shotSize: '全景', method: '环境人像', focalLength: '35mm', composition: '人物占画面三分之一，留出环境和前景', lighting: '傍晚侧逆光或均匀阴影', props: prop, angle: '平视', mood: '松弛', duration: 8, notes: '最后补一张能交代地点和情绪的画面，避免把整套方案只拍成脸部特写。', camera: { ...basicCamera, shutter: '1/160', focusMode: 'AF-S', driveMode: '单拍' }, lightingSetup: '优先寻找能构成前景的枝叶、窗框或建筑边缘。', priority: '可选', alternative: '场地无纵深时改为靠墙中景，保留留白。', knowledgeTerms: ['环境人像', '留白', scene] }, sources),
    makeShot({ scene, description: '补充：低头或看手的情绪肖像', shotSize: '近景', method: '静态引导', focalLength: '85mm', composition: '视线落点留在画面内，保留一侧肩颈线条', lighting: '柔和侧光', props: prop, angle: '45度侧', mood: '温柔', duration: 8, notes: '用“看手里这朵花/看书页”代替“自然一点”。', camera: { ...basicCamera, shutter: '1/200', focusMode: 'AF-S', driveMode: '单拍' }, lightingSetup: '侧光太硬时向阴影边缘退半步。', priority: '可选', alternative: '人物疲劳时直接进入收尾，不强行补拍。', knowledgeTerms: ['低头', '看手', '情绪肖像'] }, sources),
    makeShot({ scene, description: '补充：收尾的自由发挥', shotSize: '中景', method: '边聊边拍', focalLength: '50mm', composition: '根据现场最干净的背景调整', lighting: '现场最佳光位', props: prop, angle: '平视', mood: '轻松', duration: 8, notes: '让人物提出一个想试的动作；这组常能得到更自然的收尾照片。', camera: { ...basicCamera, shutter: '1/200' }, lightingSetup: '复用已验证的主光位置，避免最后阶段重新试灯。', priority: '可选', alternative: '时间不足时只保留必拍三组。', knowledgeTerms: ['自由发挥', '收尾', '自然'] }, sources),
  ];
}

function hanfuGardenShots(input, sources) {
  const scene = input.scene || '园林亭台、回廊或竹影';
  const basicCamera = { iso: '100-400', shutter: '1/200', wb: '按现场校正', focusMode: 'AF-S', metering: '评价测光', driveMode: '单拍' };
  return [
    makeShot({ scene, description: '定场：园林环境与前景', shotSize: '全景', method: '环境人像', focalLength: '35mm', composition: '树枝、花丛或窗框作为前景，保留亭台纵深', lighting: '清晨或傍晚侧光', props: '花枝或团扇', angle: '平视', mood: '雅致', duration: 10, notes: '先确认环境层次，再把人物放入画面；避免正午顶光。', camera: basicCamera, lightingSetup: '用自然侧光塑造衣料纹理，暗面只做轻补。', priority: '必拍', alternative: '游客多时收紧画面，使用前景遮挡。', knowledgeTerms: ['园林', '前景遮挡', '环境人像'] }, sources),
    makeShot({ scene: '园林亭台', description: '主视觉：站立持花', shotSize: '全身', method: '45 度侧拍', focalLength: '50mm 或 85mm', composition: 'S 型身体曲线，花枝与手部形成呼应', lighting: '柔和侧光', props: '花枝', angle: '45度侧', mood: '温婉', duration: 10, notes: '避免直立；手部轻拈花枝，视线看花或远方。', camera: basicCamera, lightingSetup: '侧光优先，保留面部和衣料的细节。', priority: '必拍', alternative: '无花枝时改为持扇或轻扶栏杆。', knowledgeTerms: ['站立持花', 'S型曲线', '汉服'] }, sources),
    makeShot({ scene: '回廊或窗前', description: '叙事：回眸侧身', shotSize: '半身', method: '连拍转头', focalLength: '85mm', composition: '廊道线条引导视线，侧脸留出空间', lighting: '侧逆光', props: '团扇', angle: '背面转', mood: '清冷', duration: 10, notes: '身体留在侧面，头部慢慢回转；眼神不必正视镜头。', camera: { ...basicCamera, shutter: '1/250', focusMode: 'AF-C', driveMode: '连拍' }, lightingSetup: '轻逆光勾轮廓，面部不足时用反光板。', priority: '必拍', alternative: '风大或人流多时改成静态侧身看远方。', knowledgeTerms: ['回眸侧身', '回廊', '侧逆光'] }, sources),
    makeShot({ scene: '栏杆或假山旁', description: '变化：侧坐倚栏', shotSize: '中景', method: '平视侧拍', focalLength: '50mm', composition: '衣摆与栏杆形成对角线', lighting: '柔和侧光', props: '团扇或书卷', angle: '45度侧', mood: '慵懒', duration: 10, notes: '难度较高，先确认服装活动范围和安全；双腿、衣摆和手部都需要层次。', camera: { ...basicCamera, shutter: '1/160' }, lightingSetup: '避免杂乱高光，优先选择均匀亮度的栏杆背景。', priority: '推荐', alternative: '动作不舒适时改为站姿扶栏。', knowledgeTerms: ['侧坐倚栏', '汉服', '衣摆'] }, sources),
    makeShot({ scene: '竹影或花丛', description: '细节：持扇遮面与手部', shotSize: '特写', method: '局部细节', focalLength: '85mm', composition: '手、扇面、侧脸和衣料纹样形成层次', lighting: '柔光', props: '团扇', angle: '平视', mood: '含蓄', duration: 8, notes: '手指放松，遮面不完全挡住表情；优先拍扇面、衣料和眼神关系。', camera: { ...basicCamera, shutter: '1/250' }, lightingSetup: '让手与脸落在同一光区，避免手部过亮。', priority: '推荐', alternative: '无团扇时改拍花枝、玉佩或衣袖。', knowledgeTerms: ['持扇遮面', '手部', '汉服细节'] }, sources),
    makeShot({ scene, description: '补充：远景留白', shotSize: '全景', method: '远景定点', focalLength: '85mm', composition: '人物小于环境，保留园林空间和留白', lighting: '傍晚自然光', props: '团扇', angle: '平视', mood: '仙气', duration: 8, notes: '作为整套的情绪收束图，人物不必看镜头。', camera: { ...basicCamera, shutter: '1/160' }, lightingSetup: '选择背景干净的空间，避免游客进入主画面。', priority: '可选', alternative: '时间不足时保留前三组必拍镜头。', knowledgeTerms: ['远景', '留白', '园林'] }, sources),
  ];
}

function evidenceGuidance(input, profile) {
  if (profile === 'fresh-portrait') return { label: '小清新人像执行法', visualPrompt: 'fresh natural portrait, relaxed posture, soft side light, natural skin, clean background, subtle motion, believable hands', poseSummary: '先动后拍，用具体口令替代“自然一点”；站姿要有重心，手要有互动，视线优先离开镜头。', lightingSummary: '优先下午柔和侧光、树荫或窗边，避开面部斑驳顶光。', sceneSummary: '公园、草地、校园、咖啡馆和窗边都需先选择干净背景与可坐可走的位置。', timelineSummary: '按破冰、热身、主拍、细节、收尾推进，不在同一动作上停留过久。', risks: ['避免笔直僵站和手自然下垂', '连拍动态动作，先保证必拍三组', '强光时转开放阴影或室内窗边'] };
  if (profile === 'hanfu-garden') return { label: '园林汉服执行法', visualPrompt: 'editorial hanfu portrait in a classical Chinese garden, elegant S-curve posture, flower branch or round fan, corridor foreground, soft dawn or dusk side light, realistic fabric texture', poseSummary: '身体保持微曲，手部轻拈花枝或团扇，眼神看远方或手中物，避免正面僵直。', lightingSummary: '优先清晨或傍晚侧光，用树枝、花丛或窗框作为前景。', sceneSummary: '亭台、回廊、栏杆和竹影分别承担环境、回眸、坐姿和细节镜头。', timelineSummary: '先完成环境与站姿，再完成回眸、坐姿和道具细节；游客增多时优先收紧画面。', risks: ['园林人流和许可需现场确认', '坐姿与衣摆需要先确认安全和活动范围', '正午顶光时改到回廊阴影或延期'] };
  return { label: '证据驱动拍摄法', visualPrompt: 'realistic editorial photography, coherent anatomy, natural skin texture, credible lighting, clean composition, no text, no collage', poseSummary: '只采用已检索到的姿势与场景证据；没有足够证据时保留原有规则模板。', lightingSummary: '现场光线、天气和日照仍需单独确认，知识库不替代实时判断。', sceneSummary: input.scene ? `围绕“${input.scene}”先勘景，再决定镜头顺序。` : '先确认场景后再锁定机位与焦段。', timelineSummary: '先完成必拍镜头，再进入变化与细节。', risks: ['候选知识需要结合现场验证', '元数据级 Ronin 来源不能直接当作已验证事实'] };
}

export function buildKnowledgeShotList(input, knowledge) {
  const normalized = normalizeInput(input);
  const sources = knowledge?.sources || [];
  const shots = knowledge?.profile === 'fresh-portrait' ? freshPortraitShots(normalized, sources) : knowledge?.profile === 'hanfu-garden' ? hanfuGardenShots(normalized, sources) : [];
  return shots.slice(0, shotCountFor(normalized.duration));
}

export function knowledgeImageDirection(plan, shotIndex = 0) {
  const context = plan?.knowledgeContext || {};
  const shot = (plan?.knowledgeShotList || [])[shotIndex] || null;
  const guidance = context.guidance || {};
  return [guidance.visualPrompt || '', shot ? `camera angle: ${shot.angle}` : '', shot ? `shot size: ${shot.shotSize}` : '', shot ? `composition: ${shot.composition}` : '', shot ? `lighting: ${shot.lighting}` : '', shot ? `pose: ${shot.description}` : '', shot ? `action guidance: ${shot.notes}` : ''].filter(Boolean).join(', ');
}

export class PhotographyKnowledgeService {
  constructor(options = {}) {
    this.searchObsidian = options.searchObsidian;
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.catalogUrl = options.catalogUrl || DEFAULT_CATALOG_URL;
    this.catalogPromise = null;
  }

  async buildForProject(project, references = []) {
    return this.buildForInput({ ...project, references });
  }

  async buildForInput(input) {
    const normalized = normalizeInput(input);
    const terms = knowledgeTerms(normalized);
    const [vaultSources, catalogSources] = await Promise.all([this.findVaultSources(normalized, terms), this.findCatalogSources(terms)]);
    const profile = detectProfile(normalized, vaultSources);
    const guidance = evidenceGuidance(normalized, profile);
    const knowledge = {
      version: 'photoatelier-photography-knowledge-v1', generatedAt: new Date().toISOString(), queryTerms: terms, profile, guidance,
      sources: [...vaultSources, ...catalogSources], vaultSources, catalogSources,
      warnings: [
        ...(catalogSources.some(item => item.groundingStatus === 'metadata-only') ? ['部分 Ronin 条目仅为元数据候选，已保留来源但不作为已验证事实。'] : []),
        ...(!vaultSources.length ? ['未检索到足够的本地摄影笔记，已保留通用规则作为回退。'] : []),
      ],
    };
    knowledge.shots = buildKnowledgeShotList(normalized, knowledge);
    return knowledge;
  }

  async findVaultSources(input, terms) {
    if (typeof this.searchObsidian !== 'function') return [];
    const queries = unique([[input.style, input.scene, '姿势', '拍摄'].filter(Boolean).join(' '), [input.theme, input.mood, '构图 光线'].filter(Boolean).join(' '), input.style ? `${input.style} 拍摄 手册` : '']).filter(Boolean).slice(0, 3);
    const responses = await Promise.all(queries.map(async query => {
      try { const response = await this.searchObsidian(query, { type: 'document', limit: 8 }); return Array.isArray(response) ? response : (response?.items || []); }
      catch (_) { return []; }
    }));
    const byId = new Map();
    responses.flat().filter(item => item?.type === 'document').forEach(item => {
      const source = compactVaultSource(item, terms);
      if (!isPhotographyPath(source.path) && !/摄影|拍摄|姿势|人像|photoatelier/i.test(`${source.title} ${source.excerpt}`)) return;
      if (source.score <= 0) return;
      const existing = byId.get(source.id);
      if (!existing || existing.score < source.score) byId.set(source.id, source);
    });
    return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, MAX_VAULT_SOURCES);
  }

  async findCatalogSources(terms) {
    const catalog = await this.loadCatalog();
    return (catalog.items || []).map(item => compactCatalogSource(item, terms)).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, MAX_CATALOG_SOURCES);
  }

  async loadCatalog() {
    if (!this.catalogPromise) this.catalogPromise = Promise.resolve(this.fetchImpl?.(this.catalogUrl)).then(response => response?.ok ? response.json() : { items: [] }).catch(() => ({ items: [] }));
    return this.catalogPromise;
  }
}

export function applyKnowledgeToFallbackPlan(basePlan, knowledge) {
  const shots = (knowledge?.shots || []).map((shot, index) => ({ ...shot, id: `knowledge-shot-${Date.now()}-${index}`, sequence: index + 1, durationMinutes: shot.duration }));
  if (!shots.length) return { ...basePlan, rationale: `${basePlan.rationale} ${knowledge?.sources?.length ? `已检索 ${knowledge.sources.length} 条摄影知识来源。` : ''}`.trim(), sources: knowledge?.sources || [] };
  return {
    ...basePlan,
    concept: `${basePlan.concept} · ${knowledge.guidance.label}`,
    rationale: `基于本地 Obsidian 摄影笔记与关联候选生成。${knowledge.guidance.timelineSummary}`,
    visualDirection: { ...basePlan.visualDirection, lighting: knowledge.guidance.lightingSummary, composition: knowledge.guidance.sceneSummary, palette: knowledge.profile === 'hanfu-garden' ? '低饱和自然园林色、保留衣料层次与肤色' : basePlan.visualDirection?.palette },
    shots,
    risks: unique([...(basePlan.risks || []), ...(knowledge.guidance.risks || []), ...(knowledge.warnings || [])]),
    sources: knowledge.sources,
    knowledgeContext: knowledge,
  };
}

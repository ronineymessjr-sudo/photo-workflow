(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PhotoWorkflowDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ENTITY_TYPES = Object.freeze([
    'assets', 'topics', 'plans', 'shots', 'styleProfiles', 'lutProfiles',
    'schedules', 'shootRecords', 'reviews', 'publishPackages', 'sources',
    'relations', 'messages', 'candidates', 'meta'
  ]);

  const SCHEDULE_STATUSES = Object.freeze([
    { id: 'preparing', label: '准备中' },
    { id: 'scheduled', label: '待拍摄' },
    { id: 'shooting', label: '拍摄中' },
    { id: 'selecting', label: '待选片' },
    { id: 'delivering', label: '待交付' },
    { id: 'completed', label: '已完成' }
  ]);

  const PLATFORM_SPECS = Object.freeze({
    xiaohongshu: { label: '小红书', ratio: '3:4', duration: '图文或 15-90 秒', titleMax: 20, tagRange: '5-10', language: 'zh-CN', coverSafeArea: '中心 80%' },
    douyin: { label: '抖音', ratio: '9:16', duration: '15-60 秒', titleMax: 55, tagRange: '3-6', language: 'zh-CN', coverSafeArea: '上中部，避开底部按钮区' },
    moments: { label: '朋友圈', ratio: '1:1 / 3:4', duration: '短文或九宫格', titleMax: 50, tagRange: '0-3', language: 'zh-CN', coverSafeArea: '无固定限制' },
    instagram: { label: 'Instagram', ratio: '4:5 / 9:16', duration: 'Reels 15-90s', titleMax: 125, tagRange: '3-8', language: 'en', coverSafeArea: 'center 80%' },
    pinterest: { label: 'Pinterest', ratio: '2:3', duration: '静态图或短视频', titleMax: 100, tagRange: '3-8', language: 'en', coverSafeArea: 'center 85%' },
    tiktok: { label: 'TikTok', ratio: '9:16', duration: '15-60s', titleMax: 100, tagRange: '3-6', language: 'en', coverSafeArea: 'upper center' },
    youtubeShorts: { label: 'YouTube Shorts', ratio: '9:16', duration: '15-60s', titleMax: 100, tagRange: '3-5', language: 'en', coverSafeArea: 'center 80%' }
  });

  const KEYWORD_MAP = Object.freeze({
    '城市': ['urban', 'city'], '夜景': ['night photography', 'city lights'], '电影感': ['cinematic'],
    '街拍': ['street photography'], '复古': ['vintage', 'film look'], '胶片': ['analog film'],
    '人像': ['portrait'], '新中式': ['new chinese style'], '旗袍': ['qipao portrait'],
    '毕业': ['graduation portrait'], '咖啡馆': ['cafe portrait'], '海边': ['beach portrait'],
    '情绪': ['moody portrait'], '清新': ['airy portrait'], '运动': ['dynamic portrait'],
    '情侣': ['couple portrait'], '婚礼': ['wedding photography'], '商业': ['commercial photography']
  });

  function nowIso() { return new Date().toISOString(); }
  function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
  function unique(values) { return [...new Set(asArray(values).map(v => String(v || '').trim()).filter(Boolean))]; }
  function slug(value) {
    return String(value || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'item';
  }
  function stableHash(value) {
    let hash = 2166136261;
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }
  function canonicalUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value);
      ['xsec_token', 'xsec_source', 'utm_source', 'utm_medium', 'utm_campaign', 'spm'].forEach(k => url.searchParams.delete(k));
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch (_) { return String(value).trim(); }
  }

  function normalizeBrief(input) {
    const brief = input || {};
    const text = [brief.theme, brief.style, brief.modelDesc, brief.scene, brief.mood, brief.extra].filter(Boolean).join(' ');
    const zhTokens = text.match(/[\u4e00-\u9fff]{2,8}/g) || [];
    const latinTokens = text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [];
    const mappedEnglish = Object.entries(KEYWORD_MAP)
      .filter(([key]) => text.includes(key))
      .flatMap(([, values]) => values);
    const purposes = [];
    if (/发布|小红书|抖音|instagram|tiktok|海外|seo/i.test(text)) purposes.push('publishing');
    if (/视频|vlog|短片|reels|shorts/i.test(text)) purposes.push('video');
    if (/客片|商业|品牌|报价/i.test(text)) purposes.push('commercial');
    if (!purposes.length) purposes.push('portfolio');
    return {
      theme: String(brief.theme || '').trim(),
      subject: String(brief.modelDesc || '').trim(),
      scene: String(brief.scene || '').trim(),
      mood: String(brief.mood || '').trim(),
      style: String(brief.style || '').trim(),
      purpose: purposes,
      platforms: inferPlatforms(text),
      budget: extractBudget(text),
      duration: String(brief.duration || '').trim(),
      constraints: unique([brief.extra]),
      keywords: unique([...zhTokens, ...latinTokens]).slice(0, 24),
      englishQueries: unique([...mappedEnglish, ...latinTokens]).slice(0, 16),
      normalizedAt: nowIso()
    };
  }

  function inferPlatforms(text) {
    const map = { 小红书: 'xiaohongshu', 抖音: 'douyin', 朋友圈: 'moments', Instagram: 'instagram', Pinterest: 'pinterest', TikTok: 'tiktok', YouTube: 'youtubeShorts', 海外: 'instagram' };
    const found = Object.entries(map).filter(([key]) => new RegExp(key, 'i').test(text)).map(([, id]) => id);
    return unique(found.length ? found : ['xiaohongshu']);
  }

  function extractBudget(text) {
    const match = String(text || '').match(/(?:预算|价格)?\s*[¥￥]?\s*(\d{2,6})(?:\s*[-到至]\s*[¥￥]?\s*(\d{2,6}))?/);
    return match ? { min: Number(match[1]), max: Number(match[2] || match[1]), currency: 'CNY' } : null;
  }

  function createRelation(input) {
    const value = input || {};
    const score = Math.max(0, Math.min(100, Number(value.score == null ? 50 : value.score)));
    return {
      id: value.id || `rel-${stableHash([value.sourceId, value.targetId, value.role])}`,
      sourceId: String(value.sourceId || ''),
      targetId: String(value.targetId || ''),
      role: String(value.role || 'related'),
      score,
      reason: String(value.reason || '基于主题与工作流槽位匹配'),
      provenance: value.provenance || { source: 'local-rule', sourceUrl: '', licenseClass: 'local-private-reference' },
      validationStatus: value.validationStatus || 'pending',
      locked: Boolean(value.locked),
      rejected: Boolean(value.rejected),
      updatedAt: value.updatedAt || nowIso()
    };
  }

  function deduplicateAssets(items) {
    const seen = new Map();
    const duplicates = [];
    const uniqueItems = [];
    asArray(items).forEach((item) => {
      const platformId = item.platformItemId || '';
      const key = platformId ? `platform:${item.platform || ''}:${platformId}`
        : canonicalUrl(item.sourceUrl) ? `url:${canonicalUrl(item.sourceUrl)}`
          : item.contentHash ? `hash:${item.contentHash}`
            : item.perceptualHash ? `phash:${item.perceptualHash}`
              : `fallback:${stableHash([item.title, item.sourceFile, item.size])}`;
      if (seen.has(key)) duplicates.push({ duplicate: item, canonical: seen.get(key), key });
      else { seen.set(key, item); uniqueItems.push(item); }
    });
    return { items: uniqueItems, duplicates };
  }

  function parseCubeLut(text) {
    const lines = String(text || '').split(/\r?\n/);
    const lut = { title: 'Imported LUT', size: 0, domainMin: [0, 0, 0], domainMax: [1, 1, 1], data: [] };
    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      if (line.startsWith('TITLE')) lut.title = line.replace(/^TITLE\s+/, '').replace(/^"|"$/g, '') || lut.title;
      else if (line.startsWith('LUT_3D_SIZE')) lut.size = Number(line.split(/\s+/)[1]);
      else if (line.startsWith('DOMAIN_MIN')) lut.domainMin = line.split(/\s+/).slice(1).map(Number);
      else if (line.startsWith('DOMAIN_MAX')) lut.domainMax = line.split(/\s+/).slice(1).map(Number);
      else if (/^[+-]?(?:\d*\.)?\d/.test(line)) {
        const row = line.split(/\s+/).slice(0, 3).map(Number);
        if (row.length === 3 && row.every(Number.isFinite)) lut.data.push(row);
      }
    });
    if (!Number.isInteger(lut.size) || lut.size < 2 || lut.data.length !== lut.size ** 3) {
      throw new Error(`无效的 3D LUT：声明尺寸 ${lut.size || '未知'}，实际颜色点 ${lut.data.length}`);
    }
    lut.id = `lut-${stableHash([lut.title, lut.size, lut.data.slice(0, 4), lut.data.slice(-4)])}`;
    lut.importedAt = nowIso();
    return lut;
  }

  function sampleCube(lut, red, green, blue, strength) {
    const amount = Math.max(0, Math.min(1, strength == null ? 1 : Number(strength)));
    const size = lut.size;
    const clamp = v => Math.max(0, Math.min(1, v));
    const coord = v => clamp(v) * (size - 1);
    const x = coord(red), y = coord(green), z = coord(blue);
    const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
    const x1 = Math.min(size - 1, x0 + 1), y1 = Math.min(size - 1, y0 + 1), z1 = Math.min(size - 1, z0 + 1);
    const tx = x - x0, ty = y - y0, tz = z - z0;
    const at = (xi, yi, zi) => lut.data[xi + yi * size + zi * size * size];
    const mix = (a, b, t) => a + (b - a) * t;
    const out = [0, 1, 2].map((channel) => {
      const c00 = mix(at(x0, y0, z0)[channel], at(x1, y0, z0)[channel], tx);
      const c10 = mix(at(x0, y1, z0)[channel], at(x1, y1, z0)[channel], tx);
      const c01 = mix(at(x0, y0, z1)[channel], at(x1, y0, z1)[channel], tx);
      const c11 = mix(at(x0, y1, z1)[channel], at(x1, y1, z1)[channel], tx);
      return clamp(mix(mix(c00, c10, ty), mix(c01, c11, ty), tz));
    });
    return [mix(red, out[0], amount), mix(green, out[1], amount), mix(blue, out[2], amount)];
  }

  function serializeCubeLut(lut, targetSize) {
    const size = Number(targetSize || lut.size);
    if (!Number.isInteger(size) || size < 2 || size > 65) throw new Error('LUT 输出尺寸必须是 2-65 的整数');
    const title = `${lut.title || 'PhotoAtelier LUT'} ${size} Point`;
    const lines = [
      `TITLE "${title.replace(/"/g, '')}"`,
      `LUT_3D_SIZE ${size}`,
      'DOMAIN_MIN 0.0 0.0 0.0',
      'DOMAIN_MAX 1.0 1.0 1.0',
      '# Resampled by PhotoAtelier using trilinear interpolation.'
    ];
    for (let blue = 0; blue < size; blue += 1) {
      for (let green = 0; green < size; green += 1) {
        for (let red = 0; red < size; red += 1) {
          const rgb = sampleCube(lut, red / (size - 1), green / (size - 1), blue / (size - 1), 1);
          lines.push(rgb.map(value => value.toFixed(8)).join(' '));
        }
      }
    }
    return `${lines.join('\n')}\n`;
  }

  function buildPublishingPackage(briefInput, relationInput) {
    const brief = briefInput && briefInput.normalizedAt ? briefInput : normalizeBrief(briefInput);
    const relation = relationInput || {};
    const theme = brief.theme || '摄影创作';
    const zh = unique([theme, brief.style, brief.scene, brief.mood, ...(relation.seoKeywords || [])]).slice(0, 12);
    const en = unique([...brief.englishQueries, 'portrait photography', 'photography inspiration']).slice(0, 12);
    const platforms = unique([...brief.platforms, 'instagram', 'pinterest']);
    const packages = platforms.map((id) => {
      const spec = PLATFORM_SPECS[id] || PLATFORM_SPECS.xiaohongshu;
      const english = spec.language === 'en';
      return {
        platform: id,
        label: spec.label,
        spec,
        title: english ? `${en.slice(0, 3).join(' · ')} | ${theme}` : `${theme}｜${zh.slice(1, 4).join(' · ')}`,
        coverText: english ? (en[0] || 'Portrait Story') : theme.slice(0, 12),
        captionOutline: english
          ? ['Visual hook', 'How the frame was made', 'Lighting and color notes', 'Save for your next shoot']
          : ['开头说明成片看点', '交代场景和拍摄方法', '补充光线与调色', '以收藏或咨询收尾'],
        keywords: english ? en : zh,
        altText: english ? `${theme}, ${en.slice(0, 5).join(', ')}` : `${theme}，${zh.slice(0, 5).join('，')}`,
        updatedAt: nowIso()
      };
    });
    return { id: `publish-${stableHash([theme, platforms])}`, brief, platforms: packages, createdAt: nowIso() };
  }

  function evaluateWorkflow(context) {
    const plan = context.plan || {};
    const relations = asArray(context.relations || plan.relationGraph);
    const shots = asArray(context.shots || plan.shots || plan.shotList);
    const issues = [];
    if (!plan.input || !plan.input.theme) issues.push({ code: 'brief.theme', level: 'error', message: '缺少拍摄主题' });
    if (!shots.length) issues.push({ code: 'shots.empty', level: 'warning', message: '尚未生成可执行镜头' });
    const roles = new Set(relations.filter(r => !r.rejected).map(r => r.role));
    ['materialReference', 'shotAngle', 'poseGuide', 'lighting', 'colorLut', 'publishingCopy'].forEach((role) => {
      if (!roles.has(role)) issues.push({ code: `relation.${role}`, level: 'warning', message: `缺少 ${role} 关系` });
    });
    const risky = relations.filter(r => !r.provenance || !r.provenance.source || r.validationStatus === 'rejected');
    if (risky.length) issues.push({ code: 'provenance.missing', level: 'warning', message: `${risky.length} 条推荐缺少有效来源或已被否决` });
    const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + (issue.level === 'error' ? 25 : 8), 0));
    return { passed: !issues.some(i => i.level === 'error') && score >= 70, score, issues, checkedAt: nowIso() };
  }

  async function runWorkflow(input, handlers) {
    const workflowId = `wf-${Date.now().toString(36)}-${stableHash(input).slice(0, 5)}`;
    const stages = ['brief', 'retrieve', 'compose', 'lut', 'publish'];
    const state = { workflowId, input, artifacts: {}, events: [], startedAt: nowIso() };
    for (const stepId of stages) {
      const contract = {
        workflowId, stepId, task: stepId, constraints: input.constraints || [],
        upstreamArtifacts: { ...state.artifacts }, budgetTokens: 1600, timeoutSeconds: 20
      };
      try {
        const handler = handlers && handlers[stepId];
        state.artifacts[stepId] = handler ? await handler(contract, state) : null;
        state.events.push({ stepId, status: 'completed', at: nowIso() });
      } catch (error) {
        state.events.push({ stepId, status: 'degraded', error: error.message || String(error), at: nowIso() });
        state.artifacts[stepId] = { degraded: true, reason: error.message || String(error) };
      }
    }
    state.evaluation = evaluateWorkflow({
      plan: state.artifacts.compose || {},
      relations: state.artifacts.retrieve && state.artifacts.retrieve.relations,
      shots: state.artifacts.compose && state.artifacts.compose.shots
    });
    state.completedAt = nowIso();
    return state;
  }

  function migrateLegacySnapshot(snapshot) {
    const data = snapshot || {};
    const schedules = deduplicateAssets([...(data.pw_schedule || []), ...(data.pw_schedules || [])]).items;
    return {
      plans: asArray(data.pw_plans), schedules, messages: asArray(data.pw_messages),
      reviews: asArray(data.pa_reviews), shootRecords: asArray(data.pa_shoot_records),
      migratedAt: nowIso(), schemaVersion: 1
    };
  }

  return {
    ENTITY_TYPES, SCHEDULE_STATUSES, PLATFORM_SPECS, normalizeBrief, createRelation,
    canonicalUrl, deduplicateAssets, parseCubeLut, sampleCube, serializeCubeLut, buildPublishingPackage,
    evaluateWorkflow, runWorkflow, migrateLegacySnapshot, stableHash, slug, unique, nowIso
  };
});

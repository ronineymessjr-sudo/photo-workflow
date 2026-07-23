/**
 * PhotoAtelier legacy commercial and delivery tools.
 *
 * Purpose (P4):
 *   - Keep quote calculator and batch tools out of the storyboarding core.
 *   - Derive estimates from explicit inputs only; never fabricate payments,
 *     customer records, or final prices.
 *   - Provide a genuine action for every visible AI/delivery control, or a
 *     plain unavailable reason. Remove fake success states.
 *   - Never label a generated concept image as a real reference photograph.
 *
 * This module is intentionally free of DOM mutation and layout decisions;
 * callers (legacy/index.html, app-enhancements.js) render the returned data.
 */

export const DEFAULT_QUOTE_SETTINGS = {
  baseFee: 800,
  perShot: 50,
  perEdit: 30,
  locationFee: 100,
};

const QUOTE_SETTINGS_KEY = 'pa_quote_settings';

/* ---------- Storage helpers (overridable for tests) ---------- */

function getStorage(storage) {
  if (storage) return storage;
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

export function getQuoteSettings(storage) {
  const store = getStorage(storage);
  try {
    const raw = store?.getItem?.(QUOTE_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_QUOTE_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_QUOTE_SETTINGS };
  }
}

export function saveQuoteSettings(settings, storage) {
  const store = getStorage(storage);
  if (!store) return { success: false, reason: '没有可用的本地存储。' };
  try {
    store.setItem(QUOTE_SETTINGS_KEY, JSON.stringify(settings));
    return { success: true };
  } catch {
    return { success: false, reason: '保存报价设置失败。' };
  }
}

/* ---------- Quote estimation (pure, explicit-input only) ---------- */

export function calculateQuoteEstimate({
  shotCount = 0,
  editCount = 0,
  locationCount = 0,
  extraFee = 0,
  settings = {},
} = {}) {
  const safeShotCount = Math.max(0, Number(shotCount) || 0);
  const safeEditCount = Math.max(0, Number(editCount) || 0);
  const safeLocationCount = Math.max(0, Number(locationCount) || 0);
  const safeExtraFee = Math.max(0, Number(extraFee) || 0);

  const mergedSettings = { ...DEFAULT_QUOTE_SETTINGS, ...settings };
  const baseFee = Math.max(0, Number(mergedSettings.baseFee) || 0);
  const perShot = Math.max(0, Number(mergedSettings.perShot) || 0);
  const perEdit = Math.max(0, Number(mergedSettings.perEdit) || 0);
  const locationFee = Math.max(0, Number(mergedSettings.locationFee) || 0);

  const shotFee = safeShotCount * perShot;
  const editFee = safeEditCount * perEdit;
  const locationTotal = safeLocationCount * locationFee;
  const total = baseFee + shotFee + editFee + locationTotal + safeExtraFee;

  return {
    isEstimate: true,
    baseFee,
    perShot,
    perEdit,
    locationFee,
    shotCount: safeShotCount,
    editCount: safeEditCount,
    locationCount: safeLocationCount,
    extraFee: safeExtraFee,
    shotFee,
    editFee,
    locationTotal,
    total,
    breakdown: {
      total,
      items: [
        { label: '基础拍摄费', quantity: 1, unitPrice: baseFee, subtotal: baseFee },
        { label: '镜头拍摄费', quantity: safeShotCount, unitPrice: perShot, subtotal: shotFee },
        { label: '照片精修', quantity: safeEditCount, unitPrice: perEdit, subtotal: editFee },
        { label: '外景场地费', quantity: safeLocationCount, unitPrice: locationFee, subtotal: locationTotal },
        ...(safeExtraFee > 0 ? [{ label: '其他费用', quantity: 1, unitPrice: safeExtraFee, subtotal: safeExtraFee }] : []),
      ],
    },
    disclaimers: [
      '本报价为预估价格，实际费用可能根据拍摄情况调整。',
      '最终价格以双方协商确认为准。',
      '报价有效期为 30 天。',
    ],
  };
}

/* ---------- Document builders (pure strings) ---------- */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateQuoteSheetHtml(plan, estimate) {
  if (!plan || !estimate) {
    return { available: false, reason: '缺少方案或报价数据，无法生成报价单。', html: '' };
  }

  const title = escapeHtml(plan.title || '未命名方案');
  const style = escapeHtml(plan.input?.style || '待定');
  const duration = escapeHtml(plan.input?.duration || '待定');
  const date = new Date().toLocaleDateString();
  const { items, total } = estimate.breakdown;

  const rows = items.map(item => `
    <tr>
      <td>${escapeHtml(item.label)}</td>
      <td>${item.quantity}</td>
      <td>¥${item.unitPrice}</td>
      <td class="text-right">¥${item.subtotal.toLocaleString()}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>拍摄报价单 - ${title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10pt; line-height: 1.6; color: #374151; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #16a34a; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { font-size: 20pt; color: #16a34a; margin-bottom: 5px; }
    .header p { color: #6b7280; font-size: 9pt; }
    .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 9pt; flex-wrap: wrap; gap: 10px; }
    .info-item { flex: 1; min-width: 120px; }
    .info-label { color: #6b7280; font-size: 8pt; }
    .info-value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f0fdf4; color: #166534; padding: 8px; text-align: left; font-size: 9pt; border-bottom: 2px solid #16a34a; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 9pt; }
    .text-right { text-align: right; }
    .total { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .total-final { font-size: 16pt; font-weight: bold; color: #16a34a; border-top: 2px solid #16a34a; padding-top: 10px; margin-top: 10px; }
    .notes { margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; font-size: 8pt; color: #6b7280; }
    .footer { margin-top: 30px; text-align: center; font-size: 8pt; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <h1>拍摄服务报价单</h1>
    <p>PhotoAtelier 摄影方案工作流 · 预估报价</p>
  </div>

  <div class="info">
    <div class="info-item"><div class="info-label">方案名称</div><div class="info-value">${title}</div></div>
    <div class="info-item"><div class="info-label">拍摄风格</div><div class="info-value">${style}</div></div>
    <div class="info-item"><div class="info-label">拍摄时长</div><div class="info-value">${duration}</div></div>
    <div class="info-item"><div class="info-label">报价日期</div><div class="info-value">${date}</div></div>
  </div>

  <table>
    <thead>
      <tr><th>项目</th><th>数量</th><th>单价</th><th class="text-right">小计</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="total">
    <div class="total-row"><span>合计</span><span>¥${total.toLocaleString()}</span></div>
    <div class="total-final"><span>预估报价</span><span>¥${estimate.total.toLocaleString()}</span></div>
  </div>

  <div class="notes">
    <strong>备注说明：</strong><br>
    ${estimate.disclaimers.map(d => `${d}<br>`).join('')}
    如需额外精修，按 ¥${estimate.perEdit}/张 计费。
  </div>

  <div class="footer">
    <p>本报价单由 PhotoAtelier 自动生成</p>
    <p>最终价格以双方协商确认为准</p>
  </div>
</body>
</html>`;

  return { available: true, html };
}

export function generateServiceConfirmationHtml(plan, estimate) {
  if (!plan || !estimate) {
    return { available: false, reason: '缺少方案或报价数据，无法生成服务确认单。', html: '' };
  }

  const title = escapeHtml(plan.title || '未命名方案');
  const style = escapeHtml(plan.input?.style || '待定');
  const date = new Date().toLocaleDateString();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>拍摄服务确认单 - ${title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10pt; line-height: 1.6; color: #374151; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { font-size: 18pt; color: #2563eb; margin-bottom: 5px; }
    .header p { color: #6b7280; font-size: 9pt; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11pt; font-weight: bold; color: #2563eb; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 9pt; }
    .info-item { display: flex; }
    .info-label { color: #6b7280; width: 80px; }
    .info-value { font-weight: 500; }
    .total { background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .total-row { display: flex; justify-content: space-between; font-size: 14pt; font-weight: bold; color: #2563eb; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
    .signature-box { border: 1px solid #d1d5db; padding: 15px; border-radius: 8px; }
    .signature-title { font-size: 9pt; color: #6b7280; margin-bottom: 30px; }
    .signature-line { border-bottom: 1px solid #374151; margin-bottom: 5px; height: 30px; }
    .signature-label { font-size: 8pt; color: #6b7280; }
    .notice { background: #fef3c7; padding: 15px; border-radius: 8px; font-size: 8pt; color: #92400e; margin-top: 20px; }
    .footer { margin-top: 30px; text-align: center; font-size: 8pt; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <h1>拍摄服务确认单</h1>
    <p>（非正式合同，仅作服务确认用途）</p>
  </div>

  <div class="section">
    <div class="section-title">基本信息</div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">方案名称</div><div class="info-value">${title}</div></div>
      <div class="info-item"><div class="info-label">拍摄风格</div><div class="info-value">${style}</div></div>
      <div class="info-item"><div class="info-label">报价日期</div><div class="info-value">${date}</div></div>
      <div class="info-item"><div class="info-label">预估总价</div><div class="info-value">¥${estimate.total.toLocaleString()}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">费用明细</div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">基础拍摄费</div><div class="info-value">¥${estimate.baseFee}</div></div>
      <div class="info-item"><div class="info-label">镜头拍摄费</div><div class="info-value">${estimate.shotCount}×¥${estimate.perShot}=¥${estimate.shotFee}</div></div>
      <div class="info-item"><div class="info-label">照片精修</div><div class="info-value">${estimate.editCount}×¥${estimate.perEdit}=¥${estimate.editFee}</div></div>
      <div class="info-item"><div class="info-label">外景场地费</div><div class="info-value">${estimate.locationCount}×¥${estimate.locationFee}=¥${estimate.locationTotal}</div></div>
    </div>
  </div>

  <div class="total">
    <div class="total-row"><span>预估报价</span><span>¥${estimate.total.toLocaleString()}</span></div>
  </div>

  <div class="notice">
    本确认单为服务预估，不构成最终合同；具体服务内容、交付时间及付款方式以双方签署的正式合同为准。
  </div>

  <div class="signatures">
    <div class="signature-box">
      <div class="signature-title">摄影师 / 服务方</div>
      <div class="signature-line"></div>
      <div class="signature-label">签名 / 日期</div>
    </div>
    <div class="signature-box">
      <div class="signature-title">客户 / 委托方</div>
      <div class="signature-line"></div>
      <div class="signature-label">签名 / 日期</div>
    </div>
  </div>

  <div class="footer">
    <p>本确认单由 PhotoAtelier 自动生成</p>
  </div>
</body>
</html>`;

  return { available: true, html };
}

/* ---------- Batch concept image generation ---------- */

export async function generateBatchConceptImages({
  plan,
  shotList = [],
  count = 9,
  gateway = null,
  promptBuilder = null,
} = {}) {
  if (!gateway) {
    return {
      available: false,
      reason: '当前没有可用的图像生成服务，无法生成 AI 概念图。',
      assets: [],
    };
  }

  const safeCount = Math.max(1, Math.min(9, Number.isFinite(Number(count)) ? Number(count) : 9));
  const safePlan = plan || {};

  const baseInput = {
    theme: safePlan.input?.theme || '摄影方案',
    style: safePlan.input?.style || '自然人像',
    scene: safePlan.input?.scene || '',
    mood: safePlan.input?.mood || '',
    modelDesc: safePlan.input?.modelDesc || '',
    people: Math.max(1, Number(safePlan.input?.people) || 1),
  };

  const prompts = Array.from({ length: safeCount }, (_, index) => {
    const shot = shotList[index % Math.max(1, shotList.length)] || null;
    const custom = promptBuilder ? promptBuilder({ plan: safePlan, shot, index }) : '';
    return [
      'realistic editorial portrait photography',
      `subject: ${baseInput.modelDesc || (baseInput.people > 1 ? `${baseInput.people} 位成年人` : '一位成年人物')}`,
      baseInput.theme ? `theme: ${baseInput.theme}` : '',
      `style: ${baseInput.style}`,
      baseInput.scene ? `scene: ${baseInput.scene}` : 'scene chosen to support the brief',
      baseInput.mood ? `mood: ${baseInput.mood}` : '',
      custom,
      'natural skin texture, believable lighting, clear photographic composition',
      'no text, no watermark, no collage, no split screen',
    ].filter(Boolean).join(', ');
  });

  try {
    const result = await gateway.generateConceptImages({
      planId: safePlan.id,
      count: safeCount,
      prompts,
    });

    const rawAssets = Array.isArray(result?.assets) ? result.assets : [];
    const assets = rawAssets.map((asset, index) => ({
      ...asset,
      id: asset.id || `concept-${safePlan.id || 'plan'}-${index + 1}`,
      synthetic: true,
      source: 'ai-concept',
      kind: 'concept-image',
      label: 'AI 视觉预演',
      prompt: prompts[index] || asset.prompt || '',
      at: new Date().toISOString(),
    }));

    return {
      available: true,
      generatedCount: assets.length,
      assets,
    };
  } catch (err) {
    return {
      available: false,
      reason: `图像生成失败：${err?.message || '未知错误'}`,
      assets: [],
    };
  }
}

/* ---------- AI control availability (honest states) ---------- */

export function getAiControlState({
  plan = null,
  shotList = [],
  imageGateway = null,
  recommendationGateway = null,
} = {}) {
  const hasPlan = !!plan;
  const hasGateway = !!imageGateway;
  const hasRecommendationGateway = !!recommendationGateway;

  return {
    aiRecommendation: {
      available: hasPlan && hasRecommendationGateway,
      reason: !hasPlan
        ? '请先打开一个方案。'
        : !hasRecommendationGateway
          ? '当前没有可用的推荐服务。'
          : '',
      action: hasPlan && hasRecommendationGateway ? '获取创意建议' : '不可用',
    },
    conceptImage: {
      available: hasPlan && hasGateway,
      reason: !hasPlan
        ? '请先打开一个方案。'
        : !hasGateway
          ? '当前没有可用的图像生成服务。'
          : '',
      action: hasPlan && hasGateway ? '生成概念图' : '不可用',
      note: 'AI 概念图仅用于视觉预演，不会替代真实参考照片。',
    },
    generatedImage: {
      available: hasPlan && hasGateway && shotList.length > 0,
      reason: !hasPlan
        ? '请先打开一个方案。'
        : !hasGateway
          ? '当前没有可用的图像生成服务。'
          : shotList.length === 0
            ? '当前方案没有可生成预览的镜头。'
            : '',
      action: hasPlan && hasGateway && shotList.length > 0 ? '批量生成预览' : '不可用',
    },
  };
}

/* ---------- Delivery control availability ---------- */

export function getDeliveryControlState({
  plan = null,
  schedule = null,
  shootRecords = [],
  selectedImages = [],
} = {}) {
  const hasPlan = !!plan;
  const hasSchedule = !!schedule;
  const hasShootRecords = Array.isArray(shootRecords) && shootRecords.length > 0;
  const hasSelectedImages = Array.isArray(selectedImages) && selectedImages.length > 0;

  return {
    prepare: {
      available: hasPlan,
      reason: hasPlan ? '' : '请先打开一个方案。',
      action: hasPlan ? '准备拍摄' : '不可用',
    },
    shoot: {
      available: hasPlan && hasSchedule,
      reason: !hasPlan ? '请先打开一个方案。' : !hasSchedule ? '请先创建拍摄日程。' : '',
      action: hasPlan && hasSchedule ? '开始拍摄' : '不可用',
    },
    select: {
      available: hasPlan && hasShootRecords,
      reason: !hasPlan ? '请先打开一个方案。' : !hasShootRecords ? '暂无拍摄记录。' : '',
      action: hasPlan && hasShootRecords ? '选片' : '不可用',
    },
    edit: {
      available: hasPlan && hasSelectedImages,
      reason: !hasPlan ? '请先打开一个方案。' : !hasSelectedImages ? '请先选择要精修的片子。' : '',
      action: hasPlan && hasSelectedImages ? '进入后期' : '不可用',
    },
    deliver: {
      available: hasPlan && hasSelectedImages,
      reason: !hasPlan ? '请先打开一个方案。' : !hasSelectedImages ? '无可交付内容。' : '',
      action: hasPlan && hasSelectedImages ? '交付成片' : '不可用',
    },
    review: {
      available: hasPlan,
      reason: hasPlan ? '' : '请先打开一个方案。',
      action: hasPlan ? '客户审阅' : '不可用',
    },
  };
}

/* ---------- Global attachment for legacy/non-module callers ---------- */

const publicApi = {
  DEFAULT_QUOTE_SETTINGS,
  getQuoteSettings,
  saveQuoteSettings,
  calculateQuoteEstimate,
  generateQuoteSheetHtml,
  generateServiceConfirmationHtml,
  generateBatchConceptImages,
  getAiControlState,
  getDeliveryControlState,
};

if (typeof globalThis !== 'undefined') {
  globalThis.PhotoAtelierCommercialTools = publicApi;
}

export default publicApi;

// Image-provider catalog and selection.
//
// The brain and the brush are separate services:
//   brain  = DeepSeek API (planning + vision QC), always the same
//   brush  = any image API the user picks; this file ranks them by price tier
//            and by whether they can actually take reference images
//
// Price tiers are qualitative on purpose. Per-image pricing changes monthly and
// differs by region/contract, so quoting exact numbers here would rot fast; each
// entry carries the vendor console URL instead.

export const PRICE_TIERS = { low: 1, medium: 2, high: 3 };
export const PRICE_LABELS = { low: '便宜', medium: '中等', high: '偏贵' };

export const IMAGE_PROVIDERS = [
    {
        id: 'siliconflow-flux-kontext',
        label: 'SiliconFlow · FLUX.1 Kontext',
        adapter: 'reference-json',
        priceTier: 'low',
        supportsReferences: true,
        maxReferences: 4,
        aspectControl: true,
        watermark: false,
        env: ['CONTINUITY_IMAGE_ENDPOINT', 'CONTINUITY_IMAGE_KEY'],
        pricingNote: '按张计费，改图类任务里属于便宜档；具体单价看控制台',
        console: 'https://cloud.siliconflow.cn',
        bestFor: '白底换脸、局部改图（能同时给人物与底模两张参考）',
    },
    {
        id: 'zhipu-cogview',
        label: '智谱 · CogView',
        adapter: 'reference-json',
        priceTier: 'low',
        supportsReferences: true,
        maxReferences: 3,
        aspectControl: true,
        watermark: true,
        env: ['CONTINUITY_IMAGE_ENDPOINT', 'CONTINUITY_IMAGE_KEY'],
        pricingNote: '有低价小模型档位；出图带平台标识时需后处理',
        console: 'https://open.bigmodel.cn',
        bestFor: '批量试稿、画面概念图',
    },
    {
        id: 'volcengine-seedream',
        label: '火山方舟 · Seedream',
        adapter: 'reference-json',
        priceTier: 'medium',
        supportsReferences: true,
        maxReferences: 6,
        aspectControl: true,
        watermark: false,
        env: ['CONTINUITY_IMAGE_ENDPOINT', 'CONTINUITY_IMAGE_KEY'],
        pricingNote: '按张计费，多图参考支持较好',
        console: 'https://console.volcengine.com/ark',
        bestFor: '多参考合成（人物 + 场景 + 风格）',
    },
    {
        id: 'aliyun-wanx',
        label: '阿里云百炼 · 通义万相',
        adapter: 'reference-json',
        priceTier: 'medium',
        supportsReferences: true,
        maxReferences: 3,
        aspectControl: true,
        watermark: true,
        env: ['CONTINUITY_IMAGE_ENDPOINT', 'CONTINUITY_IMAGE_KEY'],
        pricingNote: '按张计费，部分接口支持参考图/人像风格',
        console: 'https://bailian.console.aliyun.com',
        bestFor: '人像风格化、电商图',
    },
    {
        id: 'minimax-image',
        label: 'MiniMax · 图像生成',
        adapter: 'reference-json',
        priceTier: 'medium',
        supportsReferences: false,
        maxReferences: 0,
        aspectControl: true,
        watermark: false,
        env: ['CONTINUITY_IMAGE_ENDPOINT', 'CONTINUITY_IMAGE_KEY'],
        pricingNote: '纯文生图为主，锁不住人，只能做概念图',
        console: 'https://platform.minimaxi.com',
        bestFor: '概念稿（不用于连续组图）',
    },
    {
        id: 'gpt-image-2',
        label: 'OpenAI · GPT Image',
        adapter: 'openai-images-edits',
        priceTier: 'high',
        supportsReferences: true,
        maxReferences: 16,
        aspectControl: true,
        watermark: false,
        env: ['OPENAI_API_KEY'],
        pricingNote: '按 token/张计费，属于偏贵档；编辑模式人物保持最好',
        console: 'https://platform.openai.com',
        bestFor: '对质感与指令遵循要求最高的成片',
    },
    {
        id: 'manual-chatgpt-web',
        label: '手动 · ChatGPT 网页',
        adapter: 'handoff',
        priceTier: 'low',
        supportsReferences: true,
        maxReferences: 3,
        aspectControl: false,
        watermark: true,
        env: [],
        pricingNote: '不产生 API 费用，用你已有的订阅；代价是手动、出方图、带角标',
        console: 'https://chatgpt.com',
        bestFor: '验证阶段、少量精修',
    },
];

export const DEFAULT_PROVIDER_ID = 'manual-chatgpt-web';

export function listProviders({ needReferences = false, maxPriceTier = '' } = {}) {
    const ceiling = PRICE_TIERS[maxPriceTier] || 0;
    return IMAGE_PROVIDERS
        .filter(provider => !needReferences || provider.supportsReferences)
        .filter(provider => !ceiling || PRICE_TIERS[provider.priceTier] <= ceiling)
        .sort((a, b) => PRICE_TIERS[a.priceTier] - PRICE_TIERS[b.priceTier] || b.maxReferences - a.maxReferences)
        .map(provider => ({ ...provider, priceLabel: PRICE_LABELS[provider.priceTier] }));
}

// "找便宜的接" as a function: cheapest provider that can take the references we
// actually have, and that has credentials configured. The manual chat channel
// needs no credentials, so "nothing configured" is not an error - it just means
// only the manual route is available.
export function recommendProvider({ needReferences = true, configuredEnv = {}, maxPriceTier = '' } = {}) {
    const candidates = listProviders({ needReferences, maxPriceTier });
    const isConfigured = provider => provider.env.length === 0 || provider.env.every(key => Boolean(configuredEnv[key]));
    const configured = candidates.filter(isConfigured);
    const apiReady = configured.filter(provider => provider.adapter !== 'handoff');
    return {
        recommended: apiReady[0]?.id || configured[0]?.id || '',
        candidates,
        configuredIds: configured.map(provider => provider.id),
        apiReadyIds: apiReady.map(provider => provider.id),
        manualOnly: apiReady.length === 0,
        blockedReason: configured.length
            ? (apiReady.length ? '' : '只配了手动通道：能出图但要人工搬运，且出方图、带角标')
            : '没有任何图像服务配置了凭据，也没有手动通道可用',
    };
}

export function resolveProvider(providerId) {
    return IMAGE_PROVIDERS.find(provider => provider.id === providerId) || null;
}

export function assertGroupProvider(group, providerId) {
    const provider = resolveProvider(providerId);
    if (!provider) throw new Error(`未登记的图像服务：${providerId}`);
    if (!provider.supportsReferences) throw new Error(`${provider.label} 不支持参考图，不能用于连续组图`);
    return provider;
}

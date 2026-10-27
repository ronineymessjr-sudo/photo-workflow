// Provider capability gate.
//
// The methodology's hard rule: if a service only accepts text, the pipeline must
// say so and stop. Silently falling back to text-only is how a "series" turns
// into nine unrelated people.
export class ProviderCapabilityError extends Error {
    constructor(providerId, reason) {
        super(`当前模型不支持参考图一致性：${providerId}（${reason}）`);
        this.name = 'ProviderCapabilityError';
        this.providerId = providerId;
        this.reason = reason;
    }
}

export const PROVIDERS = {
    'gpt-image-2': {
        label: 'GPT Image 2 / 2.5（images/edits）',
        supportsReferences: true,
        roles: ['identity', 'scene', 'style'],
        maxReferences: 16,
        supportsSeed: false,
        note: '编辑模式 + input_fidelity；同一线程连续编辑，身份保持最好',
    },
    'flux-kontext': {
        label: 'Flux Kontext / nano-banana',
        supportsReferences: true,
        roles: ['identity', 'scene', 'style'],
        maxReferences: 4,
        supportsSeed: true,
        note: '参考图放第一位；支持 multi-reference 时按 role 顺序传',
    },
    'sdxl-ipadapter': {
        label: 'SDXL + IP-Adapter FaceID（本地 ComfyUI）',
        supportsReferences: true,
        roles: ['identity', 'scene', 'style'],
        maxReferences: 3,
        supportsSeed: true,
        note: 'FaceID 锁脸、depth 锁场景、openpose 锁姿势；需本地环境',
    },
    'deepseek-vision': {
        label: 'DeepSeek 视觉（图片理解）',
        supportsReferences: false,
        roles: [],
        maxReferences: 0,
        supportsSeed: false,
        canPlan: true,
        canReview: true,
        canGenerate: false,
        note: '官方接口为图片输入理解，不能出图；只做规划与视觉审查',
    },
};

export function resolveProvider(providerId) {
    const provider = PROVIDERS[providerId];
    if (!provider) {
        throw new ProviderCapabilityError(providerId, '未登记的图像服务，无法确认是否支持参考图');
    }
    return provider;
}

// Fail closed: planning and generation are separated, and generation refuses to
// run without reference conditioning.
export function assertCanGenerate(providerId, references = []) {
    const provider = resolveProvider(providerId);
    if (provider.canGenerate === false || !provider.supportsReferences) {
        throw new ProviderCapabilityError(providerId, provider.note || '只接受文字提示词');
    }
    const roles = new Set(references.map(reference => reference.role));
    const missingRoles = provider.roles.filter(role => !roles.has(role));
    if (missingRoles.length) {
        throw new ProviderCapabilityError(providerId, `缺少参考角色：${missingRoles.join('、')}，不允许用纯文字补位`);
    }
    const unconfirmed = references.filter(reference => reference.status !== 'confirmed');
    if (unconfirmed.length) {
        throw new ProviderCapabilityError(providerId, `参考图未确认：${unconfirmed.map(reference => reference.assetId).join('、')}`);
    }
    if (references.length > provider.maxReferences) {
        throw new ProviderCapabilityError(providerId, `参考图数量超过上限 ${provider.maxReferences}`);
    }
    return provider;
}

export function assertCanPlan(providerId) {
    const provider = resolveProvider(providerId);
    if (provider.canPlan !== true) {
        throw new ProviderCapabilityError(providerId, '该服务不承担规划');
    }
    return provider;
}

export function assertCanReview(providerId) {
    const provider = resolveProvider(providerId);
    if (provider.canReview !== true) {
        throw new ProviderCapabilityError(providerId, '该服务不承担视觉质检');
    }
    return provider;
}

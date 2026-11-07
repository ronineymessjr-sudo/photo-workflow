import { buildReferenceProposal, isAtlasLink } from './core.mjs';
import { loadStudioRegistry } from './registry.mjs';
import { deriveReferenceGuidance, isNaturalPoseRequested } from './reference-brief.mjs';
import { parseServerIntent, runWeakModelAssisted } from './agent-lite.mjs';
import { createWeakProvider } from './weak-provider.mjs';

const RECEIPT_TTL_MS = 10 * 60 * 1000;
const MODEL_DAILY_LIMIT = 5;
const encoder = new TextEncoder();

export class AiStudioError extends Error {
    constructor(code, status = 400) {
        super(code);
        this.code = code;
        this.status = status;
    }
}

function base64UrlEncode(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

async function hmacKey(secret, usages) {
    if (typeof secret !== 'string' || secret.length < 16) throw new AiStudioError('AI_STUDIO_SIGNING_NOT_CONFIGURED', 503);
    return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages);
}

async function signPayload(payload, secret) {
    const bytes = encoder.encode(JSON.stringify(payload));
    const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), bytes);
    return `${base64UrlEncode(bytes)}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function verifyPayload(token, secret, now = Date.now()) {
    if (typeof token !== 'string' || token.length > 30000) throw new AiStudioError('INVALID_RECEIPT');
    const [encoded, signed, extra] = token.split('.');
    if (!encoded || !signed || extra) throw new AiStudioError('INVALID_RECEIPT');
    let payloadBytes;
    let signature;
    try {
        payloadBytes = base64UrlDecode(encoded);
        signature = base64UrlDecode(signed);
    } catch {
        throw new AiStudioError('INVALID_RECEIPT');
    }
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret, ['verify']), signature, payloadBytes);
    if (!valid) throw new AiStudioError('INVALID_RECEIPT');
    let payload;
    try { payload = JSON.parse(new TextDecoder().decode(payloadBytes)); }
    catch { throw new AiStudioError('INVALID_RECEIPT'); }
    if (!payload || typeof payload !== 'object' || payload.exp <= now) throw new AiStudioError('PROPOSAL_EXPIRED', 410);
    return payload;
}

async function digestHex(value) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
    return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function validatePlanBinding(planId, expectedRevision) {
    if (typeof planId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(planId)) throw new AiStudioError('INVALID_PLAN_ID');
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new AiStudioError('INVALID_PLAN_REVISION');
}

async function consumeQuota(env, identity, action, limit) {
    const quotaNamespace = env.AI_STUDIO_QUOTA;
    if (!quotaNamespace?.idFromName || !quotaNamespace?.get) return null;
    try {
        const id = quotaNamespace.idFromName(await digestHex(identity));
        const response = await quotaNamespace.get(id).fetch('https://ai-studio-quota.internal/consume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, limit }),
        });
        if (!response.ok) return false;
        return (await response.json()).allowed === true;
    } catch {
        return false;
    }
}

export async function consumeStudioSearchQuota({ uid, ip, env = {} }) {
    const identity = uid ? `user:${uid}` : `guest:${ip || 'unknown'}`;
    return consumeQuota(env, identity, 'search', 60);
}

export async function consumeStudioImageQuota({ uid, env = {} }) {
    if (!uid) return false;
    // Limits are configurable: at 5/6 per day the whole test cycle dead-ends
    // after a handful of frames. Defaults stay conservative; deployments that
    // mean to test at volume raise them through env.
    const userLimit = Number(env.STUDIO_IMAGE_USER_LIMIT) > 0 ? Number(env.STUDIO_IMAGE_USER_LIMIT) : 5;
    const globalLimit = Number(env.STUDIO_IMAGE_GLOBAL_LIMIT) > 0 ? Number(env.STUDIO_IMAGE_GLOBAL_LIMIT) : 6;
    const userAllowed = await consumeQuota(env, `user:${uid}`, 'image', userLimit);
    if (userAllowed !== true) return userAllowed;
    const globalAllowed = await consumeQuota(env, 'global:cloud-image', 'image-global', globalLimit);
    return globalAllowed === true ? true : globalAllowed === null ? null : 'global-limit';
}

async function consumeModelQuota(env, uid) {
    return (await consumeQuota(env, `user:${uid}`, 'model', MODEL_DAILY_LIMIT)) === true;
}

export async function searchStudio({ prompt, planId, expectedRevision, uid, env = {}, now = Date.now(), fetchImpl = fetch, intentProviderFactory }) {
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 1800) throw new AiStudioError('INVALID_PROMPT');
    const intent = parseServerIntent(prompt);
    if (uid && planId !== undefined) validatePlanBinding(planId, expectedRevision);
    const { registry, library } = await loadStudioRegistry({ fetchImpl, enabled: env.POSEATLAS_ENABLED !== 'false' });
    const hasModelConfig = Boolean(uid && (intentProviderFactory || (env.OPENAI_API_KEY && env.AI_STUDIO_MODEL)));
    let provider = null;
    let quotaUnavailable = false;

    if (!intent.specs.length && intent.reason !== 'explicit-no-search' && hasModelConfig) {
        if (await consumeModelQuota(env, uid)) {
            try {
                provider = intentProviderFactory ? await intentProviderFactory() : createWeakProvider({ apiKey: env.OPENAI_API_KEY, model: env.AI_STUDIO_MODEL, timeoutMs: 8000, fetchImpl });
            } catch { provider = null; }
        } else {
            quotaUnavailable = true;
        }
    }

    const naturalPoseOnly = isNaturalPoseRequested(prompt)
        && !/(?:采用|选择|需要|想要|来个|拍摄|摆|use|want|choose)[^。\n;；]{0,12}(?:跪|后仰|躺|趴|劈叉|倒立|kneel|reclin|supine|prone|split)/i.test(prompt);
    const result = await runWeakModelAssisted({ registry, prompt, provider,
        requireImageReferences: env.POSEATLAS_ENABLED !== 'false', naturalPoseOnly });
    result.library = library;
    result.externalTemplateRequests = library.externalRequests || 0;
    if (result.selectedTemplates.length) result.reply = `已检索并匹配 ${result.selectedTemplates.length} 个候选参考，请选择后生成提案。`;
    if (quotaUnavailable) result.modelStatus = 'quota-unavailable';
    if (uid && planId !== undefined) {
        if (result.status === 'proposal-ready') {
            result.searchReceipt = await signPayload({
                typ: 'ai-studio-search',
                sub: uid,
                planId,
                expectedRevision,
                selectedIds: result.selectedIds,
                prompt,
                reply: result.reply,
                exp: now + RECEIPT_TTL_MS,
            }, env.JWT_SECRET);
        }
    }
    return result;
}

export async function createStudioProposal({ searchReceipt, selectedIds, uid, env = {}, now = Date.now(), fetchImpl = fetch }) {
    const receipt = await verifyPayload(searchReceipt, env.JWT_SECRET, now);
    if (receipt.typ !== 'ai-studio-search' || receipt.sub !== uid || !Array.isArray(receipt.selectedIds)) throw new AiStudioError('INVALID_RECEIPT');
    validatePlanBinding(receipt.planId, receipt.expectedRevision);
    const { registry } = await loadStudioRegistry({ fetchImpl, enabled: env.POSEATLAS_ENABLED !== 'false' });
    if (!Array.isArray(selectedIds) || selectedIds.length < 1 || selectedIds.length > 6 || new Set(selectedIds).size !== selectedIds.length) {
        throw new AiStudioError('INVALID_SELECTION');
    }
    if (selectedIds.some(id => typeof id !== 'string' || !receipt.selectedIds.includes(id) || !registry.find(id))) {
        throw new AiStudioError('UNAUTHORIZED_TEMPLATE');
    }
    const proposal = buildReferenceProposal(registry, {
        planId: receipt.planId,
        expectedRevision: receipt.expectedRevision,
        templateIds: selectedIds,
    });
    const templatesById = new Map(selectedIds.map(id => [id, registry.find(id)]));
    proposal.commands = proposal.commands.map(command => {
        const template = templatesById.get(command.reference.sourceItemId);
        return {
            ...command,
            reference: {
                ...command.reference,
                kind: template.kind,
                angles: template.angles || [],
                tags: template.tags || [],
                rightsStatus: template.rightsStatus,
                sourceUrl: template.sourceUrl,
            },
        };
    });
    proposal.guidance = deriveReferenceGuidance(selectedIds.map(id => registry.find(id)), { style: receipt.prompt });
    proposal.conversation = [{ role: 'user', content: receipt.prompt || '', at: new Date(now).toISOString() },
        { role: 'assistant', content: receipt.reply || '', at: new Date(now).toISOString() }];
    const proposalPayload = {
        typ: 'ai-studio-proposal',
        sub: uid,
        exp: Math.min(receipt.exp, now + RECEIPT_TTL_MS),
        proposal,
    };
    return {
        proposal,
        proposalToken: await signPayload(proposalPayload, env.JWT_SECRET),
        selectedTemplates: selectedIds.map(id => registry.find(id)),
    };
}

export async function confirmStudioProposal({ proposalToken, idempotencyKey, uid, env = {}, now = Date.now() }) {
    const payload = await verifyPayload(proposalToken, env.JWT_SECRET, now);
    const proposal = payload.proposal;
    if (payload.typ !== 'ai-studio-proposal' || payload.sub !== uid || !proposal || proposal.status !== 'pending') {
        throw new AiStudioError('INVALID_PROPOSAL');
    }
    if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9._:-]{8,120}$/.test(idempotencyKey)) {
        throw new AiStudioError('INVALID_IDEMPOTENCY_KEY');
    }
    if (!Array.isArray(proposal.commands) || proposal.commands.length < 1 || proposal.commands.length > 6 || proposal.commands.some(command => {
        const reference = command?.reference;
        return command?.type !== 'upsert_reference' || !reference || !/^[a-z0-9][a-z0-9_-]{2,63}$/.test(reference.sourceItemId || '')
            || (reference.externalUrl && !isAtlasLink(reference.externalUrl));
    })) throw new AiStudioError('INVALID_PROPOSAL');

    return {
        confirmed: true,
        proposalId: proposal.id,
        commitId: await digestHex(`${uid}:${proposal.id}:${idempotencyKey}`),
        planId: proposal.planId,
        expectedRevision: proposal.expectedRevision,
        references: proposal.commands.map(command => command.reference),
        guidance: proposal.guidance,
        conversation: proposal.conversation,
    };
}

export async function getStudioCatalogStats(options = {}) {
    const { registry, library } = await loadStudioRegistry(options);
    return { ...registry.stats(), library };
}

// Reuse the existing PhotoAtelier eight-table writer and its business-id contract.
export const FEISHU_SYNC_SERVICE = 'https://photoatelier-v2-api.photomagic.workers.dev';
export const MAX_FEISHU_RECORD_BYTES = 64 * 1024;

const ENTITIES = ['references', 'plans'];
const tokenConfigured = env => typeof env.APP_SYNC_TOKEN === 'string' && /^[\x21-\x7e]{16,512}$/.test(env.APP_SYNC_TOKEN);

export function studioFeishuStatus(env = {}) {
    return { credential_configured: tokenConfigured(env), service: FEISHU_SYNC_SERVICE };
}

export class FeishuSyncError extends Error {
    constructor(code) { super(code); this.code = code; }
}

async function request(entity, operation, env, fetchImpl, records) {
    const response = await fetchImpl(`${FEISHU_SYNC_SERVICE}/api/feishu/${entity}/${operation}`, {
        method: operation === 'sync' ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', 'X-PhotoAtelier-Token': env.APP_SYNC_TOKEN },
        ...(operation === 'sync' ? { body: JSON.stringify({ records }) } : {}),
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new FeishuSyncError([401, 403].includes(response.status) ? 'FEISHU_SYNC_AUTH_FAILED' : 'FEISHU_SYNC_UNAVAILABLE');
    let payload;
    try { payload = await response.json(); } catch { throw new FeishuSyncError('FEISHU_SYNC_INVALID_RESPONSE'); }
    if (payload?.ok !== true) throw new FeishuSyncError('FEISHU_SYNC_INVALID_RESPONSE');
    if (operation === 'records' && !Array.isArray(payload.records)) throw new FeishuSyncError('FEISHU_SYNC_INVALID_RESPONSE');
    return payload;
}

export async function checkStudioFeishuConnection({ env = {}, fetchImpl = fetch } = {}) {
    const status = studioFeishuStatus(env);
    if (!status.credential_configured) return { ...status, connected: false, code: 'FEISHU_SYNC_NOT_CONFIGURED' };
    try {
        for (const entity of ENTITIES) await request(entity, 'records', env, fetchImpl);
        return { ...status, connected: true };
    } catch (error) {
        return { ...status, connected: false, code: error instanceof FeishuSyncError ? error.code : 'FEISHU_SYNC_UNAVAILABLE' };
    }
}

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
}

async function digest(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)));
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function fields(value, keys) {
    const result = {};
    for (const key of keys) {
        const item = value?.[key];
        const safeText = text => typeof text === 'string' && !/^(?:data:|blob:)/i.test(text.trim());
        if (safeText(item) || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))) result[key] = item;
        else if (Array.isArray(item) && item.every(safeText)) result[key] = [...item];
    }
    return result;
}

function referenceFields(reference) {
    return fields(reference, ['id', 'sourceItemId', 'upstreamId', 'title', 'kind', 'source', 'sourceUrl', 'externalUrl', 'attribution', 'rightsStatus', 'licenseStatus', 'createdAt', 'focalLength', 'poseNumber', 'number', 'tags', 'angles']);
}

function planFields(plan) {
    const projected = fields(plan, ['title', 'concept', 'rationale', 'summary', 'style', 'createdAt', 'timestamp', 'savedAt', 'updatedAt', 'generationMode', 'visualDirection', 'preparationGuide', 'risks', 'equipment']);
    projected.input = fields(plan.input, ['theme', 'style', 'modelDesc', 'scene', 'mood', 'duration', 'people', 'extra', 'shootingType', 'date', 'time', 'location', 'equipment']);
    projected.shotList = (plan.shotList || []).map(shot => ({
        ...fields(shot, ['id', 'scene', 'description', 'shotSize', 'title', 'sourceShotIndex', 'method', 'focalLength', 'composition', 'lighting', 'wardrobe', 'props', 'angle', 'mood', 'duration', 'notes', 'lightingSetup', 'priority', 'alternative', 'action', 'pose', 'cameraPosition', 'cameraAngle', 'movement', 'expression', 'background', 'focus']),
        directorContract: fields(shot.directorContract, ['shot_language', 'model_pose', 'photographer_position', 'lens', 'model_position', 'wardrobe_styling', 'lighting_setup', 'shot_props', 'crop_boundary', 'must_show', 'reject_if', 'execution_note', 'generator_prompt', 'shot_size', 'camera_angle', 'framing', 'sourceIndex']),
    }));
    projected.sections = (plan.sections || []).map(section => fields(section, ['ti', 'ic', 'c']));
    const studio = plan.aiStudio;
    projected.aiStudio = {
        ...fields(studio, ['revision', 'appliedProposalIds']),
        references: studio.references.map(referenceFields),
        guidance: {
            ...fields(studio.guidance, ['style', 'brief']),
            suggestions: (studio.guidance?.suggestions || []).map(item => fields(item, ['sourceItemId', 'kind', 'direction'])),
        },
        conversation: (studio.conversation || []).map(message => fields(message, ['role', 'content', 'at'])),
    };
    return projected;
}

export async function buildStudioFeishuRecords({ uid, plan }) {
    if (typeof uid !== 'string' || !uid || uid.length > 128 || !plan || !['string', 'number'].includes(typeof plan.id)) throw new FeishuSyncError('INVALID_PLAN_SYNC_INPUT');
    if (!Number.isSafeInteger(plan.revision) || plan.revision < 1) throw new FeishuSyncError('INVALID_PLAN_SYNC_REVISION');
    const references = plan.aiStudio?.references;
    if (!Array.isArray(references) || !references.length || references.some(item => !item || typeof item.sourceItemId !== 'string' || !item.sourceItemId)) throw new FeishuSyncError('INVALID_PLAN_SYNC_REFERENCES');
    if (new Set(references.map(item => item.sourceItemId)).size !== references.length) throw new FeishuSyncError('INVALID_PLAN_SYNC_REFERENCES');
    const updatedAt = plan.aiStudio.sync?.updatedAt;
    if (typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt))) throw new FeishuSyncError('INVALID_PLAN_SYNC_TIMESTAMP');
    const originalPlanId = String(plan.id);
    const identity = await digest([uid, originalPlanId]);
    const planId = `ai-studio-plan-${identity}`;
    const projectId = `ai-studio-project-${identity}`;
    const projected = planFields(plan);
    const common = { ownerId: uid, originalPlanId, projectId, revision: plan.revision, updatedAt };
    const planRecord = {
        ...projected, ...common, id: planId,
        createdAt: projected.createdAt || projected.timestamp || updatedAt,
        concept: projected.concept || projected.title || projected.input.theme || '',
        visualDirection: projected.visualDirection || projected.input.style || '',
        generationMode: projected.generationMode || 'ai-studio-reference',
    };
    planRecord.aiStudioSyncFingerprint = await digest(planRecord);
    const referenceRecords = await Promise.all(references.map(async reference => {
        const safeReference = referenceFields(reference);
        const record = {
            ...safeReference, ...common, id: `ai-studio-reference-${await digest([uid, originalPlanId, reference.sourceItemId])}`,
            planId, originalReferenceId: safeReference.id || '',
            createdAt: safeReference.createdAt || planRecord.createdAt,
            sourcePlatform: safeReference.source || 'PhotoAtelier',
            sourceUrl: safeReference.sourceUrl || safeReference.externalUrl || '',
            styleTags: safeReference.tags || [], category: safeReference.kind || 'reference',
        };
        record.aiStudioSyncFingerprint = await digest(record);
        return record;
    }));
    for (const record of [planRecord, ...referenceRecords]) {
        if (new TextEncoder().encode(JSON.stringify(record)).byteLength > MAX_FEISHU_RECORD_BYTES) throw new FeishuSyncError('FEISHU_SYNC_RECORD_TOO_LARGE');
    }
    return { plans: [planRecord], references: referenceRecords };
}

export async function syncStudioPlan({ uid, plan, env = {}, fetchImpl = fetch }) {
    const snapshot = { planId: plan?.id, revision: plan?.revision, sourceUpdatedAt: plan?.aiStudio?.sync?.updatedAt };
    if (!tokenConfigured(env)) return { ...snapshot, status: 'pending', code: 'FEISHU_SYNC_NOT_CONFIGURED' };
    return syncStudioPlanWithWriter({ uid, plan, writer: {
        sync: (entity, records) => request(entity, 'sync', env, fetchImpl, records),
        records: async entity => (await request(entity, 'records', env, fetchImpl)).records,
    } });
}

export async function syncStudioPlanWithWriter({ uid, plan, writer }) {
    const snapshot = { planId: plan?.id, revision: plan?.revision, sourceUpdatedAt: plan?.aiStudio?.sync?.updatedAt };
    try {
        const records = await buildStudioFeishuRecords({ uid, plan });
        const summary = { created: 0, updated: 0, skipped: 0 };
        for (const entity of ENTITIES) {
            const result = await writer.sync(entity, records[entity]);
            if (!Array.isArray(result.conflicts) || !Array.isArray(result.errors)) throw new FeishuSyncError('FEISHU_SYNC_INVALID_RESPONSE');
            if (result.conflicts.length) throw new FeishuSyncError('FEISHU_SYNC_CONFLICT');
            if (result.errors.length) throw new FeishuSyncError('FEISHU_SYNC_WRITE_FAILED');
            for (const key of Object.keys(summary)) summary[key] += Number(result[key]) || 0;
        }
        // The existing writer skips equal timestamps. Readback also checks the exact snapshot.
        for (const entity of ENTITIES) {
            const remote = await writer.records(entity, records[entity]);
            const byId = new Map(remote.map(record => [record.id, record]));
            for (const record of records[entity]) {
                const found = byId.get(record.id);
                if (!found) throw new FeishuSyncError('FEISHU_SYNC_READBACK_MISMATCH');
                const { aiStudioSyncFingerprint, ...saved } = found;
                if (aiStudioSyncFingerprint !== record.aiStudioSyncFingerprint || await digest(saved) !== record.aiStudioSyncFingerprint) throw new FeishuSyncError('FEISHU_SYNC_READBACK_MISMATCH');
            }
        }
        return { ...snapshot, status: 'synced', syncedAt: new Date().toISOString(), ...summary };
    } catch (error) {
        return { ...snapshot, status: 'pending', code: error instanceof FeishuSyncError ? error.code : 'FEISHU_SYNC_UNAVAILABLE' };
    }
}

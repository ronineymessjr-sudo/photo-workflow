export class StudioCommitError extends Error {
    constructor(code, status) {
        super(code);
        this.code = code;
        this.status = status;
    }
}

// Both cloud storage and browser confirmation use the signed proposal identity.
export function applyStudioCommit(plan, commit, now = Date.now()) {
    if (!plan || String(plan.id) !== String(commit?.planId)) throw new StudioCommitError('PLAN_NOT_FOUND', 404);
    if (typeof commit.proposalId !== 'string' || !commit.proposalId || commit.proposalId.length > 128
        || !Number.isSafeInteger(commit.expectedRevision) || commit.expectedRevision < 0
        || !Array.isArray(commit.references) || commit.references.length < 1 || commit.references.length > 6
        || commit.references.some(reference => !reference || typeof reference.sourceItemId !== 'string'
            || !reference.sourceItemId || reference.sourceItemId.length > 160)) {
        throw new StudioCommitError('INVALID_PROPOSAL', 400);
    }
    const studio = plan.aiStudio || {};
    const applied = Array.isArray(studio.appliedProposalIds) ? studio.appliedProposalIds : [];
    if (applied.includes(commit.proposalId)) return { plan, duplicate: true };
    const revision = Number.isSafeInteger(plan.revision) && plan.revision >= 0 ? plan.revision : 0;
    if (revision !== commit.expectedRevision) throw new StudioCommitError('REVISION_CONFLICT', 409);

    const references = new Map((Array.isArray(studio.references) ? studio.references : [])
        .map(reference => [reference.sourceItemId, reference]));
    for (const reference of commit.references) references.set(reference.sourceItemId, reference);
    const conversation = Array.isArray(commit.conversation) ? commit.conversation : [];
    return {
        duplicate: false,
        plan: {
            ...plan,
            revision: revision + 1,
            aiStudio: {
                ...studio,
                revision: revision + 1,
                references: [...references.values()],
                ...(commit.guidance !== undefined ? { guidance: commit.guidance } : {}),
                conversation: [...(Array.isArray(studio.conversation) ? studio.conversation : []), ...conversation].slice(-20),
                appliedProposalIds: [...applied, commit.proposalId].slice(-50),
                sync: { status: 'pending', updatedAt: new Date(now).toISOString() },
            },
        },
    };
}

export function applyStudioSyncResult(plan, result) {
    if (!plan || String(plan.id) !== String(result?.planId)) throw new StudioCommitError('PLAN_NOT_FOUND', 404);
    if (!['pending', 'synced'].includes(result.status) || !Array.isArray(plan.aiStudio?.references)
        || !plan.aiStudio.references.length || !Number.isFinite(Date.parse(result.sourceUpdatedAt))
        || (result.status === 'synced' && !Number.isFinite(Date.parse(result.syncedAt)))) {
        throw new StudioCommitError('INVALID_SYNC_RESULT', 400);
    }
    if (plan.revision !== result.revision || plan.aiStudio?.sync?.updatedAt !== result.sourceUpdatedAt) {
        throw new StudioCommitError('REVISION_CONFLICT', 409);
    }
    return { ...plan, aiStudio: { ...plan.aiStudio, sync: {
        status: result.status,
        updatedAt: result.sourceUpdatedAt,
        ...(result.status === 'synced' ? { syncedAt: result.syncedAt } : { code: result.code }),
    } } };
}

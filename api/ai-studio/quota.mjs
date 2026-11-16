export class AiStudioQuota {
    constructor(state) {
        this.state = state;
    }

    async fetch(request) {
        if (request.method !== 'POST') return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
        let body;
        try { body = await request.json(); }
        catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400 }); }
        const action = body?.action;
        const limit = Number(body?.limit);
        // 100 was the original ceiling; a test cycle needs more, and a limit that is
        // rejected here silently surfaces to the caller as "quota reached".
        if (!['search', 'model', 'plan', 'image', 'image-global'].includes(action) || !Number.isInteger(limit) || limit < 1 || limit > 5000) {
            return Response.json({ error: 'INVALID_QUOTA_REQUEST' }, { status: 400 });
        }

        const allowed = await this.state.storage.transaction(async transaction => {
            const now = Date.now();
            const quota = await transaction.get('quota') || {};
            if (action === 'model' || action === 'plan' || action === 'image' || action === 'image-global') {
                const day = new Date(now).toISOString().slice(0, 10);
                const prefix = action === 'image-global' ? 'imageGlobal' : action;
                if (quota[`${prefix}Day`] !== day) { quota[`${prefix}Day`] = day; quota[`${prefix}Used`] = 0; }
                if (quota[`${prefix}Used`] >= limit) return false;
                quota[`${prefix}Used`] += 1;
            } else {
                if (!Number.isFinite(quota.searchResetAt) || quota.searchResetAt <= now) {
                    quota.searchResetAt = now + 10 * 60 * 1000;
                    quota.searchUsed = 0;
                }
                if (quota.searchUsed >= limit) return false;
                quota.searchUsed += 1;
            }
            await transaction.put('quota', quota);
            return true;
        });
        return Response.json({ allowed });
    }
}

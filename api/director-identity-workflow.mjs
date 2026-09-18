// Builds a non-submitted identity-lock workflow through the local Director.
export async function buildDirectorIdentityWorkflow(input, { baseUrl, fetchImpl = fetch } = {}) {
    if (!baseUrl) throw new Error('DIRECTOR_NOT_CONFIGURED');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_IDENTITY_WORKFLOW_REQUEST');
    const requestId = typeof input.request_id === 'string' && input.request_id ? input.request_id : `identity-lock-${crypto.randomUUID()}`;
    const brief = typeof input.brief === 'string' ? input.brief.trim() : '';
    if (!brief || brief.length > 2000) throw new Error('INVALID_IDENTITY_WORKFLOW_REQUEST');
    const body = { ...input, request_id: requestId, brief };
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/v1/photoatelier/identity-lock-workflow`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`DIRECTOR_IDENTITY_WORKFLOW_UPSTREAM_${response.status}`);
    const result = await response.json();
    if (!result || typeof result !== 'object' || !result.workflow) throw new Error('DIRECTOR_INVALID_IDENTITY_WORKFLOW_RESPONSE');
    return result;
}


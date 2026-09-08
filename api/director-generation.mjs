// External image generation is intentionally kept as a candidate-only flow.
export async function generateDirectorCandidate(input, { baseUrl, fetchImpl = fetch } = {}) {
    if (!baseUrl) throw new Error('DIRECTOR_NOT_CONFIGURED');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_GENERATION_REQUEST');
    const requestId = typeof input.request_id === 'string' && input.request_id ? input.request_id : `workflow-${crypto.randomUUID()}`;
    const brief = typeof input.brief === 'string' ? input.brief.trim() : '';
    if (!brief || brief.length > 4000) throw new Error('INVALID_GENERATION_REQUEST');
    const body = { ...input, request_id: requestId, brief, dry_run: input.dry_run === true };
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/v1/photoatelier/external-generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`DIRECTOR_GENERATION_UPSTREAM_${response.status}`);
    const result = await response.json();
    if (!result || typeof result !== 'object') throw new Error('DIRECTOR_INVALID_GENERATION_RESPONSE');
    return result;
}

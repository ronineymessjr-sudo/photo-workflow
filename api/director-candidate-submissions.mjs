import { submitModelScope } from './continuity-generation.mjs';

const PREFIX = 'candidate-submission:';

export class DirectorCandidateSubmissions {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const url = new URL(request.url);
        const match = url.pathname.match(/^\/candidate-submissions\/([a-f0-9]{32})(?:\/status)?$/i);
        if (!match) return Response.json({ error: 'CANDIDATE_SUBMISSION_ROUTE_NOT_FOUND' }, { status: 404 });
        const taskId = match[1].toLowerCase();
        const key = `${PREFIX}${taskId}`;
        if (request.method === 'GET' && url.pathname.endsWith('/status')) {
            const task = await this.state.storage.get(key);
            return task ? Response.json(task) : Response.json({ error: 'CANDIDATE_SUBMISSION_NOT_FOUND' }, { status: 404 });
        }
        if (request.method !== 'POST' || url.pathname.endsWith('/status')) {
            return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
        }
        let body;
        try { body = await request.json(); } catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400 }); }
        if (!body?.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
            return Response.json({ error: 'SUBMISSION_PAYLOAD_INVALID' }, { status: 400 });
        }
        const existing = await this.state.storage.get(key);
        if (existing) return Response.json({ status: existing.status, taskId });
        await this.state.storage.put(key, { status: 'submitting', taskId, payload: body.payload, createdAt: Date.now() });
        await this.state.storage.setAlarm(Date.now() + 1000);
        return Response.json({ status: 'submitting', taskId }, { status: 202 });
    }

    async alarm() {
        const tasks = await this.state.storage.list({ prefix: PREFIX });
        const pending = [...tasks.entries()].find(([, task]) => task.status === 'submitting');
        if (!pending) return;
        const [key, task] = pending;
        try {
            const submitted = await submitModelScope({ ...task.payload, env: this.env, fetchImpl: fetch });
            await this.state.storage.put(key, { status: 'submitted', taskId: task.taskId,
                providerTaskId: submitted.taskId, prompt: submitted.prompt,
                referenceRolesSent: submitted.referenceRolesSent, createdAt: task.createdAt });
        } catch (error) {
            const message = String(error?.message || error);
            const safeCodes = ['GENERATION_NOT_CONFIGURED', 'GENERATION_MODEL_NOT_ALLOWED',
                'GENERATION_ACCOUNT_UNVERIFIED', 'GENERATION_UPSTREAM_FAILED',
                'GENERATION_INVALID_RESPONSE', 'GENERATION_TASK_ID_INVALID',
                'GENERATION_SUBMIT_AMBIGUOUS'];
            const code = safeCodes.includes(error?.code) ? error.code
                : safeCodes.includes(message) ? message : 'IMAGE_GENERATION_FAILED';
            await this.state.storage.put(key, { status: 'failed', taskId: task.taskId,
                error: code, upstreamStatus: Number.isInteger(error?.status) ? error.status : null,
                createdAt: task.createdAt });
        }
        const remaining = [...(await this.state.storage.list({ prefix: PREFIX })).values()].some(item => item.status === 'submitting');
        if (remaining) await this.state.storage.setAlarm(Date.now() + 1000);
    }
}

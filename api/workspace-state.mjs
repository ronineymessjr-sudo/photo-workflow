import { isWorkspaceEntry, workspaceEntryKey } from '../assets/workspace-sync-protocol.mjs';
import { applyStudioCommit, applyStudioSyncResult, StudioCommitError } from './ai-studio/plan-commit.mjs';

const MAX_BYTES = 16 * 1024 * 1024;
const CHUNK_SIZE = 20_000;

async function readWorkspace(store) {
  const meta = await store.get('meta') || { revision: 0, chunks: 0 };
  const chunks = [];
  for (let index = 0; index < meta.chunks; index++) chunks.push(await store.get(`chunk:${index}`));
  return { meta, entries: meta.chunks ? JSON.parse(chunks.join('')) : {} };
}

async function writeWorkspace(store, previous, entries) {
  const serialized = JSON.stringify(entries);
  if (new TextEncoder().encode(serialized).length > MAX_BYTES) throw new StudioCommitError('WORKSPACE_TOO_LARGE', 413);
  const chunks = Math.ceil(serialized.length / CHUNK_SIZE);
  for (let index = 0; index < chunks; index++) await store.put(`chunk:${index}`, serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
  for (let index = chunks; index < previous.chunks; index++) await store.delete(`chunk:${index}`);
  const meta = { revision: previous.revision + 1, chunks };
  await store.put('meta', meta);
  return meta.revision;
}

export class WorkspaceSync {
  constructor(state) { this.storage = state.storage; }

  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/studio/commit' || pathname === '/studio/sync-result') {
      if (request.method !== 'POST') return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 32768) return Response.json({ error: 'REQUEST_TOO_LARGE' }, { status: 413 });
      let commit;
      try { commit = JSON.parse(raw); } catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400 }); }
      try {
        const result = await this.storage.transaction(async store => {
          const { meta, entries } = await readWorkspace(store);
          const key = workspaceEntryKey('local', 'pw_plans', `record:${commit?.planId}`);
          if (pathname === '/studio/sync-result') {
            const plan = applyStudioSyncResult(entries[key], commit);
            entries[key] = plan;
            return { plan, workspaceRevision: await writeWorkspace(store, meta, entries) };
          }
          const applied = applyStudioCommit(entries[key], commit);
          if (applied.duplicate) return { ...applied, workspaceRevision: meta.revision };
          entries[key] = applied.plan;
          const workspaceRevision = await writeWorkspace(store, meta, entries);
          return { ...applied, workspaceRevision };
        });
        return Response.json(result);
      } catch (error) {
        if (error instanceof StudioCommitError) return Response.json({ error: error.code }, { status: error.status });
        throw error;
      }
    }
    if (request.method === 'GET') {
      const value = await this.storage.transaction(async store => {
        const { meta, entries } = await readWorkspace(store);
        return { revision: meta.revision, entries };
      });
      return Response.json(value);
    }
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) return Response.json({ error: 'Workspace too large' }, { status: 413 });
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BYTES) return Response.json({ error: 'Workspace too large' }, { status: 413 });
    let payload;
    try { payload = JSON.parse(body); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
    if (!Number.isSafeInteger(payload.revision) || payload.revision < 0 || !payload.entries
      || Array.isArray(payload.entries) || typeof payload.entries !== 'object'
      || !Object.keys(payload.entries).every(isWorkspaceEntry)) return Response.json({ error: 'Invalid workspace entries' }, { status: 400 });
    const result = await this.storage.transaction(async store => {
      const previous = await store.get('meta') || { revision: 0, chunks: 0 };
      if (previous.revision !== payload.revision) return null;
      return { revision: await writeWorkspace(store, previous, payload.entries) };
    });
    return result ? Response.json(result) : Response.json({ error: 'Workspace changed; retry with its latest revision' }, { status: 409 });
  }
}

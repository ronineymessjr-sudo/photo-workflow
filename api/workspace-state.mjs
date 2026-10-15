import { isWorkspaceEntry } from '../assets/workspace-sync-protocol.mjs';

const MAX_BYTES = 16 * 1024 * 1024;
const CHUNK_SIZE = 20_000;

export class WorkspaceSync {
  constructor(state) { this.storage = state.storage; }

  async fetch(request) {
    if (request.method === 'GET') {
      const value = await this.storage.transaction(async store => {
        const meta = await store.get('meta');
        if (!meta) return { revision: 0, entries: {} };
        const chunks = [];
        for (let index = 0; index < meta.chunks; index++) chunks.push(await store.get(`chunk:${index}`));
        return { revision: meta.revision, entries: JSON.parse(chunks.join('')) };
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
    const serialized = JSON.stringify(payload.entries);
    const result = await this.storage.transaction(async store => {
      const previous = await store.get('meta') || { revision: 0, chunks: 0 };
      if (previous.revision !== payload.revision) return null;
      const chunks = Math.ceil(serialized.length / CHUNK_SIZE);
      for (let index = 0; index < chunks; index++) await store.put(`chunk:${index}`, serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
      for (let index = chunks; index < previous.chunks; index++) await store.delete(`chunk:${index}`);
      const meta = { revision: previous.revision + 1, chunks };
      await store.put('meta', meta);
      return { revision: meta.revision };
    });
    return result ? Response.json(result) : Response.json({ error: 'Workspace changed; retry with its latest revision' }, { status: 409 });
  }
}

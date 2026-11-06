import { isWorkspaceEntry, workspaceEntryKey } from '../assets/workspace-sync-protocol.mjs';
import { applyStudioCommit, applyStudioSyncResult, StudioCommitError } from './ai-studio/plan-commit.mjs';

const MAX_BYTES = 16 * 1024 * 1024;
const CHUNK_SIZE = 20_000;
const CANDIDATE_ASSET_LIMIT = 8 * 1024 * 1024;
const CANDIDATE_ASSET_CHUNK = 1024 * 1024;
const CANDIDATE_ASSET_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const CANDIDATE_ASSET_MAX_COUNT = 30;

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
    const candidateAsset = pathname.match(/^\/candidate-assets\/([a-f0-9]{32})$/i);
    if (candidateAsset) {
      const assetId = candidateAsset[1].toLowerCase();
      const metaKey = `candidate-asset:meta:${assetId}`;
      if (request.method === 'PUT') {
        const mime = (request.headers.get('content-type') || '').split(';')[0].toLowerCase();
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) return Response.json({ error: 'INVALID_ASSET_TYPE' }, { status: 415 });
        const bytes = new Uint8Array(await request.arrayBuffer());
        if (!bytes.length || bytes.length > CANDIDATE_ASSET_LIMIT) return Response.json({ error: 'INVALID_ASSET_SIZE' }, { status: 413 });
        try {
          await this.storage.transaction(async store => {
            const previous = await store.get(metaKey);
            if (previous) throw new Error('CANDIDATE_ASSET_EXISTS');
            const partCount = Math.ceil(bytes.length / CANDIDATE_ASSET_CHUNK);
            for (let index = 0; index < partCount; index++) {
              const part = bytes.slice(index * CANDIDATE_ASSET_CHUNK, (index + 1) * CANDIDATE_ASSET_CHUNK);
              await store.put(`candidate-asset:part:${assetId}:${index}`, part);
            }
            await store.put(metaKey, { mime, bytes: bytes.length, partCount, createdAt: Date.now(), expiresAt: Date.now() + CANDIDATE_ASSET_RETENTION_MS });
            if (typeof store.list === 'function') {
              const assets = [...(await store.list({ prefix: 'candidate-asset:meta:' })).entries()]
                .sort((a, b) => a[1].createdAt - b[1].createdAt);
              const expired = assets.filter(([, meta]) => meta.expiresAt <= Date.now());
              const retained = assets.filter(([, meta]) => meta.expiresAt > Date.now());
              const toDelete = [...expired, ...retained.slice(0, Math.max(0, retained.length - CANDIDATE_ASSET_MAX_COUNT))];
              for (const [key, meta] of toDelete) {
                const id = key.slice('candidate-asset:meta:'.length);
                for (let index = 0; index < meta.partCount; index++) await store.delete(`candidate-asset:part:${id}:${index}`);
                await store.delete(key);
              }
            }
          });
          return Response.json({ stored: true }, { status: 201 });
        } catch (error) {
          if (error.message === 'CANDIDATE_ASSET_EXISTS') return Response.json({ error: error.message }, { status: 409 });
          throw error;
        }
      }
      if (request.method === 'GET') {
        const asset = await this.storage.transaction(async store => {
          const meta = await store.get(metaKey);
          if (!meta) return null;
          if (meta.expiresAt <= Date.now()) {
            for (let index = 0; index < meta.partCount; index++) await store.delete(`candidate-asset:part:${assetId}:${index}`);
            await store.delete(metaKey);
            return null;
          }
          const parts = [];
          for (let index = 0; index < meta.partCount; index++) {
            const part = await store.get(`candidate-asset:part:${assetId}:${index}`);
            if (!part) return null;
            parts.push(part);
          }
          return { meta, parts };
        });
        if (!asset) return Response.json({ error: 'CANDIDATE_ASSET_NOT_FOUND' }, { status: 404 });
        return new Response(new Blob(asset.parts, { type: asset.meta.mime }), {
          headers: { 'Content-Type': asset.meta.mime, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
        });
      }
      return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    }
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

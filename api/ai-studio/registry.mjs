import originalCatalog from './catalog.mjs';
import { createRegistry } from './core.mjs';
import { loadPoseAtlasCatalog } from './poseatlas.mjs';

export async function loadStudioRegistry({ fetchImpl = fetch, enabled = true } = {}) {
    if (!enabled) return { registry: createRegistry(originalCatalog), library: { source: 'PhotoAtelier original', status: 'disabled', count: 7, externalRequests: 0 } };
    try {
        const upstream = await loadPoseAtlasCatalog({ fetchImpl });
        const templates = upstream.templates || [];
        return {
            registry: createRegistry({ schemaVersion: 1, templates: [...templates, ...originalCatalog.templates] }),
            library: { source: 'RuiC-PoseAtlas', status: templates.length ? upstream.status : 'unavailable', count: templates.length, externalRequests: upstream.externalRequests || 0 },
        };
    } catch {
        return {
            registry: createRegistry(originalCatalog),
            library: { source: 'RuiC-PoseAtlas', status: 'unavailable', count: 0 },
        };
    }
}

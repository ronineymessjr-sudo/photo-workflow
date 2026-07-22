export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status || 0;
    this.code = options.code || 'API_ERROR';
    this.details = options.details || {};
  }
}

export class ApiClient {
  constructor(storage) {
    this.storage = storage;
  }

  get settings() {
    return this.storage.get('settings', {
      remoteEnabled: false,
      apiBase: 'https://photoatelier-v2-api.photomagic.workers.dev',
      syncToken: '',
      obsidianBridgeUrl: 'http://127.0.0.1:8124',
      obsidianBridgeToken: '',
    });
  }

  async request(path, options = {}) {
    const settings = this.settings;
    if (!settings.remoteEnabled || !settings.apiBase) throw new Error('REMOTE_DISABLED');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout || 15000);
    try {
      const response = await fetch(`${settings.apiBase.replace(/\/$/, '')}${path}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.syncToken ? { 'X-PhotoAtelier-Token': settings.syncToken } : {}),
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new ApiError(data?.error || `HTTP ${response.status}`, { status: response.status, code: data?.code || 'HTTP_ERROR', details: data?.details || {} });
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  health() { return this.request('/api/health'); }
  generatePlan(payload) { return this.request('/api/agent/generate-plan', { method: 'POST', body: payload, timeout: 45000 }); }
  createAgentDraft(projectId, options = {}) {
    return this.request('/api/v1/agent/plans/draft', { method: 'POST', body: { project_id: projectId, options }, timeout: 60000 });
  }
  getAgentRun(runId) { return this.request(`/api/v1/agent/runs/${encodeURIComponent(runId)}`); }
  regenerateAgentRun(runId, instruction) {
    return this.request(`/api/v1/agent/runs/${encodeURIComponent(runId)}/regenerate`, { method: 'POST', body: { instruction }, timeout: 60000 });
  }
  approveAgentRun(runId, editedPlan = null) {
    return this.request(`/api/v1/agent/runs/${encodeURIComponent(runId)}/approve`, { method: 'POST', body: { edited_plan: editedPlan }, timeout: 60000 });
  }
  syncEntity(entity, records) { return this.request(`/api/feishu/${entity}/sync`, { method: 'POST', body: { records } }); }
  listEntity(entity) { return this.request(`/api/feishu/${entity}/records`); }
  deleteEntity(entity, ids) {
    return this.request(`/api/feishu/${entity}/delete`, { method: 'POST', body: { ids } });
  }

  searchReferenceImages(query, count = 12) {
    return this.request('/api/references/search-images', {
      method: 'POST',
      body: { query, count }
    });
  }

  async requestObsidianBridge(path, options = {}) {
    const settings = this.settings;
    const base = String(settings.obsidianBridgeUrl || 'http://127.0.0.1:8124').replace(/\/$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout || 15000);
    try {
      const response = await fetch(`${base}${path}`, {
        method: options.method || 'GET',
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(settings.obsidianBridgeToken ? { Authorization: `Bearer ${settings.obsidianBridgeToken}` } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new ApiError(data?.error || `Obsidian Bridge HTTP ${response.status}`, { status: response.status, code: data?.code || 'OBSIDIAN_BRIDGE_ERROR' });
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async searchObsidian(query, filters = {}) {
    const params = new URLSearchParams({ query: String(query || ''), limit: String(filters.limit || 30) });
    for (const key of ['type', 'workflowStage', 'tag', 'orientation', 'license']) {
      if (filters[key]) params.set(key, filters[key]);
    }
    try {
      return await this.requestObsidianBridge(`/v1/search?${params}`);
    } catch (error) {
      if (!this.settings.remoteEnabled) throw error;
      return this.request('/api/obsidian/search', { method: 'POST', body: { query, filters } });
    }
  }

  recommendKnowledgeContext(brief, options = {}) {
    return this.requestObsidianBridge('/v1/context/recommend', {
      method: 'POST',
      body: {
        brief,
        instruction: options.instruction || '',
        limit: options.limit || 12,
        manuallySelectedKnowledgeSources: options.manuallySelectedKnowledgeSources || [],
      },
      timeout: 30000,
    });
  }

  async readObsidianNote(path) {
    try {
      return await this.requestObsidianBridge(`/v1/notes/read?path=${encodeURIComponent(path)}`);
    } catch (error) {
      if (!this.settings.remoteEnabled) throw error;
      return this.request('/api/obsidian/read', { method: 'POST', body: { path } });
    }
  }

  async writeObsidianReview(project, plan, review) {
    try {
      return await this.requestObsidianBridge('/v1/notes', { method: 'POST', body: { project, plan, review }, timeout: 30000 });
    } catch (error) {
      if (!this.settings.remoteEnabled) throw error;
      return this.request('/api/obsidian/write', { method: 'POST', body: { project, plan, review }, timeout: 30000 });
    }
  }

  obsidianAssetThumbnailUrl(assetId) {
    const base = String(this.settings.obsidianBridgeUrl || 'http://127.0.0.1:8124').replace(/\/$/, '');
    return `${base}/v1/assets/${encodeURIComponent(assetId)}/thumbnail`;
  }
}

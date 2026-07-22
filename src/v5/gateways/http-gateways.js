import { AppError } from '../common/errors.js';

export class HttpPlanningModelGateway {
  constructor({ apiClient, endpoint = '/v2/agent/plan', provider = 'worker', model = 'configured' }) {
    this.apiClient = apiClient;
    this.endpoint = endpoint;
    this.provider = provider;
    this.model = model;
  }
  async createPlanDraft(payload) {
    if (!this.apiClient?.request) throw new AppError('PLANNING_GATEWAY_NOT_CONFIGURED', 'API Client 不支持通用 request');
    return this.apiClient.request(this.endpoint, { method: 'POST', body: payload });
  }
}

export class HttpImageGenerationGateway {
  constructor({ apiClient, endpoint = '/v2/images/generate', provider = 'configured', model = 'configured' }) {
    this.apiClient = apiClient;
    this.endpoint = endpoint;
    this.provider = provider;
    this.model = model;
  }
  async generateConceptImages(payload) {
    if (!this.apiClient?.request) throw new AppError('IMAGE_GATEWAY_NOT_CONFIGURED', 'API Client 不支持通用 request');
    return this.apiClient.request(this.endpoint, { method: 'POST', body: payload });
  }
}

export class HttpVisionGateway {
  constructor({ apiClient, endpoint = '/api/v1/visual-dna/analyze', provider = 'vision-agent', model = 'configured' }) {
    this.apiClient = apiClient;
    this.endpoint = endpoint;
    this.provider = provider;
    this.model = model;
  }
  async analyzeReferences(payload) {
    if (!this.apiClient?.request) throw new AppError('VISION_GATEWAY_NOT_CONFIGURED', 'Vision API Client 不支持通用 request');
    return this.apiClient.request(this.endpoint, { method: 'POST', body: payload });
  }
}

export class CompositeReferenceSourceGateway {
  constructor(adapters = {}) { this.adapters = adapters; }
  require(sourceType) {
    const adapter = this.adapters[sourceType];
    if (!adapter) throw new AppError('REFERENCE_SOURCE_NOT_CONFIGURED', '参考来源尚未配置', { sourceType });
    return adapter;
  }
  search(sourceType, query, filters = {}) { return this.require(sourceType).search(query, filters); }
  read(sourceType, sourceId) { return this.require(sourceType).read(sourceId); }
  ingest(sourceType, sourceItem) { return this.require(sourceType).ingest(sourceItem); }
}

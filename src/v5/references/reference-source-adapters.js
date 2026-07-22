import { AppError } from '../common/errors.js';
import { normalizeSearchText } from '../common/stable.js';
import { CompositeReferenceSourceGateway } from '../gateways/http-gateways.js';

export function createReferenceSourceGateway({ apiClient, referenceService }) {
  return new CompositeReferenceSourceGateway({
    pexels: new PexelsReferenceAdapter(apiClient, referenceService),
    obsidian: new ObsidianReferenceAdapter(apiClient, referenceService),
    feishu: new FeishuReferenceAdapter(apiClient, referenceService),
  });
}

class BaseReferenceAdapter {
  constructor(apiClient, referenceService) {
    this.api = apiClient;
    this.references = referenceService;
  }
  ingest(item) {
    if (!item?.importable) throw new AppError('REFERENCE_SOURCE_NOT_IMPORTABLE', '该来源记录不是可导入图片素材', { sourceType: item?.sourceType, sourceId: item?.sourceId });
    return this.references.ingestAsset({
      id: item.referenceAssetId || undefined,
      assetKind: item.assetKind || 'real_photo',
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceUrl: item.sourceUrl || null,
      previewUrl: item.previewUrl || null,
      localPath: item.localPath || null,
      title: item.title || '未命名参考',
      tags: item.tags || [],
      photographer: item.photographer || '',
      licenseStatus: item.licenseStatus || 'unknown',
      verificationStatus: item.verificationStatus || 'pending',
      contentHash: item.contentHash || null,
      synthetic: false,
      sourceMetadata: item.sourceMetadata || {},
    });
  }
}

export class PexelsReferenceAdapter extends BaseReferenceAdapter {
  async search(query, filters = {}) {
    const result = await this.api.searchReferenceImages(query, filters.count || 12);
    return (result.items || []).map(item => ({
      sourceType: 'pexels', sourceId: String(item.id), title: item.title || query,
      sourceUrl: item.sourceUrl || null, previewUrl: item.previewUrl || null, localPath: null,
      assetKind: filters.assetKind || 'real_photo', tags: filters.tags || [], photographer: item.photographer || '',
      licenseStatus: 'pexels-license', verificationStatus: 'pending', synthetic: false,
      importable: Boolean(item.sourceUrl && item.previewUrl), sourceMetadata: { provider: item.provider || 'Pexels' },
    }));
  }
  async read(sourceId) {
    const results = await this.search(String(sourceId), { count: 30 });
    return results.find(item => item.sourceId === String(sourceId)) || null;
  }
}

export class ObsidianReferenceAdapter extends BaseReferenceAdapter {
  async search(query, filters = {}) {
    const result = await this.api.searchObsidian(query, filters);
    return (result.items || []).map(item => normalizeObsidianItem(item));
  }
  async read(sourceId) {
    const result = await this.api.readObsidianNote(sourceId);
    return normalizeObsidianItem(result.item || result);
  }
}

export class FeishuReferenceAdapter extends BaseReferenceAdapter {
  async search(query = '', filters = {}) {
    const result = await this.api.listEntity('references');
    const normalized = normalizeSearchText(query);
    return (result.records || []).map(item => normalizeFeishuReference(item))
      .filter(item => !normalized || normalizeSearchText([item.title, ...(item.tags || [])].join(' ')).includes(normalized))
      .filter(item => !filters.projectId || item.sourceMetadata.projectId === filters.projectId);
  }
  async read(sourceId) {
    const result = await this.api.listEntity('references');
    const record = (result.records || []).find(item => String(item.id) === String(sourceId));
    return record ? normalizeFeishuReference(record) : null;
  }
}

function normalizeObsidianItem(item = {}) {
  const localPath = item.path || item.localPath || item.sourceFile || '';
  const importable = isImageRecord(item, localPath);
  return {
    sourceType: 'obsidian', sourceId: item.id || localPath, title: item.title || item.name || localPath || 'Obsidian 记录',
    sourceUrl: item.sourceUrl || null, previewUrl: importable ? item.previewUrl || item.url || localPath : null,
    localPath: importable ? localPath : null, assetKind: inferAssetKind(item), tags: item.tags || [], photographer: item.photographer || '',
    licenseStatus: item.licenseClass || 'local-private-reference', verificationStatus: importable ? 'private' : 'pending', synthetic: false,
    importable, contentHash: item.contentHash || null,
    sourceMetadata: { recordType: item.type || item.kind || 'unknown', obsidianPath: localPath, workflowStage: item.workflowStage || '' },
  };
}

function normalizeFeishuReference(item = {}) {
  const sourceUrl = item.sourceUrl || item.url || null;
  const previewUrl = item.previewUrl || item.imageUrl || item.thumbnail || null;
  return {
    sourceType: 'feishu', sourceId: String(item.id), referenceAssetId: item.referenceAssetId || undefined,
    title: item.title || item.name || '飞书参考', sourceUrl, previewUrl, localPath: item.localPath || null,
    assetKind: item.assetKind || 'real_photo', tags: item.styleTags || item.tags || [], photographer: item.photographer || '',
    licenseStatus: item.licenseStatus || 'unknown', verificationStatus: item.verificationStatus || 'pending', synthetic: false,
    importable: Boolean(previewUrl || sourceUrl || item.localPath), contentHash: item.contentHash || null,
    sourceMetadata: { projectId: item.projectId || null, provider: item.provider || '', externalId: item.externalId || null, obsidianPath: item.obsidianPath || '' },
  };
}

function isImageRecord(item, localPath) {
  if (/^image\//i.test(item.mimeType || '')) return true;
  if (['asset', 'local_image', 'image'].includes(item.type || item.kind)) return true;
  return /\.(?:jpe?g|png|webp|avif|tiff?|heic)$/i.test(localPath);
}
function inferAssetKind(item) {
  const text = [item.title, item.name, ...(item.tags || [])].join(' ');
  if (/姿势|pose|动作/i.test(text)) return 'pose_reference';
  if (/布光|lighting|光线/i.test(text)) return 'lighting_reference';
  if (/色彩|调色|color/i.test(text)) return 'color_reference';
  if (/构图|composition/i.test(text)) return 'composition_reference';
  if (/场地|location|场景/i.test(text)) return 'location_reference';
  return 'real_photo';
}

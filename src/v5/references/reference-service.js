import { createEntity, updateEntity } from '../common/entity.js';
import { invariant } from '../common/errors.js';
import { normalizeSearchText, stableHash } from '../common/stable.js';

const REAL_ASSET_KINDS = new Set([
  'real_photo', 'lighting_reference', 'pose_reference', 'composition_reference',
  'color_reference', 'location_reference',
]);

export class ReferenceService {
  constructor(repositories) { this.repos = repositories; }

  ingestAsset(input) {
    invariant(REAL_ASSET_KINDS.has(input.assetKind || 'real_photo'), 'INVALID_REFERENCE_KIND', '参考素材类型不支持');
    invariant(input.synthetic !== true, 'SYNTHETIC_REFERENCE_REJECTED', 'AI 生成图不能作为真实参考素材导入');
    const identity = referenceIdentity(input);
    const duplicate = this.repos.referenceAssets.list(item => item.identityKey === identity)[0];
    if (duplicate) {
      const merged = updateEntity(duplicate, {
        title: input.title || duplicate.title,
        tags: uniqueStrings([...(duplicate.tags || []), ...(input.tags || [])]),
        previewUrl: input.previewUrl || duplicate.previewUrl,
        localPath: input.localPath || duplicate.localPath,
        verificationStatus: strongerVerification(duplicate.verificationStatus, input.verificationStatus),
      });
      return { asset: this.repos.referenceAssets.save(merged), deduplicated: true };
    }
    const asset = createEntity('reference-asset', {
      id: input.id || undefined,
      assetKind: input.assetKind || 'real_photo',
      sourceType: input.sourceType || 'upload',
      sourceId: input.sourceId || null,
      sourceUrl: input.sourceUrl || null,
      previewUrl: input.previewUrl || null,
      localPath: input.localPath || null,
      title: String(input.title || '未命名参考').trim(),
      tags: uniqueStrings(input.tags),
      photographer: input.photographer || '',
      licenseStatus: input.licenseStatus || 'unknown',
      verificationStatus: input.verificationStatus || 'pending',
      contentHash: input.contentHash || null,
      perceptualHash: input.perceptualHash || null,
      synthetic: false,
      identityKey: identity,
      sourceMetadata: input.sourceMetadata || {},
    });
    return { asset: this.repos.referenceAssets.create(asset), deduplicated: false };
  }

  searchAssets(query = '', filters = {}) {
    const normalized = normalizeSearchText(query);
    return this.repos.referenceAssets.list(item => {
      if (filters.assetKind && item.assetKind !== filters.assetKind) return false;
      if (filters.sourceType && item.sourceType !== filters.sourceType) return false;
      if (filters.verificationStatus && item.verificationStatus !== filters.verificationStatus) return false;
      if (!normalized) return true;
      return normalizeSearchText([item.title, item.photographer, ...(item.tags || [])].join(' ')).includes(normalized);
    });
  }

  selectForProject(input) {
    this.repos.projects.require(input.projectId);
    this.repos.referenceAssets.require(input.referenceAssetId);
    const existing = this.repos.projectReferenceLinks.list(item =>
      item.projectId === input.projectId && item.referenceAssetId === input.referenceAssetId && item.role === (input.role || 'general'))[0];
    if (existing) return existing;
    return this.repos.projectReferenceLinks.create(createEntity('project-reference-link', {
      projectId: input.projectId,
      referenceAssetId: input.referenceAssetId,
      role: input.role || 'general',
      notes: input.notes || '',
      locked: Boolean(input.locked),
    }));
  }

  bindToShot(input) {
    const shot = this.repos.shots.require(input.shotId);
    this.repos.referenceAssets.require(input.referenceAssetId);
    invariant(this.repos.projectReferenceLinks.list(item =>
      item.projectId === shot.projectId && item.referenceAssetId === input.referenceAssetId).length > 0,
    'REFERENCE_NOT_SELECTED_FOR_PROJECT', '参考素材必须先选入项目，才能绑定到镜头');
    const existing = this.repos.shotReferenceLinks.list(item =>
      item.shotId === input.shotId && item.referenceAssetId === input.referenceAssetId && item.role === (input.role || 'general'))[0];
    if (existing) return existing;
    return this.repos.shotReferenceLinks.create(createEntity('shot-reference-link', {
      shotId: input.shotId,
      referenceAssetId: input.referenceAssetId,
      role: input.role || 'general',
      score: input.score ?? null,
      reason: input.reason || '',
      locked: Boolean(input.locked),
      rejected: Boolean(input.rejected),
    }));
  }

  removeProjectLink(linkId) {
    const link = this.repos.projectReferenceLinks.require(linkId);
    this.repos.projectReferenceLinks.remove(linkId);
    return link;
  }


  removeShotLink(linkId) {
    const link = this.repos.shotReferenceLinks.require(linkId);
    this.repos.shotReferenceLinks.remove(linkId);
    return link;
  }
}

function referenceIdentity(input) {
  if (input.contentHash) return `content:${input.contentHash}`;
  if (input.sourceType && input.sourceId) return `source:${input.sourceType}:${input.sourceId}`;
  if (input.sourceUrl) return `url:${normalizeUrl(input.sourceUrl)}`;
  if (input.localPath) return `local:${input.localPath}`;
  return `metadata:${stableHash({ title: input.title, photographer: input.photographer, previewUrl: input.previewUrl })}`;
}
function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => url.searchParams.delete(key));
    return url.toString();
  } catch { return String(value).trim(); }
}
function uniqueStrings(values) { return [...new Set((values || []).map(value => String(value).trim()).filter(Boolean))]; }
function strongerVerification(current = 'pending', next = 'pending') {
  const rank = { missing: 0, pending: 1, rejected: 1, verified: 2, private: 2, 'commercial-ok': 3 };
  return (rank[next] || 0) > (rank[current] || 0) ? next : current;
}

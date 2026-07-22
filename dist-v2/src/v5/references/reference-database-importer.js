import { stableHash } from '../common/stable.js';

const SUPPORTED_DATABASE_KINDS = new Set(['local_image', 'external_library', 'obsidian_note', 'obsidian_table_row']);

/**
 * Convert the generated reference database into an explicit import plan.
 * Only records backed by an available image file become ReferenceAsset inputs.
 * Notes, table rows and external libraries remain searchable source descriptors.
 */
export function buildReferenceDatabaseImportPlan(database, options = {}) {
  const items = Array.isArray(database?.items) ? database.items : [];
  const availablePaths = new Set((options.availablePaths || []).map(normalizePath));
  const bundledAssets = Array.isArray(options.bundledAssets) ? options.bundledAssets : [];
  const assetInputs = [];
  const sourceDescriptors = [];
  const unavailableAssets = [];
  const ignored = [];

  for (const item of items) {
    if (!item || !SUPPORTED_DATABASE_KINDS.has(item.kind)) {
      ignored.push({ id: item?.id || null, reason: 'unsupported_kind', kind: item?.kind || null });
      continue;
    }

    if (item.kind === 'local_image') {
      const localPath = normalizePath(item.sourceFile || firstLocalMaterial(item.materialUrls));
      if (localPath && availablePaths.has(localPath)) {
        assetInputs.push(databaseImageToAsset(item, localPath));
      } else {
        unavailableAssets.push({
          id: item.id,
          title: item.title,
          expectedPath: localPath || null,
          reason: localPath ? 'file_not_bundled' : 'missing_file_path',
          relinkRequired: true,
          sourceMetadata: compactSourceMetadata(item),
        });
      }
      continue;
    }

    sourceDescriptors.push(databaseItemToSourceDescriptor(item));
  }

  for (const bundled of bundledAssets) assetInputs.push(bundledAssetToInput(bundled));

  const deduplicatedAssets = deduplicate(assetInputs, asset =>
    asset.contentHash ? `hash:${asset.contentHash}` : `source:${asset.sourceType}:${asset.sourceId || asset.localPath}`);
  const deduplicatedSources = deduplicate(sourceDescriptors, source => `source:${source.id}`);

  return {
    generatedAt: options.generatedAt || database?.generatedAt || new Date().toISOString(),
    databaseItemCount: items.length,
    assetInputs: deduplicatedAssets,
    sourceDescriptors: deduplicatedSources,
    unavailableAssets,
    ignored,
    stats: {
      databaseItems: items.length,
      importableAssets: deduplicatedAssets.length,
      bundledAssets: bundledAssets.length,
      unavailableLocalAssets: unavailableAssets.length,
      sourceDescriptors: deduplicatedSources.length,
      ignored: ignored.length,
    },
  };
}

export class ReferenceDatabaseImportService {
  constructor(referenceService) { this.referenceService = referenceService; }

  importPlan(plan) {
    const imported = [];
    const deduplicated = [];
    const failed = [];
    for (const input of plan?.assetInputs || []) {
      try {
        const result = this.referenceService.ingestAsset(input);
        (result.deduplicated ? deduplicated : imported).push(result.asset);
      } catch (error) {
        failed.push({ id: input.id || null, title: input.title || '', error: error.message, code: error.code || 'IMPORT_FAILED' });
      }
    }
    return {
      imported,
      deduplicated,
      failed,
      unavailableAssets: [...(plan?.unavailableAssets || [])],
      sourceDescriptors: [...(plan?.sourceDescriptors || [])],
      stats: {
        imported: imported.length,
        deduplicated: deduplicated.length,
        failed: failed.length,
        unavailable: plan?.unavailableAssets?.length || 0,
        sources: plan?.sourceDescriptors?.length || 0,
      },
    };
  }
}

function databaseImageToAsset(item, localPath) {
  return {
    id: item.id,
    assetKind: inferAssetKind(item),
    sourceType: 'obsidian-local-library',
    sourceId: item.id,
    sourceUrl: validHttpUrl(item.sourceUrl) ? item.sourceUrl : null,
    previewUrl: localPath,
    localPath,
    title: item.title || '本地摄影参考',
    tags: uniqueStrings([...(item.tags || []), item.category, item.applicableScene, item.applicableSubject]),
    photographer: item.creator || '',
    licenseStatus: item.licenseClass || 'local-private-reference',
    verificationStatus: item.licenseClass === 'local-private-reference' ? 'private' : 'verified',
    synthetic: false,
    sourceMetadata: compactSourceMetadata(item),
  };
}

function bundledAssetToInput(item) {
  return {
    id: item.id,
    assetKind: item.assetKind || 'pose_reference',
    sourceType: item.sourceType || 'bundled-licensed-reference',
    sourceId: item.sourceId || item.id,
    sourceUrl: validHttpUrl(item.sourceUrl) ? item.sourceUrl : null,
    previewUrl: item.localPath,
    localPath: item.localPath,
    title: item.title,
    tags: uniqueStrings(item.tags),
    photographer: item.photographer || '',
    licenseStatus: item.licenseStatus || 'unknown',
    verificationStatus: item.verificationStatus || 'pending',
    contentHash: item.sha256 || item.contentHash || null,
    synthetic: false,
    sourceMetadata: {
      width: item.width || null,
      height: item.height || null,
      byteSize: item.byteSize || null,
      licenseUrl: item.licenseUrl || null,
      licenseCheckedAt: item.licenseCheckedAt || null,
      provenanceIncomplete: Boolean(item.provenanceIncomplete),
      attributionNote: item.attributionNote || '',
    },
  };
}

function databaseItemToSourceDescriptor(item) {
  return {
    id: item.id || `source-${stableHash(item)}`,
    kind: item.kind,
    title: item.title || '未命名来源',
    platform: item.platform || '',
    sourceUrl: validHttpUrl(item.sourceUrl) ? item.sourceUrl : null,
    materialUrls: (item.materialUrls || []).filter(validHttpUrl),
    searchQueries: uniqueStrings(item.searchQueries),
    tags: uniqueStrings(item.tags),
    licenseClass: item.licenseClass || 'unspecified',
    status: item.status || 'unknown',
    priority: item.priority || '',
    usageNote: item.usageNote || item.summary || '',
    sourceAuditScore: Number.isFinite(Number(item.sourceAuditScore)) ? Number(item.sourceAuditScore) : null,
    importPolicy: item.kind === 'external_library' ? 'search-source-only' : 'knowledge-only',
    createsReferenceAsset: false,
  };
}

function compactSourceMetadata(item) {
  return {
    databaseKind: item.kind,
    sourceFile: item.sourceFile || '',
    materialUrls: item.materialUrls || [],
    platform: item.platform || '',
    category: item.category || '',
    usageNote: item.usageNote || '',
    applicableScene: item.applicableScene || '',
    applicableSubject: item.applicableSubject || '',
    composition: item.compositionNormalized || [],
    shotSize: item.shotSizeNormalized || '',
    workflowStage: item.workflowStage || '',
    sourceAuditScore: item.sourceAuditScore ?? null,
  };
}

function inferAssetKind(item) {
  const text = [item.category, item.title, ...(item.tags || []), ...(item.coreFocus || [])].join(' ');
  if (/姿势|pose|动作|站姿|坐姿|手部/i.test(text)) return 'pose_reference';
  if (/光|lighting|布光/i.test(text)) return 'lighting_reference';
  if (/色彩|调色|color|色调/i.test(text)) return 'color_reference';
  if (/场地|场景|location/i.test(text)) return 'location_reference';
  if (/构图|composition/i.test(text)) return 'composition_reference';
  return 'real_photo';
}

function firstLocalMaterial(values) {
  return (values || []).find(value => value && !validHttpUrl(value)) || '';
}
function normalizePath(value) { return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '').trim(); }
function validHttpUrl(value) {
  try { const url = new URL(String(value || '')); return url.protocol === 'http:' || url.protocol === 'https:'; }
  catch { return false; }
}
function uniqueStrings(values) { return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))]; }
function deduplicate(items, keyFn) {
  const seen = new Set();
  return items.filter(item => { const key = keyFn(item); if (seen.has(key)) return false; seen.add(key); return true; });
}

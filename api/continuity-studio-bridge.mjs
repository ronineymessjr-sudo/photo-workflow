// Studio → Continuity converter.
//
// AI Studio selects entries from a template library (PoseAtlas): they carry an
// id, a kind and a source URL, but no bytes, because the library is licensed for
// reference only. The continuity contract needs three roles backed by stored
// assets. This module bridges the two shapes without lying about it: the roles
// are declared and mapped, every reference stays `pending`, and the caller is
// told exactly which photo they still have to supply.
//
// Role mapping:
//   portrait / styling -> identity   (who)
//   costume            -> style      (what it looks like)
//   pose               -> shot constraint, not a reference (how it is framed)

import { createGroup, setReference } from './continuity.mjs';

const IDENTITY_KINDS = ['portrait', 'styling'];
const STYLE_KINDS = ['costume'];

function pick(templates, kinds, used = new Set()) {
    return templates.find(template => kinds.includes(template.kind) && !used.has(template.id)) || null;
}

function toReferenceEntry(template, role) {
    const upstream = template.upstreamId || template.sourceItemId || template.id;
    return {
        assetId: `studio-${template.kind}-${upstream}`,
        role,
        // Never 'confirmed': a library entry has no bytes, so the gate must stay shut
        // until the operator supplies an authorised photo.
        status: 'pending',
        path: '',
        note: `来自图库：${template.title || template.id}；仅参考（${template.rightsStatus || 'external_reference'}），需补一张自有授权图`,
        sourceUrl: template.sourceUrl || '',
        // The library's own image, so generation can use what the operator
        // selected instead of a stand-in photo.
        referenceImageUrl: template.referenceImageUrl || '',
        sourceItemId: template.id,
        upstreamId: upstream,
        kind: template.kind,
    };
}

/**
 * @param {{ templates?: object[], input?: object, planId?: string, selectedIds?: string[] }} options
 * @returns {{ group: object, mapping: object[], poses: object[], missing: string[], ready: boolean }}
 */
export function groupFromStudio({ templates = [], input = {}, planId = '', selectedIds = [] } = {}) {
    const valid = (Array.isArray(templates) ? templates : []).filter(template => template && typeof template === 'object' && template.kind);
    if (!valid.length) {
        const error = new Error('没有可转换的图库条目');
        error.status = 400;
        error.code = 'STUDIO_TEMPLATES_REQUIRED';
        throw error;
    }

    const used = new Set();
    const identityTemplate = pick(valid, IDENTITY_KINDS, used);
    if (identityTemplate) used.add(identityTemplate.id);
    const styleTemplate = pick(valid, STYLE_KINDS, used)
        // A portrait that was not used for identity can still carry the look.
        || pick(valid, IDENTITY_KINDS, used);
    if (styleTemplate) used.add(styleTemplate.id);
    const poses = valid.filter(template => template.kind === 'pose' && !used.has(template.id));

    const theme = String(input.theme || '').trim()
        || String(valid[0].title || '').trim()
        || '图库选品拍摄';
    const group = createGroup({
        input: { ...input, theme },
        shots: [],
    });

    const mapping = [];
    if (identityTemplate) {
        group.references = group.references.map(reference => reference.role === 'identity'
            ? { ...toReferenceEntry(identityTemplate, 'identity') }
            : reference);
        mapping.push({ role: 'identity', from: `${identityTemplate.kind}:${identityTemplate.upstreamId || identityTemplate.id}`, title: identityTemplate.title || '' });
    }
    if (styleTemplate) {
        group.references = group.references.map(reference => reference.role === 'style'
            ? { ...toReferenceEntry(styleTemplate, 'style') }
            : reference);
        mapping.push({ role: 'style', from: `${styleTemplate.kind}:${styleTemplate.upstreamId || styleTemplate.id}`, title: styleTemplate.title || '' });
    }

    group.studio = {
        planId: String(planId || ''),
        selectedIds: Array.isArray(selectedIds) && selectedIds.length
            ? selectedIds.slice(0, 12)
            : valid.map(template => template.id).slice(0, 12),
        templateIds: valid.map(template => template.id).slice(0, 12),
    };
    // Poses are constraints for future shots, not references.
    group.poseConstraints = poses.slice(0, 6).map(template => ({
        templateId: template.id,
        angles: Array.isArray(template.angles) ? template.angles : [],
        note: `构图/姿态参考：${template.title || template.id}（仅参考，不入参考图）`,
        sourceUrl: template.sourceUrl || '',
    }));

    const missing = [];
    if (!identityTemplate) missing.push('缺少人物参考：图库里没有 portrait/styling 条目，需上传一张授权人像');
    else missing.push('人物参考仍是待确认：图库条目无图片字节，请补一张自有授权人像');
    if (!styleTemplate) missing.push('缺少风格参考：图库里没有 costume 条目，需上传一张风格样片');
    else missing.push('风格参考仍是待确认：需补一张自有风格样片');
    missing.push('场景参考需单独上传：图库不提供场地图');

    return {
        group,
        mapping,
        poses: group.poseConstraints,
        // Ready to drop onto shots: {id, title, imageUrl, angle}. One per frame is
        // what stops every frame from defaulting to the same straight-on stance.
        poseRefs: poses.slice(0, 6).map(template => ({
            id: template.id,
            title: template.title || '',
            imageUrl: template.referenceImageUrl || '',
            angle: (template.angles || [])[0] || '',
        })),
        missing,
        // Nothing here can be generated yet: two roles are pending by design.
        ready: false,
    };
}

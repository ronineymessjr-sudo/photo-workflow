// Studio → Continuity converter.
//
// AI Studio selects entries from a template library (PoseAtlas): they carry an
// id, a kind and a source URL, but no bytes, because the library is licensed for
// reference only. The continuity contract needs three roles backed by stored
// assets. Selected face and costume images remain remote references and are
// fetched transiently; poses stay as text constraints so sketches cannot affect image style.
//
// Role mapping:
//   portrait / styling -> identity   (who)
//   costume            -> style      (what it looks like)
//   pose               -> shot constraint, not a reference (how it is framed)

import { createGroup } from './continuity.mjs';

const STYLE_KINDS = ['costume'];

function allowedPoseAtlasImage(raw) {
    try {
        const url = new URL(raw);
        return url.origin === 'https://hruiccc.github.io'
            && /^\/RuiC-PoseAtlas\/(?:thumbs\/[A-Za-z0-9_-]+\.jpg|(?:costume|portrait)\/thumbs\/[A-Za-z0-9_-]+\.webp)$/.test(url.pathname)
            && !url.search && !url.hash;
    } catch { return false; }
}

function pick(templates, kinds, used = new Set()) {
    return templates.find(template => kinds.includes(template.kind) && !used.has(template.id)) || null;
}

function toReferenceEntry(template, role) {
    const upstream = template.upstreamId || template.sourceItemId || template.id;
    const referenceImageUrl = allowedPoseAtlasImage(template.referenceImageUrl) ? template.referenceImageUrl : '';
    return {
        assetId: `studio-${template.kind}-${upstream}`,
        role,
        // Selected public-library images are fetched transiently at generation
        // time; they are never copied into this product's asset store.
        status: referenceImageUrl ? 'confirmed' : 'pending',
        path: '',
        note: referenceImageUrl
            ? `来自 RuiC-PoseAtlas：${template.title || template.id}；由本方案选用，生成时临时读取原站图片，不复制入库。`
            : `来自图库：${template.title || template.id}；没有可用图片地址，需上传一张你有权使用的参考图。`,
        sourceUrl: template.sourceUrl || '',
        referenceImageUrl,
        sourceItemId: template.id,
        upstreamId: upstream,
        kind: template.kind,
        rightsStatus: template.rightsStatus || 'external_reference',
    };
}

function toContinuityShot(shot, index, poseTemplates, guidance = {}) {
    const contract = shot?.directorContract && typeof shot.directorContract === 'object' ? shot.directorContract : {};
    const referenceIds = Array.isArray(contract.referenceIds) ? contract.referenceIds : [];
    const pose = poseTemplates.find(template => referenceIds.includes(template.id))
        || poseTemplates[index % Math.max(1, poseTemplates.length)]
        || null;
    const suggestion = pose && (guidance.suggestions || []).find(item => item.sourceItemId === pose.id)?.direction || '';
    const poseRef = pose ? {
        id: pose.id,
        title: pose.title || pose.id,
        imageUrl: allowedPoseAtlasImage(pose.referenceImageUrl) ? pose.referenceImageUrl : '',
        angle: (pose.angles || [])[0] || '',
        direction: suggestion,
    } : null;
    return {
        shotId: shot?.shotId || shot?.id || `shot-${String(index + 1).padStart(2, '0')}`,
        shotType: contract.shot_size || shot?.shotSize || shot?.shotType || shot?.size || '',
        camera: [contract.camera_angle || shot?.angle || shot?.camera, shot?.method].filter(Boolean).join('，'),
        lens: contract.lens || shot?.focalLength || shot?.lens || '',
        distance: contract.distance || shot?.distance || '',
        action: contract.model_pose || shot?.description || shot?.action || '',
        subjectPlacement: contract.model_position || shot?.composition || shot?.subjectPlacement || '',
        scene: contract.scene || shot?.scene || '',
        prompt: contract.generator_prompt || shot?.prompt || shot?.generator_prompt || shot?.description || '',
        size: contract.shot_size || shot?.shotSize || shot?.size || '',
        aspect: shot?.aspect || shot?.aspectRatio || '2:3',
        props: contract.shot_props || shot?.props || '',
        lighting: contract.lighting_setup || shot?.lighting || '',
        wardrobe: contract.wardrobe_styling || shot?.wardrobe || '',
        crop: contract.crop_boundary || shot?.crop || '',
        mustShow: contract.must_show || shot?.mustShow || shot?.must_show || '',
        rejectIf: contract.reject_if || shot?.rejectIf || shot?.reject_if || '',
        cameraSettings: shot?.cameraSettings || shot?.camera_settings || '',
        poseRef,
    };
}

/**
 * @param {{ templates?: object[], input?: object, planId?: string, planRevision?: number, selectedIds?: string[], shots?: object[], guidance?: object }} options
 * @returns {{ group: object, mapping: object[], poses: object[], missing: string[], ready: boolean }}
 */
export function groupFromStudio({ templates = [], input = {}, planId = '', planRevision = 0, selectedIds = [], shots = [], guidance = {} } = {}) {
    const valid = (Array.isArray(templates) ? templates : []).filter(template => template && typeof template === 'object' && template.kind);
    if (!valid.length) {
        const error = new Error('没有可转换的图库条目');
        error.status = 400;
        error.code = 'STUDIO_TEMPLATES_REQUIRED';
        throw error;
    }

    const used = new Set();
    const identityTemplate = valid.find(template => template.kind === 'portrait' && template.section !== 'styling') || null;
    if (identityTemplate) used.add(identityTemplate.id);
    const styleTemplate = pick(valid, STYLE_KINDS, used);
    if (styleTemplate) used.add(styleTemplate.id);
    const poses = valid.filter(template => template.kind === 'pose' && !used.has(template.id));

    const theme = String(input.theme || '').trim()
        || String(valid[0].title || '').trim()
        || '图库选品拍摄';
    const wardrobeTemplate = styleTemplate;
    const wardrobeFromLibrary = wardrobeTemplate
        ? [wardrobeTemplate.title, ...(wardrobeTemplate.tags || [])].filter(Boolean).join('，')
        : '';
    const shotList = (Array.isArray(shots) ? shots : []).slice(0, 16);
    const scenes = [...new Set(shotList.map(shot => String(shot?.directorContract?.scene || shot?.scene || '').trim()).filter(Boolean))];
    const multipleScenes = scenes.length > 1;
    const group = createGroup({
        input: {
            ...input, theme,
            wardrobeNote: input.wardrobeNote || wardrobeFromLibrary,
            style: input.style || guidance.style || '',
            scene: scenes.length ? scenes.join('；') : input.scene,
        },
        lockedHints: {
            wardrobe: input.wardrobeNote || wardrobeFromLibrary || undefined,
            styleProfile: input.style || guidance.style || undefined,
            location: multipleScenes ? '多场景方案；每镜头按方案标注场景执行' : undefined,
            mustKeep: multipleScenes
                ? ['同一人物', '同一服装', '同一调色', '每镜头按方案指定场景']
                : undefined,
        },
        shots: shotList.map((shot, index) => toContinuityShot(shot, index, poses, guidance)),
    });

    const mapping = [];
    if (identityTemplate) {
        group.references = group.references.map(reference => reference.role === 'identity'
            ? { ...reference, ...toReferenceEntry(identityTemplate, 'identity') }
            : reference);
        mapping.push({ role: 'identity', from: `${identityTemplate.kind}:${identityTemplate.upstreamId || identityTemplate.id}`, title: identityTemplate.title || '' });
    }
    if (styleTemplate) {
        group.references = group.references.map(reference => reference.role === 'style'
            ? { ...reference, ...toReferenceEntry(styleTemplate, 'style') }
            : reference);
        mapping.push({ role: 'style', from: `${styleTemplate.kind}:${styleTemplate.upstreamId || styleTemplate.id}`, title: styleTemplate.title || '' });
    }

    group.references = group.references.map(reference => reference.role === 'scene'
        ? {
            ...reference,
            assetId: `studio-scene-${planId || group.continuityGroupId}`,
            status: 'confirmed',
            textOnly: true,
            note: '场景依据来自本方案的场地说明和逐镜场景描述；可在此上传场地照片作为视觉参考。',
        }
        : reference);

    group.studio = {
        planId: String(planId || ''),
        planRevision: Number.isSafeInteger(planRevision) ? planRevision : 0,
        selectedIds: Array.isArray(selectedIds) && selectedIds.length
            ? selectedIds.slice(0, 12)
            : valid.map(template => template.id).slice(0, 12),
        templateIds: valid.map(template => template.id).slice(0, 12),
    };
    // Poses are constraints for future shots, not references.
    group.poseConstraints = poses.slice(0, 6).map(template => ({
        templateId: template.id,
        angles: Array.isArray(template.angles) ? template.angles : [],
        referenceImageUrl: allowedPoseAtlasImage(template.referenceImageUrl) ? template.referenceImageUrl : '',
        note: `构图/姿态参考：${template.title || template.id}（仅参考，不入参考图）`,
        sourceUrl: template.sourceUrl || '',
    }));

    const missing = [];
    if (!identityTemplate) missing.push('缺少人脸参考：图库里没有可用 portrait/face 条目，请上传一张有权使用的人像');
    else if (group.references.find(reference => reference.role === 'identity')?.status !== 'confirmed') missing.push('人脸参考图片暂不可读取，请上传一张有权使用的人像');
    if (!styleTemplate) missing.push('缺少衣装参考：图库里没有 costume 条目，请上传一张衣装参考');
    else if (group.references.find(reference => reference.role === 'style')?.status !== 'confirmed') missing.push('衣装参考图片暂不可读取，请上传一张有权使用的衣装参考');
    if (!group.shots.length) missing.push('方案中没有镜头列表');
    missing.push('生成前需由摄影师人工确认人物参考');

    return {
        group,
        mapping,
        poses: group.poseConstraints,
        // Ready to drop onto shots: {id, title, imageUrl, angle}. One per frame is
        // what stops every frame from defaulting to the same straight-on stance.
        poseRefs: poses.slice(0, 6).map(template => ({
            id: template.id,
            title: template.title || '',
            imageUrl: allowedPoseAtlasImage(template.referenceImageUrl) ? template.referenceImageUrl : '',
            angle: (template.angles || [])[0] || '',
        })),
        missing,
        ready: group.shots.length > 0
            && group.references.filter(reference => ['identity', 'style'].includes(reference.role)).every(reference => reference.status === 'confirmed')
            && group.master?.confirmedBy === 'human',
    };
}

import { loadStudioRegistry } from './registry.mjs';
import { runServerFirst, parseServerIntent } from './agent-lite.mjs';

const angleNames = { front: '正面', diagonal: '斜侧', side: '侧面', high: '俯视', top: '俯视', overhead: '俯视', low: '仰视', bottom: '仰视' };

export function deriveReferenceGuidance(templates, input = {}) {
    const style = [input.style, input.mood].filter(Boolean).join('，') || '按用户已填写的场景与情绪确定';
    const suggestions = templates.map(template => {
        const terms = [template.title, template.category, ...(template.tags || [])].join(' ');
        let direction;
        if (template.kind === 'pose') {
            direction = /坐|seat|sitting/i.test(terms)
                ? '在现有安全座面上坐稳，双脚有支撑，肩颈放松，先定住重心再微调手部与视线。无座面时改为自然站姿。'
                : /举|伸展|stretch|raised/i.test(terms)
                    ? '双脚站稳，手臂缓慢抬起并保留关节弯曲，连续拍摄起势、停顿和回落，避免强迫拉伸。'
                    : /走|行|walk/i.test(terms)
                        ? '在安全平地自然走动，给出起步、短暂停留、回望三个动作口令，抓取步幅错开的瞬间。'
                        : /靠|lean/i.test(terms)
                            ? '确认现场有稳定支撑后轻靠，重心留在双脚，调整肩线与视线。无支撑时改为错步站立。'
                            : '双脚稳定着地，先调整重心和肩线，再分别改变手部、视线与身体朝向，每次只改变一个动作。';
            const angles = (template.angles || []).map(angle => angleNames[angle] || angle).join('、');
            if (angles) direction += `可参照原库的${angles}视角，实际机位服从用户限制。`;
        } else if (template.kind === 'costume') {
            direction = `从参考的色系与单品关系提炼搭配方向。先核实现有服装，再决定配色与层次，缺少单品时用已有同色系服装替换，具体穿搭待确认。`;
        } else {
            direction = '仅提炼发型轮廓、发丝整理和妆容气质，保持实际模特的身份与外貌。先确认发长与可执行的妆发条件。';
        }
        return { sourceItemId: template.id, kind: template.kind, direction };
    });
    return {
        style,
        suggestions,
        brief: [`风格方向沿用用户要求：${style}。`,
            '以下是检索参考与原创拍摄转译。条目元数据不构成现场已有服装、器材或人物特征，用户硬性限制优先。',
            ...templates.map((template, index) => `[${template.id}] ${template.title}；${suggestions[index].direction}`),
        ].join('\n').slice(0, 2400),
    };
}

export async function prepareReferenceContext(input, options = {}) {
    if (input?.useReferenceLibrary !== true && !input?.referenceIds?.length) return null;
    const { registry, library } = options.registry
        ? { registry: options.registry, library: options.library || { status: 'test' } }
        : await loadStudioRegistry(options);
    let ids = input.referenceIds;
    if (ids !== undefined && (!Array.isArray(ids) || ids.length > 6 || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length)) {
        throw new Error('INVALID_REFERENCE_SELECTION');
    }
    const requireImages = input.requireImageReferences === true;
    const prompt = ['theme', 'style', 'scene', 'mood', 'extra', 'modelDesc'].map(key => String(input[key] || '')).join(' ').slice(0, 1400);
    const naturalPoseOnly = /自然|放松|轻松|日常|relaxed|natural|casual/i.test(prompt)
        && !/(?:采用|选择|需要|想要|来个|拍摄|摆|use|want|choose)[^。\n;；]{0,12}(?:跪|后仰|躺|趴|劈叉|倒立|kneel|reclin|supine|prone|split)/i.test(prompt);
    if (!ids?.length) {
        let searchPrompt = prompt.slice(0, 1700);
        if (!parseServerIntent(searchPrompt || '姿势').specs.length) searchPrompt += ' 姿势';
        ids = runServerFirst({ registry, prompt: searchPrompt, requireImageReferences: requireImages, naturalPoseOnly }).selectedIds;
    }
    let templates = ids.map(id => registry.find(id));
    if (templates.some(template => !template)) throw new Error('UNAVAILABLE_REFERENCE');
    if (requireImages) {
        const usable = (template, kind) => template?.kind === kind && template.referenceImageUrl && (kind !== 'portrait' || template.section === 'face');
        if (templates.some(template => template.sourceUrl && !usable(template, template.kind))) throw new Error('REFERENCE_IMAGES_REQUIRED');
        const automatic = runServerFirst({ registry, prompt: `${prompt} 姿势 服装 人像造型`, requireImageReferences: true, naturalPoseOnly }).selectedTemplates;
        const poses = templates.filter(template => usable(template, 'pose')).slice(0, 4);
        if (!poses.length) {
            const selected = automatic.find(template => usable(template, 'pose'));
            if (selected) poses.push(selected);
        }
        const costume = templates.find(template => usable(template, 'costume')) || automatic.find(template => usable(template, 'costume'));
        const portrait = templates.find(template => usable(template, 'portrait')) || automatic.find(template => usable(template, 'portrait'));
        templates = [...poses, costume, portrait].filter(Boolean);
        if (!poses.length || !costume || !portrait) throw new Error('REFERENCE_IMAGES_REQUIRED');
    }
    return { templates, library, guidance: deriveReferenceGuidance(templates, input) };
}

export function referencePlanFields(context) {
    if (!context) return {};
    return { aiStudio: {
        references: context.templates.map(template => ({
            sourceItemId: template.id, upstreamId: template.upstreamId, poseNumber: template.poseNumber,
            title: template.title, kind: template.kind, angles: template.angles || [],
            externalUrl: template.sourceUrl, rightsStatus: template.rightsStatus,
            attribution: template.sourceUrl ? 'RuiC-PoseAtlas' : 'PhotoAtelier original',
            focalLength: template.focalLength,
            referenceImageUrl: template.referenceImageUrl,
        })),
        guidance: context.guidance,
        library: context.library,
        sync: { status: 'pending', updatedAt: new Date().toISOString() },
    } };
}

import { loadStudioRegistry } from './registry.mjs';
import { runServerFirst } from './agent-lite.mjs';

const angleNames = { front: '正面', diagonal: '斜侧', side: '侧面', high: '俯视', top: '俯视', overhead: '俯视', low: '仰视', bottom: '仰视' };
const naturalPoseExclusions = /跪|后仰|躺|趴|劈叉|倒立|双手后撑|双腿斜|双腿悬空|挺胸|单腿.*肩高|单腿.*高抬|M字开腿|举过头|手臂上举|双臂上举|双手抱头|手扶后脑|单手抚后脑|双手抚后颈|kneel|reclin|supine|prone|split|inversion|overhead/i;
// PoseAtlas thumbnails expose several arm/leg actions that their short labels omit.
// Keep the reviewed source IDs out of generic natural-portrait plans.
const visuallyUnsuitableNaturalPoseIds = new Set([
    'full_single_p016', 'full_single_p019', 'full_single_p020', 'full_single_p022',
    'full_single_p027', 'full_single_p029',
]);
const raisedArmPoseIds = new Set([
    'full_single_p016', 'full_single_p019', 'full_single_p020', 'full_single_p027', 'full_single_p029',
]);

export function isNaturalPoseRequested(value) {
    const prompt = String(value || '').replace(/自然(?:光线|光)|natural\s+(?:light|lighting)/gi, '');
    return /自然|放松|轻松|日常|relaxed|natural|casual/i.test(prompt);
}

function outfitConstraints(input) {
    const text = [input.modelDesc, input.extra].filter(Boolean).join('；');
    const segments = text.split(/[，,、；;。\n]+/).map(value => value.trim()).filter(Boolean);
    const colors = [];
    const garments = new Set();
    const addColor = (id, values, primaryValues) => {
        if (!colors.some(color => color.id === id)) colors.push({ id, values, primaryValues });
    };
    for (const segment of segments) {
        const hasClothing = /衣服|穿着|穿搭|服装|上衣|上装|针织|毛衣|衬衫|裙|裤|靴|鞋|外套|coat|shirt|knit|skirt|pants|boots|jacket/i.test(segment);
        if (!hasClothing) continue;
        if (/上衣|上装|衣服|衬衫|毛衣|针织|coat|shirt|knit|jacket/i.test(segment)) garments.add('top');
        if (/针织|毛衣|knit/i.test(segment)) garments.add('knit');
        if (/半身裙|裙子|裙|skirt/i.test(segment)) garments.add('skirt');
        if (/短靴|靴|boots/i.test(segment)) garments.add('boots');
        if (/长裤|裤子|裤|pants|trousers/i.test(segment)) garments.add('pants');
        if (/米白|象牙|奶油|ivory|cream|off[- ]white/i.test(segment)) addColor('ivory', ['ivory', '米白', '象牙', '米色', '白色', 'white', 'beige'], ['ivory', 'beige']);
        else if (/米色|beige/i.test(segment)) addColor('beige', ['beige', '米色', '米白', '象牙', 'ivory'], ['beige', 'ivory']);
        else if (/卡其|khaki/i.test(segment)) addColor('khaki', ['khaki', '卡其'], ['khaki']);
        else if (/棕色|咖啡色|brown/i.test(segment)) addColor('brown', ['brown', '棕色', '咖啡'], ['brown']);
        else if (/黑色|black/i.test(segment)) addColor('black', ['black', '黑色'], ['black']);
        else if (/白色|white/i.test(segment)) addColor('white', ['white', '白色', 'ivory'], ['white', 'ivory']);
    }
    return { colors, garments: [...garments], text: segments.filter(segment => /衣服|穿着|穿搭|服装|上衣|上装|针织|毛衣|衬衫|裙|裤|靴|鞋|外套|coat|shirt|knit|skirt|pants|boots|jacket/i.test(segment)).join('，') };
}

function matchesOutfit(template, constraints) {
    if (!constraints.colors.length && !constraints.garments.length) return true;
    const corpus = [template.title, template.description, template.category, template.color, ...(template.tags || [])].join(' ').toLowerCase();
    const garmentTerms = {
        top: ['top', '上装', '上衣', '衬衫', '毛衣', '针织'], knit: ['knit', '针织', '毛衣'],
        skirt: ['skirt', '半身裙', '裙'], boots: ['boots', '靴'], pants: ['pants', 'trousers', '长裤', '裤'],
    };
    const primary = constraints.colors[0];
    if (primary && !primary.primaryValues.includes(String(template.color || '').toLowerCase())) return false;
    if (constraints.colors.some(color => !color.values.some(value => corpus.includes(value.toLowerCase())))) return false;
    return constraints.garments.every(garment => (garmentTerms[garment] || [garment]).some(value => corpus.includes(value)));
}

function poseConflicts(template, prompt, naturalPoseOnly) {
    const terms = `${template.title} ${template.description} ${template.category}`;
    const upstreamId = String(template.upstreamId || '').toLowerCase();
    if (naturalPoseOnly && (naturalPoseExclusions.test(terms) || visuallyUnsuitableNaturalPoseIds.has(upstreamId))) return true;
    const bans = [
        [/(?:禁止|不要|避免|不能|不希望)[^。；;]{0,16}跪/, /跪|kneel/i],
        [/(?:禁止|不要|避免|不能|不希望)[^。；;]{0,16}(?:躺|卧|趴)/, /躺|卧|趴|reclin|supine|prone/i],
        [/(?:禁止|不要|避免|不能|不希望)[^。；;]{0,16}(?:举过头|上举|高举|抱头)/, /举过头|上举|高举|抱头|过头|overhead/i],
        [/(?:禁止|不要|避免|不能|不希望)[^。；;]{0,16}交叉双?腿/, /交叉腿|双腿交叠|cross(?:ed|ing)? legs/i],
    ];
    const forbidsRaisedArms = /(?:禁止|不要|避免|不能|不希望)[^。；;]{0,20}(?:举过头|上举|高举|抱头|抬手过头)/i.test(prompt);
    if (forbidsRaisedArms && raisedArmPoseIds.has(upstreamId)) return true;
    const requiresGroundedFeet = /(?:双脚|两脚|双足).{0,8}(?:着地|站稳|踩地)|both feet.{0,24}(?:ground|floor)/i.test(prompt);
    if (requiresGroundedFeet && /单腿后抬|踮脚|脚离地|抬腿|one (?:foot|leg) lifted|on tiptoe/i.test(terms)) return true;
    return bans.some(([constraint, pose]) => constraint.test(prompt) && pose.test(terms));
}

function searchMatchingCostume(registry, input, candidates, constraints, requireImages) {
    const explicit = input.referenceIds?.map(id => registry.find(id)).find(template => template?.kind === 'costume');
    if (explicit) {
        if (!matchesOutfit(explicit, constraints)) throw Error('WARDROBE_REFERENCE_MISMATCH');
        return explicit;
    }
    const automatic = candidates.find(template => template.kind === 'costume' && (!requireImages || template.referenceImageUrl));
    if (!constraints.colors.length && !constraints.garments.length) return automatic;
    const query = constraints.garments.join(' ');
    const colors = constraints.colors[0]?.primaryValues || [];
    const results = new Map();
    for (const color of colors.length ? colors : [undefined]) {
        const matches = registry.search({ kind: 'costume', color, query, limit: 50 }).results;
        for (const template of matches) results.set(template.id, template);
    }
    return [...results.values()].find(template => (!requireImages || template.referenceImageUrl) && matchesOutfit(template, constraints));
}

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
            const wardrobe = String(input.modelDesc || '').trim();
            direction = `${wardrobe ? `用户指定的完整穿搭为：${wardrobe}。` : ''}库图只辅助参考材质与色系；单品、颜色、裙长、鞋型和层次以用户文字为准，不替换、不增添。忽略参考图中未指定的包袋、首饰、帽子等配饰。`;
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
    const naturalPoseOnly = isNaturalPoseRequested(prompt)
        && !/(?:采用|选择|需要|想要|来个|拍摄|摆|use|want|choose)[^。\n;；]{0,12}(?:跪|后仰|躺|趴|劈叉|倒立|kneel|reclin|supine|prone|split)/i.test(prompt);
    let templates = (ids || []).map(id => registry.find(id));
    if (templates.some(template => !template)) throw new Error('UNAVAILABLE_REFERENCE');
    const searchPrompt = prompt.slice(0, 1700);
    const hasSpecificPose = /站姿|站立|坐姿|坐着|走路|行走|回眸|靠墙|倚靠|栏杆|walk|sitting|standing/i.test(searchPrompt);
    const poseQueryPrompt = `${searchPrompt} ${hasSpecificPose ? '' : '站姿'} 服装 人像造型`;
    let automatic = runServerFirst({ registry, prompt: poseQueryPrompt, requireImageReferences: requireImages, naturalPoseOnly }).selectedTemplates;
    if (automatic.filter(template => template.kind === 'pose').length < 3) {
        const fallback = runServerFirst({ registry, prompt: '站姿', requireImageReferences: requireImages, naturalPoseOnly }).selectedTemplates;
        automatic = [...automatic, ...fallback.filter(template => !automatic.some(item => item.id === template.id))];
    }
    const usable = (template, kind) => template?.kind === kind && (!requireImages || template.referenceImageUrl) && (kind !== 'portrait' || template.section === 'face');
    const selectedPoseIds = new Set(input.referenceIds || []);
    const explicitPoses = templates.filter(template => usable(template, 'pose'));
    if (explicitPoses.some(template => selectedPoseIds.has(template.id) && poseConflicts(template, prompt, naturalPoseOnly))) {
        throw new Error('POSE_REFERENCE_CONFLICTS_WITH_USER_CONSTRAINTS');
    }
    const poses = [...explicitPoses, ...automatic.filter(template => usable(template, 'pose') && !explicitPoses.some(item => item.id === template.id)
        && !poseConflicts(template, prompt, naturalPoseOnly))].slice(0, 4);
    const constraints = outfitConstraints(input);
    const costume = searchMatchingCostume(registry, input, [...templates, ...automatic], constraints, requireImages);
    const portrait = templates.find(template => usable(template, 'portrait')) || automatic.find(template => usable(template, 'portrait'));
    templates = [...poses, costume, portrait].filter(Boolean);
    if ((constraints.colors.length || constraints.garments.length) && !costume) throw new Error('WARDROBE_REFERENCE_MISMATCH');
    if (!poses.length || !costume || !portrait) throw new Error(requireImages ? 'REFERENCE_IMAGES_REQUIRED' : 'REFERENCE_LIBRARY_UNAVAILABLE');
    return { templates, library, guidance: deriveReferenceGuidance(templates, input) };
}

export function referencePlanFields(context) {
    if (!context) return {};
    return { aiStudio: {
        references: context.templates.map(template => ({
            sourceItemId: template.id, upstreamId: template.upstreamId, poseNumber: template.poseNumber,
            title: template.title, kind: template.kind, angles: template.angles || [],
            section: template.section || '',
            tags: template.tags || [],
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

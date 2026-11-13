import { prepareReferenceContext, referencePlanFields } from './ai-studio/reference-brief.mjs';

const shotTitleLabels = {
    'long-lens-profile': '长焦侧身人像', 'high-angle-geometry': '俯拍几何构图',
    'reflection-frame': '环境层次构图', 'extreme-detail': '动作细节特写',
    'over-shoulder-context': '肩后环境人像', 'seated-profile': '侧面坐姿人像',
    'environmental-wide': '环境远景人像', 'ground-level-motion': '低机位动态人像',
    'overhead-seated': '正上方坐姿人像', 'close-expression': '表情特写',
    'eye-level-medium': '平视中景人像', 'backlit-silhouette': '逆光轮廓人像',
    'prop-interaction': '人物动作中景',
};
const propMentionPatterns = [
    ['地图', /地图|\bmap\b/i], ['橱窗', /橱窗|\bshop\s+window\b/i], ['镜面', /镜面|镜子|\bmirror\b/i],
    ['玻璃', /玻璃|\bglass\b/i], ['书本', /书本|书籍|\bbooks?\b/i], ['饮品', /饮品|咖啡杯|手持咖啡|咖啡饮品|茶饮|\bdrinks?\b|\bcoffee cup\b|\bcup of coffee\b/i],
    ['杯瓶', /杯|瓶|\bcups?\b|\bbottles?\b/i],
    ['手机', /手机|\bphone\b/i], ['雨伞', /雨伞|\bumbrella\b/i], ['包袋', /包袋|手提包|\bbags?\b/i],
    ['花束', /花束|花瓶|\bbouquet\b/i], ['相机', /相机|\bcamera\b/i], ['服装配件', /纽扣|鞋|衣摆|衣料|围巾|帽子|眼镜|饰品|\bscarf\b/i],
    ['门窗结构', /门框|窗框|门窗|窗帘|\bdoor\b|\bcurtain\b|\bframe\b/i], ['其他物件', /道具|物品|物件|工具|\bprops?\b|\bobjects?\b/i],
];
const lightingEquipmentPattern = /反光板|反光材料|补光板|补光灯|闪光灯|柔光箱|柔光屏|灯架|\breflector\b|\bsoftbox\b|\bfill light\b|\bflash\b|\bLED light\b/i;

// Shared by the local bridge and the authenticated Worker route.
export async function createDirectorPlan(input, { baseUrl, fetchImpl = fetch, referenceFetchImpl = fetch } = {}) {
    if (!baseUrl) throw new Error('DIRECTOR_NOT_CONFIGURED');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_BRIEF');
    const fields = ['theme', 'style', 'modelDesc', 'scene', 'mood', 'duration', 'people', 'extra'];
    const labels = ['主题', '风格', '模特描述', '场景', '情绪', '时长', '人数', '用户补充及限制'];
    const cleanInput = {};
    const brief = fields.map((key, i) => {
        if (input[key] != null && typeof input[key] !== 'string') throw new Error('INVALID_BRIEF');
        cleanInput[key] = String(input[key] || '').trim();
        return cleanInput[key] ? `${labels[i]}：${cleanInput[key]}` : '';
    }).filter(Boolean).join('\n');
    if (!cleanInput.theme) {
        const explicitTheme = cleanInput.extra.match(/(?:^|[，,；;\n])\s*主题\s*[:：]\s*([^，,；;\n。]+)/);
        if (explicitTheme?.[1]) cleanInput.theme = explicitTheme[1].trim().slice(0, 80);
    }
    const normalizedBrief = fields.map((key, i) => cleanInput[key] ? `${labels[i]}：${cleanInput[key]}` : '').filter(Boolean).join('\n');
    if (cleanInput.people && !Number.isInteger(Number(cleanInput.people))) throw new Error('INVALID_BRIEF');
    if (cleanInput.people && Number(cleanInput.people) < 1) throw new Error('PERSON_REQUIRED');
    const hasCreativeDirection = ['style', 'modelDesc', 'scene', 'mood', 'extra'].some(key => cleanInput[key]);
    const directionNote = cleanInput.theme ? '' : hasCreativeDirection
        ? '主题未指定：请根据已填写的信息自然构思拍摄方向；不要臆造未提供的具体地点、人物关系、服装或道具。'
        : '主题和风格均未指定：请生成一套中性、自然、可执行的人像拍摄方案；不要臆造具体地点、人物身份、关系、服装或道具，并将需现场决定的内容标为待确认。';
    const wardrobeMentioned = /衣服|穿着|穿搭|服装|上衣|上装|针织|毛衣|衬衫|裙|裤|靴|鞋|外套|妆发|发型|妆容|coat|shirt|knit|skirt|pants|boots|jacket|makeup|hairstyle/i.test(`${cleanInput.modelDesc} ${cleanInput.extra}`);
    const wardrobeNote = wardrobeMentioned ? '' : '用户未指定服装、发型或妆容：将其标为待确认，不得推荐具体款式、颜色或造型，也不得把未选择的服装/人像参考当作用户要求。';
    const userText = `${cleanInput.theme} ${cleanInput.style} ${cleanInput.modelDesc} ${cleanInput.scene} ${cleanInput.extra}`;
    const productSubject = /产品|商品/.test(userText);
    const explicitlyNoNewProps = /(?:不新增|不要|不使用|不出现|禁止)[^。\n；;]{0,20}(?:道具|物品|随身物)/i.test(`${cleanInput.extra} ${cleanInput.modelDesc}`);
    const propsOpenEnded = /(?:允许|可以|可)[^。\n；;]{0,12}(?:自由添加|自行选择|自由发挥).{0,8}(?:道具|物品)/i.test(cleanInput.extra);
    const noNewProps = explicitlyNoNewProps || !propsOpenEnded;
    const explicitlyBannedText = (userText.match(/(?:不新增|不要|不使用|不出现|禁止|不能新增|不得出现)[^。\n；;]*/g) || []).join(' ');
    const allowedPropText = userText.replace(explicitlyBannedText, '');
    const specificProductNames = ['陶瓷杯', '保温杯', '水杯', '香水瓶', '护肤品', '口红', '手机', '耳机', '手表', '相机', '运动鞋', '手提包'];
    const productName = specificProductNames.find(name => allowedPropText.includes(name));
    const productLabel = productName || '用户指定产品（品类待确认）';
    const userAllowedProps = [
        ...propMentionPatterns.filter(([, pattern]) => pattern.test(allowedPropText)).map(([label]) => label),
        ...(/产品|商品/.test(allowedPropText) ? ['用户指定产品'] : []),
    ];
    const propNote = noNewProps ? `道具限制为硬约束：只允许用户明确提供的物品${userAllowedProps.length ? `（${userAllowedProps.join('、')}）` : '；当前未指定物品'}，不得添加其他物品、配件或同行者，也不得与未提供物件互动。动作使用人体姿态、视线、步行路径和用户明确提供的固定场地结构。` : '';
    const languageNote = '分镜标题和所有执行说明使用简体中文；不要输出英文短横线内部标签。';
    const userBrief = [normalizedBrief || brief, directionNote, wardrobeNote, propNote, languageNote].filter(Boolean).join('\n');
    if (userBrief.length > 2000) throw new Error('INVALID_BRIEF');
    const referenceContext = await prepareReferenceContext(input, { fetchImpl: referenceFetchImpl });
    const compiledBrief = [userBrief, referenceContext?.guidance.brief].filter(Boolean).join('\n\n');
    const requestId = `workflow-${crypto.randomUUID()}`;
    const desiredShotCount = resolveShotCount(cleanInput);
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/v1/photoatelier/shoot-plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, brief: compiledBrief, output_count: desiredShotCount }),
        signal: AbortSignal.timeout(60000),
    }, referenceContext);
    if (!response.ok) throw new Error(`DIRECTOR_UPSTREAM_${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.shot_plans) || !result.shot_plans.length) throw new Error('DIRECTOR_INVALID_RESPONSE');
    const uniqueShots = new Map();
    result.shot_plans.forEach((shot, sourceIndex) => {
        const key = shot.shot_language || JSON.stringify([shot.model_pose, shot.photographer_position, shot.lens]);
        if (!uniqueShots.has(key)) uniqueShots.set(key, { ...shot, sourceIndex });
    });
    // Do not duplicate shots to meet a target that the upstream cannot yet supply.
    const executionShots = [...uniqueShots.values()];
    const text = value => typeof value === 'string' ? value : '';
    const sceneLocations = cleanInput.scene.split(/[;；\n]+/).map(value => value.trim()).filter(Boolean);
    const sceneScale = classifySceneScale(`${cleanInput.theme}\n${cleanInput.extra}`);
    const productActionCounts = new Map();
    const usedProductActions = new Set();
    const shotList = executionShots.slice(0, desiredShotCount).map((shot, index) => {
        const originalTitle = text(shot.shot_language) || text(shot.framing) || text(shot.model_pose);
        const originalPose = text(shot.model_pose);
        const originalPosition = text(shot.model_position);
        const photographerPosition = text(shot.photographer_position);
        const sceneActionText = [originalTitle, originalPose, originalPosition, photographerPosition, text(shot.framing), text(shot.crop_boundary), text(shot.must_show), text(shot.execution_note)].join(' ');
        const hasUnrequestedObject = propMentionPatterns.some(([, pattern]) => pattern.test(sceneActionText) && !pattern.test(allowedPropText));
        const shotProps = text(shot.shot_props);
        const declaresUnrequestedProp = propMentionPatterns.some(([, pattern]) => pattern.test(shotProps) && !pattern.test(allowedPropText));
        const unrequestedPropAction = noNewProps && (hasUnrequestedObject || declaresUnrequestedProp || /prop-interaction/i.test(originalTitle) && !userAllowedProps.length);
        const sceneMentionsProduct = /产品|商品|\bproduct\b|\bitem\b/i.test(sceneActionText)
            || productName && new RegExp(productName).test(sceneActionText);
        const productShotNeedsRewrite = productSubject && (unrequestedPropAction || !sceneMentionsProduct);
        const ambiguousPortraitAction = !productSubject && /(?:或|或者|任选其一|根据现场|动作与环境发生关系|与环境产生互动|自由发挥|适时)/.test(sceneActionText);
        const safeRewrite = unrequestedPropAction || productShotNeedsRewrite || ambiguousPortraitAction;
        const safeActions = [
            '模特自然站立，重心轻移，并将视线从画外缓慢转向镜头。',
            '模特沿已确认的安全通行路径缓慢前行，步幅自然，身体保持放松。',
            '模特停步后轻微转动肩线与头部，视线落在前方，不触碰周边物品。',
            '模特保持自然站姿，以轻微侧身和视线变化完成情绪转换。',
            '模特以四分之三侧身站立，先看向镜头一侧，再自然回望镜头。',
            '模特缓步经过画面，不看镜头，保持肩部放松和自然步态。',
            '模特站定后轻微转向侧面，以头部方向和眼神变化呈现情绪。',
            '模特沿安全路径走至画面边缘停下，身体朝向前方，视线短暂回到镜头。',
            '模特短暂闭眼后缓慢睁开，视线停在镜头附近，保持表情自然。',
            '模特低头看向地面，再缓慢抬眼看向镜头一侧。',
            '模特轻微抬起下巴后回到自然位置，肩部保持放松。',
            '模特转头看向身后，再转回正面，双脚留在原地。',
            '模特将重心从一侧脚缓慢移到另一侧，手臂自然下垂。',
            '模特向后小步移动后停住，保持正面朝向并看向镜头。',
            '模特缓慢向侧面迈一步，停下后将双脚恢复平行站姿。',
            '模特轻轻侧倾头部，再回到中性姿态，视线保持在镜头附近。',
        ];
        const knownTitle = shotTitleLabels[originalTitle];
        const sizeLabel = ({ ECU: '局部特写', CU: '特写', MCU: '近景', MS: '中景', MFS: '中全景', FS: '全身', WS: '环境全景', EWS: '环境远景' })[shot.shot_size] || '';
        const angleLabel = ({ eye_level: '平视', high_angle: '俯拍', ground_level: '低机位', overhead: '安全高位俯拍', low_angle: '低机位', over_shoulder: '肩后' })[shot.camera_angle] || '';
        const productDetail = /杯/.test(productName || '') ? '杯体' : '产品主体';
        const productActionGroup = /局部特写|特写|近景/.test(sizeLabel) ? 'close'
            : /环境|全身/.test(sizeLabel) ? 'environment' : 'medium';
        const productActions = productActionGroup === 'close' ? [
            `模特双手稳定持住${productLabel}，缓慢转动产品，清晰呈现${productDetail}外观；不添加装饰或配件。`,
            `模特单手握持${productLabel}，保持产品稳定，手部与${productDetail}轮廓共同入镜；不虚构使用方式。`,
            `模特将${productLabel}从胸前缓慢移近镜头后停稳，突出${productDetail}整体轮廓；不补造细节。`,
            `模特保持${productLabel}竖直，手腕轻转后停在正面朝向镜头的位置，清楚呈现外形。`,
            `模特双手托稳${productLabel}，先保持静止，再缓慢转回正面，完成一次稳定展示。`,
        ] : productActionGroup === 'environment' ? [
            `模特持${productLabel}站在画面一侧，转身约四分之一后停下，让全身姿态与产品比例同时清晰。`,
            `模特沿室内安全路径缓步两三步，保持${productLabel}稳定，停下后将产品主体朝向镜头。`,
            `模特站在画面偏侧，清楚展示手中的${productLabel}，另一侧留出空间呈现人物与产品的尺度关系。`,
            `模特先侧身站定，再缓慢转向镜头，始终让${productLabel}保持在身体前侧且不被遮挡。`,
            `模特手持${productLabel}沿安全路径走到画面边缘停下，保持产品与人物全身同时可见。`,
            `模特持${productLabel}站定后先看向画面一侧，再转向镜头，保持人物全身与产品同时清晰。`,
        ] : [
            `模特持${productLabel}于胸前，先看产品再抬眼看镜头，完成一次展示动作。`,
            `模特侧身持${productLabel}，手腕轻转让产品正面朝向镜头，另一只手自然放松。`,
            `模特站定后将${productLabel}从腰侧抬至胸前，动作缓慢完整后停住。`,
            `模特将${productLabel}保持在胸前一侧，先看向产品，再转头看镜头，身体姿势保持稳定。`,
            `模特站定后轻微转动肩线，把${productLabel}从身体侧前方移到胸前展示，产品保持竖直。`,
        ];
        const productActionIndex = productActionCounts.get(productActionGroup) || 0;
        productActionCounts.set(productActionGroup, productActionIndex + 1);
        const productAction = productActions[productActionIndex % productActions.length];
        const safeAction = productSubject ? productAction : safeActions[index % safeActions.length];
        const draftTitle = safeRewrite ? productSubject
            ? `${angleLabel}${sizeLabel || '产品'}产品展示镜头 ${index + 1}` : `${angleLabel}${sizeLabel}人像 ${index + 1}`
            : knownTitle || (/[A-Za-z_-]/.test(originalTitle) ? `人像拍摄镜头 ${index + 1}` : originalTitle);
        const title = `${draftTitle.replace(/\s*\d+$/, '').trim()} ${index + 1}`;
        let description = safeRewrite || /[A-Za-z]/.test(originalPose) ? safeAction : originalPose;
        if (productSubject) {
            if (usedProductActions.has(description.trim())) {
                description = productActions.find(action => !usedProductActions.has(action)) || description;
            }
            usedProductActions.add(description.trim());
        }
        const composition = safeRewrite ? productSubject
            ? `${sizeLabel || '当前景别'}以${productLabel}为可辨主体，人物动作围绕产品实际用途安排；未确认的产品细节和辅助物件不补造。`
            : `${sizeLabel || '适合当前景别'}取景，人物置于画面偏侧，保留已确认场地的纵深与自然空间；不加入未提供的物件。`
            : originalPosition;
        const methodValue = photographerPosition;
        const safeMethod = shot.camera_angle === 'high_angle' || shot.camera_angle === 'overhead'
            ? '摄影师双脚站稳在安全地面，从高于人物视线的位置俯拍；不攀爬、不站不稳物体。'
            : shot.camera_angle === 'ground_level' || shot.camera_angle === 'low_angle'
                ? '摄影师在安全通行区域内降低机位拍摄，不躺卧在车行道或阻碍行人。'
                : '摄影师在安全通行区域与人物保持距离，按标注景别完成取景。';
        const method = safeRewrite || /[A-Za-z]/.test(methodValue) ? safeMethod : methodValue;
        const safeComposition = /[A-Za-z]/.test(composition) ? '人物在画面中自然站立或沿安全通行路径缓慢移动，保留已确认场地的空间层次。' : composition;
        const wardrobe = wardrobeMentioned ? text(shot.wardrobe_styling) : '服装与妆发待确认；本方案不指定具体款式、颜色或配件。';
        const props = noNewProps ? userAllowedProps.length
            ? `仅使用用户明确提供的物品（${productSubject ? productLabel : userAllowedProps.join('、')}）；不新增其他道具。`
            : '无新增道具；仅可利用用户明确提供的固定场地结构。'
            : text(shot.shot_props) || '以实际场地和已有资源为准';
        const lightingSource = text(shot.lighting_setup);
        const generatorPromptSource = text(shot.generator_prompt);
        const unrequestedLightingGear = lightingEquipmentPattern.test(`${lightingSource} ${generatorPromptSource}`)
            && !lightingEquipmentPattern.test(allowedPropText);
        const lighting = unrequestedLightingGear
            ? '仅使用现场已有自然光或环境光；调整人物朝向与摄影师站位完成曝光，不新增灯具或反光器材。'
            : lightingSource;
        const generatorPrompt = unrequestedLightingGear
            ? generatorPromptSource.replace(new RegExp(lightingEquipmentPattern.source, 'gi'), 'natural ambient light')
            : generatorPromptSource;
        const safeFraming = productSubject ? `${angleLabel || '自然机位'}${sizeLabel || '产品'}取景，呈现${productLabel}与人物的关系`
            : `${angleLabel || '自然机位'}${sizeLabel || '人物'}取景，呈现人物姿态与已确认场地的空间关系`;
        const safeCrop = productSubject ? `${productLabel}主体与人物动作保持清晰；具体产品边界与细节范围按实物确认。`
            : '人物主体完整清晰；按当前景别保留必要的头部、肢体和画面边界空间。';
        const safeMustShow = productSubject ? `${productLabel}与人物展示或使用关系` : '人物姿态、视线方向与已确认场地';
        const safeReject = productSubject ? '产品类型或使用方式未经确认；出现未提供的辅助物品' : '新增未提供的物品、人物关系或物件互动';
        const safeExecutionNote = productSubject ? '先确认产品品类与实际功能，再按当前景别安排展示或真实使用动作；不补造辅助物品。'
            : '根据当前景别和机位，使用站姿、步行、视线及重心变化完成镜头。';
        const cropBoundary = safeRewrite ? safeCrop : text(shot.crop_boundary);
        const mustShow = safeRewrite ? safeMustShow : text(shot.must_show);
        const rejectIf = safeRewrite ? safeReject : text(shot.reject_if);
        const executionNote = safeRewrite ? safeExecutionNote : text(shot.execution_note);
        const clothingDetail = /服装细节|衣料细节/.test(title);
        const referencePoses = (referenceContext?.templates || []).filter(template => template.kind === 'pose');
        const poseText = `${title} ${description}`;
        const poseRef = clothingDetail || !referencePoses.length ? null : referencePoses.find(template => {
            const hints = [template.title, template.description, ...(template.tags || []),
                (referenceContext.guidance?.suggestions || []).find(item => item.sourceItemId === template.id)?.direction]
                .filter(Boolean).join(' ');
            const terms = ['回眸', '回望', '回头', '侧身', '行走', '步行', '迈步', '坐姿', '坐着', '靠墙', '扶腰', '腰侧', '触发丝', '整理头发'];
            return terms.some(term => poseText.includes(term) && hints.includes(term));
        }) || referencePoses[index % referencePoses.length];
        const directorContract = { ...shot, shot_language: title, model_pose: description,
            referenceIds: poseRef ? [poseRef.id] : [],
            model_position: safeComposition, photographer_position: method, wardrobe_styling: wardrobe, shot_props: props,
            lighting_setup: lighting, generator_prompt: generatorPrompt,
            execution_note: executionNote, must_show: mustShow, reject_if: rejectIf,
            ...(safeRewrite ? { framing: safeFraming, crop_boundary: safeCrop,
                generator_prompt: `${productSubject ? 'Editorial product photography with an adult model.' : 'Editorial portrait.'} ${safeFraming}. Action: ${description} Composition: ${safeComposition} Crop: ${safeCrop} User constraint: no unrequested props or object interactions.` } : {}) };
        return {
        id: `${requestId}-${index}`, scene: sceneLocations[index % Math.max(1, sceneLocations.length)] || '场地待确认',
        description, shotSize: ({ECU:'局部特写',CU:'特写',MCU:'近景',MS:'中景',MFS:'中全景',FS:'全身',WS:'环境全景',EWS:'环境远景'})[shot.shot_size] || (safeRewrite ? sceneScale.shotSize : text(shot.framing) || sceneScale.shotSize),
        title,
        sourceShotIndex: shot.sourceIndex,
        method, focalLength: text(shot.lens),
        composition: safeComposition, lighting,
        wardrobe, props, angle: ({eye_level:'平视',high_angle:'俯拍',ground_level:'贴地低机位',overhead:'正上方俯拍',low_angle:'仰拍',over_shoulder:'肩后机位'})[shot.camera_angle] || text(shot.camera_angle),
        mood: cleanInput.mood || '待确认', duration: 0,
        notes: `裁切：${cropBoundary}；必须呈现：${mustShow}；拒绝：${rejectIf}`,
        lightingSetup: lighting, priority: '待人工确认',
        alternative: executionNote, camera: {},
        // Scene-scale hints describe the overall request and may contain
        // multiple requested shot types. They must not overwrite this
        // specific shot's framing contract.
        directorContract,
    }; });
    return {
        title: buildPlanTitle(cleanInput), input: cleanInput, savedAt: new Date().toISOString(),
        ...referencePlanFields(referenceContext),
        style: cleanInput.style, images: [], shotList,
        references: Array.isArray(result.references) ? result.references : [],
        sections: shotList.map((shot, i) => ({ ti: `镜头 ${i + 1} · ${shot.title}`, ic: '', c: [
            `人物怎么做：${shot.description}`, `摄影师站哪里：${shot.method}`,
            `人物放在哪里：${shot.composition}`, `景别与焦段：${shot.shotSize} · ${shot.focalLength}`,
            `光线怎么用：${shot.lighting}`, `服装与妆发：${shot.wardrobe || '待确认'}`,
            `本镜头道具：${shot.props}`, `画面要求：${shot.notes}`,
        ] })),
        director: { requestId, source: 'director-shoot-plan', submittedBrief: compiledBrief, desiredShotCount,
            shotCountLimited: shotList.length < desiredShotCount,
            reviewRequired: true, imageGenerationConnected: true,
            imageGenerationMode: 'external-provider-candidate-review', generationCandidates: [], sceneScale },
    };
}

export function createTemplatePlan(input, referenceContext) {
    if (!referenceContext?.templates.some(template => template.sourceUrl)) throw new Error('REFERENCE_LIBRARY_UNAVAILABLE');
    const plan = createGuestPlanDraft(input);
    const poses = referenceContext.templates.filter(template => template.kind === 'pose');
    if (!poses.length) throw new Error('POSE_TEMPLATE_REQUIRED');
    const locations = String(input.scene || '场地待确认').split(/[;；\n]+/).map(value => value.trim()).filter(Boolean);
    const fixedLensText = String(input.extra || '');
    const fixedLensMatch = fixedLensText.match(/(?:全组|全程|统一|固定|只用|only|must use)[^。\n;；]{0,24}?\b(24|28|35|50|85|105|135)\s*mm\b/i)
        || fixedLensText.match(/\b(24|28|35|50|85|105|135)\s*mm\b[^。\n;；]{0,12}(?:固定|统一|全组|只用)/i);
    const fixedLens = fixedLensMatch ? `${fixedLensMatch[1]}mm` : '';
    const poseDirections = {
        'atlas-pose-full_single_p015': '双脚前后错开半步，重心落在后脚；靠镜头一侧的手轻搭髋部，另一只手自然下垂，肩膀放松。',
        'atlas-pose-full_single_p017': '身体转离镜头约四十五度，双脚站稳；头部越过近侧肩回望，肩颈放松，视线落在镜头附近。',
        'atlas-pose-full_single_p018': '双脚与髋同宽站稳，双手轻放腰侧，肘部自然向外不过度撑开；肩膀放松，身体略转向镜头。',
        'atlas-pose-full_single_p016': '双臂抬起，双手触及头顶发丝，肘部向两侧打开；仅在用户允许举臂时采用。',
    };
    const framingDirections = {
        '环境全景': { prompt: 'Wide environmental full-body photograph. Keep the person visible head-to-toe within the full location.', crop: '人物全身入画，环境占主要面积，头顶与脚下留出空间。', required: '公园环境、人物全身和场地纵深同时清晰可辨' },
        '环境远景': { prompt: 'Environmental long shot. Keep the person small but clearly identifiable in the location.', crop: '人物完整入画并保留较多环境，不裁切头脚。', required: '人物完整轮廓、场地结构与人物所处位置' },
        '全身': { prompt: 'Full-body portrait. Show the person from head to toe, including both shoes and ground beneath them.', crop: '从头顶至双鞋完整入画，头顶与脚下留有边距。', required: '完整人物、双鞋与脚下地面' },
        '中全景': { prompt: 'Medium-full portrait. Crop above the knees, showing the head, torso and hands.', crop: '膝上取景，头部、躯干和正在摆姿的双手均完整入画。', required: '膝上构图、头部、躯干和动作手部' },
        '中景': { prompt: 'Waist-up portrait from the top of the head to the natural waistline. The lower edge cuts at the waistline; exclude hips, legs and shoes.', crop: '画面从头顶至自然腰线，下缘切在腰线；髋部以下、腿和鞋不入画。', required: '腰上构图与清晰面部，动作只在裁切内呈现' },
        '近景': { prompt: 'Head-and-shoulders portrait. Crop below the shoulders and keep the entire face in frame.', crop: '肩部以上近景，完整保留面部与发顶。', required: '清晰面部表情、发型和肩部姿态' },
        '特写': { prompt: 'Tight close-up of the face or the clothing detail specified by the shot.', crop: '紧凑特写，只保留本镜指定的面部或服装细节。', required: '本镜指定的面部表情或服装纹理细节' },
        '局部特写': { prompt: 'Tight detail close-up of the exact hand, fabric or accessory named in the shot.', crop: '局部取景，关节不被画框切断，背景保持简洁。', required: '指定的手部、衣料或配饰细节' },
    };
    const titleDirections = {
        '环境建立镜头': '环境人像建立', '人物进入镜头': '全身人像', '动作主镜头': '摆姿主镜头',
        '前景层次镜头': '前景层次人像', '表情与质感镜头': '自然表情近景', '关系细节镜头': '人物与服装细节',
        '构图变化镜头': '侧向构图人像', '光线过渡镜头': '柔光过渡人像', '主视觉镜头': '主视觉人像',
        '收束细节镜头': '眼神收束近景', '肩后情境镜头': '单人回眸构图', '轮廓光镜头': '轮廓光人像',
        '框景镜头': '环境线条人像', '侧面姿态镜头': '侧身人像', '道具互动镜头': '人物与服装细节',
        '环境切片镜头': '环境人像收束',
    };
    const wardrobeRequirement = String(input.modelDesc || '').trim();
    const selectedCostume = referenceContext.templates.find(template => template.kind === 'costume');
    const costumeColorEnglish = selectedCostume?.color || '';
    const costumeColor = ({ ivory: '象牙白', white: '白色', brown: '棕色', black: '黑色', beige: '米色', khaki: '卡其色' })[selectedCostume?.color] || selectedCostume?.color || '';
    const costumeType = selectedCostume?.tags?.find(tag => ['knit', 'shirt', 'coat', 'dress'].includes(tag)) || '';
    const costumeTypeChinese = ({ knit: '针织', shirt: '衬衫', coat: '外套', dress: '连衣裙' })[costumeType] || '';
    const costumeCategory = ({ top: '上衣', inner: '内搭', dress: '连衣裙', bottom: '下装' })[selectedCostume?.category] || '';
    const detailGarment = [costumeColorEnglish, costumeType, selectedCostume?.category === 'top' ? 'top' : selectedCostume?.category].filter(Boolean).join(' ') || 'specified garment';
    const detailGarmentChinese = [costumeColor, costumeTypeChinese, costumeCategory].filter(Boolean).join('') || '用户指定服装';
    const scenePoseCounts = new Map();
    const isHandsAtWaistPose = candidate => ['full_single_p018', 'full_single_p025'].includes(String(candidate.upstreamId || '').toLowerCase());
    const hasNarrowHandsAtWaistPose = poses.some(candidate => String(candidate.upstreamId || '').toLowerCase() === 'full_single_p018');
    let croppedHandsAtWaistUsed = false;
    const sceneForIndex = (shot, index) => locations[Math.floor(index * locations.length / plan.shotList.length)] || shot.scene;
    const preferredPosePatternFor = shot => {
        const title = titleDirections[shot.title] || shot.title;
        if (/人物与服装细节|服装细节/.test(title)) return null;
        return /回眸/.test(title) ? /回眸|回头|回望|look back/i
            : ['近景', '特写', '局部特写'].includes(shot.shotSize) && /表情|眼神|服装细节/.test(title) ? /抚颈|neck/i : null;
    };
    const preferredTemplateFor = pattern => pattern && poses.find(template => pattern.test(`${template.title} ${template.englishTitle || ''}`));
    plan.shotList = plan.shotList.map((shot, index) => {
        const scene = sceneForIndex(shot, index);
        let title = titleDirections[shot.title] || shot.title;
        if (!selectedCostume && /人物与服装细节|服装细节/.test(title)) title = title.replace(/人物与服装细节|服装细节/g, '人物动作细节');
        const clothingDetail = Boolean(selectedCostume) && /人物与服装细节|服装细节/.test(title);
        const foregroundLayered = /前景层次/.test(title);
        const upperBodyCrop = ['中景', '近景', '特写', '局部特写'].includes(shot.shotSize);
        const availableForCrop = candidate => !upperBodyCrop || !isHandsAtWaistPose(candidate)
            || (!croppedHandsAtWaistUsed && !(hasNarrowHandsAtWaistPose && String(candidate.upstreamId || '').toLowerCase() === 'full_single_p025'));
        const poseState = scenePoseCounts.get(scene) || { count: 0, used: new Set() };
        let template = null;
        if (!clothingDetail) {
            const preferredPosePattern = preferredPosePatternFor(shot);
            const preferredPose = preferredPosePattern && poses.find(candidate => !poseState.used.has(candidate.id)
                && availableForCrop(candidate)
                && preferredPosePattern.test(`${candidate.title} ${candidate.englishTitle || ''}`));
            const reservedPoseIds = new Set();
            for (let futureIndex = index + 1; futureIndex < plan.shotList.length; futureIndex++) {
                const futureShot = plan.shotList[futureIndex];
                if (sceneForIndex(futureShot, futureIndex) !== scene) continue;
                const futureTemplate = preferredTemplateFor(preferredPosePatternFor(futureShot));
                if (futureTemplate && !poseState.used.has(futureTemplate.id)) reservedPoseIds.add(futureTemplate.id);
            }
            template = preferredPose || poses.find(candidate => !poseState.used.has(candidate.id) && availableForCrop(candidate) && !reservedPoseIds.has(candidate.id))
                || poses.find(candidate => !poseState.used.has(candidate.id) && availableForCrop(candidate))
                || poses.find(availableForCrop)
                || poses.find(candidate => !poseState.used.has(candidate.id)) || poses[poseState.count % poses.length];
            poseState.used.add(template.id);
            poseState.count++;
            scenePoseCounts.set(scene, poseState);
            if (upperBodyCrop && isHandsAtWaistPose(template)) croppedHandsAtWaistUsed = true;
        }
        const guidance = template ? referenceContext.guidance.suggestions.find(item => item.sourceItemId === template.id)?.direction || '' : '';
        const fullPoseDirection = template ? poseDirections[template.id] || guidance : '';
        const croppedPoseDirections = {
            'atlas-pose-full_single_p015': '肩线轻转，靠近镜头一侧的手自然停在画框内；髋部不入画时不强求扶腰。',
            'atlas-pose-full_single_p017': '上身转离镜头约四十五度，再回头看向镜头附近，肩颈放松。',
            'atlas-pose-full_single_p018': '肩膀略转，双手只在画框内自然落于腰侧；手或髋部不入画时不强求扶腰。',
            'atlas-pose-full_single_p021': '靠镜头一侧的手轻触颈侧，另一只手在画框外自然放松。',
        };
        const croppedPoseLabels = {
            'atlas-pose-full_single_p021': '站立・单手轻触颈侧（上半身裁切适配）',
        };
        const action = clothingDetail
            ? `模特自然穿着服装库 ${selectedCostume?.upstreamId || selectedCostume?.id || '所选单品'} 的${detailGarmentChinese}；镜头贴近肩部与上躯干，让面料纹理成为主体并保留真人穿着轮廓；面部可在画外，不安排手部动作或全身摆姿。`
            : upperBodyCrop
            ? `上半身摆姿参考（${croppedPoseLabels[template.id] || template.title}）：${croppedPoseDirections[template.id] || fullPoseDirection} 不要求画框外的手脚动作。`
            : `摆姿参考：${template.title}。${fullPoseDirection}`;
        const lens = fixedLens || shot.focalLength;
        const angle = /肩后|over[- ]the[- ]shoulder/i.test(shot.angle) || /侧向构图人像/.test(title) ? '平视' : shot.angle;
        const cameraAngle = angle.replace(/机位$/, '');
        const wide = ['环境全景', '环境远景', '全身'].includes(shot.shotSize);
        const detail = ['近景', '特写', '局部特写'].includes(shot.shotSize);
        const framing = clothingDetail ? {
            prompt: `Tight close-up of the specified ${detailGarment} worn naturally by the model. Show the model's shoulder and upper torso to establish a real wearer; the face may be outside the frame. Keep the fabric detail dominant; do not create an isolated product or floating garment.`,
            crop: `紧凑服装细节特写，展示模特穿着的${detailGarmentChinese}肩部与上躯干，保留真人穿着轮廓；面部可在画外，让指定面料纹理成为主体，不拍孤立服装或全身搭配。`,
            required: `模特穿着${detailGarmentChinese}的肩部与上躯干轮廓，以及清晰面料纹理`,
        } : framingDirections[shot.shotSize] || {
            prompt: `Photographic framing ${shot.shotSize}.`, crop: `按${shot.shotSize}取景，保持人物主体完整。`,
            required: `${shot.shotSize}构图与清晰人物主体`,
        };
        const method = wide
            ? `摄影师后退至人物和场景完整入画，采用${cameraAngle}机位，并留意背景线条不要穿过头部。`
            : `摄影师站在人物侧前方，采用${cameraAngle}机位，先确认${framing.crop}再引导动作。`;
        const composition = wide
            ? '人物放在画面一侧三分线，视线方向留白，检查头顶、手指和鞋底边界，避开穿头的背景线条。'
            : foregroundLayered ? /竹/.test(scene)
                ? '在画面边缘加入少量柔焦竹叶作为自然前景，不遮挡面部或眼睛；人物面部保持完整清晰，不增加任何道具。'
                : '在画面边缘加入少量场地现有的柔焦自然植物作为前景，不遮挡面部或眼睛；人物面部保持完整清晰，不增加任何道具。'
            : clothingDetail ? '以用户指定服装的纹理为焦点，保留一段完整衣料边缘，背景简洁，不带入未指定配饰。'
                : detail ? '眼睛落在上三分线，完整保留本镜指定的面部或细节主体，背景保持简洁。'
                : '以眼睛为焦点，肩线略转向画面内部，视线方向留白，裁切避开肘部和膝盖。';
        const backlit = /逆光/.test(angle) || /轮廓光/.test(title);
        const lighting = backlit
            ? '人物背后约45度侧后方来光勾勒发丝与肩部轮廓；脸朝向开阔天空或明亮环境，用自然环境光补足眼睛和肤色，避免轮廓与背景过曝。'
            : /窗|window/i.test(scene)
            ? '人物距窗约一米，身体与窗面呈约45度，利用窗光侧向塑形，先关掉造成混色的室内灯，再按脸部曝光。'
            : '先在开阔阴影中找柔和侧光，避开脸上的斑驳直射光，按脸部曝光并保留背景亮部层次。';
        const stance = /(?:不|禁止)交叉双?腿/.test(input.extra || '')
            ? 'Both feet parallel and hip-width apart on the ground. Legs straight and separated, weight evenly on both feet.' : '';
        const wardrobe = clothingDetail
            ? `本镜服装要求：服装库 ${selectedCostume?.upstreamId || selectedCostume?.id || '所选单品'} 的${detailGarmentChinese}，由模特自然穿着；仅展示肩部与上躯干的穿着状态及面料纹理，面部可在画外；不出现整套裙装、鞋履或未指定配饰。`
            : `${wardrobeRequirement ? `人物与服装硬性要求：${wardrobeRequirement}。` : ''}用户文字是单品、颜色、裙长、鞋型和层次的唯一硬约束；服装库图片只辅助参考材质与色系。只保留文字指定的服装，不复制未指定的包袋、首饰、帽子或其他配饰，不替换、不增添。`;
        const rejectIf = foregroundLayered
            ? 'foreground covering the face or eyes, added props, wrong crop, added or replaced garments, extra limbs, malformed hands, text, watermark'
            : 'wrong crop, added or replaced garments, extra limbs, malformed hands, text, watermark';
        const mustShow = [framing.required, action, ...(foregroundLayered ? [composition] : [])].join('；');
        const contract = {
            source: 'template-library-plan', referenceIds: template ? [template.id] : [],
            shot_language: template ? `${title} · ${template.title}` : title, model_pose: action,
            shot_size: shot.shotSize, lens, camera_angle: angle,
            scene, photographer_position: method, model_position: composition,
            lighting_setup: lighting, wardrobe_styling: wardrobe, shot_props: '不额外添加道具，只保留场地已有元素。',
            crop_boundary: framing.crop, must_show: mustShow,
            reject_if: rejectIf,
            generator_prompt: `Editorial photograph. ${framing.prompt} ${stance} ${lens}, ${angle}. Scene: ${scene}. Action: ${action}. Composition: ${composition}. Crop: ${framing.crop}. Lighting: ${lighting}. Subject and clothing: ${input.modelDesc || ''}. User constraints: ${input.extra || ''}. Style: ${input.style || ''}.`,
        };
        return { ...shot, title, scene, angle, description: action, focalLength: lens, method, composition, lighting, lightingSetup: lighting, wardrobe,
            props: '不额外添加道具，只保留场地已有元素。', directorContract: contract };
    });
    Object.assign(plan, referencePlanFields(referenceContext));
    plan.sections = plan.shotList.map((shot, index) => ({ ti: `镜头 ${index + 1} · ${shot.title}`, ic: '', c: [
        `拍摄场景：${shot.scene}`,
        `模板动作：${shot.description}`, `景别与焦段：${shot.shotSize} · ${shot.focalLength}`,
        `摄影师机位：${shot.angle}，${shot.method}`,
        `构图安排：${shot.composition}`, `光线安排：${shot.lighting}`,
        `人物与服装：${shot.wardrobe}`, `用户限制：${input.extra || '无补充'}`,
    ] }));
    plan.director.source = 'template-library-plan';
    plan.director.submittedBrief += `\n${referenceContext.guidance.brief}`;
    plan.director.imageGenerationMode = 'template-library-candidate-review';
    return plan;
}

function resolveShotCount(input) {
    const duration = String(input.duration || '2小时');
    const match = duration.match(/(\d+(?:\.\d+)?)\s*(小时|h|分钟|min)/i);
    const hours = match ? Number(match[1]) / (/分钟|min/i.test(match[2]) ? 60 : 1) : 2;
    let count = hours <= 1 ? 9 : hours <= 2 ? 11 : hours <= 4 ? 13 : 15;
    if (Number(input.people || 1) > 1) count += 1;
    if (/[、，,；;\/]|多场景|转场|室内.*室外|室外.*室内/.test(String(input.scene || ''))) count += 1;
    if (/视频|短片|品牌|产品|封面|横竖|多平台/.test(`${input.theme || ''} ${input.extra || ''}`)) count += 1;
    return Math.max(9, Math.min(16, count));
}

export function createGuestPlanDraft(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_BRIEF');
    const fields = ['theme', 'style', 'modelDesc', 'scene', 'mood', 'duration', 'people', 'extra'];
    const values = fields.map(key => {
        if (input[key] != null && typeof input[key] !== 'string') throw new Error('INVALID_BRIEF');
        return String(input[key] || '').trim();
    });
    if (values.join('').length > 2000) throw new Error('INVALID_BRIEF');

    const requestId = `guest-${crypto.randomUUID()}`;
    const count = resolveShotCount(input);
    const scene = input.scene || '场地待确认';
    const mood = input.mood || '自然、克制';
    const sceneScale = classifySceneScale(`${input.theme || ''}\n${input.extra || ''}`);
    const soloPatterns = [
        ['环境建立镜头', '环境全景', '24mm', '平视', '先拍场地与人物的空间关系，人物停留三秒后自然移动。'],
        ['人物进入镜头', '全身', '35mm', '平视', '人物从画面边缘进入，走到预定位置后停下。'],
        ['动作主镜头', '中全景', '50mm', '轻微俯拍', '围绕一个明确动作拍摄，保留起势、停顿和收势。'],
        ['前景层次镜头', '中景', '50mm', '侧拍', '利用前景遮挡制造层次，人物保持自然视线。'],
        ['表情与质感镜头', '近景', '85mm', '平视', '捕捉安静表情和手部细节，避免过度摆拍。'],
        ['关系细节镜头', '特写', '85mm', '平视', '记录手部、服装或道具与环境的互动。'],
        ['构图变化镜头', '中景', '35mm', '低机位', '改变机位高度，保留场景的几何结构。'],
        ['光线过渡镜头', '中全景', '50mm', '逆光侧拍', '人物转向主要光源，记录明暗交界。'],
        ['主视觉镜头', '全身', '35mm', '平视', '完成最清晰的一张叙事主画面，留出后期裁切空间。'],
        ['收束细节镜头', '近景', '85mm', '平视', '以安静细节结束，呼应开场的环境元素。'],
        ['肩后情境镜头', '中景', '50mm', '肩后', '从人物身后保留前方场景，强化现场感。'],
        ['轮廓光镜头', '全身', '50mm', '侧逆光', '让人物边缘与背景分离，动作保持简洁。'],
        ['框景镜头', '中景', '35mm', '平视', '使用门框、窗框或建筑线条形成自然框景。'],
        ['侧面姿态镜头', '中景', '85mm', '侧拍', '人物以侧身姿态停留，保留呼吸感。'],
        ['道具互动镜头', '近景', '50mm', '俯拍', '仅在有道具时使用，强调手部与道具的关系。'],
        ['环境切片镜头', '环境远景', '24mm', '平视', '拍摄无人物或弱人物环境，作为成片组图的呼吸页。']
    ];
    const peopleCount = Number(input.people || 1);
    const subject = peopleCount === 2 ? '两位人物' : '多人';
    const pairPatterns = [
        ['共同进入场景', '环境全景', '24mm', '平视', `${subject}一起进入画面，在环境中自然停下，先交代彼此距离与场景关系。`, '退到能同时容纳所有人的位置，等两人停稳再拍。', '人物分布在画面两侧，保留中间的环境空间。'],
        ['并肩走入画面', '全身', '35mm', '平视', `${subject}以各自舒服的步速并肩走过，不要求同步摆姿或看镜头。`, '沿行走方向平行跟拍，连续记录起步到停步。', '两人错开半步，避免身体和脸部互相遮挡。'],
        ['边走边交谈', '中全景', '50mm', '侧拍', `${subject}自然交谈，保留说话、倾听和短暂笑意，不要求刻意亲密动作。`, '从侧前方跟随，优先抓两人都清晰的交流瞬间。', '两张脸处于相近焦平面，给视线方向留空间。'],
        ['停下后的关系变化', '中景', '50mm', '平视', `${subject}停下后先看向场景，再自然交换一个眼神，记录关系变化而非固定姿势。`, '固定机位等待动作发生，不连续口令催促表情。', '人物分别落在画面左右三分区，背景线条不穿过头部。'],
        ['共同看向同一处', '中全景', '35mm', '侧后方', `${subject}一起观察场景中的同一方向，保留肩部朝向和视线关系。`, '站在两人侧后方拍摄，确认两人的视线落点都在画外同一区域。', '用视线方向形成引导线，人物不要互相挡脸。'],
        ['前后步幅层次', '全身', '35mm', '轻微低机位', `${subject}一人自然领先半步、另一人跟上，走出前后层次后短暂停留。`, '在安全平地低机位拍摄，注意边缘畸变与脚部完整。', '前后错位但都留出完整轮廓，不把后方人物压成背景。'],
        ['并行而不看镜头', '中全景', '50mm', '正侧面', `${subject}保持各自的动作节奏并行经过镜头，让互动来自距离和步伐。`, '在固定位置等待两人经过，连拍覆盖不同步态。', '利用道路或建筑线条横向延伸，人物间保留呼吸空间。'],
        ['轻微错身回望', '中景', '85mm', '侧拍', `${subject}交错走过后各自回望场景，不要求同时转头或摆出相同动作。`, '使用中长焦压缩背景，等待动作错开的自然瞬间。', '分别保留两人侧脸轮廓，避免焦点只落在一人身上。'],
        ['前景中的双人层次', '中全景', '50mm', '侧前方', `${subject}经过前景边缘时保持交流，前景只做轻微遮挡，不遮住脸和手部动作。`, '先确认遮挡物不会挡住任一人物，再等待两人经过。', '前景、两位人物、背景分成三层，人物主体仍清楚。'],
        ['并肩停留的双人肖像', '全身', '50mm', '平视', `${subject}并肩停留，先保持自然站姿，再各自调整朝向，拍下不完全对称的状态。`, '给出“停下、放松、稍微转向场景”的简短口令，避免复杂摆姿。', '人物占画面比例接近，肩线不必完全平行，脚下留足空间。'],
        ['关系细节补充', '近景', '85mm', '平视', `${subject}继续自然交谈，只在现场确有手势或动作时记录细节，不预设牵手或道具。`, '观察两人的手势与神情，先确认细节有叙事意义再拍。', '可以只取局部，但避免把无关动作误读成关系表达。'],
        ['从人物身后看向场景', '中景', '50mm', '肩后', `${subject}从背侧共同看向前方环境，保留两人的肩部方向和空间纵深。`, '从两人身后侧方拍摄，确保场景主体仍可辨认。', '人物作为前景框架，画面重点仍落在共同注视的环境。'],
        ['环境中的背影收束', '环境全景', '35mm', '平视', `${subject}一起沿场景纵深离开，保留自然步距，以环境和关系为结尾。`, '固定机位拍摄完整离场过程，不追赶人物。', '人物保持可辨但不必占满画面，让环境完成收束。'],
        ['空间关系回看', '环境远景', '24mm', '高机位', `${subject}在场景中短暂停留，形成一张能看清环境、动线和人物距离的远景。`, '只有在安全且可达的位置使用高机位，先检查边缘变形。', '人物放在画面下方或侧边，保留主要环境结构。'],
        ['自然交流近景', '近景', '85mm', '平视', `${subject}分别倾听与回应，捕捉真实表情变化，不要求同时直视镜头。`, '在两人之间保持舒适沟通距离，等待表情而非连续指导。', '通过前后焦点变化表现交流，至少各保留一张清晰面部。'],
        ['结束前的共同回望', '中全景', '50mm', '平视', `${subject}结束动作后一起回看拍摄场景，留一张松弛、不刻意对称的合影。`, '先让两人自然站定，再只补一张轻提示版本作为备选。', '让两人都完整进入画面，边缘留有后期裁切余量。']
    ];
    const patterns = peopleCount > 1 ? pairPatterns : soloPatterns;
    const shotList = patterns.slice(0, count).map(([title, shotSize, focalLength, angle, description, method, composition], index) => ({
        id: `${requestId}-${index}`, title, scene, description,
        shotSize, focalLength, angle, method: method || '按现场空间微调站位，先保证安全和人物舒适。',
        composition: composition || '人物与场景关系优先，不强制居中。', lighting: '以现场主光为准，必要时用反光板轻补。',
        lightingSetup: '现场光 / 轻补光', mood, duration: 0, priority: '待人工确认',
        props: '以实际场地和已有资源为准', alternative: '如现场不适用，跳过该镜头并保留相邻镜头。',
        notes: `游客草稿：拍摄前确认场地、人物状态与光线。${input.extra ? ` 限制：${input.extra}` : ''}`,
        directorContract: { source: 'guest-rule-draft', ...sceneScale }
    }));
    return {
        title: buildPlanTitle(input), input, savedAt: new Date().toISOString(), style: input.style || '',
        images: [], coverImage: null, shotList, references: [],
        sections: shotList.map((shot, index) => ({ ti: `镜头 ${index + 1} · ${shot.title}`, ic: '', c: [
            `人物怎么做：${shot.description}`, `摄影师怎么拍：${shot.method}`,
            `景别与焦段：${shot.shotSize} · ${shot.focalLength}`, `光线：${shot.lighting}`
        ] })),
        director: {
            requestId, source: 'guest-rule-draft', submittedBrief: values.filter(Boolean).join('；'), desiredShotCount: count,
            shotCountLimited: false, reviewRequired: true, imageGenerationConnected: false,
            imageGenerationMode: 'unavailable-in-guest-draft', generationCandidates: [], sceneScale
        }
    };
}

function buildPlanTitle(input = {}) {
    const theme = String(input.theme || '').trim();
    if (theme) return theme;
    const scene = String(input.scene || '').trim();
    const style = String(input.style || '').trim();
    const mood = String(input.mood || '').trim();
    if (scene) return `${scene.slice(0, 22)}${style ? `·${style.slice(0, 10)}` : ''}拍摄方案`;
    if (style) return `${style.slice(0, 18)}拍摄方案`;
    if (mood) return `${mood.slice(0, 18)}人像方案`;
    return '自然人像方案';
}

function classifySceneScale(text) {
    if (/(近景|特写|面部|肩部|浅景深|背景.*虚化)/.test(text)) return { label: 'close', shotSize: '近景（CU/MCU）', subjectScale: '脸部占画面88–92%（目标90%）', occupancyContract: 'face_coverage_88_92', focusPlane: '眼睛与皮肤纹理清晰、背景强虚化', depthLayers: ['逆光轮廓层', '脸部与面部阴影层', '柔化背景层'] };
    if (/(超远景|大远景|远景(人物|人像|模特)|全身(人物|人像|模特)|完整人物|保留空间)/.test(text)) return { label: 'long', shotSize: '远景（FS/LS/ELS）', subjectScale: '人物占画面10–20%（目标15%）', occupancyContract: 'subject_coverage_10_20', focusPlane: '空间关系清晰、人物保持可辨轮廓', depthLayers: ['前景', '小比例人物与接触阴影', '远景背景与空气透视'] };
    if (/(中景(人物|人像|模特)|膝上|腰部|环境人像)/.test(text)) return { label: 'medium', shotSize: '中景（MS/MLS）', subjectScale: '人物占画面38–60%', occupancyContract: 'subject_coverage_38_60', focusPlane: '人物与近处环境清晰', depthLayers: ['前景', '人物主体与面部阴影', '环境背景'] };
    return { label: 'unspecified', shotSize: '景别待确认', subjectScale: '待确认', focusPlane: '待确认', depthLayers: [] };
}

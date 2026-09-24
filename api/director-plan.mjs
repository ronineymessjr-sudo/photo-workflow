// Shared by the local bridge and the authenticated Worker route.
export async function createDirectorPlan(input, { baseUrl, fetchImpl = fetch } = {}) {
    if (!baseUrl) throw new Error('DIRECTOR_NOT_CONFIGURED');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_BRIEF');
    const fields = ['theme', 'style', 'modelDesc', 'scene', 'mood', 'duration', 'people', 'extra'];
    const labels = ['主题', '风格', '模特描述', '场景', '情绪', '时长', '人数', '用户补充及限制'];
    const brief = fields.map((key, i) => {
        if (input[key] != null && typeof input[key] !== 'string') throw new Error('INVALID_BRIEF');
        return input[key] ? `${labels[i]}：${input[key]}` : '';
    }).filter(Boolean).join('\n');
    if ((!input.theme && !input.modelDesc) || brief.length > 2000) throw new Error('INVALID_BRIEF');
    const requestId = `workflow-${crypto.randomUUID()}`;
    const desiredShotCount = resolveShotCount(input);
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/v1/photoatelier/shoot-plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, brief, output_count: desiredShotCount }),
        signal: AbortSignal.timeout(60000),
    });
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
    const sceneScale = classifySceneScale(`${input.theme || ''}\n${input.extra || ''}`);
    const shotList = executionShots.slice(0, desiredShotCount).map((shot, index) => ({
        id: `${requestId}-${index}`, scene: input.scene || '场地待确认',
        description: text(shot.model_pose), shotSize: ({ECU:'局部特写',CU:'特写',MCU:'近景',MS:'中景',MFS:'中全景',FS:'全身',WS:'环境全景',EWS:'环境远景'})[shot.shot_size] || text(shot.framing) || sceneScale.shotSize,
        title: text(shot.framing) || text(shot.model_pose),
        sourceShotIndex: shot.sourceIndex,
        method: text(shot.photographer_position), focalLength: text(shot.lens),
        composition: text(shot.model_position), lighting: text(shot.lighting_setup),
        props: '以实际场地和已有资源为准', angle: ({eye_level:'平视',high_angle:'俯拍',ground_level:'贴地低机位',overhead:'正上方俯拍',low_angle:'仰拍'})[shot.camera_angle] || text(shot.camera_angle),
        mood: input.mood || '待确认', duration: 0,
        notes: `裁切：${text(shot.crop_boundary)}；必须呈现：${text(shot.must_show)}；拒绝：${text(shot.reject_if)}`,
        lightingSetup: text(shot.lighting_setup), priority: '待人工确认',
        alternative: text(shot.execution_note), camera: {},
        // Scene-scale hints describe the overall request and may contain
        // multiple requested shot types. They must not overwrite this
        // specific shot's framing contract.
        directorContract: { ...shot },
    }));
    return {
        title: input.theme || '摄影方案', input, savedAt: new Date().toISOString(),
        style: input.style || '', images: [], shotList,
        references: Array.isArray(result.references) ? result.references : [],
        sections: shotList.map((shot, i) => ({ ti: `镜头 ${i + 1} · ${shot.title}`, ic: '', c: [
            `人物怎么做：${shot.description}`, `摄影师站哪里：${shot.method}`,
            `人物放在哪里：${shot.composition}`, `景别与焦段：${shot.shotSize} · ${shot.focalLength}`,
            `光线怎么用：${shot.lighting}`, `画面要求：${shot.notes}`,
        ] })),
        director: { requestId, source: 'director-shoot-plan', submittedBrief: brief, desiredShotCount,
            shotCountLimited: shotList.length < desiredShotCount,
            reviewRequired: true, imageGenerationConnected: true,
            imageGenerationMode: 'external-provider-candidate-review', generationCandidates: [], sceneScale },
    };
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
    if ((!values[0] && !values[2]) || values.join('').length > 2000) throw new Error('INVALID_BRIEF');

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
        title: input.theme || '摄影方案', input, savedAt: new Date().toISOString(), style: input.style || '',
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

function classifySceneScale(text) {
    if (/(近景|特写|面部|肩部|浅景深|背景.*虚化)/.test(text)) return { label: 'close', shotSize: '近景（CU/MCU）', subjectScale: '脸部占画面88–92%（目标90%）', occupancyContract: 'face_coverage_88_92', focusPlane: '眼睛与皮肤纹理清晰、背景强虚化', depthLayers: ['逆光轮廓层', '脸部与面部阴影层', '柔化背景层'] };
    if (/(超远景|大远景|远景(人物|人像|模特)|全身(人物|人像|模特)|完整人物|保留空间)/.test(text)) return { label: 'long', shotSize: '远景（FS/LS/ELS）', subjectScale: '人物占画面10–20%（目标15%）', occupancyContract: 'subject_coverage_10_20', focusPlane: '空间关系清晰、人物保持可辨轮廓', depthLayers: ['前景', '小比例人物与接触阴影', '远景背景与空气透视'] };
    if (/(中景(人物|人像|模特)|膝上|腰部|环境人像)/.test(text)) return { label: 'medium', shotSize: '中景（MS/MLS）', subjectScale: '人物占画面38–60%', occupancyContract: 'subject_coverage_38_60', focusPlane: '人物与近处环境清晰', depthLayers: ['前景', '人物主体与面部阴影', '环境背景'] };
    return { label: 'unspecified', shotSize: '景别待确认', subjectScale: '待确认', focusPlane: '待确认', depthLayers: [] };
}

// Continuity contract for a single shoot: locked bible + role-separated
// references + master-frame gate + per-shot requests + QC verdicts.
//
// Stateless by design: the client carries the contract on every call, the server
// only validates and derives. That makes "fail closed" checkable instead of
// trusting a stored flag, and it keeps the Worker free of session state.
//
// Explicitly out of scope: promising pixel-identical faces from text prompts.
// What we enforce is that every request carries the same locked fields and the
// same three reference roles, that missing references stop generation, and that
// every image must pass a QC verdict before it counts.

import { createHash } from 'node:crypto';

export const CONTINUITY_ROLES = ['identity', 'scene', 'style'];

export const CONTINUITY_PROVIDERS = {
    'gpt-image-2': {
        label: 'GPT Image 2 / 2.5',
        supportsReferences: true,
        roles: CONTINUITY_ROLES,
        maxReferences: 16,
        supportsSeed: false,
        canGenerate: true,
    },
    'flux-kontext': {
        label: 'Flux Kontext / nano-banana',
        supportsReferences: true,
        roles: CONTINUITY_ROLES,
        maxReferences: 4,
        supportsSeed: true,
        canGenerate: true,
    },
    'sdxl-ipadapter': {
        label: 'SDXL + IP-Adapter FaceID（本地）',
        supportsReferences: true,
        roles: CONTINUITY_ROLES,
        maxReferences: 3,
        supportsSeed: true,
        canGenerate: true,
    },
    'deepseek-vision': {
        label: 'DeepSeek 视觉（理解/审查）',
        supportsReferences: false,
        roles: [],
        maxReferences: 0,
        supportsSeed: false,
        canGenerate: false,
        canPlan: true,
        canReview: true,
    },
};

export const QC_ITEMS = [
    { id: 'identity', label: '人物身份是否漂移', humanRequired: true },
    { id: 'wardrobe', label: '服装是否改变', humanRequired: false },
    { id: 'place-weather', label: '地点与天气是否一致', humanRequired: false },
    { id: 'shot-spec', label: '景别/角度/焦段是否实现', humanRequired: false },
    { id: 'anatomy', label: '人数与肢体是否正常', humanRequired: true },
    { id: 'face-sharp', label: '面部是否清晰无畸变', humanRequired: false },
    { id: 'style-match', label: '构图与风格是否贴近风格参考', humanRequired: true },
];

export class ContinuityError extends Error {
    constructor(code, message, status = 409) {
        super(message);
        this.name = 'ContinuityError';
        this.code = code;
        this.status = status;
    }
}

const SIZE_TYPE = {
    ECU: 'detail-extreme-close-up', CU: 'close-up', MCU: 'medium-close-up', MS: 'medium',
    MFS: 'medium-full', FS: 'full-body', WS: 'environmental-wide', EWS: 'establishing-extreme-wide',
};

export function hashLocked(locked) {
    return createHash('sha1').update(JSON.stringify(locked)).digest('hex').slice(0, 12);
}

function text(value, fallback = '') {
    return typeof value === 'string' ? value.trim() : fallback;
}

// The locked block may only be filled from the original brief. Later steps read
// it; nothing else writes it.
export function buildLocked(input = {}, hints = {}) {
    const scene = text(input.scene);
    const extra = text(input.extra);
    const mood = text(input.mood);
    const timeOfDay = hints.timeOfDay
        || (/蓝调|黄昏|日落|傍晚/.test(`${scene} ${extra} ${mood}`) ? '黄昏/蓝调窗口'
            : /夜|霓虹|午夜|车流/.test(`${scene} ${extra} ${mood}`) ? '夜间'
                : /午后|下午/.test(`${scene} ${extra}`) ? '午后'
                    : /清晨|日出|早晨/.test(`${scene} ${extra}`) ? '清晨' : '白天');
    const weather = hints.weather
        || (/(雨|雪|雾|阴天|晴)/.exec(`${scene} ${extra}`) || [])[0]
        || '阴天（散射光，无直射硬光）';
    return {
        subject: hints.subject || `${text(input.modelDesc, '一名成年人')}（同一人物，外观以身份参考图为准）`,
        wardrobe: hints.wardrobe || text(input.wardrobeNote, '开拍前确认一套，全系列不换'),
        location: scene,
        season: hints.season || (/春|花田|油菜花/.test(`${scene} ${extra}`) ? '春' : /雪|冬/.test(`${scene} ${extra}`) ? '冬' : /夏|泳池/.test(`${scene} ${extra}`) ? '夏' : '不限定'),
        weather,
        timeOfDay,
        light: hints.light || text(input.light, '按现场可用光'),
        colorGrade: hints.colorGrade || text(input.style, '按题材统一调色'),
        styleProfile: hints.styleProfile || `从用户选定的风格参考提取：${text(input.style, '按题材')}`,
        mustKeep: ['同一人物', '同一服装', '同一地点', '同一天气', '同一光线方向', '同一调色'],
        mustAvoid: Array.isArray(hints.mustAvoid) ? hints.mustAvoid : [],
    };
}

export function createGroup({ input = {}, lockedHints = {}, shots = [] } = {}) {
    if (!text(input.theme) && !text(input.scene)) {
        throw new ContinuityError('CONTINUITY_INPUT_REQUIRED', '需要主题或场地才能建立连续性分组', 400);
    }
    const locked = buildLocked(input, lockedHints);
    const groupId = `${text(input.theme) || text(input.scene)}-${Date.now().toString(36)}`;
    return {
        continuityGroupId: groupId,
        locked,
        lockedHash: hashLocked(locked),
        references: CONTINUITY_ROLES.map(role => ({
            assetId: `${groupId}-${role}`,
            role,
            status: 'pending',
            note: role === 'identity' ? '只负责脸/发型/体态'
                : role === 'scene' ? '只负责地点结构与空间关系'
                    : '只负责构图/光线/色彩/颗粒，必须来自用户图库',
        })),
        master: { confirmedBy: 'none' },
        shots: normalizeShots(shots),
        qc: {},
        history: [],
    };
}

export function normalizeShots(shots = []) {
    return shots.map((shot, index) => ({
        shotId: text(shot.shotId, `shot-${String(index + 1).padStart(2, '0')}`),
        shotType: text(shot.shotType, SIZE_TYPE[shot.size] || text(shot.size, 'medium')),
        camera: text(shot.camera, [text(shot.camera_angle), text(shot.lens)].filter(Boolean).join('，')),
        lens: text(shot.lens),
        distance: text(shot.distance),
        action: text(shot.model_pose),
        subjectPlacement: text(shot.model_position),
        mustKeep: Array.isArray(shot.mustKeep) ? shot.mustKeep : ['同一人物', '同一服装', '同一地点', '同一天气'],
        prompt: text(shot.prompt || shot.generator_prompt),
        size: text(shot.size || shot.shot_size),
        aspect: text(shot.aspect, '2:3'),
        props: text(shot.shot_props || shot.props),
        file: text(shot.file, `${text(shot.shotId, `shot-${String(index + 1).padStart(2, '0')}`)}.png`),
    }));
}

function requireGroup(group) {
    if (!group || typeof group !== 'object' || !group.locked || !Array.isArray(group.shots)) {
        throw new ContinuityError('CONTINUITY_GROUP_REQUIRED', '缺少连续性分组对象', 400);
    }
    const current = hashLocked(group.locked);
    if (group.lockedHash && group.lockedHash !== current) {
        throw new ContinuityError('CONTINUITY_LOCKED_TAMPERED', '锁定字段被改写：镜头层不允许改场景或服装', 409);
    }
    if (!group.lockedHash) group.lockedHash = current;
    return { group, lockedHash: current };
}

export function setReference(group, { role, assetId, status = 'confirmed', path = '' } = {}) {
    const { group: checked } = requireGroup(group);
    if (!CONTINUITY_ROLES.includes(role)) throw new ContinuityError('CONTINUITY_ROLE_INVALID', `参考角色只能是 ${CONTINUITY_ROLES.join('/')}`, 400);
    if (!text(assetId)) throw new ContinuityError('CONTINUITY_ASSET_REQUIRED', '需要资产 ID', 400);
    if (!['pending', 'confirmed', 'missing'].includes(status)) throw new ContinuityError('CONTINUITY_STATUS_INVALID', '状态只能是 pending/confirmed/missing', 400);
    checked.references = checked.references.map(reference => reference.role === role
        ? { ...reference, assetId, status, path: text(path) }
        : reference);
    return checked;
}

// The master frame is the continuity anchor: without a human confirming one,
// running eight more shots only multiplies whatever is already wrong.
export function confirmMaster(group, { assetId, actor = 'human' } = {}) {
    const { group: checked } = requireGroup(group);
    if (actor !== 'human') throw new ContinuityError('CONTINUITY_MASTER_HUMAN_ONLY', '主参考图只能由人工确认', 403);
    const identity = checked.references.find(reference => reference.role === 'identity');
    if (!identity || identity.status !== 'confirmed') {
        throw new ContinuityError('CONTINUITY_IDENTITY_REQUIRED', '先确认人物参考图，才能设主参考图', 409);
    }
    checked.master = { confirmedBy: 'human', assetId: text(assetId, identity.assetId), confirmedAt: new Date().toISOString() };
    return checked;
}

export function assertReadyToGenerate(group, providerId) {
    const { group: checked, lockedHash } = requireGroup(group);
    const provider = CONTINUITY_PROVIDERS[providerId];
    if (!provider) throw new ContinuityError('CONTINUITY_PROVIDER_UNKNOWN', `未登记的图像服务：${providerId}`, 400);
    if (!provider.canGenerate || !provider.supportsReferences) {
        throw new ContinuityError('CONTINUITY_PROVIDER_TEXT_ONLY', `当前模型不支持参考图一致性：${providerId}（只接受文字提示词，不能用于连续组图）`, 422);
    }
    const roles = new Set(checked.references.map(reference => reference.role));
    const missingRoles = provider.roles.filter(role => !roles.has(role));
    if (missingRoles.length) throw new ContinuityError('CONTINUITY_ROLE_MISSING', `缺少参考角色：${missingRoles.join('、')}`, 409);
    const unconfirmed = checked.references.filter(reference => reference.status !== 'confirmed');
    if (unconfirmed.length) throw new ContinuityError('CONTINUITY_REFERENCE_UNCONFIRMED', `参考图未确认：${unconfirmed.map(reference => reference.role).join('、')}`, 409);
    if (checked.references.length > provider.maxReferences) throw new ContinuityError('CONTINUITY_TOO_MANY_REFERENCES', `参考图超过上限 ${provider.maxReferences}`, 409);
    if (checked.master?.confirmedBy !== 'human') throw new ContinuityError('CONTINUITY_MASTER_UNCONFIRMED', '主参考图未经人工确认', 409);
    return { group: checked, provider, lockedHash };
}

// One request per shot. Never "one prompt, count=9": each shot carries the same
// locked block and the same references, and varies only the framing fields.
export function buildShotRequests(group, { providerId, shotIds = [], seedBase = 428193 } = {}) {
    const { group: checked, provider, lockedHash } = assertReadyToGenerate(group, providerId);
    const selected = shotIds.length
        ? checked.shots.filter(shot => shotIds.includes(shot.shotId))
        : checked.shots;
    if (!selected.length) throw new ContinuityError('CONTINUITY_SHOTS_EMPTY', '没有可生成的镜头', 400);
    const seedIndex = Number(String(checked.continuityGroupId).replace(/\D/g, '').slice(-3)) || 1;
    const references = checked.references.map(reference => ({ assetId: reference.assetId, role: reference.role, status: reference.status }));
    return selected.map((shot, index) => ({
        shotId: shot.shotId,
        provider: providerId,
        modelSupportsSeed: provider.supportsSeed,
        seed: seedBase + seedIndex * 100 + index,
        prompt: shot.prompt,
        size: shot.size,
        aspect: shot.aspect,
        references,
        // Only these may differ between shots of one group.
        variant: {
            shotType: shot.shotType, camera: shot.camera, lens: shot.lens,
            distance: shot.distance, action: shot.action, subjectPlacement: shot.subjectPlacement,
        },
        locked: {
            subject: checked.locked.subject, wardrobe: checked.locked.wardrobe,
            location: checked.locked.location, weather: checked.locked.weather,
            timeOfDay: checked.locked.timeOfDay, styleProfile: checked.locked.styleProfile,
        },
        lockedHash,
    }));
}

export function judgeQc(scores = {}, { humanConfirmed = false, reviewer = 'none' } = {}) {
    const failed = [];
    const unknown = [];
    for (const item of QC_ITEMS) {
        const score = scores[item.id];
        if (score === 'fail') failed.push(item.id);
        else if (score !== 'pass') unknown.push(item.id);
    }
    const humanRequired = QC_ITEMS.filter(item => item.humanRequired).map(item => item.id);
    const humanPending = humanRequired.some(id => scores[id] !== 'pass') || humanConfirmed !== true;
    const verdict = failed.length ? 'retry' : (unknown.length || humanPending ? 'needs-human' : 'pass');
    return { verdict, failed, unknown, humanRequired, reviewer, retryScope: verdict === 'retry' ? 'single-shot' : 'none' };
}

// Manual hand-off: the image is produced elsewhere (ChatGPT web, another tool)
// and comes back as bytes. We store it, attach it to the shot and keep the same
// QC path — the contract does not care who pressed the button.
export function attachResult(group, { shotId, assetId, path = '', provider = 'manual', seed = null } = {}) {
    const { group: checked, lockedHash } = requireGroup(group);
    if (!text(shotId)) throw new ContinuityError('CONTINUITY_SHOT_REQUIRED', '需要镜头 ID', 400);
    if (!text(assetId)) throw new ContinuityError('CONTINUITY_ASSET_REQUIRED', '需要资产 ID', 400);
    if (!checked.shots.some(shot => shot.shotId === shotId)) {
        throw new ContinuityError('CONTINUITY_SHOT_UNKNOWN', `没有这个镜头：${shotId}`, 404);
    }
    checked.results = {
        ...(checked.results || {}),
        [shotId]: {
            shotId, assetId, path, provider, seed, lockedHash,
            attachedAt: new Date().toISOString(),
            qc: checked.qc?.[shotId]?.verdict || 'pending',
        },
    };
    return checked;
}

export function handoffFor(group, { shotId = '' } = {}) {
    const { group: checked, lockedHash } = requireGroup(group);
    const shots = shotId ? checked.shots.filter(shot => shot.shotId === shotId) : checked.shots;
    if (!shots.length) throw new ContinuityError('CONTINUITY_SHOT_UNKNOWN', `没有这个镜头：${shotId}`, 404);
    const references = checked.references.map(reference => ({
        role: reference.role,
        assetId: reference.assetId,
        path: reference.path || '',
        status: reference.status,
    }));
    const missing = references.filter(reference => reference.status !== 'confirmed' || !reference.path);
    return {
        continuityGroupId: checked.continuityGroupId,
        lockedHash,
        masterConfirmed: checked.master?.confirmedBy === 'human',
        references,
        ready: missing.length === 0 && checked.master?.confirmedBy === 'human',
        blockedReason: missing.length
            ? `参考图未就绪：${missing.map(reference => reference.role).join('、')}`
            : checked.master?.confirmedBy === 'human' ? '' : '主参考图未人工确认',
        cards: shots.map(shot => ({
            shotId: shot.shotId,
            file: shot.file || `${shot.shotId}.png`,
            size: shot.size,
            lens: shot.lens,
            camera: shot.camera,
            // Everything a person needs to paste into a chat UI, in one place.
            prompt: shot.prompt,
            referencePaths: references.map(reference => reference.path).filter(Boolean),
            instruction: `把 ${references.length} 张参考图拖进对话框，粘贴上面的提示词，出图后保存为 ${shot.file}，再回传到本面板。`,
        })),
    };
}

export function recordQc(group, { shotId, scores, humanConfirmed = false, reviewer = 'human' } = {}) {
    const { group: checked, lockedHash } = requireGroup(group);
    if (!text(shotId)) throw new ContinuityError('CONTINUITY_SHOT_REQUIRED', '需要镜头 ID', 400);
    const shot = checked.shots.find(item => item.shotId === shotId);
    if (!shot) throw new ContinuityError('CONTINUITY_SHOT_UNKNOWN', `没有这个镜头：${shotId}`, 404);
    const result = judgeQc(scores, { humanConfirmed, reviewer });
    checked.qc = { ...(checked.qc || {}), [shotId]: { ...result, at: new Date().toISOString(), lockedHash } };
    return { group: checked, result };
}

export function continuitySummary(group) {
    const { group: checked, lockedHash } = requireGroup({ ...group, lockedHash: undefined });
    const references = checked.references.reduce((acc, reference) => ({ ...acc, [reference.role]: reference.status }), {});
    const qcValues = Object.values(checked.qc || {});
    const blocked = !CONTINUITY_ROLES.every(role => references[role] === 'confirmed') || checked.master?.confirmedBy !== 'human';
    return {
        continuityGroupId: checked.continuityGroupId,
        lockedHash,
        references,
        masterConfirmed: checked.master?.confirmedBy === 'human',
        shots: checked.shots.length,
        qc: {
            passed: qcValues.filter(item => item.verdict === 'pass').length,
            retry: qcValues.filter(item => item.verdict === 'retry').map(item => item.qcShotId || '').filter(Boolean).length,
            needsHuman: qcValues.filter(item => item.verdict === 'needs-human').length,
        },
        readyToGenerate: !blocked,
        blockedReason: blocked
            ? (!CONTINUITY_ROLES.every(role => references[role] === 'confirmed')
                ? `参考图未确认：${CONTINUITY_ROLES.filter(role => references[role] !== 'confirmed').join('、')}`
                : '主参考图未经人工确认')
            : '',
    };
}

export function continuitySchema() {
    return {
        roles: CONTINUITY_ROLES,
        providers: CONTINUITY_PROVIDERS,
        qcItems: QC_ITEMS,
        rules: [
            '锁定字段只能来自原始需求，镜头层不得改写',
            '参考图分 identity/scene/style 三档，缺一不可',
            '主参考图必须人工确认后才允许批量生成',
            '每个镜头单独请求，不存在“一条提示词出九张”',
            '不支持参考图的模型一律拒绝生成，不做纯文字降级',
            '每张图必须过质检，未过只重做该镜',
        ],
    };
}

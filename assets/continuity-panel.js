// Continuity panel: three reference slots, master-frame confirmation, per-shot
// requests and the QC gate. Deliberately no "generate 9 images" button — one
// request per shot is the whole point.
//
// State lives in localStorage (the contract is a document, not a session).

const STORAGE_KEY = 'photoatelier.continuity.v1';
const ROLES = [
    { role: 'identity', label: '人物参考', hint: '只负责脸、发型、体态' },
    { role: 'scene', label: '场景参考', hint: '默认使用方案里的场地描述；也可以上传现场照片' },
    { role: 'style', label: '衣装参考', hint: '只负责衣服、材质与配色；优先使用方案选定的服装库条目' },
];
const QC_LABELS = {
    identity: '人物身份一致', wardrobe: '服装未改变', 'place-weather': '地点与天气一致',
    'shot-spec': '景别/角度/焦段实现', anatomy: '人数与肢体正常', 'face-sharp': '面部清晰无畸变',
    'style-match': '风格贴近参考',
};

let state = load();
let schema = null;

function safeThumbUrl(raw) {
    if (typeof raw !== 'string' || !raw) return '';
    try {
        const url = new URL(raw, location.origin);
        if (url.origin === location.origin
            && /^\/api\/continuity\/asset\/[a-f0-9]{16}$/.test(url.pathname)
            && !url.search && !url.hash) return url.href;
        if (url.origin === 'https://hruiccc.github.io'
            && /^\/RuiC-PoseAtlas\/(?:thumbs\/[A-Za-z0-9_-]+\.jpg|(?:costume|portrait)\/thumbs\/[A-Za-z0-9_-]+\.webp)$/.test(url.pathname)
            && !url.search && !url.hash) return url.href;
    } catch { }
    return '';
}

function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { }
}
function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
}
async function api(path, body, method = 'POST') {
    const token = localStorage.getItem('pw_token');
    const response = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, payload };
}

function toast(message, kind = 'info') {
    const box = document.getElementById('toast');
    box.textContent = message;
    box.dataset.kind = kind;
    box.hidden = false;
    clearTimeout(box._timer);
    box._timer = setTimeout(() => { box.hidden = true; }, 6000);
}

// ---- group lifecycle -------------------------------------------------------

async function createNewGroup() {
    const input = {
        theme: document.getElementById('f-theme').value.trim(),
        scene: document.getElementById('f-scene').value.trim(),
        modelDesc: document.getElementById('f-person').value.trim(),
        wardrobeNote: document.getElementById('f-wardrobe').value.trim(),
        style: document.getElementById('f-style').value.trim(),
        extra: document.getElementById('f-extra').value.trim(),
        duration: '1小时', people: '1',
    };
    let shots = [];
    const raw = document.getElementById('f-shots').value.trim();
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            shots = Array.isArray(parsed) ? parsed : parsed.shots || parsed.shot_plans || [];
        } catch {
            toast('镜头 JSON 解析失败：需要数组或 {shot_plans:[…]}', 'error');
            return;
        }
    }
    const { ok, payload } = await api('/api/continuity/init', { input, shots });
    if (!ok) { toast(payload.error || '初始化失败', 'error'); return; }
    state.group = payload.group;
    state.qc = {};
    save();
    render();
    toast('已建立连续性分组，三张参考图待确认', 'ok');
}

function importGroup(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(String(reader.result));
            state.group = parsed.group || parsed;
            state.qc = parsed.qc || {};
            save();
            render();
            toast('已导入分组契约', 'ok');
        } catch { toast('契约 JSON 解析失败', 'error'); }
    };
    reader.readAsText(file);
}

// ---- references ------------------------------------------------------------

function renderReferences() {
    const host = document.getElementById('refs');
    host.replaceChildren();
    if (!state.group) { host.append(el('p', { class: 'muted', text: '先建立或导入一个分组。' })); return; }
    for (const definition of ROLES) {
        const reference = state.group.references.find(item => item.role === definition.role) || {};
        const status = reference.status || 'pending';
        const badge = status === 'confirmed' ? '已确认' : status === 'missing' ? '缺失' : '待确认';
        const thumb = safeThumbUrl((state.thumbs || {})[definition.role])
            || safeThumbUrl(reference.referenceImageUrl);
        host.append(el('div', { class: 'ref-card' }, [
            el('div', { class: 'ref-head' }, [
                el('strong', { text: definition.label }),
                el('span', { class: `badge ${status}`, text: badge }),
            ]),
            el('p', { class: 'muted', text: definition.hint }),
            thumb ? el('img', { src: thumb, class: 'thumb', alt: definition.label, loading: 'lazy' })
                : el('div', { class: 'thumb empty', text: reference.textOnly ? '按方案文字锁定' : '未选图' }),
            reference.note ? el('p', { class: 'muted small', text: reference.note }) : null,
            el('div', { class: 'ref-actions' }, [
                el('input', {
                    type: 'file', accept: 'image/jpeg,image/png,image/webp',
                    onchange: async event => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(String(reader.result));
                            reader.readAsDataURL(file);
                        });
                        await uploadReference(definition.role, dataUrl, file.name);
                    },
                }),
                el('button', {
                    class: 'ghost', text: '标记已确认',
                    onclick: () => updateReference(definition.role, reference.assetId || `${definition.role}-asset`, 'confirmed'),
                }),
                el('button', {
                    class: 'ghost', text: '标记缺失',
                    onclick: () => updateReference(definition.role, reference.assetId || `${definition.role}-asset`, 'missing'),
                }),
            ]),
        ]));
    }
}

// Upload first, confirm second: a reference only counts once the bytes are
// actually stored, so the contract never points at a filename that does not
// exist on the server.
async function uploadReference(role, dataUrl, fileName) {
    const { ok, status, payload } = await api('/api/continuity/asset', { dataUrl, role });
    if (!ok) { toast(`${status} ${payload.code || ''} ${payload.error || '上传失败'}`, 'error'); return; }
    if (payload.durable === false) toast('注意：当前存储是临时的，重启后参考图会丢失', 'warn');
    state.thumbs = { ...(state.thumbs || {}), [role]: payload.path };
    const updated = await api('/api/continuity/reference', {
        group: state.group,
        reference: { role, assetId: payload.assetId, status: 'confirmed', path: payload.path },
    });
    if (!updated.ok) { toast(updated.payload.error || '写入契约失败', 'error'); return; }
    state.group = updated.payload.group;
    state.assets = { ...(state.assets || {}), [role]: { ...payload, fileName } };
    save();
    render();
    toast(`${ROLES.find(item => item.role === role).label}已入库：${payload.assetId}（${Math.round(payload.bytes / 1024)}KB）`, 'ok');
}

async function updateReference(role, assetId, status) {
    const { ok, payload } = await api('/api/continuity/reference', { group: state.group, reference: { role, assetId, status } });
    if (!ok) { toast(payload.error || '更新失败', 'error'); return; }
    state.group = payload.group;
    save();
    render();
    toast(`${ROLES.find(item => item.role === role).label}：${status === 'confirmed' ? '已确认' : '标记缺失'}`, status === 'confirmed' ? 'ok' : 'warn');
}

async function confirmMaster() {
    const identity = state.group?.references.find(reference => reference.role === 'identity');
    const { ok, payload } = await api('/api/continuity/master', { group: state.group, assetId: identity?.assetId, actor: 'human' });
    if (!ok) { toast(`${payload.code || ''} ${payload.error || '主图确认失败'}`, 'error'); return; }
    state.group = payload.group;
    save();
    render();
    toast('主参考图已人工确认，允许逐镜生成', 'ok');
}

// ---- shots -----------------------------------------------------------------

function renderShots() {
    const host = document.getElementById('shots');
    host.replaceChildren();
    const shots = state.group?.shots || [];
    if (!shots.length) { host.append(el('p', { class: 'muted', text: '还没有镜头。把方案 JSON 粘进来建立分组。' })); return; }
    const table = el('table', {}, [
        el('thead', {}, el('tr', {}, [
            el('th', { text: '镜头' }), el('th', { text: '景别/机位/焦段' }),
            el('th', { text: '主体位置' }), el('th', { text: '状态' }), el('th', { text: '操作' }),
        ])),
    ]);
    const body = el('tbody');
    for (const shot of shots) {
        const verdict = state.qc?.[shot.shotId];
        const result = state.results?.[shot.shotId];
        const resultThumb = safeThumbUrl(result?.image?.path);
        const verdictText = !verdict ? '未质检'
            : verdict.verdict === 'pass' ? '通过'
                : verdict.verdict === 'retry' ? `重做（${verdict.failed.join('、')}）` : '待人工确认';
        body.append(el('tr', {}, [
            el('td', {}, [el('strong', { text: shot.shotId }), el('div', { class: 'muted small', text: shot.shotType })]),
            el('td', { text: `${shot.size} / ${shot.camera}` }),
            el('td', { text: shot.subjectPlacement || '—' }),
            el('td', {}, el('span', {
                class: `badge ${verdict?.verdict || 'pending'}`,
                text: verdictText,
            })),
            el('td', {}, [
                el('button', { text: '交接卡', onclick: () => openHandoff(shot.shotId) }),
                el('button', { class: 'ghost', text: '取请求', onclick: () => requestShot(shot.shotId) }),
                el('button', { class: 'ghost', text: '生成这张', onclick: () => generateShot(shot.shotId) }),
                el('button', { class: 'ghost', text: '质检', onclick: () => openQc(shot.shotId) }),
                resultThumb ? el('div', { class: 'row' }, [
                    el('img', { src: resultThumb, class: 'shot-thumb', alt: `${shot.shotId} 生成结果` }),
                    state.group?.anchor?.shotId === shot.shotId
                        ? el('span', { class: 'badge confirmed', text: '当前锚点' })
                        : el('button', { class: 'ghost', text: '人工确认此图并作为后续镜头锚点', onclick: () => setAnchor(shot.shotId) }),
                ]) : null,
            ]),
        ]));
    }
    table.append(body);
    host.append(table);
}

async function requestShot(shotId) {
    const providerId = document.getElementById('f-provider').value;
    const { ok, payload, status } = await api('/api/continuity/requests', { group: state.group, providerId, shotIds: [shotId] });
    const output = document.getElementById('request-output');
    if (!ok) {
        output.textContent = `${status} ${payload.code || ''}\n${payload.error || ''}`;
        toast(payload.error || '请求被拒绝', 'error');
        return;
    }
    const request = payload.requests[0];
    output.textContent = JSON.stringify(request, null, 2);
    toast(`${shotId} 请求已生成：seed ${request.seed}`, 'ok');
}

// One click = one shot. If the service is not configured the server answers 503
// with the exact missing env vars; we show that verbatim instead of inventing a
// placeholder image.
async function generateShot(shotId) {
    const providerId = document.getElementById('f-provider').value;
    const output = document.getElementById('request-output');
    output.textContent = `${shotId} 生成中…`;
    const { ok, status, payload } = await api('/api/continuity/generate', { group: state.group, shotId, providerId });
    if (!ok) {
        const missing = payload?.details?.missing?.join('、') || '';
        output.textContent = `${status} ${payload.code || ''}\n${payload.error || ''}${missing ? `\n缺少环境变量：${missing}` : ''}`;
        toast(`${payload.code || status}${missing ? '：缺 ' + missing : ''}`, 'error');
        return;
    }
    state.results = { ...(state.results || {}), [shotId]: payload };
    output.textContent = JSON.stringify(payload, null, 2);
    save();
    render();
    toast(`${shotId} 已生成：${payload.image.assetId}`, 'ok');
}

async function setAnchor(shotId) {
    const result = state.results?.[shotId];
    if (!result?.image?.assetId || !result?.image?.path) {
        toast('先生成并检查这一镜，再设置锚点。', 'error');
        return;
    }
    const { ok, payload } = await api('/api/continuity/anchor', {
        group: state.group, assetId: result.image.assetId, path: result.image.path, shotId,
    });
    if (!ok) { toast(payload.error || '设置锚点失败', 'error'); return; }
    state.group = payload.group;
    save();
    render();
    toast(`${shotId} 已设为后续镜头的身份锚点。`, 'ok');
}

async function prescreenShot(shotId) {
    const result = state.results?.[shotId];
    const scores = state.qc?.[shotId]?.scores || {};
    const { ok, payload } = await api('/api/continuity/prescreen', {
        group: state.group, shotId,
        imagePath: result?.image?.path || '',
        scores,
    });
    if (!ok) { toast(payload.error || '初筛失败', 'error'); return; }
    state.qc = { ...(state.qc || {}), [shotId]: { ...(state.qc?.[shotId] || {}), scores: payload.merged, vision: payload.summary } };
    save();
    openQc(shotId);
    toast(payload.summary, payload.available ? 'warn' : 'info');
}

// ---- qc --------------------------------------------------------------------

// Hand-off card: for people who generate in a chat UI instead of via API. One
// card holds the prompt, the three reference downloads and the target filename;
// the image comes back through "回传" and joins the same QC path.
async function openHandoff(shotId) {
    const panel = document.getElementById('handoff-panel');
    const { ok, payload } = await api('/api/continuity/handoff', { group: state.group, shotId });
    if (!ok) { toast(payload.error || '无法生成交接卡', 'error'); return; }
    const card = payload.cards[0];
    const result = state.results?.[shotId];

    const copyButton = el('button', {
        class: 'ghost', text: '复制提示词',
        onclick: async () => {
            try {
                await navigator.clipboard.writeText(card.prompt);
                toast('提示词已复制', 'ok');
            } catch {
                const area = document.createElement('textarea');
                area.value = card.prompt;
                document.body.append(area);
                area.select();
                document.execCommand('copy');
                area.remove();
                toast('提示词已复制', 'ok');
            }
        },
    });

    const referenceItems = Array.isArray(card.referenceImages)
        ? card.referenceImages
        : card.referencePaths.map((url, index) => ({ role: ['identity', 'scene', 'style'][index] || '', url }));
    const safeReferences = referenceItems.map(reference => ({
        ...reference,
        url: safeThumbUrl(reference.url),
    })).filter(reference => reference.url);
    const referenceLabels = { identity: '人物参考', scene: '场景参考', style: '衣装参考', pose: '姿势参考' };
    const refs = el('div', { class: 'refs' }, safeReferences.map((reference, index) => el('div', { class: 'ref-card' }, [
        el('div', { class: 'ref-head' }, [
            el('strong', { text: reference.role === 'pose' && reference.title
                ? `${referenceLabels.pose} · ${reference.title}`
                : referenceLabels[reference.role] || `参考 ${index + 1}` }),
        ]),
        el('img', { src: reference.url, class: 'thumb', alt: referenceLabels[reference.role] || '参考图' }),
        el('a', { href: reference.url, download: `ref-${index + 1}.png`, class: 'muted small', text: '打开/下载参考图', target: '_blank', rel: 'noopener' }),
    ])));

    const uploader = el('input', {
        type: 'file', accept: 'image/jpeg,image/png,image/webp',
        onchange: async event => {
            const file = event.target.files?.[0];
            if (!file) return;
            const dataUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.readAsDataURL(file);
            });
            const attached = await api('/api/continuity/attach', { group: state.group, shotId, dataUrl, provider: 'chatgpt-web' });
            if (!attached.ok) { toast(attached.payload.error || '回传失败', 'error'); return; }
            state.group = attached.payload.group;
            state.results = { ...(state.results || {}), [shotId]: { shotId, image: { assetId: attached.payload.asset.assetId, path: attached.payload.asset.path } } };
            save();
            render();
            openHandoff(shotId);
            toast(`${shotId} 已回传，等待质检`, 'ok');
        },
    });

    panel.replaceChildren(
        el('h3', { text: `交接卡 · ${card.shotId}　${card.size} / ${card.lens}` }),
        el('p', { class: 'muted', text: payload.ready ? card.instruction : `还没准备好：${payload.blockedReason}` }),
        el('label', {}, [el('span', { text: '提示词（粘贴到 ChatGPT）' }), el('textarea', { readonly: 'readonly', text: card.prompt })]),
        el('div', { class: 'row' }, [
            copyButton,
            el('span', { class: 'muted small', text: `目标文件名：${card.file}` }),
        ]),
        el('h3', { text: `图片参考（${safeReferences.length} 张；场景可按方案文字）`, style: 'margin-top:18px' }),
        refs,
        el('h3', { text: '出图后回传', style: 'margin-top:18px' }),
        uploader,
        safeThumbUrl(result?.image?.path) ? el('div', { class: 'row' }, [
            el('img', { src: safeThumbUrl(result.image.path), class: 'thumb', alt: '回传结果', style: 'max-width:220px' }),
        ]) : null,
        el('div', { class: 'row' }, [
            el('button', { class: 'ghost', text: '视觉初筛', onclick: () => prescreenShot(shotId) }),
            el('button', { class: 'ghost', text: '关闭', onclick: () => panel.replaceChildren() }),
        ]),
    );
}

function openQc(shotId) {
    const host = document.getElementById('qc-panel');
    const scores = { ...(state.qc?.[shotId]?.scores || {}) };
    host.replaceChildren(el('h3', { text: `质检 · ${shotId}` }));
    const grid = el('div', { class: 'qc-grid' });
    for (const [id, label] of Object.entries(QC_LABELS)) {
        const item = schema?.qcItems.find(entry => entry.id === id);
        const select = el('select', { onchange: event => { scores[id] = event.target.value; } }, [
            el('option', { value: 'unknown', text: '未判定' }),
            el('option', { value: 'pass', text: '通过' }),
            el('option', { value: 'fail', text: '不通过' }),
        ]);
        select.value = scores[id] || 'unknown';
        grid.append(el('label', {}, [
            el('span', { text: `${label}${item?.humanRequired ? '（需人工）' : ''}` }),
            select,
        ]));
    }
    const human = el('input', { type: 'checkbox', id: 'qc-human' });
    host.append(grid, el('label', { class: 'inline' }, [human, el('span', { text: '我已人工核对（关键项需人眼）' })]),
        el('div', { class: 'row' }, [
            el('button', { class: 'ghost', text: '视觉初筛', onclick: () => prescreenShot(shotId) }),
            el('button', {
                text: '提交质检',
                onclick: async () => {
                    const { ok, payload } = await api('/api/continuity/qc', {
                        group: state.group, shotId, scores,
                        humanConfirmed: human.checked, reviewer: 'human',
                    });
                    if (!ok) { toast(payload.error || '质检提交失败', 'error'); return; }
                    state.group = payload.group;
                    state.qc = { ...(state.qc || {}), [shotId]: { ...payload.result, scores } };
                    save();
                    render();
                    toast(`${shotId}：${payload.result.verdict === 'pass' ? '通过' : payload.result.verdict === 'retry' ? '需重做该镜' : '待人工确认'}`, payload.result.verdict === 'pass' ? 'ok' : 'warn');
                },
            }),
            el('button', { class: 'ghost', text: '关闭', onclick: () => host.replaceChildren() }),
        ]));
}

// ---- summary ---------------------------------------------------------------

function renderSummary() {
    const host = document.getElementById('summary');
    if (!state.group) { host.textContent = ''; return; }
    api('/api/continuity/summary', { group: state.group }).then(({ payload }) => {
        host.replaceChildren(
            el('div', { class: 'row' }, [
                el('span', { text: `锁定版本 ${payload.lockedHash || '—'}` }),
                el('span', { class: `badge ${payload.readyToGenerate ? 'confirmed' : 'pending'}`, text: payload.readyToGenerate ? '可以生成' : '被门禁拦住' }),
            ]),
            el('p', { class: 'muted', text: payload.blockedReason || `镜头 ${payload.shots} 个，已通过质检 ${payload.qc.passed} 个` }),
        );
    });
}

function render() {
    renderReferences();
    renderShots();
    renderSummary();
}

async function importStudioPlanFromQuery() {
    const params = new URLSearchParams(location.search);
    const planId = params.get('planId');
    if (!planId) return false;
    let plans;
    try { plans = JSON.parse(localStorage.getItem('pw_plans') || '[]'); } catch { plans = []; }
    const plan = Array.isArray(plans) ? plans.find(item => String(item.id) === planId) : null;
    if (!plan || !Array.isArray(plan.aiStudio?.references) || !Array.isArray(plan.shotList)) {
        toast('找不到带有参考库的本地摄影方案，请从方案页重新打开。', 'error');
        return false;
    }
    const references = plan.aiStudio.references;
    const templates = references.map(item => ({
        ...item,
        id: item.sourceItemId || item.id,
        sourceUrl: item.externalUrl || item.sourceUrl || '',
    }));
    const input = {
        ...(plan.input || {}),
        theme: plan.input?.theme || plan.title || '摄影方案',
        scene: plan.input?.scene || '',
        style: plan.input?.style || plan.aiStudio.guidance?.style || '',
    };
    const { ok, payload } = await api('/api/continuity/from-studio', {
        templates, input, planId: String(plan.id), planRevision: plan.revision || 0,
        selectedIds: templates.map(item => item.id), shots: plan.shotList,
        guidance: plan.aiStudio.guidance || {},
    });
    if (!ok) { toast(payload.error || '方案导入连续性工作台失败', 'error'); return false; }
    state.group = payload.group;
    state.qc = {};
    state.results = {};
    state.thumbs = Object.fromEntries((payload.group.references || [])
        .filter(reference => reference.referenceImageUrl)
        .map(reference => [reference.role, reference.referenceImageUrl]));
    save();
    history.replaceState(null, '', location.pathname);
    render();
    const shots = payload.group.shots?.length || 0;
    toast(`已从「${plan.title || input.theme}」导入 ${shots} 个镜头、${templates.length} 条 PoseAtlas 参考；先核对人脸/衣装，再人工确认主参考。`, 'ok');
    return true;
}

async function boot() {
    const schemaResponse = await api('/api/continuity/schema', null, 'GET');
    schema = schemaResponse.payload;

    // The brush list comes from the provider catalog, not a hardcoded select:
    // cheap first, reference support stated, and the recommendation explained.
    const provider = document.getElementById('f-provider');
    try {
        const catalog = await api('/api/continuity/providers?needReferences=true', null, 'GET');
        provider.replaceChildren();
        for (const entry of catalog.payload.providers || []) {
            const ready = (catalog.payload.configuredIds || []).includes(entry.id);
            const option = el('option', {
                value: entry.id,
                text: `${entry.label}　${entry.priceLabel}${entry.supportsReferences ? '' : '（不支持参考）'}${ready ? '' : '（未配凭据）'}`,
            });
            if (entry.id === (state.group?.imageProvider || catalog.payload.recommended)) option.selected = true;
            provider.append(option);
        }
        const hint = document.getElementById('provider-hint');
        if (hint) {
            hint.textContent = catalog.payload.blockedReason
                || `推荐：${catalog.payload.recommended}（便宜档且能带参考图）`;
        }
    } catch {
        provider.replaceChildren(el('option', { value: 'manual-chatgpt-web', text: '手动 · ChatGPT 网页' }));
    }

    provider.addEventListener('change', async () => {
        if (!state.group) return;
        const { ok, payload } = await api('/api/continuity/provider', { group: state.group, providerId: provider.value });
        if (!ok) { toast(payload.error || '切换图像服务失败', 'error'); return; }
        state.group = payload.group;
        save();
        toast(`已切换到 ${payload.provider.label}`, 'ok');
    });

    document.getElementById('create').addEventListener('click', createNewGroup);
    document.getElementById('master').addEventListener('click', confirmMaster);
    document.getElementById('import').addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (file) importGroup(file);
    });
    await importStudioPlanFromQuery();
    render();
}

boot();

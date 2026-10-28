// Continuity panel: three reference slots, master-frame confirmation, per-shot
// requests and the QC gate. Deliberately no "generate 9 images" button — one
// request per shot is the whole point.
//
// State lives in localStorage (the contract is a document, not a session).

const STORAGE_KEY = 'photoatelier.continuity.v1';
const ROLES = [
    { role: 'identity', label: '人物参考', hint: '只负责脸、发型、体态' },
    { role: 'scene', label: '场景参考', hint: '只负责地点结构、背景、空间关系' },
    { role: 'style', label: '风格参考', hint: '只负责构图、光线、色彩、颗粒；必须来自你的图库' },
];
const QC_LABELS = {
    identity: '人物身份一致', wardrobe: '服装未改变', 'place-weather': '地点与天气一致',
    'shot-spec': '景别/角度/焦段实现', anatomy: '人数与肢体正常', 'face-sharp': '面部清晰无畸变',
    'style-match': '风格贴近参考',
};

let state = load();
let schema = null;

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
    const response = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
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
        const thumb = (state.thumbs || {})[definition.role];
        host.append(el('div', { class: 'ref-card' }, [
            el('div', { class: 'ref-head' }, [
                el('strong', { text: definition.label }),
                el('span', { class: `badge ${status}`, text: badge }),
            ]),
            el('p', { class: 'muted', text: definition.hint }),
            thumb ? el('img', { src: thumb, class: 'thumb', alt: definition.label }) : el('div', { class: 'thumb empty', text: '未选图' }),
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
    toast(`${shotId} 已生成：${payload.image.assetId}`, 'ok');
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

    const refs = el('div', { class: 'refs' }, card.referencePaths.map((path, index) => el('div', { class: 'ref-card' }, [
        el('div', { class: 'ref-head' }, [
            el('strong', { text: ['人物参考', '场景参考', '风格参考'][index] || `参考 ${index + 1}` }),
        ]),
        el('img', { src: path, class: 'thumb', alt: '参考图' }),
        el('a', { href: path, download: `ref-${index + 1}.png`, class: 'muted small', text: '下载参考图' }),
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
        el('h3', { text: '参考图（三张都要给）', style: 'margin-top:18px' }),
        refs,
        el('h3', { text: '出图后回传', style: 'margin-top:18px' }),
        uploader,
        result?.image ? el('div', { class: 'row' }, [
            el('img', { src: result.image.path, class: 'thumb', alt: '回传结果', style: 'max-width:220px' }),
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

async function boot() {
    const schemaResponse = await api('/api/continuity/schema', null, 'GET');
    schema = schemaResponse.payload;
    const provider = document.getElementById('f-provider');
    if (schema?.providers) {
        provider.replaceChildren();
        for (const [id, definition] of Object.entries(schema.providers)) {
            const option = el('option', { value: id, text: `${definition.label}${definition.canGenerate ? '' : '（不能出图）'}` });
            if (id === 'gpt-image-2') option.selected = true;
            provider.append(option);
        }
    }
    document.getElementById('create').addEventListener('click', createNewGroup);
    document.getElementById('master').addEventListener('click', confirmMaster);
    document.getElementById('import').addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (file) importGroup(file);
    });
    render();
}

boot();

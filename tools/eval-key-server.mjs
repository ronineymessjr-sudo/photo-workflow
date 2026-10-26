// Local-only BYOK relay for evaluation runs (WORKBUDDY-DEEPSEEK-REAL-PLAN-TEST).
// The user pastes their provider key into this page; the key lives ONLY in
// this process's memory: never written to disk, never logged, never committed.
// Evaluation scripts read it from GET /key, which only answers loopback
// requests. The key auto-expires after TTL and can be wiped anytime.
//
// Run: node tools/eval-key-server.mjs   (binds 127.0.0.1:8129 by default)

import http from 'node:http';

const PORT = Number(process.env.EVAL_KEY_PORT || 8129);
const HOST = '127.0.0.1';
const TTL_MS = Number(process.env.EVAL_KEY_TTL_MS || 2 * 60 * 60 * 1000);

let store = null; // { apiKey, model, savedAt }
let expiryTimer = null;

function wipe(reason) {
    if (store) {
        store = null;
        console.log(`[${new Date().toISOString()}] key wiped from memory (${reason})`);
    }
    if (expiryTimer) { clearTimeout(expiryTimer); expiryTimer = null; }
}

function mask(key) {
    return key ? `****${String(key).slice(-4)}` : '';
}

function isLocal(req) {
    const addr = String(req.socket.remoteAddress || '');
    return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

function json(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
            data += chunk;
            if (data.length > 8192) { reject(new Error('body too large')); req.destroy(); }
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>评测密钥本机中转 · PhotoAtelier</title>
<style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; color: #1f2430; background: #f7f8fa; }
    .card { background: #fff; border: 1px solid #e3e6ec; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
    h1 { font-size: 1.25rem; } h2 { font-size: 1rem; }
    input[type=password], input[type=text] { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cfd6e0; border-radius: 8px; font-size: 1rem; }
    button { padding: 10px 18px; border: 0; border-radius: 8px; cursor: pointer; font-size: 1rem; }
    #save { background: #2563eb; color: #fff; } #clear { background: #e5e9f0; color: #333; }
    .status { padding: 10px 14px; border-radius: 8px; background: #eef2ff; margin-top: 12px; word-break: break-all; }
    ul { padding-left: 20px; line-height: 1.7; } code { background: #f0f2f6; padding: 2px 6px; border-radius: 4px; }
    .warn { color: #b45309; }
</style>
</head>
<body>
<div class="card">
    <h1>评测密钥本机中转</h1>
    <p>把 DeepSeek API 密钥粘贴到这里，密钥<b>只存在于本机这个服务的内存里</b>：不写磁盘、不进浏览器存储、不进任何聊天或仓库。评测脚本只从本机 <code>127.0.0.1</code> 读取，并通过 HTTPS 直接调用 DeepSeek 官方接口。</p>
    <h2>粘贴密钥</h2>
    <input type="password" id="key" placeholder="sk-..." autocomplete="off">
    <p><label>模型 ID（默认 deepseek-flash）<input type="text" id="model" value="deepseek-flash" style="width:100%;padding:10px;border:1px solid #cfd6e0;border-radius:8px;"></label></p>
    <button id="save" type="button">保存到本机内存</button>
    <button id="clear" type="button">立即清除</button>
    <div class="status" id="status">未配置。</div>
</div>
<div class="card">
    <h2>安全边界（如实说明）</h2>
    <ul>
        <li>服务只监听 <code>127.0.0.1:${PORT}</code>，局域网和公网都无法访问；</li>
        <li>密钥仅存于本进程内存，<b>${Math.round(TTL_MS / 60000)} 分钟后自动清空</b>，也可随时点击"立即清除"；</li>
        <li>助手全程只看到掩码（末 4 位），不会回显、记录或转存完整密钥；</li>
        <li>密钥仅用于通过 HTTPS 调用 <code>api.deepseek.com</code>；</li>
        <li class="warn">如担心任何环节，测试后到 DeepSeek 后台吊销该密钥即可。</li>
    </ul>
</div>
<script>
const status = document.getElementById('status');
async function refresh() {
    const r = await fetch('/status');
    const d = await r.json();
    status.textContent = d.configured
        ? '已配置：模型 ' + d.model + '，密钥 ' + d.masked + '，' + Math.max(0, Math.round(d.expiresInMs / 60000)) + ' 分钟后自动清空。可以通知助手开始评测。'
        : '未配置。';
}
document.getElementById('save').onclick = async () => {
    const key = document.getElementById('key').value.trim();
    const model = document.getElementById('model').value.trim() || 'deepseek-flash';
    if (!key) { status.textContent = '请先粘贴密钥。'; return; }
    const r = await fetch('/key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key, model }) });
    document.getElementById('key').value = '';
    const d = await r.json();
    status.textContent = d.ok ? '已保存。' : ('保存失败：' + (d.error || r.status));
    refresh();
};
document.getElementById('clear').onclick = async () => {
    await fetch('/clear', { method: 'POST' });
    status.textContent = '已从内存清除。';
    refresh();
};
refresh();
setInterval(refresh, 60000);
</script>
</body>
</html>
`;

const server = http.createServer(async (req, res) => {
    if (!isLocal(req)) { json(res, 403, { error: 'local only' }); return; }
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    try {
        if (req.method === 'GET' && url.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(page);
        } else if (req.method === 'POST' && url.pathname === '/key') {
            const body = JSON.parse(await readBody(req) || '{}');
            const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
            const model = typeof body.model === 'string' && /^[a-z0-9][a-z0-9._:/-]{0,119}$/i.test(body.model.trim()) ? body.model.trim() : 'deepseek-flash';
            if (!/^[\x21-\x7e]{8,512}$/.test(apiKey)) { json(res, 400, { ok: false, error: '密钥格式不正确' }); return; }
            store = { apiKey, model, savedAt: Date.now() };
            if (expiryTimer) clearTimeout(expiryTimer);
            expiryTimer = setTimeout(() => wipe('TTL 到期，自动清空'), TTL_MS);
            console.log(`[${new Date().toISOString()}] key stored (model ${model}, ${mask(apiKey)}), auto-wipe in ${Math.round(TTL_MS / 60000)} min`);
            json(res, 200, { ok: true, masked: mask(apiKey), model });
        } else if (req.method === 'GET' && url.pathname === '/status') {
            json(res, 200, store
                ? { configured: true, masked: mask(store.apiKey), model: store.model, expiresInMs: Math.max(0, store.savedAt + TTL_MS - Date.now()) }
                : { configured: false });
        } else if (req.method === 'GET' && url.pathname === '/key') {
            if (!store) { json(res, 404, { error: 'no key configured' }); return; }
            json(res, 200, { apiKey: store.apiKey, model: store.model });
        } else if (req.method === 'POST' && url.pathname === '/clear') {
            wipe('用户手动清除');
            json(res, 200, { ok: true });
        } else {
            json(res, 404, { error: 'not found' });
        }
    } catch (error) {
        json(res, 400, { error: error.message === 'body too large' ? '请求体过大' : '请求处理失败' });
    }
});

server.listen(PORT, HOST, () => {
    console.log(`eval key relay listening on http://${HOST}:${PORT}/ (loopback only, TTL ${Math.round(TTL_MS / 60000)} min)`);
});

process.on('SIGINT', () => { wipe('进程退出'); process.exit(0); });

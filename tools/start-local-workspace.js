const http = require('http');
const fs = require('fs');
const path = require('path');
const { createServer: createObsidianProxy } = require('./local-obsidian-proxy');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const WEB_PORT = Number(process.env.PHOTOATELIER_WEB_PORT || 8123);
const PROXY_PORT = Number(process.env.PHOTOATELIER_OBSIDIAN_PROXY_PORT || 8124);
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function createStaticServer(rootDir = PROJECT_ROOT) {
  const root = path.resolve(rootDir);
  return http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }

    let requestUrl;
    let pathname;
    try {
      requestUrl = new URL(req.url, 'http://127.0.0.1');
      pathname = decodeURIComponent(requestUrl.pathname);
    }
    catch (_) { res.writeHead(400); res.end('Bad request'); return; }

    if (pathname === '/') {
      res.writeHead(302, { Location: '/legacy/' });
      res.end();
      return;
    }

    // Old relative links and stale browser tabs can accumulate /legacy/ segments.
    if (/^\/(?:legacy\/){2,}/.test(pathname)) {
      res.writeHead(302, { Location: `/legacy/${requestUrl.search}${requestUrl.hash}` });
      res.end();
      return;
    }

    const requested = path.resolve(root, `.${pathname}`);
    if (!isInside(root, requested)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const target = fs.existsSync(requested) && fs.statSync(requested).isDirectory()
      ? path.join(requested, 'index.html')
      : requested;
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const stat = fs.statSync(target);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store'
    });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(target).pipe(res);
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}

async function start() {
  if (WEB_PORT === PROXY_PORT) throw new Error('网页端口和 Obsidian 代理端口不能相同');
  const web = createStaticServer();
  const proxy = createObsidianProxy();
  try {
    await listen(web, WEB_PORT);
    await listen(proxy, PROXY_PORT);
  } catch (error) {
    if (web.listening) web.close();
    if (proxy.listening) proxy.close();
    if (error.code === 'EADDRINUSE') {
      throw new Error(`端口已被占用：${error.port}。请关闭旧的 PhotoAtelier 启动窗口后重试。`);
    }
    throw error;
  }

  console.log(`PhotoAtelier public beta: http://127.0.0.1:${WEB_PORT}/`);
  console.log(`PhotoAtelier workspace: http://127.0.0.1:${WEB_PORT}/legacy/`);
  console.log(`Obsidian local proxy: http://127.0.0.1:${PROXY_PORT}/v1/health`);

  const shutdown = () => {
    web.close();
    proxy.close();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  start().catch(error => {
    console.error(`PhotoAtelier 启动失败：${error.message || error}`);
    process.exitCode = 1;
  });
}

module.exports = { createStaticServer, start };

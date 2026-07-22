const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const defaultConfig = path.join(projectRoot, 'assets', 'platform-collections.json');
const defaultOutDir = path.join(projectRoot, 'data', 'platform-captures');
const defaultDebugDir = path.join(projectRoot, 'data', 'platform-debug');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function parseArgs(argv) {
  const args = {
    config: defaultConfig,
    outDir: defaultOutDir,
    debugDir: defaultDebugDir,
    platform: '',
    url: '',
    collection: '',
    limit: 120,
    scrollRounds: 30,
    loginWaitMs: 0,
    profileDir: path.join(projectRoot, '.browser-profile', 'platform-collector'),
    headless: false
  };
  for (let index = 2; index < argv.length; index++) {
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const value = argv[index + 1];
    if (name === 'headless') {
      args.headless = value === undefined || value.startsWith('--') ? true : value !== 'false';
      if (value !== undefined && !value.startsWith('--')) index++;
    } else if (['limit', 'scrollRounds', 'loginWaitMs'].includes(name)) {
      args[name] = Number(value || args[name]);
      index++;
    } else if (name in args) {
      args[name] = value || '';
      index++;
    }
  }
  return args;
}

async function loadPlaywright() {
  try {
    return require('playwright-core');
  } catch (_) {
    try {
      return require('playwright');
    } catch (_) {
      throw new Error('缺少 Playwright。请先在项目目录运行 npm install。');
    }
  }
}

function readCollections(configPath, platform, collection, url) {
  if (url) return [{ name: collection || platform || '手动来源', url, platform }];
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const list = platform
    ? (config[platform] || []).map((item) => ({ ...item, platform }))
    : Object.entries(config).flatMap(([platformName, items]) => (items || []).map((item) => ({ ...item, platform: platformName })));
  return list.filter((item) => !collection || item.name === collection);
}

function cleanText(text, max = 200) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function extractXhs(page, baseUrl) {
  return page.evaluate(({ baseUrl }) => {
    const clean = (text, max = 200) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
    const absolute = (url) => {
      try {
        const parsed = new URL(url, baseUrl);
        parsed.hash = '';
        return parsed.toString();
      } catch (_) {
        return '';
      }
    };
    const selectors = [
      'a[href*="/explore/"]',
      'a[href*="/discovery/item/"]',
      'a[href*="xiaohongshu.com/explore/"]',
      'a[href*="xhslink.com"]'
    ];
    return Array.from(document.querySelectorAll(selectors.join(','))).map((anchor) => {
      const img = anchor.querySelector('img');
      const card = anchor.closest('section, li, [class*="note"], [class*="card"], [data-v-a264b01a]') || anchor.parentElement;
      const cardText = clean(card?.innerText, 400);
      const title = clean(anchor.getAttribute('title')) || clean(img?.alt) || clean(anchor.innerText) || cardText.split('\n')[0];
      return {
        platform: 'xiaohongshu',
        title,
        url: absolute(anchor.getAttribute('href')),
        cover: absolute(img?.currentSrc || img?.src),
        author: clean(cardText.replace(title, ''), 120)
      };
    }).filter((item) => item.url);
  }, { baseUrl });
}

async function extractDouyin(page, baseUrl) {
  return page.evaluate(({ baseUrl }) => {
    const clean = (text, max = 200) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
    const absolute = (url) => {
      try {
        const parsed = new URL(url, baseUrl);
        parsed.hash = '';
        return parsed.toString();
      } catch (_) {
        return '';
      }
    };
    return Array.from(document.querySelectorAll('a[href*="/video/"], a[href*="/note/"]')).map((anchor) => {
      const img = anchor.querySelector('img');
      const card = anchor.closest('li, [data-e2e], [class*="card"]') || anchor.parentElement;
      const cardText = clean(card?.innerText, 400);
      const title = clean(anchor.getAttribute('title')) || clean(img?.alt) || clean(anchor.innerText) || cardText.split('\n')[0];
      return {
        platform: 'douyin',
        title,
        url: absolute(anchor.getAttribute('href')),
        cover: absolute(img?.currentSrc || img?.src),
        author: clean(cardText.replace(title, ''), 120)
      };
    }).filter((item) => item.url);
  }, { baseUrl });
}

function canonicalUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    parsed.search = '';
    parsed.hash = '';
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.toString();
  } catch (_) {
    return '';
  }
}

async function detectAccessProblem(page) {
  const currentUrl = page.url();
  const bodyText = cleanText(await page.locator('body').innerText({ timeout: 3000 }).catch(() => ''), 1000);
  const exactLoginControls = await page.getByText('登录', { exact: true }).count().catch(() => 0);
  if (exactLoginControls > 0 || /login|passport/i.test(currentUrl) || /未登录|登录搜索更多内容|登录后查看|请先登录|扫码登录|登录即可/.test(bodyText)) return '登录态已失效';
  if (/未连接到服务器|网络连接失败|点击刷新/.test(bodyText)) return '页面服务连接失败';
  if (/验证码|访问过于频繁|系统繁忙|安全验证|异常请求/.test(bodyText)) return '平台要求人工验证或限制访问';
  return '';
}

async function waitForManualLogin(page, maxWaitMs) {
  const deadline = Date.now() + maxWaitMs;
  let problem = await detectAccessProblem(page);
  while (problem && Date.now() < deadline) {
    await page.waitForTimeout(1500);
    problem = await detectAccessProblem(page);
  }
  return problem;
}

async function autoScrollAndExtract(page, collection, args) {
  const seen = new Map();
  let stableRounds = 0;
  for (let round = 0; round < args.scrollRounds && seen.size < args.limit; round++) {
    const items = collection.platform === 'douyin'
      ? await extractDouyin(page, collection.url)
      : await extractXhs(page, collection.url);
    const before = seen.size;
    for (const item of items) {
      const canonical = canonicalUrl(item.url);
      if (!canonical) continue;
      seen.set(canonical, {
        ...item,
        title: cleanText(item.title) || path.basename(new URL(canonical).pathname),
        collectionName: collection.name || '',
        collectionUrl: collection.url,
        tags: collection.tags || [],
        capturedAt: new Date().toISOString()
      });
    }
    stableRounds = seen.size === before ? stableRounds + 1 : 0;
    if (stableRounds >= 6) break;
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(1200);
  }
  return [...seen.values()].slice(0, args.limit);
}

function safeName(value) {
  return cleanText(value || 'collection').replace(/[\\/:*?"<>|]/g, '-');
}

function writeCapture(outDir, collection, items, status = 'ok') {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `${collection.platform || 'platform'}-${safeName(collection.name)}-${stamp}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify({
    schemaVersion: 1,
    platform: collection.platform,
    collectionName: collection.name || '',
    collectionUrl: collection.url,
    tags: collection.tags || [],
    capturedAt: new Date().toISOString(),
    contentScope: 'visible-link-metadata-only',
    status,
    count: items.length,
    items
  }, null, 2)}\n`, 'utf8');
  return outPath;
}

async function writeDebugSnapshot(page, args, collection) {
  fs.mkdirSync(args.debugDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${collection.platform || 'platform'}-${safeName(collection.name)}-${stamp}`;
  const htmlPath = path.join(args.debugDir, `${base}.html`);
  const pngPath = path.join(args.debugDir, `${base}.png`);
  fs.writeFileSync(htmlPath, await page.content(), 'utf8');
  await page.screenshot({ path: pngPath, fullPage: true }).catch(() => {});
  return { htmlPath, pngPath };
}

async function main() {
  const args = parseArgs(process.argv);
  const collections = readCollections(args.config, args.platform, args.collection, args.url);
  if (!collections.length) throw new Error('没有可采集的收藏来源。请检查 assets/platform-collections.json。');

  const { chromium } = await loadPlaywright();
  fs.mkdirSync(args.profileDir, { recursive: true });
  const context = await chromium.launchPersistentContext(args.profileDir, {
    headless: args.headless,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    viewport: { width: 1440, height: 1000 },
    locale: 'zh-CN'
  });
  const page = context.pages()[0] || await context.newPage();
  const outputs = [];
  const warnings = [];
  const loginWaitedPlatforms = new Set();

  try {
    for (const collection of collections) {
      try {
        console.log(`打开 ${collection.platform}：${collection.name || collection.url}`);
        await page.goto(collection.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2500);
        if (args.loginWaitMs > 0 && !loginWaitedPlatforms.has(collection.platform)) {
          loginWaitedPlatforms.add(collection.platform);
          const initialProblem = await detectAccessProblem(page);
          if (initialProblem) {
            console.log(`${initialProblem}。请在浏览器中完成登录或验证，最多等待 ${args.loginWaitMs}ms。`);
            const remainingProblem = await waitForManualLogin(page, args.loginWaitMs);
            if (remainingProblem) throw new Error(remainingProblem);
          }
        }
        const accessProblem = await detectAccessProblem(page);
        if (accessProblem) throw new Error(accessProblem);
        const items = await autoScrollAndExtract(page, collection, args);
        if (!items.length) {
          const debug = await writeDebugSnapshot(page, args, collection);
          warnings.push(`${collection.name || collection.url} 未发现可见链接，调试截图：${debug.pngPath}`);
        }
        const outPath = writeCapture(args.outDir, collection, items, items.length ? 'ok' : 'empty');
        outputs.push(outPath);
        console.log(`采集 ${items.length} 条：${outPath}`);
      } catch (error) {
        warnings.push(`${collection.name || collection.url}：${error.message || error}`);
        writeCapture(args.outDir, collection, [], 'blocked');
      }
    }
  } finally {
    await context.close();
  }

  console.log(JSON.stringify({ ok: warnings.length === 0, outputs, warnings }, null, 2));
  if (warnings.length) process.exitCode = 2;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  autoScrollAndExtract,
  canonicalUrl,
  detectAccessProblem,
  extractDouyin,
  extractXhs,
  parseArgs,
  readCollections,
  waitForManualLogin,
  writeCapture
};

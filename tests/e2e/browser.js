const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

function findBrowserExecutable() {
  const explicit = process.env.CHROME_PATH || process.env.BROWSER_PATH;
  if (explicit && fs.existsSync(explicit)) return explicit;

  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe`,
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      ]
    : process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
      : [
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/usr/bin/microsoft-edge',
        ];

  const found = candidates.find(candidate => candidate && fs.existsSync(candidate));
  if (found) return found;

  for (const command of ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    try {
      const result = execFileSync(process.platform === 'win32' ? 'where' : 'which', [command], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split(/\r?\n/)[0];
      if (result && fs.existsSync(result)) return result;
    } catch (_) {}
  }

  throw new Error('没有找到 Chrome/Chromium。请设置 CHROME_PATH，或在 CI 中安装 google-chrome-stable。');
}

module.exports = { findBrowserExecutable };

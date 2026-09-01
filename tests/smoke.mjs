import fs from 'node:fs';

const required = [
  'index.html',
  'workspace.html',
  'src/app.js',
  'src/public-feedback-client.js',
  'src/public-beta.js',
  'src/beta-feedback.js',
  'src/legacy-v5-bridge.js',
  'src/core/schema.js',
  'src/core/storage.js',
  'src/core/lut.js',
  'src/services/data-service.js',
  'src/services/agent-service.js',
  'src/services/role-workspace.js',
  'src/services/project-templates.js', 'src/services/feedback-analytics.js',
  'src/pages/system.js',
  'src/pages/crew.js',
  'manifest.webmanifest',
  'sw.js',
  'worker/src/index.js',
  'worker/package.json',
  'legacy/index.html',
  'legacy/cloud-api/index.js',
  'START-HERE-CODEX-2026-07-15.md',
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}

const entryHtml = fs.readFileSync('index.html', 'utf8');
for (const marker of ['<h1 id="hero-title">PhotoAtelier</h1>', '/legacy/?mode=public-beta', 'data-feedback-form']) {
  if (!entryHtml.includes(marker)) throw new Error(`Public beta entry is missing ${marker}`);
}
const legacyHtml = fs.readFileSync('legacy/index.html', 'utf8');
if (!legacyHtml.includes('src/legacy-v5-bridge.js')) throw new Error('Original application must load the V5 data bridge');
for (const marker of ['<button id="userAvatar"', 'onclick="openPersonalSettings()"', 'aria-controls="tab-settings"', 'function openPersonalSettings()']) {
  if (!legacyHtml.includes(marker)) throw new Error(`Personal settings entry is missing ${marker}`);
}
for (const marker of ['id="authLoginTab"', 'id="authRegisterTab"', '继续你的拍摄工作', '这是本机账户，不提供跨设备同步', '先以体验模式进入', "AUTH_QUERY === 'skip'", 'function clearExpiredGuestSession', "sessionStorage.setItem(GUEST_SESSION_KEY, 'active')", 'function registerLocalAccount', 'window.continueAsGuest', "loginOverlay.style.display = 'none'", 'data-settings-section="account"', 'data-settings-section="library"', 'function showSettingsSection', 'panel.hidden = !selected']) {
  if (!legacyHtml.includes(marker)) throw new Error(`Account/settings flow is missing ${marker}`);
}
if (legacyHtml.includes('href="#settings-account"')) throw new Error('Settings navigation must not use route-conflicting anchors');
if (legacyHtml.includes("login(email, password) { return this.request('/api/auth/login'")) {
  throw new Error('Legacy UI must not call the retired auth worker');
}
if (legacyHtml.includes('PUBLIC_BETA_MODE')) throw new Error('Public beta must not bypass the login screen');
const r4ShellCss = fs.readFileSync('src/r4-shell.css', 'utf8');
if (!r4ShellCss.includes('.user-avatar-button:focus-visible')) throw new Error('Personal settings entry must expose a keyboard focus style');
const enhancementCss = fs.readFileSync('src/enhancements.css', 'utf8');
for (const marker of ['--auth-bg: #f3f5f3', '--auth-accent: #4f7865', '.auth-tabs', '.auth-guest-note', '.settings-layout', '.settings-group', '.settings-section[hidden]', '@media (max-width: 820px)']) {
  if (!enhancementCss.includes(marker)) throw new Error(`Account/settings styling is missing ${marker}`);
}
const bridgeSource = fs.readFileSync('src/legacy-v5-bridge.js', 'utf8');
for (const marker of ['createV5Application', 'migration.migrate', 'PhotoAtelierV5', 'dataset.v5Engine', 'photoatelier:v5-ready']) {
  if (!bridgeSource.includes(marker)) throw new Error(`Missing original-to-V5 bridge capability ${marker}`);
}
const html = fs.readFileSync('workspace.html', 'utf8');
for (const label of ['工作台', '参考数据库', '方案中心', '日程与现场执行', '团队与拍摄通告', 'LUT 与后期交付', '复盘与知识回流', '系统与迁移']) {
  if (!html.includes(label)) throw new Error(`Missing page label ${label}`);
}

const workerSource = fs.readFileSync('worker/src/index.js', 'utf8');
for (const marker of ['listFeishuRecords', 'deleteFeishu', 'APP_SYNC_TOKEN', 'payloadJson', '/v1/search', '/v1/notes/read', '/v1/notes']) {
  if (!workerSource.includes(marker)) throw new Error(`Missing worker capability ${marker}`);
}

const planSource = fs.readFileSync('src/pages/plan.js', 'utf8');
for (const marker of ['export-plan-pdf-btn', 'approveGenerationRun', 'confirmPlanRevision', 'referenceLibrary.getProject']) {
  if (!planSource.includes(marker)) throw new Error(`Missing plan capability ${marker}`);
}

const scheduleSource = fs.readFileSync('src/pages/schedule.js', 'utf8');
for (const marker of ['shoot-event-form', 'scheduleWorkspace', 'createShootEvent', 'retake_required', 'startShoot', 'completeShoot']) {
  if (!scheduleSource.includes(marker)) throw new Error(`Missing schedule capability ${marker}`);
}

const postSource = fs.readFileSync('src/pages/post.js', 'utf8');
for (const marker of ['lut-preview-canvas', 'post-advance-form', 'post.advance', 'parseCubeLut']) {
  if (!postSource.includes(marker)) throw new Error(`Missing post capability ${marker}`);
}

const dashboardSource = fs.readFileSync('src/pages/dashboard.js', 'utf8');
if (!dashboardSource.includes('项目消息与协作记录') || !dashboardSource.includes('视角')) throw new Error('Missing integrated messages');

const referenceSource = fs.readFileSync('src/pages/references.js', 'utf8');
if (!referenceSource.includes('image-search-form') || !referenceSource.includes('obsidian-search-form') || !referenceSource.includes('selectForProject')) {
  throw new Error('Missing reference integrations');
}

const crewSource = fs.readFileSync('src/pages/crew.js', 'utf8');
for (const marker of ['person-form', 'equipment-form', 'buildModelPacket', 'buildAssistantPacket', 'publish']) {
  if (!crewSource.includes(marker)) throw new Error(`Missing crew capability ${marker}`);
}

console.log('Smoke checks passed');

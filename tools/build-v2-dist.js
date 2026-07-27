const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = safeOutput('dist-v2');
const classicOutput = safeOutput('dist-classic-addon');
const referenceOutput = safeOutput('dist-reference-addon');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const schemaSource = fs.readFileSync(path.join(root, 'src', 'core', 'schema.js'), 'utf8');
const appVersion = schemaSource.match(/APP_VERSION\s*=\s*['"]([^'"]+)/)?.[1] || packageJson.version || 'unknown';
const legacyRuntimeFiles = [
  'src/domain.js',
  'src/storage.js',
  'src/feishu-sync.js',
  'src/app-enhancements.js',
  'src/beta-feedback.js',
  'src/legacy-v5-bridge.js',
  'src/legacy-knowledge-bridge.js',
  'src/legacy-commercial-tools.js',
  'src/legacy-plan-resources.js',
  'src/legacy-reference-context-launcher.js',
  'src/legacy-resource-workspace.js',
  'src/legacy-shot-editor.js',
  'src/legacy-v3-planning-flow.js',
  'src/obsidian-library-onboarding.js',
  'src/photographer-reference-ui.js',
  'src/enhancements.css',
  'src/r4-design-system.css',
  'src/r4-shell.css',
  'src/r4-active-plan.css',
  'src/r4-reference-workspace.css',
  'src/r4-mobile-field-mode.css',
  'src/r4-icon-system.js',
  'src/r4-mobile-field-mode.js',
  'src/r4-workspace-integration.js',
];

reset(output);
copy('index.html', output);
copy('workspace.html', output);
copy('assets/app.css', output);
copy('src/app.js', output);
copy('src/public-beta.js', output);
copy('src/beta-feedback.js', output);
copyTree('src/core', output);
copyTree('src/data', output);
copyTree('src/services', output);
copyTree('src/v5', output);
copyTree('src/pages', output);
for (const locale of ['en', 'ja', 'ko']) copyTree(locale, output);
for (const optional of ['favicon.jpg', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'sw.js']) copyOptional(optional, output);

copy('legacy/index.html', output);
for (const file of legacyRuntimeFiles) copy(file, output);
copyTree('assets', output);
copyOptional('data/ronin-photography-knowledge.json', output);
copyOptional('data/v5-real-data-catalog.json', output);
fs.writeFileSync(path.join(output, 'build-info.json'), JSON.stringify({
  application: 'PhotoAtelier',
  version: appVersion,
  builtAt: new Date().toISOString(),
  canonicalEntry: 'index.html',
  distribution: 'original-ui-with-v5-engine',
  primaryEntry: 'legacy/index.html',
  v5WorkspaceEntry: 'workspace.html',
  classicEntry: 'legacy/index.html',
  optionalAssetPack: true,
  referenceDataPack: 'bundled starter gallery plus separate full reference add-on',
}, null, 2));


reset(referenceOutput);
copyOptional('assets/demo/ATTRIBUTION.md', referenceOutput);
copyOptional('assets/demo/reference-manifest.json', referenceOutput);
copyTree('assets/demo/references', referenceOutput);
copyOptional('data/v5-reference-import-plan.json', referenceOutput);
copyOptional('data/v5-real-data-catalog.json', referenceOutput);
fs.writeFileSync(path.join(referenceOutput, 'README-OVERLAY.md'), [
  '# PhotoAtelier Verified Reference Data Add-on',
  '',
  'Overlay this directory onto `dist-v2` when the bundled licensed reference images and full source catalog are needed.',
  'The app shell remains deployable without this optional data pack.',
  'Missing Obsidian Vault images remain relink-required and are never promoted to image assets.',
  '',
].join('\n'));

reset(classicOutput);
copy('legacy/index.html', classicOutput);
for (const file of legacyRuntimeFiles) copy(file, classicOutput);
copyTree('assets', classicOutput);
copyOptional('data/ronin-photography-knowledge.json', classicOutput);
copyOptional('data/v5-real-data-catalog.json', classicOutput);
copyOptional('favicon.jpg', path.join(classicOutput, 'legacy'));
copyOptional('legacy/README.md', classicOutput);
fs.writeFileSync(path.join(classicOutput, 'README-OVERLAY.md'), [
  '# PhotoAtelier Classic Optional Add-on',
  '',
  'This directory is not the canonical V2 application.',
  'To make Classic available beside a lean V2 deployment, overlay this directory onto `dist-v2`.',
  'The archived Supabase/JWT backend is intentionally excluded.',
  '',
].join('\n'));

console.log(`Built ${output} (${appVersion}, original UI + V5 engine)`);
console.log(`Built ${classicOutput} (optional Classic/assets add-on)`);
console.log(`Built ${referenceOutput} (optional verified reference data add-on)`);

function safeOutput(name) {
  const target = path.join(root, name);
  if (path.basename(target) !== name || path.dirname(target) !== root) throw new Error(`Unsafe output directory: ${target}`);
  return target;
}
function reset(target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
}
function copy(relative, targetRoot) {
  const source = path.join(root, relative);
  const destination = path.join(targetRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
function copyOptional(relative, targetRoot) {
  if (fs.existsSync(path.join(root, relative))) copy(relative, targetRoot);
}
function copyTree(relative, targetRoot) {
  const source = path.join(root, relative);
  const destination = path.join(targetRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}
function classicPlaceholder(version) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Classic 未部署</title><style>body{font:16px system-ui;background:#111;color:#eee;display:grid;place-items:center;min-height:100vh;margin:0}.box{max-width:620px;padding:32px;border:1px solid #333;border-radius:18px;background:#181818}a{color:#55d98a}</style><main class="box"><h1>Classic Workbench 未包含在市场发布包中</h1><p>当前正式版本为 PhotoAtelier ${version}。Classic 与大型示例素材已经拆分到可选的 <code>dist-classic-addon</code>，避免影响正式 V2 的部署和离线缓存。</p><p><a href="../index.html">返回 PhotoAtelier V2</a></p></main></html>`;
}

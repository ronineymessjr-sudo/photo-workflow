import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist-v2');
const addon = path.resolve('dist-classic-addon');
const referenceAddon = path.resolve('dist-reference-addon');
for (const relative of ['index.html', 'en/index.html', 'ja/index.html', 'ko/index.html', 'workspace.html', 'build-info.json', '_worker.js', 'assets/app.css', 'assets/landing.css', 'assets/beta-feedback.css', 'assets/reference-database.json', 'assets/marketing/photoatelier-hero-v1.png', 'assets/marketing/photoatelier-workflow-v1.png', 'assets/demo/references/pose-01.jpg', 'assets/demo/references/pose-12.jpg', 'data/v5-real-data-catalog.json', 'src/app.js', 'src/public-feedback-client.js', 'src/public-beta.js', 'src/landing-motion.js', 'src/beta-feedback.js', 'src/app-enhancements.js', 'src/legacy-v5-bridge.js', 'src/legacy-resource-workspace.js', 'src/photographer-reference-ui.js', 'src/core/schema.js', 'src/data/photography-rules.js', 'src/pages/system.js', 'src/pages/crew.js', 'src/services/role-workspace.js', 'src/services/project-templates.js', 'src/services/feedback-analytics.js', 'src/v5/application.js', 'src/v5/seeds/equipment-models.js', 'manifest.webmanifest', 'sw.js', '_headers', '_redirects', 'google67c093daaeda8997.html', 'd78ec4343cd045feb784e87950786218.txt', 'sitemap.xml', 'sitemap.txt', 'guides/index.html', 'guides/reference-image-to-shot-plan/index.html', 'guides/portrait-shot-list/index.html', 'guides/posing-prompts/index.html', 'guides/photo-shoot-schedule/index.html', 'guides/lut-workflow/index.html', 'guides/log-to-rec709/index.html', 'legacy/index.html']) {
  if (!fs.existsSync(path.join(root, relative))) throw new Error(`Distribution missing ${relative}`);
}
for (const relative of ['legacy/index.html', 'src/app-enhancements.js', 'src/legacy-v5-bridge.js', 'src/legacy-resource-workspace.js', 'src/enhancements.css', 'assets/lut-library.json', 'README-OVERLAY.md']) {
  if (!fs.existsSync(path.join(addon, relative))) throw new Error(`Classic add-on missing ${relative}`);
}

for (const relative of ['assets/demo/ATTRIBUTION.md', 'assets/demo/reference-manifest.json', 'assets/demo/references/pose-01.jpg', 'assets/demo/references/pose-12.jpg', 'data/v5-reference-import-plan.json', 'data/v5-real-data-catalog.json', 'README-OVERLAY.md']) {
  if (!fs.existsSync(path.join(referenceAddon, relative))) throw new Error(`Reference add-on missing ${relative}`);
}

if (fs.existsSync(path.join(root, 'legacy', 'cloud-api')) || fs.existsSync(path.join(addon, 'legacy', 'cloud-api'))) throw new Error('Deprecated backend leaked into public distribution');
const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
if (info.version !== '2.5.0-domain-implementation') throw new Error(`Unexpected build version ${info.version}`);
if (info.distribution !== 'original-ui-with-v5-engine') throw new Error('Expected original UI with V5 engine metadata');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const marker of ['<h1 id="hero-title">PhotoAtelier</h1>', '/legacy/?mode=public-beta', 'data-feedback-form']) {
  if (!html.includes(marker)) throw new Error(`Distribution public beta entry is missing ${marker}`);
}
const leanBytes = directorySize(root);
console.log(`Distribution smoke checks passed (${(leanBytes / 1024 / 1024).toFixed(1)} MiB)`);

function directorySize(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((sum, entry) => {
    const file = path.join(directory, entry.name);
    return sum + (entry.isDirectory() ? directorySize(file) : fs.statSync(file).size);
  }, 0);
}

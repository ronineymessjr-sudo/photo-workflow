const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const esmRoots = ['src/v5', 'src/core', 'src/pages', 'src/services', 'src/app.js', 'worker/src', 'tests/e2e', 'tests/smoke.mjs', 'tests/node/v2-data.test.mjs', 'tests/node/v2-handoff.test.mjs', 'tests/node/role-workspace.test.mjs', 'tests/node/project-templates.test.mjs',
  'tests/node/feedback-analytics.test.mjs',
  'tests/node/persona-workflow.test.mjs', 'tests/node/agent-workflow.test.mjs', 'tests/node/v5', 'sw.js'];
const cjsRoots = ['tools', 'tests/node/core.test.js', 'tests/node/proxy.test.js', 'tests/e2e/browser.js', 'legacy/cloud-api/index.js'];
const excluded = new Set();

function filesUnder(target) {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) return [];
  const stat = fs.statSync(full);
  if (stat.isFile()) return [full];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap(entry => filesUnder(path.relative(root, path.join(full, entry.name))));
}

function check(file, esm) {
  if (!/\.(?:js|mjs)$/.test(file) || excluded.has(path.relative(root, file).replace(/\\/g, '/'))) return;
  const args = ['--check', file];
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`Syntax check failed: ${path.relative(root, file)}`);
  }
}

for (const target of esmRoots) filesUnder(target).forEach(file => check(file, true));
for (const target of cjsRoots) filesUnder(target).forEach(file => check(file, false));
console.log('Syntax checks passed');

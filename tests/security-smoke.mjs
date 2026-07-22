import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist-v2');
const files = walk(root);
const forbiddenPaths = ['node_modules', 'cloud-api', '.env', '.git'];
for (const file of files) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (forbiddenPaths.some(part => relative.split('/').includes(part))) throw new Error(`Forbidden path in distribution: ${relative}`);
  if (fs.statSync(file).size > 2_000_000) throw new Error(`Unexpected large file in lean distribution: ${relative}`);
  if (!/\.(?:js|json|html|css|xml|txt|webmanifest)$/i.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const secretPatterns = [
    /FEISHU_APP_SECRET\s*[:=]\s*['"][^'"]{8,}/i,
    /MINIMAX_API_KEY\s*[:=]\s*['"][^'"]{8,}/i,
    /JWT_SECRET\s*[:=]\s*['"][^'"]{8,}/i,
    /APP_SYNC_TOKEN\s*[:=]\s*['"][^'"]{8,}/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ];
  if (secretPatterns.some(pattern => pattern.test(text))) throw new Error(`Potential secret leaked in ${relative}`);
}
console.log(`Security smoke checks passed (${files.length} public files scanned)`);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

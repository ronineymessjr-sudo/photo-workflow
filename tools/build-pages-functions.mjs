import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, '.runlogs', 'pages-functions-build');
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
execFileSync(command, [
  'wrangler', 'pages', 'functions', 'build', 'functions',
  '--build-output-directory', 'dist-v2',
  '--outdir', output,
  '--compatibility-date', '2026-08-01',
], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
fs.copyFileSync(path.join(output, 'index.js'), path.join(root, 'dist-v2', '_worker.js'));

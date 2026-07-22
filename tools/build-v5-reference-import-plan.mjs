import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReferenceDatabaseImportPlan } from '../src/v5/references/reference-database-importer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const database = JSON.parse(fs.readFileSync(path.join(root, 'assets/reference-database.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/demo/reference-manifest.json'), 'utf8'));
const availablePaths = manifest.items
  .map(item => item.localPath)
  .filter(relative => fs.existsSync(path.join(root, relative)));
const plan = buildReferenceDatabaseImportPlan(database, {
  availablePaths,
  bundledAssets: manifest.items,
  generatedAt: new Date().toISOString(),
});

const output = path.join(root, 'data/v5-reference-import-plan.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
console.log(`Built ${path.relative(root, output)}: ${plan.stats.importableAssets} real assets, ${plan.stats.sourceDescriptors} source descriptors, ${plan.stats.unavailableLocalAssets} relink-required records`);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EQUIPMENT_MODEL_SEED } from '../src/v5/seeds/equipment-models.js';
import { PLAN_TEMPLATE_SEED } from '../src/v5/seeds/plan-templates.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const referencePlan = JSON.parse(fs.readFileSync(path.join(root, 'data/v5-reference-import-plan.json'), 'utf8'));
const catalog = {
  schemaVersion: 5,
  generatedAt: new Date().toISOString(),
  policy: {
    equipmentModelsAreOwnership: false,
    referenceAssetsAreSynthetic: false,
    personalRecordsCreated: false,
    missingFilesBecomeAssets: false,
  },
  equipmentModels: EQUIPMENT_MODEL_SEED,
  planTemplates: PLAN_TEMPLATE_SEED,
  referenceAssets: referencePlan.assetInputs,
  referenceSources: referencePlan.sourceDescriptors,
  relinkRequired: referencePlan.unavailableAssets,
  stats: {
    equipmentModels: EQUIPMENT_MODEL_SEED.length,
    planTemplates: PLAN_TEMPLATE_SEED.length,
    referenceAssets: referencePlan.assetInputs.length,
    referenceSources: referencePlan.sourceDescriptors.length,
    relinkRequired: referencePlan.unavailableAssets.length,
  },
};
const output = path.join(root, 'data/v5-real-data-catalog.json');
fs.writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`Built ${path.relative(root, output)}: ${catalog.stats.equipmentModels} equipment models, ${catalog.stats.planTemplates} plan templates, ${catalog.stats.referenceAssets} real reference files`);

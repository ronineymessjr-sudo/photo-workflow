import { spawnSync } from 'node:child_process';
import process from 'node:process';

const scopes = {
  catalog: [
    ['--test',
      'tests/node/v5/contracts-catalog.test.mjs',
      'tests/node/v5/catalog-ui-migration.test.mjs',
      'tests/node/v5/r4-resource-secondary-nav.test.mjs',
      'tests/node/v5/r4-resource-workspace.test.mjs'],
  ],
  references: [
    ['--test',
      'tests/node/v5/reference-database-import.test.mjs',
      'tests/node/v5/reference-source-adapters.test.mjs',
      'tests/node/v5/reference-ui-migration.test.mjs',
      'tests/node/v5/r3-reference-context-launcher.test.mjs',
      'tests/node/v5/r4-on-demand-media.test.mjs',
      'tests/node/v5/contracts-catalog.test.mjs'],
  ],
  planning: [
    ['--test',
      'tests/node/v5/planning-workflow.test.mjs',
      'tests/node/v5/planning-ui-migration.test.mjs',
      'tests/node/v5/legacy-v3-planning-integration.test.mjs',
      'tests/node/v5/worker-v5-contract.test.mjs',
      'tests/node/v5/application-integrity.test.mjs'],
  ],
  schedule: [
    ['--test',
      'tests/node/v5/schedule-post-sharing.test.mjs',
      'tests/node/v5/schedule-ui-migration.test.mjs',
      'tests/node/v5/application-integrity.test.mjs'],
  ],
  post: [
    ['--test',
      'tests/node/v5/schedule-post-sharing.test.mjs',
      'tests/node/v5/post-ui-migration.test.mjs',
      'tests/node/v5/application-integrity.test.mjs'],
  ],
  sharing: [
    ['--test',
      'tests/node/v5/schedule-post-sharing.test.mjs',
      'tests/node/v5/sharing-ui-migration.test.mjs',
      'tests/node/persona-workflow.test.mjs'],
  ],
  migration: [
    ['--test',
      'tests/node/v5/migration.test.mjs',
      'tests/node/v5/application-integrity.test.mjs'],
  ],
  worker: [
    ['--test',
      'tests/node/v5/worker-v5-contract.test.mjs',
      'tests/node/proxy.test.js'],
  ],
  ui: [
    ['tools/check-syntax.js'],
    ['tests/smoke.mjs'],
  ],
  'all-v5': [
    ['--test',
      'tests/node/v5/contracts-catalog.test.mjs',
      'tests/node/v5/planning-workflow.test.mjs',
      'tests/node/v5/schedule-post-sharing.test.mjs',
      'tests/node/v5/migration.test.mjs',
      'tests/node/v5/reference-database-import.test.mjs',
      'tests/node/v5/application-integrity.test.mjs',
      'tests/node/v5/worker-v5-contract.test.mjs',
      'tests/node/v5/reference-source-adapters.test.mjs'],
  ],
};

const scope = process.argv[2];
if (!scope || !scopes[scope]) {
  console.error(`Usage: npm run test:scope -- <scope>\nScopes: ${Object.keys(scopes).join(', ')}`);
  process.exit(2);
}

for (const args of scopes[scope]) {
  console.log(`\n> ${process.execPath} ${args.join(' ')}`);
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`\nTargeted test scope passed: ${scope}`);

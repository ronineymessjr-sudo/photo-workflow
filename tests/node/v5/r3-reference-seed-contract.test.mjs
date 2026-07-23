import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogPaths = [
  new URL('../../../data/v5-reference-import-plan.json', import.meta.url),
  new URL('../../../data/v5-real-data-catalog.json', import.meta.url),
];

const allowedSeedTypes = new Set([
  'concrete_asset',
  'query_template',
  'local_private_placeholder',
  'synthetic_concept',
]);

async function loadCatalogs() {
  return Promise.all(catalogPaths.map(async path => JSON.parse(await readFile(path, 'utf8'))));
}

test('R3-E catalogs expose the same omit-empty contextual handoff contract', async () => {
  const catalogs = await loadCatalogs();
  const expectedFields = [
    'planId',
    'shotId',
    'theme',
    'style',
    'scene',
    'mood',
    'orientation',
    'focalLength',
    'referenceIds',
  ];

  for (const catalog of catalogs) {
    const contract = catalog.contextHandoffContract;
    assert.ok(contract, 'contextHandoffContract is required');
    assert.equal(contract.queryBuilder?.strategy, 'omit-empty');
    assert.deepEqual(contract.allowedFields.map(field => field.name), expectedFields);
    assert.equal(contract.allowedFields.find(field => field.name === 'planId')?.required, true);
    assert.ok(
      contract.allowedFields.filter(field => field.name !== 'planId').every(field => field.required === false),
      'optional context fields must not require invented values',
    );
    assert.deepEqual(
      contract.destinations.map(destination => destination.id),
      ['pexels', 'unsplash', 'pixabay', 'personal-library'],
    );
  }
});

test('R3-E seed records distinguish concrete assets, query templates, private placeholders and concepts', async () => {
  const catalogs = await loadCatalogs();

  for (const catalog of catalogs) {
    const records = [
      ...(catalog.assetInputs || catalog.referenceAssets || []),
      ...(catalog.sourceDescriptors || catalog.referenceSources || []),
    ];
    assert.ok(records.length > 0, 'seed records are required');

    for (const record of records) {
      assert.ok(allowedSeedTypes.has(record.seedType), `${record.id} has unsupported seedType`);

      if (record.recommendable) {
        assert.equal(record.seedType, 'concrete_asset', `${record.id} cannot be recommendable without a concrete asset`);
        assert.match(record.sourceUrl || '', /^https?:\/\/.+/i, `${record.id} needs an exact source URL`);
        assert.doesNotMatch(record.sourceUrl, /\{query\}/i, `${record.id} cannot use a query template as an asset URL`);
      }

      if (record.seedType === 'query_template') {
        assert.equal(record.recommendable, false, `${record.id} query templates are handoffs, not assets`);
        assert.match(record.sourceUrl || record.urlTemplate || '', /\{query\}/i);
      }

      if (record.seedType === 'local_private_placeholder') {
        assert.equal(record.recommendable, false, `${record.id} private placeholders are not global recommendations`);
      }

      if (record.seedType === 'synthetic_concept') {
        assert.equal(record.synthetic, true, `${record.id} concept must remain synthetic`);
        assert.equal(record.recommendable, false, `${record.id} concept cannot be a real reference recommendation`);
      }
    }
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from './lab.mjs';

test('all scenarios produce a current-handler and schema verdict', async () => {
  const { results, translatorTests } = await evaluate();
  assert.equal(results.length, 6);
  assert.deepEqual(results.map(row => row.currentPass), [true, false, false, false, false, false]);
  assert.deepEqual(results.map(row => row.schemaPass), [true, false, false, true, true, true]);
  assert.match(results[1].schemaErrors.join(' '), /model_pose/);
  assert.deepEqual(translatorTests.map(row => row.calls), [2, 1]);
  assert.deepEqual(translatorTests.map(row => row.repairAsked), [true, false]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const legacy = fs.readFileSync(path.join(root, 'legacy/index.html'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'src/legacy-v3-planning-flow.js'), 'utf8');

test('legacy reference-first adapter is bridge-gated and preserves the classic fallback', () => {
  assert.match(legacy, /id="v3PlanningFlow"/);
  assert.match(legacy, /legacy-v3-planning-flow\.js/);
  assert.match(adapter, /window\.PhotoAtelierV5\?\.ready/);
  assert.match(adapter, /visualAnalysis\.analyze/);
  assert.match(adapter, /creativeDirection\.generateDirections/);
  assert.match(adapter, /shotDesign\.designShots/);
  assert.match(adapter, /requestSubmit\(\)/);
  assert.match(adapter, /synthetic:\s*false/);
  assert.doesNotMatch(adapter, /synthetic:\s*true/);
});

test('V3 project ID is derived from the actually opened legacy plan, never a detached fixed ID', () => {
  // The adapter must resolve the current legacy plan, not use a hardcoded project ID.
  assert.doesNotMatch(adapter, /legacy-v3-current-project/);
  assert.doesNotMatch(adapter, /legacy-pending-/);
  assert.match(adapter, /window\.currentPlanId/);
  assert.match(adapter, /`legacy-\$\{planId\}`/);
  assert.match(adapter, /return null;/);
});

test('reference-first flow is optional and progressively disclosed', () => {
  // Collapsed details keeps the flow optional; internal steps disclose one at a time.
  assert.match(adapter, /<details/);
  assert.match(adapter, /<summary>参考图优先流程/);
  assert.match(adapter, /data-v3-analyze/);
  assert.match(adapter, /data-v3-directions/);
  assert.match(adapter, /data-v3-select/);
  assert.match(adapter, /data-v3-design/);
  assert.match(adapter, /data-v3-scale/);
});

test('V3 output is written as candidate draft only and does not create formal Shots or Tasks', () => {
  // Draft marker and localStorage overlay confirm candidate status.
  assert.match(adapter, /v3Draft/);
  assert.match(adapter, /pa_shots_\$\{planId\}/);
  assert.doesNotMatch(adapter, /application\.data\.create\(['"]shots['"]/i);
  assert.doesNotMatch(adapter, /application\.data\.create\(['"]tasks['"]/i);
  assert.doesNotMatch(adapter, /application\.tasks\./);
});

test('creative direction is stored as supporting metadata after the storyboard draft', () => {
  assert.match(adapter, /plan\.result\.creativeDirection/);
  assert.match(adapter, /selectedDirection/);
  assert.match(adapter, /_v3:\s*true/);
});

test('classic deterministic generator remains available when no reference is selected', () => {
  assert.match(adapter, /data-v3-classic/);
  assert.match(adapter, /按 Brief 使用经典确定性生成/);
});

test('V3 flow is gated when no legacy plan is currently opened', () => {
  assert.match(adapter, /请先打开或创建一个方案/);
  assert.match(adapter, /if \(!projectId\)/);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const enhancements = fs.readFileSync(path.join(repoRoot, 'src', 'app-enhancements.js'), 'utf8');
const legacy = fs.readFileSync(path.join(repoRoot, 'legacy', 'index.html'), 'utf8');

test('R4 only renders concrete reference thumbnails and avoids decorative equipment photos', () => {
  assert.match(enhancements, /thumbnails\.map\(\(item, index\) => `<figure><img/);
  assert.match(enhancements, /referenceThumbnail\(item\.reference\)/);
  assert.match(enhancements, /plan-package-equipment-icon/);
  assert.doesNotMatch(enhancements, /assets\/demo\/equipment-kit\.jpg/);
  assert.doesNotMatch(legacy, /assets\/demo\/equipment-kit\.jpg/);
});

test('LUT workspace defaults to curated one-click presets and keeps previews optional', () => {
  assert.match(enhancements, /onclick="previewCatalogLut/);
  assert.match(enhancements, /CURATED_LUT_PRESETS/);
  assert.match(enhancements, /onclick="applyCuratedLut/);
  assert.match(enhancements, /用自己的照片看效果/);
  assert.match(enhancements, /专业设置与自定义 LUT/);
  assert.doesNotMatch(enhancements, /class="open-lut-preview"/);
  assert.doesNotMatch(enhancements, /initializeLutDemo/);
  assert.doesNotMatch(enhancements, /id="lut-pipeline-creative"/);
});

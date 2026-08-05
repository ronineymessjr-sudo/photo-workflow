import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = file => fs.readFileSync(file, 'utf8');

test('landing hero structure: H1 is PhotoAtelier, hero image exists', () => {
  const html = read('index.html');
  assert.ok(html.includes('<h1 id="hero-title">PhotoAtelier</h1>'), 'hero H1 mismatch');
  assert.ok(html.includes('class="hero-image"'), 'hero image missing');
});

test('primary CTA routes to /legacy/?mode=public-beta', () => {
  const html = read('index.html');
  assert.ok(html.includes('href="/legacy/?mode=public-beta"'), 'primary CTA route mismatch');
  assert.ok(html.includes('data-track="landing_cta_open_workspace"'), 'CTA tracking attribute missing');
});

test('secondary CTA targets #shoot-journey', () => {
  const html = read('index.html');
  assert.ok(html.includes('href="#shoot-journey"'), 'secondary CTA target mismatch');
});

test('exactly four timeline stages exist with order 01-04', () => {
  const html = read('index.html');
  const count = html.split('class="stage ').length - 1;
  assert.equal(count, 4, `expected 4 stages, found ${count}`);
  for (const id of ['01', '02', '03', '04']) {
    assert.ok(html.includes(`data-stage="${id}"`), `stage ${id} missing`);
  }
});

test('desktop alternation: two left and two right stages', () => {
  const html = read('index.html');
  assert.equal(html.split('stage--left').length - 1, 2, 'expected 2 left stages');
  assert.equal(html.split('stage--right').length - 1, 2, 'expected 2 right stages');
});

test('reduced-motion CSS exists', () => {
  const css = read('assets/landing.css');
  assert.ok(css.includes('prefers-reduced-motion: reduce'), 'reduced-motion CSS missing');
});

test('GSAP failure fallback leaves content visible', () => {
  const js = read('src/landing-motion.js');
  assert.ok(js.includes('revealAllStatically'), 'GSAP failure fallback missing');
});

test('no external photography domains in landing source', () => {
  const html = read('index.html');
  const css = read('assets/landing.css');
  const js = read('src/landing-motion.js');
  const extRe = /https?:\/\/(?!photoatelier\.pages\.dev|127\.0\.0\.1|localhost)[^\s"']+\.(jpg|jpeg|png|gif|webp)/i;
  assert.ok(!extRe.test(html), 'external image URL found in index.html');
  assert.ok(!extRe.test(css), 'external image URL found in landing.css');
  assert.ok(!extRe.test(js), 'external image URL found in landing-motion.js');
});

test('every generated asset sidecar has synthetic=true', () => {
  const manifest = JSON.parse(read('assets/landing-ai/asset-manifest.json'));
  assert.ok(Array.isArray(manifest.assets), 'asset manifest missing assets array');
  for (const asset of manifest.assets) {
    assert.equal(asset.synthetic, true, `asset ${asset.id || asset.file} missing synthetic=true`);
  }
});

test('hero image has width, height, alt, and local URL', () => {
  const html = read('index.html');
  const heroImgMatch = html.match(/<img[^>]*class="hero-image"[^>]*>/);
  assert.ok(heroImgMatch, 'hero image element missing');
  const tag = heroImgMatch[0];
  assert.ok(/width="\d+"/.test(tag), 'hero image missing width');
  assert.ok(/height="\d+"/.test(tag), 'hero image missing height');
  assert.ok(/alt="[^"]+"/.test(tag), 'hero image missing alt');
  assert.ok(/src="\.\/assets\/landing-ai\//.test(tag), 'hero image src is not local');
});

test('timeline reference uses compact R6 generated image', () => {
  const html = read('index.html');
  const css = read('assets/landing.css');
  assert.ok(html.includes('reference-portrait-r6.webp'), 'R6 reference image missing');
  assert.ok(html.includes('width="960" height="1200"'), 'reference image dimensions are stale');
  assert.ok(css.includes('max-height: 500px'), 'reference image has no compact height cap');
  assert.ok(css.includes('height: auto'), 'intrinsic image height can still stretch the timeline');
});

test('landing copy distinguishes guest trial from account sync', () => {
  const html = read('index.html');
  assert.ok(html.includes('免注册即可体验'), 'guest trial copy missing');
  assert.ok(html.includes('登录后可扩展同步'), 'account sync boundary missing');
  assert.ok(!html.includes('无需登录 · 免费体验'), 'stale no-login claim remains');
});

test('landing introduces photographer field notes instead of data modes', () => {
  const html = read('index.html');
  assert.ok(html.includes('来自摄影知识库的现场方法'), 'field-note source label missing');
  assert.ok(html.includes('把“自然一点”，换成模特听得懂的动作。'), 'field-note headline missing');
  assert.ok(html.includes('data-settings-section') === false, 'workspace settings leaked into landing');
  assert.ok(!html.includes('三种数据模式，按你的方式工作'), 'retired data-mode section remains');
  assert.ok(!html.includes('class="mode-grid"'), 'retired data-mode grid remains');
});

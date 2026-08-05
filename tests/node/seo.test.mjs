import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('.');
const guideSlugs = [
  'reference-image-to-shot-plan',
  'portrait-shot-list',
  'posing-prompts',
  'photo-shoot-schedule',
  'lut-workflow',
  'log-to-rec709',
  'photography-location-scout',
  'portrait-natural-light',
  'photography-gear-checklist',
  'reference-image-copyright'
];

test('public landing uses supported structured data and current canonical', () => {
  const html = read('index.html');
  assert.match(html, /rel="canonical" href="https:\/\/photoatelier\.pages\.dev\/"/);
  assert.match(html, /"applicationCategory": "DesignApplication"/);
  assert.match(html, /"@type": "Offer"/);
  assert.doesNotMatch(html, /ronineymessjr-sudo\.github\.io/);
  assert.match(html, /href="\/guides\/"/);
});

test('interactive workspace is excluded from indexing without blocking links', () => {
  const html = read('legacy/index.html');
  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  assert.match(html, /rel="canonical" href="https:\/\/photoatelier\.pages\.dev\/legacy\/"/);
  assert.match(html, /property="og:url" content="https:\/\/photoatelier\.pages\.dev\/legacy\/"/);
  assert.doesNotMatch(html, /ronineymessjr-sudo\.github\.io/);
  assert.doesNotMatch(html, /"@type": "FAQPage"/);
});

test('localized landing pages translate the core production journey', () => {
  const untranslated = [
    '从一张参考图，到一份完整拍摄安排。',
    '先确定真正要靠近的画面。',
    '把方向拆成五个能执行的镜头。',
    '确认场地、人员、设备和画面感觉。',
    '最后把方案变成当天能照着走的日程。',
    '现在把灵感变成能直接开拍的方案。'
  ];
  for (const locale of ['en', 'ja', 'ko']) {
    const html = read(`${locale}/index.html`);
    for (const text of untranslated) assert.ok(!html.includes(text), `${locale} still contains ${text}`);
    assert.match(html, new RegExp(`rel="canonical" href="https:\\/\\/photoatelier\\.pages\\.dev\\/${locale}\\/"`));
  }
});

test('guide pages are indexable, canonical and useful', () => {
  assert.ok(fs.existsSync(path.join(root, 'guides', 'index.html')));
  for (const slug of guideSlugs) {
    const html = read(`guides/${slug}/index.html`);
    assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/);
    assert.match(html, new RegExp(`rel="canonical" href="https:\\/\\/photoatelier\\.pages\\.dev\\/guides\\/${slug}\\/"`));
    assert.equal((html.match(/<h1/g) || []).length, 1);
    assert.match(html, /"@type":"Article"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
    assert.match(html, /href="\/legacy\/\?mode=public-beta"/);
    assert.match(html, /class="related-guides"/);
    assert.ok((html.match(/<section/g) || []).length >= 5, `${slug} is missing article sections`);
    assert.ok(stripTags(html).length > 700, `${slug} content is too thin`);
  }
});

test('sitemap lists public content and excludes the application workspace', () => {
  const xml = read('sitemap.xml');
  const text = read('sitemap.txt');
  assert.match(xml, /https:\/\/photoatelier\.pages\.dev\/guides\//);
  for (const slug of guideSlugs) {
    const pattern = new RegExp(`https:\\/\\/photoatelier\\.pages\\.dev\\/guides\\/${slug}\\/`);
    assert.match(xml, pattern);
    assert.match(text, pattern);
  }
  assert.doesNotMatch(xml, /\/legacy\//);
  assert.doesNotMatch(text, /\/legacy\//);
  assert.equal(text.trim().split(/\r?\n/).length, 15);
});

test('distribution builder includes landing runtime and SEO assets', () => {
  const builder = read('tools/build-v2-dist.js');
  for (const marker of ["copy('src/landing-motion.js', output)", "copyTree('guides', output)", "'sitemap.txt'", "'d78ec4343cd045feb784e87950786218.txt'", "'_headers'"]) {
    assert.ok(builder.includes(marker), `builder missing ${marker}`);
  }
  assert.match(read('robots.txt'), /Sitemap: https:\/\/photoatelier\.pages\.dev\/sitemap\.xml/);
  assert.match(read('robots.txt'), /Sitemap: https:\/\/photoatelier\.pages\.dev\/sitemap\.txt/);
  assert.equal(read('google67c093daaeda8997.html').trim(), 'google-site-verification: google67c093daaeda8997.html');
  assert.equal(read('d78ec4343cd045feb784e87950786218.txt').trim(), 'd78ec4343cd045feb784e87950786218');
  assert.match(read('_redirects'), /\/google67c093daaeda8997\.html \/google67c093daaeda8997 200/);
});

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function stripTags(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

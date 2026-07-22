import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = file => fs.readFileSync(file, 'utf8');

test('landing exposes reciprocal localized URLs', () => {
  const root = read('index.html');
  assert.match(root, /id="landing-language"/);
  for (const locale of ['zh-CN', 'en', 'ja', 'ko', 'x-default']) assert.match(root, new RegExp(`hreflang="${locale}"`));
});

for (const locale of [
  { id: 'en', lang: 'en', phrase: 'Turn visual ideas into plans you can actually shoot.' },
  { id: 'ja', lang: 'ja', phrase: 'アイデアを、実際に撮れるプランへ。' },
  { id: 'ko', lang: 'ko', phrase: '아이디어를 실제 촬영 가능한 플랜으로.' },
]) {
  test(`${locale.id} landing contains translated body and SEO metadata`, () => {
    const html = read(`${locale.id}/index.html`);
    assert.match(html, new RegExp(`<html lang="${locale.lang}">`));
    assert.match(html, new RegExp(`canonical" href="https://photoatelier.pages.dev/${locale.id}/`));
    assert.ok(html.includes(locale.phrase));
    assert.ok(html.includes(`mode=public-beta&amp;lang=${locale.id}`) || html.includes(`mode=public-beta&lang=${locale.id}`));
    for (const alternate of ['zh-CN', 'en', 'ja', 'ko', 'x-default']) assert.match(html, new RegExp(`hreflang="${alternate}"`));
    for (const untranslated of ['开始公开测试', '三种数据模式，按你的方式工作', '告诉我们哪里不好用']) assert.ok(!html.includes(untranslated));
  });
}

test('legacy workspace exposes four-language core interface dictionary', () => {
  const html = read('legacy/index.html');
  assert.match(html, /id="appLanguage"/);
  assert.match(html, /const supportedLanguages = \['zh', 'en', 'ja', 'ko'\]/);
  for (const key of ['nav.reference', 'nav.calendar', 'nav.equipment', 'nav.lut', 'nav.settings', 'gen.intro', 'reference.title', 'settings.title']) {
    assert.ok(html.includes(`data-i18n="${key}"`) || html.includes(`data-i18n-aria="${key}"`), `missing translation binding ${key}`);
  }
  for (const phrase of ['Photography reference library', '写真リファレンスライブラリ', '사진 레퍼런스 라이브러리']) assert.ok(html.includes(phrase));
});

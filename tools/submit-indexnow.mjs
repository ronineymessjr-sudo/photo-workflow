import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = 'photoatelier.pages.dev';
const key = 'd78ec4343cd045feb784e87950786218';
const keyFile = `${key}.txt`;
const keyPath = path.join(root, keyFile);
const sitemapPath = path.join(root, 'sitemap.txt');

if (fs.readFileSync(keyPath, 'utf8').trim() !== key) {
  throw new Error(`IndexNow key file does not contain the expected key: ${keyFile}`);
}

const urlList = fs.readFileSync(sitemapPath, 'utf8')
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);

for (const value of urlList) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.host !== host) {
    throw new Error(`Refusing to submit URL outside https://${host}: ${value}`);
  }
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host,
    key,
    keyLocation: `https://${host}/${keyFile}`,
    urlList
  })
});

if (![200, 202].includes(response.status)) {
  const body = await response.text();
  throw new Error(`IndexNow submission failed (${response.status}): ${body || response.statusText}`);
}

console.log(`IndexNow accepted ${urlList.length} URLs (${response.status} ${response.statusText}).`);

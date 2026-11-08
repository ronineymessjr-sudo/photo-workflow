// Build a contact sheet for a shoot directory.
//
// Reads report.json and renders one card per shot, so a series can be reviewed
// side by side instead of opening files one at a time. Framing, angle and whether
// the face was transferred all come from the report rather than being retyped -
// a summary that drifts from the data is worse than no summary.
//
//   node tools/gallery.mjs --dir runtime/series-full --title "螺旋楼梯 · 九镜"

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = name => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : '';
};

const DIR = argOf('dir') || 'runtime/series-full';
const TITLE = argOf('title') || '拍摄结果';
const OUT = argOf('out') || path.join(DIR, 'index.html');

let report = { frames: [] };
try {
    report = JSON.parse(await readFile(path.join(DIR, 'report.json'), 'utf8'));
} catch {
    console.log(`没有找到 ${path.join(DIR, 'report.json')}`);
    process.exit(1);
}

const SIZE_LABEL = {
    ECU: '极特写', CU: '特写', MCU: '半身近景', MS: '中景',
    MFS: '中全景', FS: '全身', WS: '全景', EWS: '远景',
};

const cards = report.frames.map(frame => {
    const file = path.basename(frame.final || frame.compose || '');
    const size = String(frame.size || '').toUpperCase();
    const swapped = frame.swapped === true;
    const badge = swapped ? '已换脸' : '构图直出';
    const angle = frame.angle || '';
    return `
    <figure>
      <img src="${encodeURI(file)}" alt="${frame.shotId}">
      <figcaption>
        <div class="name">${frame.shotId} · ${size} ${SIZE_LABEL[size] || ''}</div>
        <div class="desc">${angle ? `机位 ${angle} · ` : ''}${badge}</div>
      </figcaption>
    </figure>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${TITLE}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 34px 24px 72px; background: #f6f5f2; color: #23211e;
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
    line-height: 1.6;
  }
  header { max-width: 1240px; margin: 0 auto 24px; }
  h1 { font-size: 21px; font-weight: 650; margin: 0 0 6px; }
  .sub { color: #6d6a63; font-size: 13.5px; margin: 0; }
  main { max-width: 1240px; margin: 0 auto; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 18px; }
  figure {
    margin: 0; background: #fff; border-radius: 10px; overflow: hidden;
    box-shadow: 0 1px 2px rgba(35,33,30,.08), 0 10px 26px -18px rgba(35,33,30,.4);
  }
  figure img { width: 100%; display: block; aspect-ratio: 2 / 3; object-fit: cover; background: #eee; }
  figcaption { padding: 10px 12px 12px; }
  .name { font-weight: 600; font-size: 13px; }
  .desc { color: #6d6a63; font-size: 12px; margin-top: 2px; }
</style>
</head>
<body>
<header>
  <h1>${TITLE}</h1>
  <p class="sub">${report.frames.length} 张 · 生成于 ${report.at ? report.at.slice(0, 16).replace('T', ' ') : ''}</p>
</header>
<main><div class="grid">${cards}</div></main>
</body>
</html>`;

await writeFile(OUT, html);
console.log(`已生成 ${OUT}（${report.frames.length} 张）`);

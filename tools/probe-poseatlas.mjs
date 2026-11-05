#!/usr/bin/env node
// Probes the RuiC-PoseAtlas endpoints repeatedly to see whether the data is
// stable enough to build a production pipeline on:
//   - HTTP status and latency distribution
//   - byte size and row count drift
//   - id-set hash drift (data changing under us = non-reproducible output)
//   - schema completeness of the fields we actually consume
//   - duplicates / unusable rows after the app's own normaliser
//
//   node tools/probe-poseatlas.mjs --rounds 5
import { normalizePoseAtlasDataset, POSEATLAS_DATASETS } from '../api/ai-studio/poseatlas.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : fallback;
};
const rounds = Math.max(1, Number(arg('rounds', '5')) || 5);

const SPECS = [
    { kind: 'pose', key: 'poses', url: `${'https://hruiccc.github.io/RuiC-PoseAtlas/'}data/poses.json` },
    { kind: 'costume', key: 'costumes', url: `${'https://hruiccc.github.io/RuiC-PoseAtlas/'}data/costumes.json` },
    { kind: 'portrait', key: 'images', url: `${'https://hruiccc.github.io/RuiC-PoseAtlas/'}data/faces.json` },
];

function sha1(text) {
    // Small deterministic hash for drift detection (FNV-1a is enough here).
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

const report = [];
for (const spec of SPECS) {
    const runs = [];
    for (let round = 1; round <= rounds; round += 1) {
        const started = Date.now();
        try {
            const response = await fetch(spec.url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
            const body = await response.text();
            const elapsed = Date.now() - started;
            let parsed = null;
            let parseError = '';
            try { parsed = JSON.parse(body); } catch (error) { parseError = String(error.message); }
            const rows = Array.isArray(parsed?.[spec.key]) ? parsed[spec.key] : [];
            const ids = rows.map(row => row?.id).filter(id => typeof id === 'string');
            let normalized = [];
            let normalizeError = '';
            if (parsed && !parseError) {
                try { normalized = normalizePoseAtlasDataset(spec.kind, parsed); } catch (error) { normalizeError = String(error.message); }
            }
            runs.push({
                round, status: response.status, elapsed, bytes: body.length,
                cache: response.headers.get('cache-control') || '',
                etag: response.headers.get('etag') || '',
                rows: rows.length, ids: ids.length, uniqueIds: new Set(ids).size,
                idHash: sha1(ids.slice().sort().join(',')),
                normalized: normalized.length, parseError, normalizeError,
            });
        } catch (error) {
            runs.push({ round, status: 0, elapsed: Date.now() - started, error: String(error?.message || error) });
        }
    }
    report.push({ spec, runs });
}

const lines = [];
lines.push('# RuiC-PoseAtlas 稳定性实测', '');
lines.push(`轮次：${rounds}　时间：${new Date().toISOString()}`, '');
for (const { spec, runs } of report) {
    const ok = runs.filter(run => run.status === 200 && !run.parseError);
    const latencies = ok.map(run => run.elapsed).sort((a, b) => a - b);
    const rowCounts = [...new Set(ok.map(run => run.rows))];
    const idHashes = [...new Set(ok.map(run => run.idHash))];
    const normalizedCounts = [...new Set(ok.map(run => run.normalized))];
    lines.push(`## ${spec.kind}（\`${spec.key}\`）`, '');
    lines.push(`- 成功：${ok.length}/${runs.length}　状态码：${[...new Set(runs.map(run => run.status))].join('/')}`);
    if (latencies.length) {
        lines.push(`- 延迟 ms：min ${latencies[0]} / 中位 ${latencies[Math.floor(latencies.length / 2)]} / max ${latencies[latencies.length - 1]}`);
        lines.push(`- 体积 bytes：${[...new Set(ok.map(run => run.bytes))].join(' / ')}`);
        lines.push(`- 行数：${rowCounts.join(' / ')}${rowCounts.length > 1 ? '　⚠️ 行数在变' : '　✅ 行数稳定'}`);
        lines.push(`- 唯一 id 数：${[...new Set(ok.map(run => run.uniqueIds))].join(' / ')}`);
        lines.push(`- id 集合哈希：${idHashes.join(' / ')}${idHashes.length > 1 ? '　⚠️ 数据在漂，结果不可复现' : '　✅ 数据一致'}`);
        lines.push(`- 归一化后可用条目：${normalizedCounts.join(' / ')}${normalizedCounts.length > 1 ? '　⚠️ 归一化结果不稳定' : '　✅ 归一化稳定'}`);
        lines.push(`- 缓存头：${[...new Set(ok.map(run => run.cache || '(无)'))].join(' | ')}`);
        const errors = ok.filter(run => run.normalizeError).map(run => run.normalizeError);
        if (errors.length) lines.push(`- 归一化报错：${[...new Set(errors)].join('；')}`);
    }
    lines.push('');
}

// Field completeness on the last successful fetch of each dataset.
lines.push('## 字段完整度（最后一轮）', '');
for (const { spec } of report) {
    try {
        const response = await fetch(spec.url, { signal: AbortSignal.timeout(8000) });
        const parsed = await response.json();
        const rows = parsed?.[spec.key] || [];
        if (!rows.length) { lines.push(`- ${spec.kind}：没有行`); continue; }
        const sample = rows[0];
        const keys = Object.keys(sample).sort();
        const withId = rows.filter(row => typeof row?.id === 'string').length;
        lines.push(`- **${spec.kind}**：${rows.length} 行，含 id ${withId} 行；字段 → ${keys.join(', ')}`);
        if (spec.kind === 'portrait') {
            const sections = [...new Set(rows.map(row => row.sec).filter(Boolean))];
            const hairs = [...new Set(rows.map(row => row.hair).filter(Boolean))];
            lines.push(`  - sec 取值：${sections.join(' / ')}；hair 取值：${hairs.join(' / ')}`);
        }
        if (spec.kind === 'pose') {
            const angles = new Set();
            for (const row of rows.slice(0, 200)) for (const variant of row.variants || []) if (variant?.angle) angles.add(variant.angle);
            lines.push(`  - 角度变体：${[...angles].join(' / ') || '(无)'}`);
        }
    } catch (error) {
        lines.push(`- ${spec.kind}：取字段失败（${String(error?.message || error)}）`);
    }
}

const output = lines.join('\n');
console.log(output);

import { APP_SCHEMA_VERSION, APP_VERSION, ENTITIES, SYNC_ENTITIES } from '../core/schema.js';
import { downloadJson, escapeHtml, formatDate, toast } from '../core/utils.js';

export function renderSystem(ctx) {
  const audit = ctx.data.auditIntegrity();
  const migration = ctx.storage.get('legacyMigrationReport', null);
  const analysis = ctx.data.analyzeLegacy();
  const backup = ctx.storage.get('preMigrationBackup', null);

  return `
    <section class="page-header">
      <div>
        <h1>系统、迁移与交接</h1>
        <p>正式入口为模块化 V2。Classic 只作为历史功能对照，不再接收新业务逻辑。</p>
      </div>
      <span class="status-pill ${audit.ok ? 'badge-ok' : 'badge-warn'}">${audit.ok ? '数据完整' : `${audit.issues.length} 个问题`}</span>
    </section>

    <section class="grid cols-4">
      ${metric('应用版本', APP_VERSION)}
      ${metric('数据版本', `v${APP_SCHEMA_VERSION}`)}
      ${metric('同步实体', SYNC_ENTITIES.length)}
      ${metric('本地实体', ENTITIES.length)}
    </section>

    <section class="grid cols-2 plan-section">
      <article class="card">
        <div class="status-row"><h2>正式运行架构</h2><span class="tag badge-ok">V2 Canonical</span></div>
        <table>
          <tr><th>正式入口</th><td><code>/index.html</code></td></tr>
          <tr><th>历史对照</th><td><a class="link" href="./legacy/index.html" target="_blank" rel="noreferrer">打开 Classic Workbench</a></td></tr>
          <tr><th>业务数据</th><td><code>pa_v2_*</code> Repository</td></tr>
          <tr><th>远端同步</th><td>Cloudflare Worker → 飞书八表</td></tr>
          <tr><th>旧后端</th><td><code>legacy/cloud-api/</code> 已冻结，不进入主部署</td></tr>
        </table>
      </article>

      <article class="card">
        <h2>数据操作</h2>
        <p class="hint">导出包含 V2 数据与可识别的 Legacy 数据。导入前系统会生成内存回滚快照。</p>
        <div class="stack-actions">
          <button id="export-backup-btn" class="button primary">导出完整备份</button>
          <button id="import-backup-btn" class="button secondary">导入并合并备份</button>
          ${backup ? '<button id="download-pre-migration-btn" class="button ghost">下载迁移前备份</button>' : ''}
          <input id="import-backup-file" type="file" accept="application/json,.json" hidden>
        </div>
      </article>
    </section>

    <section class="grid cols-2 plan-section">
      <article class="card">
        <div class="status-row"><h2>Legacy 迁移状态</h2><span class="tag ${migration?.completed ? 'badge-ok' : analysis.hasLegacyData ? 'badge-warn' : ''}">${migration?.completed ? '已完成' : analysis.hasLegacyData ? '待迁移' : '无旧数据'}</span></div>
        <p class="hint">最近执行：${escapeHtml(formatDate(migration?.completedAt || migration?.startedAt))}</p>
        <div class="migration-counts">${renderMigrationCounts(analysis.counts)}</div>
        ${analysis.warnings.length ? `<div class="notice warning">${analysis.warnings.map(item => `<p>${escapeHtml(item)}</p>`).join('')}</div>` : ''}
        <div class="stack-actions">
          <button id="migration-dry-run-btn" class="button secondary">重新生成迁移报告</button>
          <button id="migration-commit-btn" class="button primary">执行幂等迁移</button>
          <button id="download-migration-report-btn" class="button ghost">下载迁移报告</button>
        </div>
      </article>

      <article class="card">
        <div class="status-row"><h2>完整性审计</h2><span class="tag ${audit.ok ? 'badge-ok' : 'badge-warn'}">${audit.ok ? '通过' : '需检查'}</span></div>
        <div class="entity-count-grid">${Object.entries(audit.counts).map(([entity, count]) => `<div><strong>${count}</strong><span>${escapeHtml(entity)}</span></div>`).join('')}</div>
        <div class="list plan-section">
          ${audit.issues.slice(0, 20).map(issue => `<div class="list-item"><div><h3>${escapeHtml(issue.code)}</h3><p>${escapeHtml(issue.entity)} · ${escapeHtml(issue.id || '无 ID')} ${issue.projectId ? `· project ${escapeHtml(issue.projectId)}` : ''}${issue.planId ? `· plan ${escapeHtml(issue.planId)}` : ''}</p></div><span class="tag ${issue.severity === 'error' ? 'badge-danger' : 'badge-warn'}">${escapeHtml(issue.severity)}</span></div>`).join('') || '<div class="empty">没有发现孤立关系或重复 ID。</div>'}
        </div>
        <button id="run-audit-btn" class="button secondary">重新审计</button>
      </article>
    </section>
  `;
}

export function bindSystem(ctx) {
  document.getElementById('export-backup-btn')?.addEventListener('click', () => {
    downloadJson(`PhotoAtelier-backup-${new Date().toISOString().slice(0, 10)}.json`, ctx.storage.snapshot({ includeLegacy: true }));
    toast('完整备份已导出');
  });

  const input = document.getElementById('import-backup-file');
  document.getElementById('import-backup-btn')?.addEventListener('click', () => input?.click());
  input?.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const result = ctx.storage.importAll(payload, { mode: 'merge' });
      toast(`备份导入完成：${result.imported} 个 V2 存储项`);
      location.reload();
    } catch (error) {
      toast(`导入失败：${error.message}`);
    }
  });

  document.getElementById('download-pre-migration-btn')?.addEventListener('click', () => {
    const backup = ctx.storage.get('preMigrationBackup', null);
    if (backup) downloadJson('PhotoAtelier-pre-migration-backup.json', backup);
  });

  document.getElementById('migration-dry-run-btn')?.addEventListener('click', () => {
    const report = ctx.data.migrateLegacy({ commit: false, returnReport: true, force: true });
    ctx.storage.set('legacyMigrationDryRun', report);
    toast('迁移报告已重新生成，未修改数据');
    ctx.refresh();
  });

  document.getElementById('migration-commit-btn')?.addEventListener('click', () => {
    try {
      const report = ctx.data.migrateLegacy({ commit: true, returnReport: true, force: true });
      toast(`迁移完成：新增 ${Object.values(report.inserted || {}).reduce((sum, value) => sum + value, 0)} 条记录`);
      ctx.refresh();
    } catch (error) {
      toast(`迁移失败并已回滚：${error.message}`);
    }
  });

  document.getElementById('download-migration-report-btn')?.addEventListener('click', () => {
    const report = ctx.storage.get('legacyMigrationReport', null) || ctx.data.migrateLegacy({ commit: false, returnReport: true, force: true });
    downloadJson('PhotoAtelier-migration-report.json', report);
  });

  document.getElementById('run-audit-btn')?.addEventListener('click', () => {
    ctx.storage.set('lastIntegrityAudit', ctx.data.auditIntegrity());
    toast('完整性审计已完成');
    ctx.refresh();
  });
}

function renderMigrationCounts(counts = {}) {
  const rows = Object.entries(counts).filter(([, value]) => value.detected || value.existing);
  if (!rows.length) return '<div class="empty">没有检测到可迁移的旧实体。</div>';
  return `<table><thead><tr><th>实体</th><th>检测</th><th>待新增</th><th>已存在</th></tr></thead><tbody>${rows.map(([entity, value]) => `<tr><td>${escapeHtml(entity)}</td><td>${value.detected}</td><td>${value.new}</td><td>${value.existing}</td></tr>`).join('')}</tbody></table>`;
}

const metric = (label, value) => `<article class="card"><div class="metric small-metric">${escapeHtml(value)}</div><div class="metric-label">${escapeHtml(label)}</div></article>`;

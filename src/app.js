import { StorageRepository } from './core/storage.js';
import { ApiClient } from './core/api-client.js';
import { ProjectContext } from './core/project-context.js';
import { SYNC_ENTITIES } from './core/schema.js';
import { DataService } from './services/data-service.js';
import { AgentService } from './services/agent-service.js';
import { PhotographyKnowledgeService } from './services/photography-knowledge-service.js';
import { formToObject, toast } from './core/utils.js';
import { renderDashboard, bindDashboard } from './pages/dashboard.js';
import { renderReferences, bindReferences } from './pages/references.js';
import { renderPlan, bindPlan } from './pages/plan.js';
import { renderSchedule, bindSchedule } from './pages/schedule.js';
import { renderPost, bindPost } from './pages/post.js';
import { renderReview, bindReview } from './pages/review.js';
import { renderSystem, bindSystem } from './pages/system.js';
import { renderCrew, bindCrew } from './pages/crew.js';
import { getProjectTemplate, seedProjectTemplate } from './services/project-templates.js';
import { createV5Application } from './v5/application.js';

const storage = new StorageRepository();
const data = new DataService(storage);
const projectContext = new ProjectContext(storage);
const api = new ApiClient(storage);
const photographyKnowledge = new PhotographyKnowledgeService({
  searchObsidian: (query, filters) => api.searchObsidian(query, filters),
  catalogUrl: './data/ronin-photography-knowledge.json',
});
const agent = new AgentService(api, photographyKnowledge);
const v5 = createV5Application({ data, storage, api });

const renderers = {
  dashboard: [renderDashboard, bindDashboard],
  references: [renderReferences, bindReferences],
  plan: [renderPlan, bindPlan],
  schedule: [renderSchedule, bindSchedule],
  crew: [renderCrew, bindCrew],
  post: [renderPost, bindPost],
  review: [renderReview, bindReview],
  system: [renderSystem, bindSystem],
};

let currentPage = location.hash.slice(1) || 'dashboard';

const migrationReport = data.migrateLegacy({ commit: true, returnReport: true });
let schemaV5MigrationReport = null;
try {
  schemaV5MigrationReport = v5.migration.migrate({ commit: true });
} catch (error) {
  schemaV5MigrationReport = { completed: false, error: error?.toJSON?.() || { code: 'SCHEMA_V5_MIGRATION_FAILED', message: error.message } };
  console.warn('PhotoAtelier schema v5 migration failed; V2.3 compatibility data remains intact.', error);
}

const builtInCatalogReport = {
  equipment: v5.catalog.importEquipmentModels(),
  planTemplates: v5.catalog.importPlanTemplates(),
};
const optionalReferenceDataPromise = initializeOptionalReferenceData();
const defaultProject = data.ensureDefaultProject();
if (!projectContext.currentProjectId || !data.get('projects', projectContext.currentProjectId)) {
  projectContext.currentProjectId = data.list('projects').find(item => item.status !== 'archived')?.id || defaultProject.id;
}

function getProject() {
  return data.get('projects', projectContext.currentProjectId) || data.ensureDefaultProject();
}

function context() {
  return { storage, data, projectContext, api, agent, v5, project: getProject(), migrationReport, schemaV5MigrationReport, builtInCatalogReport, optionalReferenceDataPromise, refresh: render };
}

function renderProjectSelector() {
  const select = document.getElementById('project-select');
  const projects = data.list('projects');
  select.innerHTML = projects.map(item =>
    `<option value="${item.id}" ${item.id === projectContext.currentProjectId ? 'selected' : ''}>${item.title}${item.status === 'archived' ? '（归档）' : ''}</option>`
  ).join('');
}

function render() {
  renderProjectSelector();
  const project = getProject();
  const [view, bind] = renderers[currentPage] || renderers.dashboard;
  document.getElementById('app').innerHTML = view({ ...context(), project });
  bind?.({ ...context(), project });

  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.page === currentPage);
  });
}

document.getElementById('nav').addEventListener('click', event => {
  const button = event.target.closest('[data-page]');
  if (!button) return;
  currentPage = button.dataset.page;
  location.hash = currentPage;
  render();
});

window.addEventListener('hashchange', () => {
  currentPage = location.hash.slice(1) || 'dashboard';
  render();
});

document.getElementById('project-select').addEventListener('change', event => {
  projectContext.currentProjectId = event.target.value;
  render();
});

const projectDialog = document.getElementById('project-dialog');
document.getElementById('new-project-btn').addEventListener('click', () => projectDialog.showModal());
const projectForm = document.getElementById('project-form');
const templateSelect = document.getElementById('project-template-select');
templateSelect.addEventListener('change', event => {
  const template = getProjectTemplate(event.target.value);
  document.getElementById('project-template-hint').textContent = template.description;
  for (const [name, value] of Object.entries(template.defaults || {})) {
    const field = projectForm.elements.namedItem(name);
    if (field && !field.value.trim()) field.value = value;
  }
});
projectForm.addEventListener('submit', event => {
  event.preventDefault();
  const value = formToObject(event.currentTarget);
  const templateId = value.templateId || 'blank';
  delete value.templateId;
  const template = getProjectTemplate(templateId);
  const project = data.create('projects', { ...template.defaults, ...value, templateId, status: 'active', defaultCurrency: 'CNY', timezone: 'Asia/Shanghai' });
  data.create('projectBriefs', {
    id: `brief-${project.id}`,
    projectId: project.id,
    shootingType: project.shootingType || '',
    goal: project.goal || '',
    theme: project.theme || project.title || '',
    style: project.style || '',
    mood: project.mood || '',
    locationIntent: project.location || '',
    dateIntent: project.date || '',
    deliverableTarget: project.deliverables || '',
    constraints: project.constraints || [],
    notes: project.brief || '',
  });
  const seeded = seedProjectTemplate(data, project, templateId);
  projectContext.currentProjectId = project.id;
  projectDialog.close();
  event.currentTarget.reset();
  document.getElementById('project-template-hint').textContent = getProjectTemplate('blank').description;
  toast(seeded.length ? `项目已创建，并生成 ${seeded.length} 项启动任务` : '项目已创建');
  render();
});

const settingsDialog = document.getElementById('settings-dialog');
document.getElementById('settings-btn').addEventListener('click', () => {
  const settings = storage.get('settings', {
    remoteEnabled: false,
    apiBase: 'https://photoatelier-v2-api.photomagic.workers.dev',
    syncToken: '',
  });
  document.getElementById('api-base-input').value = settings.apiBase || '';
  document.getElementById('sync-token-input').value = settings.syncToken || '';
  document.getElementById('remote-enabled-input').checked = Boolean(settings.remoteEnabled);
  settingsDialog.showModal();
});
document.getElementById('save-settings-btn').addEventListener('click', event => {
  event.preventDefault();
  storage.set('settings', {
    apiBase: document.getElementById('api-base-input').value.trim(),
    syncToken: document.getElementById('sync-token-input').value.trim(),
    remoteEnabled: document.getElementById('remote-enabled-input').checked,
  });
  settingsDialog.close();
  updateSyncState();
  toast('设置已保存');
});

document.getElementById('sync-btn').addEventListener('click', async () => {
  const syncButton = document.getElementById('sync-btn');
  try {
    syncButton.disabled = true;
    syncButton.textContent = '同步中…';
    const projectId = projectContext.currentProjectId;
    const summary = { created: 0, updated: 0, conflicts: 0, pulled: 0, deleted: 0, errors: 0 };
    const tombstones = data.listTombstones(projectId);
    for (const entity of SYNC_ENTITIES) {
      const deletions = tombstones.filter(item => item.entity === entity);
      if (deletions.length) {
        const result = await api.deleteEntity(entity, deletions.map(item => item.id));
        summary.deleted += result.deleted || 0;
        summary.errors += result.errors?.length || 0;
        if (!result.errors?.length) data.clearTombstones(deletions);
      }
    }
    for (const entity of SYNC_ENTITIES) {
      const records = entity === 'projects'
        ? data.list(entity, item => item.id === projectId)
        : data.listByProject(entity, projectId);
      if (records.length) {
        const result = await api.syncEntity(entity, records);
        summary.created += result.created || 0;
        summary.updated += result.updated || 0;
        summary.conflicts += result.conflicts?.length || 0;
        summary.errors += result.errors?.length || 0;
      }
      const remote = await api.listEntity(entity);
      const scoped = entity === 'projects'
        ? (remote.records || []).filter(item => item.id === projectId)
        : (remote.records || []).filter(item => item.projectId === projectId);
      const merged = data.mergeRemote(entity, scoped);
      summary.pulled += merged.inserted + merged.updated;
    }
    storage.set('lastSyncSummary', { ...summary, projectId, completedAt: new Date().toISOString() });
    render();
    toast(`同步完成：新建 ${summary.created}，更新 ${summary.updated}，拉取 ${summary.pulled}，删除 ${summary.deleted}${summary.conflicts ? `，冲突 ${summary.conflicts}` : ''}${summary.errors ? `，错误 ${summary.errors}` : ''}`);
  } catch (error) {
    toast(error.message === 'REMOTE_DISABLED' ? '当前为本地模式' : `同步失败：${error.message}`);
  } finally {
    syncButton.disabled = false;
    syncButton.textContent = '同步';
  }
});

async function updateSyncState() {
  const pill = document.getElementById('sync-state');
  const settings = storage.get('settings', { remoteEnabled: false });
  pill.className = 'status-pill';
  if (!settings.remoteEnabled) {
    pill.textContent = '本地模式';
    return;
  }
  pill.textContent = '检查后端…';
  try {
    await api.health();
    pill.textContent = '远端可用';
    pill.classList.add('badge-ok');
  } catch {
    pill.textContent = '远端不可用';
    pill.classList.add('badge-warn');
  }
}


const roleSelect = document.getElementById('workspace-role-select');
roleSelect.value = storage.get('workspaceRole', 'photographer');
roleSelect.addEventListener('change', event => {
  storage.set('workspaceRole', event.target.value);
  render();
});

function updateNetworkState() {
  const pill = document.getElementById('network-state');
  const online = navigator.onLine;
  pill.textContent = online ? '在线' : '离线可用';
  pill.className = `status-pill ${online ? 'badge-ok' : 'badge-warn'}`;
}
window.addEventListener('online', updateNetworkState);
window.addEventListener('offline', updateNetworkState);
updateNetworkState();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

projectContext.onChange(render);
updateSyncState();
render();


async function initializeOptionalReferenceData() {
  try {
    const response = await fetch('./data/v5-reference-import-plan.json', { cache: 'no-store' });
    if (!response.ok) return { installed: false, reason: 'REFERENCE_DATA_ADDON_NOT_INSTALLED', status: response.status };
    const referenceImportPlan = await response.json();
    return { installed: true, ...v5.realDataBootstrap.bootstrap({ referenceImportPlan }) };
  } catch (error) {
    console.info('PhotoAtelier optional reference data add-on is not available.', error?.message || error);
    return { installed: false, reason: 'REFERENCE_DATA_ADDON_UNAVAILABLE', error: error?.message || String(error) };
  }
}

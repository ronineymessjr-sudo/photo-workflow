const ROOT = document.getElementById('v3PlanningFlow');

let imageInputs = [];

function app() {
  return window.PhotoAtelierV5?.ready ? window.PhotoAtelierV5.application : null;
}

function field(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

/** Resolve the V5 project ID from the currently-selected legacy plan.
 *  Each legacy plan gets its own isolated V5 workspace. If no legacy plan
 *  is actually opened, the V3 reference-first flow is gated; the user can
 *  still fall back to the classic deterministic generator. */
function currentProjectId() {
  const planId = window.currentPlanId;
  if (planId) return `legacy-${planId}`;
  return null;
}

function brief() {
  return {
    theme: field('f-theme'),
    style: document.getElementById('f-style')?.value || '',
    mood: field('f-mood'),
    locationIntent: field('f-scene'),
    goal: field('f-theme') || '摄影方案',
    shootingType: '摄影创作',
    dateIntent: '',
    deliverableTarget: '',
    constraints: field('f-extra') ? [field('f-extra')] : [],
    notes: field('f-model'),
  };
}

function ensureProject(application) {
  const projectId = currentProjectId();
  if (!projectId) return null;
  let project = application.data.get('projects', projectId);
  if (!project) {
    project = application.data.create('projects', {
      id: projectId,
      title: brief().theme || '当前摄影方案',
      status: 'active',
      defaultCurrency: 'CNY',
      timezone: 'Asia/Shanghai',
    });
  } else {
    project = application.data.update('projects', projectId, { title: brief().theme || project.title });
  }

  const existingBrief = application.data.list('projectBriefs', item => item.projectId === projectId)[0];
  if (existingBrief) application.data.update('projectBriefs', existingBrief.id, brief());
  else application.data.create('projectBriefs', { id: `${projectId}-brief`, projectId, ...brief() });
  return project;
}

function syncRealReferences(application) {
  const projectId = currentProjectId();
  if (!projectId) return [];
  return imageInputs.map(image => {
    const result = application.references.ingestAsset({
      sourceType: 'browser-upload',
      sourceId: image.id,
      sourceUrl: image.data,
      previewUrl: image.data,
      title: image.name || '已上传参考图',
      tags: [field('f-theme'), document.getElementById('f-style')?.value, field('f-mood')].filter(Boolean),
      assetKind: 'real_photo',
      synthetic: false,
      verificationStatus: 'private',
    });
    application.references.selectForProject({ projectId, referenceAssetId: result.asset.id, role: 'visual-direction' });
    return result.asset;
  });
}

function workspace(application) {
  const projectId = currentProjectId();
  if (!projectId) return { planning: { creativeDirections: [] }, analysis: { latestVisualDNA: null } };
  let planning = { creativeDirections: [] };
  let analysis = { latestVisualDNA: null };
  try { planning = application.queries.planningWorkspace.get(projectId); } catch (_) {}
  try { analysis = application.queries.visualAnalysisWorkspace.get(projectId); } catch (_) {}
  return { planning, analysis };
}

/** Write V3 shot drafts into the legacy candidate plan so that the user
 *  can review them via the existing confirmCandidatePlan flow.
 *  The shots are stored as a draft overlay — they only become the
 *  canonical shot list when the user confirms the plan. */
function injectV3ShotsIntoLegacyPlan(shots, selectedDirection) {
  const planId = window.currentPlanId;
  if (!planId) return;
  // Read the legacy plan from localStorage
  const plans = window.getPlans ? window.getPlans() : JSON.parse(localStorage.getItem('pw_plans') || '[]');
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  // Map V3 shots to the legacy shot schema used by generateShotList / getRenderableShotList
  const legacyShots = shots.map(shot => ({
    name: shot.title || shot.name || '',
    description: shot.description || shot.title || '',
    shotSize: shot.shotSize || '',
    cameraAngle: shot.cameraAngle || shot.angle || '',
    composition: shot.composition || '',
    lighting: shot.lighting || (shot.structuredLighting ? [shot.structuredLighting.main, shot.structuredLighting.direction].filter(Boolean).join('，') : ''),
    focalLength: shot.focalLength || '',
    lens: shot.focalLength || '',
    mood: shot.emotion || shot.mood || '',
    props: shot.props || '',
    scene: shot.scene || '',
    priority: shot.priority || '推荐',
    notes: shot.whyThisShot || '',
    visualMatchScore: shot.visualMatchScore || null,
    referenceAssetId: shot.referenceAssetId || null,
    _v3: true,  // marker so the UI can distinguish V3-originated shots
  }));

  // Store as the plan's shot overlay — getRenderableShotList checks localStorage first
  localStorage.setItem(`pa_shots_${planId}`, JSON.stringify(legacyShots));

  // Also update the plan object's result.shots for the confirmation flow
  if (!plan.result) plan.result = {};
  plan.result.shots = legacyShots;
  plan.result.v3Draft = true;  // flag: these are V3 draft shots pending confirmation

  // Keep the selected creative direction as supporting metadata after the storyboard,
  // not as the primary screen.
  if (selectedDirection) {
    plan.result.creativeDirection = {
      id: selectedDirection.id,
      title: selectedDirection.title,
      summary: selectedDirection.summary || selectedDirection.description || '',
      _v3: true,
    };
  }

  // Persist the updated plan back to localStorage
  if (window.savePlans) {
    window.savePlans(plans);
  } else {
    localStorage.setItem('pw_plans', JSON.stringify(plans));
  }

  // Re-render the plan output so the user can see the updated shots
  if (window.currentPlanData && window.currentPlanData.id === planId) {
    window.currentPlanData = plan;
    const outCnt = document.getElementById('outCnt');
    if (outCnt && window.renderPlanContent) {
      outCnt.innerHTML = window.renderPlanContent(plan);
    }
  }
}

function render() {
  if (!ROOT) return;
  const application = app();
  const projectId = currentProjectId();
  const hasRealReferences = imageInputs.length > 0;

  if (!application) {
    ROOT.innerHTML = '<p class="v3-flow-note">V3 参考图流程将在本地数据引擎就绪后启用；原有方案生成仍可使用。</p>';
    return;
  }

  if (!projectId) {
    ROOT.innerHTML = `
      <details class="v3-reference-flow">
        <summary>参考图优先流程 <small>可选：用真实参考图驱动镜头设计</small></summary>
        <div class="v3-flow-body">
          <p class="v3-flow-note">请先打开或创建一个方案，以便将 V3 镜头草稿关联到当前候选方案。</p>
          <button type="button" class="btn btn-s btn-sm" data-v3-classic>按 Brief 使用经典确定性生成</button>
        </div>
      </details>`;
    ROOT.querySelector('[data-v3-classic]')?.addEventListener('click', () => document.getElementById('briefForm')?.requestSubmit());
    return;
  }

  const { planning, analysis } = workspace(application);
  const visualDNA = analysis.latestVisualDNA;
  const selected = planning.creativeDirections.find(item => item.status === 'selected');
  const candidates = planning.creativeDirections.filter(item => item.status === 'candidate');

  ROOT.innerHTML = `
    <details class="v3-reference-flow">
      <summary>参考图优先流程 <small>可选：用真实参考图驱动镜头设计</small></summary>
      <div class="v3-flow-body">
        <p class="v3-flow-note">${hasRealReferences ? `已选择 ${imageInputs.length} 张真实参考图。` : '未选择参考图：不会把概念或默认内容标为真实实拍参考。'}</p>
        ${!hasRealReferences ? '<button type="button" class="btn btn-s btn-sm" data-v3-classic>按 Brief 使用经典确定性生成</button>' : ''}
        ${hasRealReferences && !visualDNA ? '<button type="button" class="btn btn-s btn-sm" data-v3-analyze>分析真实参考图</button>' : ''}
        ${visualDNA ? `<p class="v3-flow-status">VisualDNA 已建立：${escape(visualDNA.compositionAnalysis?.description || '视觉分析完成')}</p>` : ''}
        ${visualDNA && !selected ? '<button type="button" class="btn btn-s btn-sm" data-v3-directions>生成 3 个创意方向</button>' : ''}
        ${candidates.length ? `<div class="v3-direction-list">${candidates.map(direction => `<button type="button" class="btn btn-s btn-sm" data-v3-select="${escape(direction.id)}">${escape(direction.title)}</button>`).join('')}</div>` : ''}
        ${selected ? `<p class="v3-flow-status">已选方向：${escape(selected.title)}</p><label class="v3-scale">镜头规模 <select data-v3-scale><option value="simple">精简 6 镜</option><option value="standard" selected>标准 12 镜</option><option value="comprehensive">完整 20 镜</option></select></label><button type="button" class="btn btn-p btn-sm" data-v3-design>生成 V3 镜头草稿</button>` : ''}
        <div class="v3-flow-result" data-v3-result></div>
      </div>
    </details>`;

  ROOT.querySelector('[data-v3-classic]')?.addEventListener('click', () => document.getElementById('briefForm')?.requestSubmit());
  ROOT.querySelector('[data-v3-analyze]')?.addEventListener('click', async event => {
    await run(event.currentTarget, async () => {
      ensureProject(application);
      syncRealReferences(application);
      await application.visualAnalysis.analyze({ projectId });
      render();
    });
  });
  ROOT.querySelector('[data-v3-directions]')?.addEventListener('click', async event => {
    await run(event.currentTarget, async () => {
      const current = workspace(application);
      await application.creativeDirection.generateDirections({ projectId, visualDNAId: current.analysis.latestVisualDNA.id });
      render();
    });
  });
  ROOT.querySelectorAll('[data-v3-select]').forEach(button => button.addEventListener('click', async event => {
    await run(event.currentTarget, async () => {
      await application.creativeDirection.selectDirection({ id: event.currentTarget.dataset.v3Select, projectId });
      render();
    });
  }));
  ROOT.querySelector('[data-v3-design]')?.addEventListener('click', async event => {
    await run(event.currentTarget, async () => {
      const current = workspace(application);
      const selectedDirection = current.planning.creativeDirections.find(item => item.status === 'selected');
      const scale = ROOT.querySelector('[data-v3-scale]')?.value || 'standard';
      const result = await application.shotDesign.designShots({
        projectId,
        creativeDirectionId: selectedDirection.id,
        visualDNAId: current.analysis.latestVisualDNA.id,
        shootingScale: scale,
      });
      // Inject V3 shots into the legacy candidate plan (draft only — requires user confirmation)
      injectV3ShotsIntoLegacyPlan(result.shots, selectedDirection);
      const count = result.shots.length;
      ROOT.querySelector('[data-v3-result]').innerHTML =
        `<p class="v3-flow-status">已生成 ${count} 个 V3 镜头草稿并写入当前方案。</p>` +
        `<p class="v3-flow-note">草稿已写入方案，确认采用后正式生效。也可以在下方方案区查看。</p>`;
    });
  });
}

async function run(button, action) {
  const label = button.textContent;
  button.disabled = true;
  try { await action(); }
  catch (error) { window.toast?.(error.message || 'V3 流程执行失败', 'er'); }
  finally { button.disabled = false; button.textContent = label; }
}

function escape(value) {
  const node = document.createElement('div');
  node.textContent = String(value ?? '');
  return node.innerHTML;
}

window.addEventListener('photoatelier:legacy-reference-images', event => {
  imageInputs = Array.isArray(event.detail?.images) ? event.detail.images : [];
  render();
});
window.addEventListener('photoatelier:v5-ready', render);
render();

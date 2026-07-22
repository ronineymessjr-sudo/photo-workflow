const PROMPT_VERSION = 'photoatelier-planner-v1';
const SCHEMA_VERSION = 'photoatelier.agent-plan.v1';
const RUN_PREFIX = 'agent-run-';

export async function createAgentDraft(projectId, options, deps) {
  if (!projectId) throw new Error('project_id is required');
  const startedAt = new Date().toISOString();
  const runId = `${RUN_PREFIX}${crypto.randomUUID()}`;
  const traceId = `trace-${crypto.randomUUID()}`;
  const planId = `agent-plan-${runId.slice(RUN_PREFIX.length)}`;
  let generationMode = 'model';
  let provider = deps.env.AGENT_ENDPOINT ? 'configured-agent' : 'local-rule-fallback';
  let model = deps.env.AGENT_MODEL || (deps.env.AGENT_ENDPOINT ? 'configured' : 'deterministic-v1');

  await deps.writeMessage(agentMessage(projectId, runId, traceId, 'agent_started', 'info', 'Agent started building a plan draft.'));

  try {
    const context = await buildProjectContext(projectId, options || {}, deps);
    let output;
    try {
      output = deps.env.AGENT_ENDPOINT
        ? await callPlanningModel(context, options || {}, deps.env)
        : buildFallbackPlan(context);
      if (!deps.env.AGENT_ENDPOINT) generationMode = 'fallback';
    } catch (error) {
      generationMode = 'fallback';
      provider = 'local-rule-fallback';
      model = 'deterministic-v1';
      output = buildFallbackPlan(context);
      await deps.writeMessage(agentMessage(projectId, runId, traceId, 'agent_fallback', 'warning', `Model failed; local fallback used: ${error.message}`));
    }

    const normalized = normalizePlan(output);
    const schemaValidation = validateAgentPlan(normalized);
    if (!schemaValidation.valid) throw new Error(`Schema validation failed: ${schemaValidation.errors.join('; ')}`);
    const ruleValidation = validatePhotographyRules(normalized, context);
    const completedAt = new Date().toISOString();
    const draft = {
      id: planId,
      projectId,
      concept: normalized.concept,
      rationale: normalized.rationale || '',
      generationMode,
      visualDirection: normalized.visual_direction,
      equipment: normalized.equipment,
      risks: normalized.risks,
      status: 'draft',
      agentRunId: runId,
      agentStatus: 'awaiting_approval',
      provider,
      model,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      contextSnapshot: context,
      contextSnapshotJson: JSON.stringify(context),
      output: normalized,
      outputJson: JSON.stringify(normalized),
      validation: { schema: schemaValidation, photography: ruleValidation },
      validationJson: JSON.stringify({ schema: schemaValidation, photography: ruleValidation }),
      userApproved: false,
      parentPlanId: options.parent_plan_id || '',
      traceId,
      startedAt,
      completedAt,
      createdAt: startedAt,
      updatedAt: completedAt
    };
    await deps.sync('plans', [draft]);
    await deps.writeMessage(agentMessage(projectId, runId, traceId, 'agent_awaiting_approval', ruleValidation.status === 'fail' ? 'error' : 'info', `Draft ready with ${normalized.shots.length} shots. Approval is required before formal records are written.`));
    return { run_id: runId, status: 'awaiting_approval', plan: draft, validation: draft.validation, sources: normalized.sources || [] };
  } catch (error) {
    const failedAt = new Date().toISOString();
    const failed = {
      id: planId, projectId, concept: 'Agent generation failed', generationMode, status: 'draft',
      agentRunId: runId, agentStatus: 'failed', provider, model, promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION, userApproved: false, traceId, error: { message: error.message },
      startedAt, completedAt: failedAt, createdAt: startedAt, updatedAt: failedAt
    };
    await deps.sync('plans', [failed]);
    await deps.writeMessage(agentMessage(projectId, runId, traceId, 'agent_failed', 'error', error.message));
    throw error;
  }
}

export async function getAgentRun(runId, deps) {
  const draft = await findRun(runId, deps);
  if (!draft) return null;
  return runResponse(draft);
}

export async function regenerateAgentRun(runId, instruction, deps) {
  const existing = await findRun(runId, deps);
  if (!existing) throw new Error('Agent run not found');
  if (existing.userApproved) throw new Error('Approved runs cannot be regenerated');
  const context = await buildProjectContext(existing.projectId, { instruction }, deps);
  let output;
  let generationMode = 'model';
  try {
    output = deps.env.AGENT_ENDPOINT
      ? await callPlanningModel(context, { instruction, previous_plan: existing.output }, deps.env)
      : buildFallbackPlan(context, instruction);
    if (!deps.env.AGENT_ENDPOINT) generationMode = 'fallback';
  } catch (error) {
    generationMode = 'fallback';
    output = buildFallbackPlan(context, instruction);
    await deps.writeMessage(agentMessage(existing.projectId, runId, existing.traceId, 'agent_fallback', 'warning', `Regeneration used fallback: ${error.message}`));
  }
  const normalized = normalizePlan(output);
  const schemaValidation = validateAgentPlan(normalized);
  if (!schemaValidation.valid) throw new Error(`Schema validation failed: ${schemaValidation.errors.join('; ')}`);
  const ruleValidation = validatePhotographyRules(normalized, context);
  const updated = {
    ...existing,
    generationMode,
    agentStatus: 'awaiting_approval',
    contextSnapshot: context,
    contextSnapshotJson: JSON.stringify(context),
    output: normalized,
    outputJson: JSON.stringify(normalized),
    validation: { schema: schemaValidation, photography: ruleValidation },
    validationJson: JSON.stringify({ schema: schemaValidation, photography: ruleValidation }),
    regenerationInstruction: instruction || '',
    updatedAt: new Date().toISOString()
  };
  await deps.sync('plans', [updated]);
  return runResponse(updated);
}

export async function approveAgentRun(runId, editedPlan, deps) {
  const draft = await findRun(runId, deps);
  if (!draft) throw new Error('Agent run not found');
  if (draft.userApproved && draft.agentStatus === 'completed') {
    return { ...runResponse(draft), idempotent: true, written: draft.writtenEntityIds || {} };
  }
  if (!['awaiting_approval', 'approved', 'writing'].includes(draft.agentStatus)) throw new Error(`Run cannot be approved from status ${draft.agentStatus}`);

  const output = normalizePlan(editedPlan || draft.output);
  const schemaValidation = validateAgentPlan(output);
  if (!schemaValidation.valid) throw new Error(`Schema validation failed: ${schemaValidation.errors.join('; ')}`);
  const ruleValidation = validatePhotographyRules(output, draft.contextSnapshot || { project: {} });
  if (ruleValidation.status === 'fail') throw new Error(`Photography validation failed: ${ruleValidation.issues.filter(item => item.severity === 'error').map(item => item.message).join('; ')}`);

  const now = new Date().toISOString();
  const plan = {
    ...draft,
    concept: output.concept,
    rationale: output.rationale || '',
    visualDirection: output.visual_direction,
    equipment: output.equipment,
    risks: output.risks,
    output,
    outputJson: JSON.stringify(output),
    validation: { schema: schemaValidation, photography: ruleValidation },
    validationJson: JSON.stringify({ schema: schemaValidation, photography: ruleValidation }),
    status: 'approved',
    agentStatus: 'writing',
    userApproved: true,
    approvedAt: draft.approvedAt || now,
    updatedAt: now
  };
  await deps.sync('plans', [plan]);

  const shots = output.shots.map((shot, index) => ({
    id: `${plan.id}-shot-${index + 1}`,
    projectId: plan.projectId,
    planId: plan.id,
    sequence: index + 1,
    scene: shot.scene,
    shotSize: shot.shot_size,
    focalLength: shot.focal_length,
    aperture: shot.aperture || '',
    shutter: shot.shutter || '',
    iso: shot.iso == null ? '' : shot.iso,
    whiteBalance: shot.white_balance || '',
    cameraAngle: shot.camera_angle || '',
    composition: shot.composition,
    lighting: shot.lighting,
    pose: shot.pose,
    subjectAction: shot.subject_action || '',
    durationMinutes: shot.duration_minutes || 5,
    priority: shot.priority,
    fallback: shot.fallback || '',
    referenceIds: shot.reference_ids || [],
    generatedByAgent: true,
    createdAt: plan.approvedAt,
    updatedAt: now
  }));
  const tasks = output.tasks.map((task, index) => ({
    ...task,
    id: `${plan.id}-task-${index + 1}`,
    projectId: plan.projectId,
    planId: plan.id,
    phase: task.phase || 'shooting',
    title: task.title || `Task ${index + 1}`,
    status: task.status || 'todo',
    generatedByAgent: true,
    createdAt: plan.approvedAt,
    updatedAt: now
  }));
  const luts = output.lut_suggestion ? [{
    ...output.lut_suggestion,
    id: `${plan.id}-lut-1`,
    projectId: plan.projectId,
    planId: plan.id,
    name: output.lut_suggestion.name || 'Agent LUT suggestion',
    inputColorSpace: output.lut_suggestion.input_color_space || 'Rec.709',
    style: output.lut_suggestion.output_style || output.lut_suggestion.style || '',
    strength: Number(output.lut_suggestion.recommended_strength || output.lut_suggestion.strength || 35),
    generatedByAgent: true,
    createdAt: plan.approvedAt,
    updatedAt: now
  }] : [];

  if (shots.length) await deps.sync('shots', shots);
  if (tasks.length) await deps.sync('tasks', tasks);
  if (luts.length) await deps.sync('luts', luts);

  const completedAt = new Date().toISOString();
  const writtenEntityIds = { plan: plan.id, shots: shots.map(item => item.id), tasks: tasks.map(item => item.id), luts: luts.map(item => item.id) };
  const completed = { ...plan, agentStatus: 'completed', completedAt, writtenEntityIds, updatedAt: completedAt };
  await deps.sync('plans', [completed]);
  await deps.writeMessage(agentMessage(plan.projectId, runId, plan.traceId, 'agent_completed', 'info', `Approved plan written: ${shots.length} shots, ${tasks.length} tasks, ${luts.length} LUTs.`));
  return { ...runResponse(completed), idempotent: false, written: writtenEntityIds };
}

export async function buildProjectContext(projectId, options, deps) {
  const [projects, references, plans, reviews] = await Promise.all([
    deps.list('projects'), deps.list('references'), deps.list('plans'), deps.list('reviews')
  ]);
  const project = projects.find(item => String(item.id) === String(projectId));
  if (!project) throw new Error('Project not found');
  const projectReferences = references
    .filter(item => String(item.projectId) === String(projectId) && !['rejected', 'invalid'].includes(item.validationStatus || item.verificationStatus))
    .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0))
    .slice(0, 30);
  const projectPlans = plans
    .filter(item => String(item.projectId) === String(projectId) && item.agentStatus !== 'failed')
    .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
  const historicalReviews = reviews
    .filter(item => String(item.projectId) === String(projectId))
    .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0))
    .slice(0, 10);
  return {
    project,
    references: projectReferences.map(compactReference),
    latest_plan: projectPlans[0] || null,
    equipment: asArray(project.equipment || project.equipmentJson),
    constraints: asArray(project.constraints),
    location: { name: project.location || '', latitude: project.latitude || null, longitude: project.longitude || null },
    weather: null,
    sunlight: null,
    uploaded_images: [],
    historical_reviews: historicalReviews.map(compactReview),
    user_preferences: options.user_preferences || {}
  };
}

export function validateAgentPlan(plan) {
  const errors = [];
  const allowedTop = new Set(['concept', 'rationale', 'visual_direction', 'equipment', 'shots', 'tasks', 'lut_suggestion', 'risks', 'sources']);
  Object.keys(plan || {}).forEach(key => { if (!allowedTop.has(key)) errors.push(`Unexpected property: ${key}`); });
  if (!plan || typeof plan !== 'object') return { valid: false, errors: ['Plan must be an object'] };
  if (!String(plan.concept || '').trim()) errors.push('concept is required');
  if (!isObject(plan.visual_direction)) errors.push('visual_direction must be an object');
  if (!Array.isArray(plan.equipment) || plan.equipment.some(item => typeof item !== 'string')) errors.push('equipment must be a string array');
  if (!Array.isArray(plan.shots) || !plan.shots.length) errors.push('shots must contain at least one item');
  if (!Array.isArray(plan.tasks)) errors.push('tasks must be an array');
  if (!Array.isArray(plan.risks) || plan.risks.some(item => typeof item !== 'string')) errors.push('risks must be a string array');
  (plan.shots || []).forEach((shot, index) => {
    const required = ['sequence', 'scene', 'shot_size', 'focal_length', 'composition', 'lighting', 'pose', 'priority'];
    required.forEach(key => { if (shot[key] == null || shot[key] === '') errors.push(`shots[${index}].${key} is required`); });
    if (!Number.isInteger(shot.sequence) || shot.sequence < 1) errors.push(`shots[${index}].sequence must be a positive integer`);
    if (shot.duration_minutes != null && (!Number.isInteger(shot.duration_minutes) || shot.duration_minutes < 1)) errors.push(`shots[${index}].duration_minutes must be a positive integer`);
  });
  return { valid: errors.length === 0, errors };
}

export function validatePhotographyRules(plan, context) {
  const issues = [];
  const sequences = plan.shots.map(shot => shot.sequence);
  sequences.forEach((value, index) => {
    if (value !== index + 1) issues.push({ code: 'SHOT_SEQUENCE', severity: 'error', shot: value, message: 'Shot sequence must be continuous and start at 1.' });
  });
  plan.shots.forEach(shot => {
    const focal = numberFrom(shot.focal_length);
    const shutter = shutterDenominator(shot.shutter);
    if (focal && shutter && shutter < focal) issues.push({ code: 'HANDHELD_SHUTTER', severity: 'warning', shot: shot.sequence, message: `1/${shutter}s may be too slow for ${focal}mm handheld shooting.` });
    if (/run|jump|walk|motion|跑|跳|走|运动/i.test(`${shot.subject_action || ''} ${shot.pose || ''}`) && shutter && shutter < 250) {
      issues.push({ code: 'ACTION_SHUTTER', severity: 'warning', shot: shot.sequence, message: 'Moving subjects normally need 1/250s or faster.' });
    }
    if (!shot.fallback) issues.push({ code: 'SHOT_FALLBACK', severity: 'warning', shot: shot.sequence, message: 'Add an executable fallback for this shot.' });
  });
  const duration = plan.shots.reduce((total, shot) => total + Number(shot.duration_minutes || 0), 0);
  if (duration <= 0) issues.push({ code: 'DURATION_MISSING', severity: 'warning', message: 'Shot duration is missing.' });
  if ((context.project?.peopleCount || context.project?.people_count || 1) > 1 && plan.shots.some(shot => apertureNumber(shot.aperture) && apertureNumber(shot.aperture) < 2.8)) {
    issues.push({ code: 'GROUP_DEPTH_OF_FIELD', severity: 'warning', message: 'Aperture below f/2.8 may not keep a group in focus.' });
  }
  return { status: issues.some(item => item.severity === 'error') ? 'fail' : issues.length ? 'warning' : 'pass', issues, auto_fixes: [] };
}

function normalizePlan(input) {
  const raw = input?.plan || input || {};
  const shots = (raw.shots || []).map((shot, index) => ({
    sequence: Number(shot.sequence || index + 1),
    scene: String(shot.scene || shot.name || ''),
    shot_size: String(shot.shot_size || shot.shotSize || shot.size || ''),
    focal_length: String(shot.focal_length || shot.focalLength || shot.focal || ''),
    ...(shot.aperture ? { aperture: String(shot.aperture) } : {}),
    ...(shot.shutter ? { shutter: String(shot.shutter) } : {}),
    ...(shot.iso != null ? { iso: shot.iso } : {}),
    ...(shot.white_balance || shot.whiteBalance ? { white_balance: String(shot.white_balance || shot.whiteBalance) } : {}),
    ...(shot.camera_angle || shot.cameraAngle ? { camera_angle: String(shot.camera_angle || shot.cameraAngle) } : {}),
    composition: String(shot.composition || ''),
    lighting: String(shot.lighting || ''),
    pose: String(shot.pose || ''),
    ...(shot.subject_action || shot.subjectAction ? { subject_action: String(shot.subject_action || shot.subjectAction) } : {}),
    duration_minutes: Math.max(1, Number(shot.duration_minutes || shot.durationMinutes || 5)),
    priority: String(shot.priority || 'recommended'),
    fallback: String(shot.fallback || ''),
    reference_ids: asArray(shot.reference_ids || shot.referenceIds).map(String),
    sources: asArray(shot.sources).map(String)
  }));
  return {
    concept: String(raw.concept || raw.title || ''),
    rationale: String(raw.rationale || ''),
    visual_direction: isObject(raw.visual_direction) ? raw.visual_direction : (isObject(raw.visualDirection) ? raw.visualDirection : {}),
    equipment: asArray(raw.equipment).map(item => typeof item === 'string' ? item : item.name || JSON.stringify(item)),
    shots,
    tasks: asArray(raw.tasks),
    lut_suggestion: raw.lut_suggestion || raw.lutSuggestion || null,
    risks: asArray(raw.risks).map(String),
    sources: asArray(raw.sources)
  };
}

async function callPlanningModel(context, options, env) {
  const response = await fetch(env.AGENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(env.AGENT_API_KEY ? { Authorization: `Bearer ${env.AGENT_API_KEY}` } : {}) },
    body: JSON.stringify({ prompt_version: PROMPT_VERSION, schema_version: SCHEMA_VERSION, context, options })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Agent endpoint failed: ${response.status}`);
  return payload.plan || payload;
}

function buildFallbackPlan(context, instruction) {
  const project = context.project;
  const style = project.style || 'clean cinematic';
  const location = project.location || 'selected location';
  const referenceIds = context.references.slice(0, 3).map(item => String(item.id));
  const knowledge = context.user_preferences?.photography_knowledge || {};
  const knowledgeSources = Array.isArray(knowledge.sources) ? knowledge.sources.slice(0, 8) : [];
  const knowledgeIds = knowledgeSources.map(item => String(item.id)).filter(Boolean);
  const profile = knowledge.profile || '';
  const guidance = knowledge.guidance || {};
  const fresh = profile === 'fresh-portrait';
  const hanfu = profile === 'hanfu-garden';
  const primaryPose = hanfu ? 'keep an S-curve, hold a flower branch, and look toward the subject' : fresh ? 'shift weight to the back foot and look away from the camera' : 'turn the body 30 degrees and look back';
  const motionPose = hanfu ? 'slowly turn the head in a corridor, with a fan or sleeve as an accent' : fresh ? 'walk slowly, then turn back on the marked position' : 'enter the scene naturally';
  const detailPose = hanfu ? 'relax the fingers around a round fan and leave part of the face visible' : fresh ? 'slowly move the hand through the hair or interact with a prop' : 'eyes slightly away from camera';
  const knowledgeSourceTypes = knowledgeIds.length ? ['knowledge'] : [];
  return {
    concept: `${project.title || 'Photography project'} - executable draft`,
    rationale: `Built from project constraints, selected local photography knowledge, and verified local references.${instruction ? ` Regeneration note: ${instruction}` : ''}`,
    visual_direction: { style, location, lighting: guidance.lightingSummary || 'Use available light first, with reflector or small LED as fallback.', composition: guidance.sceneSummary || 'Build the scene before moving to the portrait.' },
    equipment: context.equipment.length ? context.equipment.map(String) : ['camera body', '35mm or 50mm lens', '85mm lens', 'reflector', 'spare batteries and cards'],
    shots: [
      { sequence: 1, scene: 'Environment establishing shot', shot_size: 'wide', focal_length: '35mm', aperture: 'f/4', shutter: '1/250', iso: 400, composition: hanfu ? 'foreground framing with garden depth' : 'rule of thirds', lighting: guidance.lightingSummary || 'available side light', pose: motionPose, subject_action: 'walk slowly', duration_minutes: 10, priority: 'must-have', fallback: 'tighten the frame and remove distracting background', reference_ids: referenceIds, sources: ['project', ...(referenceIds.length ? ['reference'] : []), ...knowledgeSourceTypes, 'rule'] },
      { sequence: 2, scene: 'Primary portrait', shot_size: 'medium', focal_length: '85mm', aperture: 'f/2.8', shutter: '1/250', iso: 400, composition: hanfu ? 'portrait framed by corridor lines' : 'negative space', lighting: guidance.lightingSummary || 'soft side light', pose: primaryPose, subject_action: 'hold still', duration_minutes: 12, priority: 'must-have', fallback: 'use 50mm and move closer to the light', reference_ids: referenceIds, sources: ['project', ...knowledgeSourceTypes, 'rule'] },
      { sequence: 3, scene: 'Emotion and detail', shot_size: 'close-up', focal_length: '85mm', aperture: 'f/2.8', shutter: '1/320', iso: 500, composition: 'centered detail', lighting: 'soft frontal light', pose: detailPose, subject_action: 'small hand movement', duration_minutes: 8, priority: 'recommended', fallback: 'photograph hands, clothing, or props', reference_ids: referenceIds, sources: ['project', ...knowledgeSourceTypes, 'rule'] }
    ],
    tasks: [
      { phase: 'preproduction', title: 'Confirm location, people, equipment, and access constraints', status: 'todo', priority: 'high' },
      { phase: 'shooting', title: 'Complete all must-have shots before optional variations', status: 'todo', priority: 'high' },
      { phase: 'postproduction', title: 'Select, color grade, export, and record review notes', status: 'todo', priority: 'medium' }
    ],
    lut_suggestion: { name: 'Clean Neutral', input_color_space: 'Rec.709', output_style: style, recommended_strength: 35, notes: 'Protect skin tone and keep a neutral fallback.' },
    risks: ['weather or access changes', 'crowd and background clutter', 'light direction changes', 'battery and storage capacity', ...(knowledge.warnings || [])],
    sources: [{ type: 'project', id: project.id }, ...context.references.slice(0, 3).map(item => ({ type: 'reference', id: item.id })), ...knowledgeSources.map(item => ({ type: 'knowledge', id: item.id, grounding_status: item.groundingStatus || 'unknown' }))]
  };
}

async function findRun(runId, deps) {
  const plans = await deps.list('plans');
  return plans.find(item => item.agentRunId === runId) || null;
}

function runResponse(plan) {
  return {
    run_id: plan.agentRunId,
    project_id: plan.projectId,
    plan_id: plan.id,
    status: plan.agentStatus,
    prompt_version: plan.promptVersion,
    schema_version: plan.schemaVersion,
    provider: plan.provider,
    model: plan.model,
    trace_id: plan.traceId,
    started_at: plan.startedAt,
    completed_at: plan.completedAt || null,
    plan,
    validation: plan.validation || null,
    error: plan.error || null
  };
}

function agentMessage(projectId, runId, traceId, type, severity, content) {
  const now = new Date().toISOString();
  return {
    id: `message-${type}-${runId}`,
    projectId,
    type,
    severity,
    status: severity === 'error' ? 'new' : 'completed',
    relatedEntity: 'plans',
    relatedId: runId,
    traceId,
    content,
    metadataJson: JSON.stringify({ runId, traceId }),
    createdAt: now,
    updatedAt: now
  };
}

function compactReference(item) {
  return { id: item.id, title: item.title || '', category: item.category || '', styleTags: item.styleTags || [], sourcePlatform: item.sourcePlatform || '', sourceUrl: item.sourceUrl || '', notes: item.notes || '', validationStatus: item.validationStatus || item.verificationStatus || 'unknown' };
}

function compactReview(item) {
  return { id: item.id, planId: item.planId, planScore: item.planScore || 0, executionScore: item.executionScore || 0, successes: item.successes || '', failures: item.failures || '', nextActions: item.nextActions || '' };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [value]; } catch (_) { return value.split(/[,;\n]/).map(item => item.trim()).filter(Boolean); }
  }
  return [value];
}

function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function numberFrom(value) { const match = String(value || '').match(/\d+(?:\.\d+)?/); return match ? Number(match[0]) : 0; }
function shutterDenominator(value) { const match = String(value || '').match(/1\s*\/\s*(\d+)/); return match ? Number(match[1]) : 0; }
function apertureNumber(value) { const match = String(value || '').match(/f\s*\/?\s*(\d+(?:\.\d+)?)/i); return match ? Number(match[1]) : 0; }

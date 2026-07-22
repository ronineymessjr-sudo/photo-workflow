import { buildFallbackPlan } from '../data/photography-rules.js';

export class AgentService {
  constructor(apiClient, knowledgeService = null) {
    this.apiClient = apiClient;
    this.knowledgeService = knowledgeService;
  }

  async createDraft(project, references) {
    const knowledge = await this.knowledgeService?.buildForProject(project, references).catch(() => null);
    const options = knowledge ? { user_preferences: { photography_knowledge: knowledge } } : {};
    try {
      return await this.apiClient.createAgentDraft(project.id, options);
    } catch (error) {
      const output = normalizeFallback(buildFallbackPlan(project, references, knowledge));
      const now = new Date().toISOString();
      const runId = `local-agent-run-${Date.now()}`;
      return {
        run_id: runId,
        status: 'awaiting_approval',
        local: true,
        plan: {
          id: `local-agent-plan-${Date.now()}`,
          projectId: project.id,
          concept: output.concept,
          rationale: output.rationale,
          generationMode: 'local-rule-fallback',
          status: 'draft',
          planStatus: 'draft',
          executionStatus: 'unscheduled',
          deliveryStatus: 'not_started',
          agentRunId: runId,
          agentStatus: 'awaiting_approval',
          promptVersion: 'photoatelier-planner-v1',
          schemaVersion: 'photoatelier.agent-plan.v1',
          output,
          validation: { schema: { valid: true, errors: [] }, photography: { status: 'warning', issues: [{ code: 'REMOTE_FALLBACK', severity: 'warning', message: error.message }] } },
          userApproved: false,
          createdAt: now,
          updatedAt: now
        }
      };
    }
  }

  async regenerate(draft, instruction, project, references) {
    if (!draft.agentRunId?.startsWith('local-agent-run-')) {
      return this.apiClient.regenerateAgentRun(draft.agentRunId, instruction);
    }
    const knowledge = await this.knowledgeService?.buildForProject(project, references).catch(() => draft.output?.knowledgeContext || null);
    const output = normalizeFallback(buildFallbackPlan(project, references, knowledge));
    const plan = { ...draft, output, concept: output.concept, rationale: `${output.rationale || ''}${instruction ? ` 用户要求：${instruction}` : ''}`, updatedAt: new Date().toISOString() };
    return { run_id: draft.agentRunId, status: 'awaiting_approval', local: true, plan };
  }

  async approve(draft, editedPlan = null) {
    if (!draft.agentRunId?.startsWith('local-agent-run-')) {
      return this.apiClient.approveAgentRun(draft.agentRunId, editedPlan);
    }
    const output = editedPlan || draft.output;
    const now = new Date().toISOString();
    const plan = { ...draft, status: 'approved', planStatus: 'candidate', executionStatus: 'unscheduled', deliveryStatus: 'not_started', agentStatus: 'completed', userApproved: true, approvedAt: now, completedAt: now, output, updatedAt: now };
    const shots = output.shots.map((shot, index) => ({
      id: `${plan.id}-shot-${index + 1}`, projectId: plan.projectId, planId: plan.id, sequence: index + 1,
      scene: shot.scene, shotSize: shot.shot_size, focalLength: shot.focal_length, composition: shot.composition,
      lighting: shot.lighting, pose: shot.pose, fallback: shot.fallback || '', durationMinutes: shot.duration_minutes || 5,
      priority: shot.priority, captureStatus: 'planned', referenceIds: shot.reference_ids || [], generatedByAgent: true, createdAt: now, updatedAt: now
    }));
    const tasks = output.tasks.map((task, index) => ({ ...task, taskType: task.taskType || 'checklist', id: `${plan.id}-task-${index + 1}`, projectId: plan.projectId, planId: plan.id, generatedByAgent: true, createdAt: now, updatedAt: now }));
    const luts = output.lut_suggestion ? [{ ...output.lut_suggestion, id: `${plan.id}-lut-1`, projectId: plan.projectId, planId: plan.id, name: output.lut_suggestion.name || 'Agent LUT', generatedByAgent: true, createdAt: now, updatedAt: now }] : [];
    return { run_id: plan.agentRunId, status: 'completed', local: true, plan, localRecords: { shots, tasks, luts }, written: { plan: plan.id, shots: shots.map(item => item.id), tasks: tasks.map(item => item.id), luts: luts.map(item => item.id) } };
  }
}

function normalizeFallback(raw) {
  return {
    concept: raw.concept || raw.title || '本地摄影方案草稿',
    rationale: raw.rationale || raw.fallbackReason || '根据项目内容与本地摄影规则生成。',
    visual_direction: raw.visualDirection || raw.visual_direction || {},
    equipment: raw.equipment || [],
    shots: (raw.shots || []).map((shot, index) => ({
      sequence: index + 1,
      scene: shot.scene || shot.name || `镜头 ${index + 1}`,
      shot_size: shot.shotSize || shot.shot_size || shot.size || '中景',
      focal_length: shot.focalLength || shot.focal_length || shot.focal || '50mm',
      composition: shot.composition || '三分构图',
      lighting: shot.lighting || '自然侧光',
      pose: shot.pose || '自然站姿',
      duration_minutes: shot.durationMinutes || shot.duration_minutes || 5,
      priority: shot.priority || '推荐',
      fallback: shot.fallback || '缩小场景范围并简化背景',
      reference_ids: shot.referenceIds || shot.reference_ids || [],
      sources: shot.sources || ['project', 'rule']
    })),
    tasks: raw.tasks || [],
    lut_suggestion: raw.lutSuggestion || raw.lut_suggestion || null,
    risks: raw.risks || [],
    sources: raw.sources || []
  };
}

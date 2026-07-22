import { createEntity, updateEntity } from '../common/entity.js';
import { AppError, asAppError, invariant } from '../common/errors.js';
import { validatePlanGenerationOutput, validatePlanOutputAgainstContext } from '../contracts/validators.js';

export class PlanningService {
  constructor(repositories, gateways = {}) {
    this.repos = repositories;
    this.planningGateway = gateways.planningGateway || null;
    this.imageGateway = gateways.imageGateway || null;
  }

  async createGenerationRun(command) {
    const snapshot = this.repos.planningSnapshots.require(command.contextSnapshotId);
    invariant(snapshot.projectId === command.projectId, 'CONTEXT_PROJECT_MISMATCH', '方案上下文不属于当前项目');
    invariant(this.planningGateway?.createPlanDraft, 'PLANNING_GATEWAY_NOT_CONFIGURED', '尚未配置方案生成服务');
    let run = this.repos.generationRuns.create(createEntity('generation-run', {
      projectId: command.projectId,
      contextSnapshotId: snapshot.id,
      runType: command.runType || 'plan',
      provider: command.provider || this.planningGateway.provider || 'configured-provider',
      model: command.model || this.planningGateway.model || 'configured-model',
      promptVersion: command.promptVersion || 'v5.1',
      status: 'running',
      instruction: command.instruction || '',
      parentRunId: command.parentRunId || null,
      validation: null,
      error: null,
    }));
    try {
      const result = await this.planningGateway.createPlanDraft({
        contextSnapshot: snapshot,
        instruction: command.instruction || '',
        schemaVersion: 5,
      });
      const normalizedOutput = result?.normalizedOutput || result?.output || result;
      validatePlanOutputAgainstContext(normalizedOutput, snapshot);
      run = this.repos.generationRuns.save(updateEntity(run, {
        status: 'awaiting_approval',
        rawOutput: result?.rawOutput ?? result,
        normalizedOutput,
        validation: { ok: true, checkedAt: new Date().toISOString() },
        providerRequestId: result?.requestId || null,
      }));
      return { run, events: [{ type: 'GenerationRunCompleted', generationRunId: run.id, projectId: run.projectId }] };
    } catch (error) {
      const appError = asAppError(error, 'PLAN_GENERATION_FAILED');
      run = this.repos.generationRuns.save(updateEntity(run, {
        status: 'failed',
        validation: { ok: false, checkedAt: new Date().toISOString() },
        error: appError.toJSON(),
      }));
      throw appError;
    }
  }

  approveGenerationRun(command) {
    let run = this.repos.generationRuns.require(command.generationRunId);
    if (run.status === 'approved' && run.approvedPlanRevisionId) {
      return {
        run,
        plan: this.repos.plans.require(run.approvedPlanId),
        revision: this.repos.planRevisions.require(run.approvedPlanRevisionId),
        shots: this.repos.shots.list(item => item.planRevisionId === run.approvedPlanRevisionId),
        idempotent: true,
        events: [],
      };
    }
    invariant(run.status === 'awaiting_approval', 'GENERATION_RUN_NOT_APPROVABLE', '只有等待批准的生成结果可以转为正式方案', { status: run.status });
    const output = command.editedOutput || run.normalizedOutput;
    validatePlanOutputAgainstContext(output, this.repos.planningSnapshots.require(run.contextSnapshotId));
    const existingPlan = command.planId
      ? this.repos.plans.require(command.planId)
      : this.repos.plans.list(item => item.projectId === run.projectId && item.businessKey === `project:${run.projectId}:primary-plan`)[0];
    const plan = existingPlan || this.repos.plans.create(createEntity('plan', {
      projectId: run.projectId,
      businessKey: `project:${run.projectId}:primary-plan`,
      title: output.concept,
      planStatus: 'candidate',
      currentRevisionId: null,
      confirmedRevisionId: null,
      sourceGenerationRunIds: [],
    }));
    const previousRevisions = this.repos.planRevisions.list(item => item.planId === plan.id);
    const revisionNumber = previousRevisions.reduce((max, item) => Math.max(max, item.revisionNumber || 0), 0) + 1;
    const revision = this.repos.planRevisions.create(createEntity('plan-revision', {
      projectId: run.projectId,
      planId: plan.id,
      generationRunId: run.id,
      contextSnapshotId: run.contextSnapshotId,
      revisionNumber,
      status: 'candidate',
      concept: output.concept,
      rationale: output.rationale,
      visualDirection: output.visualDirection || {},
      preparationGuide: output.preparationGuide,
      knowledgeGuidance: output.knowledgeGuidance || [],
      verificationChecklist: output.verificationChecklist || [],
      postProductionGuidance: output.postProductionGuidance || [],
      expectedDeliverableCount: output.expectedDeliverableCount,
      mustHaveShotCount: output.mustHaveShotCount || output.shots.filter(item => item.priority === 'must').length,
      equipmentRecommendations: output.equipmentRecommendations || [],
      risks: output.risks || [],
      rawApprovedOutput: output,
    }));
    const shots = output.shots.map(shot => this.repos.shots.create(createEntity('shot', {
      projectId: run.projectId,
      planId: plan.id,
      planRevisionId: revision.id,
      sequence: shot.sequence,
      scene: shot.scene,
      shotSize: shot.shotSize,
      cameraAngle: shot.cameraAngle,
      composition: shot.composition,
      focalLength: shot.focalLength,
      lighting: shot.lighting,
      poseGuidance: shot.poseGuidance,
      subjectAction: shot.subjectAction || '',
      variationCount: shot.variationCount,
      targetSelectCount: shot.targetSelectCount,
      priority: shot.priority,
      estimatedMinutes: shot.estimatedMinutes,
      fallback: shot.fallback || '',
      sourceTrace: shot.sourceTrace,
      captureStatus: 'planned',
    })));
    for (let index = 0; index < shots.length; index += 1) {
      for (const referenceAssetId of output.shots[index].sourceTrace.referenceAssetIds || []) {
        if (!this.repos.referenceAssets.get(referenceAssetId)) continue;
        const exists = this.repos.shotReferenceLinks.list(item => item.shotId === shots[index].id && item.referenceAssetId === referenceAssetId)[0];
        if (!exists) this.repos.shotReferenceLinks.create(createEntity('shot-reference-link', {
          shotId: shots[index].id,
          referenceAssetId,
          role: 'generation-source',
          score: null,
          reason: '由方案生成结果的 sourceTrace 建立',
          locked: false,
          rejected: false,
        }));
      }
    }
    let expectedLook = null;
    if (output.expectedLook?.enabled) {
      expectedLook = this.repos.expectedLooks.create(createEntity('expected-look', {
        projectId: run.projectId,
        planId: plan.id,
        planRevisionId: revision.id,
        enabled: true,
        realReferenceAssetIds: output.expectedLook.realReferenceAssetIds || [],
        colorIntent: output.expectedLook.colorIntent || '',
        lightingIntent: output.expectedLook.lightingIntent || '',
        retouchIntent: output.expectedLook.retouchIntent || '',
        lutIntent: output.expectedLook.lutIntent || '',
        styleKeywords: output.expectedLook.styleKeywords || [],
        knowledgeSourceIds: output.expectedLook.knowledgeSourceIds || [],
        knowledgeVerificationRequired: Boolean(output.expectedLook.knowledgeVerificationRequired),
        generatedAssetIds: [],
      }));
    }
    this.repos.plans.save(updateEntity(plan, {
      title: output.concept,
      planStatus: 'candidate',
      currentRevisionId: revision.id,
      sourceGenerationRunIds: [...new Set([...(plan.sourceGenerationRunIds || []), run.id])],
    }));
    run = this.repos.generationRuns.save(updateEntity(run, {
      status: 'approved',
      approvedPlanId: plan.id,
      approvedPlanRevisionId: revision.id,
      approvedAt: new Date().toISOString(),
    }));
    return {
      run,
      plan: this.repos.plans.require(plan.id),
      revision,
      shots,
      expectedLook,
      idempotent: false,
      events: [{ type: 'GenerationRunApproved', generationRunId: run.id, planId: plan.id, planRevisionId: revision.id }],
    };
  }

  confirmPlanRevision(command) {
    const revision = this.repos.planRevisions.require(command.planRevisionId);
    const plan = this.repos.plans.require(revision.planId);
    invariant(revision.status === 'candidate' || revision.status === 'confirmed', 'PLAN_REVISION_NOT_CONFIRMABLE', '只有预选方案版本可以确认');
    if (revision.status === 'confirmed' && plan.confirmedRevisionId === revision.id) {
      return { plan, revision, idempotent: true, events: [] };
    }
    for (const item of this.repos.planRevisions.list(value => value.planId === plan.id && value.status === 'confirmed' && value.id !== revision.id)) {
      this.repos.planRevisions.save(updateEntity(item, { status: 'superseded', supersededByRevisionId: revision.id }));
    }
    const confirmedRevision = this.repos.planRevisions.save(updateEntity(revision, {
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
    }, { expectedVersion: command.expectedVersion }));
    const confirmedPlan = this.repos.plans.save(updateEntity(plan, {
      planStatus: 'confirmed',
      currentRevisionId: revision.id,
      confirmedRevisionId: revision.id,
    }));
    return {
      plan: confirmedPlan,
      revision: confirmedRevision,
      idempotent: false,
      events: [{ type: 'PlanRevisionConfirmed', planId: plan.id, planRevisionId: revision.id }],
    };
  }

  async requestExpectedLookImages(command) {
    const revision = this.repos.planRevisions.require(command.planRevisionId);
    const expectedLook = this.repos.expectedLooks.list(item => item.planRevisionId === revision.id)[0];
    if (!expectedLook?.enabled || command.enabled === false) return { skipped: true, reason: 'EXPECTED_LOOK_DISABLED', assets: [] };
    invariant(this.imageGateway?.generateConceptImages, 'IMAGE_GATEWAY_NOT_CONFIGURED', '尚未配置预期成片图像服务');
    const count = Math.min(9, Math.max(1, Number(command.count || 4)));
    let run = this.repos.imageGenerationRuns.create(createEntity('image-generation-run', {
      projectId: revision.projectId,
      planRevisionId: revision.id,
      expectedLookId: expectedLook.id,
      provider: command.provider || this.imageGateway.provider || 'configured-provider',
      model: command.model || this.imageGateway.model || 'configured-model',
      status: 'running',
      prompt: buildLookPrompt(revision, expectedLook, command.prompt),
      count,
      aspectRatio: command.aspectRatio || '3:2',
      error: null,
    }));
    try {
      const result = await this.imageGateway.generateConceptImages({
        projectId: revision.projectId,
        planRevisionId: revision.id,
        prompt: run.prompt,
        count,
        aspectRatio: run.aspectRatio,
        providerOptions: command.providerOptions || {},
      });
      const assets = (result?.assets || result || []).map((item, index) => this.repos.generatedAssets.create(createEntity('generated-asset', {
        projectId: revision.projectId,
        planRevisionId: revision.id,
        expectedLookId: expectedLook.id,
        imageGenerationRunId: run.id,
        providerAssetId: item.id || item.assetId || null,
        url: item.url || item.temporaryUrl || null,
        localPath: item.localPath || null,
        prompt: item.prompt || run.prompt,
        width: item.width || null,
        height: item.height || null,
        sequence: index + 1,
        synthetic: true,
        status: 'available',
      })));
      run = this.repos.imageGenerationRuns.save(updateEntity(run, {
        status: 'completed',
        providerRequestId: result?.requestId || null,
        generatedAssetIds: assets.map(item => item.id),
      }));
      this.repos.expectedLooks.save(updateEntity(expectedLook, {
        generatedAssetIds: [...new Set([...(expectedLook.generatedAssetIds || []), ...assets.map(item => item.id)])],
      }));
      return { skipped: false, run, assets, events: [{ type: 'ExpectedLookImagesGenerated', imageGenerationRunId: run.id }] };
    } catch (error) {
      const appError = asAppError(error, 'IMAGE_GENERATION_FAILED');
      run = this.repos.imageGenerationRuns.save(updateEntity(run, { status: 'failed', error: appError.toJSON() }));
      return { skipped: false, run, assets: [], error: appError.toJSON(), nonBlocking: true };
    }
  }
}

function buildLookPrompt(revision, expectedLook, extra = '') {
  const knowledgeGuidance = revision.knowledgeGuidance || revision.rawApprovedOutput?.knowledgeGuidance || [];
  const knowledgeTitles = knowledgeGuidance.slice(0, 6).map(item => `${item.title}（${item.role || '方向'}${item.verificationRequired ? '，待核验' : ''}）`);
  return [
    `为摄影方案“${revision.concept}”生成仅用于前期沟通的预期成片概念图。`,
    `风格关键词：${(expectedLook.styleKeywords || revision.visualDirection?.styleKeywords || []).join('、') || revision.visualDirection?.style || '遵循方案方向'}`,
    `色彩方向：${expectedLook.colorIntent || '自然准确'}`,
    `光线方向：${expectedLook.lightingIntent || '遵循方案光线'}`,
    `后期修图：${expectedLook.retouchIntent || '保留真实质感'}`,
    `LUT/色彩转换意图：${expectedLook.lutIntent || '不指定'}`,
    knowledgeTitles.length ? `知识方向：${knowledgeTitles.join('；')}` : '',
    expectedLook.knowledgeVerificationRequired ? '待核验知识只能决定概念方向，不得据此虚构具体灯位、参数、地址或动作细节。' : '',
    '必须保持摄影质感，不冒充真实拍摄结果，并明确标记为 AI 概念图。',
    extra || '',
  ].filter(Boolean).join('\n');
}

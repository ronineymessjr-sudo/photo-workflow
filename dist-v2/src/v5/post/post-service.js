import { createEntity, updateEntity } from '../common/entity.js';
import { invariant } from '../common/errors.js';

const TRANSITIONS = Object.freeze({
  not_started: ['backing_up'],
  backing_up: ['backed_up'],
  backed_up: ['selecting'],
  selecting: ['editing'],
  editing: ['awaiting_feedback', 'delivered'],
  awaiting_feedback: ['editing', 'delivered'],
  delivered: ['archived'],
  archived: [],
});

export class PostProductionService {
  constructor(repositories) { this.repos = repositories; }

  start(command) {
    const revision = this.repos.planRevisions.require(command.planRevisionId);
    invariant(revision.status === 'confirmed', 'PLAN_REVISION_NOT_CONFIRMED', '只有已确认方案可以创建后期任务');
    const existing = this.repos.postProductionJobs.list(item => item.planRevisionId === revision.id)[0];
    if (existing) return { job: existing, idempotent: true };
    const expectedLook = this.repos.expectedLooks.list(item => item.planRevisionId === revision.id)[0];
    const job = this.repos.postProductionJobs.create(createEntity('post-production-job', {
      projectId: revision.projectId,
      planId: revision.planId,
      planRevisionId: revision.id,
      status: 'not_started',
      expectedLookSnapshot: expectedLook ? structuredClone({
        expectedLookId: expectedLook.id,
        colorIntent: expectedLook.colorIntent,
        lightingIntent: expectedLook.lightingIntent,
        retouchIntent: expectedLook.retouchIntent,
        lutIntent: expectedLook.lutIntent,
        realReferenceAssetIds: expectedLook.realReferenceAssetIds || [],
        generatedAssetIds: expectedLook.generatedAssetIds || [],
      }) : null,
      primaryBackupPath: '',
      secondaryBackupPath: '',
      sourceMediaPath: '',
      selectedCount: 0,
      editVersion: '',
      feedbackStatus: 'not_requested',
      deliveryUrl: '',
      deliveredAt: null,
      lutPresetId: null,
      notes: command.notes || '',
    }));
    return { job, idempotent: false, events: [{ type: 'PostProductionStarted', postProductionJobId: job.id }] };
  }

  advance(command) {
    const job = this.repos.postProductionJobs.require(command.postProductionJobId);
    const allowed = TRANSITIONS[job.status] || [];
    invariant(allowed.includes(command.nextStatus), 'INVALID_POST_TRANSITION', '后期状态不能按此顺序推进', { current: job.status, next: command.nextStatus });
    const patch = { status: command.nextStatus, ...(command.patch || {}) };
    if (command.nextStatus === 'backed_up') {
      invariant(patch.primaryBackupPath && patch.secondaryBackupPath, 'DOUBLE_BACKUP_REQUIRED', '完成备份前必须记录两份备份路径');
    }
    if (command.nextStatus === 'delivered') {
      patch.deliveredAt = patch.deliveredAt || new Date().toISOString();
      invariant(patch.deliveryUrl || job.deliveryUrl, 'DELIVERY_REFERENCE_REQUIRED', '交付前必须记录交付链接或路径');
    }
    const updated = this.repos.postProductionJobs.save(updateEntity(job, patch, { expectedVersion: command.expectedVersion }));
    return { job: updated, events: [{ type: 'PostProductionAdvanced', postProductionJobId: job.id, status: updated.status }] };
  }

  selectLutPreset(command) {
    const job = this.repos.postProductionJobs.require(command.postProductionJobId);
    const lut = this.repos.lutPresets.require(command.lutPresetId);
    return this.repos.postProductionJobs.save(updateEntity(job, { lutPresetId: lut.id, lutStrength: Number(command.strength ?? 100) }));
  }

  importLutPreset(input) {
    invariant(String(input.name || '').trim(), 'LUT_NAME_REQUIRED', 'LUT 名称不能为空');
    return this.repos.lutPresets.create(createEntity('lut-preset', {
      name: String(input.name).trim(),
      sourceType: input.sourceType || 'local',
      sourceUrl: input.sourceUrl || null,
      localPath: input.localPath || null,
      inputColorSpace: input.inputColorSpace || 'display-referred',
      outputColorSpace: input.outputColorSpace || 'display-referred',
      creativeIntent: input.creativeIntent || '',
      licenseStatus: input.licenseStatus || 'unknown',
      verificationStatus: input.verificationStatus || 'pending',
    }));
  }
}

export { TRANSITIONS as POST_PRODUCTION_TRANSITIONS };

import { createEntity, updateEntity } from '../common/entity.js';
import { AppError, invariant } from '../common/errors.js';

export class OnSetService {
  constructor(repositories, postService) {
    this.repos = repositories;
    this.postService = postService;
  }

  startShoot(command) {
    const event = this.repos.calendarEvents.require(command.calendarEventId);
    const revision = this.repos.planRevisions.require(event.planRevisionId);
    invariant(revision.status === 'confirmed', 'PLAN_REVISION_NOT_CONFIRMED', '方案未确认，不能开始拍摄');
    invariant(['scheduled', 'confirmed', 'preparing'].includes(event.status), 'SHOOT_EVENT_NOT_STARTABLE', '当前日程状态不能开始拍摄', { status: event.status });
    const shots = this.repos.shots.list(item => item.planRevisionId === revision.id);
    invariant(shots.some(item => item.priority === 'must'), 'MUST_HAVE_SHOT_REQUIRED', '方案至少需要一个必拍镜头');
    const resourceAssignments = this.repos.resourceAssignments.list(item => item.projectId === event.projectId && item.status === 'selected');
    const missingRequiredEquipment = resourceAssignments.filter(item => item.resourceType === 'equipment' && item.required)
      .filter(item => this.repos.equipmentItems.get(item.resourceId)?.availabilityStatus !== 'available');
    if (missingRequiredEquipment.length) throw new AppError('REQUIRED_EQUIPMENT_UNAVAILABLE', '必需设备当前不可用', { assignmentIds: missingRequiredEquipment.map(item => item.id) });
    const participants = (event.participantAssignmentIds || []).map(id => this.repos.participantAssignments.require(id));
    const blockedTalent = participants.filter(item => item.role === 'model').map(item => this.repos.talentProfiles.get(item.talentProfileId)).filter(profile => profile && !['granted', 'confirmed'].includes(profile.consentStatus));
    if (blockedTalent.length) throw new AppError('TALENT_CONSENT_REQUIRED', '模特授权尚未确认', { talentProfileIds: blockedTalent.map(item => item.id) });
    const updated = this.repos.calendarEvents.save(updateEntity(event, { status: 'in_progress', startedAt: new Date().toISOString() }));
    return { event: updated, shots, events: [{ type: 'ShootStarted', calendarEventId: updated.id }] };
  }

  updateShotCaptureStatus(command) {
    const shot = this.repos.shots.require(command.shotId);
    invariant(['planned', 'captured', 'retake_required', 'skipped'].includes(command.captureStatus), 'INVALID_CAPTURE_STATUS', '镜头现场状态不支持');
    const updated = this.repos.shots.save(updateEntity(shot, {
      captureStatus: command.captureStatus,
      actualSettings: command.actualSettings || shot.actualSettings || null,
      onsiteNotes: command.notes || shot.onsiteNotes || '',
    }));
    const record = this.repos.shootRecords.create(createEntity('shoot-record', {
      projectId: shot.projectId,
      planId: shot.planId,
      planRevisionId: shot.planRevisionId,
      calendarEventId: command.calendarEventId || null,
      shotId: shot.id,
      captureStatus: command.captureStatus,
      actualSettings: command.actualSettings || null,
      notes: command.notes || '',
      recordedAt: new Date().toISOString(),
    }));
    return { shot: updated, shootRecord: record };
  }

  completeShoot(command) {
    const event = this.repos.calendarEvents.require(command.calendarEventId);
    invariant(event.status === 'in_progress', 'SHOOT_NOT_IN_PROGRESS', '只有进行中的拍摄可以完成');
    const shots = this.repos.shots.list(item => item.planRevisionId === event.planRevisionId);
    const blocking = shots.filter(item => item.priority === 'must' && !['captured', 'skipped'].includes(item.captureStatus));
    if (blocking.length) throw new AppError('MUST_HAVE_SHOTS_INCOMPLETE', '仍有必拍镜头未完成', { shotIds: blocking.map(item => item.id) });
    const completed = this.repos.calendarEvents.save(updateEntity(event, { status: 'completed', completedAt: new Date().toISOString() }));
    const post = this.postService.start({ planRevisionId: event.planRevisionId });
    return { event: completed, postProductionJob: post.job, events: [{ type: 'ShootCompleted', calendarEventId: completed.id }] };
  }
}

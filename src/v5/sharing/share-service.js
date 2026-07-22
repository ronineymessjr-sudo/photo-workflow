import { createEntity, updateEntity } from '../common/entity.js';
import { AppError, invariant } from '../common/errors.js';
import { validateSharePacket } from '../contracts/validators.js';

export class SharingService {
  constructor(repositories) { this.repos = repositories; }

  assignParticipant(input) {
    this.repos.projects.require(input.projectId);
    invariant(['photographer', 'model', 'assistant', 'client', 'other'].includes(input.role), 'INVALID_PARTICIPANT_ROLE', '参与者角色不支持');
    if (input.talentProfileId) this.repos.talentProfiles.require(input.talentProfileId);
    return this.repos.participantAssignments.create(createEntity('participant-assignment', {
      projectId: input.projectId,
      role: input.role,
      displayName: input.displayName || this.repos.talentProfiles.get(input.talentProfileId)?.displayName || input.role,
      contact: input.contact || this.repos.talentProfiles.get(input.talentProfileId)?.contact || '',
      talentProfileId: input.talentProfileId || null,
      callTimeOffsetMinutes: Number(input.callTimeOffsetMinutes || 0),
      responsibilities: uniqueStrings(input.responsibilities),
      preparation: uniqueStrings(input.preparation),
      privateNotes: input.privateNotes || '',
      status: input.status || 'confirmed',
    }));
  }

  removeParticipant(participantAssignmentId) {
    const assignment = this.repos.participantAssignments.require(participantAssignmentId);
    this.repos.participantAssignments.remove(participantAssignmentId);
    return assignment;
  }

  buildModelPacket(command) {
    const context = this.requirePacketContext(command, 'model');
    const profile = context.assignment.talentProfileId ? this.repos.talentProfiles.get(context.assignment.talentProfileId) : null;
    const callTime = offsetTime(context.event.startAt, -Math.abs(context.assignment.callTimeOffsetMinutes || 0));
    const shotGoals = filterShotsForParticipant(context.shots, context.assignment).map(shot => ({
      id: shot.id,
      sequence: shot.sequence,
      scene: shot.scene,
      shotSize: shot.shotSize,
      poseGuidance: shot.poseGuidance,
      subjectAction: shot.subjectAction || '',
      priority: shot.priority,
      estimatedMinutes: shot.estimatedMinutes,
    }));
    return this.createDraftPacket({
      ...context,
      recipientRole: 'model',
      payloadSnapshot: {
        schedule: { callTime, startAt: context.event.startAt, endAt: context.event.endAt, location: context.event.location, timezone: context.event.timezone },
        contact: publicContact(context.photographer),
        tasks: context.assignment.responsibilities.map((title, index) => ({ id: `model-task-${index + 1}`, title })),
        shotGoals,
        preparation: uniqueStrings([...(context.assignment.preparation || []), ...(context.revision.preparationGuide || [])]),
        consent: profile ? { status: profile.consentStatus, boundaries: profile.boundaries || '', usageScope: profile.usageScope || '' } : null,
      },
    });
  }

  buildAssistantPacket(command) {
    const context = this.requirePacketContext(command, 'assistant');
    const equipment = this.repos.resourceAssignments.list(item => item.projectId === context.event.projectId && item.resourceType === 'equipment' && item.status === 'selected')
      .map(assignment => {
        const item = this.repos.equipmentItems.get(assignment.resourceId);
        const model = item?.equipmentModelId ? this.repos.equipmentModels.get(item.equipmentModelId) : null;
        return {
          assignmentId: assignment.id,
          name: model ? `${model.brand} ${model.model}` : item?.customName || '未命名设备',
          quantity: assignment.quantity || item?.quantity || 1,
          role: assignment.role,
          required: Boolean(assignment.required),
          availabilityStatus: item?.availabilityStatus || 'unknown',
        };
      });
    const tasks = [
      ...context.assignment.responsibilities.map((title, index) => ({ id: `assistant-task-${index + 1}`, title, type: 'responsibility' })),
      ...equipment.map(item => ({ id: `equipment-${item.assignmentId}`, title: `准备 ${item.name} × ${item.quantity}`, type: 'equipment', required: item.required })),
    ];
    return this.createDraftPacket({
      ...context,
      recipientRole: 'assistant',
      payloadSnapshot: {
        schedule: { callTime: offsetTime(context.event.startAt, -Math.abs(context.assignment.callTimeOffsetMinutes || 0)), startAt: context.event.startAt, endAt: context.event.endAt, location: context.event.location, timezone: context.event.timezone },
        contact: publicContact(context.photographer),
        tasks,
        shotGoals: context.shots.filter(shot => shot.priority === 'must').map(shot => ({ id: shot.id, sequence: shot.sequence, scene: shot.scene, lighting: shot.lighting, focalLength: shot.focalLength, estimatedMinutes: shot.estimatedMinutes })),
        preparation: uniqueStrings(context.assignment.preparation),
        consent: null,
      },
    });
  }

  publish(packetId, options = {}) {
    const packet = this.repos.sharePackets.require(packetId);
    invariant(packet.status === 'draft', 'SHARE_PACKET_NOT_DRAFT', '只有草稿分享包可以发布');
    const published = this.repos.sharePackets.save(updateEntity(packet, {
      status: 'published',
      publishedAt: new Date().toISOString(),
      expiresAt: options.expiresAt || packet.expiresAt || null,
    }));
    return { packet: published, events: [{ type: 'SharePacketPublished', sharePacketId: published.id }] };
  }

  revoke(packetId, reason = '') {
    const packet = this.repos.sharePackets.require(packetId);
    if (packet.status === 'revoked') return packet;
    return this.repos.sharePackets.save(updateEntity(packet, { status: 'revoked', revokedAt: new Date().toISOString(), revokeReason: reason }));
  }


  readPublishedPacket(packetId, options = {}) {
    const packet = this.repos.sharePackets.require(packetId);
    const now = options.now ? new Date(options.now) : new Date();
    if (packet.status !== 'published') throw new AppError('SHARE_PACKET_NOT_AVAILABLE', '分享包尚未发布或已撤销', { status: packet.status });
    if (packet.expiresAt && new Date(packet.expiresAt) <= now) throw new AppError('SHARE_PACKET_EXPIRED', '分享包已过期', { expiresAt: packet.expiresAt });
    return structuredClone(packet);
  }

  createDraftPacket(context) {
    const previous = this.repos.sharePackets.list(item =>
      item.planRevisionId === context.revision.id && item.recipientRole === context.recipientRole && item.recipientAssignmentId === context.assignment.id);
    const version = previous.reduce((max, item) => Math.max(max, item.version || 0), 0) + 1;
    const packet = createEntity('share-packet', {
      projectId: context.event.projectId,
      planRevisionId: context.revision.id,
      calendarEventId: context.event.id,
      recipientRole: context.recipientRole,
      recipientAssignmentId: context.assignment.id,
      version,
      status: 'draft',
      payloadSnapshot: structuredClone(context.payloadSnapshot),
      publishedAt: null,
      expiresAt: null,
      privacyProfile: 'role-minimum-necessary',
    });
    validateSharePacket(packet);
    return this.repos.sharePackets.create(packet);
  }

  requirePacketContext(command, expectedRole) {
    const event = this.repos.calendarEvents.require(command.calendarEventId);
    const revision = this.repos.planRevisions.require(event.planRevisionId);
    invariant(revision.status === 'confirmed', 'PLAN_REVISION_NOT_CONFIRMED', '分享前必须确认方案版本');
    const assignment = this.repos.participantAssignments.require(command.participantAssignmentId);
    invariant(assignment.projectId === event.projectId && assignment.role === expectedRole, 'PARTICIPANT_ROLE_MISMATCH', '参与者与分享角色不匹配');
    const photographer = this.repos.participantAssignments.list(item => item.projectId === event.projectId && item.role === 'photographer')[0] || { displayName: '摄影师', contact: '' };
    const shots = this.repos.shots.list(item => item.planRevisionId === revision.id).sort((a, b) => a.sequence - b.sequence);
    return { event, revision, assignment, photographer, shots };
  }
}

function publicContact(person) { return { displayName: person.displayName || '摄影师', contact: person.contact || '' }; }
function offsetTime(value, minutes) { return new Date(new Date(value).getTime() + minutes * 60_000).toISOString(); }
function uniqueStrings(values) { return [...new Set((values || []).map(value => String(value).trim()).filter(Boolean))]; }

function filterShotsForParticipant(shots, assignment) {
  return (shots || []).filter(shot => {
    const assignmentIds = shot.participantAssignmentIds || [];
    const talentIds = shot.talentProfileIds || [];
    if (!assignmentIds.length && !talentIds.length) return true;
    return assignmentIds.includes(assignment.id)
      || (assignment.talentProfileId && talentIds.includes(assignment.talentProfileId));
  });
}

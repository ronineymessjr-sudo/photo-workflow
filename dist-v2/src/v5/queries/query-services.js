import { AppError } from '../common/errors.js';

export function createQueryServices(repositories, services = {}) {
  const calendar = {
    getRange({ startAt, endAt, participantAssignmentId = null, projectId = null }) {
      const start = new Date(startAt);
      const end = new Date(endAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        throw new AppError('INVALID_DATE_RANGE', '日历查询时间范围无效', { startAt, endAt });
      }
      return repositories.calendarEvents.list(item => {
        const itemStart = new Date(item.startAt);
        const itemEnd = new Date(item.endAt);
        return itemStart < end && itemEnd > start
          && (!projectId || item.projectId === projectId)
          && (!participantAssignmentId || (item.participantAssignmentIds || []).includes(participantAssignmentId));
      }).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    },
    getForParticipant(participantAssignmentId, range) {
      repositories.participantAssignments.require(participantAssignmentId);
      return calendar.getRange({ ...range, participantAssignmentId });
    },
  };

  return {
    projectWorkspace: {
      get(projectId) {
        const project = repositories.projects.require(projectId);
        return {
          project,
          brief: repositories.projectBriefs.list(item => item.projectId === projectId)[0] || null,
          resources: repositories.resourceAssignments.list(item => item.projectId === projectId),
          references: repositories.projectReferenceLinks.list(item => item.projectId === projectId),
          plans: repositories.plans.list(item => item.projectId === projectId),
          revisions: repositories.planRevisions.list(item => item.projectId === projectId),
          shots: repositories.shots.list(item => item.projectId === projectId),
          events: repositories.calendarEvents.list(item => item.projectId === projectId),
          financialEntries: repositories.financialEntries.list(item => item.projectId === projectId),
          postProductionJobs: repositories.postProductionJobs.list(item => item.projectId === projectId),
          participants: repositories.participantAssignments.list(item => item.projectId === projectId),
        };
      },
    },
    resourceCatalog: {
      get(projectId) {
        repositories.projects.require(projectId);
        const assignments = repositories.resourceAssignments.list(item => item.projectId === projectId);
        const assignmentsFor = (resourceType, resourceId) => assignments.filter(item => item.resourceType === resourceType && item.resourceId === resourceId);
        return {
          assignments,
          equipment: repositories.equipmentItems.list().map(resource => {
            const model = resource.equipmentModelId ? repositories.equipmentModels.get(resource.equipmentModelId) : null;
            return {
              resource,
              model,
              displayName: model ? `${model.brand} ${model.model}` : resource.customName || '未命名设备',
              category: model?.category || 'custom',
              assignments: assignmentsFor('equipment', resource.id),
            };
          }),
          venues: repositories.venues.list().map(resource => ({
            resource,
            displayName: resource.name,
            assignments: assignmentsFor('venue', resource.id),
          })),
          talent: repositories.talentProfiles.list().map(resource => ({
            resource,
            displayName: resource.displayName,
            assignments: assignmentsFor('talent', resource.id),
          })),
        };
      },
    },
    referenceLibrary: {
      search(query, filters) { return services.references.searchAssets(query, filters); },
      getProject(projectId) {
        repositories.projects.require(projectId);
        const assets = repositories.referenceAssets.list();
        const projectLinks = repositories.projectReferenceLinks.list(item => item.projectId === projectId);
        const selectedIds = new Set(projectLinks.map(item => item.referenceAssetId));
        const shots = repositories.shots.list(item => item.projectId === projectId);
        const shotIds = new Set(shots.map(item => item.id));
        const shotLinks = repositories.shotReferenceLinks.list(item => shotIds.has(item.shotId));
        const assetById = new Map(assets.map(item => [item.id, item]));
        return {
          assets,
          availableAssets: assets.filter(item => !selectedIds.has(item.id)),
          selectedReferences: projectLinks.map(link => ({ link, asset: assetById.get(link.referenceAssetId) })).filter(item => item.asset),
          shotBindings: shotLinks.map(link => ({ link, asset: assetById.get(link.referenceAssetId) })).filter(item => item.asset),
        };
      },
    },
    planningWorkspace: {
      get(projectId) {
        repositories.projects.require(projectId);
        const newestFirst = items => [...items].sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0));
        const plans = newestFirst(repositories.plans.list(item => item.projectId === projectId));
        const revisions = newestFirst(repositories.planRevisions.list(item => item.projectId === projectId));
        const shots = repositories.shots.list(item => item.projectId === projectId)
          .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
        const expectedLooks = repositories.expectedLooks.list(item => item.projectId === projectId);
        return {
          snapshots: newestFirst(repositories.planningSnapshots.list(item => item.projectId === projectId)),
          generationRuns: newestFirst(repositories.generationRuns.list(item => item.projectId === projectId)),
          plans,
          revisions,
          shots,
          expectedLooks,
          generatedAssets: newestFirst(repositories.generatedAssets.list(item => item.projectId === projectId)),
          getPlan(planId) {
            const plan = plans.find(item => item.id === planId) || null;
            if (!plan) return null;
            return {
              plan,
              revisions: revisions.filter(item => item.planId === planId),
              currentRevision: revisions.find(item => item.id === plan.currentRevisionId) || null,
              shots: shots.filter(item => item.planId === planId),
            };
          },
        };
      },
    },
    scheduleWorkspace: {
      get(projectId) {
        const project = repositories.projects.require(projectId);
        const revisions = repositories.planRevisions.list(item => item.projectId === projectId);
        const confirmedRevisions = revisions.filter(item => item.status === 'confirmed');
        const events = repositories.calendarEvents.list(item => item.projectId === projectId).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
        const shots = repositories.shots.list(item => item.projectId === projectId).sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
        return {
          project,
          confirmedRevisions,
          events,
          tasks: repositories.tasks.list(item => item.projectId === projectId),
          shots,
          shootRecords: repositories.shootRecords.list(item => item.projectId === projectId),
          participants: repositories.participantAssignments.list(item => item.projectId === projectId),
          financialEntries: repositories.financialEntries.list(item => item.projectId === projectId),
          postProductionJobs: repositories.postProductionJobs.list(item => item.projectId === projectId),
          getEvent(eventId) {
            const event = events.find(item => item.id === eventId) || null;
            if (!event) return null;
            return { event, revision: revisions.find(item => item.id === event.planRevisionId) || null, shots: shots.filter(item => item.planRevisionId === event.planRevisionId) };
          },
        };
      },
    },
    postWorkspace: {
      get(projectId) {
        repositories.projects.require(projectId);
        const revisions = repositories.planRevisions.list(item => item.projectId === projectId);
        const jobs = repositories.postProductionJobs.list(item => item.projectId === projectId);
        return {
          confirmedRevisions: revisions.filter(item => item.status === 'confirmed'),
          jobs,
          lutPresets: repositories.lutPresets.list(),
          expectedLooks: repositories.expectedLooks.list(item => item.projectId === projectId),
          generatedAssets: repositories.generatedAssets.list(item => item.projectId === projectId),
          getByRevision(planRevisionId) {
            return {
              revision: revisions.find(item => item.id === planRevisionId) || null,
              job: jobs.find(item => item.planRevisionId === planRevisionId) || null,
            };
          },
        };
      },
    },
    sharingWorkspace: {
      get(projectId) {
        repositories.projects.require(projectId);
        return {
          participants: repositories.participantAssignments.list(item => item.projectId === projectId),
          events: repositories.calendarEvents.list(item => item.projectId === projectId && item.status !== 'cancelled'),
          packets: repositories.sharePackets.list(item => item.projectId === projectId).sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0)),
        };
      },
    },
    calendar,
    revenue: {
      getSummary(range) { return services.schedule.getRevenueSummary(range); },
      getPeriods(options) { return services.schedule.getPeriodSummaries(options); },
    },
    sharePackets: {
      read(packetId, options) { return services.sharing.readPublishedPacket(packetId, options); },
    },
  };
}

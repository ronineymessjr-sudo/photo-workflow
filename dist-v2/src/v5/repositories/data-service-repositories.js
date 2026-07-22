import { AppError } from '../common/errors.js';

export class EntityRepository {
  constructor(dataService, entity) {
    this.data = dataService;
    this.entity = entity;
  }
  list(predicate = null) { return this.data.list(this.entity, predicate); }
  get(id) { return this.data.get(this.entity, id); }
  require(id) {
    const value = this.get(id);
    if (!value) throw new AppError('ENTITY_NOT_FOUND', `${this.entity}:${id} 不存在`, { entity: this.entity, id });
    return value;
  }
  save(record) { return this.data.upsert(this.entity, record); }
  create(record) { return this.data.create(this.entity, record); }
  update(id, patch) { return this.data.update(this.entity, id, patch); }
  remove(id) { return this.data.remove(this.entity, id); }
}

export function createRepositories(data) {
  const names = [
    'projects', 'projectBriefs', 'equipmentModels', 'equipmentItems', 'venues', 'talentProfiles',
    'resourceAssignments', 'planTemplates', 'referenceAssets', 'projectReferenceLinks',
    'shotReferenceLinks', 'planningSnapshots', 'generationRuns', 'plans', 'planRevisions',
    'shots', 'expectedLooks', 'imageGenerationRuns', 'generatedAssets', 'calendarEvents',
    'financialEntries', 'participantAssignments', 'shootRecords', 'postProductionJobs',
    'lutPresets', 'sharePackets', 'reviews', 'domainEvents', 'tasks',
  ];
  return Object.fromEntries(names.map(name => [name, new EntityRepository(data, name)]));
}

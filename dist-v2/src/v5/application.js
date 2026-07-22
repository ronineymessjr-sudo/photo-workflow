import { createRepositories } from './repositories/data-service-repositories.js';
import { CatalogService } from './catalog/catalog-service.js';
import { ReferenceService } from './references/reference-service.js';
import { ReferenceDatabaseImportService } from './references/reference-database-importer.js';
import { RealDataBootstrapService } from './bootstrap/real-data-bootstrap.js';
import { PlanningContextBuilder } from './planning/planning-context.js';
import { PlanningService } from './planning/planning-service.js';
import { VisualAnalysisService } from './planning/visual-analysis-service.js';
import { CreativeDirectionService } from './planning/creative-direction-service.js';
import { ShotDesignService } from './planning/shot-design-service.js';
import { CreativeConsistencyService } from './planning/creative-consistency-service.js';
import { ScheduleService } from './schedule/schedule-service.js';
import { PostProductionService } from './post/post-service.js';
import { OnSetService } from './onset/onset-service.js';
import { SharingService } from './sharing/share-service.js';
import { SchemaV5MigrationService } from './migration/migration-v5.js';
import { HttpPlanningModelGateway, HttpImageGenerationGateway, HttpVisionGateway } from './gateways/http-gateways.js';
import { CommandExecutor, transactionalFacade } from './common/command-executor.js';
import { createQueryServices } from './queries/query-services.js';
import { createReferenceSourceGateway } from './references/reference-source-adapters.js';
import { CompositeReferenceSourceGateway } from './gateways/http-gateways.js';

export function createV5Application({ data, storage, api = null, planningGateway = null, imageGateway = null, visionGateway = null, equipmentSeed = null }) {
  const repositories = createRepositories(data);
  const catalog = new CatalogService(repositories, equipmentSeed ? { seed: equipmentSeed } : {});
  const references = new ReferenceService(repositories);
  const referenceDatabaseImport = new ReferenceDatabaseImportService(references);
  const realDataBootstrap = new RealDataBootstrapService({ catalogService: catalog, referenceDatabaseImportService: referenceDatabaseImport });
  const referenceSources = api ? createReferenceSourceGateway({ apiClient: api, referenceService: references }) : new CompositeReferenceSourceGateway({});
  const planningContext = new PlanningContextBuilder(repositories);
  const effectivePlanningGateway = planningGateway || (api ? new HttpPlanningModelGateway({
    apiClient: api,
    endpoint: '/api/v1/agent/plans/draft-v5',
    provider: 'photoatelier-worker',
    model: 'configured-by-worker',
  }) : null);
  const effectiveImageGateway = imageGateway || (api ? new HttpImageGenerationGateway({
    apiClient: api,
    endpoint: '/api/v1/images/expected-look',
    provider: 'configured-by-worker',
    model: 'configured-by-worker',
  }) : null);
  const effectiveVisionGateway = visionGateway || (api ? new HttpVisionGateway({
    apiClient: api,
    endpoint: '/api/v1/visual-dna/analyze',
    provider: 'vision-agent',
    model: 'configured-by-worker',
  }) : null);
  const rawPlanning = new PlanningService(repositories, { planningGateway: effectivePlanningGateway, imageGateway: effectiveImageGateway });
  const rawVisualAnalysis = new VisualAnalysisService(repositories, { visionGateway: effectiveVisionGateway });
  const rawCreativeDirection = new CreativeDirectionService(repositories, { planningGateway: effectivePlanningGateway });
  const rawShotDesign = new ShotDesignService(repositories, { planningGateway: effectivePlanningGateway });
  const rawConsistency = new CreativeConsistencyService(repositories);
  const rawSchedule = new ScheduleService(repositories);
  const rawPost = new PostProductionService(repositories);
  const rawOnset = new OnSetService(repositories, rawPost);
  const rawSharing = new SharingService(repositories);
  const executor = new CommandExecutor({ storage, repositories });
  const planning = transactionalFacade(rawPlanning, executor, {
    approveGenerationRun: true,
    confirmPlanRevision: true,
    requestExpectedLookImages: true,
  });
  const visualAnalysis = transactionalFacade(rawVisualAnalysis, executor, { analyze: true });
  const creativeDirection = transactionalFacade(rawCreativeDirection, executor, { generateDirections: true, selectDirection: true });
  const shotDesign = transactionalFacade(rawShotDesign, executor, { designShots: true });
  const consistency = transactionalFacade(rawConsistency, executor, { audit: true });
  const schedule = transactionalFacade(rawSchedule, executor, { createShootEvent: true });
  const post = transactionalFacade(rawPost, executor, { start: true, advance: true, selectLutPreset: true });
  const onset = transactionalFacade(rawOnset, executor, { startShoot: true, updateShotCaptureStatus: true, completeShoot: true });
  const sharing = transactionalFacade(rawSharing, executor, { buildModelPacket: true, buildAssistantPacket: true, publish: true, revoke: true });
  const migration = new SchemaV5MigrationService({ data, storage, repositories, catalogService: catalog });
  const queries = createQueryServices(repositories, { references, schedule, sharing });
  return {
    version: '2.5.0-domain-implementation',
    repositories,
    catalog,
    references,
    referenceDatabaseImport,
    realDataBootstrap,
    referenceSources,
    queries,
    commandExecutor: executor,
    planningContext,
    planning,
    visualAnalysis,
    creativeDirection,
    shotDesign,
    consistency,
    schedule,
    post,
    onset,
    sharing,
    migration,
  };
}

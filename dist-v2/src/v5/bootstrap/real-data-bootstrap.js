import { invariant } from '../common/errors.js';

/**
 * Imports verifiable catalogs only. It never creates user ownership, fictional
 * people, venues, bookings, income, plans or reviews.
 */
export class RealDataBootstrapService {
  constructor({ catalogService, referenceDatabaseImportService }) {
    this.catalog = catalogService;
    this.references = referenceDatabaseImportService;
  }

  bootstrap(input = {}) {
    invariant(input.referenceImportPlan, 'REFERENCE_IMPORT_PLAN_REQUIRED', '真实参考数据导入计划不能为空');
    const equipment = this.catalog.importEquipmentModels(input.equipmentModels);
    const planTemplates = this.catalog.importPlanTemplates(input.planTemplates);
    const references = this.references.importPlan(input.referenceImportPlan);
    return {
      equipment,
      planTemplates,
      references,
      sourceDescriptors: references.sourceDescriptors,
      relinkRequired: references.unavailableAssets,
      createdUserData: false,
      summary: {
        equipmentModels: equipment.total,
        planTemplates: planTemplates.total,
        realReferenceAssets: references.stats.imported + references.stats.deduplicated,
        referenceSources: references.stats.sources,
        relinkRequired: references.stats.unavailable,
      },
    };
  }
}

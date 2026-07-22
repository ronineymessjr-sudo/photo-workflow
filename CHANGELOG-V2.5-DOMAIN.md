# PhotoAtelier V2.5 Domain Implementation Changelog

## Added

- Schema v5 entity registry and backup version.
- Stable IDs, `recordVersion`, domain errors and structured API errors.
- Transaction-like command executor with rollback and DomainEvent audit.
- Equipment model catalog, owned／rented equipment, Venue, TalentProfile and resource assignments.
- Four professional plan templates.
- Global ReferenceAsset and project／shot reference links.
- Pexels／Obsidian／Feishu reference source adapters.
- 12 bundled real reference images with attribution and hashes.
- 237 source descriptors and 25 relink-required records.
- PlanningContextSnapshot and deterministic `contextHash`.
- GenerationRun, PlanRevision, ExpectedLook, ImageGenerationRun and GeneratedAsset.
- AI output validation against selected resources and references.
- CalendarEvent, FinancialEntry, participant calendar and period summaries.
- On-set readiness, ShootRecord workflow and automatic PostProductionJob.
- Post-production state machine, double-backup checks, LUTPreset and delivery references.
- Versioned, revocable, privacy-minimized Model／Assistant SharePacket.
- Schema v5 Dry Run, commit, rollback and idempotent migration.
- V5 worker endpoints and deterministic context fallback.
- Optional reference data distribution package.
- V5 query services and application composition.

## Changed

- App version upgraded to `2.5.0-domain-implementation`.
- Backup and schema version upgraded to 5.
- V5 catalogs initialize idempotently at startup.
- Public release is split into lean app, reference addon and Classic addon.
- Worker errors now include `code` and `details`.

## Preserved

- V2.3 compatibility entities and pages.
- Existing Feishu eight-table sync.
- Existing Classic source and assets.
- Existing data migration baseline.

## Not changed

- Final navigation, visual design and page layout.
- Real cloud credentials or account permissions.
- Maps, model visual analysis and advanced LUT market.

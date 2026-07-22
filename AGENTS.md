# Agent Instructions — PhotoAtelier V2.5

Read `00-TOOLDESK-START-HERE.md` first. Treat it as the current handoff contract.

## Source of truth

- Domain contracts and use cases: `src/v5/`
- Architecture contracts: `architecture/`
- Current external tasks: `EXTERNAL-INTEGRATION-TASKS-V2.5.md`
- Verified baseline: `BASELINE-VERIFIED.json`

## Operating rules

- Do not redefine V5 entities or merge bounded contexts for convenience.
- Do not rewrite the PRD or restart the architecture.
- Do not run the full release suite after every edit.
- Use `npm run test:scope -- <scope>` for changed areas.
- Run `npm run test:release` once at the end of a meaningful batch or when shared contracts/build/migrations change.
- Run browser E2E only after an integrated UI batch or before deployment.
- Existing UI is compatibility UI. Migrate it to `context.v5` without visual redesign.
- Never invent personal equipment ownership, models, venues, bookings, income, or customer data.
- AI images must remain `synthetic=true`.
- External integration success must be proven with real credentials; mocks are not acceptance evidence.

## Change report format

Return only:

- files changed;
- use case integrated;
- targeted tests executed and result;
- unresolved contract decision, if any;
- next task.

# Trae Development and Codex Acceptance Contract

## Working directory and baseline

- Work only in this directory:
  `C:\Users\user\.trae-cn\worktrees\PhotoAtelier-V2.5-ToolDesk-Ready-2026-07-15\feat-photo-atelier-vnext-refactor-nWfuzz`
- Development baseline: V3 commit `3fb58ce`.
- User-facing workbench: `legacy/index.html`.
- `workspace.html` is not a second product surface. Do not add user features there.
- `dist-v2/`, `dist-classic-addon/`, and `dist-reference-addon/` are generated outputs. Never edit them manually.

## Non-negotiable rules

1. Preserve the existing legacy workbench layout and flows: reference gallery, LUT preview, equipment selection, candidate/confirmed/scheduled plan library, and schedule linking.
2. V3 can enhance plan generation only through progressive disclosure in `legacy/index.html`.
3. Keep the existing V3 contracts and entity meanings. If a new field or state transition is needed, stop with `ARCHITECTURE DECISION REQUIRED`.
4. No real reference image may be fabricated. Real references are `synthetic=false`; AI concept images stay `synthetic=true`.
5. First generation may create a draft only. Formal Plans/Shots/Tasks/LUT links may be written only through the existing user-confirmation use case.
6. Do not delete existing user data, unrelated source files, or other agents' changes.
7. Do not deploy. Codex performs acceptance and decides whether a release can be deployed.

## Current submission status: rejected, needs revision

The current uncommitted V3 adapter adds `src/legacy-v3-planning-flow.js` and a compact entry in `legacy/index.html`. It passed:

```powershell
npm run test:scope -- planning
```

It is not accepted yet because:

1. `npm run test:legacy` fails at the PDF execution-sheet check in `tests/e2e/legacy-app.e2e.js:101`.
2. The V3 adapter creates a detached `legacy-v3-current-project` instead of relating to the actual legacy plan selected by the user.
3. The V3 shot result only displays a count and is not connected to the existing candidate plan and its approval flow.

Fix these issues before requesting acceptance. Do not mask the failing E2E assertion unless the user-facing PDF behavior is preserved and separately verified.

## Required return format for every task

Return exactly:

1. Commit hash or uncommitted diff summary.
2. Changed source files only.
3. User-visible behavior changed.
4. Targeted test commands and complete result.
5. `npm run test:legacy` result.
6. Any `ARCHITECTURE DECISION REQUIRED` item.
7. Confirmation that no deployment was performed.

## Codex acceptance gate

Codex will reject the change if any of the following is true:

- `legacy/index.html` no longer loads the reference gallery, LUT workspace, equipment selection, plan library, or schedule flow.
- V3 is exposed through a separate `workspace.html` user interface.
- a V3 flow writes formal shots/tasks before user confirmation.
- a test is weakened without preserving the tested behavior.
- targeted tests, legacy E2E, source syntax, or distribution checks fail.

For a release candidate, Codex will run:

```powershell
npm run test:scope -- planning
npm run test:legacy
npm run build:v2
npm run test:dist
npm run test:public-beta -- https://photoatelier.pages.dev/
```

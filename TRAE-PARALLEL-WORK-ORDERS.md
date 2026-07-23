# PhotoAtelier V3 - Trae Parallel Responsibility Packages

This document is an assignment sheet only. Codex does not implement these packages. Assign one package to each Trae agent, then give the completed shared worktree to one separate QA agent.

## Shared baseline and hard boundaries

- **Worktree:** `C:\Users\user\.trae-cn\worktrees\PhotoAtelier-V2.5-ToolDesk-Ready-2026-07-15\feat-photo-atelier-vnext-refactor-nWfuzz`
- **Baseline:** V3 commit `3fb58ce` plus the existing uncommitted worktree changes. Do not reset, replace, or overwrite this baseline.
- **Public product surface:** `legacy/index.html`. `workspace.html` is not the photographer-facing workspace.
- Do not modify Schema v5, V5 entity meanings, state machines, Worker contracts, or generated distribution folders (`dist-v2/`, `dist-classic-addon/`, `dist-reference-addon/`).
- Do not deploy. Do not delete user data. Hiding an obsolete UI section must not erase its existing stored fields.
- Do not change files outside the package's **allowed write set**. If another file is needed, report the integration point rather than editing it.
- Every package must add a focused test and run only its focused test while developing. Do not run a full release suite.
- All copy in product UI must be readable Chinese or English. Do not introduce mojibake text.

## Assignment order

1. Give `P0` to Trae agent A first. It owns the shared page shell and must finish before the other four agents begin editing.
2. After P0 is committed, give `P1` to agent B, `P2` to agent C, `P3` to agent D, and `P4` to agent E in parallel.
3. When all five development packages are integrated, give `P5` to one new QA-only Trae agent. QA does not edit production source.
4. Send Codex the resulting worktree, commits/diff, test output, and screenshots for acceptance. Deployment remains a separate decision.

---

## P0 - Storyboard-first plan shell

**Responsible for:** Agent A  
**Priority:** P0  
**Purpose:** Establish a clear photographer workflow. The generated shot list is the primary result, not a wall of creative metadata.

### Allowed write set

- `legacy/index.html`
- `src/enhancements.css`
- `src/legacy-shot-editor.js` (new)
- `tests/e2e/legacy-plan-layout.e2e.js` (new)
- `tests/node/v5/legacy-shot-editor.test.mjs` (new)

### Required result

1. Plan library/current plan appears before the generation form in page flow.
2. After generation, the complete storyboard/shot list is the first expanded result.
3. Shot controls work on the current candidate draft:
   - add a draft shot;
   - reorder shots while preserving existing reference, device, and LUT links;
   - toggle a visibly different concise view that hides only secondary copy.
4. Move the shooting control area lower and collapsed by default.
5. Hide the standalone “main visual” and “pose variations” areas. Preserve their underlying stored data. Pose guidance may remain inside an individual shot.
6. Put creative direction and styling/props after the storyboard.
7. Reduce plan-area color noise to the existing neutral palette plus one accent color.
8. Optional module loading for P3/P4 must be fault-tolerant: a missing optional module cannot break classic plan generation.

### Must not do

- Do not create formal Tasks or confirmed plans from add/reorder/edit actions.
- Do not directly write legacy `references` or obsolete shot reference fields.
- Do not implement quote tools, reference ingestion, V3 analysis, or schedule actions.

### Focused verification

`node --test tests/node/v5/legacy-shot-editor.test.mjs`  
`npx playwright test tests/e2e/legacy-plan-layout.e2e.js`

### Handoff evidence

- Screenshot: initial plan page and post-generation storyboard-first page.
- Screenshot: add/reorder/concise view each visibly changes the current candidate plan.

---

## P1 - Plan library, approval, schedule and execution actions

**Responsible for:** Agent B  
**Priority:** P1  
**Purpose:** Make the plan library the single place to continue, approve, schedule, export, and review a plan.

### Allowed write set

- `src/app-enhancements.js`
- `tests/node/v5/legacy-plan-library-actions.test.mjs` (new)

### Required result

1. Candidate, confirmed, and scheduled plans show a clear state label and one primary next action.
2. The existing “plan action desk” becomes contextual actions for the opened plan, rather than a separate vague page.
3. Expose only working actions appropriate to state: open storyboard, continue editing, confirm, create/open schedule, export, and review.
4. A plan with missing relationship/model details shows a useful completion action, never a blank panel.
5. Confirm -> schedule preserves the same `planId`; reopening shows the correct schedule and plan state.
6. The execution-and-delivery rhythm belongs here, below the plan: prepare, shoot, select, edit, deliver, review.

### Must not do

- Do not alter navigation markup or styling owned by P0.
- Do not create new side navigation pages.
- Do not modify formal-write rules: candidate plans require explicit user confirmation.

### Focused verification

`node --test tests/node/v5/legacy-plan-library-actions.test.mjs`

### Handoff evidence

- Screenshot: candidate plan with its next action.
- Screenshot: same plan after confirmation and schedule creation.

---

## P2 - Reference library and photographer-friendly fallback

**Responsible for:** Agent C  
**Priority:** P1  
**Purpose:** Let photographers use built-in references and uploads even when a personal knowledge base is unavailable; never show a broken technical connection as the main experience.

### Allowed write set

- `src/photographer-reference-ui.js`
- `src/legacy-knowledge-bridge.js`
- `tests/node/v5/reference-ui-simplification.test.mjs` (new)

### Required result

1. Keep verified built-in references and browser upload as the default experience.
2. Show personal Obsidian/library search only after a real connection health check succeeds. When it is unavailable, hide the technical connection card and do not lead with “Failed to fetch”.
3. Use one selected shared reference set for a plan. Bind selected references to shots as needed; do not force every shot to search independently.
4. Preserve the distinction: real reference photo `synthetic=false`; AI concept image `synthetic=true` and never labelled as a real shoot reference.
5. The same imported reference can serve multiple shots and projects without duplicate assets.

### Must not do

- Do not connect real external accounts, bypass logins, or add scraping.
- Do not edit plan layout, commercial tools, schema, or V3 planning services.

### Focused verification

`node --test tests/node/v5/reference-ui-simplification.test.mjs`

### Handoff evidence

- Screenshot: reference gallery when offline/unavailable.
- Screenshot: one reference linked to two shots, with correct real/AI labels.

---

## P3 - V3 visual planning bridge

**Responsible for:** Agent D  
**Priority:** P1  
**Purpose:** Use V3 visual analysis only to improve the current plan’s storyboard, never as a detached technical workflow.

### Allowed write set

- `src/legacy-v3-planning-flow.js`
- `tests/node/v5/legacy-v3-planning-integration.test.mjs`

### Required result

1. Resolve the actual currently opened legacy candidate plan/project. Never create a fixed detached ID such as `legacy-v3-current-project`.
2. Reference -> VisualDNA -> creative direction -> storyboard draft is optional and progressively disclosed.
3. If there is no reference, retain the classic deterministic generator path.
4. V3 output becomes editable candidate-plan storyboard data only. It must not silently create formal Shots or Tasks.
5. Existing user confirmation remains the only route to formal writes.
6. Creative direction appears as supporting metadata after the storyboard, not as the primary screen.

### Must not do

- Do not modify `legacy/index.html`; P0 owns it.
- Do not change V5 schemas, entities, contracts, or approval state machines.
- Do not repair failures by weakening existing tests.

### Focused verification

`node --test tests/node/v5/legacy-v3-planning-integration.test.mjs`

### Handoff evidence

- Screenshot: classic no-reference plan generation.
- Screenshot: visual reference creates a candidate storyboard associated with the currently opened plan.

---

## P4 - Quote, batch tools and truthful availability

**Responsible for:** Agent E  
**Priority:** P2  
**Purpose:** Keep commercial tools out of the storyboard and remove all fake or inert controls.

### Allowed write set

- `src/legacy-commercial-tools.js` (new)
- `tests/node/v5/legacy-commercial-tools.test.mjs` (new)

### Required result

1. Quote calculator and batch tools appear in a lower “commercial and delivery tools” section, not in the storyboarding core.
2. Quote calculator derives an estimate from explicit inputs only. It never fabricates a payment, customer record, or final price.
3. “Generate quote” downloads a useful draft document or explicitly explains why generation is unavailable. No inert button.
4. AI recommendation, concept image, generated image, and delivery controls must either have a genuine available action or be visibly unavailable with a plain reason. Remove fake success states.
5. Never label a generated concept image as a real reference photograph.

### Must not do

- Do not modify plan markup/CSS, reference library, V3 bridge, or V5 contracts.
- Do not create a new navigation destination solely for these tools.

### Focused verification

`node --test tests/node/v5/legacy-commercial-tools.test.mjs`

### Handoff evidence

- Screenshot: quote calculation and generated/downloadable draft, or honest unavailable state.
- Screenshot: every remaining visible AI control has a real action or a reason.

---

## P5 - Independent QA and integration acceptance

**Responsible for:** One separate QA agent after P0-P4 are integrated  
**Priority:** Release gate  
**Purpose:** Verify behavior; do not “fix” product source in this package.

### Allowed write set

- Test files and fixtures only, if a new test is genuinely needed.

### Mandatory checks

```powershell
npm run test:scope -- planning
npm run test:scope -- references
npm run test:legacy
npm run build:v2
npm run test:dist
```

### Manual acceptance checklist

1. Brief -> storyboard first -> edit/reorder -> confirm -> schedule.
2. No reference/knowledge-base connection -> classic generation still works and no technical error dominates the page.
3. Real reference -> V3 creates candidate draft only; confirmation performs formal writes once.
4. LUT, equipment, reference bindings, plan library, and schedule remain reachable.
5. Quote and visible AI controls are functional or honestly unavailable.
6. Desktop and 390px mobile have no horizontal overflow.
7. Every view uses readable text and has no blank, duplicate, or detached workspace.

### Required QA report

1. Exact commits/diff reviewed.
2. Commands run and full result.
3. Failures, regressions, and suspected cross-package conflicts.
4. Screenshots of every checklist item.
5. Explicit statement: **no deployment performed**.

## Standard Trae prompt wrapper

Paste this before each package:

> You are responsible only for `<PACKAGE ID>` in `TRAE-PARALLEL-WORK-ORDERS.md`. Read the shared boundaries and your package before editing. Use only the allowed write set. Do not touch generated folders, schema, contracts, or any other package's files. Add and run the specified focused test. Do not deploy. End with changed files, behavior, focused test output, blockers, and confirmation that no other files were edited intentionally.

## What to return to Codex

1. The exact Trae worktree path.
2. Completed package IDs and one commit hash per package, or a complete diff.
3. Focused test outputs from P0-P4 and the full QA report from P5.
4. Required screenshots.
5. An explicit confirmation that no deployment occurred.

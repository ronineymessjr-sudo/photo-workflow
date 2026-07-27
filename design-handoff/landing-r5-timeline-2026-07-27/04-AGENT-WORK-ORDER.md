# PhotoAtelier Landing R5 Agent Work Order

## Task Identity

Task: `LANDING-R5-TIMELINE`

Priority: P1 public showcase redesign.

Owner: implementation Agent.

Reviewer: Codex.

## Starting Point

Repository:

`C:\Users\user\.trae-cn\worktrees\PhotoAtelier-V2.5-ToolDesk-Ready-2026-07-15\feat-photo-atelier-vnext-refactor-nWfuzz`

Read first:

1. Repository `AGENTS.md`.
2. This handoff's `00-START-HERE.md`.
3. Remaining handoff documents in order.

Before editing:

- Record `git branch --show-current`.
- Record `git status --short`.
- Do not discard or overwrite unrelated dirty-worktree changes.
- Do not switch to another checkout, archive, dist folder, or older PhotoAtelier version.

## Allowed Source Files

Primary:

- `index.html`
- `assets/landing.css`
- `src/public-beta.js`

New:

- `src/landing-motion.js`
- `src/landing-three.js` only if separately approved
- `assets/landing-ai/*`
- landing-specific tests under `tests/`

Build only when required:

- `tools/build-localized-landing.mjs`
- `tools/build-v2-dist.js`
- `sw.js`
- `package.json`
- `package-lock.json`

## Forbidden Files

- `legacy/**`
- `src/v5/**`
- `architecture/**`
- `worker/**`
- `src/app-enhancements.js`
- `src/legacy-resource-workspace.js`
- Schema, repositories, use cases, migrations, state machines, or stored user data.

## Implementation Phases

### Phase A: Assets

1. Generate A01–A10 using `03-GPT-IMAGE-ASSET-MANIFEST.md`.
2. Review continuity and reject broken generations.
3. Export approved web assets.
4. Add sidecar metadata with `synthetic=true`.
5. Verify there are no external image URLs.

Deliverable:

- Asset contact sheet.
- Asset sidecar JSON.
- File-size report.

### Phase B: Static Layout

1. Rebuild the landing page according to `01-LAYOUT-CONTENT-SPEC.md`.
2. Keep public beta feedback behavior.
3. Keep language routes/build compatibility.
4. Keep normal link fallback for the workspace CTA.
5. Verify desktop and mobile before animation.

Deliverable:

- Static desktop screenshot at `1440 x 1000`.
- Static mobile screenshot at `390 x 844`.
- No animation dependency yet.

### Phase C: GSAP

1. Add a pinned/versioned GSAP delivery method.
2. Implement `src/landing-motion.js`.
3. Add timeline progress and four stage reveals.
4. Add reduced-motion fallback.
5. Make initialization idempotent.
6. Clean up ScrollTriggers on teardown/reload where applicable.

Deliverable:

- Motion-enabled local page.
- Console log with zero application errors.
- Reduced-motion screenshot and behavior note.

### Phase D: Optional Three.js

Do not start unless Codex or the user approves after Phase C.

If approved:

1. Keep the static hero.
2. Dynamically import Three.js.
3. Add only photographic planes/contact-sheet depth.
4. Apply all performance and cleanup rules.
5. Verify nonblank canvas pixels on desktop.
6. Verify static fallback on mobile and reduced motion.

### Phase E: Build And Test

1. Update localized landing build if needed.
2. Run targeted landing tests.
3. Run `npm run build:v2`.
4. Run `npm run test:dist`.
5. Run `npm run test:public-beta`.
6. Run full release only before final handoff if shared build/security files changed.

Do not deploy.

## Required Tests

Add or update tests for:

- Hero CTA routes to `/legacy/?mode=public-beta`.
- Secondary CTA targets `#shoot-journey`.
- Exactly four timeline stages exist.
- Stages have order `01, 02, 03, 04`.
- Desktop alternation classes exist.
- Mobile collapses to one-side reading order.
- Every `<img>` has width, height, alt, and local URL.
- No external photography domains exist in HTML/CSS/JS.
- All generated asset metadata has `synthetic=true`.
- Reduced-motion CSS exists.
- GSAP failure leaves content visible.
- Feedback form still works.
- Locale switch still works.
- No horizontal overflow at `390px`.

## Visual Evidence

Required screenshots:

1. Desktop hero.
2. Desktop Stage 01 active.
3. Desktop Stage 02 active.
4. Desktop Stage 03 active.
5. Desktop Stage 04 active.
6. Desktop final CTA.
7. Mobile hero.
8. Mobile timeline.
9. Reduced-motion desktop.

## Agent Completion Report

Return only:

1. Files changed.
2. Asset files generated and metadata status.
3. GSAP delivery method.
4. Tests run and results.
5. Screenshot paths.
6. Whether Three.js was omitted or approved.
7. Any unresolved issue.

Do not report deployment because deployment is forbidden in this task.


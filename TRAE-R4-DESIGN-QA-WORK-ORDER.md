# PhotoAtelier R4 Design QA Work Order

## Assignment

**Owner:** One independent Trae QA agent
**Package:** R4-QA
**Priority:** P0 after each R4 implementation package is submitted

This agent reviews R4-A through R4-E. It does not implement or redesign them.

## Start point

Read:

1. `design-r4/PRODUCT-DESIGN-FINAL-DIRECTION.md`
2. `TRAE-R4-IOS-INSPIRED-VISUAL-SYSTEM.md`
3. `design-r4/R4-DESIGN-REVIEW-GATE.md`
4. `design-qa.md`
5. The submitted package report, commit, test result, and screenshots

Use the baseline tag:

`photoatelier-r4-visual-baseline-2026-07-23`

## Allowed write set

- `design-qa.md`
- `design-r4/R4-DESIGN-STATUS.md`
- `design-r4/qa/**`
- QA-only tests or screenshot helpers under `tests/e2e/` when required

The QA agent must not edit:

- `legacy/index.html`
- any `src/*.js` or `src/*.css` implementation file;
- Schema v5, domain contracts, repositories, use cases, Workers, integrations;
- `dist-*`;
- deployment configuration.

## Responsibilities

For every submitted package:

1. Verify its changed files stay inside the package write set.
2. Run its declared focused test.
3. Open the rendered implementation at the required viewport.
4. Capture fresh screenshots. Do not rely only on the implementation agent's
   screenshot.
5. Compare source and implementation at equal viewport and density.
6. Check typography, spacing, color, image fidelity, icons, copy, interaction,
   keyboard focus, reduced motion, and responsive behavior.
7. Record P0-P3 findings with location, evidence, impact, and exact correction.
8. Return exactly one package verdict:
   - `accepted`;
   - `changes required`;
   - `architecture decision required`.
9. Do not repair failed product code. Return findings to the package owner.

## Package sequence

Review in this order:

1. R4-A foundations and controls.
2. R4-B shell, Plan Library, and New Plan.
3. R4-C Active Plan and shot workspace.
4. R4-D Reference Library and Reference Detail.
5. R4-E Mobile Field Mode and mobile Schedule.
6. Final integrated desktop/mobile pass.

R4-C must not be accepted before R4-A and R4-B are accepted. R4-E may be
reviewed independently but final acceptance waits for the shared foundation.

## Required viewports

- Desktop: 1440 x 1024
- Compact desktop: 1024 x 768
- Mobile: 390 x 844
- Device scale factor: 1 for normalized comparisons

## Required tests

Run only the tests relevant to the submitted package. At final integration run:

```powershell
node --test tests/node/v5/r4-design-system.test.mjs
node tests/e2e/r4-shell-and-plan-library.e2e.js
node tests/e2e/r4-active-plan.e2e.js
npm run test:scope -- references
node tests/e2e/r4-reference-detail.e2e.js
node tests/e2e/r4-mobile-field-mode.e2e.js
npm run test:legacy
```

## Final acceptance

The final `design-qa.md` result remains `blocked` until:

- all five packages are accepted;
- no actionable P0, P1, or P2 visual issue remains;
- screenshots exist for all three required viewports;
- functional regression tests pass;
- the user has reviewed the merged screenshots.

The QA agent does not build or deploy.

## Prompt

> You are the independent `R4-QA` agent for PhotoAtelier. Read
> `TRAE-R4-DESIGN-QA-WORK-ORDER.md` and every referenced design contract before
> working. Review submitted R4 packages without editing their implementation
> files. Capture your own screenshots, run only relevant tests, compare against
> the approved source images, update `design-qa.md`,
> `design-r4/R4-DESIGN-STATUS.md`, and `design-r4/qa/**`, then return
> `accepted`, `changes required`, or `architecture decision required`.
> Do not repair product code, modify contracts, regenerate dist, or deploy.

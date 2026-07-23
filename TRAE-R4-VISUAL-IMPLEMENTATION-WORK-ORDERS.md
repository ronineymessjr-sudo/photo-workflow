# PhotoAtelier R4 Visual Implementation Work Orders

## 1. Baseline and source of truth

All five Trae agents must start from the same repository tag:

`photoatelier-r4-visual-baseline-2026-07-23`

Do not copy files from another PhotoAtelier folder, an older Cloudflare build, a
preview branch, or `dist-*` back into this worktree.

Read in this order:

1. `design-r4/PRODUCT-DESIGN-FINAL-DIRECTION.md`
2. `TRAE-R4-IOS-INSPIRED-VISUAL-SYSTEM.md`
3. This work-order file

Visual references:

- `design-r4/assets/desktop-active-plan.png`
- `design-r4/assets/desktop-reference-detail.png`
- `design-r4/assets/mobile-field-mode.png`

The Markdown contracts override incidental details in the images.

## 2. Shared rules

- This round changes information hierarchy and presentation only.
- Do not modify Schema v5, entities, repositories, use-case meanings, relation
  contracts, state machines, Workers, Feishu, Obsidian APIs, or deployment.
- Keep existing local data and compatibility behavior.
- Use Lucide only. Remove emoji and mixed icon treatment from the surface owned
  by the package.
- Use the R4 neutral charcoal and muted sage tokens. Photography may remain
  colorful; application chrome may not.
- Ordinary cards, fields, and buttons use at most 8 px radius. Glass is limited
  to floating toolbars and genuine sheets.
- Every visible action must work. Hide unfinished actions instead of styling
  them as available.
- Support keyboard focus, reduced motion, 1440 px desktop, and 390 px mobile.
- Do not edit files owned by another package.
- Do not edit `dist-v2`, `dist-classic-addon`, or `dist-reference-addon`.
- Each agent runs only its focused test and provides one desktop or mobile
  screenshot as specified.

## 3. Package ownership

| Package | Priority | Product slice | Existing file owner |
| --- | --- | --- | --- |
| R4-A | P0 | Foundations and shared controls | New files only |
| R4-B | P0 | App shell, Plan Library, New Plan | `legacy/index.html` |
| R4-C | P0 | Desktop Active Plan and shot workspace | `src/app-enhancements.js` |
| R4-D | P0 | Reference Library and Reference Detail | `src/photographer-reference-ui.js` |
| R4-E | P0 | Mobile Field Mode and mobile Schedule | New files only |

## 4. R4-A - Foundations and shared controls

**Allowed write set**

- `src/r4-design-system.css` (new)
- `src/r4-icon-system.js` (new)
- `tests/node/v5/r4-design-system.test.mjs` (new)

**Deliver**

- Implement the complete R4 color, type, spacing, radius, border, focus, motion,
  and responsive tokens.
- Implement reusable styles for primary, secondary, quiet, destructive, icon,
  segmented, field, menu, sheet, toast, status, empty-state, and toolbar
  controls.
- Provide a small icon helper around the Lucide runtime already loaded by the
  compatibility page. It must use semantic names and refresh icons after
  dynamic rendering.
- Include default, hover/pressed, focus-visible, disabled, loading, selected,
  high-contrast, and reduced-motion states.
- Do not restyle a specific product page in this package.

**Acceptance**

- No purple, neon cyan, gradient orb, emoji icon, negative letter spacing, or
  radius above the permitted component rules appears in these files.
- Touch controls can reach 44 x 44 px in the mobile mode.
- The CSS can be loaded without changing existing page behavior.

**Focused test**

`node --test tests/node/v5/r4-design-system.test.mjs`

**Evidence**

One component-state sheet screenshot at 1440 px.

## 5. R4-B - App shell, Plan Library, and New Plan

**Allowed write set**

- `legacy/index.html`
- `src/r4-shell.css` (new)
- `tests/e2e/r4-shell-and-plan-library.e2e.js` (new)

**Deliver**

- Replace the current navigation presentation with six destinations:
  `方案库`, `新建方案`, `参考图库`, `日程`, `设备与 LUT`, `设置`.
- Reuse existing routes and functions. Combining Equipment and LUT is a
  presentation container change, not a data migration.
- Make Plan Library the normal starting work surface. Show plan name, state,
  next shoot, meaningful reference image when one exists, and one primary
  action.
- Keep New Plan as a compact brief. Required fields remain theme/task, people,
  place, style, and duration; secondary constraints stay collapsed.
- Remove the current desktop impression of a long form beside a large empty
  output panel.
- Keep feedback available as a quiet secondary command rather than a bright
  floating block over working content.
- On mobile, provide the shell only; R4-E owns field-mode content and bottom
  navigation.

**Acceptance**

- Plan Library opens without generating a new plan.
- New Plan works with presets and manual values.
- Navigation uses Lucide icons and one selected state.
- No primary data action is lost.
- No horizontal overflow at 1440, 1024, or 390 px.

**Focused test**

`node tests/e2e/r4-shell-and-plan-library.e2e.js`

**Evidence**

Screenshots of Plan Library and New Plan at 1440 px.

## 6. R4-C - Desktop Active Plan and shot workspace

**Allowed write set**

- `src/app-enhancements.js`
- `src/r4-active-plan.css` (new)
- `tests/e2e/r4-active-plan.e2e.js` (new)

**Deliver**

- Implement the desktop Active Plan structure:
  `216 px navigation | 320-360 px project references | flexible shot workspace`.
- The ordered complete shot list is the first substantive plan result.
- Each shot row shows number/name, framing or scene, lens/focal length,
  pose/movement cue, lighting direction, estimated time, state, and More.
- Selecting a shot opens an execution detail with linked reference, equipment,
  pose, lighting, position, fallback, note, complete, and edit actions.
- Show only real project-selected reference images in the reference column.
  Label concept images explicitly and never present them as real shoot photos.
- Place equipment, LUT, schedule, styling, props, creative notes, quotation,
  export, Agent approval, and review after the shot list or inside More.
- Keep the R3 collapsed `方案资源` archive recoverable.
- Do not change generation, scheduling, reference, LUT, or approval contracts.

**Acceptance**

- A photographer can understand the next shot without opening optional panels.
- Editing/completing one shot does not rerender or overwrite unrelated shots.
- Empty references show one viable action, not generic album covers.
- Existing equipment, LUT, schedule, export, and approval actions remain
  functional.

**Focused test**

`node tests/e2e/r4-active-plan.e2e.js`

**Evidence**

Screenshots of the shot list and one opened shot detail at 1440 px.

## 7. R4-D - Reference Library and Reference Detail

**Allowed write set**

- `src/photographer-reference-ui.js`
- `src/r4-reference-workspace.css` (new)
- `tests/e2e/r4-reference-detail.e2e.js` (new)

**Deliver**

- Make the library first level a calm image browser: actual thumbnail, concise
  title, asset type, and one useful fact only.
- Opening a tile enters Reference Detail rather than expanding all metadata in
  the grid.
- Implement the detail layout:
  `actual image 44% | analysis/source 26% | linked plans/shots 30%`.
- Show exact source, author when known, composition, lens/focal data, lighting,
  color/LUT relationship, linked plans, linked shots, and one add/remove
  project command.
- Preserve V5 `referenceLibrary` reads and the existing V5 ingest/select/bind
  use cases. Do not restore direct legacy reference writes.
- Distinguish `synthetic=false` photo references from `synthetic=true` concept
  images in text and appearance.
- A source action opens the exact item URL or exact local asset. Generic provider
  home pages remain hidden.
- Limit the floating image toolbar to fit, compare, grid, information, and More.

**Acceptance**

- The same asset can remain linked to multiple projects.
- Removing a project link does not delete the global asset.
- Removing a shot link does not remove the project link.
- Refresh preserves project and shot relationships.
- Missing source data is described honestly and does not create an active link.

**Focused tests**

`npm run test:scope -- references`

`node tests/e2e/r4-reference-detail.e2e.js`

**Evidence**

Screenshots of the reference grid and one real Reference Detail at 1440 px.

## 8. R4-E - Mobile Field Mode and mobile Schedule

**Allowed write set**

- `src/r4-mobile-field-mode.js` (new)
- `src/r4-mobile-field-mode.css` (new)
- `tests/e2e/r4-mobile-field-mode.e2e.js` (new)

**Deliver**

- Build a mobile-only Field Mode adapter using the existing active plan,
  generated shots, selected references, shoot records, and schedule actions.
- Content order is fixed: real reference, shot number/title, lens, pose or
  movement, lighting direction, estimated time, mark complete, view reference,
  add note, bottom navigation.
- Mobile bottom navigation has four destinations: `方案`, `参考`, `日程`, `我的`.
- Detail and note editing open as sheets with 16 px top corners; do not compress
  desktop columns into mobile cards.
- Mobile Schedule can move between dates and open the selected scheduled plan.
- Keep one filled primary action on screen. All touch controls are at least
  44 x 44 px.
- Desktop behavior must remain untouched when the field-mode media query is not
  active.

**Acceptance**

- 390 x 844 has no horizontal overflow.
- The current shot appears before project description or optional resources.
- Mark complete persists through refresh and advances clearly to the next shot.
- A date other than today can be selected and opened.
- Reduced-motion mode remains fully usable.

**Focused test**

`node tests/e2e/r4-mobile-field-mode.e2e.js`

**Evidence**

Screenshots of Field Mode and mobile Schedule at 390 x 844.

## 9. Integration and QA gate

After R4-A through R4-E are complete, use one integration/QA agent. It may:

- load the new R4 CSS/JS files from `legacy/index.html`;
- resolve load order only;
- update integration tests and QA screenshots;
- regenerate `dist-*` only after all source tests pass.

It may not redesign a package or silently repair a failed package by changing
its owned source.

Run:

```powershell
node --test tests/node/v5/r4-design-system.test.mjs
node tests/e2e/r4-shell-and-plan-library.e2e.js
node tests/e2e/r4-active-plan.e2e.js
npm run test:scope -- references
node tests/e2e/r4-reference-detail.e2e.js
node tests/e2e/r4-mobile-field-mode.e2e.js
npm run test:legacy
```

Then perform visual QA at:

- 1440 x 1024 desktop;
- 1024 x 768 compact desktop;
- 390 x 844 mobile;
- keyboard-only navigation;
- reduced motion.

Do not deploy until the user accepts the merged screenshots.

## 10. Standard prompt for each Trae agent

> You own only `<R4-A | R4-B | R4-C | R4-D | R4-E>` in
> `TRAE-R4-VISUAL-IMPLEMENTATION-WORK-ORDERS.md`. Start from the exact tag
> `photoatelier-r4-visual-baseline-2026-07-23`. Read the shared rules, your
> package, and the two R4 design source documents before editing. Use only your
> allowed write set. Do not modify Schema v5, domain contracts, Workers,
> external integrations, deployment, generated dist folders, or another
> package's files. Implement the slice completely, run only its focused test,
> capture the required screenshot, and finish with changed files, behavior,
> exact test result, screenshot path, blockers, and confirmation that no
> deployment occurred.

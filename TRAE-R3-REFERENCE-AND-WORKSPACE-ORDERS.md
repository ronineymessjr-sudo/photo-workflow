# PhotoAtelier R3: Reference Context and Workspace Cleanup

## Product decision

The current reference assistant is not useful because it emits category covers and generic platform home/search links without opening a concrete asset or preserving the current plan context. This release removes that false affordance.

The main workspace must keep only what is useful for making an executable storyboard. Creative directions, reference albums, shoot recommendations, and prop recommendations are preserved as optional plan resources, but are removed from the generator/workspace main path until their data is genuinely usable.

## Shared rules

- Worktree: `C:\Users\user\.trae-cn\worktrees\PhotoAtelier-V2.5-ToolDesk-Ready-2026-07-15\feat-photo-atelier-vnext-refactor-nWfuzz`
- Baseline: commits `e493f96` and `3814afb` plus a clean worktree.
- No Schema V5, V5 entity, status machine, Worker contract, or deployment changes.
- No actual external account login, scraping, or personal data upload.
- A concrete external asset may be opened only with its verified `sourceUrl`. A missing URL is not a source link.
- A contextual search may open exactly one configured target application and must carry its query/context. It must never masquerade as a concrete asset.
- No agent edits another package's allowed files. Every package adds its own focused test.
- Do not hand-edit `dist-*`; build outputs are regenerated only after integration.

## Required outcome

1. Delete the visible five-card recommendation clusters such as “style + scene”, “style + props”, and “scene + focal length”.
2. Replace them with at most **one** “continue with this context” action when a plan/shot has enough information.
3. The action receives: `planId`, `shotId` when applicable, theme, style, scene, mood, orientation, focal length, and selected reference IDs. It opens only the photographer-selected destination with a readable generated query.
4. Generic covers, generic source home pages, empty reference albums, and inert source buttons disappear from the workspace.
5. “Quickly create a shoot proposal” moves up into the first useful plan surface. Its supporting copy is compact.
6. Users can set up their own private library in a clear settings wizard. The app shows a real health result and never claims that a folder or connection exists when it does not.
7. In the main workspace, hide/archive: creative direction, reference albums, shoot recommendation panels, and prop recommendation panels. Their saved data remains intact and may be viewed later only in an optional plan-resource detail area.

---

## R3-A — Generator shell and workspace declutter

**Owner:** Trae agent A  
**Priority:** P0  
**Estimated size:** 1 focused UI slice

### Allowed write set

- `legacy/index.html`
- `tests/e2e/r3-generator-shell.e2e.js` (new)

### Deliver

- Move “快速建立拍摄提案” to the first main content area of the plan page, before lower plan/library material.
- Make its supporting description one short sentence. Keep only the five necessary conditions and one concise “more conditions” disclosure.
- Remove the visible recommendation cluster markup and old direct platform buttons from the generator result area.
- Remove the visible main-workspace panels for creative direction, reference albums, shoot recommendations, and prop recommendations. Do not delete saved data or the later resource hooks supplied by R3-D.
- Add only stable mount points for R3-B contextual action and R3-D optional resources. Do not implement their business logic here.
- Keep optional module imports fault tolerant.

### Acceptance

- No visible labels matching “风格+场景”, “风格+道具”, “场景+焦距”, “参考专辑”, or “道具推荐” remain in the generator/workspace main path.
- The plan-generation form is the first meaningful content after choosing the plan section.
- A fresh browser user can generate using presets or their own five required conditions.
- Mobile 390px has no horizontal overflow.

### Focused test

`node tests/e2e/r3-generator-shell.e2e.js`

---

## R3-B — One contextual reference handoff, never generic covers

**Owner:** Trae agent B  
**Priority:** P0  
**Estimated size:** 1 focused UI/data slice

### Allowed write set

- `src/photographer-reference-ui.js`
- `src/legacy-reference-context-launcher.js` (new)
- `tests/node/v5/r3-reference-context-launcher.test.mjs` (new)

### Deliver

- Remove multi-item category-cover recommendation output from the reference assistant.
- Create one reusable contextual handoff action for an eligible plan/shot. Its label must name the configured application and query, for example “在 Pexels 搜索：城市夜景 50mm 情绪人像”.
- Build the query from structured current context: theme, style, scene, mood, orientation, focal length, selected references; omit missing fields rather than inventing them.
- Support exactly one user-selected target at a time from an explicit setting value. Initial supported targets may be Pexels, Unsplash, Pixabay, or the local personal library. Do not render several target cards at once.
- A reference card’s “来源” button appears only if its `sourceUrl` is a concrete item URL. Otherwise render no source button.
- Preserve true photo / concept distinction: `synthetic=false` remains a real reference; `synthetic=true` is never offered as a real source.

### Acceptance

- A single action has all required context encoded in the target query/URL.
- No generic provider home page opens from a reference card.
- Missing source URL means no clickable “来源”.
- No context means the handoff is hidden with no dead button.

### Focused test

`node --test tests/node/v5/r3-reference-context-launcher.test.mjs`

---

## R3-C — Personal library setup and truthful connection health

**Owner:** Trae agent C  
**Priority:** P0  
**Estimated size:** 1 focused integration slice

### Allowed write set

- `src/legacy-knowledge-bridge.js`
- `src/obsidian-library-onboarding.js` (new)
- `tests/node/v5/r3-personal-library-onboarding.test.mjs` (new)

### Deliver

- Create a small settings-mounted onboarding controller for a user’s private photography library, with these states only: not configured, ready to test, connected, unavailable, and needs repair.
- Explain the user-owned library structure in photographer language, not technical proxy language: `PhotoAtelier / Reference Inbox / Shoot Notes / Reviews`.
- The “create/prepare library” action may create those folders only when an existing authenticated local bridge exposes an explicit writable endpoint. If no such endpoint exists, do not fake creation: show the exact manual folder structure and a “test again” action.
- Test connection using the configured path/service and return a specific health result: reachable, path missing, unauthorized, or service unavailable.
- Expose a stable `getPersonalLibraryHealth()` result usable by R3-D and R3-B, without injecting technical failure cards into the main reference gallery.

### Architecture stop rule

If the current local bridge lacks a safe explicit folder-creation endpoint, do not add an undocumented write endpoint or change its contract. Report `ARCHITECTURE DECISION REQUIRED` with the exact missing operation.

### Focused test

`node --test tests/node/v5/r3-personal-library-onboarding.test.mjs`

---

## R3-D — Archive optional plan resources and remove repetitive albums

**Owner:** Trae agent D  
**Priority:** P1  
**Estimated size:** 1 focused plan-resource slice

### Allowed write set

- `src/app-enhancements.js`
- `src/legacy-plan-resources.js` (new)
- `tests/node/v5/r3-plan-resources.test.mjs` (new)

### Deliver

- Move existing creative direction, reference-album, shoot recommendation, and prop recommendation content out of the main workspace into a collapsed “方案资源” detail area attached to the currently opened plan.
- Do not surface empty or repeated seed albums as recommendations. When no genuinely selected reference exists, show a small empty state and one route to the reference library, not the same few cover images.
- Show personal library setup/status only inside the resource detail or settings entry, never as a broken primary workspace panel.
- Keep all existing plan/resource data recoverable and read-only-compatible; this change is presentation relocation, not deletion.
- Use R3-C’s health result when available; absence must degrade quietly.

### Acceptance

- Main generator/workspace has no creative, album, shoot recommendation, or props sections.
- Existing plans can still open their saved optional resources from “方案资源”.
- Empty source data never renders fixed cover albums.

### Focused test

`node --test tests/node/v5/r3-plan-resources.test.mjs`

---

## R3-E — Context data, settings contract, and regression coverage

**Owner:** Trae agent E  
**Priority:** P1  
**Estimated size:** 1 focused data/verification slice

### Allowed write set

- `data/v5-reference-import-plan.json`
- `data/v5-real-data-catalog.json`
- `src/data/photography-rules.js`
- `tests/node/v5/r3-reference-seed-contract.test.mjs` (new)

### Deliver

- Remove or mark non-recommendable any seed items that exist only as generic category covers and cannot point to a concrete source asset.
- Add a small declarative contract describing allowed contextual handoff fields and the initial destination choices, so R3-B does not hard-code provider-specific scattered rules.
- Ensure the seed catalog distinguishes: concrete asset, query-only handoff template, local-private placeholder, and synthetic concept.
- Do not add more content cards or external data sources in this release.

### Acceptance

- No seed record claims a source URL unless it is an actual item URL.
- Generic album/cover data cannot be selected as a recommended concrete asset.
- The context contract accepts missing optional fields and requires no invented values.

### Focused test

`node --test tests/node/v5/r3-reference-seed-contract.test.mjs`

---

## Integration and QA gate

After R3-A through R3-E merge, use one QA agent only. It may edit tests/fixtures only.

```powershell
npm run test:scope -- references
npm run test:legacy
node tests/e2e/r3-generator-shell.e2e.js
node --test tests/node/v5/r3-reference-context-launcher.test.mjs
node --test tests/node/v5/r3-personal-library-onboarding.test.mjs
node --test tests/node/v5/r3-plan-resources.test.mjs
node --test tests/node/v5/r3-reference-seed-contract.test.mjs
```

Manual checks:

1. A selected reference opens its real source item, not a provider front page.
2. One contextual action opens only the configured destination and contains the current plan/shot query.
3. No reference context means no inactive jump button.
4. Personal library setup never claims success without a passing health check.
5. Main workspace is shorter and focused on Brief -> storyboard -> confirm -> schedule.
6. Existing saved creative/resources remain recoverable from “方案资源”.

## Standard Trae prompt wrapper

> You own only `<R3-A | R3-B | R3-C | R3-D | R3-E>` in `TRAE-R3-REFERENCE-AND-WORKSPACE-ORDERS.md`. Read its shared rules and your package before editing. Use only the allowed write set. Do not alter schemas, entities, Workers, generated dist folders, deployment, or another package’s files. Add and run only the specified focused test. Do not fake external links, source URLs, personal-library creation, or connection health. Finish with changed files, behavior, exact test result, blockers, and confirmation that no deployment occurred.

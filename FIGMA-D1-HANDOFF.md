# PhotoAtelier D1 Figma Handoff

## Design file

- Figma: https://www.figma.com/design/s2M0LIPCwR4oqXYHkOvaS7
- Scope: design contract only. It does not authorize product or schema changes.

## Approved screens

1. `Desktop - Plan Library`
   - Plans are the entry point, grouped by lifecycle state.
   - Every row has one primary next action.
2. `Desktop - New Plan Brief`
   - Collect five required conditions only: task, people, location, style, duration.
   - Generation creates a candidate storyboard, never a confirmed plan or schedule.
3. `Desktop - Active Shoot Plan`
   - Storyboard is the first and largest post-generation surface.
   - Shared reference set and execution rhythm are secondary, lower panels.
4. `Mobile - Reference Selection`
   - Reference selection is a visual grid and shared plan-level set.
   - Bind to individual shots only after selection.
5. `Mobile - Field Mode`
   - Field work focuses on one current shot, not the full desktop workspace.
   - The immediate actions are complete, mark for reshoot, add note/sample, and view reference.

## Visual rules

- Base: charcoal `#101312`, elevated surface `#171B19`, subtle surface `#222925`.
- Text: `#F3F5F2` primary, `#B6BDB7` secondary, `#9AA39C` muted.
- Single action accent: `#3ED3A6`; warning can use muted warm yellow only for incomplete states.
- Use 6-8px corner radii, thin dividers, and no decorative gradients.
- Do not put major page sections inside layered cards.
- Real reference thumbnails replace the intentional image placeholders at implementation time. Do not use AI concepts as real photographic references.

## Interaction rules

- Desktop: persistent left rail; main content has one primary action.
- Mobile: bottom navigation for Plan, Reference, Schedule, Mine; no compressed desktop sidebar.
- Detailed shot metadata opens in a drawer or detail view. Do not print every field under every shot by default.
- A user without a personal library still uses built-in references and uploads without technical connection errors.

## Implementation order

1. Desktop plan library and candidate-plan brief.
2. Desktop storyboard-first active plan.
3. Mobile reference selection.
4. Mobile field mode.

Each completed page needs visual checks at 1440px desktop and 390px mobile. Do not implement screens not represented above until these are accepted.

# PhotoAtelier R4 Design Review Gate

## Purpose

This is the visual acceptance contract used by the independent R4-QA agent
after each implementation package finishes. Automated tests prove behavior;
they do not prove that the design is complete.

An implementation passes only when:

- the required source and rendered screenshots exist;
- the same state is compared at the same viewport;
- no actionable P0, P1, or P2 design finding remains;
- the package does not change product behavior outside its responsibility.

## Evidence required from every package

1. Exact commit hash and changed files.
2. Focused test command and complete result.
3. Required screenshot at the specified viewport.
4. Browser console errors.
5. Keyboard or touch interactions exercised.
6. Confirmation that no deployment or `dist-*` edit occurred.

Screenshots belong under:

`design-r4/qa/packages/<package-id>/`

Use stable names such as:

- `desktop-1440x1024.png`
- `compact-1024x768.png`
- `mobile-390x844.png`
- `focus-state.png`
- `empty-state.png`

## Global rejection conditions

- The shot list is not the first substantive result of an active plan.
- A decorative cover is shown where a real selected reference should appear.
- An AI concept image is labelled or implied to be a real photo reference.
- A visible button does nothing.
- A generic provider home page is used as an asset source.
- Emoji, mixed icon packs, animated stickers, gradient blobs, or colored glow
  appear in product chrome.
- Ordinary cards, fields, or buttons exceed 8 px radius.
- Glass treatment is used on normal content surfaces.
- More than one filled primary action competes in the same working context.
- Text or controls overlap, clip, or cause horizontal overflow.
- Mobile is implemented as a compressed desktop editor instead of Field Mode.
- A touch target is smaller than 44 x 44 px.
- Keyboard focus is invisible or reduced-motion mode loses functionality.

## R4-A review

Required:

- Exact semantic color tokens from the approved design direction.
- Defined desktop and mobile typography roles with zero letter spacing.
- Shared button, icon button, field, menu, sheet, toast, segmented control,
  empty state, and status states.
- Lucide-only icon helper with accessible names for icon-only controls.
- Focus-visible, disabled, loading, selected, high-contrast, and
  reduced-motion states.

Reject when:

- the stylesheet tries to redesign a specific product page;
- tokens duplicate existing meanings under unrelated names;
- the icon helper draws custom SVG or uses emoji fallbacks.

## R4-B review

Required:

- Six desktop destinations: 方案库、新建方案、参考图库、日程、设备与 LUT、设置.
- Plan Library is the normal work entry.
- New Plan is compact and keeps secondary constraints collapsed.
- A plan card shows status and next shoot; it uses an image only when the image
  is meaningful.
- Feedback is available but does not cover primary content.
- 1440, 1024, and 390 px have no horizontal overflow.

Reject when:

- the page still opens as a long brief beside an empty output region;
- Plan Library is a dashboard collage or a wall of decorative cards;
- Equipment and LUT data are deleted rather than presented together.

## R4-C review

Required:

- Desktop proportions approximate 216 px navigation, 320-360 px reference
  column, and a flexible shot workspace.
- Project name, date, location, status, and one primary command are visible.
- Ordered complete shot list is the first working region.
- Shot rows include number/name, framing, lens, pose/movement, light, time,
  state, and More.
- Selecting one row reveals execution detail without expanding every row.
- Real selected references occupy the reference column.
- Equipment, LUT, schedule, styling, props, creative notes, quote, export,
  approval, and review remain secondary and recoverable.

Reject when:

- long creative explanations remain inside every shot row;
- optional resources appear before the complete shot list;
- editing one shot visually rebuilds or loses unrelated shot state.

## R4-D review

Required:

- First-level library shows thumbnail, concise title, type, and one useful fact.
- Reference Detail uses the approved image/analysis/relations hierarchy.
- Exact source, available author, composition, lens, light, color/LUT, plans,
  and shots are progressively disclosed.
- Photo reference and concept image labels are unambiguous.
- One add/remove project command is primary.
- Floating image toolbar contains only fit, compare, grid, info, and More.

Reject when:

- all metadata is expanded in the library grid;
- fixed covers repeat as if they are real assets;
- source, project, and shot relations are visually conflated.

## R4-E review

Required:

- Current real reference is the first mobile anchor.
- Shot number/title, lens, pose/movement, lighting, and estimated time precede
  secondary project material.
- Mark complete is the only filled primary action.
- View reference and add note remain secondary.
- Bottom navigation has 方案、参考、日程、我的.
- Detail opens as a sheet with 16 px top corners.
- Mobile Schedule can select and open dates other than today.

Reject when:

- desktop columns or the long New Plan form appear as Field Mode;
- quotation, integrations, batch tools, or full creative editing appear in the
  first mobile task;
- completion does not persist or clearly advance.

## Integration review order

1. Validate R4-A independently.
2. Merge and validate R4-B shell.
3. Add R4-C Active Plan and compare desktop source.
4. Add R4-D Reference Detail and compare desktop reference source.
5. Add R4-E and compare mobile source.
6. Run functional regression tests.
7. Capture 1440, 1024, and 390 px final evidence.
8. Update root `design-qa.md`.
9. Build and deploy only after `final result: passed` and user approval.

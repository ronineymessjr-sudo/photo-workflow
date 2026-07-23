# PhotoAtelier R4 Final Product Design Direction

## Decision

The visual direction is now fixed. The three generated concepts are not three competing products:

- `desktop-active-plan.png` is the primary product direction and the source of truth for the desktop workspace.
- `desktop-reference-detail.png` is a secondary reference-detail workflow using the same visual system.
- `mobile-field-mode.png` is the mobile execution workflow using the same visual system.

Do not combine their different navigation structures verbatim. The navigation, typography, iconography, tokens, and component rules in this document override incidental differences in the concept images.

## Product character

PhotoAtelier is a quiet personal photography workbench. Photography supplies the color and emotion; the interface supplies order.

The product should feel:

- precise enough for pre-production;
- quick enough for use during a shoot;
- visually calm enough to keep reference images and shots dominant;
- professional without becoming an enterprise dashboard;
- influenced by Apple interaction hierarchy without imitating an iPhone or macOS application.

## Final navigation

Desktop navigation has six destinations:

1. Plan Library
2. New Plan
3. References
4. Schedule
5. Equipment & LUT
6. Settings

Quotation, batch processing, export, integration health, and advanced maintenance are not primary navigation. They live in a plan's `More` menu or the Equipment & LUT tools area.

Mobile bottom navigation has four destinations:

1. Plans
2. References
3. Schedule
4. Me

## Screen 1: Desktop Active Plan

Visual target: `assets/desktop-active-plan.png`

This is the main product screen and must lead with the complete ordered shot list.

### Layout

```text
| Navigation 216 | Project references 320-360 | Shot workspace flexible |
```

- Navigation remains quiet and stable.
- The reference column shows the project's real selected images, not generic album covers.
- The shot workspace begins with plan name, date, location, status, and one primary action.
- The complete shot list occupies the first working region.
- Selecting a shot opens its execution details below the list or in a right drawer.
- Shared plan resources sit after the shot list: equipment, LUT, schedule, styling, props, creative notes.

### Shot row

Every visible shot row includes:

- shot number and name;
- framing or scene;
- lens/focal length;
- pose or movement cue;
- lighting direction;
- estimated minutes;
- state;
- More menu.

The row does not include long creative explanations. Those belong in the selected-shot detail.

### Shot detail

The selected-shot detail contains:

- linked reference image;
- camera and lens;
- pose instruction;
- lighting setup;
- location or position;
- fallback shot;
- note;
- mark complete/edit actions.

## Screen 2: Desktop Reference Detail

Visual target: `assets/desktop-reference-detail.png`

The large real image is the primary content. Information is progressively disclosed rather than spread across the reference library.

### Layout

```text
| Actual image 44% | Asset analysis and source 26% | Linked plans/shots 30% |
```

### Required content

- real image or clearly labelled AI concept image;
- title and exact source;
- photographer/author when available;
- composition notes;
- lens and focal information when known;
- lighting and color observations;
- palette/LUT relationship;
- linked projects and linked shots;
- one command: `Add to project` or `Remove from project`.

Opening a source must lead to the exact asset or exact source URL. A generic website landing page is not a completed link.

The floating image toolbar is limited to fit, compare, grid, information, and More. It is the only glass-like desktop element.

## Screen 3: Mobile Field Mode

Visual target: `assets/mobile-field-mode.png`

The mobile experience is not a compressed desktop editor. It shows one current shot and the next physical action.

### Content order

1. Current real reference image.
2. Shot number and shot title.
3. Lens.
4. Pose/movement cue.
5. Lighting direction.
6. Estimated time.
7. Primary action: `Mark shot complete`.
8. Secondary actions: view reference and add note.
9. Bottom navigation.

No quotation, batch processing, integration configuration, large plan explanation, or full creative-direction editor appears in field mode.

## Visual system

### Color

The interface uses neutral charcoal plus one muted sage action color.

| Role | Value |
| --- | --- |
| Canvas | `#111312` |
| Raised surface | `#191D1B` |
| Selected surface | `#242A27` |
| Subtle border | `#303833` |
| Primary text | `#F2F5F1` |
| Secondary text | `#B5BDB6` |
| Tertiary text | `#7D887F` |
| Primary action | `#8DB89E` |
| Warning | `#D6A75B` |
| Danger | `#D9776D` |
| Success | `#75B892` |

Rules:

- no purple, bright cyan, neon green, or rainbow gradient in product chrome;
- photography is allowed to be colorful;
- status colors represent status only;
- one screen has one filled primary action;
- no colored category cards.

### Typography

Web stack:

```css
font-family: Inter, "PingFang SC", "Noto Sans SC", "Microsoft YaHei UI",
  system-ui, -apple-system, "Segoe UI", sans-serif;
```

| Role | Desktop | Mobile | Weight |
| --- | --- | --- | --- |
| Page title | 30/38 | 26/34 | 700 |
| Section title | 20/28 | 20/28 | 600 |
| Shot title | 17/24 | 17/24 | 600 |
| Body | 15/22 | 17/24 | 400 |
| Label | 13/18 | 13/18 | 500 |
| Metadata | 12/16 | 12/16 | 400 |

Do not copy the serif wordmark/body treatment seen incidentally in generated images. The product interface uses the sans-serif system above. Letter spacing is zero.

### Shape and material

- page bands and split panes: no radius;
- cards, inputs, image tiles, and ordinary buttons: 8 px radius;
- mobile sheet: 16 px top corners only;
- pill shape: tags and segmented controls only;
- borders: 1 px low-contrast neutral;
- glass: mobile bottom toolbar, floating image toolbar, and genuine sheets only;
- no colored glow, gradient blobs, or card-inside-card layouts.

### Icons

Use Lucide only in the web implementation.

- 16 px for metadata actions;
- 18 px for desktop controls;
- 20 px for navigation and mobile controls;
- 1.75 px stroke;
- outline style by default;
- icon-only controls require a tooltip;
- no emoji, animated stickers, multicolor illustrations, or mixed icon packs.

Primary mapping:

| Meaning | Icon |
| --- | --- |
| Plan Library | `ClipboardList` |
| New Plan | `Plus` |
| References | `Images` |
| Schedule | `CalendarDays` |
| Equipment | `Camera` |
| LUT | `Palette` |
| Search | `Search` |
| Filter | `SlidersHorizontal` |
| Edit | `Pencil` |
| More | `Ellipsis` |
| Open source | `ExternalLink` |

## Core component set

The following shared components are required before page-by-page styling:

- application shell;
- navigation item;
- bottom navigation item;
- primary/secondary/quiet/destructive button;
- icon button;
- toolbar and More menu;
- reference tile;
- shot row;
- selected-shot detail;
- segmented control;
- sheet/drawer;
- empty state;
- status indicator;
- toast;
- input, select, and date/time control.

Each component needs default, hover/pressed, keyboard focus, disabled, loading, selected, and mobile states where relevant.

## Required responsive behavior

### Desktop

- primary target: 1440 x 1024;
- reference column can collapse below 1180 px;
- shot table converts to stacked shot rows below 1024 px;
- no horizontal overflow.

### Mobile

- primary target: 390 x 844;
- all touch controls are at least 44 x 44 px;
- detail content opens as a sheet;
- current shot remains visible before secondary project information;
- long Chinese text wraps rather than clipping.

## Integration timing

Visual implementation starts after the five functional agents are merged into one reviewed baseline.

Order:

1. Freeze the merged functional baseline.
2. Add tokens, type scale, and Lucide icon mapping.
3. Add shared components.
4. Apply the desktop Active Plan screen.
5. Apply Reference Library and Reference Detail.
6. Apply mobile Field Mode and Schedule.
7. Run desktop and mobile visual QA.
8. Regenerate deployment artifacts and deploy only after acceptance.

No implementation agent may redesign product behavior while applying this visual system.

## Acceptance

- The shot list is the first substantive result in a plan.
- References are actual assets, not decorative covers.
- Desktop and mobile visibly belong to the same product.
- The interface uses one action color and one icon family.
- No inactive button appears available.
- Reference source links open exact destinations.
- Cards and text do not overlap at 1440 px or 390 px.
- Keyboard focus and mobile touch targets are visible and usable.
- Generated concept images are used as direction references, not copied as literal product requirements.


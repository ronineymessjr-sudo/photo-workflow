# PhotoAtelier R4: Apple-Informed Visual System

## 0. Purpose and boundary

This document replaces the earlier R4 visual note. It is the single visual contract for the next Figma phase and for later Trae implementation.

PhotoAtelier should feel like a quiet, capable photography workspace. It may learn from the Apple/iOS design language - hierarchy, semantic color, legible type, restrained materials, and direct manipulation - but it must not imitate an iPhone screen or turn every web panel into glass.

This is a design document only. It does not change routes, V5 contracts, data models, user workflows, or production code. After Figma is configured and the key screens are approved, implementation tasks must be derived from this document and the approved Figma frames only.

## 1. What is wrong with the current visual direction

The current product does not fail because it lacks decoration. It feels messy because visual meaning is inconsistent.

1. Too many colors compete for attention. Green, purple, bright blue, and high-saturation illustration colors often appear beside one another without representing different product states.
2. The type scale is weak. Large labels, small helper text, and button text do not form a reliable reading order, so a plan looks like a collection of unrelated blocks.
3. Icons act as decoration. Animated or multicolor icons do not tell the photographer whether the control will open a library, start a shoot, edit a shot, or merely display information.
4. Excessive rounded containers make every section look equally important. The work surface loses its structure.
5. Reference images are sometimes represented by covers, generic graphics, or repeated tiles instead of the actual selected image. That is particularly harmful in a photography product.
6. Secondary capabilities such as integrations, AI, exports, and source metadata appear at the same visual level as the shot list. The photographer cannot immediately see the next operational decision.

The redesign therefore removes visual noise before it adds polish.

## 2. Visual north star

### Product personality

- Calm, editorial, precise, and tactile.
- Photography-led: the image is the visual accent, not the application chrome.
- Professional without looking like a dense enterprise dashboard.
- Direct enough for a solo photographer in the field and structured enough for pre-production on desktop.

### Apple-informed principles translated for PhotoAtelier

1. **Hierarchy before ornament.** The selected plan, active shot, and actual reference image must be visible before secondary actions.
2. **One primary action per context.** A screen may have one filled primary command. Other commands are quiet buttons, toolbar icons, or a More menu.
3. **Semantic color, not decorative color.** A color means an action, warning, status, or selection. It never exists merely to make a card feel lively.
4. **Material describes depth.** Blur and translucent material are reserved for a layer above content: navigation, floating filters, drawers, or a sheet. Working content stays solid and readable.
5. **Progressive disclosure.** A reference library begins with real image tiles and concise titles. Metadata, source, linked shots, and notes appear after opening the asset.
6. **Craft at small scale.** Align text, icon centers, image crops, borders, hover states, and empty states. The product should not rely on gradients, floating blobs, or animated pictograms to feel finished.

Apple's Human Interface Guidelines emphasize hierarchy, consistency, readable typography, and materials used for depth rather than decoration. Use them as principles, not as a visual skin.

## 3. Information hierarchy and page anatomy

### 3.1 Desktop workspace

The desktop plan workspace uses a practical three-zone layout. It is a workbench, not a dashboard of cards.

```text
| Navigation 216 | Reference column 336 | Plan and shot workspace flexible |
```

- **Navigation, 216 px:** solid surface, text-first navigation, one selected state. No colored app tiles.
- **Reference column, 320-360 px:** selected real reference image at the top, followed by a compact list or grid of other project references. This column is the visual anchor.
- **Plan and shot workspace:** project facts and current status at the top, then the ordered shot list. Selecting a shot reveals details in a side drawer or lower detail region without pushing the storyboard apart.
- **Utility actions:** export, quote, technical integrations, and project settings live in a top-right More menu or a final resources region. They do not occupy the first screenful.

### 3.2 Mobile field mode

- Bottom navigation has four destinations only: `Plans`, `References`, `Schedule`, and `Me`.
- The current shot or reference photo is the top anchor. The next meaningful command is immediately below it.
- Shot details, filters, and source information open in a full-height sheet or bottom sheet. Do not place desktop sidebars inside a narrow mobile page.
- Mobile tap targets are at least 44 by 44 px. Field controls stay in the middle or lower reach area.
- The mobile screen has one working task at a time: review the current shot, mark it complete, add a note, open the reference, or move to the next shot.

### 3.3 Plan generation hierarchy

The order is operational, not a pile of creative modules:

1. Plan brief: theme, people, place, constraints, duration.
2. Generated or selected shot list: the first substantive result and the main decision surface.
3. Shared plan resources: selected references, one color direction/LUT, camera and lens kit, schedule draft.
4. Optional creative detail: styling, props, creative rationale, and pose alternatives.
5. Execution and delivery: checklist, quote, export, review, and delivery status.

Do not place "hero visual", "pose variation", generic AI suggestions, or empty creative widgets above the shot list. Those are supporting resources, not the photographer's primary decision.

## 4. Color, surfaces, and material

### 4.1 One controlled palette

The default beta interface is dark. Photography supplies the changing color. The UI itself uses neutral charcoal and one muted sage action color.

| Token | Dark value | Light value | Use |
| --- | --- | --- | --- |
| `surface/canvas` | `#111312` | `#F5F6F4` | Page background |
| `surface/raised` | `#191D1B` | `#FFFFFF` | Main work surface |
| `surface/pressed` | `#242A27` | `#E9EEE9` | Selected or pressed row |
| `surface/subtle` | `#151816` | `#EEF1EE` | Quiet grouped region |
| `border/subtle` | `#303833` | `#D7DED8` | Boundaries, never decoration |
| `text/primary` | `#F2F5F1` | `#161A17` | Titles and active content |
| `text/secondary` | `#B5BDB6` | `#59645C` | Supporting information |
| `text/tertiary` | `#7D887F` | `#7B857D` | Metadata only |
| `action/primary` | `#8DB89E` | `#286546` | Primary command and selection |
| `status/warning` | `#D6A75B` | `#9A681A` | Needs attention only |
| `status/danger` | `#D9776D` | `#A83D35` | Destructive or blocking only |
| `status/success` | `#75B892` | `#25744C` | Completed state only |

Rules:

- Purple, bright cyan, neon green, rainbow gradients, and unrelated colorful illustrations are removed from product chrome.
- A selected navigation item uses a subtle neutral-green surface and text/icon contrast, not a vivid colored capsule.
- Status colors do not become category colors. A completed shot may use success; a reference category should use text and filters, not a colored tile.
- Every color token must be available in Dark, Light, and High Contrast variants in Figma, even if the first web beta ships Dark as the default.

### 4.2 Materials and blur

Use three surface levels only:

1. **Solid canvas:** the page and major work area.
2. **Solid raised surface:** a working panel, detail section, or sheet body.
3. **Translucent material:** top navigation, a floating filter tray, a contextual toolbar, or a sheet header placed above scrolling content.

Material rules:

- A glass surface is never the background of every card.
- Blur appears only when the layer genuinely floats over scrollable content.
- Use a quiet `backdrop-filter` equivalent with a translucent neutral fill and border; do not use purple or green blur.
- If contrast is uncertain, use the solid raised surface. Readability wins.

### 4.3 Corners, edges, and spacing

The product should have clear geometry instead of a universal "everything rounded" treatment.

| Element | Radius | Notes |
| --- | ---: | --- |
| Main page bands and split panes | 0 px | Use layout, separators, and spacing instead of containers. |
| Working cards and image tiles | 8 px | Maximum standard card radius. |
| Inputs, compact buttons, segmented controls | 8 px | Same family as cards. |
| Genuine modal or mobile sheet | 16 px top corners only | A sheet is a transient layer, not a card. |
| Avatar, color swatch, circular icon control | 999 px | Only for an actual circle. |
| Tags and segmented selection | 999 px only when it is truly a chip/segment | Do not turn ordinary commands into pills. |

Use a 4 px spacing grid. Primary layout gaps are 8, 12, 16, 24, and 32 px. Borders are 1 px and low contrast. Shadows are nearly absent; when a layer must float, use one soft neutral shadow rather than colored glow.

## 5. Typography

### 5.1 Typeface policy

In Figma, use `SF Pro Display` for Latin display text and `PingFang SC` for Chinese. For web implementation, do not ship or bundle Apple's proprietary fonts. Use the platform stack below so an Apple device naturally uses its system type while Windows and Android remain readable:

```css
font-family: Inter, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI",
  "Noto Sans SC", system-ui, -apple-system, "Segoe UI", sans-serif;
```

- Use one sans-serif family system only. Do not mix decorative display fonts with an unrelated Chinese body font.
- Letter spacing is `0`; do not use tight negative tracking for Chinese interface text.
- Avoid thin weights. Use Regular (400), Medium (500), Semibold (600), and Bold (700) only where hierarchy needs it.
- Text must not be placed inside images unless it is a deliberate editable cover output.

### 5.2 Type scale

| Role | Desktop | Mobile | Weight | Use |
| --- | --- | --- | --- | --- |
| Page title | 30/38 | 26/34 | 700 | Plan name, library title |
| Section title | 20/28 | 20/28 | 600 | "Shot list", "Selected references" |
| Shot title | 17/24 | 17/24 | 600 | Numbered shot or asset title |
| Body | 15/22 | 17/24 | 400 | Instructions, notes, descriptions |
| Supporting label | 13/18 | 13/18 | 500 | Camera, lens, source, state |
| Metadata | 12/16 | 12/16 | 400 | Date, provenance, counts |

Desktop may be denser because it supports planning. Mobile body copy begins at 17 px because it is read in the field. Long labels wrap naturally; no important text may be ellipsized merely to preserve a visual grid.

### 5.3 Copy rules

- Prefer nouns for navigation: `Plans`, `References`, `Schedule`, `Settings`.
- Prefer direct verbs for commands: `Create plan`, `Add reference`, `Open shot`, `Mark complete`.
- Avoid technical terms in photographer-facing surfaces: do not expose "local proxy", "gateway", "index", or "agent" as the normal empty-state instruction.
- State the problem and the next action in one line: `Your reference library is empty. Add images or choose a starter collection.`

## 6. Icon system

### 6.1 One icon language

The current mix of animated, colorful, illustrative, and inconsistent icons must be removed. Icons are controls and recognition cues, not decoration.

- **Figma reference library:** use SF Symbols as the visual benchmark for an Apple-like outline language.
- **Web implementation:** use Lucide only. Do not mix Lucide, emoji, animated sticker icons, random SVG packs, and custom multicolor illustrations in the application shell.
- Default style: outline, `1.75 px` stroke, rounded line caps and joins.
- Sizes: 16 px for dense metadata actions, 18 px for standard controls, 20 px for navigation and mobile controls, 24 px only for an empty state or important field action.
- Icons inherit text color. They use semantic warning/success/danger color only when the state genuinely carries that meaning.
- A selected tab may use a filled or heavier icon treatment only if the entire navigation uses that same rule.

### 6.2 Approved semantic mapping

| Product meaning | Lucide icon | Rule |
| --- | --- | --- |
| Plans | `ClipboardList` | Primary navigation |
| References | `Images` | Primary navigation |
| Schedule | `CalendarDays` | Primary navigation |
| Equipment | `Camera` | Resource drawer or library |
| Lens / framing | `Aperture` | Shot metadata only |
| Color / LUT | `Palette` | Color resource, never rainbow icon |
| Search | `Search` | Search field or discovery action |
| Filter | `SlidersHorizontal` | Opens filters, not a visual decoration |
| Add | `Plus` | Add a real object or start a command |
| Edit | `Pencil` | Opens editing state |
| More actions | `Ellipsis` | Contains secondary commands |
| Open source | `ExternalLink` | Opens the actual source URL or local asset |
| Connected / unavailable | `CircleCheck` / `CircleAlert` | Only connection state |

Do not use an icon if a clear text label is faster to understand. Do not create a different colorful icon for every plan theme, creative direction, or scene.

### 6.3 Button rules

- A visible text button is reserved for a clear command: `Create plan`, `Add reference`, `Save draft`.
- Tool actions use icon buttons with a tooltip: edit, reorder, filter, delete, duplicate, more.
- A button with icon and text is acceptable only for the main command of a region.
- The top toolbar shows only the 2-4 highest-frequency actions. Export, quote, integration, copy, and advanced maintenance belong in `More`.
- Disabled controls explain why nearby; do not leave a non-functional button that appears active.

## 7. Reference imagery rules

Photography must carry the visual character of PhotoAtelier.

1. The first image in a plan or library card is always a real selected reference image, a user-created concept image, or a deliberately neutral empty state. Never substitute a decorative cover image.
2. Every image clearly identifies its type: `Photo reference` for `synthetic=false`, `Concept image` for `synthetic=true`. A concept image must never be presented as a real shoot reference.
3. A compact card shows only thumbnail, title, type, and one useful fact. Source, tags, linked shots, license, and notes appear in the detail view.
4. Image crop is stable: reference cards use 4:5 or 3:4; wide storyboard frames use 16:9. Never stretch an image to fill a container.
5. A destination link opens the exact asset detail, filtered search result, source URL, or linked shot. A link to a generic library page is not considered a completed interaction.
6. Empty reference states offer only viable choices: add an image, choose a starter collection, or continue without a reference. Do not display fake album covers.

## 8. Interaction and motion

Motion must clarify state change, not decorate the interface.

- Standard transition: 160-220 ms, simple ease-out.
- Use motion for opening a sheet, selecting a shot, moving through a sequence, and saving feedback.
- Do not autoplay animated icons, looping illustrations, bouncing counters, or decorative gradients.
- Respect `prefers-reduced-motion`; the complete workflow must work with motion removed.
- Hover is a desktop convenience, never the only way to discover a command. Keyboard focus remains visibly high-contrast.

State language is consistent:

- **Default:** neutral text and outline.
- **Hover/pressed:** subtle surface change, not a color explosion.
- **Selected:** `surface/pressed` plus primary text/icon, not a vivid filled card.
- **Complete:** one small success indicator and a text state.
- **Needs attention:** warning icon and direct instruction.
- **Unavailable:** disabled appearance plus a brief actionable explanation.

## 9. Figma configuration contract

Before any CSS or component rewrite, configure the Figma file with the following pages and variable collections.

### 9.1 Figma pages

1. `00 Foundations`: color, type, spacing, radius, elevation, icon rules.
2. `01 Components`: navigation, buttons, fields, segmented controls, menus, cards, sheets, toast, status.
3. `02 Desktop`: Plan Library, New Plan Brief, Active Shoot Plan, Reference Detail.
4. `03 Mobile`: Field Mode, Reference Selection, Schedule, Plan Detail.
5. `04 Content States`: loading, empty, unavailable, error, and no-reference states.
6. `05 Handoff`: annotations, responsive behavior, content rules, and approved screenshots.

### 9.2 Variable collections

Create Figma variables with modes `Dark`, `Light`, and `High Contrast Dark`:

- `Color / surface`, `Color / text`, `Color / action`, `Color / status`, `Color / border`
- `Space / 4, 8, 12, 16, 24, 32, 40`
- `Radius / 0, 8, 16, full`
- `Size / control-36, control-40, control-44`
- `Typography / page, section, shot, body, label, metadata`

Use aliases in all components. Designers must not introduce one-off hex values, random 10 px radii, or arbitrary type sizes in a screen.

### 9.3 Required components and variants

| Component | Required variants |
| --- | --- |
| `AppShell` | desktop, mobile, selected destination |
| `NavigationItem` | default, selected, hover, disabled |
| `Button` | primary, secondary, quiet, destructive, icon-only, loading, disabled |
| `SegmentedControl` | 2-4 items, selected, disabled |
| `ReferenceTile` | real photo, concept image, selected, unavailable source |
| `ShotRow` | default, selected, complete, needs attention |
| `Sheet` | mobile detail, filter, confirmation |
| `Toolbar` | 2-4 direct actions plus More |
| `Status` | neutral, success, warning, danger |
| `EmptyState` | library empty, unavailable source, no search result |

Every component needs default, hover/pressed where relevant, keyboard focus, disabled, loading, and mobile behavior. Do not treat an empty placeholder as a completed component.

### 9.4 Required screen corrections

The existing Figma screens must be refined to show:

1. **Desktop Plan Library:** no dashboard collage; plans as clear list/grid entries with status, next shoot, and one image only when it is meaningful.
2. **Desktop New Plan Brief:** brief first, then a compact generated shot preview. No generic AI panels above the result.
3. **Desktop Active Shoot Plan:** left reference column uses actual selected references; right workspace leads with ordered shots.
4. **Desktop Reference Detail:** start from one card title and thumbnail; reveal source, links, tags, and related shots after opening.
5. **Mobile Field Mode:** a single current shot, reference image, completion action, notes, and next shot.
6. **Mobile Reference Selection:** select real assets and distinguish photo references from concept images without showing a wall of colored covers.

## 10. Implementation handoff rules for Trae

When the Figma configuration is approved, future implementation agents must follow this order:

1. Build foundation tokens and icon replacement first. Do not alter business logic in this task.
2. Apply shared navigation, typography, surface, button, and sheet components.
3. Rework Plan Library and Active Shoot Plan from the approved desktop frames.
4. Rework Reference Library and Reference Detail using exact-asset navigation.
5. Apply mobile layout and field-mode screens.
6. Verify visual states, accessibility, and responsive screenshots before any new feature work.

Each agent task must state its allowed files, required screenshots, and acceptance checks. No agent may add a new color, icon pack, animated illustration, or font outside the Figma system. Product data and V5 contracts remain untouched unless separately authorized.

## 11. Acceptance checklist

A design or implementation is accepted only when all items below are true:

- There is one visual language: neutral surfaces, one muted action color, semantic status colors, and actual photography as the main color source.
- The UI has no rainbow gradients, decorative color blobs, animated stickers, emoji-based navigation, or mixed icon libraries.
- Cards, fields, and regular buttons use 8 px radius or less; full pills occur only for real tags/segments; sheets alone may use 16 px top corners.
- Type follows the defined scale, never uses negative letter spacing, wraps safely on mobile, and keeps body content readable.
- Every icon maps to a known action and has a tooltip when icon-only.
- Reference cards show real asset imagery and make the asset type explicit. Opening a source goes to the exact asset or exact source.
- The active desktop plan leads with the shot list. Mobile leads with one current shot and its next action.
- Toolbar commands are useful and functional. Unavailable actions are hidden or explicitly disabled with a reason.
- The design works at 1440 px desktop and 390 px mobile with no horizontal overflow and with keyboard-focus states visible.
- Screenshots are reviewed against the approved Figma frames before deployment.

## 12. Authoritative design references

- Apple Human Interface Guidelines: Design principles: https://developer.apple.com/design/human-interface-guidelines/design-principles
- Apple Human Interface Guidelines: Designing for iOS: https://developer.apple.com/design/human-interface-guidelines/designing-for-ios
- Apple Human Interface Guidelines: Typography: https://developer.apple.com/design/human-interface-guidelines/typography
- Apple Human Interface Guidelines: Color: https://developer.apple.com/design/human-interface-guidelines/color
- Apple Human Interface Guidelines: Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple Human Interface Guidelines: Toolbars: https://developer.apple.com/design/human-interface-guidelines/toolbars
- Apple Human Interface Guidelines: Menus: https://developer.apple.com/design/human-interface-guidelines/menus

These references define usable interaction and visual principles. They are not permission to copy Apple's visual assets, product names, or proprietary web fonts.

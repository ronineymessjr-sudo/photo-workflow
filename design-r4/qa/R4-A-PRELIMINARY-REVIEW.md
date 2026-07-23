# R4-A Preliminary Design Review

Review state: changes required

Evidence:

- `screenshots/r4-component-state-sheet.png`
- `src/r4-design-system.css`
- `src/r4-icon-system.js`
- `tests/node/v5/r4-design-system.test.mjs`

Automated result:

- `node --test tests/node/v5/r4-design-system.test.mjs`
- 38 passed, 0 failed

## Findings

- [P1] Icon evidence does not render the approved Lucide system
  - Location: Icon Buttons and Toolbar in the component-state sheet.
  - Evidence: controls display `S`, `+`, `...`, `F`, `C`, `G`, and `I` text or
    symbol placeholders rather than visible Lucide outline icons.
  - Impact: the screenshot does not prove the icon helper works in a rendered
    product context and would preserve the mixed-glyph problem R4 is intended
    to remove.
  - Required fix: load the same Lucide runtime used by the compatibility page
    in the screenshot harness, render semantic icons through
    `PhotoAtelierIcons`, and recapture the sheet.

- [P2] Default dark product mode is not demonstrated
  - Location: complete component-state sheet.
  - Evidence: the screenshot shows only the light token mode while the approved
    first beta and all three source visuals use the dark product mode.
  - Impact: surface hierarchy, borders, muted sage contrast, and text
    readability cannot be judged against the source direction.
  - Required fix: capture the full sheet in Dark mode. Light and High Contrast
    may be shown as smaller secondary state groups or additional evidence.

- [P2] Interaction states are asserted in code but not visible in evidence
  - Location: buttons, fields, navigation, and icon controls.
  - Evidence: the sheet shows default and some disabled states, but does not
    visibly demonstrate keyboard focus, loading, pressed/selected contrast, or
    a 44 x 44 mobile touch state.
  - Impact: the visual acceptance contract cannot distinguish a coded selector
    from a usable state.
  - Required fix: add an evidence row for focus-visible, loading, pressed,
    selected, disabled, and mobile touch sizing.

- [P3] Menu example reads as a full-width content panel
  - Location: Menu section.
  - Evidence: the menu spans nearly the full 1440 px sheet.
  - Impact: it does not demonstrate the intended compact contextual menu
    proportions.
  - Suggested fix: constrain the example to a realistic 220-280 px menu width.

## Acceptance conditions

R4-A can be accepted after:

1. Its existing 38 tests still pass.
2. The component sheet renders actual Lucide icons.
3. Dark mode is the primary evidence.
4. Focus, loading, pressed/selected, disabled, and mobile touch states are
   visible.
5. No product-page-specific styles are added.

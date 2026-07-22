# PhotoAtelier Design System

## Visual Theme & Atmosphere
- Mood: professional_minimal
- Feel: quiet, work-focused, scan-friendly
- Product type: photography workflow cockpit for planning, references, messages, schedules, history, and settings

## Color Palette & Roles
- Background: #FFFFFF
- Surface: #F8FAFC
- Text primary: #0F172A
- Text secondary: #64748B
- Accent: #10B981
- Accent hover: #059669

## Typography Rules
- Display: same as body, 600, compact headings
- Body: Inter or current app sans stack, 400, 1rem/1.6
- Mono: JetBrains Mono, 400, 0.875rem

## Component Stylings
- Buttons: 4-6px radius, clear verbs, icon only only when the meaning is familiar
- Cards: surface background, subtle border, 6-8px radius
- Inputs: visible labels, clear focus state, no placeholder-only fields
- Navigation: labels always visible on desktop; icon-only is mobile-only

## Layout Principles
- Max width: 1220px for the main work surface
- Grid: two-column cockpit on desktop, single column on tablet/mobile
- Density: compact, with 16-24px internal spacing
- First screen: actual working interface, not marketing copy

## Depth & Elevation
- Shadows: minimal; prefer borders and spacing
- Borders: 1px solid low-opacity neutral or accent-tinted lines
- Avoid decorative blobs, extra gradients, and floating nested cards

## Do's and Don'ts
- DO keep the sidebar focused on core workflows.
- DO make generated plans readable in summary first, details second.
- DO put advanced/rare actions in settings or collapsible sections.
- DO verify with desktop and mobile screenshots.
- DON'T hide labels behind hover on desktop.
- DON'T expose half-configured integrations as primary actions.
- DON'T use color alone for status.

## Responsive Behavior
- Breakpoints: 640px, 768px, 1024px, 1280px
- Mobile: single column, visible nav drawer, large tap targets
- Tablet: stack brief and output panes
- Desktop: stable sidebar plus two-column planning cockpit

## Agent Prompt Guide
- Keep UI operational and restrained.
- Use accent color sparingly for active states and primary actions.
- Preserve local user data and existing IDs used by JavaScript.
- Verify syntax and browser behavior after layout changes.

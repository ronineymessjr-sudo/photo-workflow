# PhotoAtelier Landing R5 Agent Handoff

Date: 2026-07-27

## Objective

Replace the current public showcase page with an editorial photography experience that explains one concrete workflow:

`reference image -> five-shot list -> resources and LUT -> schedule`

The page is not a feature catalogue and must not alter the PhotoAtelier workspace.

## Read Order

1. `01-LAYOUT-CONTENT-SPEC.md`
2. `02-MOTION-TECHNICAL-SPEC.md`
3. `03-GPT-IMAGE-ASSET-MANIFEST.md`
4. `04-AGENT-WORK-ORDER.md`
5. `05-ACCEPTANCE-CHECKLIST.md`
6. `assets/photoatelier-landing-r5-selected-direction.png`

## Non-Negotiable Boundaries

- Modify only the public landing page and its landing-specific assets/tests.
- Do not modify `legacy/`, `src/v5/`, Schema v5, repositories, use cases, migrations, or workspace state.
- Do not use Pexels, Pixiv, Unsplash, website screenshots, stock photos, photographers' work, or externally hosted image URLs.
- All photography must be generated specifically for PhotoAtelier with GPT Image and treated as `synthetic=true`.
- Product UI fragments may use PhotoAtelier's own interface, but photographs inside them must also be generated assets.
- Implement GSAP first. Three.js is optional and may be added only after the static and GSAP versions pass acceptance.
- Do not use Remotion or Hyperframe in this task.
- Do not deploy. Return the local implementation for Codex acceptance.

## Source Visual

`assets/photoatelier-landing-r5-selected-direction.png`

SHA-256:

`34B3699E1A4D858F0E4A2E89C1A5A4090AEA70E4D9CD0D64EA73E8B3F75BB098`

The visual is directional, not pixel-perfect source content. Follow the written layout, motion, content, asset, accessibility, and performance contracts when they differ from generated mock text.


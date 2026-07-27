# PhotoAtelier Landing R5 Acceptance Checklist

## A. Scope

- [ ] Only landing-specific source, assets, tests, and required build files changed.
- [ ] No V5 contract, workspace, repository, migration, or legacy UI change.
- [ ] No deployment performed.

## B. Story And Layout

- [ ] Hero says `PhotoAtelier`.
- [ ] Hero communicates reference-to-shoot value.
- [ ] Primary CTA is visible without scrolling.
- [ ] One center vertical timeline connects all stages.
- [ ] Stage 01 is left on desktop.
- [ ] Stage 02 is right on desktop.
- [ ] Stage 03 is left on desktop.
- [ ] Stage 04 is right on desktop.
- [ ] Mobile uses one-side reading order with line at the left.
- [ ] Final CTA is centered and follows Stage 04.
- [ ] No feature-card wall was added.

## C. Assets And Rights

- [ ] All photography is generated specifically for PhotoAtelier.
- [ ] No Pexels, Pixiv, Unsplash, Pixabay, Pinterest, Behance, Xiaohongshu, Douyin, Xinpianchang, or external website image.
- [ ] No externally hosted image URL.
- [ ] All generated files have `synthetic=true`.
- [ ] AI concept images are visibly labelled as concepts.
- [ ] No watermark, logo, celebrity, recognizable landmark, or copied artwork.
- [ ] Fictional model, wardrobe, location, and light are consistent across A01–A10.

## D. Visual Design

- [ ] Black/white/forest-green system is consistent.
- [ ] Photography remains the primary visual accent.
- [ ] No purple/blue gradient, neon, decorative orb, or generic illustration.
- [ ] No nested cards or fake device frames.
- [ ] Standard corner radius is at most `6px`.
- [ ] Typography uses no negative letter spacing.
- [ ] Chinese text is readable and unclipped.

## E. Motion

- [ ] Timeline progress follows scroll.
- [ ] Stages reveal progressively in document order.
- [ ] Odd/even stages enter from the correct side on desktop.
- [ ] Mobile uses vertical reveal only.
- [ ] No looping decorative animation.
- [ ] `prefers-reduced-motion` removes nonessential motion.
- [ ] Page is complete and readable with JavaScript disabled or GSAP unavailable.
- [ ] Primary CTA remains immediately actionable.

## F. Three.js

- [ ] Three.js is absent unless separately approved.

If approved:

- [ ] Canvas is unframed and limited to hero.
- [ ] Only generated photographic planes are used.
- [ ] Device pixel ratio is capped.
- [ ] Rendering pauses outside hero/hidden document.
- [ ] Resources are disposed.
- [ ] Mobile and reduced-motion use static fallback.

## G. Performance

- [ ] Hero image <= `450KB`.
- [ ] Supporting image <= `220KB` each.
- [ ] Initial image transfer <= `900KB`.
- [ ] Below-fold images are lazy-loaded.
- [ ] Media dimensions/aspect ratios prevent layout shift.
- [ ] No autoplay video.
- [ ] No application console error.

## H. Accessibility

- [ ] Semantic headings follow one H1.
- [ ] Links and buttons have visible keyboard focus.
- [ ] Text/background contrast is readable.
- [ ] Every meaningful image has useful alt text.
- [ ] Decorative visuals have empty alt/appropriate hiding.
- [ ] Mobile tap targets are at least `44 x 44px`.
- [ ] Motion preference is honored.

## I. Functional Regression

- [ ] `/legacy/?mode=public-beta` opens from the primary CTA.
- [ ] Language selector still works.
- [ ] Feedback form still submits through the existing path.
- [ ] Privacy links still work.
- [ ] Service worker does not trap an older landing version.
- [ ] Public beta E2E passes.
- [ ] Build and dist smoke tests pass.

## J. Codex Review Gate

Codex will reject the implementation when any of the following occurs:

- The center timeline is replaced by a horizontal feature row.
- Photography comes from an external source.
- The Agent changes the workspace or V5 architecture.
- Motion hides content or blocks the CTA.
- Mobile is treated as a scaled-down desktop alternation.
- Three.js is added before the GSAP baseline passes.
- Generated concepts are presented as real photographs.


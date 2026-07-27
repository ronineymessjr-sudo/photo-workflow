# PhotoAtelier Landing R5 Motion And Technical Specification

## 1. Motion Principle

Motion must explain sequence:

`reference -> shots -> resources -> schedule`

No animation exists only to make the page feel busy. The page remains complete and readable when animation is disabled.

## 2. Runtime Order

1. Ship the static responsive layout.
2. Add GSAP and ScrollTrigger.
3. Pass motion, performance, and accessibility acceptance.
4. Consider the optional Three.js hero enhancement.
5. Do not use Remotion or Hyperframe in this repository.

## 3. Required File Shape

Recommended files:

```text
index.html
assets/landing.css
src/landing-motion.js
assets/landing-ai/
  hero-urban-dawn.webp
  reference-portrait.webp
  shot-01.webp
  shot-02.webp
  shot-03.webp
  shot-04.webp
  shot-05.webp
  venue-wide.webp
  lut-before.webp
  lut-after.webp
```

Optional only after approval:

```text
src/landing-three.js
```

Do not place landing motion in `src/app-enhancements.js`.

## 4. GSAP Dependency

This repository currently has no bundler and no GSAP dependency.

The implementing Agent must choose one explicit delivery method:

1. Add `gsap` as a project dependency and update the build to copy the required ESM files into the release package; or
2. Vendor pinned, unmodified GSAP ESM files under `assets/vendor/gsap/` with license notices.

Do not load an unpinned `latest` CDN URL.

Register ScrollTrigger explicitly:

```js
gsap.registerPlugin(ScrollTrigger);
```

## 5. Initial Page Load

Allowed:

- Hero image opacity `0 -> 1`, duration `0.65s`.
- Hero copy `y: 22 -> 0`, opacity `0 -> 1`, stagger `0.08s`.
- Header opacity `0 -> 1`, duration `0.35s`.

Do not animate H1 letters individually.

The primary CTA must become interactive without waiting for animation completion.

## 6. Hero Scroll Behavior

Desktop:

- Hero media scale `1 -> 1.035` over the first `70vh`.
- Dark overlay opacity `0.42 -> 0.58`.
- Copy translates at most `-28px`.
- Avoid full hero pinning. Native document scroll remains in control.

Mobile:

- Disable hero scale/parallax.
- Use opacity-only transitions.

## 7. Timeline Progress

Use one timeline progress element:

```html
<div class="journey-line">
  <div class="journey-line__progress"></div>
</div>
```

The base line is always visible.

The progress line scales from top to bottom:

- Trigger: the timeline container.
- Start: `top 62%`.
- End: `bottom 42%`.
- Scrub: `0.6`.
- Transform origin: top.
- Animate `scaleY`, not height.

Use `clamp()` start/end values where supported to avoid incomplete progress near page edges.

## 8. Stage Reveal Contract

Every stage uses the same state machine:

1. `idle`
2. `entering`
3. `active`
4. `passed`

Desktop odd stage:

- Content starts at `x: -48`, opacity `0`.

Desktop even stage:

- Content starts at `x: 48`, opacity `0`.

Mobile:

- All stages start at `y: 28`, opacity `0`.

Stage reveal:

- Trigger start: `top 74%`.
- Trigger end: `top 42%`.
- Scrub: `0.45`.
- Heading duration share: `0.28`.
- Body duration share: `0.22`.
- Media duration share: `0.5`.
- Node activates when stage progress reaches `0.35`.

Media reveal:

- `clip-path: inset(10% 0 10% 0)` to `inset(0)`.
- Opacity `0.35 -> 1`.
- Scale `1.02 -> 1`.

Do not rotate media or animate large blur values.

## 9. Five-Shot Sequence

The five rows reveal in order with a maximum `0.07s` stagger.

Each shot row:

- Starts at `x: 18`, opacity `0`.
- Ends at `x: 0`, opacity `1`.
- Focal length and cue appear at the same time as the row.

Do not auto-play a carousel.

## 10. Resource And LUT Motion

- Resource rows reveal as one grouped surface.
- Selected LUT gets one short `border-color` and opacity transition.
- Before/after preview changes only after the user activates a control.
- No automatic flashing comparison.

## 11. Schedule Motion

- Schedule line grows downward once.
- Rows appear sequentially with a maximum `0.05s` stagger.
- Current row indicator may pulse once, not loop.

## 12. CTA Motion

- CTA heading and action enter with `y: 20 -> 0`, opacity `0 -> 1`.
- The primary button does not bounce, glow, or loop.

## 13. Responsive And Reduced Motion

Use `gsap.matchMedia()` for:

- Desktop: `(min-width: 1024px)`
- Mobile/tablet: `(max-width: 1023px)`
- Reduced motion: `(prefers-reduced-motion: reduce)`

Reduced-motion mode:

- Remove scrub, parallax, scale, clip-path animation, and stagger.
- Show every stage immediately.
- Preserve timeline reading order and active links.
- CSS must include a fallback even if JavaScript fails.

## 14. Optional Three.js Hero

Three.js is not required for acceptance.

It may be added only when all conditions are true:

- Static layout approved.
- GSAP version passes tests.
- Desktop viewport at least `1024px`.
- WebGL available.
- Reduced motion is not requested.
- No low-power/data-saver signal is active when detectable.

Allowed scene:

- Three to five photographic planes using generated contact-sheet textures.
- Subtle pointer offset, maximum `8px` perceived movement.
- Subtle depth shift tied to hero scroll.
- No abstract geometry, particles, lens-flare loops, or game controls.

Performance:

- Dynamic import after first content paint.
- Canvas is full-bleed and unframed.
- Cap device pixel ratio at `1.5`.
- Pause rendering when hero is outside the viewport or document is hidden.
- Dispose textures, geometries, materials, and renderer on teardown.
- Keep a static hero image underneath as fallback.

## 15. Performance Budget

Targets on the public landing:

- Hero source image: <= `450KB` AVIF/WebP.
- Each supporting image: <= `220KB`.
- Total initial image transfer before scroll: <= `900KB`.
- Lazy-load below-fold images.
- No autoplay video.
- No layout shift from media; declare width, height, and aspect ratio.
- Animate only transforms and opacity unless explicitly defined above.

## 16. Analytics

Permitted events:

- `landing_cta_open_workspace`
- `landing_scroll_stage_01`
- `landing_scroll_stage_02`
- `landing_scroll_stage_03`
- `landing_scroll_stage_04`
- `landing_privacy_open`

Do not send plan text, images, library contents, local paths, notes, or personal data.

## 17. Failure Behavior

- Missing GSAP: static page remains fully visible.
- Missing Three.js: static hero remains visible.
- Image load failure: use dark neutral background and meaningful alt text.
- JavaScript error: primary CTA still works as a normal link.


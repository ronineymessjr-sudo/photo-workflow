/**
 * PhotoAtelier Landing R5 — Motion Layer
 *
 * Implements the motion contract from 02-MOTION-TECHNICAL-SPEC.md:
 *   - Timeline progress follows scroll (scaleY, transform-origin top).
 *   - Four stage reveals with state machine (idle -> entering -> active -> passed).
 *   - Odd stages enter from x:-48 (desktop), even from x:48 (desktop).
 *   - Mobile uses y:28 reveals only.
 *   - Five-shot sequence stagger <= 0.07s.
 *   - Resource / schedule / final CTA reveals.
 *   - prefers-reduced-motion removes nonessential motion; CSS fallback keeps content visible.
 *   - Idempotent init; ScrollTrigger cleanup on teardown.
 *
 * Failure behavior: if GSAP is missing or any error throws, the page stays fully
 * visible because CSS never hides content by default; JS only adds initial inline
 * styles right before animating them in.
 */

(function () {
  'use strict';

  var INIT_FLAG = '__landingMotionInit__';
  if (typeof window === 'undefined') return;
  if (window[INIT_FLAG]) return;

  // ---- Analytics hook (mirrors public-beta.js local-event format) ----
  function trackLanding(name) {
    try {
      if (localStorage.getItem('pa_beta_analytics_consent') !== 'true') return;
      var events = JSON.parse(localStorage.getItem('pa_beta_local_events') || '[]');
      events.push({ name: name, metadata: {}, at: new Date().toISOString() });
      localStorage.setItem('pa_beta_local_events', JSON.stringify(events.slice(-100)));
    } catch (_) { /* analytics never breaks motion */ }
  }

  function init() {
    if (window[INIT_FLAG]) return;
    window[INIT_FLAG] = true;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;

    // ---- Failure path: no GSAP -> leave page fully visible ----
    if (!gsap || !ScrollTrigger) {
      if (gsap && ScrollTrigger) { /* both present */ }
      else {
        // Ensure content is visible even if CSS had a no-JS hidden state.
        revealAllStatically();
        return;
      }
    }

    try {
      gsap.registerPlugin(ScrollTrigger);
    } catch (_) {
      revealAllStatically();
      return;
    }

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Initial fade-in assets that should exist before scroll.
    var heroImage = document.querySelector('.hero-image');
    var heroContent = document.querySelector('.hero-content');
    var siteHeader = document.querySelector('.site-header');

    // ===== Reduced-motion path: only header fade, everything else visible =====
    if (prefersReduced) {
      if (siteHeader) {
        gsap.set(siteHeader, { opacity: 0 });
        gsap.to(siteHeader, { opacity: 1, duration: 0.35, ease: 'none' });
      }
      // Force timeline progress full so the line reads as complete.
      var progressFull = document.querySelector('.journey-line__progress');
      if (progressFull) gsap.set(progressFull, { scaleY: 1 });
      // Mark all stages as passed so nodes/numbers use active color.
      document.querySelectorAll('.stage').forEach(function (stage) {
        stage.setAttribute('data-state', 'passed');
      });
      return;
    }

    // ===== Initial page load (spec §5) =====
    if (siteHeader) {
      gsap.set(siteHeader, { opacity: 0 });
      gsap.to(siteHeader, { opacity: 1, duration: 0.35, ease: 'power1.out' });
    }

    if (heroImage) {
      gsap.set(heroImage, { opacity: 0 });
      gsap.to(heroImage, { opacity: 1, duration: 0.65, ease: 'power1.out' });
    }

    if (heroContent) {
      var heroBits = heroContent.children.length ? Array.prototype.slice.call(heroContent.children) : [heroContent];
      gsap.set(heroBits, { y: 22, opacity: 0 });
      gsap.to(heroBits, {
        y: 0,
        opacity: 1,
        duration: 0.55,
        ease: 'power2.out',
        stagger: 0.08,
        delay: 0.1
      });
    }

    // ===== matchMedia: desktop vs mobile (spec §13) =====
    var mm = gsap.matchMedia();

    // Desktop: (min-width: 1024px)
    mm.add('(min-width: 1024px)', function (context) {
      var triggers = [];

      // -- Hero scroll behavior (spec §6) --
      if (heroImage) {
        triggers.push(ScrollTrigger.create({
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
          animation: gsap.timeline()
            .to(heroImage, { scale: 1.035, ease: 'none' }, 0)
            .to('.hero-shade', { opacity: 0.58, ease: 'none' }, 0)
            .to(heroContent, { y: -28, ease: 'none' }, 0)
        }));
      }

      // -- Timeline progress (spec §7) --
      var progressEl = document.querySelector('.journey-line__progress');
      var timelineEl = document.querySelector('.timeline');
      if (progressEl && timelineEl) {
        triggers.push(ScrollTrigger.create({
          trigger: timelineEl,
          start: 'top 62%',
          end: 'bottom 42%',
          scrub: 0.6,
          animation: gsap.fromTo(progressEl,
            { scaleY: 0 },
            { scaleY: 1, ease: 'none', transformOrigin: 'top center' }
          )
        }));
      }

      // -- Stage reveals (spec §8) --
      var stages = document.querySelectorAll('.stage');
      stages.forEach(function (stage, index) {
        var isOdd = (index + 1) % 2 === 1; // 01, 03 -> odd -> left -> x:-48
        var content = stage.querySelector('.stage__content');
        if (!content) return;

        var startX = isOdd ? -48 : 48;
        var children = Array.prototype.slice.call(content.children);

        // Set initial state right before animating (keeps no-JS fallback safe).
        gsap.set(content, { x: startX, opacity: 0 });
        children.forEach(function (child) {
          gsap.set(child, { opacity: 0 });
        });

        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            start: 'top 74%',
            end: 'top 42%',
            scrub: 0.45,
            onEnter: function () {
              stage.setAttribute('data-state', 'entering');
              stage.setAttribute('data-state', 'active');
              trackLanding('landing_scroll_stage_' + stage.getAttribute('data-stage'));
            },
            onEnterBack: function () {
              stage.setAttribute('data-state', 'active');
            },
            onLeave: function () {
              stage.setAttribute('data-state', 'passed');
            },
            onLeaveBack: function () {
              stage.setAttribute('data-state', 'idle');
            }
          }
        });

        // Heading 0.28, body 0.22, media 0.5 of total timeline duration.
        // We map them onto children in order: number/eyebrow, heading, body, media/list.
        var heading = stage.querySelector('.stage__heading');
        var body = stage.querySelector('.stage__body');
        var media = stage.querySelector('.stage__media, .shot-list, .resource-fragment, .schedule-fragment');

        if (heading) tl.to(heading, { opacity: 1, duration: 0.28, ease: 'power2.out' }, 0);
        if (body) tl.to(body, { opacity: 1, duration: 0.22, ease: 'power2.out' }, 0.22);
        if (media) {
          // Media reveal uses clip-path + opacity + scale (spec §8).
          gsap.set(media, { opacity: 0.35, scale: 1.02, clipPath: 'inset(10% 0 10% 0)' });
          tl.to(media, {
            opacity: 1,
            scale: 1,
            clipPath: 'inset(0% 0% 0% 0)',
            duration: 0.5,
            ease: 'power2.out'
          }, 0.22);
        }

        // Content slides in alongside.
        tl.to(content, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, 0);

        // Five-shot sequence (spec §9) — stagger 0.07s.
        var shotRows = stage.querySelectorAll('.shot-row');
        if (shotRows.length) {
          shotRows.forEach(function (row) {
            gsap.set(row, { x: 18, opacity: 0 });
          });
          tl.to(shotRows, {
            x: 0,
            opacity: 1,
            duration: 0.35,
            ease: 'power2.out',
            stagger: 0.07
          }, 0.4);
        }

        // Schedule rows (spec §11) — stagger 0.05s.
        var scheduleRows = stage.querySelectorAll('.schedule-list li');
        if (scheduleRows.length) {
          scheduleRows.forEach(function (row) {
            gsap.set(row, { opacity: 0, y: 8 });
          });
          tl.to(scheduleRows, {
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
            stagger: 0.05
          }, 0.4);
        }

        triggers.push(tl.scrollTrigger);
      });

      // -- Final CTA motion (spec §12) --
      var ctaInner = document.querySelector('.final-cta__inner');
      if (ctaInner) {
        var ctaChildren = Array.prototype.slice.call(ctaInner.children);
        gsap.set(ctaChildren, { y: 20, opacity: 0 });
        triggers.push(ScrollTrigger.create({
          trigger: '.final-cta',
          start: 'top 70%',
          onEnter: function () {
            gsap.to(ctaChildren, {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'power2.out',
              stagger: 0.08
            });
          }
        }));
      }

    });

    // Mobile/tablet: (max-width: 1023px) — opacity + y only (spec §13)
    mm.add('(max-width: 1023px)', function (context) {
      var triggers = [];

      // No hero scale/parallax on mobile.

      // Timeline progress still follows scroll, but no horizontal animation.
      var progressEl = document.querySelector('.journey-line__progress');
      var timelineEl = document.querySelector('.timeline');
      if (progressEl && timelineEl) {
        triggers.push(ScrollTrigger.create({
          trigger: timelineEl,
          start: 'top 62%',
          end: 'bottom 42%',
          scrub: 0.6,
          animation: gsap.fromTo(progressEl,
            { scaleY: 0 },
            { scaleY: 1, ease: 'none', transformOrigin: 'top center' }
          )
        }));
      }

      var stages = document.querySelectorAll('.stage');
      stages.forEach(function (stage) {
        var content = stage.querySelector('.stage__content');
        if (!content) return;

        // Mobile: all stages start y:28, opacity:0 (spec §8 Mobile).
        gsap.set(content, { y: 28, opacity: 0 });

        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            start: 'top 74%',
            end: 'top 42%',
            scrub: 0.45,
            onEnter: function () {
              stage.setAttribute('data-state', 'active');
              trackLanding('landing_scroll_stage_' + stage.getAttribute('data-stage'));
            },
            onLeave: function () {
              stage.setAttribute('data-state', 'passed');
            },
            onLeaveBack: function () {
              stage.setAttribute('data-state', 'idle');
            }
          }
        });

        tl.to(content, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });

        // Five-shot sequence on mobile too (stagger 0.07).
        var shotRows = stage.querySelectorAll('.shot-row');
        if (shotRows.length) {
          shotRows.forEach(function (row) { gsap.set(row, { opacity: 0 }); });
          tl.to(shotRows, { opacity: 1, duration: 0.3, stagger: 0.07 }, 0.3);
        }

        triggers.push(tl.scrollTrigger);
      });

      // Final CTA on mobile.
      var ctaInner = document.querySelector('.final-cta__inner');
      if (ctaInner) {
        var ctaChildren = Array.prototype.slice.call(ctaInner.children);
        gsap.set(ctaChildren, { y: 20, opacity: 0 });
        triggers.push(ScrollTrigger.create({
          trigger: '.final-cta',
          start: 'top 75%',
          onEnter: function () {
            gsap.to(ctaChildren, {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'power2.out',
              stagger: 0.08
            });
          }
        }));
      }

    });
  }

  function revealAllStatically() {
    // Fallback: make sure nothing stays hidden if GSAP failed to load.
    var hiddenSelectors = [
      '.hero-image', '.hero-content', '.hero-content > *',
      '.stage__content', '.stage__heading', '.stage__body',
      '.stage__media', '.shot-list', '.resource-fragment', '.schedule-fragment',
      '.shot-row', '.schedule-list li', '.final-cta__inner > *'
    ];
    hiddenSelectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.clipPath = 'none';
      });
    });
    var progress = document.querySelector('.journey-line__progress');
    if (progress) progress.style.transform = 'scaleY(1)';
    document.querySelectorAll('.stage').forEach(function (stage) {
      stage.setAttribute('data-state', 'passed');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

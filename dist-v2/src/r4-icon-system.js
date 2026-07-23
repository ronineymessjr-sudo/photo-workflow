/**
 * R4 Icon System
 *
 * A thin semantic wrapper around the Lucide runtime already loaded by the
 * compatibility page. Consumers use product meaning names; this module maps
 * them to Lucide icon names and refreshes icons after dynamic rendering.
 */

(function (global) {
  'use strict';

  const ICON_MAP = {
    plans: 'ClipboardList',
    newPlan: 'Plus',
    references: 'Images',
    schedule: 'CalendarDays',
    equipment: 'Camera',
    lut: 'Palette',
    search: 'Search',
    filter: 'SlidersHorizontal',
    add: 'Plus',
    edit: 'Pencil',
    more: 'Ellipsis',
    openSource: 'ExternalLink',
    connected: 'CircleCheck',
    unavailable: 'CircleAlert',
    lens: 'Aperture',
    check: 'Check',
    close: 'X',
    chevronDown: 'ChevronDown',
    chevronRight: 'ChevronRight',
    menu: 'Menu',
    note: 'StickyNote',
    time: 'Clock',
    person: 'User',
    place: 'MapPin',
    warning: 'TriangleAlert',
    danger: 'OctagonAlert',
    success: 'CircleCheck',
    info: 'Info',
  };

  const DEFAULT_SIZE = 20;
  const DEFAULT_STROKE = 1.75;

  function resolveLucideName(semanticName) {
    const mapped = ICON_MAP[semanticName];
    if (!mapped) {
      console.warn(`[r4-icon-system] Unknown semantic icon name: ${semanticName}`);
      return semanticName;
    }
    return mapped;
  }

  /**
   * Create an SVG icon element from a semantic name.
   *
   * @param {string} semanticName - product meaning name, e.g. 'references'
   * @param {object} options
   * @param {number} options.size - viewBox size in px (default 20)
   * @param {number} options.stroke - stroke width (default 1.75)
   * @param {string} options.className - extra CSS classes
   * @param {string} options.ariaLabel - accessibility label
   * @returns {SVGElement|null}
   */
  function createIcon(semanticName, options = {}) {
    const lucideName = resolveLucideName(semanticName);
    const size = options.size || DEFAULT_SIZE;
    const stroke = options.stroke || DEFAULT_STROKE;
    const className = ['r4-icon', `r4-icon-${semanticName}`, options.className].filter(Boolean).join(' ');

    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('xmlns', svgNs);
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', `0 0 24 24`);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', String(stroke));
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', className);
    svg.setAttribute('role', 'img');

    if (options.ariaLabel) {
      svg.setAttribute('aria-label', options.ariaLabel);
    } else {
      svg.setAttribute('aria-hidden', 'true');
    }

    // Use Lucide's createIcons / createElement helper when available.
    if (global.lucide && typeof global.lucide.createElement === 'function') {
      try {
        const lucideSvg = global.lucide.createElement(lucideName);
        if (lucideSvg && lucideSvg.tagName === 'svg') {
          for (const attr of ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']) {
            lucideSvg.setAttribute(attr, svg.getAttribute(attr));
          }
          lucideSvg.setAttribute('width', String(size));
          lucideSvg.setAttribute('height', String(size));
          lucideSvg.setAttribute('class', className);
          if (options.ariaLabel) {
            lucideSvg.setAttribute('aria-label', options.ariaLabel);
            lucideSvg.removeAttribute('aria-hidden');
          } else {
            lucideSvg.setAttribute('aria-hidden', 'true');
          }
          return lucideSvg;
        }
      } catch (error) {
        console.warn('[r4-icon-system] Lucide createElement failed:', error);
      }
    }

    // Minimal fallback: embed the icon name as a data attribute so a later
    // refresh can replace it with the real Lucide SVG.
    svg.setAttribute('data-lucide', lucideName);
    return svg;
  }

  /**
   * Render or re-render all icons inside a root element.
   *
   * Elements with `data-r4-icon="<semantic-name>"` are replaced by SVG icons.
   *
   * @param {HTMLElement} [root=document]
   */
  function refreshIcons(root) {
    const scope = root || (typeof document !== 'undefined' ? document : null);
    if (!scope) return;

    const placeholders = scope.querySelectorAll('[data-r4-icon]');
    placeholders.forEach(element => {
      const semanticName = element.getAttribute('data-r4-icon');
      if (!semanticName) return;

      const size = Number(element.getAttribute('data-r4-size')) || DEFAULT_SIZE;
      const stroke = Number(element.getAttribute('data-r4-stroke')) || DEFAULT_STROKE;
      const ariaLabel = element.getAttribute('aria-label') || element.getAttribute('data-r4-label') || '';
      const className = element.getAttribute('data-r4-class') || '';

      const icon = createIcon(semanticName, { size, stroke, ariaLabel, className });
      if (icon && element.parentNode) {
        element.parentNode.replaceChild(icon, element);
      }
    });

    // Also delegate to Lucide's global createIcons if it exists, so plain
    // Lucide placeholders continue to work alongside semantic ones.
    if (global.lucide && typeof global.lucide.createIcons === 'function') {
      try {
        global.lucide.createIcons({ attrs: { 'class': ['r4-icon'] }, nameAttr: 'data-lucide' });
      } catch (error) {
        console.warn('[r4-icon-system] Lucide createIcons failed:', error);
      }
    }
  }

  /**
   * Register a custom semantic mapping.
   *
   * @param {string} semanticName
   * @param {string} lucideName
   */
  function registerIcon(semanticName, lucideName) {
    ICON_MAP[semanticName] = lucideName;
  }

  const api = {
    ICON_MAP,
    createIcon,
    refreshIcons,
    registerIcon,
  };

  // Expose as a module or global.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.PhotoAtelierR4IconSystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

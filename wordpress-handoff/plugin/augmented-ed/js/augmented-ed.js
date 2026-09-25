/* AugmentED pages on a host site: the offsets, the reveal, and the program bar's menu.
 *
 * On the AugmentED site the header is the first thing on the page and everything sticky
 * pins under its 96px. Here the page sits under AERDF's alert bar and header, which scroll
 * away, and the program bar sticks at the top instead — under the WordPress admin bar when
 * someone is logged in. So three numbers are measured rather than assumed, and written to
 * #augmented-ed where the stylesheet and the components read them:
 *
 *   --aug-top    what is fixed at the top above the bar: the admin bar while it is fixed
 *                (it stops being fixed at 600px and below), plus anything named in Settings.
 *   --header-h   --aug-top plus the bar, while the bar is sticky. Every sticky stage pins at
 *                this; the components read their pin back from their stage's computed top
 *                on every tick, so they follow it with no change of their own.
 *   --hero-lead  how far the page scrolls before the hero reaches its pin — the page's own
 *                top on the document, less --aug-top. The hero's copy fades on the
 *                document's scroll timeline (index.html), so without this it would be half
 *                gone before the reader had scrolled past AERDF's header.
 */
(function () {
  'use strict';
  var cfg = window.augmentedEd || {};
  var root = document.getElementById('augmented-ed');
  if (!root) return;
  var bar = root.querySelector('[data-aug-bar]');

  function fixedHeight(el) {
    if (!el) return 0;
    var cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return 0;
    var r = el.getBoundingClientRect();
    return r.bottom > 0 ? r.height : 0;
  }

  function measure() {
    var top = 0;
    var admin = document.getElementById('wpadminbar');
    if (admin && getComputedStyle(admin).position === 'fixed') top += admin.offsetHeight;
    if (cfg.offsetSelector) {
      try {
        document.querySelectorAll(cfg.offsetSelector).forEach(function (el) { top += fixedHeight(el); });
      } catch (e) { /* an invalid selector in Settings measures nothing */ }
    }
    var barSticky = bar && getComputedStyle(bar).position === 'sticky';
    var header = typeof cfg.offsetPx === 'number' ? cfg.offsetPx : top + (barSticky ? bar.offsetHeight : 0);
    var lead = root.getBoundingClientRect().top + window.scrollY - top;
    root.style.setProperty('--aug-top', top + 'px');
    root.style.setProperty('--header-h', header + 'px');
    root.style.setProperty('--hero-lead', Math.max(0, lead) + 'px');
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; measure(); });
  }
  if (cfg.mobileSticky === false) root.classList.add('aug-bar-static-mobile');
  measure();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule);
  window.addEventListener('load', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(schedule);
    if (bar) ro.observe(bar);
    ro.observe(document.body);
  }

  // Anything that stops position:sticky working. aerdf.org has none of these above the
  // page (checked 2026-09-25); a theme update that added one would silently unpin every
  // component, so say so where a developer will look.
  for (var el = root.parentElement; el && el !== document.documentElement; el = el.parentElement) {
    var cs = getComputedStyle(el);
    var clips = /(hidden|auto|scroll)/.test(cs.overflowX + cs.overflowY);
    if (clips || cs.transform !== 'none' || cs.filter !== 'none' || /paint|strict|content/.test(cs.contain)) {
      console.warn('AugmentED: an ancestor of the page breaks position:sticky, so its animations will not pin:', el);
      break;
    }
  }

  // ------------------------------------------------------------------ the reveal
  //
  // Blocks marked data-reveal fade in as they reach the viewport, as on the site: the same
  // 92% line its sweep() uses. They are only hidden at all once this has run far enough to
  // set html.aug-js (the head does that) — and css/host.css shows them anyway after four
  // seconds unless this script says it is running, so a script that fails to load cannot
  // leave a page blank.
  var blocks = Array.prototype.slice.call(root.querySelectorAll('[data-reveal]'));
  function show(el) { el.setAttribute('data-aug-shown', ''); }
  function sweep() {
    var h = window.innerHeight || 800;
    blocks = blocks.filter(function (el) {
      if (el.getBoundingClientRect().top < h * 0.92) { show(el); return false; }
      return true;
    });
  }
  root.classList.add('aug-reveal-ready');
  sweep();
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    blocks.forEach(function (el) { io.observe(el); });
  } else {
    blocks.forEach(show);
  }
  window.addEventListener('scroll', function () { if (blocks.length) sweep(); }, { passive: true });

  // ------------------------------------------------------------------ the menu
  var toggle = root.querySelector('[data-aug-menu-toggle]');
  var menu = root.querySelector('[data-aug-menu]');
  if (!toggle || !menu) return;
  function setOpen(open, restoreFocus) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      // Under the bar wherever the bar is right now: at the very top of the page it has
      // not stuck yet, and AERDF's header is still above it.
      menu.style.top = Math.max(0, bar.getBoundingClientRect().bottom) + 'px';
      menu.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
    } else {
      menu.setAttribute('hidden', '');
      document.body.style.overflow = '';
      if (restoreFocus) toggle.focus();
    }
  }
  toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true', false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false, false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 992 && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, false);
  }, { passive: true });
})();

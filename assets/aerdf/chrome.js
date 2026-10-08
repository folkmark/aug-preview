/* The /aerdf/ preview: what AERDF's theme script does to its own header, and the one offset
 * the WordPress plugin measures (js/augmented-ed.js in the plugin).
 *
 * AERDF's header and footer are drawn in shadow roots (tools/snapshot-aerdf.mjs, "THE SHADOW
 * ROOT"), so their markup is reached through each host's shadowRoot. aerdf.org's own theme
 * opens the mobile menu from the hamburger, closes it from the cross, and toggles the search
 * panel; nothing else of its script affects how the header looks.
 *
 * --hero-lead is how far the page scrolls before the hero reaches the program bar: AERDF's
 * alert bar and header, which sit above it and scroll away. Without it the hero's copy would
 * dissolve while the reader was still scrolling AERDF's header out of view (index.html, at
 * --hero-lead). Measured, as the plugin does, because AERDF's header changes height with the
 * width of the window.
 */
(function () {
  'use strict';
  document.querySelectorAll('[data-aerdf-chrome]').forEach(function (host) {
    var r = host.shadowRoot;
    if (!r) return;
    r.addEventListener('click', function (e) {
      var t = e.target;
      var nav = r.getElementById('mobile-nav');
      var search = r.getElementById('search-panel');
      if (t.closest('.Header_hamburger__9qGMT svg') && nav) nav.classList.toggle('open');
      else if (t.closest('#nav-close') && nav) nav.classList.remove('open');
      else if (t.closest('#search-toggle') && search) search.classList.toggle('open');
    });
  });

  // The AugmentED page's own top is where AERDF's top chrome ends: <x-dc> is display:
  // contents, so it has no box of its own to measure.
  var above = document.querySelector('[data-aerdf-chrome]');
  if (!above || !document.querySelector('x-dc')) return;
  function measure() {
    var lead = above.getBoundingClientRect().bottom + window.scrollY;
    document.documentElement.style.setProperty('--hero-lead', Math.max(0, lead) + 'px');
  }
  measure();
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();

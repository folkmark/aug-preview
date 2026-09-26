/* <cycle-wheel> — the R&D cycle ring, built by the reader's own scroll.

   Dependency-free and host-agnostic on purpose, like the other three components: no
   framework, no build step, and no assumption about where it is mounted. It drives
   markup it does not build — every node it touches is authored in the page — so a
   framework that re-renders around it has nothing of ours to reconcile away, and
   with scripting off the reading column is still real, readable text. Dropping this
   into another CMS is this file, cycle-wheel.css, the four icon images, and the
   markup below. The full specification, including why every number is what it is,
   is wordpress-handoff/sections/cycle.md.

   Markup contract (two arms; cycle-wheel.css switches them at 992px):

     <cycle-wheel>
       <div data-cycle-rig>                  <- desktop arm; its height is the scroll budget
         <div data-cycle-stage>              <- sticky; top = the header's height (--cw-pin)
           <div data-cycle data-active="0" data-sel="0">
             <svg aria-hidden="true">
               <g data-arc="0"><path pathLength="100" stroke-dasharray="100"
                  stroke-dashoffset="100"/><polygon style="opacity:0"/></g>
               <!-- arcs 0-3, drawn tip to tail around the ring -->
             </svg>
             <button data-node="0" aria-label="Step 01, …"><img …></button>
             <!-- nodes 0-3 on the ring -->
             <div data-hub> <h3>…</h3> <p data-hub-line>…</p> </div>
             <button data-rl="0">…</button><div data-body="0">…</div>
             <!-- reading rows 0-3 -->
           </div>
         </div>
       </div>
       <div data-cycle-list data-cycle data-sel="0">   <- mobile arm: a plain accordion
         <button data-rl="0">…</button><div data-body="0">…</div>
         <!-- rows 0-3 again, same copy; render both arms from one content source -->
       </div>
     </cycle-wheel>

   One clock drives everything. The pinned travel splits into four equal beats, and
   beat i is when row i is open AND arc i is drawing — the ring's growth and the
   reading column walk in lockstep. pathLength="100" on the arc paths is what makes
   the dash-offset maths unit-free; do not remove it.

   Interaction rules, each deliberate:
   - A click travels; a focus does not. Clicking a node or a row scrolls the page to
     that step's own beat, because on desktop the scroll IS the clock. Keyboard
     focus has no scroll of its own, so focusing a node opens its step in place.
   - The build latches at p > 0.97 — on or after the last arc's own close at 0.97,
     because 0.93 was measured jumping 25.8 dash-offset units in one 9px scroll step
     (stroke-dashoffset carries no transition, so a late latch is the one change
     here that cannot be eased). Scrolling back up never un-draws the ring; only
     remounting (a page navigation) starts it over.
   - On the mobile arm there is no pinned run, so a row tap simply opens the row.

   The sticky offset is read back off [data-cycle-stage]'s computed top, so the CSS
   and the script cannot disagree and a host with a different header sets --cw-pin
   and changes no code. The painted state is recorded on the wheel's own root
   (data-cwg / data-cwk) rather than held in the instance, and cleared on boot — the
   same full-page-cache discipline as the canvas components: a cache that serialises
   the DOM must not hand the next visitor a ring that claims to be painted.
*/
(function () {
  if (!window.customElements || customElements.get('cycle-wheel')) return;

  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  var CycleWheel = function () { return Reflect.construct(HTMLElement, [], CycleWheel); };
  CycleWheel.prototype = Object.create(HTMLElement.prototype);

  CycleWheel.prototype.connectedCallback = function () {
    var self = this;
    this.rig = this.querySelector('[data-cycle-rig]');
    this.stage = this.rig && (this.rig.querySelector('[data-cycle-stage]') || this.rig.firstElementChild);
    this.wheel = this.rig && this.rig.querySelector('[data-cycle]');
    this.list = this.querySelector('[data-cycle-list]');
    this.done = false;
    this.raf = 0;
    this.travRaf = 0;

    // Cache safety: a serialised page carries whatever paint keys the last session
    // wrote, and trusting them leaves the ring un-repainted forever.
    if (this.wheel) { delete this.wheel.dataset.cwg; delete this.wheel.dataset.cwk; }

    this.mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.onMq = function () { self.paint(true); };
    if (this.mq && this.mq.addEventListener) this.mq.addEventListener('change', this.onMq);

    // A click travels, a focus does not — see the header comment. Both arms' rows
    // land in the one click handler; nodes exist only on the desktop arm.
    this.onClick = function (e) {
      var btn = e.target.closest ? e.target.closest('[data-node], [data-rl]') : null;
      if (!btn || !self.contains(btn)) return;
      var i = +(btn.dataset.node !== undefined ? btn.dataset.node : btn.dataset.rl);
      if (i >= 0) self.travel(i);
    };
    this.onFocus = function (e) {
      var node = e.target.closest ? e.target.closest('[data-node]') : null;
      if (node && self.contains(node)) self.select(+node.dataset.node);
    };
    this.addEventListener('click', this.onClick);
    this.addEventListener('focusin', this.onFocus);

    // Scroll and resize move the clock; the interval is insurance against layout
    // shifts with no event (fonts, late images) and repaints geometry only — it
    // must never reassert the scroll-derived step, or a keyboard user's focus
    // selection would be silently reverted a quarter-second later.
    this.onScroll = function () {
      if (self.raf) return;
      self.raf = requestAnimationFrame(function () { self.raf = 0; self.paint(true); });
    };
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll, { passive: true });
    this.tick = setInterval(function () { self.paint(false); }, 250);
    this.paint(true);
  };

  CycleWheel.prototype.disconnectedCallback = function () {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('focusin', this.onFocus);
    if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener('change', this.onMq);
    clearInterval(this.tick);
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.travRaf) cancelAnimationFrame(this.travRaf);
  };

  // The sticky offset, read back off the stage rather than off a header element:
  // document.querySelector("header") finds the first <header> in the document, and
  // CMS themes routinely emit one inside an article. Reading the computed top means
  // the stylesheet and this script agree by construction.
  CycleWheel.prototype.pin = function () {
    if (!this.stage) return 0;
    return parseFloat(getComputedStyle(this.stage).top) || 0;
  };

  CycleWheel.prototype.sel = function () {
    var root = this.wheel || this.list;
    return root ? (+root.dataset.sel || 0) : 0;
  };

  // Selection is written to the DOM, not held in the instance: data-sel and
  // data-active on both arms' roots are what the stylesheet styles from.
  CycleWheel.prototype.select = function (i) {
    if (this.wheel) { this.wheel.dataset.sel = i; this.wheel.dataset.active = i; }
    if (this.list) this.list.dataset.sel = i;
    this.paint(false);
  };

  CycleWheel.prototype.travel = function (i) {
    var self = this;
    // No pinned run on the mobile arm — the row simply opens.
    if (!this.rig || !this.rig.offsetHeight || this.rig.offsetParent === null) { this.select(i); return; }
    var pin = this.pin();
    var span = this.rig.offsetHeight - this.stage.offsetHeight;
    var top = this.rig.getBoundingClientRect().top + (window.scrollY || 0);
    // Mid-beat, where the stage is unambiguously the active one — not the beat
    // boundary, where two steps contest it.
    var target = Math.round(top - pin + (i * 0.25 + 0.125) * span);
    if (this.travRaf) { cancelAnimationFrame(this.travRaf); this.travRaf = 0; }
    if (this.mq && this.mq.matches) { window.scrollTo(0, target); return; }
    var from = window.scrollY || 0;
    if (Math.abs(target - from) < 2) { this.select(i); return; }
    var dur = 520, t0 = performance.now();
    var step = function (now) {
      var t = clamp01((now - t0) / dur);
      var e = t * t * (3 - 2 * t);
      window.scrollTo(0, Math.round(from + (target - from) * e));
      if (t < 1) self.travRaf = requestAnimationFrame(step);
      else { self.travRaf = 0; window.scrollTo(0, target); }
    };
    this.travRaf = requestAnimationFrame(step);
  };

  // updateSel is true only for scroll, resize and boot ticks: those are the reader
  // moving the clock, and the clock then owns the open step. The 250ms insurance
  // tick passes false so it can repair geometry without stealing a selection the
  // keyboard just made.
  CycleWheel.prototype.paint = function (updateSel) {
    if (!this.rig || !this.stage || !this.wheel || !this.rig.offsetHeight) return;
    var span = this.rig.offsetHeight - this.stage.offsetHeight;
    var p = clamp01((this.pin() - this.rig.getBoundingClientRect().top) / (span || 1));

    // The latch: see the header comment for why 0.97 exactly. Cleared only by a
    // remount — connectedCallback resets it — never by a step change, which runs
    // on every scroll tick and would un-build the ring while the reader watches.
    if (p > 0.97) this.done = true;
    var reduced = this.mq && this.mq.matches;
    var b = reduced || this.done ? 1 : p;
    var sel = this.sel();
    var seg = function (a, c) { return clamp01((b - a) / (c - a)); };
    var self2 = this;
    var grown = function (i) {
      return self2.done || i <= sel ? 1 : i === 0 ? seg(0, 0.04) : seg((i - 1) * 0.25 + 0.2, i * 0.25);
    };

    // Geometry moves only while the build value moves. The key lives on the wheel's
    // root, not in the instance, so a framework that replaces the subtree gets a
    // full repaint instead of a stale ring that claims to be drawn.
    if (this.wheel.dataset.cwg !== String(b)) {
      this.wheel.dataset.cwg = String(b);
      for (var i = 0; i < 4; i++) {
        var arc = this.wheel.querySelector('[data-arc="' + i + '"]');
        if (arc) {
          var path = arc.querySelector('path'), head = arc.querySelector('polygon');
          var a0 = i * 0.25 + 0.05;
          if (path) path.style.strokeDashoffset = (100 * (1 - seg(a0, a0 + 0.17))).toFixed(2);
          if (head) head.style.opacity = seg(a0 + 0.14, a0 + 0.17).toFixed(3);
        }
      }
      // The wheel is named from the first beat — the reader always knows what they
      // are looking at; only its closing line waits for the loop to close.
      var hub = this.wheel.querySelector('[data-hub]');
      if (hub) hub.style.opacity = seg(0, 0.05).toFixed(3);
      var line = this.wheel.querySelector('[data-hub-line]');
      if (line) line.style.opacity = (0.7 * seg(0.92, 1)).toFixed(3);
    }

    // Selection styling repaints whenever the open step or the build changes.
    var key = sel + '|' + b;
    if (this.wheel.dataset.cwk !== key) {
      this.wheel.dataset.cwk = key;
      for (var k = 0; k < 4; k++) {
        var node = this.wheel.querySelector('[data-node="' + k + '"]');
        if (!node) continue;
        var built = grown(k);
        node.style.opacity = (built * (k === sel ? 1 : 0.42)).toFixed(3);
        // No hover target until the icon is actually on screen.
        node.style.pointerEvents = built > 0.9 ? 'auto' : 'none';
        node.disabled = built <= 0.9;
        var selArc = this.wheel.querySelector('[data-arc="' + k + '"]');
        if (selArc) selArc.style.opacity = k === sel ? '1' : '';
      }
    }

    // The clock owns the open step while the reader scrolls; the pointer and the
    // keyboard outrank it only until the page next moves.
    if (updateSel) {
      var at = Math.min(3, Math.floor(p / 0.25));
      if (at !== sel) this.select(at);
    }
  };

  customElements.define('cycle-wheel', CycleWheel);
})();

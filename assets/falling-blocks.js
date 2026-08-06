/* <falling-blocks> — a scroll-scrubbed hero of two alpha plates sandwiching copy.

   Dependency-free and host-agnostic on purpose: no framework, no build step, no
   bundler, and no assumption about where it is mounted. It drives markup it does not
   build — every node it touches is authored in the page — so a framework that
   re-renders around it has nothing of ours to reconcile away, and the still <img>
   fallback renders with scripting off. Dropping this into another CMS is this file,
   falling-blocks.css, the frame directory, and the markup below.

   Markup contract (all of it required; see assets/falling-blocks.css):

     <falling-blocks base="path/to/falling-blocks/">
       <div data-fb-stage>
         <div data-fb-layer="bottom"><canvas></canvas><img src="…fb0001.webp" alt=""></div>
         <div data-fb-copy>
           <h1>…</h1>                          <- the near plate passes in front of this
           <div data-fb-front> …body, buttons… </div>   <- and behind this
         </div>
         <div data-fb-layer="top"><canvas></canvas><img src="…fb0001.webp" alt=""></div>
       </div>
     </falling-blocks>

   Frame URLs are base + "w<width>/<layer>/fb<0000>.webp". The layers are two depth
   planes of one camera view, not halves of a taller image: they register 1:1, so they
   share one cover-fit box and one frame index and differ only in how far they travel.

   The stage pins while the blocks rise through it, then the hero scrolls away. The
   scroll budget is the element's height minus the stage's, so the pin's length and the
   speed of the motion are one number set in CSS. Make the element the same height as
   its stage and nothing pins — the copy just scrolls away while the blocks move. The
   same formula covers both, so that is a CSS decision, not a code change.

   Attributes, all optional except base:
     base          URL prefix ending in "/"           (required)
     frames        frame count                        (48)
     layers        comma list, back to front           ("bottom,top")
     width         encoded width to load               (1440)
     revolutions   tumbles across the section          (0.6)
     budget-mb     resident decoded-bitmap ceiling     (128)
     min-width     below this the still is shown       (901)
     stage-fill    plate width as a fraction of the stage's (1)
     content-<layer> "c0,c1": where that layer's blocks sit, as fractions of plate height
     speed-<layer>   multiplier on its travel; 1 leaves exactly as the pin ends
*/
(function () {
  if (!window.customElements || customElements.get('falling-blocks')) return;

  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var pad4 = function (n) { return String(n).padStart(4, '0'); };

  // The plate's own proportions. Everything geometric is derived from these, so a
  // re-render at another aspect only has to change them.
  var PLATE_W = 2560, PLATE_H = 3840;

  // How far the plate is oversized past the stage. The travel is the whole point of
  // this section, so the plate is not fitted to the stage — it is sized to overhang
  // it, and this is the minimum overhang guaranteed on any viewport. Without it a
  // stage taller than 1.5x its width (a 1000x1600 desktop window) would have the
  // plate exactly cover and nothing left to travel, and the fall would silently stop
  // with no visible symptom to debug.
  var HEADROOM = 0.35;

  // Where each layer's blocks actually live, as fractions of the plate's height. This
  // is measured off the render, not chosen — see tools/encode-falling-blocks.mjs.
  //
  // The motion is defined by these bounds rather than by the plate's edges, and that is
  // the whole trick. At rest the plate is placed so the top of its content sits exactly
  // on the stage's bottom edge: the blocks are just below the fold and rise into view.
  // At the end it is placed so the bottom of its content sits on the stage's top edge:
  // they have all left. The plate's own edges are free to cross the stage on the way,
  // because a plate is transparent and an empty region of one is indistinguishable from
  // no plate at all. What must never cross is a block cut by the frame — which is why
  // the far plate's lowest group is trimmed at encode time.
  var CONTENT = { bottom: [0.273, 0.700], top: [0.183, 0.775] };

  // Multiplier on that minimum travel, per layer. 1 means the layer's last block leaves
  // exactly as the pin ends. Above 1 it leaves earlier and the plate keeps rising
  // empty, which is what makes the parallax: the near plane clears the frame before the
  // far one, as it should. Below 1 would strand blocks on screen and is never right.
  var SPEED = { bottom: 1, top: 1.25 };

  // Stop the pump this many still frames after the last change, not one: Safari can
  // paint once more after the final scroll event of a fling, and stopping on the
  // first still frame leaves the plates a frame behind where the page came to rest.
  var IDLE_FRAMES = 3;

  // A frame is only drawable once both plates hold it, so a frame costs two decodes
  // and the window divisor says so. Requests go out frame-major for the same reason.
  //
  // Kept deliberately low. Decoding is the expensive half of this component and it
  // competes with the compositor for the same cores: a browser told to decode a dozen
  // multi-megapixel frames at once while scrolling is how a hero ends up reported as
  // making the whole machine slow. Four in flight keeps the window filling faster than
  // a reading scroll drains it without ever monopolising the machine.
  var MAX_INFLIGHT = 4;

  function num(el, name, dflt) {
    var v = parseFloat(el.getAttribute(name));
    return isFinite(v) ? v : dflt;
  }

  class FallingBlocks extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this.boot();
    }

    // Boot is deferred until the markup contract is actually satisfied, and is not a
    // one-shot. A host framework may insert this element and only then fill it: React
    // does exactly that, so connectedCallback can fire against an element with no
    // children and no attributes yet. Giving up there would leave the hero as a still
    // for the rest of the session, on the one host this most needs to work on — so if
    // the parts are missing, watch for them instead.
    boot() {
      if (this._booted) return;
      var stage = this.querySelector('[data-fb-stage]');
      var names = (this.getAttribute('layers') || 'bottom,top').split(',').map(function (s) { return s.trim(); });
      var ready = !!stage && names.every(function (n) {
        var box = this.querySelector('[data-fb-layer="' + n + '"]');
        return box && box.querySelector('canvas');
      }, this);
      if (!ready) {
        if (!this.mo) {
          this.mo = new MutationObserver(this.boot.bind(this));
          this.mo.observe(this, { childList: true, subtree: true });
        }
        return;
      }
      if (this.mo) { this.mo.disconnect(); this.mo = null; }
      this._booted = true;

      this.base = this.getAttribute('base') || '';
      this.N = Math.max(1, num(this, 'frames', 48) | 0);
      this.layers = names;
      this.tier = num(this, 'width', 1440) | 0;
      this.revolutions = num(this, 'revolutions', 0.6);
      this.budget = num(this, 'budget-mb', 128) * 1048576;
      this.minWidth = num(this, 'min-width', 901);
      // What fraction of the stage's width the plate spans. 1 is full bleed, which
      // throws blocks off both edges of the screen at whatever size the viewport
      // happens to make them; less than that pulls them into a measure and is how the
      // hero is kept to the same width as the artwork further down the page.
      this.fill = num(this, 'stage-fill', 1);

      this.content = {};
      this.speed = {};
      for (var i = 0; i < this.layers.length; i++) {
        var L = this.layers[i];
        var a = (this.getAttribute('content-' + L) || '').split(',').map(parseFloat);
        this.content[L] = (a.length === 2 && isFinite(a[0]) && isFinite(a[1])) ? a : (CONTENT[L] || [0, 1]);
        this.speed[L] = num(this, 'speed-' + L, SPEED[L] || 1);
      }

      this.stage = stage;
      this.plates = {};
      for (var j = 0; j < this.layers.length; j++) {
        var name = this.layers[j];
        var box = this.querySelector('[data-fb-layer="' + name + '"]');
        var cv = box.querySelector('canvas');
        // Drop any drawn-frame tag that arrived with the markup. The tag exists so a
        // re-render cannot leave a canvas blank, and it is trusted — so a tag on a
        // canvas that has only just been parsed is a lie, and one that survives into
        // the HTML pins the plate blank for good. That is not hypothetical: anything
        // that serialises a live DOM reproduces it, which is what a WordPress
        // full-page cache does on every request, and what this project's own static
        // export did. A freshly parsed canvas has never been drawn to, so say so.
        cv.removeAttribute('data-fbf');
        this.plates[name] = { box: box, cv: cv };
      }
      stage.removeAttribute('data-fb-box');

      // State. Bitmaps live here, on the element instance — not in the DOM, so no
      // re-render can touch them, and not in a module-level cache, so two instances
      // on one page cannot collide.
      this.bits = {};
      this.pend = {};
      for (var k = 0; k < this.layers.length; k++) {
        this.bits[this.layers[k]] = new Array(this.N);
        this.pend[this.layers[k]] = new Uint8Array(this.N);
      }
      this.ready = new Uint8Array(this.N);
      this.gen = 0;
      this.inflight = 0;
      this.head = 0;
      this.dir = 1;
      this.win = this.N;
      this.live = false;
      this.drawn = -1;
      this.idle = 0;
      this.raf = 0;

      this._wake = this.wake.bind(this);
      this._vis = this.onVisibility.bind(this);
      this._gate = this.evaluate.bind(this);

      // Three separate signals, evaluated separately and never merged into one flag.
      // They mean different things: a preference, a memory limit, and a bandwidth
      // preference. Collapsing them is how "we stopped the motion to protect a small
      // device" quietly becomes "we stopped it because someone asked for less", and
      // then neither can be changed without changing the other.
      this.mqMotion = matchMedia('(prefers-reduced-motion: reduce)');
      this.mqSmall = matchMedia('(max-width: ' + (this.minWidth - 1) + 'px)');
      this.addMq(this.mqMotion);
      this.addMq(this.mqSmall);

      this.evaluate();
    }

    paint() {
      var want = this.motion ? 'on' : 'off';
      if (this.getAttribute('data-fb-motion') !== want) this.setAttribute('data-fb-motion', want);
    }

    addMq(mq) {
      if (mq.addEventListener) mq.addEventListener('change', this._gate);
      else if (mq.addListener) mq.addListener(this._gate);
    }
    dropMq(mq) {
      if (mq.removeEventListener) mq.removeEventListener('change', this._gate);
      else if (mq.removeListener) mq.removeListener(this._gate);
    }

    // Bandwidth is the one signal with no media query behind it. It never reaches the
    // motion decision on its own account — with a single encoded width there is no
    // smaller tier to drop to, and decoding a 1280 file at 640 saves no bytes at all,
    // so the only thing that honours the preference is not fetching 96 frames. When a
    // second tier is added this becomes a width change and stops touching motion.
    thin() {
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return false;
      return !!c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g' || c.effectiveType === '3g';
    }

    evaluate() {
      var want = !this.mqMotion.matches && !this.mqSmall.matches && !this.thin() &&
                 typeof createImageBitmap === 'function' && typeof IntersectionObserver === 'function';
      if (want === this.motion) return;
      this.motion = want;
      // The attribute is what the stylesheet switches on, so the canvas/still swap and
      // the section's collapsed height are one decision expressed in one place.
      //
      // It is also re-asserted rather than set once. Boot can land in the middle of a
      // host framework's own DOM work — under React it runs from the mutation that
      // appends our children — and that framework's next commit reconciles this
      // element's attributes back to the ones it knows about, silently dropping this
      // one. The section would then stay one screen tall with the still showing while
      // the engine ran happily behind it. Watching for the removal and putting it back
      // costs nothing when nobody touches it, and no loop is possible because the
      // re-assert only fires when the value is actually wrong.
      this.paint();
      if (!this.attrMo) {
        this.attrMo = new MutationObserver(this.paint.bind(this));
        this.attrMo.observe(this, { attributes: true, attributeFilter: ['data-fb-motion'] });
      }
      if (want) this.start(); else this.stop();
    }

    start() {
      var self = this;
      // One observer, one job: deciding whether the decoded plates exist at all. It is
      // not the clock — the scrub still measures the rig every frame. Gating a
      // nine-figure byte allocation wants hysteresis, which a per-tick rect test would
      // have to reimplement.
      this.io = new IntersectionObserver(function (es) {
        var on = es[0].isIntersecting;
        clearTimeout(self.sleepT);
        self.live = on;
        if (on) { self.plan(); self.wake(); }
        else self.sleepT = setTimeout(function () { self.free(self.drawn); }, 2000);
      }, { rootMargin: '150% 0px' });
      this.io.observe(this);

      // Scroll wakes the pump; the pump reads layout. Reading the rig's position
      // inside the frame that is about to paint is what keeps an iOS fling honest —
      // during momentum Safari delivers scroll events on its own cadence and the
      // position they imply can be a frame stale, which reads as the plates lagging
      // the page and then snapping. A free-running loop would fix that too and burn a
      // core for the whole session; this one stops a few frames after the last change.
      addEventListener('scroll', this._wake, { passive: true });
      addEventListener('resize', this._wake, { passive: true });
      document.addEventListener('visibilitychange', this._vis);
      this.wake();
    }

    stop() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      removeEventListener('scroll', this._wake);
      removeEventListener('resize', this._wake);
      document.removeEventListener('visibilitychange', this._vis);
      clearTimeout(this.sleepT);
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.live = false;
      this.free(-1);
    }

    disconnectedCallback() {
      if (this.mo) { this.mo.disconnect(); this.mo = null; }
      if (this.attrMo) { this.attrMo.disconnect(); this.attrMo = null; }
      if (!this._booted) return;
      this._booted = false;
      this.stop();
      this.dropMq(this.mqMotion);
      this.dropMq(this.mqSmall);
    }

    onVisibility() {
      var self = this;
      clearTimeout(this.sleepT);
      if (document.visibilityState === 'hidden') {
        // A backgrounded tab holding this much decoded image is exactly what iOS
        // discards. Keep the one drawn index so the restore paints the same picture
        // immediately; the bytes are still in the HTTP cache, so re-priming after
        // that costs decode and no network.
        this.sleepT = setTimeout(function () { self.free(self.drawn); }, 4000);
      } else if (this.live) { this.plan(); this.wake(); }
    }

    // Every free bumps the generation. A decode that lands afterwards belongs to a
    // world that no longer exists: it closes its own bitmap rather than repopulating
    // a cache that was just emptied.
    free(keep) {
      this.gen++;
      for (var i = 0; i < this.layers.length; i++) {
        var arr = this.bits[this.layers[i]];
        for (var n = 0; n < this.N; n++) {
          if (n === keep || !arr[n]) continue;
          arr[n].close();
          arr[n] = null;
        }
      }
      this.ready.fill(0);
      if (keep >= 0 && this.bits[this.layers[0]][keep]) this.ready[keep] = 1;
      this.inflight = 0;
    }

    // Frame 48's successor is frame 1. The wrap step is the same size as any other
    // adjacent step, so the seam is not a boundary — nothing in here may compare
    // indices with < or subtract them directly.
    cfwd(a, b) { var n = this.N; return ((b - a) % n + n) % n; }

    keep(i) {
      var back = Math.max(2, Math.floor(this.win * 0.25));
      var fwd = this.win - back;
      var d = this.dir > 0 ? this.cfwd(this.head, i) : this.cfwd(i, this.head);
      return d <= fwd || d >= this.N - back;
    }

    plan() {
      if (!this.live || !this.motion) return;
      var i, n;

      // The window follows from the byte budget and is never hand-set. Decoded size
      // is width x height x 4 no matter how small the WebP is on disk, so raising the
      // encoded width shrinks the window automatically instead of silently
      // multiplying what is held.
      var bpf = this.tier * Math.round(this.tier * PLATE_H / PLATE_W) * 4;
      this.win = Math.max(4, Math.min(this.N, Math.floor(this.budget / (bpf * this.layers.length))));

      // Evict first, so the requests below are issued against a truthful budget.
      for (i = 0; i < this.N; i++) {
        if (this.keep(i)) continue;
        for (n = 0; n < this.layers.length; n++) {
          var arr = this.bits[this.layers[n]];
          if (arr[i]) { arr[i].close(); arr[i] = null; }
        }
        this.ready[i] = 0;
      }

      // Frame-major, not layer-major: a frame is worth nothing until both plates have
      // it, so both plates of frame i go out before either plate of i+1. Filling one
      // layer first would spend the whole warm-up with a full far plate, an empty near
      // one, and not one drawable frame between them.
      for (var d = 0; d < this.win && this.inflight < MAX_INFLIGHT; d++) {
        i = this.dir > 0 ? (this.head + d) % this.N : ((this.head - d) % this.N + this.N) % this.N;
        for (n = 0; n < this.layers.length && this.inflight < MAX_INFLIGHT; n++) {
          var L = this.layers[n];
          if (this.bits[L][i] || this.pend[L][i]) continue;
          this.request(L, i);
        }
      }
    }

    request(layer, i) {
      var self = this, gen = this.gen, tier = this.tier;
      this.pend[layer][i] = 1;
      this.inflight++;
      // No AbortController: aborting discards bytes already paid for, and the
      // in-flight count is what bounds the work. A frame that falls out of the window
      // mid-flight is closed the moment it decodes, which costs one decode and no
      // network at all.
      fetch(this.base + 'w' + tier + '/' + layer + '/fb' + pad4(i + 1) + '.webp')
        .then(function (r) { return r.ok ? r.blob() : Promise.reject(r.status); })
        // colorSpaceConversion none to match the encoder: these were written
        // view-transformed sRGB with no ICC profile, so there is nothing to convert
        // and a round trip here would apply a transfer function twice.
        .then(function (b) { return createImageBitmap(b, { colorSpaceConversion: 'none' }); })
        .then(function (bm) {
          if (gen !== self.gen || tier !== self.tier || !self.keep(i)) { bm.close(); return; }
          self.bits[layer][i] = bm;
          var all = true;
          for (var n = 0; n < self.layers.length; n++) if (!self.bits[self.layers[n]][i]) all = false;
          if (all) { self.ready[i] = 1; self.wake(); }
        })
        // A frame that will not load is left empty on purpose: nearest() covers it for
        // the rest of the session, and retrying a 404 forever is worse than a
        // one-frame substitution nobody can see.
        .catch(function () {})
        .then(function () { self.pend[layer][i] = 0; self.inflight--; self.plan(); });
    }

    // The circularly nearest index every plate holds, or -1. All plates are always
    // asked for the same answer: substituting per layer would de-register the two
    // depth planes of one camera view, which is the one artefact the eye catches
    // immediately.
    nearest(want) {
      if (this.ready[want]) return want;
      for (var d = 1; d <= this.N >> 1; d++) {
        var a = (want + d) % this.N; if (this.ready[a]) return a;
        var b = ((want - d) % this.N + this.N) % this.N; if (this.ready[b]) return b;
      }
      return -1;
    }

    frame() {
      if (!this.offsetHeight) return false;
      var stage = this.stage;

      // The sticky offset comes from the stylesheet rather than a second copy of the
      // header height here: the value that pins the stage and the value the progress
      // is measured against can then never drift apart, and a host with no sticky
      // header gets 0 without configuring anything.
      var stick = parseFloat(getComputedStyle(stage).top) || 0;
      // Two shapes, one formula. Where the stage is pinned inside a taller rig, the
      // scroll budget is the difference between them and the copy holds still while
      // the plates travel. Where the stage fills the rig — the default, and what the
      // hero uses — nothing is pinned, the copy scrolls away like any other section,
      // and the budget is the rig's own height: the plates keep spinning and rising
      // for exactly as long as the hero is on screen. A host that wants the pinned
      // behaviour gets it by making the rig taller than the stage, and changes nothing
      // here. `stick` is the stage's own CSS `top`, so the value that pins it and the
      // value progress is measured from can never disagree; unpinned it reads auto,
      // which is 0, which is correct.
      var span = this.offsetHeight - stage.offsetHeight;
      if (span < 1) span = this.offsetHeight;
      var p = clamp01((stick - this.getBoundingClientRect().top) / span);
      var moved = p !== this.p;
      this.p = p;

      // One cover-fit, both plates. They are two halves of one photograph in every
      // sense that matters, so the box is computed once here and written to the stage
      // as custom properties that both layers read — the registration is structural
      // rather than two code paths that have to keep agreeing.
      var sw = stage.clientWidth, sh = stage.clientHeight;
      var plateW = Math.max(sw * this.fill, sh * (PLATE_W / PLATE_H) * (1 + HEADROOM));
      var plateH = plateW * PLATE_H / PLATE_W;
      var box = plateW.toFixed(1);
      // The memo lives on the element rather than on this instance for the same
      // reason the drawn-frame tag does: if a host framework swaps the node out, an
      // instance-held "already set" would suppress the rewrite and leave the plates
      // at zero width for good. Element and memo are destroyed together.
      if (stage.dataset.fbBox !== box) {
        stage.style.setProperty('--fb-plate-w', box + 'px');
        stage.style.setProperty('--fb-plate-h', plateH.toFixed(1) + 'px');
        stage.dataset.fbBox = box;
      }

      // Travel. Compositor only — the plate is never redrawn at an offset, and the
      // canvas contents are identical whatever the scroll position is. Written every
      // tick rather than on change, because a host re-render wipes inline style and a
      // change guard would leave the plate parked at zero.
      //
      // Strictly linear in p, and p is strictly linear in scroll position. There is no
      // easing anywhere on this path and there must not be: anything that shapes the
      // curve here reads as the blocks speeding up and slowing down for no reason the
      // visitor can see, which is worse than no motion at all.
      for (var n = 0; n < this.layers.length; n++) {
        var L = this.layers[n], c = this.content[L], el = this.plates[L].box;
        if (!el) continue;
        var y0 = sh - c[0] * plateH;   // content's top edge resting on the stage's bottom
        var y1 = -c[1] * plateH;       // content's bottom edge level with the stage's top
        el.style.transform = 'translate3d(0,' + (y0 + p * (y1 - y0) * this.speed[L]).toFixed(1) + 'px,0)';
      }

      // Tumble. Index and travel are two independent functions of one progress value:
      // the loop turns many times while the plates travel once, so this line must
      // never be derived from the transform above or vice versa.
      var want = Math.floor(p * this.revolutions * this.N) % this.N;
      if (want !== this.head) {
        this.dir = this.cfwd(this.head, want) <= this.N / 2 ? 1 : -1;
        this.head = want;
        this.plan();
      }
      this.draw(want);
      return moved;
    }

    draw(want) {
      var idx = this.nearest(want);
      // Nothing decoded yet, or nothing new: leave both canvases exactly as they are.
      // Before the first pair lands that means transparent over the page, with the
      // copy fully readable — never a flash of empty plate, and after that it holds
      // the last complete frame rather than clearing to one.
      if (idx < 0 || idx === this.drawn) return;
      var tag = this.tier + ':' + idx;
      var painted = 0;
      for (var n = 0; n < this.layers.length; n++) {
        var L = this.layers[n], cv = this.plates[L].cv, bm = this.bits[L][idx];
        if (!cv || !bm) continue;
        // The drawn frame is recorded on the element, never on this instance: a host
        // framework can replace the canvas between ticks, and an instance-held index
        // would then read "already drawn" against a fresh blank element and leave the
        // plate empty for the rest of the session. The tag carries the width too,
        // because the same index is a different picture at a different width.
        if (cv.dataset.fbf === tag) continue;
        // Backing store is the source frame's size, not the display box times a
        // device pixel ratio. It therefore changes only when the width does — which
        // changes the tag in the same breath, so the clear that assigning width
        // performs can never strand a stale tag and blank the plate. drawImage is then
        // 1:1 with no resample, the compositor does the upscale for free with the same
        // filter it would use on an <img>, and device pixel ratio never multiplies
        // what is held. A DPR-scaled store on a 1920 stage would cost 95MiB for the
        // pair before a single frame was resident; this costs 19MiB.
        if (cv.width !== bm.width) { cv.width = bm.width; cv.height = bm.height; }
        var ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(bm, 0, 0);
        cv.dataset.fbf = tag;
        painted++;
      }
      // Commit only once every plate carries this frame. Committing before the loop
      // would make one missing bitmap permanent — the next tick reads "already drawn",
      // returns early, and the plates stay blank however long the frame takes to
      // arrive. It is also what keeps the two depth planes on the same index: a
      // half-painted frame is not a drawn frame.
      if (painted === this.layers.length) this.drawn = idx;
    }

    wake() {
      this.idle = 0;
      if (this.raf || !this.motion) return;
      this.raf = requestAnimationFrame(this.tick.bind(this));
    }

    tick() {
      this.raf = 0;
      this.idle = this.frame() ? 0 : this.idle + 1;
      if (this.motion && this.idle < IDLE_FRAMES) this.raf = requestAnimationFrame(this.tick.bind(this));
    }
  }

  customElements.define('falling-blocks', FallingBlocks);
})();

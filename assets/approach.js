/* <approach-scrub> — a scroll-scrubbed sequence of alpha plates with copy synced to it.

   Dependency-free and host-agnostic on purpose: no framework, no build step, no
   bundler, and no assumption about where it is mounted. It drives markup it does not
   build — every node it touches is authored in the page — so a framework that
   re-renders around it has nothing of ours to reconcile away, and the copy is real
   text in the document whether or not this file ever runs. Dropping this into another
   CMS is this file, approach.css, the frame directory, and the markup below.

   Markup contract (all of it required; see assets/approach.css):

     <approach-scrub base="path/to/approach/">
       <div data-arch-stage>
         <div data-arch-box>
           <div data-arch-cam>
             <canvas data-arch-layer="0"></canvas>
             <canvas data-arch-layer="1"></canvas>     <- plus-lighter, see below
           </div>
           <div data-arch-scrim aria-hidden="true"></div>
         </div>
         <div data-arch-ticks>
           <button data-arch-tick="0">…</button>       <- one per copy beat, in order
         </div>
         <div data-arch-beats>
           <div data-arch-copy="0">…</div>             <- same count, same order
         </div>
       </div>
     </approach-scrub>

   Frame URLs are base + "ap<0000><cut>.webp", where cut is "" for the full plate and
   "m" for the tighter crop phones scrub. Which cut is loaded is read from the
   --arch-variant custom property in approach.css, so the breakpoint that sizes the
   band is also the one that picks the file and there is no second copy of it here to
   drift. The frame list and both cuts' dimensions come from manifest.json beside the
   frames; the encoder writes it, so the page cannot promise a frame that was not made.

   The section's own height is the scroll budget. The stage pins inside it, and the
   sticky offset is read off the stage's computed `top` rather than measured from a
   page header — CSS and JS then agree by construction, and a host whose header is a
   different height, or absent, or overlaid by an admin bar, needs no code change.

   Two canvases, not one. They hold the frames either side of the current position and
   are cross-faded by CSS opacity under `mix-blend-mode: plus-lighter` over an
   `isolation: isolate` group. Drawing both into a single context at partial alpha
   squares the outgoing frame's contribution, so everything the two frames share — here
   both desks, most of the picture — sags to three-quarters opacity halfway through
   every transition. plus-lighter adds to exactly the frame in between.

   Attributes, all optional except base:
     base        URL prefix ending in "/"                    (required)
     manifest    manifest URL                     (base + "manifest.json")
     budget-mb   resident decoded-bitmap ceiling             (96)
     move        share of the whole scroll spent moving (from frame density)
     near        viewport-heights of lead before loading     (1.25)
*/
(function () {
  if (!window.customElements || customElements.get('approach-scrub')) return;

  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var smooth = function (t) { var c = clamp01(t); return c * c * (3 - 2 * c); };
  var pad4 = function (n) { return String(n).padStart(4, '0'); };

  // Four in flight keeps the window filling faster than a scroll can outrun it without
  // making the whole machine slow.
  var MAX_INFLIGHT = 4;
  var IDLE_FRAMES = 6;

  // What the scroll budget buys besides motion, as relative weights: the settle after
  // the opening run, each copy beat's reading hold, and the coda. They are weights
  // rather than fractions because the motion's share is set separately — see load() —
  // and whatever is left over is divided among these in proportion. The lead is a
  // little longer than a beat's hold because the camera is still pulling in through it,
  // and the coda a little shorter because its copy is already up and being read out.
  var LEAD_W = 1.05, HOLD_W = 1, TAIL_W = 0.7;

  function num(el, name, dflt) {
    var v = parseFloat(el.getAttribute(name));
    return isFinite(v) ? v : dflt;
  }

  class ApproachScrub extends HTMLElement {
    connectedCallback() { if (!this._booted) this.boot(); }

    // Boot waits for the markup contract to actually be satisfied, and is not a
    // one-shot. A host framework may insert this element and only then fill it, so
    // giving up on an empty element would leave the section a dead pane for the rest
    // of the session. If the parts are missing, watch for them instead.
    boot() {
      if (this._booted) return;
      var stage = this.querySelector('[data-arch-stage]');
      var cam = this.querySelector('[data-arch-cam]');
      var l0 = this.querySelector('[data-arch-layer="0"]');
      var l1 = this.querySelector('[data-arch-layer="1"]');
      if (!stage || !cam || !l0 || !l1) {
        if (!this.mo) {
          this.mo = new MutationObserver(this.boot.bind(this));
          this.mo.observe(this, { childList: true, subtree: true });
        }
        return;
      }
      if (this.mo) { this.mo.disconnect(); this.mo = null; }
      this._booted = true;

      this.stage = stage; this.cam = cam; this.cvs = [l0, l1];
      this.base = this.getAttribute('base') || '';
      this.budget = num(this, 'budget-mb', 96) * 1048576;
      // Viewport-heights of lead before the sequence starts downloading. Keep this
      // comfortably below the height of whatever sits above the section, or the gate is
      // satisfied at rest and there is no laziness at all: with a 290vh hero above it,
      // a lead of 3 meant a phone fetched 2.4 MB of frames before the visitor had
      // scrolled a pixel. 1.25 is still around 1300px of warning at both layouts, which
      // is seconds of scrolling, and the loader fills beats-first so the first hold is
      // ready well before the reader arrives at it.
      this.near = num(this, 'near', 1.25);
      this.moveAttr = this.getAttribute('move');

      this.copies = [].slice.call(this.querySelectorAll('[data-arch-copy]'));
      this.ticks = [].slice.call(this.querySelectorAll('[data-arch-tick]'));

      // A full-page cache serialises the rendered DOM, tags and all. Left in place,
      // the next visitor gets a canvas that claims to hold a frame it does not have
      // and a section that stays blank until something forces a redraw. Clearing on
      // boot is what makes this safe to cache; do not optimise it away.
      this.cvs.forEach(function (cv) { delete cv.dataset.f; });
      delete this.stage.dataset.archPin;

      // Seeded rather than left for the first resize: put() stamps the drawn frame with
      // this.cut, so an unset value tags the first paint "undefined:12" and a later
      // resize then redraws every layer for no reason.
      this.cut = this.variant();

      this.bits = [];
      this.pend = [];
      this.inflight = 0;
      this.gen = 0;
      this.head = 0;
      this.drawn = -1;
      this.p = -1;

      this.mqMotion = matchMedia('(prefers-reduced-motion: reduce)');
      this.onScroll = this.wake.bind(this);
      this.onResize = this.resize.bind(this);
      addEventListener('scroll', this.onScroll, { passive: true, capture: true });
      addEventListener('resize', this.onResize, { passive: true });
      addEventListener('orientationchange', this.onResize);
      this.mqMotion.addEventListener('change', this.onResize);

      // One delegated listener rather than a binding per button: the tick row is
      // authored markup and a host may re-render it.
      this.onTick = this.jump.bind(this);
      var ticks = this.querySelector('[data-arch-ticks]');
      if (ticks) ticks.addEventListener('click', this.onTick);

      this.load();
      this.wake();
    }

    disconnectedCallback() {
      removeEventListener('scroll', this.onScroll, { capture: true });
      removeEventListener('resize', this.onResize);
      removeEventListener('orientationchange', this.onResize);
      if (this.mqMotion) this.mqMotion.removeEventListener('change', this.onResize);
      var ticks = this.querySelector('[data-arch-ticks]');
      if (ticks && this.onTick) ticks.removeEventListener('click', this.onTick);
      cancelAnimationFrame(this.raf);
      this.evictAll();
    }

    // Which cut of the plate this layout wants. Read from the stylesheet rather than
    // re-tested against innerWidth here: a second copy of the breakpoint is free to
    // drift from the one that sizes the band, and a band cut to one aspect fed a plate
    // of another is a silent, invisible bug. getComputedStyle works on a display:none
    // element, so this is valid even where the section never renders.
    variant() {
      var v = getComputedStyle(this).getPropertyValue('--arch-variant').trim().replace(/["']/g, '');
      return v === 'm' ? 'm' : '';
    }

    load() {
      var self = this;
      var url = this.getAttribute('manifest') || this.base + 'manifest.json';
      fetch(url)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (m) {
          self.FRAMES = m.frames || [];
          self.BEATS = m.beats || [];
          self.cuts = m.cuts || { '': m.master, m: m.crop };
          // N is what everything downstream gates on, so it is set only once there is
          // something to scrub. A manifest with frames but no beats has no segments to
          // cut, and half-adopting it would leave frame() reading bounds that plot()
          // never wrote.
          if (!self.FRAMES.length || !self.BEATS.length) return;
          self.N = self.FRAMES.length;
          self.plot();
          self.wake();
        })
        .catch(function () { /* no manifest: the still markup is what shows */ });
    }

    // Cuts the scroll budget into segments: one per beat, plus the opening. A segment
    // moves for its first stretch and is dead still for the rest, and copy lands on the
    // still part — nothing animates while there are words to read.
    //
    // Every move is given scroll in proportion to how many render frames it covers, so
    // the animation plays at one speed the whole way down. Equal spans with a fixed
    // move fraction, which is what this replaces, do not: the beats are 68, 118, 124,
    // 121 and 74 frames apart and the coda is the shortest segment, so the last move ran
    // at twice the rate of the first and the piece visibly sped up beat by beat, worst
    // exactly where the books land on the arch and there is most to see. Rate is the
    // thing that has to be constant here; the spans follow from it.
    //
    // Segment 0 runs from the first encoded frame to the first beat. That is the blocks
    // and books falling onto the desks, and it plays if — and only if — the encoder put
    // frames in front of the first beat. Where the sequence starts on its first beat, as
    // it does with the manifest this ships with, the travel is zero and the opening is
    // the still hold it has always been. So the fix for a missing opening is entirely an
    // encode: extend the manifest's `frames` back over the fall, leave `beats` alone,
    // and this plays it at the same rate as everything else with no change here.
    //
    // The budget being divided is the section's height, so frames and height move
    // together: adding the fall's frames without adding height speeds the whole piece
    // up in proportion, because there is more to show and no more scroll to show it in.
    plot() {
      var B = this.BEATS, K = B.length - 1, k;

      // What each segment travels, in render frames.
      var travel = [], sum = 0;
      for (k = 0; k <= K; k++) {
        travel[k] = k ? B[k] - B[k - 1] : B[0] - this.FRAMES[0];
        sum += travel[k];
      }

      // The motion's share of the whole scroll. With the in-between frames encoded a
      // move is a real scrub and is worth better than half the section; with only the
      // resting frames it is a dissolve between two camera angles and ghosts, so it is
      // kept brief. A sequence with nothing to travel spends everything on holds.
      var moveTotal = this.moveAttr !== null ? parseFloat(this.moveAttr)
        : (this.N > B.length ? 0.53 : 0.12);
      if (!sum) moveTotal = 0;

      var wSum = LEAD_W + Math.max(0, K - 1) * HOLD_W + TAIL_W;
      var unit = (1 - moveTotal) / wSum;
      var rate = sum ? moveTotal / sum : 0;

      this.bounds = [0];
      this.moves = [];
      var at = 0;
      for (k = 0; k <= K; k++) {
        var mv = rate * travel[k];
        var hd = unit * (k === 0 ? LEAD_W : k === K ? TAIL_W : HOLD_W);
        // Per segment rather than one number for all of them, because the segments are
        // no longer the same length: the fraction of *this* segment spent moving is
        // what the scrub, the copy and the tick jumps all have to agree on.
        this.moves[k] = (mv + hd) > 0 ? mv / (mv + hd) : 0;
        at += mv + hd;
        // The last bound is written as 1 rather than accumulated to it: the segment
        // search treats the final entry as the end of the scroll, and a rounding error
        // there would leave a sliver of the section past the last segment.
        this.bounds.push(k === K ? 1 : at);
      }
    }

    // What one frame costs decoded, which is its pixel count times four however small the
    // WebP is on disk. Beats and moves are encoded at different sizes, so they are
    // budgeted at different sizes: on the full cut a beat is 11.2 MiB and a move 2.1, and
    // charging every frame the beat's price would hold a fifth of what was paid for.
    bytesFor(i) {
      var c = (this.cuts && this.cuts[this.variant()]) || { w: 2048, h: 1432 };
      if (this.isBeat(i) || !c.moveW) return c.w * c.h * 4;
      return c.moveW * c.moveH * 4;
    }

    keep(i) { return !!(this.wanted && this.wanted.has(i)); }

    isBeat(i) { return this.BEATS && this.BEATS.indexOf(this.FRAMES[i]) > -1; }

    evictAll() {
      if (!this.bits) return;
      for (var i = 0; i < this.bits.length; i++) {
        if (this.bits[i]) { this.bits[i].close(); this.bits[i] = null; }
      }
    }

    // Chooses the resident set: rank every frame by how much it is worth holding, then
    // spend the byte budget down that ranking and keep exactly what it paid for.
    //
    // The obvious cheaper version — derive a window as budget/frameSize and keep
    // everything inside it — is what this replaces, and it does not hold. The beats were
    // pinned on top of that window and two frames behind the head were kept as well, so
    // the set actually resident was the window plus nine, and on the full cut, where a
    // beat decodes to 11.2 MiB, a 96 MB budget held 190 MB. A ceiling that is added to is
    // not a ceiling. Ranking and spending costs one sort of a hundred-odd entries per
    // head move and makes the number mean what it says.
    plan() {
      if (!this.N || this.mqMotion.matches) return;

      var head = this.head, i;
      var rank = [];
      for (i = 0; i < this.N; i++) {
        // Distance from the head, biased forward because reading is a downward act, so a
        // frame ahead is worth more than one the same distance behind. Beats are
        // discounted hard rather than exempted: a hold rests on one, so it outranks every
        // ordinary frame, but it still competes for the budget instead of escaping it.
        var d = i - head;
        var cost = (d >= 0 ? d : -d * 2.5) * (this.isBeat(i) ? 0.15 : 1);
        rank.push([cost, i]);
      }
      rank.sort(function (a, b) { return a[0] - b[0]; });

      // Always room for the frame under the playhead and its neighbour, whatever the
      // budget says — a budget too small to draw with should degrade to stuttering, not
      // to a blank stage.
      var spent = 0, wanted = new Set();
      for (var k = 0; k < rank.length; k++) {
        i = rank[k][1];
        var cost = this.bytesFor(i);
        if (wanted.size >= 2 && spent + cost > this.budget) continue;
        wanted.add(i);
        spent += cost;
      }
      this.wanted = wanted;
      this.win = wanted.size;
      this.resident = spent;

      // Evict first, so the requests below are issued against a truthful budget.
      for (i = 0; i < this.N; i++) {
        if (wanted.has(i) || !this.bits[i]) continue;
        this.bits[i].close();
        this.bits[i] = null;
      }

      // Fetch in the same ranking, so the nearest frames and the beats arrive first and
      // every hold reads correctly even mid-download.
      for (k = 0; k < rank.length && this.inflight < MAX_INFLIGHT; k++) {
        i = rank[k][1];
        if (!wanted.has(i) || this.bits[i] || this.pend[i]) continue;
        this.request(i);
      }
    }

    request(i) {
      var self = this, gen = this.gen, cut = this.variant();
      this.pend[i] = 1;
      this.inflight++;
      fetch(this.base + 'ap' + pad4(this.FRAMES[i]) + cut + '.webp')
        .then(function (r) { return r.ok ? r.blob() : Promise.reject(r.status); })
        // colorSpaceConversion none to match the encoder: these were written
        // view-transformed sRGB with no ICC profile, so there is nothing to convert and
        // a round trip here would apply a transfer function twice.
        .then(function (b) { return createImageBitmap(b, { colorSpaceConversion: 'none' }); })
        .then(function (bm) {
          if (gen !== self.gen || cut !== self.variant() || !self.keep(i)) { bm.close(); return; }
          self.bits[i] = bm;
          self.wake();
        })
        .catch(function () { /* left empty on purpose: nearest() covers it */ })
        .then(function () { self.pend[i] = 0; self.inflight--; if (gen === self.gen) self.plan(); });
    }

    // The nearest decoded frame at or before i, else the nearest after. A gap in the
    // sequence shows the last frame that did arrive rather than clearing to nothing.
    nearest(i) {
      for (var d = 0; d < this.N; d++) {
        if (i - d >= 0 && this.bits[i - d]) return i - d;
        if (i + d < this.N && this.bits[i + d]) return i + d;
      }
      return -1;
    }

    resize() {
      // A variant flip is a different picture at the same index, so everything held is
      // wrong. Bump the generation to strand in-flight requests, drop the bitmaps, and
      // let the canvases re-tag themselves.
      var cut = this.variant();
      if (cut !== this.cut) {
        this.cut = cut;
        this.gen++;
        this.evictAll();
        this.drawn = -1;
        this.cvs.forEach(function (cv) { delete cv.dataset.f; });
      }
      this.p = -1;
      this.wake();
    }

    // Where the stage pins, in pixels. Read off the stage's own sticky top so the
    // number the JS uses and the number the CSS uses cannot disagree — and so a host
    // with a taller header, no header, or a CMS admin bar needs no code change.
    pin() {
      var t = parseFloat(getComputedStyle(this.stage).top);
      return isFinite(t) ? t : 0;
    }

    progress() {
      var span = this.offsetHeight - this.stage.offsetHeight;
      return clamp01((this.pin() - this.getBoundingClientRect().top) / (span || 1));
    }

    frame() {
      if (!this.N || !this.offsetHeight) return false;

      var p = this.progress();
      var moved = p !== this.p;
      this.p = p;

      // Only pay for frames where the section actually renders, and only once it is
      // near enough to be worth it. A display:none element has no offsetHeight, which
      // is what suppresses loading under reduced motion and on the static fallback —
      // one test rather than a media query that would have to be kept in step.
      if (!this.mqMotion.matches &&
          this.getBoundingClientRect().top <= (innerHeight || 800) * this.near) {
        var b = this.bounds, seg = b.length - 2, i;
        for (i = 0; i < b.length - 1; i++) { if (p < b[i + 1] || i === b.length - 2) { seg = i; break; } }
        var t = clamp01((p - b[seg]) / ((b[seg + 1] - b[seg]) || 1));

        // Every segment travels from where the one before it left off to its own beat
        // over the move, then holds. Segment 0's "where it left off" is the first
        // encoded frame, which is what plays the fall onto the desks when there are
        // frames in front of the first beat and rests on it when there are not.
        var B = this.BEATS, mv = this.moves[seg] || 0;
        var from = seg === 0 ? this.FRAMES[0] : B[seg - 1];
        var want = mv > 0 ? from + (B[seg] - from) * smooth(t / mv) : B[seg];
        var idx = 0;
        while (idx < this.N - 1 && this.FRAMES[idx + 1] <= want) idx++;
        var j = Math.min(idx + 1, this.N - 1);
        var mix = this.FRAMES[j] > this.FRAMES[idx]
          ? (want - this.FRAMES[idx]) / (this.FRAMES[j] - this.FRAMES[idx]) : 0;

        if (idx !== this.head) { this.head = idx; this.plan(); }
        else if (!this.win) this.plan();
        this.paint(idx, j, mix);
        this.chrome(seg, t);
      }

      this.camera(p);
      return moved;
    }

    paint(i, j, mix) {
      var lower = this.put(0, i), upper = this.put(1, j);
      var haveUpper = !!this.bits[j];
      if (lower) lower.style.opacity = (haveUpper ? 1 - mix : 1).toFixed(3);
      if (upper) upper.style.opacity = (haveUpper ? mix : 0).toFixed(3);
    }

    put(n, k) {
      var cv = this.cvs[n];
      if (!cv) return null;
      var use = this.bits[k] ? k : this.nearest(k);
      var bm = use < 0 ? null : this.bits[use];
      if (!bm) return cv;
      // The drawn frame is recorded on the element, never on this instance: a host
      // framework can replace the canvas between ticks, and an instance-held index
      // would then read "already drawn" against a fresh blank element and leave the
      // layer empty for the rest of the session. The tag carries the cut too, because
      // the same index is a different picture in the mobile crop.
      var tag = this.cut + ':' + use;
      if (cv.dataset.f === tag) return cv;
      // Backing store is the source frame's size, not the display box times a device
      // pixel ratio: it therefore changes only when the cut does, which changes the tag
      // in the same breath, so the clear that assigning width performs can never
      // strand a stale tag and blank the layer.
      if (cv.width !== bm.width) { cv.width = bm.width; cv.height = bm.height; }
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(bm, 0, 0);
      cv.dataset.f = tag;
      return cv;
    }

    // Camera. The plate hangs from the top of the box at its own aspect, so at scale 1
    // it fills the width and the overflow that gets clipped is the desk legs. The
    // opening pulls back far enough to hold the whole plate, the piece pushes in to
    // full bleed, and a hair of creep continues the whole way down so a frozen frame is
    // never a dead frame. Origin is the top edge — that is what keeps the two books
    // that come to rest on the arch inside the frame, since content reaches within 1.3%
    // of the plate's top there and any other anchor decapitates it.
    //
    // The box is the frame the plate is fitted into: the whole stage on a wide screen,
    // a band on a phone. Measuring the box rather than the stage is what lets one
    // camera serve both — on a phone the band is cut to the same aspect as the plate it
    // holds, so the fit works out to 1 and the formula reports "already fits" rather
    // than needing a special case.
    camera(p) {
      var box = this.querySelector('[data-arch-box]') || this.stage;
      var c = (this.cuts && this.cuts[this.variant()]) || { w: 2048, h: 1432 };
      var fit = Math.min(1, (c.w / c.h) * box.clientHeight / (box.clientWidth || 1));
      var open = smooth(p / 0.24);
      var sc = fit + (1 - fit) * open + 0.028 * p;
      this.cam.style.transform = 'translateY(' + (1.2 * open).toFixed(2) + '%) scale(' + sc.toFixed(4) + ')';
    }

    // Copy blocks belong to segments 1..n. The opening carries none, and the coda holds
    // the last line rather than clearing it: the books coming to rest on the arch are
    // that line's payoff, not a separate thought.
    chrome(seg, t) {
      var last = this.copies.length - 1, coda = this.bounds.length - 2;
      // The rise starts where this segment's move ends. Capped against what is left of
      // the segment rather than fixed at 0.14, so a `move` attribute long enough to
      // crowd the hold shortens the fade instead of leaving the copy stranded part-way
      // up when the segment runs out.
      var mv = this.moves[seg] || 0, fade = Math.min(0.14, (1 - mv) * 0.4);
      for (var i = 0; i < this.copies.length; i++) {
        var own = seg === i + 1, held = i === last && seg === coda;
        var o = 0;
        if (own) o = smooth((t - mv) / fade) * (i === last ? 1 : 1 - smooth((t - 0.92) / 0.08));
        else if (held) o = 1 - smooth((t - 0.86) / 0.14);
        o = clamp01(o);
        var el = this.copies[i];
        el.style.opacity = o.toFixed(3);
        el.style.transform = 'translateY(' + (8 * (1 - o)).toFixed(2) + 'px)';
        el.style.pointerEvents = o > 0.4 ? 'auto' : 'none';
        if (this.ticks[i]) this.ticks[i].style.opacity = (own || held) ? '1' : '0.4';
      }
    }

    // Land past the move, on the hold, where the frame is still and the copy is up.
    // This is the inverse of progress(): if the two ever disagree a tick lands on the
    // wrong beat, so they read the same pin and the same span.
    jump(e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-arch-tick]') : null;
      if (!btn || !this.bounds) return;
      var seg = parseInt(btn.dataset.archTick, 10) + 1;
      var b = this.bounds;
      if (!(seg > 0 && seg < b.length - 1)) return;
      // Halfway into this segment's hold, not a fixed 0.6 of the segment: the segments
      // are no longer the same length or the same shape, and a fixed fraction now lands
      // mid-move on the longer beats — which is a tick that jumps you to a moving frame
      // with its own copy still fading up.
      var mv = this.moves[seg] || 0;
      var at = b[seg] + (b[seg + 1] - b[seg]) * (mv + (1 - mv) * 0.5);
      var span = this.offsetHeight - this.stage.offsetHeight;
      scrollTo({ top: this.getBoundingClientRect().top + scrollY - this.pin() + at * span, behavior: 'smooth' });
    }

    wake() {
      this.idle = 0;
      if (this.raf) return;
      this.raf = requestAnimationFrame(this.tick.bind(this));
    }

    tick() {
      this.raf = 0;
      this.idle = this.frame() ? 0 : this.idle + 1;
      if (this.idle < IDLE_FRAMES) this.raf = requestAnimationFrame(this.tick.bind(this));
    }
  }

  customElements.define('approach-scrub', ApproachScrub);
})();

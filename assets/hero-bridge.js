/* <hero-bridge> — the home page's opening act, scroll-scrubbed.

   A toy-block arch assembles across the gap between a server rack and a school desk and
   closes. The plates are alpha over the page colour, so there is no plate, no radius and
   no card behind them — the render's transparency is the composition.

   Dependency-free and host-agnostic on purpose: no framework, no build step, no bundler,
   and no assumption about where it is mounted. It drives markup it does not build — every
   node it touches is authored in the page — so a framework that re-renders around it has
   nothing of ours to reconcile away, and the still <img> renders with scripting off.
   Dropping this into another CMS is this file, hero-bridge.css, the frame directory, and
   the markup below.

   Markup contract (all of it required; see assets/hero-bridge.css):

     <hero-bridge base="path/to/hero-bridge/" from="276" to="417">
       <div data-hb-stage>
         <div data-hb-box>
           <canvas data-hb-layer="0"></canvas>
           <canvas data-hb-layer="1"></canvas>     <- plus-lighter, see below
           <img src="…hero-bridge.webp" alt="…">   <- the still, and the LCP element
         </div>
       </div>
     </hero-bridge>

   Frame URLs are base + "hb<0000><cut>.webp", where cut is "" for the 1600-wide plate and
   "m" for the 1200-wide one phones scrub. Both cuts are the whole plate — this sequence
   cannot crop for mobile the way the Approach section did, because blocks fly in from the
   top and the right for the whole run and content spans x 0.000-0.999. Which cut is
   loaded is read from the --hb-variant custom property in hero-bridge.css, so the
   breakpoint that sizes the stage is also the one that picks the file and there is no
   second copy of it here to drift. The frame list and both cuts' dimensions come from
   manifest.json beside the frames; the encoder writes it, so the page cannot promise a
   frame that was not made.

   The section's own height is the scroll budget: the stage pins inside it, and the
   difference between the two is what the scrub spends. Make the element the same height
   as its stage and nothing pins — the plate simply sits in the page as a still. That is
   a CSS decision, not a code change.

   Attributes, all optional except base:
     base        URL prefix ending in "/"                    (required)
     manifest    manifest URL                     (base + "manifest.json")
     from, to    the span of the manifest actually played     (all of it)
     budget-mb   resident decoded-bitmap ceiling              (96)
                 — the fallback only. The stylesheet names the ceiling each viewport
                 actually holds via --hb-budget, re-read on every plan, so the
                 breakpoint that picks the cut also sizes the memory it costs.
*/
(function () {
  if (!window.customElements || customElements.get('hero-bridge')) return;

  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  // The scrub is linear, deliberately, and this is the one place to say why. approach.js
  // runs on a glide() curve because that section alternates moves with reading holds and
  // the moves have to feel like one speed across segments of different lengths. This is
  // one continuous assembly with nothing to synchronise against, so the honest mapping is
  // scroll to frame, one for one: the arch builds at exactly the rate the thumb moves.
  //
  // What it does need is a rest at the end. Scrubbed across the whole budget the arch
  // would close on the last pixel before the stage unpins, which puts the payoff — the
  // span completing — in the same instant the picture starts leaving. TAIL holds the
  // closed arch still for the last stretch instead, so the finished bridge is on screen
  // and settled before the page moves on. Same reasoning as approach.js's TAIL_W, and
  // like it, it is paid for out of the motion: raising it makes the scrub faster.
  var TAIL = 0.15;

  // Four in flight keeps the window filling faster than a scroll can outrun it without
  // making the whole machine slow. Decoding competes with the compositor for the same
  // cores, and a hero told to decode a dozen multi-megapixel frames at once while
  // scrolling is how a page ends up reported as making the machine slow.
  var MAX_INFLIGHT = 4;

  // Stop the pump this many still frames after the last change, not one: Safari can paint
  // once more after the final scroll event of a fling, and stopping on the first still
  // frame leaves the plate a frame behind where the page came to rest.
  var IDLE_FRAMES = 6;

  function num(el, name, dflt) {
    var v = parseFloat(el.getAttribute(name));
    return isFinite(v) ? v : dflt;
  }

  class HeroBridge extends HTMLElement {
    connectedCallback() { if (!this._booted) this.boot(); }

    // Boot is deferred until the markup contract is actually satisfied, and is not a
    // one-shot. A host framework may insert this element and only then fill it: React
    // does exactly that, so connectedCallback can fire against an element with no
    // children and no attributes yet. Giving up there would leave the hero a still for
    // the rest of the session, on the one host this most needs to work on — so if the
    // parts are missing, watch for them instead.
    boot() {
      if (this._booted) return;
      var stage = this.querySelector('[data-hb-stage]');
      var box = this.querySelector('[data-hb-box]');
      var l0 = this.querySelector('[data-hb-layer="0"]');
      var l1 = this.querySelector('[data-hb-layer="1"]');
      if (!stage || !box || !l0 || !l1) {
        if (!this.mo) {
          this.mo = new MutationObserver(this.boot.bind(this));
          this.mo.observe(this, { childList: true, subtree: true });
        }
        return;
      }
      if (this.mo) { this.mo.disconnect(); this.mo = null; }
      this._booted = true;

      this.stage = stage; this.box = box; this.cvs = [l0, l1];
      this.base = this.getAttribute('base') || '';
      this.from = num(this, 'from', -Infinity);
      this.to = num(this, 'to', Infinity);

      // A full-page cache serialises the rendered DOM, tags and all. Left in place, the
      // next visitor gets a canvas that claims to hold a frame it does not have and a
      // hero that stays on the still until something forces a redraw. Clearing on boot is
      // what makes this safe to cache; do not optimise it away. Same for the ready flag —
      // it means "a frame has been drawn into this session's canvases", and a serialised
      // one is a lie that hides the still behind two blank canvases.
      this.cvs.forEach(function (cv) { delete cv.dataset.f; });
      this.removeAttribute('data-hb-ready');
      // Cleared alongside the attribute, not just the attribute. boot() runs again after a
      // disconnect and reconnect — a host framework moving this element in the DOM does
      // exactly that — and a flag left standing would mean the attribute is never written
      // back, leaving the hero on its still with two blank canvases over it for the rest
      // of the session.
      this._ready = false;

      // Seeded rather than left for the first resize: put() stamps the drawn frame with
      // this.cut, so an unset value tags the first paint "undefined:12" and a later resize
      // then redraws every layer for no reason.
      this.cut = this.variant();

      this.bits = [];
      this.pend = [];
      this.inflight = 0;
      this.head = 0;
      this.p = -1;
      this.N = 0;
      // Cleared with the rest of the state, and it has to be. win is what frame()'s
      // "else if (!this.win) this.plan()" bootstrap tests, so a value left standing from
      // before a disconnect means the first tick after re-mounting finds head unchanged
      // AND win non-zero, never calls plan(), and never fetches anything: the hero sits
      // on its still with no download in progress until the reader scrolls far enough to
      // move the head. Borrowed from approach.js, where boot() really is a one-shot and
      // the omission cannot bite.
      this.win = 0;
      this.wanted = null;
      // Never reset to zero, only ever advanced. Requests captured a generation before
      // this boot and are still in flight; restarting the count at 0 would hand them the
      // number they are holding and let them repopulate state that was just torn down.
      this.gen = (this.gen || 0) + 1;

      // Three separate signals, evaluated separately and never merged into one flag. They
      // mean different things: a preference, a bandwidth preference, and a capability.
      // Collapsing them is how "this browser cannot decode the frames" quietly becomes
      // "someone asked for less motion", and then neither can be changed without changing
      // the other.
      this.mqMotion = matchMedia('(prefers-reduced-motion: reduce)');
      this._gate = this.evaluate.bind(this);
      this.addMq(this.mqMotion);

      this.onScroll = this.wake.bind(this);
      this.onResize = this.resize.bind(this);

      this.load();
      this.evaluate();
    }

    disconnectedCallback() {
      if (this.mo) { this.mo.disconnect(); this.mo = null; }
      if (this.attrMo) { this.attrMo.disconnect(); this.attrMo = null; }
      if (!this._booted) return;
      this._booted = false;
      this.stop();
      this.dropMq(this.mqMotion);
    }

    addMq(mq) {
      if (mq.addEventListener) mq.addEventListener('change', this._gate);
      else if (mq.addListener) mq.addListener(this._gate);
    }
    dropMq(mq) {
      if (mq.removeEventListener) mq.removeEventListener('change', this._gate);
      else if (mq.removeListener) mq.removeListener(this._gate);
    }

    // Bandwidth is the one signal with no media query behind it. Someone who asked for
    // less data has asked for less data, and the played span is 2.8 MB at the 1200 cut
    // and 4.3 MB at 1600 — not an answer to that. They get the still, which is the
    // picture the hero ships anyway.
    thin() {
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return false;
      return !!c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g' || c.effectiveType === '3g';
    }

    // Motion is decided once, here, from signals that are all synchronously knowable —
    // and never re-decided on anything that arrives later. That matters more here than it
    // does further down the page: the element is a different height in the two modes, so
    // a decision that changed after the first frame decoded would resize the hero under a
    // reader who is already looking at it. Whether the frames have ARRIVED is a separate
    // question with a separate flag; see paint().
    // Note what is NOT guarded by "has the answer changed". This runs on every boot, and
    // boot runs again every time a host moves the element in the DOM — a detach and
    // re-attach is one React commit. An early return on an unchanged answer would leave
    // the element with its listeners removed by the last disconnect and never re-added:
    // motion still reads "on", the attribute is still there, the section is still full
    // height, and the scrub is simply deaf to scroll for the rest of the session. Nothing
    // about that state looks wrong from the outside, which is what makes it worth the two
    // extra lines. So the observer and the listeners are re-established against what is
    // actually attached, and only the transition itself is conditional.
    evaluate() {
      var want = !this.mqMotion.matches && !this.thin() &&
                 typeof createImageBitmap === 'function';

      // The attribute is re-asserted rather than set once. Boot can land in the middle of
      // a host framework's own DOM work — under React it runs from the mutation that
      // appends our children — and that framework's next commit reconciles this element's
      // attributes back to the ones it knows about, silently dropping this one. The hero
      // would then sit at its full pinned height with the still showing and 70svh of
      // nothing under it. Watching for the removal and putting it back costs nothing when
      // nobody touches it, and no loop is possible because mark() only writes when the
      // value is actually wrong.
      if (!this.attrMo) {
        this.attrMo = new MutationObserver(this.mark.bind(this));
        this.attrMo.observe(this, { attributes: true, attributeFilter: ['data-hb-motion'] });
      }

      this.motion = want;
      this.mark();
      if (want && !this.running) this.start();
      else if (!want && this.running) this.stop();
    }

    mark() {
      var want = this.motion ? 'on' : 'off';
      if (this.getAttribute('data-hb-motion') !== want) this.setAttribute('data-hb-motion', want);
    }

    // running tracks what is actually attached, which is not the same question as whether
    // motion is wanted — see evaluate(). The two drift apart on exactly one path, a
    // disconnect followed by a reconnect, and that is the path that matters.
    start() {
      this.running = true;
      addEventListener('scroll', this.onScroll, { passive: true, capture: true });
      addEventListener('resize', this.onResize, { passive: true });
      addEventListener('orientationchange', this.onResize);
      this.wake();
    }

    // Stopping has to invalidate the work in flight, not just the work already done.
    // Closing the bitmaps alone is not enough: four requests are typically outstanding, and
    // each one's success path re-populates this.bits and its tail calls plan() again. On a
    // detached element that runs the whole plan to completion — fetching frames after
    // removal from the DOM and ending up holding the full budget of ImageBitmaps that
    // nothing will ever close again. Under reduced motion it is the same leak on exactly
    // the preference that is meant to release the memory.
    //
    // So the generation is advanced, which strands every request already issued, and
    // wanted is cleared so any that slip through keep() close their own bitmap. inflight
    // is reset in the same breath because those stranded requests no longer decrement it.
    stop() {
      this.running = false;
      this.gen++;
      this.wanted = null;
      this.win = 0;
      this.inflight = 0;
      this.pend = [];
      removeEventListener('scroll', this.onScroll, { capture: true });
      removeEventListener('resize', this.onResize);
      removeEventListener('orientationchange', this.onResize);
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.evictAll();
    }

    // Which cut of the plate this layout wants. Read from the stylesheet rather than
    // re-tested against innerWidth here: a second copy of the breakpoint is free to drift
    // from the one that sizes the stage, and a stage cut to one aspect fed a plate of
    // another is a silent, invisible bug. getComputedStyle works on a display:none
    // element, so this is valid even where the hero never renders.
    variant() {
      var v = getComputedStyle(this).getPropertyValue('--hb-variant').trim().replace(/["']/g, '');
      return v === 'm' ? 'm' : '';
    }

    // The byte ceiling, from the stylesheet like the cut, and for the same reason: a
    // budget is a per-device decision and only the stylesheet knows which device this is.
    // Read on every plan rather than cached at boot, because a resize can cross the
    // breakpoint that sets it. Note that a ceiling alone buys MORE frames when each one
    // gets cheaper — the mobile cut decodes to 4.0 MiB against the desktop's 7.2 — so the
    // phone's number is set below the desktop's on purpose, not left to follow.
    budgetWanted() {
      var v = parseFloat(getComputedStyle(this).getPropertyValue('--hb-budget'));
      return (isFinite(v) && v > 0 ? v : num(this, 'budget-mb', 96)) * 1048576;
    }

    load() {
      var self = this;
      var url = this.getAttribute('manifest') || this.base + 'manifest.json';
      fetch(url)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (m) {
          // The span the page plays, not everything the encoder produced. This sequence
          // was delivered in three renders and only one of them carries the soft ground
          // shadow: measured over the shipped frames, 276-417 hold ~23% partial alpha
          // coverage and 419-468 hold ~1%, and the mean absolute difference between
          // consecutive frames — 2 to 5 everywhere else — is 17.6 across that one step.
          // The legs change colour and the shadow disappears in a single frame. So the
          // page plays the shadowed range and the rest stays on disk, unplayed rather
          // than deleted. See docs/hero-bridge-render.md.
          //
          // Filtered here rather than trimmed out of the manifest because the manifest is
          // a record of what was encoded and this is an editorial decision about what is
          // shown. When a re-render gives the tail its shadow, this is one attribute.
          self.FRAMES = (m.frames || []).filter(function (n) { return n >= self.from && n <= self.to; });
          self.cuts = m.cuts || {};
          self.master = m.master || { w: 2048, h: 1432 };
          self.stem = m.stem || 'hb';
          self.pad = m.pad || 4;
          self.ext = m.ext || 'webp';
          // N is what everything downstream gates on, so it is set only once there is
          // something to scrub. One frame is a still, not a sequence, and half-adopting a
          // manifest that produced one would leave frame() dividing by a zero span.
          if (self.FRAMES.length < 2) return;
          self.N = self.FRAMES.length;
          self.wake();
        })
        .catch(function () { /* no manifest: the still in the markup is what shows */ });
    }

    // What one frame costs decoded, which is its pixel count times four however small the
    // WebP is on disk. There is one quality tier here — every frame is a move, none of
    // them is a hold anybody stops to look at — so unlike approach.js there is no second
    // size to budget separately.
    bytesFor() {
      var c = (this.cuts && this.cuts[this.variant()]) || this.master;
      return c.w * c.h * 4;
    }

    keep(i) { return !!(this.wanted && this.wanted.has(i)); }

    evictAll() {
      if (!this.bits) return;
      for (var i = 0; i < this.bits.length; i++) {
        if (this.bits[i]) { this.bits[i].close(); this.bits[i] = null; }
      }
    }

    // Chooses the resident set: rank every frame by how much it is worth holding, then
    // spend the byte budget down that ranking and keep exactly what it paid for. Taken
    // from approach.js, minus its beat discount — that exists to protect the frames its
    // section comes to rest on, and this one rests only at the very end.
    //
    // The obvious cheaper version — derive a window as budget/frameSize and keep
    // everything inside it — does not hold, because anything pinned on top of the window
    // is added to a number that was supposed to be a ceiling. Ranking and spending costs
    // one sort of forty-odd entries per head move and makes the number mean what it says.
    plan() {
      if (!this.N || !this.motion || !this.running) return;

      this.budget = this.budgetWanted();
      var head = this.head, i;
      var rank = [];
      for (i = 0; i < this.N; i++) {
        // Distance from the head, biased forward because reading is a downward act, so a
        // frame ahead is worth more than one the same distance behind.
        var d = i - head;
        rank.push([d >= 0 ? d : -d * 2.5, i]);
      }
      rank.sort(function (a, b) { return a[0] - b[0]; });

      // Always room for the frame under the playhead and its neighbour, whatever the
      // budget says — a budget too small to draw with should degrade to stuttering, not
      // to a blank hero.
      var cost = this.bytesFor(), spent = 0, wanted = new Set();
      for (var k = 0; k < rank.length; k++) {
        i = rank[k][1];
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

      // Fetch in the same ranking, so the nearest frames arrive first. This is what makes
      // a hero with no runway above it work at all: there is no section overhead to
      // preload against — the reader is looking at this element the moment the page
      // loads — so the sequence cannot be fetched ahead of time, only fetched in the
      // right order. Head-first means the opening frame lands first and the scrub is
      // playable from the top of the pin while the rest of it is still arriving.
      //
      // MAX_INFLIGHT, not the budget, is the constraint that actually bites here.
      // Measured at 1440x900 on a reading scroll: doubling the ceiling to 192 MB widened
      // the window from 14 frames to 28 and cut misses from 57% to 27%, but the frames it
      // did substitute were 6.7 positions away rather than 3.0 — the same four slots
      // spread over twice the requests deliver the ones nearest the head later. Cheaper
      // frames are the fix, not a bigger number; see the cut arithmetic in
      // hero-bridge.css.
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
      fetch(this.base + this.stem + String(this.FRAMES[i]).padStart(this.pad, '0') + cut + '.' + this.ext)
        .then(function (r) { return r.ok ? r.blob() : Promise.reject(r.status); })
        // colorSpaceConversion none to match the encoder: these were written
        // view-transformed sRGB with no ICC profile, so there is nothing to convert and a
        // round trip here would apply a transfer function twice.
        .then(function (b) { return createImageBitmap(b, { colorSpaceConversion: 'none' }); })
        .then(function (bm) {
          if (gen !== self.gen || cut !== self.variant() || !self.keep(i)) { bm.close(); return; }
          self.bits[i] = bm;
          self.wake();
        })
        .catch(function () { /* left empty on purpose: nearest() covers it */ })
        .then(function () {
          // Guarded as a whole, not just around plan(). boot() and stop() reset inflight
          // and pend under any request still outstanding, so a stale tail decrementing
          // that counter drives it below zero and over-subscribes MAX_INFLIGHT for the
          // life of the element.
          if (gen !== self.gen) return;
          self.pend[i] = 0;
          self.inflight--;
          self.plan();
        });
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
      // A cut flip is a different picture at the same index, so everything held is wrong.
      // Bump the generation to strand in-flight requests, drop the bitmaps, and let the
      // canvases re-tag themselves. They keep their last frame while the new width
      // arrives — briefly stale beats briefly blank.
      var cut = this.variant();
      if (cut !== this.cut) {
        this.cut = cut;
        this.gen++;
        this.evictAll();
        this.cvs.forEach(function (cv) { delete cv.dataset.f; });
      }
      this.p = -1;
      this.wake();
    }

    // Where the stage pins, in pixels. Read off the stage's own sticky top so the number
    // the JS uses and the number the CSS uses cannot disagree — and so a host with a
    // taller header, none at all, or a CMS admin bar needs no code change.
    pin() {
      var t = parseFloat(getComputedStyle(this.stage).top);
      return isFinite(t) ? t : 0;
    }

    // Two ways to spend scroll, and which one is in force is a CSS decision — the header
    // above already promised this ("make the element the same height as its stage and
    // nothing pins"); this is where that promise is kept.
    //
    // PINNED, when the element is taller than its stage. The stage sticks and the
    // difference between the two heights is the budget. This is the better rig when the
    // plate fits the pinned stage, because the artwork holds still while it changes.
    //
    // IN PLACE, when they are the same height. There is no pin and no extra page height:
    // the plate is in normal flow and the scrub is spent on its own travel through the
    // viewport, from the moment its top enters the bottom of the screen to the moment its
    // bottom arrives there — that is, it finishes exactly as the whole plate lands in
    // view, and then holds on the closed arch while it scrolls away. Ending on "fully in
    // view" rather than "fully scrolled past" is the whole point of the choice: the arch
    // has to close while the reader can still see it.
    //
    // This page pins at every width — the plate runs full bleed and is cropped to the
    // stage rather than shrunk to fit it, with the crop anchored on the completed bridge.
    // That is entirely hero-bridge.css's business and this method never learns about it.
    //
    // The in-place branch is therefore not what the hero uses; it is what makes the
    // header's "make the element the same height as its stage and nothing pins" true.
    // Before it existed that configuration divided by a guarded 1 and produced a progress
    // value in pixels, which clamps to 0 or 1 and reads as a sequence that will not
    // scrub — a documented arrangement that silently did not work.
    progress() {
      var rect = this.getBoundingClientRect();
      var span = this.offsetHeight - this.stage.offsetHeight;
      if (span > 0) return clamp01((this.pin() - rect.top) / span);

      var vh = innerHeight || 800;
      var travel = this.offsetHeight;
      return clamp01((vh - rect.top) / (travel || 1));
    }

    frame() {
      // A display:none element has no offsetHeight, which is what suppresses the whole
      // engine where the hero does not render — one test rather than a media query that
      // would have to be kept in step.
      if (!this.N || !this.motion || !this.offsetHeight) return false;

      var p = this.progress();
      var moved = p !== this.p;
      this.p = p;

      // Linear across the moving share, then still for the tail. want is a render-frame
      // NUMBER rather than an index, and the search below converts it — so a sequence
      // with an uneven stride plays at the right rate rather than at a rate that changes
      // wherever the stride does. This one has an uneven stride waiting for it: the
      // delivery the render doc asks for is every frame where this is every third.
      var first = this.FRAMES[0], last = this.FRAMES[this.N - 1];
      var want = first + (last - first) * clamp01(p / (1 - TAIL));

      var idx = 0;
      while (idx < this.N - 1 && this.FRAMES[idx + 1] <= want) idx++;
      var j = Math.min(idx + 1, this.N - 1);
      var mix = this.FRAMES[j] > this.FRAMES[idx]
        ? (want - this.FRAMES[idx]) / (this.FRAMES[j] - this.FRAMES[idx]) : 0;

      if (idx !== this.head) { this.head = idx; this.plan(); }
      else if (!this.win) this.plan();
      this.paint(idx, j, mix);
      return moved;
    }

    paint(i, j, mix) {
      var lower = this.put(0, i), upper = this.put(1, j);
      var haveUpper = !!this.bits[j];
      if (lower) lower.style.opacity = (haveUpper ? 1 - mix : 1).toFixed(3);
      if (upper) upper.style.opacity = (haveUpper ? mix : 0).toFixed(3);

      // The still holds the hero until a real frame has been drawn over it, and this is
      // the flag that says so. The hero is the first thing on the page and its frames
      // cannot be preloaded against anything, so between load and the first decode there
      // is a real window — and the honest thing to show in it is the picture that already
      // ships. Swapping on boot instead would blank the hero for as long as that window
      // lasts, which is longest on exactly the connections least able to afford it.
      //
      // This changes nothing about layout: the still and the canvases share one box, so
      // the swap is a paint and never a reflow. The still is still the LCP element.
      if (!this._ready && lower && lower.dataset.f !== undefined) {
        this._ready = true;
        this.setAttribute('data-hb-ready', '');
      }
    }

    put(n, k) {
      var cv = this.cvs[n];
      if (!cv) return null;
      var use = this.bits[k] ? k : this.nearest(k);
      var bm = use < 0 ? null : this.bits[use];
      if (!bm) return cv;
      // The drawn frame is recorded on the element, never on this instance: a host
      // framework can replace the canvas between ticks, and an instance-held index would
      // then read "already drawn" against a fresh blank element and leave the layer empty
      // for the rest of the session. The tag carries the cut too, because the same index
      // is a different picture in the mobile cut.
      var tag = this.cut + ':' + use;
      if (cv.dataset.f === tag) return cv;
      // Backing store is the source frame's size, not the display box times a device
      // pixel ratio: it therefore changes only when the cut does, which changes the tag in
      // the same breath, so the clear that assigning width performs can never strand a
      // stale tag and blank the layer.
      if (cv.width !== bm.width) { cv.width = bm.width; cv.height = bm.height; }
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(bm, 0, 0);
      cv.dataset.f = tag;
      return cv;
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

  customElements.define('hero-bridge', HeroBridge);
})();

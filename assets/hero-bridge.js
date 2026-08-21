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

   That budget is spent on two things in order, and only the second one is frames. The
   plate is pinned from the moment the page loads, so a host can lay a screen of copy over
   it — which is what this hero does — and the APPROACH is the scroll that copy takes to
   leave. Through it the plate hangs from a line under the words, edge to edge on a desktop
   screen with only its bottom off the fold, and rises into place across exactly the
   distance that copy takes to go; then the SCRUB starts, on a plate that has been on screen
   the whole time. How long the approach lasts is --hb-entry-span and how much room the copy
   needs is --hb-entry-clear, both in hero-bridge.css — set them to the same distance and
   the copy leaving and the plate arriving are one move. A host with more or less copy to
   clear changes those and nothing here.

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
  var smooth = function (t) { var c = clamp01(t); return c * c * (3 - 2 * c); };

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

  // The rise used to hold for the first 60% of the approach and then happen in one gesture
  // as the words cleared, which made the copy leaving and the picture arriving two moves in
  // sequence. They are one move now: the rise is drawn across --hb-entry-clear pixels of
  // scroll, which is the same distance the host's copy takes to leave, so the two start and
  // finish together. Nothing here paces it any more — the stylesheet does, and the host
  // sets that number against its own copy.

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
      // WHAT ELSE LEAVES WHEN THIS DOES. A host that pins copy over the plate has a second
      // thing releasing at the same seam, and smoothing only this element's release would
      // pull the two apart at exactly the moment they most need to look like one thing. So
      // the host names its pinned copy and leave() writes it the same curve.
      //
      // Resolved against the OWNER DOCUMENT, not against this element: what rides along is
      // by definition not inside the component. Resolved once here rather than per tick,
      // because a querySelectorAll at 60fps for the length of a scroll is exactly the sort
      // of thing that shows up as jank in the one place this component is trying to remove
      // some. Elements are held rather than the selector, so a host that replaces its copy
      // has to re-mount the element — which is the same contract as the layers above.
      this.riders = [];
      var sel = this.getAttribute('exit-with');
      if (sel) {
        try { this.riders = Array.prototype.slice.call(document.querySelectorAll(sel)); }
        catch (e) { this.riders = []; }
      }
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
      // The entry transform goes with them, and for the same reason. It is one viewport's
      // geometry in pixels, so a serialised copy of it is wrong on any other screen — and
      // under reduced motion nothing ever runs to overwrite it, which leaves the still
      // shrunk into the bottom corner of a section that is not even pinned.
      this.box.style.transform = '';
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
      // Seeded together: scrolled is how far into the pinned budget the reader is, e is
      // what settle() last saw. Starting e at a value scrolled can never take is what
      // guarantees the first tick after a boot counts as movement and writes the entry
      // transform, rather than idling out against a stale match and leaving the plate at
      // full size over the copy.
      this.scrolled = 0;
      this.span = 0;
      this.e = -1;
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
      // The riders are the host's elements, not this element's, so they outlive it and
      // would keep whatever mid-ramp transform the last tick happened to leave on them.
      // Handed back the way they were found.
      for (var i = 0; i < (this.riders || []).length; i++) this.ride(this.riders[i], '');
      this.riders = [];
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
      // The inline transform goes with them. It outranks the stylesheet's static-mode
      // reset, so a hero that stops mid-approach — reduced motion switched on, or the
      // element detached — would otherwise keep its still shrunk into the bottom corner
      // of a stage that is no longer pinned.
      if (this.box) this.box.style.transform = '';
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

    // Everything the entry is composed from, read out of the stylesheet like variant() and
    // budgetWanted() and for the same reason: a host's own copy is what --hb-entry-clear is
    // sized against, the host writes its CSS, and a second copy of any of these here would
    // be free to drift from the layout they describe. The lengths resolve to pixels only
    // because hero-bridge.css registers them with @property; a plain custom property hands
    // back its token text, so there is a fallback for engines without it.
    //
    // One getComputedStyle call and not four: settle() runs on every tick of the approach,
    // and each getPropertyValue on a fresh style object is its own resolution.
    entry_() {
      var cs = getComputedStyle(this);
      var num = function (name, dflt) {
        var v = parseFloat(cs.getPropertyValue(name));
        return isFinite(v) ? v : dflt;
      };
      var clear = num('--hb-entry-clear', 0);
      return {
        clear: clear > 0 ? clear : (innerHeight || 800) * 0.4,
        sky: Math.min(0.9, Math.max(0, num('--hb-entry-sky', 0.226))),
        keep: Math.min(1, Math.max(0.05, num('--hb-entry-keep', 0.5))),
        min: Math.min(1, Math.max(0.05, num('--hb-entry-min', 0.25))),
        // Floored at 1 rather than at 0: a host that writes 0 or a negative number means
        // "no zoom", and letting that through would scale the plate to nothing or mirror
        // it, which is the same failure --hb-entry-min exists to prevent at the other end.
        zoom: Math.max(1, num('--hb-entry-zoom', 1)),
        // The ceiling on the DRAWN width, so it has to be a real length. Guarded above
        // zero because a host that unsets it would otherwise cap the plate at nothing.
        max: Math.max(1, num('--hb-max', 2880))
      };
    }
    entrySpan() {
      var v = parseFloat(getComputedStyle(this).getPropertyValue('--hb-entry-span'));
      return isFinite(v) && v > 0 ? v : this.stage.offsetHeight;
    }
    // The exit budget, floored at zero rather than defaulted to anything: a host that does
    // not set it, or a build that stripped the @property registration, gets the cliff the
    // element shipped with rather than a ramp sized from a number nobody chose.
    exitSpan() {
      var v = parseFloat(getComputedStyle(this).getPropertyValue('--hb-exit'));
      return isFinite(v) && v > 0 ? v : 0;
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

      // Fetch in the same ranking, so the nearest frames arrive first. The reader is
      // looking at this element the moment the page loads, so there is no section above to
      // preload against and the sequence cannot be fetched ahead of time — only fetched in
      // the right order. Head-first means the opening frame lands first and the scrub is
      // playable from the moment it starts while the rest is still arriving.
      //
      // The approach is the closest thing to a runway this hero has ever had: a screen of
      // scroll in which the plate is on show but no frame past the first is wanted yet.
      // It is not preloading — plan() still ranks around a head that has not moved — but
      // it is a screen's worth of time in which the window fills at four requests a time
      // before the scrub asks for anything, and it is worth what it looks like it is worth.
      // Measured at 1440x900 on a cold load, counting only the paints where the scrub is
      // actually advancing so the approach's own resident-frame ticks cannot flatter the
      // average: 19.5% of them wanted a frame that was not resident before, 4.2% after,
      // and the substitutions that remain land 1.29 positions from the wanted frame
      // rather than 4.03. Four runs each.
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
      this.e = -1;
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
    // This page pins at every width — the plate is edge to edge and the stage takes the
    // plate's own height, so on a desk screen the stage hangs below the fold and nothing
    // is ever clipped. That is entirely hero-bridge.css's business and this method never
    // learns about it; all it needs is that the two heights differ.
    //
    // The in-place branch is therefore not what the hero uses; it is what makes the
    // header's "make the element the same height as its stage and nothing pins" true.
    // Before it existed that configuration divided by a guarded 1 and produced a progress
    // value in pixels, which clamps to 0 or 1 and reads as a sequence that will not
    // scrub — a documented arrangement that silently did not work.
    //
    // The pinned budget is spent on three things and this is where it is divided: the
    // APPROACH, --hb-entry-span of scroll in which the host's copy leaves the screen it is
    // laid over and the plate settles under it; the SEQUENCE, --hb-scrub, which is what this
    // returns and what the frames are paced against; and the EXIT, --hb-exit, in which the
    // finished picture is held and then eased into the speed of the page. All three are
    // measured off the stylesheet rather than kept as fractions here, so each stays one
    // setting shared with whatever the host sized it against.
    //
    // Divided by subtraction and not by shares, which is what the two ends being named
    // buys. The share arithmetic this replaced divided the WHOLE post-approach span among
    // the frames, so adding an exit budget would have stretched the sequence over it
    // instead of leaving it alone — the frames would have finished later and the beat the
    // exit exists to create would never have appeared.
    //
    // Guarded at 1px rather than at 0: an approach and an exit that between them swallowed
    // the budget would leave this dividing by zero and the arch never building.
    progress() {
      var rect = this.getBoundingClientRect();
      var span = this.offsetHeight - this.stage.offsetHeight;
      if (span > 0) {
        // Banked in pixels, because settle() and leave() are both drawn across distances in
        // px rather than shares of anything — see each for why.
        this.scrolled = Math.max(0, this.pin() - rect.top);
        this.span = span;
        var entry = this.entrySpan();
        return clamp01((this.scrolled - entry) / Math.max(1, span - entry - this.exitSpan()));
      }

      // No pin, so no approach and no exit either: the plate is in flow and there is nothing
      // laid over it to clear. settle() reads this as "already arrived" and writes no
      // transform, and leave() has no release to smooth.
      this.scrolled = Infinity;
      this.span = 0;
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
      // The approach and the exit both count as movement even though the scrub does not
      // advance through either. Without this the pump idles out six frames into a rise that
      // is still running, and the plate freezes halfway up with the transform it happened
      // to stop on — and at the other end it would idle out mid-ramp, which is the exact
      // jar the ramp exists to remove. Tested on scrolled rather than on p because scrolled
      // is what settle() and leave() are both drawn against.
      var moved = p !== this.p || this.scrolled !== this.e;
      this.p = p;
      this.e = this.scrolled;
      this.settle();
      this.leave();

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

    // Where the plate sits while the host's copy is still on screen, and how it gets from
    // there to where the scrub wants it. The one piece of geometry in this file rather than
    // in the stylesheet, for the reason approach.js's camera() is: it is a function of
    // scroll, and CSS cannot read scroll.
    //
    // At entry the plate hangs from a line under the copy: its first pixel of ARTWORK sits
    // at --hb-entry-clear, its empty top is allowed to fall behind the words, and it runs
    // off the bottom of the screen wherever it is too tall to fit. It is scaled about its
    // own TOP edge — transform-origin does that, see hero-bridge.css — as far as
    // --hb-entry-keep of it staying above the fold allows, and no further than
    // --hb-entry-zoom. The rise is drawn across --hb-entry-clear pixels of scroll so that
    // it runs in step with whatever the host is doing with its copy over the top.
    //
    // Which way it moves is the host's choice and not this method's. At --hb-entry-zoom 1
    // the solve almost always comes out above 1 on a desk screen, the plate enters at its
    // full edge-to-edge width and the approach is a pure vertical rise. Above 1 the plate
    // can enter LARGER than the stage and settle back into it, cropped at the sides by the
    // viewport, and on a tall screen — where its own empty top no longer fits above the
    // fold — the rise flattens out entirely and the approach is a pull-back with no
    // vertical travel at all. Both end in the same place: no transform, before the scrub.
    //
    // Anchoring the top rather than the bottom is the whole reason the plate is big enough
    // to be worth looking at. Putting its bottom on the fold instead forces the WHOLE
    // picture between the copy and the fold — 458px for a 1007px plate at 1440x900, a 45%
    // postage stamp. Letting it run off the bottom costs nothing, because the viewport
    // cropping it there is invisible, and buys the other 55%.
    //
    // THE CLAMPS ARE NOT DECORATION. h is solved from the room BELOW the copy, and on a
    // viewport shorter than the copy needs — a landscape phone: 667x375 leaves 303px under
    // the header — that room is negative. Left unclamped the scale goes negative with it,
    // and a negative scale REFLECTS the box about its origin: the plate is drawn mirrored,
    // entirely off the bottom of the screen, and the hero reads as blank for the whole
    // hold. So the room is floored at zero and the scale at --hb-entry-min, which trades
    // the promise about --hb-entry-keep for a picture that is still a picture.
    //
    // rest is measured against the VIEWPORT and not against the stage, and that is not
    // interchangeable: the stage is the plate's own height, which on a desk screen is
    // taller than the viewport, so only the stage's own top is ever on screen.
    //
    // offsetTop rather than a second getBoundingClientRect: it is untransformed, so it
    // reports where the box RESTS rather than where this method last moved it, and the
    // calculation cannot feed on its own output.
    settle() {
      var box = this.box;
      if (!box) return;
      var e = this.entry_();
      var clear = this.pin() + e.clear;
      // Drawn across the clearance in PIXELS, not across a share of the approach. That
      // distance is how far the host's copy has to travel to leave, so the rise runs in
      // exactly the window the copy's own float and fade run in and the two read as one
      // move. It also means the rise is over the moment the copy is gone, which is what
      // lets --hb-entry-span be that same number and the scrub pick up immediately.
      var s = smooth(clamp01(this.scrolled / Math.max(1, e.clear)));
      // Arrived. Cleared rather than written as an identity transform, so the scrub runs
      // against a box with no transform at all — and so the stylesheet's static-mode reset
      // is not fighting an inline style for the rest of the session.
      if (s >= 1) { if (box.style.transform) box.style.transform = ''; return; }

      var ih = innerHeight || 800;
      var bh = box.offsetHeight;
      if (!bh) return;

      var rest = this.stage.getBoundingClientRect().top + box.offsetTop;

      // THE LARGEST THE PLATE CAN BE DRAWN WITH e.keep OF IT STILL ABOVE THE FOLD, and it
      // takes two solves rather than one because the plate is never lifted above rest —
      // see the dy clamp below. Which of them binds is a question about the plate's own
      // empty top:
      //
      //   while e.sky of it still fits between rest and clear, the plate hangs from clear
      //   and each unit of its height buys (keep - sky) of visible artwork;
      //
      //   once it does not, the clamp pins the plate at rest instead, its sky stops paying
      //   for itself, and each unit of height buys keep.
      //
      // Solving only the first and letting the clamp move the result is what looks right
      // and is wrong: at 2560x1300 the first solve wants a plate whose sky alone is 727px
      // against 616px of room above it, the clamp pulls it back down to rest, and the desk
      // lands 96px BELOW the fold — the one promise this method exists to keep, broken
      // silently. A keep at or below sky would ask for an infinite plate; guarded, though
      // nothing the stylesheet can say produces it.
      var room = Math.max(0, ih - clear);
      var h = room / Math.max(0.05, e.keep - e.sky);
      if (clear - e.sky * h < rest) h = Math.max(0, ih - rest) / e.keep;

      // Two ceilings, and they mean different things. e.zoom is the host's compositional
      // limit — how far past edge to edge it is willing to crop the sides. e.max is the
      // resolution limit, applied to the width the reader actually sees rather than to the
      // box, because a box inside --hb-max that is then scaled to twice it is exactly the
      // upscale that ceiling exists to prevent. offsetWidth and not the stylesheet's
      // min(100%, --hb-max): it is the box as laid out, so the ratio is measured rather
      // than re-derived.
      h = Math.min(h, e.zoom * bh, (e.max / Math.max(1, box.offsetWidth)) * bh);
      if (h < bh * e.min) h = bh * e.min;

      var k = h / bh;
      var top = clear - e.sky * h;

      // The entry only ever holds the plate LOWER than where it rests, never higher, and
      // the clamp is what makes that true. top is a viewport position, which is the right
      // frame of reference while the stage is pinned and the wrong one before it is: a
      // host that mounts this below the fold — or the same host on a screen too short to
      // lay copy over the plate, where the copy goes back into flow above it — has a rest
      // position far below the pin, and an unclamped shift would haul the plate up out of
      // its own box and over whatever is above it. Clamped, that case simply produces no
      // transform and the plate scrolls in the way any other element would.
      var dy = Math.max(0, top - rest);
      box.style.transform = 'translateY(' + ((1 - s) * dy).toFixed(1) + 'px)' +
                            ' scale(' + (k + (1 - k) * s).toFixed(4) + ')';
    }

    // WHERE THE PIN LETS GO, AND WHY THAT NEEDED SMOOTHING. While the stage is pinned the
    // picture does not move; the instant it is not, it moves at the speed of the page.
    // Measured at 1440x900 that is 0 to 1 in a single frame — position is continuous and
    // velocity is not, and the eye reads velocity, so the whole hero appears to be yanked
    // off the screen.
    //
    // So the picture's screen velocity is blended from nothing to page speed across a window
    // straddling the release, and the transform is whatever it takes to make that true:
    //
    //   U = (s + a) / 2a          s is scroll relative to the release, the window is [-a, a]
    //   G = 2a (U^3 - U^4 / 2)    the integral of smoothstep, in px
    //   T = -G + max(0, s)        minus what the page is already doing after the release
    //
    // T is exactly 0 at both ends, so nothing has to be unwound and the element carries no
    // transform outside the window. At the release itself T is -0.1875a: the picture has
    // lifted that far and is already travelling at half page speed, so the moment the sticky
    // lets go is the moment nothing happens.
    //
    // THE TWO HALVES HAVE TO BE EQUAL and that is arithmetic rather than taste. For T to
    // come back to zero the mean of the velocity curve across the window has to equal the
    // post-release half's share of it, and for a monotone S-curve that only holds when the
    // halves match. Weight it forward and the velocity ramps steeply at the start; weight it
    // back and the step is still there at the release. Either way the jar moves rather than
    // goes. --hb-exit is therefore spent half on the beat before the ramp and half on the
    // ramp's run-in, and the run-out is paid for by the scroll that was always there.
    //
    // T IS NEVER POSITIVE, which is the property that keeps this safe: the picture always
    // leads its natural position and never trails it. It cannot trail — the next section's
    // top sits only the host's section padding below the plate's bottom the whole way out,
    // so a picture that lagged the page would be run into by the content behind it.
    //
    // On the STAGE and not the box. settle() owns the box and the stylesheet's static-mode
    // reset already has an opinion about it; two writers on one property collide at the
    // boundaries, and "the scrub runs against a box with no transform at all" is worth
    // keeping. Transforming a sticky element is safe — it is a paint offset, applied after
    // the sticky position is resolved, and the stage goes on pinning at pin + T.
    leave() {
      var a = this.exitSpan() / 2;
      var s = this.scrolled - this.span;
      var t = '';
      if (a > 0 && this.span > 0 && s > -a && s < a) {
        var U = (s + a) / (2 * a);
        var G = 2 * a * (U * U * U - U * U * U * U / 2);
        t = 'translateY(' + (Math.max(0, s) - G).toFixed(1) + 'px)';
      }
      this.ride(this.stage, t);
      // The host's own pinned copy rides the same curve, named by exit-with. It is not
      // enough on its own: whatever is named has to STOP BEING PINNED at the same scroll
      // the stage does, or this only lends it a bump and it snaps loose later anyway. The
      // host arranges that in its own stylesheet — see index.html, where the copy overlay's
      // bottom is placed so its sticky range and this element's run out together.
      for (var i = 0; i < this.riders.length; i++) this.ride(this.riders[i], t);
    }
    // Written only when it changes, and cleared to nothing rather than to a zero translate,
    // so an element outside the window is left exactly as its stylesheet wrote it.
    ride(el, t) {
      if (!el) return;
      if (el.style.transform !== t) el.style.transform = t;
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

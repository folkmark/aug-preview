/* <scroll-world> — scroll-scrubbed continuous camera flight.
   Light-DOM <section data-sw-copy> children are pinned over the stage and faded
   in across their clip's band, so their markup stays editable in source.

   Attributes:
     clips   JSON array of { src, srcMobile, still, stillMobile, scroll, linger }
     bg      stage background colour (default #05070a)
*/
(function () {
  if (window.customElements && customElements.get("scroll-world")) return;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isPhone = () =>
    window.matchMedia &&
    (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 860);

  class ScrollWorld extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;

      let clips = [];
      try { clips = JSON.parse(this.getAttribute("clips") || "[]"); } catch (e) { clips = []; }
      this.clips = clips;
      this.mobile = isPhone();
      this.bg = this.getAttribute("bg") || "#05070a";

      // Pull the authored copy sections out of light DOM, keep the nodes.
      this.copy = Array.prototype.slice.call(this.querySelectorAll("[data-sw-copy]"));

      this.style.display = "block";
      this.style.position = "relative";

      this.wrap = document.createElement("div");
      this.wrap.style.cssText = "position:relative;width:100%";

      this.stage = document.createElement("div");
      this.stage.style.cssText =
        "position:absolute;top:0;left:0;width:100%;height:100svh;overflow:hidden;background:" +
        this.bg + ";display:block";

      this.poster = document.createElement("img");
      this.poster.alt = "";
      this.poster.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;transition:opacity 240ms linear";

      this.stage.appendChild(this.poster);

      this.videos = clips.map(() => {
        const v = document.createElement("video");
        v.muted = true; v.defaultMuted = true; v.playsInline = true;
        v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
        v.preload = "none"; v.loop = false;
        v.style.cssText =
          "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;opacity:0;transition:opacity 160ms linear;will-change:opacity";
        this.stage.appendChild(v);
        return v;
      });

      // Copy layer sits above the video.
      this.scrim = document.createElement("div");
      this.scrim.style.cssText =
        "position:absolute;left:0;right:0;bottom:0;height:78%;z-index:3;pointer-events:none;" +
        "background:linear-gradient(to top, rgba(5,7,10,0.9) 0%, rgba(5,7,10,0.78) 22%, rgba(5,7,10,0.42) 52%, rgba(5,7,10,0) 100%)";
      this.stage.appendChild(this.scrim);

      this.copyLayer = document.createElement("div");
      this.copyLayer.style.cssText =
        "position:absolute;inset:0;z-index:4;pointer-events:none";
      this.copy.forEach((el) => {
        el.style.position = "absolute";
        el.style.opacity = "0";
        el.style.transition = "opacity 320ms ease-in-out";
        el.style.pointerEvents = "none";
        this.copyLayer.appendChild(el);
      });
      this.stage.appendChild(this.copyLayer);

      this.spacer = document.createElement("div");
      this.wrap.appendChild(this.stage);
      this.appendChild(this.wrap);
      this.appendChild(this.spacer);

      this.loaded = new Array(clips.length).fill(0); // 0 none, 1 loading, 2 ready
      this.cur = -1;
      this.shownTime = 0;
      this.targetTime = 0;
      this.primed = false;

      this.layout();
      this.onScroll = () => { this.measure(); };
      this.onResize = () => {
        // Ignore URL-bar-only height changes on touch.
        if (this.mobile && window.innerWidth === this._lastW) return;
        this._lastW = window.innerWidth;
        this.mobile = isPhone();
        this.layout();
        this.measure();
      };
      this._lastW = window.innerWidth;
      window.addEventListener("scroll", this.onScroll, { passive: true, capture: true });
      document.addEventListener("scroll", this.onScroll, { passive: true, capture: true });
      window.addEventListener("resize", this.onResize, { passive: true });
      window.addEventListener("orientationchange", this.onResize);
      this.stage.addEventListener("touchstart", () => this.prime(), { passive: true });

      if (reduce()) {
        this.poster.src = this.stillFor(0);
        this.poster.style.opacity = "1";
        this.measure();
        return;
      }

      this.ensure(0);
      this.ensure(1);
      this.measure();
      this.tick = this.tick.bind(this);
      requestAnimationFrame(this.tick);
    }

    disconnectedCallback() {
      window.removeEventListener("scroll", this.onScroll, { capture: true });
      document.removeEventListener("scroll", this.onScroll, { capture: true });
      window.removeEventListener("resize", this.onResize);
      window.removeEventListener("orientationchange", this.onResize);
      cancelAnimationFrame(this._raf);
    }

    srcFor(i) {
      const c = this.clips[i] || {};
      return (this.mobile && c.srcMobile) || c.src;
    }
    stillFor(i) {
      const c = this.clips[i] || {};
      return (this.mobile && c.stillMobile) || c.still;
    }
    bandOf(i) {
      const s = this.clips[i] && this.clips[i].scroll;
      return (typeof s === "number" ? s : 1.4);
    }

    layout() {
      const vh = window.innerHeight;
      this.bands = this.clips.map((c, i) => this.bandOf(i) * vh);
      this.total = this.bands.reduce((a, b) => a + b, 0);
      // The sticky stage must live inside a container as tall as the whole flight.
      this.wrap.style.height = this.total + "px";
      this.spacer.style.height = "0px";
      // Copy blocks: bottom-left, clear of the notch / home indicator.
      this.copy.forEach((el) => {
        el.style.left = "0";
        el.style.right = "0";
        el.style.bottom = "calc(6vh + env(safe-area-inset-bottom, 0px))";
        el.style.paddingLeft = "5%";
        el.style.paddingRight = "5%";
      });
    }

    ensure(i) {
      if (i < 0 || i >= this.clips.length) return;
      if (this.loaded[i]) return;
      const src = this.srcFor(i);
      if (!src) return;
      this.loaded[i] = 1;
      const v = this.videos[i];
      fetch(src)
        .then((r) => r.blob())
        .then((b) => {
          v.src = URL.createObjectURL(b);
          v.preload = "auto";
          return new Promise((res) => {
            if (v.readyState >= 1) return res();
            v.onloadedmetadata = res;
          });
        })
        .then(() => { this.loaded[i] = 2; this.measure(); })
        .catch(() => {
          // Fall back to direct playback; CloudFront serves byte ranges.
          v.src = src; v.preload = "auto"; this.loaded[i] = 2;
        });
    }

    prime() {
      if (this.primed) return;
      this.primed = true;
      this.videos.forEach((v) => {
        if (!v.src) return;
        const p = v.play();
        if (p && p.then) p.then(() => v.pause()).catch(() => {});
        else { try { v.pause(); } catch (e) {} }
      });
    }

    pin(rect) {
      // Explicit three-state pin. position:sticky is unreliable here — an ancestor
      // with non-visible overflow / display:contents silently breaks its containment.
      const vh = window.innerHeight;
      const s = this.stage.style;
      if (rect.top > 0) {
        if (this._pin !== "top") {
          this._pin = "top";
          s.position = "absolute"; s.top = "0px"; s.left = "0px"; s.width = "100%";
        }
      } else if (rect.bottom < vh) {
        if (this._pin !== "end") {
          this._pin = "end";
          s.position = "absolute"; s.top = Math.max(0, this.total - vh) + "px";
          s.left = "0px"; s.width = "100%";
        }
      } else {
        s.position = "fixed"; s.top = "0px";
        s.left = rect.left + "px"; s.width = rect.width + "px";
        this._pin = "fixed";
      }
    }

    measure() {
      const rect = this.wrap.getBoundingClientRect();
      this.pin(rect);
      const denom = Math.max(1, this.total - window.innerHeight);
      const scrolled = clamp(-rect.top, 0, denom);
      const p = clamp(scrolled / denom, 0, 1);
      const at = p * this.total;

      let acc = 0, idx = 0, local = 0;
      for (let i = 0; i < this.bands.length; i++) {
        if (at <= acc + this.bands[i] || i === this.bands.length - 1) {
          idx = i; local = clamp((at - acc) / this.bands[i], 0, 1); break;
        }
        acc += this.bands[i];
      }

      // linger: settle mid-clip while the copy peaks; seam frames untouched.
      const L = clamp((this.clips[idx] && this.clips[idx].linger) || 0, 0, 0.6);
      if (L > 0) local = local + L * Math.sin(2 * Math.PI * local) / (2 * Math.PI);

      this.idx = idx;
      this.local = clamp(local, 0, 1);
      this.ensure(idx); this.ensure(idx + 1);

      // Copy fades in over the middle of its band. Re-adopt any node React re-parented.
      this.copy.forEach((el, i) => {
        if (el.parentNode !== this.copyLayer) {
          el.style.position = "absolute";
          el.style.transition = "opacity 320ms ease-in-out";
          el.style.pointerEvents = "none";
          this.copyLayer.appendChild(el);
          this.layout();
        }
        let o = 0;
        if (i === idx) {
          const f = this.local;
          const rise = i === 0 ? 1 : f < 0.12 ? f / 0.12 : 1;
          const fall = i === this.clips.length - 1 ? 1 : f > 0.82 ? Math.max(0, (1 - f) / 0.18) : 1;
          o = Math.min(rise, fall);
        }
        el.style.opacity = String(clamp(o, 0, 1));
      });

      if (reduce()) {
        const s = this.stillFor(idx);
        if (s && this.poster.getAttribute("src") !== s) this.poster.src = s;
        return;
      }

      if (this.cur !== idx) {
        this.cur = idx;
        const s = this.stillFor(idx);
        if (s) { this.poster.src = s; this.poster.style.opacity = "1"; }
        this.videos.forEach((v, i) => { v.style.opacity = i === idx ? "1" : "0"; });
      }
    }

    tick() {
      this._raf = requestAnimationFrame(this.tick);
      const i = this.idx;
      if (i == null || this.loaded[i] !== 2) return;
      const v = this.videos[i];
      const dur = v.duration;
      if (!dur || !isFinite(dur)) return;

      this.targetTime = clamp(this.local * dur, 0, Math.max(0, dur - 0.02));
      this.shownTime = lerp(this.shownTime, this.targetTime, 0.22);
      if (Math.abs(this.shownTime - this.targetTime) < 0.004) this.shownTime = this.targetTime;

      // Seek coalescing: never queue while the decoder is still seeking.
      if (!v.seeking && Math.abs(v.currentTime - this.shownTime) > 0.012) {
        try { v.currentTime = this.shownTime; } catch (e) {}
      }
      // Hold the poster until the clip has actually painted a frame.
      if (v.readyState >= 2 && this.poster.style.opacity !== "0") {
        this.poster.style.opacity = "0";
      }
    }
  }

  customElements.define("scroll-world", ScrollWorld);
})();

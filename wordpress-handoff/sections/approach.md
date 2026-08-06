# The Approach section — build spec

**What this is.** A complete description of one section of the AugmentED home page, written
so it can be rebuilt in another stack without reading the original source. Every number here
is read from the files that ship — `assets/approach.js`, `assets/approach.css`,
`assets/approach/manifest.json`, `tools/encode-approach.mjs` — not estimated.

**Read this with `project/scratch/approach-render-map.md`.** That document maps Blender frame
numbers to the beats and messages they carry, and is the source of every frame number below.
This one describes what the page does with them.

**The format is meant to be reused.** Sections 1–9 below are a template: what it is, the
asset contract, the maths, the responsive states, the decisions that look arbitrary, the
traps, accessibility, and what is deliberately not required. The hero section can be
documented the same way.

---

## 0. The short version

A scroll-scrubbed image sequence. The section is 880vh tall on desktop (520svh on phones);
a stage pins inside it and stays put while the page scrolls past; the scroll position picks a
frame. Four blocks of copy fade in and out in time with it.

It is **three files and a directory**:

| | |
|---|---|
| `assets/approach.js` | ~440 lines, no dependencies, defines `<approach-scrub>` |
| `assets/approach.css` | ~130 lines, all the geometry |
| `assets/approach/` | 210 WebP frames + `manifest.json` |

No framework, no build step, no design system, no icon font, no images beyond the frames.
It is a custom element that drives markup the page authors, so the copy is real text in the
document whether or not the JavaScript ever runs.

**To see it working, open `wordpress-handoff/pages/home.html` straight from disk** — no
server, no network, no install. That file is the rendered home page with its asset paths
pointing back at the repo's own `assets/`, so the section in it is the section in
production. It is the artefact that settles arguments about intended behaviour, and the
markup contract in §10 can be read straight out of it.

---

## 1. What the section is

Six **beats**, each with two phases, and the distinction is the whole design:

- **MOVE** — the picture animates and the camera rotates. The visitor is watching.
- **HOLD** — everything is dead still. The visitor is reading.

> **Copy appears on the hold, never during the move.** Nothing moves while there are words
> to read, so the reader is never asked to watch and read at once.

The six beats and what each shows:

| Segment | Beat frame | Copy shown | Picture |
|---|---|---|---|
| 0 — opening | 167 | *(none)* | Two desks, loaded, seen from the left |
| 1 | 235 | **Define the role.** | A blueprint arch draws itself in the gap — wireframe only |
| 2 | 353 | **Build the capabilities.** | The arch becomes solid |
| 3 | 477 | **Co-design the applications.** | Applications assemble on the arch |
| 4 | 598 | **Test, learn, begin again.** | The load travels down through every block |
| 5 — coda | 672 | *(beat 4's copy, held)* | Two books come to rest on the keystone |

The coda holds beat 4's copy rather than clearing it: the books coming to rest are that
line's payoff, not a separate thought.

---

## 2. The frame contract

**Naming.** `ap<frame><cut>.webp` — `ap0353.webp`, `ap0353m.webp`. The number is the
**Blender frame number**, zero-padded to 4, so the file on disk, the timeline marker in the
render map, and the manifest all name the same thing. Do not renumber them sequentially; the
link back to the render is the point.

**Two cuts of every frame.**

| Cut | Suffix | Beats | Moves | Who gets it |
|---|---|---|---|---|
| Full plate | *(none)* | 2048 × 1432 | 896 × 626 | Desktop stage (≥ 992px) |
| Crop | `m` | 1147 × 888 | 512 × 396 | Mobile band (≤ 991px) |

Squarish desktop windows fetch **neither** — they take the static fallback, see §5.

**Which frames exist.** The six beats, plus every 5th frame from 167 to 672 — **105 frames**,
210 files. Beats are fixed by the render; the in-between list is whatever the encoder made.
Nothing in the page hard-codes it: `manifest.json` is written by the encoder and read at
runtime, so the page cannot ask for a frame that was never produced.

```jsonc
{
  "frames": [167, 172, 177, …, 672],   // every frame that exists, ascending
  "beats":  [167, 235, 353, 477, 598, 672],
  "stem": "ap", "pad": 4, "ext": "webp",
  // w/h are a *beat* frame; moveW/moveH are a move frame. Both are needed — the page
  // budgets decoded memory per frame, and the two differ by 5x. See 6.8.
  "cuts": {
    "":  {"w":2048,"h":1432,"moveW":896,"moveH":626},
    "m": {"w":1147,"h":888, "moveW":512,"moveH":396}
  },
  "crop": {"left":426,"top":0,"width":1147,"height":888}
}
```

**Encoding.** Beats and moves are encoded differently *on purpose*, and this is what keeps a
105-frame sequence affordable:

| | Source | Size | Quality | Alpha quality |
|---|---|---|---|---|
| **Beats** (6) | lossless 16-bit PNG | native | 82 / 80 | **100** |
| **Moves** (99) | q90 WebP archive | 896 / 512 wide | 70 | **70** |

The beats are what a visitor actually dwells on — they sit motionless under copy for a
screenful of scrolling — so they take no second lossy generation and no downscale. The moves
are only ever seen in passing.

**What that costs**, for the whole 105-frame sequence:

| Cut | Beats | Moves | Total |
|---|---|---|---|
| Full plate | 675 KB (6) | 2.36 MB (99, ~24 KB each) | **3.02 MB** |
| Crop (`m`) | 373 KB (6) | 1.99 MB (99, ~21 KB each) | **2.36 MB** |

A browser fetches **one cut, never both**, and only once the section is within **1.25
viewport heights** — so this is not page-load weight. It streams in during the scroll,
beats first, so every hold reads correctly even mid-download; on a throttled 3G connection
with a brisk scroll the first beat is an approximate neighbouring frame rather than a blank
stage.

> **That 1.25 is coupled to what sits above the section, and nothing enforces it.** The gate
> is "start loading when the section's top is within `near` × viewport heights". If whatever
> precedes the section is taller than that, the gate is satisfied while the page is still at
> rest and there is no laziness at all. This is not hypothetical: the hero above it grew to
> 290vh, and with the old default of 3 a phone fetched **2.4 MB of frames before the visitor
> had scrolled a pixel**. If you change the page order or the hero's height, re-measure.

> **Alpha is where the bytes are, not colour.** In a move frame the colour costs ~14 KB and
> the alpha channel ~24 KB, because these plates are mostly transparent and WebP stores alpha
> losslessly by default. Tuning `quality` is nearly useless here — q72 → q62 moves a frame by
> 5%. Dropping *alpha* quality from 100 to 70 measures as free: composited over the page a
> move frame goes from 40.2 dB to 40.0 dB PSNR, with a lower maximum error. The "lossy alpha
> frays the thin desk legs into a halo" worry is real, but the cliff is at the bottom of the
> range — alphaQuality 0 falls to 32.8 dB. 70 is nowhere near it.

**The frames are RGBA and must stay RGBA.** They composite over the page colour. Flattening
them onto a background would cut ~60% of the bytes and would also weld one page colour into
210 files — don't, unless the section will never be re-themed.

---

## 3. The scroll maths

Progress is a single number from 0 to 1:

```
progress = (pin − sectionTop) / (sectionHeight − stageHeight)
```

`sectionTop` is the section's `getBoundingClientRect().top`; `pin` is where the stage sticks.
The denominator is the distance the page travels while the stage is pinned.

**Progress is split into 6 segments**, one per beat, by a fixed table:

```
lead = 0.128    tail = 0.103    span = (1 − lead − tail) / 4 = 0.19225

bounds = [0, 0.128, 0.32025, 0.5125, 0.70475, 0.897, 1]
          └op─┘ └─1──┘ └──2──┘ └──3──┘ └──4──┘ └coda┘
```

The opening and the coda are deliberately shorter than the four beats that carry copy; those
four get exactly equal weight so no step reads as more important than another.

**Within a segment**, local position `t` runs 0→1, and it splits into move and hold:

```
MOVE = 0.42          // first 42% of a segment is the move, the rest is the hold
frame = B[seg−1] + (B[seg] − B[seg−1]) · smoothstep(t / MOVE)
```

`smoothstep(x) = x²(3−2x)`, clamped — so the move eases in and out rather than starting and
stopping abruptly. Past `t = MOVE` the expression saturates and the frame is **exactly** the
beat frame: the hold is genuinely still, not nearly still.

`MOVE` is not a constant of taste. With only the six beat frames encoded, a "move" is a
dissolve between two camera angles 6.667° apart, which ghosts — so the code shortens it to
**0.14** automatically when `frames.length === beats.length`. With the in-between frames
present it is a real scrub and gets **0.42**. If you ever ship a beats-only build, this is
why it still looks deliberate.

**Copy timing**, in the same local `t`:

| | |
|---|---|
| fades in | `smoothstep((t − MOVE) / 0.14)` — i.e. starting the instant the move ends |
| fades out | over the last 8% of its segment (the last beat instead holds through the coda) |
| clickable | only while opacity > 0.4 |

**Picking the image.** The wanted frame is rarely one that exists, so two are drawn: the
nearest existing frame at or below, and the next one up, cross-faded by the fractional part.

**The tick jump is the inverse.** Clicking tick *n* scrolls to `bounds[n+1] + 0.6 × segment`
— past the move, onto the hold, where the picture is still and the copy is up. It reads the
same `pin` and the same span as `progress()` does. **If those two ever disagree, ticks land
on the wrong beat**, so they must stay inverses of each other.

---

## 4. The camera

One formula, both layouts, no branch:

```
fit   = min(1, (plateW / plateH) × boxHeight / boxWidth)
open  = smoothstep(progress / 0.24)
scale = fit + (1 − fit) × open + 0.028 × progress
transform: translateY(1.2% × open) scale(scale)
transform-origin: 50% 0%
```

The plate hangs from the **top** of its box at the box's full width. At scale 1 it fills the
width and what gets clipped off the bottom is desk legs.

- The opening pulls back to `fit` — far enough to hold the whole plate — and pushes in to
  full bleed over the first 24% of the scroll.
- `0.028 × progress` is a hair of continuous creep so that a frozen frame is never a *dead*
  frame during a long hold.
- Measuring the **box** rather than the stage is what lets one formula serve both layouts. On
  a phone the band is cut to the same aspect as the plate it holds, so `fit` works out to 1
  and the formula reports "already fits" instead of needing a special case.

---

## 5. Responsive behaviour

Three states, and the third is the one people get wrong.

| State | When | Shape |
|---|---|---|
| **Desktop stage** | ≥ 992px **and** wider than 5:4 | Full-bleed pinned stage, 880vh budget, copy overlaid in the lower corners |
| **Mobile band** | ≤ 991px | Pinned band at the crop's aspect, 520svh budget, copy and ticks stacked underneath on the page |
| **Static stills** | (≥ 992px **and** squarer than 5:4) **or** `prefers-reduced-motion: reduce` | The element is `display: none`; a stacked grid of the four beat plates shows instead |

The squarish-desktop case is not a nicety. The desktop presentation hangs a full-width 1.43
plate from the top of a full-height stage, so a portrait or square *desktop* window — a
tablet held upright at 1024×1366, a tiled half-screen browser — leaves a dead band beneath
the artwork. The phone presentation has no such problem, because its band is cut to its own
aspect; that is why the fallback is scoped to `min-width: 992px`, the width that uses the
tall stage, and not applied to phones.

```css
/* the host page owns this one */
@media (min-width: 992px) and (max-aspect-ratio: 5/4) {
  approach-scrub          { display: none !important }
  main .hero-static-block { display: grid !important }
}
```

> **Portability gap, worth knowing before porting.** The component hides *itself* under
> reduced motion (that rule is in `approach.css`), but the squarish-desktop swap above lives
> in the **host page**, not in the component — because only the host knows what it is
> swapping *to*. Port `approach.js` and `approach.css` alone and a tablet in portrait gets a
> tall stage with a dead band under it, silently. Reproduce that media query, and its
> partner rule showing the stills, in whatever template replaces `index.html`.

`approach.css` *also* carries `(max-aspect-ratio: 5/4)` on the band query, which looks
redundant against the above and is deliberately belt-and-braces: if a host drops the swap
rule, a squarish window degrades to the band rather than to a broken tall stage.

**The band's aspect must equal the crop's aspect.** `aspect-ratio: 1147 / 888` on
`[data-arch-box]` is the same rectangle the encoder cut. See trap 6.4.

On viewports under 700px tall the elaborating half of each paragraph (`[data-arch-more]`) is
hidden, so the claim carries the beat alone. **There is one set of copy, not a mobile set** —
taller phones get the whole paragraph.

---

## 6. The decisions that look arbitrary and are not

This is the section to read before "simplifying" anything. Each of these produces a section
that looks approximately right and is subtly broken if changed.

### 6.1 The plate is anchored to its top edge

`transform-origin: 50% 0%`. In the final beat two books come to rest on the keystone
**within 1.3% of the plate's top edge**. Centre-anchoring, or bottom-anchoring, decapitates
that frame at exactly the moment the section is making its point.

### 6.2 Two canvases with `plus-lighter`, not one canvas at partial alpha

The obvious implementation — draw frame A at `globalAlpha = 1−t`, then frame B at `t`, into
one canvas — is **mathematically wrong**. The second draw composites over the first, so
anything the two frames share (here: both desks, most of the picture) ends up at
`(1−t) + t(1−(1−t))`, which sags to **75% opacity** halfway through every transition. The
picture visibly washes out and recovers on every move.

Two stacked canvases, cross-faded by CSS `opacity` under `mix-blend-mode: plus-lighter`, add
to exactly the frame in between.

`isolation: isolate` on their parent is **load-bearing**: it makes the pair their own blending
group. Without it `plus-lighter` blends against the page and blows out to white.

> **This is fragile in a theme.** An ancestor with `filter`, `opacity < 1`, `transform`, or
> its own `mix-blend-mode` creates a competing stacking context and can break the blend. If
> the plates ever look washed out or blown out in a new theme, look up the tree first.

### 6.3 `svh`, never `dvh`, for the scroll budget

Progress is *derived from the section's own height*. With `dvh`, that height changes as a
mobile URL bar retracts — which changes the denominator mid-scroll and **snaps the animation**
to a different frame under the reader's thumb. `svh` is a fixed number. For the same reason
the mobile stage carries no viewport unit at all: it is auto-height.

### 6.4 The crop rectangle is a three-way contract

`{left: 426, top: 0, width: 1147, height: 888}` appears in three places that nothing checks
against each other:

1. `tools/encode-approach.mjs` — cuts it
2. `manifest.json` → `cuts.m` — the camera scales by it
3. `aspect-ratio: 1147 / 888` on `[data-arch-box]` — the band is shaped by it

Change one and the band letterboxes or the camera mis-scales. It is centred on the **arch**
(x ≈ 0.488), not on the plate — the plate's own centre would slice the left desk's book stack.
`top` is 0 because of 6.1.

### 6.5 `--arch-variant` is read from CSS by the JavaScript

The stylesheet sets `--arch-variant: "m"` inside the mobile media query; the JS reads it back
with `getComputedStyle`. This looks like a detour — the JS could just test `innerWidth`. It
must not: a second copy of the breakpoint is free to drift from the one that sizes the band,
and **a band cut to one aspect fed a plate of another is a silent, invisible bug**. One
breakpoint sizes the band *and* picks the file.

### 6.6 The pin offset is read from the stage's own `top`

Not from measuring a page header. `document.querySelector("header")` returns the *first*
`<header>` in the document, and CMS themes routinely emit `<header class="entry-header">`
inside an article. Reading `getComputedStyle(stage).top` means CSS and JS agree by
construction, and a host with a taller header, no header, or an admin bar overlaying the page
needs **no code change** — just `--arch-pin`.

### 6.7 The drawn frame is recorded on the canvas element, not in the component

`canvas.dataset.f`, not `this.drawnIndex`. A framework can replace the canvas element between
ticks; an instance-held index would then read "already drawn" against a fresh blank element
and leave the layer empty for the rest of the session. The tag includes the cut, because the
same index is a different picture in the mobile crop.

It is cleared on boot, which is what makes the section safe under a **full-page cache**: a
cache serialises the rendered DOM, `data-` attributes and all, so the next visitor would
otherwise get a canvas claiming to hold a frame it does not have.

### 6.8 The resident set is ranked and paid for, not windowed

A frame decodes to `width × height × 4` bytes however small the WebP is on disk — **11.2 MiB**
for a full-cut beat, **2.1 MiB** for a full-cut move. All 105 resident at once is several
hundred megabytes, so the component holds a subset and closes the rest.

The way it picks that subset matters more than it looks. Every frame is ranked by distance
from the current position — biased forward, because reading is a downward act, and beats
discounted hard, because a hold rests on one — and then the byte budget (default **96 MB**,
settable via `budget-mb`) is spent down that ranking. Whatever it pays for is what stays.

The obvious cheaper design is a sliding window sized as `budget ÷ frameSize`. **It does not
hold**, and this section exists because the first version of this component did exactly that:
the beats were pinned on top of the window and two frames behind the playhead were kept as
well, so the set actually resident was the window *plus nine*. Measured on a 1440×900
desktop, a 96 MB budget held **190 MB**. A ceiling that things get added to is not a ceiling.

Two consequences worth keeping if this is rewritten:

- **Budget per frame, not per sequence.** Beats and moves are encoded at different sizes, so
  they must be *charged* at different sizes. Charging every frame the beat's price made the
  phone hold 24 frames where the same budget really paid for 99.
- **Encoding bigger automatically holds fewer.** Because the cost is computed from the
  frame's own dimensions, raising the encode resolution shrinks the resident set on its own
  instead of silently multiplying memory.

---

## 7. Traps

Things that fail silently. In rough order of how likely they are to bite.

**7.1 The static fallback depends on the page's reveal sweeper.** The stacked stills that show
under `prefers-reduced-motion` carry inline `opacity: 0`, cleared by the page's `data-reveal`
script. Lift that markup into a new stack without the sweeper and **the fallback renders
invisible** — no error, no clue. This is the single most likely silent failure in a port.

**7.2 Loading is gated on `offsetHeight`, deliberately.** A `display: none` element has no
`offsetHeight`, which is what stops the component fetching 210 files under reduced motion.
If you replace `display: none` with `visibility: hidden` or `opacity: 0`, **the section
starts downloading the whole sequence for people who asked for no motion.**

**7.3 Frames are addressed by string concatenation, so no build tool can see them.** There is
no literal `ap0353.webp` anywhere in the markup. Asset pipelines that rewrite or fingerprint
URLs by scanning HTML will miss all 210 files and ship a page that 404s mid-scroll. This is
why the repo's build verifier reads `manifest.json` and checks the cross product of every
frame against every cut on disk — reproduce that check in whatever pipeline replaces it.

**7.4 Shipping one cut without the other is a phone-only failure.** A desktop never requests
the `m` files. Half-encoding the sequence looks completely fine in a desktop browser.

**7.5 `box-sizing: border-box` is load-bearing** for the tick row's flex layout. The component
sets it on itself and its descendants rather than assuming the host does.

**7.6 The tick hover rule is inside `@media (hover: hover)`.** Without the guard, a tapped
tick sticks at 0.7 opacity on touch, because a touch device has no hover to leave.

**7.7 `base` must be a single quoted attribute value ending in `/`.** The component
concatenates onto it directly. Build it from pieces and the verifier stops being able to find
it.

---

## 8. Accessibility

- **Reduced motion** — the element is `display: none` and a stacked-stills version of the same
  content shows instead. Not a nicety: this is a large moving image tied to scroll.
- **The copy is real text in the light DOM.** No Shadow DOM, deliberately — the copy stays
  editable in the CMS, indexable by crawlers, and selectable. The component only sets
  `opacity` / `transform` on nodes the page authored.
- **The picture carries one `role="img"` and a describing `aria-label`** on the camera element;
  both canvases are `aria-hidden`. A screen reader gets one description of the artwork, not
  105 frames of nothing.
- **Ticks are real `<button>`s** in a delegated click handler, keyboard-focusable, and
  **44px minimum touch target** on mobile (`min-height: 2.75rem`).
- **Copy is `pointer-events: none` while faded out**, so invisible text is never a click
  target sitting over the visible beat.
- **Contrast**: the corner-wedge scrim exists to make the overlaid copy legible against the
  artwork. It was tuned by measurement, not by eye — worst-case contrast behind the copy at a
  1280px-wide short viewport goes from **1.9:1 to 7.6:1**. If you change the scrim, re-measure
  at a short viewport, which is the worst case: short viewports scale the plate up until the
  dark desk cubby lands behind the text.

---

## 9. What is deliberately *not* required

Naming this explicitly, because the instinct on seeing a scroll animation is to reach for a
library:

| Not needed | |
|---|---|
| A scroll library | GSAP ScrollTrigger, Lenis, Locomotive — none. Position sticky and one rAF loop. |
| A framework | No React, no Vue, no Alpine. A custom element in the light DOM. |
| A build step | The two files are the files that run. No bundler, no transpile, no minifier required. |
| The design system | The section uses **zero** design-system components and **zero** icons. It is `div` / `canvas` / `button` / `span` / `h3` / `p`. |
| An icon font | — |
| A video element | The sequence is scrubbed images, because video seeking is not frame-accurate across browsers. |

**Design tokens are referenced with literal fallbacks** — `var(--surface-page, #fdfcfa)` — so
the section renders correctly with the AugmentED tokens loaded and still renders sensibly
without them. A host that wants its own palette overrides the custom properties on the
element. The four it reads:

| Property | Default | |
|---|---|---|
| `--arch-pin` | `4.5rem` | sticky offset — **set this to the host header's height** |
| `--arch-page` | `--surface-page` | the scrim colour; must match the page behind the plates |
| `--arch-accent` | `--brand-accent` | the beat numbers |
| `--arch-rule` | `--border-hairline` | the tick rules |

**Fonts.** The section inherits the page's type. The live site uses Avenir LT Pro in three
weights — Book 400, Medium 600, Heavy 700. **Avenir LT Pro is commercially licensed**: a
rebuild needs its own licence or must substitute. Nothing in this section depends on the
typeface beyond those three weights being available.

---

## 10. Rebuilding it

If the target stack can load a JS file and a CSS file, this is the whole job:

1. Copy `assets/approach.js`, `assets/approach.css`, and `assets/approach/` across.
2. Enqueue the two files. `approach.js` is `defer`-safe and order-independent.
3. Emit the markup contract documented at the top of `assets/approach.js`, with `base`
   pointing at the frame directory.
4. Emit the stacked-stills fallback markup **and the two host rules that swap to it** —
   the squarish-desktop media query in §5 and the reduced-motion one. The component cannot
   own these; it does not know what it is swapping to.
5. Set `--arch-pin` to the theme header's height.
6. Reproduce the manifest cross-product check in the asset pipeline (trap 7.3).

A five-minute smoke test that catches most of what goes wrong: load it at 1440×900 and
scroll the section through (the picture should *scrub*, not cross-fade); click each tick and
check the copy is fully up and the picture still; resize to 1024×1366 portrait and confirm
you get the stacked stills, not a tall stage with a dead band; load at 390px and confirm the
network panel shows only `…m.webp` files and no 2K plates; turn on reduced motion and confirm
the section vanishes and **the stills are visible, not blank** (trap 7.1).

If it must be rewritten natively instead, sections 3, 4 and 6 are the specification, and
section 6 is the part that is expensive to rediscover.

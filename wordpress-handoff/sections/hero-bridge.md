# The hero bridge — build spec

This document is a complete description of the home page hero, written so the
section can be rebuilt in another stack **without the packaged element**. The
normal path is the `<hero-bridge>` component — copy `assets/hero-bridge.js`,
`assets/hero-bridge.css`, the frame directory, and the markup, per
[the handoff README](../README.md). This document exists for the other case: the
element cannot run in the target stack, or someone has to change how it behaves.
Sections 3 to 6 are then the specification, and section 8 is the part that is
expensive to rediscover.

**Audience.** The developer installing, modifying, or reimplementing the hero.
Read [the handoff README](../README.md) first for the rules shared by all
components.

**Where the numbers come from.** Every value here is read from the shipping
files — `assets/hero-bridge.js`, `assets/hero-bridge.css`,
`assets/hero-bridge/manifest.json`, the hero blocks in `index.html` — or from
the measurements recorded beside them. The render-side authority is
[`docs/hero-bridge-render.md`](../../docs/hero-bridge-render.md); its frame
numbers are the source of the frame numbers below.

---

## 0. The short version

A scroll-scrubbed image sequence, pinned under the header from the moment the
page loads, with the hero copy laid over it. The copy scrolls away while the
plate rises into place; the arch then assembles across the scrub, holds, and
eases out with the page. Three files and a directory:

| | |
|---|---|
| `assets/hero-bridge.js` | ~950 lines, no dependencies, defines `<hero-bridge>` |
| `assets/hero-bridge.css` | ~575 lines, all the geometry, heavily annotated |
| `assets/hero-bridge/` | 66 frames in two cuts (132 files) + `manifest.json` |

The still `<img>` in the markup is the finished hero: it is what renders with
scripting off, under reduced motion, on Save-Data, and before the first frame
decodes — and it is the LCP element in every one of those cases. The section is
designed so that the still-only state is a complete design, not a degraded one.

**If the element cannot run at all**, ship exactly that state: the still in
flow, one screen of clearance for the copy above it, no pin, no extra scroll.
That is what the component's own static mode produces, and it is the fallback
this spec's native rebuild degrades to as well.

---

## 1. What the section is

The element's height minus its stage's height is the scroll budget, and the
budget is spent on four phases in order. Each phase is one custom property, and
the element measures all four off the stylesheet:

| Phase | Property | This page sets | What happens |
|---|---|---|---|
| **Approach** | `--hb-entry-span` | `--hero-band` | The host's copy scrolls away; the plate rises from under it into place. |
| **Sequence** | `--hb-scrub` | 140svh | The arch assembles, one frame per share of scroll. |
| **Beat** | `--hb-hold` | 20svh | Nothing moves. The finished bridge is read. |
| **Ramp** | `--hb-exit` | 45svh | The picture's velocity blends from zero to page speed across the release. |

The budget is divided by subtraction, not by shares: each phase is a length,
and the sequence plays across exactly `--hb-scrub` however the others change.

The copy overlay — pinned headline, dissolving body — is the **host's**, not
the component's: plain CSS using `position: sticky` and
`animation-timeline: scroll()`, with no JavaScript and no reference to the
element. Section 5 specifies the contract between the two.

---

## 2. The frame contract

**Naming.** `hb<frame><cut>.webp` — for example `hb0353.webp` and
`hb0353m.webp`. The number is the **Blender frame number**, zero-padded to four
digits, so a file, the render notes, and the manifest all name the same thing.

**Two cuts of every frame, and both are the whole plate:**

| Cut | Suffix | Size | Who gets it |
|---|---|---|---|
| Full | *(none)* | 1600 × 1119 | ≥ 992 px (`--hb-variant: ""`) |
| Mobile | `m` | 1200 × 839 | ≤ 991 px (`--hb-variant: "m"`) |

> **Note: the mobile cut is a downscale, not a crop — and cannot be a crop.**
> Content spans x 0.000–0.999 and y 0.000–0.999 of the plate, measured over all
> 48 played frames at the lossless-alpha encode: the ground shadow reaches the
> bottom edge, and blocks fly in from the top and the right for the whole run.
> A crop tight enough to help would clip them, and blocks falling into place is
> the animation. (The Approach section crops its mobile cut; this sequence is
> the reason that decision does not transfer.)

**Which frames exist, and which play.** The manifest records 66 encoded frames,
276–468, from three separate render deliveries. The page plays **276–417** — 48
frames — named by `from` and `to` on the element, because only that span carries
the soft ground shadow. The seam is measured, not judged: partial alpha coverage
is 33.5–36.8% through 417 and 2.0–2.3% after it, and the mean absolute
frame-to-frame difference spikes from 2–7 to 18.7 across the single step. Widen
the span and the legs change color and the shadow vanishes mid-scrub.

**Payload** (measured on disk):

| | 66 frames encoded | 48 frames played |
|---|---|---|
| Full cut (1600) | 10.9 MB | 9.1 MB |
| Mobile cut (1200) | 7.0 MB | 5.8 MB |

> **Warning: the alpha channel is lossless, and must stay lossless.** The Aug 20
> render carries a soft directional ground shadow *in alpha* — a low-amplitude
> gradient, not object edges. Lossy alpha posterizes it into visible terraces:
> measured along one scanline, the master holds 25 distinct alpha levels and
> `alphaQuality 70` flattens them to 5. The setting that was free on the
> Approach frames destroys this sequence. The price is the headline fact: the
> shadow and soft edges are ~67% of every frame's bytes. The levers, if the
> payload must shrink, are the encoded width or taking the shadow out of the
> render — never `alphaQuality`. See
> [the render notes](../../docs/hero-bridge-render.md).

**The artwork constants.** Three numbers in `hero-bridge.css` describe this
artwork, each measured on the frame it governs. A replacement sequence gets
re-measured the same way; never carry these over:

| Constant | Frame | Value | What it is |
|---|---|---|---|
| `--hb-entry-sky` | 276 | 0.226 | The empty band above the artwork. Content starts at y 0.237 (desk side) and 0.270 (rack side); 0.226 sits inside both, so copy may overlap the band. |
| `--hb-entry-keep` | 276 | 0.400 | The lower edge of the two top surfaces: desktop plane ends y 0.363, the slab's front face 0.380, the rack's lid 0.396. What must stay above the fold. |
| `--hb-arch` | 417 | 0.1001 | The top of the *finished* bridge — a flat line, y 0.100–0.105 across x 0.30–0.68. It sits **above** both objects (rack top 0.257, desk top 0.245), which is why it needs its own constant. |

Frame 276 and only frame 276 for the first two, because the approach holds on
the first played frame throughout and the camera moves later — the same desk
edge slopes 0.386–0.404 by frame 417.

---

## 3. The scroll math

### Progress

```
scrolled = max(0, pin − rect.top)            // pin = the stage's computed sticky top
span     = rect.height − stageRect.height    // fractional, from getBoundingClientRect
p        = clamp01((scrolled − entrySpan) / max(1, span − entrySpan − hold − exit))
```

> **Warning: `span` must be fractional.** The exit ramp centers on
> `scrolled == span`, and `scrolled` comes from a fractional `rect.top`. A span
> rounded to whole pixels (from `offsetHeight`) puts the ramp's center up to a
> pixel from where the pin actually releases, and the seam carries a position
> step the size of the error. Measured across eight viewports, the worst
> velocity step tracked the rounding error exactly: 0.038–0.050 where it
> canceled, 0.112 at 0.59 px.

If the element is the same height as its stage, nothing pins; progress is then
the plate's own travel through the viewport, finishing exactly as the whole
plate lands in view — the arch must close while the reader can still see it.

### Frame selection

```
TAIL  = 0.15
want  = first + (last − first) × clamp01(p / (1 − TAIL))   // a frame NUMBER
```

Then find the two frames bracketing `want` in the manifest's list and cross-fade
them by the fractional position between their *numbers*, not their indices — so
a sequence with an uneven stride plays at one rate. The scrub is **linear**,
deliberately: this is one continuous assembly with nothing to synchronize
against, so the honest mapping is scroll to frame, one for one. `TAIL` holds the
closed arch for the last 15% so the payoff is settled on screen before the page
moves on.

The rate is `--hb-scrub × 0.85 / (frames − 1)` — 22.8 px of scroll per frame at
140svh on a 1440×900 screen. Frames and budget are one setting in two files: if
the full stride-1 delivery lands (142 frames), raise `--hb-scrub` with it or the
assembly plays three times faster.

---

## 4. The entry

Where the plate sits while the host's copy is on screen, and how it reaches its
resting place. This is the one piece of geometry in script rather than
stylesheet, because it is a function of scroll.

The plate hangs from a line under the copy: its first pixel of **artwork** sits
at `pin + --hb-entry-clear`, its empty top (`--hb-entry-sky`) is allowed behind
the words, and it runs off the bottom of the screen wherever it does not fit. It
is scaled about its own **top edge**, and the rise is drawn across
`--hb-entry-clear` **pixels of scroll** — the distance the host's copy travels
to leave — so the copy's exit and the plate's arrival are one move.

The solve, per tick, with `e` the values read from the stylesheet:

```
s     = smoothstep(scrolled / e.clear)         // arrived when s ≥ 1: clear the transform
rest  = stageRect.top + box.offsetTop          // where the box RESTS (offsetTop is untransformed)
room  = max(0, innerHeight − (pin + e.clear))
h     = room / (e.keep − e.sky)                // plate height with keep above the fold, sky behind the copy
if (pin + e.clear − e.sky × h < rest)          // the sky no longer fits above rest:
    h = max(0, innerHeight − rest) / e.keep    //   re-solve anchored at rest
h     = min(h, e.zoom × boxH, (e.max / boxW) × boxH)   // compositional and resolution ceilings
h     = max(h, boxH × e.min)                   // the scale floor
k     = h / boxH
top   = pin + e.clear − e.sky × h
dy    = max(0, top − rest)                     // only ever holds the plate LOWER, never lifts it
transform = translateY((1 − s) × dy) scale(k + (1 − k) × s)
```

Why each clamp exists, because each was earned:

- **The two-solve fallback is not an optimization.** Solving only the first and
  letting a clamp move the result breaks the one promise this exists to keep:
  at 2560×1300 the first solve wants a plate whose sky alone (727 px) exceeds
  the room above it, and clamping lands the desk 96 px *below* the fold.
- **The floor (`--hb-entry-min`, 0.25) prevents a mirror, not a small plate.**
  On a viewport shorter than the copy needs, `room` is negative, the scale goes
  negative with it, and a negative scale *reflects* the box about its origin —
  the plate draws mirrored, entirely off screen, and the hero reads as blank. A
  landscape phone (667×375: 303 px under the header) is the case that finds it.
- **`dy ≥ 0`** is what makes a below-the-fold mount safe: with the plate resting
  below the pin, an unclamped shift would haul it up over the content above.
- **`--hb-max` caps the drawn width, not just the box.** 2880 px is 1.8× the
  1600 cut — the measured point past which the entry is visibly soft. Raising it
  without a wider cut only blurs the entry, and the sequence masters are not in
  the repository, so a wider cut means new renders.
- **`--hb-entry-zoom`** is the host's compositional limit (how far past
  edge-to-edge to crop the sides); it is floored at 1 because content spans
  plate x 0.000–0.999. This page requests 2 above 991 px and the other ceilings
  grant between 1.07 and 1.51.

**The exchange rate.** The entry is solved from the room under the copy divided
by `keep − sky = 0.174`, so one pixel of copy height costs 5.75 px of picture.
Budget `--hb-entry-clear` accordingly; if the plate enters small, fix the copy.

**The arch drop** is static CSS, not script. When a host pins copy over the
plate, the *finished* bridge must land below it, and the arch tops out above
both objects — so clearing the furniture does not clear the bridge. The
stylesheet solves `--hb-arch-clear` (the host's ask) into a margin:

```
--hb-arch-drop = clamp(0,
    --hb-arch-clear − --hb-slack − --hb-arch × plateH,
    max(0, screenH − --hb-slack − --hb-entry-keep × plateH))
```

The ceiling is `--hb-entry-keep`'s promise: pushing the plate down spends
exactly the thing the entry protects. The drop is a **margin** on the box —
margins are in `offsetTop`, which is how the entry solve learns about it with no
script, and margins contribute layout, which is why the stage's height formula
adds the drop (a plate pushed 244 px down would otherwise overhang the stage and
paint over the next section at release).

---

## 5. The exit, and the host's half of it

While the stage is pinned the picture does not move; the instant it is not, it
moves at page speed. That step is 0 to 1 in a single frame — position is
continuous, velocity is not, and the eye reads velocity — so the release used to
read as the hero being yanked off screen. The ramp blends the two across a
window of `--hb-exit` on **either side** of the release:

```
a = exitSpan                        // the half-window, in px
s = scrolled − span                 // 0 exactly at the release; window is (−a, a)
U = (s + a) / (2a)
G = 2a × (U³ − U⁴/2)                // the integral of smoothstep
T = max(0, s) − G                   // the transform, written as translateY(T)
```

Properties that make it correct, each load-bearing:

- **T = 0 at both ends** — nothing to unwind, no transform outside the window.
- **At the release, T = −0.1875a** and the picture already moves at half page
  speed, so the moment the sticky releases is the moment nothing happens.
- **T is never positive**: the picture leads its natural position, never trails
  it. It cannot trail — the next section sits only the host's padding below the
  plate's bottom, and a lagging picture would be run into.
- **The halves must be equal.** For T to return to zero, the velocity curve's
  mean across the window must equal the post-release half's share, and for a
  monotone S-curve that holds only for equal halves. Weight it either way and
  the jar moves rather than goes.
- **Smoothness is a number, not a yes/no.** Peak rate of velocity change is
  `0.75 / a`: a reader scrolling *V* px per frame sees a step of `0.75 V² / a`.
  At a = 180 px and V = 60 that is 15 px (shipped first, still read abrupt); at
  405 px it is 7 px. If the release feels wrong, raise `--hb-exit`, not
  `--hb-hold`.
- The transform goes on the **stage**, not the box — the entry owns the box —
  and is written to **two decimals**: quantizing a curve the eye differentiates
  to 0.1 px puts a floor under the frame-to-frame change of the same order the
  ramp exists to remove.

**The host's copy must ride the same curve, and release on the same pixel.**
The element writes the ramp's transform to every element named by its
`exit-with` attribute. Naming is not enough on its own: the named copy must
also *stop being pinned* at the same scroll the stage does, which the host
arranges in its own stylesheet. On this page:

```
[data-hero-copy] { bottom: calc(100% − band − scrub − hold − exit
                                − gap − h1Height − h1BottomMargin); }
```

Percentages resolve against the section, so that expression *is* the element's
release point with no plate geometry restated. Two measured gotchas: sticky is
constrained by the **margin** box, so omit the heading's bottom margin and the
headline releases 24 px early; and the heading's height cannot be derived at
that point in CSS, so it is a declared number with its own wrap breakpoints.

**The copy overlay contract** (all four load-bearing):

1. The headline is a direct child of the overlay, a sibling of the body wrapper
   — sticky holds an element only within its containing block.
2. No element between the overlay and the headline carries a `transform` — a
   transformed ancestor becomes the containing block and kills the pin.
3. The overlay spans the hero with `pointer-events: none`, handing events back
   to its children; the body's dissolve ends at `pointer-events: none` too, so
   invisible buttons are not clickable.
4. The whole arrangement sits inside `@supports (animation-timeline: scroll())`
   and `@media not (prefers-reduced-motion: reduce)`; the fallback is copy that
   simply scrolls away, and nothing is ever stranded at `opacity: 0`.

---

## 6. Loading and residency

The element fetches `manifest.json` from `base`, filters the frame list to
`[from, to]`, and refuses to animate a list shorter than two. Frames are fetched
with `fetch` + `createImageBitmap(blob, { colorSpaceConversion: 'none' })` —
the frames are view-transformed sRGB with no ICC profile, and a conversion here
would apply a transfer function twice.

**The resident set is ranked and paid for, not windowed.** Every frame is
ranked by distance from the playhead, biased forward (a frame behind costs 2.5×
its distance — reading is a downward act); the byte budget is spent down the
ranking; two frames are always kept whatever the budget says, so a starved
budget degrades to stutter, never to a blank hero. Decoded cost is
width × height × 4: 7.2 MiB per full-cut frame, 4.0 MiB on the mobile cut. The
budget comes from `--hb-budget` in the stylesheet (the attribute is only the
fallback): the desktop default resolves to 96 MB, phones set 48 — a ceiling
alone buys *more* frames when each gets cheaper, so the phone's number is set
lower on purpose.

**Four requests in flight, and that constant is the real constraint.** Measured
on a reading scroll at 1440×900: doubling the budget to 192 MB widened the
window from 14 to 28 frames and cut misses from 57% to 27% — but the
substitutions that remained landed 6.7 positions from the wanted frame instead
of 3.0, because the same four slots spread over twice the requests deliver the
near frames later. Cheaper frames are the fix, not a bigger budget.

**Fetch in rank order, head first.** The hero is the first thing on the page;
nothing above it exists to preload against. The approach is its runway: a
screen of scroll in which the plate is on show but only the first frame is
wanted, so the window fills four-at-a-time before the scrub asks for anything.
Measured cold at 1440×900, counting only paints where the scrub advances:
19.5% of ticks wanted a non-resident frame before the approach existed, 4.2%
after, and the remaining substitutions land 1.29 positions away instead of
4.03.

A missing frame is covered by the nearest resident one (at or before, then
after); a failed fetch is never retried — a one-frame substitution beats a
retry loop. A missing manifest means the still simply stays.

---

## 7. Responsive behavior and degradation

- **The cut follows the stylesheet.** `--hb-variant` flips to `"m"` at
  ≤ 991 px; the element re-reads it on resize, and a flip evicts everything,
  strands in-flight requests (generation counter), and lets the canvases keep
  their last frame while the new width arrives — briefly stale beats briefly
  blank.
- **Three degradation signals, evaluated separately, never merged**: reduced
  motion (a preference), Save-Data / 2G / 3G (a bandwidth preference — the
  played span is 5.8–9.1 MB and a smaller tier is not an answer to "less
  data"), and `createImageBitmap` support (a capability). Any of them leaves
  `data-hb-motion="off"`.
- **Static mode is the default markup state**, so a page whose script never
  runs renders it: height auto, no pin, the still in flow — below one screen of
  top **padding**, which is the room the copy overlay needs. Padding and not
  margin: a top margin collapses out of the section and takes the copy overlay
  down with it. The arch-drop margin and the centring slack are zeroed in the
  same block, because with scripting off the copy is in flow above the still
  and 240 px of drop would be blank page.
- **The still holds until a real frame has been drawn** (`data-hb-ready`), then
  hides by `visibility`, not `display` — the swap is a paint, never a reflow,
  and the still remains the LCP element.

---

## 8. The decisions that look arbitrary and are not

Read before simplifying. Each produces a hero that looks approximately right
and is subtly broken if changed.

### 8.1 The stage takes the plate's height, and nothing ever clips the plate

The plate is 1.4302:1 edge to edge — taller than any desktop screen. The
previous rig clipped it to a screen-tall stage with `overflow: hidden`, which
looks identical while pinned (the cut sits on the fold, where nobody can see
it) and then walks a hard horizontal line up through the ground shadow the
moment the stage releases. Cropping by the **viewport** is invisible; cropping
by a **box** is an edge. So the stage is the plate's own height, the bottom of
the picture is simply below the fold while pinned (18% at 1440×900, 25% at
1920×1080), and scrolling on reveals it whole. Do not add `overflow: hidden`
*or* `overflow: clip` to the stage as a tidy-up — and note the host must
still clip **sideways** at the page wrapper (`overflow-x: clip`, never
`hidden`, which creates a scroll container and breaks the sticky), because the
entry can scale the plate wider than the viewport.

### 8.2 The box scales about its top edge

Anchoring the bottom to the fold forces the whole plate between the copy and
the fold: 458 px for a 1007 px picture at 1440×900 — a 45% postage stamp.
Anchoring the top lets the plate run off the bottom, which costs nothing (the
viewport crops it invisibly) and buys the full edge-to-edge width.

### 8.3 Two canvases under `plus-lighter`, inside `isolation: isolate`

Drawing both frames into one canvas at partial alpha squares the outgoing
frame's contribution, so everything the frames share — most of the picture —
sags to 75% opacity mid-transition. Two layers cross-faded by opacity under
`mix-blend-mode: plus-lighter` sum to exactly the in-between frame. The fade
earns its place at this stride: frames are every third of a 30 fps render, 0.1 s
apart, and a hard cut between them reads as judder. `isolation` makes the pair
their own blending group; without it `plus-lighter` blends against the page and
blows out to white. The hero's own reveal wrapper animates opacity — one of the
ancestor patterns that breaks the blend — and the isolation is what contains
the group against it.

### 8.4 The bottom 4% is masked, on the box, after the blend

The render's last row carries the ground-shadow plane at alpha 2.4/255 — on the
page color, a step from 250.6 to 253.0 across the full screen width that walks
up the viewport as the hero leaves. The mask feathers the bottom 4%: below the
desk's feet (y 0.94), touching no object, 0.06 alpha levels per pixel — beneath
what any display resolves. It sits on `[data-hb-box]` so it applies **after**
the two canvases blend; masking the layers separately fades each contribution
before `plus-lighter` adds them, a different picture during every cross-fade.
Only the bottom: the top row measures alpha 0.01, and the sides carry artwork
to the edge.

### 8.5 The `@property` registrations are load-bearing

Seven custom properties are registered so `getComputedStyle` resolves their
`calc()` to real pixels; an unregistered property hands back its token text.
Strip the registrations and the element falls back to defaults nobody chose.

### 8.6 Both heights are declared; the budget is never padding

A sticky box is constrained to its parent's **content** box. Move the scroll
budget into padding and the stage's sticky range is zero: the hero never pins
and simply scrolls past, with no error anywhere.

### 8.7 The plate's resting offset is a margin

Not a `top`, not a transform. A margin is in `offsetTop` — which is where the
entry solve reads the resting position, untransformed, so the calculation can
never feed on its own output — and a margin contributes layout, so the stage's
height genuinely accounts for the drop.

### 8.8 Cache and framework safety

The drawn-frame tag lives on each canvas (`data-f`, including the cut), never
in the instance; the ready flag, the tags, and the entry transform are all
cleared on boot. A full-page cache serializes the DOM, and any of the three
left standing hands the next visitor a hero that trusts state it does not have.
Boot itself is not a one-shot: a host framework can insert the element empty
and fill it later (React does), so missing markup is watched for rather than
given up on, and the `data-hb-motion` attribute is re-asserted through a
MutationObserver because a framework's commit can reconcile it away. A
generation counter strands in-flight requests across boots, stops, and cut
flips.

### 8.9 `svh`, never `dvh`

The budget is derived from the element's height; `dvh` changes as mobile
browser chrome retracts, and a budget that moves mid-gesture snaps the scrub.

---

## 9. Traps

- **9.1 Frames are addressed by string concatenation.** No literal filename
  exists in any markup, so pipelines that rewrite or fingerprint by scanning
  HTML miss all 132 files. Reproduce the repository's manifest-versus-disk
  check.
- **9.2 Shipping one cut without the other is a phone-only failure.** Desktops
  never request the `m` files.
- **9.3 `from`/`to` are content decisions**, not trim. See section 2.
- **9.4 Do not put the page's reveal mechanism on the copy overlay.** It latches
  `opacity` to 1 on a timer and its transition smears every scrubbed value the
  overlay's own animation writes.
- **9.5 `exit-with` resolves once, at boot, against the document** and holds
  elements, not the selector. A host that replaces its copy must re-mount the
  element.
- **9.6 `base` must be a single quoted attribute value ending in `/`.**

---

## 10. Accessibility

- The still carries the section's one description in its `alt`; both canvases
  are `aria-hidden`. The copy is the host's and is real text.
- Reduced motion renders the still in normal flow — no pin, no blank screens —
  and skips every fetch: 5.8–9.1 MB of frames are never requested.
- The reduced-motion guard on the *copy* animation lives in the host's CSS, so
  the same preference stills both halves.

---

## 11. What is deliberately not required

No scroll library, no framework, no build step, no design tokens
(`hero-bridge.css` is host-agnostic), no video element (seeking is not
frame-accurate across browsers). The host supplies: the frame directory, the
markup, `--hb-pin`, `--hb-entry-clear`, and — if it pins copy over the plate —
`--hb-arch-clear`, the overlay contract in section 5, and the sideways clip.

---

## 12. Rebuilding it natively

If the target stack can serve two files and a directory, install the component
instead; this section is for the case where it cannot run.

1. Ship the static state first: the still in flow with one screen of clearance
   above it. This is a complete design and the correct floor for every further
   step.
2. Implement progress and frame selection per section 3, painting per
   section 8.3 (two layers, `plus-lighter`, isolation) with the mask of 8.4.
3. Implement the entry per section 4 — including every clamp — and the exit per
   section 5, including the host-side release arithmetic.
4. Implement loading per section 6: rank, budget, four in flight, head-first,
   nearest-frame substitution, generation counter.
5. Keep the three degradation signals separate, and gate every fetch on the
   motion decision.

### Verification

1. At 1440×900, scroll through: the copy leaves and the plate rises as one
   move; the scrub starts the instant both finish; the arch closes and holds
   before the release; the release is a ramp, not a snap.
2. Check the seam: the arch must not change color mid-scrub (the played span is
   right) and no horizontal line may cross the picture as the section leaves
   (nothing clips; the bottom mask is in place).
3. At 390 px, the network panel shows only `…m.webp`; at 1440, none.
4. Landscape phone (667×375): the plate is small but present — never mirrored
   or absent.
5. Reduced motion, Save-Data, and scripting off each show the finished still in
   flow with the copy above it, and the network panel shows no frame requests.
6. Instrument the paint loop and count ticks that wanted a non-resident frame;
   compare against the measured 4.2% baseline before changing any budget.

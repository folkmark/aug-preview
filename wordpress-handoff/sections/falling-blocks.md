# The falling-blocks CTA — build spec

This document is a complete description of the closing call-to-action, written
so the section can be rebuilt in another stack **without the packaged element**.
The normal path is the `<falling-blocks>` component — copy
`assets/falling-blocks.js`, `assets/falling-blocks.css`, the frame directory,
and the markup, per [the handoff README](../README.md). This document exists
for the other case: the element cannot run in the target stack, or someone has
to change how it behaves. Sections 3 to 5 are then the specification, and
section 6 is the part that is expensive to rediscover.

**Audience.** The developer installing, modifying, or reimplementing the
section. Read [the handoff README](../README.md) first for the rules shared by
all components.

**Where the numbers come from.** Every value here is read from the shipping
files — `assets/falling-blocks.js`, `assets/falling-blocks.css`,
`assets/falling-blocks/manifest.json`, the CTA block in `index.html` — or from
the measurements recorded beside them.

---

## 0. The short version

Two depth plates of tumbling toy blocks sandwich the closing copy: the far
plate behind everything, the near plate in front of the heading and behind the
body and buttons. The stage pins for 140svh while the blocks rise through and
past the copy. Three files and a directory:

| | |
|---|---|
| `assets/falling-blocks.js` | ~650 lines, no dependencies, defines `<falling-blocks>` |
| `assets/falling-blocks.css` | ~140 lines, the sandwich and the tiers |
| `assets/falling-blocks/` | 48 frames × 2 layers × 2 tiers (192 files) + `manifest.json` |

Frame 1 is the designed composition, so the still state is deliberate rather
than degraded: with scripting off, under reduced motion, or on Save-Data the
section is one screen showing the frame-1 stills with the copy centered.

**If the element cannot run at all**, ship exactly that state.

---

## 1. What the section is

**The sandwich is the design.** The near plate passes in front of the heading
and behind the body and the buttons — the two things that must stay readable
and clickable — because a heading is large enough to read through a block
crossing it and body copy is not. The ordering is by z-index, not DOM order, so
the element never moves authored nodes:

| Layer | z-index |
|---|---|
| `[data-fb-layer="bottom"]` (far and mid planes) | 1 |
| The heading inside `[data-fb-copy]` | 2 |
| `[data-fb-layer="top"]` (near plane) | 3 |
| `[data-fb-front]` (body, buttons) | 4 |

**The motion is defined by the content bounds, not the plate edges.** Each
layer records where its blocks actually sit as fractions of the plate's height
(measured by the encoder, printed on every run):

| Layer | Content bounds | Speed |
|---|---|---|
| `bottom` | 0.273 – 0.700 | 1 |
| `top` | 0.183 – 0.775 | 1.25 |

At rest, the plate is placed so the **top of its content** sits on the stage's
bottom edge — the blocks are just below the fold and rise into view. At the
end, the **bottom of its content** sits on the stage's top edge — they have all
left. The plate's own edges may cross the stage freely (a transparent region is
indistinguishable from no plate); a block cut by the frame edge must never
appear, which is why the far plate's lowest group is trimmed at encode time.

`speed` multiplies that minimum travel: 1 means the layer's last block leaves
exactly as the pin ends; above 1 it leaves earlier and the plate keeps rising
empty, which is what makes the near plane clear the frame before the far one —
the parallax. Below 1 strands blocks on screen and is never right.

The blocks also **tumble**: the frame index advances `revolutions × 48` frames
across the pin (0.6 revolutions on this page). Frame 48's successor is frame 1
with a seamless wrap, so at `revolutions ≥ 1` the loop is circular.

---

## 2. The frame contract

**Naming.** `w<tier>/<layer>/fb<0001–0048>.webp` — for example
`w1440/top/fb0007.webp`. Indices here are sequence positions (1-based), not
Blender numbers; the manifest records the master size, encoder settings, and
per-tier byte totals.

**Two tiers, both layers, all 48 frames:**

| Tier | Frame size | Total | Who gets it |
|---|---|---|---|
| `w1440` | 1440 × 2160 | 3.4 MB | > 900 px wide and > 500 px tall |
| `w720` | 720 × 1080 | 1.5 MB | ≤ 900 px wide **or** ≤ 500 px tall |

The stylesheet picks the tier (`--fb-tier`) and the element reads it back, so
the breakpoint that changes the layout is the one that picks the file. The
short-viewport arm catches large phones in landscape — an iPhone Pro Max is
926 CSS px wide rotated and was measured scrubbing the 1440 tier there.

> **Note: the phone tier exists because the arithmetic forces it.** A 1440
> frame *pair* decodes to 23.7 MiB regardless of file size, so a 128 MB budget
> holds five frames of forty-eight — and on a throttled phone, every draw
> during a scroll wanted a frame that was not decoded yet. At 720 the same
> budget holds twenty-one and each decode costs a quarter: the difference
> between the tumble playing and it juddering between stale frames.

**Both layers are trimmed to the same output height at encode time.** A
difference there puts the two depth planes out of registration; the encoder
fails the build on it. Re-render the plates and the content bounds change; take
the new ones from the encoder's output.

---

## 3. The scroll math

```
stick = computed top of [data-fb-stage]      // the sticky offset, from the stylesheet
span  = element.offsetHeight − stage.offsetHeight
if (span < 1) span = element.offsetHeight    // unpinned: the budget is the travel itself
p     = clamp01((stick − rect.top) / span)
```

**Cover-fit, computed once for both plates:**

```
plateW = max(stageW × fill, stageH × (2560/3840) × 1.35)
plateH = plateW × 3840 / 2560
```

`fill` is `stage-fill` (0.93 on this page — the share of the viewport the desk
artwork occupies further down the page). The 1.35 is `1 + HEADROOM`: the plate
is deliberately oversized past the stage so it always has somewhere to travel.
Without the headroom, a stage taller than 1.5× its width covers exactly and the
fall silently stops with no visible symptom. The two values are written to the
stage as custom properties both layers read — the registration of the two depth
planes is structural, not two code paths agreeing.

**Travel, per layer, strictly linear:**

```
y0 = stageH − c0 × plateH          // content top resting on the stage's bottom
y1 = −c1 × plateH                  // content bottom level with the stage's top
translate3d(0, y0 + p × (y1 − y0) × speed, 0)
```

> **Warning: no easing, anywhere on this path.** Progress is linear in scroll
> and the travel is linear in progress. Anything that shapes the curve reads as
> the blocks speeding up and slowing down for no reason the visitor can see,
> which is worse than no motion at all.

**Tumble, independent of travel:**

```
want = floor(p × revolutions × 48) mod 48
```

Index and travel are two independent functions of one progress value; never
derive one from the other. Below one revolution the wrap is unreachable, so the
playhead's world is a linear strip of `floor(revolutions × 48) + 1` frames —
which has two consequences worth keeping: frames past the strip are never
fetched (at 0.6 revolutions that is 40% of the directory's bytes, pure cost
otherwise), and scroll direction on the strip is plain comparison, because the
shortest circular path is a lie there and would point the prefetch window away
from the scroll.

---

## 4. Loading and residency

Frames are fetched with `fetch` + `createImageBitmap(blob,
{ colorSpaceConversion: 'none' })` (the frames are view-transformed sRGB with
no profile; converting would apply a transfer function twice).

- **The window follows from the byte budget** (`--fb-budget` from the
  stylesheet; 128 MB default, 48 on the phone tier): `win = budget ÷ (frame
  bytes × 2 layers)`, floored at 4. Raising the encoded width shrinks the
  window automatically instead of silently multiplying memory.
- **A frame is drawable only when both plates hold it**, so requests go out
  **frame-major**: both plates of frame *i* before either plate of *i + 1*.
  Layer-major filling spends the whole warm-up with a full far plate, an empty
  near one, and not one drawable frame.
- **One window definition, shared by retention and requests.** The window is
  25% behind the head, 75% ahead, reallocating unusable forward room to the
  back near the strip's end. Retention and requesting used to disagree by a few
  frames, and the frames in the difference were fetched, decoded, closed, and
  re-requested forever: measured on a phone parked on the section doing
  nothing, **1.01 MB per second, indefinitely**, from a directory of 1.41 MB.
  If retention and requesting are ever two computations again, that loop comes
  back.
- **Substitution is circular-nearest and always the same index on both
  plates.** Substituting per layer de-registers the two depth planes of one
  camera view — the one artefact the eye catches immediately.
- Four requests in flight; no `AbortController` (aborting discards bytes
  already paid for — a frame that leaves the window mid-flight closes itself on
  arrival, costing one decode and no network); a failed fetch is never retried.
- An IntersectionObserver at 150% margin gates residency; leaving the viewport
  frees everything but the drawn frame after 2 s, and a hidden tab does the
  same after 4 s — a backgrounded tab holding this much decoded image is
  exactly what iOS discards. The bytes stay in the HTTP cache, so re-priming
  costs decode, not network.

---

## 5. Responsive behavior and degradation

- **Tier flip** (resize across 900 px / 500 px): everything held is the wrong
  picture. Free all bitmaps, bump the generation to strand in-flight decodes,
  and reopen the drawn-frame memo — the canvases keep their last frame until
  the first new-tier bitmap lands, so a plate is only ever briefly stale,
  never blank.
- **Degradation signals, evaluated separately, never merged**: reduced motion,
  viewport below `min-width` (an attribute; this page sets 0, so the element
  animates at every width and the tier does the adapting), Save-Data / 2G / 3G
  (the small tier makes the motion affordable to *decode*, not to *download* —
  someone who asked for less data gets the still), and
  `createImageBitmap` / `IntersectionObserver` support.
- **Static mode** (`data-fb-motion` not `"on"`, which is also the pre-boot and
  no-JS state): the element collapses to one screen, the canvases hide, and the
  frame-1 `<img>` stills cover the stage at `object-position: 50% 38%` — biased
  above center because both plates carry their blocks in the upper-middle band.

---

## 6. The decisions that look arbitrary and are not

- **6.1 `[data-fb-copy]` is positioned but carries no z-index.** That makes it
  a containing block without making it a stacking context, so the heading and
  `[data-fb-front]` inside it resolve against the stage and can sit on either
  side of a plate. Give it a z-index — or an animating opacity, which creates a
  stacking context the same way — and the whole copy collapses to one layer
  with the near plate over all of it. This is why the copy carries no
  `data-reveal`.
- **6.2 The heading hook in the component stylesheet is `h1`.**
  `falling-blocks.css` slots `[data-fb-copy] h1` between the plates at
  z-index 2. This page's CTA uses an `h2` and adds the equivalent rule in its
  own stylesheet. A host whose heading is any other level must do the same, or
  the near plate passes in front of the body too and the sandwich collapses to
  "plate over everything but `[data-fb-front]`".
- **6.3 The stage has `overflow: hidden` and `contain: layout paint`** —
  unlike the hero's stage, this one clips on purpose: the plates are oversized
  and absolutely positioned, nothing outside the stage should ever paint, and
  the containment also makes the stage the stacking context the sandwich's
  z-indexes resolve against, and keeps arriving frames from shifting layout.
- **6.4 The canvas backing store is the source frame's size, never
  display × DPR.** It changes only when the tier does, which changes the
  drawn-frame tag in the same breath, so the clear that assigning `width`
  performs can never strand a stale tag. `drawImage` is then 1:1 with no
  resample and the compositor upscales for free. A DPR-scaled store on a
  1920 stage would cost 95 MiB for the pair before one frame was resident;
  this costs 19.
- **6.5 A frame commits only when every plate painted it.** Committing before
  the loop makes one missing bitmap permanent: the next tick reads "already
  drawn" and returns early, and the plates stay blank however long the frame
  takes to arrive. It is also what keeps both depth planes on one index.
- **6.6 Cache and framework safety.** The drawn-frame tag lives on each canvas
  (`data-fbf`, including the tier) and the cover-fit memo on the stage
  (`data-fb-box`), never in the instance — a framework can swap the nodes —
  and both are cleared on boot, because a full-page cache serializes them and
  a freshly parsed canvas that claims to be drawn stays blank for good. Boot
  watches for late-arriving markup; the `data-fb-motion` attribute is
  re-asserted through a MutationObserver; the plate transforms are written
  every tick rather than on change, because a host re-render wipes inline
  style and a change guard would park the plates at zero.
- **6.7 `svh`, never `dvh`, for the element's height** — the budget must not
  move as mobile browser chrome retracts.

---

## 7. Traps

- **7.1 Frames are addressed by string concatenation** — no literal filename
  exists in the markup beyond the two stills. Pipelines that rewrite URLs by
  scanning HTML miss 190 of 192 files.
- **7.2 Shipping one tier without the other is a phone-only failure**; a
  desktop never requests `w720`.
- **7.3 Keep the `<img>` stills and keep them `loading="lazy"`.** They are the
  no-JS and reduced-motion fallback; lazy is what stops the animated path from
  paying for them, because an image with no layout box is never near the
  viewport.
- **7.4 `base` must be a single quoted attribute value ending in `/`.**
- **7.5 The pin length is the element's height minus one screen.** Make them
  equal and nothing pins — the copy scrolls away while the blocks move, which
  is a legitimate configuration but probably not the intended one.

---

## 8. Accessibility

- Both plate layers are `aria-hidden`; the copy is real text in the light DOM,
  readable and clickable through the sandwich by construction.
- The stills give the static path a real LCP element instead of a canvas.
- Reduced motion collapses the section to one screen — nobody scrolls past two
  empty screens to reach the next section — and skips every frame fetch.

---

## 9. What is deliberately not required

No scroll library, no framework, no build step, no design tokens. The host
supplies: the frame directory, the markup, `--fb-sticky-top`, the element's
height, and the heading-level rule from 6.2 if its heading is not an `h1`.

---

## 10. Rebuilding it natively

If the target stack can serve two files and a directory, install the component
instead; this section is for the case where it cannot run.

1. Ship the static state first: one screen, frame-1 stills covering it, copy
   centered. It is the designed composition.
2. Build the sandwich exactly per section 1's z-index table, honoring 6.1 and
   6.2.
3. Implement the math per section 3 — cover-fit with headroom, linear travel
   from the content bounds, independent tumble.
4. Implement loading per section 4, keeping retention and requesting as one
   window definition.
5. Keep the degradation signals separate and gate every fetch on the motion
   decision.

### Verification

1. At 1440×900, scroll through: the copy holds for the whole 140svh pin; the
   near plate crosses the heading and never the body or buttons; the near
   plane clears the frame before the far one; no block ever shows a flat edge
   cut by the frame.
2. The motion is strictly linear — no perceptible acceleration anywhere.
3. At 390 px the network panel shows only `w720/`; at 1440 only `w1440/`.
4. Park on the section without scrolling and watch the network panel for a
   minute: after the window fills, it must go **silent** (the 1.01 MB/s loop
   regression check).
5. Reduced motion, Save-Data, and scripting off each show one screen of
   frame-1 stills with the copy readable, and no frame requests.

# The Approach section — build spec

> **Status: not currently on the page.** The scrub was replaced by a still in the
> hero and the R&D cycle wheel in the approach section. The component and its frames
> are kept for the shortened sequence that replaces it, and everything below still
> describes them accurately — but the page as it ships today does not mount it.

**What this is.** A complete description of one section of the AugmentED home page, written
so it can be rebuilt in another stack without reading the original source. Every number here
is read from the files that ship — `assets/approach.js`, `assets/approach.css`,
`assets/approach/manifest.json`, `tools/encode-approach.mjs` — not estimated.

**Read this with [`docs/approach-render-map.md`](../../docs/approach-render-map.md).** That document maps Blender frame
numbers to the beats and messages they carry, and is the source of every frame number below.
This one describes what the page does with them.

**The format is meant to be reused.** Sections 1–9 below are a template: what it is, the
asset contract, the maths, the responsive states, the decisions that look arbitrary, the
traps, accessibility, and what is deliberately not required. The hero section can be
documented the same way.

---

## 0. The short version

A scroll-scrubbed image sequence. The section is 1000vh tall on desktop (600svh on phones);
a stage pins inside it and stays put while the page scrolls past; the scroll position picks a
frame. Four blocks of copy fade in and out in time with it.

It is **three files and a directory**:

| | |
|---|---|
| `assets/approach.js` | ~550 lines, no dependencies, defines `<approach-scrub>` |
| `assets/approach.css` | ~130 lines, all the geometry |
| `assets/approach/` | 240 WebP frames + `manifest.json` |

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

| Segment | Runs to | Copy shown | Picture |
|---|---|---|---|
| 0 — opening | 91 | *(none)* | Two bare desks. The sequence's first frame, held |
| 1 | 93 | **Define the role.** | The desks barely touched, the gap empty |
| 2 | 265 | **Build the capabilities.** | Books and blocks fall, the blueprint arch draws itself, the first solid block lands |
| 3 | 565 | **Co-design the applications.** | The finished arch, every block marked with a force annotation |
| 4 | 604 | **Test, learn, begin again.** | The first book being lowered onto the span |
| 5 — coda | 672 | *(beat 4's copy, held)* | Two books come to rest on the keystone |

**Every beat is keyed to an event, not to even spacing.** That is why the numbers look
arbitrary, and it is the thing to preserve:

| Beat | Why that frame |
|---|---|
| 91 | The first frame the WebP archive holds. A hard floor, not a choice. |
| 93 | Chosen: the copy leads the picture rather than following it. |
| 265 | `BRIDGE_v1` starts — the first solid block falls into the blueprint outline. |
| 565 | The AR force-chevrons come on. Measured against the plates, not in the render map: 562 is clean, 565 carries the first marks. |
| 604 | The first book is placed. Frame-to-frame change spikes 25× here. |

Note what beat 1 costs. The fall from 91 to 265 — books, cubby contents, blocks, then the
blueprint — is no longer a copy-free opening run, because beat 1's copy lands at 93, before
any of it. The fall plays under beat 2's move instead. That is deliberate.

The coda holds beat 4's copy rather than clearing it: the books coming to rest are that
line's payoff, not a separate thought.

**The opening is a run, not a still.** Segment 0 travels from the first encoded frame to
the first beat, exactly as every later segment travels from the previous beat to its own.
It plays if — and only if — the encoder put frames in front of the first beat; where a
sequence starts *on* its first beat the travel is zero and the opening degenerates to a
still hold, with no special case anywhere in the code.

**This section is currently that second case.** Its first beat is frame 91, which is also
its first encoded frame, so segment 0 is a still hold and the fall onto the desks plays
under beat 2's move instead. Move beat 1 later and the opening becomes a run again on its
own — the mechanism is still there, it just has nothing to travel right now.

---

## 2. The frame contract

**Naming.** `ap<frame><cut>.webp` — `ap0353.webp`, `ap0353m.webp`. The number is the
**Blender frame number**, zero-padded to 4, so the file on disk, the timeline marker in the
render map, and the manifest all name the same thing. Do not renumber them sequentially; the
link back to the render is the point.

**Two cuts of every frame.**

| Cut | Suffix | Beats | Moves | Who gets it |
|---|---|---|---|---|
| Full plate | *(none)* | 2048 × 1432 | 1600 × 1119 | Desktop stage (≥ 992px) |
| Crop | `m` | 1147 × 888 | 768 × 595 | Mobile band (≤ 991px) |

Squarish desktop windows fetch **neither** — they take the static fallback, see §5.

**Which frames exist.** The six beats, plus every 5th frame from 91 to 672 — **122 frames**,
244 files. Beats are fixed by the render; the in-between list is whatever the encoder made.
Nothing in the page hard-codes it: `manifest.json` is written by the encoder and read at
runtime, so the page cannot ask for a frame that was never produced.

The stride grid is **anchored on the first beat and grown outward in both directions**, not
counted up from the first frame. Both give the same spacing, but counting up from the start
renumbers every file the moment the in-point moves.

```jsonc
{
  "frames": [92, 97, 102, …, 672],     // every frame that exists, ascending
  "beats":  [91, 93, 265, 565, 604, 672],
  "stem": "ap", "pad": 4, "ext": "webp",
  // w/h are a *beat* frame; moveW/moveH are a move frame. Both are needed — the page
  // budgets decoded memory per frame, and a beat costs 1.6x a move on the full cut and
  // 2.2x on the crop. See 6.8.
  "cuts": {
    "":  {"w":2048,"h":1432,"moveW":1600,"moveH":1119},
    "m": {"w":1147,"h":888, "moveW":768, "moveH":595}
  },
  "crop": {"left":426,"top":0,"width":1147,"height":888}
}
```

**Encoding.** Beats and moves are encoded differently *on purpose*, and this is what keeps a
120-frame sequence affordable:

| | Source | Size | Quality | Alpha quality |
|---|---|---|---|---|
| **Beats** (6) | lossless PNG *if one exists*, else the archive | native | 88 / 86 | **100** |
| **Moves** (116) | q90 WebP archive | 1600 / 768 wide | 70 | **70** |

Only one of the six beats still has a lossless plate — the beats moved to follow the
animation and the renders did not follow them. The other five come from the q90 archive,
which was measured rather than assumed: at quality 88 an archive-sourced beat lands at
**46.1 dB** against the lossless master, where the old PNG-at-82 path managed **45.3**.
The extra 13 KB a beat is the whole price.

The beats are what a visitor actually dwells on — they sit motionless under copy for a
screenful of scrolling — so they take no second lossy generation and no downscale. The moves
are only ever seen in passing.

> **Do not economise on the move size the way this first did.** Moves went out at 896 / 512,
> which is 44% of the beat's linear resolution rendered into the *same box on screen*. The
> section then snapped between a sharp hold and a soft move at every beat, and because that
> lands on the transition it reads as a property of the motion rather than of the file.
> Against the 2048 master a move costs 23/31/35/42/47 KB at 896/1152/1280/1440/1600 wide, and
> the difference from native closes around 1600 while 2048 doubles the decoded cost for a
> difference that needs a crop tool to see. The mobile figure is lower on purpose: the band
> renders about 390 CSS pixels wide, so 768 is 1:1 on a 2x phone, and bandwidth is scarcest
> on the device with the smallest picture.

**What that costs**, for the whole 120-frame sequence:

| Cut | Beats | Moves | Total |
|---|---|---|---|
| Full plate | 693 KB (6) | 5.58 MB (116, ~49 KB each) | **6.25 MB** |
| Crop (`m`) | 357 KB (6) | 3.70 MB (116, ~33 KB each) | **4.05 MB** |

A browser fetches **one cut, never both**, and only once the section is within **1.25
viewport heights** — so this is not page-load weight. It streams in during the scroll,
beats first, so every hold reads correctly even mid-download; on a throttled 3G connection
with a brisk scroll the first beat is an approximate neighbouring frame rather than a blank
stage.

> **That 1.25 is coupled to what sits above the section, and nothing enforces it.** The gate
> is "start loading when the section's top is within `near` × viewport heights". If whatever
> precedes the section is taller than that, the gate is satisfied while the page is still at
> rest and there is no laziness at all. This is not hypothetical: the hero above it grew to
> 290vh, and with the old default of 3 a phone fetched **the entire sequence before the
> visitor had scrolled a pixel** — 2.4 MB at the time, 4.0 MB at today's encode. If you
> change the page order or the hero's height, re-measure.

> **Alpha is where the bytes are, not colour.** In a move frame the colour costs ~14 KB and
> the alpha channel ~24 KB, because these plates are mostly transparent and WebP stores alpha
> losslessly by default. Tuning `quality` is nearly useless here — q72 → q62 moves a frame by
> 5%. Dropping *alpha* quality from 100 to 70 measures as free: composited over the page a
> move frame goes from 40.2 dB to 40.0 dB PSNR, with a lower maximum error. The "lossy alpha
> frays the thin desk legs into a halo" worry is real, but the cliff is at the bottom of the
> range — alphaQuality 0 falls to 32.8 dB. 70 is nowhere near it.

**The frames are RGBA and must stay RGBA.** They composite over the page colour. Flattening
them onto a background would cut ~60% of the bytes and would also weld one page colour into
240 files — don't, unless the section will never be re-themed.

---

## 3. The scroll maths

Progress is a single number from 0 to 1:

```
progress = (pin − sectionTop) / (sectionHeight − stageHeight)
```

`sectionTop` is the section's `getBoundingClientRect().top`; `pin` is where the stage sticks.
The denominator is the distance the page travels while the stage is pinned.

**Progress is split into 6 segments**, one per beat, and the split is *computed from the
frame list*, not tabulated. `plot()` runs once when the manifest lands.

Each segment is a **move** followed by a **hold**. The move's share of the scroll is
proportional to the number of render frames it covers, so the sequence plays at one rate
from top to bottom. The holds are fixed weights, because a hold is for reading and reading
does not take longer on a longer beat:

```
travel[k]  = frames this segment crosses     // seg 0: FRAMES[0]→BEATS[0]; else BEATS[k−1]→BEATS[k]
moveTotal  = 0.53                            // share of the whole scroll spent moving
holdW      = [1.05, 1, 1, 1, 1, 0.7]         // opening settle, four reading holds, coda
unit       = (1 − moveTotal) / Σ holdW
rate       = moveTotal / Σ travel

move[k]    = rate × travel[k]                // this segment's move, as a share of the scroll
hold[k]    = unit × holdW[k]
bounds     = running sum of (move[k] + hold[k]), starting at 0 and ending exactly at 1
moves[k]   = move[k] / (move[k] + hold[k])   // the fraction of THIS segment that is the move
```

With the sequence that ships — travel `[75, 68, 118, 124, 121, 74]`, summing to 580 render
frames — that comes out as:

```
bounds = [0, 0.1544, 0.2982, 0.4878, 0.6829, 0.8752, 1]
          └op──┘ └──1──┘ └──2──┘ └──3──┘ └──4──┘ └coda┘
moves  = [0.444, 0.432, 0.569, 0.581, 0.575, 0.542]
```

**Do not re-tabulate those two arrays.** They are outputs. Change the frame list and they
change; hard-code them and the scrub desynchronises from the frames in a way that looks like
an easing bug.

> **Why proportional, and not equal segments with a fixed move fraction.** That is what this
> replaced, and it does not survive contact with the frame list. The beats are 68, 118, 124,
> 121 and 74 frames apart while the coda was the *shortest* segment, so the last move ran at
> **twice the rate of the first** and the piece visibly sped up beat by beat — worst exactly
> where the books land on the arch and there is most to see. Two thirds of the section was
> a frozen frame. Rate is the thing that has to be constant; the spans follow from it.

**Within a segment**, local position `t` runs 0→1:

```
mv    = moves[seg]
from  = seg == 0 ? FRAMES[0] : B[seg−1]
frame = from + (B[seg] − from) · smoothstep(t / mv)
```

`smoothstep(x) = x²(3−2x)`, clamped — so the move eases in and out rather than starting and
stopping abruptly. Past `t = mv` the expression saturates and the frame is **exactly** the
beat frame: the hold is genuinely still, not nearly still.

`moveTotal` is not a constant of taste, and it is settable as the `move` attribute. With only
the six beat frames encoded, a "move" is a dissolve between two camera angles 6.667° apart,
which ghosts — so the code drops it to **0.12** automatically when
`frames.length === beats.length`. With the in-between frames present it is a real scrub and
gets **0.53**. If you ever ship a beats-only build, this is why it still looks deliberate.

> **`move` is a share of the *whole scroll*, not of a beat.** It was the latter, with a
> default of 0.42. A value carried over from the old meaning will not fail loudly — it will
> just play the whole section at roughly half speed.

**Copy timing**, in the same local `t`:

| | |
|---|---|
| fades in | `smoothstep((t − mv) / fade)` where `fade = min(0.14, (1 − mv) × 0.4)` — i.e. starting the instant *this segment's* move ends |
| fades out | over the last 8% of its segment (the last beat instead holds through the coda) |
| clickable | only while opacity > 0.4 |

The cap on `fade` is what keeps a long `move` from stranding copy part-way up: the rise is
never allowed to want more room than the hold has.

**Picking the image.** The wanted frame is rarely one that exists, so two are drawn: the
nearest existing frame at or below, and the next one up, cross-faded by the fractional part.

**The tick jump is the inverse.** Clicking tick *n* scrolls to
`bounds[n+1] + (mv + (1 − mv) / 2) × segment` — halfway into that segment's *hold*, where the
picture is still and the copy is up. It reads the same `pin` and the same span as
`progress()` does. **If those two ever disagree, ticks land on the wrong beat**, so they must
stay inverses of each other. A fixed fraction of the segment will not do it any more: the
segments are no longer the same length or the same shape, and 0.6 — which was right when
every move was 0.42 — now lands mid-move on the longer beats.

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
| **Desktop stage** | ≥ 992px **and** wider than 5:4 | Full-bleed pinned stage, 1000vh budget, copy overlaid in the lower corners |
| **Mobile band** | ≤ 991px | Pinned band at the crop's aspect, 600svh budget, copy and ticks stacked underneath on the page |
| **Static stills** | (≥ 992px **and** squarer than 5:4) **or** `prefers-reduced-motion: reduce` | The element is `display: none`; a stacked grid of the four beat plates shows instead |

> **The height and the frame count are one setting in two files.** The height *is* the scroll
> budget, and §3 divides that budget among the moves in proportion to the frames each covers
> — so encoding more frames without raising the height plays the whole section faster, and
> nothing warns you. The 1000vh/600svh above pays for 580 render frames at about 7.5px per
> frame on a 1440×900 desktop. Change one, recompute the other.

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
for a full-cut beat, **6.8 MiB** for a full-cut move (3.9 and 1.7 on the crop). All 120
resident at once is **846 MiB**, so the component holds a subset and closes the rest.

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

**A small resident set is not automatically a problem, and the way to find out is to
measure.** At the default 96 MB the full cut now holds **12 frames** — the six beats alone
are 67 MiB of the budget — which is fewer than the 14–24 encoded frames a single move
crosses. That sounds like it should stutter and does not: scrubbing the whole section at
1000 px/s, the exact frame the scrub asked for was resident on **100% of ticks**, with no
substitution from `nearest()`. Decoding runs off-thread and the loader stays ahead of a
reading scroll; the window is insurance against re-scrubbing, not the thing that keeps up.
Instrument `paint()` and count the misses before raising `budget-mb` — the number that
matters is substitutions, not resident frames.

---

## 7. Traps

Things that fail silently. In rough order of how likely they are to bite.

**7.1 The static fallback depends on the page's reveal sweeper.** The stacked stills that show
under `prefers-reduced-motion` carry inline `opacity: 0`, cleared by the page's `data-reveal`
script. Lift that markup into a new stack without the sweeper and **the fallback renders
invisible** — no error, no clue. This is the single most likely silent failure in a port.

**7.2 Loading is gated on `offsetHeight`, deliberately.** A `display: none` element has no
`offsetHeight`, which is what stops the component fetching 240 files under reduced motion.
If you replace `display: none` with `visibility: hidden` or `opacity: 0`, **the section
starts downloading the whole sequence for people who asked for no motion.**

**7.3 Frames are addressed by string concatenation, so no build tool can see them.** There is
no literal `ap0353.webp` anywhere in the markup. Asset pipelines that rewrite or fingerprint
URLs by scanning HTML will miss all 240 files and ship a page that 404s mid-scroll. This is
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
  122 frames of nothing.
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

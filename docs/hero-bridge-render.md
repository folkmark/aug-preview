# Hero bridge render — what the sequence needs

**Source:** the server-rack-and-desk bridge. A toy-block arch assembles across the gap
between a server rack and a school desk, and closes.

Encoded by `tools/encode-hero-bridge.mjs` into `assets/hero-bridge/`. Frame numbers below
are **Blender** frame numbers, so a plate, this file and the manifest all name the same
thing.

## What is in the repository

66 frames, 276 – 468. Every frame that has been delivered for this scene, from three
separate renders — which is why the sequence is **not yet visually continuous**:

| Frames | Count | From | Look |
|---|---|---|---|
| 276 – 417, stride 3 | 48 | Aug 20 delivery | copper legs, warm beige rack, **ground shadow in alpha** |
| 419 | 1 | Aug 18 delivery | off the stride grid entirely |
| 420 – 468, stride 3 | 17 | Aug 19 delivery | **grey legs, cool grey rack, no shadow** |

So the legs change colour and the ground shadow disappears at frame 417, and frame 419
sits between two stride-3 frames. Anything scrubbing the whole range will pop there. The
frames are in the repository because they exist and are wanted available; the range
276 – 417 is the only part currently coherent.

## What the page plays

**276 – 417 — the 48 frames that carry the shadow.** The hero names that span with
`from` and `to` on its `<hero-bridge>` element in `index.html`; everything outside it stays
encoded and on disk, unplayed rather than deleted. `tools/build-site.mjs` checks both
bounds against the manifest, so a `from` or `to` naming a frame the encoder never produced
fails the build instead of quietly shipping a hero missing its opening or closing frames.

The seam is not a judgement call. Measured over the shipped WebPs, decoded at full size:

| | Partial alpha coverage | Mean abs. difference from the previous frame |
|---|---|---|
| 276 – 417 | 33.51 – 36.82% | 2.4 – 6.7 |
| **417 → 419** | **33.53% → 2.20%** | **18.7** |
| 419 – 468 | 1.95 – 2.25% | 1.5 – 5.7 |

Partial coverage is the discriminator, not mean alpha — mean alpha does not separate the
two deliveries at all, because the shadow adds soft pixels rather than opaque ones. A
31-point cliff in a single step, with the frame difference agreeing.

(These figures are the lossless-alpha encode. They were 22.97 – 23.32% against
0.92 – 1.07% when the frames were encoded at `alphaQuality 70`, which destroyed some of
the soft pixels the test counts — the separation was real either way, and is now wider.)

When a re-render gives the tail its shadow, restoring the plates and re-running the
encoder is the whole job; the span on the page is one attribute.

## What a complete delivery needs

| | |
|---|---|
| Range | **276 – 417**, the whole beat: the arch closes at 417 and that frame is a clean resting state |
| Stride | **1** — every frame, 142 in total |
| Plate | 2048 × 1432 PNG, RGBA |
| Look | the Aug 20 revision throughout — copper legs, warm beige rack, **and the ground shadow on every frame**, which is what the delivered tail is missing |

Note that the stride is the one thing the shipped hero cannot make up for. 48 frames is
every third frame of a 4.7-second move, and the page cross-fades between them to cover it;
at stride 1 the fade stops doing that work and the assembly is genuinely continuous.
`assets/hero-bridge.css` sets the section's height, and the two are one setting in two
files — 142 frames scrubbed over the height 48 are scrubbed over now plays three times
faster. Raise it with the frame count.

The earlier batch ran out to 468. Those tail frames are a hold on the finished arch,
which a scroll-scrub does not need — it holds by itself when the reader stops scrolling.

The encoder reads its grid off the directory rather than declaring it, so the full
delivery needs no change here: restore the plates and re-run it.

## The ground shadow lives in alpha, and it decides the payload

The Aug 20 delivery of this scene puts a soft directional ground shadow in the alpha
channel. The Aug 19 delivery of the same scene did not — its alpha was hard-edged, 1.3%
partial coverage against 33% now. The shadow is smooth and correct as rendered; nothing
about it needs fixing in the render.

What it changes is the encode, and this is the one setting here most likely to be tidied
back into line with `encode-approach.mjs`. Do not. Alpha now carries a low-amplitude
gradient rather than just object edges, and **lossy alpha posterises it into visible
terraces** — a topographic-map floor. Measured along one scanline through the shadow on
frame 417, counting distinct alpha levels and the longest flat run over 100 samples:

| | levels | longest flat run |
|---|---|---|
| master (as rendered) | 25 | 10 |
| `alphaQuality 70` | **5** | **27** |
| `alphaQuality 80` | 17 | 17 |
| `alphaQuality 85` | 21 | 11 |
| `alphaQuality 90` | 24 | 11 |
| `alphaQuality 100` | 25+ | 7 |

`alphaQuality 70` is what the Approach moves use and it was genuinely free there, because
their alpha was hard-edged with no gradient to lose. Here it flattens a 25-level ramp to
five plateaus. These frames ship at **lossless alpha**: 90 to 100 costs 2% (183 against
187 KB a frame), so there is no useful middle ground.

**The price is the headline fact about this sequence.** At lossless alpha the shadow and
soft edges are about **67% of every frame**; colour is the cheap part.

| | 66 frames encoded | 48 frames played | 142 frames (full delivery) |
|---|---|---|---|
| full cut, 1600 wide | 10.4 MB | 7.6 MB | ~22.5 MB |
| mobile cut, 1200 wide | 6.7 MB | 4.9 MB | ~14.4 MB |

Note what this cost the loading work in `assets/hero-bridge.js`: transfer roughly doubled
against the `alphaQuality 70` frames (162 against 89 KB a frame), while **decoded** size
did not move at all — decode is width x height x 4 whichever way the file was compressed.
So the frame budget and the eviction arithmetic are untouched; what got harder is arriving
in time. If the ticks-waiting-on-a-frame measurement regresses, that is why, and the lever
is width or the shadow, not alphaQuality.

Two levers, in order of how much they buy:

1. **Take the shadow out of alpha** — drop it from the render, or bake it into an opaque
   backdrop the frames sit on. This cuts the sequence to roughly a third. It is an art
   call, which is why it is written here rather than done.
2. **Narrow the full cut.** At lossless alpha and 142 frames: 1152 → 14.9 MB,
   1280 → 18.0 MB, 1440 → 21.3 MB, 1600 → 25.1 MB.

One detail *not* explained by a ground shadow: the top-right corner of the plate reads
alpha 48, and nothing in the scene casts there. Worth a look at the render setup.

## Payload

`encode-approach.mjs` measured "1600 is the knee" at ~47 KB a frame, on the **two-desk**
plates. That number does not transfer. The rack's grille mesh, cable bundles and LED rows
hold far more detail, so the same width costs 78 KB here. Colour only, measured on frames
276 / 348 / 417 with clean alpha estimated at 15 KB scaled by area:

| Width | Per frame | × 142 frames |
|---|---|---|
| 1152 | 46 KB | 6.3 MB |
| 1280 | 54 KB | 7.5 MB |
| 1440 | 65 KB | 9.1 MB |
| **1600** | **78 KB** | **10.8 MB** |
| 2048 | 110 KB | 15.3 MB |

1600 is deliberate: this is the artwork the site is built around, and the width was chosen
knowing it puts ~11 MB above the fold. That makes progressive loading the page's problem
to solve, not something to buy back by softening the picture. Note that **1152 on this
render costs what 1600 cost on the old plates** — holding the number 1600 is not holding
the quality bar that number used to represent.

## The mobile cut is a downscale, not a crop

The Approach section cropped its mobile band, because at phone width its arch covered
about a third of the plate and its beats read as near-identical pictures of two desks.
This sequence cannot do the same: measured across the delivered frames, content spans
x 0.004 – 0.959 of the plate, because blocks fly in from the top and the right for the
whole run. A crop tight enough to help would clip them, and blocks falling into place is
the animation.

So both cuts are the whole plate, at 1600 and 1200 wide. 1200 matches what the hero
already ships for its still, `assets/images/hero-bridge-m.webp`.

Which of the two a viewport loads is not a phone-or-desktop decision, and
`assets/hero-bridge.css` explains the arithmetic. The pinned plate runs **edge to edge**,
so the box is the page's full width up to `--hb-max` — 1440px on a 1440×900 laptop, not
the 1184 an earlier contained rig gave it. The 1600 cut is therefore the right one at
every desktop width; the 1200 cut would be an upscale there, and it is kept for the
991px breakpoint and below.

Note that the ceiling is 2880px, which is well above the encoded width. As a ceiling on
the *box* it only binds on a 5K panel — where the 1600 cut is a 1.8× upscale.

**It binds far more often as a ceiling on the DRAWN width, which is what it now also is.**
`--hb-entry-zoom` lets the entry scale the plate past edge to edge, and the site asks for
2× above 991px, so the box is scaled rather than widened and the upscale goes up with it.
2880 is exactly 1.8× the 1600 cut, so the ceiling holds the entry at the same sharpness
this file already calls the limit — and it is what stops a 1920×1080 screen from taking
the 1.81 the geometry would otherwise allow, capping it at 1.50. At 2560×1300 it is the
difference between 1.72 and 1.13.

So the 2048 cut this file costs at 110 KB a frame is now the lever on how large the hero
can enter, not only on how it looks on a 5K. **It needs new renders.** The sequence
masters have never been in this repository — `98d0243` carries `project/renders/hero-frames`,
which is nine beat plates, not the 66-frame sequence — so unlike the Approach cuts this
one cannot be re-encoded from the history. Only the entry actually needs the resolution:
the approach holds on frame 276 throughout and the plate is back at 1× before the scrub
starts, so a single 2048 plate of frame 276 would buy most of it.

## What the composition is measured against

Three constants in `assets/hero-bridge.css` describe this artwork rather than the code, and
each is measured on the frame it governs — measure a replacement sequence the same way
rather than carrying these over.

| constant | frame | value | what it is |
|---|---|---|---|
| `--hb-entry-sky` | 276 | 0.226 | empty page colour above the artwork. Content really starts at y 0.2368 on the desk side and 0.270 on the rack side; 0.226 sits inside both so words may overlap the band |
| `--hb-entry-keep` | 276 | 0.400 | the lower edge of the two top surfaces — desktop plane ends 0.363, the slab's front face 0.380, the rack's lid 0.396. What must stay above the fold |
| `--hb-arch` | **417** | 0.1001 | the top of the assembled bridge |

`--hb-arch` is measured on the last frame the page plays because that is the state it
describes, and the answer is a line rather than a peak: the deck is flat at y 0.100–0.105
across x 0.30–0.68. **It sits above both objects it spans** — the rack's top is 0.257 and
the desk's 0.245 — which is the whole reason it needs its own constant, since anything that
clears the furniture does not clear the bridge.

Two caveats. The last few frames of settling reach a little higher than the final position:
topmost content is y 0.092 at frame 411 against 0.1001 at 417, so a host asking for 30px of
clearance gets about 21 at the tightest moment. And blocks fly in from the top for the whole
run — the picture reaches y 0.000 mid-assembly — so only the end state is addressable by an
offset.

## What the hero does not need

What it does *not* need from a re-render is the bottom edge tidied. The plate's last
row carries the shadow plane at alpha 2.4/255 and is still 2.3 nine rows in, which composited
on the page colour is a step from 250.6 to 253.0 across the width of the screen — visible as
a straight line when the hero scrolls away. `assets/hero-bridge.css` feathers the bottom 4%
out instead, which is below the desk's feet at y 0.94 and touches no object. Taking it out of
the render would be tidier and is not worth a delivery on its own.

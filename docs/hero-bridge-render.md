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
| 276 – 417 | 22.97 – 23.32% | 2 – 5 |
| **417 → 419** | **23.01% → 1.04%** | **17.6** |
| 419 – 468 | 0.92 – 1.07% | 1 – 4 |

Partial coverage is the discriminator, not mean alpha — mean alpha does not separate the
two deliveries at all, because the shadow adds soft pixels rather than opaque ones. A
22-point cliff in a single step, with the frame difference agreeing.

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

## Alpha carries a ground shadow, and that changes the encode

The Aug 20 delivery of this scene puts a soft directional ground shadow in the alpha
channel. The Aug 19 delivery of the same scene did not — its alpha was hard-edged, 1.3%
partial coverage against 33% now. (Those are the masters. The same measurement on the
encoded WebPs reads 1.0% against 23%: `alphaQuality 70` quantizes some of the shadow's
softest pixels to fully opaque, which is the cost described below. The gap between the two
deliveries survives the encode intact, which is what makes it usable as the test for which
frames the page may play.)

This is worth knowing about rather than fixing blind, because it is probably an art
decision and the encoder cannot tell the difference between a wanted shadow and a stray
wash. Two consequences, both measured on frame 417 at 1600 wide:

- **It costs bytes in the expensive channel.** Alpha goes from 15 KB a frame to 27 KB —
  about 1.9 MB across 142 frames. `encode-approach.mjs` explains why alpha, not colour,
  is where these plates spend.
- **It makes lossy alpha a real choice rather than a free one.** `alphaQuality 70` was
  measured on hard object edges, where it cost nothing. On a smooth gradient it does not:
  against the master, 20% of soft-shadow pixels come back off by more than 4 levels and
  the worst by 11. `alphaQuality 80` reduces that to a maximum error of 1 — and costs
  52% more, 94 KB a frame against 143.

The frames in the repository are encoded at **70**, matching the rest of the site. If the
shadow is wanted, 80 is the honest setting for it and the sequence gets much heavier; if
it is not, dropping it from the render restores both the bytes and the quality for free.

One detail that is *not* explained by a ground shadow: the top-right corner of the plate
reads alpha 48, and nothing in the scene casts there. Worth a look at the render setup.

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
`assets/hero-bridge.css` explains the arithmetic. The pinned plate is *contained* in its
stage, so the box is narrower than the viewport — 1184px on a 1440×900 laptop — and the
1200 cut is the correctly-sized plate there, not a degraded one. Measured: it holds 24
frames in the same budget where the 1600 cut holds 14, and halves the ticks that want a
frame not yet decoded. Screens above 1× density keep the 1600 cut, because the same box
wants 2368 device pixels there.

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

## What a complete delivery needs

| | |
|---|---|
| Range | **276 – 417**, the whole beat: the arch closes at 417 and that frame is a clean resting state |
| Stride | **1** — every frame, 142 in total |
| Plate | 2048 × 1432 PNG, RGBA |
| Look | the Aug 20 revision throughout — copper legs, warm beige rack |

The earlier batch ran out to 468. Those tail frames are a hold on the finished arch,
which a scroll-scrub does not need — it holds by itself when the reader stops scrolling.

The encoder reads its grid off the directory rather than declaring it, so the full
delivery needs no change here: restore the plates and re-run it.

## The ground shadow lives in alpha, and it dominates the payload

The Aug 20 delivery puts a soft directional ground shadow in the alpha channel. The Aug 19
delivery of the same scene did not — its alpha was hard-edged, 1.3% partial coverage
against 33% now. The shadow is smooth and correct as rendered; nothing about it needs
fixing.

What it changes is the encode. Alpha now carries a low-amplitude gradient rather than just
object edges, and **lossy alpha posterises it into visible terraces** — a topographic-map
look across the floor. Measured along one scanline through the shadow on frame 417,
counting distinct alpha levels and the longest flat run over 100 samples:

| | levels | longest flat run |
|---|---|---|
| master (as rendered) | 25 | 10 |
| `alphaQuality 70` | **5** | **27** |
| `alphaQuality 80` | 17 | 17 |
| `alphaQuality 85` | 21 | 11 |
| `alphaQuality 90` | 24 | 11 |
| `alphaQuality 100` | 25+ | 7 |

`alphaQuality 70` is what `encode-approach.mjs` uses and it was genuinely free there,
because the Approach moves had hard-edged alpha with no gradient to lose. Here it destroys
the shadow. The frames ship at **lossless alpha**: 90 to 100 costs 2% (183 vs 187 KB a
frame), so there is no useful middle ground.

**The price is the headline fact about this sequence.** At lossless alpha the shadow and
soft edges are about **67% of every frame**. Colour is the cheap part.

| | 66 frames (today) | 142 frames (full) |
|---|---|---|
| full cut, 1600 wide | 10.4 MB | ~22.5 MB |
| mobile cut, 1200 wide | 6.7 MB | ~14.4 MB |

Two levers, in order of how much they buy:

1. **Take the shadow out of alpha** — drop it from the render, or bake it into an opaque
   backdrop the frames sit on. This cuts the sequence to roughly a third. It is an art
   call, which is why it is written here rather than done.
2. **Narrow the full cut.** At lossless alpha and 142 frames: 1152 → 14.9 MB,
   1280 → 18.0 MB, 1440 → 21.3 MB, 1600 → 25.1 MB.

Until one of those is decided, treat the hero as needing real progressive loading rather
than a preload — 22 MB above the fold is not something a loading strategy hides.

One detail *not* explained by a ground shadow: the plate's top-right corner reads alpha 48,
and nothing in the scene casts there. Worth a look at the render setup.

## The mobile cut is a downscale, not a crop

The Approach section cropped its mobile band, because at phone width its arch covered
about a third of the plate and its beats read as near-identical pictures of two desks.
This sequence cannot do the same: measured across the delivered frames, content spans
x 0.004 – 0.959 of the plate, because blocks fly in from the top and the right for the
whole run. A crop tight enough to help would clip them, and blocks falling into place is
the animation.

So both cuts are the whole plate, at 1600 and 1200 wide. 1200 matches what the hero
already ships for its placeholder still, `assets/images/hero-bridge-m.webp`.

# Approach section — frame ↔ beat ↔ message map

**Source of truth:** `render_farm_test_aug_desk.blend`, scene `APPROACH`.
680 frames @ 30 fps · camera `CAM_Approach` · plate 8192 × 5728 PNG RGBA ·
output `renders/approach/beauty/ap_####.png` (4-digit, `ap_0001` → `ap_0680`).

Every frame number below is read from the file's own timeline markers and f-curves, not
estimated.

---

## How the section is structured

Each beat has two phases, and they mean different things on the page:

- **MOVE** — the animation runs and the camera rotates. The visitor is watching.
- **HOLD** — everything is dead still, camera included. The visitor is reading.

**Copy appears on the hold, never during the move.** That is the whole design: nothing is
moving while there are words to read, so the reader is never asked to watch and read at once.

The camera advances an equal **6.667° per beat** across a −20° → +20° arc, so every section
delivers the same amount of reveal regardless of how long it is.

---

## The map

| # | Beat marker | MOVE frames | HOLD frames | Camera (start → end) | Message appears at |
|---|---|---|---|---|---|
| — | `HOLD_H0` | — | **1 – 19** | −20.000° (still) | *(opening state — empty desks)* |
| 1 | `B1_TheGap` | **19 – 47** | **47 – 77** | −20.000° → −13.333° | **f 47** |
| 2 | `B2_Evidence` | **77 – 167** | **167 – 197** | −13.333° → −6.667° | **f 167** |
| 3 | `B3_DefineRole_Wireframe` | **197 – 235** | **235 – 265** | −6.667° → **0.000°** | **f 235** |
| 4 | `B4_BuildCapabilities` | **265 – 353** | **353 – 383** | 0.000° → +6.667° | **f 353** |
| 5 | `B5_CoDesignApplications` | **383 – 477** | **477 – 507** | +6.667° → +13.333° | **f 477** |
| 6 | `B6_TestLearnBeginAgain` | **507 – 598** | **598 – 680** | +13.333° → +20.000° | **f 598** (+ 635, 672) |

Beat 3 lands on **exactly 0°** — the dead-frontal, least-perspectival view — and that is the
blueprint/wireframe beat. Deliberate: the most diagrammatic moment gets the most
diagram-like camera.

---

## What actually happens on screen, beat by beat

### Opening · f 1 – 19 · camera −20°
Two empty desks, seen from the left. Nothing on them. This is the "before" state and it
holds for 19 frames so it registers as deliberate rather than as a loading gap.

### Beat 1 — The Gap · MOVE f 19 – 47 · HOLD f 47 – 77
The camera makes its first move. The desks stay bare — **the gap between them is the
subject**, and the only thing that changes is your angle on it.
*Animating: camera only (plus persistent `FORCE_v1` / `HUD_v1` annotation rigs).*

### Beat 2 — Evidence · MOVE f 77 – 167 · HOLD f 167 – 197
The desks fill up. Three waves, staggered so it reads as accumulation rather than a dump:

| what | frames |
|---|---|
| `BOOKS_v1` — 8 books land in two stacks | 77 – 124 |
| `PROPS_Cubby_v1` — cubby contents | 92 – 161 |
| `DESK_DECOR_v1` — 13 wooden blocks fall onto the desktops | 97 – 164 |

Three of those blocks are **exact colour-and-shape matches to blocks from the homepage
freefall hero** — the sage quarter-arch, the blue quarter, the blue triangle. That is the
visual thread tying the two sections together.

### Beat 3 — Define the Role · MOVE f 197 – 235 · HOLD f 235 – 265
A **152-piece blueprint arch draws itself** in the gap — wireframe only, nothing solid. The
plan before the build. Camera arrives dead-frontal at 0°.
*`WIREFRAME_v1`, 152 objects.*

### Beat 4 — Build Capabilities · MOVE f 265 – 353 · HOLD f 353 – 383
**Real blocks build the arch** along the blueprint, voussoir by voussoir.
*`BRIDGE_v1`, 70 objects animating 265 – 475 — note this run continues through Beat 5.*

### Beat 5 — Co-Design Applications · MOVE f 383 – 477 · HOLD f 477 – 507
The arch completes: remaining spandrel and deck pieces land, the wireframe retires as the
solid structure takes its place. **This is where blueprint hands over to built thing.**
*`BRIDGE_v1` continues to 475; `WIREFRAME_v1` finishes at 481.*

### Beat 6 — Test, Learn, Begin Again · MOVE f 507 – 598 · HOLD f 598 – 680
The finished arch is **load-tested** — and this beat has three distinct moments, which is
worth exploiting rather than flattening:

| moment | frames | what |
|---|---|---|
| arch stands, force annotations resolve | 507 – 598 | camera arrives at +20° |
| **first book placed on the arch** | 604 – 632, holds at `HOLD_H6b` **635** | carried in from the right, set down level |
| **second book placed on top** | 641 – 669, holds at `HOLD_H6c` **672** | the load doubles |
| final state | 672 – 680 | still |

Both books travel **fully inside the frame** for their whole move — they are placed, not
popped in.

---

## Where the messaging goes

⚠️ **The actual site copy is not in the project and I could not retrieve it.** The column
below is filled with working titles taken from your own Blender marker names. Replace with
the real headline + body for each beat.

| Beat | Copy appears | Working title (from marker) | Headline — *your copy* | Body — *your copy* |
|---|---|---|---|---|
| 1 | f 47 | The Gap | | |
| 2 | f 167 | Evidence | | |
| 3 | f 235 | Define the Role | | |
| 4 | f 353 | Build Capabilities | | |
| 5 | f 477 | Co-Design Applications | | |
| 6 | f 598 | Test, Learn, Begin Again | | |

Two notes for whoever writes it:

- **Each line has to survive being read against a still image.** The block is on screen,
  motionless, for 30 frames minimum before the next move starts.
- **Beat 6 can carry three short lines instead of one** (at f 598, 635, 672) if the
  "test → learn → begin again" idea wants to unfold rather than land at once. The animation
  already gives you three separate moments there.

---

## Scroll mapping for the web build

Six pinned sections, one per beat, with real DOM copy between them. At **17 px of scroll per
frame** on a 900 px viewport:

| Section | Frames | Count | Height | Screens |
|---|---|---|---|---|
| 1 · The Gap | 1 – 77 | 76 | 1,292 px | 1.44 |
| 2 · Evidence | 77 – 197 | 120 | 2,040 px | 2.27 |
| 3 · Define the Role | 197 – 265 | 68 | 1,156 px | 1.28 |
| 4 · Build Capabilities | 265 – 383 | 118 | 2,006 px | 2.23 |
| 5 · Co-Design Applications | 383 – 507 | 124 | 2,108 px | 2.34 |
| 6 · Test, Learn, Begin Again | 507 – 680 | 173 | 2,941 px | 3.27 |
| **Total** | | **679** | **11,543 px** | **12.83** |

At 14 px/frame the total is 10.6 screens; at 20 px/frame, 15.1. **17 keeps every section
inside the 1–3 screenfuls where attention actually lives**, which is the reason for chunking
at all.

Section 6 is the outlier at 3.27 screens. If it feels long, split it at `HOLD_H6b`:
f 507 – 635 (2.42 screens) and f 635 – 680 (0.85), which also matches the three-moment
structure above.

---

## Frame → file reference

| | |
|---|---|
| Naming | `ap_0001.png` … `ap_0680.png` |
| Beat markers | 19, 77, 197, 265, 383, 507 |
| Hold markers | 1, 47, 167, 235, 353, 477, 598, 635, 672 |
| Copy trigger frames | **47, 167, 235, 353, 477, 598** (+ 635, 672 optional) |
| Camera rest angles | −20, −13.333, −6.667, 0, +6.667, +13.333, +20 |

Reduced-motion and phone fallback: serve the **hold frame** of each beat as a still —
`ap_0047`, `ap_0167`, `ap_0235`, `ap_0353`, `ap_0477`, `ap_0598` — stacked with the same six
lines of copy between them. Same messaging, no scrub.

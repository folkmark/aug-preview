# AugmentED — site preview

The AugmentED marketing site, built as a Claude Design handoff bundle. It is a
single-page app: `index.html` carries every page (Home, The Challenge, Our
Approach, Who We Are, Follow Our Work) and switches between them client-side.

## Layout

| Path              | What it is                                                          |
| ----------------- | ------------------------------------------------------------------- |
| `index.html`      | The home page and the whole site — markup plus its `<script>` logic  |
| `support.js`      | Claude Design runtime that renders the `<x-dc>` block                |
| `_ds/`            | Design system — tokens, `styles.css`, component bundle, fonts        |
| `assets/`         | Web-ready images — everything here is sized and encoded for the page |
| `docs/`           | Render notes, including the frame ↔ beat map for the Approach section |
| `tools/`          | The build, and the encoders that turn originals into `assets/`       |
| `wordpress-handoff/` | The rebuild package — rendered markup and per-section specs       |
| `source-material/` | Inputs, not outputs: the original Webflow export and its style guide, the image and block originals the encoders read, the brand explorations and the headshots at full resolution. See its own README. |

The whole repository is about 120 MB cloned, and everything in it either ships,
builds what ships, or is the original something shipped was made from.

### The bulk renders are not in the repository

The Blender plates, the 8K PNG sequences and the WebP frame archive used to be
tracked here. They came to **604 MB of the 702 MB checked in**, and the site serves
none of it: every one is an *input* to a tool in `tools/`, and every output those
tools produce is committed. Deleting them from the working tree did nothing for
anyone, because a clone still pays for whatever history holds — so they were
removed from history outright, and a clone went from about 700 MB to 120 MB.

They live on the designer's machine now. Restore them at these paths to re-encode:

| Restore to | For |
| ---------- | --- |
| `Falling Blocks/FallingBlocks_{Top,Bottom}/*.png` | `tools/encode-falling-blocks.mjs` |
| `project/renders/approach-desk/*.png` | the Approach beats |
| `project/renders/full-desk-anim-webp/*.webp` | the Approach moves |

Nothing routine needs them. `node tools/build-site.mjs` and the publish work
without them, and so do `tools/encode-images.mjs` and `tools/encode-fonts.mjs` —
their inputs are committed, in `source-material/image-sources/` and
`_ds/*/assets/fonts/` respectively. Each encoder exits with the path it wants if
something is missing.

A full copy of the repository as it stood before the history rewrite, bulk renders
and all, was bundled off to the designer. That bundle is the only way back to the
old SHAs; nothing in this repository points at them any more.

## The hero animation

The home page opens on `<hero-bridge>` — `assets/hero-bridge.js` and
`assets/hero-bridge.css` — a scroll-scrubbed sequence of alpha plates in which a
toy-block arch assembles between a server rack and a school desk and closes. The
plate is pinned under the header from the moment the page loads, and the hero copy
is laid over it: the first screen is the artwork with the headline on top of it.

It runs in two phases, and the element's height is split between them. Through the
**approach** the plate hangs from a line under the copy — its first pixel of artwork on
that line, its own empty top behind the words, and its bottom off the fold wherever it
does not fit — and rises from there into place. On every desktop screen it is already at
full edge-to-edge width when it does, with the desk's top surface and the rack's lid
above the fold, so the rise is a move rather than a zoom; only a short screen makes it
grow as well. Then it **scrubs** for `--hb-scrub` (140svh) while the arch builds — 22.8px
of scroll a frame at 1440×900 — holds on the closed span for `--hb-hold`, and **eases out**
across `--hb-exit`.

That last phase is a phase rather than an afterthought, and it exists because the release
used to be a cliff. While the stage is pinned the picture does not move at all; the instant
it is not, it moves at the speed of the page — measured at 1440x900 that is 0 to 1 in a
single frame. Position is continuous and velocity is not, and the eye reads velocity, so
the whole hero appeared to be yanked off the screen. Two budgets buy what fixes it.
`--hb-hold` (20svh here) is a real beat of stillness on the finished bridge — 312 to 440px
measured, against about 95 before — and `--hb-exit` (45svh) is the half-window of a ramp
that blends the picture's velocity from nothing to page speed across the release. By the time the sticky
lets go the picture is already travelling at half page speed, so the release itself is not
an event. Measured, the drawn picture tracks that curve to within 0.6px at every width, and
the worst single-frame change in velocity falls from 1.00 to 0.11.

The ramp only ever moves the picture **up**, never slows it, and that is forced: the next
section's top sits only `--hero-tail` below the plate's bottom the whole way out, so a
picture eased out by lagging the page would be run into by the content behind it.

The approach is exactly as long as the hero copy takes to leave — `--hb-entry-span` and
`--hb-entry-clear` are set to the same number — so the plate's rise and the copy's exit
run in one window and the scrub picks up the instant both are done. Leave the component's
default one screen in place instead and the two finish 294px apart at 1440x900, which is
a third of a screen of scrolling in which nothing at all moves.

How big it can be at entry follows from two constants measured off the first played
frame. `--hb-entry-sky` (0.226) is the share of the plate that is empty at the top, and
is what lets the words overlap it. `--hb-entry-keep` (0.4) is the share that must stay
above the fold, and it is the lower edge of the two **top surfaces** — classified by
colour, the desk's slab ends at y 0.380 and the rack's lid at y 0.396. 0.4 clears both,
keeping the desktop whole with its front edge and spending the cubby and the legs below
it. Both numbers describe frame 276 and only frame 276, which is correct rather than
sloppy: the approach holds on that frame throughout, and the camera moves later in the
sequence — the same desk edge has slid to 0.386–0.404 by frame 417.

Over it, **the headline stays and the body leaves**. The h1 is `position: sticky` and
holds the spot it loaded in — `--hero-gap` under the header — through the body going, the
plate rising, the whole sequence and the beat after it. The picture is what moves out of
its way, not the other way round; `--hb-arch-clear` below is how. The lede and buttons
float 5rem further than the page scrolls and dissolve as they go.

**And the headline lets go on the same pixel the plate does**, which is the arithmetic in
`[data-hero-copy]`'s `bottom`. It used to end at the plate's own bottom — which sounds like
the same thing and is nearly a thousand pixels away from it, because the plate's stage is
so much taller than the headline. The picture started leaving ~870px before the words did,
the finished bridge rode up through the type undoing the 30px it is placed to keep, and the
headline then got a hard release of its own over a page the picture had already left. Both
now ease out together on the same curve, which the component writes through the `exit-with`
attribute on the element.

It is a self-contained block of CSS in `index.html` using a scroll-driven animation — no
JavaScript and no coupling to the component, so a theme rebuilding this page copies the
block and the markup it selects and needs nothing else. Engines without scroll-driven
animations get the copy scrolling away without fading, which is what this shipped as.

The plate runs edge to edge and is never clipped by a box — its stage takes the
plate's own height rather than the screen's, so on a desk screen the bottom of the
picture is simply below the fold while the arch builds and scrolling on reveals it
whole. That matters more than it sounds: the rig this replaced cropped to the pinned
stage, which looked identical while pinned and then dragged a hard cut up through the
ground shadow the moment the stage released. The render ends in a faint edge of its
own — the last row carries the shadow plane at alpha 2.4/255 — so the bottom 4% is
feathered out, below the desk's feet at y 0.94 and touching no object.

Six custom properties are the page's business rather than the component's. `--hb-pin`
is the header's height. `--hb-entry-clear` is how much room the page's own copy needs:
the page builds it from `--hero-gap` — the air between the nav and the first line, 130px
growing on a tall screen — plus the copy's own height, which is 380px on any stacked
desktop width, 290px from the 992px type-scale break down to about 600, 479px on a phone
and 558px at 320 where the h1 goes to four lines, and is derived rather than measured in
the two-column arm (below). The copy is aligned to the **start** of that band rather
than centred in it, because splitting the gap would cost twice the band for the same air
above the words.

**That band is the plate's budget too, and the exchange rate is steep.** The entry is
sized from the room left under the band and divided by `--hb-entry-keep` minus
`--hb-entry-sky` = 0.174, so one pixel of copy costs 5.75px of picture. Every decision
about the hero's copy is also a decision about how big the artwork is.

`--hb-entry-zoom` is the third, and it is how far past edge to edge the entry may grow.
The component defaults to 1 — never larger than the artwork's own width — because
content spans plate x 0.000–0.999, so anything above 1 crops the rack's left edge and
the desk's right. This page asks for 2 above the 992px breakpoint and takes whatever the
geometry allows, which is never the full 2:

| viewport | entry scale | drawn width | what is cropped |
|---|---|---|---|
| 2560×1300 | 1.13 | 2880 (`--hb-max`) | x 0.06–0.94 |
| 1920×1080 | 1.44 | 2773 | x 0.15–0.85 |
| 1920×955 | 1.24 | 2391 | x 0.10–0.90 |
| 1440×900 | 1.45 | 2088 | x 0.16–0.84 |
| 1512×860 | 1.25 | 1891 | x 0.10–0.90 |
| 1512×780 | 1.03 | 1562 | x 0.01–0.99 |
| 1440×764 | 1.04 | 1496 | x 0.02–0.98 |
| 1280×800 | 1.25 | 1594 | x 0.10–0.90 |
| ≤991px | 1.00 | edge to edge | nothing |

Two ceilings bind before `--hb-entry-zoom` does, and knowing which is which is what
makes the numbers above predictable. On a laptop it is **`--hb-entry-keep`**: the desk's
top edge has to stay above the fold, and on a 780px-tall screen the copy band has already
taken 518 of those pixels. From 1920×1080 up it is **`--hb-max`**, which now caps the
width the plate is *drawn* at rather than only the width of its box — 2880px is a 1.8×
upscale of the 1600 cut, and past that the entry is visibly soft. Going further needs a
bigger cut, and the sequence masters are not in this repository's history — only nine
beat plates at `98d0243` — so that means new renders rather than a re-encode.

`--hb-arch-clear` is the fourth, and it is what keeps the finished bridge out of the
headline. The arch rises **over** the gap between the rack and the desk, so the top of the
assembled span sits at plate y 0.100 — above the rack's top at 0.257 and the desk's at
0.245 — and with the headline pinned for the whole hero the deck used to run straight
through both lines of type. The page asks for the bridge to land 30px under the headline
(`--hero-gap + --hero-h1 + 30px`) and the component moves the **plate** down to put it
there, by 208–255px on a desktop screen, as a static offset in the stylesheet rather than
anything the script does.

That is bought with the bottom of the picture: 44–58% of the plate is below the fold while
pinned, against 15–25% before. **The desk's top edge is what the offset is capped against**
and is above the fold at every width; the cubby survives except on the two shortest
laptops; the legs and the ground shadow go under and come back as the section scrolls away.
Nothing is ever cut by a box.

It also cost the entry a little on tall screens, because `settle()` now solves against a
lower resting position: 1.50 → 1.44 at 1920×1080, 1.32 → 1.24 at 1920×955. Every laptop
case is unchanged, and the approach's vertical rise is mostly spent — 290px → 83px at
1512×780, and nothing at 1920 and above, where the settle is a pure scale.

The rule this replaced pulled the *headline* up instead, to clear the rack's top blocks.
It is gone: clearing the arch clears the furniture under it by 30px plus 0.169 of the
plate's height, and having both made the layout circular — the headline's lock was derived
from the plate and the plate is now derived from the lock. The headline simply pins at
`--hero-gap` under the header at every width.

`--hb-scrub`, `--hb-hold` and `--hb-exit` are the last three, and the page names them
because the page needs them too, not only the component: the headline's own release has to land on the same
pixel as the plate's, and that point is `--hero-band + --hero-scrub + --hero-hold +
--hero-exit` up from the bottom of the element. A page that could not name all four could
not compute it — and
a page keeping its own copy of them beside a component that changed them would have a hero that
comes apart at the seam. They are set from `.scheme-1` values the copy overlay also reads,
which is the same one-setting-two-uses pattern as `--hero-band` → `--hb-entry-span`.

Above 1400px the copy is a two-column split — heading left, lede and buttons right, the
same `--space-20` pattern as the Our Approach header and the research rows — and the
body sits against the middle of the heading beside it, as `syncApproachOffset` does for
that section. That offset scales with the viewport rather than being a flat 92.4px,
because of the exchange rate above: a full half-heading on a 780px screen would cost
530px of plate. Full offset from about 885px of height, 40px at 780, nothing at 700 and
below. `--hero-copy` is derived from it in that arm — 324px of offset-free block, which
is constant from 1400 to 2560 because the container caps at `--container-xxl` — so the
band cannot drift out of step with the offset that sets it.

Below 560px of viewport height there is no overlay at all: a landscape phone leaves
303px under the header against a copy that wants 290, so the copy goes back into flow
above the plate and `--hb-entry-clear` drops to nothing.

Its frames are in `assets/hero-bridge/`, named by their Blender frame number so a
file, [`docs/hero-bridge-render.md`](docs/hero-bridge-render.md) and the manifest
all refer to the same thing, in two cuts: `hb####.webp` at 1600 wide and
`hb####m.webp` at 1200. Both are the whole plate — blocks fly in from the top and
the right for the whole run, so neither can be cropped.

**The page plays 276–417 of the encoded 276–468**, named by `from` and `to` on the
element. The sequence was delivered in three renders and only that span carries the
soft ground shadow; the rest is an older pass with grey legs, and it measures a
22-point drop in partial alpha coverage in a single step. The other frames stay on
disk. `tools/build-site.mjs` checks both bounds against the manifest and every
frame of the span, in both cuts, against disk.

Two numbers move together and there is no build step that will catch them drifting:
`--hb-scrub` is the scroll budget, and the scrub spends it across however many frames the
manifest offers.
The full stride-1 delivery the render doc asks for is 142 frames, which is three times
what ships — dropped in without raising the height, it would play three times faster.
The other share, the approach, is one screen and is sized to the copy laid over it,
not to the frames.

## The Approach animation

**Not currently on the page.** The pinned scrub asked the reader through many
stages of the arch being built, and the client found it hard going, so the home
page now carries the hero sequence above and the R&D cycle wheel where the scrub
used to be. The component — `assets/approach.js` and
`assets/approach.css` — and its frames are kept for the shortened sequence that
replaces it, and the build only checks the frames when the element is actually
mounted. The full build spec is at
[`wordpress-handoff/sections/approach.md`](wordpress-handoff/sections/approach.md).

`assets/approach/` also holds the four co-design cycle node renders —
`cyc0*.webp`, 320px square with alpha, the icons the home page's ring is built from.
They are not part of the sequence and nothing checks them against the manifest; they sit
there because the page reads them from there. `tools/encode-approach.mjs` only unlinks
`ap####.webp` and `ap####m.webp`, so re-encoding the sequence leaves them alone.

The ring itself is `<cycle-wheel>` — `assets/cycle-wheel.js` and `assets/cycle-wheel.css`,
a standalone custom element to the same doctrine as the hero and the CTA: it drives the
markup the page authors, reads its sticky offset back off its own stage (`--cw-pin`), and
latches once the reader has built the ring. The height of its `[data-cycle-rig]` is the
scroll budget, split into four equal beats. The full spec, latch measurement included, is
[`wordpress-handoff/sections/cycle.md`](wordpress-handoff/sections/cycle.md).

The sequence's own frames live in `assets/approach/` and are named by their Blender frame
number, so a file, the timeline marker in
[`docs/approach-render-map.md`](docs/approach-render-map.md), and the manifest
all refer to the same thing. The six beats are where the section comes to rest
and do not change; the rest of the list is simply every frame that exists as a
file. The page reads all of it from `assets/approach/manifest.json`, which the
encoder writes — so the page cannot ask for a frame that was never produced.

Every frame ships in two cuts. `ap####.webp` is the whole 2048x1432 plate, which
the desktop stage hangs full-bleed from the top. `ap####m.webp` is a 1147x888 crop
centred on the arch, which is what phones scrub: at phone width the arch covers only
a third of the full plate, and the blueprint, the half-built arch and the loaded one
are too small to tell apart. The crop rectangle lives in `tools/encode-approach.mjs`
and must stay in step with the `aspect-ratio` on `[data-arch-box]`. Which cut the
page loads is read from a CSS custom property, so the breakpoint that sizes the band
is also the one that picks the file — there is no second copy of it to drift.

122 frames ship — the six beats plus every fifth frame between them, spanning 91 to
672 — so a move between beats is a real scrub. Beats and moves are encoded differently
on purpose: the beats hold still under copy for a screenful of scrolling and stay at
native size, while the moves are only seen in passing and go out a little smaller. That
split keeps the whole sequence at 6.3 MB for the desktop cut and 4.1 MB for the phone
cut, of which a browser fetches one and never both.

The beats are keyed to events in the animation rather than spaced evenly — the first
solid block falling, the force annotations coming on, the first book being placed. See
[`wordpress-handoff/sections/approach.md`](wordpress-handoff/sections/approach.md) §1.

The section's height in `assets/approach.css` is its scroll budget, and the scrub
divides that budget among the moves in proportion to the frames each covers — so the
frame count and the height are one setting in two files. Encode more frames without
raising the height and the whole thing plays faster.

To change the sequence, edit `OPEN`/`BEATS`/`STRIDE` at the top of
`tools/encode-approach.mjs` and re-run it; it rewrites the frames and the manifest
together, and `tools/build-site.mjs` then checks the two against disk.

```sh
npm i --no-save sharp && node tools/encode-approach.mjs
```

## Images, fonts and icons

Nothing in `assets/` is hand-placed. Five encoders produce what ships:

```sh
npm i --no-save sharp   && node tools/encode-hero-bridge.mjs     # the hero frames
npm i --no-save sharp   && node tools/encode-approach.mjs        # the arch frames
npm i --no-save sharp   && node tools/encode-falling-blocks.mjs  # the closing CTA's frames
npm i --no-save sharp   && node tools/encode-images.mjs          # team, photography, icons
npm i --no-save wawoff2 && node tools/encode-fonts.mjs           # Avenir OTF -> WOFF2
```

The last two run from a clean checkout: `encode-images.mjs` reads
`source-material/image-sources/` and `encode-fonts.mjs` reads the OTFs sitting
beside the WOFF2 in `_ds/*/assets/fonts/`, and both are committed. The first three
need the bulk renders restored (see above) — and the hero's masters are the one set
that has never been in the history at all, so re-encoding that sequence needs them
from the designer.

Each target size is set from the box the image actually occupies, at about three
device pixels per CSS pixel — what a phone at DPR 3 can resolve and no more.

The seven portrait photographs on The Challenge and Our Approach are the one set that
ships in two tiers, `name.webp` at 1264 and `name-m.webp` at 800, picked by a `srcset`
the same way the hero's placeholder still is. Their row splits from one column to two at
exactly 800px of viewport rather than at the design system's 992 — two 20rem tracks and
an `--space-20` gap need 720px against a 90vw container — so the box runs 351px on a
phone, peaks at 719 one pixel before the split, and settles to a flat 600 from 1422 up.
1264 covers that at 2x and 800 covers every DPR-1 screen; a DPR-3 phone fetches the 1264,
because 3x the phone box and 2x the desktop box have converged on the same number here.
The set is 1.6 MB for both tiers, against 56 MB of master.

The three home-page illustrations — `assets/illustrations/{brain,blocks,laptop}.webp` —
ship as rendered: the full 1200x1200 plate scaled to 810 square, nothing trimmed and
nothing re-framed. The encoder used to trim each plate to its content and re-pad all
three onto a common 3:2 canvas so the row read as one set. That is gone, and the note
above the jobs in `encode-images.mjs` says why it should stay gone: these renders have a
soft cast shadow over a faint full-canvas haze, and no alpha threshold separates them —
every threshold either trims nothing or slices the shadow off against a straight edge.
The plates are already framed, so the page gives them a square box and lets them fill it.

The icon font is subsetted to the five glyphs the site can render and self-hosted;
the regeneration URL is in `_ds/*/tokens/icons.css` beside the `@font-face`. Adding
a new icon name means refetching that subset, which is the one cost of not pulling
the whole family from Google on every page load.

## Running it locally

The page fetches `support.js`, the design system, and images over HTTP, so open
it through a server rather than as a `file://` URL:

```sh
npx http-server . -p 8000 -c-1
# then open http://127.0.0.1:8000/
```

React and Babel load from unpkg at runtime, so the first paint needs network
access.

## Pages and URLs

Each page has its own URL:

| Page              | URL           |
| ----------------- | ------------- |
| Home              | `/`           |
| The Challenge     | `/challenge/` |
| Our Approach      | `/approach/`  |
| Who We Are        | `/team/`      |
| Follow Our Work   | `/follow/`    |

The slugs were shortened after the preview had been shared, so the build also
writes a stub at each old one — `/the-challenge/`, `/our-approach/`, `/who-we-are/`
and `/follow-our-work/` — that bounces to its replacement. The list is `MOVED` in
`tools/build-site.mjs`.

They all render from `index.html`, but the build writes a real file per route,
so a direct link, a refresh, or a crawler gets that page from the server with a
200 and its own `<title>` and description. In the browser the nav links are real
`<a href>` elements — they open in a new tab, and back and forward work — and the
router swaps pages client-side without a reload. `readRoute()` in `index.html`
derives the site base from the path at load, so the same build works under the
`/aug-preview/` project subpath and at a domain root.

Route slugs live in two places that must agree: `ROUTES` and `TITLES` in
`index.html`, and `PAGES` in `tools/build-site.mjs`.

## Building

```sh
node tools/build-site.mjs _site           # site root
node tools/build-site.mjs _site /aug-preview   # served under a subpath
```

The script assembles `_site`, then checks that every relative reference on every
emitted page resolves inside the artifact and exits non-zero if one does not. The
artifact is about 28 MB, and all but a megabyte of that is animation frames: 10.3
for the Approach cuts, 9.5 for the hero bridge and 4.7 for the falling blocks.

The animation frames are the one thing the reference check cannot see directly:
both components build their filenames by concatenation, so no literal
`ap0353.webp` exists in the markup to scan for. Each encoder writes a
`manifest.json` beside its frames recording what it actually produced, and the
build reads those and checks the full cross product — every frame in every cut —
against disk. Three ways to fail, all at build time rather than in someone's
browser: the manifest is missing, the page and the manifest disagree, or a frame
the pair of them promise is not there. Shipping one cut without the other is the
case worth knowing about, because it is invisible on a desktop and breaks every
phone.

## Publishing to GitHub Pages

`.github/workflows/pages.yml` builds on every push to `main` and force-pushes the
result to the **`gh-pages`** branch, which is what Pages serves. On a pull request
it builds and stops — the verify step inside `tools/build-site.mjs` is the point,
not the publish.

The repository's Pages **Source** must be **Deploy from a branch → `gh-pages` /
(root)** (Settings → Pages). Nothing else should be pushing to that branch: each
publish replaces it with a single orphan commit, so anything committed there by
hand is gone on the next push to main. Treat it as build output, because that is
all it is.

`gh-pages` is a separate root with no ancestor in common with `main`, and that is
deliberate: it means the deploy branch carries none of the source history and can
be replaced wholesale without touching anything.

### `.nojekyll` is load-bearing

GitHub Pages runs Jekyll over the published files unless a `.nojekyll` file sits
at the root, and Jekyll silently drops every directory whose name starts with an
underscore. That would take `_ds/` — the design tokens and the component bundle
— with it, and the page renders as unstyled Times New Roman with empty buttons.
Keep the root `.nojekyll`; `tools/build-site.mjs` writes one into every build too.

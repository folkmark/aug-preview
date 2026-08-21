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

It runs in three phases, and the element's height is split between them. Through the
**approach** — one screen, the scroll the copy takes to leave — the plate hangs from a
line under the copy: its first pixel of artwork on that line, its own empty top behind
the words, and its bottom off the fold wherever it does not fit. On every desktop
screen that leaves it at full edge-to-edge width from the first paint, with the rack,
the desk and the desk's cubby all above the fold. It holds there for 60% of the
approach and then **rises** into place as the last of the copy clears — a move rather
than a zoom, except on a short screen where it also has to grow. Then it **scrubs** for
70svh while the arch builds, holds on the closed span, and scrolls on.

How big it can be at entry follows from two constants measured off the first played
frame. `--hb-entry-sky` (0.226) is the share of the plate that is empty at the top, and
is what lets the words overlap it. `--hb-entry-keep` (0.5) is the share that must stay
above the fold, and it is not a round number: counting opaque pixels per row across the
desk, the count runs 229 at y 0.49 and 45 at y 0.50 — that step is the underside of the
cubby, and everything below it is legs. So the entry keeps the desktop, the books, the
cubby and its lip, and spends the legs.

The plate runs edge to edge and is never clipped by a box — its stage takes the
plate's own height rather than the screen's, so on a desk screen the bottom of the
picture is simply below the fold while the arch builds and scrolling on reveals it
whole. That matters more than it sounds: the rig this replaced cropped to the pinned
stage, which looked identical while pinned and then dragged a hard cut up through the
ground shadow the moment the stage released. The render ends in a faint edge of its
own — the last row carries the shadow plane at alpha 2.4/255 — so the bottom 4% is
feathered out, below the desk's feet at y 0.94 and touching no object.

Two custom properties are the page's business rather than the component's: `--hb-pin`
is the header's height, and `--hb-entry-clear` is how much room the page's own copy
needs. Both are set in `index.html` from the measured height of the hero copy — 380px
on any desktop width, 290px at 768, 479px on a phone and 558px at 320, where the h1
goes to four lines.

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
the 70svh scrub share of the element's height in `assets/hero-bridge.css` is the
scroll budget, and the scrub spends it across however many frames the manifest offers.
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

Its frames live in `assets/approach/` and are named by their Blender frame
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

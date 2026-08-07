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

The whole repository is about 10 MB, and everything in it either ships or builds
what ships.

### Master material is not in the repository

The Blender plates, the 8K PNG renders, the WebP frame archive, the original
Webflow export and the Avenir OTFs used to be tracked here. They came to **692 MB
of the 702 MB checked in**, and the site serves none of it — every one of them is
an *input* to a tool in `tools/`, and every output those tools produce is
committed. They now live on the designer's machine and are ignored by
`.gitignore`.

Nothing routine needs them. `node tools/build-site.mjs` and the Pages deploy work
without them; only the encoders below do, and each one exits with the path it
wants if the masters are absent. Restore them at these paths to re-encode:

| Restore to | For |
| ---------- | --- |
| `Falling Blocks/FallingBlocks_{Top,Bottom}/*.png` | `tools/encode-falling-blocks.mjs` |
| `project/renders/approach-desk/*.png` | the Approach beats |
| `project/renders/full-desk-anim-webp/*.webp` | the Approach moves |
| `project/renders/sources/` | `tools/encode-images.mjs` |

They are untracked, not lost: they were committed until `8e830fe` stripped them, so a
checkout can restore them from the history rather than from anyone's machine.

```sh
git archive 98d0243 project/renders/full-desk-anim-webp project/renders/approach-desk | tar -x
```

## The Approach animation

The pinned section on the home page scrubs the arch being built across two
desks. It is a self-contained component — `assets/approach.js` and
`assets/approach.css` — with a full build spec at
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

Nothing in `assets/` is hand-placed. Four encoders produce what ships, from
originals kept off the repository (see above):

```sh
npm i --no-save sharp   && node tools/encode-approach.mjs        # the arch frames
npm i --no-save sharp   && node tools/encode-falling-blocks.mjs  # the hero frames
npm i --no-save sharp   && node tools/encode-images.mjs          # team, photography
npm i --no-save wawoff2 && node tools/encode-fonts.mjs           # Avenir OTF -> WOFF2
```

`encode-fonts.mjs` is the exception: it reads the OTFs already in `_ds/`, so it
runs with nothing restored.

Each target size is set from the box the image actually occupies, at about three
device pixels per CSS pixel — what a phone at DPR 3 can resolve and no more.

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
| Follow Our Work   | `/contact/`   |

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
artifact is about 12 MB.

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

`.github/workflows/pages.yml` builds and deploys on every push to `main`, and
runs the build as a check on pull requests without deploying.

The repository's Pages **Source** must be **GitHub Actions** (Settings → Pages).
The workflow sets that itself via `actions/configure-pages` with
`enablement: true`. That also matters because the alternative — *Deploy from a
branch* — publishes the repository as-is: no per-page route files, so every URL
except `/` would 404, and its built-in `pages-build-deployment` run races this
workflow for whichever finishes last.

### `.nojekyll` is load-bearing

GitHub Pages runs Jekyll over the published files unless a `.nojekyll` file sits
at the root, and Jekyll silently drops every directory whose name starts with an
underscore. That would take `_ds/` — the design tokens and the component bundle
— with it, and the page renders as unstyled Times New Roman with empty buttons.
Keep the root `.nojekyll`; the Actions workflow writes one into its artifact too.

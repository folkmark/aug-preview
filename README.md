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
| `assets/`         | Images used by the page (blocks, team, approach frames, logo)        |
| `scroll-world.js` | Standalone `<scroll-world>` element, not currently used by the page  |
| `project/`        | Working material — source uploads, render frames, scratch renders    |
| `tools/`          | `build-site.mjs` (the build) and `encode-approach.mjs` (frame encode) |

Everything the published site needs sits at the repository root; `project/`
holds inputs and is deliberately left out of the deploy.

## The Approach animation

The pinned section on the home page scrubs the arch being built across two
desks. Its frames live in `assets/approach/` and are named by their Blender
frame number, so a file, the timeline marker in
`project/scratch/approach-render-map.md`, and `ARCH_FRAMES` in `index.html` all
refer to the same thing. `ARCH_BEATS` is where the six beats come to rest and
does not change; `ARCH_FRAMES` is simply every frame that exists as a file.

Only the six resting frames have been rendered so far, so a move between beats
is currently a short cross-dissolve. As the in-between frames arrive, drop the
plates into `project/renders/approach-desk/`, add their numbers to `FRAMES` in
`tools/encode-approach.mjs` and to `ARCH_FRAMES` in `index.html`, and re-run:

```sh
npm i --no-save sharp && node tools/encode-approach.mjs
```

The section turns into a continuous scrub on its own — the move lengthens
automatically once there are more frames than beats. Nothing else changes.

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

| Page              | URL                 |
| ----------------- | ------------------- |
| Home              | `/`                 |
| The Challenge     | `/the-challenge/`   |
| Our Approach      | `/our-approach/`    |
| Who We Are        | `/who-we-are/`      |
| Follow Our Work   | `/follow-our-work/` |

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
emitted page resolves inside the artifact and exits non-zero if one does not.
`project/` is left out, which keeps the deploy at ~27 MB instead of ~300 MB.

The Approach frames are the one thing the reference check cannot see directly:
the page builds their filenames by concatenating `ARCH_FRAMES`, so the script
reads that list out of `index.html` and checks each frame. Renaming the frames
without updating `tools/build-site.mjs` fails the build by design — a scan that
silently matched nothing would let a missing frame reach the browser.

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

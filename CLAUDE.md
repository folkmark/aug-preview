# Working in this repository

The AugmentED marketing site. `README.md` describes what the site is and how it is
built; this file is about where work goes and what breaks quietly.

## Two branches, and they are not the same kind of thing

| | |
|---|---|
| **`main`** | Everything. Source, the encoders, the render notes, the WordPress handoff package, and the site's own files. All work happens here. |
| **`gh-pages`** | The built site, and only what serving it needs. Not a development branch. |

`gh-pages` is the output of `node tools/build-site.mjs _site`, minus the design
system's dev files — `_adherence.oxlintrc.json`, `_ds_manifest.json` and `readme.md`
under `_ds/*/`, dropped deliberately in `6599b09`. The build still emits those three,
so re-publishing by copying `_site` wholesale puts them back. Leave them out.

Nothing that is not needed to serve the site belongs on `gh-pages`: no `tools/`, no
`docs/`, no `wordpress-handoff/`, no masters.

**A change to a shipped asset lands twice.** Make it on `main` — source, encoder,
frames, docs — then rebuild and carry only the changed artifact files to `gh-pages`.
The two are not merged into each other; `gh-pages` is regenerated, not rebased.

```sh
node tools/build-site.mjs _site        # then diff _site against the gh-pages tree
```

The diff is usually small and worth reading before committing: a component change
that does not touch page markup is three or four files, not the whole artifact.

`.github/workflows/pages.yml` also builds on every push to `main` and deploys
through the Actions path. Which of the two actually serves is a repository setting
(Settings → Pages), not something visible in the tree — so update `gh-pages` when
you change what ships, and do not assume a `main` merge alone has published it.

## The master renders are not gone, only untracked

`.gitignore` excludes `/project/` and `/Falling Blocks/`, and `README.md` says the
masters live on the designer's machine — my machine. That is true of the working tree and false
of the history: they were tracked until `8e830fe` stripped them, and every one of
them is still reachable.

```sh
git archive 98d0243 project/renders/full-desk-anim-webp project/renders/approach-desk | tar -x
```

`98d0243` holds the 590-frame WebP move archive (`anim_desk_76_00091…00680.webp`,
2048x1432, q90 with lossless alpha) and the six lossless beat PNGs. That is
everything `tools/encode-approach.mjs` needs, so the Approach sequence can be
re-encoded from a clean checkout without anyone's laptop. Restore, run the encoder,
then delete `project/` — it is 88 MB and must not be committed back.

Do not conclude that a render is unavailable until you have looked in the history
for it.

## The Approach section

The frames are addressed by string concatenation, so no build tool can see them.
`assets/approach/manifest.json` is the contract: the encoder writes it, the page
reads it, and `tools/build-site.mjs` checks every frame in every cut against disk.
Change frames and the manifest together, never one alone.

Frame numbers are **Blender** frame numbers, not indices, so a file, the marker in
`docs/approach-render-map.md` and the manifest all name the same thing. The stride
grid is anchored on the first beat and grown outward, so moving the in-point does
not renumber the sequence.

The section's height in `assets/approach.css` is its scroll budget, and the scrub
divides that budget among the moves in proportion to the render frames each covers.
Height and frame count are therefore one setting in two files: encode more frames
without raising the height and the whole section plays faster.

When any of this changes, these describe it and go stale silently:

- `wordpress-handoff/sections/approach.md` — a build spec that restates the constants, the
  maths and the byte totals so the section can be rebuilt in another stack. It is written
  to be built from, so a stale number there becomes someone's wrong implementation.
- `wordpress-handoff/README.md` — the asset inventory ("The assets") and the
  per-component porting sections.
- `README.md` — frame count and sequence weight.
- `docs/approach-render-map.md` — describes the Blender render, so an encode change
  does not touch it. Its frame numbers are the source of truth for the beats.

## Verifying a change in a browser

The page's runtime fetches React, ReactDOM and Babel from unpkg and renders the
`<x-dc>` block client-side. In a sandbox that does not resolve — the custom elements
never mount, and `approach-scrub` reports `offsetHeight` 0 or is absent entirely.
The same happens on the published artifact, so it is the environment, not a
regression.

Test the components directly instead: a minimal page with `assets/approach.css`,
`assets/approach.js` and the `<approach-scrub>` block lifted out of `index.html`
exercises the real code with the real markup and needs no runtime. Chromium is at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; drive it with Playwright and
read the component's own state (`bounds`, `moves`, `bits`, `head`) rather than
judging by screenshot alone.

Measure claims about smoothness rather than asserting them. Instrumenting `paint()`
to count ticks where the wanted frame was not resident is a better answer to "is the
budget big enough" than any amount of reasoning about it.

## House style

The comments in `assets/*.js`, `assets/*.css` and `tools/*.mjs` explain *why a thing
is the way it is and what breaks if it changes*, often at length, and they cite
measurements. Match that when editing them — a change that leaves a comment
describing the old behaviour is worse than no comment. Several of those comments are
load-bearing warnings; read them before simplifying the code they sit on.

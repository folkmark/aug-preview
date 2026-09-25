# Working in this repository

The AugmentED marketing site. `README.md` describes what the site is and how it is
built; this file is about where work goes and what breaks quietly.

## Two branches, and they are not the same kind of thing

| | |
|---|---|
| **`main`** | Everything. Source, the encoders, the render notes, the WordPress handoff package, and the site's own files. All work happens here. |
| **`gh-pages`** | The built site, and only what serving it needs. Not a development branch. |

**`gh-pages` is written by a machine, not by hand.** `.github/workflows/pages.yml`
runs `node tools/build-site.mjs _site` on every push to `main` and force-pushes the
result to `gh-pages` as a single orphan commit; GitHub's own Pages deployment then
serves that branch. So a merge to `main` publishes, and anything committed to
`gh-pages` directly is gone on the next push. Pull requests get the build as a check
only, and nothing but `main` publishes.

It follows that **what must not be published has to be kept out of `_site` by the
build**, in `copyDir()` in `tools/build-site.mjs`, not stripped from the branch
afterwards. That is where the design system's dev files (`_adherence.oxlintrc.json`,
`_ds_manifest.json`, `readme.md` under `_ds/*/`) and its `.otf` sources are left out,
and the parked Approach scrub's code and frames while `<approach-scrub>` is off the
page. `6599b09` once removed the dev files from `gh-pages` by hand; the first
automated publish put them back.

Nothing else is at risk: the build copies only `assets/`, `_ds/`, `support.js` and
`CNAME` beside the pages it writes, so `tools/`, `docs/`, `wordpress-handoff/` and the
masters never reach `_site`. Build locally to see exactly what will go out:

```sh
node tools/build-site.mjs _site        # fails on any reference the artifact cannot satisfy
```

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

**Parked.** `<approach-scrub>` has not been on the page since `e0ae9d6` (2026-08-20),
and while it is off the page the build leaves its code and frames out of `_site`, so
none of it is published. It stays in the repository for the shortened sequence meant to
replace it. `wordpress-handoff/sections/approach.md` predates that day's retune and says
so at the top; refresh it before mounting the component again. Everything below applies
the moment it returns.

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

## The team is a roster, not markup

`source-material/team/people.json` holds everyone: the people on Who We Are, the people
held back without a group, and the people tagged `Archived`. A person appears on the page
if and only if they have a group and are not Archived. `tools/build-team.mjs` writes the
tiles in `index.html` from it (between marker comments in each `.team-grid-3`), and
`build-site` fails when they differ, so **never edit a team tile by hand**. Edit the roster,
run `node tools/build-team.mjs`, and it prints what else to run.

What is published follows the roster too. The headshot encodes exist only for people on the
page, and `tools/encode-images.mjs` deletes any others. Bios of people off the page are kept
in `source-material/bios/` and never built. Held people's photographs are not committed
(this repository is public); the roster records their Drive file ID instead.
`source-material/team/README.md` has the fields.

## House style

The comments in `assets/*.js`, `assets/*.css` and `tools/*.mjs` explain *why a thing
is the way it is and what breaks if it changes*, often at length, and they cite
measurements. Match that when editing them — a change that leaves a comment
describing the old behaviour is worse than no comment. Several of those comments are
load-bearing warnings; read them before simplifying the code they sit on.

## The WordPress plugin is generated from the site

`wordpress-handoff/plugin/augmented-ed/` is how the site reaches aerdf.org: a plugin AERDF's
developer installs (`wordpress-handoff/START-HERE.md`). Half of it is generated from the site,
and that half goes stale silently unless the chain is re-run:

```sh
npm i --no-save playwright@1.63.0 linkedom@0.18.13 postcss@8.5.28 postcss-selector-parser@7.1.6 pixelmatch@7.2.0 pngjs@7.0.0
node tools/export-static.mjs && node tools/export-content.mjs   # after any index.html change
node tools/build-wp-plugin.mjs                                   # writes plugin/augmented-ed/generated/
node tools/build-wp-plugin.mjs --assemble dist && node tools/verify-wp-plugin.mjs [--live]
```

`npm i --no-save` prunes whatever it is not named in the same call, so name everything
together.

- **Never edit `generated/` by hand.** Commit it with the export it came from. CI's `plugin` job
  fails when it does not match (`--check`), without blocking the site's publish.
- **The hand-written half** is `augmented-ed.php`, `includes/`, `js/` and `css/host.css`.
  `host.css` reverts only leaks measured on aerdf.org. Add to it only what `verify-wp-plugin.mjs
  --live` reports, never speculatively, and never `all: revert`.
- **Two site files carry plugin requirements.** `assets/hero-bridge.js` `settle()` measures from
  the pin, and the hero copy's fade in `index.html` starts at `--hero-lead`. Both are no-ops
  here and load-bearing under a host header.
- **The zip is not a release.** It packages the licensed Avenir files, so never attach it to
  a release or put it on gh-pages. It goes out as the `plugin` job's artifact, which on this
  public repository any signed-in GitHub user can download (the same fonts are already
  committed under `_ds/`). `dist/` and `.wp-verify/` are git-ignored.
- **The team goes into AERDF's existing `team` post type**, in an "AugmentED Team" category.
  There is no `team_member` type; that was an earlier, wrong plan.

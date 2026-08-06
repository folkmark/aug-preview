# This branch is the published site, not the source

`gh-pages` holds the built artifact and only what serving it needs. Do not develop
here: there is no `tools/`, no `docs/`, no `wordpress-handoff/`, and no encoder, so a
change made here has no source to go back to and the next rebuild silently reverts
it.

**The source is `main`.** Everything lives there — the page source, the encoders that
produce `assets/`, the render notes, and the WordPress handoff package.

## How this branch is produced

```sh
# on main
node tools/build-site.mjs _site
```

…then the changed files are carried across. `_site` is the whole artifact; this
branch is that artifact minus the design system's dev files —
`_adherence.oxlintrc.json`, `_ds_manifest.json` and `readme.md` under `_ds/*/` —
which were dropped deliberately in `6599b09`. The build still emits all three, so
copying `_site` over this tree wholesale puts them back. It also would delete this
file, which the build does not produce. **Carry the diff, not the directory.**

A component or asset change that does not touch page markup is usually a handful of
files. Diff before committing and expect to understand every entry:

```sh
diff -rq _site <this tree>
```

## What must stay true here

- **`.nojekyll` at the root is load-bearing.** Without it GitHub Pages runs Jekyll,
  which drops every directory starting with an underscore — that is `_ds/`, the
  design tokens and the component bundle. The site renders as unstyled Times New
  Roman with empty buttons.
- **`CNAME` is the custom domain.** Losing it unpoints the site.
- **One file per route.** `index.html`, `404.html` and a directory per page, so a
  direct link or a refresh gets a 200 with its own title rather than a client-side
  redirect.
- **The animation frames are addressed by concatenation**, so nothing in the markup
  names them and no scanner can find them. `assets/*/manifest.json` records what
  exists; frames and manifest are one unit and must arrive together. Shipping the
  desktop cut without the phone cut looks perfect on a desktop and breaks every
  phone.

## If you are here to change something

Change it on `main`, rebuild, and bring the result back. If the change is urgent
enough to make here first, mirror it to `main` in the same session — an artifact
that is ahead of its source is how a fix gets rebuilt away a week later with nobody
able to explain what happened.

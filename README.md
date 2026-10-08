# AugmentED

This repository holds two things: the AugmentED site, and the WordPress plugin that puts it
on aerdf.org. The site is a single-page app in `index.html`, previewed at
[augmented2.folkmark.com](https://augmented2.folkmark.com). The plugin is generated from it,
so the pages on aerdf.org are the same pages.

## Putting AugmentED on aerdf.org

**Start at [`wordpress-handoff/START-HERE.md`](wordpress-handoff/START-HERE.md).** You
install one plugin; you do not rebuild any pages. START-HERE is the install, written for AERDF's developer: what
to confirm first, the steps, the checks, and who to ask.

- **The zip** comes from AugmentED. It is built by this repository's CI (the `plugin` job of
  the "Publish site to gh-pages" workflow), and START-HERE says which version it describes.
- **The decisions** that are AERDF's or AugmentED's to make, each with the default the
  plugin uses until someone decides, are in
  [`wordpress-handoff/DECISIONS.md`](wordpress-handoff/DECISIONS.md).
- **Questions:** Brendan, [brendan@folkmark.com](mailto:brendan@folkmark.com).

## Changing the site or the plugin

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first: where work goes, what publishes, and what
breaks quietly. Then:

- [`docs/site.md`](docs/site.md) — how the site works: the hero animation, images and
  fonts, pages and URLs, building and publishing.
- [`wordpress-handoff/README.md`](wordpress-handoff/README.md) — how the plugin is built
  from the site, and the reference behind START-HERE.
- [`source-material/README.md`](source-material/README.md) — the originals the encoders
  read, and what is deliberately not in the repository.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The whole site: every page's markup, and its `<script>` logic |
| `support.js` | The page runtime that renders the `<x-dc>` block with React |
| `_ds/` | The design system: tokens, `styles.css`, the component bundle, fonts |
| `assets/` | Web-ready images and the three animated components, sized and encoded for the page |
| `tools/` | The site build, the plugin generator and its verification, and the encoders |
| `wordpress-handoff/` | The WordPress plugin and its handoff documents |
| `source-material/` | The team roster, the bios, and the originals the encoders read |
| `docs/` | How the site works, and the hero's render notes |

Pushing to `main` publishes the site: `.github/workflows/pages.yml` builds it and replaces
the `gh-pages` branch, which GitHub Pages serves. The same workflow checks that the plugin
matches the site and builds the plugin zip.

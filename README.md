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

Everything the published site needs sits at the repository root; `project/`
holds inputs and is deliberately left out of the deploy.

## Running it locally

The page fetches `support.js`, the design system, and images over HTTP, so open
it through a server rather than as a `file://` URL:

```sh
npx http-server . -p 8000 -c-1
# then open http://127.0.0.1:8000/
```

React and Babel load from unpkg at runtime, so the first paint needs network
access.

## Publishing to GitHub Pages

Either option serves the home page at the root of the Pages URL.

**GitHub Actions (recommended).** In **Settings → Pages**, set **Source** to
**GitHub Actions**. `.github/workflows/pages.yml` then builds and deploys on
every push to `main`. It copies `index.html`, `support.js`, `scroll-world.js`,
`assets/` and `_ds/` into the published site, adds a `404.html` fallback for the
client-side routes, and fails the build if the page references a file that is
not in the artifact. `project/` is excluded, which keeps the deploy at ~59 MB
instead of ~290 MB.

**Deploy from a branch.** In **Settings → Pages**, set **Source** to **Deploy
from a branch**, branch `main`, folder `/ (root)`. This publishes the repository
as-is, `project/` included.

### `.nojekyll` is load-bearing

GitHub Pages runs Jekyll over the published files unless a `.nojekyll` file sits
at the root, and Jekyll silently drops every directory whose name starts with an
underscore. That would take `_ds/` — the design tokens and the component bundle
— with it, and the page renders as unstyled Times New Roman with empty buttons.
Keep the root `.nojekyll`; the Actions workflow writes one into its artifact too.

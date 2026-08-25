# Source material

Everything here is an *input* — nothing in this directory is served. It is kept in
the repository so the site can be rebuilt, re-encoded and re-designed without
anyone's laptop.

| Path | What it is |
| --- | --- |
| `webflow-export/` | The original Webflow site as exported: `index.html`, `team.html`, `our-approach.html`, `the-challenge.html`, `get-involved.html`, their `css/` and `js/`, and `style-guide-*.html` — the rendered style guide. Also the brand explorations (`AugmentED_5alt.png`, `AugmentED_stain_v2_vs_approved.png`), the hero storyboard frames (`H0_f0001` … `H6c_f0672`), `AugmentED_Headshots/` at original resolution, and `0001-0680.mp4`. |
| `image-sources/` | The originals `tools/encode-images.mjs` reads: `team/`, `images/` (site photography, including the seven portrait 4/5 frames on The Challenge and Our Approach — generated images that shipped in the design handover hotlinked to a CDN bucket, and are committed here because that bucket is not a home for production assets), `icons/` (the three home-page illustration plates and the four co-design cycle node renders), `schools/` (the co-design action shots, including the second Museum High frame the page does not use), `blocks/` (the six wooden-block cut-outs) and `unused/`. `unused-diagrams/` holds the co-design cycle SVGs the R&D wheel was drawn from. |
| `scroll-world.js` | An early scroll experiment, kept for reference. |

The Avenir LT Pro OTFs used to live here too. They now sit beside the WOFF2 they
produce, in `_ds/augmented-design-system-*/assets/fonts/`, which is where
`tools/encode-fonts.mjs` looks for them.

## What is *not* here

The bulk renders — Blender plates, 8K PNG sequences, the WebP frame archive — are
not in the repository and never should be: they came to 604 MB, the site serves
none of them, and every output they produce is committed under `assets/`. They live
on my machine. `tools/encode-approach.mjs` and
`tools/encode-falling-blocks.mjs` are the only things that need them, and each
prints the path it wants if it is missing. See the README's restore table.

# Source material

Everything here is an *input* — nothing in this directory is served. It is kept in
the repository so the site can be rebuilt, re-encoded and re-designed without
anyone's laptop.

| Path | What it is |
| --- | --- |
| `webflow-export/` | The original Webflow site as exported: `index.html`, `team.html`, `our-approach.html`, `the-challenge.html`, `get-involved.html`, their `css/` and `js/`, and `style-guide-*.html` — the rendered style guide. Also the brand explorations (`AugmentED_5alt.png`, `AugmentED_stain_v2_vs_approved.png`), the hero storyboard frames (`H0_f0001` … `H6c_f0672`), `AugmentED_Headshots/` at original resolution, and `0001-0680.mp4`. |
| `image-sources/` | The originals `tools/encode-images.mjs` reads: `team/`, `images/` (the two full-width 3/2 photographs, and since September 2026 nothing else — all seven of the 4/5 frames on The Challenge and Our Approach are now Shutterstock, read from `stock-photos-aug/large/` below), `icons/` (the three home-page illustration plates and the four co-design cycle node renders), `schools/` (the co-design action shots, including the second Museum High frame the page does not use), `blocks/` (the six wooden-block cut-outs), `unused/` (the six superseded home-hero frames, and the two generated 4/5 masters retired in September — `build-capabilities.png` and `engineers-screens.png`, which shipped in the design handover hotlinked to a CDN bucket and were committed here because that bucket is not a home for production assets) and `stock-photos-aug/` (the August Shutterstock selects, downloaded under Folkmark's unlimited subscription; they keep their Shutterstock asset IDs as filenames, in both the shortlist and the encoder, so a licence can be traced back to the download — the descriptive name lives on the encoder's output instead. The top level holds the web-sized comps to browse the shortlist by, and `large/` the full-resolution originals, 2266x3626 to 9504x6336, which are what `tools/encode-images.mjs` reads. Seven are in use, one per 4/5 frame, cropped by a measured box on each job: 2763377205, 2176735867, 1136122199, 2670025731, 2354739045, 2129383421 and 2757155555. Two of those, 2354739045 and 2129383421, also carry a `grade` — a per-channel multiplier that warms them into the same band as the rest of the row; the encoder's own comment has the measurements. 2380531861 and 2218619397 were selected and not taken, 2380531861 having held the Co-design frame until 2129383421 replaced it). `unused-diagrams/` holds the co-design cycle SVGs the R&D wheel was drawn from. |
| `brand-logos/` | The AugmentED logo kit as AERDF supplied it, in `EPS/`, `JPG/`, `PDF/`, `PNG/` and `SVG/`, plus `AugmentED_Brand_Guide_Page.pdf`. Eleven lockups: horizontal and vertical, each in colour, black, white and colour-with-white-text, and three standalone icons. Every wordmark lockup carries "supported by aerdf" — there is no variant without it, so a lockup that needs to omit it does not exist and must not be made by cropping one that does. No encoder reads this: the two the site ships, `assets/logo/logo-horiz.svg` and `logo-vert.svg`, are the colour SVGs copied across unchanged, because vector needs no encoding step. |
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

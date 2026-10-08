# Source material

Everything here is an *input*, and nothing in this directory is served. What is kept is
what a tool reads; the rest left the repository in October 2026 and is in its history
(`git log --all -- source-material/<path>` finds it), except the Shutterstock originals,
which are licensed files and are not in the repository at all.

| Path | What it is | Read by |
| --- | --- | --- |
| `team/` | The team roster, `people.json`: everyone the site knows about, on the page, held or archived, and the one place a team change starts. Its README has the fields. | `tools/build-team.mjs`, `tools/build-site.mjs`, `tools/build-wp-plugin.mjs`, `tools/export-content.mjs`, `tools/encode-images.mjs` |
| `bios/` | One Markdown file per person with a bio. Only Leadership's are built into pages; the rest are kept, unbuilt. Its README has the format. | `tools/build-site.mjs`, `tools/build-wp-plugin.mjs` |
| `image-sources/team/` | The headshots as received, one file per person who has been on the page. Which photograph each person has, where it came from and anything done to it is recorded against them in the roster. This repository is public, so photographs of people still waiting for a group stay in the form's Drive folder, recorded in the roster by file ID. | `tools/cutout-headshots.py` |
| `image-sources/team-cutout/` | Each person on the page, lifted off their background and framed by one rule for all of them, as a 768px RGBA WebP. Written by `tools/cutout-headshots.py` and committed, because making them takes a 973 MB matting model that is not in the repository; the tool's header says where to fetch it. | `tools/encode-images.mjs` |
| `image-sources/icons/` | The three home-page illustration plates and the four co-design cycle node renders. | `tools/encode-images.mjs` |
| `image-sources/schools/` | The three co-design workshop photographs on the home page. | `tools/encode-images.mjs` |
| `aerdf/` | AERDF's header and footer markup, as a snapshot of a public aerdf.org page with every script stripped, and where and when it was taken. Written by `tools/snapshot-aerdf.mjs`; its CSS, fonts and logos are in `assets/aerdf/`. Used only for the `/aerdf/` preview. | `tools/build-site.mjs` |
| `brand-logos/PNG/AugmentED_Logo_Color_Horiz.png` | The colour horizontal lockup from the logo kit AERDF supplied, the one that carries "supported by aerdf". It becomes the share card, `assets/logo/og-card.png`. The site's two SVG logos are the kit's colour SVGs copied across unchanged. | `tools/encode-images.mjs` |

## The licensed photography on The Challenge and Our Approach

Seven portrait photographs, two sources, both licensed, and the licences do not allow the
files to be shared as files, so no full-resolution original is committed. The encoder reads
them from two git-ignored directories under `image-sources/stock-photos-aug/`.

**Shutterstock** (Folkmark's subscription), read from `large/`: download by asset ID from the
licence history and keep the ID as the filename (`shutterstock_<id>.jpg`).

| Asset ID | Becomes |
| --- | --- |
| 2763377205 | `images/student-notebook` |
| 2129383421 | `images/codesign-tools` (a 4144x4144 square from the top of the frame) |

**Getty Images** (licensed by AERDF, October 2026), read from `getty-licensed/`. These are
*not* the originals: each is the original already cut to the box it ships in and downsized
to 2,000-2,700 px, named by Getty ID (`<id>.jpg`), because the framing was chosen by the
client in the photo review file (a crop saved as fractions of the original, which can be
re-applied to the licensed full-resolution file). The jobs therefore carry no `crop`.

| Getty ID | Becomes | Box |
| --- | --- | --- |
| 2222113845 | `images/engineers-screens` | 1:1 |
| 1324921324 | `images/teacher-two-students` | 4:5 |
| 1044232206 | `images/define-the-role` | 4:5 |
| 1469940271 | `images/build-capabilities` | 11:10 |
| 1440718884 | `images/test-in-classrooms` | 4:5 |

Without them the encoder skips those jobs (two tiers each) and re-encodes everything else;
the encoded files under `assets/images/` are committed and are what the site and the plugin
use. The other Shutterstock frames for the five Getty slots are no longer read.

The Avenir LT Pro OTFs sit beside the WOFF2 they produce, in
`_ds/augmented-design-system-*/assets/fonts/`, which is where `tools/encode-fonts.mjs` looks
for them. The site build leaves every `.otf` out of what it publishes.

## What is *not* here

The bulk renders (Blender plates, 8K PNG sequences, the WebP frame archives) are not in
the repository and never were: the site serves none of them, and every output they produce
is committed under `assets/`. They are on Brendan's machine. `tools/encode-hero-bridge.mjs`
and `tools/encode-falling-blocks.mjs` are the only things that need them, and each prints
the path it wants if it is missing.

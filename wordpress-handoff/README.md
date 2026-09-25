# AugmentED WordPress handoff

I designed and built the AugmentED marketing site. This package puts it on aerdf.org as a
**WordPress plugin**: the developer installs it rather than rebuilding the pages. **Start with
[START-HERE.md](START-HERE.md)** — one page, the install in six steps. This document is the
reference behind it: how the plugin is built, what it does on aerdf.org and why, and the
full specification of every component in it.

**Audience.** The WordPress developer at AERDF, and whoever maintains the plugin after. Where
this document says **us**, it means the AugmentED team and me together — content and
destination decisions are theirs, and anything about how the site is built is mine to answer.

**Key points:**

- **Install, don't rebuild.** `plugin/augmented-ed/` is a plugin that draws the five pages
  inside aerdf.org's own theme, under AERDF's header and footer, with AugmentED's navigation
  as a program bar beneath them — as Assessment for Good's pages do.
- **The team goes into AERDF's existing `team` post type**, in an "AugmentED Team" category,
  not a new type. Two of them (Sherry Lachman, Caitlin Mills) are already there and are
  only attached.
- **The Follow form submits to AERDF's HubSpot** through the plugin, on the server.
- **Its page-shaped half is generated from the site itself** (`tools/build-wp-plugin.mjs`), so
  it cannot drift from the site; CI fails if it does.
- **It has been verified against aerdf.org**: installed into WordPress with a stand-in AERDF
  theme wearing AERDF's real stylesheets, and rendered inside live aerdf.org pages with
  AERDF's own CSS and JavaScript running.
- Decisions only AERDF or AugmentED can make are in [DECISIONS.md](DECISIONS.md), each with a
  working default and an owner.

**Reference site.** The finished site runs at
[augmented2.folkmark.com](https://augmented2.folkmark.com). It rebuilds from `main`
on every push. Every visual and behavioral question in this package has a ground
truth there; when a spec and the site disagree, the site wins, the spec has a
bug, and I would like to hear about it.

## Contents

| Path | What it contains |
|---|---|
| [`START-HERE.md`](START-HERE.md) | The install, step by step, and the acceptance list. |
| [`DECISIONS.md`](DECISIONS.md) | Every open decision: options, the plugin's default, and who decides. |
| [`plugin/augmented-ed/`](plugin/augmented-ed/) | The plugin. `generated/` is written by `tools/build-wp-plugin.mjs`; the rest is its hand-written runtime. The installable zip (with `assets/`) is built by CI — see [How the plugin is built](#how-the-plugin-is-built). |
| [`pages/`](pages/) | Each route as rendered HTML, plus `states.json` (the components' hover and checked styles). The generator's input. |
| [`content/`](content/) | The structured content as data: team, research, cycle steps, page metadata. See [its README](content/README.md). |
| [`sections/hero-bridge.md`](sections/hero-bridge.md) | Build specification for the hero bridge. |
| [`sections/falling-blocks.md`](sections/falling-blocks.md) | Build specification for the falling-blocks CTA. |
| [`sections/cycle.md`](sections/cycle.md) | Build specification for the cycle wheel. |
| [`sections/approach.md`](sections/approach.md) | Build specification for the Approach scrub. Parked and out of date: refresh it before the scrub is mounted again. |
| [`sections/leadership.md`](sections/leadership.md) | The team grid and the bio pages, and the invariants the team export depends on. |
| `../_ds/augmented-design-system-*/` | The design system: tokens, stylesheet, fonts. |
| `../assets/` | Production images, animation frames, and the four components. |
| `../tools/build-wp-plugin.mjs`, `../tools/verify-wp-plugin.mjs` | The plugin's generator, and the harness that installs it into WordPress and verifies it. |
| `../docs/approach-render-map.md`, `../docs/hero-bridge-render.md` | Render notes. The authority for frame numbers and for what a re-render needs. |

## Key terms

| Term | Meaning |
|---|---|
| **component** | One of the four self-contained custom elements: `<hero-bridge>`, `<falling-blocks>`, `<cycle-wheel>`, `<approach-scrub>`. |
| **plate** | One rendered artwork image. The animation plates carry alpha and composite directly on the page color. |
| **frame** | One WebP file in an animation sequence, named by its Blender frame number. |
| **cut** (or **tier**) | A size variant of a sequence. Each sequence ships in two; a browser fetches one. |
| **manifest** | The `manifest.json` a sequence's encoder writes beside its frames. Components read it at runtime. |
| **stage** | The sticky inner box of a component, pinned below the header while the section scrolls. |
| **scroll budget** | The component's height minus its stage's height: the scroll distance the animation plays across. |
| **beat** | A frame the animation rests on while the visitor reads. |
| **still** | The `<img>` fallback a component shows when it does not animate. |

---

## Decisions

[DECISIONS.md](DECISIONS.md). Three block launch — the address (and what happens to the
existing AugmentED page), the HubSpot form, and the Avenir licence — and the rest have
working defaults.

## The target environment: aerdf.org

Checked directly on 2026-09-25 — aerdf.org's HTML, headers, REST index, stylesheets and
scripts, and its pages loaded in Chromium. Verify anything you depend on; installs change.

- **Hosting:** WordPress on WP Engine, behind Cloudflare. No page optimiser, Rocket Loader,
  lazy-load rewriter, smooth-scroll library or Content-Security-Policy is running.
- **Theme:** a custom classic theme, `sessionwise-starter-master` ("AERDF" by SessionWise).
  - Its header and footer are hard-coded. `header.php` opens `<main id="content"
    class="site-content">` and `footer.php` closes it, on every template.
  - The alert bar (46px, 62px on a phone) and the header (143px, 123px) are static and
    scroll away. Only the header's mobile menu overlay is fixed (z-index 1000).
  - Nothing above `main` breaks `position: sticky`.
  - It loads Bootstrap 5.0.2's reboot (`og-css2.css`) site-wide, including
    `scroll-behavior: smooth` on the root.
- **Page builder:** Elementor 4.3.1 + Pro 4.3.0, Flexbox containers only.
  - The kit sets `font-family: "avenir"` on every `a` and heading, and colours `h1`.
  - Theme Builder single template 3899 draws every team member's page.
- **Plugins:** JetEngine 3.8.13.1, CPT UI, ACF Pro 6.8.10, Gravity Forms 3.1.2
  (installed, no form in use), Yoast 28.5, Redirection, Wordfence, WP-Stateless, Use Any
  Font. GTM, GA4, CookieYes and AccessiBe load site-wide.
- **Forms:** every live form is HubSpot (portal 20910033): the footer newsletter and the
  contact page.
- **The team:** a `team` post type, 199 people, single pages at `/team/<slug>/`, grouped with
  the ordinary `category` taxonomy — one `<program>-team` parent per programme, with
  children. The job title is a custom field whose key cannot be seen from outside. Sherry
  Lachman (post 10333) and Caitlin Mills (10503) are AugmentED's two already there, in
  `leadership`.
- **Precedent:** Assessment for Good lives at `/programs/assessment-for-good/` under the
  global header, with its own program bar (an Elementor template) that sticks at the top on
  desktop and tablet.
- **The existing AugmentED page** is `/opportunities/advanced-fellows/augmented/` (page
  11371); `/augmented/` redirects there today.
- **Fonts:** every Avenir file aerdf.org itself loads returns 404. The plugin serves its own
  (family `Avenir®`, which cannot collide with AERDF's `avenir`).
- **Scripts:** every aerdf.org page throws four JavaScript errors of its own; none is the
  plugin's.

What that meant for the plugin is in [How the plugin fits aerdf.org](#how-the-plugin-fits-aerdforg).

## How the plugin is built

```
index.html ──tools/export-static.mjs──▶ pages/ (+ states.json)
            ──tools/export-content.mjs──▶ content/
            ──tools/build-wp-plugin.mjs──▶ plugin/augmented-ed/generated/
            ──tools/build-wp-plugin.mjs --assemble dist──▶ dist/augmented-ed/  (the zip)
            ──tools/verify-wp-plugin.mjs [--live]──▶ .wp-verify/report/
```

**Generated** (`generated/`, committed, never edited):

- The five page templates.
  - The site's header becomes the program bar, and the footer goes.
  - Links become `augmented_ed_url('<template>')`; asset paths become
    `augmented_ed_asset(…)`.
  - The design system's inline styles are kept exactly as exported: they are its only
    styling.
  - The Follow form gets real inputs and posts to the plugin.
  - The team grids become a loop over team posts.
- `bio.php`, rendered from the same template as the site's bio pages
  (`tools/lib/bio-page.mjs`).
- The program bar partial, and the team tile partial, proven against every exported tile
  through PHP itself.
- `css/augmented-ed.css`: the design system, the page's own rules, the components' rules and
  the hover and checked states (from `pages/states.json`), all scoped to `#augmented-ed` by
  `tools/lib/css-scope.mjs`.
- `data/`: the team for the importer, the pages' titles, and the form's fields.
- `ship.json`: every asset file the pages use. Only those ship.

**Hand-written** (`augmented-ed.php`, `includes/`, `js/`, `css/host.css`): the runtime. See
[What the plugin does](#what-the-plugin-does).

**Assembled:** `node tools/build-wp-plugin.mjs --assemble dist [--zip]` copies the plugin and
exactly the files in `ship.json` — about 22 MB, 378 files — into `dist/augmented-ed/`. The
hero ships only frames 276–417, the ones it plays.

**Checked:**

- CI's `plugin` job (`.github/workflows/pages.yml`) runs `--check`: it regenerates in memory
  and fails if `generated/` differs from what the export produces, then runs `php -l` and
  the tile test.
- The job then uploads the assembled plugin as the `augmented-ed-plugin` artifact. It never
  blocks the site's own publish.
- The zip is not a release, and it is never put on gh-pages or anywhere else. It packages the
  licensed Avenir files. This repository is public, though, so anyone signed in to GitHub can
  download a run's artifacts. That adds nothing to what the repository and the preview site
  already serve, since the same font files are committed under `_ds/`. See
  [DECISIONS.md](DECISIONS.md#delivering-the-zip--brendan).

## How the plugin fits aerdf.org

- **AugmentED pages are chosen by page template, never by slug.** On aerdf.org `/team/` is the
  team archive, and other programmes have pages called Team or Approach.
- **The templates wrap the page in `<div id="augmented-ed">` inside the theme's own
  `main#content`,** under the theme's `get_header()` and `get_footer()`. That keeps AERDF's
  analytics, consent banner and newsletter footer.
- **Scoped CSS.** Every rule is prefixed with `#augmented-ed`, and `:root`, `html` and `body`
  become that element.
  - Measured inside live aerdf.org pages, this changes zero properties on AERDF's header and
    footer.
  - It reproduces every page's layout and computed styles, except four things AERDF sets
    that the site never does: the kit's link font and heading colour, and Bootstrap's image
    `vertical-align` and button font. `css/host.css` reverts exactly those.
- **Offsets are measured, not assumed.** AERDF's header scrolls away, so everything sticky
  pins under the program bar alone, plus the admin bar when logged in. `js/augmented-ed.js`
  writes `--aug-top`, `--header-h` and `--hero-lead` onto the wrapper.
- **The hero under a host header.** The hero measures its entry from where it pins
  (`hero-bridge.js` `settle()`), and its copy's fade starts at `--hero-lead`. So once
  AERDF's header has scrolled away the first screen is the site's first screen. Both changes
  are no-ops on the site itself.
- **Root smooth scrolling is off on AugmentED pages.** Bootstrap's smooth scrolling turns the
  cycle wheel's click-to-step into a crawl.
- **The template swap runs at `template_include` priority 100.** That is after Elementor (11)
  and Elementor Pro's Theme Builder (about 12), and before Elementor's safe mode (999).

## The design system

`_ds/augmented-design-system-191b99a9-bdab-4065-b076-e3e4ea403a3a/` is the single
source of truth for every color, size, radius, and font on the site. It is plain
CSS with no build step. **Copy it; do not rewrite it** — and do not re-author the
tokens into `theme.json`. Your theme is a classic theme, where enqueued token CSS
is the correct mechanism. If you also want the tokens surfaced in the editor UI,
add a `theme.json` mapping on top — never instead.

The plugin carries it as part of one generated stylesheet, `generated/css/augmented-ed.css`:
the token files in their required order (fonts, colors, typography, layout, icons, schemes,
base — `styles.css` is only `@import`s of those, so it is not shipped twice), scoped to
`#augmented-ed`, and enqueued only on AugmentED pages with a `filemtime()` version so an
edit busts the far-future caches WP Engine and Cloudflare apply.

The files define roughly 150 custom properties — on `:root` in the site, on `#augmented-ed`
in the plugin, so none of them reaches the rest of aerdf.org. Use the semantic
aliases, not the raw ramps behind them:

- **Color:** `--brand-accent`, `--brand-accent-hover`, `--text-body`,
  `--text-muted`, `--text-inverse`, `--surface-page`, `--surface-card`,
  `--surface-dark`, `--border-hairline`.
- **Type:** `--text-h1`…`--text-h6`, `--text-large/medium/regular/small/tiny`, and
  the matching `-line-height` properties. Every size is redeclared at
  `@media (min-width: 992px)`, and that is the only breakpoint in the type scale —
  which is why 992px appears throughout the page CSS.
- **Layout:** `--radius-*`, `--space-1`…`--space-30`, `--page-gutter` (5%),
  `--section-pad-y`, `--transition-fast` (200 ms ease-in-out).
- **Schemes:** `.scheme-1`…`.scheme-4` and `.alternate` set per-section color
  roles. Every section carries exactly one. Do not invent new schemes;
  `schemes.css` says the same.

### Fonts

The site self-hosts **Avenir LT Pro** (WOFF2 in `_ds/…/assets/fonts/`).
`tokens/fonts.css` declares six weights — Light 300, Book 400, Roman 500, Medium 600,
Heavy 700 and Black 900 — and the pages use the first five: Light for large display
copy, Book for body text, Roman in the design system's components, Medium and Heavy
for headings and emphasis. Black is declared but unused. `--font-heading` and
`--font-body` both resolve to the family. Name all five in the license confirmation
below, not only the three a glance at the headings suggests.

- **Avenir is commercially licensed.** aerdf.org already self-hosts Avenir, so a
  license likely exists; before launch, confirm in writing that it covers the new
  pages or domain, and record who confirmed it.
- **Only the WOFF2 files ship.** The plugin serves them from its own `assets/fonts/`; the
  OTF files beside them in the repository are desktop originals kept as encoder inputs.
- The icon font is a five-glyph subset of Material Symbols (Apache 2.0). The
  regeneration URL sits beside the `@font-face` rule in `tokens/icons.css`. Adding
  an icon name means refetching that subset. The plugin renames its family to
  "AugmentED Symbols", so it cannot collide with a full Material Symbols a host may load.

## The assets

The plugin ships exactly the files the pages use — `generated/ship.json`, computed from the
templates' references and the sequences' manifests — and nothing else: not the parked
Approach scrub's files, not the three images that encode but that no page uses
(`images/classroom-morning.webp`, `images/student-notes.webp`, `logo/logo-light.png`), and
only the hero frames the page plays. Every image and frame is produced by four encoder
scripts (see [Regenerating the artifacts](#regenerating-the-artifacts)); the SVGs and the
components' JavaScript and CSS are hand-written.

| Path | What it is | Notes |
|---|---|---|
| `assets/hero-bridge/hb*.webp` + `manifest.json` | Hero sequence: 66 frames × 2 cuts (1600 and 1200 wide). Full cut 10.9 MB, crop 7.0 MB. | The page plays frames 276–417: 9.1 MB full cut, 5.8 MB crop. Filenames are load-bearing. |
| `assets/hero-bridge.js` / `.css` | The `<hero-bridge>` component. | See [The hero bridge](#the-hero-bridge-hero-bridge). |
| `assets/falling-blocks/w1440/`, `w720/` + `manifest.json` | Closing CTA frames: 48 per layer × 2 layers × 2 tiers. w1440 = 3.4 MB, w720 = 1.5 MB. | The stylesheet picks the tier. Filenames are load-bearing. |
| `assets/falling-blocks.js` / `.css` | The `<falling-blocks>` component. | See [The falling-blocks CTA](#the-falling-blocks-cta-falling-blocks). |
| `assets/approach/ap*.webp` + `manifest.json` | Approach sequence: 122 frames × 2 cuts. | **Parked, not published.** Do not deploy unless the scrub is mounted again. See [The Approach scrub](#the-approach-scrub-approach-scrub). Filenames are load-bearing. |
| `assets/approach/cyc0*.webp` | The four cycle-wheel node icons, 320 px square with alpha. | Used by the home page wheel. Not part of the sequence; the manifest does not track them. |
| `assets/cycle-wheel.js` / `.css` | The `<cycle-wheel>` component. | See [The cycle wheel](#the-cycle-wheel-cycle-wheel). |
| `assets/team-colour.js` / `.css` | The headshots' colour bloom on Who We Are. Not an element: it finds the team cards from the document and lays each photo's colour twin over it on hover. | Mouse and trackpad only; phones never fetch the twins. See [Headshots](sections/leadership.md#headshots) for what it needs of the markup. |
| `assets/approach.js` / `.css` | The `<approach-scrub>` component. | **Parked, not published.** Do not deploy unless mounted again. See [The Approach scrub](#the-approach-scrub-approach-scrub). |
| `assets/images/`, `assets/icons/`, `assets/logo/` | Photography, marks. | Plain images. The seven portrait photos ship in two widths picked by `srcset`. |
| `assets/team/`, `assets/team/colour/` | Headshots, 512 × 512, finished: each person cut out, framed identically (same face height, same eye line) and composited in a navy duotone onto `#e9eef4`. The folder holds exactly the people pictured on the page (the build fails otherwise), and `colour/` holds the same people in their own colour, which the hover reveals. | Use as-is — no CSS filter, no `object-position`, nothing behind them. **They ship as the plugin's own files, never through the media library**: the bloom recognises a headshot by `assets/team/` in its `src` and builds the colour URL from it by string replacement, so a renamed or WP-Stateless URL silently turns the hover off. A team post's "Bundled headshot" names one; a person added in WordPress without one shows their featured image, without the bloom. A person without a photo gets an empty square in the same `#e9eef4` (`--color-st-tropaz-lightest`). See [Headshots](sections/leadership.md#headshots). |
| `assets/illustrations/{brain,blocks,laptop}.webp` | The three home-page illustrations, 810 × 810 with alpha. | See the note below. |

**The illustrations are framed plates; do not crop them.** Each carries its own
framing and a soft cast shadow that fades over a faint full-canvas haze. Place them
in equal boxes at `aspect-ratio: 1 / 1` with `object-fit: contain`. Any crop tight
enough to change the framing slices the shadow off against a straight edge.

**Master material is not in the repository.** The Blender plates, source PNG
sequences, and frame archives (692 MB of a 702 MB checkout) were removed from
history; they live with me. Nothing in this handoff depends on them —
every encoder output is committed. They matter only for re-rendering artwork, and
each encoder prints the restore path it needs if you run it without them. The hero
sequence's masters are the one set that was never in the history at all. The render
notes in `../docs/` stayed, and they are the authority for frame numbers.

---

## The components

The page's four scroll behaviors are all portable. Each is a dependency-free
custom element with no framework and no build step. Each one drives markup the
page authors, so nothing a block editor does can leave it half-constructed, and
each degrades safely when its script does not run: the canvas rigs to their
still image, the cycle wheel to its reading column, which is real text either
way.

**The plugin installs all three mounted components**: it enqueues their scripts on the home
page (and the bloom on Who We Are), points each `base` at its frames in the plugin, and
supplies the host properties below from the measured offsets. The "To install it" steps in
each section say what that involves, for anyone porting a component somewhere else.

**Each component also has a full build specification in
[`sections/`](sections/)** — the asset contract, the math, the design decisions,
and a native-rebuild procedure — so the behavior survives even if a packaged
element cannot be used in the target stack. Install from the sections below;
open the specification when you change how a component behaves, or if one
cannot run.

### Rules that apply to every component

- **Never upload frames through the media library.** WordPress renames files on
  collision, appends `-scaled` past 2560 px, and generates size variants — and on
  aerdf.org, WP-Stateless then serves uploads from a Google Cloud Storage URL. The
  components address frames by exact name through string concatenation, so any of
  those changes 404s frames silently: the still keeps showing and nothing looks
  broken. Deploy the frame directories as files in the theme, and serve each
  `manifest.json` from the same directory as its frames.
- **Point `base` at the frame directory from PHP.** The plugin emits it with
  `esc_url( augmented_ed_asset( 'hero-bridge/' ) )`. The value must end in `/`.
  Never derive an asset base from a script's own URL; optimization plugins
  relocate scripts. (In this repository the attribute must additionally stay a
  single quoted value beginning `assets/`, because the build verifier and the
  export's path rewriter scan for exactly that shape.)
- **Enqueue with `filemtime()` versions and `'strategy' => 'defer'`.** The
  scripts are defer-safe and order-independent.
  The plugin's `includes/assets.php` does this for the three
  mounted components and the headshots' colour bloom, gates everything to the
  AugmentED pages and the team members' bio pages, and adds the
  optimizer opt-out attributes from
  [Protect the components from optimization plugins](#protect-the-components-from-optimization-plugins).
- **Full-page caching is safe because the components make it safe.** Each records
  the frame a canvas holds in a `data-` attribute and clears those attributes on
  boot. Without the clear, a cache that serializes the rendered DOM hands the next
  visitor a blank canvas that claims to be drawn. Do not remove the boot-time
  clear; the bug it prevents was real and was found through this repository's own
  static export.
- **The section height is the scroll budget.** Each component's height minus its
  stage's height is the scroll distance its animation plays across, so height and
  frame count are one setting in two places. Encode more frames without raising
  the height and the animation plays proportionally faster. Nothing warns you.
- **The stacking context is load-bearing.** The sequence components cross-fade two
  canvases under `mix-blend-mode: plus-lighter` inside `isolation: isolate`. A
  theme ancestor with a `filter`, an `opacity` below 1, a `transform`, or its own
  `mix-blend-mode` can break the blend. If plates ever look washed out or blown
  out, inspect the ancestor chain first.
- **Degradation is deliberate.** Reduced motion, Save-Data or slow connections,
  and missing browser features each collapse a component to its still. These are
  separate checks because they mean different things; port them as they are.

### The hero bridge (`<hero-bridge>`)

The home page opens on a scroll-scrubbed sequence: a toy-block arch assembles
between a server rack and a school desk. The plate is pinned under the header from
load with the hero copy laid over it; the copy scrolls away, the arch builds across
the scrub, holds, and eases out. The `<img>` inside the markup is the finished-hero
still: it is what renders with scripting off, under reduced motion, on Save-Data,
and before the first frame decodes — and it is the LCP element in each of those
cases.

To install it:

1. Copy `assets/hero-bridge.js`, `assets/hero-bridge.css`, and the
   `assets/hero-bridge/` directory into the theme.
2. Enqueue the script and stylesheet per the shared rules.
3. Copy the hero markup from `pages/home.html` (the `<section>` containing
   `[data-hero-copy]` and `<hero-bridge>`), with `base` pointing at the frame
   directory.
4. Copy the hero-copy CSS block from the page head. The copy animation
   (pinned headline, dissolving body) is the host page's, not the component's:
   plain CSS using `position: sticky` and `animation-timeline: scroll()`, with no
   JavaScript and no reference to the component.
5. Set the seven host properties below against the theme's own header and copy.

**Read [the build specification](sections/hero-bridge.md) before changing its
behavior — or if the element cannot run in the target stack.** It documents the
frame contract and the played-span measurements, the entry and exit math with
every clamp's failure mode, the loading measurements, and a native-rebuild
procedure with verification steps.

**Host-supplied custom properties.** The first four size and place the plate; the
last three pace it. Five of them (`--hb-entry-clear`, `--hb-entry-zoom` and the three
pacing lengths) are registered with `@property`; `--hb-pin` and `--hb-arch-clear` are
read back as plain values. If a build pipeline strips `@property` rules, the element
falls back to safe-but-wrong defaults, so do not strip them.

| Property | This site sets | What it is |
|---|---|---|
| `--hb-pin` | `var(--header-h)`: `6rem` on the site; in the plugin, measured (the program bar, plus the admin bar when logged in) | The sticky header's height. The element reads it back off its stage's computed `top`, so CSS and JS cannot disagree, and an admin bar needs no code change. |
| `--hb-entry-clear` | derived from `--hero-band` | How much room the host's copy needs under the header, as a length. **Budget it carefully:** the entry plate is solved from the room left under this line divided by 0.174, so one pixel of copy costs 5.75 px of picture. A theme with taller hero copy gets a visibly smaller plate; fix the copy, not the component. |
| `--hb-entry-zoom` | `2` above 991 px, else `1` | How far past edge-to-edge the entry may grow. `1` is the safe default (artwork content spans the full plate width; more crops it). Two ceilings usually bind first: `--hb-entry-keep` on laptops, `--hb-max` on large screens. |
| `--hb-arch-clear` | `--hero-gap + --hero-h1 + 30px` | Where the top of the *finished* bridge must land below the header. Needed the moment copy pins over the picture, because the arch tops out above the furniture (plate y 0.100). Default `0px` leaves the plate at rest. |
| `--hb-scrub` | `140svh` (2× the component default) | How much scroll the sequence plays across. Tied to the frame count: change one, change the other, or the assembly plays at a different speed. |
| `--hb-hold` | `20svh` | A beat of stillness on the finished bridge, on top of the scrub's built-in 15% tail hold. |
| `--hb-exit` | `45svh` | The half-window of the velocity ramp that eases the release. See the warning below. |

The component owns the artwork constants — `--hb-entry-sky` 0.226,
`--hb-entry-keep` 0.4, `--hb-entry-min` 0.25, `--hb-arch` 0.1001, `--hb-max` — all
measured on this sequence's frames. If a different sequence ever replaces this one,
re-measure them on *its* first played frame; the camera moves during the scrub, so
a later frame gives wrong values.

**The copy overlay contract.** Four properties of the markup are load-bearing:

- The `h1` is a direct child of `[data-hero-copy]`, a sibling of the body wrapper.
  Sticky positioning holds an element only within its containing block; nesting the
  headline in a copy-sized wrapper cuts its pin range to nothing.
- No element between the overlay and the headline may carry a `transform`. A
  transformed ancestor becomes the sticky element's containing block and kills the
  pin.
- `[data-hero-copy]` spans the hero with `pointer-events: none`, handing events
  back to its children; the body's dissolve also ends at `pointer-events: none` so
  invisible buttons are not clickable.
- The whole arrangement sits inside `@supports (animation-timeline: scroll())` and
  `@media not (prefers-reduced-motion: reduce)`. The fallback is copy that simply
  scrolls away; nothing is ever left stranded at `opacity: 0`.

The overlay must release on the same pixel the plate does: place its `bottom` at
`100% − <entry> − <scrub> − <hold> − <exit> − <the copy's own top offset and height>`,
include the heading's bottom margin (sticky is constrained by the margin box), and
name the headline in the element's `exit-with` attribute so it rides the same ramp.

> **Warning: do not set `--hb-exit` to `0px`.** While pinned the picture is
> stationary; the instant the pin releases it moves at page speed. That is a step
> from 0 to full velocity in one frame, and the eye reads velocity — the hero
> appears yanked off screen. The ramp blends the two across a window straddling the
> release. Its peak rate of velocity change is `0.75 / --hb-exit`; a reader
> scrolling *V* px per frame sees a step of `0.75 V² / --hb-exit`, which is why the
> half-window is 45svh. If the release feels abrupt, raise `--hb-exit`, not
> `--hb-hold`.

**Warnings:**

- **`from="276" to="417"` is not decoration.** The manifest encodes 276–468, but
  only 276–417 carries the soft ground shadow; the rest is an older render pass
  with gray legs. Widen the span and the arch visibly changes color mid-scrub. See
  [the hero render notes](../docs/hero-bridge-render.md).
- **Never clip the plate with a box.** The stage takes the plate's height, not the
  screen's, and hangs below the fold. Adding `overflow: hidden` to the stage as a
  tidy-up recreates the exact bug this design replaced: a hard clip line walking up
  through the ground shadow at release.
- **The stage's height is declared in `hero-bridge.css`, not derived from
  content.** A sticky box is constrained to its parent's content box; moving the
  scroll budget into padding gives the stage a sticky range of zero and the hero
  scrolls past without pinning.
- **The bottom 4% of the plate is masked**, on `[data-hb-box]` rather than on the
  canvas layers, because the render's last row carries the shadow plane at alpha
  2.4/255 and composites as a hard step. Masking the layers separately changes the
  picture during cross-fades.
- **The host must clip sideways.** With `--hb-entry-zoom` above 1 the plate
  overhangs the viewport during the entry. Clip at the page wrapper with
  `overflow-x: clip` — `clip`, not `hidden`, because `hidden` creates a scroll
  container and breaks the sticky stage.
- **Keep `--hb-entry-min`.** On a viewport shorter than the copy needs, an
  unclamped entry solve goes negative, and a negative scale mirrors the plate off
  screen. A landscape phone finds this case.
- **The still `<img>` carries no inline style.** Its positioning belongs to the
  stylesheet; an inline `height:auto` breaks registration between the still and
  the canvases.
- **Do not put the page's `data-reveal` attribute on the hero copy.** That
  mechanism latches `opacity` to 1 on a timer and its transition smears every
  scrubbed value. The two cannot share an element.

### The falling-blocks CTA (`<falling-blocks>`)

Two depth plates of falling toy blocks sandwich the closing call to action: the far
plate sits behind the copy, the near plate passes in front of the heading and
behind the body and buttons. The rig pins for 140svh while the blocks tumble
through.

To install it:

1. Copy `assets/falling-blocks.js`, `assets/falling-blocks.css`, and the
   `assets/falling-blocks/` directory (both tiers and the manifest) into the theme.
2. Enqueue the script and stylesheet per the shared rules.
3. Emit the markup. Copy it from `pages/home.html` (or the current shape from
   `index.html`); the element builds no DOM of its own. The live configuration is:

```html
<falling-blocks base="…/falling-blocks/" width="1440" frames="48"
                layers="bottom,top" revolutions="0.6" budget-mb="128"
                min-width="0" stage-fill="0.93"
                content-bottom="0.273,0.700" content-top="0.183,0.775"
                speed-bottom="1" speed-top="1.25">
  <div data-fb-stage>
    <div data-fb-layer="bottom" aria-hidden="true">
      <canvas></canvas>
      <img src="…/falling-blocks/w1440/bottom/fb0001.webp" alt=""
           width="1440" height="2160" loading="lazy" decoding="async">
    </div>
    <div data-fb-copy>
      <h2>Join us in building better foundations for AI in education.</h2>
      <div data-fb-front>
        <p>…</p>
        <!-- buttons -->
      </div>
    </div>
    <div data-fb-layer="top" aria-hidden="true">
      <canvas></canvas>
      <img src="…/falling-blocks/w1440/top/fb0001.webp" alt=""
           width="1440" height="2160" loading="lazy" decoding="async">
    </div>
  </div>
</falling-blocks>
```

4. Set the header offset and the height. The element's height minus one screen is
   the pin length; this site pins for 140svh:

```css
falling-blocks {
  --fb-sticky-top: var(--header-h);        /* the fixed header's height: 6rem here */
  height: calc(240svh - var(--header-h));  /* 240 − 100 = 140svh of pin */
}
```

**Configuration notes:**

- **The stylesheet picks the tier.** `falling-blocks.css` sets `--fb-tier: 720`
  and `--fb-budget: 48` at `(max-width: 900px)` or `(max-height: 500px)`; the
  element reads both back. The budget shrinks with the tier deliberately: a byte
  ceiling alone buys *more* frames when each frame gets cheaper, and the measured
  result was the phone holding more decoded bitmap than the desktop.
- **`width`, `budget-mb`, and `revolutions` are a performance budget, not
  preferences.** A frame decodes to width × height × 4 bytes regardless of its
  size on disk. These values were tuned down after Chrome reported the tab as
  slowing the machine. Measure before raising any of them.
- **`content-<layer>` is measured from the render, not chosen.** It records where
  each layer's blocks sit as fractions of the plate height, and the motion is
  defined from it. Re-render the plates and these change; the encoder prints the
  bounds it produced.
- **`speed-<layer>` multiplies the travel.** 1 means the layer's last block leaves
  exactly as the pin ends. Below 1 strands blocks on screen and is never right.
- `stage-fill` (0.93) matches the share of the viewport the desk artwork occupies
  further down the page.
- With `min-width="0"` the element animates at every width. Reduced motion,
  Save-Data, and slow connections still collapse it to the stills at one screen.

**Warnings:**

- **`data-fb-front` is load-bearing, not cosmetic.** The near plate passes in
  front of the heading and behind everything inside `data-fb-front`. A headline
  reads fine with a block crossing it; body copy and buttons do not. Do not give
  `data-fb-copy` a `z-index` — that creates a stacking context and collapses the
  copy into one layer with the plate over all of it. For the same reason, do not
  put an animating opacity (such as `data-reveal`) on the copy.
- **Keep the `<img>` stills and keep them `loading="lazy"`.** They are the no-JS
  and reduced-motion fallback. An image with no layout box is never near the
  viewport, so the lazy attribute is what stops the animated path from paying for
  them.
- **Both layers are trimmed to the same output height at encode time**
  (`trimBelow` in the encoder). A difference there puts the two depth planes out
  of registration; the encoder fails the build on it.

The full markup contract and every attribute are documented at the top of
`assets/falling-blocks.js`.

**Read [the build specification](sections/falling-blocks.md) before changing
its behavior — or if the element cannot run in the target stack.** It documents
the sandwich, the content-bounds motion, the tier and residency arithmetic
(including the measured fetch-loop regression its window design prevents), and
a native-rebuild procedure with verification steps. One host detail it
specifies that the install alone can miss: the component stylesheet slots an
`h1` between the plates, and this page's `h2` needs the equivalent rule in the
page stylesheet.

### The cycle wheel (`<cycle-wheel>`)

The home page's R&D cycle: a ring of four icon nodes the reader's own scroll
draws, arc by arc, in lockstep with a reading column of four expandable rows.
Clicking a node or a row travels the page to that step's beat; keyboard focus
opens a step in place; the build latches once complete. Below 992 px the wheel
is a plain accordion. No frames and no canvas — the only images are the four
icons — so this is the lightest component to install.

To install it:

1. Copy `assets/cycle-wheel.js`, `assets/cycle-wheel.css`, and the four icon
   files (`assets/approach/cyc0*.webp`) into the theme.
2. Enqueue the script and stylesheet per the shared rules.
3. Copy the `<cycle-wheel>` markup from `pages/home.html`, rendering both arms
   from one content source (`content/cycle.json` holds the four steps).
4. If the theme's sticky header is not 4.5 rem tall, set
   `cycle-wheel { --cw-pin: <header height>; }` — the stage's pin and the
   scroll clock both follow it.

**Read [the build specification](sections/cycle.md) before changing its
behavior — or if the element cannot run in the target stack.** It documents the
beat-windowed clock, the measured 0.97 latch and why that value cannot be
eased, the click-versus-focus semantics, the repaint discipline, a verification
procedure, and a native-rebuild fallback.

### The Approach scrub (`<approach-scrub>`)

> **Status: parked.** AugmentED found the long scrub hard going, so the home page
> now runs the hero bridge and the cycle wheel instead. The component and its frames
> are kept in the repository for the shortened sequence planned to replace it, but
> the site build no longer publishes them, and nor should you. **Do not port or
> deploy it** as part of rebuilding the site as it stands.
>
> Its [build specification](sections/approach.md) predates the component's last
> retune, and says so at the top. The numbers below and in the spec (heights,
> timing, sizes) are the old tuning. Treat the code as the source of truth and
> refresh the spec before the scrub returns.

A canvas sequence scrubbed through six beats, with copy and tick markers synced to
it, a camera push-in, and a separate crop for phones. Same doctrine as the other
two components.

**Read [the build specification](sections/approach.md) before touching it.** It
documents the frame contract, the scroll and camera math, the design decisions
that look arbitrary and are load-bearing, and a five-minute smoke test. If the
section is ever rebuilt natively instead of ported, that document is the
specification.

If and when it mounts, installation follows the shared pattern: copy
`assets/approach.js`, `assets/approach.css`, and `assets/approach/`; enqueue;
emit the markup contract from the top of `assets/approach.js` with `base` set;
set `--arch-pin` to the theme header's height. The element's own height is the
scroll budget (1250vh desktop, 1240svh phone, per `assets/approach.css`). Component-specific warnings —
the manifest requirement, the top-edge anchor, the crop contract, the
reduced-motion fallback's dependency on the reveal sweeper — are in the
specification.

---

## What the plugin does

The prototype's own runtime (the router, `support.js`, React from a CDN) is not in the plugin;
nothing in it is needed. What the pages did at runtime, the plugin does:

| On | The plugin | Where |
|---|---|---|
| Every AugmentED page | Draws the page from its template, inside the theme's header and footer. | `includes/templates.php` |
| | Links each page to the others by template. | `includes/links.php` |
| | Loads the scoped stylesheet, `css/host.css`, and only the component scripts that page uses, deferred, `filemtime()`-versioned, with the optimiser opt-outs. | `includes/assets.php` |
| | Measures the offsets: what is fixed above the program bar, the bar, the hero's lead. | `js/augmented-ed.js` |
| | The reveal (the site's `data-reveal`, 64 blocks): the same 92% line; hidden only once script is known to be running, and shown after 4s regardless. | `js/augmented-ed.js`, `css/host.css` |
| | The program bar's menu on a phone: toggle, scroll lock, Escape, placed under the bar wherever the bar is. | `js/augmented-ed.js` |
| Who We Are | Draws each group's tiles from team posts, in their order. | `includes/team.php` |
| A team member's page | The AugmentED bio page for members only in AugmentED; AERDF's own page for members also in another programme (Sherry, Caitlin), switchable per person. Members without a bio redirect (302) to Who We Are and are left out of the sitemap. With Yoast, the page is a ProfilePage about a Person. | `includes/team.php` |
| Follow Our Work | Real inputs, the site's required fields, native validation; submits through the plugin to HubSpot, in place with script and by redirect without. | `includes/follow.php`, `js/follow-form.js` |
| Admin | Settings → AugmentED (HubSpot, layout, AERDF's job-title field, a status panel, a test submission); Tools → AugmentED team (create the pages, import the team); `wp augmented-ed team import`. | `includes/admin.php`, `includes/cli.php` |

## Content

No CMS sits behind the prototype; its copy is in `index.html`. In WordPress:

- **Page copy** stays in the generated templates. A copy change is made on the site,
  re-exported, regenerated, and shipped as a plugin update.
- **The team** is WordPress content, as posts of AERDF's `team` type
  ([`content/team.json`](content/team.json) is the source the importer reads, through
  `generated/data/team.json`):
  - The groups are child categories of "AugmentED Team" (`augmented-team`):
    `augmented-leadership`, `augmented-research-partners`, `augmented-education-fellows`,
    `augmented-technology-and-design-partners`, ordered by term meta.
  - The card is the plugin's post meta, edited in the "AugmentED card" box:
    `augmented_ed_role`, `_affiliation`, `_location`, `_linkedin`, `_website`, `_sort`,
    `_photo` (a bundled headshot's slug), and `_template` (the bio page style).
  - The bio is the post's content. A post with no content has no bio page.
  - Sherry Lachman and Caitlin Mills already exist on aerdf.org and are attached, not
    recreated. Their AERDF titles, bios and photos are untouched.
  - The importer's rules — what it creates, attaches, refuses and skips — are at the top of
    `includes/importer.php`.
- **Research items** and **cycle-wheel steps** stay in the home template, as fixed copy.

### The Follow page form

The site's form never submitted anywhere. The plugin's does:

- **Fields:** first name, last name, email, contact number, "which best describes you" (nine
  options, Educator preselected), message, and consent.
  - Required, as the site's source intends: first name, last name, email, message and
    consent. The live site requires nothing, because its framework drops the attribute.
- **Destination:** a HubSpot form in AERDF's account (portal and form ID in Settings), through
  `admin-post.php` on the server. The browser never calls HubSpot.
  - With script, it posts by `fetch` and answers in place; without, it posts and redirects
    back with a message.
  - Spam defences: a honeypot, a minimum time on the form (three seconds, measured by the
    visitor's browser, so a wrong device clock cannot drop a sign-up), and a rate limit per
    address. There is no nonce, because WP Engine's page cache would make it stale.
- **What AERDF's HubSpot form needs:** exactly these fields and CAPTCHA off.
  [START-HERE step 4](START-HERE.md#4-connect-the-follow-form) lists them.
- **2027:** HubSpot ends support for its v1–v3 APIs in September 2027. The submission call is
  one class, `Augmented_ED_HubSpot`, which already accepts a private-app token.

### Page metadata

Titles and descriptions for search and social, written into Yoast's fields when "Create the
pages as drafts" makes the pages (only where empty; also exported as `content/pages.json`):

| Route | Title | Description |
|---|---|---|
| `/` | AugmentED \| Bridging AI and the classroom | AugmentED is a team of educators, researchers, and technologists working together to build the evidence base for what AI should (and shouldn’t) do in the classroom, and the technology to do it well. |
| `/challenge/` | The Challenge \| AugmentED | AI is arriving in classrooms whether schools are ready or not. The danger is that some are rushing in without asking what AI can do well, what teachers uniquely bring, or what students actually need. |
| `/approach/` | Our Approach \| AugmentED | We believe better educational AI will emerge from discovering what classrooms actually need, building solutions with real educators and students, and testing them in real classrooms. |
| `/team/` | Who We Are \| AugmentED | AugmentED brings together people from classrooms, research labs, and engineering teams who share a conviction that AI should augment human teaching, not replace it. |
| `/follow/` | Follow Our Work \| AugmentED | Get updates on AugmentED's work and research findings. |

Each bio page's description is its bio's first sentence, the same cut the site's bio pages
use, written into Yoast by the import (only where empty).

### Redirects

- **On aerdf.org, the site's old preview slugs** (`/the-challenge/` and the rest, in
  `content/redirects.csv`) **never existed** and need no rules.
- **What aerdf.org may need:** a rule from the existing AugmentED page
  (`/opportunities/advanced-fellows/augmented/`) to the new home, if AERDF retires it. See
  [DECISIONS.md](DECISIONS.md).
- **The preview domain,** `augmented2.folkmark.com`, should point at the production address
  once there is one. That is a DNS or GitHub Pages change, not a WordPress one.

## Protect the components from optimization plugins

Two plugin classes break this site in ways that are invisible at deploy time.
Neither is installed on the target site today; both are common enough that the
exclusions belong in the theme and in this document.

**Image optimizers reach into theme directories.** EWWW's bulk optimizer and
"Folders to Optimize", Smush's Directory Smush, ShortPixel's other-folders
feature, and edge optimizers (Cloudflare Polish, Jetpack Photon) can re-compress
images outside the media library, in place. One bulk run re-encodes every
carefully tuned frame — same filenames, degraded pixels, nothing visibly broken.

- Exclude the component asset directories from every image-optimization plugin
  and every CDN image feature (including WebP-to-AVIF conversion).
- Treat the byte totals in [The assets](#the-assets) as the tamper check: a
  re-compressed sequence announces itself as a changed directory total.

**JavaScript and CSS optimizers break scroll-driven code.** "Delay JS until
interaction" features (WP Rocket, LiteSpeed) boot scripts on the first scroll —
which for a scroll-scrubbed hero means booting mid-scroll, already late. Combine
and minify features relocate scripts, and WP Rocket's CSS minifier has a
documented history of corrupting `calc()` and `clamp()` expressions — which the
scroll budgets are made of.

- Exclude the component scripts and stylesheets from delay, combine, minify, and
  remove-unused-CSS features, by handle and by filename.
- Exclude the still images from plugin lazy-load rewriting: the hero still
  (`assets/images/hero-bridge.webp`) is the LCP element, and the component stills
  are the no-JS fallback — a plugin that rewrites their `src` to a
  `data-lazy-src` breaks both. The components' own `loading="lazy"` attributes
  are correct and stay.
- The plugin adds the belt-and-braces attributes to its script tags through the
  `script_loader_tag` filter: `nowprocket` (WP Rocket), `data-no-defer="1"` (LiteSpeed),
  `data-jetpack-boost="ignore"`, `data-cfasync="false"` (Cloudflare Rocket Loader) and
  `data-nitro-exclude` (NitroPack, which WP Engine's Page Speed Boost is built on). None of
  these optimisers runs on aerdf.org today (checked 2026-09-25).
- Exclude the plugin's folder, `wp-content/plugins/augmented-ed/assets/`, from every image
  optimiser; that is where the frames are.
- Do not add a smooth-scroll plugin to pages with these components. Anything that
  virtualizes the scroll position desynchronizes code that reads native scroll.

## Acceptance checklist

[START-HERE.md](START-HERE.md#acceptance) has the short list for the install. The detail
below is the full one. `tools/verify-wp-plugin.mjs` checks most of it automatically on a
local install, and `--live` checks it inside aerdf.org's own pages. Test logged out *and*
logged in (the admin bar moves the offsets), and on aerdf.org with the AccessiBe widget
active.

**Per page, against [the reference site](https://augmented2.folkmark.com):**

- [ ] Matches the reference at 360, 768, 1440, and 1920 px wide.
- [ ] Title and meta description match [Page metadata](#page-metadata).
- [ ] No console errors; no 404s in the network panel (frame requests included).

**Hero bridge:**

- [ ] Plays frames 276–417; the arch does not change color mid-scrub.
- [ ] The headline pins for the whole hero and releases together with the plate —
      no gap where one leaves and the other stays.
- [ ] The release is a ramp, not a snap.
- [ ] Reduced motion, Save-Data, and script-off each show the finished-bridge
      still in normal flow, with no blank band above it.

**Cycle wheel** (full criteria in [`sections/cycle.md`](sections/cycle.md)):

- [ ] The ring builds with scroll, latches complete, and never un-builds on the
      way back up after completion.
- [ ] Clicking a step travels the page; keyboard focus opens a step in place.
- [ ] Below 992 px the wheel is an accordion with no pinned run.

**Falling blocks:**

- [ ] The near plate crosses the heading but never the body or buttons.
- [ ] Phones fetch only `w720` frames; desktops only `w1440`.
- [ ] Reduced motion and Save-Data show the frame-1 stills at one screen.

**Who We Are and the bio pages** (full criteria in [`sections/leadership.md`](sections/leadership.md)):

- [ ] 30 headshots and 2 placeholder squares in `#e9eef4`, in the four groups and the
      order of `content/team.json`; the people without a title show no empty line.
- [ ] With a mouse, a headshot's colour blooms in from the pointer and drains on
      leaving; on a phone or tablet nothing blooms and no `assets/team/colour/` file is
      requested.
- [ ] The 21 "Read bio" tiles each open `/team/<slug>/`: an AugmentED bio page for the
      19 who are only in AugmentED, AERDF's own page for Sherry Lachman and Caitlin Mills.
- [ ] The 11 without a bio redirect to Who We Are.

**Site-wide:**

- [ ] All 64 reveal blocks become visible; none is stranded at `opacity: 0`.
- [ ] "Send test submission" (Settings → AugmentED) is accepted, and a submission from the
      page arrives in HubSpot.
- [ ] Fonts self-hosted, WOFF2 only; Avenir license confirmation on file.
- [ ] The plugin's `assets/` excluded from image optimisation; the hero's manifest returns 200.
- [ ] AERDF's header, footer and every other page are exactly as before.

## Regenerating the artifacts

Every file this handoff lists is committed and final; **none of these commands is
needed to rebuild the site in WordPress.** They matter only when the artwork or
the export changes. The encoders read master material that is no longer in the
repository and print the restore path they need if you run them without it.

| Command | What it does |
|---|---|
| `node tools/export-static.mjs` | Re-renders `pages/` from the live prototype and stamps each page with its source commit. Needs `npm i --no-save playwright` and browser network access. |
| `node tools/export-content.mjs` | Re-parses `pages/` into the `content/` data files. Run it after every export. |
| `node tools/encode-hero-bridge.mjs` | Re-encodes the hero frames and manifest. Widths: `FULL_W` / `CROP_W` in the script. |
| `node tools/encode-falling-blocks.mjs` | Re-encodes the CTA frames and manifest. Tiers: `WIDTHS` in the script. |
| `node tools/encode-approach.mjs` | Re-encodes the parked Approach frames and manifest. Sequence: `OPEN` / `BEATS` / `STRIDE` in the script. |
| `python3 tools/cutout-headshots.py [--only=<slug>]` | Cuts a headshot out of its photo and frames it; writes `source-material/image-sources/team-cutout/`. Needs a 973 MB model that is not committed — the script's header says where to get it. Only for a new or replaced photo. |
| `node tools/encode-images.mjs` | Re-encodes photography and headshots from committed sources, including the headshots' duotone and their colour twins. |
| `node tools/encode-fonts.mjs` | Converts the design system's Avenir OTFs to the committed WOFF2. Needs `npm i --no-save wawoff2`. Only if the font files change. |
| `node tools/build-wp-plugin.mjs` | Regenerates the plugin's `generated/` from `pages/`, `content/` and the bios. Run it after every export, and commit the result; CI fails if you do not. Needs `npm i --no-save linkedom postcss postcss-selector-parser` (versions in its header). `--assemble dist [--zip]` builds the installable plugin. |
| `node tools/verify-wp-plugin.mjs [--live]` | Installs the assembled plugin into a fresh local WordPress (PHP 8, SQLite, a stand-in AERDF theme) and checks it end to end; `--live` also renders it inside real aerdf.org pages. Reports to `.wp-verify/report/`. |
| `node tools/build-site.mjs _site` | Builds the static site for comparison while rebuilding. It is exactly what the reference site serves: leaving out the design system's dev files and `.otf` sources, and the parked Approach scrub. |

# AugmentED WordPress handoff

This package contains everything you need to rebuild the AugmentED marketing site in
WordPress: the rendered markup of every page, the design system, the production
assets, three portable animation components, and build specifications for the two
sections that need them.

**Audience.** A WordPress developer rebuilding this site, most likely inside
aerdf.org's existing custom theme. The package assumes you know WordPress theme
development (enqueueing, page templates, custom post types) and modern CSS. It does
not assume you have seen this codebase before; each section states what you need and
where it lives.

**Key points:**

- The design system, the assets, and the page markup transfer as they are.
- The three scroll-driven animations are dependency-free custom elements. To port
  one, copy its files, enqueue them, and emit its markup. Do not rewrite them.
- The page behaviors written against the prototype's runtime must be rebuilt. Most
  are trivial. The one intricate case, the R&D cycle wheel, has its own
  specification: [The cycle wheel](sections/cycle.md).
- Two decisions need an owner before work starts: where the site lives, and where
  the Follow page's form submits. See [Decisions to make first](#decisions-to-make-first).

**Reference site.** The finished site runs at
[augmented2.folkmark.com](https://augmented2.folkmark.com). It rebuilds from `main`
on every push. Every visual and behavioral question in this package has a ground
truth there; when a spec and the site disagree, the site wins and the spec has a bug.

## Contents

| Path | What it contains |
|---|---|
| [`pages/`](pages/) | Each route as rendered HTML. Build templates from these files, not from `index.html`. |
| [`sections/approach.md`](sections/approach.md) | Build specification for the Approach scrub (not currently mounted). |
| [`sections/cycle.md`](sections/cycle.md) | Build specification for the R&D cycle wheel on the home page. |
| `../_ds/augmented-design-system-*/` | The design system: tokens, stylesheet, fonts. |
| `../assets/` | Production images, animation frames, and the three components. |
| `../docs/approach-render-map.md`, `../docs/hero-bridge-render.md` | Render notes. The authority for frame numbers and for what a re-render needs. |

## Key terms

| Term | Meaning |
|---|---|
| **component** | One of the three self-contained custom elements: `<hero-bridge>`, `<falling-blocks>`, `<approach-scrub>`. |
| **plate** | One rendered artwork image. The animation plates carry alpha and composite directly on the page color. |
| **frame** | One WebP file in an animation sequence, named by its Blender frame number. |
| **cut** (or **tier**) | A size variant of a sequence. Each sequence ships in two; a browser fetches one. |
| **manifest** | The `manifest.json` a sequence's encoder writes beside its frames. Components read it at runtime. |
| **stage** | The sticky inner box of a component, pinned below the header while the section scrolls. |
| **scroll budget** | The component's height minus its stage's height: the scroll distance the animation plays across. |
| **beat** | A frame the animation rests on while the visitor reads. |
| **still** | The `<img>` fallback a component shows when it does not animate. |

---

## Decisions to make first

Settle these before development starts. Each one changes work downstream of it.

1. **Where the site lives.** Three options, with precedent for the first two on
   aerdf.org today:
   - *Pages inside aerdf.org's theme* (the existing AugmentED page's precedent).
     Add page templates and page-scoped assets to the custom theme. Recommended
     if the site's developer maintains that theme.
   - *A separate WordPress install on its own domain* (the EF+Math precedent).
     Cleanest isolation for a bespoke build, but it creates a second
     hosting and maintenance owner. Name that owner as part of the decision.
   - *An Elementor rebuild.* **Not recommended** for the animated pages:
     Elementor's global CSS and generated wrappers conflict with the components'
     sticky stages, `isolation`, and blend modes, and builder editing inside
     component markup breaks contracts the elements depend on.
2. **The final URL, and redirects.** Preview links to `augmented2.folkmark.com`
   have circulated. Decide the production URL and plan redirects from the preview
   domain and from the old long slugs (see [Redirects](#redirects)).
3. **Where the form submits.** The Follow page's form currently discards
   submissions. See [The Follow page form](#the-follow-page-form).
4. **Who confirms the Avenir license.** See [Fonts](#fonts).

## The target environment: aerdf.org

The following was observed directly on 2026-08-24 from aerdf.org's HTML, response
headers, REST index, and theme stylesheet. Verify anything you depend on; installs
change.

aerdf.org runs WordPress on **WP Engine** behind **Cloudflare**, on a custom theme
(`sessionwise-starter-master`, "AERDF" by SessionWise) with pages authored in
**Elementor 4.2.3 + Pro**. Plugins present include JetEngine, CPT UI, Gravity Forms
with reCAPTCHA, Yoast, Redirection, Wordfence, and **WP-Stateless**. The site also
loads Google Tag Manager, CookieYes, the AccessiBe widget, and HubSpot form embeds.
Avenir is already self-hosted there through the Use Any Font plugin.

Consequences for this rebuild:

- **WP-Stateless moves media library uploads to a Google Cloud Storage bucket.**
  On this install, a frame uploaded through the media library is not only renamed
  and resized; it is served from `storage.googleapis.com` at a URL the components
  can never construct. This is the strongest form of the rule in
  [Rules that apply to every component](#rules-that-apply-to-every-component).
- **WP Engine caches server-side and disallows page-cache plugins**, so the
  delay-JS class of breakage (see
  [Protect the components from optimization plugins](#protect-the-components-from-optimization-plugins))
  is unlikely today. It becomes likely after any host move. Keep the exclusions
  documented anyway.
- **AccessiBe rewrites the DOM and can suppress animation.** Run every acceptance
  test with the widget active, including its "stop animations" mode, and confirm
  each component lands in its documented fallback rather than a broken
  intermediate state.
- **Wordfence hardening can block direct requests to non-PHP theme files.** After
  any security configuration change, confirm the manifests still return HTTP 200.
- **If script consent-gating is ever added** (CookieYes is live), classify the
  component scripts as strictly necessary. A consent-blocked `hero-bridge.js` is a
  hero that never moves.
- **JetEngine and CPT UI are already installed**, so model the content types in
  [Content](#content) with those tools rather than introducing new ones.

## What the prototype is

`index.html` is not a page. It is a single Claude Design (`<x-dc>`) template that
holds all five pages and is compiled in the browser by `support.js`, which loads
React and Babel from a CDN at runtime. Two consequences shape this handoff:

- **The repository's `index.html` is not readable page markup.** It is a template
  with `{{ bindings }}`. The rendered markup is in [`pages/`](pages/).
- **With JavaScript disabled, the prototype renders nothing.** This is a
  pre-existing property of the prototype, not a requirement. WordPress renders on
  the server, so the rebuild fixes it for free.

None of the runtime carries over. See [What to delete](#what-to-delete).

## The rendered pages

`pages/*.html` is each route as a visitor receives it: the template expanded, the
design-system components resolved to real elements, and the runtime removed. Build
your WordPress templates from these files.

| File | Route | Source in `index.html` |
|---|---|---|
| `home.html` | `/` | `<main data-screen-label="Home">` |
| `challenge.html` | `/challenge/` | `<main data-screen-label="The Challenge">` |
| `approach.html` | `/approach/` | `<main data-screen-label="Our Approach">` |
| `team.html` | `/team/` | `<main data-screen-label="Who We Are">` |
| `follow.html` | `/follow/` | `<main data-screen-label="Get Involved">` |

The files open directly from disk; their asset paths point up two levels at the
repository's own `assets/` and `_ds/`.

> **Warning: `home.html` predates the 2026-08-24 home page rebuild.** The current
> home page carries the scroll-driven cycle wheel (`data-cycle-rig`) and revised
> copy; the export still shows the older click-only diagram. Until the export is
> regenerated, treat [`sections/cycle.md`](sections/cycle.md) plus the wheel markup
> in `index.html` as the source for that section, and the reference site as ground
> truth. To regenerate the export, run the following on a machine with browser
> network access:
>
> ```
> npm i --no-save playwright && node tools/export-static.mjs
> ```

Two properties of the export to know about:

- Design-system components such as `<x-import …Button>` are exported as real
  elements (`<button data-slot="button" …>`) with their computed styles inlined.
  Those inline styles are the design system's own values.
- The exported `<head>` still carries the prototype runtime's placeholder CSS
  (`.sc-placeholder` and related rules). It is inert residue; do not port it.

**About the inline styles.** The exported markup styles elements with `style=""`
attributes that resolve design-system custom properties. That is faithful to the
source and acceptable for fixed sections in a first port. Content that editors will
maintain (see [Content](#content)) should be re-expressed as theme markup and
classes during the port, not left as inline-styled HTML in a rich-text field.

## The design system

`_ds/augmented-design-system-191b99a9-bdab-4065-b076-e3e4ea403a3a/` is the single
source of truth for every color, size, radius, and font on the site. It is plain
CSS with no build step. **Copy it; do not rewrite it** — and do not re-author the
tokens into `theme.json`. The target theme is a classic theme, where enqueued token
CSS is the correct mechanism. Offer a `theme.json` mapping only if the theme's
developer wants the tokens surfaced in the editor.

To install the design system:

1. Copy the design-system directory into the theme.
2. Enqueue the eight stylesheets in this order:
   `tokens/fonts.css`, `tokens/colors.css`, `tokens/typography.css`,
   `tokens/layout.css`, `tokens/icons.css`, `tokens/schemes.css`,
   `tokens/base.css`, `styles.css`.
3. Version each with `filemtime()` so a change busts caches:

```php
add_action('wp_enqueue_scripts', function () {
    $dir = get_stylesheet_directory() . '/ds/';
    $uri = get_stylesheet_directory_uri() . '/ds/';
    $files = ['tokens/fonts', 'tokens/colors', 'tokens/typography', 'tokens/layout',
              'tokens/icons', 'tokens/schemes', 'tokens/base', 'styles'];
    $prev = [];
    foreach ($files as $f) {
        $handle = 'aug-ds-' . basename($f);
        wp_enqueue_style($handle, $uri . $f . '.css', $prev, filemtime($dir . $f . '.css'));
        $prev = [$handle];   // chain the dependency so the order holds
    }
});
```

The files define roughly 150 custom properties on `:root`. Use the semantic
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

The site self-hosts **Avenir LT Pro** (WOFF2 in `_ds/…/assets/fonts/`) in three
weights: Book 400, Medium 600, Heavy 700. `--font-heading` and `--font-body` both
resolve to it.

- **Avenir is commercially licensed.** aerdf.org already self-hosts Avenir, so a
  license likely exists; before launch, confirm in writing that it covers the new
  pages or domain, and record who confirmed it.
- **Deploy only the WOFF2 files.** The OTF files beside them are desktop originals
  kept as encoder inputs. Do not copy them to a web root.
- The icon font is a five-glyph subset of Material Symbols (Apache 2.0). The
  regeneration URL sits beside the `@font-face` rule in `tokens/icons.css`. Adding
  an icon name means refetching that subset.

## The assets

Copy `assets/` verbatim. Nothing in it is hand-placed; five encoder scripts
produce everything (see [Regenerating the artifacts](#regenerating-the-artifacts)).

| Path | What it is | Notes |
|---|---|---|
| `assets/hero-bridge/hb*.webp` + `manifest.json` | Hero sequence: 66 frames × 2 cuts (1600 and 1200 wide). Full cut 10.9 MB, crop 7.0 MB. | The page plays frames 276–417: 9.1 MB full cut, 5.8 MB crop. Filenames are load-bearing. |
| `assets/hero-bridge.js` / `.css` | The `<hero-bridge>` component. | See [The hero bridge](#the-hero-bridge-hero-bridge). |
| `assets/falling-blocks/w1440/`, `w720/` + `manifest.json` | Closing CTA frames: 48 per layer × 2 layers × 2 tiers. w1440 = 3.4 MB, w720 = 1.5 MB. | The stylesheet picks the tier. Filenames are load-bearing. |
| `assets/falling-blocks.js` / `.css` | The `<falling-blocks>` component. | See [The falling-blocks CTA](#the-falling-blocks-cta-falling-blocks). |
| `assets/approach/ap*.webp` + `manifest.json` | Approach sequence: 122 frames × 2 cuts. 6.25 MB full, 4.05 MB crop. | Not currently mounted. Filenames are load-bearing. |
| `assets/approach/cyc0*.webp` | The four cycle-wheel node icons, 320 px square with alpha. | Used by the home page wheel. Not part of the sequence; the manifest does not track them. |
| `assets/approach.js` / `.css` | The `<approach-scrub>` component. | See [The Approach scrub](#the-approach-scrub-approach-scrub). |
| `assets/images/`, `assets/team/`, `assets/icons/`, `assets/logo/` | Photography, headshots, marks. | Plain images. The seven portrait photos ship in two widths picked by `srcset`. |
| `assets/illustrations/{brain,blocks,laptop}.webp` | The three home-page illustrations, 810 × 810 with alpha. | See the note below. |

**The illustrations are framed plates; do not crop them.** Each carries its own
framing and a soft cast shadow that fades over a faint full-canvas haze. Place them
in equal boxes at `aspect-ratio: 1 / 1` with `object-fit: contain`. Any crop tight
enough to change the framing slices the shadow off against a straight edge.

**Master material is not in the repository.** The Blender plates, source PNG
sequences, and frame archives (692 MB of a 702 MB checkout) were removed from
history; they live with the designer. Nothing in this handoff depends on them —
every encoder output is committed. They matter only for re-rendering artwork, and
each encoder prints the restore path it needs if you run it without them. The hero
sequence's masters are the one set that was never in the history at all. The render
notes in `../docs/` stayed, and they are the authority for frame numbers.

---

## The components

Three animations are already portable. Each is a dependency-free custom element
with no framework and no build step. Each one drives markup the page authors, so
nothing a block editor does can leave it half-constructed, and each degrades to a
still image when its script does not run.

### Rules that apply to every component

- **Never upload frames through the media library.** WordPress renames files on
  collision, appends `-scaled` past 2560 px, and generates size variants — and on
  aerdf.org, WP-Stateless then serves uploads from a Google Cloud Storage URL. The
  components address frames by exact name through string concatenation, so any of
  those changes 404s frames silently: the still keeps showing and nothing looks
  broken. Deploy the frame directories as files in the theme, and serve each
  `manifest.json` from the same directory as its frames.
- **Point `base` at the frame directory from PHP.** Emit it with
  `esc_url(get_stylesheet_directory_uri() . '/…/')`. The value must end in `/`.
  Never derive an asset base from a script's own URL; optimization plugins
  relocate scripts. (In this repository the attribute must additionally stay a
  single quoted value beginning `assets/`, because the build verifier and the
  export's path rewriter scan for exactly that shape.)
- **Enqueue with `filemtime()` versions and `'strategy' => 'defer'`.** The
  scripts are defer-safe and order-independent.
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

**Host-supplied custom properties.** The first four size and place the plate; the
last three pace it. All are registered with `@property`; if a build pipeline strips
`@property` rules the element falls back to safe-but-wrong defaults, so do not
strip them.

| Property | This site sets | What it is |
|---|---|---|
| `--hb-pin` | `4.5rem` | The sticky header's height. The element reads it back off its stage's computed `top`, so CSS and JS cannot disagree, and an admin bar needs no code change. |
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
  with grey legs. Widen the span and the arch visibly changes color mid-scrub. See
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
  --fb-sticky-top: 4.5rem;                 /* the fixed header's height */
  height: calc(240svh - 4.5rem);           /* 240 − 100 = 140svh of pin */
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

### The Approach scrub (`<approach-scrub>`)

> **Status: not currently mounted.** The client found the long scrub hard going,
> so the home page now runs the hero bridge and the cycle wheel instead. The
> component, its frames, and its build spec are kept for the shortened sequence
> that is planned to replace it. Do not port it as part of rebuilding the page as
> it stands.

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
scroll budget (1000vh desktop, 600svh phone). Component-specific warnings —
the manifest requirement, the top-edge anchor, the crop contract, the
reduced-motion fallback's dependency on the reveal sweeper — are in the
specification.

---

## Behaviors to rebuild

The page behaviors below live in the prototype's component script inside
`index.html`, written against a runtime (`DCLogic`, `renderVals()`,
`{{ bindings }}`) that does not exist in WordPress. The markup they drive is in
`pages/`; the behavior must be rewritten. The originals are heavily commented, and
the comments explain *why* — read them before rewriting.

| Behavior | Markup hooks | What it does | Effort |
|---|---|---|---|
| The cycle wheel | `data-cycle-rig`, `data-cycle`, `data-arc`, `data-node`, `data-rl`, `data-body`, `data-hub` | The scroll-built R&D cycle ring on the home page. | Moderate. **Specified in [`sections/cycle.md`](sections/cycle.md)** — build from that, not from the runtime code. |
| Scroll reveal | `data-reveal` (67 uses) | Fades a block in when it enters the viewport. | Trivial: an IntersectionObserver that sets `opacity` to 1. |
| Body-offset sync | `data-approach-heading`, `data-approach-text` | Drops a two-column body to sit against the middle of its heading; becomes a gap when stacked. | Small: one measured `margin-top`, applied at ≥992 px. |
| Mobile menu | `navOpen` state | Header hamburger; locks body scroll; Escape closes. | Trivial. |

Notes:

- **`data-reveal` blocks start at inline `opacity: 0`.** If the reveal behavior is
  not rebuilt, 67 blocks stay invisible. Either port it or strip the inline
  opacity.
- The five `data-step` attributes on The Challenge's sections are inert — nothing
  reads them. Do not build a mechanism for them.
- An earlier version of this document listed `data-lift`, `data-gloss`,
  `data-term`, `data-kit`, `data-brick`, `data-on`, and `data-build` behaviors.
  They no longer exist in the markup.

## What to delete

Nothing in this list should survive into WordPress:

- **The client-side router** (`ROUTES`, `TITLES`, `readRoute`, `show`, `go`,
  `href`, the `popstate` handler). WordPress has real URLs.
- **`tools/build-site.mjs`.** Its jobs — emitting per-route copies and verifying
  references — are WordPress's and your pipeline's. Reproduce its one important
  check: the manifest-versus-disk frame verification (see
  [`sections/approach.md`](sections/approach.md), trap 7.3).
- **`support.js`** — the prototype runtime. 1,911 generated lines; nothing to
  salvage.
- **The CDN dependency.** React and Babel load from unpkg on every prototype page
  view: a third-party single point of failure on the critical path, a duplicate of
  the React WordPress already ships, and a per-pageview IP disclosure to a third
  party (the class of issue in the German Google Fonts GDPR ruling). Nothing in
  the rebuilt site needs either.

## Content

No CMS sits behind the prototype; all copy is hardcoded, which is why `pages/`
doubles as the content export. Decide early which of these become editable fields
and which stay in templates. JetEngine and CPT UI are already on the target
install; model with them.

- **Team members** (Who We Are): 28 people across four grids — Leadership,
  Research Partners, Technology Partners, Education Fellows. Fields: headshot
  (optional — 9 of 28 currently render a placeholder), name, role, optional
  LinkedIn and website links; fellows add school and location. Bios exist only in
  the project tracking sheet. The obvious custom post type.
- **Research items** (Home, Follow Our Work): title, description, link.
- **Cycle wheel steps** (Home): four steps, each a number, a title, a body
  paragraph, and an icon. Editable copy, fixed count of four — the geometry and
  the scroll choreography are not content. See
  [`sections/cycle.md`](sections/cycle.md).
- Everything else is page-level marketing copy.

### The Follow page form

The prototype's form renders a required email field, a nine-option "which are you"
radio group (educator, researcher, engineer, administrator, non-profit
professional, company executive, funder, journalist, other), an optional message,
and a **Subscribe** button — and its submit handler discards everything. It has
never collected a submission.

The rebuild needs a real destination, which is a product decision, not a porting
task. aerdf.org already runs Gravity Forms (with reCAPTCHA) and embeds HubSpot
forms; either reproduces this form in under an hour once someone decides:

1. Which system receives submissions, and into what list or pipeline.
2. What consent language the form carries (CookieYes is live on the target site).
3. Who owns the resulting list. "Subscribe" implies an email program — a
   commitment beyond the form itself.

### Page metadata

Titles and descriptions for search and social, ready for Yoast fields:

| Route | Title | Description |
|---|---|---|
| `/` | AugmentED \| Bridging frontier AI and the classroom | AugmentED is an R&D organization closing the gap between what AI can do and what students need. We are teachers, researchers, and engineers building and testing the missing technology, and the evidence to trust it. |
| `/challenge/` | The Challenge \| AugmentED | AI is arriving in classrooms whether schools are ready or not. The danger is that some are rushing in without asking what AI can do well, what teachers uniquely bring, or what students actually need. |
| `/approach/` | Our Approach \| AugmentED | We believe better educational AI will emerge from discovering what classrooms actually need, building solutions with real educators and students, and testing them in real classrooms. |
| `/team/` | Who We Are \| AugmentED | AugmentED brings together people from classrooms, research labs, and engineering teams who share a conviction that AI should augment human teaching, not replace it. |
| `/follow/` | Follow Our Work \| AugmentED | Get updates on AugmentED's work and research findings. |

### Redirects

The slugs were shortened after preview links had been shared. If the production
site keeps these paths, recreate the redirects (the target install runs the
Redirection plugin):

| From | To |
|---|---|
| `/the-challenge/` | `/challenge/` |
| `/our-approach/` | `/approach/` |
| `/who-we-are/` | `/team/` |
| `/follow-our-work/` | `/follow/` |

Also plan redirects from `augmented2.folkmark.com` once the production URL exists.

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
- Add the belt-and-braces attributes via the `script_loader_tag` filter:
  `nowprocket`, `data-no-defer="1"`, `data-jetpack-boost="ignore"`.
- Do not add a smooth-scroll plugin to pages with these components. Anything that
  virtualizes the scroll position desynchronizes code that reads native scroll.

## Acceptance checklist

The rebuild is done when every item passes. Test logged out *and* logged in (the
admin bar shifts the viewport for logged-in users), and on aerdf.org test with the
AccessiBe widget active.

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

**Site-wide:**

- [ ] All 67 reveal blocks become visible; none is stranded at `opacity: 0`.
- [ ] The form submits to its decided destination and the submission arrives.
- [ ] Fonts self-hosted, WOFF2 only; Avenir license confirmation on file.
- [ ] Frame directories excluded from image optimization; manifests return 200.
- [ ] Redirects from the old slugs and the preview domain are live.

## Regenerating the artifacts

Every file this handoff lists is committed and final; **none of these commands is
needed to rebuild the site in WordPress.** They matter only when the artwork or
the export changes. The encoders read master material that is no longer in the
repository and print the restore path they need if you run them without it.

| Command | What it does |
|---|---|
| `node tools/export-static.mjs` | Re-renders `pages/` from the live prototype. Needs `npm i --no-save playwright` and browser network access. |
| `node tools/encode-hero-bridge.mjs` | Re-encodes the hero frames and manifest. Widths: `FULL_W` / `CROP_W` in the script. |
| `node tools/encode-falling-blocks.mjs` | Re-encodes the CTA frames and manifest. Tiers: `WIDTHS` in the script. |
| `node tools/encode-approach.mjs` | Re-encodes the Approach frames and manifest. Sequence: `OPEN` / `BEATS` / `STRIDE` in the script. |
| `node tools/encode-images.mjs` | Re-encodes photography and headshots from committed sources. |
| `node tools/build-site.mjs _site` | Builds the static site for comparison while rebuilding. |

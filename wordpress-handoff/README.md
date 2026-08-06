# AugmentED — WordPress handoff

Everything needed to rebuild this site in WordPress, and an honest account of what
carries over untouched, what has to be ported, and what should simply be deleted.

The short version: **the design system, the assets and the page markup all transfer as
they are. The falling-blocks hero is already a portable component. Everything else that
moves on the page is written against a runtime that will not exist in WordPress and has
to be rewritten — none of it is large, and one piece of it is genuinely intricate.**

---

## 1. What this site currently is

`index.html` is not a page. It is a **single Claude Design (`<x-dc>`) template** holding
all five pages at once, compiled in the browser by `support.js`, which fetches React and
Babel from a CDN at load and mounts the result into `<div id="dc-root">`. Routing is
client-side; `tools/build-site.mjs` emits one real file per route so a direct link still
returns 200, but every one of those files is a byte-identical copy of the same template.

Two consequences that shape this whole handoff:

- **There is no page markup in the repository to read.** Opening `index.html` shows a
  template and `{{ bindings }}`, not the site. That is what `pages/` below is for.
- **With JavaScript disabled the entire site is blank** — nav, copy, footer and all. This
  is pre-existing and worth knowing before anyone writes an SEO ticket about it. Moving
  to WordPress fixes it for free, since PHP renders on the server.

---

## 2. `pages/` — the rendered markup

`pages/*.html` is each route as a visitor actually receives it: the template expanded,
the design-system components resolved to real elements, and the runtime removed. This is
the file to build a WordPress template from, not `index.html`.

| file | route | source in `index.html` |
|---|---|---|
| `home.html` | `/` | `<main data-screen-label="Home">` |
| `the-challenge.html` | `/the-challenge/` | `<main data-screen-label="The Challenge">` |
| `our-approach.html` | `/our-approach/` | `<main data-screen-label="Our Approach">` |
| `who-we-are.html` | `/who-we-are/` | `<main data-screen-label="Who We Are">` |
| `follow-our-work.html` | `/follow-our-work/` | `<main data-screen-label="Get Involved">` |

They open straight from disk — asset paths point up two levels at the real `assets/` and
`_ds/` folders. Regenerate at any time with:

```
npm i --no-save playwright && node tools/export-static.mjs
```

Note that `<x-import …Button>` in the template has become a real
`<button data-slot="button" data-variant="…">` with its computed styles inlined. Those
inline styles are the design system's own values — see §3 before deciding to keep or
strip them.

---

## 3. The design system — copy it, do not rewrite it

`_ds/augmented-design-system-191b99a9-bdab-4065-b076-e3e4ea403a3a/` is an exported design
system and the single source of truth for every colour, size, radius and font on the
site. It is plain CSS with no build step: enqueue the eight files in this order and
everything in `pages/` renders correctly.

```
tokens/fonts.css  tokens/colors.css  tokens/typography.css  tokens/layout.css
tokens/icons.css  tokens/schemes.css  tokens/base.css       styles.css
```

Roughly 150 custom properties on `:root`. The ones product code should use:

- **Colour** — `--brand-accent`, `--brand-accent-hover`, `--text-body`, `--text-muted`,
  `--text-inverse`, `--surface-page`, `--surface-card`, `--surface-dark`,
  `--border-hairline`. The raw ramps behind them (`--color-st-tropaz-*`,
  `--color-ecru-white-*`, `--color-neutral-*`) exist but the semantic aliases are what
  `colors.css` itself tells you to prefer.
- **Type** — `--text-h1`…`--text-h6`, `--text-large/medium/regular/small/tiny`, and the
  matching `-line-height` properties. **Every size is redeclared at
  `@media (min-width: 992px)`** and that is the only breakpoint in the type scale, which
  is why 992px turns up all over the page CSS.
- **Layout** — `--radius-button/card/image/…`, `--space-1`…`--space-30`,
  `--page-gutter` (5%), `--section-pad-y`, `--transition-fast` (200ms ease-in-out).
- **Schemes** — `.scheme-1`…`.scheme-4` and `.alternate` set per-section colour roles.
  Every section carries exactly one. `schemes.css` says not to invent new ones.

**Fonts are self-hosted Avenir LT Pro** (WOFF2 in `_ds/.../assets/fonts/`, OTF originals
in `project/uploads/`). Avenir is licensed, not free — confirm the licence covers the new
host before deploying. `--font-heading` and `--font-body` both resolve to it.

---

## 4. `assets/` — copy verbatim

| path | what | notes |
|---|---|---|
| `assets/falling-blocks/w1280/{bottom,top}/fb0001…0048.webp` | 96 hero frames, 3.3 MB | filenames are load-bearing — see §5 |
| `assets/falling-blocks/manifest.json` | what the encoder produced | frame count, padding, widths |
| `assets/falling-blocks.js` / `.css` | the hero component | portable, see §5 |
| `assets/approach/ap*.webp` | 12 frames for the Approach scrub (6 beats x 2 cuts) | see §6.1 |
| `assets/blocks/*.webp` | 6 wooden-block cutouts | **now unused** — the hero that showed them was replaced. Keep only if a future section wants them |
| `assets/images/`, `assets/team/`, `assets/icons/`, `assets/logo/` | photography, headshots, marks | plain images |

`project/` is the working directory — Blender plates, source PNGs, notes, an abandoned
video experiment. It is deliberately excluded from the deploy (~330 MB) and is not needed
in WordPress, but `project/scratch/approach-render-map.md` is worth reading if anyone
touches the Approach animation.

---

## 5. The falling-blocks hero — already portable

This one was built for the move. It is a dependency-free custom element with no
framework, no build step and no assumption about its host. To use it in WordPress:

**1. Copy** `assets/falling-blocks.js`, `assets/falling-blocks.css`, and the
`assets/falling-blocks/` frame directory into the theme.

**2. Enqueue** both files:

```php
add_action('wp_enqueue_scripts', function () {
    $uri = get_template_directory_uri();
    wp_enqueue_style('falling-blocks', $uri . '/falling-blocks.css', [], '1.0');
    wp_enqueue_script('falling-blocks', $uri . '/falling-blocks.js', [], '1.0', true);
});
```

**3. Emit the markup**, with `base` pointing at the frame directory. Everything the
element touches is authored here — it builds no DOM of its own, so nothing a page builder
or block editor does can leave it half-constructed:

```php
<falling-blocks base="<?php echo esc_url(get_template_directory_uri() . '/falling-blocks/'); ?>"
                width="1280" frames="48" layers="bottom,top"
                revolutions="2" budget-mb="160" min-width="901">
  <div data-fb-stage>
    <div data-fb-layer="bottom" aria-hidden="true">
      <canvas></canvas>
      <img src="…/falling-blocks/w1280/bottom/fb0001.webp" alt="" width="1280" height="1920" loading="lazy" decoding="async">
    </div>
    <div data-fb-scrim aria-hidden="true"></div>
    <div data-fb-copy>
      <h1>Bridging frontier AI and the classroom.</h1>
      <p>…</p>
    </div>
    <div data-fb-layer="top" aria-hidden="true">
      <canvas></canvas>
      <img src="…/falling-blocks/w1280/top/fb0001.webp" alt="" width="1280" height="1920" loading="lazy" decoding="async">
    </div>
  </div>
</falling-blocks>
```

**4. Set two custom properties** if the theme has a fixed header:

```css
falling-blocks { --fb-sticky-top: 4.5rem; --fb-scrim: var(--surface-page); }
```

`--fb-sticky-top` must equal the header height — the element reads it back to work out
scroll progress, so one value drives both the pinning and the maths. Default is `0px`.

### Things that will bite

- **Do not upload the frames through the media library.** WordPress renames on filename
  collision, appends `-scaled` to anything over 2560px, and generates its own size
  variants. The element addresses frames by exact name (`fb0001.webp` … `fb0048.webp`);
  one rename breaks that frame permanently. Deploy the directory as files, via the theme,
  a plugin, or the deploy pipeline.
- **The `<img>` stills are the no-JS and small-screen fallback**, not decoration. Keep
  them and keep `loading="lazy"` — an image with no layout box is never near the viewport,
  so lazy is what stops the animated path paying for them.
- **Full-page caching is safe, but only because it was made safe.** The element writes
  state into the DOM as it runs, including a tag on each canvas recording which frame it
  holds. A cache plugin that serialises the rendered DOM bakes that tag into the cached
  HTML, and the next visitor gets an empty canvas that claims to be already drawn — a
  hero that stays blank until you scroll. The element now clears those attributes on
  boot, so this is handled; do not "optimise" that away. It was a real bug, found when
  this project's own static export reproduced exactly what a page cache does.
- Below `min-width` (901px), on `prefers-reduced-motion`, and on a Save-Data or 2G/3G
  connection, the element shows the still and collapses the section to one screen. These
  are three separate checks on purpose; they mean different things.
- Everything else is a knob: `revolutions` is tumble speed, `budget-mb` caps resident
  decoded frames, `travel-bottom` / `travel-top` take `"start,end"` fractions.

The full markup contract and every attribute are documented at the top of
`assets/falling-blocks.js`.

---

## 6. What has to be rebuilt

All of this lives in one `class Component extends DCLogic` inside
`<script type="text/x-dc">` at the bottom of `index.html`. It is written against the
Claude Design runtime — `DCLogic`, `renderVals()`, `{{ bindings }}`, `<sc-if>` — none of
which exists in WordPress. The markup each one drives is already in `pages/`; what is
missing is the behaviour. Read the originals: they are heavily commented and the comments
explain *why*, which is the part that is expensive to rediscover.

### 6.1 The Approach scrub — the one genuinely intricate piece

`index.html` ~1260–1435, markup at ~360–420, CSS at ~127–195. A canvas sequence scrubbed
by scroll through six "beats", with copy and tick markers synced to it, a camera push-in,
and a separate tighter crop of every plate for phones.

Budget real time for this one, and read these before starting:

- The dissolve is **two stacked canvases cross-faded with `mix-blend-mode: plus-lighter`
  over `isolation: isolate`** — not one canvas at partial alpha, which washes out
  everything the two frames share. The reasoning is in the comment above the markup.
- The drawn frame is tracked **on the element** (`cv.dataset.f`), not in component state,
  so a re-render cannot leave a canvas permanently blank.
- `project/scratch/approach-render-map.md` maps frames to beats to messages and is the
  authority for the numbers.

`assets/falling-blocks.js` solves the same class of problem — scroll progress, a frame
window, canvas drawing, degradation — in a portable form. It is the better model to
follow if this gets rewritten rather than transliterated.

### 6.2 The small stuff

| behaviour | attribute | what it does | effort |
|---|---|---|---|
| Scroll reveal | `data-reveal` (59 uses) | fades a block in when it enters view | trivial — IntersectionObserver |
| Section progress | `data-build`, `data-brick`, `data-kit`, `data-on` | assembles a block kit as you scroll | small |
| Hover lift | `data-lift`, `data-lift-group`, `data-gloss` | card hover states | trivial, mostly CSS already |
| Glossary | `data-term`, `data-terms`, `data-term-gloss` | hover/tap definitions for inline terms | small |
| Animated diagram | `data-cycle`, `data-arc`, `data-node`, `data-label`, `data-active` | the cycle diagram on Our Approach | moderate |
| Mobile menu | `navOpen` state | header hamburger, sets `body overflow` | trivial |

Note `data-reveal` starts at `opacity: 0` in the markup, so **if it is not reimplemented,
those 59 blocks stay invisible.** Either port it or strip the inline opacity.

### 6.3 Delete rather than port

- **The client-side router** (`ROUTES`, `TITLES`, `readRoute`, `show`, `go`, `href`,
  `popstate`). WordPress has real URLs and real pages.
- **`tools/build-site.mjs`** — its whole job is emitting per-route copies of one template
  and verifying references. WordPress makes both unnecessary.
- **`support.js`** — the runtime itself. 1,911 generated lines, nothing to salvage.
- **The CDN dependency.** React and Babel are fetched from unpkg on every load, which is a
  third-party request on the critical path and a single point of failure. Nothing in the
  rebuilt site should need either.

---

## 7. Content

There is no CMS behind any of this — all copy is hardcoded in the template, which is why
`pages/` doubles as the content export. Worth deciding early which of these become
editable fields versus staying in templates:

- **Team members** (Who We Are) — 6 people, each a headshot, name, role and bio. The
  obvious candidate for a custom post type.
- **Research items** (Home, Follow Our Work) — title, description, link.
- **Approach beats** — six numbered steps, each with a heading and two paragraphs, tied to
  specific animation frames. Editable copy, fixed count; the frame mapping is not content.
- Everything else is page-level marketing copy.

---

## 8. Regenerating anything

| command | what it does |
|---|---|
| `node tools/export-static.mjs` | re-renders `pages/` from the current site (needs `npm i --no-save playwright`) |
| `node tools/encode-falling-blocks.mjs` | re-encodes the hero frames from the master PNGs in `Falling Blocks/` (needs `npm i --no-save sharp`) |
| `node tools/encode-approach.mjs` | re-encodes the Approach plates |
| `node tools/encode-images.mjs` | re-encodes photography and headshots from `project/renders/sources` |
| `node tools/build-site.mjs _site` | builds the current static site — useful for comparison while rebuilding |

The encoders write the committed files directly and CI never runs them; the
originals they read from live in `Falling Blocks/` and `project/renders/`.

To change the hero's resolution, edit `WIDTHS` at the top of
`tools/encode-falling-blocks.mjs` and re-run — it rewrites the frame directory and the
manifest together. Adding a second width (640 is the useful one, ~1.4 MB) is a one-line
change and would let the element serve a smaller set to slow connections instead of
falling back to the still.

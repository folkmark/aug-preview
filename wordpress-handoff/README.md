# AugmentED — WordPress handoff

Everything needed to rebuild this site in WordPress, and an honest account of what
carries over untouched, what has to be ported, and what should simply be deleted.

The short version: **the design system, the assets and the page markup all transfer as
they are. All three scroll-driven sections — the hero bridge scrub, the falling-blocks
CTA and the Approach scrub — are already portable components. Everything else that moves
on the page is written against a runtime that will not exist in WordPress and has to be
rewritten; none of it is large, and none of what is left is intricate.**

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

## 1a. `sections/` — per-section build specs

Where a section is intricate enough that porting it needs more than "copy these files",
it gets its own spec in [`sections/`](sections/). Each one is written so the section can
be rebuilt in another stack **without reading the original source**: the asset contract,
the maths, the responsive states, and — the part that earns the document — the decisions
that look arbitrary and are load-bearing.

| spec | covers |
|---|---|
| [`sections/approach.md`](sections/approach.md) | the Approach scrub (§6) |

The shape of that document is meant to be reused; the hero can be written up the same way
if it ever needs it.

---

## 2. `pages/` — the rendered markup

`pages/*.html` is each route as a visitor actually receives it: the template expanded,
the design-system components resolved to real elements, and the runtime removed. This is
the file to build a WordPress template from, not `index.html`.

> **`home.html` is one revision behind.** It still shows the hero as a plain `<img>`,
> which is what the hero was before the bridge sequence was wired up. Re-run
> `node tools/export-static.mjs` to bring it in step — it needs a machine that can reach
> unpkg from a browser, because the export drives the real client-rendered site. Take the
> hero markup from `index.html` in the meantime; §5a describes it. Nothing else in
> `pages/` is affected.

| file | route | source in `index.html` |
|---|---|---|
| `home.html` | `/` | `<main data-screen-label="Home">` |
| `challenge.html` | `/challenge/` | `<main data-screen-label="The Challenge">` |
| `approach.html` | `/approach/` | `<main data-screen-label="Our Approach">` |
| `team.html` | `/team/` | `<main data-screen-label="Who We Are">` |
| `follow.html` | `/follow/` | `<main data-screen-label="Get Involved">` |

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
originals are no longer in the repository — see below). Avenir is licensed, not free — the
WOFF2 here are a conversion of a licensed original, so confirm the licence covers the new
host before deploying. `--font-heading` and `--font-body` both resolve to it.

---

## 4. `assets/` — copy verbatim

| path | what | notes |
|---|---|---|
| `assets/hero-bridge/hb*.webp` | the hero sequence, 66 frames in two cuts, 9.5 MB | filenames are load-bearing — see §5a. The page plays 48 of them: 4.3 MB at the 1600 cut, 2.8 MB at 1200 |
| `assets/hero-bridge/manifest.json` | what the encoder produced | frame list, cut sizes |
| `assets/hero-bridge.js` / `.css` | the hero component | portable, see §5a |
| `assets/falling-blocks/w1440/{bottom,top}/fb0001…0048.webp` | 96 frames for the closing CTA, 3.3 MB | filenames are load-bearing — see §5 |
| `assets/falling-blocks/manifest.json` | what the encoder produced | frame count, padding, widths |
| `assets/falling-blocks.js` / `.css` | the closing CTA's component | portable, see §5 |
| `assets/approach/ap*.webp` | the Approach sequence, every frame in two cuts | filenames load-bearing — see §6 |
| `assets/approach/manifest.json` | what the encoder produced | frame list, beats, cut sizes |
| `assets/approach.js` / `.css` | the Approach scrub | portable, see §6 |
| `assets/images/`, `assets/team/`, `assets/icons/`, `assets/logo/` | photography, headshots, marks | plain images |
| `assets/illustrations/{brain,blocks,laptop}.webp` | the three home-page icons, 116 KB | 810x810 with alpha — see the note below |

The three illustrations are square plates carrying their own framing and their own soft
cast shadows, and they are shipped exactly as rendered. Drop them into equal boxes at
`aspect-ratio: 1 / 1` with `object-fit: contain` and change nothing else. Do not crop
them to their content to tighten the framing: the shadow fades out gradually over a faint
haze that covers the whole plate, so any crop tight enough to help will cut the shadow off
against a straight edge.

**Master material is not in the repository.** The Blender plates, source PNGs, the frame
archive, the original Webflow export and the Avenir OTFs used to live under `project/` and
`Falling Blocks/`. They were 692 MB of a 702 MB checkout and the site serves none of them —
each is an *input* to a tool in `tools/`, and every output those tools produce is committed.
They are now kept off the repository, so **nothing in this handoff depends on them**: every
file listed above is present and final.

The render notes did stay, because they are worth reading if anyone touches either arch
animation. [`docs/approach-render-map.md`](../docs/approach-render-map.md) maps every Blender
frame number to the beat and the message it carries, and is the source of the frame numbers
in [`sections/approach.md`](sections/approach.md).
[`docs/hero-bridge-render.md`](../docs/hero-bridge-render.md) does the same job for the hero:
which frames the page plays and why, what a complete delivery of that sequence still needs,
and the byte cost of the widths it was encoded at.

One qualification to "master material is not in the repository": for the hero sequence it
never was. The other renders were tracked once and are still reachable in the history; the
hero bridge plates have only ever existed on the designer's machine, so that sequence is the
one thing here that cannot be re-encoded from this repository alone. The encoded frames are
committed and final, so nothing in this handoff depends on it — but a re-render does.

---

## 5a. The hero bridge scrub — already portable

> **Status.** New. The home page hero used to be a still of the finished bridge; it is
> now `<hero-bridge>`, pinned under the header from the moment the page loads with the
> hero copy laid over it, and scrubbing the arch's assembly once that copy has scrolled
> away. The still is still in the markup and is what a reader gets with scripting off.

Built to the same doctrine as §5 and §6, and portable for the same reasons: a
dependency-free custom element that touches no runtime API and drives markup it does not
build. Porting it is `assets/hero-bridge.js`, `assets/hero-bridge.css`, the frame
directory, and the block of markup in the hero — copy all four and it works.

**What the host has to supply.** Six custom properties and one overlay.

`--hb-pin` is the height of the sticky header — this site sets it to `4.5rem` in the
page's own stylesheet. The element reads the pin back off its stage's computed `top`, so
CSS and JS cannot disagree, and a theme with a taller header, no header, or a WordPress
admin bar needs no code change.

`--hb-entry-clear` is a **length**: how much room the host's copy needs, measured from
under the header. It is the one geometric value that has to be set against the host's own
layout, because what has to fit there is a block of text whose height is in pixels. This
site derives it from `--hero-band`, the height of its hero copy with air around it —
380px on any stacked desktop width, 290px at 768, 479px on a phone, 558px at 320, and
derived from the body's own offset in the two-column arm above 1400px.

**Budget this line carefully: it is the plate's size as well as the copy's.** The entry is
solved from the room left under it and divided by `--hb-entry-keep` minus
`--hb-entry-sky` = 0.174, so a pixel spent here costs 5.75px of picture. A theme whose
hero copy is taller than this site's will get a visibly smaller plate, and the fix is the
copy rather than the component.

Note it is the plate's **content** that clears this line, not the plate's top edge: the
plate's own empty top (`--hb-entry-sky`, 0.226 of its height on the frame the approach
holds) is allowed to sit behind the words. That is worth more than it sounds — it is what
lets the plate enter at full edge-to-edge width instead of scaled to 45% of it. The
component also owns `--hb-entry-keep` (0.4, the lower edge of the desk's top slab at
y 0.380 and the rack's lid at y 0.396) and `--hb-entry-min` (0.25, the scale floor). Those
two are properties of this artwork measured on the frame the approach holds — a theme
swapping in a different sequence re-measures them, on **its** first played frame, not on a
later one: the camera moves during this scrub and the same desk edge reads 0.386–0.404 by
frame 417.

`--hb-entry-zoom` is the third host property: how far past edge to edge the entry may
grow, as a **number**. It defaults to `1`, which is the safe value and means "never larger
than the artwork's own width" — content spans plate x 0.000–0.999, so anything above 1
crops the rack's left edge and the desk's right. This site sets `2` above 991px and gets
between 1.03 and 1.50 of it, because two other things bind first: `--hb-entry-keep`, which
holds the desk's top edge above the fold and is what binds on a laptop, and `--hb-max`,
which now caps the width the plate is **drawn** at and not only the width of its box.
2880px there is a 1.8× upscale of the 1600 cut, so raising it without a bigger cut just
makes the entry soft. Below 992px this site leaves the zoom at 1: a phone has no copy
pressing on the plate, so cropping it buys nothing.

**The copy animation is the host's, not the component's.** The headline pins and holds for
the whole hero while the lede and buttons float up and dissolve, and it is a self-contained
block of CSS in the page — `position: sticky` for the headline and
`animation-timeline: scroll(root block)` over `--hero-band` for the body. No JavaScript,
and no reference to `<hero-bridge>` at all. Copy that block and the markup it selects
(`[data-hero-copy]`, `[data-hero-body]`, `[data-hero-actions]`) and it works.

Four things it depends on, and all four are load-bearing:

- **The headline is a direct child of `[data-hero-copy]`, not of a wrapper shared with the
  body.** `position: sticky` can only hold an element for as far as its containing block
  reaches; inside a wrapper sized to the copy that is about 195px. The two are siblings so
  the headline's containing block is the tall box.
- **Nothing between them may carry a `transform`.** A transformed ancestor becomes the
  sticky element's containing block and kills the pin outright, which is why the float is
  on `[data-hero-body]` alone rather than on anything above it.
- **`[data-hero-copy]` spans the hero and takes `pointer-events: none`**, handing them back
  to its two children. At `z-index: 2` over the whole hero it would otherwise swallow every
  click. The dissolve sets `pointer-events: none` at its end too: the body reaches
  `opacity: 0` having travelled only ~370px, so without it the buttons are invisible and
  still clickable.
- **The guards.** The whole arrangement — pin included — sits inside
  `@supports (animation-timeline: scroll())` and `@media not (prefers-reduced-motion:
  reduce)`, so one fallback covers all of it: a band-height box and copy that simply scrolls
  away. The animation is never *started* under reduced motion rather than started and
  reset, so nothing is left stranded at `opacity: 0`.

Do not put the site's `data-reveal` attribute on the hero copy or anything inside it. That
mechanism writes `style.opacity = "1"` on a timer and latches once it reads exactly `"1"`,
and its paired `transition: opacity` smears every scrubbed value. The two cannot share an
element.

The **overlay** is the host's, not the component's: an absolutely-positioned block over the
first screen holding the headline, lede and buttons, which scrolls away while the plate
holds. `--hb-entry-span` in `hero-bridge.css` is one screen and is what pays for that
scroll, so the scrub starts exactly where the last of the copy leaves. A theme that wants
no copy over the hero can set `--hb-entry-clear` to `0px` and drop the overlay; the plate
then simply arrives at full size and scrubs.

`--hb-arch-clear` is the fourth, and it is the only one that moves the plate rather than
sizing it: **how far below the header the top of the FINISHED bridge has to land.** The
component owns the other half — `--hb-arch`, 0.1001, the top of the assembled span as a
share of the plate's height, measured on frame 417 — and solves the two into a static
offset that pushes the plate down. Default `0px`, meaning "leave the plate where it rests".

A host needs this the moment it pins copy over the picture, because the arch rises *over*
the gap: the deck ends up at plate y 0.100, above the rack's top at 0.257 and the desk's
at 0.245, so a headline that clears the furniture does not clear the bridge. This site asks
for 30px of clearance and pays 208–255px of plate position for it, which is why the offset
is capped against `--hb-entry-keep` — pushing the plate down spends exactly the promise
that keeps the desk's top edge above the fold, and an uncapped drop would break it on a
short screen. What it does spend is the bottom of the picture: 44–58% of the plate is below
the fold while pinned. Nothing is clipped by a box, so scrolling on reveals it whole.

Two things to get right when porting it. **Gate it on whether the headline actually pins** —
this site sets it inside the same `@supports` and `prefers-reduced-motion` guards as the pin
itself, and the component clears it again in its own static-mode reset, because CSS cannot
see "the script never ran" and 240px of blank page above an unpinned still is not a layout.
And **do not reintroduce a rule that moves the headline instead**: this site had one, to
clear the rack's top blocks, and having both made the layout circular — a lock derived from
the plate and a plate derived from the lock.

`--hb-scrub` and `--hb-exit` are the last two, and they are the element's pacing after the
copy has gone: how long the sequence plays, and how much scroll is spent holding the finished
picture and easing the pin's release. `--hb-scrub` defaults to 70svh, which is the number
`docs/hero-bridge-render.md` ties to the frame count — change one and change the other, or
the assembly plays at a different speed. `--hb-exit` defaults to 24svh and is spent half on
a beat of stillness and half on the run-in of a velocity ramp; setting it to `0px` restores
the release this shipped with, which was a cliff.

**Why the exit is not optional if you pin copy over the plate.** While the stage is pinned
the picture does not move; the instant it is not, it moves at the speed of the page. That
step is 0 to 1 in a single frame — position is continuous, velocity is not, and the eye
reads velocity. The ramp blends the two across a window straddling the release so that by
the time the sticky lets go the picture is already at half page speed. It only ever moves
the picture **up**: the section behind sits barely a padding below the plate's bottom, so a
picture eased out by lagging the page would be run into by it.

**Two things the host owns in that handoff, and both are easy to miss.**

*The pinned copy has to stop being pinned on the same pixel the element does.* Sticky holds
an element for as far as its containing block reaches, and a copy overlay tall enough to
cover the hero reaches much further than the element's stage does — so the picture leaves
and the words stay, for the best part of a thousand pixels. Place the overlay's bottom at
`100% - <approach> - <scrub> - <exit> - <the copy's own top offset and height>`; percentages
resolve against the section, so that expression *is* the element's own release point and no
plate geometry has to be restated. Two gotchas: sticky is constrained by the **margin** box,
so include the heading's bottom margin or it lets go early; and the heading's height cannot
be derived at that point, so it has to be a declared number.

*Then name it.* `exit-with="<selector>"` on the element takes anything that should ride the
same curve — resolved against the owner document at boot, since by definition it is not
inside the component, and written the identical transform. Releasing together is not the
same as releasing gently; this is the second half. Under reduced motion or with scripting
off there is no pin to release, so no ramp is written at all.

`--hb-entry-span`, `--hb-entry-clear`, `--hb-entry-zoom` and `--hb-max` are registered
with `@property` so they resolve to numbers and pixels for the script. If a theme's build
strips `@property` rules, the element falls back to its stage's height, 40% of the
viewport, no zoom and a 2880px ceiling — sane rather than correct, so do not strip them.

**The host also has to clip sideways.** With `--hb-entry-zoom` above 1 the plate is wider
than the screen during the approach, and a transform that overhangs extends the page's
scrollable width. Nothing inside the component may clip it — an `overflow` on the stage is
the exact edge artefact the whole rig avoids — so the host clips at the full width of the
page, where the cut lands off-screen. This site uses `overflow-x: clip` on its page
wrapper. `clip` and not `hidden`: `hidden` creates a scroll container and breaks the
stage's `position: sticky`.

**The scale floor is not optional.** `--hb-entry-min` exists because the entry solves for
how big the plate can be in the room below the copy, and on a viewport shorter than the
copy needs that room is negative. An unclamped solve makes the scale negative with it, and
a negative scale *reflects* the box about its origin: the plate is drawn mirrored and
entirely off the bottom of the screen, so the hero reads as blank for the whole hold. A
phone in landscape — 667x375 leaves 303px under the header — is the case that finds it.

**What is load-bearing, and what breaks quietly:**

- **Filenames.** Frames are addressed as `base + "hb" + <4-digit Blender frame> + <cut> +
  ".webp"` by string concatenation. Nothing references them literally, so **do not upload
  them through the media library** — WordPress renames and re-encodes on upload, and every
  frame 404s while the still keeps showing and nothing looks broken. Same rule as §5 and
  §6. Put the directory on disk and point `base` at it.
- **`base` must stay a single quoted attribute value beginning `assets/`.** The build's
  reference check and `absolutise()` both scan for exactly that shape — the latter rewrites
  every `assets/` reference to an absolute path so a client-side navigation cannot resolve
  it against the wrong URL. Build it from pieces and both miss it, and every route 404s on
  all 96 frames while the home page looks fine.
- **`from` and `to` are not decoration.** The page plays 276–417 of an encoded 276–468,
  because only that span carries the ground shadow — see
  [`docs/hero-bridge-render.md`](../docs/hero-bridge-render.md). Widen the span and the
  arch visibly changes colour mid-scrub.
- **The plate is never clipped by a box, and that is the whole arrangement.** It runs edge
  to edge at the plate's own 1.4302:1, which is taller than any desktop screen, so the
  **stage takes the plate's height rather than the screen's** and hangs below the fold.
  Do not put `overflow: hidden` back on the stage as a tidy-up: while the stage is pinned
  a clip rectangle hides at the bottom of the screen, and the moment it releases it walks
  up the viewport as a hard line through the ground shadow. That is what this replaced.
- **The stage's height is declared, not left to its content.** A sticky box is constrained
  to its parent's *content* box, so putting the scroll budget in padding gives the stage a
  sticky range of zero and the hero simply scrolls past without pinning. Both heights are
  written in `hero-bridge.css` and their difference is the budget.
- **The bottom 4% is masked, and it is not decoration.** The render's last row carries the
  ground-shadow plane at alpha 2.4/255 and ends there, which composited on a page colour is
  a step across the full width of the screen. The mask sits on `[data-hb-box]` rather than
  on the layers, so it applies after the two canvases have blended — masking them separately
  fades each contribution before `plus-lighter` adds them, which is a different picture
  during a cross-fade.
- **The section's height is the scroll budget.** `assets/hero-bridge.css` sets it, the
  element measures its own height minus its stage's, and the scrub divides that among the
  frames the manifest offers. Frame count and height are one setting in two files: encode
  more frames without raising the height and the whole thing plays proportionally faster.
- **`isolation: isolate` on `[data-hb-box]`.** The two canvases cross-fade under
  `mix-blend-mode: plus-lighter`; without the isolation they blend against the page and
  blow out to white. A theme ancestor with a `filter`, an `opacity` below 1, or its own
  `mix-blend-mode` is what to check first if the plates ever look wrong.
- **The `<img>` inside the box carries no inline style.** Its positioning is the
  stylesheet's, and an inline `height:auto` put back would break the registration between
  the still and the canvases that replace it.

**Degradation is deliberate and has three arms**, all resolved in JS rather than by a
media query, because only the element sees all three: reduced motion, save-data or a slow
connection, and an engine without `createImageBitmap`. Any of them leaves
`data-hb-motion="off"`, which collapses the pin and shows the still in normal flow —
exactly what the hero was before this existed. That is also the state before the script
runs at all, so a page with no JavaScript renders the finished hero rather than a gap.

---

## 5. The falling-blocks rig — already portable

> **Status.** This moved. It was the hero; it now wraps the closing call to action,
> on a much shorter pin (about 70svh rather than 190svh) so the blocks tumble past
> quickly. Same element, same frames, same contract — only the height and where it
> sits on the page changed.

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
                width="1440" frames="48" layers="bottom,top"
                revolutions="0.6" budget-mb="128" min-width="901" stage-fill="0.93"
                content-bottom="0.273,0.700" content-top="0.183,0.775"
                speed-bottom="1" speed-top="1.25">
  <div data-fb-stage>
    <div data-fb-layer="bottom" aria-hidden="true">
      <canvas></canvas>
      <img src="…/falling-blocks/w1440/bottom/fb0001.webp" alt="" width="1440" height="2160" loading="lazy" decoding="async">
    </div>
    <div data-fb-copy>
      <h1>Bridging frontier AI and the classroom.</h1>
      <div data-fb-front>
        <p>…</p>
        <!-- buttons -->
      </div>
    </div>
    <div data-fb-layer="top" aria-hidden="true">
      <canvas></canvas>
      <img src="…/falling-blocks/w1440/top/fb0001.webp" alt="" width="1440" height="2160" loading="lazy" decoding="async">
    </div>
  </div>
</falling-blocks>
```

The `data-fb-front` wrapper is load-bearing, not cosmetic: the near plate passes **in
front of the `h1` and behind everything inside `data-fb-front`**. A headline reads fine
with a block crossing it; body copy and buttons do not. Do not add a `z-index` to
`data-fb-copy` itself — that makes it a stacking context and collapses the copy back
into one layer, putting the plate over all of it.

**4. Set the height and the header offset:**

```css
falling-blocks { --fb-sticky-top: 4.5rem; height: calc(290svh - 4.5rem); }
```

`--fb-sticky-top` is the fixed header's height; the stage pins below it. The element's
height minus the stage's height is the scroll budget — here 290 minus 100 is 190svh of
pin. That single number sets both how long the section holds and how fast the blocks
travel, so there is no second value to keep in step. Make the element the same height
as its stage and nothing pins: the copy just scrolls away while the blocks move.

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
- **`width`, `budget-mb` and `revolutions` are a performance budget, not preferences.**
  A frame decodes to width x height x 4 bytes however small the WebP is on disk, so at
  1440 each frame costs 11.9 MiB and a pair costs 24. Those three numbers were tuned
  down together after Chrome reported the tab as slowing the machine — at 1920 with a
  320 MiB budget it held 295 MiB of decoded frames and re-decoded 21 MiB every frame
  step. Raise `width` and the window shrinks automatically; raise `budget-mb` with it
  and the memory goes back. Measure before changing either.
- `stage-fill` is the plate's width as a fraction of the stage. It is 0.93 here because
  that is the share of the viewport the desk artwork occupies further down the page.
- **`content-<layer>` is measured, not chosen.** It is where that layer's blocks sit as
  fractions of the plate's height, and the motion is defined from it: at rest the plate
  is placed so the top of its content rests on the stage's bottom edge, so the blocks
  are below the fold and rise into view; at the end the bottom of its content sits on
  the stage's top edge, so they have all left. Re-render the plates and these change —
  `tools/encode-falling-blocks.mjs` prints the bounds it produced.
- `speed-<layer>` multiplies that travel. 1 means the layer's last block leaves exactly
  as the pin ends; above 1 it leaves earlier and the plate keeps rising empty, which is
  what makes the near plane clear the frame before the far one. Below 1 strands blocks
  on screen and is never right.
- **The far plate's lowest block group is trimmed at encode time** (`trimBelow` in the
  encoder). Those blocks run off the bottom of the render, so the frame edge itself cuts
  them and they rise through the hero as flat-bottomed shapes. Both layers are trimmed
  to the same output height — a difference there would put the two depth planes out of
  registration, which the encoder now fails the build on.

The full markup contract and every attribute are documented at the top of
`assets/falling-blocks.js`.

---

## 6. The Approach scrub — also portable, but not currently mounted

> **Status.** The home page no longer runs this. The client found scrolling through
> the arch's many stages hard going, so the hero now runs the shorter `<hero-bridge>`
> sequence (§5a) and the R&D cycle wheel sits where the scrub used to be. `assets/approach.js`,
> `assets/approach.css` and the frames are all still in the repository, kept for the
> shortened sequence that replaces it — so everything below still describes the
> component accurately. Do not port it as part of rebuilding the page as it stands.

The other animated section, and the intricate one. A canvas sequence scrubbed by scroll
through six beats, with copy and tick markers synced to it, a camera push-in, and a
separate tighter crop of every plate for phones. It is built the same way as the hero:
dependency-free custom element, no framework, no build step, driving markup authored in
the page.

> **This section has a full build spec: [`sections/approach.md`](sections/approach.md).**
> Read it before changing anything here. It documents the frame contract, the scroll and
> camera maths, and — most importantly — the decisions that look arbitrary and are
> load-bearing, each of which produces a section that looks approximately right and is
> subtly broken if "simplified". If the section has to be rewritten natively rather than
> ported, that document is the specification.

**1. Copy** `assets/approach.js`, `assets/approach.css`, and the `assets/approach/`
frame directory into the theme.

**2. Enqueue** both files:

```php
add_action('wp_enqueue_scripts', function () {
    $uri = get_template_directory_uri();
    wp_enqueue_style('approach-scrub', $uri . '/approach.css', [], '1.0');
    wp_enqueue_script('approach-scrub', $uri . '/approach.js', [], '1.0', true);
});
```

**3. Emit the markup**, with `base` pointing at the frame directory. The copy is real
text in the document — it is what the element fades in and out, and it is readable and
indexable whether or not the script ever runs:

```php
<approach-scrub base="<?php echo esc_url(get_template_directory_uri() . '/approach/'); ?>">
  <div data-arch-stage>
    <div data-arch-box>
      <div data-arch-cam role="img" aria-label="Two school desks, a gap between them, and a wooden arch assembled across it">
        <canvas data-arch-layer="0" aria-hidden="true" width="2048" height="1432"></canvas>
        <canvas data-arch-layer="1" aria-hidden="true" width="2048" height="1432"></canvas>
      </div>
      <div data-arch-scrim aria-hidden="true"></div>
    </div>
    <div data-arch-ticks>
      <button data-arch-tick="0" type="button"><span>01</span><span>Define the role</span></button>
      <!-- 01–04, one per copy beat, same order -->
    </div>
    <div data-arch-beats>
      <div data-arch-copy="0">
        <p>01</p>
        <h3>Define the role.</h3>
        <p>The claim.<span data-arch-more> The elaboration, which a short phone drops.</span></p>
      </div>
      <!-- 0–3, same count and order as the ticks -->
    </div>
  </div>
</approach-scrub>
```

**4. Set the pin offset** if the theme's header is not 4.5rem, or is not sticky:

```css
approach-scrub { --arch-pin: 6rem; }   /* 0 if nothing is sticky */
```

That one value drives the sticky offset, the stage's height, and the scroll maths — the
element reads it back off the rendered stage rather than measuring a page header, so
there is nothing to keep in step and a WordPress admin bar cannot throw it off.

The element's own height is the scroll budget: `1000vh` on a wide screen, `600svh` on a
phone, both in `approach.css`. Longer means slower; the beats divide it between them in
proportion to the frames each covers, so the height and the length of the encoded
sequence are one setting in two files — encode more frames without raising the height and
the whole section plays faster. See §3 and §5 of the build spec.

### Things that will bite

- **Do not upload the frames through the media library.** Same reason as the hero:
  WordPress renames on collision and generates its own size variants, and the element
  addresses frames by exact name. Deploy the directory as files.
- **`manifest.json` ships with the frames and is not optional.** The element fetches it
  to learn the frame list and both cuts' dimensions. Serve it from the same directory;
  if it 404s the section stays a still.
- **Two canvases, cross-faded with `mix-blend-mode: plus-lighter` over
  `isolation: isolate`** — not one canvas at partial alpha, which washes out everything
  the two frames share. Both desks are in both frames, so that is most of the picture.
  A theme ancestor with a `filter`, an `opacity` below 1, or its own `mix-blend-mode`
  makes a competing stacking context and can break the blend; that is the first thing to
  check if the plates ever look wrong.
- **The plate hangs from the top of its box, and that is load-bearing.** In the last beat
  two books come to rest on the keystone **thirteen thousandths of a plate-height from
  its top edge**. Anchoring anywhere but the top decapitates that frame. The crop lands
  on the desk legs instead, which is the only part of the picture nothing depends on.
- **`svh`, never `dvh`, for the element's height.** Scroll progress is derived from that
  height, so a budget that changed as a mobile URL bar retracted would snap the scrub
  mid-scroll.
- **The crop rectangle is a three-way contract** — `CROP` in `tools/encode-approach.mjs`,
  `cuts` in the manifest, and the `aspect-ratio` on `[data-arch-box]` in `approach.css`.
  Nothing enforces it. Change one and the camera silently mis-scales.
- **Full-page caching is safe, but only because it was made safe.** As with the hero, the
  element writes a tag on each canvas recording which frame it holds; a cache plugin that
  serialises the rendered DOM would bake that in and the next visitor would get an empty
  canvas claiming to be drawn. The element clears those on boot. Do not optimise it away.
- `budget-mb` (default 96) is a decoded-bitmap ceiling, not a preference. A frame costs
  width × height × 4 bytes however small the WebP is on disk: on the full cut a beat is
  11.7 MB and a move 7.2, on the phone's crop 4.1 and 1.8. The resident set is derived
  from the budget, so encoding larger shrinks it automatically instead of silently
  multiplying what is held — at the sizes that ship, the full cut holds 12 frames. That
  is fewer than one move spans and still measures as enough; §6.8 of the build spec has
  the measurement and how to repeat it before reaching for a bigger number.
- Under `prefers-reduced-motion` the element hides itself and the stacked stills in
  `.hero-static-block` show instead. Those stills carry `opacity: 0` inline and depend on
  the page's `data-reveal` sweeper — see §7.1. **Port that or strip the inline opacity, or
  the reduced-motion fallback renders invisible.**

`docs/approach-render-map.md` maps frames to beats to messages and is the
authority for the numbers. The full markup contract and every attribute are documented at
the top of `assets/approach.js`.

---

## 7. What has to be rebuilt

All of this lives in one `class Component extends DCLogic` inside
`<script type="text/x-dc">` at the bottom of `index.html`. It is written against the
Claude Design runtime — `DCLogic`, `renderVals()`, `{{ bindings }}`, `<sc-if>` — none of
which exists in WordPress. The markup each one drives is already in `pages/`; what is
missing is the behaviour. None of it is large — the two pieces that were are already
components — but read the originals: they are heavily commented and the comments explain
*why*, which is the part that is expensive to rediscover.

### 7.1 The small stuff

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

### 7.2 Delete rather than port

- **The client-side router** (`ROUTES`, `TITLES`, `readRoute`, `show`, `go`, `href`,
  `popstate`). WordPress has real URLs and real pages.
- **`tools/build-site.mjs`** — its whole job is emitting per-route copies of one template
  and verifying references. WordPress makes both unnecessary.
- **`support.js`** — the runtime itself. 1,911 generated lines, nothing to salvage.
- **The CDN dependency.** React and Babel are fetched from unpkg on every load, which is a
  third-party request on the critical path and a single point of failure. Nothing in the
  rebuilt site should need either.

---

## 8. Content

There is no CMS behind any of this — all copy is hardcoded in the template, which is why
`pages/` doubles as the content export. Worth deciding early which of these become
editable fields versus staying in templates:

- **Team members** (Who We Are) — 28 people across four grids: Leadership, Research
  Partners, Technology Partners and Education Fellows. Each carries a headshot, a name, a
  role and optional LinkedIn/website links; fellows also carry a school and location. The
  cards render no bio — the bios exist, but only in the tracking sheet. 9 of the 28 have no
  usable photograph yet and fall back to a grey square, so whatever models this has to treat
  the image as optional. The obvious candidate for a custom post type.
- **Research items** (Home, Follow Our Work) — title, description, link.
- **Approach beats** — six numbered steps, each with a heading and two paragraphs, tied to
  specific animation frames. Editable copy, fixed count; the frame mapping is not content.
- Everything else is page-level marketing copy.

---

## 9. Regenerating anything

| command | what it does |
|---|---|
| `node tools/export-static.mjs` | re-renders `pages/` from the current site (needs `npm i --no-save playwright`) |
| `node tools/encode-hero-bridge.mjs` | re-encodes the hero frames and rewrites their manifest (needs `npm i --no-save sharp`, and the plates, which are not in the repository) |
| `node tools/encode-falling-blocks.mjs` | re-encodes the closing CTA's frames (needs `npm i --no-save sharp`) |
| `node tools/encode-approach.mjs` | re-encodes the Approach frames and rewrites their manifest |
| `node tools/encode-images.mjs` | re-encodes photography and headshots |
| `node tools/build-site.mjs _site` | builds the current static site — useful for comparison while rebuilding |

The encoders write the committed files directly and CI never runs them. **None of them is
needed to rebuild the site in WordPress** — every file they produce is already committed and
listed in §4. They only matter if the artwork itself is being re-rendered, and they read from
masters that are no longer in the repository; each one prints the exact path to restore if
you run it without them. The root `README.md` lists those paths.

To change the closing CTA's resolution, edit `WIDTHS` at the top of
`tools/encode-falling-blocks.mjs` and re-run — it rewrites the frame directory and the
manifest together. (The hero is a different sequence with a different encoder: its widths
are `FULL_W` and `CROP_W` in `tools/encode-hero-bridge.mjs`. Editing `WIDTHS` here changes
the closing CTA and does nothing to the hero.) Adding a second width (640 is the useful one, ~1.4 MB) is a one-line
change and would let the element serve a smaller set to slow connections instead of
falling back to the still.

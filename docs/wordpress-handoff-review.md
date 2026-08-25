# The WordPress handoff — working notes

> **Status (2026-08-24, later the same day).** I rewrote the handoff
> documentation to the Google technical-writing guidelines, and that closed
> most of what these notes rank: the stale notes and tables
> (§3.1's documentation half), the cycle-wheel spec (§3.2, as
> `wordpress-handoff/sections/cycle.md`), the form spec (§3.3), the reference URL
> and acceptance checklist (§3.4), the plugin-hardening notes and `filemtime`
> versioning (§3.5), the JetEngine/CPT UI targeting and inline-styles paragraph
> (part of §3.6), the font-licensing items (§3.7), and the AERDF environment
> section (§1). A second pass the same day closed most of the rest: I
> re-exported `pages/` against the current site, taught the exporter to stamp
> its source commit into every page and strip runtime state (with
> `tools/build-site.mjs` warning when `index.html` moves past the stamp),
> shipped the structured content as data in `wordpress-handoff/content/` with
> `tools/export-content.mjs` to regenerate it, and wrote
> `wordpress-handoff/wp/augmented-ed-assets.php` to implement the enqueue and
> optimizer-hardening rules as a theme drop-in. A third pass finished the last
> engineering item: I ported the cycle wheel to `<cycle-wheel>`
> (`assets/cycle-wheel.js` / `.css`) and verified it with a 22-check unit suite
> over the production markup and a 10-check integration run against the built
> site under the real runtime. Every animated behavior on the page is now a
> copy-paste component — and every component now also carries a full
> native-rebuild specification in `wordpress-handoff/sections/`
> (`hero-bridge.md` and `falling-blocks.md` joining `cycle.md` and
> `approach.md`), so each section survives even a stack where its element
> cannot run. Still open: only the decisions that are AERDF's to make.

*My working notes from getting the handoff ready, written for the AugmentED
team — the developer doing the rebuild gets
[`wordpress-handoff/`](../wordpress-handoff/README.md), which is self-contained
and doesn't need this. What's here is the reasoning: what aerdf.org actually
runs, which I checked directly on 2026-08-24; what current WordPress practice
says; how the package measured up against both; and what I changed in response.
The findings below stand as I wrote them, and the status note above says what
has been done about each since.*

---

## 1. Where this site is going — AERDF's stack, observed

I hadn't checked what the receiving developer actually works in — and it was
checkable from the outside and changed several decisions, so I checked.

**aerdf.org is WordPress on WP Engine, behind Cloudflare.** The theme is custom —
`wp-content/themes/sessionwise-starter-master/`, header verbatim: *"Theme Name: AERDF …
Author: Ryan Fitzgerald … Starter theme for custom Sessionwise WordPress development"*
(sessionwise.com) — with compiled `dist/css/bundle.css` / `dist/js/bundle.js`. Pages are
built in **Elementor 4.2.3 + Elementor Pro 4.2.2**. Plugins visible in the HTML and the
REST index: **JetEngine** (Crocoblock), **Gravity Forms** (+ reCAPTCHA), **CPT UI**,
**Yoast**, **Redirection**, **Wordfence**, **WP-Stateless**, Use Any Font, YellowPencil,
Simple History, Duplicator, Smash Balloon, plus WP Engine's own cache/sign-on plugins.
Third-party layer: Google Tag Manager, CookieYes consent, the **AccessiBe** widget, and
**HubSpot** form embeds. Fonts: Montserrat from Google Fonts, and — notably — **Avenir
already self-hosted** at `wp-content/uploads/useanyfont/…avenir.woff2`.

AugmentED already exists on that install as an Elementor page at
`/opportunities/advanced-fellows/augmented/` (and `/augmented/` 301s to it). The
precedent for both integration shapes exists: most programs (Reading Reimagined,
Assessment for Good, EFLR) are Elementor pages inside aerdf.org; **EF+Math is a separate
WordPress install** on its own domain, custom Roots Sage 11 theme by a different agency
(Constructive), no Elementor.

What follows from each observation:

| Observed | Consequence for this handoff |
|---|---|
| Custom classic theme + Elementor, no block theme | The handoff's classic-PHP shape (`get_template_directory_uri()`, enqueue snippets) is the right dialect. Do **not** re-author the design tokens into `theme.json` — enqueue the eight CSS files exactly as §3 of the handoff says. |
| Elementor builds their pages | The animated pages must **not** be rebuilt as Elementor widgets: Elementor's global CSS and generated wrappers will fight the components' CSS (sticky stages, `isolation`, blend modes), and builder editing inside the component markup would dismantle contracts the elements depend on. The realistic target is a custom page template in their theme with page-scoped assets — which is idiomatic for a SessionWise build (it already ships per-purpose `dist/` bundles). The handoff should say this explicitly, with the reasons. |
| **WP-Stateless offloads the media library to Google Cloud Storage** (`storage.googleapis.com/aerdf-assets`) | The "do not upload frames through the media library" rule — already stated three times in the handoff — is even more load-bearing here than the handoff knows: on this install an upload doesn't just get renamed and resized, it gets **moved to a different host** with a GCS URL the manifest scheme can never construct. Add this observed fact to the warning; it converts a doctrine into a proof. |
| WP Engine + Cloudflare | Two cache layers, both server-side. Page-cache plugins are disallowed on WP Engine, so the WP Rocket-class "delay JS" hazard is less likely — but not impossible (Cloudflare features, or a future host move). Static assets get long-lived caching by default, which is what the immutable frame filenames want. HTML on aerdf.org is currently cache-bypassed by a cookie (`x-cacheable: NO:Set Known Cookie`) — their dev will know; it doesn't affect the frames. |
| **AccessiBe** widget | It rewrites the DOM and can manipulate scrolling and animations. Every acceptance test must run **with the widget active**, and the reduced-motion/"stop animations" mode it offers should be checked against all three scrub components. This is a QA row the handoff cannot currently know to include. |
| Wordfence | Security hardening occasionally 403s direct requests to non-PHP files in theme directories. "Manifest fetch returns 200 after security config" belongs on the launch checklist. |
| **Gravity Forms + HubSpot both present** | The Follow page's form finally has obvious destinations — see §3.3. |
| Avenir already self-hosted on aerdf.org | The license question the handoff raises in §3 is probably already answered inside AERDF — someone licensed the web font once. The action item collapses to: *confirm the existing license covers the new pages/domain*, and name who confirms it. |
| Yoast + Redirection installed | Per-page titles/descriptions from `tools/build-site.mjs` `PAGES` should ship as content (see §3.6), and the preview URLs that circulated (`augmented2.folkmark.com/...`, plus the old long slugs in `MOVED`) can be honored with their Redirection plugin if the final home is on aerdf.org. |
| GTM + CookieYes | If consent-gating is ever applied to scripts, the component scripts must be classified as strictly-necessary/functional — a consent-blocked `hero-bridge.js` is a hero that never moves. One line in the handoff prevents that misclassification. |

**The decision to force early — where the site lives.** Three options, and the handoff
should present them rather than leave them implicit: (A) pages inside aerdf.org's
existing theme (the AugmentED-page precedent), (B) a separate install/subdomain (the
EF+Math precedent — cleanest for a bespoke build, but it creates a second
hosting/maintenance owner, which is the classic handoff failure mode), (C) an Elementor
rebuild (recommend against, above). Also to be decided in the same conversation: the
final URL, what redirects from the preview domain, and **who the receiving developer
actually is** — if it's SessionWise (the theme's author), the handoff can speak their
idiom directly; if it's someone in-house, option B gets more attractive.

---

## 2. What the handoff already gets right

Measured against what the handoff literature says an excellent package contains — live
reference, per-section specs with the *why* documented, asset manifests with byte
sizes, an editable-vs-fixed map, degradation specs, a delete-list — `wordpress-handoff/`
is already far beyond typical. Specifically worth **not** touching:

- **The component doctrine is exactly current best practice.** Dependency-free custom
  elements that drive markup they don't build, enqueued deferred, degrading to a still —
  this is precisely the shape the 2026 consensus endorses for bespoke behavior in
  WordPress (plain enqueued JS remains fully legitimate; the Interactivity API is for
  block-integrated UI and buys nothing here; React is not needed and WordPress ships its
  own anyway). No rewrite is called for. The `base` attribute pattern — the host emits
  the asset base URL in markup — is the WordPress-proof way to address assets; every
  alternative (deriving from the script's own URL) breaks under JS concatenators.
- **The media-library prohibition** (§4, §5, §5a, §6) is the single most important rule
  in the package and is stated everywhere it needs to be. §1 above now gives it teeth.
- **The "things that will bite" sections** encode real, measured failure modes (cache
  plugins serialising canvas state, `plus-lighter` needing `isolation`, `svh` not `dvh`)
  that a WordPress developer would otherwise rediscover expensively.
- **`sections/approach.md`** is the model: asset contract, maths, responsive states, and
  the decisions that look arbitrary and are load-bearing. The suggestions below mostly
  amount to "make more things like this, and keep them true".

---

## 3. The gaps, ranked

### 3.1 The package has drifted from the site (highest priority, cheapest fix)

The site changed on 2026-08-24; the export in `pages/` is from 2026-08-21. Specifically:

- **`pages/home.html` predates the co-design cycle rebuild** (`f2e02ed` and the four
  copy commits after it). The new scroll-driven cycle rig — `data-cycle-rig`, absent
  from the export — and AugmentED's corrected copy exist only in `index.html`.
- **The §2 warning is stale in the opposite direction.** It says *"home.html is one
  revision behind — it still shows the hero as a plain `<img>`"*; the export has carried
  the full `<hero-bridge>` markup since `b165a6f`. A warning that describes a fixed
  problem teaches the reader to distrust the document's other warnings.
- **The §7.1 behaviour table describes a page that no longer exists.** `data-lift`,
  `data-gloss`, `data-term`/`data-terms`/`data-term-gloss`, `data-kit`, `data-brick` and
  `data-on` no longer appear in the markup; `data-reveal` is 67 uses now, not 59; the
  "Animated diagram" row describes the old Approach-page widget, not the new scroll-clocked
  wheel; the `[data-build]` loop in the component script matches nothing and is dead
  code; and five `data-step` sections on The Challenge are read by nothing at all
  (worth a line saying they're inert, so nobody ports a mechanism for them).
- **§5's sample contradicts the live markup**: the sample says `min-width="901"` and
  documents a below-901px still fallback; the page ships `min-width="0"` (the blocks now
  run on phones). The status note says the pin shortened to 140svh while the sample CSS
  still teaches `290svh − 100svh`.

**Suggestions.** Re-run `node tools/export-static.mjs` (needs a machine that reaches
unpkg) and re-verify the two stale notes and the §7.1 table in the same sitting. Then
make drift *detectable*: have `export-static.mjs` stamp the source commit into a comment
at the top of each exported page (`<!-- exported from 4a063e4 -->`), and let
`tools/build-site.mjs` print a warning when `index.html` has changed since the stamp.
That converts "someone should remember to re-export" into a message nobody can miss —
the same move the manifest check already made for frames. While in the exporter, also
strip the Claude Design runtime's placeholder CSS (`.sc-placeholder`, the `sc-dc-streaming`
shimmer) that currently rides along in every exported `<head>` — ~40 lines of residue a
WordPress developer should not have to puzzle over.

### 3.2 The cycle wheel is the one intricate behaviour with no spec

The new home-page R&D cycle rig is now **the largest single rebuild item in the
handoff, and the only intricate one written against the runtime that won't exist in
WordPress** — and it is documented nowhere. It is not small: a 260vh pinned stage whose
scroll clock is split into four beats; arcs drawn by `stroke-dashoffset` over per-beat
segment windows; a latch at p = 0.97 whose value was *measured* (the comment records a
25.8-dashoffset-unit jump at 0.93 and why, uniquely, this value can't be eased); nodes
that gain pointer-events only once drawn; a click-vs-focus distinction (click travels
the page to the beat mid-point with an eased scroll, keyboard focus opens the stage in
place); the hub's closing line waiting for the loop to close; a mobile arm that is a
plain accordion with no pinned run; and reduced-motion collapsing the whole build to
its finished state. All of that intent currently lives only in source comments inside
`index.html`.

**Suggestions**, in order of preference:

1. **Port it to a fourth custom element before handoff** (`<cycle-wheel>`, say), built to
   the same doctrine as the other three: markup authored in the page, element drives it,
   no runtime API. The logic is ~120 lines and its CSS already lives in the page head;
   this is half a day to two days of work, and it would make *the entire animated
   surface of the site* copy-paste portable. §7 of the handoff would then shrink to
   genuinely trivial items — reveal-on-scroll, mobile menu, a body-offset sync — which
   changes the received scope of the project from "port two components and rebuild one
   intricate scroll section" to "copy four directories".
2. If the port doesn't happen, **write `wordpress-handoff/sections/cycle.md`** in the
   shape `approach.md` established: the markup contract, the clock maths (beat windows,
   arc segments, the latch and its measurement), the click/focus semantics, the mobile
   arm, reduced motion, and the decisions that look arbitrary. The §1a table already
   anticipates this — *"the shape of that document is meant to be reused"*.

Either way, §7.1's effort table needs re-ranking around it.

### 3.3 The form collects nothing, and the handoff doesn't say so

The Follow page renders a full form — required email, nine-way "which are you" radio,
free-text message, a **Subscribe** button — whose submit handler is
`preventDefault()` and nothing else. Every submission is silently discarded. That is
fine for a preview and invisible in the handoff: §8 lists content types but never
mentions the form, so the WordPress developer has no brief for the one element that
needs a *backend decision from AERDF* rather than a port.

**Suggestion.** Add a §8 entry (or a short `sections/follow-form.md`): the field
schema (email, required; role, one of nine values; message, optional), where
submissions should land, and the fact that this is an open product decision. AERDF
already runs **Gravity Forms with reCAPTCHA** and embeds **HubSpot forms** — the
receiving developer will reach for one of those within the hour; the handoff's job is
the field map, the consent posture (CookieYes is on the site), and a named owner for
"where does the list live". Flag also that "Subscribe" implies an email program, which
is a commitment beyond the form itself.

### 3.4 No reference URL, no definition of done

The handoff never names the live site. `augmented2.folkmark.com` (the `CNAME`) is the
single most valuable artifact the package has — the handoff literature is unanimous
that the working reference is the anchor deliverable, the thing "pixel-perfect" is
measured against — and the reader of `wordpress-handoff/README.md` is never told it
exists, nor that `gh-pages`/the workflow rebuild it on every push to main.

There is likewise no statement of when the port is *done*. The raw material is all
present (byte totals, breakpoints, degradation states); it has not been assembled into
pass/fail criteria.

**Suggestion.** Open the handoff README with a short block: the reference URL; a
per-page acceptance line ("matches the reference at 360/768/1440/1920 wide");
per-component acceptance drawn from what the specs already know (hero scrubs 276→417
and releases with the headline on the same pixel; cycle ring builds over the pinned
travel and latches complete; CTA blocks clear before the pin ends; each component's
reduced-motion, save-data and no-JS states render its documented fallback); an
environment matrix (Chrome/Firefox/Safari/Edge, iOS Safari, plus **logged-in with the
admin bar**, and **with AccessiBe active** on aerdf.org); and the performance budget as
numbers the package already states (sequence payloads per cut; the page before the
scrub starts; the hero still as LCP). If AERDF's developer wants it machine-checked,
point at Lighthouse CI's `budget.json` — but the list itself is the deliverable.

### 3.5 WordPress-environment hardening the handoff doesn't yet cover

The handoff defends well against page caches and the media library. Two documented
plugin classes it doesn't mention will, statistically, meet this site someday:

- **Image-optimizer plugins reach into theme directories.** EWWW's bulk optimizer and
  "Folders to Optimize", Smush's Directory Smush, and ShortPixel's "optimize other
  folders" all re-compress images *outside* the media library — including a theme's
  `assets/` — in place. One well-meaning bulk run re-lossy-compresses every q90 frame
  and the tuned alpha encodes are gone, with no filename to 404 and nothing visibly
  broken. Edge optimizers (Cloudflare Polish, Jetpack Photon) are the same class.
  **Suggestion:** a short "protect the frames" note: exclude the component asset paths
  from any image-optimization plugin and any CDN image feature; the byte totals in §4
  are the tamper check (a re-compressed sequence announces itself as a changed total).
- **JS "delay/combine/minify" features break exactly this architecture.** WP Rocket's
  Delay JS boots scripts on first interaction (a scroll-scrubbed hero boots mid-scroll,
  already late); LiteSpeed/SiteGround/Autoptimize combine-and-relocate scripts;
  WP Rocket's CSS minifier has repeatedly corrupted `calc()`/`clamp()` — which the
  scroll budgets are made of. WP Engine disallows page-cache plugins, so today the risk
  is low — but hosts change and Cloudflare grows features. **Suggestion:** one
  paragraph naming the belt-and-braces attributes (`nowprocket`,
  `data-no-defer="1"`, `data-jetpack-boost="ignore"` via the `script_loader_tag`
  filter) and the rule: the component scripts and stylesheets are excluded from
  delay, combine, minify and remove-unused-CSS, or shipped pre-minified so
  optimizers skip them.

Two smaller notes worth adding while there: the enqueue snippets should model
`filemtime()`-based `ver` rather than `'1.0'` (managed hosts cache far-future, and a
re-encode must bust), and `get_stylesheet_directory_uri()` is the child-theme-safe
variant of the call the snippets use — on aerdf.org's custom theme it's moot, but the
snippet teaches the pattern someone will copy elsewhere.

### 3.6 Content ships as markup, not as data

§8 correctly identifies the content model (team CPT, research items, cycle beats). Two
upgrades make it actionable:

- **Ship the structured content as data, not only as rendered HTML.** 28 team members
  with name, role, group, links, school/location, photo-or-placeholder — that is a
  half-hour of error-prone scraping from `team.html`, or a CSV/JSON the repo can
  generate mechanically from the same markup. Same for the research items and the
  per-page titles/descriptions already sitting in `tools/build-site.mjs` `PAGES` (which
  map directly onto Yoast fields their install already has). A `wordpress-handoff/content/`
  folder with three small files closes it.
- **Say the words "JetEngine and CPT UI are already on their install."** The receiving
  developer will model the team CPT in the tools they already run; a field list written
  with that in mind (and the note that 9 of 28 have no usable photo, so the image is
  optional — already in §8) lands without translation.

One honest paragraph is also worth adding about **the inline styles**: every exported
page carries its styling as `style=""` attributes resolving design-system custom
properties. That is faithful to the source and fine to keep for a first port into
custom page templates, but it is not editor-friendly markup — anything destined to be
*editable* (§8's list) should be re-expressed as theme markup + classes or CPT
templates during the port, and the handoff should set that expectation rather than let
it surprise.

### 3.7 Fonts and licences — one line short of done

§3's Avenir warning is right and stops one step early. Suggestions: name the licence
holder and who confirms coverage for the new deployment (aerdf.org already self-hosts
`avenir.woff2` via Use Any Font, so the answer likely exists inside AERDF already);
state that **only the WOFF2 files ship** — the OTF desktop originals sitting beside
them in `_ds/*/assets/fonts/` are encoder inputs and must not be deployed to a web
root; and note the icon font's regeneration URL (already beside the `@font-face` in
`icons.css`) as the one asset with an external regeneration dependency. Material
Symbols is Apache-2.0 — say so, so nobody has to ask.

---

## 4. The work, ordered

| # | Item | Effort | Section |
|---|---|---|---|
| 1 | Re-export `pages/`; fix the two stale notes and the §7.1 table; reconcile §5's sample with the live markup | ~2h | 3.1 |
| 2 | Port the cycle wheel to a custom element (preferred) or write `sections/cycle.md` | 0.5–2d | 3.2 |
| 3 | Add the reference URL + acceptance criteria/QA matrix block to the handoff README | 1–2h | 3.4 |
| 4 | Add an "AERDF target environment" section: the observed stack, the three integration options with a recommendation, the decisions to force (URL, redirects, who the dev is) | 1–2h | 1 |
| 5 | Spec the Follow form (fields → Gravity Forms / HubSpot, owner for the list) | 30m + a decision | 3.3 |
| 6 | Add the optimizer-plugin and delay-JS hardening notes; upgrade the enqueue snippets (`filemtime`, stylesheet-dir) | 1h | 3.5 |
| 7 | Generate `wordpress-handoff/content/` (team + research as CSV/JSON, page metadata) | 1–2h | 3.6 |
| 8 | Finish the font-licensing paragraph; mark OTFs as non-deployable | 15m | 3.7 |
| 9 | Exporter stamps its source commit; build warns on drift; strip the placeholder-CSS residue | 1–2h | 3.1 |

Items 1–5 are the ones that change the receiving developer's week. Items 6–9 are the
ones that protect the site in year two.

## 5. What *not* to do

- **Don't re-author the design system into `theme.json`.** Their theme is classic;
  plain enqueued token CSS is correct there, and the handoff already says to enqueue the
  eight files in order. A theme.json mapping is only worth building if AERDF's developer
  chooses to surface tokens in the editor — offer, don't pre-build.
- **Don't rewrite the components as React, blocks, or Interactivity-API code.** The
  dependency-free custom element is the consensus-correct shape; wrapping one in a
  dynamic block later is a ten-line convenience their developer can choose, not a
  precondition.
- **Don't fork the handoff into per-stack variants.** One package, one added "AERDF
  specifics" section. The EF+Math precedent shows their installs diverge by agency;
  the package's stack-agnostic core is what survives that.

---

## Appendix — the research in brief

Compressed from three research passes (2026-08-24); load-bearing sources only.

**Modern practice (WP 7.0 era).** Professional client work lands mostly on *hybrid*
themes — classic PHP templates plus `theme.json` tokens — not full-site-editing block
themes; core keeps back-porting block-theme features to classic themes
([developer.wordpress.org on hybrid themes](https://developer.wordpress.org/news/2024/12/bridging-the-gap-hybrid-themes/),
[GeneratePress's FSE position](https://generatepress.com/generatepress-and-the-future-of-full-site-editing-our-approach/)).
Agencies favour dynamic blocks (`render.php`) or ACF PRO blocks over static ones
([10up best practices](https://gutenberg.10up.com/reference/Blocks/custom-blocks/));
patterns of core blocks beat custom blocks where they suffice. Self-contained custom
elements integrate cleanly: enqueue deferred (`'strategy' => 'defer'`, WP 6.3+), emit
markup from a template or dynamic block
([CSS-Tricks on web components in WP](https://css-tricks.com/using-web-components-in-wordpress-is-easier-than-you-think/));
ES modules via `wp_enqueue_script_module()` exist (6.5+) but classic scripts remain the
smoother path. Editorial control is `templateLock: "contentOnly"`, per-block locks,
curated inserters, and synced patterns with overrides
([content-only locking](https://make.wordpress.org/core/2022/10/11/content-locking-features-and-updates/),
[curating the editor](https://developer.wordpress.org/news/2024/07/15-ways-to-curate-the-wordpress-editing-experience/)).

**Assets and the plugin environment.** Frame sequences are application assets and live
in the theme, never the media library (sub-size explosion, `-scaled` rewrites, renames
on collision — and on aerdf.org, WP-Stateless relocation to GCS). Image-optimizer
plugins reach theme directories: [EWWW](https://docs.ewww.io/article/11-advanced-configuration),
[Smush Directory Smush](https://wpmudev.com/blog/new-smush-feature-directory-smushing/),
[ShortPixel](https://wordpress.org/plugins/shortpixel-image-optimiser/). Delay-JS
executes scripts on first interaction and kills scroll-driven code
([WP Rocket](https://docs.wp-rocket.me/article/1349-delay-javascript-execution),
[LiteSpeed](https://docs.litespeedtech.com/lscache/lscwp/pageopt/)); combine/minify
relocates scripts and has corrupted `calc()`/`clamp()`
([wp-rocket#1554](https://github.com/wp-media/wp-rocket/issues/1554),
[#4034](https://github.com/wp-media/wp-rocket/issues/4034)). Escape hatches:
`nowprocket`, `data-no-defer="1"`, `data-jetpack-boost="ignore"`, plugin exclusion
lists. Plugin lazy-loaders cannot see JS-fetched images — the frames are safe; poster
`<img>`s need exclusion only if they misbehave. 20–30 MB of frames in a theme is
unremarkable on every major managed host (Pantheon's real limits: 256 MiB/file, ~50k
files/dir — [docs](https://docs.pantheon.io/guides/filesystem/large-files)); WP Engine
disallows page-cache plugins because caching is server-side
([disallowed plugins](https://wpengine.com/support/disallowed-plugins/)). Pass config
from PHP (`wp_add_inline_script` / markup attributes), never derive a base URL from the
script's own location ([Roots on localize-script](https://roots.io/stop-using-wp_localize_script-to-pass-data/)).
Drop unpkg React/Babel entirely: reliability (unpkg's 2024 outages), double-React
against WordPress's own bundled copy, and the GDPR precedent on third-party CDNs
(LG München, the Google Fonts ruling —
[coverage](https://wptavern.com/german-court-fines-website-owner-for-violating-the-gdpr-by-using-google-hosted-fonts)).
Admin bar (32/46px, only when logged in) and smooth-scroll plugins are the recurring
"scroll animation broken in WP" causes; reduced-motion should skip the fetches too
(WCAG 2.3.3 territory — [WAI SCR40](https://www.w3.org/WAI/WCAG21/Techniques/client-side-script/SCR40)).

**Handoff practice.** The anchor deliverables per the literature: a live reference URL,
acceptance criteria + a definition of done
([rtCamp's checklist](https://rtcamp.com/handbook/designing-for-wordpress-site-editor/developer-handoff-checklist/),
[Computan](https://www.computan.com/blog/the-complete-agency-website-project-checklist)),
an editable-vs-fixed map
([WPBrigade](https://wpbrigade.com/figma-to-wordpress-handoff-guide/)), asset manifests
with byte sizes feeding a stated performance budget
([web.dev on Lighthouse budgets](https://web.dev/articles/use-lighthouse-for-performance-budgets)),
font files *with licence names and transfer status*
([Pressable](https://pressable.com/blog/font-licensing-for-wordpress-agencies/)), and
named owners for hosting, plugins and maintenance
([Delicious Brains](https://deliciousbrains.com/wordpress-handoffs-because-figure-it-out-is-not-a-client-strategy/)).
The classic failure modes: stale specs, missing font licences, no definition of done,
no editable-vs-fixed map, ambiguous ownership. §3 above maps this package against that
list; it already clears most of it.

**AERDF observations** were collected 2026-08-24 by direct fetches of aerdf.org (HTML,
response headers, `/wp-json/` index, theme `style.css`) and efmathprogram.org; the
facts are quoted in §1 and separate observed fact from inference. LEVI and CIPHER, for
the record, are not AERDF programs — their programs page lists AugmentED, Reading
Reimagined, Assessment for Good, EF+Math and EFLR.

# The leadership bio pages — build spec

Four pages, one per member of the leadership team, at `/team/<slug>/`. They are the only
pages on this site that are **not** the single-page app, and porting them is the easiest
job in this package: in WordPress they are one custom post type with one template.

**Audience.** You're rebuilding the Who We Are page, or adding a person to it. Read
[the handoff README](../README.md) first for the rules shared by everything here.

**Where the numbers come from.** Measured in Chromium against the built artifact, not
estimated.

---

## 1. What replaced what

Until September 2026 the five leaders had a different treatment: a full-width portrait
over a long bio, two cards across, in a grid of its own called `.leadership-rows`. The
client asked for the portraits to match the other groups and for the bios to move behind
a link. Both are now true, and that grid, `.person-row`, `.person-bio` and the CSS
carrying them are gone. **If you find any of those class names in an older copy of this
handoff, it is dead.** The leadership group is a `.team-grid-3` like every other group on
the page.

What the change bought, measured at 1440: every headshot on the page renders at the same
197x197, and the page went from carrying about 640 words of bio prose to four links.

## 2. The content lives in one place

`source-material/bios/<slug>.md`, one file per person, and nowhere else. The format is
three parts:

```
# Full Name
## Role line

First paragraph.

Second paragraph.
```

`tools/build-site.mjs` reads that directory and writes `/<slug>/` under `team/`. There is
no Markdown parser — bold, links and lists are not rendered, they ship as literal
characters. Keep bios to prose, or add a parser; it is about ten lines in `readBios()`.

`source-material/bios/unused/` holds bios kept but not published; the build does not read
it. Brandon Bodnar's is there: he moved to Technology and Design Partners in September,
and partners do not carry bios.

## 3. The card contract

A leadership card is an ordinary `.team-grid-3` tile plus a class and a link:

```html
<div class="bio-tile" data-reveal="" id="sherry-lachman" style="opacity:0;transition:…">
  <img src="assets/team/sherry-lachman.webp" … width="512" height="512">
  <h3 …>Sherry Lachman</h3>
  <p style="…font-weight-semibold…">Founder &amp; Executive Director</p>
  <!-- icon links, if any, go HERE -->
  <p class="bio-cta"><x-import …Button variant="link" as="a" href="team/sherry-lachman/">Read bio<span class="visually-hidden"> of Sherry Lachman</span><x-import …Icon name="chevron_right" size="sm"></x-import></x-import></p>
</div>
```

The link is the design system's link button with a trailing `chevron_right`, the same
"Read more ›" the papers use and every "Learn more ›" on the site. In WordPress that is
whatever your theme renders for those; the point is that it is the same component, not
a one-off.

**The link is the coupling.** A bio page is built only when a card carries
`href="team/<slug>/"`, where the slug is the bio's filename; a bio nothing links to is
skipped with a warning rather than published. It used to be decided by the card's `id`,
and that built an orphan page for a person who still had a card but no link. Caught
before it shipped. Keep the `id` equal to the slug anyway; the build uses it to find
the person's LinkedIn and website for their page (section 6). It is **not** a working
deep link: the app renders after the browser has already tried to jump to
`/team/#sherry-lachman`, so the page opens at the top (measured: `scrollY` 0).

**The href is written relative — `team/<slug>/` — and absolutised at build time.** Do not
"fix" it to a leading slash. Every route in this site is the same `index.html` written out
again, so a relative bio link would resolve against whatever route the reader is on:
correct from `/team/`, and `/sherry-lachman/` from the home page. `absolutise()` in
`tools/build-site.mjs` rewrites it, with a pattern tight enough that it cannot catch the
nav's own links.

**The whole tile is the link.** The rules live under "THE BIO TILES" in `index.html`'s
`<style>`. Reproduce the behaviour, not necessarily the selectors:

| What | How | Why |
| --- | --- | --- |
| Photo, name, role and the space between are all clickable | The link's `::after` is `position:absolute; inset:0`, and `.bio-tile` is `position:relative` | One link per person and one tab stop, with a target the size of the card. This is the stretched-link pattern; do **not** wrap the card in an `<a>`, or a screen reader reads the whole card as the link's name. The cost is that text under the overlay cannot be selected. |
| Icon links stay clickable | `.bio-tile a[aria-label] { position:relative; z-index:1 }` | Otherwise the overlay swallows Raquel's LinkedIn. |
| Screen readers hear "Read bio of Sherry Lachman" | A `.visually-hidden` span after the visible words | Four identical "Read bio" links are ambiguous out of context. The visible words come first so speech-control users can say what they see (WCAG 2.5.3). **Not an `aria-label`**: the team grid styles every `.team-grid-3 a[aria-label]` as a 24px icon box (44px on touch), and it would shrink the link into one. |
| Every "Read bio" in a row sits on one line | `.bio-tile` is a flex column; `.bio-cta` has `margin-top:auto` | Before this, the link followed the role line and any icon row, and sat at 320, 320, 340 and 344px down the four tiles. |
| Hover | Link to 70% opacity (the site's `a:hover`); the photo or placeholder to `brightness(.92)` | The design system's two hover rules: links dim, and hover goes darker, never lighter. |
| Keyboard focus | 2px `--brand-accent` outline on the overlay, 6px offset | The design system has no focus ring and says to add one in that colour. Drawn on the overlay, it outlines the whole tile. |

Measured at 1440: tile 197x363, link 94x38, four links on one line; clicks on the
photo, the name and the empty space all open the bio.

## 4. Two invariants you must not break

These are silent failures: the page still renders, the build still passes, and the content
handed on is wrong.

**1. `src` must be the first attribute on a team `<img>`.** `export-content.mjs` anchors
its headshot regex on the literal `<img src="`. React preserves author attribute order for
everything except `style`, so writing `<img class="shot" src="…">` in `index.html` takes
all 24 headshots to `null` — with a green build. There is an assertion for this
(`expected 24 headshots, parsed 0`), so it fails loudly now; before it existed it did not.

**2. The link text starts with exactly "Read bio".** The exporter finds each bio page by
the `href` of the `<a>` whose text starts `Read bio`, and asserts that the number of
`>Read bio<` in the markup equals the number parsed. The hidden name after it is fine,
and so is `href` not being the first attribute (the rendered link button puts
`data-slot` and `data-variant` ahead of it). Rewording the visible text to "Read Sherry's
bio" does not break the page. It breaks `team.json`, quietly, by dropping the URL. Change
the text in both places or not at all.

## 5. What the exporter produces

`content/team.json` carries `bioUrl` per person: the page's URL, or `null`. It does **not**
carry the bio text. That is deliberate — the prose has one home in
`source-material/bios/`, and copying it into the export would create a second copy to
drift out of step. Follow the URL.

## 6. The bio page template

`bioPage()` in `tools/build-site.mjs`. It is static HTML with the design system's
stylesheets in `<head>`, so it renders correctly with JavaScript disabled.

**The header and footer restate the app's.** The app writes its chrome as inline styles
inside the runtime's template, so there is nothing to import; the template copies the
values the app renders with, measured off `/team/`:

- a sticky 96px bar;
- the logo at 220x74, with the kit's 504x169 size attributes;
- nav at the body size with `--space-10` between;
- a 37px "Follow our work" pill. It is an `<a>` styled as the design system's small
  default button, which hovers darker.

Below 992px it is a `<details>` menu with no script: the same two 22x2 bars turning into
the same X, and the same overlay with the links at h4 size. Measured against the app, the
header, logo, pill, footer and the menu's link positions (144, 212, 280, 348 at 400px)
all match. What it cannot do without script is close on Escape or lock the page behind
the overlay.

In WordPress the page uses the theme's own header and footer, so none of this needs
porting. It exists so the static build does not look like a different site.

**The layout, measured at 1440:**

| | Desktop (992px and up) | Mobile |
| --- | --- | --- |
| Portrait | Own column, 288px (`18rem`), larger than the 197px tile | Stacked, 192px (`12rem`) |
| Text column | Up to `38rem`, 62–69 characters per line measured | Full width, about 45 characters |
| No photo (Jenny) | One text column, not a grey square | Same |

Everything aligns to the same `--container-xxl` edge as the logo. Above the layout is a
"‹ Who We Are" link to `/team/`, whose chevron is `chevron_right` mirrored, because the
icon font is subset to five glyphs and `chevron_left` is not one of them. After the bio
come the person's LinkedIn and website, read off their own tile so the tile stays the one
place they are written. Each is shown as its mark plus a label, per the design system,
which puts brand marks under team bios.

**The metadata:**

- `<title>`, and a meta description that is the bio's first sentence.
- A canonical link and `og:url`; `og:type=profile` with `profile:first_name` and
  `profile:last_name`.
- `ProfilePage` JSON-LD whose `mainEntity` is a `Person` with `name`, `jobTitle`,
  `description`, `image`, `sameAs` (the tile's links) and `worksFor` set to AugmentED.
  Google lists "an employee page on a company website" as a use for this type:
  <https://developers.google.com/search/docs/appearance/structured-data/profile-page>.
- The site's share card as `og:image`. It is an **absolute** URL on every page, not
  just these, built from `CNAME`. A link unfurler reads the tag without a page to
  resolve a path against.

Without a `CNAME` the build leaves out the canonical, `og:url` and JSON-LD rather than
filling them with paths, and warns.

## 7. Adding a person

1. Add their card to the Leadership grid in `index.html` with `class="bio-tile"` and
   `id="<slug>"`.
2. Add their headshot master to `source-material/image-sources/team/<slug>.jpg` and a job
   to `tools/encode-images.mjs` at `width: 512, square: true`.
3. Write `source-material/bios/<slug>.md`.
4. Add the `Read bio` link to their card, copying another leader's `.bio-cta` paragraph,
   with the slug in the href and the name in the hidden span.
5. Bump the counts in `tools/export-content.mjs` — `team.length` and the headshot count are
   hard-coded on purpose, as tripwires.

Step 3 can land before step 4: the bio is skipped with a warning until the link exists,
so nothing is published early.

### Verification

Build, then confirm at 1440, 992 and 400:
- every card on the page is the same width, and each row's "Read bio" links share a line;
- clicking a leader's photo, name or the space between opens their page;
- Tab stops once per leader;
- a bio page's header and footer match `/team/`'s;
- a bio page renders correctly **with JavaScript disabled**. That last one is the
  property that makes these pages portable, and it is easy to lose by reaching for the
  design system's runtime components instead of plain markup.

The build also checks the team page's shape. Every Who We Are card must be a direct
child of a `.team-grid-3`, and every screen's `<div>`s must balance. In September a card
placed one `</div>` too late rendered 1280px wide and pushed the closing section out of
`<main>`, and nothing else caught it.

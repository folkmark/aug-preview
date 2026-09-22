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
characters. Keep bios to prose, or add a parser; it is about ten lines in `bioPages()`.

`brandon-bodnar.md` is in that directory with no page. He moved to Technology and Design
Partners in September, and partners do not carry bios; the file stays so the text is not
lost.

## 3. The card contract

A leadership card is an ordinary `.team-grid-3` tile plus two things:

```html
<div data-reveal="" id="sherry-lachman" style="opacity:0;transition:…">
  <img src="assets/team/sherry-lachman.webp" … width="512" height="512">
  <h3 …>Sherry Lachman</h3>
  <p style="…font-weight-semibold…">Founder &amp; Executive Director</p>
  <!-- icon links, if any, go HERE -->
  <p style="margin:var(--space-4) 0 0"><a href="team/sherry-lachman/" …>Read bio</a></p>
</div>
```

**The `id` is the slug and the slug is the filename.** That is the whole coupling between
a card and its page. A bio file whose slug matches no card builds a page nothing links to;
the build prints a warning rather than failing, because writing the prose before adding
the card is a reasonable order to work in.

**The href is written relative — `team/<slug>/` — and absolutised at build time.** Do not
"fix" it to a leading slash. Every route in this site is the same `index.html` written out
again, so a relative bio link would resolve against whatever route the reader is on:
correct from `/team/`, and `/sherry-lachman/` from the home page. `absolutise()` in
`tools/build-site.mjs` rewrites it, with a pattern tight enough that it cannot catch the
nav's own links.

## 4. Two invariants you must not break

These are silent failures: the page still renders, the build still passes, and the content
handed on is wrong.

**1. `src` must be the first attribute on a team `<img>`.** `export-content.mjs` anchors
its headshot regex on the literal `<img src="`. React preserves author attribute order for
everything except `style`, so writing `<img class="shot" src="…">` in `index.html` takes
all 18 headshots to `null` — with a green build. There is an assertion for this
(`expected 18 headshots, parsed 0`), so it fails loudly now; before it existed it did not.

**2. The link text is exactly "Read bio".** The exporter finds each bio page by matching
`>Read bio<` and pulling the href beside it, and asserts that the number of links in the
markup equals the number parsed. Rewording the link to "Read Sherry's bio" does not break
the page — it breaks `team.json`, quietly, by dropping the URL. Change the text in both
places or not at all.

## 5. What the exporter produces

`content/team.json` carries `bioUrl` per person: the page's URL, or `null`. It does **not**
carry the bio text. That is deliberate — the prose has one home in
`source-material/bios/`, and copying it into the export would create a second copy to
drift out of step. Follow the URL.

## 6. Adding a person

1. Add their card to the Leadership grid in `index.html` with `id="<slug>"`.
2. Add their headshot master to `source-material/image-sources/team/<slug>.jpg` and a job
   to `tools/encode-images.mjs` at `width: 512, square: true`.
3. Write `source-material/bios/<slug>.md`.
4. Add the `Read bio` link to their card.
5. Bump the counts in `tools/export-content.mjs` — `team.length` and the headshot count are
   hard-coded on purpose, as tripwires.

Steps 1 and 3 are independent: either order builds, and the build tells you if only one
landed.

### Verification

Build, then confirm at 1440 that every headshot on the page measures the same 197x197,
that each leader's Read bio link resolves to a real page, and that a bio page renders
correctly **with JavaScript disabled** — that last one is the property that makes these
pages portable, and it is easy to lose by reaching for the design system's runtime
components instead of plain markup.

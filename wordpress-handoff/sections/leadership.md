# The Leadership rows — build spec

This is the specification for the five Leadership entries on the Who We Are page:
a portrait beside a long bio, stacked and hairline-ruled. Unlike the other three
specs in this directory there is no component and no JavaScript — it is markup and
CSS only, and porting it is copying both.

**Audience.** You're rebuilding or changing the Who We Are page. Read
[the handoff README](../README.md) first for the rules shared by everything here.

**Where the numbers come from.** Every measurement below was taken in Chromium
against the built artifact at five viewport widths, not estimated.

---

## 1. Why this is not the partner grid

The other four groups on this page (Research Partners, Technology Partners,
Education Partnerships and Fellows) use `.team-grid-3` — a dense tile grid, six
columns at ≥992px. Leadership used to use `.team-grid-2`, which was five columns.

It cannot, now that these five have bios. That grid was
`repeat(5, minmax(0, 1fr))` inside a 1280px `--container-xxl`, so one card measured:

| viewport | card width | characters per line |
| --- | --- | --- |
| 1440 | 240px | ~30 |
| 1280 | 214px | ~26 |
| 992  | 163px | ~19 |

Against a floor of about 45 characters, below which running prose stops being
readable. Note that **992 is the worst case, not the phone** — the five-column rule
switched on while the container was still wider than the viewport, so the column got
narrower as the screen got wider past 991px.

The grid also set every `<p>` inside it to `--text-small !important` — 13px on a
phone — which an inline `font-size` cannot override. The design system's own
`tokens/typography.css` argues against that in a comment attached to
`--text-regular`: *"16px is the floor at which running text stays comfortable."*

So Leadership leaves the class. `.team-grid-2` no longer exists anywhere; if you
find it in an older copy of this handoff, it is dead.

## 2. The shape

```html
<div class="leadership-rows">
  <article class="person-row" data-reveal="" id="sherry-lachman"
           aria-labelledby="name-sherry-lachman" style="opacity:0;transition:…">
    <div class="person-id">
      <img src="assets/team/sherry-lachman.webp" alt="Sherry Lachman" …>
    </div>
    <div class="person-copy">
      <h3 id="name-sherry-lachman" …>Sherry Lachman</h3>
      <p style="…font-weight-semibold…">Founder &amp; Executive Director</p>
      <!-- icon links, if any, go HERE — above the bio -->
      <div class="person-bio"><p>…</p><p>…</p><p>…</p></div>
    </div>
  </article>
  …
</div>
```

Two tracks at ≥992px: `var(--container-xxs) minmax(0, 1fr)` with a `--space-20`
gutter. One track below. The bio is capped independently of the track —
`--container-md` in the two-column arm, `--container-sm` in the stacked one,
because the type steps down to 16px below 992 while the column does not.

Measured result, characters per line: **67 at 1440, 67 at 1280, 59 at 992, 67 at
768, 46 at 400.** All inside the comfortable band.

A leader with no bio yet degrades to exactly the card they had before: portrait,
name, role, one row tall. Nothing special is needed for them.

## 3. Four invariants you must not break

These are not style preferences. Each one is a silent failure — the page still
renders, the build still passes, and the content handed on is wrong.

**1. This block must never carry `.team-grid-2` or `.team-grid-3`.** Both classes
set `p { font-size: var(--text-small) !important }`, which wins against any inline
font-size. A bio inheriting it renders at 13px on a phone and nothing warns you.

**2. `src` must be the first attribute on a team `<img>`.** `export-content.mjs`
anchors its headshot regex on the literal `<img src="`. React preserves author
attribute order for everything except `style`, so writing `<img class="shot" src="…">`
in `index.html` takes all 20 headshots to `null` — with a green build. There is now
an assertion for this (`expected 20 headshots, parsed 0`), so it will fail loudly;
before that assertion existed it did not.

**3. The bio paragraphs carry no `style` attribute.** Their typography is set from
the page stylesheet by `.person-bio p`. This is structural, not tidiness: the
exporter matches a person's role and affiliation with regexes that require a literal
`<p style="`. A bio paragraph with any inline style is parsed as that person's
**affiliation** — I reproduced this, and it gives 28 records, zero errors and a green
build with Sherry's bio sitting in the wrong field.

**4. Icon links stay above the bio in source order.** The exporter reads links from a
2,500-character window after the name. The bio is longer than that window; if it sits
between the role and the links, the links fall outside and vanish from `team.json`.

## 4. What the exporter produces

`content/team.json` gains a `bio` field: an array of paragraph strings, or `null`
for the 23 people without one. The array preserves the authored paragraphing, which
is a design decision rather than an accident — 190 words is 19 unbroken lines at
1440 and 27 at 400px.

Two assertions guard it. Bios are counted **relationally** — the number of
`class="person-bio"` blocks in the markup must equal the number parsed — rather than
against a hard-coded 5, so a sixth leader is a markup change and not a build break.
And a bio block that parses to zero paragraphs fails by name, because that is the
shape a stray inline tag produces.

## 5. Print and reduced motion

Both were added with this section and both are page-wide.

`[data-reveal]` starts at `opacity: 0` and the page's `sweep()` only reveals what
crosses 92% of the viewport during a scroll. That meant printing this page dropped
everything the reader had not scrolled past. There is now an `@media print` block
setting `[data-reveal] { opacity: 1 }` and `.person-row { break-inside: avoid }`.
Keep both when you port: these bios are the most print-and-share-worthy copy on the
site.

The `prefers-reduced-motion` block sets the same `opacity: 1`, not merely
`transition: none` — killing the transition alone can strand an element the sweep
has not reached at `opacity: 0` with no animation left to rescue it.

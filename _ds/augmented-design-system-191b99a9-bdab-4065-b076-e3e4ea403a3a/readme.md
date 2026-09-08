# AugmentED Design System

AugmentED is an R&D organization building the shared infrastructure that connects frontier AI to
education — "the missing layer" between the big AI labs' models and the apps teachers and students
actually use. It is not an ed-tech product company: it runs co-design cohorts with a small number of
partner high schools, builds reusable AI capabilities alongside them, and publishes what it learns.
AugmentED sits within AERDF (the footer links to AERDF research, partnerships and careers).

**Products represented:** one — the **marketing website**. There is no logged-in product, app, or
dashboard in the sources provided. The site has six real page templates (Home, The Challenge, Our
Approach, Who We Are, Research, Get Involved) plus two scaffolded-but-unwritten ones (Cohort page,
Project page).

## Sources

Everything here derives from a single read-only mounted folder:

- `augmented-design 2/` — a **Relume** export dated 2026-07-28. Contents used:
  - `DESIGN.md` — machine-readable tokens (colors, type scale, radii, four color schemes). Copied to `reference/DESIGN.md`.
  - `sitemap.md` — page structure, section order, scheme per section, and the real page copy. Copied to `reference/sitemap.md`.
  - `react/globals.css` — the same tokens as Tailwind v4 `@theme` custom properties. This is the ground truth for numeric values.
  - `react/@/components/ui/*.jsx` — the complete component inventory (8 primitive files; see Components).
  - `react/components/**` — 30 Relume section components across 8 page directories.
  - `logo/logo-light.png`, `images/home-hero-section-{0..5}.png`, `svgs/navbar.svg`.
  - `homepage/*.png` — reference screenshots. Four are copied to `reference/`.

- **The live site** at `augmented.folkmark.com` (Webflow) — Home, The Challenge, Our Approach, Team,
  Get Involved. **This is the authoritative source for copy.** The Relume export is an earlier
  iteration; where the two disagree, the live site wins. Notable divergences now reflected in the
  UI kit: the approach headline is "We treat AI in education as a science, not a gold rush." (not
  "We start by asking what teachers and students need."), the co-design cycle has **four** steps
  including "Test, learn, begin again.", the research section is eyebrowed "Our Thinking" with the
  heading "Recent Research", the team page has three groups (Leadership, Research Partners,
  Technology Partners), and the footer's Follow Us column lists only LinkedIn and Youtube.

No Figma file, GitHub repo, or slide deck was provided, so there are no slide templates in this system.

## Substitutions to resolve — please send files

1. **Avenir® — resolved.** Avenir LT Pro is now self-hosted in `assets/fonts/` (12 `.otf` files,
   six weights + obliques) with `@font-face` rules in `tokens/fonts.css`. The faces map onto the
   system's weights as: **300** Light, **400** Book (body copy), **500** Roman (button labels),
   **600** Medium (eyebrows, meta, footer heads), **700** Heavy (all headings), **900** Black.
2. **Icons.** The source imports a `relume-icons` React package that is not in the export. Glyphs
   here come from **Material Symbols Rounded** (whose names — `Check`, `KeyboardArrowDown`,
   `CircleFull` — match relume-icons one-for-one, so it is almost certainly the same underlying set).
   Brand/social marks come from **Simple Icons** via CDN.
3. **Photography.** Only the six wooden-block cut-outs are real assets. Every other image slot in the
   source is a Relume grey placeholder, and is rendered as such here rather than invented.

---

## CONTENT FUNDAMENTALS

**Voice: plain, declarative, slightly austere.** Sentences are short and land on a claim. There is no
hype vocabulary — no "revolutionary", "seamless", "unlock", "supercharge", no exclamation marks
anywhere in the source copy.

**"We" for the organization, "you" almost never.** AugmentED writes as a first-person-plural
institution: "We start by asking what teachers and students need." "Our work is to bridge that
chasm." "We don't yet know what students actually need to thrive in the age of AI." The reader is
addressed in the third person as *teachers*, *students*, *schools*, *the field* — not "you". The
only second-person constructions are transactional form copy ("Your email", "Tell us more",
"Share what brought you here...").

**Willing to state limits and doubt.** This is the most distinctive trait, and the live site leans on
it harder than the export did. Copy openly admits what isn't known and what fails: "Nobody knows the
right way for AI to enter the classroom." "It's a safe bet that AI can improve how people learn. But
nobody has discovered how." "Most of these capabilities don't exist yet." "We treat AI in education as
a science, not a gold rush." Never write AugmentED copy that overclaims.

**Names the adjacent players, and its own position between them.** A recurring three-beat structure:
ed tech builds the apps → the AI labs build the models → the missing layer in between is ours. It
appears on the home page, The Challenge, and Our Approach. Reuse it when explaining what AugmentED is.

**Acknowledges the opposition fairly before disagreeing.** "This instinct is understandable, but both
extremes carry real costs." "Parents and teachers are alarmed." Criticism is aimed at a situation,
never at a named party.

**Casing.** Sentence case everywhere — headings, buttons, labels, badges. Headlines end with a full
stop when they are a sentence ("Bridging frontier AI and the classroom.", "Define the role" has
none because it is a label). Eyebrows are the exception: they use Title Case ("Our Current Work",
"The Challenge", "Research", "Connect"). Nav labels are Title Case except "Get involved".

**Punctuation.** Em dashes (unspaced) and en dashes both appear, used for the pivot in a sentence:
"not as a generic replacement for instruction", "AI as cognitive extender—to work". Curly quotes and
apostrophes. Parentheticals used sparingly for hedges: "the roles AI should (and shouldn't) play".

**No emoji. Ever.** There is not a single emoji in the source, and none should be added.

**Headline shape.** Either a complete sentence stating a position ("We start by asking what teachers
and students need.") or a noun phrase naming a thing ("Findings from the field", "Two horizons").
Never a question, never a command.

**Button labels** are 2–3 words, verb-first, sentence case: "Follow our work", "Explore our
approach", "Meet the team", "Get involved", "Learn more", "Read more", "View all", "Subscribe".
The primary/secondary pair on a section is usually a commit action + an explore action.

**Meta text** is terse and factual: "4 min read", "Cross Town High", "© 2025 AugmentED. All rights
reserved."

---

## VISUAL FOUNDATIONS

**Overall vibe:** editorial, generous, quiet. Big bold geometric type on warm off-white paper, huge
whitespace, one blue accent, and almost no ornament. Nothing glows, nothing gradients, nothing
bounces. The system's confidence comes from scale and restraint.

### Color

- Three ramps only: **Neutral** (ink `#020408` → white), **St Tropaz** (blue, `#255799` is the
  accent), **Ecru White** (warm paper, `#fdfcfa` is the default page).
- **The page is never pure white.** `--surface-page` is `#fdfcfa`; cards go one step warmer-lighter
  to `#fefdfc`. Pure `#ffffff` is only used as text on dark and as the `alternate` button fill.
- **Body text is `#020408`, not black.** A near-black with a blue cast.
- The blue is used *only* for the primary button and inline accents — never as a large background
  fill on the live site, never as a heading color.
- Overlays, hairlines and glass fills are built exclusively from the **transparency ramps**
  (`--color-neutral-darkest-5/10/15/…` and `--color-white-5/10/…`). There are no separate grey
  border tokens.
- **Sections declare a scheme, not colors.** Every section carries `.scheme-1` … `.scheme-4`;
  children inherit `--color-scheme-text`, `-foreground`, `-border`, `-btn-text`. To restyle a
  section you swap one class. Never invent a fifth scheme. Note: the live homepage uses **Scheme 1
  for all nine sections** — the dark schemes exist for rhythm on inner pages, and no more than one
  or two backgrounds should appear in any single page.

### Type

- One family for everything: **Avenir LT Pro**, self-hosted. Headings 700 (Heavy), body 400 (Book).
  There is no serif, no mono, no display alternate. Weight 500 (Roman) appears only on button
  labels; 600 (Medium) on eyebrows, meta text and footer column heads.
- Tracking: **-1%** on every heading; body is untracked.
- Line height: 1.1 at h1, easing to 1.5 for all body sizes.
- The scale is aggressive at the top — **84px h1 on desktop, 48px on mobile** — and modest at the
  bottom (18px default body). Everything swaps at the single `992px` breakpoint.
- Hero and CTA type is centered and capped at `48rem`; everything else is left-aligned.
- The recurring section opener is **semibold eyebrow → bold h2 → text-medium lede**, with 48–80px
  of air before the content grid.

### Spacing & layout

- Page gutter is **5%**, not a fixed pixel value. Content container maxes at **80rem**.
- Section vertical padding steps **64 → 96 → 112px** across the three breakpoints.
- The gap below a section header is **48 → 72 → 80px**. 72px (`spacing-18`) and 120px
  (`spacing-30`) are the two custom additions to the 4px scale.
- Card grids use 32px column gaps and 48px row gaps.
- **Asymmetry is a deliberate motif.** The Our Approach section pushes its right column down by
  `mt-48` (192px) and offsets a card by `mt-[50%]`; the hero blocks are scattered at different
  widths and vertical offsets. Grids are intentionally not aligned to a common baseline.
- The navbar is `position: sticky` at the top, `min-height: 4.5rem`, and the only fixed chrome.
  The nav overlay is `100vh - navbar height`.

### Cards, borders, shadows

- **Cards are flat: 8px radius, `0px` border, no shadow at all.** There is no elevation system in
  this brand — no `box-shadow` token exists anywhere in the source. Separation is done with
  whitespace, or a **1px** divider at 15% ink / 20% white.
- Radii: **100px (full pill)** for buttons, badges and carousels; **8px** for cards and images;
  **12px** for form containers; **4px** for the checkbox — the only square-ish corner in the system.
- No protection gradients and no capsule scrims over imagery: text and imagery are kept in separate
  space instead of stacked, and the hero blocks are positioned to avoid the type rather than sit
  behind a scrim.

### Transparency & blur

- Used in exactly one place: the **secondary button and default badge**, which are a 5% ink (or 10%
  white) fill with `backdrop-filter: blur(10px)`. Nothing else is translucent. Never blur a whole
  panel or a modal backdrop.

### Imagery

- The only real illustration system is **painted maple building blocks** — arches, ramps, bridges,
  cubes — in sage green, St Tropaz blue and bare maple, shot on white and delivered as cut-outs
  with transparent surrounds. Warm, tactile, physical; the metaphor is *foundations you build with*.
- They are placed as **free-floating cut-outs at different sizes and scroll speeds** behind and
  below the hero type. Two groups move at different rates (roughly -85% and -60% of scroll);
  the back group sits at **75% opacity**. Never full-bleed, never with a drop shadow, never cropped
  into a frame.
- Photographic slots (team headshots, project cards, article thumbnails) are `aspect-square`,
  `3/2` or `3/4`, always `object-fit: cover` with the 8px image radius. Color vibe should be warm
  and naturally lit to sit on the ecru paper — not cool, not black-and-white, no grain.

### Motion

- **Everything is a 200ms `ease-in-out` property transition.** Buttons, inputs, checkboxes, selects
  all share `transition: all 200ms ease-in-out`.
- Content transitions are **opacity-only fades**: 200ms `easeInOut` for a filtered list swap, 300ms
  for the nav overlay. There is no slide-in, no scale-in, no spring, no bounce, no stagger.
- The accordion is 200ms `ease-out` on height. The chevron on an open select rotates 180° over 300ms.
- The hamburger→X is the one choreographed animation: the two outer bars collapse their width to 0
  over 100ms, then the two inner bars rotate to 135°/45° over 300ms with a 100ms delay.
- Scroll parallax on the hero is spring-damped with **zero bounce**.
- Marquee/loop keyframes exist in the token file (20–50s linear infinite) but are unused on the
  live site.

### Interaction states

- **Hover always goes darker, never lighter and never scales.** Primary: `#255799` → `#1d457a`.
  Secondary: 5% ink → 15% ink. White/alternate: white → `#d9d9d9`. Ghost: transparent → solid ink
  with white text. Links: 70% opacity. Checkbox/radio unchecked: transparent → 5% ink.
- **There is no press/active state** — no color shift, no `scale(0.97)`, nothing. Deliberate.
- **There is no visible focus ring.** Every control sets `focus-visible:outline-none` and adds
  nothing back. (Flag: this is an accessibility gap in the source. If you are building production
  code, add a focus style using `--brand-accent`.)
- Disabled is `opacity: 0.5` plus `pointer-events: none`.
- Checked states fill with **ink** (`--color-neutral-darkest`), not the blue accent.

### Iconography

- **The set:** Material Symbols Rounded, 24px default (20px inside buttons and selects), 400 weight,
  unfilled, `currentColor`. This substitutes the source's `relume-icons` package, which the export
  references but does not ship; the icon names in the source (`Check`, `ChevronRight`,
  `KeyboardArrowDown`, `KeyboardArrowUp`, `CircleFull`) are Material Symbols names, so this is a
  like-for-like swap in stroke weight and geometry. Loaded from Google Fonts in `tokens/icons.css`
  and wrapped by the `Icon` component — **do not hand-roll SVG paths.**
- **How they're used:** sparingly and structurally. `chevron_right` as the trailing glyph on every
  "Learn more"/"Read more" link button; `keyboard_arrow_down` on the select trigger; `check` in the
  checkbox, radio (`shape="check"`) and selected select row; an 8px filled circle as the radio dot.
  Icons never appear decoratively next to headings, never in a colored circle, never as a feature
  bullet.
- **Brand/social marks** (LinkedIn, X, YouTube, Instagram, Facebook, GitHub) are 24px, rendered in
  the scheme text color, and appear only in the footer, the nav overlay footer, and under team bios.
  Material Symbols has no brand marks, so these come from **Simple Icons**:
  `https://unpkg.com/simple-icons@11.14.0/icons/<slug>.svg` as an `<img>` — flagged as a
  substitution, since the original `relume-icons` logo components were not shipped either. The
  version is **pinned deliberately**: the `cdn.simpleicons.org` colour endpoint no longer serves
  `linkedin` (the mark was withdrawn from current Simple Icons releases), so all brand marks are
  served from the pinned v11 package where every slug still resolves. Glyphs arrive as flat black
  SVG; on a dark scheme invert them with `filter: brightness(0) invert(1)`, the same treatment the
  source applies to the logo.
- The only other real vector asset is `assets/logo/navbar-logo.svg`, extracted from the navbar.
- **No emoji and no unicode glyphs as icons.** Not in copy, not in UI.
- **Logo:** one lockup, one color — a lowercase wordmark `augment^ed` where the caret replaces the
  crossbar between "augment" and "ed", drawn in St Tropaz blue. `logo-light.png` is the only file
  provided; on dark schemes the source inverts it with
  `filter: brightness(0) invert(1)` (the `.logo-alt` utility). Rendered at ~168px wide in the navbar
  and footer. Never recolor, outline, or re-letter it.

---

## Index

Root manifest:

| Path | What |
|---|---|
| `styles.css` | The single entry point consumers link. `@import` lines only. |
| `tokens/` | `fonts.css`, `colors.css`, `typography.css`, `layout.css`, `icons.css`, `schemes.css`, `base.css` |
| `components/` | React primitives — see below |
| `templates/marketing-site/` | `MarketingSite.dc.html` — marketing page scaffold consumers can copy |
| `ui_kits/website/` | The marketing-site recreation (`README.md`, `index.html`, 5 JSX files) |
| `guidelines/` | 18 foundation specimen cards (Colors, Type, Spacing, Brand) |
| `assets/logo/` | `logo-light.png`, `navbar-logo.svg` |
| `assets/fonts/` | Avenir LT Pro — 12 `.otf` faces, self-hosted |
| `assets/images/` | `home-hero-0…5.png` — the six wooden-block cut-outs |
| `reference/` | Verbatim source files: `DESIGN.md`, `sitemap.md`, four homepage screenshots |
| `thumbnail.html` | Project tile |
| `SKILL.md` | Agent Skills front matter for use in Claude Code |

### Components

The inventory below **is** the source's inventory — the eight files in
`react/@/components/ui/`, one component family each. Nothing else was invented.

| Component | Group | Notes |
|---|---|---|
| `Button` | `components/actions/` | 8 variants (default, alternate, secondary, secondary-alt, link, link-alt, ghost, none) × 6 sizes |
| `Badge` | `components/display/` | default / alt / outline |
| `Input` | `components/forms/` | underline field, optional icon and prefix affix |
| `Textarea` | `components/forms/` | |
| `Select` | `components/forms/` | underline trigger + hairline popover |
| `Checkbox` | `components/forms/` | |
| `RadioGroup`, `RadioGroupItem` | `components/forms/` | dot or check indicator |
| `Label` | `components/forms/` | |

**Intentional additions** (2, both flagged):

- `Icon` (`components/foundations/`) — wrapper for Material Symbols Rounded, needed because the
  source's `relume-icons` package is absent.
- `SectionHeading` (`components/display/`) — extraction of the eyebrow + h2 + lede block that is
  repeated verbatim across ~20 of the 30 source sections.

Each component directory holds `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`, and one
`@dsCard`-tagged card HTML.

### Not built (and why)

- **Slides.** No deck or slide template was provided, so none were invented.
- **Cohort page / Project page.** Listed in `sitemap.md`, but their source sections carry only
  generic Relume lorem scaffolding — no real copy or layout to recreate.
- **Accordion.** `globals.css` defines `accordion-down`/`accordion-up` keyframes, but no accordion
  component exists in the source's `ui/` folder, so none was authored.

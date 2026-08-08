# What is unlike most websites here, and what is driving the differentiation

An analysis of the AugmentED marketing site as it stands at `b57f514`. Every number
below is read from the files that ship — `index.html`, `assets/approach.js`,
`assets/approach/manifest.json`, `tools/encode-approach.mjs`, the design-system tokens —
not estimated.

The short version: **the site makes one argument, and it makes it as a physical object
rather than as copy.** The positioning is "the missing layer between frontier AI models
and classroom apps." The object is an arch built across the gap between two school desks.
Every animated asset on the site is a view of that same object, and the engineering
underneath it is held to a standard of evidence that matches what the copy claims about
the organisation.

---

## 1. The metaphor is load-bearing, not decorative

Two school desks with a gap between them. Blocks and books fall onto the desks. A
152-piece blueprint arch draws itself across the gap in wireframe. Real wooden voussoirs
build along the blueprint. Force annotations come on. Two books are lowered onto the
keystone and the span takes the load.

That is the company's proposition, in the same order the copy states it:

| The picture | The claim |
|---|---|
| Two desks, a gap | Frontier models on one side, what students need on the other |
| The blueprint | "Define the role" — the plan before the build |
| The voussoirs | "Build the capabilities" — the missing layer |
| The completed span | "Co-design the applications" |
| The books placed on it | "Test, learn, begin again" — it is only real once it carries load |

The metaphor also carries the *secondary* claim, which is the harder one to state in
prose. An arch stands by compression: every wedge pushes against its neighbours and none
of them carries anything alone. That is the co-design argument — educators, researchers
and engineers as equal partners — expressed as structural mechanics rather than as an
adjective. A retired section still preserved in `docs/blender-anatomy.txt` said it out
loud ("a missing piece is not a detail"); the shipped site trusts the picture to say it.

Most marketing sites commission imagery that decorates a claim. This one commissioned
imagery whose *structure* is the claim, then spent the site's entire motion budget on it.

## 2. The wordmark is the same object at the smallest possible scale

`assets/logo/logo-light.png` sets **augment^ed** in St Tropaz blue, with a caret between
the two halves. The caret is the arch — a two-sided wedge spanning a gap — and it is also
a proofreader's insertion mark, which reads as *insert here*: AI inserted into education,
at the join. The alt text in the markup is written as `augment^ed`, so the caret is
treated as part of the name rather than as styling.

Whether or not both readings were intended, the practical effect is that the brand's
atom is a span across a gap, and it appears at every scale on the site: in the wordmark,
in the SVG block stacks that form the co-design cycle diagram, in the three illustration
renders (one of which is explicitly "a laptop beside a wooden arch built from the same toy
blocks as the rest of the page"), and at full size in the two scrubbed sequences.

The animation reinforces the thread deliberately: per `docs/approach-render-map.md`,
three of the thirteen blocks that fall onto the desks in Beat 2 are **exact colour-and-
shape matches to blocks from the homepage freefall hero** — the sage quarter-arch, the
blue quarter, the blue triangle. The hero and the Approach section are the same box of
blocks.

## 3. Scroll is a narration device, governed by one rule

> **Copy appears on the hold, never during the move. Nothing moves while there are words
> to read.**

That rule is stated in `docs/approach-render-map.md`, restated in
`wordpress-handoff/sections/approach.md`, and enforced in `assets/approach.js`, where
every segment travels for its first stretch (`this.moves[k]`) and is dead still for the
rest, with `chrome()` fading copy in only after the move ends.

This is the opposite of the usual scroll-jacked landing page, where copy and picture
animate simultaneously and the reader is asked to watch and read at once. For an
organisation whose product claim is about attention and thinking, a page that does not
compete with itself for attention is a substantive brand position, not a nicety.

## 4. The beats are keyed to events, and the pacing is derived rather than chosen

The six beats are frames **91, 93, 265, 565, 604, 672** — Blender frame numbers, so a
file, a timeline marker and the manifest all name the same thing. None of them is evenly
spaced, and each is justified in `tools/encode-approach.mjs`:

- **265** — `BRIDGE_v1` starts; the first solid block falls into the blueprint outline.
- **565** — the AR force-chevrons come on. Measured against the plates because the render
  map does not cover it: frame 562 is clean, 565 carries the first marks.
- **604** — the first book is placed. Frame-to-frame change spikes **25×** here, which is
  how the render map's 604–632 was confirmed against the plates.

The scroll budget is then divided among the moves **in proportion to the render frames
each covers**, so the piece plays at one rate the whole way down. The comment records why
the obvious alternative was abandoned: the beats are 68, 118, 124, 121 and 74 frames
apart, so equal spans ran the last move at twice the rate of the first, and the piece
visibly sped up beat by beat — worst exactly where the books land and there is most to
see.

The consequence is that **frame count and section height are one setting kept in two
files** (`assets/approach.css` holds the 1000vh budget). Adding the opening's 76 frames
without raising the height would have sped the whole piece up by 12%. That is written
down in three places rather than left to be rediscovered.

## 5. Two scroll-scrubbed sequences, both built by hand with no dependencies

`<falling-blocks>` (553 lines) and `<approach-scrub>` (550 lines) are vanilla custom
elements. No GSAP, no ScrollTrigger, no Lottie, no framework, no build step. Both drive
markup they do not author, so the copy is real text in the document whether or not the
script runs, and a host framework re-rendering around them has nothing of theirs to
reconcile away.

Three engineering choices in there are unusual enough to be worth naming, because they
are what keeps the sequences from being the thing that makes the page feel cheap:

**A ranked, budget-capped frame cache.** `plan()` ranks every frame by how much it is
worth holding — distance from the playhead, biased 2.5× against frames behind it because
reading is a downward act, with beats discounted to 0.15 so a hold outranks ordinary
frames without escaping the budget — then spends the byte ceiling down that ranking. The
comment records what it replaced: a fixed window with beats pinned on top and two frames
of lookbehind, under which a stated 96 MB budget actually held **190 MB**. "A ceiling that
is added to is not a ceiling."

**Two canvases cross-faded under `plus-lighter`, not one canvas blended in JS.** Drawing
both frames into one context at partial alpha squares the outgoing frame's contribution,
so everything the two frames share — here both desks, most of the picture — sags to
three-quarters opacity halfway through every transition. `isolation: isolate` on the group
is load-bearing; without it `plus-lighter` blows out against the page.

**Beats and moves encoded differently on purpose.** Beats come from lossless 16-bit PNG
plates at native size with `alphaQuality 100`, because they hold still under copy for a
screenful of scrolling. Moves come from the q90 WebP archive at reduced size with
`alphaQuality 70`, measured at 40.0 dB against 40.2 dB PSNR with a *lower* maximum error.
And the encoder notes where the bytes actually are, which is not obvious: in a move frame
the colour costs ~14 KB and the alpha channel ~24 KB, so chasing `quality` does almost
nothing — q72 to q62 moves a frame by 5%.

## 6. The phone gets a different cut of the picture, not a smaller one

Every frame ships twice. `ap####.webp` is the whole 2048×1432 plate. `ap####m.webp` is a
1147×888 crop centred on the arch — because at phone width the arch covers only a third of
the full plate, and the blueprint, the half-built arch and the loaded one become
indistinguishable. Which cut loads is read from a CSS custom property (`--arch-variant`),
so the breakpoint that sizes the band is the one that picks the file and there is no
second copy of it to drift.

**6.3 MB desktop, 4.1 MB phone, one fetched and never both.** The lazy gate opens at 1.25
viewport-heights of lead, deliberately below the 290svh hero above it — an earlier value
of 3 was satisfied at rest and meant a phone fetched 2.4 MB before the visitor scrolled a
pixel.

## 7. Every animated thing degrades to something authored, in four different directions

- **Reduced motion** — the component hides itself, and a stacked-stills layout carrying
  the same four beats and the same copy takes its place. `REDUCED` is read at module scope
  rather than in `componentDidMount`, because a preference read after mount would report
  "responsive" on the first paint and hand a reduced-motion visitor the rig.
- **Portrait or squarish desktop windows** (`min-width: 992px and max-aspect-ratio: 5/4`)
  — also the stills, because a full-width 1.43 plate hung from the top of a full-height
  stage leaves a dead band beneath it.
- **No script** — the hero's still `<img>` is in the markup; the element is 290svh tall
  only once it has marked itself `data-fb-motion="on"`, so nobody scrolls past two empty
  screens to reach the next section.
- **Missing manifest** — the still markup is what shows.

None of these is a checkbox. Each is a layout someone designed.

## 8. Build-time proof of the things nothing else can see

The frames are addressed by string concatenation, so no bundler, scanner or linter can
see them — no literal `ap0353.webp` exists anywhere in the markup. So each encoder writes
a manifest recording what it actually produced, and `tools/build-site.mjs` checks the
**full cross product — every frame in every cut — against disk**, plus every relative
reference on every emitted page, and exits non-zero.

Three ways to fail, all at build time rather than in someone's browser: the manifest is
missing, the page and the manifest disagree, or a frame the pair of them promise is not
there. The comment names the case worth knowing about — *shipping one cut without the
other is invisible on a desktop and breaks every phone.*

## 9. The palette and type are deliberately not "AI company"

| | |
|---|---|
| Page surface | `#fdfcfa` — ecru white, i.e. paper |
| Card surface | `#fefdfc`; image beds `#f6f2e8` |
| The only accent | St Tropaz `#255799` |
| Type | Avenir LT Pro, self-hosted, six graded weights (300/400/500/600/700/900) |
| Dark mode | none |

The category signal for an AI company is a dark UI, a neon gradient and a glowing orb.
This is paper, wood, school desks and a single blue used only for emphasis — step numbers
01–04, hover states, focus rings. It reads as an education institution that works on AI
rather than an AI company that sells to education, which is precisely the "augment, not
replace" positioning.

The type scale carries an argued correction worth noting as a signal of the same
editorial confidence: the delivered scale stepped mobile body copy **down** to 14px, and
`tokens/typography.css` overrides it to 16px with the reasoning in the file — a phone is
held further from the eye than a laptop, and 16px is the point below which iOS zooms a
focused input. H1 runs 48px on a phone to **84px** at 992px, which is the only breakpoint
in the whole scale.

## 10. The interaction grammar is one idea, applied consistently

Hover an item and its siblings dim to 0.45 while a gloss layer under the claim rises 4px
and fades in. That is it — and it is implemented in CSS with `:has()`, so it needs no
mount ordering and works on `:focus-visible` identically. The co-design cycle diagram uses
the same grammar: hovering a node dims the other three labels to 0.45 and brings its arc
to full opacity, and the centre panel swaps to that step's copy.

Restraint is doing real work here. Two animated sections on a five-page site; everything
else is quiet typographic layout on paper. The motion is spent where the argument is.

## 11. The repository is itself part of the brand argument

- **Nothing in `assets/` is hand-placed.** Four encoders produce every shipped byte from
  originals, each target size set from the box the image actually occupies at ~3 device
  pixels per CSS pixel.
- **The masters were stripped but not lost.** 692 MB of the original 702 MB is gone from
  the working tree and recoverable from history at a named commit (`98d0243`), so the
  Approach sequence can be re-encoded from a clean checkout without anyone's laptop.
- **`wordpress-handoff/` is a rebuild package**: per-route rendered markup, a 601-line
  build spec for the Approach section written so it can be rebuilt without reading the
  source, and an honest inventory of what transfers untouched and what has to be
  rewritten.
- **The house style requires comments to explain why a thing is the way it is and what
  breaks if it changes, and to cite measurements.** They do.

For an organisation whose stated output is "reusable infrastructure the field can build
on," a site whose two signature moments are themselves portable, documented, dependency-
free infrastructure is on-message in a way a tagline cannot be.

---

## What is actually driving the differentiation

Five things, in rough order of how much they contribute.

**1. One argument told as one object.** The proposition has a physical form, and every
asset is a view of it — wordmark, hero, scrub, diagram, illustrations, even the fallback
stills. Sites usually assemble a mood from unrelated parts. This one has a single subject
and shows it from different distances.

**2. Craft used as the credibility argument.** The copy says "we treat AI in education as
a science, not a gold rush" and promises evidence, measurement and rigour. The site
performs that claim rather than asserting it: measured frame numbers, PSNR figures behind
encoder settings, byte budgets that mean what they say, build-time proofs. Anyone who
opens the source finds the same standard the copy claims. That congruence is rare and it
is the most defensible part of the brand.

**3. Deliberate refusal of the category's visual language.** Warm paper, wood, one blue,
Avenir, no dark mode, no gradients. The differentiation is partly negative space — it
looks like nothing else in educational AI because it declines the shared vocabulary.

**4. Reading is protected.** MOVE/HOLD, copy on the hold, `text-wrap: pretty` throughout,
a 48rem measure, 44px touch targets below the breakpoint, focus rings on every control.
The organisation's subject is how people think and learn; the page behaves as though it
believes that.

**5. Portability as a brand asset.** The signature sections travel — three files and a
directory each, with the maths written down. The brand's distinctiveness is not locked to
this stack, which matters for an org whose output is meant to be reused by others.

---

## Honest gaps

Worth knowing, because they are the difference between what the site is now and what it
is arguing:

- **The human half of the story is missing.** Nine `Photography to supply` placeholders
  across Home, The Challenge and Our Approach, and 11 grey squares where headshots go.
  Right now the rendered work carries the entire visual identity — which magnifies its
  role, but means the classrooms, teachers and students the copy is about are not
  actually pictured anywhere except two stock-ish images (`classroom-morning.webp`,
  `student-notes.webp`).
- **The site is blank with JavaScript disabled** — nav, copy, footer and all. Flagged in
  the handoff as pre-existing; a server-rendered host fixes it for free.
- **All three "Recent Research" papers link to the same PDF**
  (`2026.EDM.full-papers.174.pdf`), and several primary CTAs ("Follow our work", "Learn
  more", "View all") have no destination.
- **The footer reads © 2025.**
- **Stale code from a removed section.** The CSS for `[data-kit]`, `[data-term]`,
  `[data-lift]`, `[data-piece]` and the `setBuild()` / `buildParts()` methods survive
  markup dropped in `f2875f7`. Harmless, but it is 40-odd lines describing sections that
  no longer exist.
- **Avenir is licensed.** The shipped WOFF2 are conversions of licensed originals;
  the licence needs to cover the deployment host.
- **A strong retired asset is sitting in `docs/`.** `blender-anatomy.txt` holds an
  interactive arch-anatomy diagram — hover the springers, the voussoirs, the keystone, the
  deck, the gap — that states the compression metaphor explicitly. If the metaphor ever
  needs to be *said* rather than shown, it is already written.

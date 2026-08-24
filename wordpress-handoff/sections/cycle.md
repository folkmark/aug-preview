# The cycle wheel — build spec

This document specifies the AugmentED R&D Cycle wheel on the home page: the
scroll-built ring diagram with a synced reading column. It exists because the
wheel is the one intricate page behavior written against the prototype's runtime,
so it must be **rebuilt** in WordPress rather than copied. Build from this
document and the markup in `pages/home.html`; treat the reference site as ground
truth for feel.

**Audience.** The developer rebuilding the home page. Read
[the handoff README](../README.md) first for the shared context; read the source
comments in `index.html` (search for `cycleBuild`) if a number here needs its
derivation.

**Where the numbers come from.** Every value here is read from the shipping
files — the markup and CSS in `index.html` and the component script at its
foot — not estimated.

---

## 1. What the section is

Two presentations of the same four steps, switched at 992 px:

- **Desktop (≥ 992 px):** a pinned two-column stage. The left column is the
  wheel: four icon nodes on a ring, four connecting arcs, and a hub caption. The
  right column is a reading column of four expandable rows. The visitor's scroll
  builds the ring: each arc draws out of the previous step's node, the next node
  settles in, and the last arc closes the loop back into step 1. The reading
  column walks in lockstep — while arc *i* draws, row *i* is open.
- **Mobile (≤ 991 px):** a plain accordion. No pin, no ring, no scroll
  choreography. Tapping a row opens it.

Interaction rules, and each is deliberate:

- **A click travels; a focus does not.** Clicking a node or a row scrolls the
  page to that step's own beat of the pinned run, because on desktop the scroll
  *is* the clock. Keyboard focus has no scroll of its own, so focusing a node
  opens its step in place instead.
- **Hover only scales the icon.** Pointing at a node is not a request to read it.
- **The build latches.** Once the ring has drawn completely, scrolling back up
  does not un-draw it. The latch resets only when the visitor navigates to
  another page.
- **The wheel is named from the first beat.** The hub caption ("AugmentED R&D
  Cycle") fades in immediately, so the reader always knows what they are looking
  at. Only its closing line ("Each turn of the cycle informs the next.") waits
  for the loop to close.

### The four steps

Fixed count; the copy is editable, the geometry is not.

| # | Title | Icon |
|---|---|---|
| 01 | Define the role | `assets/approach/cyc01_role_0001.webp` |
| 02 | Build the capabilities | `assets/approach/cyc02_capabilities_0001.webp` |
| 03 | Co-design the tools | `assets/approach/cyc03_applications_0002.webp` |
| 04 | Test, learn, begin again. | `assets/approach/cyc04_test_0001.webp` |

The icons are 320 px squares with alpha, sitting directly on the page color with
no disc behind them. Each step also carries one body paragraph; take the current
text from `index.html` or the reference site.

---

## 2. The markup contract

The desktop and mobile arms are **separate markup**, toggled by the page's
`.at-desktop` / `.at-mobile` utility classes at 992 px. The step titles and body
paragraphs are therefore duplicated in the source. In WordPress, render both arms
from one content source so they cannot drift.

### Desktop arm

```
[data-diagram]                       max-width: 70rem, centered
└─ .at-desktop [data-cycle-rig]      height: 260vh — the scroll budget
   └─ (sticky stage)                 position: sticky; top: 4.5rem;
      │                              height: calc(100svh − 4.5rem); centers its child
      └─ [data-cycle] [data-active=N] [data-sel=N]
         │                           two-column grid: 1.04fr / 0.96fr
         ├─ [data-diagram-slot]      max-width: 33rem; aspect-ratio: 1/1;
         │  │                        container-type: inline-size
         │  ├─ <svg viewBox="0 0 780 780">   aria-hidden, overflow: visible
         │  │  └─ [data-arc="0..3"]  each: an arc <path> (r=250,
         │  │                        pathLength="100", stroke-dasharray="100",
         │  │                        stroke-dashoffset="100") + an arrowhead
         │  │                        <polygon> at opacity 0
         │  ├─ <button data-node="0..3">     one per step, aria-label
         │  │                        "Step 01, Define the role" etc.; width 18.5%
         │  │                        of the slot; positioned at 12/3/6/9 o'clock
         │  │                        (left/top: 50%/17.95%, 82.05%/50%,
         │  │                        50%/82.05%, 17.95%/50%); icon <img> at 86%
         │  └─ [data-hub]            centered, width 38%, pointer-events: none;
         │     └─ <h3> + rule + [data-hub-line]
         └─ (reading column)
            └─ 4 × row:
               ├─ <button data-rl="0..3">    number <span data-num> + title
               └─ [data-body="0..3"]         collapsible body paragraph
```

### Mobile arm

`.at-mobile [data-cycle] [data-sel=N]`: four rows, each a `<button data-rl>`
(icon at 2.75 rem, number, title; `min-height: 2.75rem` for a 44 px touch
target) followed by its `[data-body]`. A helper line closes the list: "Tap a
step to read more. Each turn of the cycle informs the next."

### State attributes

The script writes the active step *N* into two attributes on the `[data-cycle]`
root, and the CSS derives everything visual from them:

| Attribute | Drives |
|---|---|
| `data-sel` | The open row, the scaled node, the accented number. |
| `data-active` | The fully lit arc. |

Both carry the same value in practice. Keep both: the CSS selectors depend on
them separately.

---

## 3. The clock

One scalar drives the whole desktop presentation.

### Progress

```
span = rigHeight − stageHeight            // 260vh − (100svh − 4.5rem) of travel
p    = clamp01((72 − rig.top) / span)     // rig.top from getBoundingClientRect()
```

> **Warning: the literal 72 is the sticky offset in pixels (4.5 rem).** It
> appears in the progress formula and again in the click-travel formula, and it
> must equal the stage's `top`. If the theme's header height differs, change all
> three together — or better, read the offset from the stage's computed `top` the
> way the packaged components do.

### The build value, and the latch

```
if (p > 0.97) done = true                 // reset only on page navigation
b = (reducedMotion || done) ? 1 : p
```

The latch threshold is 0.97, not a rounder number, and the choice is measured:

- Arc *i* draws over the window `[i·0.25 + 0.05, i·0.25 + 0.22]`, so arc 3
  finishes at exactly 0.97. The latch must land on or after that.
- Latching at 0.93 was tried and measured: a jump of 25.8 dash-offset units in
  one 9 px scroll step at 1440×900 — a quarter of the final arc and its
  arrowhead appearing at once. Unlike every other change in this section it is
  not eased, because `stroke-dashoffset` deliberately carries no CSS transition.

Clear the latch **only on page navigation**, never on step change: the
step-change path runs on every scroll tick, and clearing there un-builds the
ring while the visitor watches.

### The beat windows

The pinned travel splits into four equal beats. Everything below is a
`seg(a, c)` = `clamp01((b − a) / (c − a))` over windows of `b`:

| Element | Window | Behavior |
|---|---|---|
| Arc *i* path | `[i·0.25 + 0.05, i·0.25 + 0.22]` | `stroke-dashoffset = 100 × (1 − seg)` |
| Arc *i* arrowhead | `[i·0.25 + 0.19, i·0.25 + 0.22]` | opacity 0 → 1 |
| Node 0 | `[0, 0.04]` | opacity rises with the build |
| Node *i* (*i* ≥ 1) | `[(i−1)·0.25 + 0.2, i·0.25]` | settles in as the previous beat ends |
| Hub caption | `[0, 0.05]` | named from the first beat |
| Hub closing line | `[0.92, 1]` | opacity 0 → 0.7; waits for the loop to close |

A node is interactive only once drawn: below 0.9 of its own growth it is
`disabled` with `pointer-events: none`, so an undrawn node is never an
invisible hover target.
Node opacity is `growth × (selected ? 1 : 0.42)`.

### Selection

The scroll sets the open step from the same clock:

```
sel = min(3, floor(p / 0.25))
```

so beat *i* is when row *i* is open **and** arc *i* is drawing — the ring's
growth and the reading column walk in lockstep. The visitor's own pointer
outranks the clock while the page is still: a click or focus overrides `sel`,
and the override holds until the next scroll movement, when the scroll-derived
step reasserts itself. (A click that travels scrolls the page *to* the chosen
step's beat, so the clock and the choice agree when the travel lands.)

### Repaint discipline

The build runs on every scroll and resize tick, so it caches:

- Geometry (arcs, heads, hub) repaints only when `b` changes.
- Selection styling repaints only when `sel + "|" + b` changes.

Reproduce the two caches, or an equivalent, in a rebuild; the handler is on the
scroll path.

---

## 4. Traveling to a step

Clicking node *i* or row *i* scrolls the page to that step's own beat:

```
target = rigTopAbsolute − 72 + (i·0.25 + 0.125) × span
```

Mid-beat (`+ 0.125`), where the stage is unambiguously the active one — not the
beat boundary, where two steps contest it. The travel eases with
`smoothstep` over 520 ms via `requestAnimationFrame`; a new click cancels the
previous travel; under reduced motion it jumps with `scrollTo` instead.

If the rig is hidden (`offsetParent === null` — the mobile arm is showing), a
click selects in place, because the mobile arm has no pinned run to travel.

Keyboard focus on a node calls `focus({ preventScroll: true })` and selects in
place.

---

## 5. The CSS mechanics

The wheel's stylesheet lives in the page head (search `[data-cycle]` in
`index.html`); port it with the markup. The parts that look incidental and are
not:

- **Arcs** are `color: var(--brand-accent)` at opacity 0.55; the
  `data-active` arc is 1. Drawing uses `pathLength="100"` on each path so the
  script's dash-offset math is unit-free — keep that attribute.
- **The open row's number** takes the accent color, matching its lit arc.
- **Rows** sit at opacity 0.45, 1 on hover and while selected.
- **Bodies** are a `max-height` accordion: 0 → 26 rem on desktop (40 rem on
  mobile), opening at 420 ms ease-out with a 200 ms delay, the paragraph fading
  in at 260 ms with a 340 ms delay — close-then-open reads as one motion, not
  two fighting.
- **`@media (prefers-reduced-motion: reduce)`** switches every transition in
  the block off. Combined with `b = 1`, a reduced-motion visitor gets the
  finished ring and instant accordion moves.
- **Focus** is visible: 2 px accent outline, offset 3 px, on nodes and rows.

---

## 6. Accessibility

- Nodes and rows are real `<button>` elements. Nodes carry
  `aria-label="Step 01, Define the role"` (etc.); undrawn nodes are `disabled`.
- The SVG is `aria-hidden`; the reading column is the accessible content, real
  text in the document whether or not any script runs.
- The hub is `pointer-events: none` so it never masks the nodes.
- Mobile touch targets are ≥ 44 px (`min-height: 2.75rem`).
- Focus is keyboard-reachable in reading order, with a visible focus style, and
  focusing never scrolls the page out from under the user.

---

## 7. Rebuilding it in WordPress

The prototype implements the wheel inside its page runtime; none of that code
ports. The clean rebuild is a fourth custom element in the pattern of the three
packaged components — markup authored in the template, element drives it, no
framework — or a small plain-JS module. Either way:

1. Render both arms (desktop and mobile) from one content source: four steps of
   number, title, body, icon.
2. Emit the markup contract in section 2, including `pathLength="100"` on the
   arc paths and the two state attributes on the root.
3. Implement the clock in section 3 against native scroll position, with the
   latch and the two repaint caches.
4. Implement click travel and focus-in-place per section 4, honoring reduced
   motion.
5. Port the CSS block per section 5.
6. Derive the sticky offset from the theme header once, and use it in the
   stage's `top`, the progress formula, and the travel formula.

### Verification

A five-minute smoke test at 1440×900, plus the checks the page cannot show you:

1. Scroll the section through: arcs draw tip-to-tail, each node settles in as
   its beat arrives, the hub line appears only at the close.
2. Scroll back to the top after completing it once: the ring stays complete.
3. From above the section, click step 3: the page travels down, row 3 is open,
   arc 3 is lit, and the picture is not mid-transition.
4. Tab to a node: its step opens without the page moving.
5. Resize below 992 px: the accordion shows, rows open on tap, no pinned run.
6. Enable reduced motion: the ring renders complete immediately, clicks jump
   without animation, and no transition runs.
7. Confirm the scroll handler is not doing layout work when neither `b` nor the
   selection changed.

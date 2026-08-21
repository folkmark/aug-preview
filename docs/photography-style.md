# Photography style

The site ships three photographs that were not bought and not generated: they were taken
on somebody's phone at the co-design workshops, at Museum High, High Tech High and
Crosstown. Everything else photographic on the page is either a placeholder or an AI still
that does not match them. This describes what the real three actually look like, so the
replacements can be made to look like the same job rather than like a stock library.

## The references

| master | pixels | ships as | where |
|---|---|---|---|
| `schools/museum-high-workshop.jpg` | 4000x3000 | `images/museum-high-workshop.webp` | Our Current Work, card 1 |
| `schools/high-tech-high-workshop.jpg` | 4032x3024 | `images/high-tech-high-workshop.webp` | Our Current Work, card 2 |
| `schools/crosstown-workshop.jpg` | 5712x4284 | `images/crosstown-workshop.webp` | Our Current Work, card 3 |
| `schools/museum-high-standing.jpg` | 3024x4032 | — | unused, portrait |

All four are 4:3 or 3:4 at main-camera resolutions — 12 MP, 12 MP, 24 MP, 12 MP. EXIF was
stripped somewhere between the phone and the repository, so the frame size is the only
technical evidence left, and it is enough: these are handheld phone frames, no flash, at
whatever focal length the phone opens at. `tools/encode-images.mjs` crops each to exactly
3:2 and encodes at 1080 px wide.

## What they have in common

Ten things, and a generated frame has to hit most of them or it reads as an intruder next
to the other two in the same three-up row.

1. **Nobody is aware of the camera.** Not one face is turned toward it in any of the four
   frames. People are in profile, three-quarters away, or fully backs-of-heads. There is no
   subject, no hero, no eye contact — the photographer is a participant who lifted a phone,
   not a photographer the room was arranged for.

2. **The camera is inside the room, not observing it.** Crosstown is shot over the
   shoulders of two seated people whose heads are cut off by the bottom edge; High Tech
   High is shot from inside the standing huddle with a person's back filling the left third
   and another head clipped at the bottom right. Foreground bodies and furniture crossing
   the frame edge is the single most recognisable thing about this set.

3. **Phone geometry, phone depth of field.** Wide enough to take in a whole room from
   inside it, everything from the foreground table to the far whiteboard acceptably sharp.
   No shallow-focus separation, no bokeh, no subject isolation.

4. **Available light, left uncorrected.** Museum High mixes grey window light behind a
   half-drawn roller blind with warm overhead track lights and does not resolve the
   conflict. Crosstown is shot straight into a wall of north-facing industrial glazing:
   the sky clips, the interior sits a stop under, the near faces are in shade. Highlights
   blow, shadows carry noise, the tone curve is the phone's. That imperfection is the
   signal that it is real.

5. **The work on the wall is the subject.** Every frame has a dense sticky-note grid,
   butcher paper with hand-lettered headings ("Constituent Sums / Linkages", "THE
   PROBLEM"), storyboard sketches on a whiteboard, printed project cards, or a screen
   showing an actual working UI. Somebody is always facing that, which is why nobody is
   facing the camera.

6. **Adults.** These are teacher and researcher co-design sessions. A wide age range,
   hoodies, fair-isle sweaters, ball caps, jeans, sneakers, a college crewneck. No blazers,
   no styling, nobody who looks cast.

7. **Real rooms, not cleaned ones.** Coats over chair backs, a hi-vis jacket dumped on a
   seat, backpacks on the floor, water bottles and thermoses, kraft coffee cups, a rolled
   poster tube, a tissue box, trailing cables, rolling chairs shoved out of line. Nothing
   has been tidied for the frame.

8. **Institutional finishes, muted palette.** Sage and cream walls, speckled terrazzo or
   dark grey carpet, black laminate table tops on pale wood legs, drop ceilings, roller
   blinds, wall-mounted TVs. The only saturated colour in any of the frames is the sticky
   notes — orange, pink, green, blue — and they are always the brightest thing present.

9. **Overcast winter daylight.** Bare trees through the Crosstown glazing, cool grey light
   through the Museum High blind. Nothing is golden hour; nothing is warm-graded.

10. **No composition.** Horizons are slightly off, the framing is whatever the room
    allowed, subjects sit anywhere in the frame. Deliberate composition is itself a tell.

## What the current AI stills get wrong

Two encoded stills came from somewhere else, and both fail the list above in ways worth
naming, because they are the failure modes a generator will drift back to on its own.

- **`images/classroom-morning.webp`** — an empty period classroom, symmetric one-point
  perspective, volumetric light shafts through dusty air, warm-and-teal grade, not a person
  in it. Cinematic, nostalgic, and about a building rather than about work. It is also
  **referenced by nothing**: `index.html` never loads it, and the only mention left in the
  repository is its job in `tools/encode-images.mjs`. Delete it or retire the job.

- **`images/student-notes.webp`** (still live, section 01) — much closer. Over-the-shoulder
  framing, no eye contact, real clutter. The tells are shallow depth of field with creamy
  background bokeh, a picture-perfect panelled library, a warm golden grade, a tidy
  diagonal composition, and a laptop screen rendering plausible-looking nonsense. It reads
  bought, not taken.

## Still to fill

Six placeholders, all `<div role="img">` blocks in `index.html` with the intent in the
`aria-label`. Five are 3:2; the last is 3:1, which matters — it cannot be cropped out of a
3:2 frame without throwing away half the picture.

| line | box | intent |
|---|---|---|
| 945 | 3:2 | (unspecified) beside "Nobody knows the right way for AI to enter the classroom" |
| 962 | 3:2 | a researcher and engineer reviewing a prototype |
| 968 | 3:2 | a teacher working alongside two students |
| 1029 | 3:2 | an engineer and a teacher reviewing a tool together |
| 1045 | 3:2 | four students working on a group project |
| 1084 | **3:1** | educators and a researcher in a co-design workshop |

## Generating replacements with Higgsfield

**Model.** Pass the real photographs in as `image_references` rather than describing them
— `nano_banana_pro` and `seedream_v4_5` both take multiple references, `soul_2` takes one
and is tuned for exactly this UGC-realism register. Do not use `soul_cinematic`,
`soul_cinema_1_5` or `cinematic_studio_2_5`: cinema-grade lighting is precisely the
`classroom-morning` failure, and those models will produce it whatever the prompt says.

**Aspect and size.** Generate 4:3 and let the encoder take the 3:2, which is what happened
to the real frames and leaves crop latitude for the same reason. The 3:1 banner needs 21:9
generation cropped down. 2k is plenty of pixels — the widest box on the site ships at
1264 px.

**Base style block** — paste ahead of every subject line:

> Candid documentary photograph, shot handheld on a phone by a participant standing inside
> the room. Nobody looks at the camera; faces are in profile, three-quarters away or turned
> fully away. Wide phone lens, deep focus, everything sharp from foreground to back wall,
> no bokeh. Available light only, mixed daylight through windows and warm overhead
> fluorescents, no flash, blown window highlights, noise in the shadows, unedited phone
> colour. A person's back or a chair crosses the foreground and is cut by the frame edge.
> Ordinary US school or office meeting room: sage and cream walls, speckled terrazzo or
> grey carpet, black laminate tables, drop ceiling, roller blinds. Dense grids of orange,
> pink, green and blue sticky notes on butcher paper are the only saturated colour.
> Everyday clothing — hoodies, sweaters, jeans, sneakers. Coats over chairs, backpacks on
> the floor, water bottles and coffee cups, cables, chairs out of line. Overcast winter
> daylight. Casual, uncomposed framing, slightly tilted.

**Never** — the drift list: eye contact, smiling at the camera, posed groups, shallow depth
of field, golden hour, volumetric light shafts, teal-and-orange grade, lens flare, empty
tidy rooms, business attire, brand-new furniture, symmetric composition, professional
studio lighting, legible generated text on whiteboards or screens.

**Subject lines**, one per placeholder — append to the block above:

- **945** — Four educators standing at a whiteboard mid-discussion, one mid-gesture with a
  marker, seen past a colleague's shoulder in the foreground.
- **962** — Two adults side by side at a desk, one pointing at a laptop screen, the other
  leaning in with a hand at their chin, seen from behind and to one side.
- **968** — A teacher crouched beside a worktable talking to two seated students, all three
  turned toward a laptop, photographed from the back of the room over other students' heads.
- **1029** — Two adults shoulder to shoulder over an open laptop at a cluttered table, one
  scrolling, both in profile, sticky-note wall behind them out of focus depth.
- **1045** — Four students around a round table mid-task, heads down over notebooks and a
  shared laptop, photographed from behind so no face is toward the camera.
- **1084** — Wide banner: a full room of adults at scattered worktables, two facilitators
  at a sticky-note wall on the right, the near foreground cut by a chair back and a
  half-visible seated figure.

**Faces.** The real set has no student in it, and the two placeholders that ask for students
are the risky ones: generated minors sitting in a row next to three real photographs of real
adults is both a credibility problem and a consent-adjacent one. The style solves it — every
framing above puts faces away from the camera, so favour backs of heads, hands and over-the-
shoulder angles and let the work on the table carry the picture.

## Landing a generated frame

Same path as the real ones. Drop the master into `source-material/image-sources/images/`,
add a job to `JOBS` in `tools/encode-images.mjs` with the crop box measured against that
master and `width: 1080` for a card or `1264` for a full-width box, run
`npm i --no-save sharp && node tools/encode-images.mjs`, then replace the `<div role="img">`
placeholder in `index.html` with an `<img>` carrying real alt text. The encoder's comments
explain why the crop is set per-image rather than left to `object-fit`.

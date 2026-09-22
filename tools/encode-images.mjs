// Re-encodes the page's photographic and decorative art from the originals in
// source-material/image-sources into the sized WebP the site actually ships. Sharp is not
// a repo dependency and CI never runs this — the encoded files are committed:
//
//   npm i --no-save sharp && node tools/encode-images.mjs
//
// The originals were dropped in as received: PNGs of soft-shaded 3D renders, 24-bit for
// the photography, 48-bit for the three illustration plates and 32-bit for the four cycle
// plates beside them, and headshots ranging from a 300-DPI print export down to a 190px
// thumbnail. Every target below is set from the box the image actually occupies, at
// roughly three device pixels per CSS pixel, which is what a phone
// at DPR 3 can resolve and no more. The approach frames have their own encoder,
// tools/encode-approach.mjs.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Every source this reads is committed under source-material/image-sources — see that
// directory's README — so the whole run works from a clean checkout with nothing
// restored. The icons used to sit apart, under assets/icons-rigtest, which meant their
// lossless plates were copied into the published site by tools/build-site.mjs and served
// to nobody: assets/ ships wholesale, and no page has ever referenced a source plate.
// A job whose source is absent is still skipped rather than killing the run, so a
// half-populated tree re-encodes what it can.
const SRC = path.join(root, 'source-material/image-sources');
const OUT = path.join(root, 'assets');

// Imported here rather than at the top so the missing-source message below wins: sharp
// is not a repo dependency, and a bare ERR_MODULE_NOT_FOUND is a worse first thing to
// read than which directory the encoder could not find.
const sharp = await import('sharp').then((m) => m.default).catch(() => {
  console.error('sharp is not installed. Run:\n\n  npm i --no-save sharp\n');
  process.exit(1);
});

// width: the target in real pixels. The comment on each is the box it renders into.
const JOBS = [
  // Full-width photography in a 3/2 box, sized for ~640 CSS px on desktop.
  //
  // NEITHER OF THESE IS ON THE SITE. Nothing references them — not index.html, not
  // assets/*.js, not support.js, not the design system, not the built _site — and
  // assets/ ships wholesale, so the two of them are 164 KB published and served to
  // nobody. That is the same failure the icons note above describes, in a different
  // directory. Checked with grep across every referencing file type, September 2026.
  //
  // They are kept and graded rather than dropped because dropping them is a content
  // decision and not this file's to take: both are strong editorial frames, and if one
  // is ever placed it should already match the rest. Whoever settles it either wires
  // them into a page or deletes these two jobs and the two masters with them.
  //
  // They are also the low-key end of the set and are meant to be: classroom-morning is a
  // dawn classroom at mean luminance 59, student-notes a library at 93, against a stock
  // set that averages ~145. Neither is brightened — see THE GRADE above. classroom-morning
  // takes the white-point lift only (it was inside the warmth band at +18 already), and
  // student-notes, the warmest frame after student-notebook at +30, is cooled to +18 by
  // pulling red down rather than lifting blue.
  { in: 'images/classroom-morning.png', out: 'images/classroom-morning.webp', width: 1264, grade: [1.048, 1.048, 1.048] },
  { in: 'images/student-notes.png',     out: 'images/student-notes.webp',     width: 1264, grade: [0.889, 1, 1] },

  // The seven portrait photographs on The Challenge and Our Approach, in a 4/5 box, two
  // tiers each.
  //
  // All seven are licensed Shutterstock photography, read straight from the full-resolution
  // originals in stock-photos-aug/large/ and cropped by the box on each job.
  //
  // Two of them were generated frames until September 2026: they arrived in the build
  // hotlinked to a generation CDN under a user-scoped path, at 1856x2304 and 6.4-9.2 MB
  // apiece, and that bucket is not a home for production images, so their masters were
  // committed here rather than fetched. Those masters now sit in image-sources/unused/
  // beside the superseded hero frames. Nothing in this set is generated or hotlinked any
  // more, and the whole row can be re-framed from originals.
  //
  // Reading the stock frames from the original rather than from a cropped master is
  // deliberate and worth keeping. The crop box is then reviewable data — you can see what
  // was kept and move it — instead of a decision baked into a PNG nobody can undo, the
  // 1264 tier is resampled once from 2767-5104 px of real detail rather than twice through
  // an 1856 px intermediate, and the file the licence is traceable through stays the file
  // the encoder reads. The filenames stay as the Shutterstock asset IDs for that last
  // reason; `out` is where the descriptive name lives.
  //
  // Every box below is exactly 1856:2304 against its own source, measured, so the page's
  // own `object-fit: cover` is left with nothing to take — same rule as the school shots
  // further down. An extract that runs past the edge throws rather than clamping, so
  // re-measure against the source if you move one.
  //
  // Two of the seven are landscape, and there the horizontal placement is the whole job: a
  // 3/2 original keeps 54% of its width in a 4/5 box, so a centred crop is a coin toss on
  // who survives it. The other five are portrait and width-limited, so the box spans the
  // full width and the only choice is where the vertical slack goes. Each of those was
  // picked off a three-placement contact sheet — top 0, half the slack, all of it —
  // rendered side by side and looked at, because the difference between them is a
  // compositional judgement and not a number. Every box below is set on the people the
  // caption is about.
  //
  // The box is worth measuring rather than assuming, because it does not break where the
  // rest of the site does. The row is a `repeat(auto-fit, minmax(min(20rem,100%),1fr))`
  // grid inside `--container-xxl` with an `--space-20` gap, so two tracks need
  // 2x320 + 80 = 720px of content against a 90vw container: it splits at exactly 800px of
  // viewport, not at the design system's 992. Measured in Chromium: 288px at 320,
  // 351 at 390, 719 at 799 — the widest the box ever gets, one pixel before the split —
  // then 320 at 800, 406 at 992, and a flat 600 from 1422 up, where the container caps.
  //
  // 1264 is 2.1x the 600px desktop box, and above the 1053 a 390px phone at DPR 3 asks
  // for. (It is also what the two unreferenced 3/2 frames above ship at, but they are not
  // in this grid and never were — do not read that as corroboration.) 800 is the
  // smallest round width that still covers every DPR-1 viewport including the 719px peak,
  // and a 430px phone at DPR 2 (774).
  //
  // Be clear about what the second tier does and does not buy. Phone-at-3x wants 1053-1161
  // and desktop-at-2x wants 1200, so those two demands have converged on this box and a
  // DPR-3 phone fetches the 1264 file either way. What 800 serves is DPR-1 desktops — most
  // desktops — and DPR-2 phones, at about 40% of the bytes. A phone-specific third tier
  // would need a third artifact each and save little; there is no room for it between 800
  // and 1264.
  //
  // --------------------------------------------------------------------------------
  // THE GRADE. This applies to all twelve photographs this encoder writes into
  // assets/images/, not only the seven in this block, so it is written out once here.
  // --------------------------------------------------------------------------------
  //
  // The twelve come from four places — two editorial stock frames, seven Shutterstock
  // selects, three phone snapshots from school visits — and they did not agree on white
  // balance. Measured over each one's shipped crop, mean(R) - mean(B) ran -17 to +37,
  // which is four visibly different renderings of white in one set. `grade` is the fix: a
  // per-channel multiplier, [r, g, b], applied after the crop.
  //
  // Two axes, and the difference between them is the whole design:
  //
  //   WHITE POINT. Lift each frame until its p99.8 luminance reaches 250, the set median.
  //   Lift only, never cut: a clipped highlight has no detail left to recover, so scaling
  //   a whole frame down to move a pixel that is already at 255 is a cost with no benefit.
  //   Capped at +8%.
  //
  //   WARMTH. Target R-B = +17, the set median, with a +-8 deadzone — a frame already
  //   inside +9..+25 is not touched at all. Outside it, correct toward the target, capped
  //   at a 12-point shift, so a frame that is an outlier for a reason lands closer without
  //   being forced onto the number.
  //
  // MEAN LUMINANCE IS NOT A TARGET, and this is the decision most likely to be "fixed" by
  // someone later. It runs 59 to 163 across the twelve and that spread is content, not
  // exposure: classroom-morning measures 59 because it is a dawn classroom deliberately
  // dark, student-notes 93 because it is a library at a warm low key. They are the two
  // best photographs on the site and normalising them to the stock set's ~145 would
  // destroy both. What a viewer reads as "the same light" is where the white point sits,
  // not where the average sits, which is why the axis above is p99.8 and not the mean.
  //
  // Three implementation details that are load-bearing:
  //
  //   The warmth correction ONLY EVER ATTENUATES A CHANNEL, never lifts one — cooling
  //   pulls red down, warming pulls blue down. Solving it the obvious way instead, by
  //   lifting the deficient channel to hold luminance, took student-notebook from 1.5% to
  //   21.9% of the frame with a clipped channel and crosstown-workshop to 99.8%.
  //   Attenuation cannot clip. The small luminance it costs is what the white-point lift
  //   is already paying for.
  //
  //   The white point is applied first and band membership is judged after it, because a
  //   gain scales R-B along with everything else. museum-high-workshop needed no warmth
  //   correction and still came out +23 -> +25 for exactly that reason.
  //
  //   Every multiplier below was solved numerically against this pipeline — iterated
  //   until the measured R-B landed on target — not derived algebraically, because
  //   clipping makes the algebra approximate.
  //
  // Both tiers of a pair must carry the identical grade: an 800 and a 1264 graded
  // differently is a colour shift the moment srcset switches, at a viewport width nobody
  // tests at. That used to be a warning here and is now checked — see the pair guard
  // below the job list.
  //
  // tint() colourises towards a hue and modulate() moves saturation wholesale; both do
  // more than is wanted. Measured on the encoded files after this pass, no frame's
  // saturation moved more than 1.7 points. Four frames gained clipping, all of them by
  // under one percentage point and all four from the white-point lift rather than the
  // warmth step — that is the lift doing its job, pushing the brightest content to white.
  // For scale, test-in-classrooms ships 12% clipped untouched.
  //
  // Keep the removeAlpha() in the non-alpha branch of the runner below. sharp carries a
  // source's alpha channel through regardless of the webp options, and the two masters this
  // set used to read from — build-capabilities.png, and codesign-tools' first original —
  // both arrived RGBA with every alpha sample at 255, so without it they shipped a plane
  // describing nothing. Neither is on the list any more and no current source is RGBA,
  // which is the reason to keep the guard rather than to drop it: the next master dropped
  // into this directory is one export setting away from putting it back, and nothing else
  // would tell you.

  // Two students writing by hand, for the row about the skills built without AI. 9504x6336;
  // the box holds both of them and the paper, and drops the empty desks to the left.
  // The warmest frame in the set at +37, and the only one the 12-point cap binds on from
  // above: cooled to +25, the top of the band, rather than all the way to +17. Its golden
  // late-afternoon light is the reason the frame was picked and taking it to the median
  // would have been correcting the photograph rather than matching the set.
  { in: 'stock-photos-aug/large/shutterstock_2763377205.jpg', out: 'images/student-notebook.webp',   width: 1264, crop: [2661, 0, 5104, 6336], grade: [0.933, 1, 1] },
  { in: 'stock-photos-aug/large/shutterstock_2763377205.jpg', out: 'images/student-notebook-m.webp', width: 800,  crop: [2661, 0, 5104, 6336], grade: [0.933, 1, 1] },

  // Two engineers at adjacent desks, one of them reading code off the monitor in front of
  // him, for the row about the layer in between. 3333x5000 and portrait, so the box is the
  // full width and all 862px of the vertical slack goes above it. Bottom-anchored fills the
  // frame with the two of them and keeps the code on screen legible; anchoring at the top
  // instead cedes a third of the box to a flat curtain and drops the saturation to 13.
  // Measured +18 on mean(R) - mean(B) as it stands, inside the set's band, so no grade.
  { in: 'stock-photos-aug/large/shutterstock_2176735867.jpg', out: 'images/engineers-screens.webp',   width: 1264, crop: [0, 862, 3333, 4138] },
  { in: 'stock-photos-aug/large/shutterstock_2176735867.jpg', out: 'images/engineers-screens-m.webp', width: 800,  crop: [0, 862, 3333, 4138] },

  // A teacher leaning in over one student's textbook with another beside her, for the row
  // about what the backlash would cost. 5153x3435; the box is set to keep the teacher whole
  // — she is at the right edge of the frame — and both students with her.
  { in: 'stock-photos-aug/large/shutterstock_1136122199.jpg', out: 'images/teacher-two-students.webp',   width: 1264, crop: [928, 0, 2767, 3435] },
  { in: 'stock-photos-aug/large/shutterstock_1136122199.jpg', out: 'images/teacher-two-students-m.webp', width: 800,  crop: [928, 0, 2767, 3435] },

  // Colleagues working a wall of sticky notes, for Define the role. 8869x5913; the box is
  // on the man writing and the notes under his hand, keeping two of the group behind him.
  { in: 'stock-photos-aug/large/shutterstock_2670025731.jpg', out: 'images/define-the-role.webp',   width: 1264, crop: [2483, 0, 4763, 5913] },
  { in: 'stock-photos-aug/large/shutterstock_2670025731.jpg', out: 'images/define-the-role-m.webp', width: 800,  crop: [2483, 0, 4763, 5913] },

  // Someone leaning in to point at a laptop for three colleagues round it, a chalkboard
  // behind them, for Build the capabilities. 4480x6720; the box takes the middle of the
  // 1159px of slack rather than either end — anchored at the top it carries a band of empty
  // cream wall above the board, and at the bottom it trades that for foreground table
  // clutter. The coolest Shutterstock frame in the set at +5, and its white point sat low
  // at 239, so it takes both axes: +4.5% of lift and blue down to land +17. Measured on
  // the encoded file, luminance 140 -> 145, saturation 21 -> 22, clipping 0.0% -> 0.1%.
  { in: 'stock-photos-aug/large/shutterstock_2354739045.jpg', out: 'images/build-capabilities.webp',   width: 1264, crop: [0, 580, 4480, 5561], grade: [1.045, 1.045, 0.961] },
  { in: 'stock-photos-aug/large/shutterstock_2354739045.jpg', out: 'images/build-capabilities-m.webp', width: 800,  crop: [0, 580, 4480, 5561], grade: [1.045, 1.045, 0.961] },

  // Five colleagues behind a glass wall of sticky notes, adding to it from the far side, for
  // Co-design the tools. 4144x5588, bottom-anchored on all 444px of slack, which is
  // ceiling lighting grid and worth nothing.
  //
  // This shares its setting with Define the role two cards up, knowingly — it was picked
  // that way. The two boxes are therefore deliberately unalike: 01 is tight on one man
  // writing, this is the wide group seen through the glass, and the alt text in index.html
  // is written to keep them apart for a screen reader too. If you re-crop either one,
  // re-read the other.
  //
  // Graded from +7 to +17. Its white point was already at 255 so it takes no lift, only
  // blue down. It replaced a 7680x4050 frame of a table spread with printed material
  // (shutterstock_2380531861, still in large/ if it is ever wanted back).
  { in: 'stock-photos-aug/large/shutterstock_2129383421.jpg', out: 'images/codesign-tools.webp',   width: 1264, crop: [0, 444, 4144, 5144], grade: [1, 1, 0.932] },
  { in: 'stock-photos-aug/large/shutterstock_2129383421.jpg', out: 'images/codesign-tools-m.webp', width: 800,  crop: [0, 444, 4144, 5144], grade: [1, 1, 0.932] },

  // A teacher between two students at a laptop, for Test, learn, begin again. 3952x5532 and
  // the one portrait original here, so the crop is vertical and the only choice is which end
  // to lose: the box sits on the bottom edge, trimming 626px of ceiling above their heads.
  { in: 'stock-photos-aug/large/shutterstock_2757155555.jpg', out: 'images/test-in-classrooms.webp',   width: 1264, crop: [0, 626, 3952, 4906] },
  { in: 'stock-photos-aug/large/shutterstock_2757155555.jpg', out: 'images/test-in-classrooms-m.webp', width: 800,  crop: [0, 626, 3952, 4906] },

  // The three co-design action shots in the Our Current Work row, one school each. 1080
  // is set off the card, which is the narrowest photographic box on the site: 351 CSS px
  // on a phone, where the row is one column, and 405 in the desktop three-up. That is the
  // usual three device pixels per phone pixel, and 2.7x the desktop box. The full-width
  // photography above ships at 1264 only because its box is ~640 rather than 405.
  //
  // Every one of these needs a crop, and the crop is the whole job. They are phone frames
  // shot in tall rooms, so a third to a half of each is ceiling. Hand the page an uncropped
  // 4:3 and `object-fit: cover` takes its 3:2 out of the middle: it keeps the ceiling and
  // pushes the people down against the bottom edge, which at 405 px reads as a photograph
  // of a room rather than of anyone working. Each box below was measured against its own
  // master and is exactly 3:2, so the page's cover crop is left with nothing to take.
  //
  // All three are phone frames and all three sat under the white point, so all three take
  // a lift. The first two needed nothing else — they were inside the warmth band already.
  //
  // crosstown-workshop is the exception in this file and the reason THE GRADE above has a
  // cap at all. At -17 it is the only cool photograph on the site, but the cast is not
  // uniform: it is a MIXED-LIGHTING frame, cold winter daylight through a wall of windows
  // against warm interior lights, and no global multiplier can separate the two — the
  // same blue attenuation that corrects the carpet also drains the sky. Measured on a
  // fixed 4,396px sky mask inside the window, sampled on the ungraded frame so the same
  // pixels are compared each time:
  //
  //     ungraded    frame -17    sky B-R +43
  //     cap 8       frame  -9    sky B-R +29   <- this one
  //     cap 14      frame  -3    sky B-R +17
  //     cap 20      frame  +3    sky B-R  +6   sky is neutral grey, the daylight is gone
  //
  // So it takes 8 rather than the file's 12, and stays the coolest frame in the set on
  // purpose. Rendered four-up and looked at, not chosen off the table. If a re-shoot ever
  // replaces this one, drop the exception with it.
  { in: 'schools/museum-high-workshop.jpg',    out: 'images/museum-high-workshop.webp',    width: 1080, crop: [400, 1000, 2400, 1600], grade: [1.047, 1.047, 1.047] },
  { in: 'schools/high-tech-high-workshop.jpg', out: 'images/high-tech-high-workshop.webp', width: 1080, crop: [200, 624, 3600, 2400], grade: [1.036, 1.036, 1.036] },
  { in: 'schools/crosstown-workshop.jpg',      out: 'images/crosstown-workshop.webp',      width: 1080, crop: [0, 300, 5712, 3808], grade: [1.013, 1.013, 0.943],
    bandExempt: 'mixed lighting; a cap of 8 keeps the sky blue' },

  // Headshots in a square cell: 165 CSS px on a phone, ~200 on desktop.
  //
  // Most of these come from the "Website Bio tracking" sheet, where each person's photo is
  // embedded in a Headshots column. Eight do not, under one rule: where the subject's own
  // institution still publishes the file the sheet's copy was resized from, the institution
  // wins. Angela is 1000x1407 on her own page against a
  // 680x600 Drupal derivative in the sheet, Laura 1200x1800 against 300x450, Sarah
  // 2617x2500 against a 1024x978 re-export, and the four Crosstown fellows below are
  // 2048-2500 against 400-800. Check both before adding anyone new — a photo that has been
  // pasted through a spreadsheet has usually lost a generation, and the fellows' entries
  // in that sheet were mostly LinkedIn renditions, which top out around 400-450px square.
  { in: 'team/joan-lee.jpg',           out: 'team/joan-lee.webp',           width: 512, square: true },
  { in: 'team/angela-stewart.jpg',     out: 'team/angela-stewart.webp',     width: 512, square: true },
  { in: 'team/laura-allen.jpeg',       out: 'team/laura-allen.webp',        width: 512, square: true },
  { in: 'team/blair-lehman.jpeg',      out: 'team/blair-lehman.webp',       width: 512, square: true },
  { in: 'team/sarah-zaner.png',        out: 'team/sarah-zaner.webp',        width: 512, square: true },
  { in: 'team/lisa-peterson.png',      out: 'team/lisa-peterson.webp',      width: 512, square: true },
  { in: 'team/neil-sharma.jpg',        out: 'team/neil-sharma.webp',        width: 512, square: true },
  { in: 'team/christopher-hanks.jpg',  out: 'team/christopher-hanks.webp',  width: 512, square: true },
  { in: 'team/ben-hoff.jpg',           out: 'team/ben-hoff.webp',           width: 512, square: true },

  // The four Crosstown High fellows, all four from one shoot on the school's own staff
  // page (crosstownhigh.org/leadership, served through its Squarespace CDN at
  // ?format=2500w). They were replaced together in September 2026 and that is the point:
  // one photographer, one blurred-interior background, one lighting setup, so the
  // Crosstown group reads as a set rather than as four unrelated photographs. It is the
  // same argument as the grade on the photography further up, arrived at by swapping
  // masters rather than by multiplying channels.
  //
  // Three of the four were also genuine resolution rescues — Nikki Wallace 380px
  // effective, Danie Cowden 400, Mohammed Al Harthy 450, all now 2048-2500 — so two of
  // them left the under-resolution group below and the third lost a crop box. Only
  // Joshua Sloan was already adequate at 800x800; he is here for the set.
  //
  // None needs a crop box. Rendered through this encoder's exact square framing
  // (fit: 'cover', position: 'top') and looked at: all four put the face in the upper
  // middle with the shoulders in, at the same scale. Check that again if a master is
  // ever replaced singly — it holds because they were framed by one photographer, not
  // because top-anchoring is reliable in general. Sherry Lachman's job below is what
  // happens when it is not.
  { in: 'team/nikki-wallace.jpg',      out: 'team/nikki-wallace.webp',      width: 512, square: true },
  { in: 'team/danie-cowden.jpg',       out: 'team/danie-cowden.webp',       width: 512, square: true },
  { in: 'team/joshua-sloan.jpg',       out: 'team/joshua-sloan.webp',       width: 512, square: true },
  { in: 'team/mohammed-al-harthy.jpg', out: 'team/mohammed-al-harthy.webp', width: 512, square: true },

  // Under-resolution at source; upscaling would only invent detail, so these ship at
  // their native size and stay soft until someone supplies better originals. Two have
  // left this group — Blair Lehman at 200x200, when the sheet supplied an 800x800, and
  // Mohammed Al Harthy at 450 with Danie Cowden at 400, when the Crosstown shoot above
  // replaced both. What is left here is no longer about the fellows: Andrew Lan and Ryan
  // Baker are research partners whose only public portrait is small. The two jobs after
  // them are in this stretch of the file for a different reason — see their own note.
  //
  // Andrew Lan is the trap worth naming. cics.umass.edu serves his portrait through a
  // 1_1_2xl image style at 800x800, and that derivative is what got pasted into the sheet,
  // but the file behind it — /files/2022-10/lan.jpg — is 203x203. The big one is a 4x
  // upscale carrying no detail the small one lacks, at 48 KB against 17 KB. Encoding from
  // it would ship a mushy tile that merely claims to be sharp, so the 203 is the master.
  { in: 'team/andrew-lan.jpg',         out: 'team/andrew-lan.webp',         width: 512, square: true },
  { in: 'team/ryan-baker.png',         out: 'team/ryan-baker.webp',         width: 512, square: true },
  // These two came off the site in September 2026 when the Fellowship roster changed, and
  // nothing references their output any more. Kept on purpose rather than deleted: the
  // decision was to hold the files in case the roster moves again. Same situation as the
  // two 3/2 frames at the top of this list — encoded and published, linked from nowhere.
  { in: 'team/danielle-ragavanis.jpg', out: 'team/danielle-ragavanis.webp', width: 512, square: true },
  { in: 'team/alondra-ramos.jpg',      out: 'team/alondra-ramos.webp',      width: 512, square: true },

  // The three Leadership portraits. They are tiles again.
  //
  // For a week in September they were not: the Who We Are page gave each leader a
  // full-width portrait over a long bio, the portrait rendered at 608 CSS px, and these
  // three were the only headshots in the file at 1264 because 512 into a 608 box is an
  // 0.84x upscale. The bios have since moved to their own pages at /team/<slug>/ and the
  // leadership cards are the same ~197px tile as every other person on the page, so the
  // reason for 1264 went with them. Back to 512, like the other seventeen.
  //
  // Sherry and Raquel keep their boxes, which were never about the size. Sherry's master
  // is a studio portrait framed from the knees up, 3000x4500: `square: true` alone anchors
  // to the top and takes the top 3000x3000, leaving her head in the upper third under a
  // metre of backdrop. The box is measured to her head and shoulders. Raquel's 872 is the
  // most her 872x1012 master holds and naming it is load-bearing — `withoutEnlargement`
  // does not clamp a too-large target, it abandons the resize, so asking 1264 of her
  // shipped the master untouched and NOT square, and the page's `object-fit: cover` then
  // took over the framing at a different object-position than the encoder's. At 512 she
  // downsamples honestly and the note is kept because the trap is one edit away.
  { in: 'team/sherry-lachman.jpg',     out: 'team/sherry-lachman.webp',     width: 512, square: true, crop: [461, 280, 2078, 2078] },
  { in: 'team/caitlin-mills.png',      out: 'team/caitlin-mills.webp',      width: 512, square: true },
  { in: 'team/raquel-romano.png',      out: 'team/raquel-romano.webp',      width: 512, square: true },

  // The three illustrations in the outputs row on the home page. These ship as rendered:
  // the full 1200x1200 plate, scaled down and nothing else.
  //
  // An earlier version of this encoder trimmed each plate to its own content and re-padded
  // all three onto a common 3:2 canvas, to make the row read as one set regardless of how
  // each render framed its subject. Do not reintroduce it. Trimming means choosing an
  // alpha threshold, and on these renders there is no threshold that works: the shadow
  // falls off smoothly from the subject (measured along one row through the brain's
  // shadow, alpha runs 0, 3, 13, 31, 56, 89, 129 over 240 px) while a faint global haze
  // sits at alpha 1-2 across the whole canvas and never clears. Set the threshold low
  // enough to clear the haze and it cuts nothing; set it high enough to trim and the crop
  // lands partway up the shadow gradient and slices it off against a straight edge. At the
  // threshold of 16 that shipped briefly, the brain's cast shadow was cut flat down its
  // left side and across its bottom.
  //
  // The plates are square and already framed by whoever rendered them, with the shadow
  // given room on every side. So the page gets a square box and the plate fills it. The
  // three subjects are not scaled to match each other any more — they sit wherever the
  // render put them — which is the cost of not cutting into anyone's shadow.
  //
  // 810 is twice the 405 CSS px the box occupies in the desktop three-up, which is what a
  // 2x screen resolves; the phone's box is smaller still at 351. The set is 116 KB, lazy
  // and below the fold.
  //
  // The alpha is kept rather than flattened onto the panel colour. Flattening would save
  // roughly 20 KB a plate, and is deliberately not done: it would weld #f6f2e8 into the
  // file and the tile would show a wrong-coloured rectangle the moment the panel is
  // restyled.
  { in: 'icons/brain.png',  out: 'illustrations/brain.webp',  width: 810, alpha: true },
  { in: 'icons/blocks.png', out: 'illustrations/blocks.webp', width: 810, alpha: true },
  { in: 'icons/laptop.png', out: 'illustrations/laptop.webp', width: 810, alpha: true },

  // The four nodes of the home page's co-design cycle. Same 1200x1200 plates as the three
  // illustrations above and the same rule applies: do not trim them. Measured, the alpha
  // above 0 covers the whole canvas on all four — the same faint global haze, topping out
  // at 12-16 in the outer 20px frame — while the real content sits in 657x845 to 982x895
  // at a threshold of 16. There is no threshold between those. And here the padding is
  // doing a second job: all four share a content baseline (top y 155-179, bottom 1021-1049),
  // which is what lines the set up around the ring. Trim and they scatter.
  //
  // 320 against a 97.4px peak. The node is 18.5% of a slot that caps at 33rem, the icon is
  // 86% of that, so the ceiling is 83.98px, and 1.16 of it when the selected node is also
  // hovered — measured in Chromium, along with the 44px (2.75rem) row thumbnail the phone
  // arm uses. That is 3.3x the one element a reader deliberately points at. The generosity
  // is free: 4.18 MB of plate becomes 50 KB for the set.
  //
  // These live in assets/approach/ beside the arch frames, which is two families in one
  // directory but is safe: tools/encode-approach.mjs only unlinks /^ap\d{4}m?\.webp$/, so
  // re-encoding that sequence leaves these alone, and its manifest check walks the manifest
  // to disk rather than the other way round. The name is the Blender render's, which is
  // that directory's own convention.
  { in: 'icons/cyc01_role_0001.png',         out: 'approach/cyc01_role_0001.webp',         width: 320, alpha: true },
  { in: 'icons/cyc02_capabilities_0001.png', out: 'approach/cyc02_capabilities_0001.webp', width: 320, alpha: true },
  { in: 'icons/cyc03_applications_0002.png', out: 'approach/cyc03_applications_0002.webp', width: 320, alpha: true },
  { in: 'icons/cyc04_test_0001.png',         out: 'approach/cyc04_test_0001.webp',         width: 320, alpha: true },

  // The social card — what LinkedIn, Slack, iMessage and X render when the site is shared.
  // This is the only job in the file that composites rather than resizes, the only one that
  // writes a PNG, and the only one whose source sits outside image-sources/. Each of those
  // is deliberate.
  //
  // It replaced assets/logo/logo-light.png, which was 768x149: a strip of the PRE-KIT raster
  // wordmark. Every platform crops a share image to about 1200x630, so a 768x149 source was
  // letterboxed into a smear of the wrong logo — the same failure, from the same file, that
  // the favicon note in index.html describes. Nobody sees a share card while building the
  // site, which is why it outlived the rest of the logo work.
  //
  // PNG and not WebP because the scrapers are the audience, not a browser: LinkedIn in
  // particular does not reliably render a WebP og:image, and a card that fails to render is
  // worth more bytes than one that saves them. 1200x630 is stated in the markup too
  // (og:image:width/height), which lets a scraper lay out the card before it has fetched it.
  //
  // The source reaches up out of image-sources/ into the brand kit, which no other job does.
  // That is the lesser evil: source-material/brand-logos/ is the kit exactly as AERDF
  // supplied it, and copying a lockup into image-sources/ to avoid one `../` would fork it —
  // two files to keep in step, and no way to tell which is canonical. The colour horizontal
  // lockup is the one that carries "supported by aerdf", which is the variant the client
  // asked for by name.
  //
  // The canvas is #fdfcfa, the resolved value of --surface-page (--color-ecru-white-lighter),
  // so the card matches the page it links to rather than sitting on white. `scale` is the
  // fraction of the canvas width the lockup occupies: 0.62 leaves a wide margin on purpose,
  // because several clients crop a card's edges and a lockup run close to the sides loses
  // its "supported by aerdf" line first.
  { in: '../brand-logos/PNG/AugmentED_Logo_Color_Horiz.png', out: 'logo/og-card.png',
    card: { width: 1200, height: 630, background: '#fdfcfa', scale: 0.62 } }
];

// Two jobs that read the same master must frame and grade it the same way. Seven of the
// photographs ship in two tiers and three of those carry a grade, and a crop or a grade
// that differs between the 800 and the 1264 is a jump in framing or colour the moment
// srcset switches — at a viewport width nobody tests at, on a file nobody diffs, with a
// green build. This used to be a warning in the comment above; it is cheaper to check it.
const byMaster = new Map();
for (const j of JOBS) {
  const key = JSON.stringify([j.crop ?? null, j.grade ?? null]);
  const seen = byMaster.get(j.in);
  if (seen && seen.key !== key) {
    throw new Error(
      `${j.in} is read by two jobs that disagree:\n` +
      `  ${seen.out}  crop ${JSON.stringify(seen.crop ?? null)}  grade ${JSON.stringify(seen.grade ?? null)}\n` +
      `  ${j.out}  crop ${JSON.stringify(j.crop ?? null)}  grade ${JSON.stringify(j.grade ?? null)}`
    );
  }
  if (!seen) byMaster.set(j.in, { key, out: j.out, crop: j.crop, grade: j.grade });
}

// A job whose source is missing is skipped, not fatal — see the note on SRC above.
const runnable = JOBS.filter((j) => fs.existsSync(path.join(SRC, j.in)));
const skipped = JOBS.filter((j) => !runnable.includes(j));
if (!runnable.length) {
  console.error(`No source images found.

Everything is read from ${path.relative(root, SRC)}/, which is committed — so this
encoder runs from a clean checkout with nothing restored.`);
  process.exit(1);
}

let before = 0, after = 0;
for (const job of runnable) {
  const src = path.join(SRC, job.in);
  const dst = path.join(OUT, job.out);
  fs.mkdirSync(path.dirname(dst), { recursive: true });

  const meta = await sharp(src).metadata();
  let pipe = sharp(src);
  // A card job does not resize a source into a box, it places a source ON a canvas — see the
  // social-card note in the job list. Composite first, then let the rest of the loop run:
  // `card` and `width` are mutually exclusive, so the resize below is skipped for these.
  if (job.card) {
    const inner = await sharp(src)
      .resize({ width: Math.round(job.card.width * job.card.scale), kernel: 'lanczos3' })
      .png().toBuffer();
    pipe = sharp({
      create: { width: job.card.width, height: job.card.height, channels: 3, background: job.card.background },
    }).composite([{ input: inner, gravity: 'centre' }]);
  }
  // A crop box, [left, top, width, height] in source pixels, taken before the resize.
  // This is where an original gets framed for the box it ships into, and every job that
  // carries one says above it what the box was set on. It does the work the page's own
  // `object-fit: cover` cannot: cover takes its share out of the middle, which is a guess
  // about where the subject is, and on these sources it is usually the wrong one. Measure
  // the box against the source rather than guessing: an extract that runs past the edge
  // throws, it does not clamp.
  if (job.crop) pipe = pipe.extract({ left: job.crop[0], top: job.crop[1], width: job.crop[2], height: job.crop[3] });
  // A per-channel multiplier, [r, g, b] — see THE GRADE above for the rule that sets every
  // one of them. Order matters twice: after the crop, because each multiplier was solved
  // against its own cropped frame's channel means and a different box needs a different
  // triple; and before the resize, because that is where it was measured. Clipping at full
  // resolution and then averaging is not the same as averaging and then clipping, and the
  // difference lands in exactly the blown highlights this is most likely to touch.
  if (job.grade) pipe = pipe.linear(job.grade, [0, 0, 0]);
  if (job.card) {
    // already at its final size — the canvas set it
  } else if (job.square) {
    // Never enlarge: withoutEnlargement keeps the two small headshots at their own
    // size rather than fabricating pixels.
    pipe.resize({ width: job.width, height: job.width, fit: 'cover', position: 'top', withoutEnlargement: true, kernel: 'lanczos3' });
  } else {
    pipe.resize({ width: job.width, withoutEnlargement: true, kernel: 'lanczos3' });
  }
  // job.alpha is a requirement in both directions. sharp carries a source's alpha channel
  // through whatever the webp options say, so without this a photograph that happened to
  // arrive RGBA ships a plane describing nothing — two of the seven 4/5 photographs did.
  if (!job.alpha) pipe.removeAlpha();
  // Format follows the output extension. Everything the page itself loads is WebP; the one
  // PNG is the social card, and the note on its job says why.
  const info = await (job.out.endsWith('.png')
    ? pipe.png({ compressionLevel: 9, palette: true })
    : pipe.webp(job.alpha ? { quality: 82, alphaQuality: 100, effort: 6 } : { quality: 80, effort: 6 })
  ).toFile(dst);

  const wrote = await sharp(dst).metadata();
  if (job.alpha && !wrote.hasAlpha) throw new Error(`${dst} lost its alpha channel`);
  if (!job.alpha && wrote.hasAlpha) throw new Error(`${dst} kept an alpha channel it does not need`);
  const src_b = fs.statSync(src).size;
  before += src_b; after += info.size;
  const soft = job.width && wrote.width < job.width ? '  (source too small — ships soft)' : '';
  // A card job has no `width`, so the soft check above skips it; report its canvas instead.
  console.log(
    `${job.out.padEnd(34)} ${String(meta.width) + 'x' + meta.height} ${(src_b / 1024).toFixed(0)}KB` +
    ` -> ${wrote.width}x${wrote.height} ${(info.size / 1024).toFixed(0)}KB${soft}`
  );
}
console.log(`\n${(before / 1048576).toFixed(2)} MB -> ${(after / 1024).toFixed(0)} KB`);
if (skipped.length) {
  console.log(`\nskipped ${skipped.length} job(s) whose source is not present:`);
  for (const j of skipped) console.log(`  ${path.relative(root, path.join(SRC, j.in))}`);
}

// Print the band THE GRADE above holds the photography to, measured off the files just
// written rather than off the pipeline that wrote them. Every images/ output of this
// encoder is one of the twelve photographs — the headshots go to team/, the plates to
// illustrations/ and approach/ — so no job needs to declare itself.
//
// Why print and not assert: each grade is a constant solved by hand against one master,
// and a replaced master silently invalidates it. A new select legitimately starts out of
// band, so failing the run would be wrong; what is wanted is that the run says so. If a
// line below is flagged, re-solve that frame's grade before shipping it.
//
// A job that is out of band on purpose carries `bandExempt` with the reason, and prints
// as such. That is the whole point of having it: a flag that fires every run on a frame
// nobody intends to change is a flag people stop reading.
const photos = runnable.filter((j) => j.out.startsWith('images/') && !j.out.endsWith('-m.webp'));
if (photos.length) {
  const band = [9, 25];
  const rows = [];
  for (const j of photos) {
    const { data, info } = await sharp(path.join(OUT, j.out))
      .resize({ width: 320, kernel: 'lanczos3' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const n = info.width * info.height;
    let R = 0, B = 0;
    const L = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      R += data[i * 3]; B += data[i * 3 + 2];
      L[i] = 0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2];
    }
    L.sort();
    rows.push({ name: j.out.replace('images/', '').replace('.webp', ''), warm: (R - B) / n, white: L[Math.floor(0.998 * (n - 1))], exempt: j.bandExempt });
  }
  const warm = rows.map((r) => r.warm);
  console.log(`\nphotography, measured off the encoded files — see THE GRADE in the job list:`);
  for (const r of rows) {
    const out = r.warm < band[0] || r.warm > band[1];
    const flag = !out ? '' : r.exempt ? `   (out of band on purpose: ${r.exempt})` : '   <- outside the warmth band, re-solve its grade';
    console.log(`  ${r.name.padEnd(26)} R-B ${(r.warm >= 0 ? '+' : '') + r.warm.toFixed(0)}`.padEnd(42) +
      `white point ${r.white.toFixed(0)}${flag}`);
  }
  console.log(`  ${'spread'.padEnd(26)} R-B ${(Math.max(...warm) - Math.min(...warm)).toFixed(0)} points across ${rows.length}, band is ${band[0]}..${band[1]}`);
}

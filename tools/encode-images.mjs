// Re-encodes the page's photographic and decorative art from the originals in
// source-material/image-sources into the sized WebP the site actually ships. Sharp is not
// a repo dependency and CI never runs this — the encoded files are committed:
//
//   npm i --no-save sharp && node tools/encode-images.mjs
//
// The originals were dropped in as received: PNGs of soft-shaded 3D renders, 24-bit for
// the photography and 48-bit for the icons, and headshots ranging from a 300-DPI print
// export down to a 190px thumbnail. Every target below is set from the box the image
// actually occupies, at roughly three device pixels per CSS pixel, which is what a phone
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
  // Full-width photography in a 3/2 box: 351 CSS px on a phone, ~640 on desktop.
  { in: 'images/classroom-morning.png', out: 'images/classroom-morning.webp', width: 1264 },
  { in: 'images/student-notes.png',     out: 'images/student-notes.webp',     width: 1264 },

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
  { in: 'schools/museum-high-workshop.jpg',    out: 'images/museum-high-workshop.webp',    width: 1080, crop: [400, 1000, 2400, 1600] },
  { in: 'schools/high-tech-high-workshop.jpg', out: 'images/high-tech-high-workshop.webp', width: 1080, crop: [200, 624, 3600, 2400] },
  { in: 'schools/crosstown-workshop.jpg',      out: 'images/crosstown-workshop.webp',      width: 1080, crop: [0, 300, 5712, 3808] },

  // Headshots in a square cell: 165 CSS px on a phone, ~200 on desktop.
  //
  // Most of these come from the "Website Bio tracking" sheet, where each person's photo is
  // embedded in a Headshots column. Four do not: where the subject's own institutional page
  // still had the file the sheet's copy was resized from, the page won. Angela is 1000x1407
  // there against a 680x600 Drupal derivative in the sheet, Laura 1200x1800 against 300x450,
  // Sarah 2617x2500 against a 1024x978 re-export. Check both before adding anyone new — a
  // photo that has been pasted through a spreadsheet has usually lost a generation.
  { in: 'team/sherry-lachman.jpg',     out: 'team/sherry-lachman.webp',     width: 512, square: true },
  { in: 'team/raquel-romano.png',      out: 'team/raquel-romano.webp',      width: 512, square: true },
  { in: 'team/joan-lee.jpg',           out: 'team/joan-lee.webp',           width: 512, square: true },
  { in: 'team/angela-stewart.jpg',     out: 'team/angela-stewart.webp',     width: 512, square: true },
  { in: 'team/laura-allen.jpeg',       out: 'team/laura-allen.webp',        width: 512, square: true },
  { in: 'team/blair-lehman.jpeg',      out: 'team/blair-lehman.webp',       width: 512, square: true },
  { in: 'team/sarah-zaner.png',        out: 'team/sarah-zaner.webp',        width: 512, square: true },
  { in: 'team/lisa-peterson.png',      out: 'team/lisa-peterson.webp',      width: 512, square: true },
  { in: 'team/neil-sharma.jpg',        out: 'team/neil-sharma.webp',        width: 512, square: true },
  { in: 'team/christopher-hanks.jpg',  out: 'team/christopher-hanks.webp',  width: 512, square: true },
  { in: 'team/ben-hoff.jpg',           out: 'team/ben-hoff.webp',           width: 512, square: true },
  { in: 'team/joshua-sloan.jpg',       out: 'team/joshua-sloan.webp',       width: 512, square: true },

  // Under-resolution at source; upscaling would only invent detail, so these ship at
  // their native size and stay soft until someone supplies better originals. Blair Lehman
  // was in this group at 200x200 and has left it — the sheet supplied an 800x800.
  // The fellows' photographs mostly arrive this way: pulled from LinkedIn, where the
  // largest public rendition tops out around 400-450px square.
  //
  // Andrew Lan is the trap worth naming. cics.umass.edu serves his portrait through a
  // 1_1_2xl image style at 800x800, and that derivative is what got pasted into the sheet,
  // but the file behind it — /files/2022-10/lan.jpg — is 203x203. The big one is a 4x
  // upscale carrying no detail the small one lacks, at 48 KB against 17 KB. Encoding from
  // it would ship a mushy tile that merely claims to be sharp, so the 203 is the master.
  { in: 'team/andrew-lan.jpg',         out: 'team/andrew-lan.webp',         width: 512, square: true },
  { in: 'team/ryan-baker.png',         out: 'team/ryan-baker.webp',         width: 512, square: true },
  { in: 'team/mohammed-al-harthy.jpg', out: 'team/mohammed-al-harthy.webp', width: 512, square: true },
  { in: 'team/danie-cowden.jpg',       out: 'team/danie-cowden.webp',       width: 512, square: true },
  { in: 'team/danielle-ragavanis.jpg', out: 'team/danielle-ragavanis.webp', width: 512, square: true },
  { in: 'team/alondra-ramos.jpg',      out: 'team/alondra-ramos.webp',      width: 512, square: true },

  // Nikki Wallace's is the one photograph here that is not a headshot: a full-body
  // conference stage shot against a magenta backdrop, her face about 165 px inside an
  // 800 px frame. The square cover crop cannot help — the master is already square, so
  // it would pass straight through and ship a whole stage into a 200 px tile. The crop
  // box below is measured to her head and shoulders, which is the only way this image
  // reads as a portrait next to the others. It costs resolution: 380 px, so it ships
  // soft, and the magenta still does not match anything around it. Replace the master
  // and drop the crop the moment a real headshot exists.
  { in: 'team/nikki-wallace.jpg',      out: 'team/nikki-wallace.webp',      width: 512, square: true, crop: [288, 90, 380, 380] },

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
  { in: 'icons/laptop.png', out: 'illustrations/laptop.webp', width: 810, alpha: true }
];

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
  // A crop box, [left, top, width, height] in source pixels, taken before the resize.
  // Only for a photograph that is not a headshot to begin with and cannot be made into
  // one by the square cover crop below, which takes the top of the frame and would keep
  // whatever framing the photographer chose. Measure the box against the master rather
  // than guessing: an extract that runs past the edge throws, it does not clamp.
  if (job.crop) pipe = pipe.extract({ left: job.crop[0], top: job.crop[1], width: job.crop[2], height: job.crop[3] });
  if (job.square) {
    // Never enlarge: withoutEnlargement keeps the two small headshots at their own
    // size rather than fabricating pixels.
    pipe.resize({ width: job.width, height: job.width, fit: 'cover', position: 'top', withoutEnlargement: true, kernel: 'lanczos3' });
  } else {
    pipe.resize({ width: job.width, withoutEnlargement: true, kernel: 'lanczos3' });
  }
  const info = await pipe
    .webp(job.alpha ? { quality: 82, alphaQuality: 100, effort: 6 } : { quality: 80, effort: 6 })
    .toFile(dst);

  const wrote = await sharp(dst).metadata();
  if (job.alpha && !wrote.hasAlpha) throw new Error(`${dst} lost its alpha channel`);
  const src_b = fs.statSync(src).size;
  before += src_b; after += info.size;
  const soft = job.width && wrote.width < job.width ? '  (source too small — ships soft)' : '';
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

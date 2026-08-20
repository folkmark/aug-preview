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

  // Headshots in a square cell: 165 CSS px on a phone, ~200 on desktop.
  { in: 'team/joan-lee.jpg',       out: 'team/joan-lee.webp',       width: 512, square: true },
  { in: 'team/lisa-peterson.png',  out: 'team/lisa-peterson.webp',  width: 512, square: true },
  { in: 'team/raquel-romano.png',  out: 'team/raquel-romano.webp',  width: 512, square: true },
  { in: 'team/laura-allen.jpeg',   out: 'team/laura-allen.webp',    width: 512, square: true },
  // Under-resolution at source; upscaling would only invent detail, so these ship at
  // their native size and stay soft until someone supplies better originals.
  { in: 'team/blair-lehman.jpeg',  out: 'team/blair-lehman.webp',   width: 512, square: true },
  { in: 'team/ryan-baker.png',     out: 'team/ryan-baker.webp',     width: 512, square: true },

  // The three illustrations in the outputs row on the home page. These take a different
  // treatment from everything above, for a reason worth stating: they arrive as 1200x1200
  // plates with wildly different framing inside the square. Measured from the alpha, the
  // content boxes are 808x898 (brain, portrait), 927x707 (blocks) and 904x690 (laptop),
  // sitting 224, 343 and 297 px below the top edge. Dropped into identical boxes they
  // read as three different sizes, because most of what the box is fitting is each
  // plate's own idiosyncratic whitespace.
  //
  // So: trim to the content, then re-pad to one common 3:2 canvas with equal margins.
  // Every plate then arrives at the page pre-fitted to the box it renders into, and the
  // three carry matching weight without the page having to know anything about them.
  // All three come out height-constrained, so they land at a matched 464 px tall and
  // 417, 608 and 608 wide — the brain is the narrow one because it is the portrait
  // subject, not because it is scaled differently.
  //
  // Normalising by *area* rather than by bounding box was tried on the previous set and
  // is wrong here: what reads at a glance is the extent, not the coverage. An airy
  // subject carrying a fraction of another's ink for a comparable bounding box would be
  // scaled up until it burst the frame.
  //
  // `trimThreshold` is the load-bearing setting, and 0 — which is what this used to pass,
  // and which was right for the previous plates — now yields no trim at all. These
  // renders carry a wash of sub-3%-opacity alpha out to all four canvas edges (82k pixels
  // at alpha 1 on the brain, 100k on the laptop), so at threshold 0 the trim finds
  // nothing to cut and hands back the full 1200x1200. The plate then ships with every bit
  // of its whitespace and the row reads as three different sizes again — silently,
  // because the encoder still reports success. Hence the guard below.
  //
  // 16 is about 6% opacity: well clear of the wash and still inside the real shadow.
  // Anywhere from 8 to 26 moves the boxes by at most 5%, so the exact value is not
  // delicate, but below 8 the framing falls off a cliff back to the whole canvas. It is
  // passed explicitly rather than left to sharp's own default of 10, which lands inside
  // that range by luck and sits close enough to the cliff not to be worth relying on.
  // Note the threshold is on sharp's 0-255 scale even though these sources are 16 bits
  // per channel; a value scaled for 16-bit is out of range and silently trims nothing.
  //
  // 810x540 is twice the 405 CSS px the box occupies in the desktop three-up, which is
  // what a 2x screen resolves; the phone's box is smaller still at 351. The 1200px
  // originals are more than the box can ever show, and their depth is what made them
  // 669-745 KB apiece. The set goes 2.07 MB -> 105 KB, lazy and below the fold.
  //
  // The alpha is kept rather than flattened onto the panel colour. Flattening would save
  // 21-26 KB a plate, and is deliberately not done: it would weld #f6f2e8 into the file
  // and the tile would show a wrong-coloured rectangle the moment the panel is restyled.
  { in: 'icons/brain.png',  out: 'illustrations/brain.webp',  box: [810, 540], margin: 0.07, trimThreshold: 16, alpha: true },
  { in: 'icons/blocks.png', out: 'illustrations/blocks.webp', box: [810, 540], margin: 0.07, trimThreshold: 16, alpha: true },
  { in: 'icons/laptop.png', out: 'illustrations/laptop.webp', box: [810, 540], margin: 0.07, trimThreshold: 16, alpha: true }
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

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

let before = 0, after = 0;
for (const job of runnable) {
  const src = path.join(SRC, job.in);
  const dst = path.join(OUT, job.out);
  fs.mkdirSync(path.dirname(dst), { recursive: true });

  const meta = await sharp(src).metadata();
  let pipe = sharp(src);
  if (job.box) {
    // Trim the plate's own transparent margin away, fit what is left inside the box less
    // its margin, then pad back out to the box centred. Two passes rather than one
    // pipeline: sharp keeps only the last resize in a chain, so the fit and the pad have
    // to be separated by a buffer or the fit is silently discarded. On trimThreshold, see
    // the note on the jobs — it decides the framing, and a wrong one fails quietly.
    const [bw, bh] = job.box;
    const trimmed = await sharp(src)
      .trim({ background: TRANSPARENT, threshold: job.trimThreshold })
      .toBuffer({ resolveWithObject: true });
    // A trim that cut nothing is the failure this whole treatment exists to prevent, and
    // it is invisible in the output: the plate encodes fine, at the right dimensions, and
    // only looks wrong beside the other two on the page. Catch it here instead.
    if (trimmed.info.width === meta.width && trimmed.info.height === meta.height) {
      throw new Error(
        `${job.in}: trim at threshold ${job.trimThreshold} cut nothing — the plate would ` +
        `ship with all of its own whitespace. Raise the threshold until it finds the content.`
      );
    }
    const inner = await sharp(trimmed.data)
      .resize({
        width: Math.round(bw * (1 - 2 * job.margin)),
        height: Math.round(bh * (1 - 2 * job.margin)),
        fit: 'inside', kernel: 'lanczos3',
      })
      .toBuffer();
    pipe = sharp(inner).resize({ width: bw, height: bh, fit: 'contain', background: TRANSPARENT });
  } else if (job.square) {
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

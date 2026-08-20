// Re-encodes the page's photographic and decorative art from the originals in
// source-material/image-sources into the sized WebP the site actually ships. Sharp is not
// a repo dependency and CI never runs this — the encoded files are committed:
//
//   npm i --no-save sharp && node tools/encode-images.mjs
//
// The originals were dropped in as received: 24-bit PNGs of soft-shaded 3D renders,
// and headshots ranging from a 300-DPI print export down to a 190px thumbnail. Every
// target below is set from the box the image actually occupies, at roughly three
// device pixels per CSS pixel, which is what a phone at DPR 3 can resolve and no
// more. The approach frames have their own encoder, tools/encode-approach.mjs.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Photography and headshots come from the masters, which are kept off the repository —
// see .gitignore. The illustrations came in already rendered and are committed, so they
// have their own root and re-encode with nothing restored. Jobs name which they use, and
// a job whose source is absent is skipped rather than killing the run: that way changing
// an icon does not require fetching 88 MB of photography first.
const SRC = path.join(root, 'source-material/image-sources');
const ICONS = path.join(root, 'assets/icons-rigtest');
const OUT = path.join(root, 'assets');

// Imported here rather than at the top so the missing-masters message above wins: sharp
// is not a repo dependency, and a bare ERR_MODULE_NOT_FOUND is a worse first thing to
// read than "restore the masters".
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
  //
  // Most of these come from the "Website Bio tracking" sheet, where each person's photo is
  // embedded in a Headshots column. Four do not: where the subject's own institutional page
  // still had the file the sheet's copy was resized from, the page won. Angela is 1000x1407
  // there against a 680x600 Drupal derivative in the sheet, Laura 1200x1800 against 300x450,
  // Sarah 2617x2500 against a 1024x978 re-export. Check both before adding anyone new — a
  // photo that has been pasted through a spreadsheet has usually lost a generation.
  { in: 'team/raquel-romano.png',      out: 'team/raquel-romano.webp',      width: 512, square: true },
  { in: 'team/joan-lee.jpg',           out: 'team/joan-lee.webp',           width: 512, square: true },
  { in: 'team/angela-stewart.jpg',     out: 'team/angela-stewart.webp',     width: 512, square: true },
  { in: 'team/laura-allen.jpeg',       out: 'team/laura-allen.webp',        width: 512, square: true },
  { in: 'team/blair-lehman.jpeg',      out: 'team/blair-lehman.webp',       width: 512, square: true },
  { in: 'team/sarah-zaner.png',        out: 'team/sarah-zaner.webp',        width: 512, square: true },
  { in: 'team/lisa-peterson.png',      out: 'team/lisa-peterson.webp',      width: 512, square: true },
  { in: 'team/suzanna-smith.jpg',      out: 'team/suzanna-smith.webp',      width: 512, square: true },
  { in: 'team/adam-bachman.jpg',       out: 'team/adam-bachman.webp',       width: 512, square: true },
  { in: 'team/neil-sharma.jpg',        out: 'team/neil-sharma.webp',        width: 512, square: true },
  { in: 'team/christopher-hanks.jpg',  out: 'team/christopher-hanks.webp',  width: 512, square: true },
  { in: 'team/ben-hoff.jpg',           out: 'team/ben-hoff.webp',           width: 512, square: true },
  { in: 'team/joshua-sloan.jpg',       out: 'team/joshua-sloan.webp',       width: 512, square: true },

  // Under-resolution at source; upscaling would only invent detail, so these ship at
  // their native size and stay soft until someone supplies better originals. Blair Lehman
  // was in this group at 200x200 and has left it — the sheet supplied an 800x800.
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

  // Nikki Wallace is deliberately absent. The sheet has an 800x800 for her, but it is a
  // full-body conference stage photograph against a magenta backdrop, with her face about
  // 150 px inside the frame. Cropping it square yields a soft, small face that still fights
  // every neighbouring tile, which is worse than the placeholder; her card stays empty until
  // a real headshot arrives. Add the job here when one does.

  // The three illustrations in the outputs row on the home page. These take a different
  // treatment from everything above, for a reason worth stating: they arrived as
  // 1200x1200 lossless plates with wildly different framing inside the square. Measured
  // from the alpha, the content boxes are 702x897 (brain, portrait), 808x878 (network),
  // and 1011x556 (laptop, landscape) — sitting anywhere from 144 to 373 px below the top
  // edge. Dropped into identical boxes they read as three different sizes, because most
  // of what the box is fitting is each plate's own idiosyncratic whitespace.
  //
  // So: trim to the content, then re-pad to one common 3:2 canvas with equal margins.
  // Every plate then arrives at the page pre-fitted to the box it renders into, and the
  // three carry matching weight without the page having to know anything about them.
  //
  // Normalising by *area* rather than by bounding box was tried and is wrong here. The
  // network plate is a deliberately airy tangle of thin lines and carries only 21% of the
  // brain's ink for a comparable bounding box; matching ink would scale it 2.2x and burst
  // the frame. What reads at a glance is the extent, not the coverage.
  //
  // 810x540 is twice the 405 CSS px the box occupies in the desktop three-up, which is
  // what a 2x screen resolves; the phone's box is smaller still at 351. The 1200px
  // originals are more than the box can ever show, and their losslessness is what made
  // them 202-343 KB apiece. The set goes 808 KB -> ~190 KB, lazy and below the fold.
  //
  // network.webp comes out five times the size of the other two, and that is the alpha,
  // not the colour: flattened it is 17 KB against 131 KB with the alpha channel kept.
  // Its tangle of thin anti-aliased lines and the wide soft shadow beneath it are simply
  // expensive to store. Reaching for `quality` will not touch it — 82 to 60 saves 30 KB
  // and starts to band the gradients — and nor will alphaQuality, which buys 13 KB at 80.
  // The only real lever is flattening it onto the panel colour, which is deliberately not
  // done: it would weld #f6f2e8 into the file and the tile would show a wrong-coloured
  // rectangle the moment the panel is restyled.
  { in: 'ICON_1_brain_0001.webp',   out: 'illustrations/brain.webp',   root: ICONS, box: [810, 540], margin: 0.07, alpha: true },
  { in: 'ICON_2_network_0001.webp', out: 'illustrations/network.webp', root: ICONS, box: [810, 540], margin: 0.07, alpha: true },
  { in: 'ICON_3_laptop_0001.webp',  out: 'illustrations/laptop.webp',  root: ICONS, box: [810, 540], margin: 0.07, alpha: true }
];

// A job whose source is missing is skipped, not fatal — see the note on the roots above.
const runnable = JOBS.filter((j) => fs.existsSync(path.join(j.root || SRC, j.in)));
const skipped = JOBS.filter((j) => !runnable.includes(j));
if (!runnable.length) {
  console.error(`No source images found.

Photography and headshots are read from ${path.relative(root, SRC)}/, which is
committed, as are the illustrations in ${path.relative(root, ICONS)}/ — so this
encoder runs from a clean checkout with nothing restored.`);
  process.exit(1);
}

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

let before = 0, after = 0;
for (const job of runnable) {
  const src = path.join(job.root || SRC, job.in);
  const dst = path.join(OUT, job.out);
  fs.mkdirSync(path.dirname(dst), { recursive: true });

  const meta = await sharp(src).metadata();
  let pipe = sharp(src);
  if (job.box) {
    // Trim the plate's own transparent margin away, fit what is left inside the box less
    // its margin, then pad back out to the box centred. Two passes rather than one
    // pipeline: sharp keeps only the last resize in a chain, so the fit and the pad have
    // to be separated by a buffer or the fit is silently discarded.
    const [bw, bh] = job.box;
    const inner = await sharp(src)
      .trim({ background: TRANSPARENT, threshold: 0 })
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
  for (const j of skipped) console.log(`  ${path.relative(root, path.join(j.root || SRC, j.in))}`);
}

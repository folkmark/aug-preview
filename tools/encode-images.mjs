// Re-encodes the page's photographic and decorative art from the originals in
// project/renders/sources into the sized WebP the site actually ships. Sharp is not
// a repo dependency and CI never runs this — the encoded files are committed:
//
//   npm i --no-save sharp && node tools/encode-images.mjs
//
// The originals were dropped in as received: 24-bit PNGs of soft-shaded 3D renders,
// and headshots ranging from a 300-DPI print export down to a 190px thumbnail. Every
// target below is set from the box the image actually occupies, at roughly three
// device pixels per CSS pixel, which is what a phone at DPR 3 can resolve and no
// more. The approach frames have their own encoder, tools/encode-approach.mjs.

import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'project/renders/sources');
const OUT = path.join(root, 'assets');

// width: the target in real pixels. The comment on each is the box it renders into.
const JOBS = [
  // Hero kit, decorative and aria-hidden, drifting behind the headline at 5-22% of
  // the viewport — 86 CSS px at the very widest on a phone.
  { in: 'blocks/arc-sage.png',      out: 'blocks/arc-sage.webp',      width: 512, alpha: true },
  { in: 'blocks/arch-blue.png',     out: 'blocks/arch-blue.webp',     width: 512, alpha: true },
  { in: 'blocks/brick-sage.png',    out: 'blocks/brick-sage.webp',    width: 384, alpha: true },
  { in: 'blocks/column-maple.png',  out: 'blocks/column-maple.webp',  width: 256, alpha: true },
  { in: 'blocks/quarter-maple.png', out: 'blocks/quarter-maple.webp', width: 320, alpha: true },
  { in: 'blocks/ramp-maple.png',    out: 'blocks/ramp-maple.webp',    width: 448, alpha: true },

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
  { in: 'team/ryan-baker.png',     out: 'team/ryan-baker.webp',     width: 512, square: true }
];

let before = 0, after = 0;
for (const job of JOBS) {
  const src = path.join(SRC, job.in);
  const dst = path.join(OUT, job.out);
  fs.mkdirSync(path.dirname(dst), { recursive: true });

  const meta = await sharp(src).metadata();
  const pipe = sharp(src);
  // Never enlarge: withoutEnlargement keeps the two small headshots at their own
  // size rather than fabricating pixels.
  if (job.square) {
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
  const soft = wrote.width < job.width ? '  (source too small — ships soft)' : '';
  console.log(
    `${job.out.padEnd(34)} ${String(meta.width) + 'x' + meta.height} ${(src_b / 1024).toFixed(0)}KB` +
    ` -> ${wrote.width}x${wrote.height} ${(info.size / 1024).toFixed(0)}KB${soft}`
  );
}
console.log(`\n${(before / 1048576).toFixed(2)} MB -> ${(after / 1024).toFixed(0)} KB`);

// Encodes the Approach render plates from project/renders/approach-desk into the
// alpha WebP frames the page scrubs. Sharp is not a repo dependency and CI never
// runs this — the encoded frames are committed:
//
//   npm i --no-save sharp && node tools/encode-approach.mjs
//
// Frames are named by their Blender frame number so the file, the timeline marker
// in project/scratch/approach-render-map.md, and ARCH_FRAMES in index.html all
// agree. Add the remaining frames to FRAMES as they render.
//
// Beat frames carry the holds, where the image is motionless under copy, so they
// are encoded at the plate's native size. Anything else is a move frame: it is
// only ever seen in passing, so it goes out at half width. alphaQuality stays at
// 100 for both — these composite over the cream page, and lossy alpha frays the
// thin desk legs into a halo.

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'project/renders/approach-desk');
const OUT = path.join(root, 'assets/approach');

const BEATS = [167, 235, 353, 477, 598, 672];
const FRAMES = [167, 235, 353, 477, 598, 672];

const pad4 = (n) => String(n).padStart(4, '0');

for (const n of FRAMES) {
  const src = path.join(SRC, `anim_desk_${pad4(n)}.png`);
  const beat = BEATS.indexOf(n) > -1;
  const out = path.join(OUT, `ap${pad4(n)}.webp`);

  // No colourspace conversion: Blender already wrote these view-transformed, so
  // the only step wanted is the 16-bit to 8-bit cast WebP forces anyway. A
  // linearise round-trip here would apply the transfer function twice.
  const pipe = sharp(src);
  if (!beat) pipe.resize({ width: 1024, kernel: 'lanczos3' });
  const info = await pipe
    .webp({ quality: beat ? 82 : 72, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(out);

  const meta = await sharp(out).metadata();
  if (!meta.hasAlpha) throw new Error(`${out} lost its alpha channel`);
  console.log(`ap${pad4(n)}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB${beat ? '  (beat)' : ''}`);

  // Beat frames double as the phone and reduced-motion stills, where the section
  // is read as a stack of images rather than scrubbed.
  if (beat) {
    const sOut = path.join(OUT, `ap${pad4(n)}s.webp`);
    const sInfo = await sharp(src)
      .resize({ width: 1200, kernel: 'lanczos3' })
      .webp({ quality: 78, alphaQuality: 100, effort: 6 })
      .toFile(sOut);
    console.log(`ap${pad4(n)}s.webp ${sInfo.width}x${sInfo.height}  ${(sInfo.size / 1024).toFixed(0)}KB  (still)`);
  }
}

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

// The mobile band's frame, in master pixels. Aspect 1147/888 = 1.2917; keep this in
// step with the aspect-ratio on [data-arch-box] in index.html or the band will
// letterbox. Top is 0 because the books come to rest 1.3% from the plate's top edge
// in the last beat; the bottom cut lands on the leg stubs, which nothing needs.
const CROP = { left: 426, top: 0, width: 1147, height: 888 };

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

  // The phone gets a tighter frame on the same plate. At phone width the arch
  // covers about a third of the full plate, which is why the four beats read as
  // four near-identical pictures of two desks — the blueprint, the half-built arch
  // and the loaded one are all too small to tell apart. This crop keeps the arch
  // and the inner edge of each desk, so it still reads as two desks with a gap.
  //
  // Centred on the arch (x 0.488), not on the plate: the plate's own centre would
  // slice the left desk's book stack. Cut at native size and never resized — the
  // master is 2048 wide, so 1147 is every real pixel there is, and an upscale here
  // would fray the alpha edges that alphaQuality:100 exists to keep clean.
  if (beat) {
    const mOut = path.join(OUT, `ap${pad4(n)}m.webp`);
    const mInfo = await sharp(src)
      .extract({ left: CROP.left, top: CROP.top, width: CROP.width, height: CROP.height })
      .webp({ quality: 80, alphaQuality: 100, effort: 6, smartSubsample: true })
      .toFile(mOut);
    const mMeta = await sharp(mOut).metadata();
    if (!mMeta.hasAlpha) throw new Error(`${mOut} lost its alpha channel`);
    console.log(`ap${pad4(n)}m.webp ${mInfo.width}x${mInfo.height}  ${(mInfo.size / 1024).toFixed(0)}KB  (mobile crop)`);
  }
}

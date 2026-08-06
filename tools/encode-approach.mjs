// Encodes the Approach plates into the alpha WebP frames the page scrubs, and writes
// the manifest the page and the build check both read. Sharp is not a repo dependency
// and CI never runs this — the encoded frames are committed:
//
//   npm i --no-save sharp && node tools/encode-approach.mjs
//
// Frames are named by their Blender frame number so the file, the timeline marker in
// project/scratch/approach-render-map.md, and the manifest all agree.
//
// Two masters, chosen per frame rather than per run. The six beats carry the holds,
// where the picture is motionless under copy for a screenful of scrolling, so they are
// encoded from the lossless 16-bit PNG plates and kept at native size. Everything
// between them is a move frame, seen only in passing, and comes from the q90 WebP
// archive at reduced size. Re-encoding a lossy master is a second generation, which is
// why the frames that get looked at do not take one.
//
// Alpha is where the bytes actually are, which is not obvious: in a move frame the
// colour costs ~14KB and the alpha channel ~24KB, because these plates are mostly
// transparent and WebP stores alpha losslessly by default. Chasing `quality` therefore
// does almost nothing — q72 to q62 moves a move frame by 5%.
//
// So beats and moves split on alpha too. Beats hold still under copy and keep
// alphaQuality 100. Moves drop to 70, which measures as free: composited over the page,
// a move frame goes from 40.2dB to 40.0dB PSNR with a *lower* maximum error and the same
// 0.02% of pixels off by more than 24. The "lossy alpha frays the thin desk legs into a
// halo" concern is real, but the cliff is at the bottom of the range — alphaQuality 0
// drops to 32.8dB and puts 1% of pixels over that threshold. 70 is nowhere near it.
//
// Note that no setting here can undo fraying that has already happened upstream — the
// WebP archive is -alpha_q 100 for that reason, so its alpha is intact and only its
// colour is lossy.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BEAT_SRC = path.join(root, 'project/renders/approach-desk');
const MOVE_SRC = path.join(root, 'project/renders/full-desk-anim-webp');
const OUT = path.join(root, 'assets/approach');

// Where the six beats come to rest. Fixed by the render, not by us.
const BEATS = [167, 235, 353, 477, 598, 672];

// Every frame that ships. Stride 5 across the beat span: the section never reaches
// outside 167-672, so frames either side of it are rendered but not encoded. At this
// stride a beat-to-beat move is 14-24 frames, which reads as motion rather than as a
// dissolve, and the whole sequence stays inside the byte budget below.
const STRIDE = 5;
const FRAMES = (() => {
  const out = new Set(BEATS);
  for (let n = BEATS[0]; n <= BEATS[BEATS.length - 1]; n += STRIDE) out.add(n);
  return [...out].sort((a, b) => a - b);
})();

// The master's size. Asserted rather than assumed: .extract() below cuts a fixed
// rectangle, so a master at another size either throws (too small) or silently crops
// the wrong region and produces a plausible, wrong picture (too large). The render map
// names an 8192x5728 Blender output, which is exactly that second case.
const MASTER = { w: 2048, h: 1432 };

// The mobile band's frame, in master pixels. Aspect 1147/888 = 1.2917; keep this in
// step with the aspect-ratio on [data-arch-box] in assets/approach.css or the band
// will letterbox. Top is 0 because the books come to rest 1.3% from the plate's top
// edge in the last beat; the bottom cut lands on the leg stubs, which nothing needs.
//
// Centred on the arch (x 0.488), not on the plate: the plate's own centre would slice
// the left desk's book stack.
const CROP = { left: 426, top: 0, width: 1147, height: 888 };

// Beats keep every real pixel there is. Moves are only seen while moving, so they go out
// smaller and cheaper — this, plus the alpha split above, is what keeps a hundred-frame
// sequence inside a couple of megabytes per cut.
//
// The mobile figure looks aggressive and is not: the band renders about 390 CSS pixels
// wide, so 512 is still supersampling it, and the frames a phone actually dwells on are
// the beats, which are cut at native 1147 and never resized.
const FULL_MOVE_W = 896;
const CROP_MOVE_W = 512;

// Applied to move frames only; beats take quality 82/80 at alphaQuality 100 below.
const MOVE_Q = 70;
const MOVE_ALPHA_Q = 70;

const pad4 = (n) => String(n).padStart(4, '0');

const beatMaster = (n) => path.join(BEAT_SRC, `anim_desk_${pad4(n)}.png`);
const moveMaster = (n) => path.join(MOVE_SRC, `anim_desk_76_${String(n).padStart(5, '0')}.webp`);

fs.mkdirSync(OUT, { recursive: true });

// Clear frames from a previous run so a shorter sequence cannot leave orphans behind
// that the build check would then happily find on disk.
//
// This is deliberately destructive up front rather than a sweep at the end: an
// interrupted run then leaves an obviously empty directory and the build fails on the
// next command, where sweeping afterwards would leave a directory of mixed-generation
// frames whose filenames all still match and whose quality silently disagrees. Loud and
// broken beats quiet and wrong. Re-run this; it is the only way to refill the directory.
for (const f of fs.readdirSync(OUT)) {
  if (/^ap\d{4}m?\.webp$/.test(f)) fs.unlinkSync(path.join(OUT, f));
}

let fullBytes = 0, cropBytes = 0;
// The size a move frame actually came out at, recorded rather than recomputed. The page
// budgets decoded memory as width x height x 4, and a move decodes several times smaller
// than a beat — so a manifest that only carried the beat size would have the page holding
// a fraction of what it had paid for.
let moveDims = null;

for (const n of FRAMES) {
  const beat = BEATS.indexOf(n) > -1;
  const src = beat ? beatMaster(n) : moveMaster(n);
  if (!fs.existsSync(src)) throw new Error(`missing master for frame ${n}: ${src}`);

  const meta = await sharp(src).metadata();
  if (meta.width !== MASTER.w || meta.height !== MASTER.h) {
    throw new Error(`frame ${n}: master is ${meta.width}x${meta.height}, expected ${MASTER.w}x${MASTER.h}`);
  }

  // No colourspace conversion. The plates are already view-transformed, so the only
  // step wanted is the cast to 8 bits that WebP forces anyway; a linearise round-trip
  // here would apply the transfer function twice.
  const fullPipe = sharp(src);
  if (!beat) fullPipe.resize({ width: FULL_MOVE_W, kernel: 'lanczos3' });
  const full = await fullPipe
    .webp({
      quality: beat ? 82 : MOVE_Q,
      alphaQuality: beat ? 100 : MOVE_ALPHA_Q,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(path.join(OUT, `ap${pad4(n)}.webp`));

  // The phone gets a tighter frame on the same plate. At phone width the arch covers
  // about a third of the full plate, which is why the beats otherwise read as
  // near-identical pictures of two desks — the blueprint, the half-built arch and the
  // loaded one are all too small to tell apart. This crop keeps the arch and the inner
  // edge of each desk, so it still reads as two desks with a gap.
  //
  // Every frame gets one, not just the beats: the phone scrubs the same sequence the
  // desktop does, and a move frame with no mobile cut is a 404 mid-scroll.
  const cropPipe = sharp(src).extract(CROP);
  if (!beat) cropPipe.resize({ width: CROP_MOVE_W, kernel: 'lanczos3' });
  const crop = await cropPipe
    .webp({
      quality: beat ? 80 : MOVE_Q,
      alphaQuality: beat ? 100 : MOVE_ALPHA_Q,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(path.join(OUT, `ap${pad4(n)}m.webp`));

  for (const [file, info] of [[`ap${pad4(n)}.webp`, full], [`ap${pad4(n)}m.webp`, crop]]) {
    const wrote = await sharp(path.join(OUT, file)).metadata();
    if (!wrote.hasAlpha) throw new Error(`${file} lost its alpha channel`);
    void info;
  }

  if (!beat && !moveDims) {
    moveDims = { full: { w: full.width, h: full.height }, crop: { w: crop.width, h: crop.height } };
  }

  fullBytes += full.size;
  cropBytes += crop.size;
  if (beat) console.log(`ap${pad4(n)}  beat  ${full.width}x${full.height} ${(full.size / 1024).toFixed(0)}KB  +  crop ${crop.width}x${crop.height} ${(crop.size / 1024).toFixed(0)}KB`);
}

// The page addresses frames by string concatenation from this list, so no literal
// reference to any of them exists in the markup for the build's src/href scan to find.
// The manifest is what the page reads at runtime and what tools/build-site.mjs checks
// against disk — the same arrangement the falling-blocks hero uses.
const manifest = {
  frames: FRAMES,
  beats: BEATS,
  stride: STRIDE,
  stem: 'ap',
  pad: 4,
  ext: 'webp',
  // Keyed by the variant suffix the filename carries; "" is the full plate. w/h are a
  // beat frame's pixel size in that cut — what the page uses to size its canvas and to
  // work out the band's aspect. moveW/moveH are what a move frame came out at, which the
  // page needs separately to budget decoded memory honestly.
  cuts: {
    '': { w: MASTER.w, h: MASTER.h, moveW: moveDims.full.w, moveH: moveDims.full.h },
    m: { w: CROP.width, h: CROP.height, moveW: moveDims.crop.w, moveH: moveDims.crop.h },
  },
  crop: CROP,
  master: MASTER,
  bytes: { full: fullBytes, crop: cropBytes },
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const mb = (b) => (b / 1048576).toFixed(2);
console.log(`\n${FRAMES.length} frames (${BEATS.length} beats, ${FRAMES.length - BEATS.length} moves)`);
console.log(`full cut  ${mb(fullBytes)} MB    mobile cut  ${mb(cropBytes)} MB`);

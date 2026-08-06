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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BEAT_SRC = path.join(root, 'project/renders/approach-desk');
const MOVE_SRC = path.join(root, 'project/renders/full-desk-anim-webp');
const OUT = path.join(root, 'assets/approach');

// Where the six beats come to rest. Fixed by the render, not by us.
const BEATS = [167, 235, 353, 477, 598, 672];

// Where the sequence opens, which is before the first beat rather than on it. Frames
// 91-167 are the books and blocks falling onto the desks — the "before" the whole rest
// of the section is a consequence of — and encoding from 167 meant the page opened on
// a still of the aftermath and the fall was never seen at all. The page plays this as
// its opening run; see the segment-0 note in assets/approach.js.
//
// 91 is the first frame the WebP archive holds, not a chosen in-point: the render map
// puts the books landing from f 77, so the first fourteen frames of the fall are in the
// Blender scene but not in the archive this encodes from. At 91 the desks are still
// bare, so nothing of the fall itself is missing — restore the archive further back and
// this can simply move.
const OPEN = 91;

// Every frame that ships. Stride 5 from the opening to the last beat: the section never
// reaches outside 91-672, so frames either side of it are rendered but not encoded. At
// this stride a beat-to-beat move is 14-24 frames, which reads as motion rather than as
// a dissolve, and the whole sequence stays inside the byte budget below. The fall is no
// faster than the rest — it changes 2.0 grey levels per stride-5 step against the arch
// build's 2.6 — so it takes the same stride and needs no special case.
// The grid is anchored on the first beat and grown outward in both directions, rather
// than counted up from OPEN. Both give the same spacing, but counting up from OPEN
// renumbers every frame in the sequence the moment the in-point moves — restoring the
// archive back to f 77 would rewrite all 120 filenames for no change in content.
const STRIDE = 5;
const FRAMES = (() => {
  const out = new Set(BEATS);
  for (let n = BEATS[0]; n <= BEATS[BEATS.length - 1]; n += STRIDE) out.add(n);
  for (let n = BEATS[0] - STRIDE; n >= OPEN; n -= STRIDE) out.add(n);
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

// Beats keep every real pixel there is. Moves go out smaller, because they are seen in
// passing — but only a little smaller, and the earlier 896/512 was too little by a wide
// margin. A move frame is displayed at the same size as a beat, so at 896 it was carrying
// 44% of the beat's linear resolution into the same box: the section snapped between a
// sharp hold and a soft move every time it stopped, and the softness read as a property
// of the motion rather than of the file. That is the wrong thing to economise on in the
// one piece of artwork the whole site is built around.
//
// 1600 is the knee. Against the 2048 master, encoding a move at 896/1152/1280/1440/1600
// costs 23/31/35/42/47 KB, and by eye the difference from native closes at about 1600
// while 2048 doubles the decoded cost (11.2 MiB a frame against 6.8) for a difference
// that needs a crop tool to see.
//
// The mobile figure moves far less, and deliberately. The band renders about 390 CSS
// pixels wide, so 768 is 1:1 on a 2x phone and a 1.5x upscale on a 3x one — where 512
// was 2.3x — and that is most of the gain for a third of the bytes: at this width the
// mobile cut totals 3.6 MB against 4.9 at 896 and 2.5 at 512. Bandwidth is the scarce
// thing on the device with the smallest picture, and a phone is the one visitor who
// might be paying for these frames by the megabyte.
const FULL_MOVE_W = 1600;
const CROP_MOVE_W = 768;

// Applied to move frames only; beats take quality 82/80 at alphaQuality 100 below.
const MOVE_Q = 70;
const MOVE_ALPHA_Q = 70;

const pad4 = (n) => String(n).padStart(4, '0');

const beatMaster = (n) => path.join(BEAT_SRC, `anim_desk_${pad4(n)}.png`);
const moveMaster = (n) => path.join(MOVE_SRC, `anim_desk_76_${String(n).padStart(5, '0')}.webp`);

// The plates are kept off the repository — see .gitignore. Between them the lossless
// beat PNGs and the WebP move archive came to most of a 700 MB checkout, and the site
// serves neither: assets/approach/ holds the encoded frames and is committed.
for (const [dir, what] of [[BEAT_SRC, 'lossless beat plates'], [MOVE_SRC, 'WebP move archive']]) {
  if (fs.existsSync(dir)) continue;
  console.error(`No ${what} at ${path.relative(root, dir)}/

Restore the renders to that path to re-encode. This tool expects:

  project/renders/approach-desk/anim_desk_####.png          (beats, lossless)
  project/renders/full-desk-anim-webp/anim_desk_76_#####.webp  (moves, q90 archive)

Frame numbers are Blender frame numbers — see docs/approach-render-map.md.`);
  process.exit(1);
}

// Imported here rather than at the top so the missing-masters message above wins: sharp
// is not a repo dependency, and a bare ERR_MODULE_NOT_FOUND is a worse first thing to
// read than "restore the renders".
const sharp = await import('sharp').then((m) => m.default).catch(() => {
  console.error('sharp is not installed. Run:\n\n  npm i --no-save sharp\n');
  process.exit(1);
});

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

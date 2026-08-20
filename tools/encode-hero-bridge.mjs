// Encodes the hero bridge plates into the alpha WebP frames the hero scrubs, and writes
// the manifest the page and the build check both read. Sharp is not a repo dependency
// and CI never runs this — the encoded frames are committed:
//
//   npm i --no-save sharp && node tools/encode-hero-bridge.mjs
//
// Frames are named by their Blender frame number, so a file, docs/hero-bridge-render.md
// and the manifest all name the same thing. The stride is read off the directory rather
// than declared: this sequence was first delivered as every third frame and ships at
// every frame, and nothing here should have to change when the fuller set lands.
//
// This is not the Approach sequence and does not inherit its shape. That one was six
// beats with holds under copy, so it split every decision between a beat that is looked
// at and a move seen in passing. The hero is one continuous scrub with no holds, so
// every frame is a move and there is no second quality tier.
//
// What it does inherit is where the bytes are. Alpha is the expensive channel on these
// plates, not colour, because they are mostly transparent — see encode-approach.mjs for
// the measurements.
//
// It does NOT inherit that encoder's alphaQuality 70, and this is the one setting here
// most likely to be "simplified" back. Do not. These plates put a soft ground shadow in
// the alpha channel, so alpha now carries a smooth low-amplitude gradient and not just
// hard object edges. Lossy alpha posterises it into visible terraces — a topographic-map
// look across the floor. Measured on one scanline through the shadow on frame 417,
// counting distinct alpha levels and the longest flat run over 100 samples:
//
//   master  25 levels, longest run 10     <- the gradient as rendered
//   aq 70    5 levels, longest run 27     <- five plateaus. This is the failure.
//   aq 80   17 levels, longest run 17
//   aq 85   21 levels, longest run 11
//   aq 90   24 levels, longest run 11
//   aq 100  25 levels, longest run  7     <- faithful
//
// alphaQuality 70 was free on the Approach moves because their alpha was hard-edged and
// had no gradient to lose. Here it costs the shadow. And since 90 to 100 is 183KB to
// 187KB a frame — 2% — there is no reason to sit in between: lossless alpha it is, which
// is also what CLAUDE.md says the original masters used.
//
// Be aware what this buys and at what price: at lossless alpha the shadow is about 65%
// of every frame's bytes. Dropping it from the render, or moving it into an opaque
// backdrop, would cut the sequence to roughly a third of its size. That is an art call,
// not an encoder one.
//
// The widths are the hero's own, though, and the Approach section's numbers do not carry
// over. Its "1600 is the knee" was measured on the two-desk plates at ~47KB a frame; the
// same width on this render costs 78KB, because the server rack's grille mesh, cable
// bundles and LED rows hold far more detail than two desks did. Measured on frames 276 /
// 348 / 417, colour only, with clean alpha estimated at 15KB scaled by area:
//
//   1152 → 46KB    1280 → 54KB    1440 → 65KB    1600 → 78KB    2048 → 110KB
//
// At 142 frames that is 6.3 / 7.5 / 9.1 / 10.8 / 15.3 MB. 1600 is a deliberate choice to
// keep the artwork the site is built around sharp, made knowing it puts ~11MB above the
// fold — so the page's job is progressive loading, not a smaller number here.
//
// The mobile cut is a plain downscale, not a crop, and that is the opposite of what the
// Approach section did. It cropped because at phone width its arch covered about a third
// of the plate and the beats read as near-identical pictures of two desks. This
// composition cannot: measured across the delivered frames the content spans x 0.004 to
// 0.959 of the plate, because blocks fly in from the top and the right for the whole
// sequence. A crop tight enough to help would clip them, and blocks falling into place
// is the animation. 1200 matches the width the hero already ships for its placeholder
// still, assets/images/hero-bridge-m.webp.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'project/renders/hero-bridge');
const OUT = path.join(root, 'assets/hero-bridge');

// Asserted rather than assumed. Everything below resizes by width and lets height
// follow, so a master at another size does not throw — it silently produces a
// differently-shaped sequence whose manifest then misreports the canvas the page sizes
// itself from. The render map names an 8192x5728 Blender output, which is exactly that.
const MASTER = { w: 2048, h: 1432 };

const FULL_W = 1600;
const CROP_W = 1200;

// One tier, because there are no holds to be compared against. See the header.
const Q = 70;
// Lossless. The plates carry a gradient in alpha; anything below this terraces it.
const ALPHA_Q = 100;

const pad4 = (n) => String(n).padStart(4, '0');

if (!fs.existsSync(SRC)) {
  console.error(`No hero bridge plates at ${path.relative(root, SRC)}/

Restore the render to that path to re-encode. This tool expects:

  project/renders/hero-bridge/<name>#####.png     2048x1432 RGBA

Frame numbers are Blender frame numbers — see docs/hero-bridge-render.md.`);
  process.exit(1);
}

// Read the grid off disk rather than declaring it, so the every-third delivery and the
// every-frame one both encode without an edit here. Sorted numerically, not by filename:
// a lexical sort is right only while the padding is uniform, and silently wrong after.
const plates = fs.readdirSync(SRC)
  .filter((f) => /\.png$/i.test(f) && /(\d+)\.png$/i.test(f))
  .map((f) => ({ f, n: Number(f.match(/(\d+)\.png$/i)[1]) }))
  .sort((a, b) => a.n - b.n);

if (!plates.length) {
  console.error(`No numbered PNG plates in ${path.relative(root, SRC)}/`);
  process.exit(1);
}

// Imported here rather than at the top so the missing-plates message above wins: sharp
// is not a repo dependency, and a bare ERR_MODULE_NOT_FOUND is a worse first thing to
// read than "restore the render".
const sharp = await import('sharp').then((m) => m.default).catch(() => {
  console.error('sharp is not installed. Run:\n\n  npm i --no-save sharp\n');
  process.exit(1);
});

fs.mkdirSync(OUT, { recursive: true });

// Clear frames from a previous run so a shorter sequence cannot leave orphans behind
// that the build check would then happily find on disk. Deliberately destructive up
// front rather than a sweep at the end: an interrupted run leaves an obviously empty
// directory and the build fails on the next command, where sweeping afterwards would
// leave a directory of mixed-generation frames whose filenames all still match and whose
// quality silently disagrees. Loud and broken beats quiet and wrong.
for (const f of fs.readdirSync(OUT)) {
  if (/^hb\d{4}m?\.webp$/.test(f)) fs.unlinkSync(path.join(OUT, f));
}

// The shadow's share of the bytes, reported rather than assumed, because it is the
// single biggest thing about this sequence's weight and it is invisible in the output.
// Measured by re-encoding one frame without its alpha channel and taking the difference:
// at lossless alpha the shadow and the plate's soft edges together come to about 65% of
// each frame. Worth printing every run, so that if the render ever comes back without a
// shadow the drop is noticed rather than quietly enjoyed.
const alphaShare = async (file) => {
  const opts = { quality: Q, alphaQuality: ALPHA_Q, effort: 6, smartSubsample: true };
  const withA = await sharp(file).resize({ width: FULL_W, kernel: 'lanczos3' }).webp(opts).toBuffer();
  const noA = await sharp(file).resize({ width: FULL_W, kernel: 'lanczos3' })
    .removeAlpha().webp({ quality: Q, effort: 6, smartSubsample: true }).toBuffer();
  return (withA.length - noA.length) / withA.length;
};

let fullBytes = 0, cropBytes = 0, dims = null;

for (const { f, n } of plates) {
  const src = path.join(SRC, f);

  const meta = await sharp(src).metadata();
  if (meta.width !== MASTER.w || meta.height !== MASTER.h) {
    throw new Error(`frame ${n}: master is ${meta.width}x${meta.height}, expected ${MASTER.w}x${MASTER.h}`);
  }

  // No colourspace conversion. The plates are already view-transformed, so the only step
  // wanted is the cast to 8 bits that WebP forces anyway; a linearise round-trip here
  // would apply the transfer function twice.
  const opts = { quality: Q, alphaQuality: ALPHA_Q, effort: 6, smartSubsample: true };

  const full = await sharp(src).resize({ width: FULL_W, kernel: 'lanczos3' })
    .webp(opts).toFile(path.join(OUT, `hb${pad4(n)}.webp`));
  const crop = await sharp(src).resize({ width: CROP_W, kernel: 'lanczos3' })
    .webp(opts).toFile(path.join(OUT, `hb${pad4(n)}m.webp`));

  for (const file of [`hb${pad4(n)}.webp`, `hb${pad4(n)}m.webp`]) {
    const wrote = await sharp(path.join(OUT, file)).metadata();
    if (!wrote.hasAlpha) throw new Error(`${file} lost its alpha channel`);
  }

  if (!dims) dims = { full: { w: full.width, h: full.height }, crop: { w: crop.width, h: crop.height } };
  fullBytes += full.size;
  cropBytes += crop.size;
}

const frames = plates.map((p) => p.n);

// The page addresses frames by string concatenation from this list, so no literal
// reference to any of them exists in the markup for the build's src/href scan to find.
// The manifest is what the page reads at runtime, following the same arrangement the
// Approach sequence and the falling-blocks hero both use.
//
// Note what is still missing: tools/build-site.mjs checks those two manifests against
// disk and does not yet check this one, so a frame promised here and absent on disk
// currently fails in a browser rather than at build time. Add the check when the hero
// starts reading this manifest.
const manifest = {
  frames,
  stem: 'hb',
  pad: 4,
  ext: 'webp',
  // Keyed by the variant suffix the filename carries; "" is the full plate. Both cuts are
  // the whole plate at different widths, so w/h are the encoded size and there is no
  // separate move size to carry — unlike the Approach manifest, which had two tiers.
  cuts: {
    '': { w: dims.full.w, h: dims.full.h },
    m: { w: dims.crop.w, h: dims.crop.h },
  },
  master: MASTER,
  bytes: { full: fullBytes, crop: cropBytes },
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const mb = (b) => (b / 1048576).toFixed(2);
const first = plates[0], last = plates[plates.length - 1];
const steps = [...new Set(frames.slice(1).map((n, i) => n - frames[i]))];

console.log(`${frames.length} frames  ${first.n}..${last.n}  step ${steps.length === 1 ? steps[0] : steps.join('/')}`);
console.log(`full cut  ${dims.full.w}x${dims.full.h}  ${mb(fullBytes)} MB  (${(fullBytes / frames.length / 1024).toFixed(0)} KB/frame)`);
console.log(`mobile    ${dims.crop.w}x${dims.crop.h}  ${mb(cropBytes)} MB  (${(cropBytes / frames.length / 1024).toFixed(0)} KB/frame)`);

const share = await alphaShare(path.join(SRC, first.f));
console.log(`\nalpha is ${(share * 100).toFixed(0)}% of each frame — the ground shadow. Encoded lossless`);
console.log(`(alphaQuality ${ALPHA_Q}); anything lower terraces it. See the header, and`);
console.log(`docs/hero-bridge-render.md for what dropping the shadow would save.`);

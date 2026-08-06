// Encodes the falling-block render plates from "Falling Blocks" into the alpha WebP
// the page can scrub. Sharp is not a repo dependency and CI never runs this — the
// encoded frames are committed:
//
//   npm i --no-save sharp && node tools/encode-falling-blocks.mjs
//
// Two layers, 48 frames each, rendered as the top and bottom halves of one tall
// 2560x3840 plate so they can be parallaxed against each other. Frame numbers are
// preserved from the render (VL_NEAR_00001.png -> fb0001.webp) so a file, a source
// plate and any future FALL_FRAMES list in index.html all agree.
//
// Frames are encoded at native size. Every other encoder here sizes to the box the
// image renders into, but nothing in index.html references these yet, so there is no
// box to size against — and guessing one now would bake a downscale into the only
// copy the page ships. The plates are mostly empty, so full resolution still lands
// near 70KB a frame; set WIDTH below once the layout exists and re-run.
//
// alphaQuality stays at 100: these composite over the cream page, and lossy alpha
// frays the block edges into a halo. No colourspace conversion either — Blender
// wrote these view-transformed 8-bit sRGB, so there is nothing to convert.

import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'Falling Blocks');
const OUT = path.join(root, 'assets/falling-blocks');

// Source folder -> the layer name the page will address it by.
const LAYERS = [
  { in: 'FallingBlocks_Top', out: 'top' },
  { in: 'FallingBlocks_Bottom', out: 'bottom' }
];

// null means native. A number resizes to that width, never enlarging.
const WIDTH = null;

// Sharp releases the event loop while libvips works, so a small pool keeps all four
// cores busy without holding 96 decoded 2560x3840 plates in memory at once.
const POOL = 4;

const pad4 = (n) => String(n).padStart(4, '0');

// Frames come off disk rather than a hardcoded list: the render is complete, and a
// dropped-in frame should encode without also editing this file.
const jobs = LAYERS.flatMap(({ in: dir, out: layer }) => {
  const from = path.join(SRC, dir);
  fs.mkdirSync(path.join(OUT, layer), { recursive: true });
  return fs.readdirSync(from)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((file) => {
      const frame = Number(file.match(/(\d+)\.png$/i)?.[1]);
      if (!Number.isInteger(frame)) throw new Error(`${dir}/${file} has no frame number`);
      return { layer, frame, src: path.join(from, file), dst: path.join(OUT, layer, `fb${pad4(frame)}.webp`) };
    })
    .sort((a, b) => a.frame - b.frame);
});

async function encode(job) {
  const meta = await sharp(job.src).metadata();
  const pipe = sharp(job.src);
  if (WIDTH) pipe.resize({ width: WIDTH, withoutEnlargement: true, kernel: 'lanczos3' });
  const info = await pipe
    .webp({ quality: 82, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(job.dst);

  const wrote = await sharp(job.dst).metadata();
  if (!wrote.hasAlpha) throw new Error(`${job.dst} lost its alpha channel`);
  if (wrote.width !== info.width || wrote.height !== info.height) throw new Error(`${job.dst} wrote short`);
  return { ...job, src_b: fs.statSync(job.src).size, out_b: info.size, meta, wrote };
}

const queue = jobs.slice();
const done = [];
await Promise.all(Array.from({ length: POOL }, async () => {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const r = await encode(job);
    done.push(r);
    console.log(
      `${(r.layer + '/fb' + pad4(r.frame) + '.webp').padEnd(24)} ${r.meta.width}x${r.meta.height}` +
      ` ${(r.src_b / 1048576).toFixed(2)}MB -> ${r.wrote.width}x${r.wrote.height} ${(r.out_b / 1024).toFixed(0)}KB`
    );
  }
}));

const before = done.reduce((n, r) => n + r.src_b, 0);
const after = done.reduce((n, r) => n + r.out_b, 0);
console.log(
  `\n${done.length} frames  ${(before / 1048576).toFixed(0)} MB -> ${(after / 1048576).toFixed(1)} MB` +
  `  (${(100 - (after / before) * 100).toFixed(1)}% smaller)`
);

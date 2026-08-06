// Encodes the falling-block render plates from "Falling Blocks" into the alpha WebP
// the hero scrubs, and writes the manifest that tools/build-site.mjs verifies the
// page against. Sharp is not a repo dependency and CI never runs this — the encoded
// frames are committed:
//
//   npm i --no-save sharp && node tools/encode-falling-blocks.mjs
//
// Two layers, 48 frames each. They are not halves of a taller picture: both are the
// full 2560x3840 camera view, and they differ by depth — "bottom" carries the far and
// mid planes (9 blocks) and sits behind the hero copy, "top" carries the near plane
// (5 blocks) and passes in front of it. They register 1:1, so anything that scales or
// positions one must do the same to the other.
//
// The sequence is a seamless rotation loop: the blocks turn in place and never
// travel, and frame 48 steps into frame 1 with a pixel delta 0.99x the size of a
// normal adjacent step. Nothing downstream needs a crossfade at the wrap, and the
// falling is produced in the browser by translating the plates.
//
// Frame numbers are preserved from the render (VL_NEAR_00001.png -> fb0001.webp) so a
// file, a source plate and the manifest all agree.
//
// alphaQuality stays at 100: these composite over the cream page, and lossy alpha
// frays the block rims into a halo. No colourspace conversion either — Blender wrote
// these view-transformed 8-bit sRGB with no ICC profile, so there is nothing to
// convert.

import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'Falling Blocks');
const OUT = path.join(root, 'assets/falling-blocks');

// Source folder -> the layer name the page addresses it by.
const LAYERS = [
  { in: 'FallingBlocks_Top', out: 'top' },
  { in: 'FallingBlocks_Bottom', out: 'bottom' }
];

// The widths that ship, each into its own w<width> directory so adding a tier is a
// pure addition and never moves an existing file.
//
// 2560 is deliberately gone. The runtime sizes each canvas backing store to the
// source frame rather than to the display box times a device pixel ratio, so a
// device pixel ratio never multiplies what is held — which means the extra pixels
// had nothing to land on. They were also unaffordable: a 2560 frame decodes to
// 37.5MiB, so a 256MiB budget holds three of them per plate and the nearest-frame
// substitution would fire constantly. The 2560 masters stay as the PNGs in
// "Falling Blocks", which is the archive.
const WIDTHS = [1280];

const MASTER = { w: 2560, h: 3840 };
const ENCODER = { quality: 82, alphaQuality: 100, effort: 6, smartSubsample: true };

// Sharp releases the event loop while libvips works, so a small pool keeps all four
// cores busy without holding many decoded 2560x3840 plates in memory at once.
const POOL = 4;

const pad4 = (n) => String(n).padStart(4, '0');

// Rebuilt from scratch each run: a width dropped from WIDTHS has to stop shipping,
// and a tier left behind from a previous encode would still pass every check below
// while quietly doubling the deploy.
fs.rmSync(OUT, { recursive: true, force: true });

// Frames come off disk rather than a hardcoded list: the render is complete, and a
// dropped-in frame should encode without also editing this file.
const read = LAYERS.map(({ in: dir, out: layer }) => {
  const from = path.join(SRC, dir);
  const frames = fs.readdirSync(from)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((file) => {
      const frame = Number(file.match(/(\d+)\.png$/i)?.[1]);
      if (!Number.isInteger(frame)) throw new Error(`${dir}/${file} has no frame number`);
      return { frame, src: path.join(from, file) };
    })
    .sort((a, b) => a.frame - b.frame);
  return { layer, frames };
});

// Parity gate, before a single file is written. Two layers of different length desync
// the composite on every frame after the shorter one runs out, and two layers of
// different size cannot register — both are unrecoverable at runtime and invisible
// until someone looks closely, so they stop the encode instead.
const counts = read.map((r) => `${r.layer}:${r.frames.length}`);
if (new Set(read.map((r) => r.frames.length)).size !== 1) {
  throw new Error(`layers have different frame counts (${counts.join(', ')}) — they would desync every frame`);
}
for (const { layer, frames } of read) {
  const want = frames.map((f) => f.frame);
  const holes = want.filter((n, i) => n !== i + 1);
  if (holes.length) throw new Error(`${layer} frame numbers are not a contiguous 1..${want.length} run`);
  for (const f of frames) {
    const m = await sharp(f.src).metadata();
    if (m.width !== MASTER.w || m.height !== MASTER.h) {
      throw new Error(`${f.src} is ${m.width}x${m.height}, not ${MASTER.w}x${MASTER.h} — the plates would not register`);
    }
    if (!m.hasAlpha) throw new Error(`${f.src} has no alpha channel`);
  }
}
const FRAMES = read[0].frames.length;

const jobs = WIDTHS.flatMap((width) =>
  read.flatMap(({ layer, frames }) => {
    fs.mkdirSync(path.join(OUT, `w${width}`, layer), { recursive: true });
    return frames.map(({ frame, src }) => ({
      width, layer, frame, src,
      dst: path.join(OUT, `w${width}`, layer, `fb${pad4(frame)}.webp`)
    }));
  })
);

async function encode(job) {
  const info = await sharp(job.src)
    .resize({ width: job.width, withoutEnlargement: true, kernel: 'lanczos3' })
    .webp(ENCODER)
    .toFile(job.dst);

  // Read the file back rather than trusting the write: a frame that lost its alpha
  // composites as an opaque rectangle over the page, and one corner sample catches
  // both that and a matte baked in behind the transparency.
  const wrote = await sharp(job.dst).metadata();
  if (!wrote.hasAlpha) throw new Error(`${job.dst} lost its alpha channel`);
  if (wrote.width !== info.width || wrote.height !== info.height) throw new Error(`${job.dst} wrote short`);
  const raw = await sharp(job.dst).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info: ri } = raw;
  const corner = [0, (ri.width - 1) * 4, (ri.height - 1) * ri.width * 4, (ri.height * ri.width - 1) * 4];
  for (const o of corner) {
    if (data[o + 3] !== 0) throw new Error(`${job.dst} has an opaque corner — the plate is matted, not transparent`);
  }
  return { ...job, out_b: info.size, wrote };
}

const queue = jobs.slice();
const done = [];
await Promise.all(Array.from({ length: POOL }, async () => {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const r = await encode(job);
    done.push(r);
    console.log(
      `w${r.width}/${r.layer}/fb${pad4(r.frame)}.webp`.padEnd(32) +
      ` ${r.wrote.width}x${r.wrote.height} ${(r.out_b / 1024).toFixed(0)}KB`
    );
  }
}));

// Written from what actually landed on disk, never from the constants above: a tier
// that failed halfway has to be visible here as a short frame count, and
// tools/build-site.mjs is what turns that into a failed build rather than a blank
// plate in the browser.
const manifest = {
  frames: FRAMES,
  first: 1,
  pad: 4,
  stem: 'fb',
  ext: 'webp',
  layers: LAYERS.map((l) => l.out).sort(),
  master: MASTER,
  encoder: ENCODER,
  widths: WIDTHS.map((w) => {
    const rows = done.filter((r) => r.width === w);
    return {
      w,
      h: Math.round((w * MASTER.h) / MASTER.w),
      files: rows.length,
      bytes: rows.reduce((n, r) => n + r.out_b, 0)
    };
  })
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const after = done.reduce((n, r) => n + r.out_b, 0);
const before = read.reduce((n, r) => n + r.frames.reduce((m, f) => m + fs.statSync(f.src).size, 0), 0);
console.log(
  `\n${FRAMES} frames x ${LAYERS.length} layers x ${WIDTHS.length} width(s) = ${done.length} files` +
  `\n${(before / 1048576).toFixed(0)} MB of master PNG -> ${(after / 1048576).toFixed(1)} MB of WebP`
);
for (const t of manifest.widths) {
  console.log(`  w${t.w}  ${t.files} files  ${(t.bytes / 1048576).toFixed(2)} MB  ${(t.bytes / t.files / 1024).toFixed(0)} KB/frame`);
}

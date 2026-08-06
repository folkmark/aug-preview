// Converts the design system's Avenir OTFs to WOFF2. Not a repo dependency and CI
// never runs this — the converted files are committed:
//
//   npm i --no-save wawoff2 && node tools/encode-fonts.mjs
//
// WOFF2 wraps the same CFF outlines in Brotli, so this is lossless and roughly
// halves what every page pulls before it can render text. The italic faces are not
// converted: the site renders no italic text at all, so no browser ever matches
// them — they stay in project/ with the originals.

import { compress } from 'wawoff2';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = fs.readdirSync(path.join(root, '_ds')).find((d) => d.startsWith('augmented-design-system-'));
const DIR = path.join(root, '_ds', DS, 'assets/fonts');

const FACES = [
  'AvenirLTPro-Light', 'AvenirLTPro-Book', 'AvenirLTPro-Roman',
  'AvenirLTPro-Medium', 'AvenirLTPro-Heavy', 'AvenirLTPro-Black'
];

let before = 0, after = 0;
for (const face of FACES) {
  const src = path.join(DIR, face + '.otf');
  if (!fs.existsSync(src)) { console.log(`${face}: no .otf, skipping`); continue; }
  const buf = fs.readFileSync(src);
  const out = Buffer.from(await compress(buf));
  fs.writeFileSync(path.join(DIR, face + '.woff2'), out);
  before += buf.length; after += out.length;
  console.log(`${face.padEnd(24)} ${(buf.length / 1024).toFixed(0)}KB -> ${(out.length / 1024).toFixed(0)}KB  (${Math.round(out.length / buf.length * 100)}%)`);
}
console.log(`\n${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`);

// The image sequences' frame lists, and what must never be published.
//
// Three components address their frames by string concatenation — a base the page carries
// as an attribute, and numbers and cuts the encoder wrote into a manifest beside the frames
// — so no src or href anywhere names a single frame, and nothing that scans markup can see
// them. Two tools need the list anyway: tools/build-site.mjs, which checks every frame the
// page will ask for is on disk, and tools/build-wp-plugin.mjs, which ships exactly those
// frames and no others inside the WordPress plugin. Both read it from here, so the plugin
// cannot ship a sequence the site's own check would have failed.
import fs from 'node:fs';
import path from 'node:path';

// WHAT IS NEVER PUBLISHED. See copyDir() in build-site.mjs for why each entry is here; the
// plugin's packager asserts none of these ends up in the zip either.
//   - the design system's dev files and its .otf sources (only the .woff2 are loaded);
//   - the parked Approach scrub's code and frames, while <approach-scrub> is off the page.
//     Keyed to the element rather than listed as dead, so mounting it again ships its
//     files again with no second edit. The four cyc0* thumbnails in assets/approach/ are
//     the cycle wheel's, used on every page, and are not matched.
export function unserved(homeHtml) {
  const approachMounted = /<approach-scrub\b/.test(homeHtml.replace(/<!--[\s\S]*?-->/g, ''));
  return [
    /^_ds\/[^/]+\/(_adherence\.oxlintrc\.json|_ds_manifest\.json|readme\.md)$/,
    /^_ds\/.*\.otf$/,
    ...(approachMounted ? [] : [/^assets\/approach\.(js|css)$/, /^assets\/approach\/(ap\d{4}m?\.webp|manifest\.json)$/]),
  ];
}

// A manifest, or the reason there is not one. `tool` names the encoder to rerun.
export function readManifest(root, rel, tool, problems) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    problems.push(`${rel} is missing — run ${tool}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    problems.push(`${rel} is not readable JSON`);
    return null;
  }
}

const attrOf = (attrs) => (k) => (attrs.match(new RegExp(k + '="([^"]*)"')) || [, ''])[1];

// Every frame a <hero-bridge> plays, in every cut, plus its manifest.
//
// What is different here is from/to. The page plays a span of the manifest rather than all
// of it — only part of this sequence carries the ground shadow, see the hero comment in
// index.html — so the span is what gets checked, and the span itself is checked against
// the manifest first. A from or to naming a frame the encoder never produced is the mistake
// this is really here to catch: it costs nothing at runtime, because the element simply
// filters it away and scrubs a shorter sequence, and it would ship a hero quietly missing
// its opening or its closing frames with nothing 404-ing to say so.
export function heroFrames(attrs, m, problems) {
  const attr = attrOf(attrs);
  const base = attr('base');
  const out = [];
  if (!base) {
    problems.push('hero-bridge has no base attribute');
    return out;
  }
  // Absent bounds mean the whole manifest, which is what the element does with them.
  const from = attr('from') === '' ? -Infinity : Number(attr('from'));
  const to = attr('to') === '' ? Infinity : Number(attr('to'));
  for (const edge of ['from', 'to']) {
    const v = Number(attr(edge));
    if (attr(edge) !== '' && !m.frames.includes(v)) {
      problems.push(`hero-bridge ${edge}="${attr(edge)}" is not a frame the manifest encoded`);
    }
  }
  const played = m.frames.filter((n) => n >= from && n <= to);
  if (played.length < 2) {
    problems.push(`hero-bridge plays ${played.length} of the manifest's ${m.frames.length} frames — that is a still, not a sequence`);
  }
  for (const n of played) {
    for (const v of Object.keys(m.cuts)) {
      out.push(base + m.stem + String(n).padStart(m.pad, '0') + v + '.' + m.ext);
    }
  }
  out.push(base + 'manifest.json');
  return out;
}

// Every frame of a mounted <approach-scrub>, in every cut, plus its manifest.
export function approachFrames(attrs, m, problems) {
  const base = attrOf(attrs)('base');
  const out = [];
  if (!base) {
    problems.push('approach-scrub has no base attribute');
    return out;
  }
  for (const n of m.frames) {
    for (const v of Object.keys(m.cuts)) {
      out.push(base + m.stem + String(n).padStart(m.pad, '0') + v + '.' + m.ext);
    }
  }
  out.push(base + 'manifest.json');
  return out;
}

// Every frame of a <falling-blocks>, after checking the page and the manifest agree.
//
// widths: 'page' checks and lists the one tier the page names in its width attribute,
// which is what build-site.mjs verifies. 'all' lists every tier the manifest encoded,
// which is what has to SHIP: falling-blocks.js reads the tier it plays from the
// stylesheet's --fb-tier, per viewport (w720 on a phone), so the page never names it. The
// manifest itself is the encoder's record and is never fetched, so it does not ship.
export function fallingFrames(attrs, m, problems, widths = 'page') {
  const attr = attrOf(attrs);
  const base = attr('base');
  const frames = Number(attr('frames'));
  const layers = attr('layers').split(',').map((s) => s.trim()).filter(Boolean).sort();
  const width = Number(attr('width'));
  const out = [];
  if (frames !== m.frames) {
    problems.push(`falling-blocks asks for ${frames} frames but the manifest encoded ${m.frames}`);
  }
  if (layers.join() !== [...m.layers].sort().join()) {
    problems.push(`falling-blocks asks for layers ${layers.join()} but the manifest encoded ${m.layers.join()}`);
  }
  if (!m.widths.some((t) => t.w === width)) {
    problems.push(`falling-blocks asks for width ${width}, which the manifest did not encode`);
    return out;
  }
  for (const w of widths === 'all' ? m.widths.map((t) => t.w) : [width]) {
    for (const layer of m.layers) {
      for (let i = m.first; i < m.first + m.frames; i++) {
        out.push(`${base}w${w}/${layer}/${m.stem}${String(i).padStart(m.pad, '0')}.${m.ext}`);
      }
    }
  }
  return out;
}

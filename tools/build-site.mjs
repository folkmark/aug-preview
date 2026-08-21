// Assembles the publishable site.
//
// The pages all render from one bundle (index.html), so this emits a real file
// per route — the/slug/index.html — with its own <title> and description and
// its relative references pushed up one level. A direct link, a refresh or a
// crawler then gets that page from the server with a 200, and the router in
// index.html picks the same page up from location.pathname on boot.
//
//   node tools/build-site.mjs [outDir] [basePath]
//
// basePath is only needed for 404.html, which is served from arbitrary URLs and
// so cannot use relative paths. It defaults to "/".

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outDir = path.resolve(root, process.argv[2] || '_site');
const basePath = ('/' + (process.argv[3] || '').replace(/^\/+|\/+$/g, '') + '/').replace(/^\/+/, '/');

// Kept in step with ROUTES and TITLES in index.html.
const PAGES = [
  {
    slug: 'challenge',
    title: 'The Challenge | AugmentED',
    description:
      'AI is arriving in classrooms whether schools are ready or not. The danger is that some are rushing in without asking what AI can do well, what teachers uniquely bring, or what students actually need.',
  },
  {
    slug: 'approach',
    title: 'Our Approach | AugmentED',
    description:
      'We believe better educational AI will emerge from discovering what classrooms actually need, building solutions with real educators and students, and testing them in real classrooms.',
  },
  {
    slug: 'team',
    title: 'Who We Are | AugmentED',
    description:
      'AugmentED brings together people from classrooms, research labs, and engineering teams who share a conviction that AI should augment human teaching, not replace it.',
  },
  {
    slug: 'follow',
    title: 'Follow Our Work | AugmentED',
    description: 'Get updates on AugmentED’s work and research findings.',
  },
];

const COPY_FILES = ['support.js'];
const COPY_DIRS = ['assets', '_ds'];

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Rewrite the head of a copy so each page carries its own title and description
// rather than inheriting the home page's.
function retitle(html, { title, description }) {
  const t = escapeAttr(title);
  const d = escapeAttr(description);
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(">)/, `$1${d}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${d}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${t}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${d}$2`);
}

// Every reference into assets/, _ds/ and support.js is made absolute against the base
// the site is mounted at. Relative paths cannot work here, and the reason is the router
// rather than the directory layout: go() calls history.pushState to move the URL to
// /team/ and then re-renders, but the markup React renders still carries the relative
// paths of the file the visitor actually loaded. A browser resolves a relative src
// against the document URL at the moment the element is created, which pushState has
// just changed — so a visitor who lands on / and clicks through to the team page asks
// for /team/assets/team/*.webp and gets a grid of broken images that heal on reload,
// the reload being the first time the served file's paths and the URL agree.
//
// Writing each file for its own depth cannot fix that: after a client-side navigation
// the document URL and the markup come from two different pages, so no single relative
// prefix is right for both. Absolute is, at every depth and on every route. 404.html
// already had to be built this way, being served from whatever URL was missed; the
// router puts every page in the same position.
//
// A <base> tag would do this in one line but would also re-point the page's
// url(#gradient) and <use href="#id"> references at the base URL, which breaks the SVG
// artwork.
//
// The leading character class earns both of its additions. It carries whitespace, comma
// and "(" so srcset candidates after the first — which follow ", " rather than a quote —
// and any unquoted url(assets/...) are caught; the hero's srcset was being half-rewritten
// and 404ing its 2400w plate. And it excludes "/", so an already-absolute /assets/ is
// never rewritten a second time into //assets/, which a browser reads as
// protocol-relative and sends to an entirely different host.
function absolutise(html) {
  return html
    .replace(/(["'\s,(])assets\//g, `$1${basePath}assets/`)
    .replace(/(["'\s,(])_ds\//g, `$1${basePath}_ds/`)
    .replace(/(["'])\.\/support\.js\1/g, `$1${basePath}support.js$1`);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

// ---------------------------------------------------------------- build

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// The root file gets the same treatment as the routes. It is the one the bug starts
// from: land here, click any nav item, and its relative paths follow you one level down.
fs.writeFileSync(path.join(outDir, 'index.html'), absolutise(home));

for (const file of COPY_FILES) fs.copyFileSync(path.join(root, file), path.join(outDir, file));
for (const dir of COPY_DIRS) copyDir(path.join(root, dir), path.join(outDir, dir));

// Pages reads the custom domain from a CNAME in the published artifact, not from the
// repository, so leaving it behind here silently drops the site back to its
// github.io address on the next deploy. Optional: the repo builds fine without one.
if (fs.existsSync(path.join(root, 'CNAME'))) {
  fs.copyFileSync(path.join(root, 'CNAME'), path.join(outDir, 'CNAME'));
}

for (const page of PAGES) {
  const dir = path.join(outDir, page.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), absolutise(retitle(home, page)));
}

// The slugs were shortened after the preview had been shared, so links to the old
// ones are already in circulation. A stub at each keeps them landing on the right
// page instead of falling through to 404.html and its soft home-page render.
const MOVED = [
  ['the-challenge', 'challenge'],
  ['our-approach', 'approach'],
  ['who-we-are', 'team'],
  ['follow-our-work', 'follow'],
];
for (const [from, to] of MOVED) {
  const target = `${basePath}${to}/`;
  fs.mkdirSync(path.join(outDir, from), { recursive: true });
  fs.writeFileSync(
    path.join(outDir, from, 'index.html'),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${target}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${target}">
<title>Moved | AugmentED</title>
</head>
<body>
<p>This page has moved to <a href="${target}">${target}</a>.</p>
</body>
</html>
`
  );
}

// GitHub Pages serves 404.html from whatever URL was missed, so its references
// have to be absolute — relative ones would resolve against the bad path — and
// it has to be told the real base so its links point back into the site.
const notFound = absolutise(home)
  .replace('<head>', `<head>\n<script>window.__siteBase = ${JSON.stringify(basePath)};</script>`);
fs.writeFileSync(path.join(outDir, '404.html'), notFound);

// Pages runs Jekyll unless this marker is present, and Jekyll drops every
// directory whose name starts with an underscore — which would take _ds/ with it.
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

// ---------------------------------------------------------------- verify

const problems = [];

// The falling-block frames are addressed by string concatenation inside
// assets/falling-blocks.js, from a base and a frame count the page carries as
// attributes — so, exactly like the approach frames, no literal reference to any of
// them exists for the src/href scan to find. The encoder writes a manifest beside the
// frames recording what it actually produced; read it once here, and refsIn checks the
// page against it and expands the cross product. Three ways to fail, all of them at
// build time rather than in someone's browser: the manifest is missing, the page and
// the manifest disagree, or a frame the pair of them promise is not on disk.
const fallManifest = (() => {
  const p = path.join(root, 'assets/falling-blocks/manifest.json');
  if (!fs.existsSync(p)) {
    problems.push('assets/falling-blocks/manifest.json is missing — run tools/encode-falling-blocks.mjs');
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    problems.push('assets/falling-blocks/manifest.json is not readable JSON');
    return null;
  }
})();

const archManifest = (() => {
  const p = path.join(root, "assets/approach/manifest.json");
  if (!fs.existsSync(p)) {
    problems.push("assets/approach/manifest.json is missing — run tools/encode-approach.mjs");
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    problems.push("assets/approach/manifest.json is not readable JSON");
    return null;
  }
})();

const heroManifest = (() => {
  const p = path.join(root, "assets/hero-bridge/manifest.json");
  if (!fs.existsSync(p)) {
    problems.push("assets/hero-bridge/manifest.json is missing — run tools/encode-hero-bridge.mjs");
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    problems.push("assets/hero-bridge/manifest.json is not readable JSON");
    return null;
  }
})();

function refsIn(html) {
  const out = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) out.add(m[1]);
  for (const m of html.matchAll(/<meta property="og:image" content="([^"]+)"/g)) out.add(m[1]);
  // The hero frames are addressed by string concatenation inside assets/hero-bridge.js,
  // the same way the other two sequences are, so nothing the scan above can see refers to
  // any of them. Same cross product for the same reason: shipping one cut without the
  // other is the failure a phone hits and a desktop does not.
  //
  // What is different here is from/to. The page plays a span of the manifest rather than
  // all of it — only part of this sequence carries the ground shadow, see the hero comment
  // in index.html — so the span is what gets checked, and the span itself is checked
  // against the manifest first. A from or to naming a frame the encoder never produced is
  // the mistake this is really here to catch: it costs nothing at runtime, because the
  // element simply filters it away and scrubs a shorter sequence, and it would ship a hero
  // quietly missing its opening or its closing frames with nothing 404-ing to say so.
  // Comments stripped first, and that is not fussiness: this scans raw HTML, so an
  // authoring comment that merely NAMES the element in prose matched ahead of the element
  // itself and failed the build with "hero-bridge has no base attribute" — which is true
  // of a sentence and useless as a diagnostic. The page carries long explanatory comments
  // by house style, so the two were always going to collide.
  const hero = html.replace(/<!--[\s\S]*?-->/g, "").match(/<hero-bridge\b([^>]*)>/);
  if (hero && !heroManifest) {
    problems.push("the hero-bridge element is on the page but its manifest is unreadable");
  } else if (hero) {
    const attr = (k) => (hero[1].match(new RegExp(k + '="([^"]*)"')) || [, ""])[1];
    const base = attr("base");
    const m = heroManifest;
    if (!base) {
      problems.push("hero-bridge has no base attribute");
    } else {
      // Absent bounds mean the whole manifest, which is what the element does with them.
      const from = attr("from") === "" ? -Infinity : Number(attr("from"));
      const to = attr("to") === "" ? Infinity : Number(attr("to"));
      for (const edge of ["from", "to"]) {
        const v = Number(attr(edge));
        if (attr(edge) !== "" && !m.frames.includes(v)) {
          problems.push(`hero-bridge ${edge}="${attr(edge)}" is not a frame the manifest encoded`);
        }
      }
      const played = m.frames.filter((n) => n >= from && n <= to);
      if (played.length < 2) {
        problems.push(`hero-bridge plays ${played.length} of the manifest's ${m.frames.length} frames — that is a still, not a sequence`);
      }
      for (const n of played) {
        for (const v of Object.keys(m.cuts)) {
          out.add(base + m.stem + String(n).padStart(m.pad, "0") + v + "." + m.ext);
        }
      }
      out.add(base + "manifest.json");
    }
  }
  // The approach frames are addressed by string concatenation inside
  // assets/approach.js, from a base the page carries as an attribute and a frame list
  // the encoder wrote to a manifest — so, exactly like the falling-blocks frames, no
  // literal reference to any of them exists for the scan above to find. Check the cross
  // product of every frame and every cut: shipping one cut without the other is the
  // failure a phone would hit and a desktop would not, and a sequence that ships
  // half-encoded has to fail here rather than 404 mid-scroll.
  //
  // The base is captured off the page rather than assumed, because absolutise() has
  // rewritten it to whatever base this build was given.
  // The scrub is not mounted at the moment — the home page carries a still where the
  // arch used to be built, and the component is kept for the shortened sequence that
  // replaces it. So its absence is not a fault; only a scrub on the page with no
  // manifest behind it is.
  const arch = html.match(/<approach-scrub\b([^>]*)>/);
  if (arch && !archManifest) {
    problems.push("the approach-scrub element is on the page but its manifest is unreadable");
  } else if (arch) {
    const base = (arch[1].match(/base="([^"]*)"/) || [, ""])[1];
    const m = archManifest;
    if (!base) {
      problems.push("approach-scrub has no base attribute");
    } else {
      for (const n of m.frames) {
        for (const v of Object.keys(m.cuts)) {
          out.add(base + m.stem + String(n).padStart(m.pad, "0") + v + "." + m.ext);
        }
      }
      out.add(base + "manifest.json");
    }
  }
  // The base is captured off the page rather than assumed, because absolutise() has
  // rewritten it to whatever base this build was given. This is also why the base has to
  // stay a single attribute value beginning assets/ — build it from pieces and
  // absolutise() misses it, this scan misses it, and every page 404s on all ninety-six
  // frames with nothing here to say so.
  const fall = html.match(/<falling-blocks\b([^>]*)>/);
  if (!fall || !fallManifest) {
    problems.push('the falling-blocks element is no longer readable — check this scan');
  } else {
    const attr = (k) => (fall[1].match(new RegExp(k + '="([^"]*)"')) || [, ''])[1];
    const base = attr('base');
    const frames = Number(attr('frames'));
    const layers = attr('layers').split(',').map((s) => s.trim()).filter(Boolean).sort();
    const width = Number(attr('width'));
    const m = fallManifest;
    if (frames !== m.frames) {
      problems.push(`falling-blocks asks for ${frames} frames but the manifest encoded ${m.frames}`);
    }
    if (layers.join() !== [...m.layers].sort().join()) {
      problems.push(`falling-blocks asks for layers ${layers.join()} but the manifest encoded ${m.layers.join()}`);
    }
    if (!m.widths.some((t) => t.w === width)) {
      problems.push(`falling-blocks asks for width ${width}, which the manifest did not encode`);
    } else {
      for (const layer of m.layers) {
        for (let i = m.first; i < m.first + m.frames; i++) {
          out.add(`${base}w${width}/${layer}/${m.stem}${String(i).padStart(m.pad, '0')}.${m.ext}`);
        }
      }
    }
  }
  return [...out].filter(
    (r) =>
      r &&
      // Absolute URLs, fragments, and the template's own {{ bindings }} are not
      // files this build can check; everything else has to exist on disk.
      !/^(https?:|\/\/|data:|mailto:|tel:|#)/.test(r) &&
      !r.includes('{{') &&
      !/\s/.test(r)
  );
}

function checkFile(rel) {
  const abs = path.join(outDir, rel);
  const html = fs.readFileSync(abs, 'utf8');
  for (const ref of refsIn(html)) {
    const target = ref.startsWith('/')
      ? path.join(outDir, ref.slice(basePath.length === 1 ? 1 : basePath.length))
      : path.resolve(path.dirname(abs), ref);
    if (!fs.existsSync(target)) problems.push(`${rel} -> ${ref}`);
  }
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${rel} has no title`);
}

const built = ['index.html', '404.html', ...PAGES.map((p) => `${p.slug}/index.html`)];
built.forEach(checkFile);

for (const need of ['.nojekyll', 'support.js', '_ds', 'assets']) {
  if (!fs.existsSync(path.join(outDir, need))) problems.push(`missing ${need}`);
}

if (problems.length) {
  for (const p of problems) console.error(`::error::broken reference in built site: ${p}`);
  process.exit(1);
}

console.log(`built ${built.length} pages into ${path.relative(root, outDir)} (base ${basePath})`);
for (const p of built) console.log(`  ${p}`);

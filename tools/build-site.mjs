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
import { execFileSync } from 'node:child_process';
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
    .replace(/(["'])\.\/support\.js\1/g, `$1${basePath}support.js$1`)
    // Leadership bio links, href="team/<slug>/". They have to be absolutised for the
    // same reason the assets do, and more sharply: every route is this same file, so a
    // relative bio link resolves against whatever route the reader is on — right from
    // /team/, and /sherry-lachman/ from the home page. The pattern is deliberately tight
    // (a quote, team/, one slug, a slash, the same quote) so it cannot catch the nav's
    // own {{ hrefTeam }} or a path inside a style attribute.
    .replace(/(["'])team\/([a-z0-9-]+)\/\1/g, `$1${basePath}team/$2/$1`);
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
// The bio pages link the design system directly rather than through <helmet>, so they
// need its stylesheet list. Read it off index.html instead of repeating it: the
// directory name carries a hash, and a version bump that changed the hash would
// otherwise leave the bio pages pointing at a directory that no longer exists, with
// nothing to catch it but the eye.
const DS_SHEETS = [...home.matchAll(/<link rel="stylesheet" href="(_ds\/[^"]+)">/g)].map((m) => m[1]);
if (!DS_SHEETS.length) {
  console.error('::error::no design-system stylesheets found in index.html — bio pages would ship unstyled');
  process.exit(1);
}
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

// ---------------------------------------------------------------- bio pages
//
// One page per file in source-material/bios/, at /team/<slug>/. These are the only
// pages on the site that are NOT the SPA.
//
// Every route above is the whole of index.html written out again with a different
// <title>; the client then picks which <main> to show. Adding leadership bios that way
// would have meant a fifth, sixth and seventh entry in each of the four route tables
// that must already be kept in step by hand — PAGES here, ROUTES and TITLES in
// index.html, and the is/go/href getter triple beside them — and another entry in all
// four every time someone joins. The bios are static prose with no behaviour, so they
// do not need any of it.
//
// The pages that result are also the sturdiest on the site, which was not the goal but
// is worth knowing. index.html loads the design system from <helmet> INSIDE <x-dc>, so
// its styles only arrive once React, ReactDOM and Babel have been fetched from unpkg
// and the runtime has booted; in a sandbox without that network, every route renders
// unstyled. These link the same stylesheets directly from <head>, so a bio page is
// correct with no JavaScript at all. That is also what makes it portable: in WordPress
// this is one custom post type with one template, not a route in someone's router.
//
// There is no Markdown parser. A bio is a name, a role and paragraphs — see the
// directory's README. Anything else ships as literal characters, which is the honest
// failure and an easy one to spot.
const BIO_DIR = path.join(root, 'source-material/bios');
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function readBios() {
  if (!fs.existsSync(BIO_DIR)) return [];
  return fs.readdirSync(BIO_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((f) => {
      const slug = f.replace(/\.md$/, '');
      const lines = fs.readFileSync(path.join(BIO_DIR, f), 'utf8').split('\n');
      const name = (lines.find((l) => l.startsWith('# ')) || '').slice(2).trim();
      const role = (lines.find((l) => l.startsWith('## ')) || '').slice(3).trim();
      const paras = lines
        .filter((l) => !l.startsWith('#'))
        .join('\n')
        .split(/\n\s*\n/)
        .map((x) => x.trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      return { slug, name, role, paras };
    })
    .filter((b) => {
      if (b.name && b.paras.length) return true;
      console.error(`::error::source-material/bios/${b.slug}.md has no name or no paragraphs`);
      problems.push(`bios/${b.slug}.md is malformed`);
      return false;
    });
}

function bioPage(b) {
  // The portrait is optional on purpose: a bio can land before a usable headshot does,
  // and the page should still be worth reading. Same rule the team grid follows.
  const photo = fs.existsSync(path.join(root, `assets/team/${b.slug}.webp`))
    // height:auto is not decoration. The width/height ATTRIBUTES are here so the box is
    // reserved before the image loads, but a height attribute with no CSS height beats
    // aspect-ratio — the portrait rendered 180x512 until this was explicit. The team grid
    // gets away without it; this page did not, so it says what it means.
    ? `<img src="assets/team/${b.slug}.webp" alt="${esc(b.name)}" width="512" height="512" decoding="async"
         style="width:180px;height:auto;aspect-ratio:1/1;object-fit:cover;border-radius:var(--radius-image);display:block;margin-bottom:var(--space-8)">`
    : '';
  // One sentence of the bio, for search results and share cards. Cut at the first
  // sentence end rather than a character count, so it never stops mid-word.
  const firstStop = b.paras[0].search(/\.\s/);
  const desc = esc(firstStop > 0 ? b.paras[0].slice(0, firstStop + 1) : b.paras[0]);
  const nav = [['challenge', 'The Challenge'], ['approach', 'Our Approach'], ['team', 'Who We Are'], ['follow', 'Follow Our Work']];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(b.name)} | AugmentED</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(b.name)} | AugmentED">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="assets/logo/og-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="assets/logo/og-card.png">
<link rel="icon" href="assets/logo/logo-icon.png" type="image/png" sizes="150x150">
<link rel="apple-touch-icon" href="assets/logo/logo-icon.png">
<meta name="theme-color" content="#fdfcfa">
${DS_SHEETS.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
<style>
  html, body { margin: 0; background: var(--surface-page); }
  a { color: inherit; }
  .bio-nav a { font-size: var(--text-small); text-decoration: none; }
  .bio-nav a:hover { text-decoration: underline; }
  .bio-body p { font-size: var(--text-regular); line-height: var(--text-body-line-height); margin: 0; text-wrap: pretty; }
</style>
</head>
<body class="scheme-1">
<header style="padding:var(--space-8) var(--page-gutter);border-bottom:var(--border-width-divider) solid var(--border-hairline)">
  <div style="margin-inline:auto;max-width:var(--container-xxl);display:flex;align-items:center;justify-content:space-between;gap:var(--space-8);flex-wrap:wrap">
    <a href="${basePath}" style="display:block;flex-shrink:0"><img src="assets/logo/logo-horiz.svg" alt="augment^ed, supported by AERDF" style="width:200px;display:block" width="1000" height="212" decoding="async"></a>
    <nav class="bio-nav" style="display:flex;align-items:center;gap:var(--space-8);flex-wrap:wrap">
      ${nav.map(([sl, label]) => `<a href="${basePath}${sl}/">${label}</a>`).join('\n      ')}
    </nav>
  </div>
</header>

<main style="padding:clamp(var(--section-pad-y),7vw,var(--section-pad-y-lg)) var(--page-gutter)">
  <div style="margin-inline:auto;max-width:var(--container-md)">
    <p style="font-size:var(--text-small);margin:0 0 var(--space-8)"><a href="${basePath}team/">&larr; Who We Are</a></p>
    ${photo}
    <h1 style="font-size:var(--text-h2);line-height:var(--text-h2-line-height);letter-spacing:var(--heading-letter-spacing);font-weight:var(--font-weight-bold);margin:0 0 var(--space-2);text-wrap:pretty">${esc(b.name)}</h1>
    ${b.role ? `<p style="font-weight:var(--font-weight-semibold);font-size:var(--text-regular);margin:0 0 var(--space-10)">${esc(b.role)}</p>` : ''}
    <div class="bio-body" style="display:flex;flex-direction:column;gap:var(--space-6)">
      ${b.paras.map((t) => `<p>${esc(t)}</p>`).join('\n      ')}
    </div>
  </div>
</main>

<footer style="padding:clamp(var(--section-header-gap),6vw,var(--section-header-gap-lg)) var(--page-gutter) var(--space-12)">
  <div style="margin-inline:auto;max-width:var(--container-xxl)">
    <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;column-gap:var(--space-12);row-gap:var(--space-12);margin-bottom:var(--space-16)">
      <div><img src="assets/logo/logo-vert.svg" alt="augment^ed, supported by AERDF" style="width:168px;display:block;margin-bottom:var(--space-6)" width="430" height="266" decoding="async"></div>
      <div class="bio-nav" style="display:flex;flex-direction:column;gap:var(--space-3)">
        <p style="font-weight:var(--font-weight-semibold);font-size:var(--text-small);margin:0 0 var(--space-1)">Explore</p>
        ${nav.map(([sl, label]) => `<a href="${basePath}${sl}/">${label}</a>`).join('\n        ')}
      </div>
    </div>
    <div style="height:var(--border-width-divider);width:100%;background:var(--border-hairline);margin-bottom:var(--space-6)"></div>
    <p style="font-size:var(--text-small);margin:0">&copy; 2026 AugmentED. All rights reserved.</p>
  </div>
</footer>
</body>
</html>
`;
}

// A page is built only if the team page LINKS to it. Not if a card with that id exists:
// that was the first version of this check, and it built /team/brandon-bodnar/ — he
// still has a card, in Technology and Design Partners, but no "Read bio" link, so the
// page would have shipped linked from nowhere while the docs said it did not exist.
// Caught in review before it merged. The link is the real coupling, so it is the test.
//
// Skipping rather than building is the safe default for the other reason too. Writing a
// bio before the card is a reasonable order to work in, but on a public site an unlinked
// page is still a published page: a bio for someone not yet announced would go live the
// moment it was committed. It is a warning, not a failure, so that order still works.
const bios = readBios().filter((b) => {
  if (home.includes(`href="team/${b.slug}/"`)) return true;
  console.log(`::warning::source-material/bios/${b.slug}.md is not built — no "Read bio" link on the team page points at team/${b.slug}/`);
  return false;
});
for (const b of bios) {
  const dir = path.join(outDir, 'team', b.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), absolutise(bioPage(b)));
}
if (bios.length) console.log(`  bios: ${bios.map((b) => `team/${b.slug}/`).join(', ')}`);

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
  // The component scans below describe the SPA. The bio pages are the one thing here
  // that is not it — static prose, no runtime, no sequences — so a missing
  // <falling-blocks> on one of them is the correct state, not a broken scan. <x-dc> is
  // the marker: every SPA route carries it, the bio pages never do. Keep the scans HARD
  // for anything that does, which is the case the warnings below are written for.
  const isSpa = html.includes('<x-dc>');
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
  if (!isSpa) {
    // not an SPA page; the sequence scans do not apply
  } else if (!fall || !fallManifest) {
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

const built = ['index.html', '404.html', ...PAGES.map((p) => `${p.slug}/index.html`),
  ...bios.map((b) => `team/${b.slug}/index.html`)];
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

// The handoff export in wordpress-handoff/pages/ is committed output of
// tools/export-static.mjs, and nothing regenerates it automatically — so it
// drifts silently the moment index.html changes, and it has done so before: the
// 2026-08-24 home rebuild shipped while the export still showed the page it
// replaced. The exporter stamps its source commit into each page; compare that
// against the commits that have touched index.html since. A warning, never a
// failure: the export is not part of what ships, and CI clones can be too
// shallow for rev-list to answer at all — silence in that case, not a red build.
try {
  const stamped = fs.readFileSync(path.join(root, 'wordpress-handoff/pages/home.html'), 'utf8')
    .match(/<!-- exported from ([0-9a-f]{40})/);
  if (!stamped) {
    console.warn('::warning::wordpress-handoff/pages/ carries no export stamp — regenerate with tools/export-static.mjs');
  } else {
    const behind = execFileSync('git', ['rev-list', '--count', `${stamped[1]}..HEAD`, '--', 'index.html'],
      { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (behind !== '0') {
      console.warn(`::warning::wordpress-handoff/pages/ was exported at ${stamped[1].slice(0, 7)}, and index.html has ${behind} newer commit(s) — regenerate with tools/export-static.mjs`);
    }
  }
} catch {}

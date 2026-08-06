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
    slug: 'the-challenge',
    title: 'The Challenge | AugmentED',
    description:
      'AI is arriving in classrooms whether schools are ready or not. The danger is that some are rushing in without asking what AI can do well, what teachers uniquely bring, or what students actually need.',
  },
  {
    slug: 'our-approach',
    title: 'Our Approach | AugmentED',
    description:
      'We believe better educational AI will emerge from discovering what classrooms actually need, building solutions with real educators and students, and testing them in real classrooms.',
  },
  {
    slug: 'who-we-are',
    title: 'Who We Are | AugmentED',
    description:
      'AugmentED brings together people from classrooms, research labs, and engineering teams who share a conviction that AI should augment human teaching, not replace it.',
  },
  {
    slug: 'follow-our-work',
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

// A route file lives one directory down, so every reference into assets/, _ds/
// and support.js has to climb back out. A <base> tag would do this in one line
// but would also re-point the page's url(#gradient) and <use href="#id">
// references at the base URL, which breaks the SVG artwork.
function reparent(html) {
  return html
    .replace(/(["'])assets\//g, '$1../assets/')
    .replace(/(["'])_ds\//g, '$1../_ds/')
    .replace(/(["'])\.\/support\.js\1/g, '$1../support.js$1');
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
fs.writeFileSync(path.join(outDir, 'index.html'), home);

for (const file of COPY_FILES) fs.copyFileSync(path.join(root, file), path.join(outDir, file));
for (const dir of COPY_DIRS) copyDir(path.join(root, dir), path.join(outDir, dir));

for (const page of PAGES) {
  const dir = path.join(outDir, page.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), reparent(retitle(home, page)));
}

// GitHub Pages serves 404.html from whatever URL was missed, so its references
// have to be absolute — relative ones would resolve against the bad path — and
// it has to be told the real base so its links point back into the site.
const notFound = home
  .replace(/(["'])assets\//g, `$1${basePath}assets/`)
  .replace(/(["'])_ds\//g, `$1${basePath}_ds/`)
  .replace(/(["'])\.\/support\.js\1/g, `$1${basePath}support.js$1`)
  .replace('<head>', `<head>\n<script>window.__siteBase = ${JSON.stringify(basePath)};</script>`);
fs.writeFileSync(path.join(outDir, '404.html'), notFound);

// Pages runs Jekyll unless this marker is present, and Jekyll drops every
// directory whose name starts with an underscore — which would take _ds/ with it.
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

// ---------------------------------------------------------------- verify

const problems = [];

function refsIn(html) {
  const out = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) out.add(m[1]);
  for (const m of html.matchAll(/<meta property="og:image" content="([^"]+)"/g)) out.add(m[1]);
  // The approach frames are built by string concatenation from ARCH_FRAMES, so no
  // literal reference to them exists for the scan above to find. Read the list off
  // the page and check every frame in it: a sequence that ships half-encoded has to
  // fail the build here rather than 404 in the browser. Both halves are required —
  // a rename that leaves one behind checks nothing at all, silently.
  // Every frame exists in each cut of the plate — the full one and the mobile crop —
  // so check the cross product. Shipping one cut without the other is the failure a
  // phone would hit and a desktop would not.
  const stem = html.match(/"((?:\.\.\/|\/)?[\w./-]*assets\/approach\/ap)"/);
  const list = html.match(/ARCH_FRAMES\s*=\s*\[([\d,\s]*)\]/);
  const cuts = html.match(/ARCH_CROP\s*=\s*\{([^}]*\}[^}]*)\}/);
  if (!stem || !list || !cuts) {
    problems.push('approach frame references are no longer readable — check the ARCH_FRAMES scan');
  } else {
    const variants = [...cuts[1].matchAll(/(?:^|,)\s*"?([a-z]*)"?\s*:\s*\{/g)].map((m) => m[1]);
    for (const n of list[1].split(',')) {
      const f = n.trim();
      if (!f) continue;
      for (const v of variants) out.add(stem[1] + f.padStart(4, '0') + v + '.webp');
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

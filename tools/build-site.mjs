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

// The origin the site is served from, for the few things that must be absolute URLs
// and not paths: og:image and twitter:image on every page, and the bio pages'
// canonical, og:url and structured data. Read from CNAME, which is also what tells
// Pages the domain. Without one (a fork, a preview build) those are left as paths or
// left out, with a warning, rather than guessed.
const CNAME = fs.existsSync(path.join(root, 'CNAME')) ? fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim() : '';
const ORIGIN = CNAME ? `https://${CNAME}` : '';
if (!ORIGIN) console.log('::warning::no CNAME — og:image stays a path, and the bio pages ship without canonical, og:url or structured data');

// og:image and twitter:image as absolute URLs. absolutise() leaves them root-relative
// (/assets/logo/og-card.png). A browser can resolve that against the page; a link
// unfurler reads the tag on its own, and the Open Graph protocol defines og:image as a
// URL, so a path is at best tolerated. The share card added in September went out as
// a path on every page. Runs after absolutise(), which is what puts the base in it.
function share(html) {
  if (!ORIGIN) return html;
  return html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")(\/[^/"][^"]*)"/g, `$1${ORIGIN}$2"`);
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

// THE MARKUP'S SHAPE. Every screen is hand-written HTML inside <x-dc>, parsed by the
// browser before the runtime sees it, and a browser does not reject a misplaced tag: it
// repairs it, silently, into something that renders. PR #51 shipped two such repairs on
// the team page and nothing else here noticed either one.
//
//   A card outside its grid. Brandon Bodnar's card went in after the Technology and
//   Design Partners grid's closing </div>, so it sat in the section's container
//   instead. The placeholder is aspect-ratio 1/1 at width 100%, so his card measured
//   1280x1378 at a 1440 viewport, against 197 wide for every other card on the page.
//
//   A </div> that closes nothing. The same edit left one over. With no open <div> inside
//   <main>, the parser walks up the stack to the nearest one outside it and closes
//   everything on the way, <main> included, so the closing "Join us" section rendered
//   outside <main> and outside the team page's <sc-if> guard.
//
// Both are checked here against the source, per screen, before anything is written.
// The walk counts <div> only. It is the one element the screens nest deeply by hand,
// and the one both failures were made of. The grid test is specific to Who We Are: every
// <h3> there names a person, and a person's card must be a direct child of .team-grid-3.
// Comments are blanked rather than removed, so line numbers still point into index.html.
function markupShape(html) {
  const errs = [];
  const src = html.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  for (const screen of src.matchAll(/<main data-screen-label="([^"]+)">([\s\S]*?)<\/main>/g)) {
    const [, label, body] = screen;
    const base = screen.index + screen[0].indexOf(body);
    const stack = [];
    for (const t of body.matchAll(/<(\/?)(div|h3)\b([^>]*)>/g)) {
      const at = base + t.index;
      if (t[2] === 'h3') {
        if (t[1] || label !== 'Who We Are') continue;
        const grid = stack[stack.length - 2];
        if (!grid || !/\bclass="[^"]*\bteam-grid-3\b/.test(grid.attrs)) {
          const name = body.slice(t.index).match(/<h3[^>]*>([^<]*)/)[1].trim();
          errs.push(`${label}: the card for ${name} (index.html:${lineOf(at)}) is not a direct child of a .team-grid-3 grid`);
        }
      } else if (!t[1]) {
        stack.push({ attrs: t[3], line: lineOf(at) });
      } else if (!stack.pop()) {
        errs.push(`${label}: the </div> at index.html:${lineOf(at)} closes nothing inside <main>, so the browser will close <main> itself`);
      }
    }
    if (stack.length) errs.push(`${label}: ${stack.length} <div> never closed, the first at index.html:${stack[0].line}`);
  }
  return errs;
}
const shape = markupShape(home);
if (shape.length) {
  for (const e of shape) console.error(`::error::${e}`);
  process.exit(1);
}

// Declared here rather than with the checks under "verify" below, because readBios()
// pushes into it and runs first. Declared there, a malformed bio threw a ReferenceError
// from inside the filter instead of reaching the ::error:: line written for it.
const problems = [];
// The root file gets the same treatment as the routes. It is the one the bug starts
// from: land here, click any nav item, and its relative paths follow you one level down.
fs.writeFileSync(path.join(outDir, 'index.html'), share(absolutise(home)));

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
  fs.writeFileSync(path.join(dir, 'index.html'), share(absolutise(retitle(home, page))));
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

// The person's LinkedIn and website, read off their own tile on the team page, so the
// tile stays the one place they are written. The slice runs from the tile's id to its
// "Read bio" paragraph. Every built bio has one (a page is only built when its link
// exists), and it comes after the icon row, so the next person's links cannot leak in.
function tileLinks(slug) {
  const start = home.indexOf(`id="${slug}"`);
  const end = start < 0 ? -1 : home.indexOf('class="bio-cta"', start);
  if (end < 0) return [];
  return [...home.slice(start, end).matchAll(/<a href="(https?:[^"]+)"[^>]*aria-label="(LinkedIn|Website)"/g)]
    .map((m) => ({ url: m[1], label: m[2] }));
}

// What else the tile says, read off it the same way. The muted lines under the role are a
// Fellow's school and city, which their page repeats; the group heading the tile sits
// under decides what the page's structured data may claim about who they work for.
function tileFacts(slug) {
  const start = home.indexOf(`id="${slug}"`);
  const end = start < 0 ? -1 : home.indexOf('class="bio-cta"', start);
  const muted = end < 0 ? [] : [...home.slice(start, end).matchAll(/<p style="[^"]*--text-muted[^"]*">([^<]+)<\/p>/g)].map((m) => m[1]);
  const heads = [...home.slice(0, Math.max(0, start)).matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)];
  return { muted, group: heads.length ? heads[heads.length - 1][1].trim() : '' };
}
const unesc = (t) => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function bioPage(b) {
  // The portrait is optional on purpose: a bio can land before a usable headshot does,
  // and the page should still be worth reading. Without one the page is a single column
  // of text rather than a grey placeholder square. The team tile keeps its square
  // because it sits in a grid with other people; a page about one person that leads
  // with an empty box reads as broken.
  const hasPhoto = fs.existsSync(path.join(root, `assets/team/${b.slug}.webp`));
  const photo = hasPhoto
    ? `<img class="bio-portrait" src="assets/team/${b.slug}.webp" alt="${esc(b.name)}" width="512" height="512" decoding="async">`
    : '';
  // One sentence of the bio, for search results and share cards. Cut at the first
  // sentence end rather than a character count, so it never stops mid-word.
  const firstStop = b.paras[0].search(/\.\s/);
  const lede = firstStop > 0 ? b.paras[0].slice(0, firstStop + 1) : b.paras[0];
  const desc = esc(lede);
  const links = tileLinks(b.slug);
  const facts = tileFacts(b.slug);
  const url = ORIGIN && `${ORIGIN}${basePath}team/${b.slug}/`;
  // og:profile wants a given name and a family name. A name shown with another in
  // brackets — "Abby (Csaba) Petre" — keeps the brackets on the page and in the JSON-LD,
  // but the bracketed part is neither, so it is left out of this split.
  const [first, ...rest] = b.name.replace(/\s*\([^)]*\)/g, '').split(' ');
  const nav = [['challenge', 'The Challenge'], ['approach', 'Our Approach'], ['team', 'Who We Are']];

  // ProfilePage structured data. Google's documentation lists "an employee page on a
  // company website" as a page this type is for: one person, affiliated with the site.
  // mainEntity and its name are required; image, description and sameAs are the
  // recommended fields, and sameAs is the person's own links from their tile. Built
  // from ORIGIN because every URL in it must be absolute. Without a CNAME it is left
  // out, not filled with paths.
  //
  // Only Leadership works FOR AugmentED. Until September 2026 only Leadership had pages,
  // and every page said worksFor; now a university professor and a Memphis science
  // teacher have them too, and saying their employer is AugmentED would be wrong in the
  // one place a search engine takes literally. Everyone else is a memberOf it, with
  // their own institution as the affiliation where their tile names one.
  const org = { '@type': 'Organization', name: 'AugmentED', url: `${ORIGIN}${basePath}` };
  const ld = url && {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url,
    mainEntity: {
      '@type': 'Person',
      name: b.name,
      ...(b.role && { jobTitle: b.role }),
      description: lede,
      ...(hasPhoto && { image: `${ORIGIN}${basePath}assets/team/${b.slug}.webp` }),
      ...(links.length && { sameAs: links.map((l) => l.url) }),
      ...(facts.group === 'Leadership'
        ? { worksFor: org }
        : { memberOf: org, ...(facts.muted[0] && { affiliation: { '@type': 'Organization', name: unesc(facts.muted[0]) } }) }),
      url,
    },
  };

  const linkItem = (l) => {
    // The same marks the tiles use: Simple Icons' LinkedIn as an <img>, and the
    // design system's "language" glyph for a website. The design system puts brand
    // marks "under team bios", and names them here rather than leaving an icon alone.
    const mark = l.label === 'LinkedIn'
      ? '<img src="assets/icons/linkedin.svg" alt="" width="24" height="24" decoding="async">'
      : '<span class="ds-icon" aria-hidden="true">language</span>';
    return `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${mark}${l.label}<span class="visually-hidden"> (opens in a new tab)</span></a></li>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(b.name)} | AugmentED</title>
<meta name="description" content="${desc}">
${url ? `<link rel="canonical" href="${url}">\n` : ''}<meta property="og:type" content="profile">
<meta property="og:site_name" content="AugmentED">
<meta property="og:title" content="${esc(b.name)} | AugmentED">
<meta property="og:description" content="${desc}">
${url ? `<meta property="og:url" content="${url}">\n` : ''}<meta property="profile:first_name" content="${esc(first)}">
${rest.length ? `<meta property="profile:last_name" content="${esc(rest.join(' '))}">\n` : ''}<meta property="og:image" content="assets/logo/og-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="augment^ed, supported by AERDF">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="assets/logo/og-card.png">
<link rel="icon" href="assets/logo/logo-icon.png" type="image/png" sizes="150x150">
<link rel="apple-touch-icon" href="assets/logo/logo-icon.png">
<meta name="theme-color" content="#fdfcfa">
${DS_SHEETS.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n` : ''}<style>
  /* THE CHROME is the SPA's, restated. index.html writes its header and footer as
     inline styles inside the runtime's template, so there is nothing here to import;
     these rules copy the values it renders with, measured in Chromium off /team/:
     a 96px sticky bar, the logo at 220x74, nav at the body size with --space-10
     between, the "Follow our work" pill 37px tall. Change the SPA's header and this
     goes stale, so the two are worth diffing by eye after any header change.

     img[width][height] { height: auto } is the SPA's rule too, and this page shipped
     without it. Every width/height attribute then set its box: the header logo sat in
     a 200x212 box and the footer's in 168x266, which made the header 276px tall. The
     portrait had already been fixed one-off for the same reason. This covers all three. */
  :root { --header-h: 6rem; }
  html, body { margin: 0; background: var(--surface-page); }
  img[width][height] { height: auto; }
  a { color: inherit; text-decoration: none; transition: opacity var(--transition-fast); }
  @media (hover: hover) { a:hover { opacity: 0.7; } }
  @media (max-width: 991px) { .at-desktop { display: none !important; } }
  @media (min-width: 992px) { .at-mobile { display: none !important; } }
  .visually-hidden { position: absolute !important; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
  .ds-icon { font-size: 1.25em; width: 1em; height: 1em; }

  .bio-header { position: sticky; top: 0; z-index: 900; display: flex; min-height: var(--header-h); width: 100%; align-items: center; padding-inline: var(--page-gutter); background: var(--surface-page); }
  .bio-header-row { margin-inline: auto; display: flex; width: 100%; max-width: var(--container-xxl); align-items: center; justify-content: space-between; gap: var(--space-8); }
  .bio-logo { display: block; flex-shrink: 0; }
  .bio-logo img { width: 220px; display: block; }
  .bio-nav { display: flex; align-items: center; gap: var(--space-10); }
  /* The design system's default button at the SPA's small size, as an <a>: this page
     has no React to render the component, and a link that navigates should be a link.
     Hover goes darker, as the system's buttons do, not to the 70% links get. */
  .bio-pill { display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--color-st-tropaz); border-radius: var(--radius-button); background: var(--color-st-tropaz); color: var(--color-white); padding: 0.25rem 1.875rem; font-weight: var(--font-weight-medium); line-height: var(--text-body-line-height); white-space: nowrap; transition: background-color var(--transition-fast), border-color var(--transition-fast); }
  @media (hover: hover) { .bio-pill:hover { opacity: 1; background: var(--color-st-tropaz-dark); border-color: var(--color-st-tropaz-dark); } }
  /* The SPA's mobile menu, without its script. <details> gives the open and closed
     states and the keyboard handling for nothing; the bars and the overlay copy the
     SPA's values. What it cannot do without script is close on Escape or lock the
     page behind it, and on a page this short neither is worth a runtime. */
  .bio-menu > summary { list-style: none; display: flex; flex-direction: column; justify-content: center; gap: 6px; width: 44px; height: 44px; cursor: pointer; }
  .bio-menu > summary::-webkit-details-marker { display: none; }
  .bio-menu > summary span { display: block; width: 22px; height: 2px; background: var(--color-neutral-darkest); transition: transform 300ms ease-in-out; transform-origin: center; }
  .bio-menu[open] > summary span:first-child { transform: translateY(4px) rotate(45deg); }
  .bio-menu[open] > summary span:last-child { transform: translateY(-4px) rotate(-45deg); }
  .bio-menu-panel { position: fixed; inset: var(--header-h) 0 0 0; z-index: 800; overflow-y: auto; overscroll-behavior: contain; background: var(--surface-page); padding: var(--space-12) var(--page-gutter); display: flex; flex-direction: column; gap: var(--space-8); }
  .bio-menu-panel a { font-size: var(--text-h4); font-weight: var(--font-weight-bold); letter-spacing: var(--heading-letter-spacing); }

  /* THE PROFILE. Aligned to the same --container-xxl edge as the logo and every SPA
     section. On a desktop the portrait takes a column of its own at up to 18rem (288px),
     which is larger than the 197px tile the reader clicked to get here. Before, it
     was 180px, smaller than the tile, above a 560px column with the right 60% of the
     page empty. The text column stops at 38rem, about 65 characters of body text, in
     the 50-75 range line-length research settles on.

     The back link's chevron is chevron_right mirrored. The design system's icon font
     is subset to five glyphs and chevron_left is not one of them, and the system says
     not to hand-draw SVG paths. Mirroring costs nothing; a sixth glyph means
     regenerating the subset. It goes to /team/ rather than /team/#<slug>: the SPA
     renders after the browser has already tried to jump to a fragment, so the fragment
     lands at the top anyway (measured: scrollY 0). */
  .bio { padding: clamp(var(--space-8), 4vw, var(--space-12)) var(--page-gutter) clamp(var(--section-pad-y), 7vw, var(--section-pad-y-lg)); }
  .bio-wrap { margin-inline: auto; max-width: var(--container-xxl); }
  .bio-back { margin: 0 0 clamp(var(--space-8), 4vw, var(--space-12)); font-size: var(--text-small); }
  .bio-back a { display: inline-flex; align-items: center; gap: var(--space-1); min-height: 24px; }
  .bio-back .ds-icon { transform: scaleX(-1); }
  .bio-layout { display: grid; gap: var(--space-8); }
  .bio-portrait { width: 12rem; aspect-ratio: 1 / 1; object-fit: cover; border-radius: var(--radius-image); display: block; }
  .bio-text { max-width: 38rem; }
  .bio h1 { font-size: var(--text-h2); line-height: var(--text-h2-line-height); letter-spacing: var(--heading-letter-spacing); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-2); text-wrap: pretty; }
  .bio-role { font-weight: var(--font-weight-semibold); font-size: var(--text-regular); margin: 0 0 var(--space-10); }
  /* A Fellow's school and city, muted like the same two lines on their tile. */
  .bio-role:has(+ .bio-meta) { margin-bottom: var(--space-2); }
  .bio-meta { color: var(--text-muted); font-size: var(--text-regular); line-height: var(--text-body-line-height); margin: 0 0 var(--space-10); }
  .bio-body { display: flex; flex-direction: column; gap: var(--space-6); }
  .bio-body p { font-size: var(--text-regular); line-height: var(--text-body-line-height); margin: 0; text-wrap: pretty; }
  .bio-links { list-style: none; margin: var(--space-10) 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-4) var(--space-8); }
  .bio-links a { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 44px; font-size: var(--text-small); font-weight: var(--font-weight-semibold); }
  .bio-links img, .bio-links .ds-icon { width: var(--icon-size); height: var(--icon-size); font-size: var(--icon-size); display: block; }
  /* The SPA's touch-target rule, for the links this page has. Below the desktop
     breakpoint every link gets 44px of height from padding, not a bigger glyph. The
     logo, not every header link: the menu panel sits inside this page's <header>, but
     the SPA's sits outside its own, so its links never got the rule. Given it here,
     the panel's rows spread from 68px to 76px apart. */
  @media (max-width: 991px) {
    footer a { display: inline-flex; align-items: center; min-height: 2.75rem; }
    .bio-logo, .bio-back a { min-height: 2.75rem; }
  }
  @media (min-width: 992px) {
    .bio-layout { grid-template-columns: minmax(0, 18rem) minmax(0, 38rem); column-gap: clamp(var(--space-12), 5vw, var(--space-20)); align-items: start; }
    .bio-layout.is-text-only { grid-template-columns: minmax(0, 38rem); }
    .bio-portrait { width: 100%; }
  }
</style>
</head>
<body class="scheme-1">
<header class="bio-header">
  <div class="bio-header-row">
    <a class="bio-logo" href="${basePath}"><img src="assets/logo/logo-horiz.svg" alt="augment^ed, supported by AERDF" width="504" height="169" decoding="async"></a>
    <nav class="bio-nav at-desktop" aria-label="Main">
      ${nav.map(([sl, label]) => `<a href="${basePath}${sl}/">${label}</a>`).join('\n      ')}
      <a class="bio-pill" href="${basePath}follow/">Follow our work</a>
    </nav>
    <details class="bio-menu at-mobile">
      <summary aria-label="Menu"><span></span><span></span></summary>
      <nav class="bio-menu-panel" aria-label="Main">
        ${nav.map(([sl, label]) => `<a href="${basePath}${sl}/">${label}</a>`).join('\n        ')}
        <a href="${basePath}follow/">Follow Our Work</a>
      </nav>
    </details>
  </div>
</header>

<main class="bio">
  <div class="bio-wrap">
    <p class="bio-back"><a href="${basePath}team/"><span class="ds-icon" aria-hidden="true">chevron_right</span>Who We Are</a></p>
    <div class="bio-layout${hasPhoto ? '' : ' is-text-only'}">
      ${photo}
      <div class="bio-text">
        <h1>${esc(b.name)}</h1>
        ${b.role ? `<p class="bio-role">${esc(b.role)}</p>` : ''}
        ${facts.muted.length ? `<p class="bio-meta">${facts.muted.join('<br>')}</p>` : ''}
        <div class="bio-body">
          ${b.paras.map((t) => `<p>${esc(t)}</p>`).join('\n          ')}
        </div>
        ${links.length ? `<ul class="bio-links">\n          ${links.map(linkItem).join('\n          ')}\n        </ul>` : ''}
      </div>
    </div>
  </div>
</main>

<footer style="padding:clamp(var(--section-header-gap),6vw,var(--section-header-gap-lg)) var(--page-gutter) var(--space-12)">
  <div style="margin-inline:auto;max-width:var(--container-xxl)">
    <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;column-gap:var(--space-12);row-gap:var(--space-12);margin-bottom:var(--space-16)">
      <div><img src="assets/logo/logo-vert.svg" alt="augment^ed, supported by AERDF" style="width:168px;display:block;margin-bottom:var(--space-6)" width="430" height="266" decoding="async"></div>
      <div style="display:flex;flex-direction:column;gap:var(--space-3)">
        <p style="font-weight:var(--font-weight-semibold);font-size:var(--text-small);margin:0 0 var(--space-1)">Explore</p>
        ${nav.map(([sl, label]) => `<a href="${basePath}${sl}/" style="font-size:var(--text-small)">${label}</a>`).join('\n        ')}
        <a href="${basePath}follow/" style="font-size:var(--text-small)">Get Involved</a>
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
  fs.writeFileSync(path.join(dir, 'index.html'), share(absolutise(bioPage(b))));
}
if (bios.length) console.log(`  bios: ${bios.map((b) => `team/${b.slug}/`).join(', ')}`);

// GitHub Pages serves 404.html from whatever URL was missed, so its references
// have to be absolute — relative ones would resolve against the bad path — and
// it has to be told the real base so its links point back into the site.
const notFound = share(absolutise(home))
  .replace('<head>', `<head>\n<script>window.__siteBase = ${JSON.stringify(basePath)};</script>`);
fs.writeFileSync(path.join(outDir, '404.html'), notFound);

// Pages runs Jekyll unless this marker is present, and Jekyll drops every
// directory whose name starts with an underscore — which would take _ds/ with it.
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

// ---------------------------------------------------------------- verify

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

// The headshots' colour twins are the same kind of reference. assets/team-colour.js
// builds each one's URL from its duotone's (assets/team/<slug>.webp becomes
// assets/team/colour/<slug>.webp), so no page names them and the src/href scan below
// never sees them. Check the pairing here instead. A missing twin would not break the
// page — the script drops a layer whose image fails to load — it would leave one person
// who never blooms, which is exactly the gap nobody notices in review.
for (const slug of new Set([...home.matchAll(/assets\/team\/([a-z0-9-]+)\.webp/g)].map((m) => m[1]))) {
  if (!fs.existsSync(path.join(root, `assets/team/colour/${slug}.webp`))) {
    problems.push(`assets/team/colour/${slug}.webp is missing — every pictured headshot has a colour twin; run tools/encode-images.mjs`);
  }
}

function refsIn(html) {
  const out = new Set();
  // The component scans below describe the SPA. The bio pages are the one thing here
  // that is not it — static prose, no runtime, no sequences — so a missing
  // <falling-blocks> on one of them is the correct state, not a broken scan. <x-dc> is
  // the marker: every SPA route carries it, the bio pages never do. Keep the scans HARD
  // for anything that does, which is the case the warnings below are written for.
  const isSpa = html.includes('<x-dc>');
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) out.add(m[1]);
  // og:image is an absolute URL by now (see share()), which the filter below would
  // skip as off-site. It is this site's own file, so check it as the path it names.
  for (const m of html.matchAll(/<meta property="og:image" content="([^"]+)"/g)) {
    out.add(ORIGIN && m[1].startsWith(ORIGIN + '/') ? m[1].slice(ORIGIN.length) : m[1]);
  }
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

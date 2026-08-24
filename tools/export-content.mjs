// Exports the site's structured content as data files, for the WordPress rebuild.
//
// The prototype has no CMS: the team grids, the research cards, the cycle steps and
// the per-page metadata all live as markup. The WordPress developer models them as
// post types and fields (JetEngine / CPT UI on the target install), and the honest
// source for that is data, not HTML — scraping 28 team cards by hand is an hour of
// transcription errors waiting to be found in production.
//
// This reads the rendered pages in wordpress-handoff/pages/ — the same files the
// templates are built from, so the two cannot disagree — and writes JSON and CSV
// into wordpress-handoff/content/. Run it after every export:
//
//   node tools/export-static.mjs && node tools/export-content.mjs
//
// Parsing is regex over a known, exporter-produced markup shape, not a DOM walk —
// deliberately: the repo has no DOM dependency and the shape is this repo's own
// output. Every extraction is therefore verified by count and by field before
// anything is written, and a mismatch is a hard failure naming what changed. If a
// page's structure moves, this script is meant to break loudly here rather than
// hand the rebuild a truncated team.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PAGES_DIR = path.join(root, 'wordpress-handoff/pages');
const OUT = path.join(root, 'wordpress-handoff/content');

const read = (f) => fs.readFileSync(path.join(PAGES_DIR, f), 'utf8');
const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

const problems = [];
const expect = (ok, msg) => { if (!ok) problems.push(msg); };

// ---------------------------------------------------------------------------
// Team — every <h3> on the team page is a person; nothing else uses one there.
// A card is: optional headshot <img> (a grey placeholder <div> otherwise), the
// name, a semibold role line, up to two muted lines (affiliation, location),
// and optional LinkedIn / Website links, each identified by its aria-label.
// ---------------------------------------------------------------------------
const teamHtml = read('team.html');
const h2At = [...teamHtml.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)]
  .map((m) => ({ at: m.index, text: decode(m[1]) }));
const groupAt = (i) => {
  let g = '';
  for (const h of h2At) { if (h.at < i) g = h.text; else break; }
  return g;
};

const heads = [...teamHtml.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)];
const team = heads.map((m, k) => {
  const name = decode(m[1]);
  const before = teamHtml.slice(Math.max(0, m.index - 900), m.index);
  const end = k + 1 < heads.length ? heads[k + 1].index : teamHtml.length;
  const after = teamHtml.slice(m.index, Math.min(end, m.index + 2500));

  const photo = before.match(/<img src="\.\.\/\.\.\/(assets\/team\/[^"]+)"[^>]*$/s)?.[1]
    ?? before.match(/<img src="\.\.\/\.\.\/(assets\/team\/[^"]+)"(?:(?!<h3)[\s\S])*$/)?.[1] ?? null;
  const role = after.match(/<p style="[^"]*font-weight-semibold[^"]*">([^<]+)<\/p>/)?.[1];
  const muted = [...after.matchAll(/<p style="[^"]*--text-muted[^"]*">([^<]+)<\/p>/g)].map((x) => decode(x[1]));
  const links = [...after.matchAll(/<a href="(https?:[^"]+)"[^>]*aria-label="(LinkedIn|Website)"/g)]
    .map((x) => ({ label: x[2], url: x[1] }));

  expect(role, `team: ${name} has no role line`);
  return {
    name,
    group: groupAt(m.index),
    role: role ? decode(role) : null,
    affiliation: muted[0] ?? null,
    location: muted[1] ?? null,
    photo,                                    // null = no usable photograph yet
    links,
  };
});
expect(team.length === 28, `team: expected 28 people, parsed ${team.length}`);
expect(new Set(team.map((p) => p.group)).size >= 4, 'team: expected at least 4 groups');

// ---------------------------------------------------------------------------
// Research — the "Recent Research" cards on the home page: title, description,
// and the outbound link on the card's Read-more button.
// ---------------------------------------------------------------------------
const homeHtml = read('home.html');
// The heading markup, not the bare words — "Recent Research" also appears in a
// source comment far above the section, and matching that put the slice in the
// wrong place entirely.
const researchStart = homeHtml.indexOf('>Recent Research</h2>');
expect(researchStart > 0, 'research: no "Recent Research" heading on home.html');
const researchEnd = homeHtml.indexOf('</section>', researchStart);
const researchHtml = homeHtml.slice(researchStart, researchEnd);
const research = [...researchHtml.matchAll(
  // A wrapper <div> sits between the title and its paragraph, so the seams are
  // lazy spans rather than adjacency; the count check below is what keeps a
  // loosened pattern honest.
  /<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<p[^>]*>([^<]+)<\/p>[\s\S]*?<a[^>]*href="(https?:[^"]+)"/g
)].map((m) => ({ title: decode(m[1]), description: decode(m[2]), url: m[3] }));
expect(research.length === 3, `research: expected 3 cards, parsed ${research.length}`);

// ---------------------------------------------------------------------------
// Cycle steps — the four rows of the R&D cycle wheel, read from the mobile arm,
// which carries the same copy as the desktop arm in a flatter shape. Icons come
// from the row markup itself.
// ---------------------------------------------------------------------------
// Anchor on the arm's own closing helper line and take the *nearest* at-mobile
// before it: the first at-mobile on the page is the header nav's, and slicing
// from there sweeps the desktop wheel in and mispairs its icons with the
// reading column's numbers.
const tapAt = homeHtml.indexOf('Tap a step');
const mobileArm = homeHtml.slice(homeHtml.lastIndexOf('at-mobile', tapAt), tapAt);
const cycle = [...mobileArm.matchAll(
  /<img src="\.\.\/\.\.\/(assets\/approach\/cyc[^"]+)"[\s\S]*?<span[^>]*data-num[^>]*>(\d\d)<\/span>\s*<span[^>]*>([^<]+)<\/span>[\s\S]*?<p[^>]*>([^<]+)<\/p>/g
)].map((m) => ({ number: m[2], title: decode(m[3]), body: decode(m[4]), icon: m[1] }));
expect(cycle.length === 4, `cycle: expected 4 steps, parsed ${cycle.length}`);

// ---------------------------------------------------------------------------
// Page metadata — each exported page carries its route's own <title> and
// descriptions in its head; there is no second copy to transcribe.
// ---------------------------------------------------------------------------
const ROUTES = [
  ['home.html', '/'], ['challenge.html', '/challenge/'], ['approach.html', '/approach/'],
  ['team.html', '/team/'], ['follow.html', '/follow/'],
];
const pages = ROUTES.map(([file, route]) => {
  const html = read(file);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  expect(title && description, `pages: ${file} is missing a title or description`);
  return { route, file, title: decode(title ?? ''), description: decode(description ?? '') };
});

// ---------------------------------------------------------------------------
// Redirects — the old long slugs, read from MOVED in build-site.mjs so this
// stays a single list. CSV in the Redirection plugin's import format.
// ---------------------------------------------------------------------------
const buildSrc = fs.readFileSync(path.join(root, 'tools/build-site.mjs'), 'utf8');
const movedBlock = buildSrc.match(/const MOVED = \[([\s\S]*?)\];/)?.[1] ?? '';
const redirects = [...movedBlock.matchAll(/\['([^']+)',\s*'([^']+)'\]/g)]
  .map((m) => ({ source: `/${m[1]}/`, target: `/${m[2]}/` }));
expect(redirects.length === 4, `redirects: expected 4 MOVED entries in build-site.mjs, parsed ${redirects.length}`);

// ---------------------------------------------------------------------------
if (problems.length) {
  for (const p of problems) console.error(`::error::export-content: ${p}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const write = (name, data) => {
  fs.writeFileSync(path.join(OUT, name),
    typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
  console.log(`${name.padEnd(15)} ${typeof data === 'string' ? data.trim().split('\n').length - 1 + ' rows' : data.length + ' records'}`);
};

write('team.json', team);
write('research.json', research);
write('cycle.json', cycle);
write('pages.json', pages);
write('redirects.csv', 'source,target\n' + redirects.map((r) => `${r.source},${r.target}`).join('\n') + '\n');
console.log(`\n-> wordpress-handoff/content/  (parsed from wordpress-handoff/pages/, ${team.length} team / ${research.length} research / ${cycle.length} cycle steps)`);

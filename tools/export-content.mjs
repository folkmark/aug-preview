// Exports the site's structured content as data files, for the WordPress rebuild.
//
// The prototype has no CMS: the team grids, the research cards, the cycle steps and
// the per-page metadata all live as markup. The WordPress developer models them as
// post types and fields (JetEngine / CPT UI on the target install), and the honest
// source for that is data, not HTML — scraping 24 team cards by hand is an hour of
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

  // The bio link, read from the UNCAPPED card slice rather than from `after`. The link
  // is the last thing in its card, after the role, any muted lines and the icon row, so
  // it is the part of a card most likely to fall past `after`'s 2500-character cap. It
  // does not today — measured on this export, "Read bio" sits 904 to 1847 characters
  // after its <h3>, the far end being a Fellow's card — but when the bios were still set
  // inline it did, silently: null, no error, a green build. `end` — the next <h3> — is
  // the real bound and is already computed above.
  //
  // Do NOT widen `after` to reach it. That 2500 is what stops one person's role, muted
  // lines and links bleeding into the next; widening it enlarges the blast radius for
  // everyone to solve a problem this slice solves for free.
  const card = teamHtml.slice(m.index, end);
  // The bio URL, not the bio text. Until September the five leadership bios were set
  // inline in the card and this pulled their paragraphs out; they now live one per file
  // in source-material/bios/ and build as their own pages at /team/<slug>/, so what the
  // card carries is a link. Exporting the URL keeps the rebuild honest about where the
  // prose is without copying it into a second place that can drift out of step.
  //
  // href is NOT the first attribute. The link is the design system's link button, which
  // renders data-slot and data-variant ahead of it, so the pattern allows anything before
  // href inside the tag. The relational count below is what catches a shape this misses.
  const bioUrl = card.match(/<a\b[^>]*?\shref="([^"]*\/team\/[a-z0-9-]+\/)"[^>]*>\s*Read bio/)?.[1] ?? null;

  return {
    name,
    group: groupAt(m.index),
    role: role ? decode(role) : null,
    affiliation: muted[0] ?? null,
    location: muted[1] ?? null,
    photo,                                    // null = no usable photograph yet
    bioUrl,                                   // null = no bio page for this person
    links,
  };
});
expect(team.length === 29, `team: expected 29 people, parsed ${team.length}`);

// A role line is no longer on every card. In September five people were added from the
// website info form before anyone had given their titles, and the client chose to show
// them without. Abby (Csaba) Petre's arrived on the 25th (Head of Engineering); Aarav
// Kalkar, Byungyeon Yun, Stephen Hutt and Sonia Prusaitis still carry `role: null` until
// theirs do.
//
// Not simply dropped, though: every card used to be asserted to have one, and that check is
// what would catch the role <p> changing shape and every role in the export silently going
// to null. So the number without one is pinned, the same way the people and headshot counts
// are, and filling in a title means changing this 4 on purpose.
const roleless = team.filter((p) => !p.role).map((p) => p.name);
expect(
  roleless.length === 4,
  `team: expected 4 people without a role line, parsed ${roleless.length} (${roleless.join(', ')}) — ` +
    'has the role <p> changed shape?'
);
expect(new Set(team.map((p) => p.group)).size >= 4, 'team: expected at least 4 groups');

// Bio links asserted RELATIONALLY, not against a hard-coded 4. How many leaders have a
// bio is not a fixed fact about this site the way 24 people or 4 redirects are — a fifth
// leader should be a markup change, not a build break. Counting the "Read bio" links in
// the raw markup and matching still fails loudly on the case that matters: a link that is
// on the page and did not survive the parse, which is what a changed href shape does.
const bioLinks = (teamHtml.match(/>\s*Read bio\s*</g) ?? []).length;
const bioParsed = team.filter((p) => p.bioUrl).length;
expect(
  bioParsed === bioLinks,
  `team: ${bioLinks} "Read bio" link(s) in the markup but ${bioParsed} parsed — ` +
    'has the href shape or the link text changed?'
);

// Nothing asserted on photo until now, and the photo regex is anchored on `<img src="`.
// React preserves author attribute order for everything but style, so writing
// `<img class="..." src="...">` in index.html takes every headshot to null with a green
// build and hands the rebuild a photo-less team. This is the cheapest possible guard.
expect(
  team.filter((p) => p.photo).length === 25,
  `team: expected 25 headshots, parsed ${team.filter((p) => p.photo).length} — ` +
    'has src stopped being the first attribute on a team <img>?'
);

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
// Anchor on the arm's own closing helper line and take the nearest
// data-cycle-list before it — the cycle-wheel component's hook for the mobile
// arm. Anchoring on the page's at-mobile utility class was tried twice and
// wrong twice: the header nav carries it too, and slicing from there sweeps
// the desktop wheel in and mispairs its icons with the reading column's
// numbers.
const tapAt = homeHtml.indexOf('Tap a step');
const mobileArm = homeHtml.slice(homeHtml.lastIndexOf('data-cycle-list', tapAt), tapAt);
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

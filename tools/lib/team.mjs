// The team roster, source-material/team/people.json, and the Who We Are tiles written
// from it.
//
// Everyone the site has ever known about is in the roster: the people on the page, the
// people waiting for a group, and the people taken off it. One rule decides who appears:
//
//   a person SURFACES if they have a group and are not tagged "Archived".
//
// So assigning a group is what puts someone on the page, and the Archived tag is what
// takes them off again without losing anything about them: they keep their group, their
// bio and their photograph's history, and un-archiving is one edit.
//
// WHY THE TILES ARE GENERATED rather than checked against hand-written markup. The tiles
// were hand-written until September 2026, and they broke twice in that time in ways only
// a structural check caught (PR #51 put Brandon's card outside its grid and left a stray
// </div>). A check that only reports disagreement would still leave two places to edit for
// every change. The tiles are a pure function of the roster, and tools/build-wp-plugin.mjs
// already insists every tile uses identical style strings, so there is nothing a hand
// could add that the generator should not.
//
// ONLY THE TILES. Each group's section around its grid differs — Leadership's padding, the
// wrapper on the Technology and Design heading, the section-closing quirk after the
// Leadership grid — so the sections stay hand-written and the generator owns only the run
// of tiles between two marker comments inside each .team-grid-3. The runtime drops
// template comments (none of the template's other comments reaches the export), so the
// markers never reach a page — but the whitespace around a comment survives it, so each
// marker sits on a line the grid already has: the opening one at the end of the grid's
// own <div> line, the closing one just before the grid's </div>. On lines of their own
// they left eight blank lines in the exported team page.
//
// THE MARKUP IS TODAY'S, BYTE FOR BYTE. Downstream code reads it with regexes, not a DOM:
//   - <img src=...> keeps src as its FIRST attribute. tools/export-content.mjs anchors on
//     `<img src="` and React keeps author attribute order for everything except style, so
//     reordering takes every headshot to null (sections/leadership.md, "Two invariants").
//   - No boolean attributes. React drops required="" and its kind (an empty string is a
//     false prop), so nothing here writes one.
//   - The marker text must not contain `assets/team/`, `team/<slug>/` or `<h3`:
//     tools/cutout-headshots.py pictured(), build-site's colour-twin scan and its bio-link
//     gate all read raw index.html for exactly those strings.
import fs from 'node:fs';
import path from 'node:path';

export const ROSTER = 'source-material/team/people.json';
export const TAGS = ['Archived'];

export function readRoster(root) {
  return JSON.parse(fs.readFileSync(path.join(root, ROSTER), 'utf8'));
}

// The canonical text of the roster: two-space JSON with a final newline. Enforced by
// `tools/build-team.mjs --check` so a diff is always one line per change.
export const formatRoster = (roster) => JSON.stringify(roster, null, 2) + '\n';

export const isArchived = (p) => (p.tags || []).includes('Archived');
export const surfaces = (p) => Boolean(p.group) && !isArchived(p);
export const hasPhoto = (p) => Boolean(p.photo && p.photo.master);
export const hasBio = (root, slug) => fs.existsSync(path.join(root, 'source-material/bios', `${slug}.md`));

// Surfaced people in page order: group by group, then by `order` inside each.
export function surfaced(roster) {
  const rank = new Map(roster.groups.map((g, i) => [g.key, i]));
  return roster.people.filter(surfaces)
    .sort((a, b) => rank.get(a.group) - rank.get(b.group) || a.order - b.order);
}
export const surfacedWithPhoto = (roster) => surfaced(roster).filter(hasPhoto);

// What a person is, in one word, for reports and the Team Universe sheet.
export const statusOf = (p) => (isArchived(p) ? 'archived' : p.group ? 'on_site' : 'held');

// ---------------------------------------------------------------- the tile

const text = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => text(s).replace(/"/g, '&quot;');

const IN = '          ';
const TILE_OPEN = 'style="opacity:0;transition:opacity var(--transition-fade)"';
const IMG_STYLE = 'aspect-ratio:1/1;width:100%;object-fit:cover;object-position:50% 50%;border-radius:var(--radius-image);margin-bottom:var(--space-6);display:block';
// The grey square a person without a usable photograph gets. tools/build-wp-plugin.mjs pins
// the exported form of it, for the day nobody on the page is waiting for a photograph.
export const PLACEHOLDER = '<div style="aspect-ratio:1/1;width:100%;background:var(--color-st-tropaz-lightest);border-radius:var(--radius-image);margin-bottom:var(--space-6)"></div>';
const H3_STYLE = 'font-size:var(--text-h5);line-height:var(--text-h5-line-height);letter-spacing:var(--heading-letter-spacing);font-weight:var(--font-weight-bold);margin:0 0 var(--space-2)';
const ROLE_STYLE = 'font-weight:var(--font-weight-semibold);font-size:var(--text-small);margin:0';
const MUTED = 'font-size:var(--text-small);line-height:var(--text-body-line-height);color:var(--text-muted);margin:';
const LINKS_STYLE = 'margin-top:var(--space-5);display:flex;align-items:center;gap:var(--space-4)';
const DS = 'AugmentEDDesignSystem_191b99';

export function renderTile(p, bio) {
  const out = [];
  out.push(bio
    ? `${IN}<div class="bio-tile" data-reveal="" id="${p.slug}" ${TILE_OPEN}>`
    : `${IN}<div data-reveal="" ${TILE_OPEN}>`);
  out.push(hasPhoto(p)
    ? `${IN}  <img src="assets/team/${p.slug}.webp" alt="${attr(p.name)}" style="${IMG_STYLE}" width="512" height="512" decoding="async" loading="lazy">`
    : `${IN}  ${PLACEHOLDER}`);
  out.push(`${IN}  <h3 style="${H3_STYLE}">${text(p.name)}</h3>`);
  if (p.role) out.push(`${IN}  <p style="${ROLE_STYLE}">${text(p.role)}</p>`);
  // A Fellow's school, then their city. The city's margin is 0 because it sits directly
  // under the school; the school's top margin spaces the pair from the role.
  if (p.affiliation) out.push(`${IN}  <p style="${MUTED}var(--space-1) 0 0">${text(p.affiliation)}</p>`);
  if (p.location) out.push(`${IN}  <p style="${MUTED}0">${text(p.location)}</p>`);
  if (p.linkedin || p.website) {
    out.push(`${IN}  <div style="${LINKS_STYLE}">`);
    if (p.linkedin) out.push(`${IN}    <a href="${attr(p.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn" style="display:flex"><img src="assets/icons/linkedin.svg" alt="" style="width:var(--icon-size);height:var(--icon-size);display:block" width="24" height="24" decoding="async" loading="lazy"></a>`);
    if (p.website) out.push(`${IN}    <a href="${attr(p.website)}" target="_blank" rel="noopener" aria-label="Website" style="display:flex"><x-import component-from-global-scope="${DS}.Icon" name="language"></x-import></a>`);
    out.push(`${IN}  </div>`);
  }
  if (bio) {
    out.push(`${IN}  <p class="bio-cta"><x-import component-from-global-scope="${DS}.Button" variant="link" as="a" href="team/${p.slug}/">Read bio<span class="visually-hidden"> of ${text(p.name)}</span><x-import component-from-global-scope="${DS}.Icon" name="chevron_right" size="sm"></x-import></x-import></p>`);
  }
  out.push(`${IN}</div>`);
  return out.join('\n');
}

export function renderTiles(root, roster, groupKey) {
  return surfaced(roster).filter((p) => p.group === groupKey)
    .map((p) => renderTile(p, hasBio(root, p.slug))).join('\n');
}

// ---------------------------------------------------------------- the markers

const startMarker = (key) => `<!-- team tiles: ${key}. Written by tools/build-team.mjs from the roster in source-material; edit the roster, not these tiles. -->`;
const endMarker = (key) => `<!-- /team tiles: ${key} -->`;

// Where each group's tiles sit in index.html, or a reason they cannot be found.
function regions(html, roster) {
  const found = [];
  const errs = [];
  let from = 0;
  for (const g of roster.groups) {
    const s = html.indexOf(startMarker(g.key), from);
    const e = s < 0 ? -1 : html.indexOf(endMarker(g.key), s);
    if (s < 0 || e < 0) { errs.push(`index.html has no tile markers for "${g.key}" (or they are out of group order)`); continue; }
    // The group's own heading must be the last <h2> before its tiles, so a roster whose
    // group names and the page's headings disagree cannot pass silently.
    const heads = [...html.slice(0, s).matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)];
    const heading = heads.length ? heads[heads.length - 1][1].trim() : '';
    if (heading !== g.name) errs.push(`the "${g.key}" tiles sit under the heading "${heading}", not "${g.name}"`);
    // The tiles are the whole lines between the marker's line and the closing marker's.
    const bodyStart = html.indexOf('\n', s) + 1;
    const bodyEnd = html.lastIndexOf('\n', e) + 1;
    found.push({ key: g.key, bodyStart, bodyEnd, body: html.slice(bodyStart, bodyEnd) });
    from = e;
  }
  return { found, errs };
}

// index.html with every group's tiles rewritten from the roster.
export function spliceTeam(root, html, roster) {
  const { found, errs } = regions(html, roster);
  if (errs.length) throw new Error(errs.join('\n'));
  let out = html;
  for (const r of [...found].reverse()) {
    const tiles = renderTiles(root, roster, r.key);
    out = out.slice(0, r.bodyStart) + (tiles ? tiles + '\n' : '') + out.slice(r.bodyEnd);
  }
  return out;
}

// ---------------------------------------------------------------- the checks

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MASTERS = 'source-material/image-sources/team';

// Everything that has to be true of the roster and the files around it. Returned as a list
// of problems so build-site can report them with its own, and tools/build-team.mjs --check
// can exit on them.
export function checkTeam(root, html, roster = readRoster(root)) {
  const problems = [];
  const groups = new Set(roster.groups.map((g) => g.key));
  const seen = new Set();
  const orders = new Map();
  for (const p of roster.people) {
    const who = p.slug || p.name || '(unnamed)';
    if (!SLUG.test(p.slug || '')) problems.push(`roster: ${who} has an unusable slug`);
    if (seen.has(p.slug)) problems.push(`roster: two people share the slug ${p.slug}`);
    seen.add(p.slug);
    if (!p.name) problems.push(`roster: ${who} has no name`);
    if (p.group !== null && !groups.has(p.group)) problems.push(`roster: ${who} has the unknown group "${p.group}"`);
    for (const t of p.tags || []) if (!TAGS.includes(t)) problems.push(`roster: ${who} has the unknown tag "${t}" (known: ${TAGS.join(', ')})`);
    if (p.location && !p.affiliation) problems.push(`roster: ${who} has a location but no affiliation — the tile has no shape for that`);
    if (surfaces(p)) {
      if (!Number.isInteger(p.order)) problems.push(`roster: ${who} is on the page but has no order`);
      const k = `${p.group}:${p.order}`;
      if (orders.has(k)) problems.push(`roster: ${who} and ${orders.get(k)} share order ${p.order} in ${p.group}`);
      orders.set(k, who);
    }
  }

  // Photographs. A master is the file the cut-out tool reads, and its glob wants exactly one
  // file per slug. Masters are kept for people off the page too (the archived); what must
  // exist ONLY for people on the page is everything that gets published from them.
  const masters = fs.readdirSync(path.join(root, MASTERS)).filter((f) => !f.startsWith('.'));
  for (const p of roster.people) {
    const mine = masters.filter((f) => f.replace(/\.[^.]+$/, '') === p.slug);
    if (hasPhoto(p)) {
      if (!mine.includes(p.photo.master)) problems.push(`roster: ${p.slug}'s master ${MASTERS}/${p.photo.master} is missing`);
      if (mine.length > 1) problems.push(`${MASTERS} has ${mine.length} files for ${p.slug}; the cut-out tool needs exactly one`);
    } else if (mine.length) {
      problems.push(`${MASTERS}/${mine[0]} is not recorded as ${p.slug}'s photo in the roster`);
    }
  }
  for (const f of masters) {
    if (!seen.has(f.replace(/\.[^.]+$/, ''))) problems.push(`${MASTERS}/${f} belongs to nobody in the roster`);
  }
  // What is published, and the cut-out it is made from, exist exactly for the people on
  // the page with a photograph. Anything else in assets/team/ is published and linked from
  // nowhere, which is what 8db345c had to clean up by hand.
  const want = new Set(surfacedWithPhoto(roster).map((p) => p.slug));
  for (const dir of ['assets/team', 'assets/team/colour', 'source-material/image-sources/team-cutout']) {
    const have = new Set(fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)));
    for (const s of want) if (!have.has(s)) problems.push(`${dir}/${s}.webp is missing — run tools/cutout-headshots.py --only=${s} and tools/encode-images.mjs --only=${s}`);
    for (const s of have) if (!want.has(s)) problems.push(`${dir}/${s}.webp belongs to nobody on the page — ${seen.has(s) ? 'they are not on the page' : 'nobody in the roster'}; tools/encode-images.mjs removes stale encodes`);
  }

  // Bios. Every bio belongs to someone in the roster; build-site builds a page only for
  // the ones on the page. A surfaced person's bio page repeats their name, so the two
  // must agree.
  const bioDir = path.join(root, 'source-material/bios');
  for (const f of fs.readdirSync(bioDir).filter((f) => f.endsWith('.md') && f !== 'README.md')) {
    const slug = f.slice(0, -3);
    const p = roster.people.find((x) => x.slug === slug);
    if (!p) { problems.push(`source-material/bios/${f} belongs to nobody in the roster — add them (with group null to keep them off the page)`); continue; }
    const title = (fs.readFileSync(path.join(bioDir, f), 'utf8').match(/^# (.+)$/m) || [])[1];
    if (title && title.trim() !== p.name) problems.push(`source-material/bios/${f} is titled "${title.trim()}" but the roster calls them "${p.name}"`);
  }

  // The page itself.
  const { found, errs } = regions(html, roster);
  problems.push(...errs);
  for (const r of found) {
    const tiles = renderTiles(root, roster, r.key);
    if (r.body !== (tiles ? tiles + '\n' : '')) {
      const a = r.body.split('\n'), b = (tiles ? tiles + '\n' : '').split('\n');
      let i = 0;
      while (i < a.length && a[i] === b[i]) i++;
      const line = html.slice(0, r.bodyStart).split('\n').length + i;
      problems.push(`index.html:${line}: the ${r.key} tiles differ from the roster — edit source-material/team/people.json and run node tools/build-team.mjs, never the tiles`);
    }
  }
  if (html.includes('<!-- team tiles:') && !found.length) problems.push('index.html has tile markers but none could be read');
  return problems;
}

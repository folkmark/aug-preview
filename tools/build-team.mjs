// Writes the Who We Are tiles in index.html from the roster, source-material/team/people.json.
//
//   node tools/build-team.mjs            rewrite the tiles, then say what else to run
//   node tools/build-team.mjs --check    exit 1 if index.html or the roster's files disagree
//   node tools/build-team.mjs --format   rewrite the roster in its canonical form
//
// The roster holds everyone; a person appears on the page when they have a group and are
// not tagged "Archived" (tools/lib/team.mjs says why, and what the markup must keep).
// Putting someone on the page is therefore an edit to the roster followed by this,
// the cut-out and the encoder for their photograph, and the export chain:
//
//   node tools/build-team.mjs
//   <venv>/python3 tools/cutout-headshots.py --only=<slug>     # if they have a photograph
//   node tools/encode-images.mjs --only=<slug>
//   node tools/export-static.mjs && node tools/export-content.mjs && node tools/build-wp-plugin.mjs
//   node tools/build-site.mjs _site
//
// Taking someone off is the tag, never a deletion: the encoder then removes their
// published photographs, build-site stops building their bio page, and the WordPress
// import marks their post Archived instead of deleting it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROSTER, readRoster, formatRoster, spliceTeam, checkTeam, surfaced, hasPhoto, hasBio, statusOf } from './lib/team.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const indexPath = path.join(root, 'index.html');
const roster = readRoster(root);

if (args.includes('--format')) {
  fs.writeFileSync(path.join(root, ROSTER), formatRoster(roster));
  console.log(`formatted ${ROSTER}`);
  process.exit(0);
}

if (args.includes('--check')) {
  const problems = checkTeam(root, fs.readFileSync(indexPath, 'utf8'), roster);
  if (fs.readFileSync(path.join(root, ROSTER), 'utf8') !== formatRoster(roster)) {
    problems.push(`${ROSTER} is not in canonical form — run node tools/build-team.mjs --format`);
  }
  for (const p of problems) console.error(`::error::${p}`);
  if (problems.length) process.exit(1);
  console.log('the team tiles and the roster agree');
  process.exit(0);
}

const before = fs.readFileSync(indexPath, 'utf8');
const after = spliceTeam(root, before, roster);
if (after !== before) fs.writeFileSync(indexPath, after);
console.log(after === before ? 'index.html: tiles already match the roster' : 'index.html: tiles rewritten from the roster');

// What the page now shows, per group, and who is kept off it.
for (const g of roster.groups) {
  const on = surfaced(roster).filter((p) => p.group === g.key);
  console.log(`  ${g.name}: ${on.length} (${on.filter(hasPhoto).length} photos, ${on.filter((p) => !hasPhoto(p)).length} placeholders, ${on.filter((p) => hasBio(root, p.slug)).length} bios)`);
}
for (const status of ['held', 'archived']) {
  const off = roster.people.filter((p) => statusOf(p) === status);
  if (off.length) console.log(`  ${status}: ${off.map((p) => p.slug).join(', ')}`);
}

// Anyone on the page with a photograph that has not been cut out and encoded yet.
const pending = surfaced(roster).filter(hasPhoto)
  .filter((p) => !fs.existsSync(path.join(root, 'assets/team', `${p.slug}.webp`))).map((p) => p.slug);
if (pending.length) {
  console.log(`\nnext, for ${pending.join(', ')}:`);
  console.log(`  <venv>/python3 tools/cutout-headshots.py --only=${pending.join(',')}`);
  console.log(`  node tools/encode-images.mjs --only=${pending.join(',')}`);
}
const problems = checkTeam(root, after, roster).filter((p) => !pending.some((s) => p.includes(`/${s}.webp is missing`)));
for (const p of problems) console.error(`::error::${p}`);
if (problems.length) process.exit(1);

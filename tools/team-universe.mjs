// Writes the "AugmentED — Team Universe" sheet from the roster, as CSV:
//
//   npm i --no-save sharp && node tools/team-universe.mjs <out.csv>
//
// The sheet is the roster for people who do not read JSON: one row per person, everyone the
// site knows about, whether on the page, held for a group or archived. It used to be built
// by hand from the page, the two Google Sheets and the git log, and it drifted from all
// three. Now source-material/team/people.json is the one place, and this is a view of it:
// run it after a roster change and upload the CSV over the sheet.
//
// Nothing here is typed twice. Status is worked out by the same rule that decides the page
// (tools/lib/team.mjs); photograph sizes are read off the masters; URLs are built from the
// site's domain in CNAME; a bio's word count and text come from its file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRoster, surfaces, hasPhoto, hasBio, statusOf } from './lib/team.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = process.argv[2];
if (!out) {
  console.error('usage: node tools/team-universe.mjs <out.csv>');
  process.exit(1);
}
const sharp = await import('sharp').then((m) => m.default).catch(() => {
  console.error('sharp is not installed: npm i --no-save sharp');
  process.exit(1);
});

const roster = readRoster(root);
const origin = `https://${fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim()}`;
const groupName = new Map(roster.groups.map((g) => [g.key, g.name]));
const bool = (v) => (v === true ? 'TRUE' : v === false ? 'FALSE' : '');
const SOURCE = { tracker: 'tracker_sheet', form: 'form_upload' };

const COLUMNS = ['person_id', 'slug', 'full_name', 'group_name', 'sort_order', 'title', 'organisation', 'location', 'status', 'tags',
  'status_since', 'status_commit', 'open_actions', 'notes', 'linkedin_url', 'linkedin_on_site', 'website_url', 'website_on_site',
  'headshot_status', 'headshot_approved', 'headshot_source', 'headshot_source_ref', 'headshot_master_path', 'headshot_master_width_px',
  'headshot_master_height_px', 'headshot_upscale', 'headshot_edges_faded', 'headshot_edges_extended', 'headshot_duotone_url',
  'headshot_colour_url', 'headshot_notes', 'bio_published', 'bio_page_url', 'bio_source', 'bio_tracker_approved', 'bio_word_count',
  'bio_text', 'form_submitted_at', 'form_name_as_submitted', 'form_linkedin_url', 'form_other_profile', 'form_headshot_drive_id',
  'form_group_note', 'form_outcome', 'form_outcome_detail', 'history'];

// A bio's paragraphs, as build-site reads them: everything after the "# name" and "## role" lines.
const bioText = (slug) => fs.readFileSync(path.join(root, 'source-material/bios', `${slug}.md`), 'utf8')
  .split('\n').filter((l) => !l.startsWith('#')).join('\n').trim().split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).join('\n\n');

// On the page first, in page order; then the held, then the archived, each by id.
const rank = { on_site: 0, held: 1, archived: 2 };
const gRank = new Map(roster.groups.map((g, i) => [g.key, i]));
const people = [...roster.people].sort((a, b) => rank[statusOf(a)] - rank[statusOf(b)]
  || (surfaces(a) && surfaces(b) ? gRank.get(a.group) - gRank.get(b.group) || a.order - b.order : a.id - b.id));

const rows = [];
for (const p of people) {
  const on = surfaces(p);
  const ph = p.photo || {};
  const shown = on && hasPhoto(p);
  const bio = hasBio(root, p.slug) ? bioText(p.slug) : '';
  let w = '', h = '';
  if (ph.master) ({ width: w, height: h } = await sharp(path.join(root, 'source-material/image-sources/team', ph.master)).metadata());
  const r = {
    person_id: p.id, slug: p.slug, full_name: p.name, group_name: groupName.get(p.group) || '', sort_order: on ? p.order : '',
    title: p.role || '', organisation: p.affiliation || '', location: p.location || '',
    status: statusOf(p), tags: (p.tags || []).join(', '),
    status_since: p.archived?.since || '', status_commit: p.archived?.commit || '',
    open_actions: (p.actions || []).join('\n'), notes: p.notes || '',
    linkedin_url: p.linkedin || '', linkedin_on_site: p.linkedin ? bool(on) : '',
    website_url: p.website || '', website_on_site: p.website ? bool(on) : '',
    headshot_status: shown ? 'on_site' : ph.master ? 'kept_off_site' : ph.drive ? 'in_form_only' : '',
    headshot_approved: bool(ph.approved), headshot_source: SOURCE[ph.from] || ph.from || '', headshot_source_ref: ph.ref || '',
    headshot_master_path: ph.master ? `source-material/image-sources/team/${ph.master}` : '',
    headshot_master_width_px: w, headshot_master_height_px: h,
    headshot_upscale: ph.upscale ?? '', headshot_edges_faded: ph.edgesFaded || '', headshot_edges_extended: ph.edgesExtended || '',
    headshot_duotone_url: shown ? `${origin}/assets/team/${p.slug}.webp` : '',
    headshot_colour_url: shown ? `${origin}/assets/team/colour/${p.slug}.webp` : '',
    headshot_notes: ph.notes || '',
    bio_published: bio ? bool(on) : '', bio_page_url: bio && on ? `${origin}/team/${p.slug}/` : '',
    bio_source: p.bioSource?.from || '', bio_tracker_approved: bool(p.bioSource?.trackerApproved),
    bio_word_count: bio ? bio.split(/\s+/).length : '', bio_text: bio,
    form_submitted_at: p.form?.submitted || '', form_name_as_submitted: p.form?.name || '', form_linkedin_url: p.form?.linkedin || '',
    form_other_profile: p.form?.other || '', form_headshot_drive_id: p.form?.headshot || '', form_group_note: p.form?.group || '',
    form_outcome: p.form?.outcome || '', form_outcome_detail: p.form?.detail || '',
    history: (p.history || []).join('\n'),
  };
  rows.push(COLUMNS.map((c) => r[c]));
}

const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
fs.writeFileSync(out, [COLUMNS, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n');
const count = (s) => people.filter((p) => statusOf(p) === s).length;
console.log(`${out}: ${rows.length} people (${count('on_site')} on the page, ${count('held')} held, ${count('archived')} archived), ${COLUMNS.length} columns`);

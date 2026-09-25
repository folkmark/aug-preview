// Generates the WordPress plugin's page-shaped half from the site itself.
//
// The plugin (wordpress-handoff/plugin/augmented-ed/) is two things. A small runtime written
// by hand — page-template registration, the team importer, the form's HubSpot relay, the
// offsets — and everything that has the site's own shape: five page templates, the bio
// template, the program bar, a team tile, and one stylesheet. This writes the second half,
// into generated/, from the committed export (wordpress-handoff/pages/, written by
// tools/export-static.mjs) and the content files beside it. Nothing in generated/ is edited
// by hand; change index.html, re-export, and run this again.
//
// It does the work a WordPress developer would otherwise do by hand from the exported
// pages, and does it the same way every time:
//
//   - the page's links become calls that find whichever WordPress page carries each
//     template, so the site can live at any URL (augmented_ed_url());
//   - every asset path becomes a URL into the plugin (augmented_ed_asset()), and is
//     recorded, so the zip ships exactly what the pages use;
//   - the site's header becomes a program bar that sits UNDER the host's own header, and
//     the site's footer goes, because AERDF's stays;
//   - the design system's inline styles are kept exactly as exported — they are its only
//     styling — and the hover and checked states the export cannot see are generated from
//     pages/states.json;
//   - the Follow form becomes a real form with real inputs that posts to the plugin;
//   - the team grid becomes a loop over AERDF's team posts, through one tile template
//     derived from the 29 exported tiles and proven against them;
//   - every stylesheet is scoped to #augmented-ed (tools/lib/css-scope.mjs).
//
// Usage:
//   npm i --no-save linkedom@0.18.13 postcss@8.5.28 postcss-selector-parser@7.1.6
//   node tools/build-wp-plugin.mjs              write generated/
//   node tools/build-wp-plugin.mjs --check      regenerate in memory and fail if generated/
//                                               differs; also php -l and the tile golden test
//   node tools/build-wp-plugin.mjs --assemble dist [--zip]
//                                               copy the plugin and the assets it ships into
//                                               dist/augmented-ed/ (and zip it)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { scopeCss, assertScoped } from './lib/css-scope.mjs';
import { readBios, lede, staticHelper, phpHelper, bioBody, BIO_PROFILE_CSS, BIO_PROFILE_DESKTOP_CSS } from './lib/bio-page.mjs';
import { unserved, readManifest, heroFrames, fallingFrames } from './lib/sequences.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PAGES_DIR = path.join(root, 'wordpress-handoff/pages');
const CONTENT_DIR = path.join(root, 'wordpress-handoff/content');
const PLUGIN = path.join(root, 'wordpress-handoff/plugin/augmented-ed');
const GEN_REL = 'generated';
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const ASSEMBLE = args.includes('--assemble') ? args[args.indexOf('--assemble') + 1] : null;
const ZIP = args.includes('--zip');

const problems = [];
const fail = (msg) => problems.push(msg);
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// The five pages, keyed as the plugin's templates are. The key is the contract with the
// runtime (includes/templates.php): augmented_ed_url('team') is "the page using the team
// template", wherever AERDF puts it.
const PAGES = [
  { key: 'home', file: 'home.html', route: '/', label: 'Home' },
  { key: 'challenge', file: 'challenge.html', route: '/challenge/', label: 'The Challenge' },
  { key: 'approach', file: 'approach.html', route: '/approach/', label: 'Our Approach' },
  { key: 'team', file: 'team.html', route: '/team/', label: 'Who We Are' },
  { key: 'follow', file: 'follow.html', route: '/follow/', label: 'Follow Our Work' },
];
const ROUTE_KEY = Object.fromEntries(PAGES.map((p) => [p.route, p.key]));

// ---------------------------------------------------------------- PHP tokens
//
// The templates are built as DOM and serialised, and a DOM cannot hold PHP. So each piece
// of PHP goes in as an inert token — letters and digits only, which no serialiser escapes —
// and the tokens are swapped for their code after serialisation.
const phpCode = [];
const T = (code) => { phpCode.push(code); return `AUGPHP${phpCode.length - 1}X`; };
const untoken = (s) => s.replace(/AUGPHP(\d+)X/g, (m, i) => phpCode[Number(i)]);
const echoUrl = (expr) => T(`<?php echo esc_url( ${expr} ); ?>`);
const phpStr = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

// ---------------------------------------------------------------- the export

const exported = Object.fromEntries(PAGES.map((p) => [p.key, fs.readFileSync(path.join(PAGES_DIR, p.file), 'utf8')]));
const stampLine = (exported.home.match(/<!-- (exported from [^>]*?) -->/) || [])[1];
if (!stampLine) fail('wordpress-handoff/pages/home.html carries no export stamp — regenerate with tools/export-static.mjs');
const stampHash = (stampLine || '').match(/index\.html sha256 ([0-9a-f]{16})/)?.[1];
const indexHtml = read('index.html');
if (stampHash && stampHash !== sha(indexHtml)) {
  // A warning, as build-site.mjs's is: the plugin is generated from the export, not from
  // index.html, so a stale export makes a stale plugin — but that is a reason to
  // re-export, and CI does not have a browser to do it with.
  console.warn('::warning::the export was taken from a different index.html — re-run tools/export-static.mjs, then this');
}
const states = JSON.parse(fs.readFileSync(path.join(PAGES_DIR, 'states.json'), 'utf8'));
const team = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'team.json'), 'utf8'));
const pagesMeta = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'pages.json'), 'utf8'));

for (const [key, html] of Object.entries(exported)) {
  // T1. What must not be in an export this is built from. Each is a real failure seen or
  // designed against: a hydration placeholder is a page with a hole in it, a runtime
  // wrapper is markup no host should carry, {{ is an unrendered binding, <? would open PHP
  // inside a template, and the Approach scrub is parked.
  for (const [what, re] of [['a runtime wrapper (sc-host)', /class="sc-host/], ['a hydration placeholder', /sc-placeholder/],
    ['an unrendered {{ binding }}', /\{\{/], ['a PHP open tag', /<\?/], ['the parked <approach-scrub>', /<approach-scrub\b/]]) {
    if (re.test(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, ''))) fail(`${key}.html contains ${what}`);
  }
}

// ---------------------------------------------------------------- shared rewrites

const shipped = new Set(); // repository paths the zip must carry, beyond the sequences

function assetToken(repoPath) {
  // A base= is a directory the component builds frame names under; the frames themselves
  // are listed from their manifests below, so only files are recorded here.
  if (!repoPath.endsWith('/')) shipped.add(repoPath);
  return echoUrl(`augmented_ed_asset( ${phpStr(repoPath.replace(/^assets\//, ''))} )`);
}

// T6 and T7: links and asset paths, anywhere in a subtree.
function rewriteRefs(el, where) {
  const toAsset = (v) => {
    if (v.startsWith('../../assets/')) return assetToken(v.slice('../../'.length));
    if (v.startsWith('../../_ds/')) { fail(`${where}: a body reference into the design system (${v}) — only its fonts ship, through the stylesheet`); return v; }
    return null;
  };
  for (const n of [el, ...el.querySelectorAll('*')]) {
    for (const attr of ['src', 'base', 'poster']) {
      const v = n.getAttribute && n.getAttribute(attr);
      if (!v) continue;
      const t = toAsset(v);
      if (t) n.setAttribute(attr, t);
      else if (!/^(https?:|data:)/.test(v)) fail(`${where}: <${n.tagName.toLowerCase()} ${attr}="${v}"> is not an asset path this can ship`);
    }
    const ss = n.getAttribute && n.getAttribute('srcset');
    if (ss) {
      n.setAttribute('srcset', ss.split(',').map((c) => {
        const [u, ...d] = c.trim().split(/\s+/);
        return [toAsset(u) || u, ...d].join(' ');
      }).join(', '));
    }
    const href = n.getAttribute && n.getAttribute('href');
    if (href) {
      if (ROUTE_KEY[href]) n.setAttribute('href', echoUrl(`augmented_ed_url( ${phpStr(ROUTE_KEY[href])} )`));
      else if (href.startsWith('../../assets/')) n.setAttribute('href', toAsset(href));
      else if (!/^(https?:|mailto:|tel:|#)/.test(href)) fail(`${where}: a link to ${href} that is neither a page of the site nor external`);
    }
    const st = n.getAttribute && n.getAttribute('style');
    if (st && /url\(/.test(st)) fail(`${where}: an inline url() in a style attribute — not supported, move it to a stylesheet`);
  }
}

// T9: the reveal. The export writes every [data-reveal] block at inline opacity 0, the
// state the page authored for its script to lift. A template that kept it would be blank
// wherever the plugin's script does not run, so the hiding moves to css/host.css, where it
// only applies once the script has said it is there (html.aug-js), with a failsafe.
function stripRevealOpacity(el) {
  for (const n of el.querySelectorAll('[data-reveal]')) {
    const st = (n.getAttribute('style') || '').replace(/(^|;)\s*opacity:\s*0\s*(;|$)/, '$1').replace(/^\s*;\s*/, '').trim();
    n.setAttribute('style', st);
  }
}

const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ---------------------------------------------------------------- the program bar

function programBar(document) {
  const header = document.querySelector('.scheme-1 > header');
  const menu = document.getElementById('site-menu');
  if (!header || !menu) { fail('an exported page has no header or no captured #site-menu'); return ''; }

  // T3. A <div>, not a <header>: AERDF's header is the page's banner landmark, and a second
  // one is noise to a screen reader. Its stickiness is measured against whatever is fixed
  // above it (--aug-top: the WordPress admin bar when logged in), and its height is its own
  // variable, because --header-h now means "everything stuck at the top", and the bar
  // sizing itself to that would grow by the admin bar's height.
  const bar = document.createElement('div');
  bar.setAttribute('data-aug-bar', '');
  let st = header.getAttribute('style');
  if (!/top:\s*0px/.test(st) || !/min-height:\s*var\(--header-h\)/.test(st)) fail('the header\'s inline style no longer has top: 0px and min-height: var(--header-h) — update programBar()');
  st = st.replace(/top:\s*0px/, 'top: var(--aug-top, 0px)').replace(/min-height:\s*var\(--header-h\)/, 'min-height: var(--aug-bar-h)');
  bar.setAttribute('style', st);
  while (header.firstChild) bar.appendChild(header.firstChild);
  const nav = bar.querySelector('nav');
  if (nav) nav.setAttribute('aria-label', 'AugmentED');

  // The toggle. On a phone this sits directly under AERDF's own hamburger, and two
  // identical icons stacked on the right read as one menu drawn twice. So ours carries a
  // visible word beside its bars. A design default, noted in DECISIONS.md; the bars and
  // their open state are the SPA's.
  const toggle = bar.querySelector('button[aria-controls="site-menu"]');
  if (!toggle) fail('the header has no menu toggle');
  else {
    toggle.setAttribute('aria-controls', 'aug-site-menu');
    toggle.setAttribute('aria-label', 'AugmentED menu');
    toggle.setAttribute('data-aug-menu-toggle', '');
    const bars = [...toggle.querySelectorAll('span')];
    const stack = document.createElement('span');
    stack.setAttribute('style', 'display: flex; flex-direction: column; justify-content: center; gap: 6px; width: 22px; height: 44px;');
    bars.forEach((b, i) => { b.setAttribute('data-aug-bar-line', String(i + 1)); stack.appendChild(b); });
    const word = document.createElement('span');
    word.setAttribute('class', 'aug-menu-word');
    word.setAttribute('aria-hidden', 'true');
    // Its own font-family, because the button it sits in has none: on the site the toggle
    // holds only the bars, so nothing ever needed one, and host.css reverts the reboot's
    // button { font-family: inherit } — left alone, the word draws in the browser's
    // button font.
    word.setAttribute('style', 'font-family: var(--font-body); font-size: var(--text-small); font-weight: var(--font-weight-semibold); line-height: 1;');
    word.textContent = 'Menu';
    toggle.setAttribute('style', (toggle.getAttribute('style') || '')
      .replace(/flex-direction:\s*column;?\s*/, '').replace(/width:\s*44px/, 'width: auto').replace(/gap:\s*6px/, 'gap: var(--space-3)')
      .replace(/justify-content:\s*center/, 'align-items: center'));
    toggle.appendChild(word);
    toggle.appendChild(stack);
  }

  // The captured overlay, now the program's menu.
  menu.setAttribute('id', 'aug-site-menu');
  menu.setAttribute('data-aug-menu', '');
  menu.setAttribute('hidden', '');
  menu.setAttribute('role', 'navigation');
  menu.setAttribute('aria-label', 'AugmentED');

  const wrap = document.createElement('div');
  wrap.appendChild(bar);
  wrap.appendChild(menu);
  rewriteRefs(wrap, 'program bar');
  return wrap.innerHTML;
}

// ---------------------------------------------------------------- the Follow form

// Which fields the SOURCE marks required. React drops required="" (an empty string is a
// false boolean prop), so the live form has never required anything; the plugin restores
// what index.html asks for, read from index.html rather than restated here.
function sourceFormFields() {
  const start = indexHtml.indexOf('<form onSubmit="{{ onInvolvedSubmit }}"');
  const end = indexHtml.indexOf('</form>', start);
  if (start < 0 || end < 0) { fail('index.html has no Follow form where expected'); return { fields: [], personas: [] }; }
  const form = indexHtml.slice(start, end);
  const fields = [];
  let label = null;
  for (const m of form.matchAll(/AugmentEDDesignSystem_191b99\.(Label|Input|Textarea|Checkbox)"([^>]*)>([^<]*)/g)) {
    if (m[1] === 'Label') { label = m[3].trim(); continue; }
    fields.push({ kind: m[1], label: m[1] === 'Checkbox' ? 'consent' : label, required: /\brequired=""/.test(m[2]) });
    label = null;
  }
  const personas = [...form.matchAll(/RadioGroupItem" value="([a-z-]+)"/g)].map((m) => m[1]);
  const def = form.match(/RadioGroup" default-value="([a-z-]+)"/)?.[1];
  return { fields, personas, def };
}

// Field names. Ours, stable, and what the relay maps to HubSpot's (Settings → AugmentED has
// the map; these defaults are HubSpot's own contact-property names where one exists).
const FIELD_NAMES = {
  'First name': { name: 'firstname', autocomplete: 'given-name' },
  'Last name': { name: 'lastname', autocomplete: 'family-name' },
  'Email': { name: 'email', autocomplete: 'email' },
  'Contact number': { name: 'phone', autocomplete: 'tel' },
  'Tell us more': { name: 'message', autocomplete: 'off' },
};

let formSpec = null;
function followForm(document) {
  const form = document.querySelector('form');
  if (!form) { fail('follow.html has no form'); return; }
  const { fields, personas, def } = sourceFormFields();
  // The relay validates against the same list the markup was built from (data/form.json),
  // so a field that is required here is required there, with no second copy to drift.
  formSpec = {
    fields: [
      ...Object.entries(FIELD_NAMES).map(([label, f]) => ({ name: f.name, label, required: !!fields.find((x) => x.label === label)?.required })),
      { name: 'persona', label: 'Which best describes you?', required: false, options: personas.map((v) => ({ value: v, label: '' })) },
      { name: 'consent', label: 'Consent', required: !!fields.find((x) => x.kind === 'Checkbox')?.required },
    ],
    default_persona: def || '',
  };
  form.setAttribute('method', 'post');
  form.setAttribute('action', echoUrl(`admin_url( 'admin-post.php' )`));
  form.setAttribute('data-aug-follow', '');

  // The relay's hidden fields and the honeypot. The honeypot is a text field a person never
  // sees and a form-filling bot does; see includes/follow.php for why there is no nonce.
  //
  // They go inside the submit button's row, not as a row of their own: the form is a flex
  // column with a 32px gap, and even an empty row would open another gap and push the page
  // 32px taller than the site's.
  const hiddenHtml = '<input type="hidden" name="action" value="augmented_ed_follow">'
    + '<input type="hidden" name="aug_elapsed" value="">'
    + '<span aria-hidden="true" style="position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;">'
    + '<label>Leave this field empty<input type="text" name="aug_website" tabindex="-1" autocomplete="off"></label></span>';

  // Text fields: id, for, name, autocomplete and required, keyed by their label's text.
  const labels = [...form.querySelectorAll('label[data-slot="label"]')];
  for (const l of labels) {
    const text = l.textContent.trim();
    const spec = FIELD_NAMES[text];
    const src = fields.find((f) => f.label === text);
    if (!spec || !src) { fail(`follow form: a field labelled "${text}" this does not know how to name`); continue; }
    const input = l.parentElement.querySelector('input[data-slot="input"], textarea[data-slot="textarea"]');
    if (!input) { fail(`follow form: no input beside "${text}"`); continue; }
    const id = `aug-f-${spec.name}`;
    l.setAttribute('for', id);
    input.setAttribute('id', id);
    input.setAttribute('name', spec.name);
    input.setAttribute('autocomplete', spec.autocomplete);
    if (src.required) input.setAttribute('required', '');
  }
  if (labels.length !== Object.keys(FIELD_NAMES).length) fail(`follow form: ${labels.length} labelled fields, expected ${Object.keys(FIELD_NAMES).length}`);

  // The radios and the checkbox: the design system draws them as <button role=radio>, which
  // a form cannot submit and a browser cannot validate. Each becomes a real input, visually
  // hidden, followed by the drawn control as a <span> carrying the button's own resting
  // style — so the resting look is the export's to the pixel, and :checked, :hover and
  // :focus-visible on the input drive the rest (the state CSS below).
  const rest = (el) => el.getAttribute('style');
  const radios = [...form.querySelectorAll('button[role="radio"]')];
  if (radios.length !== personas.length || personas.length !== 9) fail(`follow form: ${radios.length} radios in the export, ${personas.length} values in index.html, expected 9`);
  const restRadio = radios.find((r) => r.getAttribute('aria-checked') === 'false');
  const question = form.querySelector('[role="radiogroup"]')?.previousElementSibling;
  if (question) { question.setAttribute('id', 'aug-f-persona-q'); form.querySelector('[role="radiogroup"]').setAttribute('aria-labelledby', 'aug-f-persona-q'); }
  radios.forEach((b, i) => {
    const v = personas[i];
    const opt = formSpec.fields.find((f) => f.name === 'persona').options[i];
    if (opt) opt.label = b.parentElement.textContent.trim();
    const input = document.createElement('input');
    input.setAttribute('type', 'radio');
    input.setAttribute('class', 'aug-sr');
    input.setAttribute('name', 'persona');
    input.setAttribute('value', v);
    input.setAttribute('id', `aug-f-persona-${v}`);
    if (v === def) input.setAttribute('checked', '');
    const mark = document.createElement('span');
    mark.setAttribute('class', 'aug-control aug-radio');
    mark.setAttribute('aria-hidden', 'true');
    mark.setAttribute('style', rest(restRadio || b));
    b.parentElement.insertBefore(input, b);
    b.replaceWith(mark);
  });
  const box = form.querySelector('button[role="checkbox"]');
  const consent = fields.find((f) => f.kind === 'Checkbox');
  if (!box || !consent) fail('follow form: no consent checkbox');
  else {
    const input = document.createElement('input');
    input.setAttribute('type', 'checkbox');
    input.setAttribute('class', 'aug-sr');
    input.setAttribute('name', 'consent');
    input.setAttribute('value', '1');
    input.setAttribute('id', 'aug-f-consent');
    if (consent.required) input.setAttribute('required', '');
    const mark = document.createElement('span');
    mark.setAttribute('class', 'aug-control aug-check');
    mark.setAttribute('aria-hidden', 'true');
    mark.setAttribute('style', rest(box));
    box.parentElement.insertBefore(input, box);
    box.replaceWith(mark);
    // The consent sentence, with the privacy policy linked when Settings has one.
    const text = mark.parentElement.querySelector('span:not(.aug-control)');
    if (text) text.textContent = T('<?php echo augmented_ed_consent_label(); // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts. ?>');
  }

  // Where the outcome is said: a live region for the script, and the no-script result
  // after a redirect back.
  const submit = form.querySelector('button[type="submit"]');
  if (!submit) fail('follow form: no submit button');
  else {
    const status = document.createElement('p');
    status.setAttribute('class', 'aug-follow-status');
    status.setAttribute('id', 'aug-follow-status');
    status.setAttribute('role', 'status');
    status.setAttribute('data-aug-follow-status', '');
    status.setAttribute('style', 'font-size: var(--text-small); line-height: var(--text-body-line-height); margin: var(--space-4) 0 0;');
    status.textContent = T('<?php echo augmented_ed_follow_notice(); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped inside. ?>');
    submit.parentElement.appendChild(status);
    submit.insertAdjacentHTML('beforebegin', hiddenHtml);
  }
}

// ---------------------------------------------------------------- the team

// Group headings in page order, and each person's group and position, from the export.
const groupNames = [...new Set(team.map((p) => p.group))];
const GROUPS = groupNames.map((name, i) => ({ slug: `augmented-${slugify(name)}`, name, order: i + 1 }));
const groupSlug = Object.fromEntries(GROUPS.map((g) => [g.name, g.slug]));
if (GROUPS.length !== 4) fail(`team: ${GROUPS.length} groups, expected 4`);

// The tile template, taken apart from the exported tiles. Every part must use ONE style
// string across all 29 people — if one tile differs, a template cannot reproduce it, and the
// build names the person rather than silently normalising them.
function tileParts(document) {
  const tiles = [...document.querySelectorAll('.team-grid-3 > div')];
  const parts = {};
  const one = (key, value, who) => {
    if (parts[key] === undefined) parts[key] = value;
    else if (parts[key] !== value) fail(`team tile: ${who}'s ${key} differs from the others — the tile template cannot reproduce it`);
  };
  for (const t of tiles) {
    const who = t.querySelector('h3')?.textContent || '?';
    one('tileStyle', (t.getAttribute('style') || '').replace(/(^|;)\s*opacity:\s*0\s*(;|$)/, '$1').replace(/^\s*;\s*/, '').trim(), who);
    const kids = [...t.children];
    let muted = 0;
    for (const c of kids) {
      const tag = c.tagName.toLowerCase();
      if (tag === 'img') one('photo', c.outerHTML.replace(/src="[^"]*"/, 'src="§src§"').replace(/alt="[^"]*"/, 'alt="§alt§"'), who);
      else if (tag === 'div' && !c.children.length) one('placeholder', c.outerHTML, who);
      else if (tag === 'h3') one('nameOpen', c.outerHTML.replace(/>[^<]*<\/h3>$/, '>'), who);
      else if (tag === 'p' && c.classList.contains('bio-cta')) {
        const name = t.querySelector('h3').textContent;
        one('bioCta', c.outerHTML.replace(/href="[^"]*"/, 'href="§href§"').replace(` of ${escText(name)}<`, ' of §name§<'), who);
      } else if (tag === 'p' && /font-weight-semibold/.test(c.getAttribute('style'))) one('roleOpen', c.outerHTML.replace(/>[^<]*<\/p>$/, '>'), who);
      else if (tag === 'p') one(`muted${++muted}Open`, c.outerHTML.replace(/>[^<]*<\/p>$/, '>'), who);
      else if (tag === 'div') {
        one('linksOpen', c.outerHTML.slice(0, c.outerHTML.indexOf('>') + 1), who);
        for (const a of c.querySelectorAll('a[aria-label]')) one(`link${a.getAttribute('aria-label')}`, a.outerHTML.replace(/href="[^"]*"/, 'href="§href§"'), who);
      } else fail(`team tile: ${who} has an unexpected <${tag}>`);
    }
  }
  for (const k of ['tileStyle', 'photo', 'placeholder', 'nameOpen', 'roleOpen', 'muted1Open', 'muted2Open', 'linksOpen', 'linkLinkedIn', 'linkWebsite', 'bioCta']) {
    if (parts[k] === undefined) fail(`team tile: no ${k} found in the export`);
  }
  return parts;
}
const escText = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Built against the helper interface of tools/lib/bio-page.mjs, so the same template
// renders static HTML (for the golden test) and PHP (the partial). The icon inside the
// LinkedIn link is rewritten to a plugin asset in both.
function tileTemplate(P) {
  const sub = (tpl, map) => tpl.replace(/§(\w+)§/g, (m, k) => map[k]);
  const linkedin = (l) => sub(P.linkLinkedIn.replace(/src="\.\.\/\.\.\/assets\/icons\/linkedin\.svg"/, `src="${l.asset('icons/linkedin.svg')}"`), { href: l.attr('url') });
  const website = (l) => sub(P.linkWebsite, { href: l.attr('url') });
  return (h) => `<div${h.when('bio_url', ` class="bio-tile" id="${h.attr('slug')}"`)} data-reveal="" style="${P.tileStyle}">`
    + h.when('photo', sub(P.photo, { src: h.attr('photo'), alt: h.attr('name') }))
    + h.unless('photo', P.placeholder)
    + `${P.nameOpen}${h.text('name')}</h3>`
    + h.when('role', `${P.roleOpen}${h.text('role')}</p>`)
    + h.when('affiliation', `${P.muted1Open}${h.text('affiliation')}</p>`)
    + h.when('location', `${P.muted2Open}${h.text('location')}</p>`)
    + h.when('links', `${P.linksOpen}${h.each('links', (l) => l.is('label', 'LinkedIn', linkedin(l), website(l)))}</div>`)
    + h.when('bio_url', sub(P.bioCta, { href: h.attr('bio_url'), name: h.text('name') }))
    + '</div>';
}

// The data each tile is rendered from, in the shape the PHP runtime builds from a post
// (includes/team.php, augmented_ed_tile_data()). Used here for the golden test.
const tileData = (p) => ({
  slug: p.slug,
  name: p.name,
  role: p.role || '',
  affiliation: p.affiliation || '',
  location: p.location || '',
  photo: p.photo ? `../../${p.photo}` : '',
  bio_url: p.bioUrl || '',
  links: p.links.map((l) => ({ label: l.label, url: l.url })),
});

// ---------------------------------------------------------------- templates

const files = new Map(); // generated/-relative path -> content
const templateHeader = (title, source) => `<?php
/**
 * ${title}
 *
 * GENERATED by tools/build-wp-plugin.mjs from ${source}
 * (${stampLine || 'unstamped export'}). Do not edit: change index.html, re-export with
 * tools/export-static.mjs, and regenerate.
 *
 * @package AugmentED
 */

defined( 'ABSPATH' ) || exit;
`;

let programBarHtml = null;
let tileP = null;
const h1Count = (html) => (html.match(/<h1\b/g) || []).length;

for (const page of PAGES) {
  phpCode.length = 0;
  const { document } = parseHTML(exported[page.key]);
  const scheme = document.querySelector('body > .scheme-1');
  const main = scheme && [...scheme.children].find((c) => c.tagName === 'MAIN');
  if (!scheme || !main) { fail(`${page.file}: no .scheme-1 root or no <main>`); continue; }

  // The program bar is the same on all five pages; take it once and prove the others agree.
  const bar = programBar(document);
  const barOut = untoken(bar);
  if (programBarHtml === null) programBarHtml = barOut;
  else if (programBarHtml !== barOut) fail(`${page.file}: its header differs from home.html's — the program bar is one partial`);

  stripRevealOpacity(main);
  if (page.key === 'team') {
    tileP = tileParts(document);
    // T12. Each group keeps its own section markup from the export — they are not
    // identical (Leadership's padding differs, and one heading has a wrapper) — and only
    // the tiles inside each grid become a loop over the group's posts.
    for (const grid of main.querySelectorAll('.team-grid-3')) {
      const section = grid.closest('section');
      const heading = section?.querySelector('h2')?.textContent.trim();
      const slug = groupSlug[heading];
      if (!slug) { fail(`team: a grid under "${heading}" belongs to no known group`); continue; }
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      grid.appendChild(document.createTextNode(T(`<?php augmented_ed_render_team_group( ${phpStr(slug)} ); ?>`)));
    }
  }
  if (page.key === 'follow') followForm(document);
  rewriteRefs(main, page.file);

  const pageDiv = document.createElement('div');
  pageDiv.setAttribute('class', 'aug-page');
  pageDiv.setAttribute('data-aug-page', page.key);
  pageDiv.setAttribute('data-screen-label', main.getAttribute('data-screen-label') || page.label);
  while (main.firstChild) pageDiv.appendChild(main.firstChild);
  const body = untoken(pageDiv.outerHTML);
  if (h1Count(body) !== 1) fail(`${page.file}: ${h1Count(body)} <h1> elements, expected exactly one`);

  files.set(`templates/${page.key}.php`, `${templateHeader(`AugmentED — ${page.label}.`, `wordpress-handoff/pages/${page.file}`)}
get_header();
?>
<div id="augmented-ed" class="augmented-ed" data-aug-template="${page.key}">
<div class="scheme-1" style="${scheme.getAttribute('style')}">
<?php augmented_ed_partial( 'program-bar' ); ?>
${body}
</div>
</div>
<?php
get_footer();
`);
}

files.set('templates/partials/program-bar.php', `${templateHeader('AugmentED — the program bar and its menu.', 'the header of wordpress-handoff/pages/*.html')}?>
${programBarHtml || ''}
`);

// The tile partial, and its proof: all 29 exported tiles rebuilt from their data through
// the same template must match the export, element for element.
if (tileP) {
  const tile = tileTemplate(tileP);
  files.set('templates/partials/team-tile.php', `${templateHeader('AugmentED — one person on the Who We Are grid. Expects $m from augmented_ed_tile_data().', 'the tiles of wordpress-handoff/pages/team.html')}?>
${tile(phpHelper('$m'))}
`);
  const { document } = parseHTML(exported.team);
  const exportedTiles = [...document.querySelectorAll('.team-grid-3 > div')];
  exportedTiles.forEach((t) => stripRevealOpacity(t.parentElement));
  const byName = new Map(team.map((p) => [p.name, p]));
  exportedTiles.forEach((t) => {
    const p = byName.get(t.querySelector('h3').textContent);
    const built = parseHTML(`<div>${tile(staticHelper(tileData(p), '../../assets/'))}</div>`).document.querySelector('div > div');
    const a = domKey(t), b = domKey(built);
    if (a !== b) fail(`team tile: ${p.name}'s tile rebuilt from data differs from the export:\n  export ${a.slice(0, 400)}\n  built  ${b.slice(0, 400)}`);
  });
}

// A structural fingerprint: tags, attributes (sorted, whitespace-normalised) and text.
// Serialisation details — attribute order, entity spelling, indentation — are not the
// page, so they are not compared.
function domKey(el) {
  const walk = (n) => {
    if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' ').trim(); return t ? JSON.stringify(t) : ''; }
    if (n.nodeType !== 1) return '';
    const attrs = [...n.attributes].map((a) => `${a.name}=${a.value.replace(/\s+/g, ' ').trim()}`).sort().join(' ');
    return `<${n.tagName.toLowerCase()} ${attrs}>${[...n.childNodes].map(walk).join('')}</>`;
  };
  return walk(el);
}

// The bio template: the profile from tools/lib/bio-page.mjs, as PHP, under the program bar.
files.set('templates/bio.php', `${templateHeader('AugmentED — a team member\'s bio page (the single template of an AugmentED team post). Expects $bio from augmented_ed_bio_data().', 'tools/lib/bio-page.mjs')}
get_header();
$bio = augmented_ed_bio_data( get_queried_object() );
?>
<div id="augmented-ed" class="augmented-ed" data-aug-template="bio">
<div class="scheme-1" style="font-family: var(--font-body); color: var(--text-body); background: var(--surface-page);">
<?php augmented_ed_partial( 'program-bar' ); ?>
<div class="aug-page bio" data-aug-page="bio">
${bioBody(phpHelper('$bio'))}
</div>
</div>
</div>
<?php
get_footer();
`);

// ---------------------------------------------------------------- CSS

const DS_SHEETS = [...indexHtml.matchAll(/<link rel="stylesheet" href="(_ds\/[^"]+)">/g)].map((m) => m[1]);
const dsStyles = DS_SHEETS.find((h) => h.endsWith('/styles.css'));
if (dsStyles) {
  // styles.css is a sheet of @imports of the token files, which are all listed before it.
  // Shipping it too would load every token twice.
  const imports = [...read(dsStyles).matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g)].map((m) => path.posix.join(path.posix.dirname(dsStyles), m[1]));
  for (const i of imports) if (!DS_SHEETS.includes(i)) fail(`${dsStyles} imports ${i}, which index.html does not link — ship it explicitly`);
}
const dsTokens = DS_SHEETS.filter((h) => h !== dsStyles);
const fontsShipped = new Map(); // repo path -> plugin path
const fontUrl = (fromRel) => (u) => {
  const repo = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), u));
  const plugin = `assets/fonts/${path.posix.basename(repo)}`;
  fontsShipped.set(repo, plugin);
  return `../../${plugin}`;
};

const { document: homeDoc } = parseHTML(exported.home);
const componentSheets = [...homeDoc.querySelectorAll('head link[rel="stylesheet"]')]
  .map((l) => l.getAttribute('href')).filter((h) => h.startsWith('../../assets/')).map((h) => h.slice('../../'.length));
const pageStyle = [...homeDoc.querySelectorAll('head style')].map((s) => s.textContent).find((t) => t.length > 10000);
if (!pageStyle) fail('home.html: no page <style> block');

// The generated state CSS. Inline styles win over every stylesheet rule that is not
// !important, and the design system's hover and checked looks were React state, so each
// has to be !important to be seen at all. Only the properties the component itself changed
// (states.json) are written, so nothing else is overridden.
const decls = (o, imp = true) => Object.entries(o).map(([k, v]) => `${k}: ${v}${imp ? ' !important' : ''};`).join(' ');
const stateCss = [];
stateCss.push('@media (hover: hover) {');
for (const [variant, st] of Object.entries(states.button)) {
  if (Object.keys(st.hover).length) stateCss.push(`  [data-slot="button"][data-variant="${variant}"]:hover { ${decls(st.hover)} }`);
}
stateCss.push(`  .aug-sr:not(:checked) + .aug-radio:hover { ${decls(states.radio.hover)} }`);
stateCss.push(`  .aug-sr:not(:checked) + .aug-check:hover { ${decls(states.checkbox.hover)} }`);
stateCss.push('}');
// The form's real inputs are visually hidden, but kept in the tab order and the
// accessibility tree: the drawn control after each is what a sighted reader sees, the input
// is what everything else uses.
stateCss.push('.aug-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; opacity: 0; }');
stateCss.push(`.aug-sr:checked + .aug-radio { ${decls(states.radio.checked)} }`);
stateCss.push(`.aug-sr:checked + .aug-check { ${decls(states.checkbox.checked)} }`);
const markDecls = (m) => decls(Object.fromEntries(Object.entries(m.style).filter(([k]) => !/^(color)$/.test(k))), false);
stateCss.push(`.aug-sr:checked + .aug-radio::after { content: ""; display: block; ${markDecls(states.radio.mark)} }`);
// The checkbox's mark is the design system's "check" icon, a ligature in its icon font.
// The ::after takes the .ds-icon rule's own properties so it is drawn exactly as the
// component drew it.
const iconRule = (read(dsTokens.find((h) => h.endsWith('icons.css'))).match(/\.ds-icon\s*\{([^}]*)\}/) || [])[1] || '';
stateCss.push(`.aug-sr:checked + .aug-check::after { content: "${states.checkbox.mark.text}"; ${iconRule.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim()} ${markDecls(states.checkbox.mark)} }`);
// Focus. The design system's inputs set outline:none inline and draw no focus state at all;
// the plugin adds one, because a form a keyboard user cannot see their place in is not
// finished. !important because the inline outline:none would otherwise win.
stateCss.push('.aug-sr:focus-visible + .aug-control { outline: 2px solid var(--color-st-tropaz) !important; outline-offset: 2px; }');
stateCss.push('[data-aug-follow] :is(input[data-slot="input"], textarea[data-slot="textarea"]):focus-visible { outline: 2px solid var(--color-st-tropaz) !important; outline-offset: 2px; }');
// The form's live region takes no room until it has something to say, so the page is the
// site's height until then.
stateCss.push('.aug-follow-status:empty { margin: 0 !important; }');

// The bio page's own rules: the profile's (tools/lib/bio-page.mjs), plus the two things the
// static page's chrome gave it — the icon size (its icons carry no inline size) and the
// back link's touch target.
const bioCss = `${BIO_PROFILE_CSS}
  .bio .ds-icon { font-size: 1.25em; width: 1em; height: 1em; }
  @media (max-width: 991px) { .bio-back a { min-height: 2.75rem; } }
${BIO_PROFILE_DESKTOP_CSS}`;

const { css: scoped, report } = scopeCss([
  ...dsTokens.map((rel) => ({ css: read(rel), from: rel, rewriteUrl: fontUrl(rel) })),
  ...componentSheets.map((rel) => ({ css: read(rel), from: rel })),
  { css: pageStyle || '', from: 'index.html (the page <style> block)' },
  { css: '[hidden] { display: none !important; }', from: 'the export ([hidden] outranks the overlay\'s inline display)' },
  { css: bioCss, from: 'tools/lib/bio-page.mjs' },
  { css: stateCss.join('\n'), from: 'wordpress-handoff/pages/states.json (hover and checked states)' },
], {
  renameTags: { header: 'data-aug-bar' },
  fontRenames: { 'Material Symbols Rounded': 'AugmentED Symbols' },
});

// The header height, which the page writes once on :root and everything sticky reads. It
// becomes the offset block: the program bar's own height, what is fixed above it, and the
// hero's lead — defaults here, measured at runtime by js/augmented-ed.js.
const HEADER_DECL = /(#augmented-ed\s*\{[^}]*?)--header-h:\s*6rem;?/;
let css = scoped;
if ((css.match(new RegExp(HEADER_DECL.source, 'g')) || []).length !== 1) fail('the page CSS no longer sets --header-h: 6rem exactly once on :root — update the offset rewrite');
css = css.replace(HEADER_DECL, '$1--aug-bar-h: 6rem; --aug-top: var(--wp-admin--admin-bar--height, 0px); --header-h: calc(var(--aug-top) + var(--aug-bar-h)); --hero-lead: 0px;')
  // WordPress's admin bar stops being fixed at 600px and below; so does our offset.
  + '@media (max-width: 600px) {\n  #augmented-ed { --aug-top: 0px; }\n}\n';
// The radios and the checkbox are no longer <button>s (followForm()), so the page's
// touch-target rule for their rows — `label:has(button)`, 44px a row on a phone — would stop
// matching and the Follow page would come out 156px shorter at 360. It keys on the drawn
// control instead.
const HAS_BUTTON = /label:has\(button\)/g;
if ((css.match(HAS_BUTTON) || []).length !== 1) fail('the page CSS no longer has exactly one label:has(button) rule — update the form rewrite');
css = css.replace(HAS_BUTTON, 'label:has(.aug-control)');
for (const p of assertScoped(css)) fail(`css: ${p}`);
files.set('css/augmented-ed.css', `/* AugmentED — every stylesheet the pages use, scoped to #augmented-ed.
   GENERATED by tools/build-wp-plugin.mjs (tools/lib/css-scope.mjs explains the scoping).
   Do not edit. ${report.rules} rules, ${report.fontFaces} @font-face, ${report.properties} @property. */
${css}`);

// ---------------------------------------------------------------- data

// What the importer needs, and nothing it would have to parse: the groups in page order,
// and each person with their group, position, card fields, photo and — only where the tile
// links one — the bio, as paragraphs, with the one-sentence description the page's search
// and share metadata use.
const bios = new Map(readBios(path.join(root, 'source-material/bios'), (slug) => fail(`bios/${slug}.md is malformed`)).map((b) => [b.slug, b]));
const position = {};
const people = team.map((p) => {
  const g = groupSlug[p.group];
  position[g] = (position[g] || 0) + 1;
  const b = p.bioUrl ? bios.get(p.slug) : null;
  if (p.bioUrl && !b) fail(`team: ${p.name}'s tile links a bio but source-material/bios/${p.slug}.md is missing`);
  return {
    slug: p.slug,
    name: p.name,
    group: g,
    sort: position[g],
    role: p.role || '',
    affiliation: p.affiliation || '',
    location: p.location || '',
    linkedin: p.links.find((l) => l.label === 'LinkedIn')?.url || '',
    website: p.links.find((l) => l.label === 'Website')?.url || '',
    photo: p.photo ? path.posix.basename(p.photo, '.webp') : '',
    bio: b ? { paragraphs: b.paras, description: lede(b.paras) } : null,
  };
});
files.set('data/team.json', JSON.stringify({
  parent: { slug: 'augmented-team', name: 'AugmentED Team' },
  groups: GROUPS,
  // The two already on aerdf.org as team posts in AERDF's own categories. The importer
  // attaches the AugmentED category to these and refuses any other slug that already
  // exists unless told to (see includes/importer.php).
  existing: ['sherry-lachman', 'caitlin-mills'],
  people,
}, null, 2) + '\n');
if (!formSpec) fail('follow: the form was not built');
else files.set('data/form.json', JSON.stringify(formSpec, null, 2) + '\n');
files.set('data/pages.json', JSON.stringify(PAGES.map((p) => {
  const m = pagesMeta.find((x) => x.route === p.route) || {};
  return { key: p.key, label: p.label, title: m.title || '', description: m.description || '' };
}), null, 2) + '\n');

// ---------------------------------------------------------------- what ships

const heroEl = homeDoc.querySelector('hero-bridge');
const fallEl = homeDoc.querySelector('falling-blocks');
const attrString = (el) => [...el.attributes].map((a) => `${a.name}="${a.value.replace(/^\.\.\/\.\.\//, '')}"`).join(' ');
const heroM = readManifest(root, 'assets/hero-bridge/manifest.json', 'tools/encode-hero-bridge.mjs', problems);
const fallM = readManifest(root, 'assets/falling-blocks/manifest.json', 'tools/encode-falling-blocks.mjs', problems);
const seq = [
  ...(heroEl && heroM ? heroFrames(attrString(heroEl), heroM, problems) : (fail('home: no <hero-bridge> or manifest'), [])),
  ...(fallEl && fallM ? fallingFrames(attrString(fallEl), fallM, problems, 'all') : (fail('home: no <falling-blocks> or manifest'), [])),
];
const ship = new Map(); // plugin path -> repo path
for (const r of [...shipped, ...seq]) ship.set(r, r);
for (const js of ['hero-bridge', 'falling-blocks', 'cycle-wheel', 'team-colour']) ship.set(`assets/${js}.js`, `assets/${js}.js`);
// Every bundled headshot and its colour twin, which the bloom builds by string replacement
// and nothing names.
for (const p of people.filter((x) => x.photo)) {
  ship.set(`assets/team/${p.photo}.webp`, `assets/team/${p.photo}.webp`);
  ship.set(`assets/team/colour/${p.photo}.webp`, `assets/team/colour/${p.photo}.webp`);
}
ship.set('assets/icons/linkedin.svg', 'assets/icons/linkedin.svg');
for (const [repo, plugin] of fontsShipped) ship.set(plugin, repo);
const deny = unserved(indexHtml);
for (const [plugin, repo] of ship) {
  if (!fs.existsSync(path.join(root, repo)) || !fs.statSync(path.join(root, repo)).isFile()) fail(`ships ${repo}, which is not a file`);
  if (deny.some((re) => re.test(repo))) fail(`would ship ${repo}, which is never published`);
}
const shipList = [...ship].sort(([a], [b]) => a.localeCompare(b)).map(([plugin, repo]) => ({ plugin, repo }));
files.set('ship.json', JSON.stringify(shipList, null, 1) + '\n');

// Inputs, hashed, so --check can say which input moved when generated/ is stale.
const inputs = ['index.html', ...PAGES.map((p) => `wordpress-handoff/pages/${p.file}`), 'wordpress-handoff/pages/states.json',
  'wordpress-handoff/content/team.json', 'wordpress-handoff/content/pages.json', ...dsTokens, ...componentSheets,
  // Only the bios the page links. The roster keeps the bios of people off the page in the
  // same folder, and hashing those would call generated/ stale over a file it never reads.
  ...team.filter((p) => p.bioUrl).map((p) => p.slug).sort().map((s) => `source-material/bios/${s}.md`)];
files.set('build.json', JSON.stringify({ export: stampLine, inputs: Object.fromEntries(inputs.map((f) => [f, sha(fs.readFileSync(path.join(root, f)))])) }, null, 1) + '\n');

// ---------------------------------------------------------------- write or check

if (problems.length) {
  for (const p of problems) console.error(`::error::build-wp-plugin: ${p}`);
  process.exit(1);
}

const genDir = path.join(PLUGIN, GEN_REL);
const onDisk = (dir) => {
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out.set(path.relative(dir, p).split(path.sep).join('/'), fs.readFileSync(p, 'utf8')); } };
  walk(dir);
  return out;
};

if (CHECK) {
  const disk = onDisk(genDir);
  const stale = [];
  for (const [f, c] of files) if (disk.get(f) !== c) stale.push(disk.has(f) ? `changed: ${f}` : `missing: ${f}`);
  for (const f of disk.keys()) if (!files.has(f)) stale.push(`extra: ${f}`);
  if (stale.length) {
    console.error(`::error::wordpress-handoff/plugin/augmented-ed/generated/ is stale — run node tools/build-wp-plugin.mjs and commit the result\n  ${stale.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`generated/ is current (${files.size} files)`);
  phpChecks();
} else if (!ASSEMBLE) {
  fs.rmSync(genDir, { recursive: true, force: true });
  for (const [f, c] of files) { fs.mkdirSync(path.dirname(path.join(genDir, f)), { recursive: true }); fs.writeFileSync(path.join(genDir, f), c); }
  console.log(`wrote ${files.size} files to ${path.relative(root, genDir)}/`);
  phpChecks();
}

if (ASSEMBLE) {
  const disk = onDisk(genDir);
  for (const [f, c] of files) if (disk.get(f) !== c) { console.error(`::error::generated/ is stale (${f}) — regenerate before assembling`); process.exit(1); }
  const out = path.resolve(root, ASSEMBLE, 'augmented-ed');
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(PLUGIN, out, { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
  let bytes = 0;
  for (const { plugin, repo } of shipList) {
    const dst = path.join(out, plugin);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(root, repo), dst);
    bytes += fs.statSync(dst).size;
  }
  console.log(`assembled ${path.relative(root, out)}/ — ${shipList.length} assets, ${(bytes / 1e6).toFixed(1)} MB`);
  if (ZIP) {
    const zipPath = path.resolve(root, ASSEMBLE, 'augmented-ed.zip');
    fs.rmSync(zipPath, { force: true });
    execFileSync('zip', ['-rqX', zipPath, 'augmented-ed'], { cwd: path.dirname(out) });
    console.log(`zipped ${path.relative(root, zipPath)} (${(fs.statSync(zipPath).size / 1e6).toFixed(1)} MB)`);
  }
}

// php -l on every PHP file in the plugin, and the tile golden test through PHP itself: the
// partial that ships, run by the interpreter that will run it, against the export.
function phpChecks() {
  let php;
  try { php = execFileSync('php', ['-v']).toString().split('\n')[0]; } catch { console.warn('::warning::php is not installed — skipped php -l and the tile golden test'); return; }
  const phpFiles = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.php')) phpFiles.push(p); } };
  walk(PLUGIN);
  for (const f of phpFiles) {
    try { execFileSync('php', ['-l', f], { stdio: 'pipe' }); } catch (e) { console.error(`::error::php -l ${path.relative(root, f)}: ${e.stdout}`); process.exit(1); }
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aug-golden-'));
  const data = team.map(tileData);
  fs.writeFileSync(path.join(tmp, 'data.json'), JSON.stringify(data));
  fs.writeFileSync(path.join(tmp, 'run.php'), `<?php
define( 'ABSPATH', __DIR__ . '/' );
function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); }
function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); }
function esc_url( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); }
function augmented_ed_asset( $p ) { return '../../assets/' . $p; }
foreach ( json_decode( file_get_contents( __DIR__ . '/data.json' ), true ) as $m ) {
	include ${phpStr(path.join(genDir, 'templates/partials/team-tile.php'))};
	echo "\\n<!--tile-->\\n";
}
`);
  const outHtml = execFileSync('php', [path.join(tmp, 'run.php')]).toString();
  fs.rmSync(tmp, { recursive: true, force: true });
  const built = outHtml.split('<!--tile-->').map((s) => s.trim()).filter(Boolean);
  const { document } = parseHTML(exported.team);
  const tiles = [...document.querySelectorAll('.team-grid-3 > div')];
  tiles.forEach((t) => stripRevealOpacity(t.parentElement));
  const byName = new Map(tiles.map((t) => [t.querySelector('h3').textContent, t]));
  let bad = 0;
  built.forEach((html, i) => {
    const el = parseHTML(`<div>${html}</div>`).document.querySelector('div > div');
    const want = byName.get(data[i].name);
    if (!want || domKey(want) !== domKey(el)) { bad++; console.error(`::error::tile golden test: ${data[i].name} rendered by PHP differs from the export`); }
  });
  if (bad || built.length !== tiles.length) { console.error(`::error::tile golden test: ${bad} differ, ${built.length} rendered for ${tiles.length} exported`); process.exit(1); }
  console.log(`php -l clean on ${phpFiles.length} files; ${built.length} tiles rendered by ${php.split(' (')[0]} match the export`);
}

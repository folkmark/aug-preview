// The bio pages' content, as one template with two renderers.
//
// A bio is written once, in source-material/bios/<slug>.md, and published twice: as a
// static page at /team/<slug>/ on the preview site (tools/build-site.mjs), and as the
// single template of a team post in the WordPress plugin (tools/build-wp-plugin.mjs). The
// markup of the profile — back link, portrait, name, role, a Fellow's school and city,
// the paragraphs, the person's links — is the same in both, and it used to live only in
// build-site.mjs's bioPage(). A second copy in the plugin would have drifted the first
// time anyone touched either.
//
// So the profile is written ONCE, below, against a small helper interface, and each
// caller supplies the helper that renders it:
//
//   staticHelper(data)  writes the values in, escaped — what build-site.mjs publishes;
//   phpHelper('$bio')   writes PHP that echoes them, escaped by WordPress's own
//                       functions — what the plugin's bio.php runs.
//
// The interface is deliberately tiny: text, attr, asset, when/unless on a key, one
// comparison, each over a list and a join. Anything that needs more than that belongs in
// the data rather than in the template. The page CHROME — head, header, footer — is not
// here: the preview site's bio page has its own, and in WordPress the chrome is AERDF's
// theme and the plugin's program bar.
import fs from 'node:fs';
import path from 'node:path';

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// There is no Markdown parser. A bio is a name, a role and paragraphs — see the
// directory's README. Anything else ships as literal characters, which is the honest
// failure and an easy one to spot. onProblem receives the slug of a malformed file, so
// each caller reports it the way its own output does.
export function readBios(dir, onProblem = () => {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((f) => {
      const slug = f.replace(/\.md$/, '');
      const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
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
      onProblem(b.slug);
      return false;
    });
}

// One sentence of the bio, for search results and share cards. Cut at the first sentence
// end rather than a character count, so it never stops mid-word. The plugin seeds Yoast's
// meta description with the same cut, so the two sites describe a person identically.
export function lede(paras) {
  const firstStop = paras[0].search(/\.\s/);
  return firstStop > 0 ? paras[0].slice(0, firstStop + 1) : paras[0];
}

// Writes values straight in. Keys name fields of `data`; an item helper does the same for
// one element of a list, with '.' meaning the element itself.
export function staticHelper(data, assetBase = 'assets/') {
  const get = (k) => (k === '.' ? data : data[k]);
  const present = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));
  return {
    text: (k) => esc(get(k)),
    attr: (k) => esc(get(k)),
    raw: (k) => String(get(k)),
    asset: (rel) => assetBase + rel,
    when: (k, html) => (present(get(k)) ? html : ''),
    unless: (k, html) => (present(get(k)) ? '' : html),
    is: (k, value, yes, no) => (get(k) === value ? yes : no),
    each: (k, fn, sep = '') => get(k).map((item) => fn(staticHelper(item, assetBase))).join(sep),
    join: (k, sep) => get(k).map(esc).join(sep),
  };
}

// Writes PHP. `v` is the PHP expression holding the data array ('$bio'); list items are
// bound to a fresh variable per nesting level so loops can nest. Output is escaped by
// WordPress (esc_html, esc_attr, esc_url) at the point of echo, never beforehand.
export function phpHelper(v, depth = 0) {
  const get = (k) => (k === '.' ? v : `${v}['${k}']`);
  const echo = (fn, k) => `<?php echo ${fn}( ${get(k)} ); ?>`;
  return {
    text: (k) => echo('esc_html', k),
    attr: (k) => (/url|href|photo|src|back/i.test(k) ? echo('esc_url', k) : echo('esc_attr', k)),
    raw: (k) => `<?php echo ${get(k)}; ?>`,
    asset: (rel) => `<?php echo esc_url( augmented_ed_asset( '${rel}' ) ); ?>`,
    when: (k, html) => `<?php if ( ! empty( ${get(k)} ) ) : ?>${html}<?php endif; ?>`,
    unless: (k, html) => `<?php if ( empty( ${get(k)} ) ) : ?>${html}<?php endif; ?>`,
    is: (k, value, yes, no) => `<?php if ( '${value}' === ${get(k)} ) : ?>${yes}<?php else : ?>${no}<?php endif; ?>`,
    each: (k, fn, sep = '') => {
      const item = `$item${depth}`;
      // A separator between items needs to know which item is first; PHP gets it from the
      // loop index rather than from a join, so the markup inside fn stays a template.
      const lead = sep ? `<?php if ( $i${depth} > 0 ) : ?>${sep}<?php endif; ?>` : '';
      const head = sep ? `<?php foreach ( ${get(k)} as $i${depth} => ${item} ) : ?>` : `<?php foreach ( ${get(k)} as ${item} ) : ?>`;
      return `${head}${lead}${fn(phpHelper(item, depth + 1))}<?php endforeach; ?>`;
    },
    join: (k, sep) => `<?php echo implode( '${sep}', array_map( 'esc_html', ${get(k)} ) ); ?>`,
  };
}

// The profile. Fields: back (href), photo (src, optional), name, role (optional), meta
// (list of lines, optional), paras (list), links (list of { url, label }).
//
// The portrait is optional on purpose: a bio can land before a usable headshot does, and
// the page should still be worth reading. Without one the page is a single column of text
// rather than a grey placeholder square. The team tile keeps its square because it sits in
// a grid with other people; a page about one person that leads with an empty box reads as
// broken.
//
// The link marks are the ones the tiles use: Simple Icons' LinkedIn as an <img>, and the
// design system's "language" glyph for a website. The design system puts brand marks
// "under team bios", and names them here rather than leaving an icon alone.
//
// The whitespace is the published page's, byte for byte — build-site.mjs checks its output
// against the page it replaced — so an empty optional field still leaves its indented line.
export function bioBody(h) {
  const linkItem = (l) =>
    `<li><a href="${l.attr('url')}" target="_blank" rel="noopener">${l.is('label', 'LinkedIn',
      `<img src="${l.asset('icons/linkedin.svg')}" alt="" width="24" height="24" decoding="async">`,
      '<span class="ds-icon" aria-hidden="true">language</span>')}${l.text('label')}<span class="visually-hidden"> (opens in a new tab)</span></a></li>`;
  return `  <div class="bio-wrap">
    <p class="bio-back"><a href="${h.attr('back')}"><span class="ds-icon" aria-hidden="true">chevron_right</span>Who We Are</a></p>
    <div class="bio-layout${h.unless('photo', ' is-text-only')}">
      ${h.when('photo', `<img class="bio-portrait" src="${h.attr('photo')}" alt="${h.attr('name')}" width="512" height="512" decoding="async">`)}
      <div class="bio-text">
        <h1>${h.text('name')}</h1>
        ${h.when('role', `<p class="bio-role">${h.text('role')}</p>`)}
        ${h.when('meta', `<p class="bio-meta">${h.join('meta', '<br>')}</p>`)}
        <div class="bio-body">
          ${h.each('paras', (p) => `<p>${p.text('.')}</p>`, '\n          ')}
        </div>
        ${h.when('links', `<ul class="bio-links">\n          ${h.each('links', linkItem, '\n          ')}\n        </ul>`)}
      </div>
    </div>
  </div>`;
}

// THE PROFILE'S STYLES. Aligned to the same --container-xxl edge as the logo and every SPA
// section. On a desktop the portrait takes a column of its own at up to 18rem (288px),
// which is larger than the 197px tile the reader clicked to get here. Before, it was
// 180px, smaller than the tile, above a 560px column with the right 60% of the page empty.
// The text column stops at 38rem, about 65 characters of body text, in the 50-75 range
// line-length research settles on.
//
// The back link's chevron is chevron_right mirrored. The design system's icon font is
// subset to five glyphs and chevron_left is not one of them, and the system says not to
// hand-draw SVG paths. Mirroring costs nothing; a sixth glyph means regenerating the
// subset. It goes to the team page rather than to a #<slug> fragment on it: the SPA
// renders after the browser has already tried to jump to a fragment, so the fragment lands
// at the top anyway (measured: scrollY 0).
//
// Two blocks because they sit either side of the page's touch-target rules in the static
// page's stylesheet, and that page is published byte for byte. The plugin takes both.
export const BIO_PROFILE_CSS = `  .bio { padding: clamp(var(--space-8), 4vw, var(--space-12)) var(--page-gutter) clamp(var(--section-pad-y), 7vw, var(--section-pad-y-lg)); }
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
  .bio-links img, .bio-links .ds-icon { width: var(--icon-size); height: var(--icon-size); font-size: var(--icon-size); display: block; }`;

export const BIO_PROFILE_DESKTOP_CSS = `  @media (min-width: 992px) {
    .bio-layout { grid-template-columns: minmax(0, 18rem) minmax(0, 38rem); column-gap: clamp(var(--space-12), 5vw, var(--space-20)); align-items: start; }
    .bio-layout.is-text-only { grid-template-columns: minmax(0, 38rem); }
    .bio-portrait { width: 100%; }
  }`;

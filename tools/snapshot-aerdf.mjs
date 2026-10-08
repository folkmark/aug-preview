// AERDF's header and footer, as they are on aerdf.org today, for the /aerdf/ preview.
//
//   node tools/snapshot-aerdf.mjs        refreshes the snapshot; run it by hand, never in CI
//
// The /aerdf/ preview (tools/build-site.mjs, "The aerdf.org preview") shows every page the
// way the WordPress plugin will draw it on aerdf.org: AERDF's alert bar and header on top,
// AugmentED's header as the program bar under them, AERDF's footer at the bottom. This takes
// AERDF's half of that from a real aerdf.org page, read-only, and writes it into the
// repository, so the build never reaches aerdf.org and the preview never changes under
// anyone's feet. Re-run it when AERDF's header or footer changes.
//
// What it writes:
//   source-material/aerdf/chrome-top.html     the mobile menu, the alert bar and the header
//   source-material/aerdf/chrome-bottom.html  the footer
//   source-material/aerdf/snapshot.json       where and when it was taken, and from what
//   assets/aerdf/chrome.css                   AERDF's CSS, cut down to what those match
//   assets/aerdf/fonts.css                    AERDF's @font-face rules (see THE SHADOW ROOT)
//   assets/aerdf/logo-*.webp                  AERDF's two logos, so the header never breaks
//
// NOTHING OF AERDF'S RUNS. Every script and tracker is dropped — Google Tag Manager and
// Analytics, CookieYes, AccessiBe, reCAPTCHA, GTranslate, Cloudflare's bot detection, and the
// HubSpot newsletter form in the footer, which would otherwise send real sign-ups from the
// preview into AERDF's HubSpot. The form's place is marked instead. The three things AERDF's
// theme script does to its header (open and close the mobile menu, open the search panel)
// are reproduced by assets/aerdf/chrome.js.
//
// THE SHADOW ROOT. On aerdf.org the plugin keeps the two sites' CSS apart: its own is scoped
// to #augmented-ed, and css/host.css reverts what of AERDF's leaks in. The preview gets the
// same separation by drawing AERDF's chrome inside a shadow root, which carries chrome.css
// and nothing else. Two things do not cross into a shadow root and are handled here:
//   - `html` and `body` match nothing inside one, so their rules are rewritten onto
//     .aerdf-body, a wrapper carrying aerdf.org's own body classes, and `:host` is reset with
//     `all: initial` so nothing of the AugmentED page is inherited;
//   - @font-face is ignored there, so those rules go to fonts.css, which the page links in
//     its own head. Only fonts that load are kept: aerdf.org's own Avenir files (Use Any
//     Font) answer 404, so the header falls back exactly as it does on aerdf.org.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = 'https://aerdf.org/opportunities/advanced-fellows/augmented/';
const ORIGIN = 'https://aerdf.org';
// aerdf.org answers 403 to a request that does not look like a browser.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

const { parseHTML } = await import('linkedom');
const postcss = (await import('postcss')).default;
const selectorParser = (await import('postcss-selector-parser')).default;

function get(url, binary = false) {
  const out = execFileSync('curl', ['-sS', '-L', '--fail', '-A', UA, '-H', 'Accept-Language: en-US,en;q=0.9', url], { maxBuffer: 64 << 20 });
  return binary ? out : out.toString('utf8');
}
function ok(url) {
  try {
    return execFileSync('curl', ['-sS', '-L', '-o', '/dev/null', '-w', '%{http_code}', '-A', UA, url]).toString().trim() === '200';
  } catch { return false; }
}
const abs = (u, base) => new URL(u, base).href;

const html = get(SOURCE);

// ---------------------------------------------------------------- the markup

// One element by its opening tag, through its matching close, counting nested tags of the
// same name.
function element(src, openRe, tag) {
  const m = openRe.exec(src);
  if (!m) throw new Error(`snapshot: ${openRe} not found on ${SOURCE} — AERDF's theme has changed; update this tool`);
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  re.lastIndex = m.index;
  let depth = 0, t;
  while ((t = re.exec(src))) {
    depth += t[1] ? -1 : 1;
    if (depth === 0) return src.slice(m.index, re.lastIndex);
  }
  throw new Error(`snapshot: unclosed <${tag}> after ${openRe}`);
}

const mobileNav = element(html, /<nav id="mobile-nav"/, 'nav');
const alertBar = element(html, /<div class="bg-purple text-white text-center">/, 'div');
const header = element(html, /<header class="Header_header__F46VJ"/, 'header');
let footer = element(html, /<footer class="[^"]*Footer_footer__cAlbN"/, 'footer');
const bodyClass = (html.match(/<body class="([^"]*)"/) || [, ''])[1];

// The newsletter form is a HubSpot embed: two scripts, which on the preview would put a live
// form for AERDF's real HubSpot portal on folkmark.com. Its place is kept, and marked.
const HS = /<script[^>]*js\.hsforms\.net[^>]*><\/script>\s*<script>[\s\S]*?hbspt\.forms\.create[\s\S]*?<\/script>/;
if (!HS.test(footer)) throw new Error('snapshot: the footer\'s HubSpot form is not where it was — update this tool');
footer = footer.replace(HS, '<div class="aerdf-preview-form">AERDF\'s newsletter sign-up form (HubSpot) sits here on aerdf.org. It is left out of this preview so nothing is sent to AERDF.</div>');

// The mobile menu's close button is a Font Awesome glyph; the icon font is the one thing of
// AERDF's this would load for a single character, so the same cross is drawn as an SVG.
const CROSS = '<svg viewBox="0 0 352 512" width="1em" height="1em" aria-hidden="true" fill="currentColor"><path d="M242.7 256l100.1-100.1c12.3-12.3 12.3-32.2 0-44.5l-22.2-22.2c-12.3-12.3-32.2-12.3-44.5 0L176 189.3 75.9 89.2c-12.3-12.3-32.2-12.3-44.5 0L9.2 111.5c-12.3 12.3-12.3 32.2 0 44.5L109.3 256 9.2 356.1c-12.3 12.3-12.3 32.2 0 44.5l22.2 22.2c12.3 12.3 32.2 12.3 44.5 0L176 322.7l100.1 100.1c12.3 12.3 32.2 12.3 44.5 0l22.2-22.2c12.3-12.3 12.3-32.2 0-44.5L242.7 256z"/></svg>';
let top = [mobileNav.replace(/<i id="nav-close" class="fas fa-times"><\/i>/, `<i id="nav-close">${CROSS}</i>`), alertBar, header].join('\n');

const strip = (s) => s.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<noscript\b[\s\S]*?<\/noscript>/g, '');
top = strip(top);
footer = strip(footer);
if (/<script|<iframe/i.test(top + footer)) throw new Error('snapshot: a script or iframe survived the strip');

// Root-relative links go to aerdf.org, not to the preview's own host.
const absLinks = (s) => s.replace(/(href|action|src)="\/(?!\/)/g, `$1="${ORIGIN}/`);
top = absLinks(top);
footer = absLinks(footer);

// The two logos are vendored: a hot-linked image is the one part of the header that could
// vanish (they are on a Google Cloud bucket of AERDF's), and the header is mostly logo.
fs.mkdirSync(path.join(root, 'assets/aerdf'), { recursive: true });
fs.mkdirSync(path.join(root, 'source-material/aerdf'), { recursive: true });
const logos = {};
for (const [name, re] of [['logo-header', /src="([^"]+aerdf_logo_full_color[^"]+)"/], ['logo-footer', /src="([^"]+aerdf_logo_white[^"]+)"/]]) {
  const src = (top + footer).match(re);
  if (!src) throw new Error(`snapshot: ${name} not found`);
  const ext = path.extname(new URL(src[1]).pathname) || '.webp';
  fs.writeFileSync(path.join(root, `assets/aerdf/${name}${ext}`), get(src[1], true));
  logos[name] = src[1];
  top = top.split(src[1]).join(`assets/aerdf/${name}${ext}`);
  footer = footer.split(src[1]).join(`assets/aerdf/${name}${ext}`);
}

// ---------------------------------------------------------------- the CSS

// Every stylesheet aerdf.org's page loads, in order, and its inline <style> blocks, where
// they sit among them. Font Awesome is left out with the glyph it drew.
const sheets = [];
for (const m of html.matchAll(/<link\b[^>]*rel=['"]stylesheet['"][^>]*>|<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
  if (m[0].startsWith('<style')) { sheets.push({ from: 'inline', css: m[1], base: SOURCE }); continue; }
  const href = abs(m[0].match(/href=['"]([^'"]+)/)[1], SOURCE);
  if (/fontawesome/.test(href)) continue;
  // One of them is the theme's own directory (its href has no file name), which answers
  // with an error and styles nothing on aerdf.org either.
  let css;
  try { css = get(href); } catch { console.warn(`skipped ${href}: it does not load on aerdf.org`); continue; }
  sheets.push({ from: href, css, base: href });
}

// The page's own DOM, to test selectors against: the chrome inside a body carrying
// aerdf.org's classes, which is how .aerdf-body will hold it.
const { document } = parseHTML(`<!doctype html><html><head></head><body class="${bodyClass}">${top}${footer}</body></html>`);
// The classes AERDF's theme script adds (assets/aerdf/chrome.js does the same), set on the
// test DOM so the rules for the open menu and the open search panel survive the cut.
for (const id of ['mobile-nav', 'search-panel']) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`snapshot: #${id} is gone from AERDF's header — update this tool and chrome.js`);
  el.classList.add('open');
}

const DROP_PSEUDO = /^::?(hover|focus|focus-visible|focus-within|active|visited|link|before|after|placeholder|marker|selection|first-letter|first-line|-webkit-[\w-]+|-moz-[\w-]+|-ms-[\w-]+)$/;
// Whether a selector can match anything in the chrome. Dynamic pseudo-classes and pseudo-
// elements are taken off for the test (a :hover rule is kept if its element is there); a
// selector linkedom cannot parse is kept rather than guessed away.
function matches(sel) {
  let probe;
  try {
    probe = selectorParser((r) => { r.walkPseudos((p) => { if (DROP_PSEUDO.test(p.value)) p.remove(); }); }).processSync(sel).trim();
  } catch { return true; }
  if (!probe || /^[>+~]/.test(probe)) return true;
  try { return !!document.querySelector(probe); } catch { return true; }
}
// html and body match nothing in a shadow root: html becomes :host, body .aerdf-body.
function onto(sel) {
  return selectorParser((r) => {
    r.walk((n) => {
      if (n.type === 'tag' && n.value.toLowerCase() === 'html') n.replaceWith(selectorParser.pseudo({ value: ':host' }));
      else if (n.type === 'tag' && n.value.toLowerCase() === 'body') n.replaceWith(selectorParser.className({ value: 'aerdf-body' }));
      else if (n.type === 'pseudo' && n.value === ':root') n.replaceWith(selectorParser.pseudo({ value: ':host' }));
    });
  }).processSync(sel);
}

const fontFaces = [];
const kept = [];
let rulesIn = 0, rulesKept = 0;
for (const s of sheets) {
  let ast;
  try { ast = postcss.parse(s.css); } catch (e) { console.warn(`skipped ${s.from}: ${e.message}`); continue; }
  ast.walkDecls((d) => {
    d.value = d.value.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (all, q, u) => (/^(data:|#)/.test(u) ? all : `url("${abs(u, s.base)}")`));
  });
  ast.walkAtRules('import', (a) => a.remove());
  ast.walkAtRules('font-face', (a) => {
    const src = a.nodes.filter((n) => n.prop === 'src').map((n) => n.value).join(' ');
    const first = (src.match(/url\("([^"]+)"\)/) || [])[1];
    if (first && ok(first)) fontFaces.push(a.toString());
    a.remove();
  });
  ast.walkRules((rule) => {
    if (rule.parent && rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    rulesIn++;
    const sels = rule.selectors.filter(matches);
    if (!sels.length) { rule.remove(); return; }
    rulesKept++;
    rule.selectors = sels.map(onto);
  });
  ast.walkAtRules((a) => { if (a.nodes && !a.nodes.length) a.remove(); });
  const out = ast.toString().trim();
  if (out) kept.push(`/* ${s.from === 'inline' ? 'inline <style> on the page' : s.from} */\n${out}`);
}

// Google Fonts serves its @font-face per browser; the stylesheet link above was fetched with
// a desktop Chrome user agent, so these are the woff2 files Chrome gets on aerdf.org.

const STAMP = `aerdf.org's header and footer, snapshot of ${SOURCE} taken ${new Date().toISOString().slice(0, 10)} by tools/snapshot-aerdf.mjs. Do not edit: re-run the tool.`;
fs.writeFileSync(path.join(root, 'assets/aerdf/chrome.css'), `/* ${STAMP}
   AERDF's CSS, cut to the ${rulesKept} of its ${rulesIn} rules that can match the chrome, for the shadow root it is drawn in. */
:host { all: initial; display: block; }
/* aerdf.org's body is at least a screen tall; here the same rules land on .aerdf-body, which
   holds only the header or only the footer, and would push the page a screen down. */
.aerdf-body { min-height: 0 !important; }
.aerdf-preview-form { margin: 0 auto 1rem; max-width: 34rem; padding: 0.875rem 1rem; border: 1px dashed rgba(255, 255, 255, 0.6); border-radius: 4px; font-size: 0.875rem; line-height: 1.4; }
${kept.join('\n\n')}
`);
fs.writeFileSync(path.join(root, 'assets/aerdf/fonts.css'), `/* ${STAMP}
   AERDF's @font-face rules that load, which a shadow root ignores, so the page links them. */
${fontFaces.join('\n')}
`);
fs.writeFileSync(path.join(root, 'source-material/aerdf/chrome-top.html'), `<!-- ${STAMP} -->\n${top}\n`);
fs.writeFileSync(path.join(root, 'source-material/aerdf/chrome-bottom.html'), `<!-- ${STAMP} -->\n${footer}\n`);
fs.writeFileSync(path.join(root, 'source-material/aerdf/snapshot.json'), JSON.stringify({
  source: SOURCE,
  taken: new Date().toISOString(),
  bodyClass,
  logos,
  stylesheets: sheets.map((s) => s.from),
  rules: { in: rulesIn, kept: rulesKept },
  fontFaces: fontFaces.length,
}, null, 2) + '\n');
console.log(`snapshot of ${SOURCE}: ${rulesKept} of ${rulesIn} rules kept from ${sheets.length} stylesheets, ${fontFaces.length} @font-face`);

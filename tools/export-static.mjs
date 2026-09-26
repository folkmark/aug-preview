// Renders every page of the site to plain, static HTML for handoff.
//
// The site ships as one client-rendered template: index.html holds an
// <x-dc> element that support.js compiles and mounts with React, fetched from a CDN
// at runtime. That is fine to deploy and useless to hand to anyone who has to rebuild
// the site somewhere else — there is no page markup in the repository to read, only a
// template and the runtime that expands it.
//
// This drives a real browser over the built site, waits for each route to render, and
// writes out what the visitor actually gets: ordinary semantic HTML with the design
// system's classes and custom properties intact, and no runtime attached.
//
// Playwright is not a repo dependency and CI never runs this — the output is committed:
//
//   npm i --no-save playwright && node tools/export-static.mjs
//
// Output lands in wordpress-handoff/pages/. Asset references are rewritten one level
// up, so the folder sits beside assets/ and _ds/ and the pages open straight from disk.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const stage = path.join(root, '.export-tmp');
const OUT = path.join(root, 'wordpress-handoff/pages');
const PORT = 8731;

// Which source this export was taken from, stamped into every page. The export is
// committed and nothing regenerates it automatically, so it drifts silently the
// moment index.html changes — it has done so before, and a handoff page that is
// three commits behind the template looks exactly like one that is current.
// build-site.mjs reads this stamp back and warns when index.html has moved past
// it. "+dirty" means the working tree differed from the stamped commit, so the
// stamp names the nearest commit rather than the exact input.
let STAMP = 'unknown';
// And a hash of index.html itself, beside the commit. The commit says where the export
// came from; the hash says whether index.html is still that file, and it can say so
// without any git history at all — CI clones are shallow, and the WordPress plugin's
// generator (tools/build-wp-plugin.mjs) has to know the export is current before it
// builds templates out of it.
const SOURCE_HASH = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'index.html'))).digest('hex').slice(0, 16);
try {
  STAMP = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim();
  if (execFileSync('git', ['status', '--porcelain', '--', 'index.html', 'support.js'], { cwd: root }).toString().trim()) {
    STAMP += '+dirty';
  }
} catch {}

const PAGES = [
  { slug: '', file: 'home.html', name: 'Home' },
  { slug: 'challenge/', file: 'challenge.html', name: 'The Challenge' },
  { slug: 'approach/', file: 'approach.html', name: 'Our Approach' },
  { slug: 'team/', file: 'team.html', name: 'Who We Are' },
  { slug: 'follow/', file: 'follow.html', name: 'Follow Our Work' }
];

// The runtime pulls React and Babel from unpkg on boot. Mirror them into the staged
// copy and point support.js at the local files: the export must not depend on a CDN
// being reachable, and a half-booted page would export as an empty shell that looks
// plausible until someone opens it.
const VENDOR = [
  ['https://unpkg.com/react@18.3.1/umd/react.production.min.js', 'react.js'],
  ['https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', 'react-dom.js'],
  ['https://unpkg.com/@babel/standalone@7.29.0/babel.min.js', 'babel.js']
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.otf': 'font/otf', '.mp4': 'video/mp4' };

fs.rmSync(stage, { recursive: true, force: true });
execFileSync('node', [path.join(root, 'tools/build-site.mjs'), stage], { stdio: 'inherit' });

fs.mkdirSync(path.join(stage, 'vendor'), { recursive: true });
for (const [url, name] of VENDOR) {
  execFileSync('curl', ['-sL', '--max-time', '120', url, '-o', path.join(stage, 'vendor', name)]);
  const size = fs.statSync(path.join(stage, 'vendor', name)).size;
  if (size < 5000) throw new Error(`vendored ${name} is only ${size} bytes — the mirror did not fetch`);
}
let support = fs.readFileSync(path.join(stage, 'support.js'), 'utf8');
for (const [url, name] of VENDOR) support = support.replace(url, '/vendor/' + name);
fs.writeFileSync(path.join(stage, 'support.js'), support);

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const abs = path.join(stage, rel);
  if (!abs.startsWith(stage) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(abs)] || 'application/octet-stream' });
  fs.createReadStream(abs).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

// Prefer a browser the environment already provides. Playwright pins an exact build
// number and refuses anything else, which fails on any machine with a preinstalled
// Chromium — including this project's own container. Point it at what is there.
function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const pool = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!fs.existsSync(pool)) return undefined;
  for (const dir of fs.readdirSync(pool).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(pool, dir, 'chrome-linux', 'chrome');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
fs.mkdirSync(OUT, { recursive: true });

const states = { button: {}, radio: null, checkbox: null };
for (const p of PAGES) {
  await page.goto(`http://localhost:${PORT}/${p.slug}`, { waitUntil: 'load' });
  // Boot is asynchronous and the shell exists before the content does, so wait on the
  // rendered heading rather than a timeout — a fixed wait exports blank pages on a
  // slow machine and nobody notices until the handoff.
  await page.waitForFunction(() => {
    const r = document.getElementById('dc-root');
    return r && r.querySelector('main') && r.querySelector('h1, h2');
  }, null, { timeout: 30000 });
  await page.waitForTimeout(600);

  // AND WAIT FOR THE DESIGN SYSTEM'S OWN COMPONENTS, which the heading check above does
  // not cover: the page's markup renders first and each <x-import> hydrates after, so the
  // wait that is long enough for a heading is a race for a Button. It loses often enough
  // to matter — every export is a coin toss over which pages come out whole, and this
  // repo already ships four lost buttons in team.html from a run that lost it.
  //
  // What it leaves behind is a .sc-placeholder div, and a placeholder is worse than a
  // blank page because it looks like a page. It is a full-width 60px block where an
  // inline button was, so a handoff page that has one is both wrong to look at and wrong
  // to measure against — a copy block measures 95px taller at 1280 with two of them in it.
  //
  // Reported and not thrown: the export is still useful with a placeholder in it, and a
  // build that fails on a slow machine helps nobody. A line on stderr is what makes the
  // difference between a known gap and a silent one.
  const stuck = await page.waitForFunction(
    () => document.querySelectorAll('.sc-placeholder').length === 0,
    null, { timeout: 15000 }
  ).then(() => 0).catch(() => page.evaluate(() => document.querySelectorAll('.sc-placeholder').length));
  if (stuck) console.error(`  ! ${p.slug}: ${stuck} component(s) never hydrated, exported as placeholders`);

  // THE MOBILE MENU IS NOT IN THE PAGE UNTIL SOMEONE OPENS IT. It sits behind an <sc-if>
  // on navOpen, so a snapshot of a closed page has a hamburger whose aria-controls points
  // at nothing — and a porter has no way to know the overlay exists, let alone what is in
  // it. Open it, take its markup, close it again, and put it back into the export hidden,
  // straight after the header, which is where it renders. click() on the element rather
  // than a pointer click: the toggle is display:none at this 1440px viewport, and React's
  // handler does not care whether the button was visible when it fired.
  const menu = await page.evaluate(async () => {
    const toggle = document.querySelector('header button[aria-controls="site-menu"]');
    if (!toggle) return null;
    toggle.click();
    for (let i = 0; i < 50 && !document.getElementById('site-menu'); i++) await new Promise((r) => setTimeout(r, 20));
    const el = document.getElementById('site-menu');
    const out = el ? el.outerHTML : null;
    toggle.click();
    for (let i = 0; i < 50 && document.getElementById('site-menu'); i++) await new Promise((r) => setTimeout(r, 20));
    return out;
  });
  if (!menu) throw new Error(`${p.slug || 'home'}: the mobile menu never rendered — the toggle or its <sc-if> has changed`);

  const html = await page.evaluate((menu) => {
    const doc = document.documentElement.cloneNode(true);
    // Put the captured menu back, hidden, where the runtime renders it — the attribute
    // rather than a closed-state style, because it reads as what it is: present, and shut.
    // The attribute alone does not shut it, though. The browser's own [hidden] rule is
    // display:none at user-agent strength, and the overlay's inline display:flex outranks
    // anything short of !important — so the first export of this opened on a phone with
    // the menu covering the page. The one-line rule after it is what every reset
    // (Bootstrap's included) carries for exactly this, and a theme building from these
    // pages needs it too.
    const header = doc.querySelector('header');
    if (header) {
      const t = document.createElement('template');
      t.innerHTML = menu;
      const m = t.content.firstElementChild;
      m.setAttribute('hidden', '');
      header.after(m);
      const rule = document.createElement('style');
      rule.textContent = '[hidden] { display: none !important; }';
      doc.querySelector('head').appendChild(rule);
    }
    // THE RUNTIME'S OWN WRAPPERS, which are not the page. support.js mounts the app in a
    // <div class="sc-host"> and wraps every <x-import> it expands in a
    // <div class="sc-host-x" style="display:contents"> (support.js:725-730) — 107 of them
    // on these five pages. display:contents means they draw nothing, but they are not
    // nothing to anyone reading the markup or parsing it: a <div> is not allowed inside a
    // <p>, so the 21 bio links that sit in <p class="bio-cta"> serialised as
    // <p><div class="sc-host-x"><a>…, and a standards parser — a browser opening the file,
    // or any tool that reads it — closes the <p> at the <div> and moves the link out of
    // it. Opening an export did not even reproduce the page it was taken from. Unwrap
    // them here, children kept in place, before anything serialises.
    doc.querySelectorAll('.sc-host-x, .sc-host').forEach((w) => w.replaceWith(...w.childNodes));
    if (doc.querySelector('.sc-host-x, .sc-host')) throw new Error('runtime wrappers survived the unwrap');
    // The template source, the runtime, and the CDN mirror are all scaffolding for a
    // page that no longer needs to be built at runtime.
    doc.querySelectorAll('x-dc, script[src*="support.js"], script[src*="/vendor/"], script[type="text/x-dc"], script[src*="_ds_bundle"]')
      .forEach((n) => n.remove());
    // Compiler bookkeeping that means nothing outside the runtime.
    doc.querySelectorAll('[data-dc-tpl]').forEach((n) => n.removeAttribute('data-dc-tpl'));
    // The runtime injects a rule hiding its own template element. That element is gone
    // now, and a dangling x-dc selector in the handoff would only raise questions.
    // The runtime's loading-placeholder stylesheet (.sc-placeholder, the streaming
    // shimmer, .sc-logic-error) goes with it: every selector in it styles states only
    // the runtime can produce, and forty lines of dead CSS at the top of a handoff
    // page reads as something the porter is supposed to understand.
    doc.querySelectorAll('style').forEach((s) => {
      if (s.textContent.includes('.sc-placeholder')) { s.remove(); return; }
      s.textContent = s.textContent.replace(/x-dc\s*\{[^}]*\}/g, '').trim();
      if (!s.textContent) s.remove();
    });
    // State the falling-blocks element wrote into the DOM while it was running. A
    // snapshot of a mid-animation page is not the page: the frame tag in particular is
    // trusted by the element, so exporting it hands the next load a blank canvas that
    // claims to be already drawn. Put the markup back the way it was authored.
    doc.querySelectorAll('falling-blocks').forEach((fb) => {
      fb.removeAttribute('data-fb-motion');
      fb.querySelectorAll('[data-fb-layer]').forEach((l) => l.removeAttribute('style'));
      fb.querySelectorAll('canvas').forEach((c) => {
        c.removeAttribute('data-fbf');
        c.removeAttribute('width');
        c.removeAttribute('height');
      });
      const st = fb.querySelector('[data-fb-stage]');
      if (st) { st.removeAttribute('data-fb-box'); st.removeAttribute('style'); }
    });
    // The same for the hero. It writes more than falling-blocks does, and one piece of it
    // is actively dangerous to export: data-hb-ready plus a data-f tag on a canvas means
    // "a frame has been drawn into this session's canvases", which is a lie in a
    // serialised page — the element trusts it and leaves the still hidden behind two blank
    // layers. boot() clears all of this at runtime for exactly this reason (see the cache
    // note in hero-bridge.js), but the handoff is meant to read as authored markup, and a
    // porter copying an entry transform out of it would inherit one viewport's geometry.
    doc.querySelectorAll('hero-bridge').forEach((hb) => {
      hb.removeAttribute('data-hb-motion');
      hb.removeAttribute('data-hb-ready');
      const box = hb.querySelector('[data-hb-box]');
      if (box) box.removeAttribute('style');
      hb.querySelectorAll('canvas').forEach((c) => {
        c.removeAttribute('data-f');
        c.removeAttribute('style');
        c.removeAttribute('width');
        c.removeAttribute('height');
      });
    });
    // The same again for what the page's own component wrote before the snapshot.
    // The reveal sweeper has set opacity 1 on every block above the fold, the
    // cycle rig has written its scroll-0 geometry (dash offsets on the arc paths,
    // opacity and a disabled attribute on the nodes), and the approach-offset sync
    // has measured a margin — all of it one viewport's runtime state, none of it
    // authored markup. Put each back to the state the template declares, so a
    // porter copying a block copies what was written, not what one 1440x900
    // session happened to compute.
    doc.querySelectorAll('[data-reveal]').forEach((el) => { el.style.opacity = '0'; });
    doc.querySelectorAll('[data-approach-text]').forEach((el) => el.style.removeProperty('margin-top'));
    // The wheel's paint keys are session state with the same hazard as the canvas
    // frame tags: serialised into a page, they claim a ring is painted that is not.
    // The element clears them on boot too, but the handoff reads as authored markup.
    doc.querySelectorAll('[data-cycle]').forEach((w) => { delete w.dataset.cwg; delete w.dataset.cwk; });
    doc.querySelectorAll('[data-cycle] [data-arc] path').forEach((p) => p.removeAttribute('style'));
    doc.querySelectorAll('[data-cycle] [data-arc] polygon').forEach((p) => p.setAttribute('style', 'opacity:0'));
    doc.querySelectorAll('[data-cycle] [data-node]').forEach((n) => {
      n.style.opacity = '0';
      n.style.removeProperty('pointer-events');
      n.removeAttribute('disabled');
    });
    doc.querySelectorAll('[data-cycle] [data-hub], [data-cycle] [data-hub-line]').forEach((h) => { h.style.opacity = '0'; });
    // The headshots' colour layers. team-colour.js inserts them the first time a pointer
    // crosses a team grid, never on load, so this export should never meet one — but if
    // it does, it is session state, not markup, and it would also sit in the card
    // export-content.mjs reads each person's photo out of.
    doc.querySelectorAll('[data-team-colour]').forEach((n) => n.remove());
    const rootEl = doc.querySelector('#dc-root');
    const body = doc.querySelector('body');
    if (rootEl && body) { while (rootEl.firstChild) body.appendChild(rootEl.firstChild); rootEl.remove(); }
    return '<!doctype html>\n' + doc.outerHTML;
  }, menu);

  // THE STATES THE SNAPSHOT CANNOT SEE. The design system's Button, RadioGroupItem and
  // Checkbox are styled entirely inline, and their hover and checked looks are React state
  // (useState in _ds_bundle.js), so a serialised page only ever holds the resting look —
  // hover the pill and nothing happens. Drive each one here, in the browser that renders
  // them, and record what its inline style becomes: the WordPress plugin's generator
  // turns the differences into :hover and :checked rules. Recorded from the real
  // components rather than read out of the bundle's source, so a design-system update that
  // changes a hover changes this file, and nothing has to be re-derived by hand. Taken
  // AFTER the snapshot, because clicking a radio changes the page.
  const pageStates = await page.evaluate(() => {
    const decl = (el) => {
      const o = {};
      for (let i = 0; i < el.style.length; i++) { const k = el.style[i]; o[k] = el.style.getPropertyValue(k); }
      return o;
    };
    const diff = (a, b) => {
      const o = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) o[k] = b[k] === undefined ? '' : b[k];
      return o;
    };
    const fire = (el, type) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: document.body }));
    const tick = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return (async () => {
      const out = { button: {}, radio: null, checkbox: null };
      const seen = new Set();
      for (const b of document.querySelectorAll('[data-slot="button"][data-variant]')) {
        const v = b.dataset.variant;
        if (seen.has(v)) continue;
        seen.add(v);
        const rest = decl(b);
        // React listens for mouseover/mouseout at the root and synthesises enter and leave
        // from them; a bare mouseenter event never reaches it.
        fire(b, 'mouseover'); await tick();
        const hover = decl(b);
        fire(b, 'mouseout'); await tick();
        out.button[v] = { hover: diff(rest, hover) };
      }
      const part = async (sel, key) => {
        const el = [...document.querySelectorAll(sel)].find((e) => e.getAttribute('aria-checked') === 'false');
        if (!el) return null;
        const rest = decl(el);
        fire(el, 'mouseover'); await tick();
        const hover = diff(rest, decl(el));
        fire(el, 'mouseout'); await tick();
        el.click(); await tick();
        const now = document.getElementById(el.id) || el;
        const on = [...document.querySelectorAll(sel)].find((e) => e.getAttribute('aria-checked') === 'true') || now;
        const checked = diff(rest, decl(on));
        const mark = on.firstElementChild ? { tag: on.firstElementChild.tagName.toLowerCase(), style: decl(on.firstElementChild), text: on.firstElementChild.textContent.trim(), className: on.firstElementChild.getAttribute('class') || '' } : null;
        return { rest, hover, checked, mark };
      };
      out.radio = await part('[data-slot="radio-group-item"]');
      out.checkbox = await part('[data-slot="checkbox"]');
      return out;
    })();
  });
  for (const [v, st] of Object.entries(pageStates.button)) states.button[v] ||= st;
  if (pageStates.radio) states.radio = pageStates.radio;
  if (pageStates.checkbox) states.checkbox = pageStates.checkbox;

  // The build serves these pages with absolute asset paths — see absolutise() in
  // build-site.mjs — so what comes off the page is /assets/..., not assets/.... These
  // files are meant to open straight off disk, where an absolute path resolves to
  // file:///assets/ and every image fails without a word, so bring them back down to a
  // relative one. It is two levels, not one: these sit at wordpress-handoff/pages/ and
  // the assets are at the repository root.
  //
  // This pattern used to be /(["'])assets\//, which quietly matched nothing at all: what
  // the page hands back is the route file's own ../assets/, and a quote followed by ".."
  // is not a quote followed by "assets/". The rewrite was a no-op, ../assets/ survived
  // into every exported page, and it pointed at a wordpress-handoff/assets/ that does not
  // exist — so the handoff pages have never rendered an image from disk. Verify this by
  // opening one with file://, not over a server, where either path appears to work.
  const out = html
    .replace(/(["'\s,(])\/assets\//g, '$1../../assets/')
    .replace(/(["'\s,(])\/_ds\//g, '$1../../_ds/')
    .replace(/(["'])\/support\.js\1/g, '$1../../support.js$1')
    .replace(/^<!doctype html>\n/, `<!doctype html>\n<!-- exported from ${STAMP} by tools/export-static.mjs; index.html sha256 ${SOURCE_HASH} -->\n`);

  fs.writeFileSync(path.join(OUT, p.file), out);
  console.log(`${p.file.padEnd(22)} ${(out.length / 1024).toFixed(0)} KB  ${p.name}`);
}

if (!states.radio || !states.checkbox || !states.button.default) {
  throw new Error('interaction states incomplete: ' + JSON.stringify(Object.keys(states.button)) + ` radio=${!!states.radio} checkbox=${!!states.checkbox}`);
}
fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify({ exported: `${STAMP}; index.html sha256 ${SOURCE_HASH}`, ...states }, null, 2) + '\n');
console.log(`states.json            button variants: ${Object.keys(states.button).join(', ')}; radio, checkbox`);

await browser.close();
server.close();
fs.rmSync(stage, { recursive: true, force: true });
console.log(`\n${PAGES.length} pages -> wordpress-handoff/pages/`);

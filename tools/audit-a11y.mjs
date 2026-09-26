// Measures the site against WCAG 2.2 AA, and fails on anything it can prove is wrong.
//
// The target is 2.2 AA because it contains every 2.1 A/AA criterion — what the ADA Title II
// rule holds partner districts to from 26 April 2027 — plus six more, and it is what W3C
// and ISO (ISO/IEC 40500:2025) now name. The reasoning, the sources and the audit this
// script was first written for are in the September 2026 review; the short version is that
// nothing here is asserted. Every check drives Chromium over the real pages and reads what a
// keyboard, a screen reader or a pixel would get.
//
// Two surfaces, because they are not the same markup:
//
//   site     _site, as tools/build-site.mjs writes it — the GitHub Pages preview, rendered
//            client-side by support.js. React, ReactDOM and Babel are fetched once from the
//            URLs support.js names and served locally, so a sandbox that cannot reach unpkg
//            still renders the page (the same trick as tools/export-static.mjs).
//   export   wordpress-handoff/pages/*.html — the DOM the WordPress plugin is generated from,
//            which is what aerdf.org serves. The plugin's own layer (its form fix-ups, menu
//            script and CSS) is exercised by tools/verify-wp-plugin.mjs, not here.
//
// What fails, and why each is a check rather than a hope:
//
//   axe        axe-core's WCAG 2.0/2.1/2.2 A and AA rules. It finds what can be found
//              statically — names, labels, roles, contrast on flat backgrounds.
//   focus      a real Tab walk. Every stop must look different focused than blurred (2.4.7),
//              read as the element's own computed style or an ancestor's, pseudo-elements
//              included. Then a Shift+Tab walk from the end: moving backwards is what scrolls
//              a control up under the sticky header, and a stop hidden entirely behind it
//              fails 2.4.11. Forward walks never showed it; the backward walk found fifteen.
//   targets    2.5.8: under 24px in either dimension, with the spacing exception (a 24px
//              circle on each undersized target clear of every other), inline links exempt.
//   reflow     1.4.10: no horizontal scroll at 320 CSS px.
//   spacing    1.4.12: raising line, letter, word and paragraph spacing must not lose
//              content. Every run of text is placed against its nearest clipping box
//              before the override and after it, and only a run that is clipped after but
//              was not before fails. Both halves matter. Measured on the text, not the box:
//              the page root clips the falling blocks' plates sideways by design, and a
//              collapsed wheel panel or screen-reader-only text hides nothing a reader was
//              shown. And measured as a difference: the skip link sits above its clipping
//              box until it has focus, so a single look reported it clipped whenever the
//              focus walk before this check happened to end elsewhere — which it did on
//              the CI runner and not locally (all 16 of run 36277825736's failures).
//   imagery    1.4.3 where axe cannot look: text over the hero's plate and over the falling
//              blocks. At several points in each sequence the box is screenshotted twice,
//              with the text and with it transparent; the pixels that differ are the
//              glyphs, and the ring of pixels within two of them is the text's immediate
//              background, which is what 1.4.3 measures. The 5th percentile of the text
//              colour's contrast against that ring must clear 4.5:1 (3:1 for large text).
//              A text-shadow halo is part of the background by this measure, as it is to
//              a reader. The worst pixel is reported but does not fail.
//   menu       site only, at phone width: with the menu open, Tab must never land on
//              something the overlay hides, and Escape must return focus to the toggle.
//   route      site only: after a client-side page change, focus moves into the new page
//              and its nav link carries aria-current="page".
//   form       site only: an empty submit must mark the empty required fields aria-invalid
//              and say so in a live region.
//   reduced    with prefers-reduced-motion, neither the wheel nor the falling blocks may pin:
//              each is at most a screen and a fifth tall.
//   motion     with --motion: nothing on Home may change between two screenshots 6s apart
//              at rest (2.2.2). Slow — about two minutes — so it is opt-in.
//   html       html-validate's parse-level rules over every served page (duplicate ids and
//              attributes, bad nesting), because DOJ's rule still names WCAG 2.1's 4.1.1.
//
// Usage:
//   npm i --no-save playwright@1.63.0 linkedom@0.18.13 postcss@8.5.28 postcss-selector-parser@7.1.6 pixelmatch@7.2.0 pngjs@7.0.0 axe-core@4.13.0 html-validate@11.16.0
//   node tools/build-site.mjs _site
//   node tools/audit-a11y.mjs [--site=_site] [--only=site|export] [--motion] [--json=report.json]
//
// Exits 1 if anything fails.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);
const arg = (name, dflt) => { const a = process.argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`)); return a ? (a.includes('=') ? a.split('=').slice(1).join('=') : true) : dflt; };
const SITE = path.resolve(root, arg('site', '_site'));
const ONLY = arg('only', null);
const MOTION = !!arg('motion', false);
const JSON_OUT = arg('json', null);
const WIDTHS = [1280, 375];
const H = 800;

const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };

// ------------------------------------------------------------------ serving

// support.js loads React, ReactDOM and Babel from unpkg by URL. Fetch each once into the
// temp directory and serve it from here, so the audit renders the page wherever curl can
// reach unpkg, even where Chromium cannot (a proxy whose CA only the system trusts).
const vendorDir = path.join(os.tmpdir(), 'aug-a11y-vendor');
function vendored(supportJs) {
  fs.mkdirSync(vendorDir, { recursive: true });
  let out = supportJs;
  for (const url of [...new Set(supportJs.match(/https:\/\/unpkg\.com\/[^"']+\.js/g) || [])]) {
    const name = url.replace(/[^a-z0-9.]+/gi, '_');
    const file = path.join(vendorDir, name);
    if (!fs.existsSync(file) || fs.statSync(file).size < 5000) execFileSync('curl', ['-sSL', '--max-time', '120', url, '-o', file]);
    if (fs.statSync(file).size < 5000) throw new Error(`could not fetch ${url}`);
    out = out.split(url).join('/__vendor/' + name);
  }
  return out;
}

function serve(dir, port, { spa = false } = {}) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.startsWith('/__vendor/')) {
      res.writeHead(200, { 'content-type': MIME['.js'] });
      fs.createReadStream(path.join(vendorDir, path.basename(rel))).pipe(res);
      return;
    }
    if (rel.endsWith('/')) rel += 'index.html';
    let abs = path.join(dir, rel);
    if (!abs.startsWith(dir) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      if (spa && fs.existsSync(path.join(dir, rel, 'index.html'))) abs = path.join(dir, rel, 'index.html');
      else { res.writeHead(404); res.end('not found'); return; }
    }
    if (path.basename(abs) === 'support.js') {
      res.writeHead(200, { 'content-type': MIME['.js'] });
      res.end(vendored(fs.readFileSync(abs, 'utf8')));
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(abs)] || 'application/octet-stream' });
    fs.createReadStream(abs).pipe(res);
  });
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)));
}

function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const pool = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!fs.existsSync(pool)) return undefined;
  for (const d of fs.readdirSync(pool).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(pool, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

// ------------------------------------------------------------------ results

const results = [];
function record(surface, page, width, check, failures, notes) {
  results.push({ surface, page, width, check, pass: failures.length === 0, failures, notes: notes || null });
}

// ------------------------------------------------------------------ in-page helpers

// Installed into every page. Kept as one function so the page sees exactly one copy.
function installHelpers() {
  const props = ['outlineStyle', 'outlineWidth', 'outlineColor', 'boxShadow', 'borderTopColor', 'borderBottomColor', 'borderBottomWidth', 'backgroundColor', 'color', 'textDecorationLine'];
  window.__a11y = {
    snap(el) {
      const s = [];
      let n = el;
      for (let i = 0; i < 4 && n && n.nodeType === 1; i++, n = n.parentElement) {
        for (const pseudo of [null, '::after', '::before']) { const cs = getComputedStyle(n, pseudo); s.push(props.map((p) => cs[p]).join('|')); }
      }
      return s.join('#');
    },
    desc(el) {
      const t = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('alt') || el.getAttribute('name') || el.getAttribute('type') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${t}"`;
    },
    // Entirely hidden by something else, sampled at five points inside the box.
    obscured(el) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const pts = [[0.5, 0.5], [0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]]
        .map(([fx, fy]) => [r.left + r.width * fx, r.top + r.height * fy])
        .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
      if (!pts.length) return 'offscreen';
      const hidden = pts.every(([x, y]) => { const h = document.elementFromPoint(x, y); return h && !el.contains(h) && !h.contains(el); });
      if (!hidden) return false;
      const h = document.elementFromPoint(pts[0][0], pts[0][1]);
      return 'covered by ' + (h ? window.__a11y.desc(h.closest('header,nav,[data-aug-bar],[id$="site-menu"]') || h) : '?');
    },
  };
}

const vis = `(el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }`;

async function prepare(page) {
  // The reveal fades content in on scroll; an audit needs it all present, and contrast
  // measured on a half-faded paragraph measures the fade.
  await page.addStyleTag({ content: '[data-reveal]{opacity:1!important} *{transition:none!important}' });
  await page.evaluate(installHelpers);
}

// ------------------------------------------------------------------ checks

async function checkAxe(page) {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] }));
  return r.violations.flatMap((v) => v.nodes.slice(0, 4).map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')} — ${(n.failureSummary || '').split('\n').slice(1, 2).join('').trim().slice(0, 140)}`));
}

async function walk(page, key, max) {
  const seen = [];
  let first = null;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    const info = await page.evaluate(async () => {
      // Two frames: what the reader sees once the page has reacted to the focus.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const a = document.activeElement;
      if (!a || a === document.body || a === document.documentElement) return null;
      if (!a.__a11yIdx) a.__a11yIdx = (window.__a11yN = (window.__a11yN || 0) + 1);
      return { idx: a.__a11yIdx, desc: window.__a11y.desc(a), focused: window.__a11y.snap(a), obscured: window.__a11y.obscured(a) };
    });
    if (!info) { if (seen.length) break; continue; }
    if (first === info.idx) break;
    if (first === null) first = info.idx;
    seen.push(info);
  }
  return seen;
}

async function checkFocus(page) {
  await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
  const fwd = await walk(page, 'Tab', 300);
  const blurred = await page.evaluate(() => {
    document.activeElement && document.activeElement.blur();
    const m = {};
    document.querySelectorAll('*').forEach((e) => { if (e.__a11yIdx) m[e.__a11yIdx] = window.__a11y.snap(e); });
    return m;
  });
  const noIndicator = [...new Set(fwd.filter((f) => blurred[f.idx] === f.focused).map((f) => f.desc))];
  const obscuredFwd = fwd.filter((f) => f.obscured && f.obscured !== 'offscreen').map((f) => `${f.desc} (${f.obscured}, Tab)`);
  // Backwards from the last control on the page.
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const all = [...document.querySelectorAll('a[href],button,input,textarea,select,[tabindex]:not([tabindex="-1"])')].filter((e) => e.getClientRects().length);
    const last = all[all.length - 1];
    if (last) last.focus();
  });
  const back = await walk(page, 'Shift+Tab', 300);
  const obscuredBack = back.filter((f) => f.obscured && f.obscured !== 'offscreen').map((f) => `${f.desc} (${f.obscured}, Shift+Tab)`);
  return { stops: fwd.length, noIndicator, obscured: [...new Set([...obscuredFwd, ...obscuredBack])] };
}

async function checkTargets(page) {
  return page.evaluate(`(() => {
    const vis = ${vis};
    const els = [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')].filter((e) => vis(e) && !e.disabled);
    const t = els.map((e) => ({ e, r: e.getBoundingClientRect() }));
    const inline = (e) => { const p = e.closest('p,li,dd,td'); return p && p.textContent.trim().length > e.textContent.trim().length + 5; };
    const small = t.filter((x) => (x.r.width < 24 || x.r.height < 24) && !inline(x.e) && !(x.e.type === 'text' && x.e.tabIndex < 0));
    const cx = (r) => [r.left + r.width / 2, r.top + r.height / 2];
    const d = ([x, y], r) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
    return small.filter((a) => t.some((b) => b !== a && (small.includes(b) ? Math.hypot(cx(a.r)[0] - cx(b.r)[0], cx(a.r)[1] - cx(b.r)[1]) < 24 : d(cx(a.r), b.r) < 12)))
      .map((x) => window.__a11y.desc(x.e) + ' ' + Math.round(x.r.width) + 'x' + Math.round(x.r.height));
  })()`);
}

async function checkReflow(page) {
  const was = page.viewportSize();
  await page.setViewportSize({ width: 320, height: H });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const cw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
    return sw > cw + 1 ? [`scrollWidth ${sw} > clientWidth ${cw}`] : [];
  });
  await page.setViewportSize(was);
  return r;
}

async function checkSpacing(page) {
  // A known start, whatever the focus walk before this left behind.
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); window.scrollTo(0, 0); });
  await page.waitForTimeout(100);
  // Every visible run of text that lies outside its nearest clipping box, keyed by an id
  // held on the text node itself, so the two looks name the same runs.
  const clipped = () => page.evaluate(() => {
    const ids = window.__a11yTextIds || (window.__a11yTextIds = new WeakMap());
    let next = window.__a11yTextNext || 0;
    const out = [];
    for (const box of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(box);
      if (!/hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY)) continue;
      const b = box.getBoundingClientRect();
      if (b.width <= 4 || b.height <= 4 || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if (!t.textContent.trim()) continue;
        const el = t.parentElement;
        if (el.closest('[aria-hidden="true"]')) continue;
        const ecs = getComputedStyle(el);
        if (ecs.visibility === 'hidden' || ecs.display === 'none') continue;
        // Judged by the nearest box that clips it, so each clip is measured once, and
        // screen-reader-only text (clipped to a pixel on purpose) is not a failure.
        let clipper = el;
        while (clipper && clipper !== box) {
          const c = getComputedStyle(clipper);
          if (/hidden|clip/.test(c.overflow + c.overflowX + c.overflowY) || (c.clipPath && c.clipPath !== 'none')) break;
          clipper = clipper.parentElement;
        }
        if (clipper !== box) continue;
        const range = document.createRange(); range.selectNodeContents(t);
        const tr = range.getBoundingClientRect();
        if (tr.width < 2 || tr.height < 2) continue;
        if (tr.bottom > b.bottom + 2 || tr.right > b.right + 2 || tr.top < b.top - 2 || tr.left < b.left - 2) {
          if (!ids.has(t)) ids.set(t, ++next);
          out.push({ id: ids.get(t), line: `${window.__a11y.desc(box)} clips "${t.textContent.trim().slice(0, 40)}"` });
        }
      }
    }
    window.__a11yTextNext = next;
    return out;
  });
  const before = new Set((await clipped()).map((x) => x.id));
  const tag = await page.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p{margin-bottom:2em!important}' });
  await page.waitForTimeout(300);
  const after = await clipped();
  await tag.evaluate((n) => n.remove());
  return [...new Set(after.filter((x) => !before.has(x.id)).map((x) => x.line))].slice(0, 8);
}

const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// Text laid over the hero's plate and the falling blocks, which axe reports as undecidable.
const OVER_IMAGERY = ['main h1', '[data-fb-copy] > h2', '[data-fb-front] > p'];

async function checkImagery(page, width) {
  const failures = [], notes = [];
  for (const sel of OVER_IMAGERY) {
    const plan = await page.evaluate((sel) => {
      const el = [...document.querySelectorAll(sel)].find((e) => getComputedStyle(e).display !== 'none' && e.getClientRects().length);
      if (!el) return null;
      window.__a11yT = el;
      let host = el.closest('hero-bridge, falling-blocks, section') || el;
      while (host.parentElement && host.parentElement.offsetHeight <= host.offsetHeight * 1.05 && host.parentElement !== document.body) host = host.parentElement;
      return { top: host.getBoundingClientRect().top + scrollY, h: host.offsetHeight };
    }, sel);
    if (!plan) continue;
    let worst = null;
    for (const f of [0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 0.95]) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, plan.top + Math.max(0, plan.h - H) * f));
      await page.waitForTimeout(450);
      const info = await page.evaluate(() => {
        const e = window.__a11yT; let o = 1;
        for (let n = e; n; n = n.parentElement) o *= +getComputedStyle(n).opacity;
        const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        return { o, color: cs.color, size: parseFloat(cs.fontSize), weight: +cs.fontWeight, text: e.textContent.trim().slice(0, 36), r: { x: r.left, y: r.top, w: r.width, h: r.height } };
      });
      if (info.o < 0.6 || info.r.y < 0 || info.r.y + info.r.h > H || info.r.w < 2 || info.r.h < 2) continue;
      const clip = { x: Math.max(0, info.r.x), y: info.r.y, width: Math.min(info.r.w, width - Math.max(0, info.r.x)), height: info.r.h };
      const withText = PNG.sync.read(await page.screenshot({ clip }));
      await page.evaluate(() => { const e = window.__a11yT; e.style.setProperty('color', 'transparent', 'important'); e.style.setProperty('-webkit-text-fill-color', 'transparent', 'important'); });
      const bare = PNG.sync.read(await page.screenshot({ clip }));
      await page.evaluate(() => { const e = window.__a11yT; e.style.removeProperty('color'); e.style.removeProperty('-webkit-text-fill-color'); });
      const m = info.color.match(/[\d.]+/g).map(Number);
      const tl = lum(m[0], m[1], m[2]);
      // Glyph pixels: where drawing the text changed the picture. A block passing in
      // front of the text changes nothing there, so occluded letters are not measured
      // as if they were on show.
      const W = withText.width, Hh = withText.height, glyph = new Uint8Array(W * Hh);
      for (let i = 0; i < W * Hh; i++) {
        const o = i * 4;
        if (Math.abs(withText.data[o] - bare.data[o]) + Math.abs(withText.data[o + 1] - bare.data[o + 1]) + Math.abs(withText.data[o + 2] - bare.data[o + 2]) > 60) glyph[i] = 1;
      }
      const rs = [];
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (glyph[i]) continue;
        let near = false;
        for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy >= 0 && yy < Hh && xx >= 0 && xx < W && glyph[yy * W + xx]) { near = true; break; }
        }
        if (near) { const o = i * 4; rs.push(ratio(tl, lum(bare.data[o], bare.data[o + 1], bare.data[o + 2]))); }
      }
      if (rs.length < 50) continue;
      rs.sort((a, b) => a - b);
      const p5 = rs[Math.floor(rs.length * 0.05)];
      const large = info.size >= 24 || (info.size >= 18.66 && info.weight >= 700);
      const need = large ? 3 : 4.5;
      const rec = { at: f, p5: +p5.toFixed(2), worst: +rs[0].toFixed(2), need, text: info.text };
      if (!worst || rec.p5 / rec.need < worst.p5 / worst.need) worst = rec;
    }
    if (!worst) continue;
    const line = `${sel} "${worst.text}" at ${Math.round(worst.at * 100)}%: 5th percentile ${worst.p5}:1 (needs ${worst.need}:1), worst pixel ${worst.worst}:1`;
    (worst.p5 < worst.need ? failures : notes).push(line);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return { failures, notes };
}

async function checkMenu(page) {
  const failures = [];
  // The SPA's menu is a <button aria-controls>; the static bio pages use <details>.
  const toggle = page.locator('header button[aria-controls], header details > summary').filter({ visible: true }).first();
  if (!(await toggle.count())) return ['no visible menu toggle'];
  const isButton = await toggle.evaluate((t) => t.tagName === 'BUTTON');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  if (isButton && (await toggle.getAttribute('aria-expanded')) !== 'true') failures.push('aria-expanded is not "true" once the menu is open');
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const o = window.__a11y.obscured(a);
      return o ? `${window.__a11y.desc(a)} (${o})` : null;
    });
    if (hit) { failures.push(`Tab reached ${hit} with the menu open`); break; }
  }
  if (isButton) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if ((await toggle.getAttribute('aria-expanded')) !== 'false') failures.push('Escape did not close the menu');
    if (!(await toggle.evaluate((b) => document.activeElement === b))) failures.push('Escape did not return focus to the menu button');
  }
  return failures;
}

async function checkRoute(page) {
  const failures = [];
  const link = page.locator('header nav a').filter({ hasText: /^Who We Are$/ }).first();
  if (!(await link.count())) return ['no "Who We Are" link in the header nav'];
  await link.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({
    path: location.pathname,
    inMain: !!(document.activeElement && document.activeElement.closest('main')),
    active: window.__a11y.desc(document.activeElement || document.body),
    current: [...document.querySelectorAll('header [aria-current="page"]')].map((e) => e.textContent.trim()),
  }));
  if (!/\/team\/$/.test(r.path)) failures.push(`the link went to ${r.path}`);
  if (!r.inMain) failures.push(`focus stayed on ${r.active} instead of moving into the new page`);
  if (!r.current.includes('Who We Are')) failures.push(`no aria-current="page" on the Who We Are link (found: ${r.current.join(', ') || 'none'})`);
  return failures;
}

async function checkForm(page) {
  // Two ways to pass, as the two forms work. The browser's own validation, on fields with a
  // real required: submitting empty focuses the first and names the problem there (its
  // validationMessage). And for what the browser cannot validate — the consent box is a
  // drawn button — the page's own: aria-invalid, focus, and a sentence in a live region.
  const failures = [];
  const submit = page.locator('main form button[type="submit"]').first();
  if (!(await submit.count())) return ['no submit button'];
  await submit.click();
  await page.waitForTimeout(400);
  const native = await page.evaluate(() => {
    const a = document.activeElement;
    return a && a.closest && a.closest('main form') && a.willValidate && a.validationMessage ? window.__a11y.desc(a) : null;
  });
  if (!native) failures.push('an empty submit did not stop at a required field with the browser\'s message');
  // Fill every native field, leaving only what the page validates itself.
  await page.evaluate(() => document.querySelectorAll('main form input, main form textarea').forEach((el) => {
    if (el.type === 'email') el.value = 'a@example.org'; else if (el.type === 'tel') el.value = ''; else el.value = 'x';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  await submit.click();
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({
    custom: [...document.querySelectorAll('main form [aria-required="true"]')].filter((el) => !el.willValidate).length,
    invalid: document.querySelectorAll('main form [aria-invalid="true"]').length,
    status: [...document.querySelectorAll('main form [role="status"], main form [aria-live]')].map((e) => e.textContent.trim()).filter(Boolean),
    focusInvalid: !!(document.activeElement && document.activeElement.getAttribute('aria-invalid') === 'true'),
  }));
  if (r.custom) {
    if (!r.invalid) failures.push('a submit missing only the consent box marked nothing aria-invalid');
    if (!r.status.length) failures.push('a submit missing only the consent box said nothing in a live region');
    if (!r.focusInvalid) failures.push('focus did not move to the consent box');
  }
  return failures;
}

async function checkReduced(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: H }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const r = await page.evaluate((H) => ['cycle-wheel', 'falling-blocks'].map((tag) => {
    const el = [...document.querySelectorAll(tag)].find((e) => e.getClientRects().length);
    return el ? { tag, h: el.getBoundingClientRect().height } : { tag, h: 0 };
  }).filter((x) => x.h > H * 1.2).map((x) => `<${x.tag}> is ${Math.round(x.h)}px tall under reduced motion (a pin; allowed ${Math.round(H * 1.2)})`), H);
  await ctx.close();
  return r;
}

async function checkMotion(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: H } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await prepare(page);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const moved = [];
  for (let y = 0; y < total; y += H) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(1500);
    const a = await page.screenshot();
    await page.waitForTimeout(6000);
    const b = await page.screenshot();
    if (!a.equals(b)) moved.push(`the screen at ${y}px changed with no input over 6s`);
  }
  await ctx.close();
  return moved;
}

async function checkHtml(files) {
  const { HtmlValidate } = await import('html-validate');
  // Parse-level only: what 4.1.1 was about. The content-model rules would flag the
  // design system's custom elements and inline styles, which are not parsing errors.
  const hv = new HtmlValidate({ rules: { 'no-dup-id': 'error', 'no-dup-attr': 'error', 'close-order': 'error', 'close-attr': 'error', 'no-raw-characters': 'off', 'element-name': 'off' } });
  const out = [];
  for (const f of files) {
    const report = await hv.validateFile(f);
    for (const r of report.results) for (const m of r.messages) out.push(`${path.relative(root, f)}:${m.line}: ${m.ruleId} — ${m.message}`);
  }
  return out;
}

// ------------------------------------------------------------------ the run

const browser = await chromium.launch({ executablePath: findChromium() });
async function open(url, width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: H }, ...opts });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => (/^http:\/\/127\.0\.0\.1:/.test(r.request().url()) ? r.continue() : r.abort()));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => { const h = document.querySelector('main h1, h1'); return h && h.getClientRects().length; }, null, { timeout: 60000 });
  await page.waitForTimeout(600);
  await prepare(page);
  return { ctx, page };
}

async function auditPage(surface, name, url, extra = {}) {
  for (const width of WIDTHS) {
    const { ctx, page } = await open(url, width);
    record(surface, name, width, 'axe', await checkAxe(page));
    const f = await checkFocus(page);
    record(surface, name, width, 'focus-visible', f.noIndicator.map((d) => `no visible focus indicator on ${d}`), `${f.stops} tab stops`);
    record(surface, name, width, 'focus-obscured', f.obscured);
    record(surface, name, width, 'targets', await checkTargets(page));
    if (width === 375) record(surface, name, width, 'reflow', await checkReflow(page));
    record(surface, name, width, 'spacing', await checkSpacing(page));
    if (extra.imagery) { const im = await checkImagery(page, width); record(surface, name, width, 'imagery', im.failures, im.notes.join('; ') || null); }
    await ctx.close();
    if (extra.menu && width === 375) { const o = await open(url, width); record(surface, name, width, 'menu', await checkMenu(o.page)); await o.ctx.close(); }
    if (extra.route && width === 1280) { const o = await open(url, width); record(surface, name, width, 'route', await checkRoute(o.page)); await o.ctx.close(); }
    if (extra.form && width === 1280) { const o = await open(url, width); record(surface, name, width, 'form', await checkForm(o.page)); await o.ctx.close(); }
  }
}

const servers = [];
const PAGES = [['home', ''], ['challenge', 'challenge/'], ['approach', 'approach/'], ['team', 'team/'], ['follow', 'follow/']];

if (ONLY !== 'export') {
  if (!fs.existsSync(path.join(SITE, 'index.html'))) { console.error(`No build at ${path.relative(root, SITE) || SITE}. Run: node tools/build-site.mjs _site`); process.exit(2); }
  servers.push(await serve(SITE, 8894, { spa: true }));
  const base = 'http://127.0.0.1:8894/';
  for (const [name, rel] of PAGES) {
    await auditPage('site', name, base + rel, { imagery: name === 'home', menu: name === 'home', route: name === 'home', form: name === 'follow' });
  }
  const bio = fs.readdirSync(path.join(SITE, 'team')).find((d) => fs.existsSync(path.join(SITE, 'team', d, 'index.html')));
  if (bio) await auditPage('site', `bio (${bio})`, `${base}team/${bio}/`, { menu: true });
  record('site', 'home', 1280, 'reduced-motion', await checkReduced(browser, base));
  if (MOTION) record('site', 'home', 1280, 'motion', await checkMotion(browser, base));
  const htmlFiles = [];
  const walkDir = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory() && !['assets', '_ds'].includes(e.name)) walkDir(p); else if (e.name.endsWith('.html')) htmlFiles.push(p); } };
  walkDir(SITE);
  record('site', '*.html', 0, 'html', await checkHtml(htmlFiles));
}

if (ONLY !== 'site') {
  servers.push(await serve(root, 8895));
  for (const [name] of PAGES) {
    await auditPage('export', name, `http://127.0.0.1:8895/wordpress-handoff/pages/${name}.html`, { imagery: name === 'home' });
  }
  record('export', '*.html', 0, 'html', await checkHtml(PAGES.map(([n]) => path.join(root, 'wordpress-handoff/pages', `${n}.html`))));
}

await browser.close();
servers.forEach((s) => s.close());

// ------------------------------------------------------------------ report

const failed = results.filter((r) => !r.pass);
const pad = (s, n) => String(s).padEnd(n);
console.log(`\n${pad('surface', 8)} ${pad('page', 26)} ${pad('width', 6)} ${pad('check', 15)} result`);
for (const r of results) {
  console.log(`${pad(r.surface, 8)} ${pad(r.page, 26)} ${pad(r.width || '', 6)} ${pad(r.check, 15)} ${r.pass ? 'pass' : `FAIL (${r.failures.length})`}${r.notes ? `  — ${r.notes}` : ''}`);
  for (const f of r.failures.slice(0, 12)) console.log(`      ${f}`);
  if (r.failures.length > 12) console.log(`      … and ${r.failures.length - 12} more`);
}
console.log(`\n${results.length - failed.length} of ${results.length} checks pass.`);
if (JSON_OUT) fs.writeFileSync(path.resolve(root, JSON_OUT), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);

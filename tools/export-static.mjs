// Renders every page of the site to plain, static HTML for handoff.
//
// The site ships as one client-rendered Claude Design template: index.html holds an
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
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const stage = path.join(root, '.export-tmp');
const OUT = path.join(root, 'wordpress-handoff/pages');
const PORT = 8731;

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

  const html = await page.evaluate(() => {
    const doc = document.documentElement.cloneNode(true);
    // The template source, the runtime, and the CDN mirror are all scaffolding for a
    // page that no longer needs to be built at runtime.
    doc.querySelectorAll('x-dc, script[src*="support.js"], script[src*="/vendor/"], script[type="text/x-dc"], script[src*="_ds_bundle"]')
      .forEach((n) => n.remove());
    // Compiler bookkeeping that means nothing outside the runtime.
    doc.querySelectorAll('[data-dc-tpl]').forEach((n) => n.removeAttribute('data-dc-tpl'));
    // The runtime injects a rule hiding its own template element. That element is gone
    // now, and a dangling x-dc selector in the handoff would only raise questions.
    doc.querySelectorAll('style').forEach((s) => {
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
    const rootEl = doc.querySelector('#dc-root');
    const body = doc.querySelector('body');
    if (rootEl && body) { while (rootEl.firstChild) body.appendChild(rootEl.firstChild); rootEl.remove(); }
    return '<!doctype html>\n' + doc.outerHTML;
  });

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
    .replace(/(["'])\/support\.js\1/g, '$1../../support.js$1');

  fs.writeFileSync(path.join(OUT, p.file), out);
  console.log(`${p.file.padEnd(22)} ${(out.length / 1024).toFixed(0)} KB  ${p.name}`);
}

await browser.close();
server.close();
fs.rmSync(stage, { recursive: true, force: true });
console.log(`\n${PAGES.length} pages -> wordpress-handoff/pages/`);

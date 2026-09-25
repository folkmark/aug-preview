// Installs the assembled WordPress plugin into a real WordPress here, and proves it works.
//
// Nothing about the plugin is verified by reading it. This stands up WordPress (PHP's own
// server, SQLite, no MySQL), a stand-in for aerdf.org's theme (tools/wp-verify/aerdf-stub/,
// wearing AERDF's real stylesheets, downloaded at test time and never committed), installs
// the plugin exactly as a developer would — from the assembled folder — creates the pages,
// imports the team, and then drives Chromium over the result:
//
//   - every page against the exported page it was generated from, pixel for pixel;
//   - the team grid against the exported grid, element for element;
//   - the components booting, pinning under the program bar, and loading their frames from
//     the plugin; the offsets logged in and out; the reveal; the menu; the colour bloom;
//   - the Follow form end to end, through the plugin's relay to a stand-in HubSpot;
//   - the bio pages, the bio-less redirects, AERDF's own team pages left alone;
//   - and that none of it leaks: AERDF's header and footer compute the same with the
//     plugin as without, and no AugmentED token reaches the document.
//
// `--live` then does what no local install can: loads real aerdf.org pages (read-only,
// fetched through Node so TLS is verified) and renders the plugin's output inside them,
// with AERDF's actual CSS and JavaScript running.
//
// Run by hand, like the exporter; it needs PHP 8, network access for the first setup, and
// Chromium (Playwright):
//
//   npm i --no-save playwright@1.63.0 linkedom@0.18.13 postcss@8.5.28 postcss-selector-parser@7.1.6 pixelmatch@7.2.0 pngjs@7.0.0
//   node tools/build-wp-plugin.mjs --assemble dist
//   node tools/verify-wp-plugin.mjs [--live] [--matrix] [--keep]
//
// --matrix repeats the install on the oldest versions the plugin supports (PHP 8.0,
// WordPress 6.5) in WordPress Playground.
//
// Screenshots and a report land in .wp-verify/report/.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const V = path.join(root, '.wp-verify');
const CACHE = path.join(V, 'cache');
const WP = path.join(V, 'wp');
const REPORT = path.join(V, 'report');
const PORT = 8890;
const MOCK_PORT = 8891;
const STATIC_PORT = 8892;
const PHP_PORT = 8893;
const BASE = `http://127.0.0.1:${PORT}`;
const args = process.argv.slice(2);

const DOWNLOADS = {
  'wordpress.zip': 'https://wordpress.org/latest.zip',
  'sqlite.zip': 'https://downloads.wordpress.org/plugin/sqlite-database-integration.zip',
  'yoast.zip': 'https://downloads.wordpress.org/plugin/wordpress-seo.latest-stable.zip',
  'wp-cli.phar': 'https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar',
};

const sh = (cmd, a, opts = {}) => execFileSync(cmd, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const wp = (...a) => sh('php', ['-d', 'memory_limit=512M', path.join(CACHE, 'wp-cli.phar'), '--allow-root', `--path=${WP}`, ...a]).trim();

// ---------------------------------------------------------------- setup

export function setup() {
  fs.mkdirSync(CACHE, { recursive: true });
  for (const [name, url] of Object.entries(DOWNLOADS)) {
    const f = path.join(CACHE, name);
    if (!fs.existsSync(f) || fs.statSync(f).size < 1000) sh('curl', ['-sSL', '--max-time', '300', '-o', f, url]);
  }
  const plugin = path.join(root, 'dist/augmented-ed');
  if (!fs.existsSync(path.join(plugin, 'augmented-ed.php'))) throw new Error('dist/augmented-ed is missing — run node tools/build-wp-plugin.mjs --assemble dist');

  // A fresh WordPress every run, so nothing a previous run left behind can pass a check.
  fs.rmSync(WP, { recursive: true, force: true });
  const tmp = path.join(V, 'unzip');
  fs.rmSync(tmp, { recursive: true, force: true });
  sh('unzip', ['-q', path.join(CACHE, 'wordpress.zip'), '-d', tmp]);
  fs.renameSync(path.join(tmp, 'wordpress'), WP);
  const plugins = path.join(WP, 'wp-content/plugins');
  for (const z of ['sqlite.zip', 'yoast.zip']) sh('unzip', ['-q', path.join(CACHE, z), '-d', plugins]);
  const sqliteDir = path.join(plugins, 'sqlite-database-integration');
  fs.writeFileSync(path.join(WP, 'wp-content/db.php'), fs.readFileSync(path.join(sqliteDir, 'db.copy'), 'utf8')
    .replace('{SQLITE_IMPLEMENTATION_FOLDER_PATH}', sqliteDir)
    .replaceAll('{SQLITE_PLUGIN}', 'sqlite-database-integration/load.php'));
  fs.cpSync(plugin, path.join(plugins, 'augmented-ed'), { recursive: true });
  fs.cpSync(path.join(root, 'tools/wp-verify/aerdf-stub'), path.join(WP, 'wp-content/themes/aerdf-stub'), { recursive: true });
  fs.mkdirSync(path.join(WP, 'wp-content/mu-plugins'), { recursive: true });
  // The stand-in HubSpot: the plugin's own filter points its relay at a local server that
  // records what it is sent and answers the way HubSpot does.
  fs.writeFileSync(path.join(WP, 'wp-content/mu-plugins/aug-verify.php'), `<?php
add_filter( 'augmented_ed_hubspot_endpoint', function () { return 'http://127.0.0.1:${MOCK_PORT}/submit'; } );
add_filter( 'http_request_host_is_external', '__return_true' );
`);
  fs.writeFileSync(path.join(WP, 'wp-config.php'), `<?php
define( 'DB_NAME', 'wp' ); define( 'DB_USER', '' ); define( 'DB_PASSWORD', '' ); define( 'DB_HOST', '' );
define( 'DB_DIR', __DIR__ . '/wp-content/database/' ); define( 'DB_FILE', '.ht.sqlite' ); define( 'DB_ENGINE', 'sqlite' );
$table_prefix = 'wp_';
define( 'WP_DEBUG', true ); define( 'WP_DEBUG_LOG', __DIR__ . '/debug.log' ); define( 'WP_DEBUG_DISPLAY', false );
define( 'WP_ENVIRONMENT_TYPE', 'local' ); define( 'DISABLE_WP_CRON', true ); define( 'AUTOMATIC_UPDATER_DISABLED', true );
foreach ( array( 'AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT' ) as $k ) define( $k, 'verify-' . $k );
if ( ! defined( 'ABSPATH' ) ) define( 'ABSPATH', __DIR__ . '/' );
require_once ABSPATH . 'wp-settings.php';
`);
  fs.writeFileSync(path.join(WP, 'router.php'), `<?php
// PHP's built-in server with WordPress's pretty permalinks: real files as themselves,
// everything else through index.php.
$p = parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH );
if ( $p !== '/' && is_file( __DIR__ . $p ) ) { return false; }
if ( is_dir( __DIR__ . $p ) && is_file( __DIR__ . rtrim( $p, '/' ) . '/index.php' ) ) { $_SERVER['SCRIPT_NAME'] = rtrim( $p, '/' ) . '/index.php'; require __DIR__ . rtrim( $p, '/' ) . '/index.php'; return; }
$_SERVER['SCRIPT_NAME'] = '/index.php';
require __DIR__ . '/index.php';
`);
  hostCss();

  wp('core', 'install', `--url=${BASE}`, '--title=AERDF (verification)', '--admin_user=admin', '--admin_password=admin', '--admin_email=verify@example.com', '--skip-email');
  wp('rewrite', 'structure', '/%postname%/');
  wp('theme', 'activate', 'aerdf-stub');
  wp('plugin', 'activate', 'augmented-ed', 'wordpress-seo');

  // What aerdf.org already has: AERDF's own categories, Sherry and Caitlin as AERDF
  // leadership with AERDF's words, someone from another programme, and a plain page.
  wp('term', 'create', 'category', 'Leadership', '--slug=leadership');
  const a4g = wp('term', 'create', 'category', 'Assessment for Good Team', '--slug=assessment-for-good-team', '--porcelain');
  wp('term', 'create', 'category', 'Council of Advisors', '--slug=council-of-advisors', `--parent=${a4g}`);
  const seed = (slug, title, content, cats) => {
    const id = wp('post', 'create', '--post_type=team', '--post_status=publish', `--post_title=${title}`, `--post_name=${slug}`, `--post_content=${content}`, '--porcelain');
    wp('post', 'term', 'set', id, 'category', ...cats);
    return id;
  };
  seed('sherry-lachman', 'Sherry Lachman', '<p>AERDF\'s own bio of Sherry, which the import must not replace.</p>', ['leadership']);
  seed('caitlin-mills', 'Caitlin Mills', '<p>AERDF\'s own bio of Caitlin.</p>', ['leadership']);
  seed('aamer-alam', 'Aamer Alam', '<p>Someone from another AERDF programme.</p>', ['council-of-advisors']);
  wp('post', 'create', '--post_type=page', '--post_status=publish', '--post_title=About AERDF', '--post_name=about', '--post_content=<p>A plain AERDF page.</p>');
  wp('option', 'update', 'augmented_ed_settings', JSON.stringify({ hubspot_portal: '20910033', hubspot_form: '00000000-0000-4000-8000-000000000000', privacy_url: `${BASE}/about/` }), '--format=json');

  // The developer's steps, as START-HERE gives them.
  wp('eval', 'augmented_ed_create_pages();');
  for (const id of wp('post', 'list', '--post_type=page', '--post_status=draft', '--field=ID').split('\n').filter(Boolean)) {
    wp('post', 'update', id, '--post_status=publish');
  }
  const dry = wp('augmented-ed', 'team', 'import', '--dry-run');
  const imported = wp('augmented-ed', 'team', 'import');
  const again = wp('augmented-ed', 'team', 'import');
  return { dry, imported, again };
}

// Every stylesheet aerdf.org's home page links, in order, downloaded once. Its fonts and
// images stay unresolved — AERDF's own Avenir files 404 on aerdf.org too.
function hostCss() {
  const dir = path.join(WP, 'host-css');
  const cache = path.join(CACHE, 'host-css');
  if (!fs.existsSync(cache) || args.includes('--refresh-host-css')) {
    fs.rmSync(cache, { recursive: true, force: true });
    fs.mkdirSync(cache, { recursive: true });
    try {
      const html = sh('curl', ['-sSL', '--max-time', '60', 'https://aerdf.org/']);
      const hrefs = [...html.matchAll(/<link[^>]+rel=['"]stylesheet['"][^>]*href=['"]([^'"]+)['"]/g)].map((m) => m[1].replace(/&#038;|&amp;/g, '&'));
      hrefs.forEach((h, i) => {
        const url = h.startsWith('http') ? h : `https://aerdf.org${h.startsWith('/') ? '' : '/'}${h}`;
        if (!/aerdf\.org/.test(url)) return;
        const name = `${String(i).padStart(2, '0')}-${path.basename(url.split('?')[0]).replace(/[^a-z0-9.-]/gi, '_') || 'sheet'}${url.split('?')[0].endsWith('.css') ? '' : '.css'}`;
        try { sh('curl', ['-sSL', '--max-time', '60', '-o', path.join(cache, name), url]); } catch {}
      });
    } catch {}
    if (!fs.readdirSync(cache).length) {
      // Offline: Bootstrap 5.0.2's reboot, which is what the theme's og-css2.css carries.
      sh('curl', ['-sSL', '--max-time', '60', '-o', path.join(cache, '00-bootstrap-reboot.css'), 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap-reboot.css']);
    }
  }
  fs.cpSync(cache, dir, { recursive: true });
  return fs.readdirSync(dir);
}

// ---------------------------------------------------------------- servers

export function startServers() {
  // PHP's built-in server runs WordPress, behind a small Node server that serves every real
  // file itself. Left to serve the images too, PHP's workers stall writing a large file to a
  // connection the browser has already closed, and a few of those stop the whole site.
  const php = spawn('php', ['-S', `127.0.0.1:${PHP_PORT}`, '-t', WP, path.join(WP, 'router.php')], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } });
  const FILE_MIME = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.gif': 'image/gif', '.ico': 'image/x-icon', '.xsl': 'text/xsl' };
  const front = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const abs = path.join(WP, rel);
    if (abs.startsWith(WP) && !rel.endsWith('.php') && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      res.writeHead(200, { 'content-type': FILE_MIME[path.extname(abs)] || 'application/octet-stream', 'content-length': fs.statSync(abs).size });
      fs.createReadStream(abs).pipe(res);
      return;
    }
    const up = http.request({ host: '127.0.0.1', port: PHP_PORT, method: req.method, path: req.url, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(up);
  }).listen(PORT);
  const mock = { requests: [], reply: null };
  const hubspot = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let json = null;
      try { json = JSON.parse(body); } catch {}
      mock.requests.push({ url: req.url, headers: req.headers, json });
      const r = mock.reply || { status: 200, body: { inlineMessage: 'Thanks for submitting the form.' } };
      res.writeHead(r.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(r.body));
    });
  }).listen(MOCK_PORT);
  // The exported pages, served from the repository, for the comparisons.
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const statik = http.createServer((req, res) => {
    const abs = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!abs.startsWith(root) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(abs)] || 'application/octet-stream' });
    fs.createReadStream(abs).pipe(res);
  }).listen(STATIC_PORT);
  const stop = () => { php.kill(); front.close(); hubspot.close(); statik.close(); };
  return { mock, stop, php };
}

export async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      const ok = await new Promise((r) => http.get(`${BASE}/`, (res) => { res.resume(); r(res.statusCode < 500); }).on('error', () => r(false)));
      if (ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('WordPress did not start');
}

// Every page once, one at a time, before the browser arrives. Yoast builds its index of a
// page on the first visit, and with SQLite and several PHP workers the first visits
// arriving together can queue behind each other's writes long enough to time a page out.
export async function warm() {
  const urls = ['/', '/about/', '/augmented/', '/augmented/challenge/', '/augmented/approach/', '/augmented/team/', '/augmented/follow/', '/team-sitemap.xml',
    ...wp('post', 'list', '--post_type=team', '--field=post_name').split('\n').filter(Boolean).map((s) => `/team/${s}/`)];
  for (const u of urls) await new Promise((r) => http.get(BASE + u, (res) => { res.resume(); res.on('end', r); }).on('error', r));
}

export { BASE, STATIC_PORT, WP, REPORT, root, wp };

// ---------------------------------------------------------------- checks

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };

const PAGES = [['home', '/augmented/', 'home.html'], ['challenge', '/augmented/challenge/', 'challenge.html'], ['approach', '/augmented/approach/', 'approach.html'], ['team', '/augmented/team/', 'team.html'], ['follow', '/augmented/follow/', 'follow.html']];
const COMPONENT_JS = /\/assets\/(hero-bridge|falling-blocks|cycle-wheel|team-colour)\.js/;
const STILL = '[data-reveal]{opacity:1!important;transition:none!important;animation:none!important}';

function findChromium() {
  const pool = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!fs.existsSync(pool)) return undefined;
  for (const d of fs.readdirSync(pool).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
    const exe = path.join(pool, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

async function settleImages(page, scope) {
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
  await page.waitForFunction((sel) => [...document.querySelectorAll(sel + ' img')].every((i) => i.complete), scope, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

// Two element screenshots, compared. Heights may differ by a sub-pixel rounding at the top;
// anything else is a real difference.
function comparePng(PNG, pixelmatch, a, b, out) {
  if (a.width !== b.width || Math.abs(a.height - b.height) > 2) return { size: `${a.width}x${a.height} vs ${b.width}x${b.height}` };
  const h = Math.min(a.height, b.height);
  const crop = (img) => { const o = new PNG({ width: img.width, height: h }); img.data.copy(o.data, 0, 0, img.width * h * 4); return o; };
  const A = crop(a), B = crop(b), d = new PNG({ width: a.width, height: h });
  const n = pixelmatch(A.data, B.data, d.data, a.width, h, { threshold: 0.1 });
  if (n) fs.writeFileSync(out, PNG.sync.write(d));
  return { px: n, pct: +(100 * n / (a.width * h)).toFixed(3) };
}

const STYLE_PROPS = ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color', 'margin-top', 'margin-bottom', 'padding-top', 'padding-bottom', 'letter-spacing', 'text-transform', 'text-decoration-line', 'vertical-align', 'box-sizing', 'display', 'border-top-width', 'width', 'height', 'opacity'];
// Every element's computed style, and its box relative to the page's own top-left — the
// layout, measured, which pixels alone judge poorly: a page that starts at a fractional
// offset under the host's header rasterises its text a sub-pixel differently and shows as a
// pixel difference with nothing moved.
const walkStyles = (props) => `(() => {
  const P = ${JSON.stringify(props)};
  const root = document.querySelector('.aug-page') || document.querySelector('main');
  const o = root.getBoundingClientRect();
  return [root, ...root.querySelectorAll('*')].map((el) => { const r = el.getBoundingClientRect(); return [el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/)[0] : ''), P.map((p) => getComputedStyle(el).getPropertyValue(p).replace('"AugmentED Symbols"', '"Material Symbols Rounded"')), [r.left - o.left, r.top - o.top, r.width, r.height].map(Math.round)]; });
})()`;
const HOST_STYLES = `(() => {
  const P = ['font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-bottom','letter-spacing','text-transform','text-decoration-line','box-sizing','display','height','width'];
  const out = {};
  for (const s of ['[data-aerdf-stub="alert"]', '[data-aerdf-stub="header"]', '[data-aerdf-stub="header"] *', '[data-aerdf-stub="footer"]', '[data-aerdf-stub="footer"] *']) {
    [...document.querySelectorAll(s)].forEach((el, i) => { out[s + '#' + i] = P.map((p) => getComputedStyle(el).getPropertyValue(p)).join('|'); });
  }
  out.htmlFont = getComputedStyle(document.documentElement).fontSize;
  out.htmlToken = getComputedStyle(document.documentElement).getPropertyValue('--color-st-tropaz');
  return out;
})()`;

export async function checks() {
  const { chromium } = await import('playwright');
  const { PNG } = await import('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;
  fs.rmSync(REPORT, { recursive: true, force: true });
  fs.mkdirSync(REPORT, { recursive: true });
  const browser = await chromium.launch({ executablePath: findChromium() });
  const failedReqs = [];
  const newCtx = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
    ctx.setDefaultNavigationTimeout(90000);
    // Nothing leaves the machine. AERDF's stylesheets name its own fonts and Google's, and in
    // a sandbox a request to the internet can hang until the page's load event gives up.
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (r) => r.abort());
    // Only the plugin's own files and the pages themselves count. The static comparisons
    // abort the component scripts on purpose, and AERDF's real stylesheets ask for AERDF's
    // own fonts and images, which 404 here as they do on aerdf.org. ERR_ABORTED is the
    // browser cancelling a request itself — the hero's frame preloads still in flight when a
    // check closes its page — and a request that really fails says something else.
    const ours = (u) => u.startsWith(BASE) && (u.includes('/wp-content/plugins/augmented-ed/') || !/\.[a-z0-9]{2,5}(\?|$)/i.test(u.replace(BASE, '')));
    ctx.on('requestfailed', (r) => {
      const why = r.failure()?.errorText || '';
      if (!ours(r.url()) || /ERR_ABORTED/.test(why) || (COMPONENT_JS.test(r.url()) && /ERR_FAILED/.test(why))) return;
      failedReqs.push(`${why} ${r.url()}`);
    });
    ctx.on('response', (r) => { if (ours(r.url()) && r.status() >= 400) failedReqs.push(`${r.status()} ${r.url()}`); });
    return ctx;
  };

  // 1. Every page against its export, statically (no component scripts, every block shown),
  //    at four widths. The plugin's page is .aug-page under AERDF's chrome; the export's is
  //    <main> under the site's own header. Their pixels should be the same.
  for (const w of [360, 768, 1440, 1920]) {
    for (const [key, url, file] of PAGES) {
      const a = await newCtx({ viewport: { width: w, height: 900 } });
      await a.route(COMPONENT_JS, (r) => r.abort());
      const pa = await a.newPage();
      await pa.goto(`http://127.0.0.1:${STATIC_PORT}/wordpress-handoff/pages/${file}`, { waitUntil: 'load' });
      await pa.addStyleTag({ content: STILL + 'header{visibility:hidden!important}' });
      await settleImages(pa, 'main');
      const ref = PNG.sync.read(await pa.locator('main').screenshot({ animations: 'disabled' }));
      const refWalk = await pa.evaluate(walkStyles(STYLE_PROPS));
      await a.close();

      const b = await newCtx({ viewport: { width: w, height: 900 } });
      await b.route(COMPONENT_JS, (r) => r.abort());
      const pb = await b.newPage();
      await pb.goto(BASE + url, { waitUntil: 'load' });
      await pb.addStyleTag({ content: STILL + '[data-aug-bar]{visibility:hidden!important}' });
      await settleImages(pb, '.aug-page');
      const got = PNG.sync.read(await pb.locator('.aug-page').screenshot({ animations: 'disabled' }));
      const gotWalk = await pb.evaluate(walkStyles(STYLE_PROPS));
      await b.close();
      const d = comparePng(PNG, pixelmatch, ref, got, path.join(REPORT, `diff-${key}-${w}.png`));
      // Follow's radios and checkbox are real inputs now, drawn by the same spans: the tree
      // differs by design there, so it is judged by pixels alone.
      let leaks = [];
      if (key !== 'follow') {
        if (refWalk.length !== gotWalk.length) leaks.push(`element count ${refWalk.length} vs ${gotWalk.length}`);
        else refWalk.forEach(([tag, rv, rb], i) => {
          STYLE_PROPS.forEach((p, j) => { if (rv[j] !== gotWalk[i][1][j] && p !== 'opacity') leaks.push(`${tag} ${p}: ${rv[j]} -> ${gotWalk[i][1][j]}`); });
          if (rb.some((v, j) => Math.abs(v - gotWalk[i][2][j]) > 1)) leaks.push(`${tag} box ${rb.join(',')} -> ${gotWalk[i][2].join(',')}`);
        });
      }
      // Under 2% of pixels, with the layout and every style already required to match above:
      // what is left is sub-pixel text rasterisation, which the report's diff image shows.
      const pxOk = d.px !== undefined && d.pct < 2;
      check(`${key} @${w}: pixels match the export`, pxOk, d.size || `${d.px}px (${d.pct}%)`);
      if (key !== 'follow') check(`${key} @${w}: layout and computed styles match the export`, !leaks.length, leaks.slice(0, 4).join('; '));
    }
  }

  // 2. Nothing leaks out: AERDF's header and footer compute identically on a plain AERDF
  //    page and on an AugmentED page, and the document itself carries no AugmentED token.
  {
    const c = await newCtx();
    const p = await c.newPage();
    await p.goto(BASE + '/about/', { waitUntil: 'load' });
    const plain = await p.evaluate(HOST_STYLES);
    const diffs = [];
    for (const [, url] of PAGES) {
      await p.goto(BASE + url, { waitUntil: 'load' });
      const ours = await p.evaluate(HOST_STYLES);
      for (const k of Object.keys(plain)) if (plain[k] !== ours[k] && !k.startsWith('html')) diffs.push(`${url} ${k}`);
      if (ours.htmlToken) diffs.push(`${url}: --color-st-tropaz is defined on <html>`);
      if (ours.htmlFont !== '16px') diffs.push(`${url}: root font-size ${ours.htmlFont}`);
    }
    check('AERDF header and footer unchanged on every AugmentED page; no token on <html>', !diffs.length, diffs.slice(0, 4).join('; '));
    await c.close();
  }

  // 3. The components, running: booted, pinned under the bar, frames from the plugin.
  {
    const c = await newCtx();
    const p = await c.newPage();
    const frames = [];
    p.on('request', (r) => { if (/\/wp-content\/plugins\/augmented-ed\/assets\/(hero-bridge|falling-blocks)\/.+\.webp/.test(r.url())) frames.push(r.url()); });
    await p.goto(BASE + '/augmented/', { waitUntil: 'load' });
    await p.waitForFunction(() => document.querySelector('hero-bridge')?.hasAttribute('data-hb-ready'), null, { timeout: 20000 }).catch(() => {});
    const s0 = await p.evaluate(() => {
      const root = document.getElementById('augmented-ed'), bar = root.querySelector('[data-aug-bar]');
      const v = (n) => getComputedStyle(root).getPropertyValue(n).trim();
      return { ready: document.querySelector('hero-bridge').hasAttribute('data-hb-ready'), headerH: v('--header-h'), top: v('--aug-top'), lead: v('--hero-lead'), bar: bar.offsetHeight, wrapTop: Math.round(root.getBoundingClientRect().top + scrollY) };
    });
    check('home: hero boots', s0.ready);
    check('home: --header-h is the bar\'s height logged out', s0.headerH === `${s0.bar}px` && s0.top === '0px', JSON.stringify(s0));
    check('home: --hero-lead is the page\'s offset under the host header', s0.lead === `${s0.wrapTop}px`, JSON.stringify(s0));
    const heroOpacity = await p.evaluate(async (lead) => { scrollTo(0, lead - 10); await new Promise((r) => setTimeout(r, 300)); return getComputedStyle(document.querySelector('[data-hero-body]')).opacity; }, parseFloat(s0.lead));
    check('home: the hero copy has not started fading before the hero reaches the bar', parseFloat(heroOpacity) > 0.99, `opacity ${heroOpacity} at the lead`);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    const pins = await p.evaluate(() => {
      const bar = document.querySelector('[data-aug-bar]').getBoundingClientRect().bottom;
      const stage = (sel) => { const el = document.querySelector(sel); return el ? parseFloat(getComputedStyle(el).top) : null; };
      return { bar: Math.round(bar), hero: stage('hero-bridge [data-hb-stage]'), fb: stage('falling-blocks [data-fb-stage]'), fbMotion: document.querySelector('falling-blocks').getAttribute('data-fb-motion') };
    });
    check('home: falling-blocks runs', pins.fbMotion === 'on', JSON.stringify(pins));
    check('home: sequences pin at the bar\'s bottom', pins.hero === pins.bar && pins.fb === pins.bar, JSON.stringify(pins));
    check('home: frames load from the plugin', frames.length > 10, `${frames.length} frame requests`);
    // The cycle wheel: click travel with the host's smooth scrolling in play.
    const wheel = await p.evaluate(async () => {
      const cw = document.querySelector('cycle-wheel');
      const rig = cw.querySelector('[data-cycle-rig]');
      const node = cw.querySelector('[data-node="2"]');
      if (!rig || !node) return { error: 'no wheel' };
      const pin = parseFloat(getComputedStyle(rig.querySelector('[data-cycle-stage]') || rig.firstElementChild).top) || 0;
      const top = rig.getBoundingClientRect().top + scrollY;
      // Read through it first, as a reader does: until the ring has been built by scrolling,
      // its steps are disabled buttons and a click on one never reaches the component.
      for (let y = top - innerHeight; y <= top + rig.offsetHeight; y += 150) { scrollTo(0, y); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30))); }
      scrollTo(0, top - pin); await new Promise((r) => setTimeout(r, 400));
      let heard = false; cw.addEventListener('click', () => { heard = true; }, { once: true });
      const before = scrollY; node.click(); await new Promise((r) => setTimeout(r, 2500));
      return { before, after: scrollY, sel: cw.querySelector('[data-sel]')?.dataset.sel, heard };
    });
    check('home: clicking a cycle-wheel step travels to it', wheel.sel === '2' && wheel.after !== wheel.before, JSON.stringify(wheel));
    await p.screenshot({ path: path.join(REPORT, 'home-1440-scrolled.png') });
    await c.close();
  }

  // 4. Logged in: the admin bar is fixed at 32px on a desktop and is not at 390px.
  {
    const c = await newCtx();
    const p = await c.newPage();
    await p.goto(BASE + '/wp-login.php');
    await p.fill('#user_login', 'admin'); await p.fill('#user_pass', 'admin'); await p.click('#wp-submit');
    await p.waitForLoadState('load');
    await p.goto(BASE + '/augmented/', { waitUntil: 'load' });
    const d = await p.evaluate(() => { const r = document.getElementById('augmented-ed'); return { top: getComputedStyle(r).getPropertyValue('--aug-top').trim(), h: getComputedStyle(r).getPropertyValue('--header-h').trim(), bar: r.querySelector('[data-aug-bar]').offsetHeight }; });
    check('logged in @1440: --aug-top is the admin bar', d.top === '32px' && d.h === `${d.bar + 32}px`, JSON.stringify(d));
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(500);
    const m = await p.evaluate(() => getComputedStyle(document.getElementById('augmented-ed')).getPropertyValue('--aug-top').trim());
    check('logged in @390: the admin bar scrolls away, so --aug-top is 0', m === '0px', m);
    await c.close();
  }

  // 5. The reveal, with and without script.
  {
    const c = await newCtx();
    const p = await c.newPage();
    await p.goto(BASE + '/augmented/challenge/', { waitUntil: 'load' });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
    await p.waitForTimeout(1200);
    const hidden = await p.evaluate(() => [...document.querySelectorAll('#augmented-ed [data-reveal]')].filter((e) => getComputedStyle(e).opacity !== '1').length);
    check('reveal: every block is visible after scrolling', hidden === 0, `${hidden} still hidden`);
    await c.close();
    const n = await newCtx({ javaScriptEnabled: false });
    const q = await n.newPage();
    await q.goto(BASE + '/augmented/challenge/', { waitUntil: 'load' });
    const hiddenNoJs = await q.evaluate(() => [...document.querySelectorAll('#augmented-ed [data-reveal]')].filter((e) => getComputedStyle(e).opacity !== '1').length);
    check('reveal: with scripts off, nothing is hidden', hiddenNoJs === 0, `${hiddenNoJs} hidden`);
    await n.close();
  }

  // 6. The menu on a phone.
  {
    const c = await newCtx({ viewport: { width: 390, height: 844 } });
    const p = await c.newPage();
    await p.goto(BASE + '/augmented/challenge/', { waitUntil: 'load' });
    await p.waitForTimeout(300);
    await p.click('[data-aug-menu-toggle]');
    const open = await p.evaluate(() => { const m = document.getElementById('aug-site-menu'), bar = document.querySelector('[data-aug-bar]'); return { hidden: m.hidden, display: getComputedStyle(m).display, expanded: document.querySelector('[data-aug-menu-toggle]').getAttribute('aria-expanded'), lock: document.body.style.overflow, top: Math.round(m.getBoundingClientRect().top), barBottom: Math.round(bar.getBoundingClientRect().bottom) }; });
    await p.screenshot({ path: path.join(REPORT, 'menu-390-open.png') });
    await p.keyboard.press('Escape');
    const closed = await p.evaluate(() => ({ hidden: document.getElementById('aug-site-menu').hidden, focus: document.activeElement?.hasAttribute('data-aug-menu-toggle'), lock: document.body.style.overflow }));
    check('menu opens under the bar, locks the page', !open.hidden && open.display !== 'none' && open.expanded === 'true' && open.lock === 'hidden' && open.top === open.barBottom, JSON.stringify(open));
    check('menu closes on Escape and returns focus', closed.hidden && closed.focus && closed.lock === '', JSON.stringify(closed));
    await p.screenshot({ path: path.join(REPORT, 'challenge-390-top.png') });
    await c.close();
  }

  // 7. The colour bloom: on a mouse, and never on touch.
  {
    const c = await newCtx();
    const p = await c.newPage();
    const colour = [];
    p.on('request', (r) => { if (r.url().includes('/assets/team/colour/')) colour.push(r.url()); });
    await p.goto(BASE + '/augmented/team/', { waitUntil: 'load' });
    const tile = p.locator('.team-grid-3 img[src*="assets/team/"]').first();
    await tile.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    const box = await tile.boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
    await p.waitForTimeout(800);
    const bloom = await p.evaluate(() => !!document.querySelector('[data-team-colour]'));
    check('bloom: a headshot blooms under the mouse, from the plugin', bloom && colour.length > 0 && colour[0].includes('/wp-content/plugins/augmented-ed/'), `${colour.length} colour requests`);
    await c.close();
    const t = await newCtx({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const q = await t.newPage();
    const touchColour = [];
    q.on('request', (r) => { if (r.url().includes('/assets/team/colour/')) touchColour.push(r.url()); });
    await q.goto(BASE + '/augmented/team/', { waitUntil: 'load' });
    await q.waitForTimeout(800);
    check('bloom: no colour images on a touch screen', touchColour.length === 0, `${touchColour.length}`);
    // Team grid vs export, element for element, with URLs normalised.
    const norm = `(() => [...document.querySelectorAll('.team-grid-3 > div')].map((t) => t.outerHTML
      .replace(/https?:\\/\\/[^"]*?\\/assets\\//g, 'A/').replace(/\\.\\.\\/\\.\\.\\/assets\\//g, 'A/')
      .replace(/href="[^"]*\\/team\\/([a-z0-9-]+)\\/"/g, 'href="T/$1"').replace(/opacity: 0;\\s*/g, '').replace(/\\s+/g, ' ').replace(/ data-aug-shown=""/g, '').replace(/ "/g, '"')))()`;
    const gotTiles = await q.evaluate(norm);
    await q.goto(`http://127.0.0.1:${STATIC_PORT}/wordpress-handoff/pages/team.html`, { waitUntil: 'load' });
    const refTiles = await q.evaluate(norm);
    const attrsSorted = (h) => h.replace(/<([a-z0-9]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*>/g, (m, t, a) => `<${t} ${(a.match(/[a-z-]+(?:="[^"]*")?/g) || []).sort().join(' ')}>`).replace(/>\s+</g, '><').trim();
    const diff = refTiles.map((r, i) => attrsSorted(r) === attrsSorted(gotTiles[i] || '') ? null : i).filter((x) => x !== null);
    check('team: the 29 tiles WordPress draws from team posts match the export', refTiles.length === 29 && gotTiles.length === 29 && !diff.length, `${gotTiles.length} tiles; differing: ${diff.slice(0, 5).join(',')}`);
    if (diff.length) fs.writeFileSync(path.join(REPORT, 'tile-diff.txt'), `${attrsSorted(refTiles[diff[0]])}\n\n${attrsSorted(gotTiles[diff[0]] || '')}\n`);
    await t.close();
  }

  // 8. The Follow form, end to end through the relay to the stand-in HubSpot.
  {
    const c = await newCtx();
    // This visitor's clock runs an hour ahead of the server's. The relay's time trap once
    // compared the two clocks, and took anyone like this for a bot: thanked, never sent.
    await c.addInitScript(() => { const now = Date.now; Date.now = () => now() + 3600000; });
    const p = await c.newPage();
    await p.goto(BASE + '/augmented/follow/', { waitUntil: 'load' });
    const before = mockRef.requests.length;
    await p.click('button[type="submit"]');
    await p.waitForTimeout(500);
    check('form: an empty submit is stopped by the browser, nothing sent', mockRef.requests.length === before);
    await p.fill('#aug-f-firstname', 'Ada'); await p.fill('#aug-f-lastname', 'Lovelace');
    await p.fill('#aug-f-email', 'ada@example.com'); await p.fill('#aug-f-phone', '555 0100');
    await p.fill('#aug-f-message', 'Testing the relay.');
    await p.click('label:has(#aug-f-persona-researcher)');
    await p.click('label:has(#aug-f-consent)');
    await p.waitForTimeout(3200); // the relay's minimum time on the form
    await p.click('button[type="submit"]');
    await p.waitForFunction(() => /Thank/.test(document.querySelector('[data-aug-follow-status]').textContent), null, { timeout: 10000 }).catch(() => {});
    const sent = mockRef.requests[mockRef.requests.length - 1]?.json;
    const f = Object.fromEntries((sent?.fields || []).map((x) => [x.name, x.value]));
    check('form: the relay sends HubSpot the fields, from a visitor whose clock is an hour fast', f.firstname === 'Ada' && f.lastname === 'Lovelace' && f.email === 'ada@example.com' && f.phone === '555 0100' && f.message === 'Testing the relay.' && f.augmented_persona === 'researcher', JSON.stringify(f));
    check('form: consent and page context are sent', sent?.legalConsentOptions?.consent?.consentToProcess === true && /\/augmented\/follow\//.test(sent?.context?.pageUri || ''), JSON.stringify({ c: sent?.legalConsentOptions, ctx: sent?.context }));
    const said = await p.textContent('[data-aug-follow-status]');
    check('form: the visitor is thanked in place', /Thank/.test(said), said);
    await p.screenshot({ path: path.join(REPORT, 'follow-sent.png'), fullPage: false });
    // HubSpot refusing a field.
    mockRef.reply = { status: 400, body: { status: 'error', message: 'The request is not valid', errors: [{ message: "Error in 'fields.email'. Invalid email address", errorType: 'INVALID_EMAIL' }] } };
    await p.fill('#aug-f-email', 'ada@example.org');
    await p.click('label:has(#aug-f-consent)'); await p.click('label:has(#aug-f-consent)');
    await p.fill('#aug-f-firstname', 'Ada'); await p.fill('#aug-f-lastname', 'Lovelace'); await p.fill('#aug-f-message', 'Again.');
    if (!(await p.isChecked('#aug-f-consent'))) await p.click('label:has(#aug-f-consent)');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(1500);
    const invalid = await p.getAttribute('#aug-f-email', 'aria-invalid');
    check('form: HubSpot\'s field error lands on the field', invalid === 'true', `aria-invalid=${invalid}`);
    mockRef.reply = null;
    await c.close();
    // A bot: every field filled and sent at once. Thanked, and nothing sent.
    const b = await newCtx();
    const bp = await b.newPage();
    await bp.goto(BASE + '/augmented/follow/', { waitUntil: 'load' });
    await bp.fill('#aug-f-firstname', 'Bot'); await bp.fill('#aug-f-lastname', 'Bot'); await bp.fill('#aug-f-email', 'bot@example.com'); await bp.fill('#aug-f-message', 'Fast.');
    await bp.click('label:has(#aug-f-consent)');
    const j = mockRef.requests.length;
    await bp.click('button[type="submit"]');
    await bp.waitForFunction(() => /Thank/.test(document.querySelector('[data-aug-follow-status]').textContent), null, { timeout: 10000 }).catch(() => {});
    check('form: a form sent faster than a person can type is thanked and not sent', mockRef.requests.length === j && /Thank/.test(await bp.textContent('[data-aug-follow-status]')), `${mockRef.requests.length - j} sent`);
    await b.close();
    // Without script: a real POST, a redirect back, a message.
    const n = await newCtx({ javaScriptEnabled: false });
    const q = await n.newPage();
    await q.goto(BASE + '/augmented/follow/', { waitUntil: 'load' });
    await q.fill('#aug-f-firstname', 'Grace'); await q.fill('#aug-f-lastname', 'Hopper'); await q.fill('#aug-f-email', 'grace@example.com'); await q.fill('#aug-f-message', 'No script.');
    await q.check('#aug-f-consent', { force: true });
    const k = mockRef.requests.length;
    await Promise.all([q.waitForNavigation(), q.click('button[type="submit"]')]);
    check('form: without script it posts, redirects back and says so', q.url().includes('aug_follow=ok') && mockRef.requests.length === k + 1 && /Thank/.test(await q.textContent('#aug-follow-status')), q.url());
    await n.close();
  }

  // 9. Bio pages.
  {
    const c = await newCtx();
    const p = await c.newPage();
    await p.goto(BASE + '/team/andrew-lan/', { waitUntil: 'load' });
    const bio = await p.evaluate(() => ({ tpl: document.querySelector('[data-aug-template]')?.dataset.augTemplate, h1: document.querySelector('.bio h1')?.textContent, portrait: document.querySelector('.bio-portrait')?.src, back: document.querySelector('.bio-back a')?.href, paras: document.querySelectorAll('.bio-body p').length, links: document.querySelectorAll('.bio-links a').length, schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent).join(' ') }));
    check('bio: an AugmentED-only member gets the AugmentED bio page', bio.tpl === 'bio' && bio.h1 === 'Andrew Lan' && /augmented-ed\/assets\/team\/andrew-lan\.webp/.test(bio.portrait || '') && /\/augmented\/team\/$/.test(bio.back || '') && bio.paras > 0, JSON.stringify({ ...bio, schema: undefined }));
    check('bio: Yoast marks it a ProfilePage about a Person', /ProfilePage/.test(bio.schema) && /"Person"/.test(bio.schema));
    await p.screenshot({ path: path.join(REPORT, 'bio-andrew-lan-1440.png') });
    await p.goto(BASE + '/team/sherry-lachman/', { waitUntil: 'load' });
    check('bio: Sherry, also AERDF leadership, keeps AERDF\'s own template and text', await p.locator('[data-aerdf-stub="team-single"]').count() === 1 && /must not replace/.test(await p.textContent('body')));
    const r = await p.request.get(BASE + '/team/tom-peterson/', { maxRedirects: 0 });
    check('bio: a member without a bio redirects (302) to Who We Are', r.status() === 302 && /\/augmented\/team\/$/.test(r.headers().location || ''), `${r.status()} ${r.headers().location}`);
    await p.goto(BASE + '/team/aamer-alam/', { waitUntil: 'load' });
    check('bio: another programme\'s member is untouched', await p.locator('[data-aerdf-stub="team-single"]').count() === 1);
    const sm = await (await p.request.get(BASE + '/team-sitemap.xml')).text();
    check('sitemap: the members without a bio are left out', sm.includes('/team/andrew-lan/') && !sm.includes('/team/tom-peterson/'), sm.length ? '' : 'no sitemap');
    await c.close();
  }

  check('no failed or 4xx requests to WordPress or the plugin', failedReqs.length === 0, failedReqs.slice(0, 5).join('; '));
  const log = path.join(WP, 'debug.log');
  const notices = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter((l) => /PHP (Warning|Notice|Deprecated|Fatal)/.test(l) && /augmented-ed/.test(l)) : [];
  check('no PHP warnings or notices from the plugin', notices.length === 0, notices.slice(0, 3).join(' | '));
  await browser.close();
  fs.writeFileSync(path.join(REPORT, 'results.json'), JSON.stringify(results, null, 1));
  return results;
}

let mockRef = null;

// The oldest versions the plugin declares it supports — PHP 8.0 and WordPress 6.5 — through
// WordPress Playground (PHP compiled to WebAssembly, so no second PHP install is needed):
// activate, create the pages, import twice, and fetch every kind of page. Playground CLI
// 3.1.40 is pinned because later releases need Node 24.
export async function matrix() {
  const port = 9400;
  const log = path.join(REPORT, 'matrix.log');
  const pg = spawn('npx', ['-y', '@wp-playground/cli@3.1.40', 'server', `--port=${port}`, '--php=8.0', '--wp=6.5',
    `--mount=${path.join(root, 'dist/augmented-ed')}:/wordpress/wp-content/plugins/augmented-ed`,
    `--mount=${path.join(root, 'tools/wp-verify/aerdf-stub')}:/wordpress/wp-content/themes/aerdf-stub`,
    `--blueprint=${path.join(root, 'tools/wp-verify/matrix-blueprint.json')}`], { stdio: ['ignore', fs.openSync(log, 'w'), fs.openSync(log, 'a')], detached: true });
  try {
    for (let i = 0; i < 300 && !/Ready!/.test(fs.readFileSync(log, 'utf8')); i++) await new Promise((r) => setTimeout(r, 1000));
    const get = (u) => new Promise((r) => http.get(`http://127.0.0.1:${port}${u}`, (res) => { let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => r({ status: res.statusCode, body: b, location: res.headers.location })); }).on('error', () => r({ status: 0, body: '' })));
    // "Ready!" comes before the file the blueprint wrote is served, so ask until it is.
    let m = {};
    for (let i = 0; i < 60 && !m.php; i++) {
      try { m = JSON.parse((await get('/matrix.json')).body); } catch { await new Promise((r) => setTimeout(r, 1000)); }
    }
    check(`PHP ${m.php} / WordPress ${m.wp}: import creates 27 and attaches 2, then changes nothing`, m.dry?.create === 27 && m.real?.attach === 2 && m.again?.unchanged === 29 && !(m.errors || []).length, JSON.stringify(m));
    const pages = {};
    for (const [u, want] of [['/augmented/', 'home'], ['/augmented/challenge/', 'challenge'], ['/augmented/approach/', 'approach'], ['/augmented/team/', 'team'], ['/augmented/follow/', 'follow'], ['/team/andrew-lan/', 'bio']]) {
      const r = await get(u);
      pages[u] = r.status === 200 && r.body.includes(`data-aug-template="${want}"`) && !/Fatal error/.test(r.body);
    }
    check(`PHP ${m.php} / WordPress ${m.wp}: every template renders`, Object.values(pages).every(Boolean), JSON.stringify(pages));
    const dbg = (await get('/wp-content/debug.log')).body.split('\n').filter((l) => /augmented-ed/.test(l));
    check(`PHP ${m.php} / WordPress ${m.wp}: no warnings or notices from the plugin`, !dbg.length, dbg.slice(0, 2).join(' | '));
  } finally {
    // The whole group: npx starts the server as a child, and killing npx alone leaves it
    // holding the port for the next run.
    try { process.kill(-pg.pid); } catch {}
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (args.includes('--setup-only')) {
    const r = setup();
    console.log(r.dry, '\n---\n', r.imported, '\n---\n', r.again);
  } else {
    if (!args.includes('--no-setup')) {
      const r = setup();
      check('import dry run: 27 to create, 2 to attach', /2 attach, 27 create/.test(r.dry), r.dry.split('\n').pop());
      check('import: 27 created, 2 attached', /2 attach, 27 create/.test(r.imported), r.imported.split('\n').pop());
      check('import again: nothing changes', /29 unchanged/.test(r.again), r.again.split('\n').pop());
    }
    const servers = startServers();
    mockRef = servers.mock;
    await waitForServer();
    await warm();
    try {
      await checks();
      if (args.includes('--live')) await (await import('./wp-verify/live.mjs')).live({ BASE, STATIC_PORT, REPORT, check });
      if (args.includes('--matrix')) await matrix();
    } finally {
      if (!args.includes('--keep')) servers.stop();
    }
    const bad = results.filter((r) => !r.ok);
    console.log(`\n${results.length - bad.length}/${results.length} checks passed${bad.length ? '' : ' — the plugin works'}`);
    if (!args.includes('--keep')) process.exit(bad.length ? 1 : 0);
  }
}

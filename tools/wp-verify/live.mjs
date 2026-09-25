// verify-wp-plugin.mjs --live: the plugin's pages inside real aerdf.org pages.
//
// The local install proves the plugin's PHP; it cannot prove the plugin against AERDF's
// actual CSS and JavaScript, which is where a page like this breaks. So this takes each
// AugmentED page exactly as the local WordPress renders it — the #augmented-ed markup and the
// plugin's own <link> and <script> tags — and places it into a real aerdf.org page, in the
// theme's own main#content, with every one of AERDF's stylesheets and scripts running
// (jQuery, Elementor, the theme's bundles, CookieYes, GTranslate, AccessiBe).
//
// Read-only: aerdf.org is fetched, never written to. Every request is fetched by Node
// (route.fetch), which verifies TLS against the session's CA bundle, so the browser itself
// never needs to trust anything; the plugin's own files come from the local WordPress.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const HOST_PAGE = 'https://aerdf.org/opportunities/advanced-fellows/augmented/';
const COMPONENT_JS = /\/assets\/(hero-bridge|falling-blocks|cycle-wheel|team-colour)\.js/;
const STILL = '[data-reveal]{opacity:1!important;transition:none!important;animation:none!important}';
const HOST_UI = '.cky-consent-container,.cky-overlay,.cky-btn-revisit-wrapper,#glt-translate-trigger,#flags,.gtranslate_wrapper,[id*="gt_float"],.acsb-trigger,access-widget-ui{display:none!important}';
const PROPS = ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color', 'margin-top', 'margin-bottom', 'padding-top', 'padding-bottom', 'letter-spacing', 'text-transform', 'text-decoration-line', 'vertical-align', 'box-sizing', 'display', 'border-top-width', 'width', 'height'];

const getLocal = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  }).on('error', reject);
});

// The plugin's part of a rendered WordPress page: the wrapper, and the tags it enqueued.
function pluginParts(html) {
  const start = html.indexOf('<div id="augmented-ed"');
  const end = html.lastIndexOf('</main>');
  const wrapper = html.slice(start, end);
  const head = [...html.matchAll(/<link[^>]+id=['"]augmented-ed[^'"]*['"][^>]*>/g), ...html.matchAll(/<link rel="preload"[^>]+augmented-ed[^>]+>/g)].map((m) => m[0]).join('\n')
    + "\n<script>document.documentElement.classList.add('aug-js');</script>";
  const scripts = [...html.matchAll(/<script[^>]+id=['"]augmented-ed[^'"]*['"][^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]).join('\n');
  return { wrapper, head, scripts };
}

export async function live({ BASE, STATIC_PORT, REPORT, check }) {
  const { chromium } = await import('playwright');
  const { PNG } = await import('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;
  const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium-')).sort().reverse().map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`).find((f) => fs.existsSync(f));
  const browser = await chromium.launch({ executablePath: exe });
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;

  async function hostContext(opts, inject) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, proxy, ...opts });
    await ctx.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.startsWith(BASE)) {
        const r = await getLocal(url);
        return route.fulfill({ status: r.status, headers: { 'content-type': r.headers['content-type'] || 'application/octet-stream' }, body: r.body });
      }
      try {
        const resp = await route.fetch({ timeout: 45000 });
        if (inject && url === HOST_PAGE) {
          const html = (await resp.text())
            .replace(/(<main id="content" class="site-content">)[\s\S]*(<\/main>)/, `$1${inject.wrapper}$2`)
            .replace('</head>', `${inject.head}\n</head>`)
            .replace('</body>', `${inject.scripts}\n</body>`);
          return route.fulfill({ response: resp, body: html });
        }
        return route.fulfill({ response: resp });
      } catch { return route.abort(); }
    });
    return ctx;
  }

  const walk = (sel) => `(() => { const P = ${JSON.stringify(PROPS)}; const r = document.querySelector(${JSON.stringify(sel)}); if (!r) return null; return [r, ...r.querySelectorAll('*')].map((el) => [el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/)[0] : ''), P.map((p) => getComputedStyle(el).getPropertyValue(p).replace('"AugmentED Symbols"', '"Material Symbols Rounded"'))]); })()`;
  const hostStyles = `(() => { const P = ${JSON.stringify(PROPS.filter((p) => p !== 'width'))}; const out = {}; for (const s of ['[class*="AlertBar"]', 'header.Header_header__F46VJ', 'header.Header_header__F46VJ *', 'footer', 'footer *']) [...document.querySelectorAll(s)].slice(0, 120).forEach((el, i) => { out[s + '#' + i] = P.map((p) => getComputedStyle(el).getPropertyValue(p)).join('|'); }); return out; })()`;

  // The untouched AERDF page, for the "nothing leaks out" comparison — at each width, since
  // AERDF's header is a different shape on a phone.
  const plainHost = {};
  for (const w of [1440, 390]) {
    const base = await hostContext({ viewport: { width: w, height: 900 } });
    const bp = await base.newPage();
    await bp.goto(HOST_PAGE, { waitUntil: 'load', timeout: 120000 });
    await bp.evaluate(() => document.fonts.ready);
    await bp.waitForTimeout(1500);
    plainHost[w] = await bp.evaluate(hostStyles);
    await base.close();
  }

  for (const [key, url, file] of [['home', '/augmented/', 'home.html'], ['challenge', '/augmented/challenge/', 'challenge.html'], ['team', '/augmented/team/', 'team.html'], ['follow', '/augmented/follow/', 'follow.html']]) {
    const inject = pluginParts((await getLocal(BASE + url)).body.toString('utf8'));
    for (const w of [1440, 390]) {
      // The reference: the exported page, statically.
      const rc = await browser.newContext({ viewport: { width: w, height: 900 } });
      await rc.route(COMPONENT_JS, (r) => r.abort());
      const rp = await rc.newPage();
      await rp.goto(`http://127.0.0.1:${STATIC_PORT}/wordpress-handoff/pages/${file}`, { waitUntil: 'load' });
      await rp.addStyleTag({ content: STILL });
      await rp.evaluate(() => document.fonts.ready);
      const ref = await rp.evaluate(walk('main'));
      const refNav = await rp.evaluate(walk('header nav'));
      await rc.close();

      const hc = await hostContext({ viewport: { width: w, height: 900 } }, inject);
      await hc.route(COMPONENT_JS, (r) => r.abort());
      const hp = await hc.newPage();
      await hp.goto(HOST_PAGE, { waitUntil: 'load', timeout: 120000 });
      await hp.addStyleTag({ content: STILL });
      await hp.evaluate(() => document.fonts.ready);
      await hp.waitForTimeout(1500);
      const got = await hp.evaluate(walk('.aug-page'));
      const gotNav = await hp.evaluate(walk('[data-aug-bar] nav'));
      const ours = await hp.evaluate(hostStyles);
      await hc.close();

      const leaks = [];
      const compare = (a, b, where) => {
        if (!a || !b) { leaks.push(`${where}: missing`); return; }
        if (a.length !== b.length) { leaks.push(`${where}: ${a.length} vs ${b.length} elements`); return; }
        a.forEach(([tag, av], i) => PROPS.forEach((p, j) => { if (av[j] !== b[i][1][j]) leaks.push(`${where} ${tag} ${p}: ${av[j]} -> ${b[i][1][j]}`); }));
      };
      if (key !== 'follow') compare(ref, got, 'page');
      if (w === 1440) compare(refNav, gotNav, 'bar nav');
      check(`live ${key} @${w}: no AERDF style reaches the page`, !leaks.length, leaks.slice(0, 4).join('; '));
      const hostProps = PROPS.filter((p) => p !== 'width');
      const out = Object.keys(plainHost[w]).filter((k) => plainHost[w][k] !== ours[k]).map((k) => {
        const a = plainHost[w][k].split('|'), b = (ours[k] || '').split('|');
        return `${k} ` + hostProps.filter((p, i) => a[i] !== b[i]).map((p) => `${p}: ${a[hostProps.indexOf(p)]} -> ${b[hostProps.indexOf(p)]}`).join(', ');
      });
      check(`live ${key} @${w}: AERDF's header and footer unchanged`, !out.length, out.slice(0, 3).join('; '));
    }
  }

  // Running: the home page with every script, AERDF's included.
  const inject = pluginParts((await getLocal(BASE + '/augmented/')).body.toString('utf8'));
  for (const [w, h] of [[1440, 900], [1512, 780], [390, 844]]) {
    const hc = await hostContext({ viewport: { width: w, height: h } }, inject);
    const hp = await hc.newPage();
    await hp.goto(HOST_PAGE, { waitUntil: 'load', timeout: 120000 });
    await hp.locator('.cky-btn-reject').first().click({ timeout: 8000 }).catch(() => {});
    await hp.addStyleTag({ content: HOST_UI });
    await hp.waitForFunction(() => document.querySelector('hero-bridge')?.hasAttribute('data-hb-ready'), null, { timeout: 30000 }).catch(() => {});
    await hp.waitForTimeout(1500);
    await hp.screenshot({ path: path.join(REPORT, `live-home-${w}-first-screen.png`) });
    const lead = await hp.evaluate(() => parseFloat(getComputedStyle(document.getElementById('augmented-ed')).getPropertyValue('--hero-lead')));
    await hp.evaluate((y) => scrollTo(0, y), lead);
    await hp.waitForTimeout(1500);
    const atLead = PNG.sync.read(await hp.screenshot({ path: path.join(REPORT, `live-home-${w}-at-lead.png`) }));
    const state = await hp.evaluate(() => ({ ready: document.querySelector('hero-bridge').hasAttribute('data-hb-ready'), fb: document.querySelector('falling-blocks').getAttribute('data-fb-motion'), body: getComputedStyle(document.querySelector('[data-hero-body]')).opacity }));
    check(`live home @${w}: the components run inside AERDF's page`, state.ready && state.fb === 'on', JSON.stringify(state));
    check(`live home @${w}: the hero copy is intact when the hero reaches the bar`, parseFloat(state.body) > 0.99, `opacity ${state.body}`);

    // The preview's own first screen, for the same viewport.
    const pc = await browser.newContext({ viewport: { width: w, height: h } });
    const pp = await pc.newPage();
    await pp.goto(`http://127.0.0.1:${STATIC_PORT}/wordpress-handoff/pages/home.html`, { waitUntil: 'load' });
    // The export keeps every [data-reveal] block at the opacity 0 it was captured with, and
    // has no runtime to run the site's load-time reveal — which on the site shows the hero's
    // own wrapper, and with it the desk. Shown here as the site shows it.
    await pp.addStyleTag({ content: '[data-reveal]{opacity:1!important;transition:none!important}' });
    await pp.waitForFunction(() => document.querySelector('hero-bridge')?.hasAttribute('data-hb-ready'), null, { timeout: 30000 }).catch(() => {});
    await pp.waitForTimeout(1500);
    const preview = PNG.sync.read(await pp.screenshot({ path: path.join(REPORT, `preview-home-${w}.png`) }));
    await pc.close();
    // Below the bar only: the bar is the site's header, restyled for a phone (its "Menu"
    // word), and is compared structurally above.
    const cut = (img) => { const o = new PNG({ width: img.width, height: img.height - 96 }); img.data.copy(o.data, 0, img.width * 96 * 4); return o; };
    const A = cut(preview), B = cut(atLead), d = new PNG({ width: A.width, height: A.height });
    const n = pixelmatch(A.data, B.data, d.data, A.width, A.height, { threshold: 0.1 });
    fs.writeFileSync(path.join(REPORT, `live-home-${w}-vs-preview-diff.png`), PNG.sync.write(d));
    const pct = +(100 * n / (A.width * A.height)).toFixed(2);
    check(`live home @${w}: scrolled past AERDF's header, the hero is the preview's first screen`, pct < 1, `${pct}% of pixels differ`);

    if (w === 1440) {
      const wheel = await hp.evaluate(async () => {
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
      check('live home: a cycle-wheel step click travels despite AERDF\'s smooth scrolling', wheel.sel === '2' && wheel.after !== wheel.before, JSON.stringify(wheel));
    }
    await hc.close();
  }
  await browser.close();
}

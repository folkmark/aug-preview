// Draws the share cards: the picture Slack, LinkedIn, iMessage, X and Facebook show when
// someone pastes a link to the site. One per page and one per bio page, written to
// assets/og/ and committed, like every other encoded image.
//
//   node tools/build-og.mjs            # writes assets/og/*.jpg
//   node tools/build-og.mjs --check    # fails if any card is missing or stale
//
// Until October 2026 every page shared one card, the logo on a blank ground
// (assets/logo/og-card.png, still the fallback). In a feed of link previews that reads as
// the same post five times; a card with the page's own photograph and headline is what
// gets a link opened. On aerdf.org it mattered more: the plugin's pages have an empty
// content box and no featured image, so Yoast found no picture at all and fell back to
// AERDF's default, measured in the plugin's harness on 2026-10-08.
//
// The cards are drawn by Chromium from HTML, with the design system's own Avenir files and
// colour values and the site's own encoded photographs, so a card cannot drift from the page
// in type or colour — and so that changing a headline is an edit to CARDS below, not a trip
// to a design tool. Needs Playwright, as the other browser tools here do:
//
//   npm i --no-save playwright@1.63.0
//
// JPEG, not PNG or WebP. LinkedIn does not reliably render a WebP og:image (the reason
// og-card.png is a PNG), and a photograph as PNG is 600-900 KB where this is about a tenth
// of that; several scrapers give up on large images, and a slow one times out. 1200x630
// is what every platform's large-card layout is built for, and is stated in the markup as
// og:image:width/height.
//
// The text sits in the left half and never within 72px of an edge. Facebook and LinkedIn
// show the whole card; X, iMessage and WhatsApp crop it, and the left-half layout keeps the
// headline whole in the 1.91:1 crops. A square crop (WhatsApp's small preview) loses the
// photograph's right side or the text's left, whatever the layout, so the logo is placed to
// survive that one.
//
// --check re-renders into memory and compares pixels loosely (JPEG and font hinting are not
// bit-stable across machines), so it catches a changed headline or a swapped photograph,
// not a sub-pixel difference in Chromium's rasteriser.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readRoster, surfacedWithPhoto, linksBio } from './lib/team.mjs';
import { readBios } from './lib/bio-page.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(root, 'assets/og');
const DS = fs.readdirSync(path.join(root, '_ds')).find((d) => d.startsWith('augmented-design-system-'));
const FONTS = path.join(root, '_ds', DS, 'assets/fonts');
const check = process.argv.includes('--check');

// The headline on each card is the page's own words — its H1, or a line from its opening
// where the H1 is only the page's name ("Our Approach") — so a card never promises
// something the page does not say. `eyebrow` is the page's own eyebrow, as the site sets
// it above the H1. `alt` is og:image:alt, for screen readers in the clients that read it.
// `photo` is one of the site's encoded photographs; `position` is its object-position in
// the frame, which is taller than most of the photographs, so it is set per photograph to
// keep the faces in.
export const CARDS = [
  {
    key: 'home',
    eyebrow: '',
    // Not the H1: "Bridging AI and the classroom" is already the page's og:title, which every
    // client prints beside the card, so the card would say it twice. This is the home page's
    // own line from Our Approach.
    title: 'We treat AI in education as a science, not a gold rush.',
    photo: 'assets/images/hero-bridge.webp',
    // A cut-out on transparency, not a photograph, so it is shown unframed, as the hero shows
    // it. Cropped below the desk top (0.56 of the render's height, where the desk's legs and
    // the rack's base begin; measured from its alpha), so the card is about the arch: the
    // render is 1.43:1 and shown whole it put the arch in the top fifth of the card, small,
    // over a long run of table legs. Its arch is centred at 0.50 of its width.
    cutout: { width: 720, bottom: 0.56, ratio: 1432 / 2048, centre: 860, top: 92 },
    alt: 'AugmentED: we treat AI in education as a science, not a gold rush. A bridge of blocks spanning a server rack and a school desk.',
  },
  {
    key: 'challenge',
    eyebrow: 'The Challenge',
    title: 'The gap between what AI can do and what students need.',
    photo: 'assets/images/student-notebook.webp',
    position: '62% 40%',
    alt: 'The Challenge: the gap between what AI can do and what students need. Two students writing by hand at a classroom desk.',
  },
  {
    key: 'approach',
    eyebrow: 'Our Approach',
    title: 'We start by asking what teachers and students need.',
    photo: 'assets/images/define-the-role.webp',
    position: '72% 50%',
    alt: 'Our Approach: we start by asking what teachers and students need. A teacher working with three students at a table.',
  },
  {
    key: 'team',
    eyebrow: 'Who We Are',
    // The page's description already ends "AI should augment human teaching, not replace it",
    // so the card takes the home page's line about who the team is instead.
    title: 'Educators, researchers, and engineers as equal partners.',
    mosaic: true, // Leadership's headshots, from the roster, in page order
    alt: 'Who We Are: educators, researchers, and engineers as equal partners. Headshots of the AugmentED leadership team.',
  },
  {
    key: 'follow',
    eyebrow: 'Follow Our Work',
    title: 'Stay in the loop.', // the page's H1; its description is the line under it
    photo: 'assets/images/high-tech-high-workshop.webp',
    position: '68% 50%',
    alt: 'Follow Our Work: stay in the loop. Educators gathered at a wall of sticky notes.',
  },
];

// Bio cards: every bio the site builds (a bio whose tile links it; linksBio()), with the
// person's headshot, name and role. Someone without a headshot gets the same card with
// the arch mark in its place.
export function bioCards() {
  const roster = readRoster(root);
  return readBios(path.join(root, 'source-material/bios'))
    .map((b) => ({ b, p: roster.people.find((x) => x.slug === b.slug) }))
    .filter(({ p }) => p && linksBio(root, roster, p))
    .map(({ b, p }) => {
      const headshot = `assets/team/${b.slug}.webp`;
      return {
        key: `team/${b.slug}`,
        eyebrow: (roster.groups.find((g) => g.key === p.group) || {}).name || 'Who We Are',
        title: b.name,
        role: b.role,
        headshot: fs.existsSync(path.join(root, headshot)) ? headshot : null,
        alt: `${b.name}${b.role ? `, ${b.role}` : ''}, AugmentED`,
      };
    });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const file = (rel) => pathToFileURL(path.join(root, rel)).href;

// The layout is the site's, at card size, and nothing the site does not do: the page
// colour, Avenir Heavy headlines at the H1's line height and tracking, the semibold
// eyebrow and role, and photographs in plain frames at --radius-image. No accent colours,
// shapes or labels of the card's own — a share card is the page's first impression, so it
// has to look like the page it opens. Values are the design system's resolved tokens
// (tokens/colors.css, typography.css, layout.css, fonts.css); the file:// page cannot read
// its custom properties. Weights follow fonts.css, which maps 600 (semibold) to the Medium
// file and 700 (bold) to Heavy.
function html(card) {
  const face = (w, f) => `@font-face{font-family:Avenir;font-weight:${w};src:url(${pathToFileURL(path.join(FONTS, f)).href}) format('woff2')}`;
  let visual;
  if (card.mosaic) {
    const faces = surfacedWithPhoto(readRoster(root)).filter((p) => p.group === 'leadership').slice(0, 6);
    if (faces.length < 4) throw new Error(`team card: only ${faces.length} Leadership headshots — the mosaic needs four or six`);
    const n = faces.length >= 6 ? 6 : 4;
    visual = `<div class="visual mosaic n${n}">${faces.slice(0, n).map((p) => `<img src="${file(`assets/team/${p.slug}.webp`)}" alt="">`).join('')}</div>`;
  } else if ('headshot' in card) {
    visual = card.headshot
      ? `<img class="visual portrait" src="${file(card.headshot)}" alt="">`
      : `<div class="visual portrait mark"><img src="${file('assets/logo/logo-icon.png')}" alt=""></div>`;
  } else if (card.cutout) {
    // Large, and up in the space above the headline, which only needs the bottom-left: at
    // 720px the arch is the biggest thing on the card, and the rack's base, which would meet
    // the headline's first line, is below the crop. Faded out over its last quarter rather
    // than cut on a hard line through the rack.
    const { width, bottom, ratio, centre, top } = card.cutout;
    const h = Math.round(width * ratio * bottom);
    visual = `<div class="cutout" style="left:${centre - width / 2}px;top:${top}px;width:${width}px;height:${h}px"><img src="${file(card.photo)}" style="width:${width}px" alt=""></div>`;
  } else {
    visual = `<img class="visual" src="${file(card.photo)}" style="object-position:${card.position}" alt="">`;
  }
  // Long names and headlines step down a size rather than run to a fourth line.
  const len = card.title.length;
  const size = 'role' in card ? (len > 22 ? 64 : 76) : len > 48 ? 58 : len > 34 ? 64 : 80;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${face(400, 'AvenirLTPro-Book.woff2')}${face(600, 'AvenirLTPro-Medium.woff2')}${face(700, 'AvenirLTPro-Heavy.woff2')}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#fdfcfa;font-family:Avenir,sans-serif;color:#020408;position:relative}
.text{position:absolute;left:72px;top:60px;bottom:64px;width:584px;display:flex;flex-direction:column}
/* The lockup PNG carries its own margin (106px of 2100 at the left, 125 of 704 at the top),
   pulled back here so the mark lines up with the headline's left edge. */
.logo{width:300px;height:auto;display:block;margin:-18px 0 0 -15px}
.copy{margin-top:auto}
.eyebrow{font-weight:600;font-size:24px;margin-bottom:20px}
h1{font-weight:700;font-size:${size}px;line-height:1.1;letter-spacing:-.01em;text-wrap:balance}
.role{font-weight:600;font-size:26px;line-height:1.4;margin-top:20px}
/* --radius-image is 0.5rem: 8px, the frame every photograph on the site has. */
.visual{position:absolute;left:680px;top:40px;width:480px;height:550px;border-radius:8px;object-fit:cover;display:block}
.cutout{position:absolute;overflow:hidden;-webkit-mask-image:linear-gradient(#000 75%,transparent)}
.cutout img{display:block;height:auto}
.mosaic{display:grid;gap:16px}
.mosaic.n6{grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(3,1fr)}
.mosaic.n4{grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr)}
.mosaic img{width:100%;height:100%;object-fit:cover;object-position:50% 22%;border-radius:8px;display:block}
.portrait{height:480px;top:75px;object-position:50% 20%}
.mark{background:#e9eef4;display:flex;align-items:center;justify-content:center}
.mark img{width:150px;height:150px}
</style></head><body>
${visual}
<div class="text">
  <img class="logo" src="${file('source-material/brand-logos/PNG/AugmentED_Logo_Color_Horiz.png')}" alt="">
  <div class="copy">
    ${card.eyebrow ? `<p class="eyebrow">${esc(card.eyebrow)}</p>` : ''}
    <h1>${esc(card.title)}</h1>
    ${card.role ? `<p class="role">${esc(card.role)}</p>` : ''}
  </div>
</div>
</body></html>`;
}

export const ogPath = (key) => `assets/og/${key}.jpg`;

async function main() {
  const { chromium } = await import('playwright');
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const cards = [...CARDS, ...bioCards()];
  const stale = [];
  const tmp = path.join(root, '.og-tmp.html');
  try {
    for (const card of cards) {
      // A file:// page, so the fonts and photographs load from the working tree with no server.
      fs.writeFileSync(tmp, html(card));
      await page.goto(pathToFileURL(tmp).href);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
      const fallback = await page.evaluate(() => !document.fonts.check('800 64px Avenir'));
      if (fallback) throw new Error(`${card.key}: Avenir did not load; the card would be set in a fallback face`);
      const overflow = await page.evaluate(() => {
        const t = document.querySelector('.text');
        return t.scrollHeight > t.clientHeight + 1;
      });
      if (overflow) throw new Error(`${card.key}: the headline does not fit — shorten it in CARDS or bio's name/role`);
      const buf = await page.screenshot({ type: 'jpeg', quality: 86 });
      const out = path.join(root, ogPath(card.key));
      if (check) {
        if (!fs.existsSync(out)) stale.push(`${ogPath(card.key)} is missing`);
        else if (!(await similar(page, fs.readFileSync(out), buf))) stale.push(`${ogPath(card.key)} is stale`);
      } else {
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, buf);
      }
    }
  } finally {
    fs.rmSync(tmp, { force: true });
    await browser.close();
  }
  // A card for a page or a person that no longer has one would be published for nothing.
  const want = new Set(cards.map((c) => ogPath(c.key)));
  const have = fs.existsSync(OUT) ? walk(OUT).map((f) => path.relative(root, f).split(path.sep).join('/')) : [];
  for (const f of have.filter((f) => !want.has(f))) {
    if (check) stale.push(`${f} has no page`);
    else fs.rmSync(path.join(root, f));
  }
  if (stale.length) {
    console.error(`share cards out of date — run node tools/build-og.mjs:\n  ${stale.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`${check ? 'checked' : 'wrote'} ${cards.length} share cards in assets/og/`);
}

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

// Mean absolute difference over a downscaled copy of both images, decoded by the browser
// already open. Under 2% is the same card; a different headline or photograph is far above.
async function similar(page, a, b) {
  const diff = await page.evaluate(async ([x, y]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const px = (img) => { const c = document.createElement('canvas'); c.width = 300; c.height = 158; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 300, 158); return g.getImageData(0, 0, 300, 158).data; };
    const pa = px(ia), pb = px(ib);
    let s = 0;
    for (let i = 0; i < pa.length; i++) s += Math.abs(pa[i] - pb[i]);
    return s / pa.length / 255;
  }, [`data:image/jpeg;base64,${a.toString('base64')}`, `data:image/jpeg;base64,${b.toString('base64')}`]);
  return diff < 0.02;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

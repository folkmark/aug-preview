// The developer handoff page: wordpress-handoff/START-HERE.md and DECISIONS.md rendered as
// one unlinked, noindex page, so the person installing the plugin on aerdf.org can be sent an
// address instead of attachments.
//
// This is deliberately not part of the site. Nothing links to it, it is not in the sitemap,
// and it is built from the two Markdown files alone, not from index.html — so the static
// export (tools/export-static.mjs) and the WordPress plugin built from it never contain it.
// It names no secret: both files are already public in this repository. "Unlinked" keeps it
// out of search results and navigation; it does not make it private.
//
// The renderer is the small subset those two files use — headings, paragraphs, flat ordered,
// unordered and task lists, pipe tables, `code`, **bold**, *italic* and links — and nothing
// more. A file that grows past it should fail loudly here rather than render wrongly, so an
// unsupported construct (a fenced block, nested list, blockquote or raw HTML) throws.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// GitHub's heading anchors, because START-HERE.md's own links were written against them
// ("#1-upload-and-activate", "#5-optional-aerdfs-job-title-field").
export function slug(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .trim()
    .replace(/ /g, '-');
}

function inline(src, link) {
  const held = [];
  // Code spans first, so nothing inside them is read as Markdown.
  let s = src.replace(/`([^`]+)`/g, (_, c) => `\u0000${held.push(`<code>${esc(c)}</code>`) - 1}\u0000`);
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    const href = link(u.replace(/&amp;/g, '&'));
    const ext = /^https?:/.test(href);
    return `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => held[+i]);
}

/** Markdown (the subset above) to HTML. `prefix` namespaces heading ids; `link` rewrites hrefs. */
export function renderMarkdown(md, { prefix = '', link = (u) => u } = {}) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const used = new Map();
  const id = (t) => {
    const base = prefix + slug(t);
    const n = used.get(base) || 0;
    used.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
  const para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '), link)}</p>`);
    para.length = 0;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line) || /^>/.test(line) || /^\s*<[a-z!/]/i.test(line)) {
      throw new Error(`handoff-page: unsupported Markdown on line ${i + 1}: ${line}`);
    }
    if (!line.trim()) { flush(); continue; }
    let m;
    if ((m = line.match(/^(#{1,4}) +(.*)$/))) {
      flush();
      const level = m[1].length;
      // Each file's own H1 becomes the section heading, one level down from the page title.
      const tag = `h${Math.min(level + 1, 5)}`;
      out.push(`<${tag} id="${id(m[2])}">${inline(m[2], link)}</${tag}>`);
      continue;
    }
    if (/^\|/.test(line) && /^\|[\s|:-]+\|?\s*$/.test(lines[i + 1] || '')) {
      flush();
      const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      i--;
      out.push(
        `<div class="tw"><table><thead><tr>${head.map((c) => `<th>${inline(c, link)}</th>`).join('')}</tr></thead><tbody>` +
          rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, link)}</td>`).join('')}</tr>`).join('') +
          '</tbody></table></div>'
      );
      continue;
    }
    if ((m = line.match(/^([-*]|\d+\.) +(.*)$/))) {
      flush();
      const ordered = /\d/.test(m[1]);
      const items = [];
      while (i < lines.length) {
        const mm = lines[i].match(/^([-*]|\d+\.) +(.*)$/);
        if (!mm || /\d/.test(mm[1]) !== ordered) break;
        let text = mm[2];
        i++;
        // Continuation lines are indented under the item.
        while (i < lines.length && /^ {2,}\S/.test(lines[i])) {
          if (/^ {2,}([-*]|\d+\.) /.test(lines[i])) throw new Error(`handoff-page: nested list on line ${i + 1}`);
          text += ' ' + lines[i].trim();
          i++;
        }
        const task = text.match(/^\[( |x)\] +(.*)$/);
        items.push(task ? `<li class="task"><span aria-hidden="true">${task[1] === 'x' ? '☑' : '☐'}</span> ${inline(task[2], link)}</li>` : `<li>${inline(text, link)}</li>`);
      }
      i--;
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return out.join('\n');
}

/** The finished page. Self-contained: no scripts, no external requests. */
export function handoffPage({ title, intro, sections, toc }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; --bg:#fff; --fg:#1b1b1b; --muted:#5a5a5a; --line:#d9d9d9; --code:#f1f1f1; --link:#0b4fb3; --note:#fff7e0; --noteline:#e3c15a; }
  @media (prefers-color-scheme: dark) { :root { --bg:#161616; --fg:#ececec; --muted:#a9a9a9; --line:#383838; --code:#242424; --link:#8ab4ff; --note:#2b2512; --noteline:#7a6522; } }
  html { scroll-padding-top: 1rem; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { max-width:50rem; margin:0 auto; padding:1.5rem 1rem 4rem; }
  h1 { font-size:1.9rem; line-height:1.2; margin:.2rem 0 1rem; }
  h2 { font-size:1.5rem; margin:2.5rem 0 .5rem; padding-top:1rem; border-top:1px solid var(--line); }
  h3 { font-size:1.2rem; margin:1.8rem 0 .4rem; }
  h4, h5 { font-size:1.05rem; margin:1.4rem 0 .3rem; }
  a { color:var(--link); }
  code { background:var(--code); padding:.1em .35em; border-radius:4px; font:.9em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; overflow-wrap:anywhere; }
  ul, ol { padding-left:1.4rem; }
  li { margin:.3rem 0; }
  li.task { list-style:none; margin-left:-1.4rem; }
  .tw { overflow-x:auto; margin:1rem 0; }
  table { border-collapse:collapse; min-width:100%; font-size:.95rem; }
  th, td { border:1px solid var(--line); padding:.45rem .6rem; text-align:left; vertical-align:top; }
  th { background:var(--code); }
  .note { background:var(--note); border:1px solid var(--noteline); border-radius:6px; padding:.8rem 1rem; margin:1rem 0 1.5rem; }
  .note p { margin:.3rem 0; }
  nav.toc ul { list-style:none; padding:0; }
  .skip { position:absolute; left:-999px; } .skip:focus { left:1rem; top:1rem; background:var(--bg); padding:.5rem; }
</style>
</head>
<body>
<a class="skip" href="#content">Skip to content</a>
<main id="content">
<h1>${esc(title)}</h1>
<div class="note">${intro}</div>
<nav class="toc" aria-label="On this page"><ul>${toc.map((t) => `<li><a href="#${t.id}">${esc(t.label)}</a></li>`).join('')}</ul></nav>
${sections.join('\n')}
</main>
</body>
</html>
`;
}

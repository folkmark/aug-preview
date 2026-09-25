// Scopes the site's stylesheets to one element, so they can sit on a page that belongs to
// somebody else.
//
// The design system and the page were written to own the document: base.css styles body,
// the headings, p, a and img; the tokens are ~160 custom properties on :root; the page's
// own block sets a:hover and body margins. On aerdf.org every one of those would restyle
// AERDF's header and footer. So every selector is prefixed with the ID the plugin's
// templates wrap the page in, #augmented-ed, and :root, html and body become that element.
//
// AN ID, NOT A CLASS, and the reason is measured rather than stylistic. The prefix adds
// (1,0,0) to every rule, and adds it to ALL of them, so the site's own rules keep exactly
// the order they had against each other — index.html:615-618 depends on a component rule
// outranking a page rule by specificity, and a scheme that prefixed only some layers would
// break static mode there. It also beats every host rule built from elements and classes,
// which is all of them on aerdf.org: Bootstrap's reboot at (0,0,1) and the Elementor kit's
// `.elementor-kit-1734 a` at (0,1,1). What the host sets that our rules DO NOT set leaks in
// by inheritance or directly; those few properties are reverted by hand in the plugin's
// css/host.css, from a list measured on the live site.
//
// Keyframes are renamed so a host keyframe of the same name cannot replace ours, and the
// icon font's family is renamed so it cannot collide with a host that loads the full
// Material Symbols. @property registrations stay global: they are declarations of types,
// not styles, and the names are ours (--hb-*, --bloom).
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

export const SCOPE_ID = 'augmented-ed';

const ROOTISH = (n) =>
  (n.type === 'pseudo' && n.value === ':root') ||
  (n.type === 'tag' && /^(html|body)$/i.test(n.value));

// One selector list. `renameTags` maps a tag name to the attribute that replaces it — the
// header, which becomes the program bar ([data-aug-bar]).
function scopeSelector(selector, renameTags) {
  return selectorParser((root) => {
    root.each((sel) => {
      sel.walk((n) => {
        if (ROOTISH(n)) n.replaceWith(selectorParser.id({ value: SCOPE_ID }));
        else if (n.type === 'tag' && renameTags[n.value]) n.replaceWith(selectorParser.attribute({ attribute: renameTags[n.value], value: undefined, raws: {} }));
      });
      const first = sel.first;
      if (!(first && first.type === 'id' && first.value === SCOPE_ID)) {
        sel.prepend(selectorParser.combinator({ value: ' ' }));
        sel.prepend(selectorParser.id({ value: SCOPE_ID }));
      }
    });
    // The universal box-sizing rule reaches every descendant but not the wrapper itself,
    // which is the element standing in for html now. Give it the wrapper too.
    const bare = root.nodes.some((s) => s.nodes.length === 3 && s.nodes[2].type === 'universal');
    const hasWrapper = root.nodes.some((s) => s.nodes.length === 1 && s.first.type === 'id');
    if (bare && !hasWrapper) {
      const w = selectorParser.selector();
      w.append(selectorParser.id({ value: SCOPE_ID }));
      root.prepend(w);
    }
  }).processSync(selector);
}

// sources: [{ css, from, rewriteUrl?(url) }]. Returns { css, report }.
export function scopeCss(sources, { renameTags = {}, keyframePrefix = 'aug-', fontRenames = {} } = {}) {
  const out = [];
  const keyframes = new Set();
  const report = { rules: 0, fontFaces: 0, properties: 0, keyframes: [] };
  const roots = sources.map(({ css, from }) => postcss.parse(css, { from }));
  for (const root of roots) root.walkAtRules(/keyframes$/i, (a) => keyframes.add(a.params.trim()));

  sources.forEach(({ from, rewriteUrl }, i) => {
    const root = roots[i];
    root.walkComments((c) => c.remove());
    root.walkAtRules('import', (a) => {
      throw new Error(`${from}: @import ${a.params} — ship the imported file itself, not a sheet of imports`);
    });
    root.walkAtRules(/keyframes$/i, (a) => { a.params = keyframePrefix + a.params.trim(); });
    root.walkAtRules('property', () => { report.properties++; });
    root.walkAtRules('font-face', (a) => {
      report.fontFaces++;
      a.walkDecls('font-family', (d) => {
        const name = d.value.replace(/^["']|["']$/g, '');
        if (fontRenames[name]) d.value = `"${fontRenames[name]}"`;
      });
      a.walkDecls('src', (d) => {
        d.value = d.value.replace(/url\((['"]?)([^'")]+)\1\)/g, (all, q, u) =>
          /^(data:|https?:)/.test(u) || !rewriteUrl ? all : `url("${rewriteUrl(u)}")`);
      });
    });
    root.walkRules((r) => {
      if (r.parent && r.parent.type === 'atrule' && /keyframes$/i.test(r.parent.name)) return;
      r.selector = scopeSelector(r.selector, renameTags);
      report.rules++;
    });
    root.walkDecls((d) => {
      if (/^animation(-name)?$/.test(d.prop)) {
        d.value = d.value.replace(/[A-Za-z_][\w-]*/g, (w) => (keyframes.has(w) ? keyframePrefix + w : w));
      }
      for (const [from2, to] of Object.entries(fontRenames)) {
        if (d.value.includes(`"${from2}"`)) d.value = d.value.split(`"${from2}"`).join(`"${to}"`);
      }
      if (rewriteUrl && d.parent.type === 'rule') {
        d.value = d.value.replace(/url\((['"]?)([^'")]+)\1\)/g, (all, q, u) =>
          /^(data:|https?:|#)/.test(u) ? all : `url("${rewriteUrl(u)}")`);
      }
    });
    out.push(`/* ${from} */\n` + root.toString().replace(/\n\s*\n/g, '\n').trim());
  });
  report.keyframes = [...keyframes];
  return { css: out.join('\n\n') + '\n', report };
}

// The build's own guarantee, checked on the finished sheet rather than trusted from the
// transform: every rule outside a keyframe block starts with the wrapper, and nothing
// still names the document.
export function assertScoped(css) {
  const problems = [];
  postcss.parse(css).walkRules((r) => {
    if (r.parent && r.parent.type === 'atrule' && /keyframes$/i.test(r.parent.name)) return;
    for (const s of r.selectors) {
      if (!s.startsWith(`#${SCOPE_ID}`)) problems.push(`unscoped selector: ${s}`);
      if (/(^|[\s,>+~(])(:root|html|body)\b/.test(s)) problems.push(`selector still names the document: ${s}`);
    }
  });
  return problems;
}

# Content data files

Part of [the WordPress handoff](../README.md) — the site's structured content as
data, so you can model and import it instead of
transcribing it from HTML. `tools/export-content.mjs` parses these files out of
the rendered pages in [`../pages/`](../pages/) — the same files you build
templates from, so the two cannot disagree — and verifies every count before
writing. Regenerate them whenever the pages are re-exported:

```
npm i --no-save playwright && node tools/export-static.mjs && node tools/export-content.mjs
```

Your target install already runs JetEngine and CPT UI; the field lists below map
directly onto either.

| File | Records | What it is |
|---|---|---|
| `team.json` | 28 | One record per person on Who We Are. Fields: `name`, `group` (Leadership, Research Partners, Technology Partners, Education Fellows), `role`, `affiliation` and `location` (null except for fellows and some partners), `photo` (a repository-relative path, or **null for the 9 people with no usable photograph yet** — model the image as optional and render the gray placeholder), `links` (zero or more of LinkedIn / Website). |
| `research.json` | 3 | The Recent Research cards: `title`, `description`, `url`. All three currently link to the same paper; that is the state of the content, not a parsing error. |
| `cycle.json` | 4 | The R&D cycle wheel's steps: `number`, `title`, `body`, `icon`. The count is fixed at four — the wheel's geometry is not content. See [`../sections/cycle.md`](../sections/cycle.md). |
| `pages.json` | 5 | Per-route `title` and meta `description`, ready for Yoast's fields. |
| `redirects.csv` | 4 | The old long slugs and their replacements, in the Redirection plugin's CSV import format (`source,target`). Import it if the production site keeps these paths. |

Bios exist for team members but are not on the site; they live in our tracking
sheet. Ask us for it if the rebuild adds bios.

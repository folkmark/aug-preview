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

The WordPress plugin reads them through `tools/build-wp-plugin.mjs`, which writes what its
importer and templates need into `plugin/augmented-ed/generated/data/`; nobody has to model
or import these by hand. They stay useful as a readable record of the content.

| File | Records | What it is |
|---|---|---|
| `team.json` | 29 | One record per person on Who We Are. Fields: `slug` (the key everything joins on — the bio page's URL, the headshot's filename, and the team post the plugin imports them as; checked against all three), `name`, `group` (Leadership, Research Partners, Education Fellows, Technology and Design Partners — in that order), `role` (**null for the 4 people added from the website info form whose titles have not arrived** — model it as optional and render nothing, not an empty line), `affiliation` and `location` (null except for the Education Fellows; the partners' institutions are part of their role line), `photo` (a repository-relative path, or **null for the 4 people with no usable photograph yet** — model the image as optional and render the placeholder square, `#e9eef4`), `bioUrl` (the person's bio page, or null — 21 of the 29 have one), `links` (zero or more of LinkedIn / Website). |
| `research.json` | 3 | The Recent Research cards: `title`, `description`, `url`. All three currently link to the same paper; that is the state of the content, not a parsing error. |
| `cycle.json` | 4 | The R&D cycle wheel's steps: `number`, `title`, `body`, `icon`. The count is fixed at four — the wheel's geometry is not content. See [`../sections/cycle.md`](../sections/cycle.md). |
| `pages.json` | 5 | Per-route `title` and meta `description`, ready for Yoast's fields. |
| `redirects.csv` | 4 | The preview site's old long slugs and their replacements (`source,target`). These paths never existed on aerdf.org, so the plugin needs none of them. |

Twenty-one bios are on the site, one page each at the `bioUrl` above: the four leaders and
seventeen partners and fellows. Their prose lives in `source-material/bios/<slug>.md` and
nowhere else — deliberately not in this export, so there is only one copy to keep
current. See [`../sections/leadership.md`](../sections/leadership.md). The other eight
people have no bio in our tracking sheet yet.

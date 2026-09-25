# augmented-ed — maintainer notes

For installing the plugin, read [`../../START-HERE.md`](../../START-HERE.md). This is for
whoever changes it.

## Two halves

| | What | Edited by |
|---|---|---|
| `generated/` | The five page templates, the bio template, the program bar, the team tile, one stylesheet (`css/augmented-ed.css`, every sheet the pages use, scoped to `#augmented-ed`), and the data the importer and the form read. | **Nobody.** `node tools/build-wp-plugin.mjs` writes it from `wordpress-handoff/pages/` (the export) and `wordpress-handoff/content/`. |
| everything else | `augmented-ed.php`, `includes/`, `js/`, `css/host.css`: which page is an AugmentED page, what it loads, where links point, the team, the importer, the form's relay, the settings. | By hand. |

`assets/` is not in the repository: `node tools/build-wp-plugin.mjs --assemble dist` copies in
exactly the files `generated/ship.json` lists, from the repository's `assets/` and the design
system's fonts.

## The pipeline

```
index.html ──tools/export-static.mjs──▶ wordpress-handoff/pages/  (+ states.json)
                ──tools/export-content.mjs──▶ wordpress-handoff/content/
                ──tools/build-wp-plugin.mjs──▶ plugin/augmented-ed/generated/
                ──tools/build-wp-plugin.mjs --assemble dist──▶ dist/augmented-ed/  (the zip)
                ──tools/verify-wp-plugin.mjs [--live]──▶ .wp-verify/report/
```

After changing `index.html`: re-export, re-run export-content, regenerate, commit all three.
CI's `plugin` job fails if `generated/` does not match what the export produces.

## Where each decision lives

- **Page detection is by template, never slug** — `includes/templates.php`. The template swap is at
  `template_include` priority 100: above Elementor (11) and Elementor Pro's Theme Builder (~12),
  below Elementor's safe mode (999).
- **Links name templates** — `augmented_ed_url()` in `includes/links.php`.
- **Assets are plugin files, never uploads** — `augmented_ed_asset()`; WP-Stateless on
  aerdf.org would move uploads to URLs the components cannot construct.
- **The offsets** — `js/augmented-ed.js` measures `--aug-top`, `--header-h` and `--hero-lead` on
  `#augmented-ed`. The components read their pin from their stage's computed `top`, so they need
  nothing else.
- **What AERDF's CSS leaks in** — `css/host.css`, reverted property by property, each measured on
  aerdf.org. `tools/verify-wp-plugin.mjs --live` fails on any leak not listed there.
- **The team** — `includes/team.php` (posts of AERDF's `team` type in an "AugmentED Team"
  category; card fields as `augmented_ed_*` post meta) and `includes/importer.php`.
- **HubSpot** — only `Augmented_ED_HubSpot` in `includes/follow.php` knows its API. HubSpot ends
  support for v1–v3 APIs in September 2027; that class is the migration.

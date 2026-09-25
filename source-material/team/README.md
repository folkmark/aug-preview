# The team roster

`people.json` is everyone the site knows about: the people on Who We Are, the people
waiting for a group, and the people taken off the page. The Who We Are tiles in
`index.html` are written from it by `tools/build-team.mjs`, and CI fails when the two
disagree, so this file is where a team change starts.

## Who appears

A person appears on the page if and only if they have a `group` **and** are not tagged
`Archived`.

| Status | `group` | `tags` | What happens |
|---|---|---|---|
| On the page | a group key | — | A tile in that group, in `order`. Their photograph is cut out, encoded and published; their bio (if `source-material/bios/<slug>.md` exists) is built at `/team/<slug>/`. |
| Held | `null` | — | Nothing is published. Used for someone who has sent their details but whose group is not confirmed yet. |
| Archived | kept | `["Archived"]` | Nothing is published. They keep their group and everything else, so bringing them back is removing the tag. In WordPress the import marks their post Archived instead of deleting it. |

To take someone off the page, tag them `Archived`. Don't just clear their group: WordPress
only hears about the Archived people, so a person who was on the page and is merely
ungrouped stays visible there.

## Fields

- `id`: the row number in the Team Universe sheet. Stable; never reused.
- `slug`: the key everything joins on: the tile's id, the photograph's filenames, the
  bio's filename and URL, and the WordPress post. Never change it for someone already
  published.
- `name`: exactly as shown, on the tile, in the photo's alt text and on the bio page.
  The bio's `# heading` must match it.
- `group`, `order`: which grid, and the position in it (gaps are fine; ties are not).
- `role`, `affiliation`, `location`: the tile's three lines, any of them `null`. A
  location needs an affiliation above it.
- `linkedin`, `website`: the tile's two icons, when set.
- `photo`:
  - `master` is the file in `source-material/image-sources/team/` (exactly one file per
    slug). Masters are kept for archived people too.
  - A held person's photograph is not committed, because this repository is public. Their
    `drive` is the Google Drive file ID it waits under.
  - `from` and `ref` record where the photograph came from; `notes` records anything that
    was done to it.
- `form`: what the person submitted through the website info form, as submitted.
- `bioSource`: where the published bio came from and whether the tracker marks it approved.
- `archived`: when and in which commit they were taken off.
- `notes`, `actions` (open items, `[owner] …`), `history` (what changed and in which commit).

## After an edit

```sh
node tools/build-team.mjs                     # rewrites the tiles; prints what to run next
<venv>/python3 tools/cutout-headshots.py --only=<slug>    # a new or changed photograph
node tools/encode-images.mjs --only=<slug>
node tools/export-static.mjs && node tools/export-content.mjs && node tools/build-wp-plugin.mjs
node tools/build-site.mjs _site
```

`node tools/build-team.mjs --check` is what CI runs (inside `build-site`), and
`--format` puts this file back in its canonical two-space form.

## The Team Universe sheet

The Google Sheet "AugmentED — Team Universe" is a view of this file for people who do not
read JSON: one row per person, with their status (on the page, held or archived), tags,
sources, photograph details, bio text, open actions and history. Regenerate it after a
roster change, then upload the CSV to Drive as a new sheet:

```sh
npm i --no-save sharp && node tools/team-universe.mjs team-universe.csv
```

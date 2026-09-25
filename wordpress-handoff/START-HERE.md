# AugmentED on aerdf.org — start here

The AugmentED site ships to WordPress as **one plugin**, `augmented-ed`. You install it; you
do not rebuild the pages. It draws the five AugmentED pages inside aerdf.org's own theme —
AERDF's header and footer stay, with AugmentED's navigation as a bar beneath them, as
Assessment for Good's pages do — puts the AugmentED team into AERDF's existing **Team**
post type, and connects the Follow form to HubSpot.

It has been installed and tested on WordPress 7.1 with a stand-in for AERDF's theme, and its
pages have been rendered inside live aerdf.org pages with AERDF's own CSS and JavaScript
running (see [Verification](#verification)). Install it on **WP Engine staging first**.

## Before you start

Three things need an answer from someone other than you. [DECISIONS.md](DECISIONS.md) lists
every open decision with a default and an owner; these three block launch:

1. **The address.** Where the pages live (the plugin's default is `/augmented/`, which today
   redirects to `/opportunities/advanced-fellows/augmented/`), and what happens to that
   existing page.
2. **The HubSpot form.** Someone with access to AERDF's HubSpot creates the form the Follow
   page submits to — [step 4](#4-connect-the-follow-form) says exactly what it needs.
3. **The Avenir licence.** The plugin serves its own Avenir font files; confirm AERDF's
   licence covers them.

## Install

### 1. Upload and activate

Plugins → Add New → **Upload Plugin** → `augmented-ed.zip` → Activate.

The zip is about 22 MB (it carries every image and animation frame the pages use). If the
upload is refused for size, copy the unzipped `augmented-ed/` folder into
`wp-content/plugins/` over SFTP instead, or `wp plugin install augmented-ed.zip --activate`.

Where the zip comes from: AugmentED sends it. It is built by the repository's CI (the
`plugin` job of the "Publish site to gh-pages" workflow, artifact **augmented-ed-plugin**)
on every pull request and every change to `main`.

### 2. Create the pages

Tools → **AugmentED team** → **Create the pages as drafts**.

That makes five draft pages, each with its AugmentED template — "AugmentED" at
`/augmented/`, and The Challenge, Our Approach, Who We Are and Follow Our Work under it —
with their Yoast titles and descriptions filled in. Rename, move or re-parent them as
you like: the pages link to each other by template, never by address.

Or do it by hand: any page, Page Attributes → **Template** → one of the five "AugmentED —"
templates. Each template must be used by exactly one published page; Settings →
AugmentED says if one is missing or doubled.

### 3. Import the team

Tools → **AugmentED team** → **Dry run**. Expect:

- 5 categories to create: "AugmentED Team" and one child per Who We Are group;
- **27 people to create** and **2 to attach** — Sherry Lachman and Caitlin Mills, who are
  already AERDF team members. Attaching adds the AugmentED categories and card fields only:
  their titles, bios and photos on AERDF's pages are not touched.

If the dry run names any other person as "already exists", stop and check it is the same
person before listing them under **Attach**. Then **Import**. Running it again changes only
what changed; it never deletes anything and never overwrites edits made in WordPress
(unless you tick Force).

Each person is an ordinary team post you can edit. The **AugmentED card** box on the edit
screen holds what the Who We Are grid shows (role, a Fellow's school and city, links, the
position in the group, the bundled headshot); the post's content is the bio.

### 4. Connect the Follow form

In AERDF's HubSpot, create a form with these fields (internal names):

| Field | HubSpot property | Required |
|---|---|---|
| First name | `firstname` | yes |
| Last name | `lastname` | yes |
| Email | `email` | yes |
| Contact number | `phone` | no |
| Tell us more | `message` | yes |
| Which best describes you? | a dropdown contact property, default name `augmented_persona`, options `educator`, `researcher`, `engineer`, `administrator`, `nonprofit`, `executive`, `funder`, `journalist`, `other` | no |

**Turn CAPTCHA off on that form.** HubSpot rejects every API submission to a form with
CAPTCHA on; the plugin has its own spam defences (a hidden field, a minimum time, a rate
limit).

Then Settings → **AugmentED** → the portal ID (AERDF's is 20910033) and the form's ID → the
privacy policy URL → Save → **Send test submission**. It sends one real submission as you
and shows HubSpot's answer.

### 5. Optional: AERDF's job-title field

AERDF's team pages show a job title from a field the plugin cannot see from outside. If you
want the AugmentED roles in that field too, pick it under Settings → AugmentED → "AERDF's
job-title field" before importing.

### 6. Review, publish, purge

Preview the drafts, publish them, then purge WP Engine's cache (and Cloudflare's, if it
caches pages). Add AugmentED to AERDF's own navigation if that has been decided.

## Don't

- **Don't open the AugmentED pages in Elementor**, or pick an Elementor layout for them. The
  plugin draws the whole page; an Elementor layout replaces it. The edit screen says so.
- **Don't upload any of the plugin's images to the media library**, or point an image
  optimiser (EWWW, Smush, ShortPixel, Cloudflare Polish) at the plugin's folder. The
  animations address their frames by exact filename.
- **Don't edit anything under `generated/`.** It is rebuilt from the AugmentED site on every
  update.

## Updating

Upload the new zip the same way; WordPress offers **Replace current with uploaded**. Re-run
the import only if the team changed. Purge the caches afterwards.

## Acceptance

Logged out and logged in, and with the AccessiBe widget on:

- [ ] The five pages match [the reference site](https://augmented2.folkmark.com) below
      AERDF's header, at 360, 768, 1440 and 1920 px wide.
- [ ] The home page's hero plays when scrolled, and its copy is whole when the hero first
      reaches the bar; the closing blocks fall; clicking a step of the cycle wheel travels to it.
- [ ] Who We Are shows 25 headshots and 4 placeholders in four groups; with a mouse, a
      headshot blooms into colour; each "Read bio" opens that person's page.
- [ ] A member without a bio (e.g. `/team/tom-peterson/`) goes to Who We Are.
- [ ] Sherry Lachman's and Caitlin Mills's AERDF pages are unchanged.
- [ ] The Follow form's test submission reaches HubSpot, and a real one from the page does.
- [ ] AERDF's header, footer and every other page look exactly as before.

## Verification

`tools/verify-wp-plugin.mjs` in the repository installs the assembled plugin into a fresh
WordPress with a stand-in AERDF theme (and AERDF's real stylesheets), follows the steps
above, and checks every page against the site it was generated from — layout, computed
styles and pixels at four widths — plus the components, the offsets logged in and out, the
reveal, the menu, the colour bloom, the form end to end through the relay, the bio pages and
redirects, and that nothing reaches AERDF's header or footer. With `--live` it renders the
plugin's pages inside real aerdf.org pages. The plugin's own README (`plugin/augmented-ed/`)
and [README.md](README.md) explain how it is built.

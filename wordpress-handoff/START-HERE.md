# AugmentED on aerdf.org — start here

The AugmentED site ships to WordPress as **one plugin**, `augmented-ed`. You install it; you
do not rebuild the pages. It draws the five AugmentED pages inside aerdf.org's own theme —
AERDF's header and footer stay, with AugmentED's navigation as a bar beneath them, as
Assessment for Good's pages do — puts the AugmentED team into AERDF's existing **Team**
post type, and connects the Follow form to HubSpot.

It needs WordPress 6.5 or later and PHP 8.0 or later; both floors are tested, and so is the
current release. It has been installed and tested on WordPress 7.1 with a stand-in for AERDF's theme, and its
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

Plugins → Add New → **Upload Plugin** → `augmented-ed-plugin.zip` → Activate.

The zip is about 22 MB (it carries every image and animation frame the pages use). If the
upload is refused for size, copy the unzipped `augmented-ed/` folder into
`wp-content/plugins/` over SFTP instead, or `wp plugin install augmented-ed-plugin.zip --activate`.

Where the zip comes from: AugmentED sends it, and keep a copy of the one you install. It is built by the repository's CI (the
`plugin` job of the "Publish site to gh-pages" workflow, artifact **augmented-ed-plugin**)
on every pull request and every change to `main`; GitHub hands it over as
`augmented-ed-plugin.zip`, with `augmented-ed/` at its root, which is what Upload Plugin
expects. CI keeps each run's zip for 90 days only. Check the version on the Plugins screen: this handoff describes **1.1.0**.

### 2. Create the pages

Tools → **AugmentED team** → **Create the pages as drafts**. Activating the plugin creates
none: Pages → All Pages stays empty of AugmentED until you click this.

That makes five draft pages, each with its AugmentED template — "AugmentED" at
`/augmented/`, and The Challenge, Our Approach, Who We Are and Follow Our Work under it —
with their Yoast titles and descriptions filled in. Rename, move or re-parent them as
you like: the pages link to each other by template, never by address.

Or do it by hand: any page, Page Attributes → **Template** → one of the five "AugmentED —"
templates. Each template must be used by exactly one published page; Settings →
AugmentED says if one is missing or doubled.

### 3. Import the team

First, if you want the AugmentED roles written into AERDF's own job-title field as well, pick
it under Settings → AugmentED → "AERDF's job-title field" (see [step 5](#5-optional-aerdfs-job-title-field)).

Then Tools → **AugmentED team** → **Dry run**. Expect:

- **6 categories** to create: "AugmentED Team" and one child per Who We Are group —
  Leadership, Strategy, Research Partners, Education Fellows, Technology and Design Partners;
- **34 people to create** and **2 to attach** — Sherry Lachman and Caitlin Mills, who are
  already AERDF team members. Attaching adds the AugmentED categories and card fields, and
  fills Yoast's meta description and AERDF's job-title field only where they are empty:
  their titles, bios and photos on AERDF's pages are not touched;
- **6 absent**: people AugmentED has archived (off its Who We Are page on purpose). They are
  never created. If one ever exists as an AugmentED team post, the import marks it
  Archived instead of deleting it.

If the dry run stops with "These slugs already belong to team posts that are not
AugmentED's: …", check each is the same person before listing them under **Attach**; nothing
has been changed. Then **Import**. Running it again changes only what changed; it never
deletes anything and never overwrites edits made in WordPress (unless you tick "Update cards
edited in WordPress since the last import").

Each person is an ordinary team post you can edit. The **AugmentED card** box on the edit
screen holds what the Who We Are grid shows (role, a Fellow's school and city, links, the
position in the group, the bundled headshot); the post's content is the bio. Only
Leadership's five have one from AugmentED; everyone else's post is created empty, and an
empty post has no page of its own — it redirects to Who We Are.

To take someone off Who We Are without losing them, tick **Archived** at the top of their
AugmentED card: their tile goes, their page redirects to Who We Are and leaves the sitemap,
and nothing is deleted. Untick it to bring them back. The import leaves an Archived box an
editor has ticked alone.

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
privacy policy URL (AERDF's is its Terms of Use & Privacy Policy page, `https://aerdf.org/termsofuse/`) → **Save Changes** → **Send test submission**. It sends one real submission as you
and shows HubSpot's answer.

### 5. Optional: AERDF's job-title field

AERDF's team pages show a job title from a field the plugin cannot see from outside. If you
want the AugmentED roles in that field too, pick it under Settings → AugmentED → "AERDF's
job-title field" before importing (step 3). If the team is already imported, pick it and run
the import again: it writes the roles where the field is empty.

### 6. Review, publish, purge

Preview the drafts, publish them, then purge WP Engine's cache (and Cloudflare's, if it
caches pages). Add AugmentED to AERDF's own navigation if that has been decided.

## Trying it on a blank WordPress

You do not need AERDF's site to see the plugin work. Any new WordPress 6.5+ (PHP 8.0+) will do —
[Local](https://localwp.com) is the easiest way to get one on a laptop; WordPress Playground
(playground.wordpress.net) works for a quick look but forgets everything when the tab closes.

1. **Upload and activate** the zip ([step 1](#1-upload-and-activate)). If the upload is refused
   for size, unzip it into `wp-content/plugins/` yourself and activate it from the Plugins screen.
2. **Switch on the test stand-in for the team.** A blank site has no `team` post type, and the
   import has nothing to import into. Settings → **AugmentED** → tick the testing box → Save.
   The box only appears outside production; if it doesn't, or the tick won't stick, add
   `define( 'AUGMENTED_ED_TEAM_SHIM', true );` to `wp-config.php` above the line that says
   "That's all, stop editing!". Never switch this on at aerdf.org.
3. **Set Settings → Permalinks to "Post name"** and save. On the default "Plain" setting the
   pages only open by their `?page_id=` addresses, and the `/augmented/…` and `/team/…`
   addresses used throughout this document do not exist.
4. **Create the pages** — Tools → AugmentED team → **Create the pages as drafts**
   ([step 2](#2-create-the-pages)). Then do the **Dry run** and **Import**
   ([step 3](#3-import-the-team)).
5. **Preview, don't visit.** The pages are drafts, so their public addresses are a 404 until you
   publish them. Pages → All Pages → hover a page → **Preview**.

If something looks wrong:

| You see | Because | Do |
|---|---|---|
| Pages → All Pages has no AugmentED pages | Installing the plugin creates none. | Tools → AugmentED team → **Create the pages as drafts**. Look for the green "Created: …" line. |
| A page's address is a 404 on the site | It is still a draft. | Preview it from the Pages list, or publish it. |
| The dry run says there is no "team" post type | The stand-in is off. | Step 2 above. |
| A Leadership "Read bio" link is a 404 | WordPress had not yet learned the `/team/<name>/` address. Plugin 1.1.0 rebuilds its address rules when the stand-in is first switched on, so this should not happen; if it does, or you switched it on with an older copy, save Settings → Permalinks once. | Settings → Permalinks → **Save Changes**, changing nothing. |
| A member who is not in Leadership has no "Read bio" link, or their address goes to Who We Are | Only Leadership's five have a bio page; everyone else's redirects on purpose. | Test with Raquel Romano, Jenny Bradbury, Abby (Csaba) Petre, Sherry Lachman or Caitlin Mills. |
| The dry run's numbers are not "34 create, 2 attach" | Those are the numbers for aerdf.org, where Sherry and Caitlin already exist. A blank site has no existing posts. | Nothing; read the dry run's own list. |
| Settings → AugmentED shows amber warnings | It lists what is not done yet: a missing page, an unimported team, no HubSpot form. | Work down the list. |

The Follow form needs a real HubSpot form ID ([step 4](#4-connect-the-follow-form)), so on a
blank site only its own checks run (required fields, the spam defences).

## Don't

- **Don't open the AugmentED pages in Elementor**, or pick an Elementor layout for them. The
  plugin draws the whole page; an Elementor layout replaces it. The edit screen says so.
- **Don't upload any of the plugin's images to the media library**, or point an image
  optimiser (EWWW, Smush, ShortPixel, Cloudflare Polish) at the plugin's folder. The
  animations address their frames by exact filename.
- **If you keep installing zips from AugmentED, don't edit anything under `generated/`.** It is
  rebuilt from the AugmentED site on every update, so your edit would be overwritten. If you have
  stopped taking their zips, it is ordinary code: see [After launch](#after-launch-it-is-yours).

## Updating

If you receive a new zip from AugmentED, upload it the same way; WordPress offers **Replace
current with uploaded**. Re-run the import only if the team changed. Purge the caches afterwards.

**From 1.0.0 to 1.1.0** (October 2026): the headshots are colour, the team has a fifth group
(Strategy), and only Leadership has bios. Re-run the import for the new group and people. If
the team was imported under 1.0.0, sixteen people outside Leadership still hold their bio as
post content, and a post with content still draws "Read bio" — clear those posts' content by
hand; the import never empties a post.

## After launch: it is yours

The plugin is the quick way to get the AugmentED pages live on aerdf.org. What you do next is
your call, and none of it depends on AugmentED, or on the repository, staying involved.

1. **Leave it as it is.** It is one self-contained plugin and needs no upkeep of its own, though
   a big change to WordPress, PHP or AERDF's theme could need it revisited. Keep a copy of the
   zip you installed.
2. **Ask AugmentED for changes.** AugmentED can update the site and send a new zip, which you
   upload over the old one. That is a courtesy, not a service level: do not build a process
   that cannot work without it.
3. **Edit the plugin in place and treat it as your own code.** The pages are ordinary PHP files
   (`plugin/augmented-ed/generated/templates/`), with the page copy in them as plain HTML, and
   the rest is the runtime you can read and change. Every note in this document that says
   "don't edit `generated/`" is for people who keep regenerating from AugmentED's repository.
   If you are not, ignore it. The one cost: a later zip from AugmentED replaces your edits, so
   once you start editing, stop installing their zips, or merge by hand.
4. **Rebuild it however you like.** Elementor, a theme, anything. The plugin is not a
   dependency of the content: the copy, images and specs are in the repository. See
   [rebuilding it your own way](#b-rebuild-the-site-natively-in-wordpress-instead-of-using-the-plugin).

What can be changed with no code at all:

| Change | Where |
|---|---|
| The team: a person's role, bio, links, photo, or taking them off the page | Their Team post in WordPress (the **AugmentED card** box). The import never overwrites a card edited in WordPress. |
| The HubSpot form, the pages' addresses, the privacy link | Settings → **AugmentED**, and the Pages screen. |
| Page copy, images, layout | Code (option 3), or a new zip (option 2). They are not editable in the WordPress editor. |

## Only if you want to regenerate the plugin from its source

You do not need any of this to install the plugin or to edit it in place. It is here for a
developer who wants to rebuild the zip from the repository, so that the plugin keeps following
the site's source.

The plugin is built from a public repository, [folkmark/aug-preview](https://github.com/folkmark/aug-preview),
branch `main`. There are two different things you might mean.

### A. Rebuild the plugin zip from its source

You need Node (version 22 is what the build runs on), `zip`, and PHP 8 (for the syntax check). This produces the same
zip AugmentED sends, from a clean clone:

```
git clone https://github.com/folkmark/aug-preview.git
cd aug-preview
npm i --no-save playwright@1.63.0 linkedom@0.18.13 postcss@8.5.28 postcss-selector-parser@7.1.6 pixelmatch@7.2.0 pngjs@7.0.0 axe-core@4.13.0 html-validate@11.16.0
node tools/build-wp-plugin.mjs --check
node tools/build-wp-plugin.mjs --assemble dist --zip
```

The result is `dist/augmented-ed.zip`, about 22 MB. Name every package in the one `npm i`
line: `--no-save` removes anything you leave out of the same call. The line above also covers
the checks below, so you do not need a second install.

To prove a build works, `node tools/verify-wp-plugin.mjs` installs it into a throwaway
WordPress and runs about eighty checks (pages against the site pixel for pixel, the team import, the
bio pages, the menu, the Follow form through to a stand-in HubSpot). It needs PHP 8 and
Chromium, and downloads WordPress the first time. Its report and screenshots land in
`.wp-verify/report/`. Nothing in it needs the original artwork: every image the plugin ships
is already committed.

What you may edit, and what you may not:

- **Yours to change:** `augmented-ed.php`, `includes/`, `js/`, and `css/host.css` under
  `wordpress-handoff/plugin/augmented-ed/`. This is the runtime: the importer, the form's
  HubSpot relay, the offsets under AERDF's header. Edit it, then run the two build
  commands above. When you release a change, raise the version in `augmented-ed.php` (twice:
  the header and `AUGMENTED_ED_VERSION`) and in `readme.txt` (`Stable tag` and the changelog).
- **Not by hand, while you regenerate:** everything under `generated/`. It is output, rewritten from the site on
  every build, and the build fails if it has been edited. To change what a page looks like or
  says, the change is made to the site (`index.html` and the files it uses) and then
  exported (`node tools/export-static.mjs && node tools/export-content.mjs`, which needs
  Chromium), not to the plugin. If you would rather edit the pages directly and
  stop regenerating, that is option 3 under After launch.
- **`css/host.css` is for measured leaks only.** Add to it only what
  `node tools/verify-wp-plugin.mjs --live` reports against real aerdf.org pages, never
  speculatively, and never `all: revert`.

**Pick one source.** If you edit the plugin by hand and also install zips built from the repository,
the zip replaces your edits. Either keep your changes in the repository (a fork is fine), or stop
taking zips from it.

### B. Rebuild the site natively in WordPress instead of using the plugin

It can be done, and the repository carries what it takes: the exported pages
(`wordpress-handoff/pages/`), their content as data (`wordpress-handoff/content/`), a build spec
for each animated section (`wordpress-handoff/sections/`), and
[the handoff README](https://github.com/folkmark/aug-preview/blob/main/wordpress-handoff/README.md),
which has the measured behaviour, the rules every component must keep and a native-rebuild
procedure for each. We recommend against it unless AERDF needs the pages inside its own page
builder, for three reasons: the hero, the falling blocks and the cycle wheel are scroll-driven and
were tuned against real measurements, which is the expensive part to redo; a native copy stops
following the site, where the plugin is regenerated from it; and AugmentED's team and
Follow form are already wired in the plugin. If you do go this way, deactivate the
plugin before the native pages go live so the two do not both claim the same pages.

## Acceptance

Logged out and logged in, and with the AccessiBe widget on:

- [ ] The five pages match [the reference site](https://augmented2.folkmark.com) below
      AERDF's header, at 360, 768, 1440 and 1920 px wide.
- [ ] The home page's hero plays when scrolled, and its copy is whole when the hero first
      reaches the bar; the closing blocks fall; clicking a step of the cycle wheel travels to it.
- [ ] Who We Are shows 35 headshots in colour and 1 placeholder in five groups; each
      "Read bio" (Leadership's five only) opens that person's page.
- [ ] A member without a bio (e.g. `/team/tom-peterson/`) goes to Who We Are.
- [ ] Ticking **Archived** on a member's AugmentED card takes their tile off Who We Are and
      sends their page to Who We Are; unticking it brings them back.
- [ ] Sherry Lachman's and Caitlin Mills's AERDF pages are unchanged.
- [ ] The Follow form's test submission reaches HubSpot, and a real one from the page does.
- [ ] AERDF's header, footer and every other page look exactly as before.

## Verification

`tools/verify-wp-plugin.mjs` in the repository installs the assembled plugin into a fresh
WordPress with a stand-in AERDF theme (and AERDF's real stylesheets), follows the steps
above, and checks every page against the site it was generated from — layout, computed
styles and pixels at four widths — plus the components, the offsets logged in and out, the
reveal, the menu, the headshots, the form end to end through the relay, the bio pages and
redirects, and that nothing reaches AERDF's header or footer. With `--live` it renders the
plugin's pages inside real aerdf.org pages. The plugin's own README (`plugin/augmented-ed/`)
and [README.md](README.md) explain how it is built.

# AugmentED on aerdf.org — start here

The AugmentED site ships to WordPress as **one plugin**, `augmented-ed`. You install it; you
do not rebuild the pages. It draws the five AugmentED pages inside aerdf.org's own theme —
AERDF's header and footer stay, with AugmentED's navigation as a bar beneath them, as
Assessment for Good's pages do — puts the AugmentED team into AERDF's existing **Team**
post type, and connects the Follow form to HubSpot.

This page describes version **1.1.4**. The whole procedure takes about an hour on each
environment, plus AERDF's HubSpot set-up in step 3.

**Questions, at any step:** Brendan, [brendan@folkmark.com](mailto:brendan@folkmark.com) —
the build, the plugin, the pages and the team list.

**HubSpot is AERDF's.** AugmentED has not created, changed or tested anything in AERDF's
HubSpot, and has no access to it. The contact property, the form, its settings and the test
contact in step 3 are for someone at AERDF with HubSpot access. Brendan can say what the
plugin sends and what its messages mean, but not how AERDF's HubSpot is set up.

## Before you start

**Three things need an answer from someone other than you.** [DECISIONS.md](DECISIONS.md)
lists every open decision with a default and an owner; these three block launch:

1. **The address** — where the pages live (the plugin's default is `/augmented/`, which today
   redirects to `/opportunities/advanced-fellows/augmented/`), and what happens to that
   existing page.
2. **The HubSpot form** — AERDF's to create, by someone with access to AERDF's HubSpot.
   Nothing exists there for AugmentED yet. [Step 3](#3-connect-the-follow-form) says exactly
   what the form needs.
3. **The Avenir licence** — the plugin serves its own Avenir font files; confirm AERDF's
   licence covers them.

Steps 1, 2 and 5 can be done on staging before any of these is answered. Step 3 needs the
HubSpot form. Publishing (step 6) needs all three.

**What you need:**

- Administrator access to WordPress on WP Engine **staging** and **production**, and to the
  WP Engine User Portal (for backups and caches).
- For step 3, someone at AERDF who can create contact properties and forms in AERDF's
  HubSpot (portal 20910033).
- The zip, `augmented-ed-plugin.zip`, from Brendan, with its SHA-256. Check it before
  installing: `shasum -a 256 augmented-ed-plugin.zip` (macOS, Linux) or
  `certutil -hashfile augmented-ed-plugin.zip SHA256` (Windows) must print the same value.
  Install only a zip he sends: the repository's CI also builds zips from unmerged changes,
  and every one of them reports the same version.
- WordPress 6.5 or later and PHP 8.0 or later. The plugin is tested on both of those floors
  and on WordPress 7.1 with PHP 8.4.

**Staging first, then production, and never copy one onto the other.** Do steps 1–7 on
staging. Then do them again on production. Do not use WP Engine's Copy Environment from
staging to production: it replaces production's database, and with it everything AERDF has
published since the copy was taken.

**Take a backup point before you start on each environment**, and before every update:
WP Engine User Portal → the environment → Backups → Back up now.

## Install

### 1. Upload and activate

Plugins → **Add Plugin** ("Add New Plugin" in older WordPress) → **Upload Plugin** → choose
`augmented-ed-plugin.zip` → **Install Now** → **Activate Plugin**.

Check the Plugins screen says **AugmentED 1.1.4**.

The zip is about 22 MB, because it carries every image and animation frame the pages use. If
WordPress answers "The link you followed has expired." or "The uploaded file exceeds the
upload_max_filesize directive in php.ini.", the zip is over PHP's upload limit (Media → Add
New shows the "Maximum upload file size"). Then unzip it and copy the `augmented-ed/` folder
into `wp-content/plugins/` over SFTP and activate it on the Plugins screen, or copy the zip to
the server and run `wp plugin install /path/to/augmented-ed-plugin.zip --activate`.

### 2. Create the pages

Tools → **AugmentED team** → **Create the pages as drafts**. Activating the plugin creates
none: Pages → All Pages stays empty of AugmentED until you click this.

That makes five draft pages, each with its AugmentED template — "AugmentED" at
`/augmented/`, and The Challenge, Our Approach, Who We Are and Follow Our Work under it —
with their Yoast titles and descriptions filled in. Rename, move or re-parent them as you
like: the pages link to each other by template, never by address. (Once they are published,
an address you change needs a redirect from the old one, in Redirection.) Drafts have no
public address, so nothing changes on the site yet.

Or do it by hand: give any page one of the five "AugmentED —" templates (block editor: the
Page panel → Template; classic editor: Page Attributes → Template). Each template must be
used by exactly one published page; Settings → **AugmentED** says if one is missing or
doubled.

### 3. Connect the Follow form

**In AERDF's HubSpot** (someone at AERDF who can create properties and forms; none of
this exists yet):

1. Create the contact property the form's last question writes to: a **Dropdown select**
   contact property, label "Which best describes you?", internal name `augmented_persona`,
   with these options (label → internal value): Educator → `educator`, Researcher →
   `researcher`, Engineer → `engineer`, Administrator → `administrator`, Non-profit
   professional → `nonprofit`, Company executive → `executive`, Funder → `funder`,
   Journalist → `journalist`, Other → `other`.
2. Create a form with these fields:

   | Field | HubSpot property | Required |
   |---|---|---|
   | First name | `firstname` | yes |
   | Last name | `lastname` | yes |
   | Email | `email` | yes |
   | Contact number | `phone` | no |
   | Tell us more | `message` | yes |
   | Which best describes you? | `augmented_persona` | no |

3. **Turn CAPTCHA off on that form.** HubSpot rejects every API submission to a form with
   CAPTCHA on. The plugin has its own spam defences (see
   [The Follow form's defences](#the-follow-forms-defences)).
4. Note the form's ID: the long ID with dashes (a GUID) in the address bar while the form
   is open in HubSpot's editor, or `formId` in its embed code.

**In WordPress:** Settings → **AugmentED** → **Portal ID** (AERDF's is 20910033), **Form ID**,
and **Privacy policy URL** (AERDF's is its Terms of Use & Privacy Policy page,
`https://aerdf.org/termsofuse/`) → **Save Changes** → **Send test submission**. It sends one
real submission as you and shows HubSpot's answer.

Leave the other fields (Persona property, Consent sentence, Subscription type ID, Private
app token) as they are unless [DECISIONS.md](DECISIONS.md) says otherwise.

**The test submission creates a real contact** with your WordPress name and email, and it
starts whatever HubSpot workflow the form feeds. Staging and production submit to the same
real form, so delete the test contact in HubSpot afterwards.

**This is the plugin's first submission to AERDF's HubSpot.** The plugin's call has been tested
only against a stand-in that answers the way HubSpot's API is documented to. If HubSpot refuses
the test, the screen shows HubSpot's own message. First check the form ID, the internal names
in the table above, and that CAPTCHA is off. Then send Brendan the message.

### 4. Optional: AERDF's job-title field

AERDF's own team pages show a job title from a field the plugin cannot see from outside.
Settings → AugmentED → **AERDF's job-title field** can have the import write AugmentED's
roles into it, where it is empty, so the AugmentED people's AERDF pages show their titles.
The Who We Are page shows AugmentED's roles either way.

The dropdown lists the meta keys already used on team posts. To tell which one is the job
title: in Elementor → Templates → Theme Builder, open the single template for team members
and look at the job-title widget's dynamic tag; or open the field group shown on Team (in
ACF → Field Groups, or JetEngine's meta boxes) and read the field's **Name**. **If you are not
sure, leave it at "(none)".** Pick it before step 5; if the team is already imported, pick it and run the
import again, which then fills the field where it is empty.

### 5. Import the team

**On production, import straight before you publish (step 6).** "New people are" defaults
to **Published**, so the people are live as soon as the import runs: Leadership's bio pages,
the team sitemap and `/category/augmented-team/` appear, while the AugmentED pages they link
to are still drafts. On staging that does not matter. On production, either do steps 5 and
6 in one sitting, or set **New people are → Drafts** and publish them in step 6.

Tools → **AugmentED team** → **Dry run**. The options you set are kept for the Import that
follows, and the dry run says whether Import will create people published or as drafts.
Expect:

- **6 categories** to create: "AugmentED Team" and one child per Who We Are group —
  Leadership, Strategy, Research Partners, Education Fellows, Technology and Design Partners;
- **34 people to create** and **2 to attach** — Sherry Lachman and Caitlin Mills, who are
  already AERDF team members. Attaching adds the AugmentED categories and card fields, and
  fills Yoast's meta description and AERDF's job-title field only where they are empty:
  their titles, bios and photos on AERDF's pages are not touched;
- **6 absent**: people AugmentED has archived (off its Who We Are page on purpose). They are
  never created.

If the dry run stops with "Nothing was changed. These slugs already belong to team posts
that are not AugmentED's: …", check each one:

- **The same person** already on aerdf.org: type their slug under **Attach** (several
  separated by commas) and run the dry run again.
- **A different person** with the same name: do not attach them. Email Brendan the slug; the
  import cannot skip one person, so he will send a build that names them differently. Do not
  publish the pages meanwhile: without the import, Who We Are shows empty groups.

Then **Import**. Running it again later changes only what changed; it never deletes anything
and never overwrites edits made in WordPress (unless you tick "Update cards edited in
WordPress since the last import").

Each person is an ordinary team post you can edit. The **AugmentED card** box on the edit
screen holds what the Who We Are grid shows (role, a Fellow's school and city, links, the
position in the group, the bundled headshot); the post's content is the bio. Only
Leadership's five have one from AugmentED; everyone else's post is created empty, and an
empty post has no page of its own — it redirects to Who We Are.

To take someone off Who We Are without losing them, tick **Archived** at the top of their
AugmentED card: their tile goes, their page redirects to Who We Are and leaves the sitemap,
and nothing is deleted. Untick it to bring them back. The import leaves an Archived box an
editor has ticked alone.

### 6. Review, publish, purge

1. Preview the five drafts.
2. **Check nothing else claims `/augmented/`.** Today WordPress itself redirects it to the
   existing AugmentED page, and publishing a page there ends that. A rule in Tools →
   Redirection, in Yoast's redirects (Yoast SEO Premium), or in the WP Engine User Portal's
   redirect rules would not be replaced: it would keep sending visitors away from the new
   page. Remove any such rule.
3. Apply the decision about the existing AugmentED page, `/opportunities/advanced-fellows/augmented/`
   ([DECISIONS.md](DECISIONS.md)).
4. Publish the five pages. If you imported the team as drafts, publish them too: Team →
   Screen Options (top right) → Number of items per page: 100, so all of them are on one
   page → filter by the "AugmentED Team" category → select all → Bulk actions → Edit →
   Status: Published.
5. Purge the caches: in wp-admin, **WP Engine → Caching → Clear all caches**, and
   Cloudflare's too if it caches pages.
6. Add AugmentED to AERDF's own navigation if that has been decided
   ([DECISIONS.md](DECISIONS.md)).

### 7. Check it

Check each item **logged out in a private window** (which is what visitors get, through the
caches), then logged in. With the cookie banner accepted and then declined, and with the
AccessiBe widget open, nothing should cover AugmentED's bar, its menu or the form, and the
form should still send.

The reference site is the AugmentED site as it stands on `main`, and the zip Brendan sends is
built from the same commit (`generated/build.json` in the plugin names it). Expected
differences: AERDF's header and footer in place of AugmentED's, and on phones the bar's menu
button carries the word "Menu" ([DECISIONS.md](DECISIONS.md)).

- [ ] The five pages match [the reference site](https://augmented2.folkmark.com) below
      AERDF's header, at 360, 768, 1440 and 1920 px wide.
- [ ] The home page's hero plays when scrolled, and its copy is fully visible, not yet
      fading, when the hero first reaches AugmentED's bar; the closing blocks fall; clicking a
      step of the cycle wheel travels to it.
- [ ] Who We Are shows 36 headshots in colour in five groups; each
      "Read bio" (Leadership's five only) opens that person's page.
- [ ] A member without a bio (e.g. `/team/tom-peterson/`) goes to Who We Are.
- [ ] Ticking **Archived** on a member's AugmentED card takes their tile off Who We Are and
      sends their page to Who We Are; unticking it brings them back.
- [ ] Sherry Lachman's and Caitlin Mills's AERDF pages are unchanged, apart from a Yoast
      meta description where theirs was empty.
- [ ] The Follow form's test submission reaches AERDF's HubSpot, and so does a real one from
      the page: someone with HubSpot access sees each contact arrive with every field filled
      in, then deletes it.
- [ ] AERDF's header, footer and every other page look exactly as before. The one expected
      change: the `/team/` archive and search now list the AugmentED people too
      ([DECISIONS.md](DECISIONS.md)).
- [ ] Pasting a published AugmentED page's address into LinkedIn's
      [Post Inspector](https://www.linkedin.com/post-inspector/) shows that page's own share
      card: its headline beside a photograph. A page with a Social image set in Yoast shows
      that instead.
- [ ] Nothing shows over AERDF's header until you press Tab: the first Tab on an AugmentED
      page shows "Skip to content" in AugmentED's bar.
- [ ] Settings → AugmentED shows every line of its status panel as done, and
      `wp augmented-ed team status` (WP-CLI) lists one published page per template and the
      team in five groups.

When every box is ticked, email Brendan the environment, the date, the plugin version and
who checked it.

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
   ([step 5](#5-import-the-team)).
5. **Preview, don't visit.** The pages are drafts, so their public addresses are a 404 until you
   publish them. Pages → All Pages → hover a page → **Preview**.

If something looks wrong:

| You see | Because | Do |
|---|---|---|
| Pages → All Pages has no AugmentED pages | Installing the plugin creates none. | Tools → AugmentED team → **Create the pages as drafts**. Look for the green "Created: …" line. |
| A page's address is a 404 on the site | It is still a draft. | Preview it from the Pages list, or publish it. |
| The dry run says there is no "team" post type | The stand-in is off. | Step 2 above. |
| A Leadership "Read bio" link is a 404 | WordPress had not yet learned the `/team/<name>/` address. From plugin 1.1.3 the plugin rebuilds its address rules when the stand-in is first switched on, so this should not happen; with an older copy, or if it does, save Settings → Permalinks once. | Settings → Permalinks → **Save Changes**, changing nothing. |
| A member who is not in Leadership has no "Read bio" link, or their address goes to Who We Are | Only Leadership's five have a bio page; everyone else's redirects on purpose. | Test with Raquel Romano, Jenny Bradbury, Abby (Csaba) Petre, Sherry Lachman or Caitlin Mills. |
| The dry run's numbers are not "34 create, 2 attach" | Those are the numbers for aerdf.org, where Sherry and Caitlin already exist. A blank site has no existing posts. | Nothing; read the dry run's own list. |
| Settings → AugmentED shows amber warnings | It lists what is not done yet: a missing page, an unimported team, no HubSpot form. | Work down the list. |

The Follow form needs a real HubSpot form ID ([step 3](#3-connect-the-follow-form)), so on a
blank site only its own checks run (required fields, the spam defences).

## Don't

- **Don't open the AugmentED pages in Elementor**, or pick an Elementor layout for them. The
  plugin draws the whole page; an Elementor layout replaces it. The edit screen says so, in
  both editors. If someone does open one, the page still draws correctly; "Back to WordPress
  Editor" on its edit screen switches it back.
- **Don't duplicate an AugmentED page** (Duplicate Post's "Clone", "New Draft" or "Rewrite &
  Republish"). The copy has the same template, and the pages' links go to the oldest of the
  two. The status panel warns when a template is doubled.
- **Don't upload any of the plugin's images to the media library**, or point an image or
  asset optimiser (EWWW, Smush, ShortPixel, Cloudflare Polish, WP Engine's Page Speed Boost)
  at the plugin's folder. The animations address their frames by exact filename.
- **If you keep installing zips from AugmentED, don't edit anything under `generated/`.** It is
  rebuilt from the AugmentED site on every update, so your edit would be overwritten. If you have
  stopped taking their zips, it is ordinary code: see [After launch](#after-launch-it-is-yours).
- **Don't copy staging onto production** with WP Engine's Copy Environment. Install on each.

## Updating

1. Take a backup point.
2. Upload the new zip the same way; WordPress shows the installed and uploaded versions side
   by side and offers **Replace current with uploaded**.
3. Check the Plugins screen shows the new version.
4. Open Settings → AugmentED. If its status panel says the version has team changes, run the
   import: Tools → AugmentED team → Dry run, then Import. (The changelog, `readme.txt` inside
   the zip, says what else changed.)
5. Purge the caches.

Keep every zip you are sent: the previous one is how you roll an update back.

**Only if 1.0.0 was ever installed and its team imported** (skip this on a first install):
1.1.0 gave bios to Leadership alone, and the import never empties a post, so sixteen people
outside Leadership still hold their bio as post content and still draw "Read bio". Clear
the content of these team posts by hand: `alexandra-wiggins`, `andrew-lan`,
`angela-stewart`, `blair-lehman`, `brandon-bodnar`, `chris-mutter`, `danie-cowden`,
`isa-peczuh`, `joshua-sloan`, `laura-allen`, `lisa-peterson`, `mohammed-al-harthy`,
`neil-sharma`, `nikki-wallace`, `ryan-baker`, `sarah-zaner`.

## Rolling back

- **A bad update:** upload the previous zip. **Replace current with uploaded** works for an
  older version too.
- **Taking AugmentED off the site:** set the five pages to Draft (the ones Settings →
  AugmentED's status panel lists; the existing AugmentED page under Opportunities, also
  titled "AugmentED", is not one of them), then the AugmentED Team posts (Team → Screen
  Options → 100 per page → filter by "AugmentED Team" → select all; leave Sherry Lachman's
  and Caitlin Mills's alone, which are AERDF's own), then deactivate the plugin.
  Deactivating alone is not enough: the pages stay published and draw as empty theme pages,
  and the people's pages stop redirecting.
  - What stays: the six AugmentED categories (so `/category/augmented-team/` still answers)
    and, on Sherry's and Caitlin's posts, the AugmentED categories, card fields and any
    Yoast description the import filled. Delete the six categories (Posts → Categories) to
    take those away too; a later import recreates them.
- **Anything else:** restore the backup point (WP Engine User Portal → Backups). That
  restores the whole site to that moment, AERDF's own changes since included.

## What the plugin stores

| Where | What |
|---|---|
| Options | `augmented_ed_settings` (Settings → AugmentED, including the HubSpot private app token if one is set), `augmented_ed_template_pages`, `augmented_ed_import` (the last import's summary) |
| Transients | `augmented_ed_rl_*` (the form's rate limit, 10 minutes); `augmented_ed_report_*`, `augmented_ed_created_*` and `augmented_ed_test_result_*` (the last import's, page creation's and test submission's results, for the screen that ran them, 5–10 minutes) |
| Content | Five pages; 34 team posts; 6 categories ("AugmentED Team" and its five groups) |
| Post meta | `augmented_ed_*` (the AugmentED card), `_augmented_ed_import_hash`, Yoast's `_yoast_wpseo_title` and `_yoast_wpseo_metadesc` where they were empty, and the job-title field if one was chosen |
| Term meta | `augmented_ed_order` on the group categories |

**Deleting the plugin removes its options and nothing else.** The pages, team posts,
categories and their fields are content: they belong to the site, AERDF's own pages may
link to them, and a reinstall picks them up where they were.

## The Follow form's defences

The Follow page is cached, so the form carries no nonce (a cached one would be stale for
most visitors). Instead:

- a hidden field that people never fill in and bots do;
- a minimum of three seconds on the form, measured by the visitor's browser;
- a rate limit over ten minutes: five submissions per visitor address, and fifty per
  connecting address, which a forged Cloudflare header cannot change.

A bot caught by the first two is told it succeeded, and nothing is sent to HubSpot. A
visitor over the limit is asked to try again in a few minutes.

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

## Verification

`tools/verify-wp-plugin.mjs` in the repository installs the assembled plugin into a fresh
WordPress with a stand-in AERDF theme (and AERDF's real stylesheets), follows the steps
above, and checks every page against the site it was generated from — layout, computed
styles and pixels at four widths — plus the components, the offsets logged in and out, the
reveal, the menu, the headshots, the form end to end through the relay, the bio pages and
redirects, and that nothing reaches AERDF's header or footer. With `--live` it renders the
plugin's pages inside real aerdf.org pages. The plugin's own README (`plugin/augmented-ed/`)
and [README.md](README.md) explain how it is built.

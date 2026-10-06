# AugmentED on aerdf.org — start here

The AugmentED site ships to WordPress as **one plugin**, `augmented-ed`. You install it; you
do not rebuild the pages. It draws the five AugmentED pages inside aerdf.org's own theme —
AERDF's header and footer stay, with AugmentED's navigation as a bar beneath them, as
Assessment for Good's pages do — puts the AugmentED team into AERDF's existing **Team**
post type, and connects the Follow form to HubSpot.

This page describes version **1.1.1**. The whole procedure takes about an hour on each
environment, plus the HubSpot set-up in step 3.

**Questions, at any step:** Brendan, [brendan@folkmark.com](mailto:brendan@folkmark.com) —
the build, the plugin, the pages and the team list.

## Before you start

**Three things need an answer from someone other than you.** [DECISIONS.md](DECISIONS.md)
lists every open decision with a default and an owner; these three block launch:

1. **The address** — where the pages live (the plugin's default is `/augmented/`, which today
   redirects to `/opportunities/advanced-fellows/augmented/`), and what happens to that
   existing page.
2. **The HubSpot form** — someone with access to AERDF's HubSpot creates the form the Follow
   page submits to. [Step 3](#3-connect-the-follow-form) says exactly what it needs.
3. **The Avenir licence** — the plugin serves its own Avenir font files; confirm AERDF's
   licence covers them.

Steps 1, 2 and 5 can be done on staging before any of these is answered. Step 3 needs the
HubSpot form. Publishing (step 6) needs all three.

**What you need:**

- Administrator access to WordPress on WP Engine **staging** and **production**, and to the
  WP Engine User Portal (for backups and caches).
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

Check the Plugins screen says **AugmentED 1.1.1**.

The zip is about 22 MB, because it carries every image and animation frame the pages use. If
WordPress answers "The link you followed has expired." or "The uploaded file exceeds the
upload_max_filesize directive in php.ini.", the zip is over PHP's upload limit (Media → Add
New shows the "Maximum upload file size"). Then unzip it and copy the `augmented-ed/` folder
into `wp-content/plugins/` over SFTP and activate it on the Plugins screen, or copy the zip to
the server and run `wp plugin install /path/to/augmented-ed-plugin.zip --activate`.

### 2. Create the pages

Tools → **AugmentED team** → **Create the pages as drafts**.

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

**In AERDF's HubSpot** (someone with HubSpot access):

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
- [ ] The Follow form's test submission reaches HubSpot, and a real one from the page does.
- [ ] AERDF's header, footer and every other page look exactly as before. The one expected
      change: the `/team/` archive and search now list the AugmentED people too
      ([DECISIONS.md](DECISIONS.md)).
- [ ] Nothing shows over AERDF's header until you press Tab: the first Tab on an AugmentED
      page shows "Skip to content" in AugmentED's bar.
- [ ] Settings → AugmentED shows every line of its status panel as done, and
      `wp augmented-ed team status` (WP-CLI) lists one published page per template and the
      team in five groups.

When every box is ticked, email Brendan the environment, the date, the plugin version and
who checked it.

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
- **Don't edit anything under `generated/`.** It is rebuilt from the AugmentED site on every
  update.
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

## Verification

`tools/verify-wp-plugin.mjs` in the repository installs the assembled plugin into a fresh
WordPress with a stand-in AERDF theme (and AERDF's real stylesheets), follows the steps
above, and checks every page against the site it was generated from — layout, computed
styles and pixels at four widths — plus the components, the offsets logged in and out, the
reveal, the menu, the headshots, the form end to end through the relay, the bio pages and
redirects, and that nothing reaches AERDF's header or footer. With `--live` it renders the
plugin's pages inside real aerdf.org pages. The plugin's own README (`plugin/augmented-ed/`)
and [README.md](README.md) explain how it is built.

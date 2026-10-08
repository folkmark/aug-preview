# Installing AugmentED on aerdf.org

Hello, and thank you for taking this on.

The whole AugmentED site comes to you as **one WordPress plugin**. There's nothing to build:
you install it, click a couple of buttons, and the five AugmentED pages appear inside
aerdf.org's own theme, with AERDF's header and footer and AugmentED's navigation as a bar just
beneath them, the way Assessment for Good's pages work. The plugin also adds the AugmentED
team to AERDF's existing Team post type and connects the Follow form to HubSpot.

Set aside about an hour on each environment. This page describes plugin version **1.1.4**.

If anything is unclear or looks wrong at any point, please just ask Brendan at
[brendan@folkmark.com](mailto:brendan@folkmark.com). No question is too small.

## Before you start

**What you'll need:**

- Administrator access to WordPress on WP Engine **staging** and **production**, and to the WP
  Engine User Portal (for backups and clearing caches).
- The plugin zip, which Brendan sends you along with a SHA-256 checksum. To check the zip
  arrived intact, run `shasum -a 256 <the zip>` (macOS, Linux) or
  `certutil -hashfile <the zip> SHA256` (Windows); it should print the same value.
- For step 3 only, someone at AERDF who can create contact properties and forms in AERDF's
  HubSpot (portal 20910033).

**Two things to confirm with AERDF before you publish.** You can install on staging and work
through steps 1, 2 and 5 while these are being sorted out:

1. **The address.** The pages go at `/augmented/` by default. That address currently redirects
   to the existing AugmentED page under Opportunities, so AERDF should decide what happens to
   that page once the new one is live.
2. **The HubSpot form**, which someone at AERDF creates (step 3 says exactly what it needs).

**A few habits that will keep this painless:**

- Do everything on **staging first**, then repeat it on **production**. Please don't use WP
  Engine's Copy Environment to move staging onto production: it would replace production's
  database, including anything AERDF has published since.
- Take a backup point before you begin on each environment: WP Engine User Portal → the
  environment → Backups → **Back up now**.

## Install

### 1. Upload and activate

Plugins → **Add Plugin** → **Upload Plugin** → choose the zip → **Install Now** → **Activate
Plugin**. The Plugins screen should now show **AugmentED 1.1.4**.

The zip is about 22 MB because it carries every image and animation frame. If WordPress says
"The link you followed has expired" or mentions `upload_max_filesize`, the zip is just larger
than the server's upload limit. Unzip it, copy the `augmented-ed/` folder into
`wp-content/plugins/` over SFTP, and activate it from the Plugins screen. Or, with WP-CLI:
`wp plugin install /path/to/the.zip --activate`.

### 2. Create the pages

Tools → **AugmentED team** → **Create the pages as drafts**.

Activating the plugin doesn't create any pages on its own, so this button is the step that
makes them. You'll get five drafts, each already set to its AugmentED template: "AugmentED" at
`/augmented/`, with The Challenge, Our Approach, Who We Are and Follow Our Work underneath. Their
Yoast titles and descriptions are filled in for you.

Drafts aren't public, so nothing changes on the live site yet. You're welcome to rename or move
the pages: they link to each other by template, not by address.

### 3. Connect the Follow form

**In AERDF's HubSpot.** This part is for someone at AERDF with HubSpot access. AugmentED doesn't
have access to AERDF's HubSpot, so none of this exists yet:

1. Create a **Dropdown select** contact property: label "Which best describes you?", internal
   name `augmented_persona`, with these options (label → internal value): Educator →
   `educator`, Researcher → `researcher`, Engineer → `engineer`, Administrator →
   `administrator`, Non-profit professional → `nonprofit`, Company executive → `executive`,
   Funder → `funder`, Journalist → `journalist`, Other → `other`.
2. Create a form with these fields:

   | Field | HubSpot property | Required |
   |---|---|---|
   | First name | `firstname` | yes |
   | Last name | `lastname` | yes |
   | Email | `email` | yes |
   | Contact number | `phone` | no |
   | Tell us more | `message` | yes |
   | Which best describes you? | `augmented_persona` | no |

3. **Turn CAPTCHA off on that form.** HubSpot refuses every submission sent from a server to a
   form with CAPTCHA on. The plugin has its own spam protection instead.
4. Copy the form's ID: the long ID with dashes in the address bar while the form is open in
   HubSpot's editor.

**In WordPress:** Settings → **AugmentED** → fill in **Portal ID** (20910033), **Form ID**, and
**Privacy policy URL** (`https://aerdf.org/termsofuse/`) → **Save Changes** → **Send test
submission**. You can leave the other fields as they are.

The test sends one real submission with your WordPress name and email, so it creates a real
contact in HubSpot. Please delete it there afterwards. If HubSpot refuses the test, the screen
shows HubSpot's own message: check the form ID, the internal names above, and that CAPTCHA is
off, and if it still won't go through, send Brendan the message.

### 4. Optional: AERDF's job-title field

AERDF's own team pages show a job title from a custom field. If you'd like the AugmentED people's
AERDF pages to show their titles too, pick that field under Settings → AugmentED → **AERDF's
job-title field** before importing the team, and the import will fill it in wherever it's empty.

To find the field: Elementor → Templates → Theme Builder → the single template for team
members → the job-title widget's dynamic tag. **If you're not sure, leave it at "(none)".** The
Who We Are page shows everyone's role either way.

### 5. Import the team

Tools → **AugmentED team** → **Dry run** first. It changes nothing and tells you what the import
will do. You should see:

- **6 categories** to create: "AugmentED Team" and one for each Who We Are group;
- **34 people to create** and **2 to attach**. The two are Sherry Lachman and Caitlin Mills,
  who are already on AERDF's team. Attaching only adds the AugmentED details; their existing
  AERDF pages, titles, bios and photos stay exactly as they are;
- **6 absent**: people who have left AugmentED's team. They're skipped on purpose.

If the dry run stops because a name already belongs to a different AERDF team post: when it's
the same person, type their slug under **Attach** and run the dry run again; when it's someone
else with the same name, please email Brendan the slug rather than attaching them.

Then click **Import**. You can run it again any time: it only changes what changed, never
deletes anything, and never overwrites edits made in WordPress.

**On production, import right before you publish (step 6).** New people are published as soon
as the import runs, so doing steps 5 and 6 in one sitting keeps their pages from appearing
before the AugmentED pages they link to. (Or set **New people are → Drafts** and publish them
in step 6.)

Each person is an ordinary Team post you can edit. Their **AugmentED card** box holds what Who
We Are shows. To take someone off the page without deleting them, tick **Archived** on their
card.

### 6. Review, publish, purge

1. Preview the five draft pages.
2. Check nothing else claims `/augmented/`. A rule in Redirection, Yoast's redirects or WP
   Engine's redirect rules would keep sending visitors away from the new page, so remove any
   you find.
3. Apply AERDF's decision about the existing AugmentED page under Opportunities.
4. Publish the five pages (and the team, if you imported them as drafts: Team → filter by the
   "AugmentED Team" category → select all → Bulk actions → Edit → Status: Published).
5. Clear the caches: **WP Engine → Caching → Clear all caches** in wp-admin, and Cloudflare's
   too if it caches pages.

### 7. Check it

Please check these in a **private window, logged out**, which is what visitors see:

- [ ] The five pages match [the AugmentED site](https://augmented2.folkmark.com), with AERDF's
      header and footer in place of AugmentED's. (On phones, AugmentED's menu button says
      "Menu" so it isn't confused with AERDF's. That's intended.)
- [ ] On the home page, the hero animation plays as you scroll, the blocks fall near the end,
      and clicking a step of the cycle wheel moves to it.
- [ ] Who We Are shows everyone's photos in five groups, and each "Read bio" (Leadership
      only) opens that person's page.
- [ ] Sherry Lachman's and Caitlin Mills's AERDF pages look as they did before.
- [ ] A test submission from the Follow page reaches AERDF's HubSpot with every field filled
      in. Delete it afterwards.
- [ ] With AERDF's cookie banner and accessibility widget open, nothing covers AugmentED's
      bar, its menu or the form, and the form still sends.
- [ ] The rest of aerdf.org looks exactly as before. (The `/team/` archive and search will now
      include the AugmentED people too. That's expected.)
- [ ] Settings → AugmentED shows every line of its status panel as done.

That's it. When everything is ticked, please let Brendan know which environment, the date and
who checked it. Thank you!

## A few things to avoid

- **Please don't open the AugmentED pages in Elementor.** The plugin draws the whole page, and
  an Elementor layout would replace it. (If it happens, "Back to WordPress Editor" on the edit
  screen puts it right.)
- **Please don't duplicate an AugmentED page.** A copy carries the same template, and the
  pages' links can end up pointing at the wrong one.
- **Please keep image optimisers away from the plugin's folder** (Smush, EWWW, ShortPixel,
  Cloudflare Polish, WP Engine's Page Speed Boost). The animations look for their frames by
  exact filename.

## If something looks wrong

| You see | Why | What to do |
|---|---|---|
| No AugmentED pages under Pages | Activating doesn't create them. | Tools → AugmentED team → **Create the pages as drafts**. |
| A page's address shows a 404 | It's still a draft. | Preview it from the Pages list, or publish it. |
| A "Read bio" link shows a 404 | WordPress hasn't refreshed its addresses. | Settings → Permalinks → **Save Changes**, changing nothing. |
| `/augmented/` still goes to the old page | A redirect rule or a cache. | Step 6, items 2 and 5. |
| Amber warnings in Settings → AugmentED | Something isn't done yet. | Work down the list it shows. |

## Later on

**Updating.** When Brendan sends a new version: take a backup point, upload the new zip the same
way (WordPress offers **Replace current with uploaded**), and clear the caches. If Settings →
AugmentED says the update includes team changes, run the Dry run and Import again. Please keep
every zip you're sent; the previous one is how you go back.

**Going back.** To undo an update, upload the previous zip the same way. For anything bigger,
restore the backup point from the WP Engine User Portal.

**After launch, the site is AERDF's.** You're free to keep using the plugin as it is, ask
AugmentED for changes, or rebuild the pages however suits you. If you ever want the details
behind the plugin, they're in [the handoff README](README.md).

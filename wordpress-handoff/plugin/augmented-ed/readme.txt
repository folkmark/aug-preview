=== AugmentED ===
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 8.0
Stable tag: 1.1.4
License: Proprietary

The AugmentED pages, team and Follow form, drawn inside the site's own theme.

== Description ==

Five page templates (Home, The Challenge, Our Approach, Who We Are, Follow Our Work), the
AugmentED team as posts of the site's existing `team` type with AugmentED-styled bio pages,
and a Follow form that submits to HubSpot through the server.

A member can be taken off the Who We Are page without being deleted: tick Archived in their
AugmentED card. The import does the same for people AugmentED has archived.

Everything the pages use ships inside the plugin: fonts, images, the animation frames and
their scripts. Nothing is uploaded to the media library.

== Installation ==

Take a backup point first (on WP Engine: User Portal → Backups → Back up now).

1. Plugins → Add Plugin ("Add New Plugin" in older WordPress) → Upload Plugin → choose the
   plugin zip (augmented-ed-plugin.zip from AugmentED; augmented-ed.zip if built locally) →
   Install Now → Activate Plugin.
2. Tools → AugmentED team → "Create the pages as drafts" (or give five pages the AugmentED
   templates yourself).
3. Once AERDF has created the HubSpot form (START-HERE step 3; AugmentED has set up
   nothing in HubSpot): Settings → AugmentED → Portal ID, Form ID, Privacy policy URL →
   Save Changes → "Send test submission".
4. Tools → AugmentED team → Dry run, then Import.
5. Review and publish the five pages; on production, in the same sitting as the import.

The full procedure, the decisions to settle first, rollback, and who to ask are in
wordpress-handoff/START-HERE.md in the AugmentED repository:
https://github.com/folkmark/aug-preview/blob/main/wordpress-handoff/START-HERE.md

== Changelog ==

= 1.1.4 =
* Share cards: each AugmentED page, and each Leadership bio page, now has its own picture when
  a link to it is pasted into Slack, LinkedIn, email or a message, with the page's headline
  and photograph. Before, these pages had none, and links showed AERDF's default picture.
  A Social image set on a page in Yoast still takes priority.

= 1.1.3 =
* Test installs: switching on the stand-in team type now rebuilds WordPress's address rules
  once, so the Leadership bio pages open without saving Settings -> Permalinks first. No
  change on aerdf.org, which has its own team type.

= 1.1.2 =
* Docs: the HubSpot set-up is AERDF's alone; AugmentED has not set up or tested anything
  in AERDF's HubSpot.
* Team: Ryan Baker has a new headshot. Nothing of it fades; his hair is cut straight on the
  right where the photograph ends. Run the import after updating.

= 1.1.1 =
* The Follow form's rate limit also counts by the connecting address, which a forged
  CF-Connecting-IP header cannot change.
* Image and headshot URLs carry ?ver=, so a replaced file reaches returning visitors
  despite aerdf.org's year-long browser cache.
* "Update URI: false": WordPress never offers a wordpress.org plugin of the same name as an
  update to this one.
* The HubSpot private app token is never printed back into the settings page, and the
  browser cannot autofill a password into it.
* A refused import says "Nothing imported", and its messages name the options as the
  screen labels them. The dry run reports the categories an attach adds.
* The block editor shows the same "drawn by the AugmentED plugin" notice as the classic one.
* A dry run keeps its options (status, Attach, the tick boxes) for the Import that follows,
  and says whether Import will create people published or as drafts.
* Settings → AugmentED says when an installed version has team changes the site does not
  have yet, so an update is never left un-imported.
* "Skip to content" is hidden by clipping until it has focus, so it no longer shows over
  AERDF's header.
* Team: Joan Lee is Educational Consultant; Chris Daniels is Finance Advisor, with LinkedIn;
  Allison Rapoport's, Nicolle DeSilva's and Ryan Baker's headshots no longer fade at the
  edges, and Byungyeon Yun's barely does. Run the import after updating.
* The bio page's JSON-LD cannot be ended early by a "</script>" in a role or bio, and the
  bio template's variables carry the plugin's prefix.

= 1.1.0 =
* Headshots in colour at rest; the colour-on-hover bloom, its script and the second set of
  headshot files are gone.
* Who We Are has a fifth group, Strategy, right below Leadership; the import creates its
  category.
* Bio pages for Leadership only. A team imported under 1.0.0 keeps sixteen other bios as
  post content, which still draws "Read bio": clear those posts' content by hand.

= 1.0.0 =
First release.

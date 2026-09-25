=== AugmentED ===
Requires at least: 6.5
Requires PHP: 8.0
Stable tag: 1.0.0
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

1. Plugins → Add New → Upload Plugin, choose augmented-ed.zip, Activate.
2. Tools → AugmentED team → "Create the pages as drafts" (or give five pages the AugmentED
   templates yourself).
3. Tools → AugmentED team → Dry run, then Import.
4. Settings → AugmentED → HubSpot portal ID and form ID → Save → "Send test submission".
5. Publish the pages.

The full procedure, and the decisions to settle first, are in wordpress-handoff/START-HERE.md
and DECISIONS.md in the AugmentED repository.

== Changelog ==

= 1.0.0 =
First release.

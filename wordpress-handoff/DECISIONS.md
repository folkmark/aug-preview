# AugmentED on aerdf.org — decisions

Each decision the plugin cannot make for AERDF or AugmentED, with what it does until someone
decides. **Owner** is who should decide. The first three block launch; the rest have a
working default. Brendan is AugmentED's side of the build: [brendan@folkmark.com](mailto:brendan@folkmark.com). If nobody is available to decide later,
the default is what ships, and it is safe to keep.

## Blocking

### The address, and the existing AugmentED page — AERDF web team

- **Default:** the pages at `/augmented/` (Home) with the other four under it:
  `/augmented/challenge/`, `/augmented/approach/`, `/augmented/team/`,
  `/augmented/follow/`. That is where "Create the pages as drafts" puts them.
- Today `/augmented/` redirects to the existing AugmentED page,
  `/opportunities/advanced-fellows/augmented/` (page 11371). WordPress does that on its own:
  an address with no page of its own is sent to the page whose slug matches, and that page's
  slug is `augmented` (checked 2026-10-06: a 301 with `x-redirect-by: WordPress`, not a
  Redirection rule). Publishing a page at `/augmented/` gives that address a page of its
  own, and the redirect stops.
- Decide whether page 11371 stays (and links to the new pages), is redirected to
  `/augmented/` (a Redirection rule, source `/opportunities/advanced-fellows/augmented/`), or
  is unpublished. **Until decided:** it stays exactly as it is.
- `/team/` cannot be the address of Who We Are: it is the archive of AERDF's team post type.
- The pages link to each other by template, so any address works and can change later.

### The HubSpot form — AERDF's HubSpot owner

- **All of it is AERDF's.** AugmentED has not created, configured or tested anything in
  AERDF's HubSpot, and has no access to it. The persona property, the form, CAPTCHA, the
  list or workflow, and the contacts are AERDF's to set up and own. The plugin's half is
  the HubSpot fields in Settings → AugmentED (START-HERE step 3).
- **Default:** submissions are refused (with a polite message) until a portal and form are
  set in Settings → AugmentED.
- Which list or workflow the form feeds, and who owns the resulting contacts.
- The persona property (default name `augmented_persona`) and its nine values.
- The consent sentence and the privacy policy URL. Default sentence: "I agree to the privacy
  policy"; the plugin links "privacy policy" when a URL is set.
- Optional: a subscription type the consent opts into.
- CAPTCHA must be off on this form (HubSpot refuses API submissions otherwise).
- **2027:** HubSpot ends support for its v1–v3 APIs in September 2027, and the endpoint used
  today is v3. HubSpot publishes the per-endpoint replacements in March 2027; the change is
  one class in the plugin (`includes/follow.php`, `Augmented_ED_HubSpot`), and it may need a
  private-app token, which Settings already accepts. Only AERDF can create that token in its
  HubSpot.

### The Avenir licence — AERDF

- The plugin serves Avenir LT Pro (Light, Book, Roman, Medium, Heavy; Black is declared but
  unused) from its own folder, as the AugmentED site does. aerdf.org's own Avenir files
  currently all return 404 (Use Any Font, Elementor custom fonts and the theme's), so
  AERDF's licence terms are worth confirming at the same time.
- Record who confirmed it.

## With a working default

### Program bar on phones — AugmentED

- **Default:** it stays at the top while scrolling, as the AugmentED site's header does.
  Settings → AugmentED can make it scroll away with AERDF's header, as Assessment for Good's
  bar does on phones.

### Two menus on a phone — AugmentED

- AERDF's header has its own menu button, directly above AugmentED's.
- **Default:** AugmentED's button carries a visible word, "Menu", beside its bars.
- Alternatives: no word; a different word; no AugmentED menu on phones at all (the
  AugmentED pages would then only be reachable through AERDF's menu and in-page links).

### The home page's first screen — AugmentED

- Under AERDF's alert bar and header, the AugmentED content starts 189px down on a laptop
  (185px on a phone), where the site's starts at 96px. The hero behaves as on the site once
  AERDF's header has scrolled away: its geometry is measured from where it pins, and its
  copy's fade waits for it.
- The first screen before that scroll shows AERDF's header, the bar, and the hero's
  headline, copy and buttons, with the desk below the fold. Screenshots are in the
  verification report.

### Sherry Lachman's and Caitlin Mills's pages and titles — AugmentED, with AERDF

- They are AERDF leadership as well, and AERDF's own pages link to their existing team pages.
- **Default:** those pages stay exactly as they are (AERDF's template and AERDF's text); the
  AugmentED Who We Are grid links to them.
- Titles differ: AERDF has "Executive Director of AugmentED" for Sherry; AugmentED has
  "Founder & Executive Director". The grid shows AugmentED's; AERDF's pages keep AERDF's.
- Either can be switched to the AugmentED bio page (the card's "Bio page style"), or have
  AugmentED's bio imported over AERDF's (Import with "Replace existing posts' content with the AugmentED bio" ticked).

### New team members: published or draft — AERDF web team

- **Default:** published, as other programmes' members are. The import can create them as
  drafts instead. Either way, on production the import runs straight before the pages are
  published (START-HERE step 5), so the people are not live before the pages they link to.
- They appear wherever AERDF lists all team posts — the `/team/` archive, search, the team
  sitemap — like every other programme's members, and in a new category archive at
  `/category/augmented-team/`. AERDF's own team listings (Our Team) filter by their own
  categories and are unaffected.
- The people without a bio have no page of their own: theirs redirects to Who We Are and is
  left out of the sitemap. Since October 2026 that is everyone outside Leadership (31 today):
  the client asked for bios on Leadership alone.

### Archived members — AugmentED, with AERDF

- AugmentED's roster marks people who have left the page as **Archived**, instead of deleting
  them. Six are archived today (four Education Fellows who left in September, two Technology
  Partners who left in August); none was ever on aerdf.org, so the import only reports them
  as absent.
- **Default:** an archived team post stays published, off the Who We Are grid, with its page
  redirected to Who We Are and left out of the sitemap. It still appears wherever AERDF
  lists every team post (the `/team/` archive, search). To take one out of those too, set it
  to Draft; the plugin never changes a post's status itself.
- The tick box is plain post meta, not a WordPress tag or category, so there is no public
  page listing who has been archived.

### AERDF's job-title field — AERDF web team

- AERDF's team pages show a job title from a field of AERDF's own (an ACF or JetEngine field
  on the Team type), which the plugin cannot identify from outside.
- **Default:** none. The Who We Are grid shows AugmentED's roles either way; the AugmentED
  people's own AERDF team pages (where they have one) show no title.
- To fill it, pick the field under Settings → AugmentED → "AERDF's job-title field" before
  importing. The import then writes each role there, only where it is empty. START-HERE
  step 4 says how to find the field.

### AugmentED in AERDF's navigation — AERDF web team

- **Default:** the plugin adds nothing to AERDF's menus. The AugmentED pages reach each
  other through the program bar under AERDF's header, and the rest of aerdf.org reaches
  them through whatever links to `/augmented/` (and through the existing AugmentED page, if
  it is kept and links on).
- Decide whether AERDF's own navigation links to the AugmentED home, and where.

### Who edits the team after launch — AugmentED

- **Default:** WordPress. Edits there are kept: the import skips any card edited since.
- If the repository stays the source instead, re-run the import after each change (with
  "Update cards edited in WordPress since the last import" ticked for cards also edited in
  WordPress).
- A person added in WordPress without a bundled headshot shows their featured image, or a
  placeholder square.

### Required fields on the form — AugmentED

- **Default:** first name, last name, email, message and consent, as the AugmentED site's
  source intends. (The live site requires nothing: its framework drops the attribute.)
- "Which best describes you?" defaults to Educator, as on the site.
- The nine options stay in one column, as the site renders them. The site's source asks for
  a responsive grid that its runtime never applied.

### Keyboard focus on the form — decided

- The design system draws no focus state on inputs. The plugin adds a visible outline for
  keyboard focus on the form's fields and controls.

### Preview-domain redirects — AugmentED

- `augmented2.folkmark.com` links are in circulation. Once the production address is live,
  point the preview domain at it. This is a DNS or GitHub Pages change, not a WordPress one.

### Search titles — AERDF web team

- **Default:** Yoast titles and descriptions are filled from the AugmentED site's own
  ("Who We Are | AugmentED", …) when the pages are created, and each bio's description is
  its first sentence. AERDF's usual title pattern can replace them in Yoast.

### Delivering the zip — AugmentED

- **Default:** download the `augmented-ed-plugin` artifact from the latest run of the
  "Publish site to gh-pages" workflow **on `main`**, never from a pull request's run (those
  build unmerged changes under the same version number). The run's summary gives the plugin
  version, the commit and the zip's SHA-256: send the zip with the SHA-256, and say which
  version START-HERE describes.
- **Keep a copy of every zip sent.** Artifacts from `main` expire after 90 days, and the
  previous zip is how AERDF rolls an update back.
- The repository is public, so anyone signed in to GitHub can download those artifacts too.
  The Avenir files inside are already public in the repository (`_ds/`) and on the preview
  site, so this adds no exposure. If the licence says otherwise, it affects those as well.
  The alternative is to drop the upload from CI and build the zip locally
  (`node tools/build-wp-plugin.mjs --assemble dist --zip`, which writes
  `dist/augmented-ed.zip`).

# AugmentED on aerdf.org — decisions

Each decision the plugin cannot make for AERDF or AugmentED, with what it does until someone
decides. **Owner** is who should decide. The first three block launch; the rest have a
working default.

## Blocking

### The address, and the existing AugmentED page — AERDF web team

- **Default:** the pages at `/augmented/` (Home) with the other four under it:
  `/augmented/challenge/`, `/augmented/approach/`, `/augmented/team/`,
  `/augmented/follow/`. That is where "Create the pages as drafts" puts them.
- Today `/augmented/` redirects to the existing AugmentED page,
  `/opportunities/advanced-fellows/augmented/` (page 11371), which WordPress does because the
  page once had that slug. Publishing a page at `/augmented/` replaces that redirect.
- Decide whether page 11371 stays (and links to the new pages), is redirected to
  `/augmented/` (a Redirection rule, source `/opportunities/advanced-fellows/augmented/`), or
  is unpublished.
- `/team/` cannot be the address of Who We Are: it is the archive of AERDF's team post type.
- The pages link to each other by template, so any address works and can change later.

### The HubSpot form — AERDF's HubSpot owner, with AugmentED

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
  private-app token, which Settings already accepts.

### The Avenir licence — AERDF

- The plugin serves Avenir LT Pro (Light, Book, Roman, Medium, Heavy; Black is declared but
  unused) from its own folder, as the AugmentED site does. aerdf.org's own Avenir files
  currently all return 404 (Use Any Font, Elementor custom fonts and the theme's), so
  AERDF's licence terms are worth confirming at the same time.
- Record who confirmed it.

## With a working default

### Program bar on phones — Brendan

- **Default:** it stays at the top while scrolling, as the AugmentED site's header does.
  Settings → AugmentED can make it scroll away with AERDF's header, as Assessment for Good's
  bar does on phones.

### Two menus on a phone — Brendan

- AERDF's header has its own menu button, directly above AugmentED's.
- **Default:** AugmentED's button carries a visible word, "Menu", beside its bars.
- Alternatives: no word; a different word; no AugmentED menu on phones at all (the
  AugmentED pages would then only be reachable through AERDF's menu and in-page links).

### The home page's first screen — Brendan

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
  AugmentED's bio imported over AERDF's (Import with "Replace existing content").

### New team members: published or draft — AERDF web team

- **Default:** published, as other programmes' members are. The import can create them as
  drafts instead.
- They appear wherever AERDF lists all team posts — the `/team/` archive, search, the team
  sitemap — like every other programme's members, and in a new category archive at
  `/category/augmented-team/`. AERDF's own team listings (Our Team) filter by their own
  categories and are unaffected.
- The eight without a bio have no page of their own: theirs redirects to Who We Are and is
  left out of the sitemap.

### Who edits the team after launch — AugmentED

- **Default:** WordPress. Edits there are kept: the import skips any card edited since.
- If the repository stays the source instead, re-run the import after each change (with
  Force for cards also edited in WordPress).
- A person added in WordPress without a bundled headshot shows their featured image (without
  the colour bloom), or a placeholder square.

### Required fields on the form — AugmentED

- **Default:** first name, last name, email, message and consent, as the AugmentED site's
  source intends. (The live site requires nothing: its framework drops the attribute.)
- "Which best describes you?" defaults to Educator, as on the site.
- The nine options stay in one column, as the site renders them. The site's source asks for
  a responsive grid that its runtime never applied.

### Keyboard focus on the form — decided

- The design system draws no focus state on inputs. The plugin adds a visible outline for
  keyboard focus on the form's fields and controls.

### Preview-domain redirects — Brendan

- `augmented2.folkmark.com` links are in circulation. Once the production address is live,
  point the preview domain at it. This is a DNS or GitHub Pages change, not a WordPress one.

### Search titles — AERDF web team

- **Default:** Yoast titles and descriptions are filled from the AugmentED site's own
  ("Who We Are | AugmentED", …) when the pages are created, and each bio's description is
  its first sentence. AERDF's usual title pattern can replace them in Yoast.

### Delivering the zip — Brendan

- **Default:** download the `augmented-ed-plugin` artifact from the repository's latest
  workflow run and send it. Artifacts are kept 90 days from main.

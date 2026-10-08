# AugmentED on aerdf.org — decisions for AERDF

What AERDF needs to decide. The first three block launch. The rest have a default that ships
if nobody decides, and each default is safe to keep. AugmentED's own design decisions are
settled and are not listed here; they are in [the handoff README](README.md#decisions).

## Before launch

### The address, and the existing AugmentED page — AERDF web team

- **Default:** Home at `/augmented/`, with `/augmented/challenge/`, `/augmented/approach/`,
  `/augmented/team/` and `/augmented/follow/` under it. "Create the pages as drafts" puts
  them there, and any address works: the pages link to each other by template.
- Today `/augmented/` redirects to the existing AugmentED page,
  `/opportunities/advanced-fellows/augmented/` (page 11371). That redirect is WordPress's own
  (the page's slug is `augmented`), not a Redirection rule, and it stops when a page is
  published at `/augmented/`.
- **Decide** whether page 11371 stays (linking to the new pages), redirects to `/augmented/`
  (a Redirection rule), or is unpublished. Until then it stays as it is.
- Who We Are cannot be at `/team/`: that is the archive of AERDF's team post type.

### The HubSpot form — AERDF's HubSpot owner

- AugmentED has no access to AERDF's HubSpot and has set up nothing there. START-HERE
  [step 3](START-HERE.md#3-connect-the-follow-form) lists what the form needs.
- Until a portal and form are set in Settings → AugmentED, the form politely refuses
  submissions.
- **Decide** which list or workflow the form feeds, and who owns the contacts. The consent
  sentence ("I agree to the privacy policy"), the persona property name and an optional
  subscription type can be changed in Settings → AugmentED.

### The Avenir licence — AERDF

- The plugin serves its own Avenir LT Pro files, as the AugmentED site does. **Confirm**
  AERDF's licence covers them, and record who confirmed it.

## With a default

| Decision | Owner | Default |
|---|---|---|
| A link to AugmentED in AERDF's own navigation | AERDF web team | None. The pages reach each other through the AugmentED bar, and the rest of aerdf.org reaches them through links to `/augmented/`. |
| New team members published or draft | AERDF web team | Published, like other programmes' members. They appear in the `/team/` archive, search and the team sitemap, and in `/category/augmented-team/`. AERDF's own Our Team listings are unaffected. |
| Search titles | AERDF web team | Yoast titles and descriptions come from the AugmentED site ("Who We Are \| AugmentED"). AERDF's usual pattern can replace them in Yoast. |
| Sherry Lachman's and Caitlin Mills's pages | AERDF, with AugmentED | Their AERDF pages stay as they are, and Who We Are links to them. Their titles differ: AERDF has "Executive Director of AugmentED" for Sherry, AugmentED "Founder & Executive Director". Each card's "Bio page style" can switch a person to the AugmentED bio page instead. |

## Later: HubSpot's API change in 2027

HubSpot ends support for the API version the form uses in September 2027, and publishes the
replacements in March 2027. The change is one class in the plugin (`Augmented_ED_HubSpot` in
`includes/follow.php`), and it may need a HubSpot private-app token, which Settings →
AugmentED already accepts. Only AERDF can create that token.

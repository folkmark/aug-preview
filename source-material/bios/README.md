# Team bios

One file per person, and the only place their bio text lives. `tools/build-site.mjs`
reads this directory and emits a page per file at `/team/<slug>/`; the Who We Are page
links to them from each person's card.

Anyone can have one, in any group. Until September 2026 only Leadership did; the rest
of the team's bios came from the same "Website Bio tracking" sheet and were added then,
word for word, for everyone the sheet had one for. Abby (Csaba) Petre's came from her
directly on 25 September, with her title, and is as she sent it. People with no bio have
no file and no link, and their card is unchanged.

The format is three parts and nothing else:

```
# Full Name
## Role line

First paragraph.

Second paragraph.
```

`<slug>` is the filename. The role line is the one on the person's card. Their
affiliation and location (a Fellow's school and city) are not repeated here: the page
reads them off the card, the same way it reads their LinkedIn and website, so the card
stays the one place those are written.

**A page is built only when the team page links to it** — when a card in `index.html`
carries `href="team/<slug>/"`. A file nothing links to is skipped with a warning, not
published. That is deliberate: a bio written ahead of the person being announced should
not go live the moment it is committed, and an unlinked page on a public site is still a
published page.

Blank lines separate paragraphs. There is no Markdown parser here: bold, links and lists
are not rendered, they ship as literal characters. Keep it to prose. If a bio ever needs
more than that, the parser is about ten lines in `readBios()` in `tools/build-site.mjs`,
and the design system already has type styles for it. Apostrophes are typographic (’),
as on the rest of the site; the sheet's are mostly straight and were converted, and
nothing else about anyone's wording was changed.

`unused/` is where a bio goes to be kept but not published; the build does not read it.
There is none at the moment — Brandon Bodnar's was the last one there, parked when he
moved to Technology and Design Partners and back now that partners have pages — and git
keeps no empty directory, so create it when it is needed. Moving a file into it takes
the page down without losing the text; moving it back up a level, with the link on the
card, re-publishes it.

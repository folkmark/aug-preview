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

**A page is built only for someone on the page.** Every bio here belongs to someone in the
team roster, `source-material/team/people.json` (the build fails on one that does not), and
the roster decides who appears: a person with a group who is not tagged `Archived` gets a
tile, and a tile gets a "Read bio" link when their file exists here. Everyone else's bio is
kept and not built — the build lists them as "bios kept, not built" — so it is here with
all their other details the day they come back. That is also why a bio can be written
ahead of someone being announced: until the roster gives them a group, nothing publishes.

Blank lines separate paragraphs. There is no Markdown parser here: bold, links and lists
are not rendered, they ship as literal characters. Keep it to prose. If a bio ever needs
more than that, the parser is about ten lines in `readBios()` in `tools/lib/bio-page.mjs`,
and the design system already has type styles for it. Apostrophes are typographic (’),
as on the rest of the site; the sheet's are mostly straight and were converted, and
nothing else about anyone's wording was changed.

The three archived people the tracker has bios for — Ted Cuevas, Adam Bachman and Suzanna
Smith — have theirs here, word for word from the sheet, with apostrophes made typographic.
(`unused/`, where a bio used to be parked to take its page down, is retired: the roster's
`Archived` tag does that now, without moving the file.)

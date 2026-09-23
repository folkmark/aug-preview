# Leadership bios

One file per person, and the only place their bio text lives. `tools/build-site.mjs`
reads this directory and emits a page per file at `/team/<slug>/`; the Who We Are page
links to them from each leadership card.

The format is three parts and nothing else:

```
# Full Name
## Role line

First paragraph.

Second paragraph.
```

`<slug>` is the filename. **A page is built only when the team page links to it** —
when a card in `index.html` carries `href="team/<slug>/"`. A file nothing links to is
skipped with a warning, not published. That is deliberate: a bio written ahead of the
person being announced should not go live the moment it is committed, and an unlinked
page on a public site is still a published page.

Blank lines separate paragraphs. There is no Markdown parser here: bold, links and lists
are not rendered, they ship as literal characters. Keep it to prose. If a bio ever needs
more than that, the parser is about ten lines in `readBios()` in `tools/build-site.mjs`,
and the design system already has type styles for it.

`unused/` holds bios that are kept but not published, and the build does not read it.
`unused/brandon-bodnar.md` is there because he moved to Technology and Design Partners
in September 2026 and partners do not carry bios. Keeping the file means the text is not
lost; moving it back up a level and adding the link to his card re-publishes it.

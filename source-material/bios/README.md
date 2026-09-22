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

`<slug>` is the filename, and it must match the `id` on that person's card in
`index.html` — the card's "Read bio" link is built from it. A file whose slug matches
nobody on the page builds a page that nothing links to; the build warns about it rather
than failing, because a bio written ahead of the card being added is a reasonable
intermediate state.

Blank lines separate paragraphs. There is no Markdown parser here: bold, links and lists
are not rendered, they ship as literal characters. Keep it to prose. If a bio ever needs
more than that, the parser is about ten lines in `bioPages()` and the design system
already has type styles for it.

`brandon-bodnar.md` is here and has no page. He moved to Technology and Design Partners
in September 2026, and partners do not carry bios — keeping the file means the text is
not lost and re-enabling it is one line if that changes.

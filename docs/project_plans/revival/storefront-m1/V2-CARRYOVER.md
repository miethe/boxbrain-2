# Storefront M1: BoxBrain v2 carryover

The storefront is an entry to the existing BoxBrain vision, using the fictional Northstar practice. The M0 directions supply hierarchy; the v2 prototype supplies the visual language.

- **Tokens:** slate canvas and text, white surfaces, fine slate borders, dark `#0b1220` navigation, blue `#2563eb` primary, violet AI and green/amber status semantics; Instrument Sans/Inter system fallback, compact radii and restrained shadows.
- **Components:** inline SVG brand and icon sidebar with active navigation, a white page-title/search header, whole-card links with dark titles, type chips, descriptions and quiet metadata, coloured library type tiles and numbered Play Flow rows. The offering guide uses a prominent bordered surface. Links remain real links and the situation doorway works without JavaScript.
- **Seller:** Field Guide ordering puts search in the header, followed by the problem-first doorway, plays, ready assets and offerings. Play Flow and library cards borrow the v2 visual patterns without claiming prototype functionality.
- **Org-wide:** Editorial Atlas contributes the outcome-first story, entry cards and numbered offerings; the same v2 tokens and surfaces keep it related to the seller edition. Seller-only Plays are absent, including Editorial templates and exports.
- **Later application scope:** Ask/AI, accounts, opportunities, storyboards and the work-product builder remain in the larger app vision. This storefront does not reproduce their controls or imply those flows exist.

The two editions share theme-owned `v2/Shell.astro`, `Card.astro`, `Icon.astro` and `Browse.astro`. The shell is composed inside each theme page; CSS suppresses the shared layout's generic navigation in these two themes only. Neutral, Alternate, the loader, view models and data contracts are untouched. Search submits a GET form to the practice library without JavaScript; home additionally retains the shared interactive search. Type tiles describe the content rather than claiming a visual preview. No prototype people, metrics, avatars or stock imagery are carried forward.

References: `project/styles_v2.css`, `project/src_v2/shell.jsx`, Library and Plays routes, `project/uploads/library-all.png`, `plays-detail-view.png`, `content-unit-library.png`, and spec §12.

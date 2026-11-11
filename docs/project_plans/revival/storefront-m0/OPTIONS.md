# Visual directions for selection

Design only; no direction has been selected or built. All six images were generated independently with the native image generation tool, using the fictional Northstar Operations practice and its Service Blueprint offering. Each pair explores a different information hierarchy, not a palette swap. The PNGs are comparison mockups, not exported browser pages or evidence of working controls.

## Editorial Atlas

**Pitch:** Make the practice memorable through outcomes, an editorial voice and evidence.

[Practice home](mockups/editorial-home.png) · [Offering page](mockups/editorial-offering.png)

Home hierarchy: promise → three offerings → featured example. Offering hierarchy: outcome → approach → case study → collateral. The illustrated arches provide identity rather than a data visualization. Warm paper, serif display type, cobalt links and fine rules make it feel like a practice publication.

Makes easy: introducing the practice to the wider organization; explaining what an offering entails; remembering a small portfolio. Makes hard: a seller reaching a stage-specific tool quickly; showing a growing catalog without long editorial pages. Relative build cost: **medium, about 1.15× Field Guide**, driven by responsive editorial layouts and reusable illustration art direction. These are design estimates, not quotes.

**Image inspection:** both pages are legible at full size; the offering footer edition label is the smallest text and should be enlarged in a build. Home shows all three offerings without clipping. The generated navigation includes “Plays” in the org-wide edition even though the sample has no visible plays: omit that link in implementation. The offering mock's reading-guide description implies a curated collection; the actual sample link is explicitly an example-domain behavior fixture, so replace that description with the record's honest summary. No other unreadable text noticed. The fictional six-week case must retain its fictional label and no-guarantee explanation on its detail page.

## Seller Field Guide

**Pitch:** Help a seller prepare the next useful conversation in two clicks.

[Practice home](mockups/field-guide-home.png) · [Offering page](mockups/field-guide-offering.png)

Home hierarchy: search → two sales plays → ready-to-use assets → offering list. Offering hierarchy: listen/ask/position/avoid → collateral → delivery steps and related play. Persistent navigation supports repeat use. Navy sidebar, clear sans-serif text, orange actions and light green metadata communicate a working handbook.

Makes easy: learning how to position an offer; finding a discovery aid; avoiding unsupported promises; linking a play to an offering and asset. Makes hard: telling a differentiated practice story at first glance; showcasing evidence when the seller task dominates. Relative build cost: **low, baseline 1.0×**, since ordinary navigation, lists and sections carry most of the design.

**Image inspection:** all main text is readable. The offering's last delivery step wraps tightly inside a small tile; give it more width or stack the steps on smaller screens. The home headline is long and needs a responsive line break. The generated orange action gradients and card-inside-panel treatment are illustrative, not requirements; use simpler flat surfaces in the build. “Deck” labels must become “Markdown deck source” for these sample assets. No unreadable strings or clipped sections noticed at full size. The offering includes Decision Flow questions because that sample record explicitly relates to both offerings.

## Situation Navigator

**Pitch:** Start with the client's problem and guide the seller to a fitting offering and play.

[Practice home](mockups/navigator-home.png) · [Offering page](mockups/navigator-offering.png)

Home hierarchy: choose a situation → recommended offering → conversation path. Offering hierarchy: good fit/another route → expected deliverables → approach and next action. Forest green, lime selection and a simple journey illustration emphasize decisions rather than catalog scanning. The selector is an authored lookup from Practice.situations, not an AI assistant or inferred diagnosis.

Makes easy: discovery for someone who doesn't know the offering names; choosing between Service Blueprint and Decision Flow; moving from a client symptom to a conversation. Makes hard: ambiguous/multiple situations; catalog browsing without an obvious problem; maintaining situation mappings as practices grow. Relative build cost: **medium-high, about 1.3× Field Guide**, for URL-addressable selection state, keyboard behavior and meaningful fallback navigation.

**Image inspection:** titles and body copy are readable; home conversation-path text is dense near the lower edge and needs more vertical breathing room. The offering's delivery steps wrap over several lines but remain legible. Lime must be tested for contrast and may need darkening for focus/border indicators; contrast cannot be certified from a raster mock. The illustration's Request/Assess/Prepare/Deliver/Close labels describe an example service journey, not the offering's three delivery steps. “Situation Navigator” is a comparison label in the generated mock, not required product chrome. “Deck” needs the sample's truthful format label. No unreadable strings noticed.

## Ranked recommendation

1. **Seller Field Guide** — best matches the first users, the practice's own sellers. Its hierarchy uses the existing play and asset relationships directly and is the smallest path to a useful site. Keep the same layout family for the org-wide build but lead with offering summary and evidence after removing seller sections.
2. **Situation Navigator** — strongest guided discovery for unfamiliar sellers. Choose it if problem-led entry matters more than quick direct access and the practice owner can maintain the situation lookup.
3. **Editorial Atlas** — strongest showcase, but it puts the first users' sales preparation further down the journey. Choose it if wider-organization presentation becomes the near-term priority.

Nick's selection is the entry condition for PLAN.md. A hybrid would need one revised pair before implementation; do not quietly build a fourth direction.

## Generation and QA record

Native generation returned slightly different canvas sizes: Editorial home 1568×1003; Editorial offering 1586×992; Field Guide home/offering and Navigator home/offering 1568×1003. All originals were proportionally fitted and centered onto a white **1600×1000** PNG canvas with ImageMagick; no text or composition was replaced, stretched or cropped. Thin white margins are export normalization, not intentional page gutters. Generated originals remain in the native tool's storage; committed PNGs are the design handoff. The initial system `sips` export failed because its temporary directory was sandbox-denied; ImageMagick completed normalization without changing permissions.

Every committed PNG was opened locally with the image viewer and inspected; no browser capture was attempted. This satisfies image review for M0. Responsive behavior, interactive accessibility and real-browser screenshots remain build-leg work in an eligible browser lane, not claims made by this package.

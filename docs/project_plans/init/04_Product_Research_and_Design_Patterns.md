# BoxBrain v2 Product Research and Design Patterns

**Prepared on:** 2026-05-02  
**Purpose:** Synthesis of adjacent products, design patterns, and implementation implications for BoxBrain v2.  

---

## 1. Research summary

BoxBrain v2 sits at the intersection of five product categories:

1. **Sales enablement/content management** — Highspot, Seismic, Showpad.
2. **Knowledge governance and enterprise AI trust** — Guru and similar governed knowledge layers.
3. **Presentation authoring and brand systems** — Pitch, Canva, Microsoft Copilot in PowerPoint.
4. **Structured/composable content platforms** — Contentful, Sanity, headless CMS patterns.
5. **Visual collaboration/storyboarding workspaces** — Miro/FigJam-style collaborative canvases.

The core insight from research: many tools solve parts of the problem, but BoxBrain’s strongest position is the combination of **slide-native decomposition**, **family/variant/version governance**, **storyboard-centered composition**, and **trust/provenance-first AI recommendations**.

---

## 2. Adjacent product category analysis

### 2.1 Sales enablement and content management platforms

Representative examples: Highspot, Seismic, Showpad.

#### Patterns worth borrowing

- Centralized, governed content library.
- AI-assisted search and Q&A over approved content.
- Content recommendations based on selling scenario, persona, and stage.
- Analytics showing content usage and buyer engagement.
- Role-based permissions, version control, audit trails.
- Integration into existing work systems such as CRM, email, Slack, CMS, DAM.
- Playbook/program strategy concepts.

#### BoxBrain implication

BoxBrain should borrow the governed-content and recommendation patterns but avoid becoming a broad sales enablement suite too early. The MVP should focus on the reusable slide/content graph and composition workflows that sit below many GTM, consulting, internal strategy, and proposal workflows.

#### Product gap BoxBrain can exploit

Traditional enablement tools often organize assets at file or content-item level. BoxBrain’s advantage is modeling **atomic slide/page units**, **mini-story blocks**, and **family/variant/version relationships** directly.

---

### 2.2 Knowledge governance and enterprise AI trust

Representative example: Guru.

#### Patterns worth borrowing

- Verification status visible in search and answers.
- Human expert review for high-stakes content.
- Automated verification or stale detection for scale.
- Quality logs and transparent decision history.
- Role-scoped answers and source transparency.
- Knowledge gaps and duplicate/conflict detection.

#### BoxBrain implication

BoxBrain should make trust visible everywhere: search results, family cards, detail pages, storyboard slots, and publish/package flows. Verification-like workflows map well to approval, freshness, stale content, and review queues.

#### Product gap BoxBrain can exploit

Knowledge tools are not usually presentation-native. BoxBrain can make trust operational for slides, decks, narrative blocks, and composed storyboards rather than only articles/cards/docs.

---

### 2.3 Presentation authoring and brand systems

Representative examples: Pitch, Canva, Microsoft Copilot in PowerPoint.

#### Patterns worth borrowing

- Brand kit and brand-template enforcement.
- Template galleries and structured starting points.
- Collaboration and comments on presentations.
- Slide-level statuses and assignees.
- AI-assisted draft generation.
- Share links, rooms, and engagement analytics.
- Speaker notes and presentation prep.

#### BoxBrain implication

BoxBrain should support brand/trust indicators and storyboard composition, but should not attempt full native slide editing in the MVP. It should complement PowerPoint/Pitch/Canva by helping users find, compare, govern, and assemble trusted content.

#### Product gap BoxBrain can exploit

Authoring tools optimize creation. BoxBrain optimizes governed reuse, variant comparison, provenance, and composition across large corpora of enterprise materials.

---

### 2.4 Structured and composable content platforms

Representative examples: Contentful, Sanity, headless CMS patterns.

#### Patterns worth borrowing

- Content models define structure and relationships.
- Reusable components prevent rebuilding content repeatedly.
- Separation of content from presentation enables reuse across channels.
- Reference fields/linked content create composable experiences.
- Visual modelers help align product, design, and development around content architecture.
- Structured naming conventions and governance make reuse possible.

#### BoxBrain implication

BoxBrain should treat content modeling as a first-class product feature, not only a database design. Family/variant/version modeling, ContentBlocks, and build manifests are the BoxBrain equivalent of composable structured content.

#### Product gap BoxBrain can exploit

Headless CMSs are usually web/content-channel oriented. BoxBrain can apply structured content modeling to enterprise slide decks, narratives, and business work products.

---

### 2.5 Visual collaboration and storyboard workspaces

Representative examples: Miro, FigJam, whiteboard/canvas tools.

#### Patterns worth borrowing

- Collaborative spatial work surfaces.
- Drag/drop organization.
- Cards, frames, sections, and journey-like flows.
- Lightweight comments and async review.
- Templates for recurring workflows.
- AI assistance for summarization, clustering, and next-step suggestions.

#### BoxBrain implication

Storyboard should feel collaborative and visual, but it should be more structured than a whiteboard. The surface should be organized by sections and slots so it remains manifest-compatible and publishable.

#### Product gap BoxBrain can exploit

Whiteboards are flexible but often weak on content governance, provenance, versioning, and executable build manifests. BoxBrain can offer a governed storyboard rather than a freeform ideation canvas.

---

## 3. Recommended UX design patterns

### 3.1 Family-first browsing

**Problem:** Flat slide libraries overwhelm users with duplicates, near-duplicates, variants, and old versions.

**Pattern:** Show conceptual families first. Let users expand to variants and version history only when needed.

**Implementation details:**

- Family card with canonical preview.
- Variant count and version count.
- Current trust/freshness summary.
- Expand drawer or inline accordion.
- Toggle: “Show families” vs “Show variants.”

### 3.2 Multi-axis Variant Explorer

**Problem:** Users need to compare related content without confusing variants, versions, and similar slides.

**Pattern:** Provide a structured explorer with three zones:

- conceptual siblings/similar families;
- variants of the selected family;
- version history of the selected variant.

**Implementation details:**

- Horizontal rail for related/similar families.
- Vertical list/grid for variants.
- Right or bottom history lane for versions.
- Trust chips and link-source chips on each item.

### 3.3 Trust chips and provenance drawer

**Problem:** Users need confidence without opening admin views.

**Pattern:** Always show compact trust chips, with a drawer for details.

**Chips:**

- Approved / Review / Draft / Deprecated.
- Fresh / Aging / Stale.
- Canonical.
- AI-link / Manual-link / Hybrid-link.
- Restricted / Client-safe.

**Drawer:**

- origin;
- source file;
- source system;
- parent references;
- AI/human actions;
- where-used;
- approval chain;
- rights summary.

### 3.4 Compare panel

**Problem:** Reviewers need to decide whether items are duplicates, variants, versions, or merely similar.

**Pattern:** Side-by-side compare with synchronized metadata and rationale.

**Implementation details:**

- Visual preview side-by-side.
- Text diff/extracted text panel.
- Source/provenance comparison.
- Taxonomy and variant dimensions.
- AI rationale/confidence.
- Decision buttons with clear consequences.

### 3.5 Selection tray

**Problem:** Users often browse/search before knowing where content should go.

**Pattern:** Allow users to collect candidate units/blocks temporarily.

**Implementation details:**

- Tray persists during session.
- Add from search/library/detail.
- Bulk create ContentBlock.
- Bulk add to Storyboard section.
- Clear/save as Collection.

### 3.6 Storyboard sections and slots

**Problem:** Freeform canvases are hard to govern and publish.

**Pattern:** Use structured sections and slots.

**Implementation details:**

- Section header with title, summary, diagnostics, comment count.
- Slot card with selected object or gap placeholder.
- Slot purpose text.
- Required/optional flag.
- Swap/compare/recommend actions.
- Snapshot button.

### 3.7 Gap-first composition

**Problem:** Storyboards often reveal missing content.

**Pattern:** Let users add intentional “gap” slots and ask AI/library to fill them later.

**Implementation details:**

- Gap slot has purpose, audience, desired evidence type, required flag.
- Recommendations can be generated for a gap.
- Gaps contribute to diagnostics and content-coverage score.

### 3.8 Review queues with explicit action semantics

**Problem:** AI suggestions can create data-model damage if accepted too casually.

**Pattern:** Queue items are mini decision workflows.

**Implementation details:**

- Candidate type: duplicate, variant, similar, stale, approval, comment resolution.
- Rationale and confidence.
- Preview/compare.
- Action buttons with explanatory microcopy.
- Audit event on every resolution.

### 3.9 Where-used as a safety net

**Problem:** Curators need to know impact before deprecating or changing content.

**Pattern:** Where-used appears on detail pages and governance actions.

**Implementation details:**

- Used in WorkProducts.
- Used in ContentBlocks.
- Used in Storyboards.
- Used in Plays/Opportunities later.
- Warning before deprecating highly used content.

### 3.10 Progressive AI disclosure

**Problem:** Too much AI rationale becomes noise; too little erodes trust.

**Pattern:** Show compact explanation chips first, detailed rationale on demand.

**Implementation details:**

- “Why this result?” drawer.
- Component score visualization for admins/curators.
- AI confidence and model/pipeline reference.
- Human override status.

---

## 4. Product positioning

### 4.1 Recommended positioning statement

BoxBrain is a governed content graph and storyboard platform for teams that repeatedly reuse, adapt, and assemble business materials. It turns decks and artifacts into trusted reusable units, blocks, and storyboards with visible provenance, variants, versions, and AI-assisted recommendations.

### 4.2 What BoxBrain is

- Governed slide/content catalog.
- Content graph.
- Reusable narrative-block system.
- Storyboard-centered composition workspace.
- Human-governed AI recommendation layer.
- Trust/provenance layer for enterprise materials.

### 4.3 What BoxBrain is not

- Generic DAM.
- Search-only RAG tool.
- Presentation authoring replacement.
- CRM/sales enablement suite.
- AI deck generator as the primary product.

---

## 5. Design implications for the Claude Design handoff

The initial Claude Design single-HTML pass should be used for:

- visual direction;
- information hierarchy;
- motion/interaction inspiration;
- early product storytelling;
- component inventory.

It should not be used as:

- production component source;
- state-management architecture;
- accessibility baseline;
- routing or data-fetching structure;
- final interaction logic.

### Production design-system requirements

- Tokenized colors, spacing, typography, radius, shadow.
- Accessible chips, cards, menus, tabs, dialogs, drawers, forms.
- Reusable preview components for slide/page thumbnails.
- Shared comment and note components.
- Shared compare layout.
- Shared status/trust components.
- Storyboard slot/card components.
- Empty/loading/error states for every major surface.

---

## 6. Opportunity ranking by feature category

| Feature area | Novelty | Feasibility | Strategic value | MVP priority |
|---|---:|---:|---:|---:|
| Family/variant/version slide model | High | Medium | Very high | Critical |
| Family-first library UX | Medium-high | High | Very high | Critical |
| Slide-level provenance and trust | High | Medium | Very high | Critical |
| ContentBlocks as mini-stories | High | High | High | Critical |
| Storyboard as governed composition | High | Medium | Very high | Critical |
| Review queues for AI link candidates | Medium-high | Medium | High | Critical |
| Hybrid search with trust ranking | Medium | High | High | Critical |
| OpportunityWorkspace | High | Medium | High | Later |
| Play orchestration | High | Medium | High | Later |
| Publish/package flow | Medium | Medium | High | Later |
| Native slide editing | Low-medium | Low | Medium | Defer |

---

## 7. Recommended early demo narrative

A compelling early demo should tell this story:

1. Upload an old but useful deck.
2. BoxBrain decomposes it into slide units with provenance.
3. The Library groups similar conceptual content into families.
4. A user searches for “executive ROI proof.”
5. BoxBrain returns family-first results with approved/trusted variants.
6. User compares executive vs technical variants.
7. User adds chosen slides and a ContentBlock into a Storyboard.
8. BoxBrain flags a stale slide and suggests a fresher approved variant.
9. User snapshots the storyboard and leaves a review comment.
10. Curator resolves a duplicate/variant candidate in Reviews Hub.

This demo shows the wedge: not “AI made a deck,” but “BoxBrain found, trusted, governed, and assembled the right content.”

---

## 8. Source references

See `08_Source_Research_Registry.md` for full research source notes and URLs.

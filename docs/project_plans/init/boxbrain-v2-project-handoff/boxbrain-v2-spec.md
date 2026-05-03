---
title: BoxBrain v2 Final Product Specification
product: BoxBrain
version: 2.0
status: Final Canonical Spec
owner: Nick Miethe
last_updated: 2026-04-23
platform: Web application
author: ChatGPT
scope: Product, UX, data model, architecture, governance, and phased delivery
---

# 1. Executive Summary

BoxBrain v2 is an enterprise content intelligence, composition, and orchestration platform for reusable business materials.

It is designed for a world where AI has made content creation abundant, but has made curation, trust, reuse, comparison, orchestration, and retrieval the new bottlenecks.

BoxBrain v2 treats the following as first-class concepts:

- **ContentUnit**: the smallest atomic reusable unit
- **ContentBlock**: a purposeful grouping of ContentUnits that function together as a mini-story or reusable subassembly
- **WorkProduct**: a composed artifact such as a deck, brief, one-pager, document, or package
- **Play**: a reusable strategic blueprint or orchestration pattern
- **OpportunityWorkspace**: a context-specific orchestration and recommendation workspace
- **Storyboard**: the primary collaborative surface for composing, adapting, reviewing, and versioning structured outputs

BoxBrain v2 is not a slide library, a generic DAM, or just an AI search tool. It is a governed content graph and composition system.

---

# 2. Product Vision

BoxBrain v2 enables teams to:

- ingest and govern enterprise materials
- break artifacts into reusable atomic units
- link those units into meaningful reusable blocks
- track families, variants, versions, and similarities
- retrieve the best content for a use case, audience, opportunity, or artifact
- assemble WorkProducts and Storyboards from reusable components
- adapt Plays to Opportunities
- review, comment, compare, and publish with provenance and trust
- continuously improve recommendations through human curation and usage feedback

---

# 3. Core Product Principles

## 3.1 Atomicity
A `ContentUnit` remains the smallest reusable content object.

## 3.2 Composition
Larger structures are composed explicitly from smaller units, not implied or overloaded.

## 3.3 Separation of relationship types
The platform must distinguish between:

- **Version**: same thing over time
- **Variant**: intentional alternate form for purpose/audience/style/region
- **Similarity**: related but not the same family
- **Composition**: ordered inclusion within a larger structure

## 3.4 Family-first UX
Default browsing should reduce clutter by surfacing conceptual families before showing all variants and versions.

## 3.5 Trust by design
Approval, provenance, lineage, rights, freshness, and confidence must be visible and queryable.

## 3.6 Storyboard as operating surface
Storyboard is a core mode of work, not a secondary review-only page.

## 3.7 Human authority with AI leverage
AI can suggest, infer, rank, compare, cluster, and scaffold. Humans remain authoritative for final governance and editorial intent.

---

# 4. Core Entity Hierarchy

| Level | Entity | Purpose |
|---|---|---|
| Atomic | ContentUnit | Smallest reusable unit: slide, page, visual, chart, table, text block |
| Mid-layer composition | ContentBlock | Ordered mini-set of ContentUnits that together tell a sub-story |
| Artifact | WorkProduct | Deliverable or assembled artifact such as deck, brief, document, one-pager |
| Strategic orchestration | Play | Reusable blueprint, strategy, or repeatable sequence |
| Contextual execution | OpportunityWorkspace | Opportunity-specific adaptation and recommendation space |
| Cross-cutting collaborative surface | Storyboard | Structured composition and review surface across WorkProducts, Plays, Opportunities |

---

# 5. Formal Definitions

## 5.1 ContentUnit
An atomic reusable content object.

Examples:
- a slide
- a page
- a visual
- a chart
- a table
- a text block
- a note block

A ContentUnit must never represent a multi-unit bundle.

## 5.2 ContentBlock
An intentional grouping of multiple ContentUnits that function together.

Examples:
- a 3-slide ROI story
- a 2-slide problem/solution pair
- a proof cluster
- a market context sequence
- an appendix mini-pack

ContentBlocks are directly insertable into Storyboards and WorkProducts.

## 5.3 WorkProduct
A composed artifact intended for internal or external use.

Examples:
- deck
- executive brief
- one-pager
- whitepaper
- proposal section
- workshop pack
- board pack

## 5.4 Play
A reusable blueprint that describes what sequence, structure, or content approach should be used for a recurring scenario.

Examples:
- executive expansion play
- technical discovery workshop play
- proposal acceleration play
- modernization narrative play

## 5.5 OpportunityWorkspace
A contextual workspace for a live pursuit, account motion, internal initiative, or campaign.

It ties together:
- opportunity context
- recommended Plays
- recommended WorkProducts
- recommended ContentUnits and ContentBlocks
- Storyboards
- saved selections
- comments
- decisions
- outcome feedback

## 5.6 Storyboard
A structured collaborative workspace for arranging, comparing, annotating, and refining compositions.

Storyboard must support:
- WorkProduct storyboards
- Play storyboards
- Opportunity storyboards

---

# 6. Relationship Model

## 6.1 Version
Represents the same variant over time.

Examples:
- corrected numbers
- revised copy
- rebranded visuals
- approved revision

## 6.2 Variant
Represents a purposeful alternate form of the same conceptual family.

Examples:
- Board
- Executive
- Technical
- EMEA
- Investor
- Simplified
- Condensed
- Alt Chart
- SaaS Variant

## 6.3 Similarity
Represents relatedness without shared family identity.

Examples:
- semantically similar slides
- visually similar slides
- structurally similar decks
- similar proof stories from different offerings

## 6.4 Composition
Represents ordered inclusion in a larger structure.

Examples:
- ContentUnits in a ContentBlock
- ContentUnits in a WorkProduct
- ContentBlocks in a WorkProduct
- sections in a Storyboard
- steps in a Play

---

# 7. Family / Variant / Version Model

This model applies to:

- ContentUnits
- ContentBlocks
- WorkProducts
- Plays

Each major reusable object may exist as:

- **Family**: conceptual identity
- **Variant**: purposeful branch
- **Version**: time-based revision of that branch

Similarity remains separate.

---

# 8. Canonical Object Model

## 8.1 ContentUnit

```ts
type ContentUnitFamily = {
  id: string
  familyTitle: string
  conceptualSummary?: string
  unitType: 'slide' | 'page' | 'visual' | 'chart' | 'table' | 'text_block' | 'note_block'
  canonicalVariantId?: string
  taxonomy: Taxonomy
  createdAt: string
  updatedAt: string
}

type ContentUnitVariant = {
  id: string
  familyId: string
  variantLabel: string
  variantType: 'audience' | 'purpose' | 'style' | 'industry' | 'region' | 'length' | 'other'
  variantDimensions?: {
    audience?: string[]
    purpose?: string[]
    style?: string[]
    industry?: string[]
    region?: string[]
    tone?: string[]
    locale?: string[]
  }
  isCanonical: boolean
  linkedBy: 'manual' | 'ai' | 'hybrid'
  linkedConfidence?: number
  latestVersionId?: string
  createdAt: string
  updatedAt: string
}

type ContentUnitVersion = {
  id: string
  variantId: string
  versionNumber: string
  renderUri: string
  extractedText?: string
  summary?: string
  speakerNotes?: string
  provenanceId: string
  approvalState: 'draft' | 'review' | 'approved' | 'deprecated' | 'archived'
  freshnessState?: 'fresh' | 'aging' | 'stale'
  qualityScore?: number
  relevanceScore?: number
  usageScore?: number
  createdBy: string
  createdAt: string
  supersedesVersionId?: string
}
````

## 8.2 ContentBlock

```TypeScript
type ContentBlockFamily = {
  id: string
  title: string
  summary?: string
  blockType: 'narrative' | 'proof_set' | 'comparison_set' | 'appendix_set' | 'sequence' | 'other'
  canonicalVariantId?: string
  taxonomy: Taxonomy
  createdAt: string
  updatedAt: string
}

type ContentBlockVariant = {
  id: string
  familyId: string
  variantLabel: string
  variantType: 'audience' | 'purpose' | 'style' | 'industry' | 'region' | 'length' | 'other'
  isCanonical: boolean
  linkedBy: 'manual' | 'ai' | 'hybrid'
  linkedConfidence?: number
  latestVersionId?: string
  createdAt: string
  updatedAt: string
}

type ContentBlockVersion = {
  id: string
  variantId: string
  versionNumber: string
  summary?: string
  provenanceId: string
  approvalState: 'draft' | 'review' | 'approved' | 'deprecated' | 'archived'
  createdBy: string
  createdAt: string
  supersedesVersionId?: string
}

type ContentBlockMember = {
  id: string
  blockVersionId: string
  memberType: 'content_unit_variant' | 'content_unit_version'
  memberId: string
  orderIndex: number
  role?: 'lead' | 'supporting' | 'proof' | 'transition' | 'closing' | 'appendix'
  isRequired: boolean
  notes?: string
}
```

## 8.3 WorkProduct

```TypeScript
type WorkProductFamily = {
  id: string
  title: string
  artifactType: 'deck' | 'brief' | 'document' | 'one_pager' | 'whitepaper' | 'proposal' | 'other'
  summary?: string
  canonicalVariantId?: string
  taxonomy: Taxonomy
  createdAt: string
  updatedAt: string
}

type WorkProductVariant = {
  id: string
  familyId: string
  variantLabel: string
  variantType: 'audience' | 'purpose' | 'style' | 'industry' | 'region' | 'length' | 'other'
  variantDimensions?: {
    audience?: string[]
    purpose?: string[]
    industry?: string[]
    region?: string[]
    locale?: string[]
  }
  isCanonical: boolean
  latestVersionId?: string
  createdAt: string
  updatedAt: string
}

type WorkProductVersion = {
  id: string
  variantId: string
  versionNumber: string
  approvalState: 'draft' | 'review' | 'approved' | 'deprecated' | 'archived'
  provenanceId: string
  buildManifestId?: string
  previewUri?: string
  createdBy: string
  createdAt: string
  supersedesVersionId?: string
}
```

## 8.4 Play

```TypeScript
type PlayFamily = {
  id: string
  title: string
  summary: string
  canonicalVariantId?: string
  taxonomy: Taxonomy
  createdAt: string
  updatedAt: string
}

type PlayVariant = {
  id: string
  familyId: string
  variantLabel: string
  variantType: 'audience' | 'industry' | 'region' | 'maturity' | 'other'
  isCanonical: boolean
  latestVersionId?: string
  createdAt: string
  updatedAt: string
}

type PlayVersion = {
  id: string
  variantId: string
  versionNumber: string
  approvalState: 'draft' | 'review' | 'approved' | 'deprecated' | 'archived'
  provenanceId: string
  createdBy: string
  createdAt: string
  supersedesVersionId?: string
}
```

## 8.5 Opportunity Workspace

```TypeScript
type OpportunityWorkspace = {
  id: string
  title: string
  account?: string
  externalId?: string
  summary?: string
  ownerIds: string[]
  collaboratorIds?: string[]
  context: {
    sector?: string
    geo?: string
    audience?: string
    buyingStage?: string
    offering?: string
    technologies?: string[]
    desiredArtifactTypes?: string[]
    requiredThemes?: string[]
    exclusions?: string[]
    tags?: string[]
    notes?: string
  }
  storyboardIds?: string[]
  savedSelections?: SavedSelection[]
  createdAt: string
  updatedAt: string
}
```

## 8.6 Storyboard

```TypeScript
type Storyboard = {
  id: string
  mode: 'work_product' | 'play' | 'opportunity'
  parentType: 'work_product_variant' | 'play_variant' | 'opportunity_workspace'
  parentId: string
  title: string
  currentSnapshotId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

type StoryboardSnapshot = {
  id: string
  storyboardId: string
  versionLabel?: string
  derivedFromSnapshotId?: string
  approvalState?: 'draft' | 'review' | 'approved'
  narrativeScore?: number
  createdBy: string
  createdAt: string
}

type StoryboardSection = {
  id: string
  snapshotId: string
  title: string
  summary?: string
  orderIndex: number
  sectionType?: string
  estimatedReadTimeMinutes?: number
}

type StoryboardSlot = {
  id: string
  sectionId: string
  slotType: 'content_unit' | 'content_block' | 'work_product_ref' | 'gap'
  selectedObjectType?: 'content_unit_variant' | 'content_unit_version' | 'content_block_variant' | 'content_block_version'
  selectedObjectId?: string
  orderIndex: number
  purpose?: string
  isRequired: boolean
  aiRecommended: boolean
}
```

---

# 9. Supporting Shared Models

## 9.1 Taxonomy

```TypeScript
type Taxonomy = {
  offerings?: string[]
  technologies?: string[]
  sectors?: string[]
  geos?: string[]
  stages?: string[]
  audiences?: string[]
  purposes?: string[]
  useCases?: string[]
  tags?: string[]
  locales?: string[]
  visualStyles?: string[]
}
```

## 9.2 Similarity

```TypeScript
type SimilarityEdge = {
  id: string
  sourceObjectType: string
  sourceObjectId: string
  targetObjectType: string
  targetObjectId: string
  similarityType: 'semantic' | 'visual' | 'structural' | 'reuse_pattern' | 'hybrid'
  score: number
  createdBy: 'ai' | 'user' | 'system'
  explanation?: string
}
```

## 9.3 Provenance

```TypeScript
type ProvenanceRecord = {
  id: string
  originType: 'uploaded' | 'generated' | 'imported' | 'derived' | 'connector'
  sourceSystem?: string
  parentRefs?: Array<{ objectType: string; objectId: string }>
  sourceRefs?: string[]
  promptRef?: string
  modelInfo?: string
  pipelineVersion?: string
  operatorId?: string
  attestationHash?: string
  createdAt: string
}
```

## 9.4 Assessments

```TypeScript
type Assessment = {
  id: string
  targetType: string
  targetId: string
  assessorId: string
  dimensions: {
    executiveFit?: number
    technicalDepth?: number
    visualQuality?: number
    storyStrength?: number
    reuseLikelihood?: number
    brandAlignment?: number
    clarity?: number
    clientSafetyConfidence?: number
  }
  notes?: string
  createdAt: string
  updatedAt: string
}
```

---

# 10. Comments, Notes, and Collaboration Model

BoxBrain v2 must support **three distinct annotation systems**.

## 10.1 Review Comments

Ephemeral or workflow-bound threaded feedback tied to a specific version or snapshot.

Use cases:

* review feedback
* approval dialogue
* change requests
* per-slide critique
* per-storyboard-slot comments

Properties:

* threaded
* mentions
* status: open/resolved
* version-aware
* anchor-aware

## 10.2 Persistent Comments

Longer-lived discussion attached to the entity itself.

Use cases:

* tips for use
* cautionary suggestions
* contextual guidance
* soft recommendations

Properties:

* entity-level
* not tied to one review cycle
* searchable
* optionally pinned

## 10.3 Notes

Durable, more official editorial or governance knowledge.

Use cases:

* approved usage notes
* messaging guidance
* warnings
* best practices
* rationale
* policy-relevant information

Properties:

* curated
* durable
* often owner/editor-managed
* prominently surfaced

## 10.4 Comment Anchoring

Comments may attach to:

* family
* variant
* version
* storyboard snapshot
* storyboard section
* storyboard slot
* relationship edge
* exact content region if supported later

---

# 11. Content Browsing and Retrieval Model

## 11.1 Default library behavior

Library browsing must be **family-first** by default.

This reduces clutter and supports conceptual discovery.

## 11.2 Expand behavior

A family result expands to show:

* variants
* latest version of each variant
* link source: manual vs AI vs hybrid
* variant dimensions
* quick actions

## 11.3 Variant browse mode

Users can toggle to:

* **Show families**
* **Show all variants**

## 11.4 Search behavior

Broad search should generally return families first.

Specific search should be able to return a best-fit variant directly.

Examples:

* "operating margin slide" -> family-first
* "board operating margin slide" -> board variant-first
* "Q2 2025 board update v5.0 margin slide" -> version-first

## 11.5 Similarity browsing

Similarity should exist as a separate pane, panel, or view:

* top similar families
* top similar variants
* top similar versions where relevant

---

# 12. Core UX Surfaces

## 12.1 Ask BoxBrain

AI-assisted search and retrieval across all supported object types.

Must support:

* natural-language query
* filters
* grouped mixed results
* explanation chips
* add to collection / storyboard / tray
* save search

## 12.2 Library

Structured browse/search home.

Must support views for:

* ContentUnits
* ContentBlocks
* WorkProducts
* Plays
* Collections
* Review queues

## 12.3 ContentUnit Detail

Must expose:

* overview
* variants
* versions
* similar
* comments
* notes
* activity
* provenance
* ratings
* where-used

## 12.4 ContentBlock Detail

Must expose:

* ordered members
* purpose
* audience
* comments
* notes
* reuse
* where-used
* similarity
* variants and versions when supported

## 12.5 WorkProduct Detail

Must expose:

* overview
* deck/document preview
* variants
* versions
* similar
* storyboard
* comments
* notes
* activity
* build manifest
* provenance and approval

## 12.6 Play Detail

Must expose:

* overview
* flow/sequence
* related opportunities
* related work products
* recommended content
* comments
* notes
* activity
* variants and versions

## 12.7 Opportunity Workspace

Must expose:

* opportunity metadata
* recommended plays
* recommended work products
* recommended content units and blocks
* storyboard
* saved selections
* candidate assets
* rationale
* comments
* trust indicators

## 12.8 Storyboard Workspace

Must support:

* section-based assembly
* drag/drop or controlled insertion
* content unit and content block insertion
* variant swapping
* version snapshotting
* comments
* AI recommendations
* metrics and diagnostics
* mode switch: WorkProduct / Play / Opportunity

## 12.9 Review & Governance Hub

Must support:

* duplicate candidates
* variant linking
* similarity review
* stale content
* approvals
* comment resolution

---

# 13. Variant and Version UX Requirements

## 13.1 ContentUnit detail

Must visually distinguish:

* versions/history lane
* variants explorer
* similarity matches
* canonical selection
* current selected version

## 13.2 WorkProduct detail

Must support:

* deck variant swiper
* manifest-driven composition table
* per-slot swap
* variant analytics
* derived work product variants list

## 13.3 Family cards in Library

Must show:

* canonical preview
* variant count
* version count
* trust state
* summary metadata
* quick expand

---

# 14. Multi-Axis Variant Explorer

The product must support a premium variation explorer interaction, especially for ContentUnits and WorkProducts.

## 14.1 Horizontal axis

Conceptual siblings / similar families / adjacent semantic alternatives.

## 14.2 Vertical axis

Variants or revisions of the currently selected family.

## 14.3 History lane

Explicit version history and provenance chain for the selected variant.

## 14.4 Required labels

Common labels include:

* Canonical
* Approved
* Generated
* Manual-link
* AI-link
* Current
* Prior Version
* Style Alt
* Technical
* Executive
* Board
* Regional

---

# 15. WorkProduct Composition Model

## 15.1 Build manifest

Every WorkProductVersion must be reproducible via a build manifest.

```TypeScript
type BuildManifest = {
  id: string
  workProductVersionId: string
  slots: Array<{
    slotId: string
    sectionId?: string
    selectedObjectType: 'content_unit_variant' | 'content_unit_version' | 'content_block_variant' | 'content_block_version'
    selectedObjectId: string
    fallbackRules?: {
      preferredTags?: string[]
      preferredVariantDimensions?: Record<string, string[]>
      allowAiRecommendation?: boolean
    }
  }>
  createdAt: string
}
```

## 15.2 Derived variants

A WorkProductVariant may be manually composed or derived from:

* base manifest
* variant dimensions
* slot substitution rules
* selected content block substitutions

## 15.3 Slot swapping

Users must be able to swap:

* one ContentUnit for another variant
* one ContentBlock for an alternate block
* a slot suggestion from AI
* a canonical selection for a contextual selection

---

# 16. Storyboard as Core Workspace

Storyboard is a primary system surface for three workflows.

## 16.1 WorkProduct Storyboard

Used to assemble and review deliverables.

Focus:

* story flow
* section structure
* transitions
* duplicate content
* speaker note suggestions
* version snapshots

## 16.2 Play Storyboard

Used to define reusable flows and reusable orchestration patterns.

Focus:

* step logic
* recommended content families/blocks
* audience fit
* success criteria
* sequencing

## 16.3 Opportunity Storyboard

Used to adapt a Play and content set to a live opportunity.

Focus:

* account-specific relevance
* risk coverage
* audience alignment
* chosen assets
* candidate comparisons
* comments and rationale

---

# 17. Storyboard Functional Requirements

## 17.1 Section management

Users must be able to:

* add sections
* rename sections
* reorder sections
* collapse/expand sections
* accept AI-suggested sections

## 17.2 Slot management

Users must be able to:

* insert content units
* insert content blocks
* add gaps/placeholders
* replace selections
* compare alternatives
* view matching work products
* see usage and quality metadata

## 17.3 Collaboration

Storyboard must support:

* overall comments
* per-section comments
* per-slot comments
* per-selected-object comments
* unresolved comment counts
* version-linked comments

## 17.4 Versioning

Storyboard must support:

* snapshots
* compare to previous snapshot
* review mode
* publish/approve snapshots where relevant

## 17.5 Diagnostics

Storyboard must show:

* narrative score
* content coverage
* duplicate content
* weak transitions
* estimated read time
* audience alignment
* risk coverage
* proof/impact score

## 17.6 AI assistance

Storyboard AI must support:

* generate sections
* recommend content per section
* recommend matching work products
* suggest missing content
* suggest better variants
* optimize flow
* auto-balance story
* generate notes/speaker notes
* personalize for opportunity

---

# 18. Search, Recommendation, and Ranking

## 18.1 Hybrid search

Search must combine:

* lexical retrieval
* semantic retrieval
* metadata fit
* trust state
* freshness
* human rating
* usage/reuse
* context-specific boosts

## 18.2 Ranking profiles

The system must support ranking profiles for:

* general library search
* executive content
* technical content
* opportunity recommendation
* duplicate review
* similarity review
* approved-only retrieval

## 18.3 Example composite score

```TypeScript
composite_score =
  0.22 * lexical_match +
  0.25 * semantic_match +
  0.15 * metadata_fit +
  0.10 * approval_signal +
  0.08 * freshness_score +
  0.08 * quality_score +
  0.06 * reuse_score +
  0.03 * similarity_signal +
  0.03 * context_specific_boost
```

---

# 19. AI Responsibilities and Boundaries

## 19.1 AI may:

* suggest taxonomy
* suggest variants
* suggest similarity
* suggest canonical candidates
* suggest sections
* recommend content
* scaffold storyboards
* suggest swaps
* identify stale content
* identify duplicates
* identify related work products
* summarize comments and notes
* generate package recommendations

## 19.2 AI may not silently:

* overwrite approved metadata
* merge families or variants without trace
* change canonical status without review
* remove comments or notes
* alter manifests without explicit user action

## 19.3 AI provenance

All AI-generated or AI-linked fields must record:

* generation/link source
* confidence
* model or pipeline reference where feasible
* human override state

---

# 20. Reviews and Governance

## 20.1 Review queues

The Reviews Hub must support at minimum:

* New Items
* Duplicate Candidates
* Variant Linking
* Similarity Review
* Stale Content
* Approvals
* Comment Resolution

## 20.2 Resolution actions

Reviewers must be able to:

* mark as variant
* mark as similar
* merge versions
* set canonical
* not duplicates
* approve
* deprecate
* request changes
* resolve comments

## 20.3 Governance inspection

Governance views must expose:

* provenance graph
* rights and usage restrictions
* freshness
* approval history
* confidence
* where-used
* source lineage
* AI rationale

---

# 21. Trust, Freshness, and Compliance

## 21.1 Trust signals

Every major object should surface:

* Approved
* Draft
* Review
* Deprecated
* Archived
* Canonical
* Generated
* Manual-link
* AI-link
* Trusted
* Restricted / Client-safe

## 21.2 Freshness states

Supported states:

* Fresh
* Aging
* Stale

Freshness should consider:

* last content update
* source update
* approval recency
* dependent object changes

## 21.3 Rights and provenance summary

Users must be able to see:

* source origin
* who created/imported/generated it
* what parent objects it derives from
* what it is used in
* rights/compliance summary
* approval chain

---

# 22. Packaging and Publish Flow

Completed WorkProducts must support a publish and packaging flow with:

* deck preview filmstrip
* version summary
* approval checklist
* provenance and rights summary
* audience and use-case tags
* linked opportunity/play references
* package outputs:
    * PPTX
    * PDF
    * one-pager excerpt
    * shareable collection
    * custom outputs
* approval routing
* final validation
* AI recommendations for package tailoring

---

# 23. Key User Flows

## 23.1 Find a family, inspect variants, add best variant to storyboard

1. Search library
2. Open family card
3. Compare variants
4. Inspect comments/notes/provenance
5. Add chosen variant to storyboard

## 23.2 Build a WorkProduct

1. Open storyboard or builder
2. Add sections manually or via AI
3. Insert ContentUnits or ContentBlocks
4. Swap variants by slot
5. Review diagnostics
6. Save snapshot
7. Publish WorkProduct version

## 23.3 Adapt a Play to an Opportunity

1. Open OpportunityWorkspace
2. Review recommended Plays
3. Start opportunity storyboard
4. Accept/reject AI suggestions
5. Compare candidate variants and work products
6. Resolve comments
7. Save versioned snapshot

## 23.4 Review duplicate/variant candidates

1. Open Reviews Hub
2. Open compare panel
3. Inspect AI analysis and provenance
4. Read comments
5. Mark as Variant / Similar / Merge Versions / Not Duplicates

---

# 24. Navigation Model

Top-level navigation should be:

* Ask BoxBrain
* Library
* Plays
* Opportunities
* Reviews
* Admin

Secondary object-aware navigation should support:

* ContentUnits
* ContentBlocks
* WorkProducts
* Collections
* Storyboards
* Review queues

---

# 25. Recommended User-Facing Labels

Internal entity naming may differ from user-facing labels.

| Internal | User-facing recommendation |
| --- | --- |
| ContentUnit | Content Unit |
| ContentBlock | Narrative Block or Content Block |
| WorkProduct | Work Product |
| Play | Play |
| StoryboardSnapshot | Storyboard Version or Snapshot |
| SimilarityEdge | Similarity |
| VariationLink | Variant Link |

Recommended user-facing choice:

* use **Content Block** in general product language
* optionally describe it as a “mini-story” in onboarding/help

---

# 26. System Architecture

## 26.1 Frontend

* Next.js
* React
* TypeScript

## 26.2 Backend

* FastAPI
* Python

## 26.3 Operational database

* PostgreSQL

## 26.4 Vector retrieval

* pgvector initially

## 26.5 Search

* PostgreSQL full-text initially
* OpenSearch/Elasticsearch later if scale requires

## 26.6 Object storage

* S3-compatible storage

## 26.7 Queue and workers

* Redis + worker framework

## 26.8 Authentication

* OIDC / enterprise SSO

## 26.9 Telemetry

* Postgres-first initially
* warehouse/ClickHouse later if needed

## 26.10 System of record

* PostgreSQL for metadata, graph relationships, manifests, comments, scores
* object storage for binaries and rendered assets

Git may support configuration, schemas, prompts, and export snapshots, but must not be the operational source of truth.

---

# 27. APIs

Representative API surfaces:

```http
POST   /api/content-units
GET    /api/content-units/{id}
GET    /api/content-units/{id}/variants
GET    /api/content-units/{id}/versions
GET    /api/content-units/{id}/similar
POST   /api/content-units/{id}/comments
POST   /api/content-units/{id}/notes
```

```http
POST   /api/content-blocks
GET    /api/content-blocks/{id}
PATCH  /api/content-blocks/{id}
POST   /api/content-blocks/{id}/members
GET    /api/content-blocks/{id}/where-used
```

```http
POST   /api/work-products
GET    /api/work-products/{id}
GET    /api/work-products/{id}/variants
GET    /api/work-products/{id}/versions
GET    /api/work-products/{id}/manifest
POST   /api/work-products/{id}/publish
```

```http
POST   /api/plays
GET    /api/plays/{id}
POST   /api/plays/{id}/storyboard
```

```http
POST   /api/opportunities
GET    /api/opportunities/{id}
POST   /api/opportunities/{id}/storyboard
POST   /api/opportunities/{id}/recommend
```

```http
POST   /api/storyboards
GET    /api/storyboards/{id}
POST   /api/storyboards/{id}/snapshots
POST   /api/storyboards/{id}/sections
POST   /api/storyboards/{id}/slots
POST   /api/storyboards/{id}/comments
POST   /api/storyboards/{id}/analyze
```

```http
POST   /api/reviews/duplicates/{id}/mark-variant
POST   /api/reviews/duplicates/{id}/mark-similar
POST   /api/reviews/duplicates/{id}/merge-versions
POST   /api/reviews/duplicates/{id}/set-canonical
POST   /api/reviews/comments/{id}/resolve
```

---

# 28. Non-Functional Requirements

## 28.1 Performance

Targets:

* search P50 < 2s
* search P95 < 5s
* common detail pages < 2s once assets cached
* ingest acknowledgement < 3s
* heavy processing async

## 28.2 Scale

Must support:

* tens of thousands of WorkProducts
* hundreds of thousands or millions of ContentUnits over time
* large graph relationships
* concurrent enterprise users
* bursty bulk ingestion

## 28.3 Reliability

Must support:

* durable metadata and binary storage
* idempotent ingestion where practical
* retryable jobs
* auditable state transitions

## 28.4 Observability

Must expose:

* job status
* indexing freshness
* search latency
* zero-result queries
* AI confidence distributions
* duplicate rates
* stale content rates
* review throughput
* comment resolution metrics

---

# 29. Security and Permissions

## 29.1 Roles

Minimum roles:

* Viewer
* Contributor
* Curator
* Reviewer
* Admin

## 29.2 Object permissions

Permissions should inherit downward by default:

* WorkProduct -> ContentUnits used within its own access context
* Family -> variants -> versions
* Storyboard -> snapshots -> comments

Overrides may exist where necessary.

## 29.3 Requirements

The system must support:

* SSO
* RBAC
* audit logs
* restricted content visibility
* safe handling of confidential artifacts
* source-aware permissions
* retention and deletion workflows

---

# 30. Phased Delivery

## Phase 1: Foundational Graph Library

Deliver:

* WorkProduct ingestion
* ContentUnit extraction
* taxonomy
* family-first library
* basic variants/versions
* search
* comments/notes basics
* provenance
* Collections

## Phase 2: Content Intelligence Layer

Deliver:

* similarity graph
* AI linking
* duplicate review
* ratings and trust signals
* ContentBlock support
* improved detail pages
* Reviews Hub

## Phase 3: Composition and Storyboard Core

Deliver:

* Storyboard workspace
* WorkProduct builder
* per-slot variant swap
* snapshots/versioning
* collaboration comments
* AI section and unit recommendations

## Phase 4: Plays and Opportunity Orchestration

Deliver:

* Play variants/versions
* OpportunityWorkspace
* Play-to-opportunity storyboard
* candidate assets
* rationale panels
* compare alternatives
* trust/compliance integration

## Phase 5: Publishing and Advanced Governance

Deliver:

* publish/package flow
* approval routing
* validation
* package recommendations
* comment resolution queues
* advanced provenance graph

---

# 31. MVP Definition

The minimum meaningful BoxBrain v2 release is achieved when all of the following are true:

1. WorkProducts can be ingested and decomposed into ContentUnits.
2. ContentUnits support family, variant, and version separation.
3. The Library can browse by family-first and variant-first modes.
4. ContentBlock exists as a reusable grouped mini-story entity.
5. Search works across ContentUnits, ContentBlocks, WorkProducts, and Plays.
6. Users can comment and add notes on major entities.
7. WorkProducts can be assembled or edited via a storyboard/builder.
8. Storyboards support sections, slots, snapshots, and collaboration.
9. Reviews Hub supports duplicate and variant review.
10. Provenance, trust, and approval are visible.

---

# 32. Risks and Design Guardrails

## 32.1 Do not overload ContentUnit

Never allow a ContentUnit to represent multiple units.

## 32.2 Do not collapse variation and similarity into one model

They must remain separate.

## 32.3 Do not expose all variants/versions flat by default

Family-first UX is mandatory for sanity at scale.

## 32.4 Do not blur review comments and durable notes

Keep workflow comments, persistent comments, and notes distinct.

## 32.5 Do not allow AI to silently alter canonical relationships

AI suggestions must remain traceable and reviewable.

## 32.6 Do not treat Storyboard as a secondary feature

Storyboard is a core operating surface.

---

# 33. Final Product Position

BoxBrain v2 is a **governed content graph and composition platform**.

Its fundamental model is:

* **atomic units**
* **reusable grouped mini-stories**
* **assembled work products**
* **strategic plays**
* **opportunity-specific orchestration**
* **storyboard-centered collaboration**
* **family / variant / version identity**
* **similarity as graph intelligence**
* **trust, provenance, and governance as defaults**

That is the final product shape.

```

#BoxBrain #ProductSpec #UXArchitecture #KnowledgeGraph #AIApps #ContentOperations

Estimated tokens used: ~6.2k
```
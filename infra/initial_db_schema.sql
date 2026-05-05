-- BoxBrain v2 starter PostgreSQL schema
-- Prepared 2026-05-02
-- Purpose: initial implementation contract, not final production DDL.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE approval_state AS ENUM ('draft', 'review', 'approved', 'deprecated', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE freshness_state AS ENUM ('fresh', 'aging', 'stale');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE link_source AS ENUM ('manual', 'ai', 'hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE comment_kind AS ENUM ('review_comment', 'persistent_comment', 'note_discussion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('open', 'accepted', 'rejected', 'snoozed', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Utility tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stored_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_type TEXT NOT NULL, -- original_binary, render, thumbnail, extraction_json, ai_output, export
  storage_uri TEXT NOT NULL,
  mime_type TEXT,
  byte_size BIGINT,
  sha256 TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  origin_type TEXT NOT NULL, -- uploaded, generated, imported, derived, connector
  source_system TEXT,
  parent_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  prompt_ref TEXT,
  model_info TEXT,
  pipeline_version TEXT,
  operator_id UUID REFERENCES users(id),
  attestation_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  prior_state JSONB,
  new_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- WorkProducts
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS work_product_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  artifact_type TEXT NOT NULL DEFAULT 'deck',
  summary TEXT,
  restricted BOOLEAN NOT NULL DEFAULT false,
  canonical_variant_id UUID,
  taxonomy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES work_product_families(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,
  variant_type TEXT NOT NULL DEFAULT 'other',
  variant_dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_canonical BOOLEAN NOT NULL DEFAULT false,
  latest_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, variant_label)
);

ALTER TABLE work_product_families
  ADD CONSTRAINT work_product_families_canonical_variant_fk
  FOREIGN KEY (canonical_variant_id) REFERENCES work_product_variants(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS work_product_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES work_product_variants(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  approval_state approval_state NOT NULL DEFAULT 'draft',
  freshness_state freshness_state DEFAULT 'fresh',
  provenance_id UUID REFERENCES provenance_records(id),
  original_object_id UUID REFERENCES stored_objects(id),
  preview_uri TEXT,
  extracted_text TEXT,
  summary TEXT,
  restricted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  supersedes_version_id UUID REFERENCES work_product_versions(id),
  UNIQUE (variant_id, version_number)
);

ALTER TABLE work_product_variants
  ADD CONSTRAINT work_product_variants_latest_version_fk
  FOREIGN KEY (latest_version_id) REFERENCES work_product_versions(id) DEFERRABLE INITIALLY DEFERRED;

-- -----------------------------------------------------------------------------
-- ContentUnits
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS content_unit_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_title TEXT NOT NULL,
  conceptual_summary TEXT,
  unit_type TEXT NOT NULL DEFAULT 'slide',
  restricted BOOLEAN NOT NULL DEFAULT false,
  canonical_variant_id UUID,
  taxonomy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_unit_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES content_unit_families(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,
  variant_type TEXT NOT NULL DEFAULT 'other',
  variant_dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_canonical BOOLEAN NOT NULL DEFAULT false,
  linked_by link_source NOT NULL DEFAULT 'manual',
  linked_confidence NUMERIC(5,4),
  latest_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, variant_label)
);

ALTER TABLE content_unit_families
  ADD CONSTRAINT content_unit_families_canonical_variant_fk
  FOREIGN KEY (canonical_variant_id) REFERENCES content_unit_variants(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS content_unit_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES content_unit_variants(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  render_object_id UUID REFERENCES stored_objects(id),
  thumbnail_object_id UUID REFERENCES stored_objects(id),
  render_uri TEXT,
  thumbnail_uri TEXT,
  extracted_text TEXT,
  summary TEXT,
  speaker_notes TEXT,
  restricted BOOLEAN NOT NULL DEFAULT false,
  source_work_product_version_id UUID REFERENCES work_product_versions(id),
  source_order_index INTEGER,
  text_hash TEXT,
  visual_hash TEXT,
  provenance_id UUID REFERENCES provenance_records(id),
  approval_state approval_state NOT NULL DEFAULT 'draft',
  freshness_state freshness_state DEFAULT 'fresh',
  quality_score NUMERIC(5,2),
  relevance_score NUMERIC(5,2),
  usage_score NUMERIC(5,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  supersedes_version_id UUID REFERENCES content_unit_versions(id),
  UNIQUE (variant_id, version_number)
);

ALTER TABLE content_unit_variants
  ADD CONSTRAINT content_unit_variants_latest_version_fk
  FOREIGN KEY (latest_version_id) REFERENCES content_unit_versions(id) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS idx_content_unit_versions_source ON content_unit_versions(source_work_product_version_id, source_order_index);
CREATE INDEX IF NOT EXISTS idx_content_unit_versions_text_hash ON content_unit_versions(text_hash);
CREATE INDEX IF NOT EXISTS idx_content_unit_versions_visual_hash ON content_unit_versions(visual_hash);

-- -----------------------------------------------------------------------------
-- ContentBlocks
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS content_block_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT,
  block_type TEXT NOT NULL DEFAULT 'sequence',
  canonical_variant_id UUID,
  taxonomy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_block_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES content_block_families(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,
  variant_type TEXT NOT NULL DEFAULT 'other',
  is_canonical BOOLEAN NOT NULL DEFAULT false,
  linked_by link_source NOT NULL DEFAULT 'manual',
  linked_confidence NUMERIC(5,4),
  latest_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, variant_label)
);

ALTER TABLE content_block_families
  ADD CONSTRAINT content_block_families_canonical_variant_fk
  FOREIGN KEY (canonical_variant_id) REFERENCES content_block_variants(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS content_block_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES content_block_variants(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  summary TEXT,
  restricted BOOLEAN NOT NULL DEFAULT false,
  provenance_id UUID REFERENCES provenance_records(id),
  approval_state approval_state NOT NULL DEFAULT 'draft',
  freshness_state freshness_state DEFAULT 'fresh',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  supersedes_version_id UUID REFERENCES content_block_versions(id),
  UNIQUE (variant_id, version_number)
);

ALTER TABLE content_block_variants
  ADD CONSTRAINT content_block_variants_latest_version_fk
  FOREIGN KEY (latest_version_id) REFERENCES content_block_versions(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS content_block_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_version_id UUID NOT NULL REFERENCES content_block_versions(id) ON DELETE CASCADE,
  member_type TEXT NOT NULL, -- content_unit_variant, content_unit_version
  member_id UUID NOT NULL,
  order_index INTEGER NOT NULL,
  role TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (block_version_id, order_index)
);

-- -----------------------------------------------------------------------------
-- Storyboards
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS storyboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode TEXT NOT NULL DEFAULT 'work_product', -- work_product, play, opportunity
  parent_type TEXT,
  parent_id UUID,
  title TEXT NOT NULL,
  current_snapshot_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storyboard_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storyboard_id UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  version_label TEXT,
  derived_from_snapshot_id UUID REFERENCES storyboard_snapshots(id),
  approval_state approval_state DEFAULT 'draft',
  narrative_score NUMERIC(5,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE storyboards
  ADD CONSTRAINT storyboards_current_snapshot_fk
  FOREIGN KEY (current_snapshot_id) REFERENCES storyboard_snapshots(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS storyboard_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID NOT NULL REFERENCES storyboard_snapshots(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  order_index INTEGER NOT NULL,
  section_type TEXT,
  estimated_read_time_minutes NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (snapshot_id, order_index)
);

CREATE TABLE IF NOT EXISTS storyboard_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES storyboard_sections(id) ON DELETE CASCADE,
  slot_type TEXT NOT NULL DEFAULT 'gap', -- content_unit, content_block, work_product_ref, gap
  selected_object_type TEXT,
  selected_object_id UUID,
  order_index INTEGER NOT NULL,
  purpose TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  ai_recommended BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_id, order_index)
);

-- -----------------------------------------------------------------------------
-- Build manifests
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS build_manifests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_product_version_id UUID REFERENCES work_product_versions(id) ON DELETE CASCADE,
  storyboard_snapshot_id UUID REFERENCES storyboard_snapshots(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS build_manifest_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  build_manifest_id UUID NOT NULL REFERENCES build_manifests(id) ON DELETE CASCADE,
  source_slot_id UUID,
  section_id UUID,
  selected_object_type TEXT NOT NULL,
  selected_object_id UUID NOT NULL,
  order_index INTEGER NOT NULL,
  fallback_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (build_manifest_id, order_index)
);

ALTER TABLE work_product_versions
  ADD COLUMN IF NOT EXISTS build_manifest_id UUID REFERENCES build_manifests(id);

-- -----------------------------------------------------------------------------
-- Shared comments, notes, review, similarity
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind comment_kind NOT NULL DEFAULT 'persistent_comment',
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  anchor JSONB NOT NULL DEFAULT '{}'::jsonb,
  parent_comment_id UUID REFERENCES comments(id),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, resolved
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'usage_guidance',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_target ON notes(target_type, target_id);

CREATE TABLE IF NOT EXISTS similarity_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_object_type TEXT NOT NULL,
  source_object_id UUID NOT NULL,
  target_object_type TEXT NOT NULL,
  target_object_id UUID NOT NULL,
  similarity_type TEXT NOT NULL DEFAULT 'hybrid',
  score NUMERIC(6,5) NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'ai', -- ai, user, system
  explanation TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_object_type, source_object_id, target_object_type, target_object_id, similarity_type)
);

CREATE TABLE IF NOT EXISTS review_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_type TEXT NOT NULL, -- duplicate, variant_linking, similarity, stale, approval, comment_resolution
  status review_status NOT NULL DEFAULT 'open',
  target_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(5,4),
  rationale TEXT,
  suggested_action TEXT,
  assigned_to UUID REFERENCES users(id),
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_review_items_queue_status ON review_items(queue_type, status, created_at);

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  assessor_id UUID REFERENCES users(id),
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Ingestion jobs and AI outputs
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'queued',
  stage TEXT NOT NULL DEFAULT 'uploaded',
  original_object_id UUID REFERENCES stored_objects(id),
  work_product_version_id UUID REFERENCES work_product_versions(id),
  error_code TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status_stage ON ingestion_jobs(status, stage, created_at);

CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  embedding_kind TEXT NOT NULL DEFAULT 'text', -- text, visual, hybrid
  model_name TEXT NOT NULL,
  model_version TEXT,
  dims INTEGER NOT NULL,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, embedding_kind, model_name, model_version)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_target ON embeddings(target_type, target_id);
-- Create a vector index after data volume and embedding dimensionality are confirmed.
-- Example:
-- CREATE INDEX idx_embeddings_vector_hnsw ON embeddings USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS ai_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  output_type TEXT NOT NULL, -- summary, taxonomy, duplicate_candidate, variant_candidate, diagnostics
  pipeline_version TEXT,
  model_info TEXT,
  prompt_ref TEXT,
  confidence NUMERIC(5,4),
  output JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested', -- suggested, accepted, rejected, overridden
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Search support
-- -----------------------------------------------------------------------------

ALTER TABLE content_unit_versions
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(summary, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(extracted_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(speaker_notes, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_content_unit_versions_search ON content_unit_versions USING GIN (search_vector);

ALTER TABLE work_product_versions
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(summary, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(extracted_text, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_work_product_versions_search ON work_product_versions USING GIN (search_vector);

ALTER TABLE content_block_versions
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(summary, '')), 'A')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_content_block_versions_search ON content_block_versions USING GIN (search_vector);

-- -----------------------------------------------------------------------------
-- Collections
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  member_type TEXT NOT NULL,
  member_id UUID NOT NULL,
  order_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, member_type, member_id)
);

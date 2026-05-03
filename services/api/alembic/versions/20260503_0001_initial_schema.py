from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "20260503_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    schema_path = Path(__file__).resolve().parents[4] / "infra" / "initial_db_schema.sql"
    op.execute(schema_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS collection_items CASCADE;
        DROP TABLE IF EXISTS collections CASCADE;
        DROP TABLE IF EXISTS ai_outputs CASCADE;
        DROP TABLE IF EXISTS embeddings CASCADE;
        DROP TABLE IF EXISTS ingestion_jobs CASCADE;
        DROP TABLE IF EXISTS assessments CASCADE;
        DROP TABLE IF EXISTS review_items CASCADE;
        DROP TABLE IF EXISTS similarity_edges CASCADE;
        DROP TABLE IF EXISTS notes CASCADE;
        DROP TABLE IF EXISTS comments CASCADE;
        DROP TABLE IF EXISTS build_manifest_slots CASCADE;
        DROP TABLE IF EXISTS build_manifests CASCADE;
        DROP TABLE IF EXISTS storyboard_slots CASCADE;
        DROP TABLE IF EXISTS storyboard_sections CASCADE;
        DROP TABLE IF EXISTS storyboard_snapshots CASCADE;
        DROP TABLE IF EXISTS storyboards CASCADE;
        DROP TABLE IF EXISTS content_block_members CASCADE;
        DROP TABLE IF EXISTS content_block_versions CASCADE;
        DROP TABLE IF EXISTS content_block_variants CASCADE;
        DROP TABLE IF EXISTS content_block_families CASCADE;
        DROP TABLE IF EXISTS content_unit_versions CASCADE;
        DROP TABLE IF EXISTS content_unit_variants CASCADE;
        DROP TABLE IF EXISTS content_unit_families CASCADE;
        DROP TABLE IF EXISTS work_product_versions CASCADE;
        DROP TABLE IF EXISTS work_product_variants CASCADE;
        DROP TABLE IF EXISTS work_product_families CASCADE;
        DROP TABLE IF EXISTS audit_events CASCADE;
        DROP TABLE IF EXISTS provenance_records CASCADE;
        DROP TABLE IF EXISTS stored_objects CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TYPE IF EXISTS review_status CASCADE;
        DROP TYPE IF EXISTS comment_kind CASCADE;
        DROP TYPE IF EXISTS link_source CASCADE;
        DROP TYPE IF EXISTS freshness_state CASCADE;
        DROP TYPE IF EXISTS approval_state CASCADE;
        """
    )

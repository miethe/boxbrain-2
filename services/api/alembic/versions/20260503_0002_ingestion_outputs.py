from __future__ import annotations

from alembic import op

revision = "20260503_0002"
down_revision = "20260503_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE content_unit_versions ADD COLUMN IF NOT EXISTS thumbnail_uri TEXT")
    op.execute(
        "ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE embeddings DROP COLUMN IF EXISTS metadata")
    op.execute("ALTER TABLE content_unit_versions DROP COLUMN IF EXISTS thumbnail_uri")

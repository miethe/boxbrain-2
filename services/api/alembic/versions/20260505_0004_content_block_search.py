from __future__ import annotations

from alembic import op

revision = "20260505_0004"
down_revision = "20260504_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE content_block_versions
          ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(summary, '')), 'A')
          ) STORED
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_content_block_versions_search "
        "ON content_block_versions USING GIN (search_vector)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_content_block_versions_search")
    op.execute("ALTER TABLE content_block_versions DROP COLUMN IF EXISTS search_vector")

from __future__ import annotations

from alembic import op

revision = "20260505_0005"
down_revision = "20260505_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE storyboard_sections
          ADD COLUMN IF NOT EXISTS storyboard_id UUID REFERENCES storyboards(id) ON DELETE CASCADE
        """
    )
    op.execute(
        """
        ALTER TABLE storyboard_sections
          ADD COLUMN IF NOT EXISTS row_kind TEXT NOT NULL DEFAULT 'snapshot'
        """
    )
    op.execute(
        """
        UPDATE storyboard_sections section
        SET storyboard_id = snapshot.storyboard_id
        FROM storyboard_snapshots snapshot
        WHERE section.snapshot_id = snapshot.id
          AND section.storyboard_id IS NULL
        """
    )
    op.execute("ALTER TABLE storyboard_sections ALTER COLUMN snapshot_id DROP NOT NULL")
    op.execute(
        """
        ALTER TABLE storyboard_sections
          DROP CONSTRAINT IF EXISTS storyboard_sections_snapshot_id_order_index_key
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'storyboard_sections_scope_check'
          ) THEN
            ALTER TABLE storyboard_sections
              ADD CONSTRAINT storyboard_sections_scope_check
              CHECK (
                (
                  row_kind = 'draft'
                  AND storyboard_id IS NOT NULL
                  AND snapshot_id IS NULL
                )
                OR (
                  row_kind = 'snapshot'
                  AND snapshot_id IS NOT NULL
                  AND storyboard_id IS NOT NULL
                )
              );
          END IF;
        END $$;
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_storyboard_sections_draft_order
        ON storyboard_sections (storyboard_id, order_index)
        WHERE row_kind = 'draft'
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_storyboard_sections_snapshot_order
        ON storyboard_sections (snapshot_id, order_index)
        WHERE row_kind = 'snapshot'
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ux_storyboard_sections_snapshot_order")
    op.execute("DROP INDEX IF EXISTS ux_storyboard_sections_draft_order")
    op.execute(
        """
        ALTER TABLE storyboard_sections
          DROP CONSTRAINT IF EXISTS storyboard_sections_scope_check
        """
    )
    op.execute("DELETE FROM storyboard_sections WHERE row_kind = 'draft' OR snapshot_id IS NULL")
    op.execute("ALTER TABLE storyboard_sections ALTER COLUMN snapshot_id SET NOT NULL")
    op.execute("ALTER TABLE storyboard_sections DROP COLUMN IF EXISTS row_kind")
    op.execute("ALTER TABLE storyboard_sections DROP COLUMN IF EXISTS storyboard_id")
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'storyboard_sections_snapshot_id_order_index_key'
          ) THEN
            ALTER TABLE storyboard_sections
              ADD CONSTRAINT storyboard_sections_snapshot_id_order_index_key
              UNIQUE (snapshot_id, order_index);
          END IF;
        END $$;
        """
    )

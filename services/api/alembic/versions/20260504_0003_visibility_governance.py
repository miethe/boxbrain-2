from __future__ import annotations

from alembic import op

revision = "20260504_0003"
down_revision = "20260503_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table_name in (
        "content_unit_families",
        "content_unit_versions",
        "work_product_families",
        "work_product_versions",
        "content_block_versions",
    ):
        op.execute(
            f"ALTER TABLE {table_name} "
            "ADD COLUMN IF NOT EXISTS restricted BOOLEAN NOT NULL DEFAULT false"
        )


def downgrade() -> None:
    for table_name in (
        "content_block_versions",
        "work_product_versions",
        "work_product_families",
        "content_unit_versions",
        "content_unit_families",
    ):
        op.execute(f"ALTER TABLE {table_name} DROP COLUMN IF EXISTS restricted")

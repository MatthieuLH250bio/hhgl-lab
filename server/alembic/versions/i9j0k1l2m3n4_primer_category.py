"""primer_category

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-05-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'i9j0k1l2m3n4'
down_revision: Union[str, None] = 'h8i9j0k1l2m3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('primers', sa.Column('category', sa.String(64), nullable=True))
    op.add_column('primers', sa.Column('plasmid_role', sa.String(64), nullable=True))


def downgrade() -> None:
    op.drop_column('primers', 'plasmid_role')
    op.drop_column('primers', 'category')

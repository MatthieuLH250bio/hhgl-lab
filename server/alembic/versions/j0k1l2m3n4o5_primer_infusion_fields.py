"""primer_infusion_fields

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-05-12 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'j0k1l2m3n4o5'
down_revision: Union[str, None] = 'i9j0k1l2m3n4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('primers', 'plasmid_role')
    op.add_column('primers', sa.Column('donor_plasmid', sa.String(255), nullable=True))
    op.add_column('primers', sa.Column('recipient_plasmid', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('primers', 'recipient_plasmid')
    op.drop_column('primers', 'donor_plasmid')
    op.add_column('primers', sa.Column('plasmid_role', sa.String(64), nullable=True))

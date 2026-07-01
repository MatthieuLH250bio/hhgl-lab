"""bibliography_collections

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-05 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'bib_collections',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['parent_id'], ['bib_collections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'collection_refs',
        sa.Column('collection_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ref_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['collection_id'], ['bib_collections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ref_id'], ['bibliography.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('collection_id', 'ref_id'),
    )


def downgrade() -> None:
    op.drop_table('collection_refs')
    op.drop_table('bib_collections')

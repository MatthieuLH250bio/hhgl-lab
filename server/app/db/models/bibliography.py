import uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# Many-to-many association between collections and references
collection_refs = sa.Table(
    "collection_refs",
    Base.metadata,
    sa.Column("collection_id", UUID(as_uuid=True), sa.ForeignKey("bib_collections.id", ondelete="CASCADE"), primary_key=True),
    sa.Column("ref_id", UUID(as_uuid=True), sa.ForeignKey("bibliography.id", ondelete="CASCADE"), primary_key=True),
)


class BibCollection(Base):
    __tablename__ = "bib_collections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bib_collections.id", ondelete="CASCADE"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    references: Mapped[list["Reference"]] = relationship(
        "Reference", secondary=collection_refs, back_populates="collections"
    )


class Reference(Base):
    __tablename__ = "bibliography"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    authors: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, server_default=text("'{}'::text[]"))
    journal: Mapped[Optional[str]] = mapped_column(Text)
    year: Mapped[Optional[int]] = mapped_column(Integer)
    doi: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    abstract: Mapped[Optional[str]] = mapped_column(Text)
    pdf_path: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, server_default=text("'{}'::text[]"))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    added_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    collections: Mapped[list["BibCollection"]] = relationship(
        "BibCollection", secondary=collection_refs, back_populates="references"
    )

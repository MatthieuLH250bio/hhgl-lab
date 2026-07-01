from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.protocols import Protocol


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(32), nullable=False, server_default=text("'#1E5BC6'"))
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default=text("'active'"))
    owner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    experiments: Mapped[list["Experiment"]] = relationship(
        "Experiment", back_populates="project", cascade="all, delete-orphan"
    )


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default=text("'running'"))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    locked_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    project: Mapped["Project"] = relationship("Project", back_populates="experiments")
    entries: Mapped[list["NotebookEntry"]] = relationship(
        "NotebookEntry", back_populates="experiment", cascade="all, delete-orphan"
    )


class NotebookEntry(Base):
    __tablename__ = "notebook_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    experiment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False)
    protocol_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("protocols.id", ondelete="SET NULL"), nullable=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body_md: Mapped[str | None] = mapped_column(Text)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String(64)))
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    experiment: Mapped["Experiment"] = relationship("Experiment", back_populates="entries")
    protocol: Mapped["Protocol | None"] = relationship("Protocol", foreign_keys=[protocol_id])
    results: Mapped[list["EntryResult"]] = relationship(
        "EntryResult", back_populates="entry", cascade="all, delete-orphan"
    )
    attachments: Mapped[list["EntryAttachment"]] = relationship(
        "EntryAttachment", back_populates="entry", cascade="all, delete-orphan"
    )


class NotebookEntryHistory(Base):
    __tablename__ = "notebook_entry_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    entry_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notebook_entries.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    changed_fields: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))


class EntryResult(Base):
    __tablename__ = "entry_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    entry_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notebook_entries.id", ondelete="CASCADE"), nullable=False)
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    value_num: Mapped[float | None] = mapped_column(Numeric(12, 4))
    value_text: Mapped[str | None] = mapped_column(String(256))
    unit: Mapped[str | None] = mapped_column(String(32))
    tone: Mapped[str] = mapped_column(String(32), nullable=False, server_default=text("'neutral'"))

    entry: Mapped["NotebookEntry"] = relationship("NotebookEntry", back_populates="results")


class EntryAttachment(Base):
    __tablename__ = "entry_attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    entry_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notebook_entries.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, server_default=text("'image'"))
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(64))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    caption: Mapped[str | None] = mapped_column(String(512))
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    thumbnail_path: Mapped[str | None] = mapped_column(String(512))

    entry: Mapped["NotebookEntry"] = relationship("NotebookEntry", back_populates="attachments")

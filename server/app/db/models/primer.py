import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Primer(Base):
    __tablename__ = "primers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sequence: Mapped[str | None] = mapped_column(Text)
    length_nt: Mapped[int | None] = mapped_column(Integer)
    tm_celsius: Mapped[float | None] = mapped_column(Float)
    gc_percent: Mapped[float | None] = mapped_column(Float)
    target: Mapped[str | None] = mapped_column(String(255))
    direction: Mapped[str | None] = mapped_column(String(16))  # forward / reverse
    category: Mapped[str | None] = mapped_column(String(64))
    donor_plasmid: Mapped[str | None] = mapped_column(String(255))
    recipient_plasmid: Mapped[str | None] = mapped_column(String(255))
    box_location: Mapped[str | None] = mapped_column(String(64))
    notes_md: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

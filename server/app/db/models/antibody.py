import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Antibody(Base):
    __tablename__ = "antibodies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target: Mapped[str | None] = mapped_column(String(255))
    host: Mapped[str | None] = mapped_column(String(64))
    clone: Mapped[str | None] = mapped_column(String(64))
    clonality: Mapped[str | None] = mapped_column(String(16))  # monoclonal / polyclonal
    applications: Mapped[list[str] | None] = mapped_column(ARRAY(String(16)))  # ['WB', 'IF', 'FACS']
    vendor: Mapped[str | None] = mapped_column(String(128))
    catalog_number: Mapped[str | None] = mapped_column(String(64))
    lot: Mapped[str | None] = mapped_column(String(64))
    dilution: Mapped[str | None] = mapped_column(String(64))
    box_location: Mapped[str | None] = mapped_column(String(64))
    notes_md: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="available")
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

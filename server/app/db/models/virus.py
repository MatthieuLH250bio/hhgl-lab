import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Virus(Base):
    __tablename__ = "viruses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str | None] = mapped_column(String(32))  # lentivirus, AAV, adenovirus…
    serotype: Mapped[str | None] = mapped_column(String(32))
    transgene: Mapped[str | None] = mapped_column(String(255))
    titer: Mapped[float | None] = mapped_column(Float)
    volume_uL: Mapped[float | None] = mapped_column(Float)
    bsl_level: Mapped[int | None] = mapped_column(Integer)  # 1 ou 2
    box_location: Mapped[str | None] = mapped_column(String(64))
    notes_md: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="available")
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

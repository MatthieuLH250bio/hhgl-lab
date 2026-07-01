import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CellLine(Base):
    __tablename__ = "cell_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    species: Mapped[str | None] = mapped_column(String(128))
    tissue: Mapped[str | None] = mapped_column(String(128))
    passage_number: Mapped[int | None] = mapped_column(Integer)
    medium: Mapped[str | None] = mapped_column(String(128))
    notes_md: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="available")
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    passages: Mapped[list["CellLinePassage"]] = relationship(
        "CellLinePassage", back_populates="cell_line", cascade="all, delete-orphan",
        order_by="CellLinePassage.passage_number.desc()",
    )


class CellLinePassage(Base):
    __tablename__ = "cell_line_passages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    cell_line_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cell_lines.id", ondelete="CASCADE"), nullable=False)
    passage_number: Mapped[int] = mapped_column(Integer, nullable=False)
    passage_date: Mapped[date] = mapped_column(Date, nullable=False)
    operator_name: Mapped[str | None] = mapped_column(String(128))
    viability: Mapped[float | None] = mapped_column(Float)       # % 0-100
    seeding_density: Mapped[float | None] = mapped_column(Float) # cells/cm²
    flask_type: Mapped[str | None] = mapped_column(String(32))   # T25, T75…
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    cell_line: Mapped["CellLine"] = relationship("CellLine", back_populates="passages")

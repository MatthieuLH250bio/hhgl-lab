import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Plasmid(Base):
    __tablename__ = "plasmids"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    backbone: Mapped[str | None] = mapped_column(String(128))
    insert_name: Mapped[str | None] = mapped_column(String(255))
    length_bp: Mapped[int | None] = mapped_column(Integer)
    resistance: Mapped[list[str] | None] = mapped_column(ARRAY(String(64)))
    host_strain: Mapped[str | None] = mapped_column(String(64))
    sequence: Mapped[str | None] = mapped_column(Text)
    notes_md: Mapped[str | None] = mapped_column(Text)
    box_location: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="available")
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    features: Mapped[list["PlasmidFeature"]] = relationship("PlasmidFeature", back_populates="plasmid", cascade="all, delete-orphan")


class PlasmidFeature(Base):
    __tablename__ = "plasmid_features"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    plasmid_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("plasmids.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    kind: Mapped[str | None] = mapped_column(String(32))  # cds, promoter, terminator, rbs, ori, tag, misc
    start_bp: Mapped[int] = mapped_column(Integer, nullable=False)
    end_bp: Mapped[int] = mapped_column(Integer, nullable=False)
    strand: Mapped[str | None] = mapped_column(String(2))  # + ou -
    color: Mapped[str | None] = mapped_column(String(16))

    plasmid: Mapped["Plasmid"] = relationship("Plasmid", back_populates="features")

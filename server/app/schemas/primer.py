from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PrimerBase(BaseModel):
    name: str
    sequence: str | None = None
    length_nt: int | None = None
    tm_celsius: float | None = None
    gc_percent: float | None = None
    target: str | None = None
    direction: str | None = None
    category: str | None = None
    donor_plasmid: str | None = None
    recipient_plasmid: str | None = None
    box_location: str | None = None
    notes_md: str | None = None


class PrimerCreate(PrimerBase):
    code: str


class PrimerUpdate(BaseModel):
    name: str | None = None
    sequence: str | None = None
    length_nt: int | None = None
    tm_celsius: float | None = None
    gc_percent: float | None = None
    target: str | None = None
    direction: str | None = None
    category: str | None = None
    donor_plasmid: str | None = None
    recipient_plasmid: str | None = None
    box_location: str | None = None
    notes_md: str | None = None


class PrimerListItem(BaseModel):
    id: UUID
    code: str
    name: str
    sequence: str | None = None
    tm_celsius: float | None = None
    direction: str | None = None
    category: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PrimerRead(PrimerBase):
    id: UUID
    code: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

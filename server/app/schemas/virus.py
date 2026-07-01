from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class VirusBase(BaseModel):
    name: str
    kind: str | None = None
    serotype: str | None = None
    transgene: str | None = None
    titer: float | None = None
    volume_uL: float | None = None
    bsl_level: int | None = None
    box_location: str | None = None
    notes_md: str | None = None


class VirusCreate(VirusBase):
    code: str
    status: str = "available"


class VirusUpdate(BaseModel):
    name: str | None = None
    kind: str | None = None
    serotype: str | None = None
    transgene: str | None = None
    titer: float | None = None
    volume_uL: float | None = None
    bsl_level: int | None = None
    box_location: str | None = None
    notes_md: str | None = None
    status: str | None = None


class VirusListItem(BaseModel):
    id: UUID
    code: str
    name: str
    kind: str | None = None
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class VirusRead(VirusBase):
    id: UUID
    code: str
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

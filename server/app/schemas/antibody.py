from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AntibodyBase(BaseModel):
    name: str
    target: str | None = None
    host: str | None = None
    clone: str | None = None
    clonality: str | None = None
    applications: list[str] | None = None
    vendor: str | None = None
    catalog_number: str | None = None
    lot: str | None = None
    dilution: str | None = None
    box_location: str | None = None
    notes_md: str | None = None


class AntibodyCreate(AntibodyBase):
    code: str
    status: str = "available"


class AntibodyUpdate(BaseModel):
    name: str | None = None
    target: str | None = None
    host: str | None = None
    clone: str | None = None
    clonality: str | None = None
    applications: list[str] | None = None
    vendor: str | None = None
    catalog_number: str | None = None
    lot: str | None = None
    dilution: str | None = None
    box_location: str | None = None
    notes_md: str | None = None
    status: str | None = None


class AntibodyListItem(BaseModel):
    id: UUID
    code: str
    name: str
    target: str | None = None
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AntibodyRead(AntibodyBase):
    id: UUID
    code: str
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StrainBase(BaseModel):
    name: str
    species: str | None = None
    genotype: str | None = None
    parent_strain_id: UUID | None = None
    box_location: str | None = None
    notes_md: str | None = None


class StrainCreate(StrainBase):
    code: str
    status: str = "available"


class StrainUpdate(BaseModel):
    name: str | None = None
    species: str | None = None
    genotype: str | None = None
    parent_strain_id: UUID | None = None
    box_location: str | None = None
    notes_md: str | None = None
    status: str | None = None


class StrainListItem(BaseModel):
    id: UUID
    code: str
    name: str
    species: str | None = None
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StrainRead(StrainBase):
    id: UUID
    code: str
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

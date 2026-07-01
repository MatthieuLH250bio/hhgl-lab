from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PlasmidFeatureBase(BaseModel):
    name: str
    kind: str | None = None
    start_bp: int
    end_bp: int
    strand: str | None = None
    color: str | None = None


class PlasmidFeatureCreate(PlasmidFeatureBase):
    pass


class PlasmidFeatureRead(PlasmidFeatureBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class PlasmidBase(BaseModel):
    name: str
    backbone: str | None = None
    insert_name: str | None = None
    length_bp: int | None = None
    resistance: list[str] | None = None
    host_strain: str | None = None
    sequence: str | None = None
    notes_md: str | None = None
    box_location: str | None = None


class PlasmidCreate(PlasmidBase):
    code: str
    status: str = "available"


class PlasmidUpdate(BaseModel):
    name: str | None = None
    backbone: str | None = None
    insert_name: str | None = None
    length_bp: int | None = None
    resistance: list[str] | None = None
    host_strain: str | None = None
    sequence: str | None = None
    notes_md: str | None = None
    box_location: str | None = None
    status: str | None = None


class PlasmidListItem(BaseModel):
    id: UUID
    code: str
    name: str
    backbone: str | None = None
    status: str
    length_bp: int | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PlasmidRead(PlasmidBase):
    id: UUID
    code: str
    status: str
    created_at: datetime
    updated_at: datetime
    features: list[PlasmidFeatureRead] = []
    model_config = ConfigDict(from_attributes=True)

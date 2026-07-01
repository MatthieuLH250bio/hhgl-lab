from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CellLineBase(BaseModel):
    name: str
    species: str | None = None
    tissue: str | None = None
    passage_number: int | None = None
    medium: str | None = None
    notes_md: str | None = None


class CellLineCreate(CellLineBase):
    code: str
    status: str = "available"


class CellLineUpdate(BaseModel):
    name: str | None = None
    species: str | None = None
    tissue: str | None = None
    passage_number: int | None = None
    medium: str | None = None
    notes_md: str | None = None
    status: str | None = None


class CellLineListItem(BaseModel):
    id: UUID
    code: str
    name: str
    species: str | None = None
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CellLineRead(CellLineBase):
    id: UUID
    code: str
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CellLinePassageCreate(BaseModel):
    passage_number: int
    passage_date: date
    operator_name: str | None = None
    viability: float | None = None
    seeding_density: float | None = None
    flask_type: str | None = None
    notes: str | None = None


class CellLinePassageRead(BaseModel):
    id: UUID
    cell_line_id: UUID
    passage_number: int
    passage_date: date
    operator_name: str | None
    viability: float | None
    seeding_density: float | None
    flask_type: str | None
    notes: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

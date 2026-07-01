from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ── Collections ───────────────────────────────────────────────────────────────

class CollectionCreate(BaseModel):
    name: str
    parent_id: Optional[UUID] = None


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[UUID] = None


class CollectionRead(BaseModel):
    id: UUID
    name: str
    parent_id: Optional[UUID]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── References ────────────────────────────────────────────────────────────────

class ReferenceCreate(BaseModel):
    title: str
    authors: list[str] = []
    journal: Optional[str] = None
    year: Optional[int] = None
    doi: Optional[str] = None
    abstract: Optional[str] = None
    tags: list[str] = []
    notes: Optional[str] = None


class ReferenceUpdate(BaseModel):
    title: Optional[str] = None
    authors: Optional[list[str]] = None
    journal: Optional[str] = None
    year: Optional[int] = None
    doi: Optional[str] = None
    abstract: Optional[str] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None


class ReferenceRead(BaseModel):
    id: UUID
    title: str
    authors: list[str]
    journal: Optional[str]
    year: Optional[int]
    doi: Optional[str]
    abstract: Optional[str]
    pdf_path: Optional[str]
    tags: list[str]
    notes: Optional[str]
    added_by_id: Optional[UUID]
    collections: list[CollectionRead] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ReferenceListItem(BaseModel):
    id: UUID
    title: str
    authors: list[str]
    journal: Optional[str]
    year: Optional[int]
    doi: Optional[str]
    tags: list[str]
    added_by_id: Optional[UUID]
    model_config = ConfigDict(from_attributes=True)


# ── DOI lookup ────────────────────────────────────────────────────────────────

class DoiLookupRequest(BaseModel):
    doi: str


class DoiLookupResult(BaseModel):
    title: str
    authors: list[str]
    journal: Optional[str]
    year: Optional[int]
    doi: str
    abstract: Optional[str]

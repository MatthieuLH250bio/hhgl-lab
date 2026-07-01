from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ── Projects ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    color: str = "#1E5BC6"
    status: str = "active"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    status: str | None = None


class ProjectRead(BaseModel):
    id: UUID
    code: str
    name: str
    description: str | None
    color: str
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ProjectListItem(BaseModel):
    id: UUID
    code: str
    name: str
    color: str
    status: str
    owner_id: UUID | None
    model_config = ConfigDict(from_attributes=True)


# ── Experiments ────────────────────────────────────────────────────────────────

class ExperimentCreate(BaseModel):
    project_id: UUID
    code: str
    title: str
    description: str | None = None
    status: str = "running"


class ExperimentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None


class ExperimentRead(BaseModel):
    id: UUID
    project_id: UUID
    code: str
    title: str
    description: str | None
    status: str
    locked_at: datetime | None
    locked_by_id: UUID | None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ExperimentListItem(BaseModel):
    id: UUID
    project_id: UUID
    code: str
    title: str
    status: str
    locked_at: datetime | None
    locked_by_id: UUID | None
    model_config = ConfigDict(from_attributes=True)


# ── Entry Results ──────────────────────────────────────────────────────────────

class EntryResultCreate(BaseModel):
    key: str
    label: str
    value_num: Decimal | None = None
    value_text: str | None = None
    unit: str | None = None
    tone: str = "neutral"


class EntryResultUpdate(BaseModel):
    label: str | None = None
    value_num: Decimal | None = None
    value_text: str | None = None
    unit: str | None = None
    tone: str | None = None


class EntryResultRead(BaseModel):
    id: UUID
    entry_id: UUID
    key: str
    label: str
    value_num: Decimal | None
    value_text: str | None
    unit: str | None
    tone: str
    model_config = ConfigDict(from_attributes=True)


# ── Entry Attachments ──────────────────────────────────────────────────────────

class EntryAttachmentRead(BaseModel):
    id: UUID
    entry_id: UUID
    kind: str
    filename: str
    original_name: str
    mime_type: str | None
    size_bytes: int | None
    caption: str | None
    storage_path: str
    thumbnail_path: str | None
    model_config = ConfigDict(from_attributes=True)


# ── Notebook Entries ───────────────────────────────────────────────────────────

class NotebookEntryCreate(BaseModel):
    experiment_id: UUID
    code: str
    title: str
    body_md: str | None = None
    entry_date: date
    tags: list[str] | None = None
    protocol_id: UUID | None = None


class NotebookEntryUpdate(BaseModel):
    title: str | None = None
    body_md: str | None = None
    entry_date: date | None = None
    tags: list[str] | None = None
    protocol_id: UUID | None = None


class NotebookEntryListItem(BaseModel):
    id: UUID
    code: str
    title: str
    entry_date: date
    tags: list[str] | None
    is_locked: bool
    experiment_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class NotebookEntryRead(BaseModel):
    id: UUID
    experiment_id: UUID
    protocol_id: UUID | None
    protocol_code: str | None = None
    protocol_title: str | None = None
    code: str
    title: str
    body_md: str | None
    entry_date: date
    tags: list[str] | None
    is_locked: bool
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime
    results: list[EntryResultRead] = []
    attachments: list[EntryAttachmentRead] = []
    model_config = ConfigDict(from_attributes=True)


class EntryHistoryRead(BaseModel):
    id: UUID
    entry_id: UUID
    user_id: UUID | None
    user_name: str | None
    action: str
    changed_fields: dict | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProtocolVersionRead(BaseModel):
    id: UUID
    protocol_id: UUID
    version: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ProtocolCreate(BaseModel):
    title: str
    category: Optional[str] = None
    duration: Optional[str] = None
    body_html: Optional[str] = None
    tags: list[str] = []
    author_name: Optional[str] = None


class ProtocolUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[str] = None
    body_html: Optional[str] = None
    tags: Optional[list[str]] = None
    author_name: Optional[str] = None
    is_favorite: Optional[bool] = None


class ProtocolRead(BaseModel):
    id: UUID
    code: str
    title: str
    category: Optional[str]
    duration: Optional[str]
    body_html: Optional[str]
    version: int
    tags: list[str]
    is_favorite: bool
    author_name: Optional[str]
    created_at: datetime
    updated_at: datetime
    versions: list[ProtocolVersionRead] = []
    model_config = ConfigDict(from_attributes=True)


class ProtocolListItem(BaseModel):
    id: UUID
    code: str
    title: str
    category: Optional[str]
    duration: Optional[str]
    version: int
    tags: list[str]
    is_favorite: bool
    author_name: Optional[str]
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.protocols import Protocol, ProtocolVersion
from app.deps import get_current_user, get_db
from app.schemas.protocols import (
    ProtocolCreate, ProtocolListItem, ProtocolRead, ProtocolUpdate,
)

router = APIRouter(tags=["protocols"])


async def _next_code(db: AsyncSession) -> str:
    result = await db.execute(select(func.count()).select_from(Protocol))
    n = (result.scalar() or 0) + 1
    return f"PRO-{n:04d}"


async def _load(db: AsyncSession, protocol_id: UUID) -> Protocol:
    result = await db.execute(
        select(Protocol)
        .where(Protocol.id == protocol_id)
        .options(selectinload(Protocol.versions))
    )
    p = result.scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "Protocole introuvable")
    return p


@router.get("/api/protocols", response_model=list[ProtocolListItem])
async def list_protocols(
    q: str = Query(""),
    category: Optional[str] = Query(None),
    favorites: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Protocol).order_by(Protocol.updated_at.desc()))
    protocols = list(result.scalars().all())
    if q:
        q_low = q.lower()
        protocols = [p for p in protocols if q_low in p.title.lower() or (p.category and q_low in p.category.lower())]
    if category:
        protocols = [p for p in protocols if p.category == category]
    if favorites:
        protocols = [p for p in protocols if p.is_favorite]
    return protocols


@router.post("/api/protocols", response_model=ProtocolRead, status_code=201)
async def create_protocol(
    body: ProtocolCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    code = await _next_code(db)
    protocol = Protocol(**body.model_dump(), code=code, version=1, created_by_id=current_user.id)
    db.add(protocol)
    await db.flush()
    db.add(ProtocolVersion(protocol_id=protocol.id, version=1, body_html=body.body_html))
    await db.commit()
    return await _load(db, protocol.id)


@router.get("/api/protocols/{protocol_id}", response_model=ProtocolRead)
async def get_protocol(
    protocol_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await _load(db, protocol_id)


@router.patch("/api/protocols/{protocol_id}", response_model=ProtocolRead)
async def update_protocol(
    protocol_id: UUID,
    body: ProtocolUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    protocol = await _load(db, protocol_id)
    data = body.model_dump(exclude_unset=True)
    body_changed = "body_html" in data and data["body_html"] != protocol.body_html

    for k, v in data.items():
        setattr(protocol, k, v)

    if body_changed:
        protocol.version += 1
        db.add(ProtocolVersion(protocol_id=protocol.id, version=protocol.version, body_html=protocol.body_html))

    protocol.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return await _load(db, protocol_id)


@router.delete("/api/protocols/{protocol_id}", status_code=204)
async def delete_protocol(
    protocol_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Protocol).where(Protocol.id == protocol_id))
    p = result.scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "Protocole introuvable")
    await db.delete(p)
    await db.commit()


@router.post("/api/protocols/{protocol_id}/restore/{version_num}", response_model=ProtocolRead)
async def restore_version(
    protocol_id: UUID,
    version_num: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    protocol = await _load(db, protocol_id)
    ver_result = await db.execute(
        select(ProtocolVersion).where(
            ProtocolVersion.protocol_id == protocol_id,
            ProtocolVersion.version == version_num,
        )
    )
    ver = ver_result.scalar_one_or_none()
    if ver is None:
        raise HTTPException(404, "Version introuvable")

    protocol.body_html = ver.body_html
    protocol.version += 1
    protocol.updated_at = datetime.now(timezone.utc)
    db.add(ProtocolVersion(protocol_id=protocol.id, version=protocol.version, body_html=ver.body_html))
    await db.commit()
    return await _load(db, protocol_id)

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.plasmid import Plasmid, PlasmidFeature
from app.deps import get_current_user, get_db
from app.schemas.plasmid import (
    PlasmidCreate, PlasmidFeatureCreate, PlasmidFeatureRead,
    PlasmidListItem, PlasmidRead, PlasmidUpdate,
)

router = APIRouter(prefix="/api/plasmids", tags=["plasmids"])


@router.get("", response_model=list[PlasmidListItem])
async def list_plasmids(
    q: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    stmt = select(Plasmid)
    if q:
        stmt = stmt.where(or_(Plasmid.code.ilike(f"%{q}%"), Plasmid.name.ilike(f"%{q}%")))
    if status:
        stmt = stmt.where(Plasmid.status == status)
    stmt = stmt.offset((page - 1) * limit).limit(limit).order_by(Plasmid.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=PlasmidRead, status_code=201)
async def create_plasmid(
    body: PlasmidCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    plasmid = Plasmid(**body.model_dump(), created_by_id=current_user.id)
    db.add(plasmid)
    await db.commit()
    result = await db.execute(
        select(Plasmid).options(selectinload(Plasmid.features)).where(Plasmid.id == plasmid.id)
    )
    return result.scalar_one()


@router.get("/{plasmid_id}", response_model=PlasmidRead)
async def get_plasmid(plasmid_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(
        select(Plasmid).options(selectinload(Plasmid.features)).where(Plasmid.id == plasmid_id)
    )
    plasmid = result.scalar_one_or_none()
    if plasmid is None:
        raise HTTPException(status_code=404, detail="Plasmide introuvable")
    return plasmid


@router.patch("/{plasmid_id}", response_model=PlasmidRead)
async def update_plasmid(
    plasmid_id: UUID,
    body: PlasmidUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Plasmid).where(Plasmid.id == plasmid_id))
    plasmid = result.scalar_one_or_none()
    if plasmid is None:
        raise HTTPException(status_code=404, detail="Plasmide introuvable")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(plasmid, field, value)
    await db.commit()
    result = await db.execute(
        select(Plasmid).options(selectinload(Plasmid.features)).where(Plasmid.id == plasmid_id)
    )
    return result.scalar_one()


@router.delete("/{plasmid_id}", status_code=204)
async def delete_plasmid(plasmid_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(Plasmid).where(Plasmid.id == plasmid_id))
    plasmid = result.scalar_one_or_none()
    if plasmid is None:
        raise HTTPException(status_code=404, detail="Plasmide introuvable")
    await db.delete(plasmid)
    await db.commit()


@router.get("/{plasmid_id}/features", response_model=list[PlasmidFeatureRead])
async def list_features(plasmid_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(PlasmidFeature).where(PlasmidFeature.plasmid_id == plasmid_id))
    return result.scalars().all()


@router.post("/{plasmid_id}/features", response_model=PlasmidFeatureRead, status_code=201)
async def create_feature(
    plasmid_id: UUID,
    body: PlasmidFeatureCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    feature = PlasmidFeature(**body.model_dump(), plasmid_id=plasmid_id)
    db.add(feature)
    await db.commit()
    await db.refresh(feature)
    return feature


@router.delete("/{plasmid_id}/features/{feature_id}", status_code=204)
async def delete_feature(
    plasmid_id: UUID,
    feature_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(PlasmidFeature).where(PlasmidFeature.id == feature_id, PlasmidFeature.plasmid_id == plasmid_id)
    )
    feature = result.scalar_one_or_none()
    if feature is None:
        raise HTTPException(status_code=404, detail="Feature introuvable")
    await db.delete(feature)
    await db.commit()

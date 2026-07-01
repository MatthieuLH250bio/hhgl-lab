"""Fabrique générique pour les routers CRUD simples (sans sous-ressources)."""
from typing import Any, Type
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db


def make_resource_router(
    prefix: str,
    tag: str,
    Model: Any,
    CreateSchema: Type[BaseModel],
    UpdateSchema: Type[BaseModel],
    ReadSchema: Type[BaseModel],
    ListItemSchema: Type[BaseModel],
    search_fields: list,
    has_status: bool = True,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])

    @router.get("", response_model=list[ListItemSchema])
    async def list_items(
        q: str | None = Query(None),
        status: str | None = Query(None),
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200),
        db: AsyncSession = Depends(get_db),
        _=Depends(get_current_user),
    ):
        stmt = select(Model)
        if q and search_fields:
            stmt = stmt.where(or_(*[f.ilike(f"%{q}%") for f in search_fields]))
        if status and has_status:
            stmt = stmt.where(Model.status == status)
        stmt = stmt.offset((page - 1) * limit).limit(limit).order_by(Model.created_at.desc())
        result = await db.execute(stmt)
        return result.scalars().all()

    @router.post("", response_model=ReadSchema, status_code=201)
    async def create_item(
        body: CreateSchema,
        db: AsyncSession = Depends(get_db),
        current_user=Depends(get_current_user),
    ):
        item = Model(**body.model_dump(), created_by_id=current_user.id)
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @router.get("/{item_id}", response_model=ReadSchema)
    async def get_item(item_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
        result = await db.execute(select(Model).where(Model.id == item_id))
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Ressource introuvable")
        return item

    @router.patch("/{item_id}", response_model=ReadSchema)
    async def update_item(
        item_id: UUID,
        body: UpdateSchema,
        db: AsyncSession = Depends(get_db),
        _=Depends(get_current_user),
    ):
        result = await db.execute(select(Model).where(Model.id == item_id))
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Ressource introuvable")
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        await db.commit()
        await db.refresh(item)
        return item

    @router.delete("/{item_id}", status_code=204)
    async def delete_item(item_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
        result = await db.execute(select(Model).where(Model.id == item_id))
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Ressource introuvable")
        await db.delete(item)
        await db.commit()

    return router

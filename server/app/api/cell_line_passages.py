from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.cell_line import CellLine, CellLinePassage
from app.deps import get_current_user, get_db
from app.schemas.cell_line import CellLinePassageCreate, CellLinePassageRead

router = APIRouter(tags=["cell-line-passages"])


@router.get("/api/cell-lines/{cell_line_id}/passages", response_model=list[CellLinePassageRead])
async def list_passages(
    cell_line_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(CellLinePassage)
        .where(CellLinePassage.cell_line_id == cell_line_id)
        .order_by(CellLinePassage.passage_number.desc())
    )
    return result.scalars().all()


@router.post("/api/cell-lines/{cell_line_id}/passages", response_model=CellLinePassageRead, status_code=201)
async def add_passage(
    cell_line_id: UUID,
    body: CellLinePassageCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Verify cell line exists
    cl = await db.get(CellLine, cell_line_id)
    if cl is None:
        raise HTTPException(status_code=404, detail="Lignée cellulaire introuvable")

    passage = CellLinePassage(
        **body.model_dump(),
        cell_line_id=cell_line_id,
        created_by_id=current_user.id,
    )
    db.add(passage)

    # Auto-update passage_number on the cell line if higher
    if cl.passage_number is None or body.passage_number > cl.passage_number:
        cl.passage_number = body.passage_number

    await db.commit()
    await db.refresh(passage)
    return passage


@router.delete("/api/cell-lines/{cell_line_id}/passages/{passage_id}", status_code=204)
async def delete_passage(
    cell_line_id: UUID,
    passage_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(CellLinePassage).where(
            CellLinePassage.id == passage_id,
            CellLinePassage.cell_line_id == cell_line_id,
        )
    )
    passage = result.scalar_one_or_none()
    if passage is None:
        raise HTTPException(status_code=404, detail="Passage introuvable")
    await db.delete(passage)
    await db.commit()

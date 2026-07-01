from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.antibody import Antibody
from app.db.models.bibliography import Reference
from app.db.models.cell_line import CellLine
from app.db.models.notebook import Experiment, NotebookEntry, Project
from app.db.models.plasmid import Plasmid
from app.db.models.primer import Primer
from app.db.models.protocols import Protocol
from app.db.models.strain import Strain
from app.db.models.virus import Virus
from app.deps import get_current_user, get_db

router = APIRouter(tags=["dashboard"])


@router.get("/api/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    async def count(model):
        r = await db.execute(select(func.count()).select_from(model))
        return r.scalar() or 0

    counts = {
        "plasmids":   await count(Plasmid),
        "strains":    await count(Strain),
        "cell_lines": await count(CellLine),
        "primers":    await count(Primer),
        "antibodies": await count(Antibody),
        "viruses":    await count(Virus),
        "entries":    await count(NotebookEntry),
        "protocols":  await count(Protocol),
        "references": await count(Reference),
    }

    # Recent notebook entries with experiment + project context
    stmt = (
        select(
            NotebookEntry.id,
            NotebookEntry.code,
            NotebookEntry.title,
            NotebookEntry.entry_date,
            NotebookEntry.tags,
            NotebookEntry.created_at,
            Experiment.title.label("experiment_title"),
            Project.name.label("project_name"),
            Project.color.label("project_color"),
        )
        .join(Experiment, NotebookEntry.experiment_id == Experiment.id)
        .join(Project, Experiment.project_id == Project.id)
        .order_by(NotebookEntry.entry_date.desc(), NotebookEntry.created_at.desc())
        .limit(6)
    )
    rows = (await db.execute(stmt)).all()
    recent_entries = [
        {
            "id": str(r.id),
            "code": r.code,
            "title": r.title,
            "entry_date": r.entry_date.isoformat(),
            "tags": r.tags or [],
            "experiment_title": r.experiment_title,
            "project_name": r.project_name,
            "project_color": r.project_color,
        }
        for r in rows
    ]

    # Recent protocols
    rows = (await db.execute(
        select(Protocol.id, Protocol.code, Protocol.title, Protocol.category, Protocol.updated_at)
        .order_by(Protocol.updated_at.desc())
        .limit(5)
    )).all()
    recent_protocols = [
        {
            "id": str(r.id),
            "code": r.code,
            "title": r.title,
            "category": r.category,
            "updated_at": r.updated_at.isoformat(),
        }
        for r in rows
    ]

    # Recent references
    rows = (await db.execute(
        select(Reference.id, Reference.title, Reference.authors, Reference.journal, Reference.year, Reference.created_at)
        .order_by(Reference.created_at.desc())
        .limit(5)
    )).all()
    recent_references = [
        {
            "id": str(r.id),
            "title": r.title,
            "authors": r.authors or [],
            "journal": r.journal,
            "year": r.year,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]

    # Recent items (unified, cross-module) for the Récents panel
    recent_items = []
    for Model, label_col, category, color in [
        (Plasmid,  Plasmid.name,    "plasmid",  "#3B82F6"),
        (Strain,   Strain.name,     "strain",   "#22C55E"),
        (Protocol, Protocol.title,  "protocol", "#EAB308"),
    ]:
        sub_rows = (await db.execute(
            select(Model.id, Model.code, label_col, Model.created_at)
            .order_by(Model.created_at.desc())
            .limit(3)
        )).all()
        for r in sub_rows:
            recent_items.append({
                "id": str(r.id),
                "code": r.code,
                "name": r[2],
                "category": category,
                "color": color,
                "created_at": r.created_at.isoformat(),
            })
    recent_items.sort(key=lambda x: x["created_at"], reverse=True)
    recent_items = recent_items[:6]

    return {
        "counts": counts,
        "recent_entries": recent_entries,
        "recent_protocols": recent_protocols,
        "recent_references": recent_references,
        "recent_items": recent_items,
    }

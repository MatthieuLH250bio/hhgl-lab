from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.antibody import Antibody
from app.db.models.bibliography import Reference
from app.db.models.cell_line import CellLine
from app.db.models.notebook import Experiment, NotebookEntry
from app.db.models.plasmid import Plasmid
from app.db.models.primer import Primer
from app.db.models.protocols import Protocol
from app.db.models.strain import Strain
from app.db.models.virus import Virus
from app.deps import get_current_user, get_db

router = APIRouter(tags=["search"])

LIMIT = 4


@router.get("/api/search")
async def global_search(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    term = q.strip()
    if not term:
        return {"results": []}

    like = f"%{term}%"
    results = []

    # ── Resources ─────────────────────────────────────────────────────────────
    for Model, category, color in [
        (Plasmid,  "Plasmides",        "#3B82F6"),
        (Strain,   "Souches",          "#22C55E"),
        (CellLine, "Lig. cellulaires", "#A855F7"),
        (Primer,   "Primers",          "#F97316"),
        (Antibody, "Anticorps",        "#14B8A6"),
        (Virus,    "Virus",            "#EF4444"),
    ]:
        rows = (await db.execute(
            select(Model.id, Model.code, Model.name)
            .where(or_(Model.code.ilike(like), Model.name.ilike(like)))
            .order_by(Model.created_at.desc())
            .limit(LIMIT)
        )).all()
        for r in rows:
            results.append({
                "id": str(r.id), "category": category, "color": color,
                "label": r.name, "sublabel": r.code, "path": "/database",
            })

    # ── Notebook entries ───────────────────────────────────────────────────────
    rows = (await db.execute(
        select(
            NotebookEntry.id, NotebookEntry.title, NotebookEntry.entry_date,
            Experiment.title.label("exp_title"),
        )
        .join(Experiment, NotebookEntry.experiment_id == Experiment.id)
        .where(NotebookEntry.title.ilike(like))
        .order_by(NotebookEntry.entry_date.desc())
        .limit(LIMIT)
    )).all()
    for r in rows:
        results.append({
            "id": str(r.id), "category": "Cahier de labo", "color": "#6366F1",
            "label": r.title,
            "sublabel": f"{r.exp_title} · {r.entry_date.strftime('%d/%m/%Y')}",
            "path": "/notebook",
        })

    # ── Protocols ─────────────────────────────────────────────────────────────
    rows = (await db.execute(
        select(Protocol.id, Protocol.code, Protocol.title, Protocol.category)
        .where(or_(Protocol.title.ilike(like), Protocol.category.ilike(like)))
        .order_by(Protocol.updated_at.desc())
        .limit(LIMIT)
    )).all()
    for r in rows:
        results.append({
            "id": str(r.id), "category": "Protocoles", "color": "#EAB308",
            "label": r.title, "sublabel": r.category or r.code,
            "path": "/protocols",
        })

    # ── References ────────────────────────────────────────────────────────────
    rows = (await db.execute(
        select(Reference.id, Reference.title, Reference.authors, Reference.year, Reference.doi)
        .where(or_(
            Reference.title.ilike(like),
            Reference.doi.ilike(like),
        ))
        .order_by(Reference.created_at.desc())
        .limit(LIMIT)
    )).all()
    for r in rows:
        first = r.authors[0] if r.authors else ""
        results.append({
            "id": str(r.id), "category": "Bibliographie", "color": "#6B7280",
            "label": r.title,
            "sublabel": f"{first}{' · ' + str(r.year) if r.year else ''}",
            "path": "/bibliography",
        })

    return {"results": results}

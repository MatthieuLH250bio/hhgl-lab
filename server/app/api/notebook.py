import uuid as uuid_module
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.notebook import (
    EntryAttachment, EntryResult, Experiment, NotebookEntry, NotebookEntryHistory, Project,
)
from app.db.models.protocols import Protocol as ProtocolModel
from app.deps import get_current_user, get_db
from app.schemas.notebook import (
    EntryAttachmentRead, EntryHistoryRead, EntryResultCreate, EntryResultRead, EntryResultUpdate,
    ExperimentCreate, ExperimentListItem, ExperimentRead, ExperimentUpdate,
    NotebookEntryCreate, NotebookEntryListItem, NotebookEntryRead, NotebookEntryUpdate,
    ProjectCreate, ProjectListItem, ProjectRead, ProjectUpdate,
)

router = APIRouter(tags=["notebook"])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"


def _save_history(
    db: AsyncSession,
    entry_id: UUID,
    user_id: UUID | None,
    action: str,
    changed_fields: dict | None = None,
) -> None:
    db.add(NotebookEntryHistory(
        entry_id=entry_id,
        user_id=user_id,
        action=action,
        changed_fields=changed_fields,
    ))


def _read_entry(entry: NotebookEntry) -> NotebookEntryRead:
    proto = entry.protocol
    return NotebookEntryRead(
        id=entry.id,
        experiment_id=entry.experiment_id,
        protocol_id=entry.protocol_id,
        protocol_code=proto.code if proto else None,
        protocol_title=proto.title if proto else None,
        code=entry.code,
        title=entry.title,
        body_md=entry.body_md,
        entry_date=entry.entry_date,
        tags=entry.tags,
        is_locked=entry.is_locked,
        created_by_id=entry.created_by_id,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        results=list(entry.results),
        attachments=list(entry.attachments),
    )


# ── Projects ──────────────────────────────────────────────────────────────────

@router.get("/api/projects", response_model=list[ProjectListItem])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Project).order_by(Project.created_at))
    return result.scalars().all()


@router.post("/api/projects", response_model=ProjectRead, status_code=201)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = Project(**body.model_dump(), owner_id=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.patch("/api/projects/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/api/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    await db.delete(project)
    await db.commit()


# ── Experiments ───────────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}/experiments", response_model=list[ExperimentListItem])
async def list_experiments(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(Experiment)
        .where(Experiment.project_id == project_id)
        .order_by(Experiment.created_at)
    )
    return result.scalars().all()


@router.post("/api/experiments", response_model=ExperimentRead, status_code=201)
async def create_experiment(
    body: ExperimentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    exp = Experiment(**body.model_dump())
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return exp


@router.patch("/api/experiments/{exp_id}", response_model=ExperimentRead)
async def update_experiment(
    exp_id: UUID,
    body: ExperimentUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Experiment).where(Experiment.id == exp_id))
    exp = result.scalar_one_or_none()
    if exp is None:
        raise HTTPException(status_code=404, detail="Expérience introuvable")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(exp, field, value)
    await db.commit()
    await db.refresh(exp)
    return exp


@router.get("/api/experiments/{exp_id}", response_model=ExperimentRead)
async def get_experiment(
    exp_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Experiment).where(Experiment.id == exp_id))
    exp = result.scalar_one_or_none()
    if exp is None:
        raise HTTPException(status_code=404, detail="Expérience introuvable")
    return exp


@router.post("/api/experiments/{exp_id}/lock", response_model=ExperimentRead)
async def lock_experiment(
    exp_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs")
    result = await db.execute(select(Experiment).where(Experiment.id == exp_id))
    exp = result.scalar_one_or_none()
    if exp is None:
        raise HTTPException(status_code=404, detail="Expérience introuvable")
    if exp.locked_at is not None:
        raise HTTPException(status_code=409, detail="Expérience déjà verrouillée")
    exp.locked_at = datetime.now(timezone.utc)
    exp.locked_by_id = current_user.id
    entries_result = await db.execute(
        select(NotebookEntry).where(NotebookEntry.experiment_id == exp_id)
    )
    for entry in entries_result.scalars().all():
        entry.is_locked = True
    await db.commit()
    await db.refresh(exp)
    return exp


@router.delete("/api/experiments/{exp_id}", status_code=204)
async def delete_experiment(
    exp_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Experiment).where(Experiment.id == exp_id))
    exp = result.scalar_one_or_none()
    if exp is None:
        raise HTTPException(status_code=404, detail="Expérience introuvable")
    await db.delete(exp)
    await db.commit()


# ── Notebook Entries ──────────────────────────────────────────────────────────

@router.get("/api/experiments/{exp_id}/entries", response_model=list[NotebookEntryListItem])
async def list_entries(
    exp_id: UUID,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(NotebookEntry)
        .where(NotebookEntry.experiment_id == exp_id)
        .order_by(NotebookEntry.entry_date.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/api/entries", response_model=NotebookEntryRead, status_code=201)
async def create_entry(
    body: NotebookEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    entry = NotebookEntry(**body.model_dump(), created_by_id=current_user.id)
    db.add(entry)
    await db.flush()  # get entry.id before history insert
    _save_history(db, entry.id, current_user.id, "created", {"title": entry.title, "code": entry.code})
    await db.commit()
    result = await db.execute(
        select(NotebookEntry)
        .options(
            selectinload(NotebookEntry.results),
            selectinload(NotebookEntry.attachments),
            selectinload(NotebookEntry.protocol),
        )
        .where(NotebookEntry.id == entry.id)
    )
    return _read_entry(result.scalar_one())


@router.get("/api/entries/{entry_id}", response_model=NotebookEntryRead)
async def get_entry(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(NotebookEntry)
        .options(
            selectinload(NotebookEntry.results),
            selectinload(NotebookEntry.attachments),
            selectinload(NotebookEntry.protocol),
        )
        .where(NotebookEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    return _read_entry(entry)


@router.patch("/api/entries/{entry_id}", response_model=NotebookEntryRead)
async def update_entry(
    entry_id: UUID,
    body: NotebookEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(NotebookEntry)
        .options(
            selectinload(NotebookEntry.results),
            selectinload(NotebookEntry.attachments),
            selectinload(NotebookEntry.protocol),
        )
        .where(NotebookEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    if entry.is_locked:
        raise HTTPException(status_code=403, detail="Entrée verrouillée — modification impossible")
    changed = body.model_dump(exclude_unset=True)
    old_values = {f: str(getattr(entry, f))[:200] for f in changed if f != "body_md"}
    if "body_md" in changed:
        old_values["body_md"] = "[contenu modifié]"
    for field, value in changed.items():
        setattr(entry, field, value)
    _save_history(db, entry.id, current_user.id, "updated", old_values or None)
    await db.commit()
    # Reload fresh with all relationships after commit
    refreshed = await db.execute(
        select(NotebookEntry)
        .options(
            selectinload(NotebookEntry.results),
            selectinload(NotebookEntry.attachments),
            selectinload(NotebookEntry.protocol),
        )
        .where(NotebookEntry.id == entry_id)
    )
    return _read_entry(refreshed.scalar_one())


@router.delete("/api/entries/{entry_id}", status_code=204)
async def delete_entry(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(NotebookEntry).where(NotebookEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    if entry.is_locked:
        raise HTTPException(status_code=403, detail="Entrée verrouillée — suppression impossible")
    await db.delete(entry)
    await db.commit()


@router.get("/api/entries/{entry_id}/history", response_model=list[EntryHistoryRead])
async def get_entry_history(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    from app.db.models.user import User
    result = await db.execute(
        select(NotebookEntryHistory)
        .where(NotebookEntryHistory.entry_id == entry_id)
        .order_by(NotebookEntryHistory.created_at.desc())
        .limit(50)
    )
    history = result.scalars().all()
    user_ids = {h.user_id for h in history if h.user_id}
    user_map: dict[UUID, str] = {}
    if user_ids:
        ur = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in ur.scalars():
            user_map[u.id] = u.full_name or u.username
    return [
        EntryHistoryRead(
            id=h.id,
            entry_id=h.entry_id,
            user_id=h.user_id,
            user_name=user_map.get(h.user_id) if h.user_id else None,
            action=h.action,
            changed_fields=h.changed_fields,
            created_at=h.created_at,
        )
        for h in history
    ]


@router.post("/api/entries/{entry_id}/lock", response_model=NotebookEntryRead)
async def lock_entry(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(NotebookEntry)
        .options(
            selectinload(NotebookEntry.results),
            selectinload(NotebookEntry.attachments),
            selectinload(NotebookEntry.protocol),
        )
        .where(NotebookEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    entry.is_locked = True
    _save_history(db, entry.id, current_user.id, "locked")
    await db.commit()
    await db.refresh(entry)
    return _read_entry(entry)


# ── Entry Results ─────────────────────────────────────────────────────────────

@router.post("/api/entries/{entry_id}/results", response_model=EntryResultRead, status_code=201)
async def add_result(
    entry_id: UUID,
    body: EntryResultCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result_obj = EntryResult(**body.model_dump(), entry_id=entry_id)
    db.add(result_obj)
    await db.commit()
    await db.refresh(result_obj)
    return result_obj


@router.patch("/api/entries/{entry_id}/results/{result_id}", response_model=EntryResultRead)
async def update_result(
    entry_id: UUID,
    result_id: UUID,
    body: EntryResultUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    res = await db.execute(
        select(EntryResult).where(EntryResult.id == result_id, EntryResult.entry_id == entry_id)
    )
    result_obj = res.scalar_one_or_none()
    if result_obj is None:
        raise HTTPException(status_code=404, detail="Résultat introuvable")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(result_obj, field, value)
    await db.commit()
    await db.refresh(result_obj)
    return result_obj


@router.delete("/api/entries/{entry_id}/results/{result_id}", status_code=204)
async def delete_result(
    entry_id: UUID,
    result_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(EntryResult).where(EntryResult.id == result_id, EntryResult.entry_id == entry_id)
    )
    result_obj = result.scalar_one_or_none()
    if result_obj is None:
        raise HTTPException(status_code=404, detail="Résultat introuvable")
    await db.delete(result_obj)
    await db.commit()


# ── Entry Attachments ─────────────────────────────────────────────────────────

@router.post("/api/entries/{entry_id}/attachments", response_model=EntryAttachmentRead, status_code=201)
async def upload_attachment(
    entry_id: UUID,
    kind: str = "image",
    caption: str | None = None,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(NotebookEntry).where(NotebookEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrée introuvable")

    entry_dir = UPLOADS_DIR / "entries" / str(entry_id)
    entry_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "file").suffix
    stored_name = f"{uuid_module.uuid4().hex}{ext}"
    storage_path = f"entries/{entry_id}/{stored_name}"
    content = await file.read()
    (UPLOADS_DIR / storage_path).write_bytes(content)

    thumbnail_path = None
    if file.content_type and file.content_type.startswith("image/"):
        try:
            import io
            from PIL import Image
            img = Image.open(io.BytesIO(content))
            img.thumbnail((400, 400))
            thumb_name = f"thumb_{stored_name}"
            img.save(entry_dir / thumb_name)
            thumbnail_path = f"entries/{entry_id}/{thumb_name}"
        except Exception:
            pass

    att = EntryAttachment(
        entry_id=entry_id,
        kind=kind,
        filename=stored_name,
        original_name=file.filename or stored_name,
        mime_type=file.content_type,
        size_bytes=len(content),
        caption=caption,
        storage_path=storage_path,
        thumbnail_path=thumbnail_path,
    )
    db.add(att)
    await db.commit()
    await db.refresh(att)
    return att


@router.delete("/api/entries/{entry_id}/attachments/{att_id}", status_code=204)
async def delete_attachment(
    entry_id: UUID,
    att_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(EntryAttachment).where(
            EntryAttachment.id == att_id, EntryAttachment.entry_id == entry_id
        )
    )
    att = result.scalar_one_or_none()
    if att is None:
        raise HTTPException(status_code=404, detail="Pièce jointe introuvable")
    for path_field in [att.storage_path, att.thumbnail_path]:
        if path_field:
            p = UPLOADS_DIR / path_field
            if p.exists():
                p.unlink()
    await db.delete(att)
    await db.commit()


# ── File Serving ──────────────────────────────────────────────────────────────

@router.get("/api/files/{path:path}")
async def serve_file(path: str, _=Depends(get_current_user)):
    safe_path = (UPLOADS_DIR / path).resolve()
    if not str(safe_path).startswith(str(UPLOADS_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Chemin invalide")
    if not safe_path.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return FileResponse(str(safe_path))

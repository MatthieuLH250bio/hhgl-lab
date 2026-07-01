import re
import uuid as uuid_module
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.bibliography import BibCollection, Reference, collection_refs
from app.deps import get_current_user, get_db
from app.schemas.bibliography import (
    CollectionCreate, CollectionRead, CollectionUpdate,
    DoiLookupRequest, DoiLookupResult,
    ReferenceCreate, ReferenceListItem, ReferenceRead, ReferenceUpdate,
)

router = APIRouter(tags=["bibliography"])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"


def _normalize_doi(raw: str) -> str:
    doi = raw.strip()
    doi = re.sub(r"^https?://doi\.org/", "", doi)
    doi = re.sub(r"^doi:", "", doi, flags=re.IGNORECASE)
    return doi.strip()


def _strip_jats(text: str | None) -> str | None:
    if not text:
        return None
    return re.sub(r"<[^>]+>", "", text).strip()


async def _load_ref(db: AsyncSession, ref_id: UUID) -> Reference:
    result = await db.execute(
        select(Reference)
        .where(Reference.id == ref_id)
        .options(selectinload(Reference.collections))
    )
    ref = result.scalar_one_or_none()
    if ref is None:
        raise HTTPException(404, "Référence introuvable")
    return ref


# ── Collections ───────────────────────────────────────────────────────────────

@router.get("/api/collections", response_model=list[CollectionRead])
async def list_collections(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(BibCollection).order_by(BibCollection.name))
    return result.scalars().all()


@router.post("/api/collections", response_model=CollectionRead, status_code=201)
async def create_collection(
    body: CollectionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    col = BibCollection(**body.model_dump())
    db.add(col)
    await db.commit()
    await db.refresh(col)
    return col


@router.patch("/api/collections/{col_id}", response_model=CollectionRead)
async def update_collection(
    col_id: UUID,
    body: CollectionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(BibCollection).where(BibCollection.id == col_id))
    col = result.scalar_one_or_none()
    if col is None:
        raise HTTPException(404, "Dossier introuvable")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(col, k, v)
    await db.commit()
    await db.refresh(col)
    return col


@router.delete("/api/collections/{col_id}", status_code=204)
async def delete_collection(
    col_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(BibCollection).where(BibCollection.id == col_id))
    col = result.scalar_one_or_none()
    if col is None:
        raise HTTPException(404, "Dossier introuvable")
    await db.delete(col)
    await db.commit()


@router.post("/api/collections/{col_id}/refs/{ref_id}", status_code=204)
async def add_ref_to_collection(
    col_id: UUID,
    ref_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    col_result = await db.execute(select(BibCollection).where(BibCollection.id == col_id))
    col = col_result.scalar_one_or_none()
    if col is None:
        raise HTTPException(404, "Dossier introuvable")

    ref = await _load_ref(db, ref_id)
    if col.id not in {c.id for c in ref.collections}:
        ref.collections.append(col)
        await db.commit()


@router.delete("/api/collections/{col_id}/refs/{ref_id}", status_code=204)
async def remove_ref_from_collection(
    col_id: UUID,
    ref_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ref = await _load_ref(db, ref_id)
    ref.collections = [c for c in ref.collections if c.id != col_id]
    await db.commit()


# ── DOI lookup — must come before /{ref_id} routes ───────────────────────────

@router.post("/api/references/doi-lookup", response_model=DoiLookupResult)
async def doi_lookup(
    body: DoiLookupRequest,
    _=Depends(get_current_user),
):
    doi = _normalize_doi(body.doi)
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"https://api.crossref.org/works/{doi}",
                headers={"User-Agent": "HHGL-Lab/0.1 (mailto:contact@hhgl.fr)"},
                timeout=10,
            )
    except httpx.RequestError as exc:
        raise HTTPException(503, f"Impossible de contacter CrossRef: {exc}")

    if r.status_code == 404:
        raise HTTPException(404, "DOI introuvable dans CrossRef")
    if r.status_code != 200:
        raise HTTPException(502, f"CrossRef a renvoyé {r.status_code}")

    msg = r.json().get("message", {})

    titles = msg.get("title", [])
    title = titles[0] if titles else "Sans titre"

    authors: list[str] = []
    for a in msg.get("author", []):
        family = a.get("family", "")
        given = a.get("given", "")
        if family:
            initials = "".join(p[0] for p in given.split() if p) if given else ""
            authors.append(f"{family} {initials}".strip())

    journal_list = msg.get("short-container-title") or msg.get("container-title") or []
    journal = journal_list[0] if journal_list else None

    date_parts = msg.get("issued", {}).get("date-parts", [[]])
    year = date_parts[0][0] if date_parts and date_parts[0] else None

    return DoiLookupResult(
        title=title,
        authors=authors,
        journal=journal,
        year=year,
        doi=msg.get("DOI", doi),
        abstract=_strip_jats(msg.get("abstract")),
    )


# ── References CRUD ───────────────────────────────────────────────────────────

@router.get("/api/references", response_model=list[ReferenceListItem])
async def list_references(
    q: str = Query(""),
    collection_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    if collection_id:
        stmt = (
            select(Reference)
            .join(collection_refs, Reference.id == collection_refs.c.ref_id)
            .where(collection_refs.c.collection_id == collection_id)
            .order_by(Reference.year.desc().nullslast(), Reference.created_at.desc())
        )
    else:
        stmt = select(Reference).order_by(Reference.year.desc().nullslast(), Reference.created_at.desc())

    result = await db.execute(stmt)
    refs = list(result.scalars().all())

    if q:
        q_low = q.lower()
        refs = [
            r for r in refs
            if q_low in r.title.lower()
            or any(q_low in a.lower() for a in (r.authors or []))
            or (r.journal and q_low in r.journal.lower())
            or (r.doi and q_low in r.doi.lower())
        ]
    return refs


@router.post("/api/references", response_model=ReferenceRead, status_code=201)
async def create_reference(
    body: ReferenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ref = Reference(**body.model_dump(), added_by_id=current_user.id)
    db.add(ref)
    await db.commit()
    return await _load_ref(db, ref.id)


@router.get("/api/references/{ref_id}", response_model=ReferenceRead)
async def get_reference(
    ref_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await _load_ref(db, ref_id)


@router.patch("/api/references/{ref_id}", response_model=ReferenceRead)
async def update_reference(
    ref_id: UUID,
    body: ReferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ref = await _load_ref(db, ref_id)
    if ref.added_by_id is not None and ref.added_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Vous ne pouvez modifier que vos propres références")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(ref, k, v)
    ref.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return await _load_ref(db, ref_id)


@router.delete("/api/references/{ref_id}", status_code=204)
async def delete_reference(
    ref_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Reference).where(Reference.id == ref_id))
    ref = result.scalar_one_or_none()
    if ref is None:
        raise HTTPException(404, "Référence introuvable")
    if ref.added_by_id is not None and ref.added_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Vous ne pouvez supprimer que vos propres références")
    await db.delete(ref)
    await db.commit()


# ── PDF ──────────────────────────────────────────────────────────────────────

@router.post("/api/references/{ref_id}/pdf", response_model=ReferenceRead)
async def upload_pdf(
    ref_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    ref = await _load_ref(db, ref_id)

    pdf_dir = UPLOADS_DIR / "bibliography" / str(ref_id)
    pdf_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid_module.uuid4().hex}.pdf"
    dest = pdf_dir / filename
    content = await file.read()
    dest.write_bytes(content)

    if ref.pdf_path:
        old = UPLOADS_DIR / ref.pdf_path
        if old.exists():
            old.unlink(missing_ok=True)

    ref.pdf_path = f"bibliography/{ref_id}/{filename}"
    ref.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return await _load_ref(db, ref_id)

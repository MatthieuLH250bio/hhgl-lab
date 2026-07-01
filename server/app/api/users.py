from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import hash_password
from app.db.models.user import User
from app.deps import get_current_user, get_db

router = APIRouter(tags=["users"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserListItem(BaseModel):
    id: UUID
    username: str
    full_name: str | None
    email: str
    role: str
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: str
    username: str
    full_name: str | None = None
    password: str
    role: str = "member"


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None


class MeUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(403, "Réservé aux administrateurs")
    return current_user


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/api/users", response_model=list[UserListItem])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(User)
        .where(User.is_active == True)
        .order_by(User.full_name, User.username)
    )
    return result.scalars().all()


@router.post("/api/users", response_model=UserListItem, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(_require_admin),
):
    existing = await db.execute(
        select(User).where((User.email == body.email) | (User.username == body.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email ou nom d'utilisateur déjà utilisé")

    user = User(
        email=body.email,
        username=body.username,
        full_name=body.full_name,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/api/users/me", response_model=UserListItem)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    return result.scalar_one()


@router.patch("/api/users/me", response_model=UserListItem)
async def update_me(
    body: MeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.password is not None:
        if len(body.password) < 6:
            raise HTTPException(422, "Le mot de passe doit faire au moins 6 caractères")
        user.password_hash = hash_password(body.password)

    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/api/users/{user_id}", response_model=UserListItem)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(_require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(404, "Utilisateur introuvable")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password is not None:
        user.password_hash = hash_password(body.password)

    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user

"""
Script à lancer UNE FOIS pour créer le premier compte admin.
Usage : python seed_admin.py
"""
import asyncio

from sqlalchemy import select

from app.auth.security import hash_password
from app.db.models.user import User
from app.db.session import AsyncSessionLocal


async def seed():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@hhgl.local"))
        if result.scalar_one_or_none():
            print("L'admin existe déjà.")
            return

        user = User(
            email="admin@hhgl.local",
            username="admin",
            full_name="Administrateur",
            password_hash=hash_password("changeme"),
            role="admin",
        )
        db.add(user)
        await db.commit()
        print("Admin créé : admin@hhgl.local / changeme")
        print("⚠️  Change le mot de passe dès la première connexion !")


if __name__ == "__main__":
    asyncio.run(seed())

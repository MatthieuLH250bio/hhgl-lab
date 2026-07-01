# PyInstaller spec — HHGL Server Launcher (bundle uvicorn + FastAPI)

import sys
from pathlib import Path

ROOT   = Path(SPECPATH).parent.parent          # hhgl-lab/
SERVER = Path(SPECPATH).parent                  # hhgl-lab/server/launcher/
ICON   = ROOT / "client" / "src-tauri" / "icons" / "icon.ico"

a = Analysis(
    [str(Path(SPECPATH) / "launcher.py")],
    pathex=[str(ROOT / "server")],
    binaries=[],
    datas=[
        (str(ICON), "."),
        # Dossier app/ du serveur (routes, models, schemas…)
        (str(ROOT / "server" / "app"), "app"),
        # Migrations Alembic
        (str(ROOT / "server" / "alembic"), "alembic"),
        (str(ROOT / "server" / "alembic.ini"), "."),
    ],
    hiddenimports=[
        "psutil",
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "fastapi",
        "starlette",
        "sqlalchemy",
        "sqlalchemy.dialects.postgresql",
        "asyncpg",
        "passlib",
        "passlib.handlers",
        "passlib.handlers.bcrypt",
        "jose",
        "jose.jwt",
        "pydantic",
        "pydantic_settings",
        "httpx",
        "dotenv",
        "app.main",
        "app.db.base",
        "app.db.session",
        "app.db.models",
        "app.api",
        "app.auth",
        "app.schemas",
        "app.deps",
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="HHGL Serveur",
    debug=False,
    strip=False,
    upx=True,
    console=False,
    icon=str(ICON) if ICON.exists() else None,
)

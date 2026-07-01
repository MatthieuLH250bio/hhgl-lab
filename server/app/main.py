from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.routes import router as auth_router
from app.api.plasmids import router as plasmids_router
from app.api.strains import router as strains_router
from app.api.cell_lines import router as cell_lines_router
from app.api.cell_line_passages import router as cell_line_passages_router
from app.api.primers import router as primers_router
from app.api.antibodies import router as antibodies_router
from app.api.viruses import router as viruses_router
from app.api.notebook import router as notebook_router
from app.api.bibliography import router as bibliography_router
from app.api.protocols import router as protocols_router
from app.api.dashboard import router as dashboard_router
from app.api.search import router as search_router
from app.api.users import router as users_router

app = FastAPI(title="HHGL Lab API", version="0.1.0")

# Autorise l'app Tauri à appeler l'API (obligatoire pour les appels cross-origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "tauri://localhost",       # Tauri sur Mac/Linux
        "http://tauri.localhost",  # Tauri sur Windows
        "http://localhost:1420",   # Vite en mode dev
    ],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(plasmids_router)
app.include_router(strains_router)
app.include_router(cell_lines_router)
app.include_router(cell_line_passages_router)
app.include_router(primers_router)
app.include_router(antibodies_router)
app.include_router(viruses_router)
app.include_router(notebook_router)
app.include_router(bibliography_router)
app.include_router(protocols_router)
app.include_router(dashboard_router)
app.include_router(search_router)
app.include_router(users_router)


@app.get("/health")
async def health():
    return {"status": "ok"}

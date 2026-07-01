# 01 · Architecture

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│  RÉSEAU LOCAL DU LABO (Ethernet)                            │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────────────┐  │
│  │ Machine serveur  │         │ Postes utilisateurs      │  │
│  │ (PC dédié)       │         │ (Mac / Windows / Linux)  │  │
│  │                  │         │                          │  │
│  │  ┌────────────┐  │  HTTP   │  ┌────────────────────┐  │  │
│  │  │ FastAPI    │◄─┼─────────┼──┤ App Tauri (React)  │  │  │
│  │  │ :8000      │  │  REST   │  │  - UI              │  │  │
│  │  └─────┬──────┘  │  JSON   │  │  - State (Zustand) │  │  │
│  │        │         │  + JWT  │  │  - Tauri commands  │  │  │
│  │  ┌─────▼──────┐  │         │  └────────────────────┘  │  │
│  │  │ PostgreSQL │  │         │                          │  │
│  │  │ :5432      │  │         │  Stockage local Tauri :  │  │
│  │  │            │  │         │   - JWT refresh token    │  │
│  │  │ + uploads/ │  │         │   - cache UI             │  │
│  │  │   PDFs,    │  │         │   - settings utilisateur │  │
│  │  │   images   │  │         │                          │  │
│  │  └────────────┘  │         └──────────────────────────┘  │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## Choix techniques justifiés

### Frontend — Tauri 2 + React 19 + TS + Tailwind v4

- **Tauri 2** : binaire desktop natif, ~10 Mo, pas de Chromium embarqué (utilise le webview de l'OS). Plus sûr que Electron, idéal pour une app interne de labo.
- **React 19** : Server Components inutiles ici (on est en SPA dans Tauri), mais `use()`, hooks améliorés, bonne DX.
- **TypeScript** : non négociable pour une app de données scientifiques où un mauvais type = données corrompues.
- **Tailwind v4** : CSS via `@import "tailwindcss"` dans `index.css`, config inline dans le CSS (pas de `tailwind.config.js`). Plus rapide, plus simple.
- **Zustand** : state global léger, pas de boilerplate Redux. Parfait pour partager l'utilisateur courant, le projet actif, etc.
- **Vite** : bundler par défaut de Tauri, rapide.

### Backend — FastAPI + SQLAlchemy 2.0 async + Postgres

- **FastAPI** : auto-doc Swagger/ReDoc gratuite (`/docs`), validation Pydantic, async natif. Excellent pour un labo qui veut explorer son API.
- **SQLAlchemy 2.0 async** : ORM mature, syntaxe moderne `select()`, `async with session`.
- **Postgres** : robustesse pour données scientifiques (transactions, JSONB pour les champs flexibles, full-text search natif).
- **Alembic** : migrations versionnées. Indispensable dès qu'il y a plusieurs utilisateurs et qu'on fait évoluer le schéma.
- **JWT (access + refresh)** : access courte durée (15 min), refresh longue (7 j) stocké côté client.

---

## Structure du repo

```
hhgl-lab/
├── handoff/                   # ← ce package (référence permanente)
│
├── client/                    # App Tauri
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── routes/            # Pages (Cahier, Base, Biblio, Protocoles)
│   │   │   ├── Notebook/
│   │   │   ├── Database/
│   │   │   ├── Bibliography/
│   │   │   ├── Protocols/
│   │   │   └── Tools/
│   │   ├── components/        # Composants réutilisables
│   │   │   ├── ui/            # Boutons, inputs, badges, modals…
│   │   │   ├── layout/        # Sidebar, Topbar, AppShell
│   │   │   └── domain/        # Composants métier (PlasmidCard, GelImage…)
│   │   ├── stores/            # Zustand stores
│   │   │   ├── auth.ts
│   │   │   ├── ui.ts          # theme, sidebar collapsed, page active
│   │   │   └── data.ts        # cache léger
│   │   ├── api/               # Client HTTP vers FastAPI
│   │   │   ├── client.ts      # fetch wrapper avec JWT
│   │   │   ├── plasmids.ts
│   │   │   ├── notebook.ts
│   │   │   └── …
│   │   ├── types/             # Types TS partagés (générés depuis OpenAPI)
│   │   ├── styles/
│   │   │   └── index.css      # Tailwind v4 + tokens
│   │   └── lib/
│   │       └── pdf.ts         # extraction métadonnées via pdfjs-dist
│   ├── src-tauri/             # Code Rust de Tauri
│   │   ├── src/main.rs
│   │   ├── tauri.conf.json
│   │   └── Cargo.toml
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
│
├── server/                    # API FastAPI
│   ├── app/
│   │   ├── main.py            # FastAPI app + middleware
│   │   ├── config.py          # settings via pydantic-settings
│   │   ├── deps.py            # dépendances (db session, current_user)
│   │   ├── auth/
│   │   │   ├── jwt.py
│   │   │   ├── routes.py      # POST /auth/login, /auth/refresh
│   │   │   └── security.py    # hash bcrypt
│   │   ├── db/
│   │   │   ├── base.py        # Base = declarative_base()
│   │   │   ├── session.py     # async engine + sessionmaker
│   │   │   └── models/        # 1 fichier par table
│   │   │       ├── user.py
│   │   │       ├── project.py
│   │   │       ├── plasmid.py
│   │   │       └── …
│   │   ├── schemas/           # Pydantic v2 (in/out)
│   │   ├── api/               # routers
│   │   │   ├── plasmids.py
│   │   │   ├── notebook.py
│   │   │   ├── biblio.py
│   │   │   └── …
│   │   ├── services/          # logique métier (PDF parsing, etc.)
│   │   └── uploads/           # PDFs, images, .dna  (dans .gitignore)
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── tests/
│   ├── alembic.ini
│   ├── pyproject.toml         # ou requirements.txt
│   └── .env.example
│
├── .gitignore
├── docker-compose.yml         # Postgres en dev (optionnel)
└── README.md
```

---

## Flux d'authentification

1. User entre login + mot de passe dans l'app Tauri
2. `POST /auth/login` → renvoie `{ access_token, refresh_token, user }`
3. `access_token` gardé en mémoire (Zustand) ; `refresh_token` stocké via Tauri stronghold ou `localStorage` (équipe interne, risque limité)
4. Chaque requête API : header `Authorization: Bearer <access_token>`
5. Si 401 → tentative de refresh via `POST /auth/refresh` avec le refresh_token
6. Si refresh échoue → logout, retour à la page login

---

## CORS

FastAPI doit autoriser l'origine `tauri://localhost` et `http://tauri.localhost` (selon plateforme) :

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["tauri://localhost", "http://tauri.localhost", "http://localhost:1420"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

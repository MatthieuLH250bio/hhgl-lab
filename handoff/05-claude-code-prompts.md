# 05 · Prompts Claude Code prêts à l'emploi

> Copie-colle ces prompts dans Claude Code dans l'ordre. Chaque section construit une partie de l'app.
> **Avant tout** : assure-toi que le dossier `handoff/` est dans ton repo et que tu as ouvert VS Code à la racine.

---

## 🟢 Étape 0 — Onboarding Claude Code

```
Lis les fichiers suivants dans cet ordre et fais-moi un résumé de ce que tu as compris avant qu'on commence à coder :

1. handoff/README.md
2. handoff/01-architecture.md
3. handoff/02-database-schema.md
4. handoff/03-modules-specs.md
5. handoff/04-design-tokens.md

Confirme que tu as compris :
- La stack (Tauri 2 + React 19 + TS + Tailwind v4 / FastAPI + SQLAlchemy + Postgres)
- Que je suis débutant et que tu dois m'expliquer les commandes git/npm/etc.
- Qu'on construit dans cet ordre : backend skeleton → frontend skeleton → modules un par un
```

---

## 🟢 Étape 1 — Backend skeleton

```
On démarre le backend. Suis exactement handoff/01-architecture.md section "Structure du repo" pour le dossier server/.

Crée :
1. server/pyproject.toml avec : fastapi, sqlalchemy[asyncio]>=2.0, asyncpg, alembic, pydantic-settings, python-jose[cryptography], passlib[bcrypt], python-multipart, httpx, pypdf, pillow
2. server/.env.example avec : DATABASE_URL, JWT_SECRET, JWT_ALGORITHM=HS256, ACCESS_TOKEN_EXPIRE_MINUTES=15, REFRESH_TOKEN_EXPIRE_DAYS=7, UPLOAD_DIR=./uploads
3. server/app/main.py — FastAPI app avec CORS pour Tauri
4. server/app/config.py — settings via pydantic-settings
5. server/app/db/session.py — async engine + AsyncSession
6. server/app/db/base.py — Base declarative
7. server/auth/ avec login + refresh + bcrypt + JWT
8. Initialise alembic : `alembic init alembic`

Explique-moi à chaque étape :
- Quelle commande lancer dans le terminal
- À quoi sert chaque fichier
- Comment vérifier que ça marche (curl/swagger)

Ne commence PAS encore les modèles métier. Juste le squelette + auth.
```

---

## 🟢 Étape 2 — Modèles SQLAlchemy + migrations

```
Maintenant les modèles. Lis handoff/02-database-schema.md.

Crée dans server/app/db/models/ un fichier par table. Ordre :
1. user.py
2. project.py + experiment.py
3. notebook_entry.py + entry_result.py + entry_attachment.py + entry_link.py
4. plasmid.py + plasmid_feature.py
5. strain.py, cell_line.py, primer.py, antibody.py, virus.py
6. paper.py + paper_attachment.py
7. protocol.py + protocol_step.py

Pour chaque modèle :
- Respecte EXACTEMENT les colonnes de handoff/02
- Utilise SQLAlchemy 2.0 Mapped[type] syntax
- UUID en PK avec server_default=uuid_generate_v4() (active extension Postgres dans la 1ère migration)
- created_at/updated_at automatiques

Une fois tous les modèles écrits :
1. Génère la 1ère migration : `alembic revision --autogenerate -m "initial schema"`
2. Vérifie le contenu de la migration générée AVANT de l'appliquer
3. Applique : `alembic upgrade head`
4. Crée un script seed_admin.py qui crée un user admin par défaut
```

---

## 🟢 Étape 3 — Routes API (par module)

À refaire pour chaque module dans cet ordre : **Database → Notebook → Bibliography → Protocols**.

```
On code le module {NOM_DU_MODULE}.

Réfère-toi à handoff/03-modules-specs.md section "{NOM}" pour les routes attendues.

Pour chaque ressource :
1. server/app/schemas/{resource}.py — Pydantic v2 (Create / Update / Read / List)
2. server/app/api/{resource}.py — router avec toutes les routes du spec
3. Inscris le router dans main.py
4. Écris des tests pytest minimaux dans server/tests/test_{resource}.py (au moins create + list + get)

Lance les tests après chaque ressource : `pytest server/tests/test_{resource}.py`

Ne saute pas les tests, même si ça paraît long — c'est ce qui empêche la dette technique sur une app avec autant de tables.
```

---

## 🟢 Étape 4 — Import PDF (Bibliographie)

```
Implémente l'import PDF. Réfère-toi à handoff/03-modules-specs.md section "Import PDF — flux détaillé".

1. Crée server/app/services/pdf_metadata.py avec :
   - extract_text_first_page(file_bytes) -> str (via pypdf)
   - find_doi(text) -> str | None (regex 10\.\d{4,}/[^\s]+)
   - fetch_crossref(doi) -> dict (via httpx async)
   - extract_metadata(file_bytes) -> { title, authors, journal, year, doi, abstract }

2. Ajoute la route POST /api/papers/import-pdf qui :
   - reçoit un UploadFile
   - sauvegarde sous uploads/papers/{uuid}.pdf
   - appelle extract_metadata
   - crée le paper avec status='to_read'
   - retourne le paper

3. Tests : un PDF avec DOI connu, un PDF sans DOI (heuristique).
```

---

## 🟢 Étape 5 — Frontend skeleton (Tauri + React + Tailwind v4)

```
On démarre le client. À la racine du repo :

1. Crée le projet Tauri 2 :
   cd client
   npm create tauri-app@latest .
   → React, TypeScript, npm

2. Ajoute Tailwind v4 :
   npm install -D tailwindcss @tailwindcss/vite
   - Configure vite.config.ts pour utiliser le plugin tailwindcss
   - Dans src/styles/index.css mets `@import "tailwindcss";` en haut + les variables CSS de handoff/04-design-tokens.md
   - Importe index.css depuis main.tsx

3. Installe : zustand, react-router-dom, @tanstack/react-query, react-markdown, remark-gfm

4. Crée la structure :
   src/
     api/client.ts        # fetch wrapper avec JWT (lit le token depuis le store auth)
     stores/auth.ts       # Zustand : user, accessToken, login(), logout()
     stores/ui.ts         # Zustand : theme (light/dark), sidebarCollapsed
     components/layout/AppShell.tsx     # sidebar + topbar + outlet
     components/layout/Sidebar.tsx      # cf maquette (Workspace + Tools collapsibles)
     routes/Login.tsx
     App.tsx              # Router + auth guard

5. Implémente :
   - Login.tsx : form simple, appel POST /auth/login, stocke tokens
   - AppShell : sidebar avec sections (Workspace, Tools)
   - Routes vides (placeholder) pour /notebook, /database, /bibliography, /protocols, /tools

6. Lance : `npm run tauri dev`

Explique-moi chaque commande npm et chaque concept React (Router, Zustand) au passage.
```

---

## 🟢 Étape 6 — Pages frontend (par module)

À refaire pour chaque module.

```
On code la page {NOM_MODULE} côté client.

Référence visuelle : handoff/mockup-reference/lab-pages.jsx (cherche `function Page{NOM}` ou `function Screen{NOM}`).
Reproduis le layout (3 colonnes pour Notebook et Bibliography, 2 pour Protocols, etc.) en utilisant Tailwind v4 et les variables CSS du :root.

NE COPIE PAS le JSX brut — c'est inline-styled. Réécris en Tailwind classes propres + composants réutilisables.

Pour chaque page :
1. routes/{Module}/index.tsx — page principale (liste + sélection)
2. routes/{Module}/{Resource}Detail.tsx — panneau détail
3. api/{module}.ts — fonctions client qui appellent les routes FastAPI
4. types/{module}.ts — types TS (idéalement générés depuis OpenAPI via openapi-typescript)
5. Hook React Query pour list + get + mutations

Ordre : Database → Notebook → Bibliography → Protocols.
```

---

## 🟢 Étape 7 — Build & déploiement labo

```
Build l'app pour distribution :

1. Backend : déploie sur le PC serveur du labo
   - Installe Postgres, crée la DB
   - Clone le repo, installe deps Python
   - Lance avec uvicorn derrière un service systemd (Linux) ou NSSM (Windows)
   - Note l'IP locale (ex: 192.168.1.10:8000)

2. Frontend : build le binaire Tauri pour chaque OS de l'équipe
   - Dans client/ : `npm run tauri build`
   - Le binaire est sous src-tauri/target/release/bundle/
   - Avant build, mets l'URL du serveur dans une variable d'env VITE_API_URL=http://192.168.1.10:8000

3. Distribue le binaire à l'équipe (.dmg pour Mac, .msi pour Windows, .AppImage pour Linux)

Explique-moi pas à pas comment je fais ça en débutant.
```

# 06 · Glossaire & commandes pour débutant

> Pour les commandes que tu vas devoir taper dans le terminal de VS Code.
> Ouvre le terminal : **Ctrl+`** (backtick) ou menu **Terminal → New Terminal**.

---

## Git — versionner le code

| Commande | À quoi ça sert |
|---|---|
| `git init` | Crée un repo Git dans le dossier courant (1 seule fois) |
| `git status` | Voir les fichiers modifiés / ajoutés |
| `git add .` | Ajouter tous les fichiers modifiés au prochain commit |
| `git commit -m "message"` | Sauvegarder un point de restauration |
| `git log --oneline` | Voir l'historique |
| `git diff` | Voir ce qui a changé depuis le dernier commit |
| `git checkout -b ma-branche` | Créer et switcher sur une nouvelle branche |
| `git checkout main` | Revenir sur la branche principale |
| `git push` | Envoyer les commits vers GitHub (si distant configuré) |

**Conseil** : commit après chaque petite étape qui marche. Mieux vaut 50 petits commits que 1 énorme.

---

## npm — installer les paquets JS

| Commande | À quoi ça sert |
|---|---|
| `npm install` | Installer toutes les deps listées dans `package.json` |
| `npm install <paquet>` | Ajouter un paquet (ex: `npm install zustand`) |
| `npm install -D <paquet>` | Ajouter un paquet de dev (typescript, tailwind…) |
| `npm run dev` | Lancer le mode développement |
| `npm run build` | Compiler pour la production |
| `npm run tauri dev` | Lancer l'app Tauri en mode dev (avec hot reload) |
| `npm run tauri build` | Construire le binaire desktop final |

---

## Python — backend

| Commande | À quoi ça sert |
|---|---|
| `python -m venv .venv` | Créer un environnement Python isolé (1 seule fois) |
| `.venv\Scripts\activate` (Windows) ou `source .venv/bin/activate` (Mac/Linux) | Activer l'env (à faire à chaque nouvelle session terminal) |
| `pip install -e .` | Installer les deps du `pyproject.toml` |
| `uvicorn app.main:app --reload` | Lancer FastAPI en dev (autoreload) |
| `pytest` | Lancer les tests |
| `alembic revision --autogenerate -m "msg"` | Créer une migration depuis les changements de modèles |
| `alembic upgrade head` | Appliquer les migrations à la DB |
| `alembic downgrade -1` | Annuler la dernière migration |

> ⚠️ Toujours vérifier qu'on a bien activé le venv (le prompt doit afficher `(.venv)`).

---

## Postgres — base de données

| Commande | À quoi ça sert |
|---|---|
| `psql -U postgres` | Ouvrir le client SQL en tant qu'admin |
| `CREATE DATABASE hhgl_lab;` | Créer la DB |
| `CREATE USER hhgl WITH PASSWORD 'secret';` | Créer un user dédié |
| `GRANT ALL PRIVILEGES ON DATABASE hhgl_lab TO hhgl;` | Donner les droits |
| `\l` | Lister les DBs |
| `\dt` | Lister les tables (dans une DB) |
| `\q` | Quitter psql |

**Outils GUI** : DBeaver (gratuit) ou TablePlus pour explorer la DB visuellement — plus simple que psql au début.

---

## Tauri — concepts clés

- **Tauri = wrapper** : ton app est un site React, mais empaqueté dans un binaire desktop natif.
- `src/` = code React (frontend)
- `src-tauri/` = code Rust (très peu modifié)
- `tauri.conf.json` = config (titre fenêtre, icône, perms, URLs autorisées)
- En dev : Tauri lance Vite (port 1420) + ouvre une fenêtre native pointant dessus
- En prod : Tauri compile React en HTML/JS statique et l'embarque dans le binaire

---

## FastAPI — concepts clés

- `@app.get("/path")` = définit une route GET
- `Depends(get_db)` = injection de dépendances (session DB, user courant…)
- Documentation auto : ouvre `http://localhost:8000/docs` dans le navigateur — tu peux tester chaque route directement
- `pydantic.BaseModel` = définit la forme des données (in/out de l'API)

---

## React — concepts clés (rappel)

- **Composant** : fonction qui retourne du JSX (HTML-like). Nommée en PascalCase.
- **Props** : arguments passés au composant.
- **State** : `useState` pour des données qui changent et redessinent le composant.
- **Effect** : `useEffect` pour faire un truc quand le composant monte ou que des données changent.
- **Zustand** : remplace les Context multiples — un store simple partagé entre composants.
- **React Query** : gère le cache, le loading, les erreurs des appels API. Tu décris la requête, il s'occupe du reste.

---

## Workflow type d'une session

1. Ouvrir VS Code à la racine du repo
2. Ouvrir 2 terminaux :
   - **Terminal 1** (backend) : `cd server && source .venv/bin/activate && uvicorn app.main:app --reload`
   - **Terminal 2** (frontend) : `cd client && npm run tauri dev`
3. Ouvrir Claude Code (Cmd+Esc / Ctrl+Esc) et lui donner une tâche
4. Tester les changements dans la fenêtre Tauri qui s'est ouverte
5. Quand un truc marche : `git add . && git commit -m "..."`

---

## Si tu es bloqué

- Lis le message d'erreur en ENTIER (pas juste la dernière ligne).
- Donne le message d'erreur à Claude Code en disant *"j'ai cette erreur en lançant `<la commande>` : <colle l'erreur>"*.
- Si Postgres ne se connecte pas : vérifie qu'il tourne (`pg_isready`), que `DATABASE_URL` est bon, que la DB existe.
- Si CORS bloque : vérifie que `tauri://localhost` est dans `allow_origins` du middleware FastAPI.

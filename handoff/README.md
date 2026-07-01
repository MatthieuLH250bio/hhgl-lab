# HHGL — App de Labo · Handoff Développement

> Package de référence pour démarrer le développement avec **Claude Code** dans VS Code.
> Stack : **Tauri 2 + React 19 + TS + Tailwind v4** (client) · **FastAPI + SQLAlchemy + Postgres** (serveur).

---

## 📂 Contenu du dossier `handoff/`

| Fichier | Contenu |
|---|---|
| `README.md` | Ce document — démarrage, vue d'ensemble |
| `01-architecture.md` | Schéma global, choix techniques, structure repo |
| `02-database-schema.md` | Schéma Postgres complet (tables, relations, index) |
| `03-modules-specs.md` | Specs détaillées par module (Cahier, Base, Biblio, Protocoles, Outils) |
| `04-design-tokens.md` | Couleurs, typo, espacements, composants — extraits de la maquette |
| `05-claude-code-prompts.md` | Prompts prêts à coller dans Claude Code, étape par étape |
| `06-glossaire-debutant.md` | Lexique git/npm/Tauri/FastAPI pour démarrer |
| `07-prompts-par-module.md` | **Prompts prêts à coller**, un par module, dans l'ordre exact du build |
| `mockup-reference/` | Code JSX/CSS de la maquette à donner à Claude Code comme référence visuelle |

---

## 🚀 Plan d'attaque (pour un débutant)

### Étape 1 — Installer ton environnement (1-2h)
- [ ] Installer **VS Code** : <https://code.visualstudio.com/>
- [ ] Installer **Git** : <https://git-scm.com/downloads>
- [ ] Installer **Node.js LTS** (v20+) : <https://nodejs.org/>
- [ ] Installer **Python 3.11+** : <https://www.python.org/downloads/>
- [ ] Installer **Rust** (pour Tauri) : <https://rustup.rs/>
- [ ] Installer **PostgreSQL 16+** : <https://www.postgresql.org/download/>
- [ ] Installer **Claude Code** dans VS Code : extension Marketplace, ou CLI `npm install -g @anthropic-ai/claude-code`

> 👉 Voir `06-glossaire-debutant.md` pour les commandes de base.

### Étape 2 — Créer le repo (30 min)
```bash
mkdir hhgl-lab && cd hhgl-lab
git init
mkdir client server
```

Ouvre le dossier dans VS Code : `code .`

### Étape 3 — Lancer Claude Code et lui donner le handoff (1h)
1. Ouvre Claude Code dans VS Code (Cmd+Esc / Ctrl+Esc, ou icône Claude)
2. **Copie tout le dossier `handoff/`** dans la racine de ton repo
3. Premier prompt à envoyer :

```
J'ai un dossier `handoff/` avec les specs complètes d'une app de labo
que je veux construire. Lis tous les fichiers .md de handoff/ d'abord,
puis confirme que tu as compris l'architecture avant qu'on commence.
```

4. Ensuite, suis `05-claude-code-prompts.md` étape par étape — chaque section
   correspond à un module à construire dans l'ordre.

### Étape 4 — Construire le MVP (2-4 semaines selon rythme)
Ordre recommandé :
1. **Backend skeleton** — FastAPI + Postgres + Alembic + auth JWT
2. **Frontend skeleton** — Tauri + React + Tailwind + sidebar/routing
3. **Module Base de données** (CRUD plasmides, souches…) — le socle
4. **Module Cahier de labo** (entrées, projets)
5. **Module Bibliographie** (papiers + import PDF)
6. **Module Protocoles**
7. **Outils** (Plasmid Studio, calculateurs)

> ⚠️ Ne tente pas tout d'un coup. Termine et teste un module avant de passer au suivant.

---

## 🧠 Comment utiliser ce handoff avec Claude Code

À chaque nouveau module / nouvelle session :
1. Ouvre Claude Code
2. Dis-lui : *"Avant de coder X, relis `handoff/03-modules-specs.md` section X et `handoff/02-database-schema.md` pour les tables concernées."*
3. Ensuite copie le prompt correspondant depuis `05-claude-code-prompts.md`

---

## 📚 Référence visuelle

La maquette de référence est dans `handoff/mockup-reference/`.
**Ne la copie PAS telle quelle** — c'est juste un mockup statique.
Mais la palette, la typo, la structure des écrans (sidebar, listes, panneaux 3-colonnes pour le Cahier et la Biblio) doivent être respectées.

Tu peux dire à Claude Code :
> *"Réfère-toi à `handoff/mockup-reference/lab-pages.jsx` pour la structure visuelle de la page Bibliographie. Reproduis le layout 3 colonnes (rail statuts | liste papiers | panneau résumé)."*

---

## ❓ FAQ rapide

**Q : Tauri vs Electron ?**
Tauri = + léger (~10 Mo vs 150 Mo), + sécurisé, mais Rust à apprendre. Pour ton cas (équipe labo, app desktop), Tauri 2 est le bon choix.

**Q : FastAPI tourne où ?**
Sur **un PC du labo** désigné comme serveur (ou un petit NUC). Les autres machines y accèdent via le câble Ethernet, sur un port (ex: `http://192.168.1.10:8000`).

**Q : Postgres tourne où ?**
Sur la même machine que FastAPI, en local. Pas de cloud.

**Q : Comment les utilisateurs lancent l'app ?**
Tu compiles Tauri en `.exe` / `.app` / `.AppImage` (`npm run tauri build`) et tu distribues le binaire à l'équipe. L'app se connecte au serveur FastAPI du labo.

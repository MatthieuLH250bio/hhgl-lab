# 03 · Specs détaillées par module

## 🧪 Module Cahier de labo

### Écrans
1. **Page principale** : layout 3 colonnes
   - **Gauche (300px)** : tree view Projets → Expériences → Entrées (chevrons collapsibles, couleur d'accent par projet)
   - **Centre (220px)** : liste compacte des entrées récentes (date mono + titre tronqué)
   - **Droite (1fr)** : lecteur d'entrée — titre, métadonnées, body Markdown rendu, **section Résultats** (KPIs + attachments grid)

2. **Création / édition d'entrée** : modal ou full-page avec éditeur Markdown (recommandé : `@uiw/react-md-editor` ou `tiptap`)

### Routes API
```
GET    /api/projects                                      → liste projets de l'user
POST   /api/projects                                      → créer
GET    /api/projects/{id}/experiments                     → expériences d'un projet
POST   /api/experiments
GET    /api/experiments/{id}/entries?limit=20             → entrées
POST   /api/entries
GET    /api/entries/{id}                                  → entrée complète + results + attachments + links
PATCH  /api/entries/{id}
POST   /api/entries/{id}/results                          → ajouter KPI
POST   /api/entries/{id}/attachments  (multipart)         → upload image/file
DELETE /api/entries/{id}/attachments/{attId}
POST   /api/entries/{id}/links                            → linker à un plasmide/paper/etc.
DELETE /api/entries/{id}/links/{linkId}
POST   /api/entries/{id}/lock                             → verrouille (lecture seule)
```

### Particularités
- Les entrées **lockées** (`is_locked = true`) ne peuvent plus être modifiées — uniquement consultées. Ajout d'un addendum possible.
- Les **attachments** sont stockés sous `uploads/entries/{entry_id}/{filename}`. Servis via `GET /api/files/{path}` avec contrôle d'accès JWT.
- Génération de thumbnails images via Pillow côté serveur à l'upload.

---

## 🧬 Module Base de données

### Écrans
- Layout 3 colonnes :
  - **Rail gauche (200px)** : catégories (Plasmides, Souches, Lignées, Primers, Anticorps, Virus) avec compteurs
  - **Centre (1fr)** : table dense filtrable + tri colonnes
  - **Panneau droit (380px)** : fiche détail de la ligne sélectionnée (avec édition inline)

- **Plasmid Studio** (sous-écran dédié) : carte circulaire SVG du plasmide avec features colorées + édition de séquence

### Routes API (pattern identique pour chaque ressource)
```
GET    /api/plasmids?q=&status=&page=&limit=
POST   /api/plasmids
GET    /api/plasmids/{id}
PATCH  /api/plasmids/{id}
DELETE /api/plasmids/{id}
GET    /api/plasmids/{id}/features
POST   /api/plasmids/{id}/features
```

Idem pour `/strains`, `/cell-lines`, `/primers`, `/antibodies`, `/viruses`.

### Recherche
- Search bar globale en haut → cherche dans `code`, `name`, et pour les plasmides aussi dans `sequence` (full-text Postgres).

### Outils intégrés
- **Calculateur Tm** (primers) : formule Wallace + nearest-neighbor
- **Calculateur GC%**
- **Reverse complement** d'une séquence
- **Alignement** : intégration `biopython` côté serveur ou `seq-align` côté client

---

## 📚 Module Bibliographie

### Écrans
Layout 3 colonnes (déjà dans la maquette) :
- **Rail gauche (200px)** : statuts (Tous, À lire, Partiel, Lu, Favoris) avec compteurs + tags cliquables
- **Centre (1fr)** : header avec **bouton "Importer PDF"** + zone drag-drop, puis liste papiers (badge statut, code, tags, titre, auteurs, journal, année)
- **Droite (380px)** : panneau détail — titre, auteurs, boutons (DOI, PDF, favori), **résumé personnel éditable**, items liés

### Routes API
```
GET    /api/papers?status=&q=&tag=&page=&limit=
POST   /api/papers                                  → création manuelle
POST   /api/papers/import-pdf  (multipart)          → upload + extraction métadonnées
POST   /api/papers/import-doi                       → body { doi: "10.1234/..." } → CrossRef lookup
GET    /api/papers/{id}
PATCH  /api/papers/{id}                             → màj statut, résumé perso, tags
DELETE /api/papers/{id}
POST   /api/papers/{id}/attachments  (multipart)
```

### Import PDF — flux détaillé
1. **Côté client** (Tauri) : drag-drop PDF → upload via `POST /api/papers/import-pdf`
2. **Côté serveur** :
   - Sauvegarde le PDF sous `uploads/papers/{uuid}.pdf`
   - Extrait le texte de la 1ère page avec `pypdf` ou `pdfminer.six`
   - Cherche un DOI via regex `10\.\d{4,}/[^\s]+`
   - Si DOI trouvé → query CrossRef API (`https://api.crossref.org/works/{doi}`) pour récupérer titre, auteurs, journal, année, abstract
   - Si pas de DOI → tente extraction heuristique (titre = premier bloc de texte avec font-size max ; auteurs = ligne suivante)
   - Crée le paper avec status `to_read`
   - Renvoie le paper créé
3. **Côté client** : ouvre la fiche en édition pour validation manuelle si certains champs manquent

### Lib recommandées
- Serveur : `pypdf`, `httpx` (pour CrossRef async), regex DOI
- Client (alternative) : `pdfjs-dist` pour preview du PDF dans le panneau droit

---

## 📋 Module Protocoles

### Écrans
- 2 colonnes :
  - **Gauche (340px)** : liste avec catégories colorées (bandeau gauche coloré par catégorie)
  - **Droite (1fr)** : lecteur Markdown détaillé avec sommaire latéral

### Routes API
```
GET    /api/protocols?category=&q=&status=
POST   /api/protocols
GET    /api/protocols/{id}
PATCH  /api/protocols/{id}
POST   /api/protocols/{id}/duplicate                → fork (incrémente version)
POST   /api/protocols/{id}/validate                 → status → validated
```

### Particularités
- Versioning simple : un protocole peut être "dupliqué" en `v1.1` à partir de `v1.0`. Garde l'historique.
- Affichage du Markdown via `react-markdown` + `remark-gfm`.

---

## 🛠️ Module Outils

Liste collapsible dans la sidebar :
- **Plasmid Studio** : route dédiée `/tools/plasmid/{id}`, carte circulaire interactive
- **Microscopie** : viewer pour images `.czi` / `.tif` (lib : `openseadragon` ou `viv`)
- **Calculateurs** : Tm primers, GC%, dilution, masse molaire
- **Alignement** : input 2 séquences → alignement Smith-Waterman côté serveur via biopython
- **Stats** : t-test, ANOVA basique sur des résultats numériques d'expé

Ces outils ne nécessitent pas tous une table dédiée — beaucoup sont des composants UI qui consomment les données existantes (plasmides, primers).

---

## 🔐 Auth & permissions

- **Roles** : `admin` (peut créer des users, supprimer n'importe quoi) · `member` (CRUD sur ce qu'il a créé, lecture sur le reste)
- Pour le MVP : pas de permissions fines, tout le monde peut tout lire et tout éditer (équipe de confiance). Ajouter plus tard si besoin.
- **Pages auth** : `/login` (pas de signup public — c'est l'admin qui crée les comptes via `/admin/users`).

---

## 📦 Uploads — règles

- Stockage sous `server/uploads/{module}/{resource_id}/{filename}`
- Limite par défaut : 50 Mo par fichier (configurable via `.env`)
- Types MIME autorisés : `application/pdf`, `image/*`, `application/octet-stream` (pour `.dna`, `.ab1`, `.czi`)
- Servi via `GET /api/files/{path}` avec vérif JWT (pas en static directory)

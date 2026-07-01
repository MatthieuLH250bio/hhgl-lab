# 07 · Prompts par module — prêts à coller dans Claude Code

> Pour chaque module, **copie-colle le prompt en entier** dans Claude Code.
> Suis l'ordre des sections — chaque module dépend du précédent.
> Entre deux modules : commit Git (`git add . && git commit -m "feat: module X"`), teste manuellement, puis passe au suivant.

---

## 🟦 Pré-requis (à faire UNE FOIS avant de commencer)

Tu dois avoir :
- ✅ Le repo `hhgl-lab/` créé avec `client/` et `server/` vides
- ✅ Le dossier `handoff/` copié à la racine du repo
- ✅ Postgres lancé en local avec une DB `hhgl_lab` créée
- ✅ Claude Code ouvert dans VS Code à la racine du repo
- ✅ Backend skeleton fait (cf `05-claude-code-prompts.md` Étapes 1 & 2)
- ✅ Frontend skeleton fait (cf `05-claude-code-prompts.md` Étape 5)

Si pas encore fait → lance `05-claude-code-prompts.md` Étapes 1, 2 et 5 d'abord.

---

# MODULE 1 — 🧬 BASE DE DONNÉES (Plasmides, Souches, etc.)

> 👉 **À faire en premier** : c'est le socle. Tous les autres modules linkent dessus.

## 1.1 — Backend Plasmides

```
On code la ressource Plasmides côté backend.

Lis d'abord :
- handoff/02-database-schema.md (sections "plasmids" et "plasmid_features")
- handoff/03-modules-specs.md (section "Module Base de données")

Crée :
1. server/app/schemas/plasmid.py — Pydantic v2 :
   - PlasmidBase (champs partagés)
   - PlasmidCreate (input POST)
   - PlasmidUpdate (input PATCH, tous champs optionnels)
   - PlasmidRead (output GET, avec id/created_at/updated_at)
   - PlasmidListItem (output liste, version allégée)
   - PlasmidFeatureCreate / PlasmidFeatureRead

2. server/app/api/plasmids.py — router avec les routes :
   - GET    /api/plasmids?q=&status=&page=1&limit=50
   - POST   /api/plasmids
   - GET    /api/plasmids/{id}                  → renvoie aussi features
   - PATCH  /api/plasmids/{id}
   - DELETE /api/plasmids/{id}
   - GET    /api/plasmids/{id}/features
   - POST   /api/plasmids/{id}/features
   - DELETE /api/plasmids/{id}/features/{feature_id}

3. Inscris le router dans server/app/main.py
4. Tests pytest dans server/tests/test_plasmids.py — au minimum :
   - create_plasmid_returns_201
   - list_plasmids_filters_by_q
   - get_plasmid_includes_features
   - patch_plasmid_updates_only_provided_fields

Lance les tests à la fin : `pytest server/tests/test_plasmids.py -v`
Arrête-toi avant de coder les autres ressources, je veux valider.
```

## 1.2 — Backend autres ressources (en lot)

```
On reproduit le pattern Plasmides pour les autres ressources de la base de données.

Référence : handoff/02-database-schema.md (sections strains, cell_lines, primers, antibodies, viruses)
Référence : handoff/03-modules-specs.md section "Module Base de données"

Pour chaque ressource ci-dessous, crée schemas/ + api/ + tests/, en suivant EXACTEMENT le même pattern que pour Plasmides :
- strains
- cell_lines
- primers
- antibodies
- viruses

Routes à créer pour chaque (remplace {resource}) :
- GET    /api/{resource}?q=&status=&page=&limit=
- POST   /api/{resource}
- GET    /api/{resource}/{id}
- PATCH  /api/{resource}/{id}
- DELETE /api/{resource}/{id}

Tests minimaux : create + list + get + patch.

À la fin : `pytest server/tests/ -v` doit tout passer.
```

## 1.3 — Frontend page Base de données

```
On code la page Base de données côté client.

Référence visuelle : handoff/mockup-reference/lab-pages.jsx (fonction PageDatabase)
Référence specs : handoff/03-modules-specs.md section "Module Base de données"

NE COPIE PAS le JSX inline — réécris en TS + Tailwind v4 propre.

Layout 3 colonnes (rail catégories | table | panneau détail) :
- Rail gauche (200px) : liste des catégories (Plasmides, Souches, Lignées, Primers, Anticorps, Virus) avec compteurs. Active = bg primary-soft + texte primary.
- Centre : table dense filtrable. Colonnes selon ressource. Tri par colonne. Search bar en haut.
- Panneau droit (380px) : fiche détail de la ligne sélectionnée, avec champs éditables inline.

Crée :
1. client/src/api/database.ts — un module par ressource :
   listPlasmids({ q, status, page, limit }), getPlasmid(id), createPlasmid(data), updatePlasmid(id, patch), deletePlasmid(id)
   + idem pour strains, cellLines, primers, antibodies, viruses
2. client/src/types/database.ts — types TS générés depuis OpenAPI (utilise `npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts`)
3. client/src/routes/Database/index.tsx — page principale (state : ressource active, ligne sélectionnée)
4. client/src/routes/Database/CategoryRail.tsx — rail gauche
5. client/src/routes/Database/ResourceTable.tsx — table générique paramétrée par colonnes
6. client/src/routes/Database/DetailPanel.tsx — panneau droit avec édition inline
7. Hooks React Query : useResourceList(resource, filters), useResource(resource, id), useCreateResource, useUpdateResource

Inscris la route dans le routeur (App.tsx) : `/database` + `/database/:resource` + `/database/:resource/:id`

À tester : créer un plasmide, le voir dans la table, l'éditer dans le panneau, supprimer.
```

---

# MODULE 2 — 🧪 CAHIER DE LABO

## 2.1 — Backend Projets + Expériences + Entrées

```
On code le module Cahier de labo côté backend.

Lis :
- handoff/02-database-schema.md (sections projects, experiments, notebook_entries, entry_results, entry_attachments, entry_links)
- handoff/03-modules-specs.md section "Module Cahier de labo"

Crée :
1. server/app/schemas/{project,experiment,entry,entry_result,entry_attachment,entry_link}.py
2. server/app/api/{projects,experiments,entries}.py avec les routes :
   - GET/POST/PATCH/DELETE  /api/projects
   - GET/POST/PATCH/DELETE  /api/experiments (avec filter ?project_id=)
   - GET/POST/PATCH/DELETE  /api/entries (avec filter ?experiment_id=)
   - GET                    /api/entries/{id}  → entrée + results + attachments + links
   - POST                   /api/entries/{id}/results
   - DELETE                 /api/entries/{id}/results/{result_id}
   - POST                   /api/entries/{id}/attachments  (multipart)
   - DELETE                 /api/entries/{id}/attachments/{att_id}
   - POST                   /api/entries/{id}/links
   - DELETE                 /api/entries/{id}/links/{link_id}
   - POST                   /api/entries/{id}/lock

3. server/app/services/uploads.py — fonction `save_upload(file, dest_dir)` qui :
   - vérifie taille (< 50 Mo)
   - vérifie MIME type
   - sauve sous uploads/{dest_dir}/{uuid}{ext}
   - génère thumbnail PIL si image
   - retourne (storage_path, thumbnail_path, mime_type, size_bytes)

4. server/app/api/files.py — GET /api/files/{path:path} qui sert les fichiers d'uploads/ avec vérif JWT
   IMPORTANT : path traversal protection — `os.path.realpath` doit rester sous UPLOAD_DIR

5. Tests pytest : create_entry, add_result, upload_attachment, link_entry_to_plasmid, lock_entry_makes_immutable.

À la fin : `pytest server/tests/test_entries.py -v` passe.
```

## 2.2 — Frontend page Cahier

```
On code la page Cahier de labo côté client.

Référence visuelle : handoff/mockup-reference/lab-pages.jsx (fonction PageCahier)
Référence specs : handoff/03-modules-specs.md section "Module Cahier de labo"

Layout 3 colonnes :
- Gauche (300px) : tree view Projets → Expériences → Entrées
   - Chevrons collapsibles à chaque niveau
   - Couleur d'accent par projet (8px barre verticale à gauche)
   - Indentation : projet 0px, expé 16px, entrée 32px
   - Entrée active = bg primary-soft + fg primary fontWeight 600
- Centre (220px) : liste compacte entrées récentes (date mono + titre tronqué) — bouton + en haut pour nouvelle entrée
- Droite (1fr) : lecteur d'entrée avec :
   - Header : code mono, date, tags, bouton lock/edit
   - Body Markdown rendu via react-markdown + remark-gfm
   - **Section Résultats** : 4 KPIs en grille (key, value, unit, tone coloré) + grille 2x2 d'attachments (gel/microscopy/chromatogram/plate) avec caption + filename mono
   - Footer : auteur + nombre de références liées

Crée :
1. client/src/api/notebook.ts (projects, experiments, entries, results, attachments, links)
2. client/src/routes/Notebook/index.tsx
3. client/src/routes/Notebook/ProjectTree.tsx (gauche)
4. client/src/routes/Notebook/RecentList.tsx (centre)
5. client/src/routes/Notebook/EntryReader.tsx (droite, mode lecture)
6. client/src/routes/Notebook/EntryEditor.tsx (mode édition, éditeur MD)
7. client/src/routes/Notebook/ResultsSection.tsx (KPIs + attachments grid)
8. client/src/routes/Notebook/AttachmentCard.tsx (preview selon kind)

Pour l'éditeur Markdown : utilise `@uiw/react-md-editor` (`npm install @uiw/react-md-editor`).

Drag-drop d'images dans l'éditeur → upload via /api/entries/{id}/attachments → insère un lien dans le MD.

Inscris la route /notebook dans App.tsx.

Test : créer un projet, une expé, une entrée, ajouter un KPI, uploader une image de gel, voir le tout rendu.
```

---

# MODULE 3 — 📚 BIBLIOGRAPHIE

## 3.1 — Backend Papers + Import PDF

```
On code le module Bibliographie côté backend.

Lis :
- handoff/02-database-schema.md (sections papers, paper_attachments)
- handoff/03-modules-specs.md section "Module Bibliographie"

Crée :
1. server/app/schemas/paper.py (PaperCreate, PaperUpdate, PaperRead, PaperListItem)
2. server/app/api/papers.py avec :
   - GET    /api/papers?status=&q=&tag=&page=&limit=
   - POST   /api/papers
   - GET    /api/papers/{id}
   - PATCH  /api/papers/{id}        → permet de màj status, personal_summary_md, tags, is_favorite
   - DELETE /api/papers/{id}
   - POST   /api/papers/import-pdf  (multipart UploadFile)
   - POST   /api/papers/import-doi  (body { doi: str })
   - POST   /api/papers/{id}/attachments

3. server/app/services/pdf_metadata.py :
   - extract_text_first_page(file_bytes: bytes) -> str    (via pypdf)
   - find_doi(text: str) -> str | None                    (regex r'10\.\d{4,}/[^\s\)\]\>]+')
   - fetch_crossref(doi: str) -> dict                     (httpx async, https://api.crossref.org/works/{doi})
   - extract_metadata(file_bytes) -> dict avec title, authors, journal, year, doi, abstract
     1. extrait texte 1ère page
     2. cherche DOI
     3. si DOI trouvé → CrossRef lookup, fusionne avec extraction texte
     4. sinon → heuristique : titre = 1ère ligne longue (>30 chars), auteurs = ligne suivante

4. Le flux POST /api/papers/import-pdf :
   - reçoit UploadFile
   - lit en bytes
   - sauvegarde dans uploads/papers/{uuid}.pdf
   - appelle extract_metadata
   - crée le Paper avec status='to_read', added_by_id=current_user
   - crée un PaperAttachment kind='pdf' lié
   - retourne le PaperRead complet

5. Tests :
   - test_import_pdf_with_known_doi (fournis un PDF de test simple)
   - test_import_pdf_without_doi_falls_back_to_heuristic
   - test_update_paper_status
   - test_personal_summary_updates_timestamp

À la fin : `pytest server/tests/test_papers.py -v`.
```

## 3.2 — Frontend page Bibliographie

```
On code la page Bibliographie côté client.

Référence visuelle : handoff/mockup-reference/lab-pages.jsx (fonction PageBiblio)
Référence specs : handoff/03-modules-specs.md section "Module Bibliographie"

Layout 3 colonnes :
- Rail gauche (200px) : statuts (Tous, À lire, Partiel, Lu, Favoris) avec compteurs + tags cliquables
- Centre (1fr) :
   - Header avec titre, compteurs (164 papiers · 79 lus · 27 partiels · 58 à lire), boutons "DOI/PMID", "Importer PDF", "Ajouter"
   - **Zone drag-drop sous le header** : encadré pointillé avec icône upload, "Glissez un PDF ici pour l'importer", sous-texte "Métadonnées extraites automatiquement", bouton "Parcourir…"
   - Liste papiers : badge statut coloré (Lu vert / Partiel orange / À lire neutre), code mono, tags, titre, auteurs, journal, année
- Panneau droit (380px) : titre, auteurs, boutons (DOI / PDF / favori), **résumé personnel éditable** dans un encadré, items liés

Crée :
1. client/src/api/biblio.ts :
   listPapers, getPaper, createPaper, updatePaper, deletePaper, importPdf(file), importDoi(doi)
2. client/src/types/biblio.ts (depuis OpenAPI)
3. client/src/routes/Bibliography/index.tsx
4. client/src/routes/Bibliography/StatusRail.tsx (gauche)
5. client/src/routes/Bibliography/PaperList.tsx (centre)
6. client/src/routes/Bibliography/PdfDropzone.tsx — drag-drop avec onDrop qui appelle importPdf, affiche progress, sur succès → ouvre la fiche en mode édition pour validation manuelle
7. client/src/routes/Bibliography/PaperDetail.tsx (droite) avec :
   - StatusBadge cliquable pour changer le statut (À lire → Partiel → Lu)
   - Textarea résumé perso avec auto-save debounced (3s)
   - LinkedItems (Plasmid PLA-0118, Project PRJ-IL2)
8. client/src/routes/Bibliography/StatusBadge.tsx

Pour le drag-drop : utilise react-dropzone (`npm install react-dropzone`).
Pour l'auto-save : useDebounce + useMutation de React Query.

Inscris la route /bibliography dans App.tsx.

Test : drag un PDF d'un papier connu → métadonnées extraites → ouvre la fiche → écris un résumé perso → change statut Lu.
```

---

# MODULE 4 — 📋 PROTOCOLES

## 4.1 — Backend Protocols

```
On code le module Protocoles côté backend.

Lis :
- handoff/02-database-schema.md (sections protocols, protocol_steps)
- handoff/03-modules-specs.md section "Module Protocoles"

Crée :
1. server/app/schemas/protocol.py
2. server/app/api/protocols.py :
   - GET    /api/protocols?category=&q=&status=
   - POST   /api/protocols
   - GET    /api/protocols/{id}
   - PATCH  /api/protocols/{id}
   - DELETE /api/protocols/{id}
   - POST   /api/protocols/{id}/duplicate     → fork avec version incrémentée (v1.0 → v1.1)
   - POST   /api/protocols/{id}/validate      → status='validated'

3. Logique duplicate : copie le protocole + ses steps, parse la version actuelle (regex r'v(\d+)\.(\d+)'), incrémente la mineure, link via une éventuelle colonne forked_from_id (à ajouter au modèle si voulu).

4. Tests : create, duplicate_increments_version, validate_changes_status.
```

## 4.2 — Frontend page Protocoles

```
On code la page Protocoles côté client.

Référence visuelle : handoff/mockup-reference/lab-pages.jsx (fonction PageProtocoles ou ScreenProtocoles)
Référence specs : handoff/03-modules-specs.md section "Module Protocoles"

Layout 2 colonnes :
- Gauche (340px) : liste protocoles avec **bandeau gauche coloré par catégorie** (8px) :
   - molecular_biology → bleu
   - cell_culture → vert
   - biochem → violet
   - imaging → orange
   - other → gris
   Carte : code mono, titre, version, est_duration_min, badge statut.
- Droite (1fr) : lecteur Markdown détaillé avec :
   - Header : titre, version, durée estimée, tags, boutons (Dupliquer, Valider, Imprimer)
   - Sommaire latéral auto-généré depuis les ## du Markdown
   - Body : react-markdown + remark-gfm + classes Tailwind prose

Crée :
1. client/src/api/protocols.ts
2. client/src/routes/Protocols/index.tsx
3. client/src/routes/Protocols/ProtocolList.tsx
4. client/src/routes/Protocols/ProtocolReader.tsx
5. client/src/routes/Protocols/CategoryColors.ts (mapping catégorie → couleur)

Inscris la route /protocols.

Test : créer un protocole, le dupliquer (version doit incrémenter), le valider.
```

---

# MODULE 5 — 🛠️ OUTILS

> Ces outils sont **plus petits** et n'ont pas besoin de tables dédiées (ils consomment les données existantes).

## 5.1 — Plasmid Studio

```
On code le Plasmid Studio (carte circulaire interactive d'un plasmide).

Référence visuelle : handoff/mockup-reference/app.jsx (fonction ScreenPlasmid)
Référence specs : handoff/03-modules-specs.md section "Outils intégrés"

Crée :
1. client/src/routes/Tools/PlasmidStudio/[id].tsx
2. client/src/routes/Tools/PlasmidStudio/PlasmidMap.tsx — SVG circulaire :
   - cercle backbone (r=120)
   - features dessinées en arcs colorés selon kind (cds=bleu, promoter=vert, terminator=rouge, rbs=jaune, ori=violet, tag=orange)
   - labels positionnés tangentiellement
   - hover sur feature → tooltip avec nom, position, strand
3. client/src/routes/Tools/PlasmidStudio/SequenceViewer.tsx — affichage texte de la séquence avec coloration des features
4. client/src/routes/Tools/PlasmidStudio/FeaturePanel.tsx — liste éditable des features

Calculs nécessaires :
- arc SVG : convertir (start_bp, end_bp, length_bp) en (start_angle, end_angle) où 0bp = 12h, sens horaire
- path SVG : `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`

Inscris la route /tools/plasmid/:id.
```

## 5.2 — Calculateurs (Tm, GC%, dilution)

```
On code les calculateurs de poche.

Référence : handoff/03-modules-specs.md section "Outils intégrés"

Crée 1 page avec onglets :
1. client/src/routes/Tools/Calculators/index.tsx avec tabs : Tm, GC%, Dilution, Reverse Complement

Logique (côté client, pas besoin de backend) :
- Tm primer (Wallace, séquences ≤ 14 nt) : Tm = 2*(A+T) + 4*(G+C)
- Tm primer (nearest-neighbor, ≥ 15 nt) : utilise la lib `primer-tm` ou implémente la formule Allawi & SantaLucia 1997
- GC% : (G+C) / total * 100
- Reverse complement : map A↔T, G↔C, puis reverse
- Dilution : C1*V1 = C2*V2

UI : input séquence ou valeurs → calcul instantané onChange → résultat avec unité.

Pas besoin de tests serveur. Tests vitest pour les fonctions utils.
```

## 5.3 — Microscopie viewer (optionnel V2)

```
On code le viewer microscopie (peut être reporté en V2 si tu veux livrer plus vite).

Pour V2 : intègre OpenSeadragon (lib JS pour pan/zoom d'images très grandes) ou Viv (pour images bioformat).
Côté serveur : ajoute un endpoint qui convertit .czi/.tif en pyramides DZI (Deep Zoom) via libvips ou bioformats.

Skip pour le MVP, commente la route /tools/microscopy en "Bientôt disponible".
```

---

# 🔁 Après chaque module

Workflow systématique :

```bash
# 1. Tester manuellement dans l'app
npm run tauri dev   # dans client/
uvicorn app.main:app --reload   # dans server/

# 2. Lancer les tests automatisés
cd server && pytest -v
cd client && npm run test    # vitest

# 3. Commit
git add .
git commit -m "feat({module}): description"

# 4. Passer au module suivant
```

---

# 🎯 Recap de l'ordre recommandé

1. **Backend skeleton** (auth, DB connexion, Alembic) → cf `05-claude-code-prompts.md` Étapes 1 & 2
2. **Frontend skeleton** (Tauri, sidebar, login) → cf `05-claude-code-prompts.md` Étape 5
3. **Module 1 — Base de données** (1.1 → 1.2 → 1.3)
4. **Module 2 — Cahier de labo** (2.1 → 2.2)
5. **Module 3 — Bibliographie** (3.1 → 3.2)
6. **Module 4 — Protocoles** (4.1 → 4.2)
7. **Module 5 — Outils** (5.1 Plasmid Studio → 5.2 Calculateurs → 5.3 reporté V2)
8. **Build & déploiement** → cf `05-claude-code-prompts.md` Étape 7

Compte ~3-5 jours par module en débutant avec Claude Code.

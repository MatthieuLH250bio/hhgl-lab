# 02 · Schéma de base de données (Postgres)

> Toutes les tables ont `id UUID PRIMARY KEY`, `created_at`, `updated_at`.
> `created_by_id` pointe vers `users.id` quand pertinent.

## Diagramme synthétique

```
users ─┬─< projects ─< experiments ─< notebook_entries ─< entry_attachments
       │                                   │
       │                                   └─< entry_results (KPIs chiffrés)
       │
       ├─< plasmids ─< plasmid_features
       ├─< strains
       ├─< cell_lines
       ├─< primers
       ├─< antibodies
       ├─< viruses
       │
       ├─< papers ─< paper_tags
       │       └─< paper_attachments (PDF)
       │
       └─< protocols ─< protocol_steps
                   └─< protocol_tags

# Tables de liaison many-to-many :
notebook_entries ──< entry_links >── (plasmids | strains | papers | protocols | …)
```

---

## Table `users`

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `email` | VARCHAR(255) UNIQUE NOT NULL | |
| `username` | VARCHAR(64) UNIQUE NOT NULL | affichage `Léa M.` |
| `full_name` | VARCHAR(128) | |
| `password_hash` | VARCHAR(255) NOT NULL | bcrypt |
| `role` | ENUM('admin', 'member') NOT NULL DEFAULT 'member' | |
| `is_active` | BOOLEAN NOT NULL DEFAULT TRUE | |
| `created_at`, `updated_at` | TIMESTAMP | |

---

## Module Cahier de labo

### `projects`
Conteneur de niveau supérieur. Chaque projet a une couleur d'accent (visible dans la treeview).

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `code` | VARCHAR(32) UNIQUE NOT NULL | ex: `PRJ-IL2` |
| `name` | VARCHAR(255) NOT NULL | |
| `description` | TEXT | |
| `color` | VARCHAR(16) | hex/oklch, ex `#7C3AED` |
| `status` | ENUM('active', 'archived', 'paused') | |
| `owner_id` | UUID FK→users | |

### `experiments`
Sous-conteneur d'un projet. Une expérience regroupe plusieurs entrées de cahier.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `project_id` | UUID FK→projects NOT NULL | |
| `code` | VARCHAR(32) UNIQUE NOT NULL | ex: `EXP-042` |
| `title` | VARCHAR(255) NOT NULL | |
| `description` | TEXT | |
| `status` | ENUM('planned', 'running', 'done', 'failed') | |

### `notebook_entries`
| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `experiment_id` | UUID FK→experiments NOT NULL | |
| `code` | VARCHAR(32) UNIQUE NOT NULL | ex: `LN-2024-04-22` |
| `title` | VARCHAR(255) NOT NULL | |
| `body_md` | TEXT | corps en Markdown |
| `entry_date` | DATE NOT NULL | jour d'expé |
| `tags` | VARCHAR[] | tags libres |
| `is_locked` | BOOLEAN DEFAULT FALSE | une fois validé, lecture seule |
| `created_by_id` | UUID FK→users | |

Index : `(experiment_id, entry_date DESC)`, `GIN(tags)`.

### `entry_results` (KPIs chiffrés)
Pour les 4 KPIs de la maquette (rendement, A260/A280, etc.).

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `entry_id` | UUID FK→notebook_entries NOT NULL | |
| `key` | VARCHAR(64) NOT NULL | ex: `yield`, `a260_a280` |
| `label` | VARCHAR(128) NOT NULL | ex: `Rendement` |
| `value_num` | NUMERIC | valeur chiffrée |
| `value_text` | VARCHAR(64) | si non chiffrable, ex: `8/12` |
| `unit` | VARCHAR(32) | ex: `ng/µL`, `%` |
| `tone` | ENUM('success', 'warning', 'danger', 'neutral', 'primary') | couleur d'affichage |

### `entry_attachments`
Images de gel, microscopie, séquençage, plates, autres fichiers.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `entry_id` | UUID FK→notebook_entries NOT NULL | |
| `kind` | ENUM('gel', 'microscopy', 'chromatogram', 'plate', 'image', 'file') | |
| `filename` | VARCHAR(255) NOT NULL | |
| `original_name` | VARCHAR(255) | |
| `mime_type` | VARCHAR(64) | |
| `size_bytes` | BIGINT | |
| `caption` | TEXT | |
| `storage_path` | VARCHAR(512) NOT NULL | chemin relatif sous `uploads/` |
| `thumbnail_path` | VARCHAR(512) | généré à l'upload pour images |

### `entry_links` (many-to-many polymorphe)
Lie une entrée à n'importe quelle ressource (plasmide, paper, protocole…).

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `entry_id` | UUID FK→notebook_entries NOT NULL | |
| `target_type` | ENUM('plasmid', 'strain', 'cell_line', 'primer', 'antibody', 'virus', 'paper', 'protocol') NOT NULL | |
| `target_id` | UUID NOT NULL | FK logique selon target_type |

Index unique : `(entry_id, target_type, target_id)`.

---

## Module Base de données

### `plasmids`
| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `code` | VARCHAR(32) UNIQUE NOT NULL | ex: `PLA-0118` |
| `name` | VARCHAR(255) NOT NULL | ex: `pET28a-IL2-mut7` |
| `backbone` | VARCHAR(128) | ex: `pET28a` |
| `insert_name` | VARCHAR(255) | ex: `IL2-mut7 (F42A)` |
| `length_bp` | INT | longueur totale |
| `resistance` | VARCHAR[] | ex: `['kanamycin', 'ampicillin']` |
| `host_strain` | VARCHAR(64) | ex: `BL21(DE3)` |
| `sequence` | TEXT | séquence complète, full-text indexée |
| `notes_md` | TEXT | |
| `box_location` | VARCHAR(64) | ex: `Box-A3 / Slot-12` |
| `status` | ENUM('available', 'low', 'depleted', 'archived') | |

### `plasmid_features`
Annotations sur le plasmide pour le Plasmid Studio (CDS, promoter, terminator, RBS…).

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `plasmid_id` | UUID FK→plasmids NOT NULL | |
| `name` | VARCHAR(128) NOT NULL | |
| `kind` | ENUM('cds', 'promoter', 'terminator', 'rbs', 'ori', 'tag', 'misc') | |
| `start_bp` | INT NOT NULL | 1-indexé |
| `end_bp` | INT NOT NULL | |
| `strand` | ENUM('+', '-') | |
| `color` | VARCHAR(16) | |

### `strains`
| Colonne | Type | Notes |
|---|---|---|
| `code`, `name`, `species`, `genotype`, `parent_strain_id` (self FK), `box_location`, `notes_md`, `status` | | |

### `cell_lines`
| Colonne | Type | Notes |
|---|---|---|
| `code`, `name`, `species`, `tissue`, `passage_number`, `medium`, `notes_md`, `status` | | |

### `primers`
| Colonne | Type | Notes |
|---|---|---|
| `code`, `name`, `sequence` (5' → 3'), `length_nt`, `tm_celsius`, `gc_percent`, `target` (texte), `direction` (`forward`/`reverse`), `box_location`, `notes_md` | | |

### `antibodies`
| Colonne | Type | Notes |
|---|---|---|
| `code`, `name`, `target`, `host` (rabbit/mouse…), `clone`, `clonality` (mono/poly), `applications` (`['WB', 'IF', 'FACS']`), `vendor`, `catalog_number`, `lot`, `dilution`, `box_location`, `notes_md` | | |

### `viruses`
| Colonne | Type | Notes |
|---|---|---|
| `code`, `name`, `kind` (`lentivirus`/`AAV`/`adenovirus`…), `serotype`, `transgene`, `titer` (TU/mL), `volume_uL`, `bsl_level` (1/2), `box_location`, `notes_md` | | |

---

## Module Bibliographie

### `papers`
| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `code` | VARCHAR(32) UNIQUE NOT NULL | ex: `BIB-0142` |
| `status` | ENUM('to_read', 'partial', 'read') NOT NULL DEFAULT 'to_read' | |
| `title` | VARCHAR(512) NOT NULL | |
| `authors` | TEXT | format libre `Klein, A. et al.` |
| `journal` | VARCHAR(255) | |
| `year` | INT | |
| `doi` | VARCHAR(128) UNIQUE | |
| `pmid` | VARCHAR(32) UNIQUE | |
| `abstract` | TEXT | |
| `personal_summary_md` | TEXT | résumé écrit par l'utilisateur |
| `personal_summary_updated_at` | TIMESTAMP | |
| `is_favorite` | BOOLEAN DEFAULT FALSE | |
| `tags` | VARCHAR[] | |
| `added_by_id` | UUID FK→users | |

Index : `GIN(tags)`, `GIN(to_tsvector(title || authors || abstract))` pour search.

### `paper_attachments`
PDF du papier + figures éventuelles.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `paper_id` | UUID FK→papers NOT NULL | |
| `kind` | ENUM('pdf', 'figure', 'supp') | |
| `filename`, `mime_type`, `size_bytes`, `storage_path` | | |

---

## Module Protocoles

### `protocols`
| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `code` | VARCHAR(32) UNIQUE NOT NULL | ex: `PROT-022` |
| `category` | ENUM('molecular_biology', 'cell_culture', 'biochem', 'imaging', 'other') | couleurs latérales |
| `title` | VARCHAR(255) NOT NULL | |
| `body_md` | TEXT | corps en Markdown |
| `version` | VARCHAR(16) DEFAULT 'v1.0' | |
| `est_duration_min` | INT | durée estimée en minutes |
| `tags` | VARCHAR[] | |
| `status` | ENUM('draft', 'validated', 'deprecated') | |
| `created_by_id` | UUID FK→users | |

### `protocol_steps` (optionnel — si tu veux une vue "checklist")
| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `protocol_id` | UUID FK→protocols NOT NULL | |
| `order_index` | INT NOT NULL | |
| `title` | VARCHAR(255) | |
| `body_md` | TEXT | |
| `duration_min` | INT | |

---

## Index recommandés

```sql
CREATE INDEX idx_entries_exp_date ON notebook_entries(experiment_id, entry_date DESC);
CREATE INDEX idx_entries_tags ON notebook_entries USING GIN(tags);
CREATE INDEX idx_papers_tags ON papers USING GIN(tags);
CREATE INDEX idx_papers_search ON papers USING GIN(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(authors,'') || ' ' || coalesce(abstract,'')));
CREATE INDEX idx_plasmids_seq ON plasmids USING GIN(to_tsvector('simple', sequence)) WHERE sequence IS NOT NULL;
CREATE INDEX idx_links_target ON entry_links(target_type, target_id);
```

# Mockup de référence

Ces 3 fichiers sont **la maquette React** que tu as vue dans le navigateur.
**Ne les copie pas tels quels** dans `client/src/` — ils sont en JSX inline-styled, pas en TS + Tailwind.

Sers-t'en comme **référence visuelle** :
- `app.jsx` — montre le canvas multi-écrans (Cover, Accueil, Cahier, Database, Protocoles, Biblio, Plasmid Studio)
- `lab-pages.jsx` — contient les composants `AppShell`, `PageCahier`, `PageDatabase`, `PageProtocoles`, `PageBiblio`, `ResultImage`, etc.
- `index.css` — variables CSS (palette light/dark) que tu peux reprendre quasi à l'identique

## Comment l'utiliser avec Claude Code

> *"Pour la page Bibliographie, regarde `handoff/mockup-reference/lab-pages.jsx` (fonction `PageBiblio`). Reproduis le layout 3 colonnes (rail statuts | liste papiers | panneau résumé) en Tailwind v4 + composants TS propres. Garde la zone drag-drop d'import PDF sous le header. Ne copie pas le JSX brut — réécris-le proprement."*

## Mapping écrans → composants

| Écran de la maquette | Composant à reproduire |
|---|---|
| Accueil / launcher | `ScreenLauncher` (dans `app.jsx`) |
| Cahier de labo | `PageCahier` (dans `lab-pages.jsx`) |
| Base de données | `PageDatabase` |
| Protocoles | `PageProtocoles` / `ScreenProtocoles` |
| Bibliographie | `PageBiblio` |
| Plasmid Studio | `ScreenPlasmid` (dans `app.jsx`) |
| Sidebar | `Sidebar` (dans `lab-pages.jsx`) |
| Topbar | `Topbar` (dans `lab-pages.jsx`) |

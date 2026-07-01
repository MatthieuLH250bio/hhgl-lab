# Logo HHGL — variant 15b

Plasmide stylisé : disque dégradé bleu → teal avec hélice ADN crème.

## Fichiers

| Fichier | Usage |
|---|---|
| `logo-hhgl.svg` | Light mode — utilisable partout (scalable) |
| `logo-hhgl-dark.svg` | Dark mode — couleurs adaptées |
| `png/logo-hhgl-{16,32,64,128,256,512,1024}.png` | Exports raster pour favicon, app icon, etc. |
| `png/logo-hhgl-dark-{32,256,512}.png` | Idem en dark mode |

## Couleurs

| Élément | Light | Dark |
|---|---|---|
| Gradient début (bleu profond) | `#1e497a` | `#7eb1de` |
| Gradient fin (teal) | `#0d8a7a` | `#4cc4b1` |
| Hélice (crème) | `#fffdf8` | `#fffdf8` |

## Intégration

### Web / React
```tsx
import logoUrl from './logo/logo-hhgl.svg';

<img src={logoUrl} alt="HHGL" width={24} height={24} />
```

### Favicon
Renomme `png/logo-hhgl-32.png` en `favicon.png` ou utilise <https://realfavicongenerator.net/> avec le SVG pour générer la suite complète (.ico, apple-touch-icon, etc.).

### App icon Tauri
```bash
# Depuis la racine de ton projet Tauri (client/)
npx tauri icon ../logo/png/logo-hhgl-1024.png
```
Cette commande génère automatiquement toutes les tailles (.ico Windows, .icns macOS, PNG Linux) dans `src-tauri/icons/`.

### App icon iOS / Android (si tu fais Tauri Mobile plus tard)
Tauri génère aussi les tailles mobiles depuis le 1024px.

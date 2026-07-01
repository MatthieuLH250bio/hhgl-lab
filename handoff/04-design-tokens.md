# 04 · Design tokens (extraits de la maquette)

> Reproduis ces valeurs dans `client/src/styles/index.css` (Tailwind v4 inline config).

## Palette — direction Benchling-like (D2)

### Light mode
```css
:root {
  --bg:           #F8FAFB;   /* fond app */
  --surface:      #FFFFFF;   /* cards, panels */
  --surface-2:   #F1F4F7;    /* inputs, hover, badges neutres */

  --fg:           #0F1A24;   /* texte principal */
  --fg-muted:    #4B5A6B;    /* texte secondaire */
  --fg-subtle:   #8A98A6;    /* metadata, labels */

  --border:      #E2E7EC;
  --border-strong: #C9D1D9;

  --primary:     #1E5BC6;    /* bleu Benchling */
  --primary-hover:#1A4FAA;
  --primary-soft: color-mix(in oklab, var(--primary) 10%, transparent);

  --accent:      #7C3AED;    /* violet (favoris, projets) */
  --success:     #16A34A;    /* OK, validé, lu */
  --warning:     #D97706;    /* partiel */
  --danger:      #DC2626;    /* erreur */
}
```

### Dark mode
```css
.dark {
  --bg:           #0E141B;
  --surface:      #131B24;
  --surface-2:    #1B252F;

  --fg:           #E6ECF1;
  --fg-muted:     #A7B3BF;
  --fg-subtle:    #6E7C8A;

  --border:       #243140;
  --border-strong:#34465B;

  --primary:      #4D8FE8;
  --primary-hover:#6BA0EE;
  --primary-soft: color-mix(in oklab, var(--primary) 18%, transparent);

  --accent:       #A78BFA;
  --success:      #34D399;
  --warning:      #FBBF24;
  --danger:       #F87171;
}
```

## Typo
- **Sans** : `"Inter Tight", "Inter", system-ui, sans-serif` — UI et titres
- **Mono** : `"JetBrains Mono", "SF Mono", ui-monospace, monospace` — codes (PLA-0118), séquences ADN, valeurs chiffrées

## Échelle
- Radius : `8px` (`--radius`)
- Espacements : 4 / 6 / 8 / 12 / 16 / 24 / 32 px
- Tailles UI : labels uppercase 10–11px / body 12.5–13.5px / titres 15–18px
- Sidebar largeur : `240px` étendue, `64px` repliée

## Composants clés

### Boutons
- **Primary** : bg `--primary`, fg `#fff`, padding `6px 12px`, radius 6, fontSize 12.5, fontWeight 500
- **Secondary** (`topBtn`) : border `--border`, bg `--surface`, fg `--fg`, padding identique
- **Icon-only** : 28x28, radius 6, hover bg `--surface-2`

### Badges statut
- `Lu` → bg `success/14%`, fg `success`
- `Partiel` → bg `warning/14%`, fg `warning`
- `À lire` → bg `surface-2`, fg `fg-muted`

### Sidebar
- Items actifs : bg `--primary-soft`, fg `--primary`, fontWeight 600
- Sections collapsibles avec chevron rotatif (90° → 0°)

### Tree view (cahier)
- Ligne projet : couleur d'accent à gauche (8px), chevron, nom, code
- Ligne expérience : indentée 16px, chevron, code/titre
- Ligne entrée : indentée 32px, date mono + titre tronqué, active = `--primary-soft`

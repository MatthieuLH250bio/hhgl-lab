#!/usr/bin/env bash
# Lance le client HHGL (dev ou AppImage selon ce qui est disponible)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# AppImage produit par tauri build
APPIMAGE=$(find "$ROOT/client/src-tauri/target/release/bundle/appimage" \
    -name "*.AppImage" 2>/dev/null | head -1)

if [ -n "$APPIMAGE" ]; then
    echo "Lancement AppImage : $APPIMAGE"
    chmod +x "$APPIMAGE"
    exec "$APPIMAGE"
else
    echo "AppImage non trouvé — lancement en mode dev"
    cd "$ROOT/client"
    npm run tauri dev
fi

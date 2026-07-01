#!/usr/bin/env bash
# Build le client Tauri pour Linux (AppImage + deb)
# À lancer sur une machine Linux
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Dépendances Rust si absentes
if ! command -v cargo &>/dev/null; then
    echo "Installation de Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# Node si absent
if ! command -v node &>/dev/null; then
    echo "Node.js requis — installe-le via https://nodejs.org ou nvm"
    exit 1
fi

cd "$ROOT/client"
echo "Installation des dépendances npm..."
npm install

echo "Build Tauri Linux..."
npm run tauri build

echo ""
echo "Bundles disponibles dans :"
find src-tauri/target/release/bundle -name "*.AppImage" -o -name "*.deb" | while read f; do
    echo "  $f"
done

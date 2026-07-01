#!/usr/bin/env bash
# Lance le serveur HHGL en mode développement (logs dans le terminal)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER="$ROOT/server"

if [ ! -d "$SERVER/.venv" ]; then
    echo "Virtualenv absent — création..."
    python3 -m venv "$SERVER/.venv"
    "$SERVER/.venv/bin/pip" install -q -r "$SERVER/requirements.txt"
fi

cd "$SERVER"
echo "HHGL Serveur → http://localhost:8000"
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

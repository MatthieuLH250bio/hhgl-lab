#!/usr/bin/env bash
# HHGL Lab — Script d'installation Linux
# Usage : sudo bash install.sh
set -euo pipefail

BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; RESET="\033[0m"

step()  { echo -e "\n${BOLD}==> $1${RESET}"; }
ok()    { echo -e "    ${GREEN}✓ $1${RESET}"; }
warn()  { echo -e "    ${YELLOW}⚠ $1${RESET}"; }
fail()  { echo -e "    ${RED}✗ $1${RESET}"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$ROOT/server"
INSTALL_DIR="/opt/hhgl"
SERVICE_USER="${SUDO_USER:-$(whoami)}"

# ── 1. Dépendances système ────────────────────────────────────────────────────
step "Installation des dépendances système"
if command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y python3 python3-pip python3-venv postgresql postgresql-contrib \
        libwebkit2gtk-4.1-dev libssl-dev curl wget file \
        libxdo-dev libayatana-appindicator3-dev librsvg2-dev &>/dev/null
    ok "Paquets apt installés"
elif command -v dnf &>/dev/null; then
    dnf install -y python3 python3-pip postgresql-server postgresql-contrib \
        webkit2gtk4.1-devel openssl-devel curl wget &>/dev/null
    postgresql-setup --initdb 2>/dev/null || true
    ok "Paquets dnf installés"
else
    warn "Gestionnaire de paquets non reconnu — installe Python 3.10+, PostgreSQL et les dépendances Tauri manuellement"
fi

# ── 2. PostgreSQL ─────────────────────────────────────────────────────────────
step "Configuration PostgreSQL"
systemctl enable postgresql --now 2>/dev/null || \
    service postgresql start 2>/dev/null || true

# Crée la base et l'utilisateur si absents
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='hhgl'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE hhgl;" 2>/dev/null
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='hhgl'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER hhgl WITH PASSWORD 'hhgl' CREATEDB;" 2>/dev/null
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hhgl TO hhgl;" 2>/dev/null
ok "Base de données 'hhgl' prête"

# ── 3. Dossier d'installation ─────────────────────────────────────────────────
step "Copie des fichiers serveur"
mkdir -p "$INSTALL_DIR"
rsync -a --exclude='.venv' --exclude='__pycache__' --exclude='*.pyc' \
    --exclude='launcher' "$SERVER_DIR/" "$INSTALL_DIR/server/"
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
ok "Fichiers copiés dans $INSTALL_DIR"

# ── 4. Environnement Python ───────────────────────────────────────────────────
step "Création du virtualenv Python"
sudo -u "$SERVICE_USER" python3 -m venv "$INSTALL_DIR/server/.venv"
sudo -u "$SERVICE_USER" "$INSTALL_DIR/server/.venv/bin/pip" install -q --upgrade pip
sudo -u "$SERVICE_USER" "$INSTALL_DIR/server/.venv/bin/pip" install -q -r "$INSTALL_DIR/server/requirements.txt"
ok "Virtualenv prêt"

# ── 5. Fichier .env ───────────────────────────────────────────────────────────
step "Configuration .env"
ENV_FILE="$INSTALL_DIR/server/.env"
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql+asyncpg://hhgl:hhgl@localhost/hhgl
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EOF
    chown "$SERVICE_USER:$SERVICE_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    ok ".env créé avec clé secrète générée"
else
    ok ".env existant conservé"
fi

# ── 6. Migrations Alembic ─────────────────────────────────────────────────────
step "Migrations base de données"
cd "$INSTALL_DIR/server"
sudo -u "$SERVICE_USER" .venv/bin/alembic upgrade head
ok "Migrations appliquées"

# ── 7. Service systemd ────────────────────────────────────────────────────────
step "Installation du service systemd"
cp "$SCRIPT_DIR/hhgl-server.service" /etc/systemd/system/
sed -i "s|__USER__|$SERVICE_USER|g" /etc/systemd/system/hhgl-server.service
sed -i "s|__INSTALL_DIR__|$INSTALL_DIR|g" /etc/systemd/system/hhgl-server.service
systemctl daemon-reload
systemctl enable hhgl-server
systemctl start hhgl-server
ok "Service hhgl-server activé et démarré"

# ── 8. Compte admin ───────────────────────────────────────────────────────────
step "Création du compte admin"
cd "$INSTALL_DIR/server"
sudo -u "$SERVICE_USER" .venv/bin/python seed_admin.py 2>/dev/null || true
ok "Admin : admin@hhgl.local / changeme"

echo -e "\n${GREEN}${BOLD}════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  HHGL Lab installé avec succès !${RESET}"
echo -e "${GREEN}  Serveur : http://localhost:8000${RESET}"
echo -e "${GREEN}  Admin   : admin@hhgl.local / changeme${RESET}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════${RESET}\n"

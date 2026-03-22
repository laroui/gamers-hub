#!/usr/bin/env bash
# ============================================================
#  Gamers Hub — Server First-Time Setup
#  Run once on a fresh Ubuntu 22.04+ server as root/sudo
# ============================================================
set -euo pipefail

APP_USER="${APP_USER:-gamershub}"
APP_DIR="/opt/gamers-hub"

echo "🖥️  Setting up Gamers Hub server..."

# Install Docker
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$APP_USER" 2>/dev/null || true
fi

# Install Docker Compose plugin (v2)
if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose..."
  apt-get install -y docker-compose-plugin
fi

# Create app directory
mkdir -p "$APP_DIR"
chown "${APP_USER}:${APP_USER}" "$APP_DIR" 2>/dev/null || chown "$USER:$USER" "$APP_DIR"

# Copy env template
if [ ! -f "${APP_DIR}/.env" ]; then
  echo "⚠️  Creating .env from template..."
  cp .env.example "${APP_DIR}/.env"
  echo "   ✏️  Edit ${APP_DIR}/.env before starting!"
fi

echo ""
echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd $APP_DIR"
echo "  2. Edit .env (especially JWT_SECRET, JWT_REFRESH_SECRET, passwords)"
echo "  3. git clone <your-repo> ."
echo "  4. bash infra/scripts/deploy.sh"

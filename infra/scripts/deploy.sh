#!/usr/bin/env bash
# ============================================================
#  Gamers Hub — Production Deploy Script
#  Run on your server after: git pull origin main
# ============================================================
set -euo pipefail

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$APP_DIR"

echo "🚀 Deploying Gamers Hub..."
echo "   Directory: $APP_DIR"
echo "   Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Pull latest images (if using registry) or build
echo "📦 Building images..."
$COMPOSE build --no-cache api worker web

# Start services (zero-downtime: --no-deps means each service restarts independently)
echo "🔄 Starting services..."
$COMPOSE up -d --no-deps --remove-orphans

# Wait for API to be healthy
echo "⏳ Waiting for API health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API is healthy"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ API health check timed out after 30s"
    $COMPOSE logs api | tail -20
    exit 1
  fi
  sleep 1
done

# Run migrations
echo "🗄️  Running database migrations..."
$COMPOSE exec -T api node apps/api/dist/db/migrate.js

echo ""
echo "✅ Deploy complete!"
echo "   API: http://localhost:3000/health"
echo "   Web: http://localhost:80"

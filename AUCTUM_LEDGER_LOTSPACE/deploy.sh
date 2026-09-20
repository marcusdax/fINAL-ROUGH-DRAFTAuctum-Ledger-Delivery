#!/usr/bin/env bash
# Deploy Auctum Ledger to production.
# Usage: ./deploy.sh [environment]

set -euo pipefail

ENVIRONMENT=${1:-production}
REGISTRY="ghcr.io/marcusdax"
APP_IMAGE="$REGISTRY/auctum-ledger-app:latest"
PROXY_IMAGE="$REGISTRY/auctum-ledger-proxy:latest"

echo "Deploying Auctum Ledger to $ENVIRONMENT"
echo "  Frontend: $APP_IMAGE"
echo "  Backend:  $PROXY_IMAGE"
echo ""

# Verify images exist
echo "Verifying images..."
docker pull "$APP_IMAGE"
docker pull "$PROXY_IMAGE"

# Stop and remove old containers
echo "Stopping old services..."
docker compose -f app/docker-compose.yml -f docker-compose.prod.yml down --remove-orphans || true

# Start infrastructure and apply database migrations (one-shot service)
echo "Running database migrations..."
docker compose -f app/docker-compose.yml -f docker-compose.prod.yml \
  --profile migrate run --rm migrate

# Start all services
echo "Starting services..."
docker compose -f app/docker-compose.yml -f docker-compose.prod.yml up -d

# Wait for health checks
echo "Waiting for services to become healthy..."
sleep 5

# Verify deployment
echo "Deployment status:"
docker compose -f app/docker-compose.yml -f docker-compose.prod.yml ps

echo ""
echo "Recent logs:"
docker compose -f app/docker-compose.yml -f docker-compose.prod.yml logs --tail 20 app api

echo ""
echo "Deployment complete."
echo "  Frontend: http://localhost:80"
echo "  API:      http://localhost:3001/health"

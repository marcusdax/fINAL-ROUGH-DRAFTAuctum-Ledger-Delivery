#!/bin/bash
# Deploy Greensheet to production
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
REGISTRY="ghcr.io/marcusdax"
APP_IMAGE="$REGISTRY/greensheet-app:latest"
PROXY_IMAGE="$REGISTRY/greensheet-proxy:latest"

echo "🚀 Deploying Greensheet to $ENVIRONMENT"
echo "📦 Frontend: $APP_IMAGE"
echo "📦 Backend: $PROXY_IMAGE"
echo ""

# Verify images exist
echo "🔍 Verifying images..."
docker pull "$APP_IMAGE"
docker pull "$PROXY_IMAGE"

# Stop and remove old containers
echo "⛔ Stopping old services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans || true

# Pull and start new services
echo "🏃 Starting new services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Verify deployment
echo "✅ Deployment status:"
docker compose ps

# Show logs
echo ""
echo "📋 Recent logs:"
docker compose logs --tail 20 app proxy

echo ""
echo "✨ Deployment complete!"
echo "🌐 Frontend: http://localhost:8080"
echo "🔌 API Proxy: http://localhost:3001"

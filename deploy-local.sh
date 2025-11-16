#!/bin/bash
# Smart local deployment script with intelligent caching

set -e

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-podman-compose.yml}"
BUILD_MODE="${BUILD_MODE:-auto}"  # auto, force, skip

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

show_help() {
    echo "Storage Dashboard - Local Deployment"
    echo ""
    echo "Usage: ./deploy-local.sh [options]"
    echo ""
    echo "Options:"
    echo "  --dev         Use development configuration (hot-reload)"
    echo "  --prod        Use production configuration (default)"
    echo "  --force       Force rebuild (ignore cache)"
    echo "  --skip-build  Skip build, just restart containers"
    echo "  --logs        Show logs after deployment"
    echo "  -h, --help    Show this help"
    echo ""
    echo "Examples:"
    echo "  ./deploy-local.sh              # Production with smart caching"
    echo "  ./deploy-local.sh --dev        # Development mode"
    echo "  ./deploy-local.sh --force      # Force full rebuild"
    echo "  ./deploy-local.sh --logs       # Deploy and show logs"
}

# Parse arguments
SHOW_LOGS=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            COMPOSE_FILE="podman-compose.dev.yml"
            shift
            ;;
        --prod)
            COMPOSE_FILE="podman-compose.yml"
            shift
            ;;
        --force)
            BUILD_MODE="force"
            shift
            ;;
        --skip-build)
            BUILD_MODE="skip"
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

log "Storage Dashboard Local Deployment"
log "Using: $COMPOSE_FILE"

# Stop existing containers
log "Stopping existing containers..."
podman-compose -f "$COMPOSE_FILE" down 2>/dev/null || true

# Clean up dangling/old images to prevent using stale builds
log "Cleaning up old images..."
podman image prune -f --filter "dangling=true" >/dev/null 2>&1 || true

# Build strategy
case $BUILD_MODE in
    force)
        warn "Force rebuild requested (this may take a while)..."
        podman-compose -f "$COMPOSE_FILE" build --no-cache
        ;;
    skip)
        log "Skipping build..."
        ;;
    auto)
        log "Building with intelligent caching..."
        log "  - Reusing layers when possible"
        log "  - Only rebuilding changed components"
        # Build with cache - Docker will automatically reuse layers
        podman-compose -f "$COMPOSE_FILE" build
        ;;
esac

# Start containers
log "Starting containers..."
podman-compose -f "$COMPOSE_FILE" up -d

# Wait for health check
log "Waiting for application to be healthy..."
sleep 5

# Check health
MAX_ATTEMPTS=12
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        success "Application is healthy!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        error "Application failed to become healthy"
        warn "Check logs with: podman-compose -f $COMPOSE_FILE logs"
        exit 1
    fi
    echo -n "."
    sleep 5
done
echo ""

success "Deployment completed successfully!"
echo ""
echo "Application is running at: http://localhost:3001"
echo ""
echo "Useful commands:"
echo "  View logs:    podman-compose -f $COMPOSE_FILE logs -f"
echo "  Stop:         podman-compose -f $COMPOSE_FILE down"
echo "  Restart:      podman-compose -f $COMPOSE_FILE restart"
echo "  Shell:        podman-compose -f $COMPOSE_FILE exec storage-dashboard /bin/sh"

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
    echo ""
    log "Showing logs (Ctrl+C to exit)..."
    podman-compose -f "$COMPOSE_FILE" logs -f
fi

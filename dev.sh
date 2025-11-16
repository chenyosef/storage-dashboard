#!/bin/bash
# Development helper script for storage-dashboard

set -e

COMPOSE_FILE="podman-compose.dev.yml"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_help() {
    echo "Storage Dashboard - Development Helper"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start         - Start development environment (auto-builds if needed)"
    echo "  stop          - Stop development environment"
    echo "  restart       - Restart development environment"
    echo "  logs          - Show logs (follow mode)"
    echo "  rebuild       - Smart rebuild (only rebuilds changed layers)"
    echo "  force-rebuild - Force complete rebuild (ignores cache)"
    echo "  shell         - Open shell in running container"
    echo "  clean         - Stop and remove all containers, images, and volumes"
    echo ""
    echo "Development mode features:"
    echo "  - Server code changes auto-reload (no rebuild needed)"
    echo "  - Client changes require 'rebuild' command"
    echo "  - Dependencies changes require 'rebuild' command"
    echo "  - Smart caching: rebuilds only what changed"
}

case "${1:-}" in
    start)
        echo -e "${BLUE}Starting development environment...${NC}"
        # Clean up old images first
        podman image prune -f --filter "dangling=true" >/dev/null 2>&1 || true
        # Build with cache if needed (only rebuilds changed layers)
        podman-compose -f "$COMPOSE_FILE" build
        podman-compose -f "$COMPOSE_FILE" up -d
        echo -e "${GREEN}Development server started!${NC}"
        echo -e "${YELLOW}Server code changes will auto-reload (nodemon)${NC}"
        echo "View logs with: ./dev.sh logs"
        ;;

    stop)
        echo -e "${BLUE}Stopping development environment...${NC}"
        podman-compose -f "$COMPOSE_FILE" down
        echo -e "${GREEN}Stopped${NC}"
        ;;

    restart)
        echo -e "${BLUE}Restarting development environment...${NC}"
        podman-compose -f "$COMPOSE_FILE" restart
        echo -e "${GREEN}Restarted${NC}"
        ;;

    logs)
        echo -e "${BLUE}Showing logs (Ctrl+C to exit)...${NC}"
        podman-compose -f "$COMPOSE_FILE" logs -f
        ;;

    rebuild)
        echo -e "${BLUE}Rebuilding and restarting...${NC}"
        echo -e "${YELLOW}Using smart caching (only rebuilds changed layers)${NC}"
        podman-compose -f "$COMPOSE_FILE" down
        # Clean up old images
        podman image prune -f --filter "dangling=true" >/dev/null 2>&1 || true
        podman-compose -f "$COMPOSE_FILE" build
        podman-compose -f "$COMPOSE_FILE" up -d
        echo -e "${GREEN}Rebuild complete!${NC}"
        echo "View logs with: ./dev.sh logs"
        ;;

    force-rebuild)
        echo -e "${BLUE}Force rebuilding (ignoring cache)...${NC}"
        echo -e "${YELLOW}This will take longer but ensures a clean build${NC}"
        podman-compose -f "$COMPOSE_FILE" down
        podman-compose -f "$COMPOSE_FILE" build --no-cache
        podman-compose -f "$COMPOSE_FILE" up -d
        echo -e "${GREEN}Force rebuild complete!${NC}"
        echo "View logs with: ./dev.sh logs"
        ;;

    shell)
        echo -e "${BLUE}Opening shell in container...${NC}"
        podman-compose -f "$COMPOSE_FILE" exec storage-dashboard /bin/sh
        ;;

    clean)
        echo -e "${YELLOW}Warning: This will remove all containers, images, and volumes${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Cleaning up...${NC}"
            podman-compose -f "$COMPOSE_FILE" down -v
            podman rmi -f localhost/storage-dashboard_storage-dashboard:latest 2>/dev/null || true
            echo -e "${GREEN}Cleaned up${NC}"
        fi
        ;;

    *)
        show_help
        ;;
esac

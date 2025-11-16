#!/bin/bash

# Storage Dashboard Deployment Script for Podman
# This script provides easy deployment options for Podman

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="storage-dashboard"
CONTAINER_NAME="storage-dashboard-app"
NGINX_CONTAINER_NAME="storage-dashboard-nginx"
IMAGE_NAME="localhost/${APP_NAME}:latest"
DATA_VOLUME="storage-dashboard-data"

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Storage Dashboard Podman Deployment${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_requirements() {
    echo "Checking requirements..."
    
    if ! command -v podman &> /dev/null; then
        print_error "Podman is not installed or not in PATH"
        exit 1
    fi
    print_success "Podman found: $(podman --version)"
    
    if command -v podman-compose &> /dev/null; then
        print_success "podman-compose found: $(podman-compose --version)"
        COMPOSE_CMD="podman-compose"
    else
        print_warning "podman-compose not found, using manual deployment"
        COMPOSE_CMD=""
    fi
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found"
        if [ -f ".env.example" ]; then
            echo "Copying .env.example to .env - please configure it"
            cp .env.example .env
        else
            print_error ".env.example not found. Please create .env file manually."
            exit 1
        fi
    fi
    print_success "Environment configuration found"
}

build_image() {
    echo
    echo "Building application image..."

    # Clean up old/dangling images first
    echo "Cleaning up old images..."
    podman image prune -f --filter "dangling=true" >/dev/null 2>&1 || true

    # IPv4-only build flags with additional network configuration
    BUILD_FLAGS="--dns=8.8.8.8 --dns=8.8.4.4 --add-host=registry.npmjs.org:104.16.30.34"

    # Try the minimal build first (most reliable) with IPv4 DNS
    if podman build $BUILD_FLAGS --tag $IMAGE_NAME -f Dockerfile.minimal . 2>/dev/null; then
        print_success "Image built successfully (minimal build with IPv4)"
        return 0
    fi
    
    print_warning "Minimal build failed, trying simplified build..."
    
    # Try the simplified build with IPv4 DNS
    if podman build $BUILD_FLAGS --tag $IMAGE_NAME -f Dockerfile.simple . 2>/dev/null; then
        print_success "Image built successfully (simple build with IPv4)"
        return 0
    fi
    
    print_warning "Simple build failed, trying standard build..."
    
    # Fallback to standard multi-stage build with IPv4 DNS
    if podman build $BUILD_FLAGS --tag $IMAGE_NAME . ; then
        print_success "Image built successfully (standard build with IPv4)"
        return 0
    fi
    
    print_error "All build attempts failed"
    echo "Network connectivity issues detected. Try:"
    echo "  1. Check internet connection"
    echo "  2. Configure proxy if behind corporate firewall" 
    echo "  3. Run: podman build --network=host --tag $IMAGE_NAME -f Dockerfile.minimal ."
    echo "  4. Run: podman build --dns=1.1.1.1 --tag $IMAGE_NAME -f Dockerfile.minimal ."
    return 1
}

deploy_with_compose() {
    echo
    echo "Deploying with $COMPOSE_CMD..."
    
    if [ "$1" = "production" ]; then
        print_warning "Deploying in production mode with nginx"
        $COMPOSE_CMD --profile production up -d
    else
        $COMPOSE_CMD up -d
    fi
    
    print_success "Application deployed successfully"
}

deploy_manual() {
    echo
    echo "Deploying manually with Podman..."
    
    # Create volume if it doesn't exist
    if ! podman volume exists $DATA_VOLUME 2>/dev/null; then
        podman volume create $DATA_VOLUME
        print_success "Created data volume: $DATA_VOLUME"
    fi
    
    # Stop existing container if running
    if podman container exists $CONTAINER_NAME 2>/dev/null; then
        echo "Stopping existing container..."
        podman stop $CONTAINER_NAME || true
        podman rm $CONTAINER_NAME || true
    fi
    
    # Load environment variables
    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
    fi
    
    # Run the container
    podman run -d \
        --name $CONTAINER_NAME \
        --publish 3001:3001 \
        --volume $DATA_VOLUME:/app/data:Z \
        --env NODE_ENV=production \
        --env PORT=3001 \
        --env GOOGLE_SHEET_ID="$GOOGLE_SHEET_ID" \
        --env GOOGLE_CREDENTIALS_BASE64="$GOOGLE_CREDENTIALS_BASE64" \
        --env SYNC_INTERVAL_MINUTES="$SYNC_INTERVAL_MINUTES" \
        --user 1001:1001 \
        --userns=keep-id \
        --security-opt label=disable \
        --restart unless-stopped \
        $IMAGE_NAME
    
    print_success "Container started: $CONTAINER_NAME"
}

check_health() {
    echo
    echo "Checking application health..."
    
    # Wait a moment for the application to start
    sleep 5
    
    for i in {1..10}; do
        if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
            print_success "Application is healthy and responding"
            return 0
        fi
        echo "Waiting for application to start... ($i/10)"
        sleep 3
    done
    
    print_error "Application failed to respond to health check"
    echo "Check logs with: podman logs $CONTAINER_NAME"
    return 1
}

show_logs() {
    echo
    echo "Application logs:"
    echo "=================="
    if [ "$COMPOSE_CMD" != "" ]; then
        $COMPOSE_CMD logs --tail=50 storage-dashboard
    else
        podman logs --tail=50 $CONTAINER_NAME
    fi
}

show_status() {
    echo
    echo "Deployment Status:"
    echo "=================="
    
    if [ "$COMPOSE_CMD" != "" ]; then
        $COMPOSE_CMD ps
    else
        echo "Container Status:"
        podman ps --filter name=$CONTAINER_NAME
        echo
        echo "Volume Status:"
        podman volume ls --filter name=$DATA_VOLUME
    fi
    
    echo
    echo "Access URLs:"
    echo "- Dashboard: http://localhost:3001"
    echo "- Health Check: http://localhost:3001/api/health"
    echo "- API Documentation: http://localhost:3001/api/storage"
}

stop_application() {
    echo
    echo "Stopping application..."
    
    if [ "$COMPOSE_CMD" != "" ]; then
        $COMPOSE_CMD down
    else
        podman stop $CONTAINER_NAME 2>/dev/null || true
        podman rm $CONTAINER_NAME 2>/dev/null || true
    fi
    
    print_success "Application stopped"
}

cleanup() {
    echo
    echo "Cleaning up resources..."
    
    stop_application
    
    # Remove image
    podman rmi $IMAGE_NAME 2>/dev/null || true
    
    # Remove volume (optional)
    read -p "Remove data volume? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        podman volume rm $DATA_VOLUME 2>/dev/null || true
        print_success "Data volume removed"
    fi
    
    print_success "Cleanup completed"
}

show_help() {
    echo "Storage Dashboard Deployment Script"
    echo
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  deploy          Deploy the application (default)"
    echo "  deploy-prod     Deploy with nginx in production mode"
    echo "  stop            Stop the application"
    echo "  restart         Restart the application"
    echo "  status          Show application status"
    echo "  logs            Show application logs"
    echo "  health          Check application health"
    echo "  cleanup         Stop and remove all resources"
    echo "  build           Build the container image only"
    echo "  help            Show this help message"
    echo
    echo "Examples:"
    echo "  $0 deploy               # Deploy in development mode"
    echo "  $0 deploy-prod          # Deploy with nginx proxy"
    echo "  $0 logs                 # View recent logs"
    echo "  $0 status               # Check deployment status"
}

# Main script logic
print_header

case "${1:-deploy}" in
    "deploy")
        check_requirements
        build_image
        if [ "$COMPOSE_CMD" != "" ]; then
            deploy_with_compose
        else
            deploy_manual
        fi
        check_health
        show_status
        ;;
    "deploy-prod")
        check_requirements
        build_image
        if [ "$COMPOSE_CMD" != "" ]; then
            deploy_with_compose "production"
        else
            print_error "Production deployment requires podman-compose. Deploy manually or install podman-compose."
            exit 1
        fi
        check_health
        show_status
        ;;
    "build")
        check_requirements
        build_image
        ;;
    "stop")
        stop_application
        ;;
    "restart")
        stop_application
        $0 deploy
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "health")
        check_health
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo
        show_help
        exit 1
        ;;
esac
#!/bin/bash -x
set -e

# Storage Integration Dashboard - OpenShift Deployment Script
# This script deploys the Storage Integration Dashboard to an OpenShift cluster

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
APP_NAME="storage-dashboard"
NAMESPACE=${NAMESPACE:-storage-dashboard}
IMAGE_TAG=${IMAGE_TAG:-latest}
GOOGLE_SHEET_ID=${GOOGLE_SHEET_ID:-""}
GOOGLE_CREDENTIALS_FILE=${GOOGLE_CREDENTIALS_FILE:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if oc CLI is available
    if ! command -v oc &> /dev/null; then
        error "OpenShift CLI (oc) is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we're logged in to OpenShift
    if ! oc whoami &> /dev/null; then
        error "Not logged in to OpenShift. Please run 'oc login' first"
        exit 1
    fi
    
    # Check if Docker/Podman is available for building
    if ! command -v podman &> /dev/null && ! command -v docker &> /dev/null; then
        error "Neither podman nor docker is available for building the image"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Create or switch to namespace
setup_namespace() {
    log "Setting up namespace: $NAMESPACE"
    
    if oc get namespace "$NAMESPACE" &> /dev/null; then
        log "Namespace $NAMESPACE already exists"
    else
        log "Creating namespace $NAMESPACE"
        oc new-project "$NAMESPACE" || oc create namespace "$NAMESPACE"
    fi
    
    oc project "$NAMESPACE"
    success "Using namespace: $NAMESPACE"
}

# Build container image using OpenShift BuildConfig
build_image() {
    log "Building container image in OpenShift..."

    # Check if BuildConfig exists, create if not
    if ! oc get bc "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        log "Creating BuildConfig and ImageStream..."
        oc new-build --name="$APP_NAME" --binary --strategy=docker -n "$NAMESPACE"
        success "BuildConfig created"
    else
        log "Using existing BuildConfig"
    fi

    # Start build from local directory
    log "Uploading source code from local directory..."
    log "Building application in OpenShift (this may take several minutes)..."
    oc start-build "$APP_NAME" --from-dir="$PROJECT_ROOT" --follow -n "$NAMESPACE"

    # Get the new image digest to verify it's different
    local new_image=$(oc get istag "$APP_NAME:latest" -n "$NAMESPACE" -o jsonpath='{.image.metadata.name}' 2>/dev/null || echo "")
    if [[ -n "$new_image" ]]; then
        log "New image built: ${new_image:0:12}..."
    fi

    success "Container image built successfully in OpenShift"
}

# Validate required environment variables
validate_config() {
    log "Validating configuration..."
    
    if [[ -z "$GOOGLE_SHEET_ID" ]]; then
        warn "GOOGLE_SHEET_ID environment variable not set, using existing value from ConfigMap"
    fi
    
    # Only require credentials file if the secret has a placeholder
    if grep -q "REPLACE_WITH_BASE64_ENCODED_GOOGLE_CREDENTIALS" "$SCRIPT_DIR/secret.yaml"; then
        if [[ -z "$GOOGLE_CREDENTIALS_FILE" ]] || [[ ! -f "$GOOGLE_CREDENTIALS_FILE" ]]; then
            error "GOOGLE_CREDENTIALS_FILE must point to a valid Google Service Account JSON file"
            echo "Set it with: export GOOGLE_CREDENTIALS_FILE='/path/to/credentials.json'"
            exit 1
        fi
    else
        log "Using existing Google credentials from Secret"
    fi
    
    success "Configuration validation passed"
}

# Create ConfigMap with actual values
create_configmap() {
    log "Creating ConfigMap..."
    
    # Check if the ConfigMap needs updating
    if grep -q "REPLACE_WITH_YOUR_GOOGLE_SHEET_ID" "$SCRIPT_DIR/configmap.yaml"; then
        log "Updating ConfigMap with actual Google Sheet ID"
        sed -i.bak "s|google_sheet_id: \"REPLACE_WITH_YOUR_GOOGLE_SHEET_ID\"|google_sheet_id: \"$GOOGLE_SHEET_ID\"|g" "$SCRIPT_DIR/configmap.yaml"
    else
        log "ConfigMap already has Google Sheet ID configured"
    fi
    
    oc apply -f "$SCRIPT_DIR/configmap.yaml"
    success "ConfigMap created/updated"
}

# Create Secret with Google credentials
create_secret() {
    log "Creating Secret with Google credentials..."

    # Check if the Secret needs updating
    if grep -q "REPLACE_WITH_BASE64_ENCODED_GOOGLE_CREDENTIALS" "$SCRIPT_DIR/secret.yaml"; then
        log "Updating Secret with actual Google credentials"

        # Try to get credentials from different sources
        local encoded_creds=""

        # 1. Check if GOOGLE_CREDENTIALS_BASE64 env var is set
        if [[ -n "$GOOGLE_CREDENTIALS_BASE64" ]]; then
            # Remove quotes if present
            encoded_creds=$(echo "$GOOGLE_CREDENTIALS_BASE64" | tr -d '"')
            log "Using credentials from GOOGLE_CREDENTIALS_BASE64 environment variable"
        # 2. Check if we can load from .env file
        elif [[ -f "$PROJECT_ROOT/.env" ]] && grep -q "GOOGLE_CREDENTIALS_BASE64" "$PROJECT_ROOT/.env"; then
            encoded_creds=$(grep "GOOGLE_CREDENTIALS_BASE64" "$PROJECT_ROOT/.env" | cut -d'=' -f2- | tr -d '"')
            log "Using credentials from .env file"
        # 3. Fall back to credentials file if provided
        elif [[ -f "$GOOGLE_CREDENTIALS_FILE" ]]; then
            encoded_creds=$(base64 -w 0 "$GOOGLE_CREDENTIALS_FILE")
            log "Using credentials from file: $GOOGLE_CREDENTIALS_FILE"
        else
            error "No Google credentials found. Set GOOGLE_CREDENTIALS_BASE64 or GOOGLE_CREDENTIALS_FILE"
            exit 1
        fi

        sed -i.bak "s|google_credentials_base64: REPLACE_WITH_BASE64_ENCODED_GOOGLE_CREDENTIALS|google_credentials_base64: $encoded_creds|g" "$SCRIPT_DIR/secret.yaml"
    else
        log "Secret already has Google credentials configured"
    fi

    oc apply -f "$SCRIPT_DIR/secret.yaml"
    success "Secret created/updated"
}

# Deploy application
deploy_app() {
    log "Deploying application manifests..."

    # Apply all manifests
    oc apply -f "$SCRIPT_DIR/serviceaccount.yaml"
    # PVC not needed - application stores data in memory from Google Sheets
    # oc apply -f "$SCRIPT_DIR/pvc.yaml"
    oc apply -f "$SCRIPT_DIR/service.yaml"
    oc apply -f "$SCRIPT_DIR/deployment.yaml"
    oc apply -f "$SCRIPT_DIR/route.yaml"

    success "Application manifests deployed"

    # Force rollout to pick up the newly built image
    log "Triggering rollout to use new image..."
    if oc get deployment "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        oc rollout restart deployment/"$APP_NAME" -n "$NAMESPACE"
        success "Rollout triggered"
    else
        log "Deployment not found yet, it will use the latest image on first start"
    fi
}

# Wait for deployment to be ready
wait_for_deployment() {
    log "Waiting for deployment to be ready..."

    oc rollout status deployment/$APP_NAME --timeout=300s

    # Verify the running image
    local running_image=$(oc get pod -l app=storage-dashboard -n "$NAMESPACE" -o jsonpath='{.items[0].status.containerStatuses[0].imageID}' 2>/dev/null | sed 's/.*@sha256://' | cut -c1-12)
    if [[ -n "$running_image" ]]; then
        log "Running image: ${running_image}..."
    fi

    # Get the route URL
    local route_url=$(oc get route $APP_NAME -o jsonpath='{.spec.host}')

    success "Deployment completed successfully!"
    success "Application is available at: https://$route_url"

    # Show recent logs to verify WIP filtering
    log "Recent application logs (checking for WIP filter):"
    oc logs deployment/$APP_NAME -n "$NAMESPACE" --tail=20 | grep -i "skipping\|fetched.*sheet" || log "No sync messages yet, check logs with: oc logs deployment/$APP_NAME -n $NAMESPACE"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    # Restore original files
    if [[ -f "$SCRIPT_DIR/configmap.yaml.bak" ]]; then
        mv "$SCRIPT_DIR/configmap.yaml.bak" "$SCRIPT_DIR/configmap.yaml"
    fi
    if [[ -f "$SCRIPT_DIR/secret.yaml.bak" ]]; then
        mv "$SCRIPT_DIR/secret.yaml.bak" "$SCRIPT_DIR/secret.yaml"
    fi
    if [[ -f "$SCRIPT_DIR/deployment.yaml.bak" ]]; then
        mv "$SCRIPT_DIR/deployment.yaml.bak" "$SCRIPT_DIR/deployment.yaml"
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Main deployment flow
main() {
    log "Starting Storage Integration Dashboard deployment to OpenShift..."
    
    check_prerequisites
    validate_config
    setup_namespace
    build_image
    create_configmap
    create_secret
    deploy_app
    wait_for_deployment
    
    success "Deployment completed successfully!"
}

# Help function
show_help() {
    echo "Storage Integration Dashboard - OpenShift Deployment Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Environment Variables:"
    echo "  NAMESPACE              OpenShift namespace (default: storage-dashboard)"
    echo "  IMAGE_TAG              Container image tag (default: latest)"
    echo "  GOOGLE_SHEET_ID        Your Google Sheet ID (required)"
    echo "  GOOGLE_CREDENTIALS_FILE Path to Google Service Account JSON (required)"
    echo ""
    echo "Example:"
    echo "  export GOOGLE_SHEET_ID='1ABC123...'"
    echo "  export GOOGLE_CREDENTIALS_FILE='./service-account.json'"
    echo "  ./deploy.sh"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
}

# Check for help flag
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Run main deployment
main

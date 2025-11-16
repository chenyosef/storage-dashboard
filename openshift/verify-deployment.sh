#!/bin/bash
# Verify OpenShift deployment is using the latest image

set -e

NAMESPACE=${NAMESPACE:-storage-dashboard}
APP_NAME="storage-dashboard"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "========================================="
echo "  OpenShift Deployment Verification"
echo "========================================="
echo ""

# Check if logged in
if ! oc whoami &> /dev/null; then
    error "Not logged in to OpenShift"
    exit 1
fi

# Switch to namespace
oc project "$NAMESPACE" &> /dev/null || {
    error "Namespace $NAMESPACE not found"
    exit 1
}

log "Checking deployment in namespace: $NAMESPACE"
echo ""

# Get latest build
log "Latest Build:"
latest_build=$(oc get build -l buildconfig="$APP_NAME" --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null || echo "none")
if [[ "$latest_build" != "none" ]]; then
    build_status=$(oc get build "$latest_build" -o jsonpath='{.status.phase}')
    build_time=$(oc get build "$latest_build" -o jsonpath='{.metadata.creationTimestamp}')
    echo "  Name: $latest_build"
    echo "  Status: $build_status"
    echo "  Created: $build_time"
else
    warn "No builds found"
fi
echo ""

# Get image stream
log "Image Stream:"
if oc get is "$APP_NAME" &> /dev/null; then
    image_digest=$(oc get istag "$APP_NAME:latest" -o jsonpath='{.image.metadata.name}' 2>/dev/null | cut -c1-12)
    image_time=$(oc get istag "$APP_NAME:latest" -o jsonpath='{.image.dockerImageMetadata.Created}' 2>/dev/null)
    echo "  Tag: latest"
    echo "  Digest: sha256:${image_digest}..."
    echo "  Created: $image_time"
else
    warn "Image stream not found"
fi
echo ""

# Get running pods
log "Running Pods:"
pod_name=$(oc get pod -l app="$APP_NAME" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "none")
if [[ "$pod_name" != "none" ]]; then
    pod_status=$(oc get pod "$pod_name" -o jsonpath='{.status.phase}')
    pod_image=$(oc get pod "$pod_name" -o jsonpath='{.status.containerStatuses[0].imageID}' | sed 's/.*@sha256://' | cut -c1-12)
    pod_started=$(oc get pod "$pod_name" -o jsonpath='{.status.startTime}')
    echo "  Name: $pod_name"
    echo "  Status: $pod_status"
    echo "  Image: sha256:${pod_image}..."
    echo "  Started: $pod_started"
else
    warn "No running pods found"
fi
echo ""

# Compare image digests
if [[ -n "$image_digest" && -n "$pod_image" ]]; then
    if [[ "$image_digest" == "$pod_image" ]]; then
        success "Pod is using the LATEST image ✓"
    else
        warn "Pod image ($pod_image) differs from latest ($image_digest)"
        warn "Consider running: oc rollout restart deployment/$APP_NAME -n $NAMESPACE"
    fi
    echo ""
fi

# Check for WIP filtering in logs
log "Checking logs for WIP filter (last sync):"
if [[ "$pod_name" != "none" ]]; then
    oc logs "$pod_name" --tail=100 | grep -A 10 "Starting data sync" | tail -15 || warn "No sync logs found yet"
    echo ""

    # Look for WIP skipping messages
    if oc logs "$pod_name" | grep -q "Skipping WIP sheet"; then
        success "WIP filter is ACTIVE ✓"
        oc logs "$pod_name" | grep "Skipping WIP sheet"
    else
        warn "No 'Skipping WIP sheet' messages found"
        warn "WIP filter may not be working or no WIP sheets exist"
    fi
else
    warn "Cannot check logs - no running pod"
fi
echo ""

# Show route
log "Application URL:"
route_url=$(oc get route "$APP_NAME" -o jsonpath='{.spec.host}' 2>/dev/null || echo "not found")
if [[ "$route_url" != "not found" ]]; then
    echo "  https://$route_url"
else
    warn "Route not found"
fi
echo ""

success "Verification complete!"

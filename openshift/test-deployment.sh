#!/bin/bash
set -e

# Storage Integration Dashboard - Deployment Test Script
# This script tests the deployed application on OpenShift

# Configuration
APP_NAME="storage-dashboard"
NAMESPACE=${NAMESPACE:-storage-dashboard}
TIMEOUT=${TIMEOUT:-300}

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

# Test functions
test_prerequisites() {
    log "Testing prerequisites..."
    
    # Check if oc CLI is available
    if ! command -v oc &> /dev/null; then
        error "OpenShift CLI (oc) is not installed"
        return 1
    fi
    
    # Check if logged in
    if ! oc whoami &> /dev/null; then
        error "Not logged in to OpenShift"
        return 1
    fi
    
    success "Prerequisites test passed"
    return 0
}

test_namespace() {
    log "Testing namespace: $NAMESPACE"
    
    if ! oc get namespace "$NAMESPACE" &> /dev/null; then
        error "Namespace $NAMESPACE does not exist"
        return 1
    fi
    
    oc project "$NAMESPACE" &> /dev/null
    success "Namespace test passed"
    return 0
}

test_resources() {
    log "Testing Kubernetes resources..."
    
    local resources=("serviceaccount/storage-dashboard" 
                    "pvc/storage-dashboard-data" 
                    "configmap/storage-dashboard-config"
                    "secret/storage-dashboard-secret"
                    "service/storage-dashboard"
                    "deployment/storage-dashboard"
                    "route/storage-dashboard")
    
    for resource in "${resources[@]}"; do
        if ! oc get "$resource" &> /dev/null; then
            error "Resource $resource does not exist"
            return 1
        fi
        log "✓ $resource exists"
    done
    
    success "Resources test passed"
    return 0
}

test_deployment_status() {
    log "Testing deployment status..."
    
    # Check if deployment is available
    if ! oc get deployment "$APP_NAME" -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' | grep -q "True"; then
        error "Deployment is not available"
        return 1
    fi
    
    # Check if desired replicas match ready replicas
    local desired=$(oc get deployment "$APP_NAME" -o jsonpath='{.status.replicas}')
    local ready=$(oc get deployment "$APP_NAME" -o jsonpath='{.status.readyReplicas}')
    
    if [[ "$desired" != "$ready" ]]; then
        error "Deployment replicas mismatch: desired=$desired, ready=$ready"
        return 1
    fi
    
    success "Deployment status test passed"
    return 0
}

test_pod_status() {
    log "Testing pod status..."
    
    # Get pods for the app
    local pods=$(oc get pods -l app="$APP_NAME" -o jsonpath='{.items[*].metadata.name}')
    
    if [[ -z "$pods" ]]; then
        error "No pods found for app $APP_NAME"
        return 1
    fi
    
    for pod in $pods; do
        local phase=$(oc get pod "$pod" -o jsonpath='{.status.phase}')
        if [[ "$phase" != "Running" ]]; then
            error "Pod $pod is not running (phase: $phase)"
            oc describe pod "$pod"
            return 1
        fi
        
        # Check if all containers are ready
        local ready=$(oc get pod "$pod" -o jsonpath='{.status.containerStatuses[0].ready}')
        if [[ "$ready" != "true" ]]; then
            error "Pod $pod containers are not ready"
            return 1
        fi
        
        log "✓ Pod $pod is running and ready"
    done
    
    success "Pod status test passed"
    return 0
}

test_health_endpoint() {
    log "Testing application health endpoint..."
    
    # Get route URL
    local route_host=$(oc get route "$APP_NAME" -o jsonpath='{.spec.host}')
    if [[ -z "$route_host" ]]; then
        error "Route host not found"
        return 1
    fi
    
    local health_url="https://$route_host/api/health"
    
    # Test health endpoint with timeout
    local response
    if response=$(curl -sf --connect-timeout 10 --max-time 30 "$health_url" 2>/dev/null); then
        log "✓ Health endpoint responded: $response"
        success "Health endpoint test passed"
        return 0
    else
        error "Health endpoint not accessible at $health_url"
        return 1
    fi
}

test_application_functionality() {
    log "Testing basic application functionality..."
    
    # Get route URL
    local route_host=$(oc get route "$APP_NAME" -o jsonpath='{.spec.host}')
    local app_url="https://$route_host"
    
    # Test main application
    if curl -sf --connect-timeout 10 --max-time 30 "$app_url" > /dev/null 2>&1; then
        log "✓ Main application is accessible"
    else
        error "Main application not accessible at $app_url"
        return 1
    fi
    
    # Test API endpoints
    local api_endpoints=("/api/storage/sheets" "/api/sync/stats")
    
    for endpoint in "${api_endpoints[@]}"; do
        local url="https://$route_host$endpoint"
        if curl -sf --connect-timeout 10 --max-time 30 "$url" > /dev/null 2>&1; then
            log "✓ API endpoint $endpoint is accessible"
        else
            warn "API endpoint $endpoint may not be working properly"
        fi
    done
    
    success "Application functionality test passed"
    return 0
}

test_persistent_storage() {
    log "Testing persistent storage..."
    
    # Check PVC status
    local pvc_phase=$(oc get pvc storage-dashboard-data -o jsonpath='{.status.phase}')
    if [[ "$pvc_phase" != "Bound" ]]; then
        error "PVC is not bound (phase: $pvc_phase)"
        return 1
    fi
    
    # Check if data directory exists in pod
    local pod=$(oc get pods -l app="$APP_NAME" -o jsonpath='{.items[0].metadata.name}')
    if oc exec "$pod" -- test -d /app/server/data; then
        log "✓ Data directory is mounted"
    else
        error "Data directory is not accessible in pod"
        return 1
    fi
    
    success "Persistent storage test passed"
    return 0
}

show_deployment_info() {
    log "Deployment Information:"
    echo ""
    
    # Route information
    local route_host=$(oc get route "$APP_NAME" -o jsonpath='{.spec.host}')
    echo -e "${GREEN}Application URL:${NC} https://$route_host"
    
    # Resource usage
    echo -e "${GREEN}Pods:${NC}"
    oc get pods -l app="$APP_NAME"
    
    echo -e "\n${GREEN}Service:${NC}"
    oc get service "$APP_NAME"
    
    echo -e "\n${GREEN}Route:${NC}"
    oc get route "$APP_NAME"
    
    echo -e "\n${GREEN}PVC:${NC}"
    oc get pvc storage-dashboard-data
}

# Main test function
run_tests() {
    log "Starting Storage Integration Dashboard deployment tests..."
    echo ""
    
    local failed_tests=0
    
    # Run tests
    test_prerequisites || ((failed_tests++))
    test_namespace || ((failed_tests++))
    test_resources || ((failed_tests++))
    test_deployment_status || ((failed_tests++))
    test_pod_status || ((failed_tests++))
    test_persistent_storage || ((failed_tests++))
    test_health_endpoint || ((failed_tests++))
    test_application_functionality || ((failed_tests++))
    
    echo ""
    
    if [[ $failed_tests -eq 0 ]]; then
        success "All tests passed! ✅"
        echo ""
        show_deployment_info
        return 0
    else
        error "$failed_tests test(s) failed ❌"
        return 1
    fi
}

# Help function
show_help() {
    echo "Storage Integration Dashboard - Deployment Test Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Environment Variables:"
    echo "  NAMESPACE    OpenShift namespace to test (default: storage-dashboard)"
    echo "  TIMEOUT      Test timeout in seconds (default: 300)"
    echo ""
    echo "Options:"
    echo "  -h, --help   Show this help message"
    echo "  -i, --info   Show deployment info only"
}

# Parse command line arguments
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    -i|--info)
        if test_prerequisites && test_namespace; then
            show_deployment_info
        fi
        exit 0
        ;;
    "")
        run_tests
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
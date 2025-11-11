# OpenShift Deployment Guide

This guide explains how to deploy the Storage Integration Dashboard to an OpenShift cluster.

## Prerequisites

### 1. OpenShift CLI
```bash
# Download and install the OpenShift CLI (oc)
# From: https://console.redhat.com/openshift/downloads

# Login to your OpenShift cluster
oc login --token=<your-token> --server=<your-cluster-url>
```

### 2. Container Runtime
- **Podman** (recommended) or **Docker**
- Used for building the container image

### 3. Google Sheets API Setup
- Google Service Account with Sheets API access
- Service Account JSON credentials file
- Google Sheet ID that the service account can access

## Quick Deployment

### 1. Set Environment Variables
```bash
# Required: Your Google Sheet ID
export GOOGLE_SHEET_ID="1ABC123DEF456GHI789..."

# Required: Path to your Google Service Account JSON file
export GOOGLE_CREDENTIALS_FILE="./path/to/service-account.json"

# Optional: Custom namespace (default: storage-dashboard)
export NAMESPACE="my-storage-dashboard"

# Optional: Custom image tag (default: latest)
export IMAGE_TAG="v1.0.0"
```

### 2. Run Deployment Script
```bash
cd openshift
./deploy.sh
```

The script will:
1. ✅ Check prerequisites (oc CLI, login status, container runtime)
2. ✅ Create/use the specified namespace
3. ✅ Build the optimized container image
4. ✅ Create ConfigMap with your Google Sheet configuration
5. ✅ Create Secret with your Google Service Account credentials
6. ✅ Deploy all Kubernetes resources
7. ✅ Wait for deployment to be ready
8. ✅ Display the application URL

## Manual Deployment

If you prefer manual deployment or need customization:

### 1. Create Namespace
```bash
oc new-project storage-dashboard
# or
oc create namespace storage-dashboard
oc project storage-dashboard
```

### 2. Build Container Image
```bash
# Build using OpenShift-optimized Dockerfile
podman build -f Dockerfile.openshift -t storage-dashboard:latest .

# If using OpenShift internal registry
oc get route default-route -n openshift-image-registry
REGISTRY_URL=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}')
podman tag storage-dashboard:latest $REGISTRY_URL/storage-dashboard/storage-dashboard:latest
podman push $REGISTRY_URL/storage-dashboard/storage-dashboard:latest
```

### 3. Create ConfigMap
```bash
# Edit configmap.yaml with your Google Sheet ID
vim configmap.yaml
oc apply -f configmap.yaml
```

### 4. Create Secret
```bash
# Encode your Google Service Account JSON
base64 -w 0 /path/to/service-account.json

# Edit secret.yaml with the encoded credentials
vim secret.yaml
oc apply -f secret.yaml
```

### 5. Deploy Application
```bash
oc apply -f serviceaccount.yaml
oc apply -f pvc.yaml
oc apply -f service.yaml
oc apply -f deployment.yaml
oc apply -f route.yaml
```

### 6. Verify Deployment
```bash
# Check deployment status
oc rollout status deployment/storage-dashboard

# Get application URL
oc get route storage-dashboard -o jsonpath='{.spec.host}'
```

## Configuration

### Environment Variables (ConfigMap)
- `google_sheet_id`: Your Google Sheet ID
- `sync_interval_minutes`: How often to sync data (default: 5)
- `log_level`: Application log level (default: info)
- `node_env`: Node.js environment (default: production)

### Secrets
- `google_credentials_base64`: Base64-encoded Google Service Account JSON

### Resources
- **CPU Request**: 100m (0.1 core)
- **CPU Limit**: 500m (0.5 core)
- **Memory Request**: 256Mi
- **Memory Limit**: 512Mi
- **Storage**: 1Gi for data persistence

## Monitoring & Health Checks

### Health Endpoints
- **Health Check**: `/api/health`
- **Sync Status**: `/api/sync/stats`
- **Sync History**: `/api/sync/history`

### Probes
- **Liveness Probe**: HTTP GET `/api/health` every 30s
- **Readiness Probe**: HTTP GET `/api/health` every 10s  
- **Startup Probe**: HTTP GET `/api/health` every 10s (up to 5 minutes)

### Logs
```bash
# View application logs
oc logs deployment/storage-dashboard

# Follow logs
oc logs -f deployment/storage-dashboard

# View logs from all pods
oc logs -l app=storage-dashboard
```

## Troubleshooting

### Common Issues

#### 1. Pod CrashLoopBackOff
```bash
# Check pod events
oc describe pod -l app=storage-dashboard

# Check logs for errors
oc logs -l app=storage-dashboard --previous
```

**Common Causes:**
- Invalid Google credentials
- Incorrect Google Sheet ID
- Missing permissions on Google Sheet

#### 2. Image Pull Errors
```bash
# Check if image exists
oc describe deployment storage-dashboard

# Verify image registry access
oc get secrets -o name | grep registry
```

#### 3. Permission Issues
```bash
# Check SecurityContextConstraints
oc get scc
oc adm policy add-scc-to-user anyuid -z storage-dashboard

# Check service account permissions
oc describe sa storage-dashboard
```

### Debug Commands
```bash
# Get all resources
oc get all -l app=storage-dashboard

# Check persistent volume
oc get pvc storage-dashboard-data
oc describe pvc storage-dashboard-data

# Check route and service
oc get route storage-dashboard
oc describe service storage-dashboard

# Access pod shell
oc rsh deployment/storage-dashboard
```

## Updating the Application

### 1. Update Code and Rebuild
```bash
# After making code changes
podman build -f Dockerfile.openshift -t storage-dashboard:v2.0.0 .

# If using internal registry
podman tag storage-dashboard:v2.0.0 $REGISTRY_URL/storage-dashboard/storage-dashboard:v2.0.0
podman push $REGISTRY_URL/storage-dashboard/storage-dashboard:v2.0.0
```

### 2. Update Deployment
```bash
# Update image in deployment
oc set image deployment/storage-dashboard storage-dashboard=storage-dashboard:v2.0.0

# Or edit deployment directly
oc edit deployment storage-dashboard
```

### 3. Update Configuration
```bash
# Update ConfigMap
oc apply -f configmap.yaml

# Update Secret
oc apply -f secret.yaml

# Restart deployment to pick up changes
oc rollout restart deployment/storage-dashboard
```

## Security Considerations

### Container Security
- ✅ Non-root user (UID 1001)
- ✅ No privilege escalation
- ✅ Minimal capabilities
- ✅ Read-only root filesystem compatible
- ✅ Security context constraints compliant

### Network Security
- ✅ TLS termination at route level
- ✅ Internal service communication
- ✅ No external database dependencies

### Secrets Management
- ✅ Google credentials stored in Kubernetes Secret
- ✅ Environment variable injection
- ✅ No credentials in container image

## Scaling

For internal use, single replica is typically sufficient. To scale:

```bash
# Scale to multiple replicas
oc scale deployment storage-dashboard --replicas=2

# Configure horizontal pod autoscaler (optional)
oc autoscale deployment storage-dashboard --min=1 --max=3 --cpu-percent=80
```

## Uninstalling

```bash
# Delete all resources
oc delete all -l app=storage-dashboard
oc delete pvc storage-dashboard-data
oc delete configmap storage-dashboard-config
oc delete secret storage-dashboard-secret
oc delete sa storage-dashboard

# Delete namespace (if desired)
oc delete namespace storage-dashboard
```
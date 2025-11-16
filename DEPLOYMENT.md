# Deployment Guide

## Overview

All deployment methods now use **intelligent caching** - rebuilding only when necessary and only the parts that changed.

## Local Development

### Quick Start
```bash
./dev.sh start    # Automatic smart caching
```

**What happens:**
- First run: Full build (3-5 min)
- Subsequent runs: Only rebuilds changed layers (5-60 sec)
- Server code changes: Auto-reload (0 sec, no rebuild!)

### Commands
```bash
./dev.sh start         # Start dev environment
./dev.sh rebuild       # Rebuild (smart cache)
./dev.sh force-rebuild # Force full rebuild
./dev.sh logs          # View logs
./dev.sh stop          # Stop
```

## Local Production Testing

### Quick Start
```bash
./deploy-local.sh     # Automatic smart caching
```

**What happens:**
- Builds with layer caching
- Only rebuilds changed components
- Validates health after deployment

### Commands
```bash
./deploy-local.sh              # Deploy with caching
./deploy-local.sh --force      # Force rebuild
./deploy-local.sh --logs       # Deploy and show logs
./deploy-local.sh --skip-build # Just restart (no build)
```

## OpenShift Production

### Quick Start
```bash
cd openshift
./deploy.sh
```

**What happens:**
- Uploads source code from local directory
- Builds using OpenShift BuildConfig (with caching)
- **Triggers rollout restart** to use new image
- Verifies deployment and shows logs

**Important:** The script now automatically:
1. Builds new image from your current code
2. Forces deployment to pick up the new image
3. Shows WIP filter status in logs

### Verify Deployment
After deploying, verify the latest code is running:
```bash
cd openshift
./verify-deployment.sh
```

This checks:
- Latest build status
- Image digests (built vs running)
- WIP filter in logs
- Confirms pod is using latest image

### Troubleshooting
If old code is still running:
```bash
# Force rollout with new image
oc rollout restart deployment/storage-dashboard -n storage-dashboard
oc rollout status deployment/storage-dashboard -n storage-dashboard

# Verify
./openshift/verify-deployment.sh
```

## How Caching Works

### Docker Layer Caching
Docker/Podman caches each build step (layer). When you rebuild:

1. ✅ Reuses layers that haven't changed
2. ⚠️ Rebuilds from first changed layer onwards
3. ✅ Automatically detects changes via checksums

### Layer Order (optimized)
```
1. Base system setup       → Rarely changes
2. package.json + install  → Only when deps change
3. Client build            → Only when client changes
4. Server copy             → Only when server changes
```

### .dockerignore Optimization
Excludes unnecessary files from build context:
- `node_modules/` - Installed fresh in container
- `.git/` - Not needed in runtime
- `*.md` - Documentation
- Logs, tests, temp files

**Result:** Smaller build context = faster builds!

## Rebuild Triggers

| Changed File | Dev Mode | Production | OCP |
|-------------|----------|------------|-----|
| Server .js files | Auto-reload | Fast rebuild | Fast rebuild |
| Client files | `./dev.sh rebuild` | Fast rebuild | Fast rebuild |
| package.json | `./dev.sh rebuild` | Full rebuild | Full rebuild |
| .env | `./dev.sh restart` | Restart only | Update ConfigMap |

## Performance Examples

### No Changes
```bash
./dev.sh start
# Build: ~5 seconds (all layers cached)
```

### Server Change
```bash
# Edit server/services/sheetsService.js
./deploy-local.sh
# Build: ~10-20 seconds (only server layer)
```

### Client Change
```bash
# Edit client/src/App.js
./dev.sh rebuild
# Build: ~1-2 minutes (client + server layers)
```

### Dependency Change
```bash
# Edit package.json
./dev.sh rebuild
# Build: ~3-5 minutes (full rebuild needed)
```

## Troubleshooting

### Cache Issues
If builds seem stuck or broken:
```bash
# Force clean rebuild
./dev.sh force-rebuild
# or
./deploy-local.sh --force
```

### Verify Caching
Watch build output for:
```
CACHED [stage 1 2/8] RUN npm config set...
CACHED [stage 1 3/8] COPY client/package*.json...
```
`CACHED` means layer was reused!

### Check What Changed
```bash
git status        # See local changes
git diff          # See specific changes
```

## Best Practices

1. **Don't force rebuild** unless necessary
   - Smart caching handles it automatically

2. **Use dev mode for development**
   - Volume mounting = no rebuild for server changes

3. **Test production builds before deploying**
   ```bash
   ./deploy-local.sh --logs
   ```

4. **Keep .dockerignore updated**
   - Smaller context = faster builds

5. **Layer order matters**
   - Less frequently changed files first
   - More frequently changed files last

## Summary

| Deployment | Method | Caching | Speed |
|-----------|---------|---------|-------|
| Development | `./dev.sh start` | Volume mount + layers | ⚡⚡⚡ Instant |
| Local Prod | `./deploy-local.sh` | Docker layers | ⚡⚡ Fast |
| OpenShift | `./openshift/deploy.sh` | BuildConfig | ⚡⚡ Fast |

**Bottom line:** Just run the deploy command - caching happens automatically! 🚀

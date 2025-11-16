# Deployment Fixes Summary

## Problem
Deployments were sometimes using old images instead of the latest code.

## Root Causes Fixed

### 1. Local Podman-Compose
**Issue:** Different compose files created images with different names
- `localhost/storage-dashboard:latest`
- `localhost/storage-dashboard_storage-dashboard:latest`

**Fix:**
- ✅ Explicitly set `image:` name in compose files
- ✅ Auto-prune dangling images before build
- ✅ Consistent naming across dev and prod

### 2. OpenShift Deployment
**Issue:** New builds completed but deployment didn't pick up new image

**Fix:**
- ✅ Added `oc rollout restart` after build completes
- ✅ Show image digests for verification
- ✅ Display logs to confirm WIP filter is active
- ✅ Created verification script

## What Changed

### Files Modified

1. **podman-compose.yml**
   - Added explicit image tag: `localhost/storage-dashboard:latest`

2. **podman-compose.dev.yml**
   - Added explicit image tag: `localhost/storage-dashboard:dev`

3. **deploy-local.sh**
   - Auto-prunes dangling images before build

4. **dev.sh**
   - Auto-prunes dangling images on start/rebuild

5. **deploy.sh** (legacy)
   - Auto-prunes dangling images before build

6. **openshift/deploy.sh**
   - Added `oc rollout restart` after build
   - Shows image digest for verification
   - Displays logs to check WIP filter

7. **openshift/verify-deployment.sh** (NEW)
   - Verifies latest image is running
   - Checks WIP filter in logs
   - Compares built vs running image digests

## Verification Steps

### Local Deployment
```bash
./deploy-local.sh

# Verify
podman-compose logs storage-dashboard | grep "Skipping WIP"
```

### OpenShift Deployment
```bash
cd openshift
./deploy.sh

# Verify (automatically shown at end, or run manually)
./verify-deployment.sh
```

## Expected Output

### Local (WIP Filter Working)
```
Starting data sync...
Skipping WIP sheet: Compatability matrix (WIP)
Skipping WIP sheet: DR (WIP)
Fetched 17 records from sheet: Test status
Fetched 15 records from sheet: Storage Offload Status
...
Fetched data from 4 sheets
```

### OpenShift (WIP Filter Working)
```
[INFO] Recent application logs (checking for WIP filter):
Skipping WIP sheet: Compatability matrix (WIP)
Skipping WIP sheet: DR (WIP)
Fetched data from 4 sheets
```

## Why This Works Now

### Before
1. Build creates new image
2. Old image still tagged as `:latest`
3. Deployment uses old cached image ❌

### After
1. Build creates new image
2. Old images pruned automatically
3. New image tagged as `:latest`
4. **Deployment forced to restart** (OCP only)
5. Fresh pull of `:latest` tag ✅

## Quick Reference

| Issue | Command to Fix |
|-------|---------------|
| Local using old image | `podman-compose down && ./deploy-local.sh` |
| OCP using old image | `cd openshift && ./deploy.sh` |
| Verify local deployment | `podman-compose logs storage-dashboard \| grep WIP` |
| Verify OCP deployment | `cd openshift && ./verify-deployment.sh` |
| Force OCP rollout | `oc rollout restart deployment/storage-dashboard -n storage-dashboard` |

## Prevention

All deployment scripts now:
- ✅ Explicitly name images
- ✅ Auto-clean old images
- ✅ Force rollout on OCP
- ✅ Verify and show logs

**Result:** Always uses latest code! 🎉

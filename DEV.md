# Development Workflow

## Quick Start

### Development Mode (Recommended)
```bash
./dev.sh start    # Start with auto-reload + smart caching
./dev.sh logs     # Watch logs
./dev.sh stop     # Stop when done
```

**Features:**
- ✅ **Smart caching** - Only rebuilds what changed
- ✅ **Server auto-reload** - No rebuild needed for server changes
- ✅ **Fast rebuilds** - Client/dependency changes use layer caching
- ✅ **Automatic** - Detects when rebuild is needed

### Production Mode
```bash
./deploy-local.sh           # Smart caching (default)
./deploy-local.sh --force   # Force full rebuild
./deploy-local.sh --logs    # Deploy and show logs
```

### When to Rebuild
Run `./dev.sh rebuild` when you change:
- Client code (React components, styles)
- Dependencies (package.json)

**Note:** Rebuilds are FAST thanks to smart caching!

## Development Workflow Summary

| Change Type | Dev Mode | Action Required |
|------------|----------|-----------------|
| Server code (*.js in /server) | Auto-reload | None - just save |
| Client code (React) | Requires rebuild | `./dev.sh rebuild` |
| Dependencies | Requires rebuild | `./dev.sh rebuild` |
| .env file | Manual restart | `./dev.sh restart` |

## File Structure

- `Dockerfile.dev` - Development build (volume-mounted server)
- `Dockerfile.minimal` - Production build (optimized layers)
- `podman-compose.dev.yml` - Dev compose config
- `podman-compose.yml` - Production compose config
- `dev.sh` - Development helper script
- `deploy-local.sh` - Production deployment script
- `.dockerignore` - Excludes unnecessary files from builds

## How Smart Caching Works

All Dockerfiles are optimized for **layer caching**. Docker/Podman automatically:

1. **Reuses unchanged layers** from previous builds
2. **Rebuilds from the first changed layer** onwards
3. **Detects file changes** using checksums

### Layer Order (optimized for caching)
1. **Base system** (Alpine, npm config) - rarely changes
2. **package.json + npm install** - only rebuilds when dependencies change
3. **Client build** - only rebuilds when client code changes
4. **Server code** - only rebuilds when server code changes

### Build Speed Examples
| Change Type | First Build | Cached Build |
|------------|-------------|--------------|
| No changes | 3-5 min | **5-10 sec** |
| Server code only | 3-5 min | **10-20 sec** |
| Client code only | 3-5 min | **1-2 min** |
| Dependencies | 3-5 min | 3-5 min |

### .dockerignore Optimization
Excluded from builds:
- `node_modules/` (installed fresh)
- `.git/` (not needed)
- `*.md` files (except README)
- Test files, logs, temp files

This makes the build context **much smaller** → faster uploads

## Common Workflows

### Daily Development
```bash
./dev.sh start          # Start once
# Edit server code → auto-reloads
# Edit client code → ./dev.sh rebuild (fast!)
./dev.sh logs           # Debug
```

### Testing Production Build
```bash
./deploy-local.sh --prod --logs
```

### Force Clean Rebuild (rarely needed)
```bash
./dev.sh force-rebuild    # Dev mode
./deploy-local.sh --force # Production
```

## Tips

1. **99% of the time**, just use `./dev.sh start` or `./deploy-local.sh`
2. Smart caching means rebuilds are **fast** - don't worry about it!
3. Only use `--force` if you suspect caching issues
4. Server logs show `Skipping WIP sheet: [name]` for filtered sheets
5. `.dockerignore` keeps builds fast by excluding unnecessary files

## Deployment Comparison

| Method | Use Case | Rebuild Speed |
|--------|----------|---------------|
| `./dev.sh start` | Development | ⚡ Fast (volume mount) |
| `./deploy-local.sh` | Local testing | ⚡ Fast (smart cache) |
| `openshift/deploy.sh` | Production OCP | ⚡ Fast (BuildConfig cache) |

**All methods use intelligent caching!**

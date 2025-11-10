# Podman Installation and Configuration Guide

This guide covers installing and configuring Podman for the Storage Integration Dashboard.

## Installing Podman

### Red Hat Enterprise Linux / CentOS / Fedora

```bash
# RHEL 8/9 or CentOS 8/9
sudo dnf install podman podman-compose

# Fedora
sudo dnf install podman podman-compose

# Enable and start podman socket (optional, for docker-compose compatibility)
systemctl --user enable --now podman.socket
```

### Ubuntu / Debian

```bash
# Ubuntu 20.04+
sudo apt update
sudo apt install podman

# For podman-compose
pip3 install podman-compose
# or
sudo apt install podman-compose  # if available in repos
```

### Other Systems

- **macOS**: `brew install podman`
- **Windows**: Download from [Podman Desktop](https://podman-desktop.io/)
- **Arch Linux**: `sudo pacman -S podman`

## Podman Configuration for Storage Dashboard

### 1. Rootless Configuration (Recommended)

Enable rootless containers for better security:

```bash
# Check if user namespaces are enabled
cat /proc/sys/user/max_user_namespaces

# If 0, enable user namespaces
echo 'user.max_user_namespaces=15000' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Set up subuid/subgid (usually automatic)
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)

# Verify configuration
podman system info
```

### 2. Storage Configuration

Configure storage for optimal performance:

```bash
# Create podman configuration directory
mkdir -p ~/.config/containers

# Create storage.conf (optional, for custom storage location)
# Note: Usually not needed, Podman uses good defaults
mkdir -p ~/.config/containers

cat > ~/.config/containers/storage.conf << EOF
[storage]
driver = "overlay"
runroot = "/run/user/\$(id -u)/containers"
graphroot = "\$HOME/.local/share/containers/storage"

[storage.options]
additionalimagestores = []

[storage.options.overlay]
mountopt = "nodev,metacopy=on"
EOF
```

### 3. Registry Configuration

Configure container registries:

```bash
# Create registries.conf
cat > ~/.config/containers/registries.conf << 'EOF'
[[registry]]
location = "docker.io"
insecure = false
blocked = false

[[registry]]
location = "quay.io"
insecure = false
blocked = false

[[registry]]
location = "registry.access.redhat.com"
insecure = false
blocked = false
EOF
```

## Using Podman with Storage Dashboard

### 1. Deploy with Script (Easiest)

```bash
# Make script executable
chmod +x deploy.sh

# Deploy application
./deploy.sh

# View status
./deploy.sh status

# View logs
./deploy.sh logs

# Stop application
./deploy.sh stop

# Clean up everything
./deploy.sh cleanup
```

### 2. Using Podman Compose

If you have podman-compose installed:

```bash
# Start application
podman-compose up -d

# View logs
podman-compose logs -f

# Stop application
podman-compose down

# Production with nginx
podman-compose --profile production up -d
```

### 3. Manual Podman Commands

For direct control:

```bash
# Build the image
podman build -t storage-dashboard:latest .

# Create a pod (optional, for grouping containers)
podman pod create --name storage-pod -p 3001:3001

# Run the application container
podman run -d \
  --name storage-dashboard \
  --pod storage-pod \
  -v storage-data:/app/data:Z \
  --env-file .env \
  --restart unless-stopped \
  --user 1001:1001 \
  --userns=keep-id \
  --security-opt label=disable \
  storage-dashboard:latest

# View container status
podman ps

# View logs
podman logs -f storage-dashboard

# Stop container
podman stop storage-dashboard

# Remove container
podman rm storage-dashboard
```

## Podman vs Docker Differences

### Key Differences Handled in Our Setup

1. **Rootless by Default**: Podman runs without root privileges
2. **No Daemon**: Podman doesn't require a background service
3. **SELinux Labels**: Use `:Z` flag for volume mounts
4. **User Namespaces**: Automatic UID/GID mapping
5. **Security Options**: Different security context handling

### Volume Mounting

```bash
# Docker style (may not work in rootless)
-v /host/path:/container/path

# Podman style (rootless compatible)
-v /host/path:/container/path:Z

# For named volumes (recommended)
-v volume-name:/container/path:Z
```

## Troubleshooting Podman Issues

### Quick Fix for Common Issues

If you encounter storage or permission errors, run the fix script:

```bash
# Run the automated fix script
./fix-podman.sh

# Then try building again
podman build -t storage-dashboard .
```

### Permission Issues

```bash
# Check user namespace configuration
podman unshare cat /proc/self/uid_map

# Check current storage info
podman info --format "{{.Store.GraphRoot}}"

# Fix permission issues
podman unshare chown -R 1001:1001 /path/to/data

# Reset storage if needed (WARNING: removes all images/containers)
podman system reset --force
```

### Storage Directory Issues

If you get "mkdir /home/$(whoami)" errors:

```bash
# Remove problematic storage config
rm ~/.config/containers/storage.conf 2>/dev/null || true

# Let Podman use default locations
podman system reset --force

# Test with simple command
podman pull docker.io/library/hello-world
```

### Network Issues

```bash
# Check network configuration
podman network ls

# Create custom network if needed
podman network create storage-net

# Run container with custom network
podman run --network storage-net ...
```

### Storage Issues

```bash
# Check storage info
podman system info

# Clean up unused resources
podman system prune -a

# Reset storage completely (WARNING: removes all containers/images)
podman system reset
```

### SELinux Issues (RHEL/Fedora/CentOS)

```bash
# Check SELinux status
getenforce

# Allow container access to volumes
setsebool -P container_manage_cgroup true

# Fix SELinux labels on volumes
podman unshare chown -R 1001:1001 ~/.local/share/containers/storage/volumes/storage-data
```

## Performance Optimization

### 1. Configure Storage Driver

```bash
# Check current driver
podman info --format "{{.Store.GraphDriverName}}"

# Use overlay2 for better performance (usually default)
# Edit ~/.config/containers/storage.conf if needed
```

### 2. Resource Limits

```bash
# Set memory limit
podman run --memory=512m storage-dashboard

# Set CPU limit
podman run --cpus=1.0 storage-dashboard

# Combine limits
podman run --memory=512m --cpus=1.0 storage-dashboard
```

### 3. Volume Performance

```bash
# Use named volumes for better performance
podman volume create storage-data

# Mount with optimal flags
podman run -v storage-data:/app/data:Z,rw storage-dashboard
```

## Systemd Integration (Optional)

For automatic startup and management:

### 1. Generate Systemd Unit

```bash
# Generate systemd unit file
podman generate systemd --new --files --name storage-dashboard

# Move to systemd directory
mv container-storage-dashboard.service ~/.config/systemd/user/

# Reload systemd
systemctl --user daemon-reload

# Enable and start service
systemctl --user enable --now container-storage-dashboard.service

# Check status
systemctl --user status container-storage-dashboard.service
```

### 2. Enable Linger (for startup without login)

```bash
# Enable linger for user
sudo loginctl enable-linger $(whoami)

# Verify
loginctl show-user $(whoami)
```

## Legacy Docker Migration

If migrating from a Docker setup:

```bash
# Stop existing Docker containers
docker stop storage-dashboard
docker rm storage-dashboard

# Import Docker image to Podman (if needed)
docker save storage-dashboard | podman load

# Use Podman normally
podman run -d --name storage-dashboard ...
```

### Podman Desktop

For GUI management, install [Podman Desktop](https://podman-desktop.io/):

- Provides Docker Desktop-like interface
- Container and image management
- Volume and network management
- Extension support

## Security Considerations

### Best Practices

1. **Run Rootless**: Always use rootless containers
2. **Use Specific Tags**: Avoid `latest` tags in production
3. **Scan Images**: Use `podman scan` if available
4. **Limit Resources**: Set memory and CPU limits
5. **Use Secrets**: Store sensitive data in Podman secrets

### Example Secure Deployment

```bash
# Create secret for credentials
podman secret create google-creds ./credentials.json

# Run with secret
podman run -d \
  --name storage-dashboard \
  --secret google-creds \
  --memory=512m \
  --cpus=1.0 \
  --read-only \
  --tmpfs /tmp:rw,size=100m \
  -v storage-data:/app/data:Z \
  --security-opt=no-new-privileges \
  --user 1001:1001 \
  storage-dashboard
```

## Next Steps

After Podman setup:

1. Configure your `.env` file with Google Sheets credentials
2. Run `./deploy.sh` to start the application
3. Access the dashboard at `http://localhost:3001`
4. Set up monitoring and backup procedures
5. Configure firewall rules if needed

For production deployments, consider:
- Setting up reverse proxy (nginx)
- Configuring SSL certificates
- Implementing log rotation
- Setting up monitoring alerts
#!/bin/bash

# Quick fix script for common Podman storage issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Podman Storage Issue Fix Script${NC}"
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

print_header

echo "Checking and fixing Podman configuration..."
echo

# Check if Podman is installed
if ! command -v podman &> /dev/null; then
    print_error "Podman is not installed. Please install it first:"
    echo "  # RHEL/Fedora: sudo dnf install podman"
    echo "  # Ubuntu: sudo apt install podman"
    echo "  # macOS: brew install podman"
    exit 1
fi

print_success "Podman found: $(podman --version)"

# Check current user
CURRENT_USER=$(whoami)
USER_ID=$(id -u)
print_success "Current user: $CURRENT_USER (UID: $USER_ID)"

# Create necessary directories
echo "Creating Podman directories..."

mkdir -p ~/.config/containers
mkdir -p ~/.local/share/containers/storage
mkdir -p "/run/user/$USER_ID"

print_success "Directories created"

# Remove any problematic storage configuration
if [ -f ~/.config/containers/storage.conf ]; then
    print_warning "Removing existing storage.conf"
    rm ~/.config/containers/storage.conf
fi

# Check user namespace configuration
echo
echo "Checking user namespace configuration..."

if [ ! -f /etc/subuid ] || ! grep -q "^$CURRENT_USER:" /etc/subuid; then
    print_warning "User subuid not configured. Attempting to fix..."
    
    # Try to add subuid/subgid entries
    if command -v usermod &> /dev/null && [ "$EUID" -eq 0 ]; then
        usermod --add-subuids 100000-165535 "$CURRENT_USER"
        usermod --add-subgids 100000-165535 "$CURRENT_USER"
        print_success "Added subuid/subgid entries"
    else
        print_error "Cannot add subuid/subgid entries automatically."
        echo "Please run as root:"
        echo "  sudo usermod --add-subuids 100000-165535 $CURRENT_USER"
        echo "  sudo usermod --add-subgids 100000-165535 $CURRENT_USER"
        echo "Then log out and back in, and run this script again."
        exit 1
    fi
else
    print_success "User namespaces configured correctly"
fi

# Test basic Podman functionality
echo
echo "Testing Podman functionality..."

if podman info >/dev/null 2>&1; then
    print_success "Podman info command works"
else
    print_warning "Podman info failed, resetting storage..."
    podman system reset --force
    print_success "Storage reset complete"
fi

# Test container pull
echo
echo "Testing container image pull..."

if podman pull docker.io/library/hello-world:latest >/dev/null 2>&1; then
    print_success "Image pull test successful"
    podman rmi hello-world:latest >/dev/null 2>&1 || true
else
    print_error "Image pull test failed"
    echo "This might indicate network or registry issues."
fi

# Set up basic registries configuration
echo
echo "Setting up registries configuration..."

cat > ~/.config/containers/registries.conf << 'EOF'
unqualified-search-registries = ["docker.io"]

[[registry]]
location = "docker.io"
insecure = false
blocked = false

[[registry]]
location = "quay.io" 
insecure = false
blocked = false
EOF

print_success "Registries configuration created"

# Set permissions
echo
echo "Setting correct permissions..."

chmod 755 ~/.config/containers
chmod 644 ~/.config/containers/registries.conf 2>/dev/null || true
find ~/.local/share/containers -type d -exec chmod 755 {} \; 2>/dev/null || true

print_success "Permissions set"

echo
print_success "Podman configuration fix completed!"
echo
echo "You can now try building your image again:"
echo "  cd /path/to/storage-dashboard"
echo "  podman build -t storage-dashboard ."
echo
echo "If you still have issues, try:"
echo "  podman system reset --force"
echo "  ./fix-podman.sh"
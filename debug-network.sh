#!/bin/bash

# Network diagnostics script for Podman containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Podman Network Diagnostics${NC}"
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

echo "1. Testing host network connectivity..."
if curl -s --max-time 10 https://registry.npmjs.org/ >/dev/null; then
    print_success "Host can reach npm registry"
else
    print_error "Host cannot reach npm registry"
    echo "Check your internet connection and firewall settings"
    exit 1
fi

echo
echo "2. Checking Podman network configuration..."
podman network ls
echo

echo "3. Testing DNS resolution in container..."
if podman run --rm docker.io/alpine:latest nslookup registry.npmjs.org >/dev/null 2>&1; then
    print_success "Container DNS resolution works"
else
    print_warning "Container DNS resolution failed"
    echo "Trying with custom DNS..."
    if podman run --rm --dns=8.8.8.8 docker.io/alpine:latest nslookup registry.npmjs.org >/dev/null 2>&1; then
        print_success "Container DNS works with 8.8.8.8"
        echo "Solution: Use --dns=8.8.8.8 in build commands"
    else
        print_error "DNS resolution failed even with 8.8.8.8"
    fi
fi

echo
echo "4. Testing HTTPS connectivity in container..."
if podman run --rm docker.io/alpine:latest wget -q --spider --timeout=30 https://registry.npmjs.org/ 2>/dev/null; then
    print_success "Container HTTPS connectivity works"
else
    print_warning "Container HTTPS connectivity failed"
    echo "Trying with host networking..."
    if podman run --rm --network=host docker.io/alpine:latest wget -q --spider --timeout=30 https://registry.npmjs.org/ 2>/dev/null; then
        print_success "Container connectivity works with host networking"
        echo "Solution: Use --network=host in build commands"
    else
        print_error "Connectivity failed even with host networking"
    fi
fi

echo
echo "5. Checking for IPv6 issues..."
IPV6_ADDR=$(dig +short AAAA registry.npmjs.org 2>/dev/null | head -1)
if [ -n "$IPV6_ADDR" ]; then
    echo "Registry has IPv6 address: $IPV6_ADDR"
    if ping6 -c 1 -W 5 "$IPV6_ADDR" >/dev/null 2>&1; then
        print_success "IPv6 connectivity works"
    else
        print_warning "IPv6 connectivity failed"
        echo "This could cause npm install issues"
    fi
else
    echo "No IPv6 address found for registry.npmjs.org"
fi

echo
echo "6. Testing container npm connectivity..."
cat > test-npm.sh << 'EOF'
#!/bin/sh
echo "Testing npm registry connectivity..."
wget -q --spider --timeout=30 https://registry.npmjs.org/ || exit 1
echo "Registry accessible, testing npm info..."
npm info axios --registry https://registry.npmjs.org/ > /dev/null || exit 1
echo "npm registry test successful"
EOF

chmod +x test-npm.sh

if podman run --rm -v ./test-npm.sh:/test-npm.sh:ro docker.io/node:18-alpine /test-npm.sh 2>/dev/null; then
    print_success "npm registry connectivity works in container"
else
    print_warning "npm registry connectivity failed in container"
    
    echo "Trying with DNS fix..."
    if podman run --rm --dns=8.8.8.8 -v ./test-npm.sh:/test-npm.sh:ro docker.io/node:18-alpine /test-npm.sh 2>/dev/null; then
        print_success "npm works with DNS fix"
        DNS_FIX="--dns=8.8.8.8"
    else
        echo "Trying with host networking..."
        if podman run --rm --network=host -v ./test-npm.sh:/test-npm.sh:ro docker.io/node:18-alpine /test-npm.sh 2>/dev/null; then
            print_success "npm works with host networking"
            NETWORK_FIX="--network=host"
        else
            print_error "npm connectivity failed with all fixes"
        fi
    fi
fi

rm -f test-npm.sh

echo
echo "========================================="
echo "DIAGNOSIS COMPLETE"
echo "========================================="

if [ -n "$DNS_FIX" ]; then
    echo "SOLUTION: Add $DNS_FIX to your build command:"
    echo "  podman build $DNS_FIX -t storage-dashboard -f Dockerfile.minimal ."
elif [ -n "$NETWORK_FIX" ]; then
    echo "SOLUTION: Add $NETWORK_FIX to your build command:"
    echo "  podman build $NETWORK_FIX -t storage-dashboard -f Dockerfile.minimal ."
else
    echo "If all tests passed, the issue might be intermittent."
    echo "Try building again or check for proxy/firewall settings."
fi

echo
echo "Additional troubleshooting options:"
echo "1. Check if behind corporate proxy: echo \$HTTP_PROXY \$HTTPS_PROXY"
echo "2. Try different DNS servers: --dns=1.1.1.1 or --dns=208.67.222.222"
echo "3. Check Podman version: podman --version"
echo "4. Reset Podman networking: podman system reset --force"
# Multi-stage build for storage dashboard - IPv4 only
FROM docker.io/node:18-alpine AS client-build

# Force IPv4-only networking by removing IPv6 support and adding hosts entries
RUN echo 'install_options="--no-ipv6"' >> /etc/apk/apk.conf && \
    sysctl -w net.ipv6.conf.all.disable_ipv6=1 2>/dev/null || true && \
    sysctl -w net.ipv6.conf.default.disable_ipv6=1 2>/dev/null || true && \
    echo '104.16.30.34 registry.npmjs.org' >> /etc/hosts && \
    echo '104.16.31.34 registry.npmjs.org' >> /etc/hosts

# Configure npm for IPv4-only and better reliability
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000

WORKDIR /app/client
COPY client/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY client/ ./
RUN npm run build

FROM docker.io/node:18-alpine AS server-build

# Force IPv4-only networking by removing IPv6 support and adding hosts entries
RUN echo 'install_options="--no-ipv6"' >> /etc/apk/apk.conf && \
    sysctl -w net.ipv6.conf.all.disable_ipv6=1 2>/dev/null || true && \
    sysctl -w net.ipv6.conf.default.disable_ipv6=1 2>/dev/null || true && \
    echo '104.16.30.34 registry.npmjs.org' >> /etc/hosts && \
    echo '104.16.31.34 registry.npmjs.org' >> /etc/hosts

# Configure npm for IPv4-only and better reliability
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000

WORKDIR /app/server
COPY server/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY server/ ./

FROM docker.io/node:18-alpine AS runtime

# Force IPv4-only networking by removing IPv6 support and adding hosts entries
RUN echo 'install_options="--no-ipv6"' >> /etc/apk/apk.conf && \
    sysctl -w net.ipv6.conf.all.disable_ipv6=1 2>/dev/null || true && \
    sysctl -w net.ipv6.conf.default.disable_ipv6=1 2>/dev/null || true && \
    echo '104.16.30.34 registry.npmjs.org' >> /etc/hosts && \
    echo '104.16.31.34 registry.npmjs.org' >> /etc/hosts

# Configure npm for IPv4-only and better reliability
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi

# Copy server files
COPY --from=server-build /app/server ./

# Copy built client files
COPY --from=client-build /app/client/build ./public

# Create non-root user (Podman-compatible)
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Create data directory and set permissions
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "index.js"]
#!/bin/sh
set -e

# Fix permissions for data directory if it exists and we're root
if [ "$(id -u)" = "0" ] && [ -d "/app/server/data" ]; then
    echo "Fixing permissions for /app/server/data..."
    chown -R nodejs:nodejs /app/server/data
    chmod -R 755 /app/server/data

    # Switch to nodejs user and execute the command
    exec su-exec nodejs "$@"
else
    # Already running as correct user or no data directory
    exec "$@"
fi

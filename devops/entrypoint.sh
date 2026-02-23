#!/bin/sh

set -e

echo "🚀 Starting AI Run application..."

if [ ! -d "/app/data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p /app/data
fi

if [ ! -d "/app/logs" ]; then
    echo "📁 Creating logs directory..."
    mkdir -p /app/logs
fi

if [ "$(id -u)" = "0" ]; then
    echo "🔧 Setting directory permissions..."
    chown -R node:node /app/data /app/logs
    chmod -R 775 /app/data /app/logs
fi

echo "✅ Entrypoint setup completed"

exec "$@"

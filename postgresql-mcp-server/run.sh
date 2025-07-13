#!/bin/bash

echo "=== PostgreSQL MCP Server Startup ==="
echo "Loading Home Assistant addon configuration..."

# Configuration file path
CONFIG_FILE="/data/options.json"

# Function to safely read config value
read_config() {
    local key="$1"
    local default="$2"
    if [ -f "$CONFIG_FILE" ]; then
        local value=$(jq -r ".$key // \"$default\"" "$CONFIG_FILE" 2>/dev/null)
        if [ "$value" = "null" ] || [ -z "$value" ]; then
            echo "$default"
        else
            echo "$value"
        fi
    else
        echo "$default"
    fi
}

# Read configuration and export as environment variables
export DATABASE_URL=$(read_config "database_url" "")
export SERVER_PORT=$(read_config "server_port" "3000")
export LOG_LEVEL=$(read_config "log_level" "info")
export MAX_CONNECTIONS=$(read_config "max_connections" "10")
export ENABLE_WRITE_OPERATIONS=$(read_config "enable_write_operations" "false")
export HA_BASE_URL=$(read_config "ha_base_url" "http://supervisor/core")

# Debug logging
echo "Configuration loaded:"
echo "  DATABASE_URL: ${DATABASE_URL:+[SET - $(echo $DATABASE_URL | sed 's/.*@/***@/')]}${DATABASE_URL:-[NOT SET]}"
echo "  SERVER_PORT: $SERVER_PORT"
echo "  LOG_LEVEL: $LOG_LEVEL"
echo "  MAX_CONNECTIONS: $MAX_CONNECTIONS"
echo "  ENABLE_WRITE_OPERATIONS: $ENABLE_WRITE_OPERATIONS"
echo "  HA_BASE_URL: $HA_BASE_URL"

# Additional debug info
if [ -f "$CONFIG_FILE" ]; then
    echo "Configuration file found at: $CONFIG_FILE"
    echo "Configuration file contents:"
    cat "$CONFIG_FILE" 2>/dev/null || echo "Failed to read config file"
else
    echo "WARNING: Configuration file not found at $CONFIG_FILE"
    echo "Available files in /data:"
    ls -la /data/ 2>/dev/null || echo "Cannot list /data directory"
fi

echo "=============================================="

# Validate required configuration
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is required but not set!"
    echo "Please configure the database_url in the addon configuration."
    exit 1
fi

# Start the Node.js application
echo "Starting PostgreSQL MCP Server..."
echo "Node.js version: $(node --version)"
echo "Working directory: $(pwd)"
echo "Application files:"
ls -la /app/dist/ 2>/dev/null || echo "No dist directory found"

exec node /app/dist/index.js

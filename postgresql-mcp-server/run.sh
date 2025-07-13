#!/bin/bash

echo "=== PostgreSQL MCP Server Startup ==="
echo "Loading Home Assistant addon configuration..."

# Configuration file path
CONFIG_FILE="/data/options.json"

# Function to safely read config value with enhanced debugging
read_config() {
    local key="$1"
    local default="$2"
    
    echo "  → Reading config key: $key"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "    ✗ Config file not found, using default: $default"
        echo "$default"
        return
    fi
    
    # Check if jq is available
    if ! command -v jq >/dev/null 2>&1; then
        echo "    ✗ jq not available, using default: $default"
        echo "$default"
        return
    fi
    
    # Try to parse the JSON and extract the value
    local value
    value=$(jq -r ".$key // empty" "$CONFIG_FILE" 2>/dev/null)
    local jq_exit_code=$?
    
    if [ $jq_exit_code -ne 0 ]; then
        echo "    ✗ jq failed to parse JSON (exit code: $jq_exit_code), using default: $default"
        echo "$default"
        return
    fi
    
    if [ -z "$value" ] || [ "$value" = "null" ]; then
        echo "    ✗ Key not found or null, using default: $default"
        echo "$default"
    else
        echo "    ✓ Found value for $key"
        echo "$value"
    fi
}

echo "=== Configuration Reading Debug ==="

# Read configuration and export as environment variables
echo "Reading configuration values..."
export DATABASE_URL=$(read_config "database_url" "")
export SERVER_PORT=$(read_config "server_port" "3000")
export LOG_LEVEL=$(read_config "log_level" "info")
export MAX_CONNECTIONS=$(read_config "max_connections" "10")
export ENABLE_WRITE_OPERATIONS=$(read_config "enable_write_operations" "false")
export HA_BASE_URL=$(read_config "ha_base_url" "http://supervisor/core")

echo "=== Configuration Results ==="
echo "  DATABASE_URL: ${DATABASE_URL:+[SET - $(echo $DATABASE_URL | sed 's/.*@/***@/')]}${DATABASE_URL:-[NOT SET]}"
echo "  SERVER_PORT: $SERVER_PORT"
echo "  LOG_LEVEL: $LOG_LEVEL"
echo "  MAX_CONNECTIONS: $MAX_CONNECTIONS"
echo "  ENABLE_WRITE_OPERATIONS: $ENABLE_WRITE_OPERATIONS"
echo "  HA_BASE_URL: $HA_BASE_URL"

echo "=== File System Debug ==="
if [ -f "$CONFIG_FILE" ]; then
    echo "✓ Configuration file found at: $CONFIG_FILE"
    echo "File permissions: $(ls -la "$CONFIG_FILE" 2>/dev/null || echo 'Cannot get permissions')"
    echo "File size: $(wc -c < "$CONFIG_FILE" 2>/dev/null || echo 'Cannot get size') bytes"
    
    echo "Raw file contents:"
    if cat "$CONFIG_FILE" 2>/dev/null; then
        echo ""  # Add newline after content
        echo "✓ File read successfully"
    else
        echo "✗ Failed to read config file (permission denied?)"
    fi
    
    echo "Testing jq parsing:"
    if jq . "$CONFIG_FILE" >/dev/null 2>&1; then
        echo "✓ JSON is valid"
        echo "Parsed JSON structure:"
        jq . "$CONFIG_FILE" 2>/dev/null || echo "Failed to display JSON"
    else
        echo "✗ JSON is invalid or jq failed"
        echo "jq error output:"
        jq . "$CONFIG_FILE" 2>&1 || echo "No error output"
    echo "Testing jq parsing:"
    if jq . "$CONFIG_FILE" >/dev/null 2>&1; then
        echo "✓ JSON is valid"
        echo "Parsed JSON structure:"
        jq . "$CONFIG_FILE" 2>/dev/null || echo "Failed to display JSON"
    else
        echo "✗ JSON is invalid or jq failed"
        echo "jq error output:"
        jq . "$CONFIG_FILE" 2>&1 || echo "No error output"
    fi
else
    echo "✗ Configuration file not found at $CONFIG_FILE"
    echo "Available files in /data:"
    ls -la /data/ 2>/dev/null || echo "Cannot list /data directory"
    
    echo "Checking other possible locations:"
    for location in "/config/options.json" "/addon_configs/options.json" "/share/options.json"; do
        if [ -f "$location" ]; then
            echo "✓ Found alternative config at: $location"
            ls -la "$location"
        fi
    done
fi

echo "=== Environment Debug ==="
echo "Current user: $(whoami 2>/dev/null || echo 'unknown')"
echo "Current working directory: $(pwd)"
echo "Available tools:"
echo "  jq: $(which jq 2>/dev/null || echo 'not found')"
echo "  cat: $(which cat 2>/dev/null || echo 'not found')"
echo "  bash: $(which bash 2>/dev/null || echo 'not found')"

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

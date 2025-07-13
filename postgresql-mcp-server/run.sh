#!/usr/bin/with-contenv bashio

# Log environment before configuration
bashio::log.info "=== Home Assistant Add-on Configuration Debug ==="

# Check if bashio is working
bashio::log.info "Bashio version: $(bashio --version || echo 'bashio command failed')"

# Test if we can read any config
bashio::log.info "Testing configuration access..."

# Check if config exists
if bashio::config.exists 'database_url'; then
    bashio::log.info "✓ Configuration file accessible"
else
    bashio::log.error "✗ Cannot access configuration file!"
fi

# Get configuration from Home Assistant with debug logging
bashio::log.info "Reading configuration from Home Assistant..."

export DATABASE_URL=$(bashio::config 'database_url' || echo "")
bashio::log.info "database_url from config: '${DATABASE_URL}'"

export SERVER_PORT=$(bashio::config 'server_port' || echo "3000")
bashio::log.info "server_port from config: '${SERVER_PORT}'"

export LOG_LEVEL=$(bashio::config 'log_level' || echo "info")
bashio::log.info "log_level from config: '${LOG_LEVEL}'"

export MAX_CONNECTIONS=$(bashio::config 'max_connections' || echo "10")
bashio::log.info "max_connections from config: '${MAX_CONNECTIONS}'"

export ENABLE_WRITE_OPERATIONS=$(bashio::config 'enable_write_operations' || echo "false")
bashio::log.info "enable_write_operations from config: '${ENABLE_WRITE_OPERATIONS}'"

export HA_BASE_URL=$(bashio::config 'ha_base_url' || echo "http://supervisor/core")
bashio::log.info "ha_base_url from config: '${HA_BASE_URL}'"

# Get Home Assistant Supervisor token for authentication
export SUPERVISOR_TOKEN=${SUPERVISOR_TOKEN}
bashio::log.info "SUPERVISOR_TOKEN: ${SUPERVISOR_TOKEN:+[SET]}"

# Also try reading from /data/options.json directly as fallback
bashio::log.info "=== Fallback: Reading from options.json ==="
if [ -f "/data/options.json" ]; then
    bashio::log.info "options.json exists, contents:"
    cat /data/options.json | jq '.' || bashio::log.error "Failed to parse options.json"
    
    # Try to extract values directly from options.json
    if command -v jq >/dev/null 2>&1; then
        DATABASE_URL_FALLBACK=$(cat /data/options.json | jq -r '.database_url // empty')
        SERVER_PORT_FALLBACK=$(cat /data/options.json | jq -r '.server_port // 3000')
        LOG_LEVEL_FALLBACK=$(cat /data/options.json | jq -r '.log_level // "info"')
        
        bashio::log.info "Fallback DATABASE_URL: '${DATABASE_URL_FALLBACK}'"
        bashio::log.info "Fallback SERVER_PORT: '${SERVER_PORT_FALLBACK}'"
        bashio::log.info "Fallback LOG_LEVEL: '${LOG_LEVEL_FALLBACK}'"
        
        # Use fallback values if primary method failed
        if [ -z "$DATABASE_URL" ] && [ -n "$DATABASE_URL_FALLBACK" ]; then
            export DATABASE_URL="$DATABASE_URL_FALLBACK"
            bashio::log.info "Using fallback DATABASE_URL"
        fi
        if [ -z "$SERVER_PORT" ] || [ "$SERVER_PORT" = "3000" ]; then
            export SERVER_PORT="$SERVER_PORT_FALLBACK"
        fi
        if [ -z "$LOG_LEVEL" ] || [ "$LOG_LEVEL" = "info" ]; then
            export LOG_LEVEL="$LOG_LEVEL_FALLBACK"
        fi
    fi
else
    bashio::log.error "options.json not found at /data/options.json"
fi

# Log final environment variables
bashio::log.info "=== Final Environment Variables ==="
bashio::log.info "DATABASE_URL: ${DATABASE_URL:-[NOT SET]}"
bashio::log.info "SERVER_PORT: ${SERVER_PORT:-[NOT SET]}"
bashio::log.info "LOG_LEVEL: ${LOG_LEVEL:-[NOT SET]}"
bashio::log.info "MAX_CONNECTIONS: ${MAX_CONNECTIONS:-[NOT SET]}"
bashio::log.info "ENABLE_WRITE_OPERATIONS: ${ENABLE_WRITE_OPERATIONS:-[NOT SET]}"
bashio::log.info "HA_BASE_URL: ${HA_BASE_URL:-[NOT SET]}"

# Debug filesystem
bashio::log.info "=== Filesystem Debug ==="
bashio::log.info "Contents of /data:"
ls -la /data/ 2>/dev/null || bashio::log.error "Cannot list /data directory"
bashio::log.info "Contents of /config:"
ls -la /config/ 2>/dev/null || bashio::log.error "Cannot list /config directory"

# Environment debug
bashio::log.info "=== Environment Debug ==="
bashio::log.info "All environment variables with CONFIG or ADDON:"
env | grep -i -E "(config|addon|supervisor)" || bashio::log.info "No config-related env vars found"

bashio::log.info "=============================================="

# Log startup
bashio::log.info "Starting PostgreSQL MCP Server with above configuration..."

# If configuration reading failed, try Node.js fallback
if [ -z "$DATABASE_URL" ] && [ -z "$SERVER_PORT" ]; then
    bashio::log.info "=== Using Node.js Configuration Fallback ==="
    node /app/read-config.js || bashio::log.error "Node.js config reader failed"
fi

# Final validation - ensure we have at least default values
if [ -z "$SERVER_PORT" ]; then
    export SERVER_PORT=3000
    bashio::log.info "Defaulting SERVER_PORT to 3000"
fi

if [ -z "$LOG_LEVEL" ]; then
    export LOG_LEVEL=info
    bashio::log.info "Defaulting LOG_LEVEL to info"
fi

if [ -z "$MAX_CONNECTIONS" ]; then
    export MAX_CONNECTIONS=10
    bashio::log.info "Defaulting MAX_CONNECTIONS to 10"
fi

if [ -z "$ENABLE_WRITE_OPERATIONS" ]; then
    export ENABLE_WRITE_OPERATIONS=false
    bashio::log.info "Defaulting ENABLE_WRITE_OPERATIONS to false"
fi

if [ -z "$HA_BASE_URL" ]; then
    export HA_BASE_URL="http://supervisor/core"
    bashio::log.info "Defaulting HA_BASE_URL to http://supervisor/core"
fi

# Start the application
exec node /app/dist/index.js

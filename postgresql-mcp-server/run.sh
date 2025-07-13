#!/usr/bin/with-contenv bashio

bashio::log.info "=== PostgreSQL MCP Server Startup ==="
bashio::log.info "Loading Home Assistant addon configuration..."

# Read configuration using bashio
DATABASE_URL=$(bashio::config 'database_url')
SERVER_PORT=$(bashio::config 'server_port')
LOG_LEVEL=$(bashio::config 'log_level')
MAX_CONNECTIONS=$(bashio::config 'max_connections')
ENABLE_WRITE_OPERATIONS=$(bashio::config 'enable_write_operations')
HA_BASE_URL=$(bashio::config 'ha_base_url')

# Export as environment variables for Node.js application
export DATABASE_URL
export SERVER_PORT
export LOG_LEVEL
export MAX_CONNECTIONS
export ENABLE_WRITE_OPERATIONS
export HA_BASE_URL

# Debug logging
bashio::log.info "Configuration loaded:"
bashio::log.info "  DATABASE_URL: ${DATABASE_URL:+[SET - $(echo $DATABASE_URL | sed 's/.*@/***@/')]}${DATABASE_URL:-[NOT SET]}"
bashio::log.info "  SERVER_PORT: $SERVER_PORT"
bashio::log.info "  LOG_LEVEL: $LOG_LEVEL"
bashio::log.info "  MAX_CONNECTIONS: $MAX_CONNECTIONS"
bashio::log.info "  ENABLE_WRITE_OPERATIONS: $ENABLE_WRITE_OPERATIONS"
bashio::log.info "  HA_BASE_URL: $HA_BASE_URL"

# Validate required configuration
if bashio::var.is_empty "${DATABASE_URL}"; then
    bashio::log.fatal "DATABASE_URL is required but not set!"
    bashio::log.fatal "Please configure the database_url in the addon configuration."
    exit 1
fi

# Start the Node.js application
bashio::log.info "Starting PostgreSQL MCP Server..."
bashio::log.info "Node.js version: $(node --version)"
bashio::log.info "Working directory: $(pwd)"

exec node /app/dist/index-sdk-compliant.js

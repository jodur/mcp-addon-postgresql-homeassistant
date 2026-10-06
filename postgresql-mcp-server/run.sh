#!/usr/bin/with-contenv bashio

bashio::log.info "=== PostgreSQL MCP Server Startup ==="
bashio::log.info "Loading Home Assistant addon configuration..."

# Read configuration using bashio
DATABASE_URL=$(bashio::config 'database_url')
LOG_LEVEL=$(bashio::config 'log_level')
MAX_CONNECTIONS=$(bashio::config 'max_connections')
ENABLE_WRITE_OPERATIONS=$(bashio::config 'enable_write_operations')
HA_BASE_URL=$(bashio::config 'ha_base_url')
ENABLE_TIMESCALE=$(bashio::config 'enable_timescale')
PUBLIC_URL=$(bashio::config 'public_url')
HA_PUBLIC_URL=$(bashio::config 'ha_public_url')
OAUTH_ALLOWED_REDIRECT_URIS=$(bashio::config 'allowed_redirect_uris')

# Export as environment variables for Node.js application
export DATABASE_URL
export LOG_LEVEL
export MAX_CONNECTIONS
export ENABLE_WRITE_OPERATIONS
export HA_BASE_URL
export ENABLE_TIMESCALE
export PUBLIC_URL
export HA_PUBLIC_URL
export OAUTH_ALLOWED_REDIRECT_URIS

# Debug logging
bashio::log.info "Configuration loaded:"
bashio::log.info "  DATABASE_URL: ${DATABASE_URL:+[SET - $(echo $DATABASE_URL | sed 's/.*@/***@/')]}${DATABASE_URL:-[NOT SET]}"
bashio::log.info "  LOG_LEVEL: $LOG_LEVEL"
bashio::log.info "  SERVER_PORT: fixed at 3000 internally — use the addon's Network tab to change the externally reachable host port"
bashio::log.info "  MAX_CONNECTIONS: $MAX_CONNECTIONS"
bashio::log.info "  ENABLE_WRITE_OPERATIONS: $ENABLE_WRITE_OPERATIONS"
bashio::log.info "  HA_BASE_URL: $HA_BASE_URL"
bashio::log.info "  ENABLE_TIMESCALE: $ENABLE_TIMESCALE"
bashio::log.info "  PUBLIC_URL override: ${PUBLIC_URL:-[not set - will auto-detect per request]}"
bashio::log.info "  HA_PUBLIC_URL override: ${HA_PUBLIC_URL:-[not set - will auto-detect via Supervisor API]}"

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

exec node /app/dist/index.js

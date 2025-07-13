#!/usr/bin/with-contenv bashio

# Log environment before configuration
bashio::log.info "=== Home Assistant Add-on Configuration Debug ==="

# Get configuration from Home Assistant with debug logging
bashio::log.info "Reading configuration from Home Assistant..."

export DATABASE_URL=$(bashio::config 'database_url')
bashio::log.info "database_url from config: ${DATABASE_URL}"

export SERVER_PORT=$(bashio::config 'server_port')
bashio::log.info "server_port from config: ${SERVER_PORT}"

export LOG_LEVEL=$(bashio::config 'log_level')
bashio::log.info "log_level from config: ${LOG_LEVEL}"

export MAX_CONNECTIONS=$(bashio::config 'max_connections')
bashio::log.info "max_connections from config: ${MAX_CONNECTIONS}"

export ENABLE_WRITE_OPERATIONS=$(bashio::config 'enable_write_operations')
bashio::log.info "enable_write_operations from config: ${ENABLE_WRITE_OPERATIONS}"

export HA_BASE_URL=$(bashio::config 'ha_base_url')
bashio::log.info "ha_base_url from config: ${HA_BASE_URL}"

# Get Home Assistant Supervisor token for authentication
export SUPERVISOR_TOKEN=${SUPERVISOR_TOKEN}
bashio::log.info "SUPERVISOR_TOKEN: ${SUPERVISOR_TOKEN:+[SET]}"

# Log final environment variables
bashio::log.info "=== Final Environment Variables ==="
bashio::log.info "DATABASE_URL: ${DATABASE_URL:+[SET - ${DATABASE_URL//\/\/[^:]*:[^@]*@/\/\/***:***@}]}"
bashio::log.info "SERVER_PORT: ${SERVER_PORT}"
bashio::log.info "LOG_LEVEL: ${LOG_LEVEL}"
bashio::log.info "MAX_CONNECTIONS: ${MAX_CONNECTIONS}"
bashio::log.info "ENABLE_WRITE_OPERATIONS: ${ENABLE_WRITE_OPERATIONS}"
bashio::log.info "HA_BASE_URL: ${HA_BASE_URL}"
bashio::log.info "=============================================="

# Log startup
bashio::log.info "Starting PostgreSQL MCP Server with above configuration..."

# Start the application
exec node /app/dist/index.js

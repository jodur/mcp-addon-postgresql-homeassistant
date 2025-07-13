#!/usr/bin/with-contenv bashio

# Get configuration from Home Assistant
export DATABASE_URL=$(bashio::config 'database_url')
export SERVER_PORT=$(bashio::config 'server_port')
export LOG_LEVEL=$(bashio::config 'log_level')
export ALLOWED_USERS=$(bashio::config 'allowed_users' | jq -r '. | join(",")')
export MAX_CONNECTIONS=$(bashio::config 'max_connections')
export ENABLE_WRITE_OPERATIONS=$(bashio::config 'enable_write_operations')

# Get Home Assistant Supervisor token for authentication
export SUPERVISOR_TOKEN=${SUPERVISOR_TOKEN}

# Log startup
bashio::log.info "Starting PostgreSQL MCP Server..."
bashio::log.info "Database URL: ${DATABASE_URL}"
bashio::log.info "Server Port: ${SERVER_PORT}"
bashio::log.info "Log Level: ${LOG_LEVEL}"
bashio::log.info "Max Connections: ${MAX_CONNECTIONS}"
bashio::log.info "Write Operations: ${ENABLE_WRITE_OPERATIONS}"

# Start the application
exec node /app/dist/index.js

# PostgreSQL MCP Server

A Home Assistant addon that provides a Model Context Protocol (MCP) server for PostgreSQL database access with authentication through Home Assistant's API token system.

## Features

- **🏠 Home Assistant Integration**: Uses Home Assistant's authentication system
- **🗄️ PostgreSQL Database Access**: Direct database connection for MCP tools
- **🔐 Secure Authentication**: Validates Home Assistant API tokens
- **🛡️ SQL Injection Protection**: Built-in query validation and sanitization
- **⚙️ Write Operation Control**: Enable/disable write operations via addon configuration
- **☁️ Cloudflare Tunnel Ready**: Designed to work with Home Assistant's cloudflare addon

## Configuration

Configure the addon through the Home Assistant UI:

```yaml
database_url: "postgresql://username:password@host:5432/database"
server_port: 3000
log_level: "info"
max_connections: 10
enable_write_operations: false
ha_base_url: "http://supervisor/core"  # Home Assistant API URL
```

## Usage

The addon provides MCP tools for database operations:

- `listTables` - Lists all database tables
- `queryDatabase` - Execute read-only SQL queries
- `executeDatabase` - Execute write operations (when enabled)

### Authentication

Include your Home Assistant long-lived access token in requests:

```
Authorization: Bearer YOUR_HOME_ASSISTANT_TOKEN
```

### External Access

Use with Cloudflare tunnel for secure external access:

```bash
curl -X POST https://your-tunnel-domain.cloudflareaccess.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  -d '{"method": "tools/list"}'
```

## Security

- All requests require valid Home Assistant authentication
- SQL query validation prevents dangerous operations
- Write operations controlled by addon configuration
- Database connection pooling with configurable limits

For detailed documentation, see the [repository README](https://github.com/jodur/mcp-addon-postgresql-homeassistant).

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
ha_base_url: "http://homeassistant:8123"  # Home Assistant API URL (internal network)
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
curl -X POST https://your-domain.your-tunnel.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  -d '{"method": "tools/list"}'
```

## Security

- All requests require valid Home Assistant authentication
- SQL query validation prevents dangerous operations
- Write operations controlled by addon configuration
- Database connection pooling with configurable limits

## Configuration Notes

- **ha_base_url**: Use `http://homeassistant:8123` for internal network communication (recommended)
- **External access**: For external access via Cloudflare tunnel, use your tunnel domain
- **Authentication**: Only Home Assistant long-lived access tokens are supported
- **Database URL**: Must be a valid PostgreSQL connection string

## Troubleshooting

### Authentication Issues

If authentication fails:
1. Verify your Home Assistant token is valid
2. Check that `ha_base_url` is set to `http://homeassistant:8123`
3. Ensure the addon can reach Home Assistant's API

### Database Connection Issues

If database connection fails:
1. Verify the database URL is correct
2. Check that the database server is accessible
3. Ensure the database user has proper permissions

## Version

Current version: 1.4.10

For detailed documentation, see the [repository README](https://github.com/jodur/mcp-addon-postgresql-homeassistant).

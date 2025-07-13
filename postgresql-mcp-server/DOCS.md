# PostgreSQL MCP Server Add-on Documentation

## Installation

1. Add the repository URL to your Home Assistant add-on store
2. Refresh the add-on store
3. Find "PostgreSQL MCP Server" in the available add-ons
4. Click Install

## Configuration

The add-on requires PostgreSQL connection details:

### Required Options

- **database_url**: Full PostgreSQL connection string
  - Format: `postgresql://username:password@host:5432/database`
  - Example: `postgresql://postgres:mypassword@192.168.1.100:5432/mydb`

- **server_port**: Port for the MCP server (default: 3000)

### Optional Options

- **log_level**: Logging verbosity (debug, info, warn, error)
- **max_connections**: Maximum database connections (1-100)
- **enable_write_operations**: Allow INSERT/UPDATE/DELETE operations
- **ha_base_url**: Home Assistant API URL (default: http://supervisor/core)

## Usage

After starting the add-on, the MCP server will be available at:
- Local: `http://your-ha-instance:3000/mcp`
- With Cloudflare tunnel: `https://your-tunnel-domain/mcp`

### Authentication

All requests require a Home Assistant long-lived access token:

```bash
Authorization: Bearer your_home_assistant_token
```

### Available Tools

- `listTables` - List all database tables
- `queryDatabase` - Execute read-only queries
- `executeDatabase` - Execute write operations (when enabled)

## Troubleshooting

### Add-on not appearing
1. Ensure repository URL is correctly added
2. Refresh the add-on store
3. Check Home Assistant logs for repository errors

### Connection issues
1. Verify PostgreSQL connection string
2. Ensure PostgreSQL server is accessible from Home Assistant
3. Check add-on logs for connection errors

### Authentication failures
1. Verify Home Assistant token is valid
2. Check token has necessary permissions
3. Ensure Home Assistant API is accessible

## Support

For issues and questions:
- GitHub Issues: https://github.com/jodur/mcp-addon-postgresql-homeassistant/issues
- Home Assistant Community Forum

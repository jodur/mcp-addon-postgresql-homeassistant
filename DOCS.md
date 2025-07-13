# PostgreSQL MCP Server Addon

## Installation

1. Navigate to **Supervisor** → **Add-on Store** in Home Assistant
2. Click the menu (⋮) in the top right corner
3. Select **Repositories**
4. Add this repository URL: `https://github.com/your-repo/postgresql-mcp-server-addon`
5. Close the dialog and wait for the add-on to appear
6. Click **Install**

## Configuration

### Required Settings

- **database_url**: PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`)

### Optional Settings

- **server_port**: Port for the MCP server (default: 3000)
- **log_level**: Logging level - `debug`, `info`, `warn`, `error` (default: `info`)
- **allowed_users**: List of Home Assistant users allowed to perform write operations (empty = all users)
- **max_connections**: Maximum database connections (default: 10)
- **enable_write_operations**: Enable INSERT/UPDATE/DELETE operations (default: false)

## Example Configuration

```yaml
database_url: "postgresql://mcpuser:password@192.168.1.100:5432/homeassistant"
server_port: 3000
log_level: "info"
allowed_users: 
  - "admin"
  - "user1"
max_connections: 10
enable_write_operations: true
```

## Usage

The addon exposes an HTTP endpoint at `http://localhost:3000/mcp` that implements the Model Context Protocol.

### Authentication

Use your Home Assistant long-lived access token:

1. Go to **Profile** → **Long-lived access tokens**
2. Create a new token
3. Use it in the Authorization header: `Bearer YOUR_TOKEN`

### Available Tools

- **listTables**: List database tables and schema
- **queryDatabase**: Execute read-only SQL queries
- **executeDatabase**: Execute write operations (if enabled)
- **health**: Check server health
- **serverInfo**: Get server information

### MCP Client Configuration

For Claude Desktop:

```json
{
  "mcpServers": {
    "postgresql-ha": {
      "command": "npx",
      "args": ["mcp-remote", "http://your-ha-instance:3000/mcp"],
      "env": {
        "AUTHORIZATION": "Bearer YOUR_HA_TOKEN"
      }
    }
  }
}
```

## Security

- All database operations require Home Assistant authentication
- SQL injection protection built-in
- Write operations can be restricted to specific users
- Connection pooling prevents database overload

## Support

For issues and questions, visit the [GitHub repository](https://github.com/your-repo/postgresql-mcp-server-addon).

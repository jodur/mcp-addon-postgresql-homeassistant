# PostgreSQL MCP Server for Home Assistant

A Home Assistant addon that provides a Model Context Protocol (MCP) server for PostgreSQL database access with authentication through Home Assistant's API token system.

## Features

- **🏠 Home Assistant Integration**: Uses Home Assistant's authentication system
- **🗄️ PostgreSQL Database Access**: Direct database connection for MCP tools
- **🔐 Secure Authentication**: Validates Home Assistant API tokens
- **🛡️ SQL Injection Protection**: Built-in query validation and sanitization
- **⚙️ Configurable Permissions**: Role-based access control for database operations
- **🐳 Docker Support**: Packaged as a Home Assistant addon
- **☁️ Cloudflare Tunnel Ready**: Designed to work with Home Assistant's cloudflare addon

## Installation

1. Add this repository to your Home Assistant addon store
2. Install the "PostgreSQL MCP Server" addon
3. Configure the addon with your PostgreSQL connection details
4. Start the addon

## Configuration

### Addon Configuration

Configure the addon through the Home Assistant UI:

```yaml
database_url: "postgresql://username:password@host:5432/database"
server_port: 3000
log_level: "info"
allowed_users: []  # Empty array allows all authenticated users
max_connections: 10
enable_write_operations: false
ha_base_url: "http://supervisor/core"  # Home Assistant API URL
```

### Environment Variables

The addon supports the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `SERVER_PORT`: Port for the MCP server (default: 3000)
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `ALLOWED_USERS`: Comma-separated list of allowed usernames
- `MAX_CONNECTIONS`: Maximum database connections
- `ENABLE_WRITE_OPERATIONS`: Enable write operations (true/false)
- `HA_BASE_URL`: Home Assistant API base URL (default: http://supervisor/core)

## Usage

### Available MCP Tools

#### 1. `listTables` (All Users)
Lists all tables in the database with schema information.

```json
{
  "method": "tools/call",
  "params": {
    "name": "listTables",
    "arguments": {
      "schema": "public"
    }
  }
}
```

#### 2. `queryDatabase` (All Users)
Execute read-only SQL queries.

```json
{
  "method": "tools/call",
  "params": {
    "name": "queryDatabase",
    "arguments": {
      "sql": "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    }
  }
}
```

#### 3. `executeDatabase` (Privileged Users)
Execute write operations (INSERT, UPDATE, DELETE, DDL).

```json
{
  "method": "tools/call",
  "params": {
    "name": "executeDatabase",
    "arguments": {
      "sql": "CREATE TABLE example (id SERIAL PRIMARY KEY, name VARCHAR(100))"
    }
  }
}
```

### Authentication

The server uses Home Assistant's authentication system. Include your Home Assistant long-lived access token in the Authorization header:

```
Authorization: Bearer YOUR_HOME_ASSISTANT_TOKEN
```

### MCP Client Configuration

For HTTP-based MCP clients, use the REST API endpoints:

**Local Access:**
```bash
# List available tools
curl -X POST http://your-ha-instance:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  -d '{"method": "tools/list"}'

# Call a tool
curl -X POST http://your-ha-instance:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  -d '{"method": "tools/call", "params": {"name": "listTables"}}'
```

**Cloudflare Tunnel Access (HTTPS):**
```bash
# List available tools via Cloudflare tunnel
curl -X POST https://your-tunnel-domain.cloudflareaccess.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  -d '{"method": "tools/list"}'

# Call a tool via Cloudflare tunnel
curl -X POST https://your-tunnel-domain.cloudflareaccess.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  -d '{"method": "tools/call", "params": {"name": "listTables"}}'
```

### Integration with AI Tools

The MCP server can be integrated with various AI tools and platforms that support the Model Context Protocol over HTTP endpoints.

## Security

### SQL Injection Protection

The server includes comprehensive SQL injection protection:

- Pattern-based validation for dangerous SQL constructs
- Parameterized query support
- Operation type detection (read vs write)
- Query sanitization

### Access Control

- **Authentication**: All requests require valid Home Assistant tokens
- **Authorization**: Write operations can be restricted to specific users
- **Audit Logging**: All database operations are logged with user context
- **Connection Limits**: Configurable connection pooling

## Development

### Prerequisites

- Node.js 18+
- TypeScript
- Docker (for addon packaging)
- Home Assistant development environment

### Building

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Start the server
npm start
```

### Testing

```bash
# Build the addon
npm run build

# Test with curl
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HA_TOKEN" \
  -d '{"method": "tools/list"}'
```

## Cloudflare Tunnel Integration

This addon is designed to work with Home Assistant's cloudflare addon for secure external access:

1. **Install and configure** the Home Assistant cloudflare addon
2. **Configure the tunnel** to expose the MCP server port (3000)
3. **Use the HTTPS URL** for remote MCP client connections

### Cloudflare Tunnel Configuration

When using Cloudflare tunnel, your MCP server will be accessible via HTTPS:

```yaml
# In your Cloudflare tunnel configuration
tunnel: your-tunnel-id
credentials-file: /etc/cloudflared/your-tunnel.json
ingress:
  - hostname: your-domain.cloudflareaccess.com
    service: http://localhost:3000
  - service: http_status:404
```

**Benefits of Cloudflare Tunnel:**
- **HTTPS encryption** - All traffic is automatically encrypted
- **Global CDN** - Fast access from anywhere in the world  
- **DDoS protection** - Built-in security against attacks
- **Access control** - Optional Cloudflare Access integration
- **No port forwarding** - No need to open firewall ports

**External URL:** `https://your-tunnel-domain.cloudflareaccess.com/mcp`

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │────│  Home Assistant │────│   PostgreSQL    │
│   (HTTP/HTTPS)  │    │   MCP Server    │    │    Database     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
    Local: HTTP           Home Assistant           Database
    Tunnel: HTTPS         Authentication              Pool
    via Cloudflare        Token Validation         Management
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Check if the addon is running and port is accessible
2. **Authentication failed**: Verify Home Assistant token is valid
3. **Database connection failed**: Check PostgreSQL connection string
4. **Permission denied**: Ensure user has required permissions for write operations

### Logs

Check addon logs through Home Assistant:
- Supervisor → Add-ons → PostgreSQL MCP Server → Logs

### Health Check

The server provides a health check endpoint:

```bash
curl http://localhost:3000/health
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/jodur/mcp-addon-postgresql-homeassistant/issues)
- Home Assistant Community: [Forum discussion](https://community.home-assistant.io/)

## Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Home Assistant](https://www.home-assistant.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

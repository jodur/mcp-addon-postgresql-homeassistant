# PostgreSQL MCP Server for Home Assistant Add-on Repository

This repository contains a Home Assistant addon that provides a Model Context Protocol (MCP) server for PostgreSQL database access with authentication through Home Assistant's API token system.

## Features

- **🏠 Home Assistant Integration**: Uses Home Assistant's authentication system
- **🗄️ PostgreSQL Database Access**: Direct database connection for MCP tools
- **🔐 Secure Authentication**: Validates Home Assistant API tokens, with optional OAuth 2.1 for clients that require it (e.g. claude.ai custom connectors)
- **🛡️ SQL Injection Protection**: Built-in query validation and sanitization
- **⚙️ Write Operation Control**: Enable/disable write operations via addon configuration
- **🐳 Docker Support**: Packaged as a Home Assistant addon
- **☁️ Cloudflare Tunnel Ready**: Designed to work with Home Assistant's cloudflare addon

## Installation

### Step 1: Add Repository to Home Assistant

1. Go to **Settings** > **Add-ons** > **Add-on Store** in your Home Assistant
2. Click the **⋮** (three dots) menu in the top right corner
3. Select **Repositories**
4. Add this repository URL:
   ```
   https://github.com/jodur/mcp-addon-postgresql-homeassistant
   ```
5. Click **Add**

### Step 2: Install the Add-on

1. Find "PostgreSQL MCP Server" in the add-on store
2. Click on it and then click **Install**
3. Wait for the installation to complete

### Step 3: Configure and Start

1. Go to the **Configuration** tab
2. Configure the addon with your PostgreSQL connection details
3. Click **Save**
4. Go to the **Info** tab and click **Start**

## Configuration

### Addon Configuration

Configure the addon through the Home Assistant UI:

```yaml
database_url: "postgresql://username:password@host:5432/database"
log_level: "info"
max_connections: 10
enable_write_operations: false
ha_base_url: "http://homeassistant:8123"  # Home Assistant API URL
enable_timescale: false
public_url: ""              # optional, only needed for OAuth (see below)
ha_public_url: ""           # optional, only needed for OAuth (see below)
allowed_redirect_uris: ""   # optional, only needed for OAuth (see below)
```

The MCP server always listens on container port 3000 internally — use the addon's **Network** tab in Home Assistant to change the externally reachable host port. There is no `server_port` option; changing the internal port independently of the fixed `3000/tcp` container mapping would silently break connectivity, so it was removed.

### Environment Variables

The addon supports the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `MAX_CONNECTIONS`: Maximum database connections
- `ENABLE_WRITE_OPERATIONS`: Enable write operations (true/false)
- `HA_BASE_URL`: Home Assistant API base URL (default: http://homeassistant:8123)
- `ENABLE_TIMESCALE`: Enable TimescaleDB-specific tool descriptions (true/false)
- `PUBLIC_URL`: Override for this addon's own public URL (optional; auto-detected per-request if blank) — only relevant for OAuth
- `HA_PUBLIC_URL`: Override for Home Assistant's public URL (optional; auto-detected via the Supervisor API if blank) — only relevant for OAuth
- `OAUTH_ALLOWED_REDIRECT_URIS`: Comma-separated extra trusted OAuth redirect URIs beyond claude.ai's own and localhost loopback

**Note**: The primary authentication path is service-based using Home Assistant tokens; see [Authentication](#authentication) below for the additional OAuth 2.1 option and its requirements.

## Usage

### Available MCP Tools

#### 1. `listTables`
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

#### 2. `queryDatabase`
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

#### 3. `executeDatabase`
Execute write operations (INSERT, UPDATE, DELETE, DDL). Only available when `enable_write_operations` is set to `true` in addon configuration.

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

The server supports two authentication methods:

**1. Bearer token (default, unchanged)** — include your Home Assistant long-lived access token in the Authorization header:

```
Authorization: Bearer YOUR_HOME_ASSISTANT_TOKEN
```

This works with Claude Desktop/Code, curl, SuperGateway, and any client that lets you set a custom header.

**2. OAuth 2.1 (for clients that require it, e.g. claude.ai web/mobile custom connectors)** — the addon proxies Home Assistant's own OAuth2 authorization-code flow, so no separate login system or client registration is needed on your end. To enable it:

- Add `public_url`, `ha_public_url`, and `allowed_redirect_uris` in the addon's Configuration (all optional; auto-detected if left blank)
- The addon requires `homeassistant_api: true` to obtain a Supervisor-injected token used only to auto-detect Home Assistant's external URL
- The addon must be reachable at a public HTTPS URL (e.g. via a Cloudflare Tunnel) for the browser-based login redirect and for claude.ai's callback
- Supports Dynamic Client Registration (RFC 7591), PKCE (mandatory), and refresh tokens — no manual client ID/secret setup required in claude.ai
- See [Claude.ai Custom Connector](#claudeai-custom-connector-oauth) below for setup steps

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

### Claude Desktop Integration via SuperGateway

You can use this MCP server with Claude Desktop through [SuperGateway](https://github.com/supercorp-ai/supergateway), which provides a bridge between HTTP-based MCP servers and Claude Desktop's stdio-based MCP client.

#### Setup Instructions:

1. **Install SuperGateway:**
   ```bash
   npm install -g @supercorp-ai/supergateway
   ```

2. **Configure Claude Desktop:**
   Add the following configuration to your Claude Desktop MCP settings file:

   **On macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   **On Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "postgresql-ha": {
         "command": "supergateway",
         "args": [
           "--url", "http://your-ha-instance:3000/mcp",
           "--header", "Authorization: Bearer YOUR_HOME_ASSISTANT_TOKEN",
           "--header", "Content-Type: application/json"
         ]
       }
     }
   }
   ```

3. **For Cloudflare Tunnel (HTTPS) access:**
   ```json
   {
     "mcpServers": {
       "postgresql-ha": {
         "command": "supergateway",
         "args": [
           "--url", "https://your-tunnel-domain.cloudflareaccess.com/mcp",
           "--header", "Authorization: Bearer YOUR_HOME_ASSISTANT_TOKEN",
           "--header", "Content-Type: application/json"
         ]
       }
     }
   }
   ```

4. **Restart Claude Desktop** to load the new MCP server configuration.

#### Usage in Claude Desktop:

Once configured, you can use natural language commands in Claude Desktop like:

- *"List all tables in the database"*
- *"Show me the schema for the users table"*
- *"Query the database to find all active users"*
- *"Create a new table for storing product information"* (if write operations are enabled)

#### Benefits of this Integration:

- **🤖 Natural Language Interface**: Use conversational commands instead of JSON API calls
- **🔄 Real-time Database Access**: Claude can directly query and analyze your PostgreSQL data
- **🛡️ Secure Authentication**: All requests use your Home Assistant token for secure access
- **☁️ Remote Access**: Works with both local and Cloudflare tunnel connections
- **📊 Data Analysis**: Claude can perform complex analysis on your database contents

#### Example Conversation:

```
You: "What tables are available in my database?"
Claude: [Uses listTables tool] "I can see you have the following tables: users, products, orders, and logs. Would you like me to examine the schema of any specific table?"

You: "Show me the structure of the users table"
Claude: [Uses queryDatabase tool] "The users table has columns: id (primary key), username, email, created_at, and is_active. There are currently 150 users in the table."
```

### Claude.ai Custom Connector (OAuth)

claude.ai's web/mobile custom connectors only support OAuth 2.0/2.1 — they don't accept static bearer tokens or custom headers. This addon supports that by proxying Home Assistant's own OAuth authorization-code flow, so no separate login system or manual client registration is required.

#### Setup Instructions:

1. **Enable a public HTTPS URL** for the addon (e.g. via Home Assistant's Cloudflare Tunnel addon). claude.ai must be able to reach it for the login redirect and callback.
2. **Configure the addon options** (Configuration tab): leave `public_url`, `ha_public_url`, and `allowed_redirect_uris` blank to auto-detect, or set them explicitly if auto-detection doesn't work for your setup. `homeassistant_api: true` must be enabled (already the addon's default) so Home Assistant's external URL can be auto-detected via the Supervisor API.
3. **In claude.ai**, go to **Settings → Connectors → Add custom connector**, and enter your addon's public URL followed by `/mcp` (e.g. `https://your-domain.example.com/mcp`).
4. **Authorize**: claude.ai will register itself automatically (Dynamic Client Registration), redirect you to log into Home Assistant in your browser, and then complete the connection — no client ID/secret entry needed.
5. Once connected, claude.ai stores a refresh token and renews its access token automatically in the background; you should not need to reconnect unless you revoke access in Home Assistant or remove the connector in claude.ai.

**Note:** this is entirely separate from the bearer-token method above — Claude Desktop/Code, curl, and SuperGateway continue to work exactly as before, unaffected by whether OAuth is used.

## Security

### SQL Query Validation

The server includes basic SQL query validation designed for LLM-generated queries:

- **Pattern-based validation** for obviously dangerous constructs (e.g., `xp_cmdshell`, malformed queries)
- **Operation type detection** to distinguish read vs write operations
- **Multiple statement prevention** to block query chaining
- **Basic syntax validation** to catch malformed SQL

**Important Security Notes:**

⚠️ **This is NOT comprehensive SQL injection protection.** The validation is designed to:
- Prevent accidental execution of dangerous administrative commands
- Ensure write operations respect the `enable_write_operations` setting
- Catch basic malformed queries from LLM generation errors

⚠️ **Trust Model**: This MCP server assumes queries come from **trusted sources** (authenticated AI assistants, not untrusted user input). The validation primarily prevents:
- Accidental destructive operations
- LLM hallucinations that generate dangerous SQL patterns
- Configuration errors (write ops when disabled)

**For Production Use:**
- Use database-level permissions to restrict what the connection user can access
- Consider read-only database replicas for query-only operations
- Monitor query logs for unexpected patterns
- Implement network-level access controls

### Access Control

- **Authentication**: All requests require valid Home Assistant tokens (bearer token or OAuth-issued, see [Authentication](#authentication))
- **Write Operations**: Controlled by the `enable_write_operations` addon setting
- **Audit Logging**: All database operations are logged with request context
- **Connection Limits**: Configurable connection pooling
- **Rate Limiting**: The OAuth endpoints (`/register`, `/authorize`, `/token`) are rate-limited per-IP to prevent abuse of these unauthenticated-by-design endpoints
- **Scoped CORS**: `/token` and `/register` restrict cross-origin responses to trusted origins (claude.ai, localhost loopback, configured `allowed_redirect_uris`) rather than the open policy used by the `/mcp` endpoint

### Security Model & Trust Assumptions

This MCP server is designed for **service-to-service communication** with AI assistants, not direct user input:

**✅ Trusted Sources:**
- Authenticated AI assistants (Claude, ChatGPT, etc.)
- MCP clients with valid Home Assistant tokens
- Automated tools using proper authentication

**❌ NOT suitable for:**
- Direct user SQL input without validation
- Public-facing SQL interfaces
- Untrusted third-party applications

**Recommended Security Practices:**
1. **Database Permissions**: Grant minimal necessary permissions to the PostgreSQL user
2. **Network Security**: Use firewalls and VPNs to restrict database access
3. **Monitoring**: Log and monitor all database operations
4. **Separate Environments**: Use read-only replicas for query-heavy operations
5. **Regular Updates**: Keep PostgreSQL and dependencies updated

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

1. **Connection refused**: Check if the addon is running and port is accessible. The MCP server always listens on container port 3000 internally — the externally reachable port is set via the addon's **Network** tab, not a config option.
2. **Port already in use / can't start**: Another add-on or service on your Home Assistant host may already be bound to the chosen host port. Check the Network tab of each installed add-on, or use `docker ps` via the Terminal & SSH add-on to see what's bound to a given port.
3. **Authentication failed**: Verify your Home Assistant token is valid (bearer token method), or that the OAuth login completed successfully (OAuth method — check for a clear error in the addon logs, e.g. from `/authorize` or `/token`)
4. **claude.ai "Couldn't register with ... sign-in service"**: the addon's public URL must be reachable and correctly routed (check `/health` and `/.well-known/oauth-authorization-server` respond over your public URL, not just locally)
5. **OAuth `/authorize` fails with a 401 or "auto-detect" error**: confirm `homeassistant_api: true` is set and the addon was reinstalled/rebuilt (not just reconfigured) so a `SUPERVISOR_TOKEN` is injected; or set `ha_public_url` manually
6. **Database connection failed**: Check PostgreSQL connection string
7. **Write operations disabled**: Ensure `enable_write_operations` is set to `true` in addon configuration if you need to execute write queries

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

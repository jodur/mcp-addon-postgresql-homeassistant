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

The MCP server always listens on container port 3000 internally; use the addon's **Network** tab in Home Assistant to change the externally reachable host port.

### Optional Options

- **log_level**: Logging verbosity (debug, info, warn, error)
- **max_connections**: Maximum database connections (1-100)
- **enable_write_operations**: Allow INSERT/UPDATE/DELETE operations
- **enable_timescale**: Enable TimescaleDB-specific function descriptions and examples in the query tools
- **ha_base_url**: Home Assistant API URL used to validate bearer tokens (default: `http://homeassistant:8123`)
- **public_url**: The externally reachable base URL of this addon (e.g. your Cloudflare tunnel domain). Only needed for the OAuth login flow; leave blank to auto-detect from the incoming request
- **ha_public_url**: Home Assistant's externally reachable URL. Only needed for the OAuth login flow; leave blank to auto-detect via the Supervisor API
- **allowed_redirect_uris**: Comma-separated list of additional OAuth redirect URIs to trust, beyond claude.ai and localhost loopback (e.g. for other MCP clients you use)

## Usage

After starting the add-on, the MCP server will be available at:
- Local: `http://your-ha-instance:3000/mcp`
- With Cloudflare tunnel: `https://your-tunnel-domain/mcp`

### Authentication

Two authentication methods are supported, and both issue/validate genuine Home Assistant access tokens:

**1. Bearer token (Claude Desktop/Code, curl, SuperGateway, etc.)**

Pass a Home Assistant long-lived access token directly:

```bash
Authorization: Bearer your_home_assistant_token
```

**2. OAuth 2.1 (claude.ai custom connectors)**

For clients that only support OAuth login (no static bearer header), the addon exposes a discovery/authorization flow that proxies Home Assistant's own OAuth2 authorization-code flow:

- `GET /.well-known/oauth-authorization-server` / `GET /.well-known/oauth-protected-resource` - discovery metadata
- `POST /register` - dynamic client registration (RFC 7591)
- `GET /authorize` - redirects to Home Assistant's login page
- `GET /callback` - receives the Home Assistant login result
- `POST /token` - exchanges the authorization code for a real Home Assistant access token

The user logs into Home Assistant in the browser as normal; no separate credentials are created by this addon.

### Available Tools

- `listTables` - List all tables in the database, including columns, primary keys, foreign keys, and indexes
- `queryDatabase` - Execute read-only SQL queries
- `executeDatabase` - Execute write SQL statements (INSERT/UPDATE/DELETE), only available when `enable_write_operations` is true
- `health` - Check the health status of the MCP server
- `serverInfo` - Get information about the current server configuration

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
4. For OAuth login issues, check that `public_url`/`ha_public_url` are correct (or blank to auto-detect) and that your client's redirect URI is trusted via `allowed_redirect_uris`

## Support

For issues and questions:
- GitHub Issues: https://github.com/jodur/mcp-addon-postgresql-homeassistant/issues
- Home Assistant Community Forum

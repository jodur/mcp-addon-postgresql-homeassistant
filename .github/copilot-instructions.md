<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# PostgreSQL MCP Server for Home Assistant

This is a Home Assistant addon that provides a Model Context Protocol (MCP) server for PostgreSQL database access with authentication through Home Assistant's API token system.

## Project Structure

- `src/` - Source code for the MCP server
  - `index.ts` - Main server application
  - `types.ts` - TypeScript type definitions and validation
  - `auth/` - Authentication modules
    - `home-assistant-auth.ts` - Home Assistant token authentication
  - `database/` - Database connection and utilities
    - `connection.ts` - PostgreSQL connection management
  - `tools/` - MCP tools implementation
    - `database-tools.ts` - Database operation tools
    - `register-tools.ts` - Tool registration

## Key Features

- **Home Assistant Integration**: Uses Home Assistant's authentication system
- **PostgreSQL Database Access**: Provides tools for database queries and operations
- **Security**: SQL injection protection and user permission management
- **Docker Support**: Packaged as a Home Assistant addon
- **MCP Protocol**: Implements Model Context Protocol for AI assistant integration

## Development Guidelines

When working with this codebase:

1. **Authentication**: All database operations require valid Home Assistant authentication
2. **Security**: Always validate SQL queries and check user permissions
3. **Error Handling**: Use proper error handling and user-friendly error messages
4. **TypeScript**: Maintain strict typing throughout the codebase
5. **MCP Protocol**: Follow MCP specifications for tool definitions and responses

## Version Management

**IMPORTANT**: When making changes that will be deployed to users, ALWAYS update version numbers:

1. **Update addon version** in `postgresql-mcp-server/config.yaml` (version field)
2. **Update package version** in `postgresql-mcp-server/package.json` (version field)
3. **Update all source code versions** in `postgresql-mcp-server/src/index.ts`:
   - McpServer version
   - Health check endpoint version
   - Server info version
4. **Update changelogs**:
   - Main repository: `CHANGELOG.md`
   - Addon specific: `postgresql-mcp-server/CHANGELOG.md`
5. **Build TypeScript** with `npm run build`
6. **Commit and push** changes to trigger Home Assistant update detection

Version format: `MAJOR.MINOR.PATCH` (e.g., 1.2.1 → 1.2.2 for patches, 1.2.1 → 1.3.0 for features)

**Home Assistant addon updates require version increments** - users won't see updates without version changes!

You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt

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

You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt

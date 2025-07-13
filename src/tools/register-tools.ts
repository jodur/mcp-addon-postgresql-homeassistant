import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpConfig } from '../types';
import { registerDatabaseTools } from './database-tools';

/**
 * Register all MCP tools with the server
 */
export async function registerAllTools(server: McpServer, config: McpConfig): Promise<void> {
  try {
    // Register database tools if database URL is provided
    if (config.databaseUrl) {
      registerDatabaseTools(server, config);
      console.log('Database tools registered successfully');
    } else {
      console.log('Database URL not provided, skipping database tools registration');
    }

    // Register health check tool
    server.tool(
      'health',
      'Check the health status of the MCP server',
      {},
      async () => {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'healthy',
              timestamp: new Date().toISOString(),
              database: config.databaseUrl ? 'configured' : 'not configured',
              writeOperations: config.enableWriteOperations ? 'enabled' : 'disabled',
              allowedUsers: config.allowedUsers.length > 0 ? config.allowedUsers : 'all authenticated users',
              maxConnections: config.maxConnections
            }, null, 2)
          }]
        };
      }
    );

    // Register server info tool
    server.tool(
      'serverInfo',
      'Get information about the MCP server configuration',
      {},
      async () => {
        return {
          content: [{
            type: 'text',
            text: `PostgreSQL MCP Server for Home Assistant

Configuration:
- Database: ${config.databaseUrl ? 'Connected' : 'Not configured'}
- Write Operations: ${config.enableWriteOperations ? 'Enabled' : 'Disabled'}
- Max Connections: ${config.maxConnections}
- Allowed Users: ${config.allowedUsers.length > 0 ? config.allowedUsers.join(', ') : 'All authenticated users'}

Available Tools:
- listTables: List all tables in the database
- queryDatabase: Execute read-only SQL queries
${config.enableWriteOperations ? '- executeDatabase: Execute write SQL statements' : ''}
- health: Check server health
- serverInfo: Get server information

Authentication:
This server uses Home Assistant's authentication system. Ensure you have a valid Home Assistant access token.`
          }]
        };
      }
    );

    console.log('All MCP tools registered successfully');
  } catch (error) {
    console.error('Error registering MCP tools:', error);
    throw error;
  }
}

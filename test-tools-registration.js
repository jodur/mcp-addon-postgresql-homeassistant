// Quick test to check MCP tools registration
// This bypasses authentication for testing purposes

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDatabaseTools } from './postgresql-mcp-server/dist/tools/database-tools.js';

console.log('🧪 Testing MCP Tools Registration...');

const server = new McpServer({
  name: 'Test PostgreSQL MCP Server',
  version: '1.3.6',
});

// Mock config
const config = {
  enableWriteOperations: false,
  allowedUsers: [],
  databaseUrl: '',
  maxConnections: 10
};

try {
  // Register database tools
  console.log('📝 Registering database tools...');
  registerDatabaseTools(server, config);
  
  // Check registered tools
  console.log('✅ Database tools registration completed');
  
  if (server._registeredTools) {
    const toolNames = Object.keys(server._registeredTools);
    console.log(`✅ Found ${toolNames.length} registered tools:`);
    toolNames.forEach((toolName, index) => {
      const tool = server._registeredTools[toolName];
      console.log(`  ${index + 1}. ${toolName} - ${tool.description || 'No description'}`);
    });
  } else {
    console.log('❌ No tools found in _registeredTools');
  }
  
  console.log('\n🎉 Tools registration test completed successfully!');
  
} catch (error) {
  console.error('❌ Error during tools registration:', error);
}

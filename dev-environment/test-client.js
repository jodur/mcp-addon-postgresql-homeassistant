#!/usr/bin/env node

/**
 * MCP Server Test Client
 * Tests the PostgreSQL MCP Server with various scenarios
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiZWVkMDZkODNjMWI0NDgyYjJlNTc1ZWRlZDIxMGNlNSIsImlhdCI6MTc1MjM5MDcyMiwiZXhwIjoyMDY3NzUwNzIyfQ.fnzjsA90LWYrAxBFlqZbdzoAlcQxo3iQVgXptlMzx8o';

class MCPTestClient {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
  }

  async testHealthCheck() {
    console.log('\n🏥 Testing Health Check...');
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health Check Passed:', response.data);
      return true;
    } catch (error) {
      console.log('❌ Health Check Failed:', error.message);
      return false;
    }
  }

  async sendMCPRequest(method, params = {}) {
    console.log(`\n🔄 Sending MCP Request: ${method}`);
    try {
      const response = await this.client.post('/mcp', {
        method,
        params: Object.keys(params).length > 0 ? params : undefined
      });
      
      console.log('✅ Success:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      if (error.response) {
        console.log('❌ Server Error:', error.response.status, error.response.data);
      } else {
        console.log('❌ Request Error:', error.message);
      }
      return null;
    }
  }

  async testInitialize() {
    console.log('\n🚀 Testing MCP Initialize...');
    const result = await this.sendMCPRequest('initialize');
    if (result && result.success) {
      console.log('✅ MCP Initialize successful');
      console.log(`   Protocol Version: ${result.data.protocolVersion}`);
      console.log(`   Server: ${result.data.serverInfo.name} v${result.data.serverInfo.version}`);
    }
    return result;
  }

  async testToolsList() {
    console.log('\n🛠️  Testing Tools List...');
    const result = await this.sendMCPRequest('tools/list');
    if (result && result.success) {
      console.log(`✅ Found ${result.data.tools.length} tools`);
      result.data.tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
    }
    return result;
  }

  async testResourcesList() {
    console.log('\n📚 Testing Resources List...');
    const result = await this.sendMCPRequest('resources/list');
    if (result && result.success) {
      console.log(`✅ Found ${result.data.resources.length} resources`);
      result.data.resources.forEach(resource => {
        console.log(`   - ${resource.uri}: ${resource.mimeType}`);
      });
    }
    return result;
  }

  async testPromptsList() {
    console.log('\n💬 Testing Prompts List...');
    const result = await this.sendMCPRequest('prompts/list');
    if (result && result.success) {
      console.log(`✅ Found ${result.data.prompts.length} prompts`);
      result.data.prompts.forEach(prompt => {
        console.log(`   - ${prompt.name}: ${prompt.description}`);
      });
    }
    return result;
  }

  async testToolCall(toolName, args = {}) {
    console.log(`\n⚡ Testing Tool Call: ${toolName}...`);
    const result = await this.sendMCPRequest('tools/call', {
      name: toolName,
      arguments: args
    });
    return result;
  }

  async testInvalidMethod() {
    console.log('\n🚫 Testing Invalid Method...');
    const result = await this.sendMCPRequest('invalid/method');
    // This should fail, which is expected
    return result;
  }

  async testAuthenticationFailure() {
    console.log('\n🔒 Testing Authentication Failure...');
    try {
      const response = await axios.post(`${BASE_URL}/mcp`, {
        method: 'initialize'
      }, {
        headers: {
          'Content-Type': 'application/json'
          // No Authorization header
        }
      });
      console.log('❌ Authentication should have failed but didn\'t');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Authentication properly rejected unauthorized request');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
  }

  async runAllTests() {
    console.log('🧪 PostgreSQL MCP Server Test Suite');
    console.log('====================================');
    
    // Test basic connectivity
    const healthOk = await this.testHealthCheck();
    if (!healthOk) {
      console.log('\n❌ Server is not responding. Make sure it\'s running on port 3000');
      return;
    }

    // Test MCP Protocol
    await this.testInitialize();
    await this.testToolsList();
    await this.testResourcesList();
    await this.testPromptsList();

    // Test error conditions
    await this.testInvalidMethod();
    await this.testAuthenticationFailure();

    // Test tool calls (if any tools are available)
    await this.testToolCall('nonexistent-tool');

    console.log('\n🎉 Test Suite Complete!');
    console.log('\n📋 Summary:');
    console.log('   - Health check and basic connectivity tested');
    console.log('   - MCP protocol methods tested');
    console.log('   - Authentication and error handling tested');
    console.log('   - Tool calling mechanism tested');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const client = new MCPTestClient();
  client.runAllTests().catch(console.error);
}

module.exports = MCPTestClient;

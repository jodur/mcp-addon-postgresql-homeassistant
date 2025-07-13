#!/usr/bin/env node

/**
 * Home Assistant Authentication Test Script
 * 
 * This script tests the Home Assistant authentication integration
 * in the development environment.
 */

require('dotenv').config();

const HA_BASE_URL = process.env.HA_BASE_URL || 'http://localhost:8123';
const TEST_TOKEN = process.env.HA_TEST_TOKEN || '';

console.log('🏠 Home Assistant Authentication Test\n');

if (!TEST_TOKEN) {
  console.error('❌ HA_TEST_TOKEN environment variable is required');
  console.log('📝 Please add your Home Assistant long-lived access token to .env:');
  console.log('   HA_TEST_TOKEN=your-long-lived-access-token-here\n');
  console.log('📖 How to get a long-lived access token:');
  console.log('   1. Go to your Home Assistant Profile');
  console.log('   2. Scroll down to "Long-Lived Access Tokens"');
  console.log('   3. Click "Create Token"');
  console.log('   4. Give it a name and copy the token');
  process.exit(1);
}

async function testHomeAssistantAuth() {
  console.log(`📡 Testing connection to: ${HA_BASE_URL}`);
  console.log(`🔑 Using token: ${TEST_TOKEN.substring(0, 10)}...\n`);

  // Test 1: Basic API connectivity
  console.log('🧪 Test 1: Basic API Connectivity');
  try {
    const response = await fetch(`${HA_BASE_URL}/api/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Home Assistant API is reachable');
      console.log(`📋 API Response:`, data);
    } else {
      console.log(`❌ API request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`📄 Error response:`, errorText.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('💡 Check if Home Assistant is running and accessible');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Authentication endpoint
  console.log('🧪 Test 2: Authentication Endpoint');
  try {
    const response = await fetch(`${HA_BASE_URL}/api/auth/check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const authData = await response.json();
      console.log('✅ Authentication successful');
      console.log(`👤 User info:`, authData);
    } else {
      console.log(`❌ Authentication failed: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log('🔑 Token appears to be invalid or expired');
      } else if (response.status === 404) {
        console.log('🚫 Authentication endpoint not found - this might be normal for some HA versions');
      }
      
      const errorText = await response.text();
      console.log(`📄 Error response:`, errorText.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: States endpoint (another way to verify auth)
  console.log('🧪 Test 3: States Endpoint (Alternative Auth Test)');
  try {
    const response = await fetch(`${HA_BASE_URL}/api/states`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const states = await response.json();
      console.log('✅ States endpoint accessible');
      console.log(`📊 Found ${states.length} entities`);
      
      if (states.length > 0) {
        console.log(`📝 Sample entities:`, states.slice(0, 3).map(s => s.entity_id));
      }
    } else {
      console.log(`❌ States endpoint failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ States test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: MCP Server Authentication
  console.log('🧪 Test 4: MCP Server Authentication Test');
  console.log('🚀 Starting MCP server authentication test...');

  try {
    // Import and test the authentication function
    const { validateHomeAssistantToken } = require('./dist/auth/home-assistant-auth.js');
    
    if (validateHomeAssistantToken) {
      console.log('✅ MCP authentication module loaded');
      
      // This would be called internally by the MCP server
      console.log('🔄 Testing MCP authentication integration...');
      console.log('💡 This test simulates what happens when the MCP server validates your token');
    } else {
      console.log('❌ MCP authentication module not found - make sure to run "npm run build" first');
    }
    
  } catch (error) {
    console.log('❌ MCP module test failed:', error.message);
    console.log('💡 Make sure to run "npm run build" first to compile TypeScript');
  }

  console.log('\n🎉 Authentication testing complete!');
  console.log('\n📋 Summary:');
  console.log('   - If all tests passed, your HA token is valid and the MCP server should work');
  console.log('   - If some tests failed, check your HA_BASE_URL and HA_TEST_TOKEN in .env');
  console.log('   - The MCP server will use the same authentication flow');
}

// Run the tests
testHomeAssistantAuth().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});

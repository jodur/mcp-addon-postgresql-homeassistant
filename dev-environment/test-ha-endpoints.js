/**
 * Test script to try different Home Assistant API endpoints to get user information
 */

require('dotenv').config();

async function testHAUserEndpoints() {
  console.log('🔍 Testing Home Assistant User Information Endpoints');
  console.log('=' .repeat(60));
  
  const token = process.env.HA_TEST_TOKEN;
  const haBaseUrl = process.env.HA_BASE_URL;
  
  if (!token || !haBaseUrl) {
    console.error('❌ Missing HA_TEST_TOKEN or HA_BASE_URL in environment');
    return;
  }
  
  console.log('🔑 Token (first 20 chars):', token.substring(0, 20) + '...');
  console.log('📡 Home Assistant URL:', haBaseUrl);
  console.log('');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test different endpoints
  const endpoints = [
    '/api/auth/check',
    '/api/auth',
    '/api/auth/current_user',
    '/api/config',
    '/api/config/auth',
    '/api/config/auth/providers',
    '/api/user/info',
    '/api/user',
    '/api/states/person'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🧪 Testing: ${endpoint}`);
      const response = await fetch(`${haBaseUrl}${endpoint}`, {
        method: 'GET',
        headers: headers
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success! Data:`, JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Also test the config endpoint which often contains user info
  console.log('🔧 Testing config endpoint for user context...');
  try {
    const configResponse = await fetch(`${haBaseUrl}/api/config`, {
      method: 'GET',
      headers: headers
    });
    
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('📋 Config data keys:', Object.keys(configData));
      
      // Look for user-related fields
      if (configData.user) {
        console.log('👤 User data found in config:', configData.user);
      }
      if (configData.auth) {
        console.log('🔐 Auth data found in config:', configData.auth);
      }
    }
  } catch (error) {
    console.log('❌ Config request failed:', error.message);
  }
}

// Run the test
testHAUserEndpoints().catch(console.error);

/**
 * Test script to display current user information from Home Assistant token
 */

require('dotenv').config();
const { validateHomeAssistantToken } = require('./dist/auth/home-assistant-auth.js');

async function displayUserInfo() {
  console.log('🔍 Displaying User Information from Home Assistant Token');
  console.log('=' .repeat(60));
  
  const token = process.env.HA_TEST_TOKEN;
  
  if (!token) {
    console.error('❌ No HA_TEST_TOKEN found in environment variables');
    console.log('💡 Make sure HA_TEST_TOKEN is set in your .env file');
    return;
  }
  
  console.log('🔑 Token (first 20 chars):', token.substring(0, 20) + '...');
  console.log('📡 Home Assistant URL:', process.env.HA_BASE_URL);
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('');
  
  try {
    console.log('🚀 Validating token with Home Assistant...');
    const userContext = await validateHomeAssistantToken(token);
    
    if (userContext) {
      console.log('✅ Authentication successful!');
      console.log('');
      console.log('👤 User Information:');
      console.log('   User ID:', userContext.userId);
      console.log('   Username:', userContext.username);
      console.log('   Is Admin:', userContext.isAdmin);
      console.log('   Permissions:', userContext.permissions.join(', '));
      console.log('');
      
      // Check access control
      console.log('🔐 Access Control Status:');
      const enableWriteOps = process.env.ENABLE_WRITE_OPERATIONS === 'true';
      
      console.log('   Authentication Model: Service Token (MCP)');
      console.log('   Write Operations Enabled:', enableWriteOps);
      
      // For MCP servers, access is token-based, not user-based
      console.log('   Service Has Write Access:', enableWriteOps);
      console.log('   Service Has Admin Access:', userContext.isAdmin || userContext.permissions.includes('admin'));
      
    } else {
      console.log('❌ Authentication failed');
      console.log('💡 Check your HA_TEST_TOKEN and HA_BASE_URL settings');
    }
    
  } catch (error) {
    console.error('❌ Error during authentication:', error.message);
  }
}

// Run the test
displayUserInfo().catch(console.error);

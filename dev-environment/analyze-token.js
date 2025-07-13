/**
 * Decode JWT token to extract user information
 */

require('dotenv').config();

function decodeJWT(token) {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode the header and payload (base64url encoded)
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    return { header, payload };
  } catch (error) {
    throw new Error(`JWT decode error: ${error.message}`);
  }
}

async function analyzeToken() {
  console.log('🔍 Analyzing Home Assistant JWT Token');
  console.log('=' .repeat(50));
  
  const token = process.env.HA_TEST_TOKEN;
  
  if (!token) {
    console.error('❌ No HA_TEST_TOKEN found in environment');
    return;
  }
  
  try {
    const { header, payload } = decodeJWT(token);
    
    console.log('📋 JWT Header:');
    console.log(JSON.stringify(header, null, 2));
    console.log('');
    
    console.log('📋 JWT Payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');
    
    // Extract user information from payload
    console.log('👤 User Information from Token:');
    console.log('   Token ID (iss):', payload.iss);
    console.log('   Issued At:', new Date(payload.iat * 1000).toISOString());
    console.log('   Expires At:', new Date(payload.exp * 1000).toISOString());
    console.log('   Subject:', payload.sub || 'Not specified');
    console.log('   Audience:', payload.aud || 'Not specified');
    console.log('');
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < now;
    console.log('⏰ Token Status:');
    console.log('   Current Time:', new Date().toISOString());
    console.log('   Is Expired:', isExpired);
    console.log('   Valid for:', Math.floor((payload.exp - now) / 86400), 'days');
    
  } catch (error) {
    console.error('❌ Token analysis failed:', error.message);
  }
}

// Run the analysis
analyzeToken().catch(console.error);

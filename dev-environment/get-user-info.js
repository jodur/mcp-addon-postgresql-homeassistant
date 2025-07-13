/**
 * Try to get user information using the user ID from the token
 */

require('dotenv').config();

function decodeJWT(token) {
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  return payload;
}

async function getUserInfoFromToken() {
  console.log('🔍 Getting User Information from Token');
  console.log('=' .repeat(50));
  
  const token = process.env.HA_TEST_TOKEN;
  const haBaseUrl = process.env.HA_BASE_URL;
  
  if (!token || !haBaseUrl) {
    console.error('❌ Missing HA_TEST_TOKEN or HA_BASE_URL in environment');
    return;
  }
  
  try {
    const payload = decodeJWT(token);
    const userId = payload.iss;
    
    console.log('🔑 User ID from token:', userId);
    console.log('');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Try different approaches to get user info
    const userEndpoints = [
      `/api/user/${userId}`,
      `/api/users/${userId}`,
      `/api/auth/user/${userId}`,
      `/api/auth/users/${userId}`,
      `/api/config/user`,
      `/api/config/users`,
      `/api/config/auth/user`,
      `/api/auth/token`,
      `/api/auth/token/info`,
      `/api/auth/me`,
      `/api/me`,
      `/api/user/current`,
      `/api/users/current`,
      `/api/profile`
    ];
    
    console.log('🧪 Testing user-related endpoints...');
    
    for (const endpoint of userEndpoints) {
      try {
        const response = await fetch(`${haBaseUrl}${endpoint}`, {
          method: 'GET',
          headers: headers
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ SUCCESS: ${endpoint}`);
          console.log('📋 Response:', JSON.stringify(data, null, 2));
          console.log('');
          
          // If we found user data, try to extract meaningful information
          if (data && typeof data === 'object') {
            const userInfo = extractUserInfo(data);
            if (userInfo) {
              console.log('👤 Extracted User Info:', userInfo);
              return userInfo;
            }
          }
        } else {
          console.log(`❌ ${endpoint}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
    
    console.log('');
    console.log('🔄 Trying alternative approach - checking person entities...');
    
    // Try to get person entities which might contain user information
    try {
      const statesResponse = await fetch(`${haBaseUrl}/api/states`, {
        method: 'GET',
        headers: headers
      });
      
      if (statesResponse.ok) {
        const states = await statesResponse.json();
        const personEntities = states.filter(s => s.entity_id.startsWith('person.'));
        
        if (personEntities.length > 0) {
          console.log('👥 Found person entities:');
          personEntities.forEach(person => {
            console.log(`   - ${person.entity_id}: ${person.attributes.friendly_name || person.attributes.name}`);
            console.log(`     User ID: ${person.attributes.user_id || 'N/A'}`);
          });
          
          // Try to find the person entity that matches our user ID
          const matchingPerson = personEntities.find(p => p.attributes.user_id === userId);
          if (matchingPerson) {
            console.log('✅ Found matching person entity:');
            console.log('👤 User Information:');
            console.log('   User ID:', userId);
            console.log('   Name:', matchingPerson.attributes.friendly_name || matchingPerson.attributes.name);
            console.log('   Entity ID:', matchingPerson.entity_id);
            
            return {
              userId: userId,
              username: matchingPerson.attributes.friendly_name || matchingPerson.attributes.name || 'homeassistant',
              entityId: matchingPerson.entity_id,
              isAdmin: true, // Default to admin for long-lived tokens
              permissions: ['read', 'write', 'admin']
            };
          }
        }
      }
    } catch (error) {
      console.log('❌ Person entities check failed:', error.message);
    }
    
    console.log('');
    console.log('💡 Using token-based user info as fallback...');
    return {
      userId: userId,
      username: 'homeassistant',
      isAdmin: true,
      permissions: ['read', 'write', 'admin']
    };
    
  } catch (error) {
    console.error('❌ User info extraction failed:', error.message);
    return null;
  }
}

function extractUserInfo(data) {
  // Try to extract user information from various response formats
  if (data.user_id || data.id) {
    return {
      userId: data.user_id || data.id,
      username: data.name || data.username || data.friendly_name || 'homeassistant',
      isAdmin: data.is_admin || data.admin || true,
      permissions: data.permissions || ['read', 'write']
    };
  }
  return null;
}

// Run the test
getUserInfoFromToken().then(result => {
  if (result) {
    console.log('');
    console.log('🎉 Final User Information:');
    console.log('   User ID:', result.userId);
    console.log('   Username:', result.username);
    console.log('   Is Admin:', result.isAdmin);
    console.log('   Permissions:', result.permissions.join(', '));
  } else {
    console.log('❌ Could not extract user information');
  }
}).catch(console.error);

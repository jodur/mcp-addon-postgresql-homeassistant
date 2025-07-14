import { Request, Response, NextFunction } from 'express';
import { UserContext } from '../types';

// Extend Express Request to include service context
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

/**
 * Simple Home Assistant authentication middleware
 * For add-on context, we'll use a more direct approach
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const isDebugMode = process.env.LOG_LEVEL === 'debug';
  
  if (isDebugMode) {
    console.log('🔐 Starting authentication process...');
  }
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isDebugMode) {
        console.log('❌ Authentication failed: Missing or invalid authorization header');
      }
      res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Handle potential double Bearer prefix from gateway
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

    if (isDebugMode) {
      console.log(`🔍 Raw token: ${token.substring(0, 20)}...`);
      console.log(`🧹 Clean token: ${cleanToken.substring(0, 20)}...`);
      console.log(`🔧 Double Bearer detected: ${token.startsWith('Bearer ') ? 'YES' : 'NO'}`);
    }

    if (!cleanToken) {
      if (isDebugMode) {
        console.log('❌ Authentication failed: Empty token');
      }
      res.status(401).json({
        success: false,
        error: 'Token is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate token with Home Assistant API
    const userContext = await validateHomeAssistantToken(cleanToken);

    if (!userContext) {
      if (isDebugMode) {
        console.log('❌ Authentication failed: Invalid token');
      }
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Attach user context to request
    req.user = userContext;
    
    if (isDebugMode) {
      console.log('✅ Authentication successful');
      console.log(`👤 User: ${userContext.username} (${userContext.userId})`);
      console.log(`🔓 Permissions: ${userContext.permissions.join(', ')}`);
    }
    
    next();
  } catch (error) {
    if (isDebugMode) {
      console.error('🔴 Authentication error:', error);
    }
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Simplified Home Assistant token validation
 */
export async function validateHomeAssistantToken(token: string): Promise<UserContext | null> {
  const isDebugMode = process.env.LOG_LEVEL === 'debug';
  
  if (isDebugMode) {
    console.log('🏠 === Home Assistant Token Validation ===');
  }
  
  try {
    const haBaseUrl = process.env.HA_BASE_URL || 'http://supervisor/core';
    
    if (isDebugMode) {
      console.log(`📡 HA Base URL: ${haBaseUrl}`);
      console.log(`🔑 Token: ${token.substring(0, 10)}...`);
      console.log(`📏 Token length: ${token.length}`);
      console.log(`🔍 Token pattern: ${/^[a-zA-Z0-9._-]+$/.test(token) ? 'Valid format' : 'Invalid format'}`);
    }
    
    // SECURITY: Must validate token against Home Assistant API
    // Format validation alone is NOT sufficient for security
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Method 1: Try Home Assistant config endpoint (most permissive)
      if (isDebugMode) {
        console.log('🔐 Attempting Home Assistant API validation...');
      }
      
      const configResponse = await fetch(`${haBaseUrl}/api/config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (isDebugMode) {
        console.log(`📈 Config API response: ${configResponse.status} ${configResponse.statusText}`);
      }

      if (configResponse.ok) {
        const configData = await configResponse.json() as any;
        
        if (isDebugMode) {
          console.log(`✅ Home Assistant API validation successful`);
          console.log(`🏠 HA Version: ${configData.version || 'Unknown'}`);
        }
        
        return {
          userId: 'homeassistant-service',
          username: 'homeassistant',
          isAdmin: true,
          permissions: ['read', 'write', 'admin']
        };
      }

      // Method 2: Try states endpoint as fallback
      if (isDebugMode) {
        console.log('🔄 Config API failed, trying states API...');
      }
      
      const statesController = new AbortController();
      const statesTimeoutId = setTimeout(() => statesController.abort(), 5000);
      
      const statesResponse = await fetch(`${haBaseUrl}/api/states`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: statesController.signal
      });

      clearTimeout(statesTimeoutId);
      
      if (isDebugMode) {
        console.log(`📈 States API response: ${statesResponse.status} ${statesResponse.statusText}`);
      }

      if (statesResponse.ok) {
        const states = await statesResponse.json() as any[];
        
        if (isDebugMode) {
          console.log(`✅ States API validation successful`);
          console.log(`📊 Found ${states.length} entities`);
        }
        
        return {
          userId: 'homeassistant-service',
          username: 'homeassistant',
          isAdmin: true,
          permissions: ['read', 'write', 'admin']
        };
      }

      // Method 3: Try auth endpoint
      if (isDebugMode) {
        console.log('� States API failed, trying auth endpoint...');
      }
      
      const authController = new AbortController();
      const authTimeoutId = setTimeout(() => authController.abort(), 5000);
      
      const authResponse = await fetch(`${haBaseUrl}/api/auth/check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: authController.signal
      });

      clearTimeout(authTimeoutId);
      
      if (isDebugMode) {
        console.log(`📈 Auth API response: ${authResponse.status} ${authResponse.statusText}`);
      }

      if (authResponse.ok) {
        const authData = await authResponse.json() as any;
        
        if (isDebugMode) {
          console.log(`✅ Auth API validation successful`);
        }
        
        return {
          userId: authData?.id || authData?.user_id || 'homeassistant-service',
          username: authData?.name || authData?.username || 'homeassistant',
          isAdmin: authData?.is_admin || authData?.admin || true,
          permissions: authData?.permissions || ['read', 'write', 'admin']
        };
      }

      if (isDebugMode) {
        console.log('❌ All Home Assistant API validation methods failed');
      }
      
      return null;
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (isDebugMode) {
        console.error('🔴 Home Assistant API validation error:', fetchError);
      }
      
      return null;
    }
  } catch (error) {
    if (isDebugMode) {
      console.error('🔴 Token validation error:', error);
    }
    return null;
  } finally {
    if (isDebugMode) {
      console.log('=========================================');
    }
  }
}

/**
 * Check if service has permission for write operations
 */
export function hasWritePermission(user: UserContext): boolean {
  const enableWriteOperations = process.env.ENABLE_WRITE_OPERATIONS === 'true';
  
  if (!enableWriteOperations) {
    return false;
  }
  
  return true;
}

/**
 * Check if service has admin permissions
 */
export function hasAdminPermission(user: UserContext): boolean {
  return user.isAdmin || user.permissions.includes('admin');
}

/**
 * Get service context from request
 */
export function getUserContext(req: Request): UserContext | null {
  return req.user || null;
}

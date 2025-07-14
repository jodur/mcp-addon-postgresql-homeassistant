import { Request, Response, NextFunction } from 'express';
import { UserContext } from '../types';

// Extend Express Request to include service context
declare global {
  namespace Express {
    interface Request {
      user?: UserContext; // Note: 'user' name kept for compatibility, but represents service context
    }
  }
}

/**
 * Home Assistant authentication middleware for MCP servers
 * Validates the Bearer token against Home Assistant's API
 * Note: In MCP context, this validates the calling service, not individual users
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

    if (!token) {
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
    const userContext = await validateHomeAssistantToken(token);

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
 * Validate Home Assistant token by calling the auth endpoint
 */
export async function validateHomeAssistantToken(token: string): Promise<UserContext | null> {
  const isDebugMode = process.env.LOG_LEVEL === 'debug';
  
  if (isDebugMode) {
    console.log('🏠 === Home Assistant Token Validation ===');
  }
  
  try {
    // Get Home Assistant base URL from environment
    const haBaseUrl = process.env.HA_BASE_URL || 'http://supervisor/core';
    
    if (isDebugMode) {
      console.log(` HA Base URL: ${haBaseUrl}`);
      console.log(`🔑 Token: ${token.substring(0, 10)}...`);
      console.log(`🚀 Attempting to connect to Home Assistant API...`);
    }
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Try to validate token using the states API
      if (isDebugMode) {
        console.log('📊 Trying states API endpoint...');
      }
      
      const statesResponse = await fetch(`${haBaseUrl}/api/states`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (isDebugMode) {
        console.log(`📈 States API response: ${statesResponse.status} ${statesResponse.statusText}`);
      }

      if (statesResponse.ok) {
        const states = await statesResponse.json() as any[];
        
        if (isDebugMode) {
          console.log(`✅ Home Assistant API accessible with ${states.length} entities`);
        }
        
        // For long-lived tokens, we just need to verify the token works
        return {
          userId: 'homeassistant-service',
          username: 'homeassistant',
          isAdmin: true,
          permissions: ['read', 'write', 'admin']
        };
      }
      
      // If states API fails, try auth endpoint
      if (isDebugMode) {
        console.log('🔄 States API failed, trying auth endpoint...');
      }
      
      const authController = new AbortController();
      const authTimeoutId = setTimeout(() => authController.abort(), 5000);
      
      const response = await fetch(`${haBaseUrl}/api/auth/check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: authController.signal
      });

      clearTimeout(authTimeoutId);
      
      if (isDebugMode) {
        console.log(`📊 HA Auth API Response: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        if (isDebugMode) {
          console.log(`⚠️  Home Assistant auth API failed (${response.status})`);
        }
        return null;
      }

      const authData = await response.json() as any;
      
      if (isDebugMode) {
        console.log(`✅ Home Assistant authentication successful`);
        console.log(`👤 User data:`, authData);
      }
      
      return {
        userId: authData?.id || authData?.user_id || 'homeassistant-service',
        username: authData?.name || authData?.username || 'homeassistant',
        isAdmin: authData?.is_admin || authData?.admin || true,
        permissions: authData?.permissions || ['read', 'write', 'admin']
      };
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    if (isDebugMode) {
      console.error('🔴 Token validation error:', error);
      
      if (error instanceof Error) {
        console.log('📝 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 200)
        });
      }
    }
    
    // SECURITY FIX: Do not fall back to weak validation
    // If Home Assistant API is unreachable, authentication should fail
    console.error('🔒 Home Assistant API unreachable - authentication failed for security');
    return null;
  } finally {
    if (isDebugMode) {
      console.log('=========================================');
    }
  }
}

/**
 * Check if service has permission for write operations
 * For MCP servers with long-lived tokens, this is based on token validation and configuration
 */
export function hasWritePermission(user: UserContext): boolean {
  const enableWriteOperations = process.env.ENABLE_WRITE_OPERATIONS === 'true';
  
  if (!enableWriteOperations) {
    return false;
  }
  
  // For long-lived tokens in MCP context, if the token is valid and write ops are enabled,
  // the service has write permissions
  return true;
}

/**
 * Check if service has admin permissions
 * For MCP servers with long-lived tokens, this is based on token validation
 */
export function hasAdminPermission(user: UserContext): boolean {
  // Long-lived tokens typically have admin privileges by default
  return user.isAdmin || user.permissions.includes('admin');
}

/**
 * Get service context from request
 * Note: Called 'getUserContext' for compatibility, but returns service context in MCP
 */
export function getUserContext(req: Request): UserContext | null {
  return req.user || null;
}

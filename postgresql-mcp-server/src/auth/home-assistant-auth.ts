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
 * Validates token with Home Assistant API
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const isDebugMode = process.env.LOG_LEVEL === 'debug';
  
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
    const tokenIsValid = await validateHomeAssistantToken(token);

    if (!tokenIsValid) {
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
    req.user = {
      userId: 'homeassistant-service',
      username: 'homeassistant',
      isAdmin: true,
      permissions: ['read', 'write', 'admin']
    };
    
    if (isDebugMode) {
      console.log('✅ Authentication successful');
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
 * Makes a single API call to validate the token
 */
export async function validateHomeAssistantToken(token: string): Promise<boolean> {
  const isDebugMode = process.env.LOG_LEVEL === 'debug';
  
  try {
    let haBaseUrl = process.env.HA_BASE_URL || 'http://homeassistant:8123';
    
    // Remove trailing /api if present to avoid double /api/api/config
    if (haBaseUrl.endsWith('/api')) {
      haBaseUrl = haBaseUrl.slice(0, -4);
    }
    
    // Remove trailing slash
    if (haBaseUrl.endsWith('/')) {
      haBaseUrl = haBaseUrl.slice(0, -1);
    }
    
    if (isDebugMode) {
      console.log(`🔑 Validating token with Home Assistant API: ${haBaseUrl}`);
    }
    
    // Make a simple API call to validate the token
    const response = await fetch(`${haBaseUrl}/api/config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const isValid = response.ok;
    
    if (isDebugMode) {
      console.log(`📈 Token validation result: ${isValid ? 'VALID' : 'INVALID'} (${response.status})`);
      if (!isValid) {
        console.log(`🔍 Full URL attempted: ${haBaseUrl}/api/config`);
      }
    }

    return isValid;
    
  } catch (error) {
    if (isDebugMode) {
      console.error('🔴 Token validation error:', error);
    }
    return false;
  }
}

/**
 * Check if user has permission for write operations
 */
export function hasWritePermission(user: UserContext): boolean {
  return process.env.ENABLE_WRITE_OPERATIONS === 'true';
}

/**
 * Check if user has admin permissions
 */
export function hasAdminPermission(user: UserContext): boolean {
  return user.isAdmin;
}

/**
 * Get user context from request
 */
export function getUserContext(req: Request): UserContext | null {
  return req.user || null;
}

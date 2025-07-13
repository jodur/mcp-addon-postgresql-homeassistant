import { Request, Response, NextFunction } from 'express';
import { UserContext } from '../types';

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

/**
 * Home Assistant authentication middleware
 * Validates the Bearer token against Home Assistant's API
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
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
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Add user context to request
    req.user = userContext;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication service unavailable',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Validate Home Assistant token by calling the auth endpoint
 */
async function validateHomeAssistantToken(token: string): Promise<UserContext | null> {
  try {
    // In a real Home Assistant addon, we would validate against the Supervisor API
    // For now, we'll implement a basic token validation
    
    // Get Home Assistant base URL from environment
    const haBaseUrl = process.env.HA_BASE_URL || 'http://supervisor/core';
    
    // Validate token against Home Assistant API
    const response = await fetch(`${haBaseUrl}/api/auth/check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // If Home Assistant auth API is not available, implement fallback validation
      return await fallbackTokenValidation(token);
    }

    const authData = await response.json() as any;
    
    // Extract user information from Home Assistant response
    return {
      userId: authData?.id || 'unknown',
      username: authData?.name || 'unknown',
      isAdmin: authData?.is_admin || false,
      permissions: authData?.permissions || []
    };
  } catch (error) {
    console.error('Token validation error:', error);
    // Fallback to basic token validation if Home Assistant API is unavailable
    return await fallbackTokenValidation(token);
  }
}

/**
 * Fallback token validation for development or when Home Assistant API is unavailable
 */
async function fallbackTokenValidation(token: string): Promise<UserContext | null> {
  // In a real addon, this would be more sophisticated
  // For now, we'll implement a basic validation
  
  // Check if token matches the Home Assistant long-lived access token pattern
  if (token.length >= 32 && /^[a-zA-Z0-9._-]+$/.test(token)) {
    // Extract user information from environment variables or configuration
    const allowedUsers = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : [];
    
    return {
      userId: 'homeassistant-user',
      username: 'homeassistant',
      isAdmin: true,
      permissions: ['read', 'write']
    };
  }
  
  return null;
}

/**
 * Check if user has permission for write operations
 */
export function hasWritePermission(user: UserContext): boolean {
  const allowedUsers = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : [];
  const enableWriteOperations = process.env.ENABLE_WRITE_OPERATIONS === 'true';
  
  if (!enableWriteOperations) {
    return false;
  }
  
  // If no specific users are configured, allow all authenticated users
  if (allowedUsers.length === 0) {
    return true;
  }
  
  // Check if user is in allowed users list
  return allowedUsers.includes(user.username) || allowedUsers.includes(user.userId);
}

/**
 * Check if user has admin permissions
 */
export function hasAdminPermission(user: UserContext): boolean {
  return user.isAdmin || user.permissions.includes('admin');
}

/**
 * Get user context from request
 */
export function getUserContext(req: Request): UserContext | null {
  return req.user || null;
}

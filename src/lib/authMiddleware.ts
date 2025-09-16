import { NextRequest } from 'next/server';
import { verifyToken, isTokenBlacklisted, extractTokenFromHeader, isTokenRevokedForUser } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantSubdomain?: string;
  };
}

export interface AuthResult {
  success: boolean;
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantSubdomain?: string;
  };
  error?: string;
  errorCode?: string;
  statusCode?: number;
}

/**
 * Middleware function to authenticate JWT tokens
 */
export async function authenticateToken(request: NextRequest): Promise<AuthResult> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return {
        success: false,
        error: 'No token provided',
        errorCode: 'NO_TOKEN',
        statusCode: 401
      };
    }

    // Verify the token
    const payload = verifyToken(token);
    if (!payload) {
      return {
        success: false,
        error: 'Invalid or expired token',
        errorCode: 'INVALID_TOKEN',
        statusCode: 401
      };
    }

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return {
        success: false,
        error: 'Token has been revoked',
        errorCode: 'TOKEN_BLACKLISTED',
        statusCode: 401
      };
    }

    // Check if token was revoked due to new login (single active session)
    const isRevokedForUser = await isTokenRevokedForUser(token, payload.userId);
    if (isRevokedForUser) {
      return {
        success: false,
        error: 'Token has been revoked due to new login on another device',
        errorCode: 'TOKEN_REVOKED_NEW_LOGIN',
        statusCode: 401
      };
    }

    // Enforce tenant scoping if needed
    const requestSubdomain = (request.headers.get('x-tenant-subdomain') || '').trim().toLowerCase();
    if (requestSubdomain && payload.tenantSubdomain && requestSubdomain !== payload.tenantSubdomain) {
      return {
        success: false,
        error: 'Token does not belong to this tenant',
        errorCode: 'TENANT_MISMATCH',
        statusCode: 401
      };
    }

    return {
      success: true,
      user: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        tenantSubdomain: payload.tenantSubdomain
      }
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      errorCode: 'AUTH_ERROR',
      statusCode: 500
    };
  }
}

/**
 * Helper function to create unauthorized response
 */
export function createUnauthorizedResponse(error: string, errorCode?: string, statusCode: number = 401) {
  return new Response(JSON.stringify({ 
    error, 
    errorCode 
  }), { 
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Helper function to create authenticated response
 */
export function createAuthenticatedResponse(data: any, statusCode: number = 200) {
  return new Response(JSON.stringify(data), { 
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

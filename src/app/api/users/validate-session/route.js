import { db } from '@/db/client';
import { users, tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken, isTokenBlacklisted, extractTokenFromHeader, isTokenRevokedForUser } from '@/lib/jwt';

export async function POST(request) {
  try {
    // Extract token from Authorization header or request body
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = extractTokenFromHeader(authHeader);
    const { token: tokenFromBody } = await request.json();
    
    const token = tokenFromHeader || tokenFromBody;
    const requestSubdomain = (request.headers.get('x-tenant-subdomain') || '').trim().toLowerCase();
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400 });
    }

    // Verify the token
    const payload = verifyToken(token);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token', errorCode: 'INVALID_TOKEN' }), { status: 401 });
    }

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return new Response(JSON.stringify({ error: 'Token has been revoked', errorCode: 'TOKEN_BLACKLISTED' }), { status: 401 });
    }

    // Check if token was revoked due to new login (single active session)
    const isRevokedForUser = await isTokenRevokedForUser(token, payload.userId);
    if (isRevokedForUser) {
      return new Response(JSON.stringify({ 
        error: 'Token has been revoked due to new login on another device',
        errorCode: 'TOKEN_REVOKED_NEW_LOGIN'
      }), { status: 401 });
    }

    // Enforce tenant scoping: when a subdomain is present on the request,
    // it must match the token's tenantSubdomain
    if (requestSubdomain && payload.tenantSubdomain && requestSubdomain !== payload.tenantSubdomain) {
      return new Response(JSON.stringify({ error: 'Token does not belong to this tenant', errorCode: 'TENANT_MISMATCH' }), { status: 401 });
    }

    // Find the user
    const userId = parseInt(payload.userId, 10);
    if (isNaN(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid user id', errorCode: 'INVALID_USER_ID' }), { status: 401 });
    }
    
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const user = userResult[0];
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Get tenant subdomain if user has tenantId
    let tenantSubdomain = null;
    if (user.tenantId) {
      const tenantResult = await db
        .select({ subdomain: tenants.subdomain })
        .from(tenants)
        .where(eq(tenants.id, user.tenantId))
        .limit(1);
      if (tenantResult[0]) {
        tenantSubdomain = tenantResult[0].subdomain;
      }
    }

    // Return user data without password
    const userData = {
      id: user.id,
      email: user.email,
      code: user.code,
      name: user.name,
      role: user.role || 'sales',
      target: user.target,
      tenantId: user.tenantId,
      tenantSubdomain: tenantSubdomain,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      lastLogout: user.lastLogout
    };

    return new Response(JSON.stringify({ 
      ...userData, 
      token 
    }), { status: 200 });

  } catch (error) {
    console.error('Token validation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

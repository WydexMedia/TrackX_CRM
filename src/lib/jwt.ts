import jwt from 'jsonwebtoken';
import { db } from '@/db/client';
import { jwtBlacklist, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '24h'; // Token expires in 24 hours

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantSubdomain?: string;
  iat?: number;
  exp?: number;
}

export interface JWTBlacklist {
  token: string;
  userId: string;
  revokedAt: Date;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const blacklistedToken = await db
      .select()
      .from(jwtBlacklist)
      .where(eq(jwtBlacklist.token, token))
      .limit(1);
    return blacklistedToken.length > 0;
  } catch (error) {
    console.error('Error checking blacklist:', error);
    return false;
  }
}

/**
 * Add a token to the blacklist
 */
export async function blacklistToken(token: string, userId: string): Promise<void> {
  try {
    await db.insert(jwtBlacklist).values({
      token,
      userId,
      revokedAt: new Date(),
    }).onConflictDoNothing();
  } catch (error) {
    console.error('Error blacklisting token:', error);
    throw error;
  }
}

/**
 * Revoke all tokens for a user (for single active session)
 * We'll store a revocation timestamp for the user
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  try {
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      console.error('revokeAllUserTokens: invalid userId provided', userId);
      return;
    }
    
    // Update the user's lastTokenRevocation timestamp
    await db
      .update(users)
      .set({ lastTokenRevocation: new Date() })
      .where(eq(users.id, userIdNum));
  } catch (error) {
    console.error('Error revoking user tokens:', error);
    throw error;
  }
}

/**
 * Check if a token was issued before the user's last revocation
 */
export async function isTokenRevokedForUser(token: string, userId: string): Promise<boolean> {
  try {
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return true;
    }
    
    // Get the user's last token revocation time
    const userResult = await db
      .select({ lastTokenRevocation: users.lastTokenRevocation })
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);
    
    const user = userResult[0];
    if (!user || !user.lastTokenRevocation) {
      return false; // No revocation timestamp means token is valid
    }
    
    // Decode the token to get its issued time
    const payload = verifyToken(token);
    if (!payload || !payload.iat) {
      return true; // Invalid token
    }

    // Compare using whole seconds to avoid ms skew in same-second operations
    const tokenIssuedAtSec = Math.floor(payload.iat);
    const revocationSec = Math.floor(new Date(user.lastTokenRevocation).getTime() / 1000);

    // A token is revoked only if it was issued strictly BEFORE the revocation second
    return tokenIssuedAtSec < revocationSec;
  } catch (error) {
    console.error('Error checking token revocation:', error);
    return true; // Err on the side of caution
  }
}

/**
 * Clean up expired tokens from blacklist (can be called periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    // Remove tokens that are older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    await db
      .delete(jwtBlacklist)
      .where(eq(jwtBlacklist.revokedAt, sevenDaysAgo) as any); // Use SQL for date comparison
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    // Use raw SQL for date comparison
    try {
      const { sql } = require('drizzle-orm');
      await db.execute(
        sql`DELETE FROM jwt_blacklist WHERE revoked_at < NOW() - INTERVAL '7 days'`
      );
    } catch (sqlError) {
      console.error('Error with SQL cleanup:', sqlError);
    }
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

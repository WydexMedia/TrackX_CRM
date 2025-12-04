import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users, tenants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { authenticateToken, createUnauthorizedResponse } from '@/lib/authMiddleware';

export async function GET(request) {
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const identifier = searchParams.get('identifier') || code;
  const { tenantSubdomain, tenantId } = await getTenantContextFromRequest(request);
  
  if (!identifier) {
    return NextResponse.json({ 
      success: false, 
      error: "User identifier is required" 
    }, { status: 400 });
  }
  
  let user = null;
  const isEmail = /@/.test(identifier);
  
  if (tenantId) {
    if (isEmail) {
      const userResult = await db
        .select()
        .from(users)
        .where(and(
          eq(users.email, identifier),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      user = userResult[0];
    }
    if (!user) {
      const userResult = await db
        .select()
        .from(users)
        .where(and(
          eq(users.code, identifier),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);
      user = userResult[0];
    }
  } else {
    if (isEmail) {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, identifier))
        .limit(1);
      user = userResult[0];
    }
    if (!user) {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.code, identifier))
        .limit(1);
      user = userResult[0];
    }
  }
  
  if (!user) {
    return NextResponse.json({ 
      success: false, 
      error: "User not found" 
    }, { status: 404 });
  }
  
  // Return user data without password
  const { password, ...userWithoutPassword } = user;
  
  return NextResponse.json({ 
    success: true, 
    user: userWithoutPassword
  });
}

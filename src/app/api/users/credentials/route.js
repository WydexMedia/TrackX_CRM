import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { authenticateToken, createUnauthorizedResponse } from '@/lib/authMiddleware';

// Get all users with passwords (for team leader credentials view)
export async function GET(request) {
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

  const { tenantId } = await getTenantContextFromRequest(request);
  
  let allUsers;
  if (tenantId) {
    allUsers = await db
      .select()
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        ne(users.role, 'teamleader')
      ));
  } else {
    allUsers = await db
      .select()
      .from(users)
      .where(ne(users.role, 'teamleader'));
  }
  
  console.log('Users with passwords for credentials view:', allUsers.length);
  
  // Return users with passwords included
  return NextResponse.json(allUsers);
}

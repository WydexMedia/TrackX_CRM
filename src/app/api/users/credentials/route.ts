import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateRequest, createUnauthorizedResponse } from "@/lib/clerkAuth";
import { getTenantIdFromOrgSlug } from "@/lib/clerkOrganization";

/**
 * Get user credentials for team management
 * Since we're using Clerk invitations, passwords are set by users when they accept invitations
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.statusCode);
    }

    if (!authResult.email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Get tenantId from Clerk organization (primary method)
    let tenantId: number | null = null;
    
    if (authResult.orgSlug && authResult.orgId) {
      tenantId = await getTenantIdFromOrgSlug(
        authResult.orgSlug,
        authResult.orgId,
        authResult.orgSlug
      );
    }

    // Fallback: Get tenantId from current user's record
    if (!tenantId && authResult.email) {
      try {
        const currentUserResult = await db
          .select({ tenantId: users.tenantId })
          .from(users)
          .where(eq(users.email, authResult.email))
          .limit(1);
        
        if (currentUserResult.length > 0 && currentUserResult[0].tenantId) {
          tenantId = currentUserResult[0].tenantId;
        }
      } catch (error) {
        console.error('Error fetching current user tenantId:', error);
      }
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
    }

    // Get all users for this tenant
    const allUsers = await db
      .select({
        id: users.id,
        code: users.code,
        name: users.name,
        email: users.email,
        role: users.role,
        password: users.password, // May be empty for Clerk users
      })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    // Return user data with note about Clerk invitations
    const credentials = allUsers.map(user => ({
      _id: user.id.toString(),
      code: user.code || user.email,
      name: user.name,
      email: user.email,
      role: user.role,
      password: user.password || '', // Empty for Clerk users (they set it via invitation)
      hasClerkInvitation: !user.password, // If no password, they're using Clerk
    }));

    return NextResponse.json(credentials);
  } catch (error: any) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}


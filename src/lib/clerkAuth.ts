import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Clerk role to app role mapping
export const CLERK_TO_APP_ROLE: Record<string, string> = {
  "org:admin": "teamleader",
  "Admin": "teamleader",
  "admin": "teamleader",
  "org:member": "sales",
  "member": "sales",
  "org:salesexecutive": "sales", // All lowercase
  "org:salesExecutive": "sales",
  "salesExecutive": "sales",
  "salesexecutive": "sales",
};

export interface ClerkAuthResult {
  success: boolean;
  userId?: string;
  email?: string;
  orgId?: string;
  orgSlug?: string;
  orgRole?: string;      // Raw Clerk role (e.g., "org:admin")
  appRole?: string;       // Mapped app role (e.g., "teamleader")
  isAdmin?: boolean;      // Is user an org admin (teamleader)
  error?: string;
  statusCode?: number;
}

/**
 * Authenticate request using Clerk
 * Includes organization role information
 */
export async function authenticateRequest(request?: NextRequest | Request): Promise<ClerkAuthResult> {
  try {
    const authResult = await auth();
    
    if (!authResult || !authResult.userId) {
      return {
        success: false,
        error: 'Unauthorized',
        statusCode: 401
      };
    }

    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress;
    
    // Get organization role info
    const orgId = authResult.orgId || null;
    const orgSlug = authResult.orgSlug || null;
    const orgRole = authResult.orgRole || null;
    
    // Map Clerk role to app role
    const appRole = orgRole ? CLERK_TO_APP_ROLE[orgRole] || "sales" : null;
    const isAdmin = orgRole === "org:admin" || orgRole === "Admin" || orgRole === "admin";
    
    return {
      success: true,
      userId: authResult.userId,
      email,
      orgId: orgId || undefined,
      orgSlug: orgSlug || undefined,
      orgRole: orgRole || undefined,
      appRole: appRole || undefined,
      isAdmin
    };
  } catch (error) {
    console.error('Clerk authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      statusCode: 401
    };
  }
}

/**
 * Authenticate and verify user has required role
 */
export async function authenticateWithRole(
  request: NextRequest,
  requiredRoles: string[]
): Promise<ClerkAuthResult> {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success) {
    return authResult;
  }
  
  // Check if user has required role
  if (!authResult.appRole || !requiredRoles.includes(authResult.appRole)) {
    return {
      success: false,
      error: 'Forbidden - insufficient permissions',
      statusCode: 403,
      userId: authResult.userId,
      email: authResult.email,
      appRole: authResult.appRole
    };
  }
  
  return authResult;
}

/**
 * Verify user is an admin (teamleader)
 */
export async function authenticateAdmin(request: NextRequest): Promise<ClerkAuthResult> {
  return authenticateWithRole(request, ["teamleader"]);
}

/**
 * Helper function to create unauthorized response
 */
export function createUnauthorizedResponse(error: string = 'Unauthorized', statusCode: number = 401) {
  return NextResponse.json({ 
    error,
    errorCode: statusCode === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED'
  }, { 
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Get user's organization membership role
 */
export async function getOrganizationRole(userId: string, orgId: string): Promise<string | null> {
  try {
    const clerk = await clerkClient();
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const userMembership = memberships.data?.find(
      (m) => m.publicUserData?.userId === userId
    );

    return userMembership?.role || null;
  } catch (error) {
    console.error("Error getting organization role:", error);
    return null;
  }
}



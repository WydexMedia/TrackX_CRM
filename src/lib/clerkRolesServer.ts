import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Server-side Clerk role utilities
 * For use in API routes and server components
 */

// Clerk role to app role mapping
export const CLERK_TO_APP_ROLE: Record<string, string> = {
  "org:admin": "teamleader",
  "Admin": "teamleader",
  "admin": "teamleader",
  "org:member": "sales",
  "member": "sales",
  "org:salesexecutive": "sales", // All lowercase - correct format
  "org:salesExecutive": "sales",
  "salesExecutive": "sales",
  "salesexecutive": "sales",
};

export interface ServerRoleInfo {
  userId: string | null;
  email: string | null;
  clerkRole: string | null;
  appRole: string | null;
  organizationId: string | null;
  organizationSlug: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

/**
 * Get user's organization role from Clerk (server-side)
 */
export async function getServerClerkRole(): Promise<ServerRoleInfo> {
  try {
    const { userId, orgId, orgRole, orgSlug } = await auth();

    if (!userId) {
      return {
        userId: null,
        email: null,
        clerkRole: null,
        appRole: null,
        organizationId: null,
        organizationSlug: null,
        isAdmin: false,
        isAuthenticated: false,
      };
    }

    // Get user email
    const clerk = clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress || null;

    const appRole = orgRole ? CLERK_TO_APP_ROLE[orgRole] || "sales" : null;
    const isAdmin = orgRole === "org:admin" || orgRole === "admin";

    return {
      userId,
      email,
      clerkRole: orgRole || null,
      appRole,
      organizationId: orgId || null,
      organizationSlug: orgSlug || null,
      isAdmin,
      isAuthenticated: true,
    };
  } catch (error) {
    console.error("Error getting server Clerk role:", error);
    return {
      userId: null,
      email: null,
      clerkRole: null,
      appRole: null,
      organizationId: null,
      organizationSlug: null,
      isAdmin: false,
      isAuthenticated: false,
    };
  }
}

/**
 * Verify user has required role (server-side)
 */
export async function verifyRole(requiredRoles: string[]): Promise<{
  authorized: boolean;
  role: ServerRoleInfo;
}> {
  const role = await getServerClerkRole();

  if (!role.isAuthenticated) {
    return { authorized: false, role };
  }

  if (!role.appRole) {
    return { authorized: false, role };
  }

  const authorized = requiredRoles.includes(role.appRole);
  return { authorized, role };
}

/**
 * Verify user is an admin (teamleader)
 */
export async function verifyAdmin(): Promise<{
  authorized: boolean;
  role: ServerRoleInfo;
}> {
  return verifyRole(["teamleader"]);
}

/**
 * Get organization membership for a user
 */
export async function getUserOrganizationMembership(userId: string, orgId: string) {
  try {
    const clerk = clerkClient();
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const userMembership = memberships.data?.find(
      (m) => m.publicUserData?.userId === userId
    );

    return userMembership || null;
  } catch (error) {
    console.error("Error getting organization membership:", error);
    return null;
  }
}


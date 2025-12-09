"use client";

import { useOrganization, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * Role mapping between Clerk organization roles and application roles
 * 
 * Clerk Organization Roles → Application Roles:
 * - org:admin → teamleader (Team Leader dashboard)
 * - org:member / salesExecutive → sales (Junior Leader/Salesperson dashboard)
 * 
 * Note: In Clerk, roles are prefixed with "org:" by default
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

// App role to dashboard path mapping
export const ROLE_TO_DASHBOARD: Record<string, string> = {
  teamleader: "/team-leader",
  jl: "/junior-leader",
  sales: "/dashboard", // Salesperson uses /dashboard
};

export interface ClerkRoleInfo {
  clerkRole: string | null;      // Raw Clerk organization role
  appRole: string | null;         // Mapped application role (teamleader, jl, sales)
  organizationId: string | null;
  organizationSlug: string | null;
  organizationName: string | null;
  isAdmin: boolean;               // Is user an org admin (teamleader)
  isMember: boolean;              // Is user a regular member (salesperson)
  isLoading: boolean;
  dashboardPath: string;          // Path to redirect to based on role
}

/**
 * Hook to get the current user's Clerk organization role
 * Maps Clerk roles to application roles
 */
export function useClerkRole(): ClerkRoleInfo {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, membership, isLoaded: isOrgLoaded } = useOrganization();
  const [roleInfo, setRoleInfo] = useState<ClerkRoleInfo>({
    clerkRole: null,
    appRole: null,
    organizationId: null,
    organizationSlug: null,
    organizationName: null,
    isAdmin: false,
    isMember: false,
    isLoading: true,
    dashboardPath: "/onboarding",
  });

  useEffect(() => {
    if (!isUserLoaded || !isOrgLoaded) {
      return;
    }

    if (!user) {
      setRoleInfo({
        clerkRole: null,
        appRole: null,
        organizationId: null,
        organizationSlug: null,
        organizationName: null,
        isAdmin: false,
        isMember: false,
        isLoading: false,
        dashboardPath: "/login",
      });
      return;
    }

    if (!organization || !membership) {
      // User is logged in but doesn't have an organization
      setRoleInfo({
        clerkRole: null,
        appRole: null,
        organizationId: null,
        organizationSlug: null,
        organizationName: null,
        isAdmin: false,
        isMember: false,
        isLoading: false,
        dashboardPath: "/onboarding",
      });
      return;
    }

    // Get the user's role in the organization
    const clerkRole = membership.role;
    const appRole = CLERK_TO_APP_ROLE[clerkRole] || "sales";
    // Check if user is admin - support both "Admin" and "org:admin"
    const isAdmin = clerkRole === "org:admin" || clerkRole === "Admin" || clerkRole === "admin";
    const dashboardPath = ROLE_TO_DASHBOARD[appRole] || "/junior-leader";

    setRoleInfo({
      clerkRole,
      appRole,
      organizationId: organization.id,
      organizationSlug: organization.slug,
      organizationName: organization.name,
      isAdmin,
      isMember: !isAdmin,
      isLoading: false,
      dashboardPath,
    });
  }, [user, organization, membership, isUserLoaded, isOrgLoaded]);

  return roleInfo;
}

/**
 * Get dashboard path based on Clerk organization role
 */
export function getDashboardPathFromClerkRole(clerkRole: string | null): string {
  if (!clerkRole) return "/onboarding";
  
  const appRole = CLERK_TO_APP_ROLE[clerkRole] || "sales";
  return ROLE_TO_DASHBOARD[appRole] || "/junior-leader";
}

/**
 * Check if user has admin (teamleader) role
 */
export function isAdminRole(clerkRole: string | null): boolean {
  return clerkRole === "org:admin" || clerkRole === "Admin" || clerkRole === "admin";
}

/**
 * Map Clerk role to application role
 */
export function mapClerkRoleToAppRole(clerkRole: string | null): string {
  if (!clerkRole) return "sales";
  return CLERK_TO_APP_ROLE[clerkRole] || "sales";
}


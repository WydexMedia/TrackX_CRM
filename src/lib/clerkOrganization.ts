import { clerkClient } from "@clerk/nextjs/server";

/**
 * Create or update a Clerk organization that matches a database tenant
 * @param subdomain - The tenant subdomain (will be used as organization slug)
 * @param name - The organization/tenant name
 * @param userId - The Clerk user ID to add as a member
 */
export async function syncTenantToClerkOrganization(
  subdomain: string,
  name: string,
  userId: string
): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  try {
    const clerk = await clerkClient();
    
    // Try to find existing organization by slug
    let organization;
    try {
      const organizations = await clerk.organizations.getOrganizationList();
      
      // Filter by slug manually since getOrganizationList doesn't support slug filter
      if (organizations.data && organizations.data.length > 0) {
        organization = organizations.data.find((org: any) => org.slug === subdomain);
      }
    } catch (error) {
      // Organization doesn't exist, will create new one
      console.log(`Organization with slug "${subdomain}" not found, creating new one`);
    }

    if (organization) {
      // Organization exists - update it and ensure user is a member
      try {
        // Update organization name if needed
        if (organization.name !== name) {
          await clerk.organizations.updateOrganization(organization.id, {
            name: name,
          });
        }

        // Check if user is already a member
        const memberships = await clerk.organizations.getOrganizationMembershipList({
          organizationId: organization.id,
        });

        const isMember = memberships.data?.some(
          (membership: any) => membership.publicUserData?.userId === userId
        );

        if (!isMember) {
          // Add user to organization
          await clerk.organizations.createOrganizationMembership({
            organizationId: organization.id,
            userId: userId,
            role: "org:admin", // Team leader should be admin
          });
        }

        return {
          success: true,
          organizationId: organization.id,
        };
      } catch (error: any) {
        console.error("Error updating Clerk organization:", error);
        return {
          success: false,
          error: error?.message || "Failed to update Clerk organization",
        };
      }
    } else {
      // Create new organization
      try {
        const newOrganization = await clerk.organizations.createOrganization({
          name: name,
          slug: subdomain, // Use subdomain as slug
          createdBy: userId,
        });

        // User is automatically added as admin when they create the organization
        return {
          success: true,
          organizationId: newOrganization.id,
        };
      } catch (error: any) {
        console.error("Error creating Clerk organization:", error);
        return {
          success: false,
          error: error?.message || "Failed to create Clerk organization",
        };
      }
    }
  } catch (error: any) {
    console.error("Error syncing tenant to Clerk organization:", error);
    return {
      success: false,
      error: error?.message || "Failed to sync to Clerk organization",
    };
  }
}

/**
 * Get Clerk organization ID by subdomain/slug
 */
export async function getClerkOrganizationBySlug(
  slug: string
): Promise<string | null> {
  try {
    const clerk = await clerkClient();
    const organizations = await clerk.organizations.getOrganizationList();

    // Filter by slug manually since getOrganizationList doesn't support slug filter directly
    if (organizations.data && organizations.data.length > 0) {
      const org = organizations.data.find((org: any) => org.slug === slug);
      if (org) {
        return org.id;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting Clerk organization by slug:", error);
    return null;
  }
}

/**
 * Get tenant ID from Clerk organization slug
 * This links Clerk organizations to database tenants
 * If tenant doesn't exist, creates one with the org slug as subdomain
 */
export async function getTenantIdFromOrgSlug(
  orgSlug: string,
  orgId: string,
  orgName?: string
): Promise<number | null> {
  try {
    const { db } = await import("@/db/client");
    const { tenants } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    // First, try to find existing tenant by subdomain (which should match org slug)
    let tenantResult = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.subdomain, orgSlug))
      .limit(1);

    if (tenantResult.length > 0) {
      return tenantResult[0].id;
    }

    // Tenant doesn't exist - create it with the org slug as subdomain
    console.log(`Creating tenant for Clerk org slug: ${orgSlug}`);
    const newTenant = await db
      .insert(tenants)
      .values({
        subdomain: orgSlug,
        name: orgName || orgSlug,
        metadata: {
          clerkOrgId: orgId,
          clerkOrgSlug: orgSlug,
        },
      })
      .returning({ id: tenants.id });

    if (newTenant.length > 0) {
      console.log(`Created tenant with ID ${newTenant[0].id} for org slug ${orgSlug}`);
      return newTenant[0].id;
    }

    return null;
  } catch (error) {
    console.error("Error getting/creating tenant ID from org slug:", error);
    return null;
  }
}


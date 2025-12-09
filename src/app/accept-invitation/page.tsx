"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useOrganization } from "@clerk/nextjs";
import { getTenantUrl } from "@/lib/tenantUrl";
import { CLERK_TO_APP_ROLE } from "@/lib/clerkRoles";

/**
 * Invitation acceptance page
 * This page handles organization invitations and ensures users can set password directly
 * Clerk invitation links should redirect here after processing the invitation
 */
export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, membership, isLoaded: isOrgLoaded } = useOrganization();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    if (!isUserLoaded || !isOrgLoaded) return;

    const processInvitation = async () => {
      // If user is not authenticated yet, wait for Clerk to handle authentication
      if (!user) {
        // Clerk should handle signup/signin automatically via the invitation link
        // If we're here and user is null, something went wrong
        console.log("User not authenticated yet, waiting for Clerk...");
        return;
      }

      // User is authenticated, check if they have an organization
      if (!organization || !membership) {
        console.log("User authenticated but no organization found");
        setIsProcessing(false);
        // User might need to accept invitation still
        return;
      }

      // User is authenticated and in organization
      // Get user's role and redirect to appropriate dashboard
      const clerkRole = membership.role;
      const appRole = CLERK_TO_APP_ROLE[clerkRole] || "sales";
      const isAdmin = clerkRole === "org:admin" || clerkRole === "Admin" || clerkRole === "admin";

      // Ensure user exists in database
      try {
        const userEmail = user.emailAddresses[0]?.emailAddress;
        if (userEmail) {
          await fetch(`/api/users/current?identifier=${encodeURIComponent(userEmail)}`, {
            method: 'GET',
          });
        }
      } catch (error) {
        console.error("Error ensuring user exists in database:", error);
      }

      // Determine dashboard path
      const path = isAdmin ? "/team-leader" : "/dashboard";
      const organizationSlug = organization.slug;

      if (!organizationSlug) {
        console.error("Organization slug not found");
        setIsProcessing(false);
        return;
      }

      // Build redirect URL and redirect
      const redirectUrl = getTenantUrl(organizationSlug, path);
      
      console.log("Redirecting after invitation acceptance:", {
        organizationSlug,
        clerkRole,
        appRole,
        path,
        redirectUrl,
      });

      setIsProcessing(false);
      window.location.href = redirectUrl;
    };

    processInvitation();
  }, [isUserLoaded, isOrgLoaded, user, organization, membership, router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">
          {!user ? "Setting up your account..." : "Accepting invitation..."}
        </p>
        {isUserLoaded && isOrgLoaded && organization && (
          <p className="text-sm text-gray-400 mt-2">
            Redirecting to {organization.slug}...
          </p>
        )}
      </div>
    </div>
  );
}


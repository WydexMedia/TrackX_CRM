"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser, useOrganization } from "@clerk/nextjs";
import { useClerkRole } from "@/lib/clerkRoles";
import Sidebar from "@/components/tl/Sidebar";

export default function TeamLeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { isAdmin, isLoading: isRoleLoading, appRole } = useClerkRole();

  // Wait for Clerk to load
  if (!isUserLoaded || !isOrgLoaded || isRoleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    router.replace("/login");
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Redirecting to login...
      </div>
    );
  }

  // No organization - redirect to onboarding
  if (!organization) {
    router.replace("/onboarding");
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Setting up your account...
      </div>
    );
  }

  // User is not an admin (teamleader) - redirect to junior-leader
  if (!isAdmin) {
    router.replace("/junior-leader");
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Redirecting to your dashboard...
      </div>
    );
  }

  // Create user object for components that need it
  const userInfo = {
    name: user.fullName || user.firstName || "Team Leader",
    code: user.emailAddresses[0]?.emailAddress || "",
    email: user.emailAddresses[0]?.emailAddress || "",
    role: "teamleader",
    organizationName: organization.name,
    organizationSlug: organization.slug,
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <div className="flex h-full">
        <Sidebar user={userInfo} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

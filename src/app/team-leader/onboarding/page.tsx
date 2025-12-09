"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

/**
 * Onboarding page that syncs Clerk user to database
 * and redirects to team leader dashboard
 */
export default function TeamLeaderOnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const syncUserAndRedirect = async () => {
      try {
        // Sync Clerk user to database
        const response = await fetch("/api/users/sync-clerk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.success) {
          console.log("User synced to database:", data.user);
          // Redirect to team leader dashboard
          router.push("/team-leader");
        } else {
          console.error("Failed to sync user:", data.error);
          // Still redirect to dashboard even if sync fails
          router.push("/team-leader");
        }
      } catch (error) {
        console.error("Error syncing user:", error);
        // Still redirect to dashboard even if sync fails
        router.push("/team-leader");
      }
    };

    if (user) {
      syncUserAndRedirect();
    } else {
      // If not logged in, redirect to login
      router.push("/login");
    }
  }, [user, isLoaded, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Setting up your account...</p>
      </div>
    </div>
  );
}



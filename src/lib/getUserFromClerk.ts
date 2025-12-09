import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export interface DatabaseUser {
  id: number;
  email: string;
  name: string;
  code: string;
  role: string;
  target?: number;
  tenantId?: number;
}

/**
 * Hook to get database user from Clerk user
 * Fetches user from database based on Clerk email
 */
export function useDatabaseUser() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clerkLoaded) {
      setIsLoading(true);
      return;
    }

    if (!isSignedIn || !clerkUser) {
      setDbUser(null);
      setIsLoading(false);
      return;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      setError("No email found in Clerk user");
      setIsLoading(false);
      return;
    }

    // Fetch user from database by email
    fetch(`/api/users/current?identifier=${encodeURIComponent(email)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }
        return res.json();
      })
      .then((data) => {
        if (data?.success && data?.user) {
          setDbUser(data.user);
          setError(null);
        } else {
          setError("User not found in database");
        }
      })
      .catch((err) => {
        console.error("Error fetching database user:", err);
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [clerkUser, clerkLoaded, isSignedIn]);

  return { dbUser, isLoading, error };
}



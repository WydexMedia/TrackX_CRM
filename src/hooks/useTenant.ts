"use client";

import { useState, useEffect } from "react";

export function useTenant() {
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getTenantSubdomain = async () => {
      try {
        // Get the current hostname
        const hostname = window.location.hostname;
        
        // Extract subdomain from hostname
        if (hostname === "localhost" || hostname.endsWith(".localhost")) {
          // Development environment
          const parts = hostname.split(".");
          if (parts.length > 1 && parts[0] !== "localhost") {
            setSubdomain(parts[0]);
          } else {
            setSubdomain(null);
          }
        } else {
          // Production environment
          const parts = hostname.split(".");
          if (parts.length >= 2) {
            // For domains like wydex.wydex.co, the first part is the subdomain
            setSubdomain(parts[0]);
          } else {
            setSubdomain(null);
          }
        }
      } catch (error) {
        console.error("Error getting tenant subdomain:", error);
        setSubdomain(null);
      } finally {
        setLoading(false);
      }
    };

    getTenantSubdomain();
  }, []);

  return { subdomain, loading };
} 
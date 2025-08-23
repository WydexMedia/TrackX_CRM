"use client";

import { useEffect, useState } from "react";

interface TenantLogoProps {
  subdomain: string;
  className?: string;
  fallbackText?: string;
}

export default function TenantLogo({ subdomain, className = "", fallbackText }: TenantLogoProps) {
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tenant-logo/${encodeURIComponent(subdomain)}`);
        const data = await response.json();
        setLogoPath(data.logoPath);
      } catch (error) {
        console.error("Error fetching tenant logo:", error);
        setLogoPath(null);
      } finally {
        setLoading(false);
      }
    };

    if (subdomain) {
      fetchLogo();
    }
  }, [subdomain]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded ${className}`}>
        <div className="w-full h-full bg-gray-300 rounded flex items-center justify-center text-xs text-gray-600">
          Loading...
        </div>
      </div>
    );
  }

  if (logoPath) {
    return (
      <img
        src={logoPath}
        alt={`${subdomain} logo`}
        className={`object-contain ${className}`}
        onError={(e) => {
          console.error('❌ TenantLogo: Image failed to load:', e);
          setLogoPath(null);
        }}
        onLoad={() => {
          console.log('✅ TenantLogo: Image loaded successfully');
        }}
      />
    );
  }

  // Fallback to text if no logo
  if (fallbackText) {
    return (
      <div className={`flex items-center justify-center font-semibold text-gray-700 bg-gray-100 rounded ${className}`}>
        {fallbackText}
      </div>
    );
  }

  return null;
} 
/**
 * Utility functions for tenant URL construction
 * Handles both localhost (development) and production domains
 */

/**
 * Check if we're running in localhost/development environment
 */
export function isLocalhost(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: check environment variable
    return process.env.NODE_ENV === 'development' || 
           process.env.NEXT_PUBLIC_ENV === 'development';
  }
  
  // Client-side: check hostname
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('.localhost') ||
    hostname.startsWith('localhost:') ||
    hostname.startsWith('127.0.0.1:')
  );
}

/**
 * Get the base domain for tenant URLs
 */
export function getBaseDomain(): string {
  if (isLocalhost()) {
    // Use the current port from window.location if available
    const port = typeof window !== 'undefined' ? window.location.port : '3000';
    return `localhost:${port}`;
  }
  return 'wydex.co';
}

/**
 * Construct tenant subdomain URL
 * @param subdomain - The tenant subdomain
 * @param path - Optional path (default: '/team-leader')
 * @returns Full URL to tenant subdomain
 */
export function getTenantUrl(subdomain: string, path: string = '/team-leader'): string {
  if (!subdomain) {
    throw new Error('Subdomain is required');
  }

  if (isLocalhost()) {
    const port = typeof window !== 'undefined' ? window.location.port : '3000';
    return `http://${subdomain}.localhost:${port}${path}`;
  }

  return `https://${subdomain}.wydex.co${path}`;
}

/**
 * Get the current port (useful for localhost URLs)
 */
export function getCurrentPort(): string {
  if (typeof window === 'undefined') {
    return process.env.PORT || '3000';
  }
  return window.location.port || '3000';
}



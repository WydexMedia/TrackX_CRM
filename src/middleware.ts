import { NextRequest, NextResponse } from "next/server";

function extractSubdomain(host?: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  // Handle IPs
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
  // Handle localhost and *.localhost during development
  if (hostname === "localhost") return null;
  if (hostname.endsWith(".localhost")) {
    const left = hostname.slice(0, -".localhost".length);
    const label = left.split(".")[0];
    return label || null;
  }
  const parts = hostname.split(".");
  if (parts.length <= 2) return null; // example.com → no subdomain
  // For multi-level domains like app.staging.example.com take the left-most label as subdomain
  return parts[0] || null;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const subdomain = extractSubdomain(host);

  const requestHeaders = new Headers(req.headers);
  if (subdomain) requestHeaders.set("x-tenant-subdomain", subdomain);
  requestHeaders.set("x-resolved-host", host || "");
  requestHeaders.set("x-resolved-path", url.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    // Skip Next internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};



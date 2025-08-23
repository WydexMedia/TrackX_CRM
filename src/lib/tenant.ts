import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

interface TenantMetadata {
  contactName?: string;
  email?: string;
  phone?: string;
  expectedUsers?: string;
  industry?: string;
  onboardingDate?: string;
  logoPath?: string;
}

export async function getTenantBySubdomain(subdomain: string) {
  if (!subdomain) return null;
  const rows = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain)).limit(1);
  return rows[0] || null;
}

export async function getTenantLogo(subdomain: string): Promise<string | null> {
  try {
    const tenant = await getTenantBySubdomain(subdomain);
    if (tenant?.metadata) {
      const metadata = tenant.metadata as TenantMetadata;
      return metadata.logoPath || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching tenant logo:", error);
    return null;
  }
}

export async function requireTenantIdFromRequest(req: Request): Promise<number> {
  const subdomain = req.headers.get("x-tenant-subdomain");
  if (!subdomain) throw new Error("Tenant subdomain not resolved");
  const t = await getTenantBySubdomain(subdomain);
  if (!t || !t.id) throw new Error("Tenant not found");
  return t.id as number;
}



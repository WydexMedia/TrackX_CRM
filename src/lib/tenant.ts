import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getTenantBySubdomain(subdomain: string) {
  if (!subdomain) return null;
  const rows = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain)).limit(1);
  return rows[0] || null;
}

export async function requireTenantIdFromRequest(req: Request): Promise<number> {
  const subdomain = req.headers.get("x-tenant-subdomain");
  if (!subdomain) throw new Error("Tenant subdomain not resolved");
  const t = await getTenantBySubdomain(subdomain);
  if (!t || !t.id) throw new Error("Tenant not found");
  return t.id as number;
}



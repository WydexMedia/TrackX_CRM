import { getTenantBySubdomain } from "@/lib/tenant";

export type TenantContext = {
  tenantSubdomain: string;
  tenantId?: number;
};

export async function getTenantContextFromRequest(req: Request): Promise<TenantContext> {
  const sub = (req.headers.get("x-tenant-subdomain") || "").trim().toLowerCase();
  if (!sub) {
    return { tenantSubdomain: "" };
  }
  try {
    const t = await getTenantBySubdomain(sub);
    return { tenantSubdomain: sub, tenantId: t?.id as number | undefined };
  } catch {
    return { tenantSubdomain: sub };
  }
}



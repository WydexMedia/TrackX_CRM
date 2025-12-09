import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTenantContextFromRequest } from "@/lib/mongoTenant";
import { authenticateRequest, createUnauthorizedResponse } from "@/lib/clerkAuth";
import { addPerformanceHeaders, CACHE_DURATION } from "@/lib/performance";

export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.statusCode);
    }

    const { tenantId } = await getTenantContextFromRequest(req as any);
    
    let allUsers;
    if (tenantId) {
      allUsers = await db
        .select({
          code: users.code,
          email: users.email,
          name: users.name
        })
        .from(users)
        .where(eq(users.tenantId, tenantId));
    } else {
      allUsers = await db.select({
        code: users.code,
        email: users.email,
        name: users.name
      }).from(users);
    }
    
    const userMap: Record<string, string> = {};
    for (const u of allUsers) {
      const code = u.code;
      const email = u.email;
      const name = u.name;
      if (typeof name === "string" && name) {
        if (typeof email === "string" && email.trim().length > 0) {
          userMap[String(email)] = String(name);
        }
        if (typeof code === "string" && code && code.trim().length > 0) {
          userMap[String(code)] = String(name);
        }
      }
    }
    
    const response = NextResponse.json({ success: true, users: userMap });
    return addPerformanceHeaders(response, CACHE_DURATION.MEDIUM);
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch users" }), { status: 500 });
  }
}

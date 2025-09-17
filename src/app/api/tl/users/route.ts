import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongoClient";
import { getTenantContextFromRequest } from "@/lib/mongoTenant";
import { authenticateToken, createUnauthorizedResponse } from "@/lib/authMiddleware";

export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(req as any);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.errorCode, authResult.statusCode);
    }

    const mdb = await getMongoDb();
    const users = mdb.collection("users");
    const { tenantSubdomain } = await getTenantContextFromRequest(req as any);
    const filter = tenantSubdomain ? { tenantSubdomain } : {};
    const docs = await users.find(filter, { projection: { code: 1, email: 1, name: 1 } }).toArray();
    
    const userMap: Record<string, string> = {};
    for (const u of docs) {
      const code = (u as any).code;
      const email = (u as any).email;
      const name = (u as any).name;
      if (typeof name === "string") {
        if (typeof email === "string" && email.trim().length > 0) {
          userMap[String(email)] = String(name);
        }
        if (typeof code === "string" && code.trim().length > 0) {
          userMap[String(code)] = String(name);
        }
      }
    }
    
    return new Response(JSON.stringify({ success: true, users: userMap }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch users" }), { status: 500 });
  }
} 
import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongoClient";
import { getTenantContextFromRequest } from "@/lib/mongoTenant";

export async function GET(req: NextRequest) {
  try {
    const mdb = await getMongoDb();
    const users = mdb.collection("users");
    const { tenantSubdomain } = await getTenantContextFromRequest(req as any);
    const filter = tenantSubdomain ? { tenantSubdomain } : {};
    const docs = await users.find(filter, { projection: { code: 1, name: 1 } }).toArray();
    
    const userMap: Record<string, string> = {};
    for (const u of docs) {
      if (typeof (u as any).code === "string" && typeof (u as any).name === "string") {
        userMap[String((u as any).code)] = String((u as any).name);
      }
    }
    
    return new Response(JSON.stringify({ success: true, users: userMap }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch users" }), { status: 500 });
  }
} 